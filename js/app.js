import { STYLES as BUNDLED_STYLES } from "../data/styles.js";
import { INSPIRATIONS as BUNDLED_INSPIRATIONS } from "../data/inspirations.js";
import { mountEditor } from "./editor.js";
import {
  loadCatalog,
  apiWrite,
  uploadImageFile,
  getAdminToken,
  setAdminToken,
  friendlyWriteError,
  getApiOrigin,
} from "./api.js";

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
let folders = [];
let styleMap = Object.fromEntries(styles.map((style) => [style.id, style]));
let catalogSource = "bundled";
let cleanupCurrentView = () => {};

const INBOX_STYLE_ID = "inbox";
const keyOf = (item) => item.id || item.file;
const styleNameOf = (item) =>
  item.styleId === INBOX_STYLE_ID ? "待分类" : styleMap[item.styleId]?.name || item.styleId;
const imgSrc = (item) =>
  item.src ? `${getApiOrigin()}${item.src}` : IMG(encodeURIComponent(item.file || ""));

// ---------------- toast ----------------
let toastTimer = null;
function toast(message, kind = "info") {
  let node = document.getElementById("toast");
  if (!node) {
    node = document.createElement("div");
    node.id = "toast";
    document.body.append(node);
  }
  node.textContent = message;
  node.className = `toast-show toast-${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("toast-show"), 3200);
}

function writesAvailable() {
  if (catalogSource === "bundled") {
    toast("当前是静态只读模式（API 未连接），无法修改数据。", "warn");
    return false;
  }
  return true;
}

async function mutate(action, { successMessage } = {}) {
  try {
    const result = await action();
    if (successMessage) toast(successMessage, "ok");
    return result;
  } catch (error) {
    console.error(error);
    toast(friendlyWriteError(error), "warn");
    if (error?.status === 401 || error?.status === 503) openTokenModal();
    throw error;
  }
}

// ---------------- modal infrastructure ----------------
function openModal(html, { wide = false } = {}) {
  const root = document.createElement("div");
  root.className = "modal-backdrop";
  root.innerHTML = `<div class="modal-panel ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(root);
  const close = () => root.remove();
  root.addEventListener("click", (event) => {
    if (event.target === root) close();
  });
  root.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", close));
  const escHandler = (event) => {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
  return { root, close };
}

function openTokenModal() {
  const { root, close } = openModal(`
    <h3>管理密钥</h3>
    <p class="modal-hint">线上环境的新增/修改/删除需要管理密钥（部署时设置的 <code>POSTER_LAB_ADMIN_TOKEN</code>）。密钥只保存在本浏览器。</p>
    <input type="password" id="token-input" class="modal-input" placeholder="粘贴管理密钥" value="${escapeHtml(getAdminToken())}" />
    <div class="modal-actions">
      <button class="m-btn" type="button" data-modal-close>取消</button>
      <button class="m-btn primary" type="button" id="token-save">保存</button>
    </div>`);
  root.querySelector("#token-save").addEventListener("click", () => {
    setAdminToken(root.querySelector("#token-input").value.trim());
    toast("管理密钥已保存", "ok");
    close();
  });
}

// ---------------- router ----------------
const routes = {
  gallery: renderGallery,
  folders: renderFolders,
  styles: renderStyles,
  editor: renderEditor,
  tools: renderTools,
  skills: renderSkills,
  workflow: renderWorkflow,
};

function route() {
  const hash = location.hash.replace(/^#\//, "") || "gallery";
  const [page, ...rest] = hash.split("/");
  const param = rest.join("/");
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
let activeSubFilter = "all";
let manageMode = false;
let selectedKeys = new Set();

function visibleInspirations() {
  return inspirations.filter((i) => {
    if (activeFilter === "all") return true;
    if (i.styleId !== activeFilter) return false;
    if (activeSubFilter === "all") return true;
    if (activeSubFilter === "__none__") return !i.subStyle;
    return i.subStyle === activeSubFilter;
  });
}

// Group consecutive-by-series items: returns [{ item, members }] where members
// includes the whole series (single items get members = [item]).
function groupBySeries(items) {
  const seen = new Set();
  const groups = [];
  for (const item of items) {
    if (!item.seriesId) {
      groups.push({ item, members: [item] });
      continue;
    }
    if (seen.has(item.seriesId)) continue;
    seen.add(item.seriesId);
    const members = inspirations.filter((i) => i.seriesId === item.seriesId);
    groups.push({ item, members });
  }
  return groups;
}

function renderGallery(param) {
  if (param) {
    activeFilter = param;
    activeSubFilter = "all";
  }
  const counts = {};
  inspirations.forEach((i) => (counts[i.styleId] = (counts[i.styleId] || 0) + 1));

  const chips = [
    `<button class="chip ${activeFilter === "all" ? "active" : ""}" data-f="all">全部 <span class="count">${inspirations.length}</span></button>`,
    ...(counts[INBOX_STYLE_ID]
      ? [`<button class="chip chip-inbox ${activeFilter === INBOX_STYLE_ID ? "active" : ""}" data-f="${INBOX_STYLE_ID}">待分类 <span class="count">${counts[INBOX_STYLE_ID]}</span></button>`]
      : []),
    ...styles.filter((s) => counts[s.id]).map(
      (s) =>
        `<button class="chip ${activeFilter === s.id ? "active" : ""}" data-f="${escapeHtml(s.id)}">${escapeHtml(s.name)} <span class="count">${counts[s.id]}</span></button>`
    ),
  ].join("");

  // Sub-style chips only when a specific style is selected and it has sub styles.
  let subChips = "";
  if (activeFilter !== "all") {
    const styleItems = inspirations.filter((i) => i.styleId === activeFilter);
    const subNames = [...new Set(styleItems.map((i) => i.subStyle).filter(Boolean))];
    if (subNames.length) {
      const noneCount = styleItems.filter((i) => !i.subStyle).length;
      subChips = `<div class="chips subchips">
        <span class="subchips-label">二级分类</span>
        <button class="chip sub ${activeSubFilter === "all" ? "active" : ""}" data-sf="all">全部</button>
        ${subNames.map((n) => `<button class="chip sub ${activeSubFilter === n ? "active" : ""}" data-sf="${escapeHtml(n)}">${escapeHtml(n)} <span class="count">${styleItems.filter((i) => i.subStyle === n).length}</span></button>`).join("")}
        ${noneCount ? `<button class="chip sub ${activeSubFilter === "__none__" ? "active" : ""}" data-sf="__none__">未分组 <span class="count">${noneCount}</span></button>` : ""}
      </div>`;
    }
  }

  const groups = groupBySeries(visibleInspirations());

  app.innerHTML = `
    <div class="page-head">
      <div class="en">Inspiration Library</div>
      <h1>灵感库</h1>
      <p>所有收藏的设计灵感，按风格体系归档。点击任意一张查看「值得学习的点」。看到新的喜欢的设计？点右侧「上传灵感」直接丢进来。</p>
      <div class="gallery-actions">
        <button class="g-btn primary" type="button" id="btn-upload">＋ 上传灵感</button>
        <button class="g-btn ${manageMode ? "active" : ""}" type="button" id="btn-manage">${manageMode ? "退出管理" : "管理"}</button>
        <button class="g-btn ghost" type="button" id="btn-token" title="设置管理密钥">⚙ 密钥</button>
      </div>
    </div>
    <div class="chips">${chips}</div>
    ${subChips}
    <div class="masonry ${manageMode ? "managing" : ""}">
      ${groups
        .map(({ item, members }) => {
          const cover = item;
          const isSeries = members.length > 1;
          const checked = selectedKeys.has(keyOf(cover));
          return `
        <div class="card ${isSeries ? "card-series" : ""} ${checked ? "selected" : ""}" data-key="${escapeHtml(keyOf(cover))}" data-series="${escapeHtml(cover.seriesId || "")}" role="button" tabindex="0" aria-label="查看灵感：${escapeHtml(cover.title)}">
          ${manageMode ? `<span class="card-check">${checked ? "✓" : ""}</span>` : ""}
          ${isSeries ? `<span class="series-badge">系列 × ${members.length}</span>` : ""}
          <img src="${imgSrc(cover)}" alt="${escapeHtml(cover.title)}" loading="lazy" />
          <div class="card-body">
            <div class="card-title">${escapeHtml(cover.title)}</div>
            <div class="card-tags">
              <span class="tag style-tag">${escapeHtml(styleNameOf(cover))}</span>
              ${cover.subStyle ? `<span class="tag sub-tag">${escapeHtml(cover.subStyle)}</span>` : ""}
              ${(cover.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
            </div>
          </div>
        </div>`;
        })
        .join("")}
    </div>
    ${manageMode ? renderManageBar() : ""}`;

  app.querySelectorAll(".chip:not(.sub)").forEach((c) =>
    c.addEventListener("click", () => {
      activeFilter = c.dataset.f;
      activeSubFilter = "all";
      renderGallery();
    })
  );
  app.querySelectorAll(".chip.sub").forEach((c) =>
    c.addEventListener("click", () => {
      activeSubFilter = c.dataset.sf;
      renderGallery();
    })
  );

  app.querySelectorAll(".card").forEach((card) => {
    const activate = () => {
      const key = card.dataset.key;
      if (manageMode) {
        toggleSelection(key, card.dataset.series);
        renderGallery();
        return;
      }
      const seriesId = card.dataset.series;
      if (seriesId) {
        const members = inspirations.filter((i) => i.seriesId === seriesId);
        openLightbox(members.map((m) => inspirations.indexOf(m)), 0);
      } else {
        const item = inspirations.find((i) => keyOf(i) === key);
        openLightbox([inspirations.indexOf(item)], 0);
      }
    };
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });

  document.getElementById("btn-upload").addEventListener("click", () => openUploadModal());
  document.getElementById("btn-token").addEventListener("click", openTokenModal);
  document.getElementById("btn-manage").addEventListener("click", () => {
    manageMode = !manageMode;
    selectedKeys.clear();
    renderGallery();
  });

  if (manageMode) bindManageBar();
  bindGalleryDrop();
}

function toggleSelection(key, seriesId) {
  // Selecting a series stack selects all of its members.
  const keys = seriesId
    ? inspirations.filter((i) => i.seriesId === seriesId).map(keyOf)
    : [key];
  const allSelected = keys.every((k) => selectedKeys.has(k));
  keys.forEach((k) => (allSelected ? selectedKeys.delete(k) : selectedKeys.add(k)));
}

function renderManageBar() {
  const n = selectedKeys.size;
  return `
    <div class="manage-bar">
      <span class="mb-count">已选 <b>${n}</b> 张</span>
      <button class="mb-btn" data-act="folder" ${n ? "" : "disabled"}>加入收藏夹</button>
      <button class="mb-btn" data-act="series" ${n >= 2 ? "" : "disabled"}>合并为系列</button>
      <button class="mb-btn" data-act="unseries" ${n ? "" : "disabled"}>拆开系列</button>
      <button class="mb-btn" data-act="substyle" ${n ? "" : "disabled"}>设二级分类</button>
      <button class="mb-btn" data-act="reffor" ${n ? "" : "disabled"}>挂为参考图</button>
      <button class="mb-btn danger" data-act="delete" ${n ? "" : "disabled"}>删除</button>
    </div>`;
}

function selectedItems() {
  return inspirations.filter((i) => selectedKeys.has(keyOf(i)));
}

async function patchInspiration(item, changes) {
  const updated = await apiWrite("PATCH", `/inspirations/${encodeURIComponent(keyOf(item))}`, changes);
  Object.assign(item, updated || changes);
  return item;
}

function bindManageBar() {
  const bar = app.querySelector(".manage-bar");
  if (!bar) return;
  bar.addEventListener("click", async (event) => {
    const button = event.target.closest(".mb-btn");
    if (!button || button.disabled) return;
    const act = button.dataset.act;
    const items = selectedItems();
    if (!items.length || !writesAvailable()) return;

    if (act === "delete") {
      if (!confirm(`确定删除选中的 ${items.length} 张图？此操作不可恢复。`)) return;
      await mutate(async () => {
        for (const item of items) {
          await apiWrite("DELETE", `/inspirations/${encodeURIComponent(keyOf(item))}`);
          inspirations = inspirations.filter((i) => i !== item);
        }
      }, { successMessage: `已删除 ${items.length} 张` });
      selectedKeys.clear();
      renderGallery();
    } else if (act === "series") {
      const seriesId = items.find((i) => i.seriesId)?.seriesId || `series-${Date.now().toString(36)}`;
      await mutate(async () => {
        for (const item of items) await patchInspiration(item, { seriesId });
      }, { successMessage: `已合并为系列（${items.length} 张）` });
      selectedKeys.clear();
      renderGallery();
    } else if (act === "unseries") {
      await mutate(async () => {
        for (const item of items) if (item.seriesId) await patchInspiration(item, { seriesId: null });
      }, { successMessage: "已拆开系列" });
      selectedKeys.clear();
      renderGallery();
    } else if (act === "substyle") {
      openSubStyleModal(items);
    } else if (act === "folder") {
      openFolderPickerModal(items);
    } else if (act === "reffor") {
      openRefForModal(items);
    }
  });
}

function openSubStyleModal(items) {
  const styleIds = [...new Set(items.map((i) => i.styleId))];
  const existing = [...new Set(
    inspirations.filter((i) => styleIds.includes(i.styleId) && i.subStyle).map((i) => i.subStyle)
  )];
  const { root, close } = openModal(`
    <h3>设置二级分类</h3>
    <p class="modal-hint">在风格「${styleIds.map((id) => escapeHtml(styleMap[id]?.name || id)).join("、")}」下自定义一个二级分类，同名即同组。留空则清除二级分类。</p>
    <input class="modal-input" id="substyle-input" list="substyle-list" placeholder="例如：品牌A对标 / 展览系列 / 字体实验" value="${escapeHtml(items[0].subStyle || "")}" />
    <datalist id="substyle-list">${existing.map((n) => `<option value="${escapeHtml(n)}"></option>`).join("")}</datalist>
    <div class="modal-actions">
      <button class="m-btn" type="button" data-modal-close>取消</button>
      <button class="m-btn primary" type="button" id="substyle-save">应用到 ${items.length} 张</button>
    </div>`);
  root.querySelector("#substyle-save").addEventListener("click", async () => {
    const value = root.querySelector("#substyle-input").value.trim();
    close();
    await mutate(async () => {
      for (const item of items) await patchInspiration(item, { subStyle: value || null });
    }, { successMessage: value ? `已归入「${value}」` : "已清除二级分类" });
    selectedKeys.clear();
    renderGallery();
  });
}

function folderTreeHtml(selectedIds = new Set()) {
  const tops = folders.filter((f) => !f.parentId);
  if (!tops.length) return `<p class="modal-hint">还没有收藏夹，先在下面新建一个。</p>`;
  const kindLabel = { brand: "品牌", theme: "主题", custom: "自定义" };
  const row = (f, depth) => `
    <label class="folder-row" style="padding-left:${depth * 22}px">
      <input type="checkbox" value="${escapeHtml(f.id)}" ${selectedIds.has(f.id) ? "checked" : ""} />
      <span class="folder-name">${depth ? "└ " : ""}${escapeHtml(f.name)}</span>
      <span class="folder-kind">${kindLabel[f.kind] || ""}</span>
    </label>`;
  return tops
    .map((top) => row(top, 0) + folders.filter((f) => f.parentId === top.id).map((c) => row(c, 1)).join(""))
    .join("");
}

function openFolderPickerModal(items) {
  const preSelected = new Set(items.length === 1 ? items[0].collectionIds || [] : []);
  const { root, close } = openModal(`
    <h3>加入收藏夹</h3>
    <div class="folder-tree" id="fp-tree">${folderTreeHtml(preSelected)}</div>
    <div class="folder-new">
      <input class="modal-input" id="fp-new-name" placeholder="新建收藏夹名称" />
      <select class="modal-input" id="fp-new-kind">
        <option value="brand">品牌</option>
        <option value="theme">主题系列</option>
        <option value="custom">自定义</option>
      </select>
      <select class="modal-input" id="fp-new-parent">
        <option value="">作为一级收藏夹</option>
        ${folders.filter((f) => !f.parentId).map((f) => `<option value="${escapeHtml(f.id)}">放进「${escapeHtml(f.name)}」下</option>`).join("")}
      </select>
      <button class="m-btn" type="button" id="fp-new-create">新建</button>
    </div>
    <div class="modal-actions">
      <button class="m-btn" type="button" data-modal-close>取消</button>
      <button class="m-btn primary" type="button" id="fp-save">保存归属（${items.length} 张）</button>
    </div>`);

  root.querySelector("#fp-new-create").addEventListener("click", async () => {
    const name = root.querySelector("#fp-new-name").value.trim();
    if (!name) return toast("请输入收藏夹名称", "warn");
    if (!writesAvailable()) return;
    await mutate(async () => {
      const folder = await apiWrite("POST", "/folders", {
        name,
        kind: root.querySelector("#fp-new-kind").value,
        parentId: root.querySelector("#fp-new-parent").value || null,
        createdAt: new Date().toISOString(),
      });
      folders.push(folder);
      root.querySelector("#fp-tree").innerHTML = folderTreeHtml();
      root.querySelector("#fp-new-name").value = "";
      const parentSelect = root.querySelector("#fp-new-parent");
      if (!folder.parentId) {
        parentSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(folder.id)}">放进「${escapeHtml(folder.name)}」下</option>`);
      }
    }, { successMessage: `已创建「${name}」` });
  });

  root.querySelector("#fp-save").addEventListener("click", async () => {
    const checkedIds = [...root.querySelectorAll("#fp-tree input:checked")].map((c) => c.value);
    close();
    if (!writesAvailable()) return;
    await mutate(async () => {
      for (const item of items) {
        const merged = items.length === 1
          ? checkedIds
          : [...new Set([...(item.collectionIds || []), ...checkedIds])];
        await patchInspiration(item, { collectionIds: merged });
      }
    }, { successMessage: "收藏夹归属已保存" });
    selectedKeys.clear();
    renderGallery();
  });
}

async function openRefForModal(items) {
  let templates = window.PosterLab?.templates || [];
  if (!templates.length) {
    try {
      const module = await import("./templates.js");
      templates = module.TEMPLATES.map(({ id, name }) => ({ id, name }));
      window.PosterLab.templates = templates;
    } catch {
      templates = [];
    }
  }
  const templateOptions = templates.map(
    (t) => `<option value="template:${escapeHtml(t.id)}">模板 · ${escapeHtml(t.name)}</option>`
  );
  const toolOptions = (window.PosterLab?.tools?.length
    ? window.PosterLab.tools
    : [
        { id: "specimen", name: "多主体标本画布" },
        { id: "techlines", name: "技术线稿生成器" },
        { id: "typeflow", name: "图文语义混排" },
      ]
  ).map((t) => `<option value="tool:${escapeHtml(t.id)}">工具 · ${escapeHtml(t.name)}</option>`);

  const { root, close } = openModal(`
    <h3>挂为参考图</h3>
    <p class="modal-hint">把选中的图挂到某个模板或工具上，制作时会显示在旁边供对照。</p>
    <select class="modal-input" id="rf-target">${templateOptions.join("")}${toolOptions.join("")}</select>
    <div class="modal-actions">
      <button class="m-btn" type="button" data-modal-close>取消</button>
      <button class="m-btn" type="button" id="rf-remove">从该目标移除</button>
      <button class="m-btn primary" type="button" id="rf-save">挂载（${items.length} 张）</button>
    </div>`);

  const apply = async (add) => {
    const target = root.querySelector("#rf-target").value;
    close();
    if (!writesAvailable()) return;
    await mutate(async () => {
      for (const item of items) {
        const current = new Set(item.refFor || []);
        if (add) current.add(target);
        else current.delete(target);
        await patchInspiration(item, { refFor: [...current] });
      }
    }, { successMessage: add ? "已挂为参考图" : "已移除参考关系" });
    selectedKeys.clear();
    renderGallery();
  };
  root.querySelector("#rf-save").addEventListener("click", () => apply(true));
  root.querySelector("#rf-remove").addEventListener("click", () => apply(false));
}

// ---------------- upload ----------------
function openUploadModal(initialFiles = null) {
  if (!writesAvailable()) return;
  const styleOptions = [
    `<option value="${INBOX_STYLE_ID}">待分类（之后让 AI 归档）</option>`,
    ...styles.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`),
  ].join("");

  const { root, close } = openModal(`
    <h3>上传灵感</h3>
    <div class="dropzone" id="up-drop">
      <p><b>拖图片到这里</b>，或 <label class="linklike">点击选择文件<input type="file" id="up-file" accept="image/*" multiple hidden /></label></p>
      <p class="modal-hint">支持多张。不想填信息就直接传——默认进「待分类」，之后喊 AI 一键归档。</p>
    </div>
    <div id="up-list"></div>
    <div class="modal-actions">
      <button class="m-btn" type="button" data-modal-close>取消</button>
      <button class="m-btn primary" type="button" id="up-submit" disabled>上传</button>
    </div>`, { wide: true });

  const pending = [];
  const list = root.querySelector("#up-list");
  const submit = root.querySelector("#up-submit");

  const addFiles = (files) => {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const entry = { file, title: file.name.replace(/\.[a-z]+$/i, ""), styleId: INBOX_STYLE_ID, tags: "", note: "" };
      pending.push(entry);
      const row = document.createElement("div");
      row.className = "up-row";
      row.innerHTML = `
        <img class="up-thumb" alt="" />
        <div class="up-fields">
          <input class="modal-input" data-k="title" placeholder="标题" value="${escapeHtml(entry.title)}" />
          <select class="modal-input" data-k="styleId">${styleOptions}</select>
          <input class="modal-input" data-k="tags" placeholder="标签（逗号分隔，可空）" />
          <input class="modal-input" data-k="note" placeholder="值得学习的点（可空）" />
        </div>
        <button class="up-remove" type="button" title="移除">×</button>`;
      const reader = new FileReader();
      reader.onload = () => (row.querySelector(".up-thumb").src = reader.result);
      reader.readAsDataURL(file);
      row.querySelectorAll("[data-k]").forEach((input) =>
        input.addEventListener("input", () => (entry[input.dataset.k] = input.value))
      );
      row.querySelector(".up-remove").addEventListener("click", () => {
        pending.splice(pending.indexOf(entry), 1);
        row.remove();
        submit.disabled = !pending.length;
      });
      list.append(row);
    }
    submit.disabled = !pending.length;
  };

  const drop = root.querySelector("#up-drop");
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    addFiles(e.dataTransfer.files);
  });
  root.querySelector("#up-file").addEventListener("change", (e) => addFiles(e.target.files));
  if (initialFiles?.length) addFiles(initialFiles);

  submit.addEventListener("click", async () => {
    submit.disabled = true;
    submit.textContent = "上传中…";
    let ok = 0;
    for (const entry of pending) {
      try {
        const src = await uploadImageFile(entry.file);
        const record = await apiWrite("POST", "/inspirations", {
          file: src.split("/").pop(),
          src,
          title: entry.title || entry.file.name,
          styleId: entry.styleId,
          tags: entry.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
          note: entry.note || "",
          status: entry.styleId === INBOX_STYLE_ID ? "inbox" : undefined,
          createdAt: new Date().toISOString(),
        });
        inspirations.push(record);
        ok += 1;
      } catch (error) {
        console.error(error);
        toast(friendlyWriteError(error), "warn");
        if (error?.status === 401 || error?.status === 503) {
          close();
          openTokenModal();
          return;
        }
      }
    }
    close();
    if (ok) toast(`已上传 ${ok} 张`, "ok");
    renderGallery();
  });
}

// Drag & drop anywhere on the gallery opens the upload modal pre-filled.
let galleryDropBound = false;
function bindGalleryDrop() {
  if (galleryDropBound) return;
  galleryDropBound = true;
  app.addEventListener("dragover", (e) => {
    if (!app.querySelector(".masonry")) return;
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  });
  app.addEventListener("drop", (e) => {
    if (!app.querySelector(".masonry")) return;
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    if (!document.querySelector(".modal-backdrop")) openUploadModal(e.dataTransfer.files);
  });
}

// ---------------- folders page ----------------
let activeFolderId = null;

function renderFolders(param) {
  if (param) activeFolderId = decodeURIComponent(param);
  const kindLabel = { brand: "品牌", theme: "主题", custom: "自定义" };
  const tops = folders.filter((f) => !f.parentId);
  const active = folders.find((f) => f.id === activeFolderId) || tops[0] || null;
  if (active && !folders.find((f) => f.id === activeFolderId)) activeFolderId = active.id;

  const childIds = active ? folders.filter((f) => f.parentId === active.id).map((f) => f.id) : [];
  const scopeIds = active ? [active.id, ...childIds] : [];
  const items = active
    ? inspirations.filter((i) => (i.collectionIds || []).some((cid) => scopeIds.includes(cid)))
    : [];

  const treeItem = (f, depth) => {
    const count = inspirations.filter((i) => (i.collectionIds || []).includes(f.id)).length;
    return `<button class="ftree-item ${f.id === active?.id ? "active" : ""}" data-fid="${escapeHtml(f.id)}" style="padding-left:${14 + depth * 20}px">
      ${depth ? "└ " : ""}${escapeHtml(f.name)}
      <span class="ftree-meta">${kindLabel[f.kind] || ""} · ${count}</span>
    </button>`;
  };

  app.innerHTML = `
    <div class="page-head">
      <div class="en">Collections</div>
      <h1>收藏夹</h1>
      <p>按品牌、产品系列或任意主题自建文件夹，一张图可以同时属于多个收藏夹。在灵感库开「管理」模式勾选图片即可加入。</p>
    </div>
    <div class="folders-layout">
      <aside class="ftree">
        <button class="g-btn primary" id="fnew" type="button">＋ 新建收藏夹</button>
        ${tops.length ? tops.map((top) => treeItem(top, 0) + folders.filter((f) => f.parentId === top.id).map((c) => treeItem(c, 1)).join("")).join("") : `<p class="ftree-empty">还没有收藏夹。<br/>典型用法：<br/>· 一级 =「品牌 A」「品牌 B」（品牌）<br/>· 二级 =「春季系列」「包装对标」（主题）</p>`}
      </aside>
      <section class="fcontent">
        ${active ? `
          <div class="fcontent-head">
            <h2>${escapeHtml(active.name)} <span class="folder-kind">${kindLabel[active.kind] || ""}</span></h2>
            <div class="fcontent-actions">
              ${!active.parentId ? `<button class="g-btn" id="fsub" type="button">＋ 子收藏夹</button>` : ""}
              <button class="g-btn" id="frename" type="button">重命名</button>
              <button class="g-btn danger" id="fdelete" type="button">删除</button>
            </div>
          </div>
          ${items.length ? `<div class="masonry">
            ${items.map((i) => `
              <div class="card" data-key="${escapeHtml(keyOf(i))}" role="button" tabindex="0">
                <button class="card-unfolder" data-key="${escapeHtml(keyOf(i))}" title="移出此收藏夹">×</button>
                <img src="${imgSrc(i)}" alt="${escapeHtml(i.title)}" loading="lazy" />
                <div class="card-body">
                  <div class="card-title">${escapeHtml(i.title)}</div>
                  <div class="card-tags"><span class="tag style-tag">${escapeHtml(styleNameOf(i))}</span>${i.subStyle ? `<span class="tag sub-tag">${escapeHtml(i.subStyle)}</span>` : ""}</div>
                </div>
              </div>`).join("")}
          </div>` : `<p class="ftree-empty">这个收藏夹还是空的。去灵感库开「管理」模式，勾选图片 → 加入收藏夹。</p>`}
        ` : ""}
      </section>
    </div>`;

  app.querySelectorAll(".ftree-item").forEach((b) =>
    b.addEventListener("click", () => {
      activeFolderId = b.dataset.fid;
      renderFolders();
    })
  );

  const createFolder = (parentId) => {
    const { root, close } = openModal(`
      <h3>${parentId ? "新建子收藏夹" : "新建收藏夹"}</h3>
      <input class="modal-input" id="nf-name" placeholder="名称，例如：品牌A / 春季系列" />
      <select class="modal-input" id="nf-kind">
        <option value="brand">品牌</option>
        <option value="theme" ${parentId ? "selected" : ""}>主题系列</option>
        <option value="custom">自定义</option>
      </select>
      <div class="modal-actions">
        <button class="m-btn" type="button" data-modal-close>取消</button>
        <button class="m-btn primary" type="button" id="nf-save">创建</button>
      </div>`);
    root.querySelector("#nf-save").addEventListener("click", async () => {
      const name = root.querySelector("#nf-name").value.trim();
      if (!name) return toast("请输入名称", "warn");
      if (!writesAvailable()) return;
      close();
      await mutate(async () => {
        const folder = await apiWrite("POST", "/folders", {
          name,
          kind: root.querySelector("#nf-kind").value,
          parentId: parentId || null,
          createdAt: new Date().toISOString(),
        });
        folders.push(folder);
        activeFolderId = folder.id;
      }, { successMessage: `已创建「${name}」` });
      renderFolders();
    });
  };

  document.getElementById("fnew")?.addEventListener("click", () => createFolder(null));
  document.getElementById("fsub")?.addEventListener("click", () => createFolder(active.id));

  document.getElementById("frename")?.addEventListener("click", () => {
    const name = prompt("新的名称：", active.name);
    if (!name?.trim() || !writesAvailable()) return;
    mutate(async () => {
      const updated = await apiWrite("PATCH", `/folders/${encodeURIComponent(active.id)}`, { name: name.trim() });
      Object.assign(active, updated);
    }, { successMessage: "已重命名" }).then(renderFolders);
  });

  document.getElementById("fdelete")?.addEventListener("click", () => {
    if (!confirm(`删除收藏夹「${active.name}」？（图片本身不会删除，只解除归属${childIds.length ? "，子收藏夹也会一并删除" : ""}）`)) return;
    if (!writesAvailable()) return;
    mutate(async () => {
      await apiWrite("DELETE", `/folders/${encodeURIComponent(active.id)}`);
      const removed = [active.id, ...childIds];
      folders = folders.filter((f) => !removed.includes(f.id));
      inspirations.forEach((i) => {
        if (i.collectionIds) i.collectionIds = i.collectionIds.filter((cid) => !removed.includes(cid));
      });
      activeFolderId = null;
    }, { successMessage: "已删除收藏夹" }).then(renderFolders);
  });

  app.querySelectorAll(".card-unfolder").forEach((b) =>
    b.addEventListener("click", (event) => {
      event.stopPropagation();
      const item = inspirations.find((i) => keyOf(i) === b.dataset.key);
      if (!item || !writesAvailable()) return;
      mutate(async () => {
        await patchInspiration(item, {
          collectionIds: (item.collectionIds || []).filter((cid) => !scopeIds.includes(cid)),
        });
      }, { successMessage: "已移出收藏夹" }).then(renderFolders);
    })
  );

  app.querySelectorAll(".fcontent .card").forEach((card) => {
    card.addEventListener("click", () => {
      const item = inspirations.find((i) => keyOf(i) === card.dataset.key);
      if (item) openLightbox([inspirations.indexOf(item)], 0);
    });
  });
}

// ---------------- lightbox ----------------
const lb = document.getElementById("lightbox");
const lbPanel = lb.querySelector(".lightbox-panel");
const lbPrev = lb.querySelector(".lightbox-prev");
const lbNext = lb.querySelector(".lightbox-next");
let lightboxReturnFocus = null;
let lightboxList = [];
let lightboxPos = 0;

function openLightbox(indices, pos = 0) {
  lightboxList = Array.isArray(indices) ? indices : [indices];
  lightboxPos = pos;
  lightboxReturnFocus = document.activeElement;
  showLightboxCurrent();
  lb.classList.remove("hidden");
  lb.setAttribute("aria-hidden", "false");
  lbPanel.focus();
}

function showLightboxCurrent() {
  const i = inspirations[lightboxList[lightboxPos]];
  if (!i) return;
  const s = styleMap[i.styleId];
  lb.querySelector("img").src = imgSrc(i);
  lb.querySelector("img").alt = i.title;
  const seriesInfo = lightboxList.length > 1 ? `<span class="series-pos">系列 ${lightboxPos + 1} / ${lightboxList.length}</span>` : "";
  lb.querySelector(".lightbox-meta").innerHTML = `
    <h3 id="lightbox-title">${escapeHtml(i.title)} ${seriesInfo}</h3>
    ${i.styleId === INBOX_STYLE_ID
      ? `<span class="style-link">◈ 待分类</span>`
      : `<a class="style-link" href="#/styles/${safeId(i.styleId)}">◈ ${escapeHtml(s?.name || i.styleId)} ${s?.nameEn ? "· " + escapeHtml(s.nameEn) : ""}</a>`}
    ${i.subStyle ? `<span class="tag sub-tag">${escapeHtml(i.subStyle)}</span>` : ""}
    <p class="note">${escapeHtml(i.note || "")}</p>
    <div class="card-tags">${(i.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
    ${(i.refFor || []).map((target) => {
      const [kind, id] = target.split(":");
      if (kind === "template") {
        const tplMeta = window.PosterLab?.templates?.find((t) => t.id === id);
        const name = tplMeta?.name || id;
        const preset = tplMeta?.presets?.find((p) => p.ref === i.file);
        if (preset) {
          return `<a class="ref-jump ref-jump-hot" href="#/editor/${safeId(id)}/${safeId(preset.id)}">⚡ 一键复刻这张 · ${escapeHtml(name)}</a>`;
        }
        return `<a class="ref-jump" href="#/editor/${safeId(id)}">↗ 用这个版式出图 · ${escapeHtml(name)}</a>`;
      }
      if (kind === "tool") {
        const name = window.PosterLab?.tools?.find((t) => t.id === id)?.name || id;
        return `<a class="ref-jump" href="#/tools/${safeId(id)}">↗ 打开对应工具 · ${escapeHtml(name)}</a>`;
      }
      return "";
    }).join("")}
    ${(window.PosterLab?.templates || [])
      .filter((t) => !(i.refFor || []).includes(`template:${t.id}`))
      .flatMap((t) => (t.presets || []).filter((p) => p.ref === i.file).map((p) =>
        `<a class="ref-jump ref-jump-hot" href="#/editor/${safeId(t.id)}/${safeId(p.id)}">⚡ 一键复刻这张 · ${escapeHtml(t.name)}</a>`
      ))
      .join("")}
  `;
  const multi = lightboxList.length > 1;
  lbPrev.classList.toggle("hidden", !multi);
  lbNext.classList.toggle("hidden", !multi);
}

function stepLightbox(delta) {
  lightboxPos = (lightboxPos + delta + lightboxList.length) % lightboxList.length;
  showLightboxCurrent();
}

lbPrev.addEventListener("click", () => stepLightbox(-1));
lbNext.addEventListener("click", () => stepLightbox(1));

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
  if (event.target.closest(".style-link[href], .ref-jump")) closeLightbox({ restoreFocus: false });
});
document.addEventListener("keydown", (event) => {
  if (lb.classList.contains("hidden")) return;
  if (event.key === "Escape") {
    closeLightbox();
    return;
  }
  if (event.key === "ArrowLeft" && lightboxList.length > 1) return stepLightbox(-1);
  if (event.key === "ArrowRight" && lightboxList.length > 1) return stepLightbox(1);
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
          ${refs.map((r) => `<button class="style-thumb" type="button" data-idx="${inspirations.indexOf(r)}" aria-label="查看灵感：${escapeHtml(r.title)}"><img src="${imgSrc(r)}" alt="${escapeHtml(r.title)}" loading="lazy" /></button>`).join("")}
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
    const open = () => openLightbox([+button.dataset.idx], 0);
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
function renderEditor(param) {
  app.innerHTML = `
    <div class="page-head">
      <div class="en">Template Studio</div>
      <h1>模板工坊</h1>
      <p>每套风格沉淀成一个可编辑模板：改文字、换颜色、传照片，实时预览，一键导出 PNG。旁边会显示这个模板对应的参考原图，随时对照。</p>
    </div>
    <div id="editor-root"></div>`;
  const [tplId, presetId] = (param || "").split("/");
  return mountEditor(
    document.getElementById("editor-root"),
    tplId ? safeId(tplId) : undefined,
    presetId ? safeId(presetId) : undefined
  );
}

// ---------------- tools page ----------------
function renderTools(param) {
  app.innerHTML = `
    <div class="page-head">
      <div class="en">Art Tools</div>
      <h1>艺术工具</h1>
      <p>把喜欢的图像效果做成可以反复使用的小工具：左侧调参数，右侧实时预览，一键导出。与模板工坊互补——模板管版式，工具管效果。</p>
    </div>
    <div id="tools-root"><div class="tools-loading">工具加载中…</div></div>`;
  const root = document.getElementById("tools-root");
  let cleanup = () => {};
  let cancelled = false;
  import("./tools/index.js")
    .then(({ mountTools }) => {
      if (cancelled) return;
      cleanup = mountTools(root, param) || (() => {});
    })
    .catch((err) => {
      console.error(err);
      root.innerHTML = `<p class="tools-loading">工具加载失败：${escapeHtml(err?.message || err)}</p>`;
    });
  return () => {
    cancelled = true;
    cleanup();
  };
}

function renderSkills(param) {
  app.innerHTML = `
    <div class="page-head">
      <div class="en">AI Skills</div>
      <h1>Skill 库</h1>
      <p>把喜欢的 AI 效果做成一张张卡片：看到中意的，上传自己的图片或输入需求，一键复刻。图像 Skill 优先使用你自己的 API Key；接口不可用时可在浏览器本地完成基础效果，Key 只存本机、不进代码。</p>
    </div>
    <div id="skills-root"><div class="tools-loading">Skill 加载中…</div></div>`;
  const root = document.getElementById("skills-root");
  let cleanup = () => {};
  let cancelled = false;
  import("./skills.js")
    .then(({ mountSkills }) => {
      if (cancelled) return;
      return mountSkills(root, param).then((c) => {
        if (cancelled) { (c || (() => {}))(); return; }
        cleanup = c || (() => {});
      });
    })
    .catch((err) => {
      console.error(err);
      root.innerHTML = `<p class="tools-loading">Skill 加载失败：${escapeHtml(err?.message || err)}</p>`;
    });
  return () => {
    cancelled = true;
    cleanup();
  };
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
          <li>打开<b>灵感库</b>，点「＋ 上传灵感」，把图直接拖进去（可多张）</li>
          <li>不想填信息就直接传，图会进「待分类」</li>
          <li>之后对 AI 说：<b>「把网站上待分类的灵感入库归档」</b>，AI 会分析画面、判断风格、补全标签和学习点</li>
          <li>也可以像以前一样把图丢进仓库 <code>inbox/</code> 文件夹再喊 AI</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">FLOW 02</div>
        <h3>整理与收藏</h3>
        <ol>
          <li>灵感库点「管理」，勾选图片：可<b>删除</b>、<b>加入收藏夹</b>、<b>合并为系列</b>（同套图叠成一摞）、设<b>二级分类</b></li>
          <li><b>收藏夹</b>页面按品牌 / 产品系列建两级文件夹，一张图可属于多个收藏夹</li>
          <li>选中图片「挂为参考图」，它就会出现在对应模板 / 工具旁边</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">FLOW 03</div>
        <h3>给甲方定方向</h3>
        <ol>
          <li>打开<b>风格体系</b>页，和甲方一起过一遍 12 套风格</li>
          <li>每套风格有：一句话气质、色板、字体/版式/效果规则、真实参考图</li>
          <li>确定方向后，复制该风格的 <b>AI 复刻提示词</b>，喂给生图 AI 出概念稿；或直接进入模板工坊出可用稿</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">FLOW 04</div>
        <h3>用艺术工具做效果</h3>
        <ol>
          <li>进入<b>艺术工具</b>，选一个效果工具（标本画布 / 技术线稿 / 图文混排）</li>
          <li>上传自己的图片（或直接用内置演示图），左侧调参数，右侧实时看效果</li>
          <li>满意后导出高清 PNG / SVG，可直接用于海报底图或素材</li>
        </ol>
      </div>
      <div class="flow-card">
        <div class="num">FLOW 05</div>
        <h3>快速出一张海报</h3>
        <ol>
          <li>进入<b>模板工坊</b>，选一个风格模板，对照旁边的参考原图调整</li>
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
          <li>设置 <code>HOST=0.0.0.0</code> 和安全的 <code>POSTER_LAB_ADMIN_TOKEN</code>（网页端「⚙ 密钥」里填同一个值即可上传/删除）</li>
          <li>需要长期保存上传图片和修改时，为 <code>POSTER_LAB_DATA_FILE</code> 配置持久磁盘</li>
        </ul>
        <p>GitHub Pages 仍可作为只读静态模式使用；此时页面会自动回退到仓库内置数据，Node API 不会运行。</p>
      </div>
    </div>`;
}

// ---------------- bridge for editor & tools ----------------
window.PosterLab = {
  openImage(indexOrItem) {
    const idx = typeof indexOrItem === "number" ? indexOrItem : inspirations.indexOf(indexOrItem);
    if (idx >= 0) openLightbox([idx], 0);
  },
  getInspirations: () => inspirations,
  getRefsFor(target, { styleId = null, limit = 8 } = {}) {
    const explicit = inspirations.filter((i) => (i.refFor || []).includes(target));
    if (explicit.length || !styleId) return explicit.slice(0, limit);
    return inspirations.filter((i) => i.styleId === styleId).slice(0, limit);
  },
  imgSrc,
  templates: [],
  tools: [],
};

route();

// 预载模板名称，供 lightbox 跳转链接与「挂为参考图」弹窗显示
import("./templates.js")
  .then((m) => {
    if (!window.PosterLab.templates.length) {
      window.PosterLab.templates = m.TEMPLATES.map(({ id, name, presets }) => ({
        id,
        name,
        presets: (presets || []).map(({ id: pid, name: pname, ref }) => ({ id: pid, name: pname, ref })),
      }));
    }
  })
  .catch(() => {});

loadCatalog({
  fallbackInspirations: BUNDLED_INSPIRATIONS,
  fallbackStyles: BUNDLED_STYLES,
}).then((catalog) => {
  catalogSource = catalog.source;
  if (catalog.source === "bundled") return;
  inspirations = catalog.inspirations;
  styles = catalog.styles;
  folders = catalog.folders || [];
  styleMap = Object.fromEntries(styles.map((style) => [style.id, style]));
  route();
});
