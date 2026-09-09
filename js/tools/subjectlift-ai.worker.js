// Inference runs locally. Only library/model downloads leave the browser.
// The library version is pinned for zero-build deployment.
import { matteTensor } from './subjectlift-layout.js';

self.onmessage = async ({ data: { pixels, width, height, engine } }) => {
  let model;
  try {
    const { AutoModel, AutoProcessor, RawImage, pipeline, env } = await import(
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
    env.allowLocalModels = false;
    env.backends.onnx.wasm.numThreads = 1;
    const progress_callback = p => {
      if (p.status === 'progress') self.postMessage({ type: 'progress', text:
        `正在下载模型 ${p.file?.split('/').pop() || ''} · ${Math.round(p.progress || 0)}%` });
    };
    const image = new RawImage(new Uint8ClampedArray(pixels), width, height, 4);
    let mask;
    if (engine === 'portrait') {
      model = await pipeline('background-removal', 'Xenova/modnet', { device: 'wasm', dtype: 'fp32', progress_callback });
      self.postMessage({ type: 'progress', text: '正在识别人像轮廓…' });
      const [result] = await model(image);
      const rgba = result.rgba();
      mask = new Uint8Array(width * height);
      for (let i = 0; i < mask.length; i++) mask[i] = rgba.data[i * 4 + 3];
    } else {
      // The 1024 export exceeds the WASM heap during inference; use the browser 512 export.
      const id = 'studioludens/birefnet-lite-512';
      model = await AutoModel.from_pretrained(id, { device: 'wasm', dtype: 'fp32', progress_callback });
      const processor = await AutoProcessor.from_pretrained(id);
      self.postMessage({ type: 'progress', text: '正在识别主体与细节，可能需要一两分钟…' });
      const { pixel_values } = await processor(image);
      const outputs = await model({ input_image: pixel_values });
      // ONNX exports differ in output name; accept only a single-channel matte tensor.
      const logits = matteTensor(outputs);
      const result = await RawImage.fromTensor(logits[0].sigmoid().mul(255).to('uint8')).resize(width, height);
      mask = new Uint8Array(result.data);
    }
    self.postMessage({ type: 'mask', mask, width, height }, [mask.buffer]);
  } catch (error) {
    self.postMessage({ type: 'error', message: typeof error === 'number'
      ? '浏览器推理资源不足，请切换轻量人像引擎或关闭其他占用内存的页面'
      : String(error.message || error) });
  } finally {
    await model?.dispose();
    self.close();
  }
};
