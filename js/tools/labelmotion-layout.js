import { mulberry32, clamp } from './shared.js';

export const PAPER = { width: 750, height: 1050 };
const THEMES = [
  { match: /自然|植物|叶|生长|森林|生态|leaf|nature|green/i, words: ['生长', 'LEAF', 'NATURE', '呼吸', 'GREEN', 'ROOTS'], icons: ['leaf', 'sun', 'layers', 'dots'] },
  { match: /咖啡|coffee|茶|tea|烘焙|饮/i, words: ['COFFEE', '慢下来', 'BREW', 'DAILY', '一杯日常', 'WARM'], icons: ['cup', 'sun', 'clock', 'spark'] },
  { match: /音乐|声音|music|sound|节奏|演出/i, words: ['SOUND', '共振', 'RHYTHM', 'LIVE', 'FREQUENCY', '回响'], icons: ['wave', 'disc', 'spark', 'dots'] },
  { match: /运动|骑|城市|瞬|街|urban|motion|transit|自行车/i, words: ['URBAN', 'MOTION', 'TRANSIT', '瞬息', 'VOID', '流动'], icons: ['bike', 'building', 'clock', 'layers'] },
];
export function contentKit(topic, detail = '') {
  const raw = String(topic || '').trim();
  const theme = THEMES.find(t => t.match.test(raw + ' ' + detail));
  const supplied = (raw + '\n' + detail).split(/[\n，,。；;、|！!？?]+/).map(s => s.trim()).filter(Boolean);
  const words = [...new Set([...supplied.filter(s => s.length <= 22), ...(theme?.words || ['IDEA', '观察', 'FIELD', 'RECORD', '日常', 'EXPLORE'])])].slice(0, 12);
  return { words, icons: theme?.icons || ['spark', 'layers', 'dots', 'sun'] };
}
export function makeLabels(lines, topic) {
  const kit = contentKit(topic);
  return String(lines).split('\n').map(s => s.trim()).filter(Boolean).slice(0, 18).map((text, i) => ({ id: i, text: text.slice(0, 120), icon: kit.icons[i % kit.icons.length] }));
}

// An occupied-cell layout keeps every label disjoint and inside the print area.
export function arrangeLabels(labels, seed = 1, mode = 'scatter') {
  const rng = mulberry32(seed), cells = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) cells.push({ x: 54 + c * 222, y: 274 + r * 107, w: 198, h: 88, r, c });
  if (mode === 'diagonal') cells.sort((a, b) => Math.abs(a.c - a.r * 0.4) - Math.abs(b.c - b.r * 0.4) || a.r - b.r);
  else if (mode !== 'grid') {
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  }
  return labels.slice(0, cells.length).map((label, i) => {
    const cell = cells[i];
    return { ...label, x: cell.x + (mode === 'scatter' ? rng() * 12 : 0), y: cell.y, w: 182, h: 100, variant: Math.floor(rng() * 3) };
  });
}

export function validQuad(q) {
  if (!Array.isArray(q) || q.length !== 4 || q.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
  const crosses = q.map((a, i) => { const b = q[(i + 1) % 4], c = q[(i + 2) % 4]; return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x); });
  return crosses.every(v => v > 100);
}

// Projective transform from a unit square to TL, TR, BR, BL. Unlike bilinear
// interpolation, straight lines stay straight when fitting a photographed plane.
export function quadProject(q, u, v) {
  const [a, b, c, d] = q;
  const dx1 = b.x - c.x, dx2 = d.x - c.x, dx3 = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y, dy2 = d.y - c.y, dy3 = a.y - b.y + c.y - d.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(den) < 1e-9 ? 0 : (dx3 * dy2 - dx2 * dy3) / den;
  const h = Math.abs(den) < 1e-9 ? 0 : (dx1 * dy3 - dx3 * dy1) / den;
  const z = g * u + h * v + 1;
  return { x: ((b.x - a.x + g * b.x) * u + (d.x - a.x + h * d.x) * v + a.x) / z,
    y: ((b.y - a.y + g * b.y) * u + (d.y - a.y + h * d.y) * v + a.y) / z };
}

export function moveLabel(item, x, y) {
  return { ...item, x: clamp(x, 26, PAPER.width - item.w - 26), y: clamp(y, 245, 935 - item.h) };
}
