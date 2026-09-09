// Row envelopes reserve the full silhouette, including hollow outlined subjects.
export function maskRows(alpha, width, height, channels = 4) {
  return Array.from({ length: height }, (_, y) => {
    let left = width, right = -1;
    for (let x = 0; x < width; x++) {
      if (alpha[(y * width + x) * channels + channels - 1] > 32) {
        left = Math.min(left, x); right = x;
      }
    }
    return right < 0 ? null : [left, right + 1];
  });
}

export function freeSpans(items, top, bottom, left, right, gap = 6) {
  const blocked = [];
  for (const { rect, rows, sourceWidth, sourceHeight } of items) {
    if (bottom + gap <= rect.y || top - gap >= rect.y + rect.h) continue;
    const sy = rect.h / sourceHeight, sx = rect.w / sourceWidth;
    const y0 = Math.max(0, Math.floor((top - gap - rect.y) / sy));
    const y1 = Math.min(sourceHeight, Math.ceil((bottom + gap - rect.y) / sy));
    let lo = Infinity, hi = -Infinity;
    for (let y = y0; y < y1; y++) if (rows[y]) {
      lo = Math.min(lo, rect.x + rows[y][0] * sx - gap);
      hi = Math.max(hi, rect.x + rows[y][1] * sx + gap);
    }
    if (hi > left && lo < right) blocked.push([Math.max(left, lo), Math.min(right, hi)]);
  }
  blocked.sort((a, b) => a[0] - b[0]);
  const spans = [];
  let cursor = left;
  for (const [lo, hi] of blocked) {
    if (lo > cursor) spans.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (cursor < right) spans.push([cursor, right]);
  return spans;
}
