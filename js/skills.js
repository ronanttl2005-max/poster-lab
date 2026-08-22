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

const DEFAULT_API_BASE = "https://api.openai-next.com/v1";
const OFFICIAL_API_BASE = "https://api.openai.com/v1";
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
  throw lastError || new Error("没有可用的图像模型");
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

function drawLocalDoodles(ctx, width, height) {
  const unit = Math.max(2, Math.min(width, height) * 0.006);
  const stroke = "rgba(20, 24, 30, 0.9)";
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = unit;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 一组与照片内容无关、但会自然落在脸部/主体附近的马克笔线条。
  const cx = width * 0.5;
  const cy = height * 0.39;
  const rx = width * 0.085;
  const ry = height * 0.055;
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.62, cy, rx, ry, -0.05, 0, Math.PI * 2);
  ctx.ellipse(cx + rx * 0.62, cy, rx, ry, 0.05, 0, Math.PI * 2);
  ctx.moveTo(cx - rx * 0.05, cy);
  ctx.lineTo(cx + rx * 0.05, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - width * 0.11, cy - height * 0.105);
  ctx.quadraticCurveTo(cx, cy - height * 0.18, cx + width * 0.11, cy - height * 0.105);
  ctx.lineTo(cx + width * 0.075, cy - height * 0.19);
  ctx.lineTo(cx - width * 0.075, cy - height * 0.19);
  ctx.closePath();
  ctx.stroke();

  drawStar(ctx, width * 0.17, height * 0.19, Math.min(width, height) * 0.045);
  drawStar(ctx, width * 0.82, height * 0.23, Math.min(width, height) * 0.035);
  drawStar(ctx, width * 0.76, height * 0.69, Math.min(width, height) * 0.05);

  ctx.beginPath();
  ctx.moveTo(width * 0.18, height * 0.73);
  ctx.quadraticCurveTo(width * 0.1, height * 0.61, width * 0.23, height * 0.58);
  ctx.quadraticCurveTo(width * 0.37, height * 0.55, width * 0.39, height * 0.68);
  ctx.quadraticCurveTo(width * 0.39, height * 0.79, width * 0.25, height * 0.79);
  ctx.lineTo(width * 0.18, height * 0.85);
  ctx.lineTo(width * 0.19, height * 0.78);
  ctx.stroke();
  ctx.font = `600 ${Math.max(12, Math.round(width * 0.025))}px sans-serif`;
  ctx.fillText("hi!", width * 0.235, height * 0.69);
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
    drawLocalDoodles(ctx, canvas.width, canvas.height);
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

// ---------------- 弹窗：填 API Key ----------------

export function openAiKeyModal(onSaved) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true">
      <h3>填写 API Key</h3>
      <p class="modal-hint">粘贴一次，这台设备之后一直记住。图像接口会自动尝试可用模型。</p>
      <input type="password" id="ai-key-input" class="modal-input" placeholder="sk-..." value="${esc(getAiKey())}" />
      <label class="modal-hint" for="ai-api-base">接口</label>
      <select id="ai-api-base" class="modal-input">
        <option value="${esc(DEFAULT_API_BASE)}" ${getApiBase() === DEFAULT_API_BASE ? "selected" : ""}>兼容网关（当前）</option>
        <option value="${esc(OFFICIAL_API_BASE)}" ${getApiBase() === OFFICIAL_API_BASE ? "selected" : ""}>OpenAI 官方 API</option>
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
            fallbackMessage = "当前接口暂不可用，已切换为本地涂鸦模式（照片不会上传）。";
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
