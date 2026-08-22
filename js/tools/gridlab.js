// ============================================================
// 艺术工具 · 随机排版网格系统 Generative Grid System
// 以列、行、基线和层级字号为骨架，将文本、图片与色块重组为可复现的
// 现代主义网格版面。全部版式在 SVG 中生成，可导出矢量与高清 PNG。
// ============================================================
import {
  mulberry32,
  pick,
  randInt,
  clamp,
  debounce,
  hexToRgb,
  downloadSVG,
  svgToPng,
  injectStyle,
  buildControls,
  panelSection,
  loadImageUrl,
  makeCanvas,
} from "./shared.js";

const NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";
const CANVAS_W = 760;
const HEIGHTS = { a: 1075, portrait: 1013, square: 760 };
const SANS = '"Helvetica Neue", "PingFang SC", "Noto Sans SC", Arial, sans-serif';

const DEFAULT_TEXT = `Grid measures attention
Baseline field and flow
The grid begins as a quiet agreement between space and attention.
网格首先是对页面的测量，也是对注意力的安排。
Nested grids keep local decisions connected to their parent structure.
Breakout elements remember their anchor before they rotate or overflow.
Typography becomes deliberate when contrast follows measured space.
Structure, golden guides and book canons provide a measured field.
局部决定始终与父级结构保持关联，破格但不失去秩序。
Creative programming and visual development`;

const PRESETS = [
  {
    id: "system-map",
    name: "01 系统地图",
    values: {
      layout: "editorial", ratio: "a", columns: 12, rows: 25, margin: 60,
      gutter: 10, baseline: 8, blockCount: 13, imageCount: 2, hierarchy: 4,
      baseSize: 16, typeScale: 1.28, lineHeight: 1.02, breakAmount: 12,
      paper: "#f4f3ee", ink: "#101010", accent: "#133cff", secondary: "#fff200",
    },
  },
  {
    id: "baseline-measure",
    name: "02 基线测量",
    values: {
      layout: "measure", ratio: "a", columns: 12, rows: 21, margin: 72,
      gutter: 8, baseline: 8, blockCount: 8, imageCount: 1, hierarchy: 5,
      baseSize: 17, typeScale: 1.34, lineHeight: 1, breakAmount: 5,
      paper: "#fbfbfa", ink: "#090909", accent: "#133cff", secondary: "#ffef00",
    },
  },
  {
    id: "dual-field",
    name: "03 黑白双场",
    values: {
      layout: "split", ratio: "portrait", columns: 12, rows: 25, margin: 52,
      gutter: 10, baseline: 8, blockCount: 12, imageCount: 2, hierarchy: 4,
      baseSize: 15, typeScale: 1.3, lineHeight: 1.04, breakAmount: 9,
      paper: "#f7f7f5", ink: "#101010", accent: "#133cff", secondary: "#22d8dc",
    },
  },
  {
    id: "photo-canon",
    name: "04 图片主场",
    values: {
      layout: "photo", ratio: "a", columns: 12, rows: 25, margin: 58,
      gutter: 9, baseline: 8, blockCount: 7, imageCount: 1, hierarchy: 4,
      baseSize: 16, typeScale: 1.28, lineHeight: 1.02, breakAmount: 8,
      paper: "#f4f3ee", ink: "#111111", accent: "#133cff", secondary: "#fff200",
    },
  },
  {
    id: "anchor-field",
    name: "05 锚点留白",
    values: {
      layout: "anchor", ratio: "a", columns: 12, rows: 25, margin: 58,
      gutter: 9, baseline: 8, blockCount: 7, imageCount: 1, hierarchy: 4,
      baseSize: 15, typeScale: 1.3, lineHeight: 1.04, breakAmount: 4,
      paper: "#f4f3ee", ink: "#111111", accent: "#ff2a16", secondary: "#133cff",
    },
  },
  {
    id: "break-grid",
    name: "06 破格标题",
    values: {
      layout: "break", ratio: "a", columns: 12, rows: 25, margin: 60,
      gutter: 11, baseline: 8, blockCount: 8, imageCount: 1, hierarchy: 5,
      baseSize: 16, typeScale: 1.34, lineHeight: 0.96, breakAmount: 34,
      paper: "#f4f3ee", ink: "#111111", accent: "#ff2a16", secondary: "#133cff",
    },
  },
];

function node(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    n.setAttribute(key, String(value));
  }
  if (parent) parent.append(n);
  return n;
}

function textNode(parent, x, y, content, attrs = {}) {
  const t = node("text", { x, y, ...attrs }, parent);
  t.textContent = content;
  return t;
}

function svgDataUrl(markup) {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(markup)))}`;
}

function demoImages() {
  return [
    svgDataUrl(`<svg xmlns="${NS}" viewBox="0 0 720 520"><defs><linearGradient id="s" x2="1" y2="1"><stop stop-color="#d6c9a7"/><stop offset="1" stop-color="#f3ead3"/></linearGradient></defs><rect width="720" height="520" fill="url(#s)"/><rect x="70" y="42" width="250" height="390" fill="#c8e7f5"/><path d="M195 42v390M70 230h250" stroke="#f8f3e8" stroke-width="14"/><path d="M430 390h120v18H430zM450 230h16v160h-16zm78 0h16v160h-16zM438 218h118v28H438z" fill="#f6f3e9" stroke="#867d68" stroke-width="4"/><rect y="410" width="720" height="110" fill="#4e672a"/></svg>`),
    svgDataUrl(`<svg xmlns="${NS}" viewBox="0 0 720 520"><rect width="720" height="520" fill="#eeeadd"/><g fill="#153f21"><ellipse cx="176" cy="162" rx="88" ry="145" transform="rotate(-28 176 162)"/><ellipse cx="354" cy="132" rx="84" ry="156" transform="rotate(15 354 132)"/><ellipse cx="535" cy="185" rx="92" ry="154" transform="rotate(42 535 185)"/><ellipse cx="270" cy="365" rx="100" ry="158" transform="rotate(48 270 365)"/><ellipse cx="510" cy="382" rx="94" ry="156" transform="rotate(-20 510 382)"/></g><g stroke="#eeeadd" stroke-width="28"><path d="M60 455L650 38M180 510L430 30M420 520L570 80"/></g></svg>`),
    svgDataUrl(`<svg xmlns="${NS}" viewBox="0 0 720 520"><rect width="720" height="520" fill="#d8c8b8"/><rect x="60" y="115" width="600" height="330" fill="#f3eee4"/><path d="M60 190h600M130 115v330M535 115v330" stroke="#cab7a4" stroke-width="12"/><path d="M70 115h590l-100-75H170z" fill="#a45c42"/><circle cx="430" cy="275" r="70" fill="#1686a8"/><path d="M430 205v140M360 275h140" stroke="#f3eee4" stroke-width="14"/></svg>`),
    svgDataUrl(`<svg xmlns="${NS}" viewBox="0 0 720 520"><rect width="720" height="520" fill="#d8cab0"/><rect y="380" width="720" height="140" fill="#c8b595"/><path d="M120 337h490l-54-122H252l-70 36z" fill="#15964b" stroke="#133c27" stroke-width="10"/><path d="M275 225h220l40 94H208z" fill="#96d5e1" stroke="#133c27" stroke-width="9"/><circle cx="230" cy="370" r="55" fill="#202020"/><circle cx="522" cy="370" r="55" fill="#202020"/><circle cx="230" cy="370" r="23" fill="#c9c9c5"/><circle cx="522" cy="370" r="23" fill="#c9c9c5"/></svg>`),
  ];
}

function contrastColor(hex, dark = "#111111", light = "#ffffff") {
  const [r, g, b] = hexToRgb(hex);
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255 > 0.62 ? dark : light;
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function imageUrlAsDataUrl(url) {
  const img = await loadImageUrl(url);
  const canvas = makeCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

function textPieces(value) {
  const lines = String(value || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  return lines.length ? lines : textPieces(DEFAULT_TEXT);
}

function tokenizeForWrap(value, keepEnglishWords) {
  if (!keepEnglishWords) return Array.from(value);
  return value.match(/[A-Za-z0-9][A-Za-z0-9'’/_.:+-]*|[\u3400-\u9fff]|\s+|./g) || [];
}

function createMeasurer() {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  return (text, size, weight) => {
    ctx.font = `${weight} ${size}px ${SANS}`;
    return ctx.measureText(text).width;
  };
}

function wrapText(value, width, size, weight, keepEnglishWords, measure) {
  const tokens = tokenizeForWrap(String(value), keepEnglishWords);
  const lines = [];
  let line = "";
  for (const token of tokens) {
    const next = line + token;
    if (line && measure(next, size, weight) > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

const RECIPES = {
  editorial: [
    ["title", 0, 0, 7, 3], ["label", 8, 0, 4, 1, "accent"],
    ["body", 0, 4, 3, 4], ["body", 3, 4, 3, 4], ["body", 6, 4, 3, 4],
    ["body", 9, 4, 3, 4, "secondary"], ["color", 0, 9, 4, 3, "accent"],
    ["image", 7, 8, 5, 6], ["body", 5, 14, 7, 3], ["label", 2, 18, 2, 1, "secondary"],
    ["image", 0, 19, 5, 6], ["meta", 9, 23, 3, 2],
  ],
  measure: [
    ["large", 0, 0, 7, 4], ["body", 3, 4, 6, 4], ["large", 2, 9, 6, 3],
    ["body", 0, 12, 4, 5], ["label", 4, 12, 2, 1, "accent"],
    ["image", 4, 13, 8, 7], ["body", 4, 20, 8, 3],
  ],
  split: [
    ["panel", 6, 0, 6, 25, "ink"], ["body", 0, 3, 6, 3], ["image", 1, 5, 5, 6],
    ["large", 0, 11, 4, 3], ["body", 3, 15, 3, 4], ["large", 0, 19, 6, 4],
    ["title", 6, 1, 4, 3, "invert"], ["title", 10, 1, 2, 4, "accent"],
    ["body", 6, 5, 4, 4, "invert"], ["body", 10, 5, 2, 4, "paper"],
    ["label", 6, 10, 2, 1, "secondary"], ["label", 9, 10, 3, 1, "accent"],
    ["body", 9, 13, 3, 5, "invert"], ["image", 9, 20, 3, 5],
  ],
  photo: [
    ["image", 0, 0, 9, 19], ["title", 7, 3, 5, 4, "accent"],
    ["body", 9, 18, 3, 4, "paper"], ["large", 0, 19, 9, 2],
    ["label", 6, 20, 3, 1, "secondary"], ["meta", 9, 23, 3, 2],
  ],
  anchor: [
    ["title", 0, 0, 7, 4, "accent"], ["body", 0, 8, 7, 3, "paper"],
    ["guide", 0, 11, 12, 3], ["label", 7, 12, 5, 1, "secondary"],
    ["label", 0, 21, 4, 1, "secondary"], ["image", 9, 20, 3, 4],
  ],
  break: [
    ["body", 0, 2, 4, 4], ["body", 8, 2, 4, 4, "paper"],
    ["title", 4, 7, 8, 4, "accent"], ["body", 2, 13, 4, 4, "paper"],
    ["label", 6, 14, 4, 1, "secondary"], ["image", 0, 20, 4, 5],
    ["meta", 10, 23, 2, 2],
  ],
};

function scaledRecipeItem(item, cols, rows) {
  const [kind, c, r, cs, rs, tone] = item;
  const sc = clamp(Math.round((c / 12) * cols), 0, cols - 1);
  const sr = clamp(Math.round((r / 25) * rows), 0, rows - 1);
  const sw = clamp(Math.round((cs / 12) * cols), 1, cols - sc);
  const sh = clamp(Math.round((rs / 25) * rows), 1, rows - sr);
  return { kind, c: sc, r: sr, cs: sw, rs: sh, tone };
}

export default {
  id: "gridlab",
  name: "随机排版网格系统",
  nameEn: "Generative Grid System",
  desc: "用列、行、基线与层级字号组织文本、图片和色块；支持六种结构预设、连续随机变奏、可控破格，以及 PNG / 透明 PNG / SVG 导出。",
  tags: ["网格系统", "随机排版", "编辑设计", "SVG"],
  presets: PRESETS,
  cover: `<svg viewBox="0 0 280 120" xmlns="${NS}">
    <rect width="280" height="120" fill="#f4f3ee"/>
    <g stroke="#111" opacity=".22" stroke-width=".6">
      <path d="M18 12V108M39 12V108M60 12V108M81 12V108M102 12V108M123 12V108M144 12V108M165 12V108M186 12V108M207 12V108M228 12V108M249 12V108M270 12V108"/>
      <path d="M18 12H270M18 24H270M18 36H270M18 48H270M18 60H270M18 72H270M18 84H270M18 96H270M18 108H270"/>
    </g>
    <rect x="19" y="17" width="104" height="22" fill="#ff2a16"/>
    <text x="23" y="34" font-family="Arial,sans-serif" font-size="17" font-weight="700">BREAK THE GRID</text>
    <rect x="145" y="46" width="83" height="15" fill="#133cff"/>
    <text x="149" y="58" fill="#fff" font-family="Arial,sans-serif" font-size="10">measured field</text>
    <rect x="60" y="70" width="80" height="30" fill="#d8c8b8" stroke="#133cff"/>
    <text x="18" y="116" font-family="Arial,sans-serif" font-size="6">C01  C02  C03  C04  C05  C06  C07  C08  C09  C10  C11  C12</text>
  </svg>`,

  mount(container, options = {}) {
    injectStyle("tool-gridlab", `
      .gl-stage { flex-direction:column; align-items:center; gap:10px; }
      .gl-stage svg { width:auto; max-width:100%; max-height:82vh; background:transparent; }
      .gl-stagebar { width:min(100%,760px); display:flex; justify-content:space-between; gap:12px;
        color:var(--text-3); font:11px/1.4 var(--mono); }
      .gl-stagebar strong { color:var(--text-2); font-weight:500; }
      .gl-panel-note { margin:-4px 0 8px; color:var(--text-3); font-size:11px; line-height:1.55; }
    `);

    const values = {
      ratio: "a",
      layout: "editorial",
      seconds: 4,
      variance: 1,
      columns: 12,
      rows: 25,
      margin: 60,
      gutter: 10,
      baseline: 8,
      showGrid: true,
      showLabels: true,
      blockCount: 12,
      hierarchy: 4,
      baseSize: 16,
      typeScale: 1.28,
      lineHeight: 1.02,
      noBreak: true,
      textBg: true,
      text: DEFAULT_TEXT,
      imageCount: 2,
      colorBlocks: true,
      allowOverlap: true,
      breakAmount: 12,
      paper: "#f4f3ee",
      ink: "#101010",
      accent: "#133cff",
      secondary: "#fff200",
    };
    const preset = PRESETS.find((p) => p.id === options.presetId);
    if (preset) Object.assign(values, preset.values);

    const state = {
      seed: 19012026,
      blocks: [],
      images: demoImages(),
      timer: null,
      destroyed: false,
      version: 0,
    };
    const measure = createMeasurer();

    const panel = document.createElement("div");
    const stage = document.createElement("div");
    stage.className = "tool-stage gl-stage";
    const stagebar = document.createElement("div");
    stagebar.className = "gl-stagebar";
    const stateLabel = document.createElement("strong");
    const sizeLabel = document.createElement("span");
    stagebar.append(stateLabel, sizeLabel);
    const svg = node("svg", { xmlns: NS, role: "img", "aria-label": "随机排版网格生成结果" });
    stage.append(stagebar, svg);
    container.append(panel, stage);

    function dims() {
      return { W: CANVAS_W, H: HEIGHTS[values.ratio] || HEIGHTS.a };
    }

    function metrics() {
      const { W, H } = dims();
      const margin = clamp(values.margin, 20, Math.min(W, H) * 0.22);
      const cols = Math.round(values.columns);
      const rows = Math.round(values.rows);
      const gutter = Math.min(values.gutter, (W - margin * 2) / (cols * 2));
      const innerW = W - margin * 2;
      const innerH = H - margin * 2;
      const colW = (innerW - gutter * (cols - 1)) / cols;
      const rowH = innerH / rows;
      return { W, H, margin, cols, rows, gutter, innerW, innerH, colW, rowH };
    }

    function boxFor(block, m) {
      const baseX = m.margin + block.c * (m.colW + m.gutter);
      const baseY = m.margin + block.r * m.rowH;
      const w = block.cs * m.colW + Math.max(0, block.cs - 1) * m.gutter;
      const h = block.rs * m.rowH;
      return {
        x: baseX + (block.dx || 0),
        y: baseY + (block.dy || 0),
        w,
        h,
      };
    }

    function isOccupied(occupied, b, m) {
      if (values.allowOverlap) return false;
      for (let r = b.r; r < b.r + b.rs; r++) {
        for (let c = b.c; c < b.c + b.cs; c++) {
          if (r < m.rows && c < m.cols && occupied[r * m.cols + c]) return true;
        }
      }
      return false;
    }

    function markOccupied(occupied, b, m) {
      if (b.kind === "panel" || b.kind === "guide") return;
      for (let r = b.r; r < b.r + b.rs; r++) {
        for (let c = b.c; c < b.c + b.cs; c++) {
          if (r < m.rows && c < m.cols) occupied[r * m.cols + c] = 1;
        }
      }
    }

    function randomBlock(rng, occupied, m, index) {
      const kinds = ["body", "body", "label", "color", "image", "meta"];
      let kind = pick(rng, kinds);
      if (!values.colorBlocks && kind === "color") kind = "body";
      if (values.imageCount <= 0 && kind === "image") kind = "body";
      for (let attempt = 0; attempt < 50; attempt++) {
        const cs = kind === "label" ? randInt(rng, 2, 5) : randInt(rng, 2, Math.min(6, m.cols));
        const rs = kind === "label" ? 1 : randInt(rng, 2, Math.min(6, m.rows));
        const b = {
          kind,
          c: randInt(rng, 0, Math.max(0, m.cols - cs)),
          r: randInt(rng, 0, Math.max(0, m.rows - rs)),
          cs,
          rs,
          tone: kind === "color" ? pick(rng, ["accent", "secondary"]) : undefined,
          index,
        };
        if (!isOccupied(occupied, b, m)) return b;
      }
      return null;
    }

    function generateLayout() {
      const rng = mulberry32(state.seed);
      const m = metrics();
      const occupied = new Uint8Array(m.cols * m.rows);
      const recipe = RECIPES[values.layout] || RECIPES.editorial;
      const pieces = textPieces(values.text);
      const blocks = recipe.map((item, i) => ({ ...scaledRecipeItem(item, m.cols, m.rows), index: i }));
      const maxImages = Math.round(values.imageCount);
      let imageSeen = 0;
      for (const b of blocks) {
        if (b.kind === "image") {
          imageSeen++;
          if (imageSeen > maxImages) b.kind = "body";
        }
        markOccupied(occupied, b, m);
      }
      while (blocks.length < Math.round(values.blockCount)) {
        const b = randomBlock(rng, occupied, m, blocks.length);
        if (!b) break;
        blocks.push(b);
        markOccupied(occupied, b, m);
      }

      imageSeen = 0;
      for (const b of blocks) {
        if (b.kind === "image" && ++imageSeen > maxImages) b.kind = "body";
      }

      const breakScale = values.breakAmount / 100;
      const jitterMax = Math.min(m.colW, m.rowH) * 0.85 * breakScale * values.variance;
      let assignedImages = 0;
      blocks.forEach((b, i) => {
        b.text = pieces[(i + randInt(rng, 0, pieces.length - 1)) % pieces.length];
        b.dx = (rng() - 0.5) * jitterMax * 2;
        b.dy = (rng() - 0.5) * jitterMax * 1.3;
        b.rotate = (rng() - 0.5) * breakScale * 8 * values.variance;
        b.image = b.kind === "image" ? state.images[assignedImages++ % state.images.length] : null;
        if (b.kind === "title" && rng() < 0.45 && !b.tone) b.tone = "accent";
        if (b.kind === "label" && !b.tone) b.tone = pick(rng, ["accent", "secondary", "paper"]);
      });
      state.blocks = blocks;
      state.version++;
    }

    function fillForTone(tone) {
      if (tone === "accent") return values.accent;
      if (tone === "secondary") return values.secondary;
      if (tone === "ink" || tone === "invert") return values.ink;
      if (tone === "paper") return values.paper;
      return "none";
    }

    function inkForTone(tone) {
      const fill = fillForTone(tone);
      return fill === "none" ? values.ink : contrastColor(fill, values.ink, "#ffffff");
    }

    function drawGrid(root, m) {
      if (!values.showGrid) return;
      const g = node("g", { "data-layer": "grid", fill: "none", stroke: values.ink }, root);
      const baseOpacity = contrastColor(values.paper, "0.16", "0.22");
      for (let y = m.margin; y <= m.H - m.margin + 0.1; y += Math.max(4, values.baseline)) {
        node("line", { x1: m.margin, y1: y, x2: m.W - m.margin, y2: y, "stroke-width": 0.45, opacity: baseOpacity }, g);
      }
      for (let r = 0; r <= m.rows; r++) {
        const y = m.margin + r * m.rowH;
        node("line", { x1: m.margin, y1: y, x2: m.W - m.margin, y2: y, "stroke-width": 0.85, opacity: 0.32 }, g);
      }
      for (let c = 0; c < m.cols; c++) {
        const x = m.margin + c * (m.colW + m.gutter);
        node("line", { x1: x, y1: m.margin, x2: x, y2: m.H - m.margin, "stroke-width": 0.8, opacity: 0.34 }, g);
        node("line", { x1: x + m.colW, y1: m.margin, x2: x + m.colW, y2: m.H - m.margin, "stroke-width": 0.55, opacity: 0.22 }, g);
      }
      node("rect", { x: m.margin, y: m.margin, width: m.innerW, height: m.innerH, "stroke-width": 1.05, opacity: 0.5 }, g);
      if (!values.showLabels) return;
      const labels = node("g", { fill: values.ink, opacity: 0.48, "font-family": SANS, "font-size": 7 }, root);
      for (let c = 0; c < m.cols; c++) {
        const x = m.margin + c * (m.colW + m.gutter) + m.colW / 2;
        textNode(labels, x, m.margin - 10, `C${String(c + 1).padStart(2, "0")}`, { "text-anchor": "middle" });
      }
      const step = Math.max(1, Math.round(m.rows / 6));
      for (let r = 0; r < m.rows; r += step) {
        textNode(labels, m.margin - 10, m.margin + r * m.rowH + 3, `R${String(r + 1).padStart(2, "0")}`, { "text-anchor": "end" });
      }
    }

    function drawGuide(root, b, box) {
      const g = node("g", { opacity: 0.7 }, root);
      node("line", { x1: box.x, y1: box.y + box.h, x2: box.x + box.w, y2: box.y, stroke: values.accent, "stroke-width": 1.2 }, g);
      node("line", { x1: box.x, y1: box.y + box.h / 2, x2: box.x + box.w, y2: box.y + box.h / 2, stroke: values.secondary, "stroke-width": 1.3 }, g);
      node("line", { x1: box.x + box.w * 0.62, y1: box.y, x2: box.x + box.w * 0.62, y2: box.y + box.h * 2.4, stroke: values.accent, "stroke-width": 1.1 }, g);
    }

    function drawImage(root, defs, block, box, index) {
      if (!block.image) return;
      const clipId = `gl-clip-${state.version}-${index}`;
      const clip = node("clipPath", { id: clipId }, defs);
      node("rect", { x: box.x, y: box.y, width: box.w, height: box.h }, clip);
      const image = node("image", {
        x: box.x, y: box.y, width: box.w, height: box.h,
        preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${clipId})`,
      }, root);
      image.setAttribute("href", block.image);
      image.setAttributeNS(XLINK, "xlink:href", block.image);
      node("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: "none", stroke: values.accent, "stroke-width": 1.3 }, root);
      const tagW = Math.min(72, box.w * 0.45);
      node("rect", { x: box.x + 6, y: box.y + box.h - 18, width: tagW, height: 14, fill: values.ink, opacity: 0.9 }, root);
      textNode(root, box.x + 10, box.y + box.h - 8, `IMAGE / ${String(index + 1).padStart(2, "0")}`, {
        fill: contrastColor(values.ink, "#111111", "#ffffff"), "font-family": SANS, "font-size": 6.5,
      });
    }

    function drawTextBlock(root, defs, block, box, index) {
      const fill = fillForTone(block.tone);
      const shouldFill = fill !== "none" || (values.textBg && block.kind === "body");
      const actualFill = fill !== "none" ? fill : values.paper;
      if (shouldFill) node("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: actualFill, opacity: fill === "none" ? 0.94 : 1 }, root);

      const clipId = `gl-text-${state.version}-${index}`;
      const clip = node("clipPath", { id: clipId }, defs);
      node("rect", { x: box.x + 3, y: box.y + 2, width: Math.max(1, box.w - 6), height: Math.max(1, box.h - 4) }, clip);
      const g = node("g", { "clip-path": `url(#${clipId})` }, root);
      const titleBase = values.baseSize * (1.65 + values.hierarchy * 0.32) * Math.pow(values.typeScale, 0.55);
      let size = values.baseSize;
      let weight = 500;
      if (block.kind === "title") { size = titleBase; weight = 700; }
      else if (block.kind === "large") { size = titleBase * 1.28; weight = 700; }
      else if (block.kind === "label") { size = Math.max(8, values.baseSize * 0.72); weight = 600; }
      else if (block.kind === "meta") { size = Math.max(7, values.baseSize * 0.58); weight = 500; }
      const pad = block.kind === "label" ? 4 : Math.max(4, size * 0.12);
      const lineH = size * values.lineHeight;
      const lines = wrapText(block.text, Math.max(10, box.w - pad * 2), size, weight, values.noBreak, measure);
      const ink = inkForTone(block.tone);
      lines.slice(0, Math.max(1, Math.floor((box.h - pad * 2) / lineH))).forEach((line, lineIndex) => {
        textNode(g, box.x + pad, box.y + pad + size * 0.82 + lineIndex * lineH, line, {
          fill: ink,
          "font-family": SANS,
          "font-size": size,
          "font-weight": weight,
          "letter-spacing": block.kind === "meta" ? 0.8 : -0.25,
        });
      });
    }

    function render() {
      if (state.destroyed) return;
      const m = metrics();
      svg.setAttribute("viewBox", `0 0 ${m.W} ${m.H}`);
      svg.replaceChildren();
      const defs = node("defs", {}, svg);
      node("rect", { x: 0, y: 0, width: m.W, height: m.H, fill: values.paper, "data-paper": "true" }, svg);

      for (const b of state.blocks.filter((x) => x.kind === "panel")) {
        const box = boxFor(b, m);
        node("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: fillForTone(b.tone) }, svg);
      }
      drawGrid(svg, m);

      state.blocks.forEach((block, index) => {
        if (block.kind === "panel") return;
        const box = boxFor(block, m);
        const g = node("g", {
          transform: block.rotate ? `rotate(${block.rotate.toFixed(2)} ${box.x + box.w / 2} ${box.y + box.h / 2})` : null,
        }, svg);
        if (block.kind === "guide") drawGuide(g, block, box);
        else if (block.kind === "color") {
          if (values.colorBlocks) node("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: fillForTone(block.tone) }, g);
        } else if (block.kind === "image") drawImage(g, defs, block, box, index);
        else drawTextBlock(g, defs, block, box, index);
      });

      stateLabel.textContent = `${state.timer ? "PLAY" : "FRAME"} ${String(state.version).padStart(3, "0")} · SEED ${state.seed}`;
      sizeLabel.textContent = `${m.W}×${m.H}px · ${m.cols} COL / ${m.rows} ROW`;
    }

    const rerender = debounce(render, 45);
    function regenerate() {
      state.seed = (Math.random() * 0xffffffff) >>> 0;
      generateLayout();
      render();
    }

    function stopPlayback() {
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
      if (playButton) playButton.textContent = "▶ 开始连续变奏";
      render();
    }

    function startPlayback() {
      stopPlayback();
      state.timer = setInterval(regenerate, Math.max(0.6, values.seconds) * 1000);
      if (playButton) playButton.textContent = "Ⅱ 暂停连续变奏";
      render();
    }

    function togglePlayback() {
      if (state.timer) stopPlayback();
      else startPlayback();
    }

    function exportTransparent(scale = 2) {
      const clone = svg.cloneNode(true);
      clone.querySelector('[data-paper="true"]')?.remove();
      svgToPng(clone, `posterlab-gridlab-transparent-${state.seed}.png`, scale);
    }

    const onChange = (key) => {
      if (key === "seconds" && state.timer) startPlayback();
      if (["layout", "ratio", "columns", "rows", "margin", "gutter", "blockCount", "imageCount", "allowOverlap", "breakAmount", "variance", "text"].includes(key)) {
        generateLayout();
        rerender();
      } else rerender();
    };

    panelSection(panel, "启动控件");
    const actionInputs = buildControls(panel, [
      { key: "play", label: "▶ 开始连续变奏", type: "button", primary: true, onClick: togglePlayback },
      { key: "next", label: "→ 生成下一版（空格）", type: "button", onClick: regenerate },
      { key: "reset", label: "↻ 复位随机序列", type: "button", onClick: () => { state.seed = 19012026; generateLayout(); render(); } },
      { key: "seconds", label: "变奏间隔（秒）", type: "range", min: 1, max: 12, step: 0.5 },
      { key: "variance", label: "随机倍率", type: "range", min: 0.25, max: 1.75, step: 0.05 },
    ], values, onChange);
    const playButton = actionInputs.play;

    panelSection(panel, "网格参数");
    buildControls(panel, [
      { key: "layout", label: "结构范式", type: "select", options: [
        { value: "editorial", label: "层级编辑网格" },
        { value: "measure", label: "基线测量" },
        { value: "split", label: "黑白双场" },
        { value: "photo", label: "图片主场" },
        { value: "anchor", label: "锚点留白" },
        { value: "break", label: "破格标题" },
      ] },
      { key: "ratio", label: "画布", type: "select", options: [
        { value: "a", label: "A 竖版 · 760×1075" },
        { value: "portrait", label: "3:4 竖版 · 760×1013" },
        { value: "square", label: "1:1 方版 · 760×760" },
      ] },
      { key: "columns", label: "栏数", type: "range", min: 6, max: 16, step: 1 },
      { key: "rows", label: "行数", type: "range", min: 12, max: 32, step: 1 },
      { key: "margin", label: "经典边距", type: "range", min: 30, max: 100, step: 1 },
      { key: "gutter", label: "栏距", type: "range", min: 0, max: 28, step: 1 },
      { key: "baseline", label: "基线", type: "range", min: 4, max: 16, step: 1 },
      { key: "showGrid", label: "显示网格线", type: "checkbox" },
      { key: "showLabels", label: "显示 C / R 坐标", type: "checkbox" },
    ], values, onChange);

    panelSection(panel, "层级与文本");
    buildControls(panel, [
      { key: "hierarchy", label: "层级数", type: "range", min: 2, max: 5, step: 1 },
      { key: "baseSize", label: "正文基准字号", type: "range", min: 11, max: 24, step: 1 },
      { key: "typeScale", label: "字号倍率", type: "range", min: 1.1, max: 1.6, step: 0.01 },
      { key: "lineHeight", label: "行距倍率", type: "range", min: 0.9, max: 1.6, step: 0.02 },
      { key: "noBreak", label: "英文单词不拆词", type: "checkbox" },
      { key: "textBg", label: "正文使用纸色背景", type: "checkbox" },
      { key: "text", label: "文本内容（每行一个片段）", type: "textarea", rows: 8 },
    ], values, onChange);

    panelSection(panel, "图片与破格");
    const mediaInputs = buildControls(panel, [
      { key: "images", label: "上传图片（可多选）", type: "file", accept: "image/*", multiple: true },
      { key: "imageCount", label: "图片块数量", type: "range", min: 0, max: 4, step: 1 },
      { key: "blockCount", label: "最少版面元素数量", type: "range", min: 6, max: 20, step: 1 },
      { key: "colorBlocks", label: "启用色块", type: "checkbox" },
      { key: "allowOverlap", label: "允许元素叠压", type: "checkbox" },
      { key: "breakAmount", label: "破格幅度", type: "range", min: 0, max: 60, step: 1 },
      { key: "restoreDemo", label: "恢复内置演示图片", type: "button", onClick: () => { state.images = demoImages(); generateLayout(); render(); } },
    ], values, async (key, data) => {
      if (key !== "images") return onChange(key);
      const files = Array.from(data || []).slice(0, 8);
      if (!files.length) return;
      try {
        stateLabel.textContent = "正在嵌入图片…";
        state.images = await Promise.all(files.map(fileAsDataUrl));
        generateLayout();
        render();
      } catch {
        stateLabel.textContent = "图片读取失败，请换一组图片重试。";
      }
    });
    mediaInputs.images.title = "图片会以 Data URL 嵌入导出的 SVG，不会上传到服务器";

    panelSection(panel, "版面颜色");
    buildControls(panel, [
      { key: "paper", label: "底色", type: "color" },
      { key: "ink", label: "文字 / 网格", type: "color" },
      { key: "accent", label: "强调色", type: "color" },
      { key: "secondary", label: "辅助色", type: "color" },
    ], values, onChange);

    panelSection(panel, "导出");
    buildControls(panel, [
      { key: "png2", label: "导出 PNG 2×", type: "button", primary: true, onClick: () => svgToPng(svg, `posterlab-gridlab-${state.seed}-2x.png`, 2) },
      { key: "png4", label: "导出 PNG 4×", type: "button", onClick: () => svgToPng(svg, `posterlab-gridlab-${state.seed}-4x.png`, 4) },
      { key: "transparent", label: "导出透明 PNG 2×", type: "button", onClick: () => exportTransparent(2) },
      { key: "svg", label: "导出 SVG 矢量文件", type: "button", onClick: () => downloadSVG(svg, `posterlab-gridlab-${state.seed}.svg`) },
      { key: "exportInfo", label: "上传图片仅在浏览器本地处理，并会嵌入导出文件。SVG 中的网格、文字和色块保持矢量。", type: "info" },
    ], values, onChange);

    const onKey = (event) => {
      if (event.code !== "Space") return;
      if (/^(input|textarea|select|button)$/i.test(event.target?.tagName || "")) return;
      event.preventDefault();
      regenerate();
    };
    window.addEventListener("keydown", onKey);

    generateLayout();
    render();

    if (options.sourceImageUrl) {
      imageUrlAsDataUrl(options.sourceImageUrl)
        .then((url) => {
          if (state.destroyed) return;
          state.images = [url, ...state.images];
          generateLayout();
          render();
        })
        .catch(() => {});
    }

    return () => {
      state.destroyed = true;
      stopPlayback();
      window.removeEventListener("keydown", onKey);
    };
  },
};
