import { BRAND_PROFILE_MAP } from "./brands.js";

export const BRAND_OPTIONS_KEY = "posterlab-brand-options-v1";
export const DEFAULT_BRAND_OPTIONS = {
  brandId: "",
  enabled: false,
  position: "bottom-right",
  blendMode: "normal",
  scale: 18,
  opacity: 1,
  margin: 28,
};

export function normalizeBrandOptions(input = {}) {
  const options = { ...DEFAULT_BRAND_OPTIONS, ...(input || {}) };
  if (!BRAND_PROFILE_MAP[options.brandId]) options.brandId = "";
  options.enabled = options.enabled !== false && !!options.brandId;
  options.scale = Math.min(42, Math.max(6, Number(options.scale) || DEFAULT_BRAND_OPTIONS.scale));
  options.opacity = Math.min(1, Math.max(0.05, Number(options.opacity) || DEFAULT_BRAND_OPTIONS.opacity));
  options.margin = Math.min(140, Math.max(0, Number(options.margin) || DEFAULT_BRAND_OPTIONS.margin));
  return options;
}

export function getBrandOptions() {
  try {
    return normalizeBrandOptions(JSON.parse(localStorage.getItem(BRAND_OPTIONS_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_BRAND_OPTIONS };
  }
}

export function setBrandOptions(input = {}) {
  const options = normalizeBrandOptions(input);
  try { localStorage.setItem(BRAND_OPTIONS_KEY, JSON.stringify(options)); } catch { /* 私密浏览模式下仍可继续导出 */ }
  return options;
}

const compositeModes = new Set(["source-over", "screen", "multiply", "overlay", "lighten", "darken"]);

function imageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("品牌 logo 读取失败"));
    image.src = src;
  });
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function placement(options, width, height, logoWidth, logoHeight, margin) {
  const inset = Math.max(0, margin);
  switch (options.position) {
    case "top-left": return [inset, inset];
    case "top-right": return [width - logoWidth - inset, inset];
    case "bottom-left": return [inset, height - logoHeight - inset];
    case "center": return [(width - logoWidth) / 2, (height - logoHeight) / 2];
    case "bottom-right":
    default: return [width - logoWidth - inset, height - logoHeight - inset];
  }
}

// 把品牌 logo 合成到任意 canvas。工具导出的 PNG/SVG→PNG 都走这里，
// 因此品牌配置只需维护一份，模板与艺术工具可以共用。
export async function composeBrandCanvas(sourceCanvas, input = {}, scale = 1) {
  const options = normalizeBrandOptions(input);
  const target = makeCanvas(sourceCanvas.width * scale, sourceCanvas.height * scale);
  const ctx = target.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sourceCanvas, 0, 0, target.width, target.height);
  if (!options.enabled || !options.brandId) return target;

  const brand = BRAND_PROFILE_MAP[options.brandId];
  if (!brand?.logo) return target;
  const logo = await imageFromUrl(brand.logo);
  const logoWidth = Math.max(1, target.width * (options.scale / 100));
  const logoHeight = logoWidth * ((logo.naturalHeight || logo.height) / Math.max(1, logo.naturalWidth || logo.width));
  const [x, y] = placement(options, target.width, target.height, logoWidth, logoHeight, options.margin * scale);
  ctx.save();
  ctx.globalAlpha = options.opacity;
  ctx.globalCompositeOperation = compositeModes.has(options.blendMode) ? options.blendMode : "source-over";
  ctx.drawImage(logo, x, y, logoWidth, logoHeight);
  ctx.restore();
  return target;
}

export function triggerCanvasDownload(canvas, filename) {
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}

export async function downloadBrandedCanvasPNG(sourceCanvas, filename = "poster-lab.png", scale = 1, input = getBrandOptions()) {
  const target = await composeBrandCanvas(sourceCanvas, input, scale);
  triggerCanvasDownload(target, filename);
  return target;
}

// 工具模块为了保持零构建与低耦合，通过这个小桥接读取导出配置。
// 直接导入 brand-export.js 的页面也可以正常工作。
if (typeof window !== "undefined") {
  window.PosterLabBrandExport = { getBrandOptions, downloadBrandedCanvasPNG };
}
