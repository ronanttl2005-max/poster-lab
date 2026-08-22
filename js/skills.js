// ============================================================
// Skill 库 · 渲染与运行
// 每个 skill 是一张「效果卡」，访客点进去上传素材/输入需求，
// 浏览器直连 AI 接口一键复刻。
//
// 关键设计（零后端）：
//   · AI 调用从访客自己的浏览器直接发出，用访客自己的 key。
//   · key 只存在访客本地 localStorage，绝不进代码、绝不进仓库。
//   · 语义型照片效果必须由 AI 理解场景；接口失败时明确报错，不伪装成本地同款效果。
//   · 站点部署在 GitHub Pages（纯静态）也能跑，因为不依赖后端。
// ============================================================

const OFFICIAL_API_BASE = "https://api.openai.com/v1";
const COMPATIBLE_API_BASE = "https://api.openai-next.com/v1";
const POSTER_API_ORIGIN = "https://poster-lab.onrender.com";
// 官方接口是唯一能确定提供 GPT Image 模型的默认选项；兼容网关保留为手动选择。
const DEFAULT_API_BASE = OFFICIAL_API_BASE;
const KEY_STORE = "posterLabAiKey"; // 独立于管理密钥（posterLabAdminToken）
const API_BASE_STORE = "posterLabAiBase";
const API_BASE_MIGRATION_STORE = "posterLabAiBaseOfficialV2";
const IMAGE_MODEL_STORE = "posterLabAiImageModel";
const DEFAULT_IMAGE_MODELS = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"];
const DEFAULT_REASONING_MODEL = "gpt-5.6";

function getAiProxyBase() {
  const host = globalThis.location?.hostname || "";
  if (host === "ronanttl2005-max.github.io") return `${POSTER_API_ORIGIN}/api/ai`;
  if (globalThis.location?.protocol === "http:" || globalThis.location?.protocol === "https:") {
    return `${globalThis.location.origin}/api/ai`;
  }
  return "http://127.0.0.1:4173/api/ai";
}

function normalizeApiBase(value) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(base) ? base : DEFAULT_API_BASE;
}

export function getApiBase() {
  try {
    const saved = normalizeApiBase(localStorage.getItem(API_BASE_STORE) || DEFAULT_API_BASE);
    // 旧版本把兼容网关当默认值，很多浏览器因此一直停留在无图像通道的接口。
    // 首次加载新版时迁移到官方接口；之后用户仍可在弹窗中主动选回兼容网关。
    if (!localStorage.getItem(API_BASE_MIGRATION_STORE) && saved === COMPATIBLE_API_BASE) {
      localStorage.removeItem(API_BASE_STORE);
      localStorage.setItem(API_BASE_MIGRATION_STORE, "1");
      return DEFAULT_API_BASE;
    }
    return saved;
  }
  catch { return DEFAULT_API_BASE; }
}

export function setApiBase(base) {
  try {
    const normalized = normalizeApiBase(base);
    localStorage.setItem(API_BASE_MIGRATION_STORE, "1");
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

function apiError(res, data, details = {}) {
  const error = new Error(data?.error?.message || `HTTP ${res.status}`);
  error.status = res.status;
  error.code = data?.error?.code || data?.error?.type || "";
  Object.assign(error, details);
  return error;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("无法读取这张图片"));
    reader.readAsDataURL(file);
  });
}

async function callResponsesImageEdit(skill, file) {
  const imageUrl = await fileToDataUrl(file);
  const reasoningModel = skill.reasoningModel || DEFAULT_REASONING_MODEL;
  const tool = {
    type: "image_generation",
    action: "edit",
    quality: skill.quality || "high",
  };
  if (skill.size) tool.size = skill.size;

  const res = await fetch(`${getAiProxyBase()}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAiKey()}`,
    },
    body: JSON.stringify({
      model: reasoningModel,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: skill.prompt || "" },
          { type: "input_image", image_url: imageUrl },
        ],
      }],
      tools: [tool],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw apiError(res, data, {
      apiBase: getAiProxyBase(),
      upstreamApiBase: OFFICIAL_API_BASE,
      model: reasoningModel,
      stage: "responses",
    });
  }

  const call = (data?.output || []).find((item) =>
    item?.type === "image_generation_call" && item?.result);
  if (!call?.result) {
    const error = new Error(data?.output_text || "接口已响应，但没有生成图片");
    error.apiBase = getAiProxyBase();
    error.upstreamApiBase = OFFICIAL_API_BASE;
    error.model = reasoningModel;
    error.stage = "responses";
    throw error;
  }
  const src = String(call.result).startsWith("data:")
    ? call.result
    : `data:image/png;base64,${call.result}`;
  return { src, mode: "responses", model: reasoningModel };
}

async function callDirectImageEdit(skill, file) {
  const configuredModel = getImageModel() || skill.model || DEFAULT_IMAGE_MODELS[0];
  const models = [configuredModel, ...DEFAULT_IMAGE_MODELS].filter((model, index, all) => all.indexOf(model) === index);
  let lastError;
  const proxyImage = getApiBase() === OFFICIAL_API_BASE;
  const imageDataUrl = proxyImage ? await fileToDataUrl(file) : "";

  for (const model of models) {
    const form = new FormData();
    let body = form;
    const headers = { Authorization: `Bearer ${getAiKey()}` };
    if (proxyImage) {
      body = JSON.stringify({
        model,
        prompt: skill.prompt || "",
        imageDataUrl,
        size: skill.size || undefined,
        quality: skill.quality || undefined,
      });
      headers["Content-Type"] = "application/json";
    } else {
      form.append("model", model);
      form.append("prompt", skill.prompt || "");
      form.append("image", file, file.name || "input.png");
      if (skill.size) form.append("size", skill.size);
      if (skill.quality) form.append("quality", skill.quality);
    }
    try {
      const endpoint = proxyImage ? `${getAiProxyBase()}/images/edits` : `${getApiBase()}/images/edits`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw apiError(res, data, {
          apiBase: endpoint,
          ...(proxyImage ? { upstreamApiBase: OFFICIAL_API_BASE } : {}),
          model,
          stage: "images",
        });
      }
      const item = data?.data?.[0];
      if (item?.b64_json) return { src: `data:image/png;base64,${item.b64_json}`, mode: "direct", model };
      if (item?.url) return { src: item.url, mode: "direct", model };
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

function shouldTryDirectImageApi(error) {
  if ([401, 403, 429].includes(error?.status)) return false;
  if (error?.code === "moderation_blocked" || error?.code === "image_generation_user_error") return false;
  return true;
}

async function callImageEdit(skill, file) {
  if (getApiBase() === OFFICIAL_API_BASE) {
    try {
      return await callResponsesImageEdit(skill, file);
    } catch (error) {
      if (!shouldTryDirectImageApi(error)) throw error;
      console.warn("Responses image edit unavailable; trying direct Image API", error);
      const direct = await callDirectImageEdit(skill, file);
      return { ...direct, compatibilityFallback: true };
    }
  }
  return callDirectImageEdit(skill, file);
}

function isModelUnavailable(error) {
  const msg = String(error?.message || error).toLowerCase();
  return error?.status === 404
    || /no available channels|model.*(not found|does not exist|not available|unsupported)|unsupported.*model|模型.*(不存在|不可用|不支持)/i.test(msg);
}

function friendlyError(err) {
  const msg = String(err?.message || err);
  if (err?.status === 401 || /invalid token|unauthorized|incorrect api key|401/i.test(msg)) {
    return "API Key 不正确或已失效：点右上「🔑 API Key」重新填写。";
  }
  if (err?.status === 403 || /verification|organization|permission|forbidden/i.test(msg)) {
    return "当前账号没有 GPT Image 权限，或尚未完成 OpenAI 组织验证。";
  }
  if (err?.status === 429 || /quota|balance|insufficient|rate limit|余额|402|429/i.test(msg)) {
    return "这个 key 额度不足或请求过于频繁，请检查余额后稍等再试。";
  }
  if (/no available channels|model.*(not found|not available|unsupported)|unsupported.*model/i.test(msg)) {
    return `当前接口没有可用的 ${err?.model || "图像"} 模型通道，请切换到 OpenAI 官方 API。`;
  }
  if (/failed to fetch|network|cors|load failed/i.test(msg)) {
    return "浏览器无法连接当前接口，可能是网络或跨域限制。";
  }
  return `运行失败：${msg}`;
}

// ---------------- 弹窗：填 API Key ----------------

export function openAiKeyModal(onSaved) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true">
      <h3>填写 API Key</h3>
      <p class="modal-hint">照片拟人涂鸦会先理解画面主体，再调用图像编辑。推荐使用有余额和图像权限的 OpenAI 官方 key；兼容网关只能使用直接图像编辑，效果可能略有差异。</p>
      <input type="password" id="ai-key-input" class="modal-input" placeholder="sk-..." value="${esc(getAiKey())}" />
      <label class="modal-hint" for="ai-api-base">接口</label>
      <select id="ai-api-base" class="modal-input">
        <option value="${esc(OFFICIAL_API_BASE)}" ${getApiBase() === OFFICIAL_API_BASE ? "selected" : ""}>OpenAI 官方 API（推荐）</option>
        <option value="${esc(COMPATIBLE_API_BASE)}" ${getApiBase() === COMPATIBLE_API_BASE ? "selected" : ""}>兼容网关（需支持图像模型）</option>
      </select>
      <label class="modal-hint" for="ai-image-model">兼容图像模型（官方智能流程不可用时使用）</label>
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
        ${hasKey ? '<span class="key-ok">🔑 已填 API Key</span>' : '<span class="key-warn">⚠ 未填 API Key：AI Skill 需要先配置 Key</span>'}
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
      if (!ensureKey()) {
        output.innerHTML = `<div class="skill-err">这个效果需要 AI 识别画面主体，请先填写 API Key。</div>`;
        return;
      }
      setBusy(true);
      output.innerHTML = `<div class="skill-loading">AI 正在识别画面主角，并设计符合场景的拟人动作；高质量图像通常需要几十秒…</div>`;
      try {
        const result = await callImageEdit(skill, picked);
        const note = result.mode === "responses"
          ? `已使用 ${result.model} 先理解场景，再调用图像编辑。`
          : `${result.compatibilityFallback ? "智能编辑流程不可用，" : ""}已使用 ${result.model} 直接图像编辑。`;
        output.innerHTML = `
          <div class="skill-result-img"><img src="${result.src}" alt="照片拟人涂鸦结果" /></div>
          <div class="skill-mode-note">${esc(note)}</div>
          <a class="g-btn primary" href="${result.src}" download="skill-${esc(skill.id)}.png">⬇ 下载结果</a>`;
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
