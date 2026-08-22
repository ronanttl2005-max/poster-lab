// ============================================================
// Skill 库 · 渲染与运行
// 每个 skill 是一张「效果卡」，访客点进去上传素材/输入需求，
// 浏览器直连 AI 接口一键复刻。
//
// 关键设计（零成本 / 零后端）：
//   · AI 调用从访客自己的浏览器直接发出，用访客自己的 key。
//   · key 只存在访客本地 localStorage，绝不进代码、绝不进仓库。
//   · 站点部署在 GitHub Pages（纯静态）也能跑，因为不依赖后端。
// ============================================================

const API_BASE = "https://api.openai-next.com/v1";
const KEY_STORE = "posterLabAiKey"; // 独立于管理密钥（posterLabAdminToken）

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
  const res = await fetch(`${API_BASE}/chat/completions`, {
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
  const form = new FormData();
  form.append("model", skill.model || "gpt-image-1");
  form.append("prompt", skill.prompt || "");
  form.append("image", file, file.name || "input.png");
  if (skill.size) form.append("size", skill.size);
  const res = await fetch(`${API_BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAiKey()}` }, // 不要手动设 Content-Type，交给浏览器带 boundary
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const item = data?.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("接口没有返回图片");
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
      <p class="modal-hint">粘贴一次，这台设备之后一直记住。</p>
      <input type="password" id="ai-key-input" class="modal-input" placeholder="sk-..." value="${esc(getAiKey())}" />
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
        ${hasKey ? '<span class="key-ok">🔑 已填 API Key</span>' : '<span class="key-warn">⚠ 还没填 API Key，运行前需要先填</span>'}
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
      if (!ensureKey()) return;
      if (!picked) { output.innerHTML = `<div class="skill-err">先选一张图片。</div>`; return; }
      setBusy(true);
      output.innerHTML = `<div class="skill-loading">AI 正在复刻这个效果，图生图通常要十几秒…</div>`;
      try {
        const src = await callImageEdit(skill, picked);
        output.innerHTML = `
          <div class="skill-result-img"><img src="${src}" alt="AI 结果" /></div>
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
