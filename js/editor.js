import { TEMPLATES, TEMPLATE_MAP } from "./templates.js";
import { STYLE_MAP } from "../data/styles.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

// 每个模板的当前值（会话内记忆）
const stateByTemplate = {};
let currentId = TEMPLATES[0].id;

function getValues(tpl) {
  if (!stateByTemplate[tpl.id]) {
    stateByTemplate[tpl.id] = Object.fromEntries(
      tpl.fields.map((f) => [f.key, f.default])
    );
  }
  return stateByTemplate[tpl.id];
}

function applyPreset(tpl, preset) {
  stateByTemplate[tpl.id] = {
    ...Object.fromEntries(tpl.fields.map((f) => [f.key, f.default])),
    ...preset.values,
  };
}

export function mountEditor(root, initialId, initialPresetId) {
  if (initialId && TEMPLATE_MAP[initialId]) {
    currentId = initialId;
    if (initialPresetId) {
      const preset = (TEMPLATE_MAP[initialId].presets || []).find((p) => p.id === initialPresetId);
      if (preset) applyPreset(TEMPLATE_MAP[initialId], preset);
    }
  }
  root.innerHTML = `
    <div class="editor-layout">
      <div class="editor-side">
        <div class="tpl-picker" id="tpl-picker"></div>
        <div class="editor-form" id="editor-form"></div>
        <div class="editor-actions">
          <button class="btn btn-ghost" id="btn-reset">重置</button>
          <button class="btn btn-primary" id="btn-export">导出 PNG</button>
        </div>
      </div>
      <div>
        <div class="editor-stage-wrap">
          <div class="stage-scaler" id="stage-scaler">
            <div class="stage-transform" id="stage-transform">
              <div id="poster-stage"></div>
            </div>
          </div>
        </div>
        <div class="editor-hint">750 × 1000 画布 · 导出为 2 倍分辨率 PNG（1500 × 2000）</div>
        <div class="ref-strip" id="editor-refs"></div>
      </div>
    </div>`;

  const picker = root.querySelector("#tpl-picker");
  const form = root.querySelector("#editor-form");
  const stage = root.querySelector("#poster-stage");
  const scaler = root.querySelector("#stage-scaler");
  const stageTransform = root.querySelector("#stage-transform");

  function fitStage() {
    if (!root.isConnected) return;
    const wrap = root.querySelector(".editor-stage-wrap");
    const wrapStyle = getComputedStyle(wrap);
    const horizontalPadding = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
    const avail = Math.max(0, Math.min(wrap.clientWidth - horizontalPadding, 640));
    const scale = Math.min(avail / 750, 0.82);
    stageTransform.style.transform = `scale(${scale})`;
    scaler.style.height = 1000 * scale + "px";
    scaler.style.width = 750 * scale + "px";
  }
  window.addEventListener("resize", fitStage);

  function renderPicker() {
    picker.innerHTML = TEMPLATES.map(
      (t) => `
      <button class="tpl-btn ${t.id === currentId ? "active" : ""}" data-id="${t.id}">
        ${t.name}<small>${STYLE_MAP[t.styleId]?.nameEn || ""}</small>
      </button>`
    ).join("");
    picker.querySelectorAll(".tpl-btn").forEach((b) =>
      b.addEventListener("click", () => {
        currentId = b.dataset.id;
        renderPicker();
        renderForm();
        renderPoster();
        renderRefs();
      })
    );
  }

  function renderForm() {
    const tpl = TEMPLATE_MAP[currentId];
    const v = getValues(tpl);
    form.innerHTML =
      `<p style="font-size:12px;color:var(--text-2);margin-bottom:${tpl.recommend ? 8 : 14}px;">${esc(tpl.desc)}</p>` +
      (tpl.recommend
        ? `<p class="tpl-recommend">◎ 适用场景：${esc(tpl.recommend)}</p>`
        : "") +
      ((tpl.presets || []).length
        ? `<div class="preset-row"><span class="preset-row-label">一键复刻</span>${tpl.presets
            .map((p, n) => `<button type="button" class="preset-chip" data-preset="${n}" title="按参考原图调好参数">${esc(p.name)}</button>`)
            .join("")}</div>`
        : "") +
      tpl.fields
        .map((f) => {
          const val = v[f.key] ?? f.default;
          const inputId = `field-${currentId}-${f.key}`.replace(/[^a-z0-9_-]/gi, "-");
          if (f.type === "textarea")
            return `<div class="field"><label for="${inputId}">${esc(f.label)}</label><textarea id="${inputId}" data-k="${esc(f.key)}">${esc(val)}</textarea></div>`;
          if (f.type === "color")
            return `<div class="field"><label for="${inputId}">${esc(f.label)}</label><input id="${inputId}" type="color" data-k="${esc(f.key)}" value="${esc(val)}" /></div>`;
          if (f.type === "image")
            return `<div class="field"><label for="${inputId}">${esc(f.label)}</label><input id="${inputId}" type="file" accept="image/*" data-k="${esc(f.key)}" data-type="image" /></div>`;
          if (f.type === "select")
            return `<div class="field"><label for="${inputId}">${esc(f.label)}</label><select id="${inputId}" data-k="${esc(f.key)}">${f.options
              .map((o) => `<option value="${esc(o.value)}" ${o.value === val ? "selected" : ""}>${esc(o.label)}</option>`)
              .join("")}</select></div>`;
          if (f.type === "range")
            return `<div class="field"><label for="${inputId}">${esc(f.label)}（${esc(val)}）</label><input id="${inputId}" type="range" data-k="${esc(f.key)}" min="${esc(f.min)}" max="${esc(f.max)}" value="${esc(val)}" /></div>`;
          return `<div class="field"><label for="${inputId}">${esc(f.label)}</label><input id="${inputId}" type="text" data-k="${esc(f.key)}" value="${esc(val)}" /></div>`;
        })
        .join("");

    form.querySelectorAll(".preset-chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        applyPreset(tpl, tpl.presets[+chip.dataset.preset]);
        renderForm();
        renderPoster();
      })
    );

    form.querySelectorAll("[data-k]").forEach((el) => {
      const key = el.dataset.k;
      if (el.dataset.type === "image") {
        el.addEventListener("change", () => {
          const file = el.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            v[key] = reader.result;
            renderPoster();
          };
          reader.readAsDataURL(file);
        });
      } else {
        el.addEventListener("input", () => {
          v[key] = el.value;
          if (el.type === "range") {
            el.closest(".field").querySelector("label").textContent =
              `${TEMPLATE_MAP[currentId].fields.find((f) => f.key === key).label}（${el.value}）`;
          }
          renderPoster();
        });
      }
    });
  }

  function renderPoster() {
    const tpl = TEMPLATE_MAP[currentId];
    stage.innerHTML = tpl.render(getValues(tpl));
  }

  function renderRefs() {
    const refsRoot = root.querySelector("#editor-refs");
    const bridge = window.PosterLab;
    if (!refsRoot || !bridge) return;
    const tpl = TEMPLATE_MAP[currentId];
    const refs = bridge.getRefsFor(`template:${tpl.id}`, { styleId: tpl.styleId, limit: 8 });
    if (!refs.length) {
      refsRoot.innerHTML = "";
      return;
    }
    const presetByFile = Object.fromEntries((tpl.presets || []).map((p) => [p.ref, p]));
    refsRoot.innerHTML = `
      <div class="ref-strip-label">参考原图（点击放大对照，带 ⚡ 的可一键复刻）</div>
      <div class="ref-strip-row">
        ${refs
          .map((r, n) => `
          <span class="ref-thumb-wrap">
            <button class="ref-thumb" type="button" data-n="${n}" title="${esc(r.title)}"><img src="${bridge.imgSrc(r)}" alt="${esc(r.title)}" loading="lazy" /></button>
            ${presetByFile[r.file] ? `<button class="ref-replicate" type="button" data-n="${n}" title="按这张图调好所有参数">⚡ 复刻</button>` : ""}
          </span>`)
          .join("")}
      </div>`;
    refsRoot.querySelectorAll(".ref-thumb").forEach((b) =>
      b.addEventListener("click", () => bridge.openImage(refs[+b.dataset.n]))
    );
    refsRoot.querySelectorAll(".ref-replicate").forEach((b) =>
      b.addEventListener("click", () => {
        const preset = presetByFile[refs[+b.dataset.n].file];
        if (!preset) return;
        applyPreset(tpl, preset);
        renderForm();
        renderPoster();
        root.querySelector(".editor-stage-wrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
      })
    );
  }

  root.querySelector("#btn-reset").addEventListener("click", () => {
    delete stateByTemplate[currentId];
    renderForm();
    renderPoster();
  });

  root.querySelector("#btn-export").addEventListener("click", async () => {
    const btn = root.querySelector("#btn-export");
    btn.textContent = "导出中…";
    btn.disabled = true;
    try {
      const dataUrl = await htmlToImage.toPng(stage, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.download = `posterlab-${currentId}-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      alert("导出失败：" + e.message);
    } finally {
      btn.textContent = "导出 PNG";
      btn.disabled = false;
    }
  });

  if (window.PosterLab)
    window.PosterLab.templates = TEMPLATES.map(({ id, name, presets }) => ({
      id,
      name,
      presets: (presets || []).map(({ id: pid, name: pname, ref }) => ({ id: pid, name: pname, ref })),
    }));

  renderPicker();
  renderForm();
  renderPoster();
  renderRefs();
  fitStage();

  return () => window.removeEventListener("resize", fitStage);
}
