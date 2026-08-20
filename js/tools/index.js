// ============================================================
// 艺术工具 · 注册表与工具箱首页
// 新增工具：在 js/tools/ 下新建模块（default 导出 {id,name,nameEn,desc,tags,mount}），
// 然后在下方 import 并加入 TOOLS 数组即可。
// mount(container, options) 负责渲染整个工具工作区，返回清理函数（可选）。
// options.sourceImageUrl：把参考原图直接作为工具输入素材；
// options.presetId：无图片输入的工具（声明了 presets 字段）用预设参数初始化。
// ============================================================
import specimen from "./specimen.js";
import techlines from "./techlines.js";
import typeflow from "./typeflow.js";

export const TOOLS = [specimen, techlines, typeflow];

if (window.PosterLab) {
  window.PosterLab.tools = TOOLS.map(({ id, name }) => ({ id, name }));
}

export function mountTools(root, param) {
  const tool = TOOLS.find((t) => t.id === param);
  if (!tool) {
    renderHub(root);
    return () => {};
  }
  root.innerHTML = `
    <div class="tool-head">
      <a class="tool-back" href="#/tools">← 全部工具</a>
      <div class="tool-title">
        <h2>${tool.name}</h2><span class="en">${tool.nameEn}</span>
      </div>
      <p class="tool-desc">${tool.desc}</p>
      <div class="tool-preset-chips" id="tool-presets"></div>
      <div class="ref-strip" id="tool-refs"></div>
    </div>
    <div class="tool-body"></div>`;
  const body = root.querySelector(".tool-body");
  let cleanup = () => {};
  const remount = (options = {}) => {
    try { cleanup(); } catch { /* 上一个实例清理失败不阻塞重挂载 */ }
    body.innerHTML = "";
    const c = tool.mount(body, options);
    cleanup = typeof c === "function" ? c : () => {};
  };
  renderToolPresets(root.querySelector("#tool-presets"), tool, remount);
  renderToolRefs(root.querySelector("#tool-refs"), tool, remount);
  remount();
  return () => cleanup();
}

function renderToolRefs(refsRoot, tool, remount) {
  const bridge = window.PosterLab;
  if (!refsRoot || !bridge) return;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const refs = bridge.getRefsFor(`tool:${tool.id}`);
  if (!refs.length) return;
  // 有 presets 字段 = 不吃图片输入的工具，不显示「用这张」按钮
  const canUseImage = !tool.presets;
  refsRoot.innerHTML = `
    <div class="ref-strip-label">参考原图（灵感库中挂载到此工具的图，点击放大${canUseImage ? "，点「⚡ 用这张」直接作为素材" : ""}）</div>
    <div class="ref-strip-row">
      ${refs.map((r, n) => `
        <div class="ref-thumb-wrap">
          <button class="ref-thumb" type="button" data-n="${n}" title="${esc(r.title)}"><img src="${bridge.imgSrc(r)}" alt="${esc(r.title)}" loading="lazy" /></button>
          ${canUseImage ? `<button class="ref-use-btn" type="button" data-n="${n}" title="把这张图载入工具开始处理">⚡ 用这张</button>` : ""}
        </div>`).join("")}
    </div>`;
  refsRoot.querySelectorAll(".ref-thumb").forEach((b) =>
    b.addEventListener("click", () => bridge.openImage(refs[+b.dataset.n]))
  );
  refsRoot.querySelectorAll(".ref-use-btn").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      remount({ sourceImageUrl: bridge.imgSrc(refs[+b.dataset.n]) });
    })
  );
}

function renderToolPresets(chipsRoot, tool, remount) {
  if (!chipsRoot || !Array.isArray(tool.presets) || !tool.presets.length) return;
  chipsRoot.innerHTML = `
    <span class="tool-preset-label">参数预设</span>
    ${tool.presets.map((p) => `<button class="tool-preset-chip" type="button" data-id="${p.id}">${p.name}</button>`).join("")}`;
  chipsRoot.querySelectorAll(".tool-preset-chip").forEach((b) =>
    b.addEventListener("click", () => {
      chipsRoot.querySelectorAll(".tool-preset-chip").forEach((x) =>
        x.classList.toggle("active", x === b));
      remount({ presetId: b.dataset.id });
    })
  );
}

function renderHub(root) {
  root.innerHTML = `
    <div class="tools-grid">
      ${TOOLS.map(
        (t) => `
        <a class="tool-card" href="#/tools/${t.id}">
          <div class="tool-card-cover">${t.cover || ""}</div>
          <h3>${t.name}</h3>
          <div class="en">${t.nameEn}</div>
          <p>${t.desc}</p>
          <div class="card-tags">${(t.tags || [])
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join("")}</div>
        </a>`
      ).join("")}
    </div>`;
}
