// ============================================================
// Poster Lab · 图片处理层（深度模式）
// ------------------------------------------------------------
// 模板里的 image 字段可以声明 fx: "<recipe>"，编辑器在「深度（重处理）」
// 模式下上传时调用 processImage()，把原图加工成贴合模板视觉的素材，
// 而不是纯替换。「简单（实时）」模式不走这里，只用 CSS filter/blend。
//
// 算法全部复用 js/tools/shared.js，本文件只做编排和配色映射。
// 不修改 shared.js。
// ============================================================

import {
  clamp,
  hexToRgb,
  imageToCanvas,
  loadImageUrl,
  makeCanvas,
  segmentSubjects,
  stickerOutline,
  subjectCutout,
  subjectHalftone,
} from "./tools/shared.js";

// 处理分辨率上限。海报画布是 750×1000，导出 pixelRatio:2 → 1500×2000，
// 素材给到 1200 长边足够，再大只是白烧 CPU 和内存。
const MAX_DIM = 1200;

export const RECIPES = ["halftone-mono", "pop-sticker", "blueprint-ghost", "duotone-print"];

export const RECIPE_LABELS = {
  "halftone-mono": "单色网点（暗调半调）",
  "pop-sticker": "波普贴纸（主体描边）",
  "blueprint-ghost": "蓝图幽灵（淡蓝叠印）",
  "duotone-print": "双色印刷（双色调 + 颗粒）",
};

// ---------- 内部工具 ----------

const toDataUrl = (canvas) => canvas.toDataURL("image/png");

// 造一个覆盖整张画布的“伪主体”，好让 subjectHalftone 这类
// 基于掩膜的算法能作用于全画面，而不用另写一套全图版本。
function fullFrameSubject(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const mask = new Uint8Array(w * h).fill(1);
  return { x: 0, y: 0, w, h, area: w * h, mask };
}

// 反相副本：subjectHalftone 的点半径随明度升高而变小（亮处点小）。
// 暗底海报要的是亮处点大，所以先把源图反相再交给它。
function invertedCopy(canvas) {
  const out = makeCanvas(canvas.width, canvas.height);
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// 叠加胶片颗粒。amount 0-1。
function addGrain(canvas, amount = 0.12) {
  if (amount <= 0) return canvas;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const strength = amount * 90;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (Math.random() - 0.5) * strength;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// 取面积最大的主体；分割失败（纯色/满幅照片）时退化为全画面。
function pickSubject(canvas, opts = {}) {
  let subjects = [];
  try {
    subjects = segmentSubjects(canvas, {
      threshold: opts.threshold ?? 60,
      minAreaRatio: 0.01,
      maxSubjects: 6,
      smooth: 1,
    }).subjects;
  } catch {
    subjects = [];
  }
  const total = canvas.width * canvas.height;
  const best = subjects[0];
  // 主体太小说明没找准（比如背景很花），不如整幅上效果。
  if (!best || best.area < total * 0.02) return { subject: fullFrameSubject(canvas), fellBack: true };
  return { subject: best, fellBack: false };
}

// ---------- recipe: halftone-mono ----------
// 图4 暗调半调 / 图6 背景板。整幅转成单色网点，亮部点大。
function halftoneMono(canvas, v = {}) {
  // boardColor 在前：用背景板底色当网点底，输出图才能无缝贴回板子上
  const bg = v.fxBg || v.boardColor || v.bg || "#0E0F12";
  const dotColor = v.fxDot || v.dotColor || "#F2EFE6";
  const dot = clamp(Number(v.dotSize) || 7, 3, 20);

  const src = invertedCopy(canvas);
  const dots = subjectHalftone(src, fullFrameSubject(src), {
    dot,
    color: dotColor,
    useLuma: true,
  });

  const out = makeCanvas(canvas.width, canvas.height);
  const ctx = out.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(dots, 0, 0);
  return out;
}

// ---------- recipe: pop-sticker ----------
// 图8 Hiiibrand 风。抠主体 → 提饱和 → 多层黑白描边。
// 参考的是“风格”，所以任何物体上传都能得到同一效果，不锁瓶盖。
function popSticker(canvas, v = {}) {
  const { subject } = pickSubject(canvas, { threshold: Number(v.fxThreshold) || 60 });
  const cut = subjectCutout(canvas, subject);

  // 高饱和 + 硬对比，模拟波普印刷
  const punchy = makeCanvas(cut.width, cut.height);
  const pctx = punchy.getContext("2d");
  pctx.filter = "saturate(165%) contrast(122%) brightness(104%)";
  pctx.drawImage(cut, 0, 0);
  pctx.filter = "none";

  const layers = clamp(Number(v.fxLayers) || 3, 1, 5);
  const gap = clamp(Number(v.fxGap) || Math.max(6, Math.round(Math.min(subject.w, subject.h) * 0.035)), 3, 40);
  return stickerOutline(punchy, subject, layers, gap);
}

// ---------- recipe: blueprint-ghost ----------
// 图9/图10 工业蓝图。抠主体 → 提亮压饱和 → 淡蓝叠印，背景透明。
function blueprintGhost(canvas, v = {}) {
  const tint = v.fxTint || v.gridColor || "#7FA8E8";
  const { subject } = pickSubject(canvas, { threshold: Number(v.fxThreshold) || 55 });
  const cut = subjectCutout(canvas, subject);

  const out = makeCanvas(cut.width, cut.height);
  const ctx = out.getContext("2d");
  ctx.filter = "grayscale(100%) brightness(128%) contrast(112%)";
  ctx.drawImage(cut, 0, 0);
  ctx.filter = "none";

  // 只在不透明像素上染色，保住抠图边缘
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.42;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

// ---------- recipe: duotone-print ----------
// 图3 / 图11 / 图12。明度映射到两个色相之间，再压一层颗粒。
function duotonePrint(canvas, v = {}) {
  const shadow = hexToRgb(v.fxShadow || v.duoShadow || "#16233E");
  const light = hexToRgb(v.fxLight || v.duoLight || "#E8A56B");
  const grain = clamp(Number(v.fxGrain ?? 0.1), 0, 1);

  const out = makeCanvas(canvas.width, canvas.height);
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    // 轻微 S 曲线，避免中间调糊成一片
    const t = clamp(luma * 1.12 - 0.06, 0, 1);
    d[i] = shadow[0] + (light[0] - shadow[0]) * t;
    d[i + 1] = shadow[1] + (light[1] - shadow[1]) * t;
    d[i + 2] = shadow[2] + (light[2] - shadow[2]) * t;
  }
  ctx.putImageData(img, 0, 0);
  return addGrain(out, grain);
}

const HANDLERS = {
  "halftone-mono": halftoneMono,
  "pop-sticker": popSticker,
  "blueprint-ghost": blueprintGhost,
  "duotone-print": duotonePrint,
};

/**
 * 把上传的图按 recipe 加工成模板素材。
 *
 * @param {string} dataUrl 原图（FileReader 读出的 data URL）
 * @param {string} recipe  RECIPES 之一；未知或缺省时原样返回
 * @param {object} v       当前模板的字段值，用来取配色/参数（fxBg、dotSize 等）
 * @returns {Promise<string>} 处理后的 PNG data URL；任何一步失败都回落到原图
 */
export async function processImage(dataUrl, recipe, v = {}) {
  if (!dataUrl) return dataUrl;
  const handler = HANDLERS[recipe];
  if (!handler) return dataUrl;
  try {
    const img = await loadImageUrl(dataUrl);
    const canvas = imageToCanvas(img, MAX_DIM);
    const out = handler(canvas, v);
    return out && out.width ? toDataUrl(out) : dataUrl;
  } catch (err) {
    console.warn(`[poster-fx] ${recipe} 处理失败，回退原图`, err);
    return dataUrl;
  }
}
