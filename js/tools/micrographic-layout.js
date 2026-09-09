import { mulberry32, clamp } from './shared.js';

export const PAGE = { width: 750, height: 1000 };
export const SHAPES = [
  { value: 'rectangle', label: '长方形', w: 540, h: 340 },
  { value: 'square', label: '正方形', w: 490, h: 490 },
  { value: 'triangle', label: '三角形', w: 530, h: 650 },
  { value: 'ellipse', label: '横椭圆', w: 640, h: 350 },
  { value: 'oval', label: '竖椭圆', w: 410, h: 730 },
  { value: 'diamond', label: '菱形', w: 650, h: 470 },
  { value: 'hexagon', label: '六边形', w: 570, h: 450 },
];

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Convex shapes: the narrowest horizontal span at either end of a band
// guarantees that all four corners (and thus the whole cell) stay inside.
export function halfSpan(shape, y) {
  if (y < 0 || y > 1) return 0;
  if (shape === 'triangle') return y / 2;
  if (shape === 'diamond') return Math.min(y, 1 - y);
  if (shape === 'ellipse' || shape === 'oval') return Math.sqrt(Math.max(0, 1 - (2 * y - 1) ** 2)) / 2;
  if (shape === 'hexagon') return .5 - Math.abs(y - .5) / 2;
  return .5;
}

export function labelBounds(v) {
  const shape = SHAPES.find(s => s.value === v.shape) || SHAPES[0];
  const scale = Math.min(clamp(Number(v.scale) || 100, 45, 130) / 100, 710 / shape.w, 950 / shape.h);
  const w = shape.w * scale, h = shape.h * scale;
  return { x: clamp(PAGE.width * v.x / 100 - w / 2, 20, PAGE.width - w - 20),
    y: clamp(PAGE.height * v.y / 100 - h / 2, 20, PAGE.height - h - 20), w, h };
}

export function shapeMarkup(shape, b, inset = 0) {
  const { x, y, w, h } = { x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2 };
  if (shape === 'ellipse' || shape === 'oval') return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  if (shape === 'triangle') return `<polygon points="${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}"/>`;
  if (shape === 'diamond') return `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}"/>`;
  if (shape === 'hexagon') return `<polygon points="${x + w / 4},${y} ${x + w * .75},${y} ${x + w},${y + h / 2} ${x + w * .75},${y + h} ${x + w / 4},${y + h} ${x},${y + h / 2}"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
}

export function createLayout(v) {
  const rng = mulberry32(Number(v.seed) || 1), box = labelBounds(v);
  const inset = Math.max(18, Number(v.gap) + 10);
  const inner = { x: box.x + inset, y: box.y + inset, w: box.w - inset * 2, h: box.h - inset * 2 };
  // Rectangular labels can keep a wide open middle like the photographic
  // references. Their corner modules share the same variable column tracks.
  if (['rectangle', 'square'].includes(v.shape) && (Number(v.seed) || 1) % 2) {
    const columns = clamp(Number(v.columns) || 3, 2, 5);
    const division = .42 + .035 * columns + Math.floor(rng() * 3) * .025;
    const splitY = .33 + rng() * .08;
    const specs = [
      ['serial', 0, 0, division - .04, .07],
      ['title', 0, .08, division - .04, splitY - .08],
      ['word0', division, 0, 1 - division, .12],
      ['word1', division, .13, 1 - division, .10],
      ['word2', division, .24, 1 - division, .10],
      ['icon0', division, .36, (1 - division) * .42, .20],
      ['icon1', .04 + rng() * .08, splitY + .04, .18, .17],
      ['copy', 0, .73, division - .04, .27],
      ['icon2', division, .68, (1 - division) * .42, .18],
      ['word3', division, .90, 1 - division, .10],
    ];
    const mirror = rng() > .5, flip = rng() > .6;
    const cells = specs.map(([type, x, y, w, h]) => ({ type,
      x: inner.x + (mirror ? 1 - x - w : x) * inner.w,
      y: inner.y + (flip ? 1 - y - h : y) * inner.h,
      w: w * inner.w, h: h * inner.h,
      align: mirror ? 'end' : 'start',
    }));
    return { box, inner, cells, bands: cells };
  }
  const slots = v.shape === 'triangle'
    ? ['serial', 'keywordsA', 'icons', 'copy', 'keywordsB', 'title']
    : ['serial', 'title', 'keywordsA', 'icons', 'copy', 'keywordsB'];
  // Vary both reading order and track proportions, while reserving a real
  // typographic hierarchy. Triangle keeps the large title at its wide base.
  if (v.shape !== 'triangle' && rng() > .5) [slots[1], slots[3]] = [slots[3], slots[1]];
  if (rng() > .5) [slots[2], slots[4]] = [slots[4], slots[2]];
  const weights = slots.map(type => ({ serial: .5, title: 2.6, copy: 1.55, icons: 1.6, keywordsA: 1, keywordsB: 1 })[type] * (.85 + rng() * .3));
  const total = weights.reduce((a, b) => a + b, 0), cells = [], bands = [];
  let cursor = v.shape === 'triangle' ? .14 : .08;
  const available = (v.shape === 'triangle' ? .80 : .84);
  for (let i = 0; i < slots.length; i++) {
    const y1 = cursor, y2 = cursor + available * weights[i] / total;
    cursor = y2;
    const span = Math.min(halfSpan(v.shape, y1), halfSpan(v.shape, y2));
    const padY = Math.min(3, (y2 - y1) * inner.h * .12);
    const band = { x: inner.x + (.5 - span) * inner.w + 5, y: inner.y + y1 * inner.h + padY,
      w: span * 2 * inner.w - 10, h: (y2 - y1) * inner.h - padY * 2, type: slots[i] };
    bands.push(band);
    const columns = clamp(Number(v.columns) || 3, 2, 5);
    const align = ['start', 'middle', 'end'][Math.floor(rng() * 3)];
    const split = (types, ratio) => {
      const left = band.w * ratio;
      cells.push({ ...band, w: left - 5, type: types[0], align: 'start' },
        { ...band, x: band.x + left + 5, w: band.w - left - 5, type: types[1], align: 'end' });
    };
    if (slots[i] === 'title' && band.w > 175) split(['title', 'icon0'], (columns - 1) / columns);
    else if (slots[i] === 'keywordsA' || slots[i] === 'keywordsB') {
      const start = slots[i] === 'keywordsA' ? 0 : 2;
      if (band.w > 200) split([`word${start}`, `word${start + 1}`], (1 + Math.floor(rng() * (columns - 1))) / columns);
      else cells.push({ ...band, type: `words${start}`, align });
    } else if (slots[i] === 'icons') {
      split(['icon1', 'icon2'], Math.floor(columns / 2) / columns);
    } else cells.push({ ...band, align });
  }
  return { box, cells, bands, inner };
}

// Wrap by words; long words and CJK split at characters. Never use textLength
// to distort type, and never truncate the exported copy to hide overflow.
export function fitText(text, w, h, maxSize, measure, weight = 700) {
  const tokens = String(text).trim().match(/[A-Za-z0-9'’/-]+|\s+|[^\s]/gu) || [];
  if (!tokens.length) return { lines: [], size: maxSize, lineHeight: maxSize };
  const wrap = size => {
    const lines = []; let line = '', space = false;
    for (const token of tokens) {
      if (/^\s+$/.test(token)) { space = true; continue; }
      const join = line && space ? ' ' : '';
      space = false;
      if (measure(line + join + token, size, weight) <= w) line += join + token;
      else {
        if (line) lines.push(line);
        line = '';
        for (const c of token) {
          if (line && measure(line + c, size, weight) > w) { lines.push(line); line = ''; }
          line += c;
        }
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const longestWord = Math.max(1, ...tokens.filter(t => /^[A-Za-z0-9'’/-]+$/.test(t)).map(t => measure(t, 1, weight)));
  let size = Math.max(.5, Math.min(maxSize, h / 1.15, w / longestWord)), lines = wrap(size);
  while (size > .5 && (lines.length * size * 1.15 > h || lines.some(s => measure(s, size, weight) > w))) {
    size *= .94; lines = wrap(size);
  }
  return { lines, size, lineHeight: size * 1.15 };
}
