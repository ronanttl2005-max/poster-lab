import { buildControls, panelSection, injectStyle, loadImageUrl, imageToCanvas, makeCanvas, downloadSVG, downloadCanvasPNG } from './shared.js';
import { SHAPES, esc } from './micrographic-layout.js';
import { findIcon, DEMO_ICONS, PLACEHOLDER_ICON } from './micrographic-services.js';
import { renderMicrographic, DEMO_COPY, FONT } from './micrographic-render.js';

const CSS = `
.mg-preview { min-width:0; }
.mg-toolbar { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:12px; }
.mg-toolbar button { padding:7px 12px; border:1px solid var(--line-strong); border-radius:20px; background:var(--bg-2); color:var(--text-2); cursor:pointer; font-size:12px; }
.mg-toolbar button.active { background:var(--text); color:var(--bg); border-color:var(--text); }
.mg-preview .tool-stage { background:#e6e6e0; padding:24px; min-height:0; }
.mg-preview .tool-stage > svg { display:block; width:100%; max-width:560px; border:0; box-shadow:0 8px 30px #0002; background:transparent; }
.mg-status { font-size:12px; line-height:1.7; padding:10px 12px; margin:0 0 12px; background:var(--accent-pale); border:1px solid var(--line); border-radius:8px; }
.mg-status[data-error="true"] { color:#a53020; background:#fff0eb; }
.mg-caption { display:flex; justify-content:space-between; color:var(--text-3); font-size:11px; padding:10px 0; letter-spacing:.06em; }
.mg-icons { font-size:11px; line-height:1.7; color:var(--text-3); margin:8px 0; overflow-wrap:anywhere; }
.mg-icons a { color:inherit; }
.mg-panel button:disabled { opacity:.5; cursor:wait; }
@media(max-width:900px) { .mg-panel { position:static; max-height:480px; } .mg-preview .tool-stage { padding:12px; } }
`;

export default {
  id: 'micrographic', name: 'Micro-graphic 标签', nameEn: 'Micro-graphic Label',
  desc: '为照片搭配标题、文案与图标，在异形双线边框里随机编排。让每个日常画面拥有自己的微型视觉语言。',
  tags: ['手动文案', '在线图标', '异形标签', '可变网格'],
  cover: '<svg viewBox="0 0 400 150"><rect width="400" height="150" fill="#39463d"/><path d="M0 150 180 0h190L190 150Z" fill="#969077"/><g stroke="#ffffed" fill="none" opacity=".8"><ellipse cx="200" cy="75" rx="134" ry="60"/><ellipse cx="200" cy="75" rx="130" ry="56"/></g><g fill="#ffffed" font-family="Arial,sans-serif" font-weight="700"><text x="118" y="61" font-size="14">URBAN</text><text x="208" y="105" font-size="45">光/影</text><text x="104" y="94" font-size="12">CONTRAST</text><text x="238" y="49" font-size="10">01</text></g></svg>',
  mount,
};

function mount(container, options = {}) {
  injectStyle('micrographic', CSS);
  container.innerHTML = `<aside class="tc-panel mg-panel"></aside><div class="mg-preview">
    <div class="mg-toolbar" aria-label="标签形状">${SHAPES.map(s => `<button type="button" data-shape="${s.value}">${s.label}</button>`).join('')}</div>
    <div class="mg-status" role="status" aria-live="polite"></div><div class="tool-stage"></div>
    <div class="mg-caption"><span>MICRO-GRAPHIC / VARIABLE GRID</span><span>750 × 1000</span></div></div>`;
  const panel = container.querySelector('.mg-panel'), stage = container.querySelector('.tool-stage'), status = container.querySelector('.mg-status');
  const v = { shape: 'rectangle', scale: 100, x: 50, y: 57, seed: 15, columns: 3, gap: 7, stroke: .8,
    ink: '#fffff5', shade: 8, typeScale: 100, guides: false, title: DEMO_COPY.title, caption: DEMO_COPY.caption,
    keywords: DEMO_COPY.keywords.join(', '), queries: DEMO_COPY.iconQueries.join(', ') };
  let imageUrl = '', icons = [...DEMO_ICONS], disposed = false, iconGeneration = 0, uploadGeneration = 0;
  let iconController, keywordTimer, iconVariant = 0;
  const measureCtx = makeCanvas(1, 1).getContext('2d');
  const measure = (text, size, weight) => { measureCtx.font = `${weight} ${size}px ${FONT}`; return measureCtx.measureText(text).width; };
  const split = text => String(text).split(/[,，\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  const copy = () => ({ title: v.title.slice(0, 16), caption: v.caption.slice(0, 260), keywords: split(v.keywords).map(s => s.slice(0, 28)) });
  const say = (message, error = false) => { if (!disposed) { status.textContent = message; status.dataset.error = String(error); } };
  const render = () => {
    if (disposed) return;
    stage.innerHTML = renderMicrographic(v, copy(), icons, imageUrl, measure);
    container.querySelectorAll('[data-shape]').forEach(button => {
      button.classList.toggle('active', button.dataset.shape === v.shape);
      button.setAttribute('aria-pressed', String(button.dataset.shape === v.shape));
    });
  };
  const change = (key, value) => {
    if (key === 'keywords' || key === 'queries') {
      if (key === 'keywords') { v.queries = value; copyInputs.queries.value = value; }
      iconGeneration++; iconController?.abort(); clearTimeout(keywordTimer);
      keywordTimer = setTimeout(() => refreshIcons(), 700);
    }
    render();
  };
  panelSection(panel, '01 / 照片');
  buildControls(panel, [
    { key: 'photo', label: '上传照片 · JPG / PNG / WebP', type: 'file', accept: 'image/jpeg,image/png,image/webp' },
  ], v, (key, files) => { if (key === 'photo' && files?.[0]) upload(files[0]); });
  panelSection(panel, '02 / 标签与网格');
  const layoutInputs = buildControls(panel, [
    { key: 'shape', label: '标签形状', type: 'select', options: SHAPES },
    { key: 'random', label: '↻ 随机排版', type: 'button', primary: true, onClick: () => {
      v.seed = Math.floor(Math.random() * 99999) + 1; layoutInputs.seed.value = v.seed; render();
    } },
    { key: 'seed', label: '排版种子 · 相同数字复现版式', type: 'number' },
    { key: 'columns', label: '可变网格列数', type: 'range', min: 2, max: 5 },
    { key: 'scale', label: '标签大小 %', type: 'range', min: 45, max: 130 },
    { key: 'x', label: '水平位置', type: 'range', min: 10, max: 90 },
    { key: 'y', label: '垂直位置', type: 'range', min: 10, max: 90 },
    { key: 'typeScale', label: '字号比例 %', type: 'range', min: 65, max: 135 },
    { key: 'ink', label: '文字与边框颜色', type: 'color' },
    { key: 'stroke', label: '边框粗细', type: 'range', min: .4, max: 2.5, step: .1 },
    { key: 'gap', label: '双线间距', type: 'range', min: 3, max: 14 },
    { key: 'shade', label: '照片压暗 %', type: 'range', min: 0, max: 65 },
    { key: 'guides', label: '显示网格辅助线（不导出）', type: 'checkbox' },
  ], v, change);
  layoutInputs.seed.min = 1; layoutInputs.seed.max = 99999;
  panelSection(panel, '03 / 文案与图标');
  const copyInputs = buildControls(panel, [
    { key: 'title', label: '主标题 · 建议 1–4 个汉字', type: 'text' },
    { key: 'caption', label: '画面文案', type: 'textarea', rows: 4 },
    { key: 'keywords', label: '排版关键词 · 逗号分隔，最多 4 个', type: 'textarea', rows: 2 },
    { key: 'queries', label: '图标搜索词 · 英文名词，最多 3 个', type: 'text' },
    { key: 'icons', label: '↻ 在线换一组图标', type: 'button', onClick: () => { iconVariant++; refreshIcons(); } },
  ], v, change);
  copyInputs.title.maxLength = 16; copyInputs.caption.maxLength = 260; copyInputs.keywords.maxLength = 120; copyInputs.queries.maxLength = 125;
  const iconInfo = document.createElement('div'); iconInfo.className = 'mg-icons'; panel.append(iconInfo);
  const showIcons = () => { iconInfo.innerHTML = icons.map(icon => icon.online
    ? `<a href="${esc(icon.source)}" target="_blank" rel="noopener noreferrer">${esc(icon.name)}</a>`
    : (icon.name === 'offline-placeholder' ? '离线占位符' : '内置示例图标')).join(' · ') + '<br>在线图标：Iconify / Pictogrammers · Apache 2.0'; };
  panelSection(panel, '04 / 导出');
  const exports = buildControls(panel, [
    { key: 'png', label: '下载海报 PNG · 1500 × 2000', type: 'button', primary: true, onClick: () => exportArt('png', true) },
    { key: 'svg', label: '下载可编辑 SVG', type: 'button', onClick: () => exportArt('svg', true) },
    { key: 'label', label: '下载透明标签 PNG', type: 'button', onClick: () => exportArt('png', false) },
  ], v, change);
  container.querySelectorAll('[data-shape]').forEach(button => button.onclick = () => {
    v.shape = button.dataset.shape; layoutInputs.shape.value = v.shape; render();
  });
  panel.querySelectorAll('.tc-field').forEach(row => {
    const input = row.querySelector('input,select,textarea'), label = row.querySelector('.tc-label span');
    if (input && label) input.setAttribute('aria-label', label.textContent);
  });

  async function refreshIcons() {
    clearTimeout(keywordTimer); iconController?.abort();
    const controller = new AbortController(); iconController = controller;
    const id = ++iconGeneration, queries = split(v.queries).slice(0, 3);
    if (!queries.length) { icons = []; showIcons(); render(); say('未填写图标关键词，当前仅排版文字。'); return; }
    say('正在按关键词在线搜索图标…');
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const results = await Promise.allSettled(queries.map(q => findIcon(q, controller.signal, iconVariant)));
      if (disposed || id !== iconGeneration) return;
      icons = results.map(r => r.status === 'fulfilled' ? r.value : PLACEHOLDER_ICON);
      showIcons(); render();
      const failed = results.filter(r => r.status === 'rejected').length;
      say(failed ? `${queries.length - failed}/${queries.length} 个在线图标已加载，其余使用几何占位符。可修改搜索词或重试。` : '文案与在线图标已就绪，可以换形状或随机排版。', !!failed);
    } finally { clearTimeout(timeout); }
  }

  async function upload(fileOrUrl) {
    const id = ++uploadGeneration;
    iconGeneration++; iconController?.abort(); clearTimeout(keywordTimer);
    let objectUrl;
    try {
      if (typeof fileOrUrl !== 'string') {
        if (!/^image\/(jpeg|png|webp)$/.test(fileOrUrl.type)) throw new Error('请上传 JPG、PNG 或 WebP 图片。');
        if (fileOrUrl.size > 25 * 1024 * 1024) throw new Error('图片超过 25 MB，请缩小后再上传。');
        objectUrl = URL.createObjectURL(fileOrUrl);
      }
      say('正在载入照片…');
      const image = await loadImageUrl(objectUrl || fileOrUrl);
      if (disposed || id !== uploadGeneration) return;
      imageUrl = imageToCanvas(image, 1800).toDataURL('image/jpeg', .9);
      v.title = ''; v.caption = ''; v.keywords = ''; v.queries = ''; icons = [];
      for (const key of ['title', 'caption', 'keywords', 'queries']) copyInputs[key].value = '';
      showIcons(); render(); say('照片已载入，请在左侧填写标题、文案与图标关键词，再调整排版。');
    } catch (error) { if (id === uploadGeneration) say(error.message, true); }
    finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
  }

  async function exportArt(format, photo) {
    Object.values(exports).forEach(button => button.disabled = true);
    try {
      await document.fonts.ready;
      if (disposed) return;
      const markup = renderMicrographic(v, copy(), icons, imageUrl, measure, { photo, guides: false });
      const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
      const filename = `micrographic-${v.shape}-${Number(v.seed) || 1}${photo ? '' : '-label'}`;
      if (format === 'svg') downloadSVG(svg, `${filename}.svg`);
      else {
        const image = await loadImageUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup));
        if (disposed) return;
        const canvas = makeCanvas(1500, 2000); canvas.getContext('2d').drawImage(image, 0, 0, 1500, 2000);
        await downloadCanvasPNG(canvas, `${filename}.png`);
      }
      say('导出已完成，网格辅助线已自动隐藏。');
    } catch (error) { say(`导出失败：${error.message}`, true); }
    finally { if (!disposed) Object.values(exports).forEach(button => button.disabled = false); }
  }

  showIcons(); render(); say('内置街景示例 · 上传照片并填写文案，即可制作自己的标签海报。');
  document.fonts.ready.then(render);
  if (options.sourceImageUrl) upload(options.sourceImageUrl);
  return () => { disposed = true; iconGeneration++; uploadGeneration++; iconController?.abort(); clearTimeout(keywordTimer); };
}
