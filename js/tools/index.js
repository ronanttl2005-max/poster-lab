// ============================================================
// 艺术工具 · 注册表与工具箱首页
// 新增工具：在 js/tools/ 下新建模块（default 导出 {id,name,nameEn,desc,tags,mount}），
// 然后在下方 import 并加入 TOOLS 数组即可。
// mount(container) 负责渲染整个工具工作区，返回清理函数（可选）。
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
      <div class="ref-strip" id="tool-refs"></div>
    </div>
    <div class="tool-body"></div>`;
  renderToolRefs(root.querySelector("#tool-refs"), tool.id);
  const cleanup = tool.mount(root.querySelector(".tool-body"));
  return typeof cleanup === "function" ? cleanup : () => {};
}

function renderToolRefs(refsRoot, toolId) {
  const bridge = window.PosterLab;
  if (!refsRoot || !bridge) return;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const refs = bridge.getRefsFor(`tool:${toolId}`);
  if (!refs.length) return;
  refsRoot.innerHTML = `
    <div class="ref-strip-label">参考原图（灵感库中挂载到此工具的图，点击放大）</div>
    <div class="ref-strip-row">
      ${refs.map((r, n) => `<button class="ref-thumb" type="button" data-n="${n}" title="${esc(r.title)}"><img src="${bridge.imgSrc(r)}" alt="${esc(r.title)}" loading="lazy" /></button>`).join("")}
    </div>`;
  refsRoot.querySelectorAll(".ref-thumb").forEach((b) =>
    b.addEventListener("click", () => bridge.openImage(refs[+b.dataset.n]))
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
