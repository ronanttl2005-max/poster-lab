// ============================================================
// 艺术工具 · 技术线稿生成器 Technical Line Generator
// 参考 typowow《TECHNICAL LINE GRAPHIC GENERATOR》：
// 网格分格 + 每格随机一种技术图形 + 等宽小字标注 + 彩色主体叠加。
// 仅依赖 ./shared.js，全部 SVG 元素用 createElementNS 创建。
// ============================================================
import {
  mulberry32, pick, randInt, clamp, debounce,
  downloadSVG, svgToPng, injectStyle,
  segmentSubjects, subjectSilhouette, dilatedSilhouette,
  loadImageFile, imageToCanvas, demoSubjectsImage,
  ART_PALETTES, hexToRgb, buildControls, panelSection,
} from "./shared.js";

const NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// ---------- 纸张主题 ----------
const THEMES = {
  white: { bg: "#fbfbf8", line: "#141414", label: "图纸白" },
  blue:  { bg: "#123a8c", line: "#f4f7ff", label: "蓝图纸" },
  kraft: { bg: "#d9c9a8", line: "#40301c", label: "牛皮纸" },
};
const RATIOS = { "3:4": 1200, "1:1": 900, "4:3": 675 };

// ---------- 技术词汇池 ----------
const CODES = ["NODE", "TOL", "REF", "PHASE", "AXIS", "CAL", "SIG", "GRID",
  "HARNESS", "PARAM", "DATA-BUS", "Z-AXIS", "ORBIT", "LATTICE", "VECT",
  "NOMINAL", "SCAN", "TILT", "FLUX", "GAIN"];
const COMMENTS = [
  "// terminal base caps fixed", "// polar: vector ranging grid",
  "// isometric wireframe [passive]", "// retrograde motion tracked",
  "// sweep offset +45\u00B0 locked", "// phase grid reference locked",
  "// harmonic scale engaged", "// pipeline: 3-stage flow control",
  "// calibration marker aligned", "// crosshair: optical telemetry",
  "// spectral density nominal", "// node blocks registered",
  "// interference pattern mapped", "// gear train ratio verified",
  "// inner core lattice engaged", "// secondary scale engaged",
  "// analog iteration matrix", "// bezier envelope sampled",
];
const UNITS = ["mm", "Hz", "deg", "kPa", "ms", "rev"];

function refCode(rng) { return `${pick(rng, CODES)}-${randInt(rng, 100, 999)}`; }
function fakeParam(rng) {
  const r = rng();
  if (r < 0.25) return `${pick(rng, ["TILT", "PITCH", "GRAD", "PHASE", "GAIN"])} ${(rng() * 9).toFixed(1)}`;
  if (r < 0.5) return `\u00B1${(rng() * 2).toFixed(2)} ${pick(rng, UNITS)}`;
  if (r < 0.75) return `fig.${randInt(rng, 1, 48)}`;
  return `x ${(rng() * 90).toFixed(1)}\u00B0`;
}

// ---------- SVG 基础助手（全部 createElementNS）----------
function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
}
function ln(g, x1, y1, x2, y2, s, extra = {}) {
  return el("line", {
    x1, y1, x2, y2, stroke: s.stroke, "stroke-width": extra.sw ?? s.sw,
    "stroke-dasharray": extra.dash, opacity: extra.op, ...extra.attrs,
  }, g);
}
function circ(g, cx, cy, r, s, extra = {}) {
  return el("circle", {
    cx, cy, r, fill: extra.fill ?? "none", stroke: extra.noStroke ? null : s.stroke,
    "stroke-width": extra.sw ?? s.sw, "stroke-dasharray": extra.dash, opacity: extra.op,
  }, g);
}
function rect(g, x, y, w, h, s, extra = {}) {
  return el("rect", {
    x, y, width: w, height: h, fill: extra.fill ?? "none",
    stroke: extra.noStroke ? null : s.stroke, "stroke-width": extra.sw ?? s.sw,
    "stroke-dasharray": extra.dash, opacity: extra.op,
  }, g);
}
function path(g, d, s, extra = {}) {
  return el("path", {
    d, fill: extra.fill ?? "none", stroke: s.stroke,
    "stroke-width": extra.sw ?? s.sw, "stroke-dasharray": extra.dash,
    "stroke-linejoin": "round", opacity: extra.op,
  }, g);
}
function poly(g, pts, s, extra = {}) {
  return el(extra.close ? "polygon" : "polyline", {
    points: pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "),
    fill: extra.fill ?? "none", stroke: s.stroke, "stroke-width": extra.sw ?? s.sw,
    "stroke-dasharray": extra.dash, "stroke-linejoin": "round", opacity: extra.op,
  }, g);
}
function txt(g, x, y, str, s, extra = {}) {
  const t = el("text", {
    x, y, fill: s.ink, "font-family": MONO,
    "font-size": extra.size ?? 6, "text-anchor": extra.anchor || "start",
    "letter-spacing": extra.ls ?? 0.3, opacity: extra.op,
  }, g);
  t.textContent = str;
  return t;
}
// 偶发虚线
function maybeDash(rng, s) {
  return rng() < s.dashProb ? `${(3 * s.sw).toFixed(1)} ${(2.4 * s.sw).toFixed(1)}` : null;
}
// 小箭头（从 (x1,y1) 指向 (x2,y2)）
function arrow(g, x1, y1, x2, y2, s, extra = {}) {
  ln(g, x1, y1, x2, y2, s, extra);
  const a = Math.atan2(y2 - y1, x2 - x1), L = extra.head ?? 4;
  poly(g, [
    [x2, y2],
    [x2 - L * Math.cos(a - 0.42), y2 - L * Math.sin(a - 0.42)],
    [x2 - L * Math.cos(a + 0.42), y2 - L * Math.sin(a + 0.42)],
  ], s, { close: true, fill: s.stroke, sw: 0 });
}

// ============================================================
// 图形绘制器 draw(g, box, rng, style)
// box = {x,y,w,h}  style = {stroke,ink,sw,dashProb,annot,complexity}
// ============================================================

// —— 几何与晶格 ——
function drawPolarGrid(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) * 0.36;
  const rings = 2 + s.complexity;
  for (let i = 1; i <= rings; i++) {
    circ(g, cx, cy, (R * i) / rings, s, { sw: s.sw * 0.75, dash: i % 2 ? null : maybeDash(rng, s) });
  }
  const spokes = randInt(rng, 8, 16);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ln(g, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, s, { sw: s.sw * 0.6 });
  }
  for (let i = 0; i < s.complexity * 2; i++) {
    const a = rng() * Math.PI * 2, rr = R * (0.3 + rng() * 0.7);
    circ(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.4, s, { fill: s.stroke, sw: 0 });
  }
  const aa = rng() * Math.PI * 2;
  arrow(g, cx, cy, cx + Math.cos(aa) * R * 1.16, cy + Math.sin(aa) * R * 1.16, s);
  if (rng() < s.annot) txt(g, cx + R * 0.75, cy - R - 4, `${randInt(rng, 10, 84)}\u00B0`, s, { size: 5 });
  if (rng() < s.annot) txt(g, cx, cy + R + 12, "// polar: vector ranging grid", s, { size: 5, anchor: "middle" });
}

function drawIsoCube(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) * 0.34;
  const V = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    V.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  poly(g, [...V, V[0]], s);
  for (const i of [0, 2, 4]) ln(g, cx, cy, V[i][0], V[i][1], s);
  // 内部晶格分层
  const layers = Math.max(1, s.complexity - 1);
  for (let l = 1; l <= layers; l++) {
    const t = l / (layers + 1);
    for (const [a, bb] of [[0, 2], [2, 4], [4, 0]]) {
      const p1 = [V[a][0] + (cx - V[a][0]) * t, V[a][1] + (cy - V[a][1]) * t];
      const p2 = [V[bb][0] + (cx - V[bb][0]) * t, V[bb][1] + (cy - V[bb][1]) * t];
      ln(g, p1[0], p1[1], p2[0], p2[1], s, { sw: s.sw * 0.55, dash: maybeDash(rng, s) });
    }
  }
  for (const v of V) circ(g, v[0], v[1], 1.6, s, { fill: s.stroke, sw: 0 });
  if (rng() < s.annot) {
    const v = pick(rng, V);
    txt(g, v[0] + 4, v[1] - 3, `POINT ${pick(rng, ["A", "B", "K", "R"])}`, s, { size: 5 });
  }
  if (rng() < s.annot) txt(g, cx, b.y + b.h - 4, "// isometric wireframe [passive]", s, { size: 5, anchor: "middle" });
  if (rng() < s.annot) txt(g, b.x + 4, cy, `AXO ${randInt(rng, 15, 40)}\u00B0`, s, { size: 5 });
}

function drawHexFrame(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) * 0.36;
  const V = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    V.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  poly(g, [...V, V[0]], s);
  // 全对角连线
  for (let i = 0; i < 6; i++)
    for (let j = i + 2; j < 6; j++)
      if (j - i !== 5) ln(g, V[i][0], V[i][1], V[j][0], V[j][1], s, { sw: s.sw * 0.5, dash: maybeDash(rng, s) });
  for (const v of V) circ(g, v[0], v[1], 2.2, s, { fill: "none" });
  circ(g, cx, cy, R * 0.14, s, { dash: maybeDash(rng, s) });
  if (rng() < s.annot) txt(g, V[1][0] + 4, V[1][1], `PIER ${randInt(rng, 1, 9)}`, s, { size: 5 });
  if (rng() < s.annot) txt(g, cx, b.y + b.h - 4, `EDGE ${randInt(rng, 100, 180)}.`, s, { size: 5, anchor: "middle" });
}

function drawVenn(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) * 0.22;
  const n = rng() < 0.5 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 6;
    circ(g, cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62, R, s, { dash: i === n - 1 ? maybeDash(rng, s) : null });
  }
  circ(g, cx, cy, 1.4, s, { fill: s.stroke, sw: 0 });
  if (rng() < s.annot) txt(g, cx, cy - R * 1.7, `UNION ${n}`, s, { size: 6, anchor: "middle" });
  if (rng() < s.annot) txt(g, cx, cy + R * 1.85, `LOGIC ${pick(rng, ["OR", "AND", "XOR"])}`, s, { size: 5, anchor: "middle" });
  if (rng() < s.annot) txt(g, b.x + b.w - 6, b.y + b.h - 4, fakeParam(rng), s, { size: 5, anchor: "end" });
}

function drawMeshFan(g, b, rng, s) {
  // 直线族包络（弦线曲面），从随机一个角展开
  const n = 8 + s.complexity * 3;
  const corner = randInt(rng, 0, 3);
  const x0 = corner % 2 ? b.x + b.w : b.x, y0 = corner < 2 ? b.y : b.y + b.h;
  const x1 = corner % 2 ? b.x : b.x + b.w, y1 = corner < 2 ? b.y + b.h : b.y;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ln(g, x0 + (x1 - x0) * t, y0, x1, y0 + (y1 - y0) * t, s, { sw: s.sw * 0.5 });
  }
  rect(g, b.x, b.y, b.w, b.h, s, { sw: s.sw * 0.7 });
  if (rng() < s.annot) txt(g, b.x + b.w / 2, b.y + b.h + 8, "// bezier envelope sampled", s, { size: 5, anchor: "middle" });
  if (rng() < s.annot) txt(g, x1 + (corner % 2 ? 4 : -4), y1, `N=${n}`, s, { size: 5, anchor: corner % 2 ? "start" : "end" });
}

// —— 波形与信号 ——
function drawWaveform(g, b, rng, s) {
  const cy = b.y + b.h / 2, amp = b.h * 0.32;
  const f1 = 2 + rng() * 4, f2 = 6 + rng() * 8, p1 = rng() * 6.28, p2 = rng() * 6.28;
  const pts = [];
  const n = 110;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const env = Math.sin(t * Math.PI); // 汉宁窗包络
    const y = Math.sin(t * f1 * 6.28 + p1) * 0.6 + Math.sin(t * f2 * 6.28 + p2) * 0.4;
    pts.push([b.x + t * b.w, cy - y * env * amp]);
  }
  ln(g, b.x, cy, b.x + b.w, cy, s, { sw: s.sw * 0.5, dash: `${2 * s.sw} ${2 * s.sw}` });
  poly(g, pts, s);
  // 包络虚线
  if (s.complexity >= 3) {
    const up = [], dn = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30, e = Math.sin(t * Math.PI) * amp;
      up.push([b.x + t * b.w, cy - e]);
      dn.push([b.x + t * b.w, cy + e]);
    }
    poly(g, up, s, { sw: s.sw * 0.45, dash: "2 2.4" });
    poly(g, dn, s, { sw: s.sw * 0.45, dash: "2 2.4" });
  }
  ln(g, b.x, cy - amp, b.x, cy + amp, s, { sw: s.sw * 0.6 });
  ln(g, b.x + b.w, cy - amp, b.x + b.w, cy + amp, s, { sw: s.sw * 0.6 });
  if (rng() < s.annot) txt(g, b.x, cy - amp - 5, `SIG ${(rng() * 2).toFixed(1)}`, s, { size: 6 });
  if (rng() < s.annot) txt(g, b.x + b.w, cy + amp + 9, `${randInt(rng, 40, 990)} Hz`, s, { size: 5, anchor: "end" });
}

function drawLissajous(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rx = b.w * 0.4, ry = b.h * 0.36;
  const a = randInt(rng, 1, 4), bb = randInt(rng, 2, 5), ph = rng() * Math.PI;
  const pts = [];
  for (let i = 0; i <= 260; i++) {
    const t = (i / 260) * Math.PI * 2;
    pts.push([cx + Math.sin(a * t + ph) * rx, cy + Math.sin(bb * t) * ry]);
  }
  rect(g, cx - rx - 5, cy - ry - 5, rx * 2 + 10, ry * 2 + 10, s, { sw: s.sw * 0.6, dash: maybeDash(rng, s) });
  poly(g, pts, s, { sw: s.sw * 0.8 });
  circ(g, pts[0][0], pts[0][1], 1.8, s, { fill: s.stroke, sw: 0 });
  if (rng() < s.annot) txt(g, cx, cy - ry - 9, `a:b ${a}:${bb}`, s, { size: 6, anchor: "middle" });
  if (rng() < s.annot) txt(g, cx + rx, cy + ry + 12, `\u03C6 ${(ph).toFixed(2)}`, s, { size: 5, anchor: "end" });
}

function drawSpectrum(g, b, rng, s) {
  const base = b.y + b.h * 0.82, n = 34 + s.complexity * 6;
  const c = 0.25 + rng() * 0.5;
  let peakX = b.x, peakH = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const env = Math.exp(-((t - c) ** 2) / 0.03) * 0.85 + Math.exp(-((t - c * 0.4) ** 2) / 0.08) * 0.3;
    const h = clamp(env * (0.55 + rng() * 0.55), 0.02, 1) * b.h * 0.66;
    const x = b.x + t * b.w;
    ln(g, x, base, x, base - h, s, { sw: s.sw * 0.65 });
    if (h > peakH) { peakH = h; peakX = x; }
  }
  ln(g, b.x, base, b.x + b.w, base, s);
  for (let i = 0; i <= 8; i++) ln(g, b.x + (i / 8) * b.w, base, b.x + (i / 8) * b.w, base + 3, s, { sw: s.sw * 0.6 });
  poly(g, [[peakX, base - peakH - 7], [peakX - 2.6, base - peakH - 11.5], [peakX + 2.6, base - peakH - 11.5]], s, { close: true, fill: s.stroke, sw: 0 });
  if (rng() < s.annot) txt(g, peakX + 5, base - peakH - 8, `PEAK ${randInt(rng, 120, 980)}`, s, { size: 5 });
  if (rng() < s.annot) txt(g, b.x, b.y + 6, "AUDIO SPECTRUM", s, { size: 6, ls: 0.8 });
  if (rng() < s.annot) txt(g, b.x + b.w, base + 10, "// FFT window: hanning 2048", s, { size: 4.6, anchor: "end" });
}

// —— 流程与数据 ——
function drawFlowchart(g, b, rng, s) {
  const nRows = s.complexity >= 4 ? 4 : 3;
  const bw = b.w * 0.42, bh = Math.min(20, b.h / (nRows * 2.1));
  const cx = b.x + b.w * 0.44;
  const names = ["CBN", "SRT", "DAT", "SUM", "OUT", "MUX", "ACC"];
  let prevY = null;
  circ(g, cx, b.y + 4, 3, s);
  for (let i = 0; i < nRows; i++) {
    const y = b.y + 12 + (i / nRows) * (b.h - 26);
    rect(g, cx - bw / 2, y, bw, bh, s);
    txt(g, cx, y + bh / 2 + 2, pick(rng, names), s, { size: 5.5, anchor: "middle" });
    if (prevY != null) arrow(g, cx, prevY, cx, y, s, { sw: s.sw * 0.8 });
    else ln(g, cx, b.y + 7, cx, y, s, { sw: s.sw * 0.8 });
    // 侧挂节点
    if (rng() < 0.6) {
      const side = rng() < 0.5 ? -1 : 1;
      const sx = cx + side * (bw / 2 + b.w * 0.18);
      circ(g, sx, y + bh / 2, 5.5, s);
      ln(g, cx + side * bw / 2, y + bh / 2, sx - side * 5.5, y + bh / 2, s, { sw: s.sw * 0.6, dash: maybeDash(rng, s) });
      txt(g, sx, y + bh / 2 + 1.8, pick(rng, ["CN", "IO", "K2"]), s, { size: 4.2, anchor: "middle" });
    }
    prevY = y + bh;
  }
  arrow(g, cx, prevY, cx, b.y + b.h - 8, s, { sw: s.sw * 0.8 });
  circ(g, cx, b.y + b.h - 5, 3, s, { fill: s.stroke, sw: 0 });
  if (rng() < s.annot) txt(g, b.x, b.y + b.h + 6, "// pipeline: 3-stage flow control", s, { size: 4.8 });
  if (rng() < s.annot) txt(g, b.x + b.w, b.y + 4, "DATA BUS", s, { size: 5, anchor: "end" });
}

function drawNodeGraph(g, b, rng, s) {
  const m = randInt(rng, 4, 6), k = randInt(rng, 3, 5);
  const lx = b.x + b.w * 0.12, rx = b.x + b.w * 0.88;
  const L = [], R = [];
  for (let i = 0; i < m; i++) L.push(b.y + ((i + 0.5) / m) * b.h);
  for (let i = 0; i < k; i++) R.push(b.y + ((i + 0.5) / k) * b.h);
  for (let i = 0; i < m; i++) {
    const links = 1 + Math.floor(rng() * Math.min(3, k));
    for (let j = 0; j < links; j++) {
      const t = randInt(rng, 0, k - 1);
      ln(g, lx + 4, L[i], rx - 5, R[t], s, { sw: s.sw * 0.45 });
    }
  }
  for (let i = 0; i < m; i++) {
    circ(g, lx, L[i], 3.4, s, { fill: "none" });
    if (rng() < s.annot) txt(g, lx - 6, L[i] + 2, `IN-${i + 1}`, s, { size: 4.4, anchor: "end" });
  }
  for (let i = 0; i < k; i++) {
    rect(g, rx - 5, R[i] - 4, 10, 8, s);
    if (rng() < s.annot) txt(g, rx + 8, R[i] + 2, `K-${randInt(rng, 1, 9)}`, s, { size: 4.4 });
  }
  if (rng() < s.annot) txt(g, b.x + b.w / 2, b.y + b.h + 7, `FLOW ${(rng() * 9).toFixed(2)} / SUM ${randInt(rng, 100, 999)}`, s, { size: 4.8, anchor: "middle" });
}

function drawHistogram(g, b, rng, s) {
  const base = b.y + b.h * 0.84, n = randInt(rng, 9, 14);
  const bw = b.w / n;
  const c = rng();
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = clamp(Math.exp(-((t - c) ** 2) / 0.12) * (0.6 + rng() * 0.5), 0.04, 1) * b.h * 0.62;
    rect(g, b.x + i * bw + 1, base - h, bw - 2, h, s, { sw: s.sw * 0.7 });
    sum += h;
  }
  ln(g, b.x, base, b.x + b.w, base, s);
  const mean = base - (sum / n);
  ln(g, b.x - 2, mean, b.x + b.w + 2, mean, s, { sw: s.sw * 0.55, dash: "3 2.4" });
  if (rng() < s.annot) txt(g, b.x + b.w + 4, mean + 2, "x\u0304", s, { size: 6 });
  if (rng() < s.annot) txt(g, b.x, base + 9, `L = ${(rng() * 60).toFixed(2)} m`, s, { size: 5 });
  if (rng() < s.annot) txt(g, b.x, b.y + 4, `NOMINAL ${(rng() * 9).toFixed(1)} \u00B1${(rng()).toFixed(2)}`, s, { size: 5.4 });
}

function drawStackBlocks(g, b, rng, s) {
  const n = randInt(rng, 4, 6);
  const bw = b.w * 0.44, bh = Math.min(16, (b.h - 20) / (n * 1.4));
  const x0 = b.x + b.w * 0.08;
  for (let i = 0; i < n; i++) {
    const y = b.y + 8 + i * (bh + 6);
    const jitter = (rng() - 0.5) * 8;
    rect(g, x0 + jitter, y, bw, bh, s);
    ln(g, x0 + jitter + bw * 0.15, y + bh / 2, x0 + jitter + bw * 0.85, y + bh / 2, s, { sw: s.sw * 0.45, dash: maybeDash(rng, s) });
    // 引出线与标签
    const lx = b.x + b.w * 0.66;
    ln(g, x0 + jitter + bw, y + bh / 2, lx, y + bh / 2, s, { sw: s.sw * 0.5 });
    circ(g, lx + 1.4, y + bh / 2, 1.2, s, { fill: s.stroke, sw: 0 });
    if (rng() < Math.max(0.4, s.annot)) txt(g, lx + 5, y + bh / 2 + 1.8, `ITEM NO.${randInt(rng, 1, 24)}`, s, { size: 4.4 });
  }
  if (rng() < s.annot) txt(g, x0, b.y + b.h - 2, "// assembly: exploded register", s, { size: 4.8 });
}

// —— 工程与机械 ——
function drawGear(g, b, rng, s) {
  const cx = b.x + b.w * 0.44, cy = b.y + b.h / 2;
  const R = Math.min(b.w, b.h) * 0.3;
  const teeth = 10 + s.complexity * 2;
  const gearPath = (gcx, gcy, r, tn) => {
    const ro = r, ri = r * 0.84;
    let d = "";
    for (let i = 0; i < tn; i++) {
      const a0 = (i / tn) * Math.PI * 2, a1 = ((i + 0.35) / tn) * Math.PI * 2;
      const a2 = ((i + 0.5) / tn) * Math.PI * 2, a3 = ((i + 0.85) / tn) * Math.PI * 2;
      const p = (a, rr) => `${(gcx + Math.cos(a) * rr).toFixed(1)} ${(gcy + Math.sin(a) * rr).toFixed(1)}`;
      d += (i ? "L" : "M") + p(a0, ro) + "L" + p(a1, ro) + "L" + p(a2, ri) + "L" + p(a3, ri);
    }
    return d + "Z";
  };
  path(g, gearPath(cx, cy, R, teeth), s);
  circ(g, cx, cy, R * 0.62, s, { sw: s.sw * 0.7, dash: "2.6 2.2" }); // 分度圆
  circ(g, cx, cy, R * 0.2, s);
  ln(g, cx - R * 0.28, cy, cx + R * 0.28, cy, s, { sw: s.sw * 0.6 });
  ln(g, cx, cy - R * 0.28, cx, cy + R * 0.28, s, { sw: s.sw * 0.6 });
  // 螺栓孔
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    circ(g, cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, R * 0.06, s, { sw: s.sw * 0.7 });
  }
  // 啮合小齿轮
  const r2 = R * 0.42, gx = cx + R + r2 * 0.92, gy = cy - R * 0.2;
  if (gx + r2 < b.x + b.w) {
    path(g, gearPath(gx, gy, r2, Math.max(6, (teeth * 0.45) | 0)), s, { sw: s.sw * 0.8 });
    circ(g, gx, gy, r2 * 0.24, s, { fill: s.stroke, sw: 0 });
  }
  if (rng() < s.annot) txt(g, cx, cy + R + 12, `MOD ${(1 + rng() * 2).toFixed(1)} / Z${teeth}`, s, { size: 5.4, anchor: "middle" });
  if (rng() < s.annot) txt(g, b.x + b.w, b.y + 5, "// gear train ratio verified", s, { size: 4.6, anchor: "end" });
}

function drawRuler(g, b, rng, s) {
  const cy = b.y + b.h * 0.42;
  ln(g, b.x, cy, b.x + b.w, cy, s);
  const major = 8;
  for (let i = 0; i <= major * 4; i++) {
    const x = b.x + (i / (major * 4)) * b.w;
    const isMajor = i % 4 === 0;
    ln(g, x, cy, x, cy - (isMajor ? 9 : 4.5), s, { sw: s.sw * (isMajor ? 0.8 : 0.5) });
    if (isMajor && rng() < Math.max(0.5, s.annot))
      txt(g, x, cy - 12, String((i / 4) * 30), s, { size: 4.6, anchor: "middle" });
  }
  // 尺寸标注线
  const dy = cy + b.h * 0.3;
  const x1 = b.x + b.w * (0.1 + rng() * 0.2), x2 = b.x + b.w * (0.6 + rng() * 0.3);
  ln(g, x1, cy + 4, x1, dy + 5, s, { sw: s.sw * 0.5 });
  ln(g, x2, cy + 4, x2, dy + 5, s, { sw: s.sw * 0.5 });
  arrow(g, (x1 + x2) / 2, dy, x1, dy, s, { sw: s.sw * 0.6, head: 3.4 });
  arrow(g, (x1 + x2) / 2, dy, x2, dy, s, { sw: s.sw * 0.6, head: 3.4 });
  txt(g, (x1 + x2) / 2, dy - 3, `${(rng() * 200 + 20).toFixed(1)}`, s, { size: 5.4, anchor: "middle" });
  if (rng() < s.annot) txt(g, b.x, b.y + 6, `SCALE 1:${pick(rng, [2, 5, 10, 20])}`, s, { size: 5.6 });
  if (rng() < s.annot) txt(g, b.x + b.w, dy + 12, `TOL \u00B1${(rng() * 0.2).toFixed(2)}`, s, { size: 4.8, anchor: "end" });
}

function drawCrosshair(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) * 0.36;
  circ(g, cx, cy, R, s);
  circ(g, cx, cy, R * 0.55, s, { sw: s.sw * 0.7, dash: maybeDash(rng, s) });
  // 全幅十字线（中心留空）
  const gap = R * 0.12;
  ln(g, b.x, cy, cx - gap, cy, s, { sw: s.sw * 0.6 });
  ln(g, cx + gap, cy, b.x + b.w, cy, s, { sw: s.sw * 0.6 });
  ln(g, cx, b.y, cx, cy - gap, s, { sw: s.sw * 0.6 });
  ln(g, cx, cy + gap, cx, b.y + b.h, s, { sw: s.sw * 0.6 });
  // 周向刻度
  for (let d = 0; d < 360; d += 10) {
    const a = (d / 180) * Math.PI;
    const long = d % 30 === 0;
    const r1 = R, r2 = R + (long ? 6 : 3);
    ln(g, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, s, { sw: s.sw * (long ? 0.7 : 0.4) });
  }
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    rect(g, cx + Math.cos(a) * R * 0.55 - 2, cy + Math.sin(a) * R * 0.55 - 2, 4, 4, s, { sw: s.sw * 0.6 });
  }
  if (rng() < s.annot) txt(g, cx + R * 0.12, cy - R * 0.12, `${refCode(rng)}`, s, { size: 5 });
  if (rng() < s.annot) txt(g, cx, b.y + b.h + 7, "// crosshair: optical telemetry", s, { size: 4.8, anchor: "middle" });
  if (rng() < s.annot) txt(g, b.x + b.w, b.y + 6, `TILT ${randInt(rng, 5, 85)}\u00B0`, s, { size: 5, anchor: "end" });
}

// —— 自然与高科 ——
function drawSpiral(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const R = Math.min(b.w, b.h) * 0.4;
  const turns = 2.6 + s.complexity * 0.6;
  const pts = [];
  const n = 240;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * Math.PI * 2 + rng() * 0;
    const r = R * t;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  poly(g, pts, s, { sw: s.sw * 0.85 });
  circ(g, cx, cy, 1.6, s, { fill: s.stroke, sw: 0 });
  // 末端径向刻度
  const end = pts[pts.length - 1];
  const ea = Math.atan2(end[1] - cy, end[0] - cx);
  for (let i = -2; i <= 2; i++) {
    const a = ea + i * 0.09;
    ln(g, cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a) * (R + 5), cy + Math.sin(a) * (R + 5), s, { sw: s.sw * 0.5 });
  }
  if (rng() < s.annot) txt(g, cx, cy - R - 5, "R = a\u03B8", s, { size: 6, anchor: "middle" });
  if (rng() < s.annot) txt(g, end[0] + 5, end[1], `\u03B8 ${(turns * 360).toFixed(0)}\u00B0`, s, { size: 4.8 });
}

function drawContour(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const R = Math.min(b.w, b.h) * 0.4;
  const rings = 4 + s.complexity;
  const phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  for (let k = 1; k <= rings; k++) {
    const base = (R * k) / rings;
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const wob = 1 + 0.14 * Math.sin(a * 3 + phases[0]) + 0.09 * Math.sin(a * 5 + phases[1]) + 0.05 * Math.sin(a * 8 + phases[2]);
      pts.push([cx + Math.cos(a) * base * wob, cy + Math.sin(a) * base * wob * 0.88]);
    }
    poly(g, [...pts, pts[0]], s, { sw: s.sw * 0.55, dash: k % 3 === 0 ? "2.6 2" : null });
  }
  poly(g, [[cx, cy - 3], [cx - 2.6, cy + 2], [cx + 2.6, cy + 2]], s, { close: true, fill: s.stroke, sw: 0 });
  if (rng() < s.annot) txt(g, cx + 6, cy, `ELEV ${randInt(rng, 120, 1980)}`, s, { size: 4.8 });
  if (rng() < s.annot) txt(g, b.x, b.y + b.h + 7, "// interference pattern mapped", s, { size: 4.8 });
}

function drawOrbit(g, b, rng, s) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const R = Math.min(b.w, b.h) * 0.38;
  const orbits = Math.min(4, 2 + (s.complexity >> 1));
  for (let i = 0; i < orbits; i++) {
    const rot = (i / orbits) * 180 + rng() * 20;
    el("ellipse", {
      cx, cy, rx: R, ry: R * (0.3 + rng() * 0.2), fill: "none",
      stroke: s.stroke, "stroke-width": s.sw * 0.7,
      "stroke-dasharray": maybeDash(rng, s),
      transform: `rotate(${rot.toFixed(1)} ${cx} ${cy})`,
    }, g);
    // 轨道上的电子点
    const a = rng() * Math.PI * 2;
    const rr = rot * Math.PI / 180;
    const ex = Math.cos(a) * R, ey = Math.sin(a) * R * 0.36;
    circ(g, cx + ex * Math.cos(rr) - ey * Math.sin(rr), cy + ex * Math.sin(rr) + ey * Math.cos(rr), 2, s, { fill: s.stroke, sw: 0 });
  }
  circ(g, cx, cy, 3.4, s);
  circ(g, cx, cy, R, s, { sw: s.sw * 0.4, dash: "1.6 3" });
  if (rng() < s.annot) txt(g, cx, cy + R + 10, `e = ${(rng() * 0.8).toFixed(2)}`, s, { size: 5.4, anchor: "middle" });
  if (rng() < s.annot) txt(g, b.x, b.y + 6, `PHASE ${randInt(rng, 1, 8)}/${randInt(rng, 8, 12)}`, s, { size: 5 });
  if (rng() < s.annot) txt(g, b.x + b.w, b.y + b.h, "// e.g harmonic trace", s, { size: 4.6, anchor: "end" });
}

// ---------- 类目注册 ----------
const CATEGORIES = [
  { key: "catGeo", label: "几何与晶格", drawers: [drawPolarGrid, drawIsoCube, drawHexFrame, drawVenn, drawMeshFan] },
  { key: "catWave", label: "波形与信号", drawers: [drawWaveform, drawLissajous, drawSpectrum] },
  { key: "catFlow", label: "流程与数据", drawers: [drawFlowchart, drawNodeGraph, drawHistogram, drawStackBlocks] },
  { key: "catMech", label: "工程与机械", drawers: [drawGear, drawRuler, drawCrosshair] },
  { key: "catSci", label: "自然与高科", drawers: [drawSpiral, drawContour, drawOrbit] },
];

// 从 ART_PALETTES 中筛选高饱和色（供彩色主体使用）
const VIVID = (() => {
  const out = [];
  for (const pair of ART_PALETTES) {
    for (const hex of pair) {
      const [r, g, b] = hexToRgb(hex);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max > 90 && max - min > 100) out.push(hex);
    }
  }
  return out.length ? out : ["#F9064B", "#049F73", "#2B2BE6", "#F89812"];
})();

// ============================================================
// 模块导出
// ============================================================
export default {
  id: "techlines",
  name: "技术线稿生成器",
  nameEn: "Technical Line Generator",
  desc: "一键生成工程图纸感的技术线稿海报：几何、波形、流程、机械等图形随机组合，可叠加彩色图形主体，导出 SVG/PNG。",
  tags: ["生成式", "工程图纸", "SVG", "随机种子"],
  cover: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="280" height="120" fill="#fbfbf8"/>
    <g stroke="#d8d5cc" stroke-width="1"><path d="M70 0V120M140 0V120M210 0V120M0 40H280M0 80H280"/></g>
    <g stroke="#141414" fill="none" stroke-width="1.2">
      <circle cx="35" cy="60" r="24"/><circle cx="35" cy="60" r="14"/><circle cx="35" cy="60" r="5"/>
      <path d="M35 30V90M5 60H65" stroke-width=".7"/>
      <path d="M80 60 q10 -34 20 0 t20 0 t20 0 t20 0" />
      <path d="M225 88 V40 h18 v12 h-18 M225 64 h18 v12 h-18" stroke-width="1"/>
      <circle cx="252" cy="46" r="4"/><circle cx="252" cy="70" r="4"/>
      <path d="M243 46 h5 M243 70 h5" stroke-width=".8"/>
    </g>
    <g fill="#141414" font-family="ui-monospace,Menlo,monospace" font-size="6">
      <text x="10" y="14">[01] NODE-334</text><text x="150" y="14">fig.10</text>
      <text x="150" y="110">// sweep offset locked</text>
    </g>
    <path d="M150 30 l38 22 -6 30 -34 8 -22 -26 z" fill="#0AF0A7" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity=".92"/>
  </svg>`,

  mount(container) {
    injectStyle("techlines", `
      .tl-stage svg { max-height: 78vh; width: auto; }
      .tc-field.tc-info .tc-info { font-family: ${MONO}; }
    `);

    // ---------- 状态 ----------
    const values = {
      ratio: "3:4", theme: "white", density: 3, guides: true,
      strokeWidth: 1, complexity: 3, dashFreq: 0.3, annotDensity: 0.7,
      catGeo: true, catWave: true, catFlow: true, catMech: true, catSci: true,
      overlayOn: true, overlayCount: 5,
    };
    const state = {
      seed: (Math.random() * 1e9) >>> 0,
      scatterSeed: (Math.random() * 1e9) >>> 0,
      subjects: [],
    };
    // 默认色块：内置演示图分割
    try {
      state.subjects = segmentSubjects(demoSubjectsImage()).subjects;
    } catch { state.subjects = []; }

    // ---------- DOM ----------
    const panel = document.createElement("div");
    const stage = document.createElement("div");
    stage.className = "tool-stage tl-stage";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("xmlns", NS);
    stage.append(svg);
    container.append(panel, stage);

    // ---------- 渲染 ----------
    function render() {
      const W = 900, H = RATIOS[values.ratio] || 1200;
      const theme = THEMES[values.theme] || THEMES.white;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.replaceChildren();

      const rng = mulberry32(state.seed);
      const s = {
        stroke: theme.line, ink: theme.line,
        sw: values.strokeWidth, dashProb: values.dashFreq,
        annot: values.annotDensity, complexity: values.complexity,
      };

      // 纸底
      el("rect", { x: 0, y: 0, width: W, height: H, fill: theme.bg }, svg);

      // 辅助网格
      if (values.guides) {
        const gg = el("g", { opacity: 0.35 }, svg);
        for (let x = 0; x <= W; x += 30) ln(gg, x, 0, x, H, s, { sw: 0.3, op: 0.35 });
        for (let y = 0; y <= H; y += 30) ln(gg, 0, y, W, y, s, { sw: 0.3, op: 0.35 });
      }

      // 外框 + 角标注册线
      const M = 44;
      const frame = el("g", {}, svg);
      rect(frame, M, M, W - M * 2, H - M * 2, s, { sw: s.sw });
      for (const [fx, fy] of [[M, M], [W - M, M], [M, H - M], [W - M, H - M]]) {
        ln(frame, fx - 12, fy, fx - 5, fy, s, { sw: s.sw * 0.7 });
        ln(frame, fx + 5, fy, fx + 12, fy, s, { sw: s.sw * 0.7 });
        ln(frame, fx, fy - 12, fx, fy - 5, s, { sw: s.sw * 0.7 });
        ln(frame, fx, fy + 5, fx, fy + 12, s, { sw: s.sw * 0.7 });
      }
      txt(frame, M, M - 10, `TLG // SHEET ${refCode(rng)}`, s, { size: 8, ls: 1 });
      txt(frame, W - M, M - 10, `SEED ${state.seed}`, s, { size: 7, anchor: "end" });
      txt(frame, M, H - M + 16, `DRAWN BY POSTER-LAB / ${values.ratio} / SCALE 1:1`, s, { size: 6 });
      txt(frame, W - M, H - M + 16, fakeParam(rng), s, { size: 6, anchor: "end" });

      // 单元格网格
      const cols = clamp(Math.round(values.density), 2, 4);
      const rows = clamp(cols + 1, 3, 5);
      const gw = (W - M * 2) / cols, gh = (H - M * 2) / rows;
      const gridG = el("g", {}, svg);
      for (let i = 1; i < cols; i++) ln(gridG, M + i * gw, M, M + i * gw, H - M, s, { sw: s.sw * 0.5 });
      for (let i = 1; i < rows; i++) ln(gridG, M, M + i * gh, W - M, M + i * gh, s, { sw: s.sw * 0.5 });

      // 可用绘制器
      let drawers = CATEGORIES.filter((c) => values[c.key]).flatMap((c) => c.drawers);
      if (!drawers.length) drawers = CATEGORIES.flatMap((c) => c.drawers);

      // 逐格绘制
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, idx++) {
          const cell = { x: M + c * gw, y: M + r * gh, w: gw, h: gh };
          const g = el("g", {}, svg);
          // 通用格内标注
          txt(g, cell.x + 6, cell.y + 12, `[${String(idx + 1).padStart(2, "0")}]`, s, { size: 6 });
          if (rng() < s.annot) txt(g, cell.x + cell.w - 6, cell.y + 12, pick(rng, COMMENTS), s, { size: 4.6, anchor: "end" });
          if (rng() < s.annot) txt(g, cell.x + 6, cell.y + cell.h - 6, refCode(rng), s, { size: 5.4 });
          if (rng() < s.annot) txt(g, cell.x + cell.w - 6, cell.y + cell.h - 6, fakeParam(rng), s, { size: 5, anchor: "end" });
          if (rng() < s.annot * 0.8) {
            // 格内角刻度线
            for (const [tx, ty, dx, dy] of [
              [cell.x + 4, cell.y + 4, 1, 1], [cell.x + cell.w - 4, cell.y + 4, -1, 1],
              [cell.x + 4, cell.y + cell.h - 4, 1, -1], [cell.x + cell.w - 4, cell.y + cell.h - 4, -1, -1],
            ]) {
              ln(g, tx, ty, tx + dx * 6, ty, s, { sw: s.sw * 0.5 });
              ln(g, tx, ty, tx, ty + dy * 6, s, { sw: s.sw * 0.5 });
            }
          }
          // 内容绘制区（避开标注带）
          const inset = { x: cell.x + gw * 0.12, y: cell.y + gh * 0.15, w: gw * 0.76, h: gh * 0.68 };
          const drawer = pick(rng, drawers);
          drawer(g, inset, rng, s);
        }
      }

      // 彩色主体叠加
      if (values.overlayOn && state.subjects.length) {
        const og = el("g", {}, svg);
        const rng2 = mulberry32(state.scatterSeed);
        const count = clamp(Math.round(values.overlayCount), 2, 10);
        for (let i = 0; i < count; i++) {
          const subject = state.subjects[randInt(rng2, 0, state.subjects.length - 1)];
          const color = pick(rng2, VIVID);
          const tw = 90 + rng2() * 140;
          const scale = tw / subject.w;
          const th = subject.h * scale;
          const px = M * 0.4 + rng2() * (W - M * 0.8 - tw);
          const py = M * 0.4 + rng2() * (H - M * 0.8 - th);
          try {
            const halo = dilatedSilhouette(subject, 10, "#ffffff");
            const sil = subjectSilhouette(subject, color);
            const haloImg = el("image", {
              x: (px - halo.pad * scale).toFixed(1), y: (py - halo.pad * scale).toFixed(1),
              width: (halo.width * scale).toFixed(1), height: (halo.height * scale).toFixed(1),
              preserveAspectRatio: "none",
            }, og);
            const haloUrl = halo.toDataURL("image/png");
            haloImg.setAttribute("href", haloUrl);
            haloImg.setAttributeNS(XLINK, "xlink:href", haloUrl);
            const silImg = el("image", {
              x: px.toFixed(1), y: py.toFixed(1),
              width: tw.toFixed(1), height: th.toFixed(1),
              preserveAspectRatio: "none",
            }, og);
            const silUrl = sil.toDataURL("image/png");
            silImg.setAttribute("href", silUrl);
            silImg.setAttributeNS(XLINK, "xlink:href", silUrl);
          } catch { /* 单个主体失败不影响整体 */ }
        }
      }

      if (seedInfo) seedInfo.textContent = `当前种子：SEED-${state.seed} ｜ 按空格随机重新生成`;
    }

    const rerender = debounce(render, 60);
    function regenerate() {
      state.seed = (Math.random() * 1e9) >>> 0;
      state.scatterSeed = (Math.random() * 1e9) >>> 0;
      render();
    }

    // ---------- 控制面板 ----------
    const onChange = (key) => {
      if (key === "upload") return; // 上传单独处理
      rerender();
    };

    panelSectionLocal("画布");
    buildControlsLocal([
      { key: "ratio", label: "画布比例", type: "select", options: [
        { value: "3:4", label: "3:4 · 900×1200" },
        { value: "1:1", label: "1:1 · 900×900" },
        { value: "4:3", label: "4:3 · 900×675" },
      ] },
      { key: "theme", label: "纸张主题", type: "select", options: Object.entries(THEMES).map(([v, t]) => ({ value: v, label: t.label })) },
      { key: "density", label: "网格密度（列数）", type: "range", min: 2, max: 4, step: 1 },
      { key: "guides", label: "显示辅助网格线", type: "checkbox" },
    ]);

    panelSectionLocal("图形类目");
    buildControlsLocal(CATEGORIES.map((c) => ({ key: c.key, label: c.label, type: "checkbox" })));

    panelSectionLocal("线条与细节");
    buildControlsLocal([
      { key: "strokeWidth", label: "线条粗细", type: "range", min: 0.5, max: 3, step: 0.1 },
      { key: "complexity", label: "图形复杂度", type: "range", min: 1, max: 5, step: 1 },
      { key: "dashFreq", label: "虚线频率", type: "range", min: 0, max: 1, step: 0.05 },
      { key: "annotDensity", label: "标注密度", type: "range", min: 0, max: 1, step: 0.05 },
    ]);

    panelSectionLocal("彩色主体叠加");
    buildControlsLocal([
      { key: "overlayOn", label: "启用彩色主体", type: "checkbox" },
      { key: "upload", label: "上传图片（自动分割主体）", type: "file", accept: "image/*" },
      { key: "overlayCount", label: "色块数量", type: "range", min: 2, max: 10, step: 1 },
      { key: "reshuffle", label: "重新散布色块", type: "button", onClick: () => {
        state.scatterSeed = (Math.random() * 1e9) >>> 0;
        render();
      } },
    ]);

    panelSectionLocal("生成");
    buildControlsLocal([
      { key: "generate", label: "随机生成（空格）", type: "button", primary: true, onClick: regenerate },
      { key: "seedinfo", label: "当前种子：—", type: "info" },
      { key: "exportSvg", label: "导出 SVG", type: "button", onClick: () => downloadSVG(svg, `techlines-${state.seed}.svg`) },
      { key: "exportPng", label: "导出 PNG（2x）", type: "button", onClick: () => svgToPng(svg, `techlines-${state.seed}.png`, 2) },
    ]);
    const seedInfo = panel.querySelector(".tc-field.tc-info .tc-info");

    // 文件上传处理
    const fileInput = panel.querySelector('input[type="file"]');
    const onFile = async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const img = await loadImageFile(file);
        const { subjects } = segmentSubjects(imageToCanvas(img, 1200));
        if (subjects.length) {
          state.subjects = subjects;
          state.scatterSeed = (Math.random() * 1e9) >>> 0;
          render();
        } else if (seedInfo) {
          seedInfo.textContent = "未能从图片中分割出主体，请换一张对比更强的图片。";
        }
      } catch {
        if (seedInfo) seedInfo.textContent = "图片读取失败，请重试。";
      }
    };
    if (fileInput) fileInput.addEventListener("change", onFile);

    // 空格键随机生成
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const t = e.target;
      if (t && /^(input|textarea|select|button)$/i.test(t.tagName)) return;
      e.preventDefault();
      regenerate();
    };
    window.addEventListener("keydown", onKey);

    // ---------- 首次生成 ----------
    render();

    // 局部小助手（闭包内使用共享库函数）
    function panelSectionLocal(title) { return panelSection(panel, title); }
    function buildControlsLocal(schema) { return buildControls(panel, schema, values, onChange); }

    // ---------- 清理 ----------
    return () => {
      window.removeEventListener("keydown", onKey);
      if (fileInput) fileInput.removeEventListener("change", onFile);
      container.innerHTML = "";
    };
  },
};
