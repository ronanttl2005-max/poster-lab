import { makeCanvas, imageToCanvas, loadImageUrl, buildControls, panelSection, injectStyle, downloadCanvasPNG } from './shared.js';
import { createDemo, createLayers, renderPoster } from './subjectlift-render.js';

const RATIOS = { '3:4': 1440, '2:3': 1620, '1:1': 1080 };
const COLORS = [ ['荧光黄', '#f6ff63'], ['天空蓝', '#2178c8'], ['薄荷绿', '#bcffa0'], ['梦境粉', '#f47bfa'], ['翡翠绿', '#22af7b'], ['留白', '#ffffff'] ];

export default {
  id: 'subjectlift', name: '主体抽离', nameEn: 'Subject / Absence',
  desc: '把主体从照片里提出来：上半部悬浮，下半部留下同色剪影。自动抠图，原色或网点，一张照片生成双联海报。',
  tags: ['开源 AI 抠图', '双联海报', '彩色剪影', '半调网点'],
  cover: `<svg viewBox="0 0 120 84" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="84" fill="#bcffa0"/><rect y="42" width="120" height="42" fill="#184d92"/><path d="M0 73L120 51V84H0Z" fill="#577742"/><path id="sl-figure" d="M59 10a4 4 0 1 1 0 8h-1l-4 4-2 9 3 1 3-7v9l-2 5h4l2-8 3 8h4l-3-10 1-8-5-3a4 4 0 0 1-3-8" fill="#263e38"/><use href="#sl-figure" transform="translate(0 42)" fill="#bcffa0" style="fill:#bcffa0"/><path d="M59 52a4 4 0 1 1 0 8h-1l-4 4-2 9 3 1 3-7v9l-2 5h4l2-8 3 8h4l-3-10 1-8-5-3a4 4 0 0 1-3-8" fill="#bcffa0"/><path d="M12 24h23m-23 3h17m49-3h25m-25 3h19" stroke="#244129" stroke-width=".8"/></svg>`,

  mount(container, options = {}) {
    injectStyle('tool-subjectlift', `
      .sl-stage {display:flex;flex-direction:column;align-items:center;gap:14px;min-width:0;}
      .sl-stage .sl-poster {display:block;width:100%;max-width:720px;height:auto;box-shadow:0 8px 32px #0002;}
      .sl-caption {font:11px ui-monospace,monospace;letter-spacing:.14em;color:var(--text-3,#777);text-align:center;}
      .sl-status {font-size:12px;line-height:1.7;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:8px;margin:10px 0;overflow-wrap:anywhere;}
      .sl-status[data-error=true] {color:#aa341f;background:#fff1eb;}
      .sl-swatches {display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 18px;}
      .sl-swatches button {width:32px;height:32px;border:1px solid #0002;border-radius:50%;cursor:pointer;}
      .sl-swatches button[aria-pressed=true] {outline:2px solid var(--text,#222);outline-offset:2px;}
      .sl-editor {width:100%;border:1px solid var(--line,#ddd);border-radius:8px;padding:12px;box-sizing:border-box;}
      .sl-editor[hidden] {display:none;}
      .sl-editor p {font-size:12px;line-height:1.6;margin:0 0 10px;}
      .sl-mask {width:100%;height:auto;display:block;touch-action:none;cursor:crosshair;}
      .sl-panel button:disabled {opacity:.45;cursor:default;}
    `);
    const panel = document.createElement('div'); panel.className = 'sl-panel';
    const stage = document.createElement('div'); stage.className = 'tool-stage sl-stage';
    container.append(panel, stage);
    const v = { color:'#f47bfa', ratio:'3:4', split:50, scale:80, subjectX:50, subjectY:50, photoX:50, photoY:50,
      effect:'photo', dot:14, threshold:128, softness:30, engine:'general', textLayout:'sides', fontSize:19,
      textColor:'#16211b', leftText:'The Quiet Explorer\nSomewhere beyond the ordinary', rightText:'Subject / Absence\nA study in colour and space',
      brush:'off', brushSize:28 };
    let { source, mask } = createDemo();
    let layers, worker = null, timer = null, destroyed = false, version = 0, frame = null, painting = false, lastPoint = null;
    const history = [];
    const canvas = makeCanvas(1080, RATIOS[v.ratio]); canvas.className = 'sl-poster'; canvas.setAttribute('aria-label', '主体抽离海报预览');
    const caption = document.createElement('div'); caption.className = 'sl-caption'; caption.textContent = '01 / SUBJECT     —     02 / ABSENCE';
    const editor = document.createElement('div'); editor.className = 'sl-editor'; editor.hidden = true;
    const instructions = document.createElement('p'); instructions.textContent = '在原图上涂抹修边：紫色区域会被提取。细线、气球绳、椅子和遗漏的人物可以用「补回」保留。';
    const editCanvas = makeCanvas(source.width, source.height); editCanvas.className = 'sl-mask'; editCanvas.setAttribute('aria-label', '主体蒙版修补画布');
    editor.append(instructions, editCanvas); stage.append(editor, canvas, caption);
    const controls = {};
    function add(schema) {
      const result = buildControls(panel, schema, v, change);
      for (const f of schema) result[f.key]?.setAttribute('aria-label', f.label);
      Object.assign(controls, result); return result;
    }
    panelSection(panel, '01 / 一张照片');
    add([
      { key:'file', type:'file', label:'选择原始照片', accept:'image/png,image/jpeg,image/webp' },
      { key:'engine', type:'select', label:'自动抠图引擎', options:[{ value:'general', label:'BiRefNet · 人物与物件' }, { value:'portrait', label:'MODNet · 轻量人像' }] },
      { type:'info', label:'照片在本机浏览器处理。首次联网下载模型：BiRefNet 约 192 MB；轻量人像更快。请使用未处理的原照片。' },
      { key:'run', type:'button', label:'自动抠图', primary:true, onClick: runAI },
      { key:'cancel', type:'button', label:'取消处理', onClick: () => { stop(); setStatus('已取消。可重试自动抠图，或手动补回主体。'); } },
      { key:'demo', type:'button', label:'恢复演示', onClick: () => {
        version++; stop(); ({ source, mask } = createDemo()); history.length = 0; controls.file.value = '';
        rebuild(); setStatus('内置插画演示 · 使用预制蒙版，可直接调色、排版和导出。');
      } },
    ]);
    const status = document.createElement('div'); status.className = 'sl-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); panel.append(status);
    panelSection(panel, '02 / 色彩与构图');
    const swatches = document.createElement('div'); swatches.className = 'sl-swatches'; panel.append(swatches);
    COLORS.forEach(([name, color]) => {
      const button = document.createElement('button'); button.type = 'button'; button.style.background = color;
      button.title = name; button.setAttribute('aria-label', name); button.dataset.color = color;
      button.addEventListener('click', () => { v.color = color; controls.color.value = color; rebuild(); }); swatches.append(button);
    });
    add([
      { key:'color', type:'color', label:'底色与剪影', },
      { key:'effect', type:'select', label:'上半部主体效果', options:[{ value:'photo', label:'原色抠图' }, { value:'dots', label:'彩色半调网点' }] },
      { key:'dot', type:'range', label:'网点间距', min:4, max:32 },
      { key:'ratio', type:'select', label:'画布比例', options:Object.keys(RATIOS).map(value=>({value,label:value})) },
      { key:'split', type:'range', label:'上半部占比 %', min:30, max:70 },
      { key:'scale', type:'range', label:'主体大小 %', min:25, max:140 },
      { key:'subjectX', type:'range', label:'主体水平位置', min:0, max:100 },
      { key:'subjectY', type:'range', label:'主体垂直位置', min:0, max:100 },
      { key:'photoX', type:'range', label:'照片水平取景', min:0, max:100 },
      { key:'photoY', type:'range', label:'照片垂直取景', min:0, max:100 },
    ]);
    panelSection(panel, '03 / 边缘修补');
    add([
      { key:'threshold', type:'range', label:'轮廓收紧', min:1, max:254 },
      { key:'softness', type:'range', label:'边缘柔和', min:0, max:100 },
      { key:'brush', type:'select', label:'手动修补', options:[{ value:'off', label:'关闭修补' },{ value:'restore', label:'补回主体' },{ value:'erase', label:'擦除多余区域' }] },
      { key:'brushSize', type:'range', label:'画笔直径（原图像素）', min:3, max:120 },
      { key:'undo', type:'button', label:'撤销上一笔', onClick: () => {
        const previous = history.pop(); if (previous) { mask.getContext('2d').putImageData(previous, 0, 0); rebuild(); }
      } },
    ]);
    panelSection(panel, '04 / 海报文字');
    add([
      { key:'textLayout', type:'select', label:'文字布局', options:[{ value:'sides', label:'主体两侧' },{ value:'seam', label:'分屏交界' },{ value:'none', label:'不显示文字' }] },
      { key:'leftText', type:'textarea', label:'左侧文字（最多三行）', rows:2 },
      { key:'rightText', type:'textarea', label:'右侧文字（最多三行）', rows:2 },
      { key:'textColor', type:'color', label:'文字颜色' },
      { key:'fontSize', type:'range', label:'字号', min:12, max:36 },
    ]);
    panelSection(panel, '05 / 导出');
    add([
      { key:'export', type:'button', label:'导出海报 PNG · 1080 px', primary:true, onClick: () => exportPoster(1) },
      { key:'export2', type:'button', label:'导出海报 PNG · 2160 px', onClick: () => exportPoster(2) },
      { key:'cutout', type:'button', label:'导出透明主体 PNG', onClick: () => {
        if (!layers.bounds) return;
        const b = layers.bounds, out = makeCanvas(b.w, b.h);
        out.getContext('2d').drawImage(layers.cutout, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        // A reusable transparent source asset must not inherit the poster's brand overlay.
        const link = document.createElement('a'); link.download = 'poster-lab-subject.png';
        link.href = out.toDataURL('image/png'); link.click();
      } },
    ]);

    function setStatus(text, error = false) { if (destroyed) return; status.textContent = text; status.dataset.error = String(error); }
    function updateButtons() {
      controls.cancel.disabled = !worker; controls.run.disabled = !!worker;
      controls.undo.disabled = !history.length;
      for (const key of ['export','export2','cutout']) controls[key].disabled = !layers?.bounds;
    }
    function stop() { worker?.terminate(); worker = null; clearTimeout(timer); timer = null; updateButtons(); }
    function draw() {
      if (destroyed) return;
      canvas.height = RATIOS[v.ratio]; renderPoster(canvas, source, layers, v);
    }
    function drawEditor() {
      editCanvas.width = source.width; editCanvas.height = source.height;
      const e = editCanvas.getContext('2d'); e.drawImage(source, 0, 0);
      const tint = makeCanvas(source.width, source.height), t = tint.getContext('2d');
      t.drawImage(mask, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#ee45e5'; t.fillRect(0, 0, tint.width, tint.height);
      e.globalAlpha = .5; e.drawImage(tint, 0, 0); e.globalAlpha = 1;
    }
    function rebuild() {
      if (destroyed) return;
      layers = createLayers(source, mask, v); updateButtons(); draw();
      if (!editor.hidden) drawEditor();
      swatches.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === v.color)));
    }
    function exportPoster(scale) {
      const out = makeCanvas(1080 * scale, RATIOS[v.ratio] * scale);
      renderPoster(out, source, layers, v); downloadCanvasPNG(out, `poster-lab-subjectlift-${out.width}.png`);
    }
    function change(key, value) {
      if (key === 'file') { const file = value?.[0]; if (file) loadFile(file); return; }
      if (key === 'engine' && worker) { stop(); setStatus('已切换引擎，点击自动抠图开始。'); }
      if (key === 'brush') { editor.hidden = value === 'off'; if (!editor.hidden) drawEditor(); return; }
      if (['color','effect','dot','threshold','softness'].includes(key)) rebuild(); else draw();
    }
    async function loadFile(file) {
      if (file.size > 30 * 1024 * 1024) { setStatus('图片超过 30 MB，请选择较小的图片。', true); return; }
      const url = URL.createObjectURL(file);
      try { await loadSource(url); } finally { URL.revokeObjectURL(url); }
    }
    async function loadSource(url) {
      const token = ++version; stop(); setStatus('正在读取照片…');
      try {
        const image = await loadImageUrl(url);
        if (destroyed || token !== version) return;
        source = imageToCanvas(image, 1600); mask = makeCanvas(source.width, source.height); history.length = 0;
        const rgba = source.getContext('2d').getImageData(0, 0, source.width, source.height);
        let transparent = 0;
        for (let i = 3; i < rgba.data.length; i += 4) if (rgba.data[i] < 250) transparent++;
        if (transparent > source.width * source.height * .01) {
          mask.getContext('2d').drawImage(source, 0, 0); rebuild(); setStatus('已使用图片自带的透明轮廓。可直接排版或重新自动抠图。');
        } else { rebuild(); runAI(); }
      } catch (error) { if (token === version) setStatus(`图片读取失败：${error.message}`, true); }
    }
    function runAI() {
      stop(); const token = version;
      try {
        worker = new Worker(new URL('./subjectlift-ai.worker.js', import.meta.url), { type:'module' });
        const job = worker;
        setStatus('正在加载自动抠图引擎，首次使用需要下载模型…'); updateButtons();
        worker.onmessage = ({ data }) => {
          if (destroyed || token !== version || worker !== job) return;
          if (data.type === 'progress') { setStatus(data.text); return; }
          if (data.type === 'error') { stop(); setStatus(`自动抠图未完成：${data.message}。可检查网络后重试，切换轻量人像，或用手动修补。`, true); return; }
          if (data.type === 'mask') {
            if (data.width !== source.width || data.height !== source.height || data.mask.length !== source.width * source.height) {
              stop(); setStatus('模型返回的蒙版尺寸不匹配，请重试。', true); return;
            }
            const m = mask.getContext('2d'), rgba = m.createImageData(source.width, source.height);
            for (let i = 0; i < data.mask.length; i++) { rgba.data[i*4] = rgba.data[i*4+1] = rgba.data[i*4+2] = 255; rgba.data[i*4+3] = data.mask[i]; }
            m.putImageData(rgba, 0, 0); history.length = 0; stop(); rebuild();
            setStatus(layers.bounds ? '抠图完成。检查轮廓后可调色、修边并导出。' : '未识别到主体。可切换引擎或用「补回主体」绘制轮廓。', !layers.bounds);
          }
        };
        worker.onerror = () => { if (worker !== job || destroyed) return; stop(); setStatus('引擎未能加载。请检查网络后重试，或用手动修补。', true); };
        timer = setTimeout(() => { if (worker !== job) return; stop(); setStatus('处理超时。可切换轻量人像引擎后重试，或手动修补。', true); }, 300000);
        const pixels = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
        worker.postMessage({ pixels, width:source.width, height:source.height, engine:v.engine }, [pixels.buffer]);
      } catch (error) { stop(); setStatus(`无法启动抠图：${error.message}。请通过 npm start 打开工具。`, true); }
    }
    function point(event) {
      const r = editCanvas.getBoundingClientRect();
      return { x:(event.clientX-r.left) * source.width/r.width, y:(event.clientY-r.top) * source.height/r.height };
    }
    function paint(event) {
      if (!painting) return;
      const p = point(event), m = mask.getContext('2d');
      m.globalCompositeOperation = v.brush === 'erase' ? 'destination-out' : 'source-over';
      m.fillStyle = '#fff'; m.strokeStyle = '#fff'; m.lineWidth = v.brushSize; m.lineCap = 'round';
      m.beginPath(); m.arc(p.x, p.y, v.brushSize/2, 0, Math.PI*2); m.fill();
      if (lastPoint) { m.beginPath(); m.moveTo(lastPoint.x,lastPoint.y); m.lineTo(p.x,p.y); m.stroke(); }
      m.globalCompositeOperation = 'source-over'; lastPoint = p;
      if (!frame) frame = requestAnimationFrame(() => { frame = null; rebuild(); });
      event.preventDefault();
    }
    function down(event) {
      if (v.brush === 'off' || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (worker) { stop(); setStatus('自动处理已停止，正在手动修补。'); }
      history.push(mask.getContext('2d').getImageData(0,0,source.width,source.height)); if (history.length > 5) history.shift();
      painting = true; lastPoint = null; editCanvas.setPointerCapture(event.pointerId); paint(event);
    }
    function up() { painting = false; lastPoint = null; }
    editCanvas.addEventListener('pointerdown',down); editCanvas.addEventListener('pointermove',paint);
    editCanvas.addEventListener('pointerup',up); editCanvas.addEventListener('pointercancel',up);
    rebuild(); setStatus('内置插画演示 · 使用预制蒙版，可直接调色、排版和导出。');
    if (options.sourceImageUrl) loadSource(options.sourceImageUrl);
    return () => { destroyed = true; version++; stop(); cancelAnimationFrame(frame);
      editCanvas.removeEventListener('pointerdown',down); editCanvas.removeEventListener('pointermove',paint);
      editCanvas.removeEventListener('pointerup',up); editCanvas.removeEventListener('pointercancel',up); };
  },
};
