// ============================================================
// 艺术工具 · 图文语义混排 Type-Flow Collage
// 大标题文字自动绕排避让图片主体，小注释文字贴轮廓填缝。
// 参考：typowow「图文语义混排布局 / 多层轮廓描边」演示。
// ============================================================
import {
  segmentSubjects,
  subjectCutout,
  subjectPixelate,
  dilatedSilhouette,
  loadImageFile,
  loadImageUrl,
  imageToCanvas,
  makeCanvas,
  mulberry32,
  clamp,
  debounce,
  downloadCanvasPNG,
  injectStyle,
  buildControls,
  panelSection,
} from "./shared.js";

import { typeflowDemo } from "./typeflow-demo.js";
import { maskRows, freeSpans } from "./typeflow-layout.js";

const CANVAS_W = 1100;
const MARGIN = 52;

const DEFAULT_MAIN_TEXT =
  "梦境解构 DREAM DECONSTRUCTION 错位 拼贴 DISPLACED COLLAGE 视觉悖论 VISUAL PARADOX 意识流 STREAM";
const DEFAULT_SMALL_TEXT =
  "Auto-detected core structure and edge luminance contours. Spatial recognition engine analyzes object relations in real time. Semantic typography matrix redefines modern visual compositions. Dynamic contour avoidance algorithm flows seamlessly across boundaries.";

const MAIN_FONT = (size) =>
  `300 ${size}px "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif`;
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
  desc: "大字贴真实轮廓绕排，小字填缝；原图、彩色半调、像素拼贴与多层空心轮廓自由切换，主体可直接拖动。",
  tags: ["文字绕排", "拼贴", "贴纸描边", "实验排版"],
  cover: `<img src="./assets/tools/typeflow-preview.png" alt="大字轮廓绕排与多层描边拼贴效果" loading="lazy" style="object-fit:contain;background:#fff"/>`,

  mount(container, options = {}) {
    injectStyle("typeflow", `.typeflow-stage{flex-direction:column;align-items:center;gap:12px}.typeflow-stage canvas{max-height:78vh;max-width:100%;width:auto!important;height:auto}.typeflow-stage .tc-info{width:100%;text-align:center}`);
    // ---------- 状态 ----------
    const values = {
      threshold: 60,
      subjectCount: 4,
      fxMode: "raw", // raw | pixelate | halftone
      grain: 12,
      outlineLayers: 3,
      imageOn: true,
      subjectScale: 1,
      contourGap: 7,
      paper: "#ffffff",
      ink: "#111111",
      outlineGap: 10,
      mainText: "梦境 解构 DREAM DECONSTRUCTION 错位 拼贴",
      mainSize: 130,
      mainLead: 1.05,
      smallOn: true,
      smallSize: 10,
      smallText: DEFAULT_SMALL_TEXT,
      ratio: "1:1",
    };
    const looks = {
      contour: { fxMode: "raw", imageOn: true, outlineLayers: 3, mainSize: 130, grain: 12 },
      classic: { fxMode: "raw", imageOn: true, outlineLayers: 0, mainSize: 100, grain: 12 },
      hollow: { fxMode: "raw", imageOn: false, outlineLayers: 3, mainSize: 160, grain: 12 },
      dots: { fxMode: "halftone", imageOn: true, outlineLayers: 0, mainSize: 190, grain: 28 },
      pixels: { fxMode: "pixelate", imageOn: true, outlineLayers: 0, mainSize: 130, grain: 28 },
    };
    const state = {
      srcCanvas: null, // 输入图
      subjects: [], // 分割结果
      fxItems: [], // 特效处理后的主体 [{subject, canvas, pad}]
      layout: [], // 放置结果 [{cx, cy, scale}]，与 fxItems 一一对应
      seed: 20260820,
      destroyed: false,
      loadVersion: 0,
    };

    // ---------- DOM ----------
    const panel = document.createElement("div");
    const stage = document.createElement("div");
    stage.className = "tool-stage typeflow-stage";
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
        maxSubjects: values.subjectCount,
      });
      state.subjects = res.subjects;
      if (!res.subjects.length) status.textContent = "未识别出主体，请调整阈值或使用透明底、纯色底图片。";
    }

    // 2) 特效：原图 / 像素化 / 半调 + 可选贴纸描边
    function buildFx() {
      state.fxItems = state.subjects.map((s) => {
        let base;
        if (values.fxMode === "pixelate") {
          base = subjectPixelate(state.srcCanvas, s, { size: values.grain });
        } else if (values.fxMode === "halftone") {
          base = makeCanvas(s.w, s.h);
          const dots = base.getContext("2d");
          const cut = subjectCutout(state.srcCanvas, s).getContext("2d").getImageData(0, 0, s.w, s.h).data;
          const step = values.grain;
          for (let y = Math.floor(step / 2); y < s.h; y += step) {
            for (let x = Math.floor(step / 2); x < s.w; x += step) {
              const i = (y * s.w + x) * 4;
              if (cut[i + 3] < 40) continue;
              dots.fillStyle = `rgb(${cut[i]},${cut[i + 1]},${cut[i + 2]})`;
              dots.beginPath(); dots.arc(x, y, step * .46, 0, Math.PI * 2); dots.fill();
            }
          }
        } else {
          base = subjectCutout(state.srcCanvas, s);
        }
        const pad = values.outlineLayers * values.outlineGap + 5;
        const out = makeCanvas(s.w + pad * 2, s.h + pad * 2);
        const oc = out.getContext("2d");
        // Each contour is a thin ink edge around a paper-filled dilation.
        for (let layer = values.outlineLayers; layer >= 1; layer--) {
          for (const [radius, color] of [[layer * values.outlineGap, values.ink], [Math.max(0, layer * values.outlineGap - 1.8), values.paper]]) {
            const ring = dilatedSilhouette(s, radius, color);
            oc.drawImage(ring, pad - ring.pad, pad - ring.pad);
          }
        }
        if (values.imageOn) oc.drawImage(base, pad, pad);
        // Reserve the solid subject even when its image is hidden or dotted.
        const reserve = makeCanvas(out.width, out.height), rc = reserve.getContext("2d");
        const silhouette = dilatedSilhouette(s, values.outlineLayers * values.outlineGap, "#000000");
        rc.drawImage(silhouette, pad - silhouette.pad, pad - silhouette.pad);
        const rows = maskRows(rc.getImageData(0, 0, out.width, out.height).data, out.width, out.height);
        return { subject: s, canvas: out, pad, rows };

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
        const frac = clamp(0.20 - 0.07 * t + (rng() - 0.5) * 0.02, 0.13, 0.20);
        const contentW = CANVAS_W * frac;
        const scale = Math.min(contentW / fx.canvas.width, (H * 0.24) / fx.canvas.height);
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
        const scale = Math.min(lay.scale * values.subjectScale, (CANVAS_W - 24) / fx.canvas.width, (H - 24) / fx.canvas.height);
        const w = fx.canvas.width * scale;
        const h = fx.canvas.height * scale;
        return {
          fx,
          rows: fx.rows, sourceWidth: fx.canvas.width, sourceHeight: fx.canvas.height,
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
      ctx.fillStyle = values.paper;
      ctx.fillRect(0, 0, CANVAS_W, H);

      // 主体
      const items = itemRects(H);
      for (const it of items) {
        ctx.drawImage(it.fx.canvas, it.rect.x, it.rect.y, it.rect.w, it.rect.h);
      }

      // Typeset within silhouette-derived free intervals, preserving every token.
      const size = values.mainSize;
      const tokens = tokenize(values.mainText);
      const wordRects = [];
      ctx.fillStyle = values.ink;
      ctx.textBaseline = "alphabetic";
      let tokenIndex = 0;
      for (let top = MARGIN; top + size <= H - MARGIN && tokenIndex < tokens.length; top += size * values.mainLead) {
        const spans = freeSpans(items, top, top + size, MARGIN, CANVAS_W - MARGIN, values.contourGap);
        for (const [left, right] of spans) {
          let x = left;
          while (tokenIndex < tokens.length) {
            const token = tokens[tokenIndex];
            ctx.font = MAIN_FONT(size);
            const natural = ctx.measureText(token).width;
            // Long English words may condense to a full line, never disappear.
            const available = right - x;
            const width = /^[A-Za-z0-9]/.test(token) && token.length >= 4 && available >= natural * .42
              ? Math.min(natural, available) : natural;
            if (x + width > right) break;
            const fontSize = size * width / natural;
            ctx.font = MAIN_FONT(fontSize);
            ctx.fillText(token, x, top + size * .83);
            wordRects.push({ x, y: top + (size-fontSize)*.83, w: width, h: fontSize });
            x += width + size * .12;
            tokenIndex++;
          }
        }
      }
      status.textContent = !items.length ? "未识别出主体，请调整阈值或使用透明底、纯色底图片。" : tokenIndex < tokens.length
        ? `还有 ${tokens.length - tokenIndex} 组文字未排入，请减小字号或主体尺寸。`
        : `${items.length} 个主体 · 拖动图像可调整位置 · 预览与导出不含水印`;
      if (values.smallOn) drawSmallText(items, wordRects, H);
    }

    function drawSmallText(items, wordRects, H) {
      const pool = tokenize(values.smallText);
      if (!pool.length) return;
      const size = values.smallSize, lineH = size * 1.3;
      ctx.font = SMALL_FONT(size);
      ctx.fillStyle = values.ink;
      ctx.globalAlpha = .62;
      let index = 0;
      // Narrow columns follow the changing contour at each baseline.
      for (let y = MARGIN; y + lineH < H - MARGIN; y += lineH) {
        const spans = freeSpans(items, y, y + lineH, MARGIN, CANVAS_W - MARGIN, values.contourGap);
        for (const [left, right] of spans) {
          for (let x = left; x < right - 20; x += 92) {
            const w = Math.min(82, right - x);
            const box = { x, y, w, h: lineH };
            const nearby = items.some(({rect:r}) => x + w > r.x - 95 && x < r.x + r.w + 95 && y > r.y - 38 && y < r.y + r.h + 38);
            if (!nearby || wordRects.some(r => rectsIntersect(box, r, 5))) continue;
            let line = "", consumed = 0;
            for (let k = 0; k < 15; k++) {
              const token = pool[(index + k) % pool.length];
              const next = line ? line + " " + token : token;
              if (ctx.measureText(next).width > w) break;
              line = next; consumed++;
            }
            if (line) { ctx.fillText(line, x, y + size); index += consumed; }
          }
        }
      }
      ctx.globalAlpha = 1;
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
      if (["threshold", "subjectCount"].includes(key)) scheduleSegment();
      else if (["fxMode", "grain", "outlineLayers", "outlineGap", "imageOn", "paper", "ink"].includes(key))
        scheduleFx();
      else if (key === "ratio") runAll({ replace: true });
      else scheduleDraw();
    };

    const status = document.createElement("p");
    status.className = "tc-info";
    status.setAttribute("role", "status");
    stage.append(status);
    panelSection(panel, "视频效果预设");
    buildControls(panel, [{ key: "look", label: "一键切换效果", type: "select", options: [
      { value: "contour", label: "多层轮廓拼贴" }, { value: "classic", label: "轻字密集混排" },
      { value: "hollow", label: "空心轮廓" }, { value: "dots", label: "彩色半调大字" }, { value: "pixels", label: "像素拼贴" },
    ] }], {look:"contour"}, (_, look) => {
      Object.assign(values, looks[look]);
      if ([DEFAULT_MAIN_TEXT, "梦境 解构 DREAM", "梦境 解构 DREAM DECONSTRUCTION 错位 拼贴"].includes(values.mainText)) {
        values.mainText = look === "classic" ? DEFAULT_MAIN_TEXT : ["dots", "hollow"].includes(look) ? "梦境 解构 DREAM" : "梦境 解构 DREAM DECONSTRUCTION 错位 拼贴";
      }
      textControls.mainText.value = values.mainText;
      for (const [key, input] of Object.entries(fxControls)) {
        if (input.type === "checkbox") input.checked = !!values[key]; else input.value = values[key];
        const val = input.closest(".tc-field").querySelector(".tc-val"); if (val) val.textContent = values[key];
      }
      textControls.mainSize.value = values.mainSize;
      textControls.mainSize.closest(".tc-field").querySelector(".tc-val").textContent = values.mainSize;
      runAll({refx:true});
    });
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
        { key: "subjectCount", label: "主体数量上限", type: "range", min: 1, max: 10 },
        { key: "threshold", label: "环境色分离阈值", type: "range", min: 10, max: 200 },
      ],
      values,
      (key, v) => {
        if (key === "imageFile") {
          const file = v && v[0];
          if (!file) return;
          const version = ++state.loadVersion;
          loadImageFile(file)
            .then((img) => {
              if (state.destroyed || version !== state.loadVersion) return;
              state.srcCanvas = imageToCanvas(img, 1400);
              runAll({ resegment: true });
            })
            .catch(() => { if (!state.destroyed && version === state.loadVersion) status.textContent = "图片读取失败，请重新选择图片。"; });
          return;
        }
        onChange(key);
      }
    );

    panelSection(panel, "视觉特效");
    const fxControls = buildControls(
      panel,
      [
        {
          key: "fxMode",
          label: "特效模式",
          type: "select",
          options: [
            { value: "raw", label: "原图" },
            { value: "pixelate", label: "像素化 Pixelate" },
            { value: "halftone", label: "彩色半调 Halftone" },
          ],
        },
        { key: "imageOn", label: "显示主体图像（关闭后保留轮廓）", type: "checkbox" },
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
        { key: "outlineGap", label: "描边间距", type: "range", min: 4, max: 24 },
      ],
      values,
      (key, v) => {
        if (key === "outlineLayers") values.outlineLayers = parseInt(v, 10) || 0;
        onChange(key);
      }
    );

    panelSection(panel, "图文混排");
    const textControls = buildControls(
      panel,
      [
        { key: "subjectScale", label: "主体尺寸", type: "range", min: .5, max: 1.8, step: .05 },
        { key: "contourGap", label: "图文避让间距", type: "range", min: 2, max: 24 },
        { key: "mainText", label: "主文字内容", type: "textarea", rows: 4 },
        { key: "mainSize", label: "主字号", type: "range", min: 40, max: 240 },
        { key: "mainLead", label: "主行距", type: "range", min: 0.9, max: 1.6, step: 0.05 },
        { key: "smallOn", label: "贴轮廓填充小字", type: "checkbox" },
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

    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    let dragging = null;
    const pointer = e => { const r = canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*canvas.width/r.width, y:(e.clientY-r.top)*canvas.height/r.height}; };
    canvas.addEventListener("pointerdown", e => {
      const p = pointer(e), items = itemRects(canvasHeight());
      for (let i = items.length - 1; i >= 0; i--) {
        const r = items[i].rect;
        if (p.x >= r.x && p.x <= r.x+r.w && p.y >= r.y && p.y <= r.y+r.h) {
          dragging = {i, dx:p.x-state.layout[i].cx, dy:p.y-state.layout[i].cy};
          canvas.setPointerCapture(e.pointerId); canvas.style.cursor="grabbing"; break;
        }
      }
    });
    canvas.addEventListener("pointermove", e => {
      if (!dragging || state.destroyed) return;
      const p = pointer(e), lay = state.layout[dragging.i];
      lay.cx = clamp(p.x-dragging.dx, 0, CANVAS_W); lay.cy = clamp(p.y-dragging.dy, 0, canvasHeight());
      draw();
    });
    const endDrag = () => {dragging=null;canvas.style.cursor="grab";};
    canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);

    // ---------- 默认体验：演示图立即出图（参考图加载失败时也有兜底）----------
    state.srcCanvas = typeflowDemo();
    runAll({ resegment: true });

    // 参考原图直接作为主体图载入
    if (options.sourceImageUrl) {
      const version = ++state.loadVersion;
      loadImageUrl(options.sourceImageUrl)
        .then((img) => {
          if (state.destroyed || version !== state.loadVersion) return;
          state.srcCanvas = imageToCanvas(img, 1400);
          runAll({ resegment: true });
        })
        .catch(() => { if (!state.destroyed && version === state.loadVersion) status.textContent = "参考图读取失败，已保留当前画布。"; });
    }

    return () => {
      state.destroyed = true;
      container.replaceChildren();
    };
  },
};
