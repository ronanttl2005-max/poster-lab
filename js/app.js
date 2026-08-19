import { STYLES as BUNDLED_STYLES } from "../data/styles.js";
import { INSPIRATIONS as BUNDLED_INSPIRATIONS } from "../data/inspirations.js";
import { mountEditor } from "./editor.js";
import { loadCatalog } from "./api.js";

const app = document.getElementById("app");
const IMG = (f) => `assets/inspirations/${f}`;
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
const safeId = (value) => String(value ?? "").replace(/[^a-z0-9_-]/gi, "");
const safeColor = (value) =>
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value))
    ? String(value)
    : "#dfe7f5";
let styles = BUNDLED_STYLES;
let inspirations = BUNDLED_INSPIRATIONS;
let styleMap = Object.fromEntries(styles.map((style) => [style.id, style]));
let cleanupCurrentView = () => {};

// ---------------- router ----------------
const routes = {
  gallery: renderGallery,
  styles: renderStyles,
  editor: renderEditor,
  workflow: renderWorkflow,
};

function route() {
  const hash = location.hash.replace(/^#\//, "") || "gallery";
  const [page, param] = hash.split("/");
  const fn = routes[page] || renderGallery;
  document.querySelectorAll(".nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === page);
  });
  cleanupCurrentView();
  cleanupCurrentView = () => {};
  closeLightbox({ restoreFocus: false });
  window.scrollTo(0, 0);
  cleanupCurrentView = fn(param) || (() => {});
}
window.addEventListener("hashchange", route);

// ---------------- gallery ----------------
let activeFilter = "all";

function renderGallery(param) {
  if (param) activeFilter = param;
  const counts = {};
  inspirations.forEach((i) => (counts[i.styleId] = (counts[i.styleId] || 0) + 1));

  const chips = [
    `<button class="chip ${activeFilter === "all" ? "active" : ""}" data-f="all">全部 <span class="count">${inspirations.length}</span></button>`,
    ...styles.filter((s) => counts[s.id]).map(
      (s) =>
        `<button class="chip ${activeFilter === s.id ? "active" : ""}" data-f="${escapeHtml(s.id)}">${escapeHtml(s.name)} <span class="count">${counts[s.id]}</span></button>`
    ),
  ].join("");

  const items = inspirations.filter(
    (i) => activeFilter === "all" || i.styleId === activeFilter
  );

  app.innerHTML = `
    <div class="page-head">
      <div class="en">Inspiration Library</div>
      <h1>灵感库</h1>
      <p>所有收藏的设计灵感，按风格体系归档。点击任意一张查看「值得学习的点」。看到新的喜欢的设计？丢进 <b>inbox/</b> 文件夹再喊一声 AI 即可入库。</p>
    </div>
    <div class="chips">${chips}</div>
    <div class="masonry">
      ${items
        .map(
          (i, idx) => `
        <button type="button" class="card" data-idx="${inspirations.indexOf(i)}" aria-label="查看灵感：${escapeHtml(i.title)}">
          <img src="${IMG(encodeURIComponent(i.file))}" alt="${escapeHtml(i.title)}" loading="lazy" />
          <div class="card-body">
            <div class="card-title">${escapeHtml(i.title)}</div>
            <div class="card-tags">
              <span class="tag style-tag">${escapeHtml(styleMap[i.styleId]?.name || i.styleId)}</span>
              ${i.tags.slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
            </div>
          </div>
        </button>`
        )
        .join("")}
    </div>`;

  app.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => {
      activeFilter = c.dataset.f;
      renderGallery();
    })
  );
  app.querySelectorAll(".card").forEach((c) => {
    const open = () => openLightbox(+c.dataset.idx);
    c.addEventListener("click", open);
    c.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

// ---------------- lightbox ----------------
const lb = document.getElementById("lightbox");
const lbPanel = lb.querySelector(".lightbox-panel");
let lightboxReturnFocus = null;

function openLightbox(idx) {
  const i = inspirations[idx];
  if (!i) return;
  const s = styleMap[i.styleId];
  lightboxReturnFocus = document.activeElement;
  lb.querySelector("img").src = IMG(encodeURIComponent(i.file));
  lb.querySelector("img").alt = i.title;
  lb.querySelector(".lightbox-meta").innerHTML = `
    <h3 id="lightbox-title">${escapeHtml(i.title)}</h3>
    <a class="style-link" href="#/styles/${safeId(i.styleId)}">◈ ${escapeHtml(s?.name || "")} ${s?.nameEn ? "· " + escapeHtml(s.nameEn) : ""}</a>
    <p class="note">${escapeHtml(i.note)}</p>
    <div class="card-tags">${i.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
  `;
  lb.classList.remove("hidden");
  lb.setAttribute("aria-hidden", "false");
  lbPanel.focus();
}

function closeLightbox({ restoreFocus = true } = {}) {
  if (lb.classList.contains("hidden")) return;
  lb.classList.add("hidden");
  lb.setAttribute("aria-hidden", "true");
  if (restoreFocus && lightboxReturnFocus?.isConnected) lightboxReturnFocus.focus();
  lightboxReturnFocus = null;
}

lb.querySelector(".lightbox-close").addEventListener("click", () => closeLightbox());
lb.querySelector(".lightbox-backdrop").addEventListener("click", () => closeLightbox());
lb.addEventListener("click", (event) => {
  if (event.target.closest(".style-link")) closeLightbox({ restoreFocus: false });
});
document.addEventListener("keydown", (event) => {
  if (lb.classList.contains("hidden")) return;
  if (event.key === "Escape") {
    closeLightbox();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...lbPanel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) {
    event.preventDefault();
    lbPanel.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy unavailable");
}

// ---------------- styles page ----------------
function renderStyles(param) {
  app.innerHTML = `
    <div class="page-head">
      <div class="en">Style System</div>
      <h1>风格体系</h1>
      <p>把散落的喜好整理成 ${styles.filter((s) => s.id !== "reference-misc").length} 套可复用的设计语言。给甲方看方向、给 AI 喂提示词、给自己定规则，都从这里出发。</p>
    </div>
    ${styles.map((s) => {
      const refs = inspirations.filter((i) => i.styleId === s.id);
      return `
      <section class="style-card" id="style-${safeId(s.id)}">
        <div class="style-card-head">
          <h2>${escapeHtml(s.name)}</h2><span class="en">${escapeHtml(s.nameEn)}</span>
        </div>
        <div class="style-tagline">${escapeHtml(s.tagline)}</div>
        <p class="style-desc">${escapeHtml(s.description)}</p>
        <div class="palette">
          ${s.palette.map((c) => `<div class="swatch" style="background:${safeColor(c)}" title="${escapeHtml(c)}"><em>${escapeHtml(c)}</em></div>`).join("")}
        </div>
        <div class="style-grid">
          <div class="style-cell"><h4>Typography 字体</h4><p>${escapeHtml(s.typography)}</p></div>
          <div class="style-cell"><h4>Layout 版式</h4><p>${escapeHtml(s.layout)}</p></div>
          <div class="style-cell"><h4>Effects 效果</h4><p>${escapeHtml(s.effects)}</p></div>
        </div>
        ${s.aiPrompt ? `
        <div class="prompt-box">
          <h4>AI 复刻提示词（点击复制，直接喂给生图 AI）</h4>
          <p>${escapeHtml(s.aiPrompt)}</p>
          <button class="copy-btn" type="button" data-prompt="${escapeHtml(s.aiPrompt)}">复制</button>
        </div>` : ""}
        <div class="style-thumbs">
          ${refs.map((r) => `<button class="style-thumb" type="button" data-idx="${inspirations.indexOf(r)}" aria-label="查看灵感：${escapeHtml(r.title)}"><img src="${IMG(encodeURIComponent(r.file))}" alt="${escapeHtml(r.title)}" loading="lazy" /></button>`).join("")}
        </div>
        ${s.refs.length ? `<div class="style-refs">参考：${s.refs.map(escapeHtml).join(" / ")}</div>` : ""}
      </section>`;
    }).join("")}`;

  app.querySelectorAll(".copy-btn").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await copyText(b.dataset.prompt);
        b.textContent = "已复制 ✓";
      } catch {
        b.textContent = "复制失败";
      }
      setTimeout(() => (b.textContent = "复制"), 1600);
    })
  );
  app.querySelectorAll(".style-thumb").forEach((button) => {
    const open = () => openLightbox(+button.dataset.idx);
    button.addEventListener("click", open);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
  if (param) {
    document.getElementById(`style-${safeId(param)}`)?.scrollIntoView({ behavior: "smooth" });
  }
}

// ---------------- editor page ----------------
function renderEditor() {
  app.innerHTML = `
    <div class="page-head">
      <div class="en">Template Studio</div>
      <h1>模板工坊</h1>
      <p>每套风格沉淀成一个可编辑模板：改文字、换颜色、传照片，实时预览，一键导出 PNG。下次做海报直接从这里开始，不用再一对一模仿。</p>
    </div>
    <div id="editor-root"></div>`;
  return mountEditor(document.getElementById("editor-root"));
}

// ---------------- workflow page ----------------
function renderWorkflow() {
  app.innerHTML = `
    <div class="page-head">
      <div class="en">Workflow</div>
      <h1>工作流</h1>
      <p>这个系统的三条使用路径：新灵感入库 → 风格沉淀 → 快速出图。全程可以让 AI 代劳。</p>
    </div>
    <div class="flow-grid">
      <div class="flow-card">
        <div class="num">FLOW 01</div>
        <h3>看到新的喜欢的设计</h3>
        <ol>
          <li>把截图丢进仓库的 <code>inbox/</code> 文件夹（或直接发给 AI）</li>
          <li>对 AI 说：<b>「按 AGENTS.md 把 inbox 里的新灵感入库」</b></li>
          <li>AI 会自动：分析画面 → 判断风格归属（或新建风格）→ 重命名图片移入 <code>assets/inspirations/</code> → 在 <code>data/inspirations.js</code> 追加记录（含「值得学习的点」）</li>
          <li>刷新网页即可在灵感库看到，永远不再散落在相册里</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">FLOW 02</div>
        <h3>给甲方定方向</h3>
        <ol>
          <li>打开<b>风格体系</b>页，和甲方一起过一遍 8 套风格</li>
          <li>每套风格有：一句话气质、色板、字体/版式/效果规则、真实参考图</li>
          <li>确定方向后，复制该风格的 <b>AI 复刻提示词</b>，喂给生图 AI 出概念稿；或直接进入模板工坊出可用稿</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">FLOW 03</div>
        <h3>快速出一张海报</h3>
        <ol>
          <li>进入<b>模板工坊</b>，选一个风格模板</li>
          <li>左侧面板替换文字、换色、上传自己的照片</li>
          <li>点<b>导出 PNG</b>（2 倍分辨率，可直接发社交媒体）</li>
          <li>想要新版式？对 AI 说「参考灵感库第 X 张，给模板工坊加一个新模板」即可</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">DEPLOY</div>
        <h3>部署与同步</h3>
        <p>项目现在包含零依赖 Node 后端。推荐把前端与 API 作为一个服务部署：</p>
        <ul>
          <li><b>Render / Railway</b>：导入 GitHub 仓库，启动命令使用 <code>npm start</code></li>
          <li>设置 <code>HOST=0.0.0.0</code> 和安全的 <code>POSTER_LAB_ADMIN_TOKEN</code></li>
          <li>需要长期保存 API 写入内容时，为 <code>POSTER_LAB_DATA_FILE</code> 配置持久磁盘</li>
        </ul>
        <p>GitHub Pages 仍可作为只读静态模式使用；此时页面会自动回退到仓库内置数据，Node API 不会运行。</p>
        <pre><code>git add -A && git commit -m "add inspiration" && git push</code></pre>
      </div>
    </div>`;
}

route();

loadCatalog({
  fallbackInspirations: BUNDLED_INSPIRATIONS,
  fallbackStyles: BUNDLED_STYLES,
}).then((catalog) => {
  if (catalog.source === "bundled") return;
  inspirations = catalog.inspirations;
  styles = catalog.styles;
  styleMap = Object.fromEntries(styles.map((style) => [style.id, style]));
  route();
});
