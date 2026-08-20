// ============================================================
// 艺术工具 · 图文语义混排 Type-Flow Collage
// 大标题文字自动绕排避让图片主体，小注释文字贴轮廓填缝。
// 参考：typowow「图文语义混排布局 / 多层轮廓描边」演示。
// ============================================================
import {
  segmentSubjects,
  subjectCutout,
  subjectPixelate,
  subjectHalftone,
  stickerOutline,
  loadImageFile,
  loadImageUrl,
  imageToCanvas,
  makeCanvas,
  mulberry32,
  clamp,
  debounce,
  downloadCanvasPNG,
  demoSubjectsImage,
  buildControls,
  panelSection,
} from "./shared.js";

const CANVAS_W = 1100;
const MARGIN = 52;

const DEFAULT_MAIN_TEXT =
  "梦境解构 DREAM DECONSTRUCTION 错位 拼贴 DISPLACED COLLAGE 视觉悖论 VISUAL PARADOX 意识流 STREAM";
const DEFAULT_SMALL_TEXT =
  "Auto-detected core structure and edge luminance contours. Spatial recognition engine analyzes object relations in real time. Semantic typography matrix redefines modern visual compositions. Dynamic contour avoidance algorithm flows seamlessly across boundaries.";

const MAIN_FONT = (size) =>
  `500 ${size}px "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif`;
const SMALL_FONT = (size) =>
  `400 ${size}px "Helvetica Neue", "PingFang SC", Arial, sans-serif`;

// ---------- 几何 ----------
function rectsIntersect(a, b, pad = 0) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}
function overlapRatio(a, b) {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ox * oy;
  if (!inter) return 0;
  return inter / Math.min(a.w * a.h, b.w * b.h);
}

// ---------- 文本切分：中文按 1–2 字成组，英文按单词 ----------
const isCJK = (ch) => /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);
function tokenize(text) {
  const tokens = [];
  let buf = "";
  const flushWord = () => {
    if (buf) tokens.push(buf);
    buf = "";
  };
  let cjkBuf = "";
  const flushCJK = () => {
    for (let i = 0; i < cjkBuf.length; i += 2) {
      tokens.push(cjkBuf.slice(i, i + 2));
    }
    cjkBuf = "";
  };
  for (const ch of text) {
    if (/\s/.test(ch)) {
      flushWord();
      flushCJK();
    } else if (isCJK(ch)) {
      flushWord();
      cjkBuf += ch;
    } else {
      flushCJK();
      buf += ch;
    }
  }
  flushWord();
  flushCJK();
  return tokens;
}

export default {
  id: "typeflow",
  name: "图文语义混排",
  nameEn: "Type-Flow Collage",
  desc: "大标题文字自动绕排避让图片主体，小注释文字贴轮廓填缝，支持像素化/半调/贴纸描边特效，一键生成图文咬合的实验排版。",
  tags: ["文字绕排", "拼贴", "贴纸描边", "实验排版"],
  cover: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="140" fill="#ffffff"/>
    <rect x="18" y="20" width="76" height="14" fill="#111"/>
    <rect x="128" y="20" width="54" height="14" fill="#111"/>
    <rect x="18" y="44" width="164" height="14" fill="#111"/>
    <rect x="18" y="68" width="40" height="14" fill="#111"/>
    <rect x="142" y="68" width="40" height="14" fill="#111"/>
    <rect x="18" y="92" width="98" height="14" fill="#111"/>
    <rect x="150" y="92" width="32" height="14" fill="#111"/>
    <path d="M96 56 C118 50 130 62 126 80 C122 98 100 104 86 94 C72 84 74 62 96 56 Z"
      fill="#e8734a" stroke="#111" stroke-width="3"/>
    <g fill="#999" font-size="5" font-family="sans-serif">
      <text x="20" y="118">auto detected</text>
      <text x="20" y="125">contour flow</text>
      <text x="150" y="118">semantic</text>
      <text x="150" y="125">matrix</text>
    </g>
  </svg>`,

  mount(container, options = {}) {
    // ---------- 状态 ----------
    const values = {
      threshold: 60,
      fxMode: "raw", // raw | pixelate | halftone
      grain: 12,
      outlineLayers: 0,
      outlineGap: 10,
      mainText: DEFAULT_MAIN_TEXT,
      mainSize: 90,
      mainLead: 1.1,
      smallOn: true,
      smallSize: 10,
      smallText: DEFAULT_SMALL_TEXT,
      ratio: "1:1",
    };
    const state = {
      srcCanvas: null, // 输入图
      subjects: [], // 分割结果
      fxItems: [], // 特效处理后的主体 [{subject, canvas, pad}]
      layout: [], // 放置结果 [{cx, cy, scale}]，与 fxItems 一一对应
      seed: 20260820,
      destroyed: false,
    };

    // ---------- DOM ----------
    const panel = document.createElement("div");
    const stage = document.createElement("div");
    stage.className = "tool-stage";
    const canvas = makeCanvas(CANVAS_W, CANVAS_W);
    stage.append(canvas);
    container.append(panel, stage);
    const ctx = canvas.getContext("2d");

    // ---------- 渲染管线 ----------
    // 1) 分割：仅上传 / 阈值变化时执行
    function segment() {
      if (!state.srcCanvas) return;
      const res = segmentSubjects(state.srcCanvas, {
        threshold: values.threshold,
        maxSubjects: 10,
      });
      state.subjects = res.subjects;
    }

    // 2) 特效：原图 / 像素化 / 半调 + 可选贴纸描边
    function buildFx() {
      state.fxItems = state.subjects.map((s) => {
        let base;
        if (values.fxMode === "pixelate") {
          base = subjectPixelate(state.srcCanvas, s, { size: values.grain });
        } else if (values.fxMode === "halftone") {
          base = subjectHalftone(state.srcCanvas, s, {
            dot: values.grain,
            color: "#111111",
            useLuma: true,
          });
        } else {
          base = subjectCutout(state.srcCanvas, s);
        }
        let out = base;
        let pad = 0;
        if (values.outlineLayers > 0) {
          out = stickerOutline(base, s, values.outlineLayers, values.outlineGap);
          pad = out.pad || 0;
        }
        return { subject: s, canvas: out, pad };
      });
    }

    // 3) 放置：宫格取格心 + 抖动，bbox 重叠不超过 20%
    function canvasHeight() {
      return values.ratio === "3:4" ? Math.round((CANVAS_W * 4) / 3) : CANVAS_W;
    }
    function placeSubjects() {
      const H = canvasHeight();
      const rng = mulberry32(state.seed);
      const n = state.fxItems.length;
      state.layout = [];
      if (!n) return;
      const placedRects = [];
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const cellW = (CANVAS_W - MARGIN * 2) / cols;
      const cellH = (H - MARGIN * 2) / rows;
      // 打乱格子顺序
      const cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      state.fxItems.forEach((fx, i) => {
        const s = fx.subject;
        // 面积大的主体略大：按面积排名从 24% 递减到 14%
        const t = n > 1 ? i / (n - 1) : 0;
        const frac = clamp(0.24 - 0.1 * t + (rng() - 0.5) * 0.02, 0.14, 0.24);
        const contentW = CANVAS_W * frac;
        const scale = Math.min(contentW / s.w, (H * 0.32) / s.h);
        const drawW = fx.canvas.width * scale;
        const drawH = fx.canvas.height * scale;
        const [cc, cr] = cells[i % cells.length];
        let rect = null;
        for (let attempt = 0; attempt < 14; attempt++) {
          const jitter = attempt < 8 ? 0.28 : 0.6; // 后几次放宽抖动范围找位置
          const cx = MARGIN + (cc + 0.5) * cellW + (rng() - 0.5) * cellW * jitter * 2;
          const cy = MARGIN + (cr + 0.5) * cellH + (rng() - 0.5) * cellH * jitter * 2;
          const x = clamp(cx - drawW / 2, 8, CANVAS_W - drawW - 8);
          const y = clamp(cy - drawH / 2, 8, H - drawH - 8);
          const cand = { x, y, w: drawW, h: drawH };
          const ok = placedRects.every((r) => overlapRatio(cand, r) <= 0.2);
          rect = cand;
          if (ok) break;
        }
        placedRects.push(rect);
        state.layout.push({
          cx: rect.x + rect.w / 2,
          cy: rect.y + rect.h / 2,
          scale,
        });
      });
    }

    // 由当前特效画布 + 布局中心，得出实际绘制 rect（特效切换后 pad 会变，尺寸随之更新）
    function itemRects(H) {
      return state.fxItems.map((fx, i) => {
        const lay = state.layout[i];
        if (!lay) return null;
        const w = fx.canvas.width * lay.scale;
        const h = fx.canvas.height * lay.scale;
        return {
          fx,
          rect: {
            x: clamp(lay.cx - w / 2, 4, Math.max(4, CANVAS_W - w - 4)),
            y: clamp(lay.cy - h / 2, 4, Math.max(4, H - h - 4)),
            w,
            h,
          },
        };
      }).filter(Boolean);
    }

    // 4) 大标题绕排 + 小字填缝 + 绘制
    function draw() {
      const H = canvasHeight();
      if (canvas.height !== H) canvas.height = H;
      canvas.width = CANVAS_W;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_W, H);

      // 主体
      const items = itemRects(H);
      const obstacles = [];
      for (const it of items) {
        ctx.drawImage(it.fx.canvas, it.rect.x, it.rect.y, it.rect.w, it.rect.h);
        obstacles.push({
          x: it.rect.x - 4,
          y: it.rect.y - 4,
          w: it.rect.w + 8,
          h: it.rect.h + 8,
        });
      }

      // 大标题：逐词从左到右，遇主体推到其右侧，放不下换行
      const size = values.mainSize;
      const lineStep = size * values.mainLead;
      ctx.font = MAIN_FONT(size);
      ctx.fillStyle = "#111111";
      ctx.textBaseline = "alphabetic";
      const tokens = tokenize(values.mainText);
      const wordGap = size * 0.22;
      const wordRects = [];
      let x = MARGIN;
      let y = MARGIN + size * 0.86; // 首行基线
      for (const token of tokens) {
        const tw = ctx.measureText(token).width;
        let placed = false;
        let guard = 0;
        while (!placed && guard++ < 40) {
          if (y - size * 0.82 > H - MARGIN) break; // 超出底部，停止
          const rect = { x, y: y - size * 0.82, w: tw, h: size * 0.94 };
          const hit = obstacles.find((o) => rectsIntersect(rect, o, 2));
          if (hit) {
            x = hit.x + hit.w + wordGap * 0.4; // 推到主体右缘
            if (x + tw > CANVAS_W - MARGIN) {
              x = MARGIN;
              y += lineStep;
            }
            continue;
          }
          if (x + tw > CANVAS_W - MARGIN) {
            if (x === MARGIN) break; // 单词比整行还宽，跳过防死循环
            x = MARGIN;
            y += lineStep;
            continue;
          }
          ctx.fillText(token, x, y);
          wordRects.push(rect);
          x += tw + wordGap;
          placed = true;
        }
        if (y - size * 0.82 > H - MARGIN) break;
      }

      // 小字填缝：贴主体四周空隙放 1–3 块 3–5 行注释
      if (values.smallOn) {
        drawSmallText(items, obstacles, wordRects, H);
      }
    }

    function drawSmallText(items, obstacles, wordRects, H) {
      const pool = values.smallText.split(/\s+/).filter(Boolean);
      if (!pool.length) return;
      const sSize = values.smallSize;
      const lineH = sSize * 1.4;
      ctx.font = SMALL_FONT(sSize);
      ctx.fillStyle = "#555555";
      const rng = mulberry32(state.seed * 31 + 7);
      let poolIdx = 0;
      const nextWord = () => pool[poolIdx++ % pool.length];
      const placedBlocks = [];

      const blockFits = (rect) => {
        if (rect.x < 12 || rect.y < 12) return false;
        if (rect.x + rect.w > CANVAS_W - 12 || rect.y + rect.h > H - 12) return false;
        if (obstacles.some((o) => rectsIntersect(rect, o, 4))) return false;
        if (wordRects.some((w) => rectsIntersect(rect, w, 3))) return false;
        if (placedBlocks.some((b) => rectsIntersect(rect, b, 6))) return false;
        return true;
      };

      for (const it of items) {
        const r = it.rect;
        const blockCount = 1 + Math.floor(rng() * 3); // 1–3 块
        const sides = ["left", "right", "top", "bottom"].sort(() => rng() - 0.5);
        let made = 0;
        for (const side of sides) {
          if (made >= blockCount) break;
          // 组装 3–5 行，行宽 60–110px
          const lines = [];
          const lineCount = 3 + Math.floor(rng() * 3);
          const targetW = 60 + rng() * 50;
          let blockW = 0;
          for (let li = 0; li < lineCount; li++) {
            let line = nextWord();
            while (ctx.measureText(line).width < targetW) {
              const w2 = line + " " + nextWord();
              if (ctx.measureText(w2).width > 110) break;
              line = w2;
            }
            blockW = Math.max(blockW, ctx.measureText(line).width);
            lines.push(line);
          }
          const blockH = lines.length * lineH;
          let bx, by;
          if (side === "left") {
            bx = r.x - blockW - 10;
            by = r.y + rng() * Math.max(1, r.h - blockH);
          } else if (side === "right") {
            bx = r.x + r.w + 10;
            by = r.y + rng() * Math.max(1, r.h - blockH);
          } else if (side === "top") {
            bx = r.x + rng() * Math.max(1, r.w - blockW);
            by = r.y - blockH - 10;
          } else {
            bx = r.x + rng() * Math.max(1, r.w - blockW);
            by = r.y + r.h + 10;
          }
          const rect = { x: bx, y: by, w: blockW, h: blockH };
          if (!blockFits(rect)) continue;
          lines.forEach((line, li) => {
            ctx.fillText(line, bx, by + sSize + li * lineH);
          });
          placedBlocks.push(rect);
          made++;
        }
      }
    }

    // ---------- 管线调度 ----------
    function runAll({ resegment = false, refx = false, replace = false } = {}) {
      if (state.destroyed) return;
      if (resegment) {
        segment();
        refx = true;
        replace = true;
      }
      if (refx) buildFx();
      if (replace || state.layout.length !== state.fxItems.length) placeSubjects();
      draw();
    }
    const scheduleDraw = debounce(() => runAll(), 120);
    const scheduleFx = debounce(() => runAll({ refx: true }), 120);
    const scheduleSegment = debounce(() => runAll({ resegment: true }), 120);

    // ---------- 控件 ----------
    const onChange = (key) => {
      if (key === "threshold") scheduleSegment();
      else if (["fxMode", "grain", "outlineLayers", "outlineGap"].includes(key))
        scheduleFx();
      else if (key === "ratio") runAll({ replace: true });
      else scheduleDraw();
    };

    panelSection(panel, "图像输入");
    buildControls(
      panel,
      [
        {
          key: "imageFile",
          label: "上传图片",
          type: "file",
          accept: "image/*",
        },
        { key: "threshold", label: "环境色分离阈值", type: "range", min: 10, max: 200 },
      ],
      values,
      (key, v) => {
        if (key === "imageFile") {
          const file = v && v[0];
          if (!file) return;
          loadImageFile(file)
            .then((img) => {
              state.srcCanvas = imageToCanvas(img, 1400);
              runAll({ resegment: true });
            })
            .catch(() => {});
          return;
        }
        onChange(key);
      }
    );

    panelSection(panel, "视觉特效");
    buildControls(
      panel,
      [
        {
          key: "fxMode",
          label: "特效模式",
          type: "select",
          options: [
            { value: "raw", label: "原图" },
            { value: "pixelate", label: "像素化 Pixelate" },
            { value: "halftone", label: "半调网点 Halftone" },
          ],
        },
        { key: "grain", label: "处理粒度（像素块/网点大小）", type: "range", min: 4, max: 40 },
        {
          key: "outlineLayers",
          label: "轮廓描边",
          type: "select",
          options: [
            { value: 0, label: "0 层（无描边）" },
            { value: 1, label: "1 层" },
            { value: 2, label: "2 层" },
            { value: 3, label: "3 层" },
          ],
        },
        { key: "outlineGap", label: "描边间距", type: "range", min: 6, max: 16 },
      ],
      values,
      (key, v) => {
        if (key === "outlineLayers") values.outlineLayers = parseInt(v, 10) || 0;
        onChange(key);
      }
    );

    panelSection(panel, "图文混排");
    buildControls(
      panel,
      [
        { key: "mainText", label: "主文字内容", type: "textarea", rows: 4 },
        { key: "mainSize", label: "主字号", type: "range", min: 40, max: 170 },
        { key: "mainLead", label: "主行距", type: "range", min: 0.9, max: 1.6, step: 0.05 },
        { key: "smallOn", label: "轮廓避让小字（每块 3–5 行）", type: "checkbox" },
        { key: "smallSize", label: "小字号", type: "range", min: 6, max: 16 },
        { key: "smallText", label: "小字文案词池", type: "textarea", rows: 4 },
      ],
      values,
      (key) => onChange(key)
    );

    panelSection(panel, "画布");
    buildControls(
      panel,
      [
        {
          key: "ratio",
          label: "画布宽高比例",
          type: "select",
          options: [
            { value: "1:1", label: "1:1（正方形）" },
            { value: "3:4", label: "3:4（竖版）" },
          ],
        },
        {
          key: "shuffleBtn",
          label: "随机调换轮廓位置（Shuffle）",
          type: "button",
          onClick: () => {
            state.seed = (Math.random() * 1e9) >>> 0;
            runAll({ replace: true });
          },
        },
        {
          key: "exportBtn",
          label: "导出 PNG（2×）",
          type: "button",
          primary: true,
          onClick: () =>
            downloadCanvasPNG(canvas, `posterlab-typeflow-${Date.now()}.png`, 2),
        },
      ],
      values,
      (key) => onChange(key)
    );

    // ---------- 默认体验：演示图立即出图（参考图加载失败时也有兜底）----------
    state.srcCanvas = demoSubjectsImage();
    runAll({ resegment: true });

    // 参考原图直接作为主体图载入
    if (options.sourceImageUrl) {
      loadImageUrl(options.sourceImageUrl)
        .then((img) => {
          if (state.destroyed) return;
          state.srcCanvas = imageToCanvas(img, 1400);
          runAll({ resegment: true });
        })
        .catch(() => {});
    }

    return () => {
      state.destroyed = true;
    };
  },
};
