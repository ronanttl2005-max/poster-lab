// Lazy, local-only inference. Terminating the worker cancels downloads/inference
// and releases model memory when a picture changes or the tool is unmounted.
self.onmessage = async ({ data: { pixels, width, height, tasks } }) => {
  try {
    const { pipeline, RawImage, env, Florence2ForConditionalGeneration, AutoProcessor, AutoTokenizer } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
    env.allowLocalModels = false;
    env.backends.onnx.wasm.numThreads = 1;
    const image = new RawImage(new Uint8ClampedArray(pixels), width, height, 4);
    for (const task of tasks) {
      let pipe;
      try {
        self.postMessage({ type: 'progress', task, text: '正在加载模型（首次使用需要下载）…' });
        const progress_callback = (p) => {
          if (p.status === 'progress') self.postMessage({ type: 'progress', task,
            text: `下载模型 ${p.file?.split('/').pop() || ''} · ${Math.round(p.progress || 0)}%` });
        };
        if (task === 'cutout') {
          pipe = await pipeline('background-removal', 'briaai/RMBG-1.4', {device:'wasm',dtype:'q8',progress_callback});
          self.postMessage({type:'progress',task,text:'正在识别前景轮廓…'});
          const [result] = await pipe(image);
          const rgba = result.rgba();
          self.postMessage({ type: 'cutout', pixels: rgba.data, width: rgba.width, height: rgba.height }, [rgba.data.buffer]);
        } else {
          const id = 'onnx-community/Florence-2-base-ft';
          pipe = await Florence2ForConditionalGeneration.from_pretrained(id, {device:'wasm',dtype:'q8',progress_callback});
          const processor = await AutoProcessor.from_pretrained(id);
          const tokenizer = await AutoTokenizer.from_pretrained(id);
          self.postMessage({type:'progress',task,text:'正在理解画面内容…'});
          const prompt = '<DETAILED_CAPTION>';
          const vision = await processor(image);
          const text = tokenizer(processor.construct_prompts(prompt));
          const ids = await pipe.generate({...vision,...text,max_new_tokens:100,num_beams:1,do_sample:false});
          const decoded = tokenizer.batch_decode(ids,{skip_special_tokens:false})[0];
          const caption = processor.post_process_generation(decoded,prompt,image.size)[prompt]?.trim();
          if (!caption) throw new Error('没有识别到可用的画面描述');
          self.postMessage({ type: 'caption', caption });
        }
      } catch (error) {
        self.postMessage({ type: 'error', task, message: String(error.message || error) });
      } finally {
        await pipe?.dispose();
      }
    }
    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({ type: 'error', task: 'all', message: String(error.message || error) });
    self.postMessage({ type: 'done' });
  }
};
