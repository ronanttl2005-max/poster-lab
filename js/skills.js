// ============================================================
// Skill 库 · 渲染与运行
// 每个 skill 是一张「效果卡」，访客点进去上传素材/输入需求，
// 浏览器直连 AI 接口一键复刻。
//
// 关键设计（零成本 / 零后端）：
//   · AI 调用从访客自己的浏览器直接发出，用访客自己的 key。
//   · key 只存在访客本地 localStorage，绝不进代码、绝不进仓库。
//   · 图像接口不可用时，照片 Skill 还有一个纯浏览器 Canvas 兜底，不上传原图。
//   · 站点部署在 GitHub Pages（纯静态）也能跑，因为不依赖后端。
// ============================================================

const OFFICIAL_API_BASE = "https://api.openai.com/v1";
const COMPATIBLE_API_BASE = "https://api.openai-next.com/v1";
// 官方接口是唯一能确定提供 GPT Image 模型的默认选项；兼容网关保留为手动选择。
const DEFAULT_API_BASE = OFFICIAL_API_BASE;
const KEY_STORE = "posterLabAiKey"; // 独立于管理密钥（posterLabAdminToken）
const API_BASE_STORE = "posterLabAiBase";
const IMAGE_MODEL_STORE = "posterLabAiImageModel";
const DEFAULT_IMAGE_MODELS = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"];

function normalizeApiBase(value) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(base) ? base : DEFAULT_API_BASE;
}

export function getApiBase() {
  try { return normalizeApiBase(localStorage.getItem(API_BASE_STORE) || DEFAULT_API_BASE); }
  catch { return DEFAULT_API_BASE; }
}

export function setApiBase(base) {
  try {
    const normalized = normalizeApiBase(base);
    if (normalized === DEFAULT_API_BASE) localStorage.removeItem(API_BASE_STORE);
    else localStorage.setItem(API_BASE_STORE, normalized);
  } catch { /* 隐私模式：不持久化，仅本次会话有效 */ }
}

export function getImageModel() {
  try {
    const model = localStorage.getItem(IMAGE_MODEL_STORE);
    return DEFAULT_IMAGE_MODELS.includes(model) ? model : DEFAULT_IMAGE_MODELS[0];
  } catch { return DEFAULT_IMAGE_MODELS[0]; }
}

export function setImageModel(model) {
  try {
    if (DEFAULT_IMAGE_MODELS.includes(model) && model !== DEFAULT_IMAGE_MODELS[0]) {
      localStorage.setItem(IMAGE_MODEL_STORE, model);
    } else {
      localStorage.removeItem(IMAGE_MODEL_STORE);
    }
  } catch { /* 隐私模式：不持久化，仅本次会话有效 */ }
}

export function getAiKey() {
  try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; }
}
export function setAiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORE, key);
    else localStorage.removeItem(KEY_STORE);
  } catch { /* 隐私模式：不持久化，仅本次会话有效 */ }
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------------- AI 调用 ----------------

async function callText(skill, userText) {
  const res = await fetch(`${getApiBase()}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAiKey()}` },
    body: JSON.stringify({
      model: skill.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: skill.system || "" },
        { role: "user", content: userText },
      ],
      temperature: 0.9,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const out = data?.choices?.[0]?.message?.content;
  if (!out) throw new Error("接口没有返回文本内容");
  return out;
}

async function callImageEdit(skill, file) {
  const configuredModel = getImageModel() || skill.model || DEFAULT_IMAGE_MODELS[0];
  const models = [configuredModel, ...DEFAULT_IMAGE_MODELS].filter((model, index, all) => all.indexOf(model) === index);
  let lastError;

  for (const model of models) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", skill.prompt || "");
    form.append("image", file, file.name || "input.png");
    if (skill.size) form.append("size", skill.size);
    if (skill.quality) form.append("quality", skill.quality);
    try {
      const res = await fetch(`${getApiBase()}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAiKey()}` }, // 不要手动设 Content-Type，交给浏览器带 boundary
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code || data?.error?.type || "";
        error.apiBase = getApiBase();
        error.model = model;
        throw error;
      }
      const item = data?.data?.[0];
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
      if (item?.url) return item.url;
      throw new Error("接口没有返回图片");
    } catch (error) {
      lastError = error;
      if (!isModelUnavailable(error)) throw error;
    }
  }
  const error = lastError || new Error("没有可用的图像模型");
  error.apiBase ||= getApiBase();
  throw error;
}

function isModelUnavailable(error) {
  const msg = String(error?.message || error).toLowerCase();
  return error?.status === 404
    || /no available channels|model.*(not found|does not exist|not available|unsupported)|unsupported.*model|模型.*(不存在|不可用|不支持)/i.test(msg);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法读取这张图片"));
    image.src = url;
  });
}

function drawStar(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? radius * 0.42 : radius;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

async function detectFaceBox(image, width, height) {
  // FaceDetector 只在部分浏览器可用；不可用时使用适合常见人像构图的温和默认值。
  const fallback = {
    x: width * 0.33,
    y: height * 0.16,
    width: width * 0.34,
    height: height * 0.28,
  };
  try {
    if (typeof FaceDetector !== "undefined") {
      const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      const faces = await detector.detect(image);
      const face = (faces || [])
        .map((item) => item?.boundingBox)
        .filter((box) => box && box.width > 0 && box.height > 0)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
      if (face) return {
        x: Math.max(0, face.x),
        y: Math.max(0, face.y),
        width: Math.min(width - Math.max(0, face.x), face.width),
        height: Math.min(height - Math.max(0, face.y), face.height),
      };
    }
  } catch { /* 浏览器未提供原生人脸检测时走默认构图 */ }
  return fallback;
}

function drawRoughPath(ctx, draw) {
  draw();
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.translate(0.8, -0.5);
  draw();
  ctx.restore();
}

function drawLocalDoodles(ctx, width, height, face) {
  const unit = Math.max(2, Math.min(width, height) * 0.0045);
  const stroke = "rgba(18, 18, 20, 0.94)";
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = unit;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = face.x + face.width * 0.5;
  const eyeY = face.y + face.height * 0.48;
  const lensW = face.width * 0.32;
  const lensH = face.height * 0.18;

  // 眼镜：跟着检测到的人脸框走，而不是永远画在画布正中。
  drawRoughPath(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(cx - lensW * 0.63, eyeY, lensW, lensH, -0.04, 0, Math.PI * 2);
    ctx.ellipse(cx + lensW * 0.63, eyeY, lensW, lensH, 0.04, 0, Math.PI * 2);
    ctx.moveTo(cx - lensW * 0.08, eyeY);
    ctx.quadraticCurveTo(cx, eyeY - lensH * 0.14, cx + lensW * 0.08, eyeY);
    ctx.stroke();
  });

  // 头顶小帽子 / 皇冠。
  const hatY = face.y - face.height * 0.12;
  drawRoughPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - face.width * 0.31, hatY + face.height * 0.05);
    ctx.quadraticCurveTo(cx, hatY - face.height * 0.13, cx + face.width * 0.31, hatY + face.height * 0.05);
    ctx.lineTo(cx + face.width * 0.2, hatY + face.height * 0.13);
    ctx.lineTo(cx - face.width * 0.2, hatY + face.height * 0.13);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - face.width * 0.16, hatY - face.height * 0.04);
    ctx.lineTo(cx - face.width * 0.05, hatY - face.height * 0.19);
    ctx.lineTo(cx + face.width * 0.04, hatY - face.height * 0.04);
    ctx.lineTo(cx + face.width * 0.15, hatY - face.height * 0.18);
    ctx.lineTo(cx + face.width * 0.2, hatY + face.height * 0.05);
    ctx.stroke();
  });

  const starR = Math.max(10, Math.min(width, height) * 0.035);
  drawStar(ctx, Math.max(starR, face.x - face.width * 0.34), face.y + face.height * 0.15, starR);
  drawStar(ctx, Math.min(width - starR, face.x + face.width * 1.34), face.y + face.height * 0.18, starR * 0.8);
  drawStar(ctx, Math.min(width - starR, face.x + face.width * 1.2), face.y + face.height * 1.25, starR * 0.9);

  // 空白区域的对话框和弯曲线，避免遮住脸部细节。
  const bubbleX = Math.max(width * 0.04, face.x - face.width * 0.7);
  const bubbleY = Math.min(height * 0.78, face.y + face.height * 1.02);
  const bubbleW = Math.min(width * 0.25, Math.max(90, face.width * 0.85));
  drawRoughPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(bubbleX, bubbleY);
    ctx.quadraticCurveTo(bubbleX - bubbleW * 0.04, bubbleY - face.height * 0.34, bubbleX + bubbleW * 0.38, bubbleY - face.height * 0.36);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY - face.height * 0.36, bubbleX + bubbleW, bubbleY - face.height * 0.02);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + face.height * 0.28, bubbleX + bubbleW * 0.44, bubbleY + face.height * 0.25);
    ctx.lineTo(bubbleX + bubbleW * 0.25, bubbleY + face.height * 0.43);
    ctx.lineTo(bubbleX + bubbleW * 0.28, bubbleY + face.height * 0.22);
    ctx.quadraticCurveTo(bubbleX, bubbleY + face.height * 0.18, bubbleX, bubbleY);
    ctx.stroke();
  });
  ctx.font = `700 ${Math.max(12, Math.round(face.width * 0.14))}px sans-serif`;
  ctx.fillText("hi!", bubbleX + bubbleW * 0.35, bubbleY - face.height * 0.1);
  ctx.restore();
}

async function createLocalDoodle(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const maxEdge = 2400;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器不支持图片画布");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const face = await detectFaceBox(image, canvas.width, canvas.height);
    drawLocalDoodles(ctx, canvas.width, canvas.height, face);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function friendlyError(err) {
  const msg = String(err?.message || err);
  if (/invalid token|unauthorized|401/i.test(msg)) return "API Key 不正确或已失效：点右上「🔑 API Key」重新填写。";
  if (/quota|balance|insufficient|余额|402/i.test(msg)) return "这个 key 额度不足了，换一个可用的 key。";
  if (/rate limit|429/i.test(msg)) return "请求太频繁，稍等几秒再试。";
  return `运行失败：${msg}`;
}

function imageFallbackReason(err) {
  const msg = String(err?.message || err).toLowerCase();
  if (err?.status === 401 || /invalid.*key|unauthorized|incorrect api key|invalid token/.test(msg)) {
    return "API Key 无效或不是 OpenAI 官方图像 API 的 key";
  }
  if (err?.status === 403 || /verification|organization|permission|forbidden/.test(msg)) {
    return "当前账号没有 GPT Image 权限，或尚未完成组织验证";
  }
  if (err?.status === 429 || /quota|rate limit|balance|insufficient/.test(msg)) {
    return "账号额度不足或触发限流";
  }
  if (/no available channels|model.*(not found|not available|unsupported)|unsupported.*model/.test(msg)) {
    return `兼容网关没有 ${err?.model || "GPT Image"} 图像通道`;
  }
  if (/failed to fetch|network|cors|load failed/.test(msg)) {
    return "浏览器无法连接该接口（网络或跨域限制）";
  }
  return "接口未返回可用图像";
}

// ---------------- 弹窗：填 API Key ----------------

export function openAiKeyModal(onSaved) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true">
      <h3>填写 API Key</h3>
      <p class="modal-hint">图像编辑需要支持 GPT Image 的接口。官方 OpenAI API 请填有余额/图像权限的 OpenAI key；兼容网关如果没有图像通道会自动改用本地模式。</p>
      <input type="password" id="ai-key-input" class="modal-input" placeholder="sk-..." value="${esc(getAiKey())}" />
      <label class="modal-hint" for="ai-api-base">接口</label>
      <select id="ai-api-base" class="modal-input">
        <option value="${esc(OFFICIAL_API_BASE)}" ${getApiBase() === OFFICIAL_API_BASE ? "selected" : ""}>OpenAI 官方 API（推荐）</option>
        <option value="${esc(COMPATIBLE_API_BASE)}" ${getApiBase() === COMPATIBLE_API_BASE ? "selected" : ""}>兼容网关（需支持图像模型）</option>
      </select>
      <label class="modal-hint" for="ai-image-model">图像模型</label>
      <select id="ai-image-model" class="modal-input">
        <option value="gpt-image-2" ${getImageModel() === "gpt-image-2" ? "selected" : ""}>GPT Image 2（推荐）</option>
        <option value="gpt-image-1.5" ${getImageModel() === "gpt-image-1.5" ? "selected" : ""}>GPT Image 1.5</option>
        <option value="gpt-image-1" ${getImageModel() === "gpt-image-1" ? "selected" : ""}>GPT Image 1（旧版）</option>
      </select>
      <div class="modal-actions">
        <button class="m-btn" type="button" data-close>取消</button>
        <button class="m-btn primary" type="button" id="ai-key-save">保存</button>
      </div>
    </div>`;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector("[data-close]").addEventListener("click", close);
  backdrop.querySelector("#ai-key-save").addEventListener("click", () => {
    setAiKey(backdrop.querySelector("#ai-key-input").value.trim());
    setApiBase(backdrop.querySelector("#ai-api-base").value);
    setImageModel(backdrop.querySelector("#ai-image-model").value);
    close();
    if (typeof onSaved === "function") onSaved();
  });
}

// ---------------- 挂载 ----------------

export async function mountSkills(root, param) {
  const { SKILLS } = await import("../data/skills.js");
  const skill = SKILLS.find((s) => s.id === param);
  if (!skill) { renderHub(root, SKILLS); return () => {}; }
  return renderSkillWorkspace(root, skill);
}

function coverHtml(s) {
  return s.coverImage
    ? `<img src="${esc(s.coverImage)}" alt="${esc(s.name)}" loading="lazy" />`
    : (s.cover || "");
}

function renderHub(root, skills) {
  const hasKey = !!getAiKey();
  root.innerHTML = `
    <div class="skills-topbar">
      <div class="skills-key-state">
        ${hasKey ? '<span class="key-ok">🔑 已填 API Key</span>' : '<span class="key-warn">⚠ 未填 API Key：图像 Skill 可用本地模式，文字 Skill 需要 Key</span>'}
      </div>
      <button class="g-btn" type="button" id="skills-key-btn">🔑 API Key</button>
    </div>
    <div class="tools-grid">
      ${skills.map((s) => `
        <a class="tool-card" href="#/skills/${esc(s.id)}">
          <div class="tool-card-cover">${coverHtml(s)}</div>
          <div class="skill-type-badge">${s.type === "image" ? "图生图" : "文字生成"}</div>
          <h3>${esc(s.name)}</h3>
          <div class="en">${esc(s.nameEn)}</div>
          <p>${esc(s.desc)}</p>
          <div class="card-tags">${(s.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </a>`).join("")}
    </div>`;
  root.querySelector("#skills-key-btn").addEventListener("click", () =>
    openAiKeyModal(() => renderHub(root, skills)));
}

function renderSkillWorkspace(root, skill) {
  root.innerHTML = `
    <div class="tool-head">
      <a class="tool-back" href="#/skills">← 全部 Skill</a>
      <div class="tool-title"><h2>${esc(skill.name)}</h2><span class="en">${esc(skill.nameEn)}</span></div>
      <p class="tool-desc">${esc(skill.desc)}</p>
      <div class="skills-topbar">
        <button class="g-btn" type="button" id="skill-key-btn">🔑 API Key</button>
      </div>
    </div>
    <div class="skill-run">
      ${skill.type === "image" ? renderImageInput(skill) : renderTextInput(skill)}
      <div class="skill-output" id="skill-output"><div class="skill-output-empty">运行后结果显示在这里</div></div>
    </div>`;

  root.querySelector("#skill-key-btn").addEventListener("click", () => openAiKeyModal());
  const output = root.querySelector("#skill-output");
  const runBtn = root.querySelector("#skill-run-btn");

  const ensureKey = () => {
    if (getAiKey()) return true;
    openAiKeyModal();
    return false;
  };
  const setBusy = (busy) => {
    runBtn.disabled = busy;
    runBtn.textContent = busy ? "AI 运行中…" : (skill.type === "image" ? "⚡ 一键复刻" : "⚡ 生成");
  };

  if (skill.type === "image") {
    const fileInput = root.querySelector("#skill-file");
    const preview = root.querySelector("#skill-preview");
    let picked = null;
    fileInput.addEventListener("change", () => {
      picked = fileInput.files?.[0] || null;
      if (picked) {
        const url = URL.createObjectURL(picked);
        preview.innerHTML = `<img src="${url}" alt="待处理图片" />`;
      }
    });
    runBtn.addEventListener("click", async () => {
      if (!picked) { output.innerHTML = `<div class="skill-err">先选一张图片。</div>`; return; }
      setBusy(true);
      output.innerHTML = `<div class="skill-loading">AI 正在复刻这个效果，图生图通常要十几秒…</div>`;
      try {
        let src;
        let mode = "ai";
        let fallbackMessage = "";
        if (!getAiKey()) {
          src = await createLocalDoodle(picked);
          mode = "local";
          fallbackMessage = "未填写 API Key，已使用本地涂鸦模式（照片不会上传）。";
        } else {
          try {
            src = await callImageEdit(skill, picked);
          } catch (error) {
            // 网关没有图像模型时仍然给用户一个可下载的结果，避免 Skill 完全不可用。
            src = await createLocalDoodle(picked);
            mode = "local";
            fallbackMessage = `AI 接口不可用（${imageFallbackReason(error)}），已使用本地涂鸦模式（照片不会上传）。`;
            console.warn("Image Skill API unavailable; used local fallback", error);
          }
        }
        output.innerHTML = `
          <div class="skill-result-img"><img src="${src}" alt="AI 结果" /></div>
          <div class="skill-mode-note">${esc(mode === "ai" ? `已使用 ${getApiBase()} 的图像模型生成。` : fallbackMessage)}</div>
          <a class="g-btn primary" href="${src}" download="skill-${esc(skill.id)}.png">⬇ 下载结果</a>`;
      } catch (err) {
        output.innerHTML = `<div class="skill-err">${esc(friendlyError(err))}</div>`;
      } finally { setBusy(false); }
    });
  } else {
    const textInput = root.querySelector("#skill-text");
    runBtn.addEventListener("click", async () => {
      if (!ensureKey()) return;
      const val = textInput.value.trim();
      if (!val) { output.innerHTML = `<div class="skill-err">先输入你的需求。</div>`; return; }
      setBusy(true);
      output.innerHTML = `<div class="skill-loading">AI 生成中…</div>`;
      try {
        const text = await callText(skill, val);
        output.innerHTML = `
          <pre class="skill-result-text">${esc(text)}</pre>
          <button class="g-btn" type="button" id="skill-copy">📋 复制</button>`;
        output.querySelector("#skill-copy").addEventListener("click", () => {
          navigator.clipboard?.writeText(text);
          output.querySelector("#skill-copy").textContent = "已复制 ✓";
        });
      } catch (err) {
        output.innerHTML = `<div class="skill-err">${esc(friendlyError(err))}</div>`;
      } finally { setBusy(false); }
    });
  }
  return () => {};
}

function renderImageInput(skill) {
  return `
    <div class="skill-input">
      <label class="skill-drop" for="skill-file">
        <div class="skill-preview" id="skill-preview"><span>点击选择图片</span></div>
        <input type="file" id="skill-file" accept="image/*" hidden />
      </label>
      <p class="skill-hint">${esc(skill.inputHint || "")}</p>
      <button class="g-btn primary" type="button" id="skill-run-btn">⚡ 一键复刻</button>
    </div>`;
}

function renderTextInput(skill) {
  return `
    <div class="skill-input">
      <textarea id="skill-text" class="skill-textarea" rows="5" placeholder="${esc(skill.inputHint || "输入你的需求…")}"></textarea>
      <button class="g-btn primary" type="button" id="skill-run-btn">⚡ 生成</button>
    </div>`;
}
