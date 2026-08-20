// ============================================================
// 艺术工具 · 多主体标本画布 Specimen Canvas
// 上传一张多物件图片 → 环境色阈值分割出独立主体 →
// 每个主体渲染成半调网点/纯色剪影/原图抠图，放在彩色相框卡片上，
// 白色画布平铺（可拖拽），带标本图鉴式小字标签，可导出高清 PNG。
// ============================================================
import {
  segmentSubjects,
  subjectCutout,
  subjectSilhouette,
  subjectHalftone,
  loadImageFile,
  imageToCanvas,
  makeCanvas,
  ART_PALETTES,
  randomPalette,
  hexToRgb,
  rgbToHex,
  clamp,
  debounce,
  enableDrag,
  downloadCanvasPNG,
  injectStyle,
  demoSubjectsImage,
  buildControls,
  panelSection,
} from "./shared.js";

const CANVAS_W = 1080;
const RATIOS = { "1:1": 1080, "3:4": 1440, "4:3": 810 };

// 半调网点用的深色变体：过亮的填充色压暗，保证网点在浅色卡片上可见
function dotColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (luma < 0.55) return hex;
  const k = luma > 0.82 ? 0.3 : 0.55;
  return rgbToHex(r * k, g * k, b * k);
}

function fakeSizeLabel(subject) {
  // 用主体像素尺寸编一个"标本实测尺寸"，像图鉴目录里的假数据
  const mm = (px) => Math.max(8, Math.round(px * 0.42));
  return `${mm(subject.w)}×${mm(subject.h)}MM`;
}

export default {
  id: "specimen",
  name: "多主体标本画布",
  nameEn: "Specimen Canvas",
  desc: "上传一张多物件图片，自动分割主体，生成半调网点标本图鉴，可拖拽排版并导出高清图。",
  tags: ["主体分割", "半调网点", "标本图鉴", "可拖拽"],
  cover: `<svg viewBox="0 0 120 84" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="84" rx="6" fill="#faf9f6"/>
    <rect x="10" y="12" width="34" height="42" rx="3" fill="#00A651"/>
    <circle cx="21" cy="26" r="2.4" fill="#111"/><circle cx="28" cy="26" r="2.4" fill="#111"/>
    <circle cx="35" cy="26" r="2.4" fill="#111"/><circle cx="24" cy="33" r="2.4" fill="#111"/>
    <circle cx="31" cy="33" r="2.4" fill="#111"/><circle cx="27" cy="40" r="2.4" fill="#111"/>
    <rect x="12" y="58" width="26" height="2.4" fill="#999"/><rect x="12" y="63" width="18" height="2.4" fill="#ccc"/>
    <rect x="52" y="20" width="30" height="30" rx="3" fill="#A6CAFC"/>
    <path d="M60 42 L67 26 L74 42 Z" fill="#F89812"/>
    <rect x="54" y="54" width="22" height="2.4" fill="#999"/>
    <rect x="90" y="10" width="22" height="34" rx="3" fill="#FFD6E7"/>
    <circle cx="97" cy="22" r="2" fill="#2B2BE6"/><circle cx="103" cy="22" r="2" fill="#2B2BE6"/>
    <circle cx="100" cy="29" r="2" fill="#2B2BE6"/><circle cx="97" cy="36" r="2" fill="#2B2BE6"/>
    <rect x="90" y="48" width="16" height="2.4" fill="#999"/>
  </svg>`,

  mount(container) {
    injectStyle("tool-specimen", `
      .sp-stage-wrap { display:flex; justify-content:center; align-items:flex-start; }
      .sp-canvas { max-width:100%; height:auto; background:#fff; box-shadow:0 2px 18px rgba(0,0,0,.1);
        border:1px solid #e8e5de; cursor:grab; touch-action:none; }
      .sp-canvas.dragging { cursor:grabbing; }
      .sp-status { font-size:12px; color:#8a8577; margin:6px 0 2px; }
      .sp-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
      .sp-item { display:flex; gap:8px; align-items:center; padding:6px; border:1px solid #e5e2d9;
        border-radius:8px; background:#fbfaf7; cursor:pointer; }
      .sp-item.selected { border-color:#1a936f; box-shadow:0 0 0 1px #1a936f; }
      .sp-item canvas { width:38px; height:38px; object-fit:contain; background:#fff;
        border:1px solid #eee9df; border-radius:5px; flex:none; }
      .sp-item .sp-names { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
      .sp-item input { width:100%; box-sizing:border-box; font-size:12px; padding:2px 6px;
        border:1px solid #e0dcd1; border-radius:4px; background:#fff; color:#3a372f; }
      .sp-item .sp-idx { font-size:10px; color:#b0aa99; font-family:ui-monospace,monospace; flex:none; }
    `);

    // ---------- 状态 ----------
    const values = {
      threshold: 60,
      minArea: 10,      // ×0.0001 → minAreaRatio
      mode: "halftone",
      dot: 6,
      useLuma: true,
      ratio: "1:1",
      fillColor: "#111111",
      frameColor: "#00A651",
    };
    let srcCanvas = null;   // 已降采样的源图
    let cards = [];         // {subject, cn, en, fill, frame, x, y, w, h, frameH, scale, rendered}
    let selected = -1;
    let segToken = 0;       // 防止过期分割结果覆盖新结果

    // ---------- DOM 骨架 ----------
    const panel = document.createElement("div");
    const stage = document.createElement("div");
    stage.className = "tool-stage";
    container.append(panel, stage);

    const stageWrap = document.createElement("div");
    stageWrap.className = "sp-stage-wrap";
    const canvas = makeCanvas(CANVAS_W, RATIOS[values.ratio]);
    canvas.className = "sp-canvas";
    stageWrap.append(canvas);
    stage.append(stageWrap);
    const ctx = canvas.getContext("2d");

    // ---------- 卡片渲染 ----------
    function renderSubject(card) {
      const { subject } = card;
      if (values.mode === "silhouette") {
        card.rendered = subjectSilhouette(subject, card.fill);
      } else if (values.mode === "cutout") {
        card.rendered = subjectCutout(srcCanvas, subject);
      } else {
        card.rendered = subjectHalftone(srcCanvas, subject, {
          dot: values.dot,
          color: dotColor(card.fill),
          useLuma: values.useLuma,
        });
      }
    }
    function renderAllSubjects() {
      for (const card of cards) renderSubject(card);
    }

    // 卡片几何：相框约为主体的 1.35 倍，标签区在相框下方
    function layoutCard(card) {
      const s = card.subject;
      const innerW = s.w * card.scale;
      const innerH = s.h * card.scale;
      const pad = Math.max(innerW, innerH) * 0.175;
      card.w = innerW + pad * 2;
      card.frameH = innerH + pad * 2;
      card.labelH = clamp(card.w * 0.16, 30, 44);
      card.h = card.frameH + card.labelH;
    }

    // 智能平铺：网格 + 少量确定性偏移，不重叠
    function tileCards() {
      const n = cards.length;
      if (!n) return;
      const W = canvas.width, H = canvas.height;
      const margin = Math.round(W * 0.055);
      const cols = Math.max(1, Math.round(Math.sqrt(n * (W / H))));
      const rows = Math.ceil(n / cols);
      const cellW = (W - margin * 2) / cols;
      const cellH = (H - margin * 2) / rows;
      const target = Math.min(cellW, cellH) * 0.5;
      cards.forEach((card, i) => {
        const s = card.subject;
        card.scale = target / Math.max(s.w, s.h);
        layoutCard(card);
        const col = i % cols, row = (i / cols) | 0;
        const jx = (((i * 7) % 5) - 2) * cellW * 0.03;
        const jy = (((i * 11) % 5) - 2) * cellH * 0.03;
        card.x = clamp(margin + col * cellW + (cellW - card.w) / 2 + jx, 8, W - card.w - 8);
        card.y = clamp(margin + row * cellH + (cellH - card.h) / 2 + jy, 8, H - card.h - 8);
      });
    }

    function drawCard(card, showLabel = true) {
      const { x, y, w, frameH } = card;
      const r = Math.min(10, w * 0.05);
      ctx.fillStyle = card.frame;
      ctx.beginPath();
      ctx.roundRect(x, y, w, frameH, r);
      ctx.fill();
      const innerW = card.subject.w * card.scale;
      const innerH = card.subject.h * card.scale;
      if (card.rendered) {
        ctx.drawImage(card.rendered, x + (w - innerW) / 2, y + (frameH - innerH) / 2, innerW, innerH);
      }
      if (!showLabel) return;
      const fs = clamp(Math.round(w * 0.055), 8, 12);
      const lh = fs + 2;
      let ty = y + frameH + lh;
      ctx.fillStyle = "#3d3a33";
      ctx.font = `600 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(card.cn, x + 1, ty);
      ctx.fillStyle = "#8a8577";
      ctx.font = `${fs - 1}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ty += lh;
      ctx.fillText(card.en.toUpperCase(), x + 1, ty);
      ty += lh;
      ctx.fillText(`SBJ-${String(card.no).padStart(2, "0")} · ${fakeSizeLabel(card.subject)}`, x + 1, ty);
    }

    function draw(forExport = false) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      cards.forEach((card) => drawCard(card));
      if (!forExport && selected >= 0 && cards[selected]) {
        const c = cards[selected];
        ctx.save();
        ctx.strokeStyle = "#1a936f";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.strokeRect(c.x - 6, c.y - 6, c.w + 12, c.h + 12);
        ctx.restore();
      }
    }

    // ---------- 主体列表（缩略图 + 可编辑标签）----------
    let listWrap;
    function rebuildList() {
      listWrap.innerHTML = "";
      if (!cards.length) {
        listWrap.innerHTML = `<div class="sp-status">未检测到主体，请调低分离阈值或换一张图。</div>`;
        return;
      }
      cards.forEach((card, i) => {
        const item = document.createElement("div");
        item.className = "sp-item" + (i === selected ? " selected" : "");
        const thumb = makeCanvas(38, 38);
        const tctx = thumb.getContext("2d");
        const sc = 34 / Math.max(card.subject.w, card.subject.h);
        const cut = subjectCutout(srcCanvas, card.subject);
        tctx.drawImage(cut, (38 - card.subject.w * sc) / 2, (38 - card.subject.h * sc) / 2,
          card.subject.w * sc, card.subject.h * sc);
        const names = document.createElement("div");
        names.className = "sp-names";
        const cnInput = document.createElement("input");
        cnInput.value = card.cn;
        const enInput = document.createElement("input");
        enInput.value = card.en;
        cnInput.addEventListener("input", () => { card.cn = cnInput.value; draw(); });
        enInput.addEventListener("input", () => { card.en = enInput.value; draw(); });
        names.append(cnInput, enInput);
        const idx = document.createElement("span");
        idx.className = "sp-idx";
        idx.textContent = "#" + card.no;
        item.append(thumb, names, idx);
        item.addEventListener("click", (e) => {
          if (e.target.tagName === "INPUT") return;
          selectCard(i === selected ? -1 : i);
        });
        listWrap.append(item);
      });
    }

    function selectCard(i) {
      selected = i;
      if (i >= 0 && cards[i]) {
        values.fillColor = cards[i].fill;
        values.frameColor = cards[i].frame;
        if (inputs.fillColor) inputs.fillColor.value = cards[i].fill;
        if (inputs.frameColor) inputs.frameColor.value = cards[i].frame;
      }
      listWrap.querySelectorAll(".sp-item").forEach((el, j) =>
        el.classList.toggle("selected", j === i));
      draw();
    }

    // ---------- 分割 ----------
    let statusEl;
    function resegment() {
      if (!srcCanvas) return;
      const token = ++segToken;
      statusEl.textContent = "正在分割主体…";
      requestAnimationFrame(() => {
        if (token !== segToken) return;
        const res = segmentSubjects(srcCanvas, {
          threshold: values.threshold,
          minAreaRatio: values.minArea / 10000,
          maxSubjects: 24,
          smooth: 1,
        });
        if (token !== segToken) return;
        cards = res.subjects.map((subject, i) => {
          const [fill, frame] = ART_PALETTES[i % ART_PALETTES.length];
          return {
            subject,
            no: i + 1,
            cn: "主体 " + String(i + 1).padStart(2, "0"),
            en: "Subject " + String(i + 1).padStart(2, "0"),
            fill, frame,
            x: 0, y: 0, w: 10, h: 10, frameH: 10, labelH: 30, scale: 1,
            rendered: null,
          };
        });
        selected = -1;
        renderAllSubjects();
        tileCards();
        rebuildList();
        draw();
        statusEl.textContent = `共检测到 ${cards.length} 个独立主体（画布上点选卡片可单独调色）`;
      });
    }
    const resegmentDebounced = debounce(resegment, 250);

    // ---------- 控件 ----------
    const rerenderAll = () => { renderAllSubjects(); draw(); };

    panelSection(panel, "图像输入");
    const inputs = buildControls(panel, [
      { key: "file", label: "上传多物件图片", type: "file", accept: "image/*" },
    ], values, async (key, files) => {
      if (key !== "file" || !files || !files[0]) return;
      try {
        statusEl.textContent = "正在读取图片…";
        const img = await loadImageFile(files[0]);
        srcCanvas = imageToCanvas(img, 1400);
        resegment();
      } catch (err) {
        statusEl.textContent = "图片读取失败，请换一张试试。";
      }
    });
    statusEl = document.createElement("div");
    statusEl.className = "sp-status";
    listWrap = document.createElement("div");
    listWrap.className = "sp-list";
    panel.append(statusEl, listWrap);

    panelSection(panel, "分割参数");
    Object.assign(inputs, buildControls(panel, [
      { key: "threshold", label: "环境色分离阈值", type: "range", min: 10, max: 200, step: 1 },
      { key: "minArea", label: "最小碎片过滤", type: "range", min: 1, max: 80, step: 1 },
    ], values, () => resegmentDebounced()));

    panelSection(panel, "渲染模式");
    Object.assign(inputs, buildControls(panel, [
      {
        key: "mode", label: "主体渲染", type: "select",
        options: [
          { value: "halftone", label: "半调网点" },
          { value: "silhouette", label: "纯色剪影" },
          { value: "cutout", label: "原图抠图" },
        ],
      },
      { key: "dot", label: "网点大小", type: "range", min: 3, max: 16, step: 1 },
      { key: "useLuma", label: "显示原图内容（网点随明度变化）", type: "checkbox" },
    ], values, () => rerenderAll()));

    panelSection(panel, "艺术色彩");
    Object.assign(inputs, buildControls(panel, [
      {
        key: "btnRandom", label: "随机艺术配色（每卡独立）", type: "button",
        onClick: () => {
          for (const card of cards) [card.fill, card.frame] = randomPalette();
          syncColorInputs();
          rerenderAll();
        },
      },
      {
        key: "btnUnify", label: "全局统一配色", type: "button",
        onClick: () => {
          const [fill, frame] = randomPalette();
          for (const card of cards) { card.fill = fill; card.frame = frame; }
          syncColorInputs();
          rerenderAll();
        },
      },
      { key: "fillColor", label: "主体填充色（作用于选中卡片）", type: "color" },
      { key: "frameColor", label: "相框填充色（作用于选中卡片）", type: "color" },
    ], values, (key) => {
      if (key !== "fillColor" && key !== "frameColor") return;
      const targets = selected >= 0 && cards[selected] ? [cards[selected]] : cards;
      for (const card of targets) {
        if (key === "fillColor") { card.fill = values.fillColor; renderSubject(card); }
        else card.frame = values.frameColor;
      }
      draw();
    }));
    function syncColorInputs() {
      const ref = selected >= 0 && cards[selected] ? cards[selected] : cards[0];
      if (!ref) return;
      values.fillColor = ref.fill;
      values.frameColor = ref.frame;
      if (inputs.fillColor) inputs.fillColor.value = ref.fill;
      if (inputs.frameColor) inputs.frameColor.value = ref.frame;
    }

    panelSection(panel, "画布");
    Object.assign(inputs, buildControls(panel, [
      {
        key: "ratio", label: "画布比例", type: "select",
        options: [
          { value: "1:1", label: "1:1 正方形" },
          { value: "3:4", label: "3:4 竖版" },
          { value: "4:3", label: "4:3 横版" },
        ],
      },
      {
        key: "btnTile", label: "智能平铺（重新排布）", type: "button",
        onClick: () => { tileCards(); draw(); },
      },
      {
        key: "btnExport", label: "导出高清大图", type: "button", primary: true,
        onClick: () => {
          draw(true);
          downloadCanvasPNG(canvas, `posterlab-specimen-${Date.now()}.png`, 2);
          draw();
        },
      },
    ], values, (key) => {
      if (key !== "ratio") return;
      canvas.height = RATIOS[values.ratio] || 1080;
      tileCards();
      draw();
    }));

    // ---------- 拖拽 ----------
    const unbindDrag = enableDrag(canvas, () => cards, {
      onPick: (i) => {
        canvas.classList.add("dragging");
        selectCard(i);
      },
      onMove: (i, nx, ny) => {
        const c = cards[i];
        c.x = clamp(nx, -c.w * 0.4, canvas.width - c.w * 0.6);
        c.y = clamp(ny, -c.h * 0.4, canvas.height - c.h * 0.6);
        draw();
      },
      onDrop: () => {
        canvas.classList.remove("dragging");
        draw();
      },
    });
    // 点击空白处取消选中
    const onCanvasDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const hit = cards.some((c) => mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h);
      if (!hit && selected >= 0) selectCard(-1);
    };
    canvas.addEventListener("mousedown", onCanvasDown);

    // ---------- 默认体验：演示图 ----------
    srcCanvas = demoSubjectsImage();
    resegment();

    return () => {
      segToken++;
      unbindDrag();
      canvas.removeEventListener("mousedown", onCanvasDown);
    };
  },
};
