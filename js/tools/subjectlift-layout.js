// Image and matte always share this transform: silhouette registration must not drift.
export function coverRect(sw, sh, x, y, w, h, focusX = .5, focusY = .5) {
  const scale = Math.max(w / sw, h / sh);
  return { x: x + (w - sw * scale) * focusX, y: y + (h - sh * scale) * focusY,
    w: sw * scale, h: sh * scale };
}

export function alphaBounds(rgba, width, height, threshold = 8) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (rgba[(y * width + x) * 4 + 3] <= threshold) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < 0 ? null : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

export function refineAlpha(alpha, threshold = 128, softness = 30) {
  if (!softness) return alpha >= threshold ? 255 : 0;
  const t = Math.min(1, Math.max(0, (alpha - threshold + softness / 2) / softness));
  return Math.round(255 * t * t * (3 - 2 * t));
}

// Converted ONNX files do not consistently preserve their documented output name.
export function matteTensor(outputs) {
  const tensors = Object.values(outputs);
  const result = outputs.logits ?? outputs.output_image ?? (tensors.length === 1 ? tensors[0] : null);
  if (!result?.dims || result.dims.length !== 4 || result.dims[0] !== 1 || result.dims[1] !== 1) {
    throw new Error('模型未返回有效的主体蒙版');
  }
  return result;
}
