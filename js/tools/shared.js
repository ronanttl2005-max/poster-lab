// ============================================================
// 艺术工具 · 共享算法与 UI 库
// 所有工具模块 (specimen / techlines / typeflow) 共用。
// 约定：工具模块只 import 本文件，不修改本文件；
// 工具自己的特殊样式用 injectStyle(id, css) 注入。
// ============================================================

// ---------- 小工具 ----------
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const debounce = (fn, ms = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// 可复现随机数（技术线稿等生成式工具用）
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

// ---------- 颜色 ----------
export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(s.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");

// 从视频参考里提取的海报色组：[主体填充, 相框填充]
export const ART_PALETTES = [
  ["#E6E6E6", "#00A651"], ["#F89812", "#A6CAFC"], ["#F9064B", "#049F73"],
  ["#FFBFA3", "#ABE5FF"], ["#F35520", "#A8E6FA"], ["#0AF0A7", "#908736"],
  ["#249BEB", "#F7CAAB"], ["#7AE212", "#520C97"], ["#111111", "#FFE600"],
  ["#E8D5F5", "#DE3900"], ["#FF5CA8", "#DFF3C1"], ["#2B2BE6", "#FFD6E7"],
  ["#D6F94B", "#8C4BF9"], ["#FFFFFF", "#FF4D00"], ["#193CB8", "#F5F0E6"],
];
export const randomPalette = (rng = Math.random) =>
  ART_PALETTES[Math.floor((typeof rng === "function" ? rng() : Math.random) * ART_PALETTES.length) | 0] ||
  ART_PALETTES[0];

// ---------- 图像载入 ----------
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = url;
  });
}
export function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = url;
  });
}
export function imageToCanvas(img, maxDim = 1600) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------- 主体分割（核心）----------
// 原理与参考工具一致：环境色分离阈值 + 连通域分析，纯前端无需后端。
// 返回按面积降序的主体数组：{ x, y, w, h, area, mask(Uint8Array w*h), }
export function estimateBgColor(data, w, h) {
  const samples = [];
  const step = Math.max(1, Math.floor(w / 64));
  for (let x = 0; x < w; x += step) {
    samples.push(x, 0, x, h - 1);
  }
  const stepY = Math.max(1, Math.floor(h / 64));
  for (let y = 0; y < h; y += stepY) {
    samples.push(0, y, w - 1, y);
  }
  const rs = [], gs = [], bs = [];
  for (let i = 0; i < samples.length; i += 2) {
    const idx = (samples[i + 1] * w + samples[i]) * 4;
    rs.push(data[idx]);
    gs.push(data[idx + 1]);
    bs.push(data[idx + 2]);
  }
  const med = (arr) => {
    arr.sort((a, b) => a - b);
    return arr[arr.length >> 1];
  };
  return [med(rs), med(gs), med(bs)];
}

export function segmentSubjects(canvas, opts = {}) {
  const {
    threshold = 60,        // 环境色分离阈值 (0-255 色距)
    minAreaRatio = 0.001,  // 忽略过小碎片
    maxSubjects = 24,
    smooth = 1,            // 形态学收敛次数（去噪）
  } = opts;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, w, h).data;
  const bg = estimateBgColor(data, w, h);

  // 1) 前景掩膜
  let fg = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const dr = data[p] - bg[0], dg = data[p + 1] - bg[1], db = data[p + 2] - bg[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    const alpha = data[p + 3];
    fg[i] = alpha > 40 && dist > threshold ? 1 : 0;
  }
  // 2) 形态学开+闭（去孤点、连断裂）
  for (let s = 0; s < smooth; s++) {
    fg = erode(fg, w, h);
    fg = dilate(fg, w, h);
    fg = dilate(fg, w, h);
    fg = erode(fg, w, h);
  }
  // 3) 连通域（8 连通，迭代栈防爆栈）
  const labels = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!fg[start] || labels[start] !== -1) continue;
    const id = comps.length;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = id;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    const pixels = [];
    while (sp > 0) {
      const cur = stack[--sp];
      const cx = cur % w, cy = (cur / w) | 0;
      area++;
      pixels.push(cur);
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (fg[ni] && labels[ni] === -1) {
            labels[ni] = id;
            stack[sp++] = ni;
          }
        }
      }
    }
    comps.push({ minX, minY, maxX, maxY, area, pixels });
  }
  const minArea = Math.max(24, w * h * minAreaRatio);
  const subjects = comps
    .filter((c) => c.area >= minArea)
    .sort((a, b) => b.area - a.area)
    .slice(0, maxSubjects)
    .map((c) => {
      const sw = c.maxX - c.minX + 1, sh = c.maxY - c.minY + 1;
      const mask = new Uint8Array(sw * sh);
      for (const p of c.pixels) {
        const px = p % w, py = (p / w) | 0;
        mask[(py - c.minY) * sw + (px - c.minX)] = 1;
      }
      return { x: c.minX, y: c.minY, w: sw, h: sh, area: c.area, mask };
    });
  return { subjects, bg, width: w, height: h };
}

function erode(src, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out[i] =
        src[i] & src[i - 1] & src[i + 1] & src[i - w] & src[i + w] ? 1 : 0;
    }
  }
  return out;
}
function dilate(src, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i] =
        src[i] ||
        (x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) ||
        (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])
          ? 1
          : 0;
    }
  }
  return out;
}

// ---------- 主体渲染 ----------
// 原图抠图（掩膜内保留原像素，外部透明）
export function subjectCutout(srcCanvas, subject) {
  const { x, y, w, h, mask } = subject;
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d");
  ctx.drawImage(srcCanvas, x, y, w, h, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) if (!mask[i]) img.data[i * 4 + 3] = 0;
  ctx.putImageData(img, 0, 0);
  return out;
}
// 纯色剪影
export function subjectSilhouette(subject, color = "#111111") {
  const { w, h, mask } = subject;
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d");
  const [r, g, b] = hexToRgb(color);
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) {
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
// 半调网点：在掩膜内按原图明度放置圆点；hollow=true 时忽略原图明度（实心防镂空）
export function subjectHalftone(srcCanvas, subject, opts = {}) {
  const { dot = 6, color = "#111111", useLuma = true } = opts;
  const { x, y, w, h, mask } = subject;
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d");
  const src = makeCanvas(w, h).getContext("2d");
  src.drawImage(srcCanvas, x, y, w, h, 0, 0, w, h);
  const data = src.getImageData(0, 0, w, h).data;
  ctx.fillStyle = color;
  const step = Math.max(2, dot);
  for (let gy = 0; gy < h; gy += step) {
    const offset = ((gy / step) | 0) % 2 ? step / 2 : 0;
    for (let gx = 0; gx < w; gx += step) {
      const cx = Math.min(w - 1, Math.round(gx + offset));
      const cy = Math.min(h - 1, gy);
      const mi = cy * w + cx;
      if (!mask[mi]) continue;
      let radius = step * 0.42;
      if (useLuma) {
        const p = mi * 4;
        const luma = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) / 255;
        radius = step * 0.5 * (1 - luma * 0.85);
        if (radius < 0.4) continue;
      }
      ctx.beginPath();
      ctx.arc(cx + step / 2, cy + step / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return out;
}
// 像素化（掩膜内马赛克）
export function subjectPixelate(srcCanvas, subject, opts = {}) {
  const { size = 12 } = opts;
  const { x, y, w, h, mask } = subject;
  const small = makeCanvas(Math.max(1, w / size), Math.max(1, h / size));
  const sctx = small.getContext("2d");
  sctx.drawImage(srcCanvas, x, y, w, h, 0, 0, small.width, small.height);
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) if (!mask[i]) img.data[i * 4 + 3] = 0;
  ctx.putImageData(img, 0, 0);
  return out;
}
// 膨胀剪影（贴纸描边用）：以 16 方向盖章法近似膨胀 radius 像素
export function dilatedSilhouette(subjectOrCanvas, radius, color = "#ffffff", subject) {
  let base;
  if (subjectOrCanvas instanceof HTMLCanvasElement) {
    base = subjectOrCanvas;
  } else {
    base = subjectSilhouette(subjectOrCanvas, "#000");
  }
  const pad = Math.ceil(radius) + 2;
  const out = makeCanvas(base.width + pad * 2, base.height + pad * 2);
  const ctx = out.getContext("2d");
  const dirs = 16;
  for (let step = 1; step <= radius; step += Math.max(1, radius / 6)) {
    for (let d = 0; d < dirs; d++) {
      const angle = (d / dirs) * Math.PI * 2;
      ctx.drawImage(base, pad + Math.cos(angle) * step, pad + Math.sin(angle) * step);
    }
  }
  ctx.drawImage(base, pad, pad);
  // 染色
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalCompositeOperation = "source-over";
  out.dataset ? (out.dataset.pad = pad) : null;
  out.pad = pad;
  return out;
}
// 多层贴纸描边：返回一张已经叠好 N 层黑白相间描边+主体的画布
export function stickerOutline(renderedSubjectCanvas, subject, layers = 3, gap = 10) {
  const maskCanvas = subjectSilhouette(subject, "#000");
  const maxR = layers * gap;
  const pad = maxR + 4;
  const out = makeCanvas(subject.w + pad * 2, subject.h + pad * 2);
  const ctx = out.getContext("2d");
  for (let layer = layers; layer >= 1; layer--) {
    const ring = dilatedSilhouette(maskCanvas, layer * gap, layer % 2 ? "#111111" : "#ffffff");
    ctx.drawImage(ring, pad - ring.pad, pad - ring.pad);
  }
  const inner = dilatedSilhouette(maskCanvas, Math.max(2, gap * 0.35), "#ffffff");
  ctx.drawImage(inner, pad - inner.pad, pad - inner.pad);
  ctx.drawImage(renderedSubjectCanvas, pad, pad);
  out.pad = pad;
  return out;
}

// ---------- 导出 ----------
export function downloadCanvasPNG(canvas, filename = "poster-lab-tool.png", scale = 1) {
  let target = canvas;
  if (scale !== 1) {
    target = makeCanvas(canvas.width * scale, canvas.height * scale);
    const ctx = target.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvas, 0, 0, target.width, target.height);
  }
  const a = document.createElement("a");
  a.download = filename;
  a.href = target.toDataURL("image/png");
  a.click();
}
export function downloadSVG(svgEl, filename = "poster-lab-tool.svg") {
  const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], {
    type: "image/svg+xml",
  });
  const a = document.createElement("a");
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export function svgToPng(svgEl, filename = "poster-lab-tool.png", scale = 2) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  img.onload = () => {
    const vb = svgEl.viewBox?.baseVal;
    const w = (vb && vb.width) || svgEl.clientWidth || img.width;
    const h = (vb && vb.height) || svgEl.clientHeight || img.height;
    const canvas = makeCanvas(w * scale, h * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    downloadCanvasPNG(canvas, filename, 1);
  };
  img.src = url;
}

// ---------- 控件构建 ----------
// schema: [{key,label,type,...}]  type: range|color|select|text|textarea|checkbox|file|button|info
// range: {min,max,step}  select: {options:[{value,label}]}  file: {accept}
// onChange(key, value, values) ；button 用 {onClick}
export function buildControls(panel, schema, values, onChange) {
  panel.classList.add("tc-panel");
  const inputs = {};
  for (const f of schema) {
    const row = document.createElement("div");
    row.className = "tc-field tc-" + f.type;
    if (f.type === "info") {
      row.innerHTML = `<div class="tc-info">${f.label}</div>`;
      panel.append(row);
      continue;
    }
    if (f.type === "button") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tc-btn" + (f.primary ? " primary" : "");
      btn.textContent = f.label;
      btn.addEventListener("click", () => f.onClick?.(values));
      row.append(btn);
      panel.append(row);
      inputs[f.key || f.label] = btn;
      continue;
    }
    const label = document.createElement("label");
    label.className = "tc-label";
    label.innerHTML = `<span>${f.label}</span>${f.type === "range" ? `<em class="tc-val"></em>` : ""}`;
    row.append(label);
    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      for (const o of f.options) {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        input.append(opt);
      }
      input.value = values[f.key];
    } else if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = f.rows || 3;
      input.value = values[f.key] ?? "";
    } else {
      input = document.createElement("input");
      input.type = f.type === "file" ? "file" : f.type;
      if (f.type === "range") {
        input.min = f.min;
        input.max = f.max;
        input.step = f.step ?? 1;
        input.value = values[f.key];
        label.querySelector(".tc-val").textContent = values[f.key];
      } else if (f.type === "checkbox") {
        input.checked = !!values[f.key];
      } else if (f.type === "file") {
        if (f.accept) input.accept = f.accept;
        if (f.multiple) input.multiple = true;
      } else {
        input.value = values[f.key] ?? "";
      }
    }
    input.className = "tc-input";
    const evt = f.type === "file" ? "change" : f.type === "text" || f.type === "textarea" ? "input" : "input";
    input.addEventListener(evt, () => {
      let v;
      if (f.type === "file") v = input.files;
      else if (f.type === "checkbox") v = input.checked;
      else if (f.type === "range") {
        v = parseFloat(input.value);
        label.querySelector(".tc-val").textContent = input.value;
      } else v = input.value;
      if (f.type !== "file") values[f.key] = v;
      onChange(f.key, v, values);
    });
    row.append(input);
    panel.append(row);
    inputs[f.key] = input;
  }
  return inputs;
}

// 分组折叠标题
export function panelSection(panel, title) {
  const el = document.createElement("div");
  el.className = "tc-section";
  el.textContent = title;
  panel.append(el);
  return el;
}

// ---------- 样式注入 ----------
const injected = new Set();
export function injectStyle(id, css) {
  if (injected.has(id)) return;
  injected.add(id);
  const style = document.createElement("style");
  style.dataset.tool = id;
  style.textContent = css;
  document.head.append(style);
}

// ---------- 拖拽 ----------
// 让画布内元素可拖动：items=[{x,y,w,h}...]（画布坐标），hit 用 bbox。
// callbacks: onPick(index), onMove(index,nx,ny), onDrop()
export function enableDrag(canvasEl, getItems, { toCanvasCoords, onPick, onMove, onDrop } = {}) {
  let picked = -1, offX = 0, offY = 0;
  const coords = (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const px = ((e.touches?.[0]?.clientX ?? e.clientX) - rect.left) * (canvasEl.width / rect.width);
    const py = ((e.touches?.[0]?.clientY ?? e.clientY) - rect.top) * (canvasEl.height / rect.height);
    return toCanvasCoords ? toCanvasCoords(px, py) : [px, py];
  };
  const down = (e) => {
    const [mx, my] = coords(e);
    const items = getItems();
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (mx >= it.x && mx <= it.x + it.w && my >= it.y && my <= it.y + it.h) {
        picked = i;
        offX = mx - it.x;
        offY = my - it.y;
        onPick?.(i);
        e.preventDefault();
        return;
      }
    }
    picked = -1;
  };
  const move = (e) => {
    if (picked < 0) return;
    const [mx, my] = coords(e);
    onMove?.(picked, mx - offX, my - offY);
    e.preventDefault();
  };
  const up = () => {
    if (picked >= 0) onDrop?.(picked);
    picked = -1;
  };
  canvasEl.addEventListener("mousedown", down);
  canvasEl.addEventListener("touchstart", down, { passive: false });
  window.addEventListener("mousemove", move);
  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("mouseup", up);
  window.addEventListener("touchend", up);
  return () => {
    canvasEl.removeEventListener("mousedown", down);
    canvasEl.removeEventListener("touchstart", down);
    window.removeEventListener("mousemove", move);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("mouseup", up);
    window.removeEventListener("touchend", up);
  };
}

// ---------- 内置演示图（无需上传即可体验）----------
// 生成一张含多个异形主体的演示图，供分割类工具默认加载。
export function demoSubjectsImage(w = 900, h = 700, seed = 7) {
  const rng = mulberry32(seed);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(0, 0, w, h);
  const colors = ["#3a2f22", "#54432e", "#2e3a26", "#43301f", "#514b33"];
  const blobs = 7;
  for (let i = 0; i < blobs; i++) {
    const cx = 90 + rng() * (w - 220), cy = 80 + rng() * (h - 200);
    const baseR = 34 + rng() * 46;
    ctx.fillStyle = pick(rng, colors);
    ctx.beginPath();
    const pts = 14;
    for (let p = 0; p <= pts; p++) {
      const angle = (p / pts) * Math.PI * 2;
      const wobble = 0.55 + rng() * 0.9;
      const px = cx + Math.cos(angle) * baseR * wobble * (1 + 0.7 * Math.sin(angle * 3 + i));
      const py = cy + Math.sin(angle) * baseR * wobble;
      p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // 内部纹理
    ctx.fillStyle = "rgba(255,255,255,.14)";
    for (let d = 0; d < 40; d++) {
      ctx.fillRect(cx - baseR + rng() * baseR * 2, cy - baseR + rng() * baseR * 2, 2, 2);
    }
  }
  return canvas;
}
