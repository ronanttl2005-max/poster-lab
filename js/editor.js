import { TEMPLATES, TEMPLATE_MAP } from "./templates.js";
import { STYLE_MAP } from "../data/styles.js";
import { processImage, RECIPE_LABELS } from "./poster-fx.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

// 每个模板的当前值（会话内记忆）
const stateByTemplate = {};
// 上传的原图（未经处理）。切换处理模式时要拿它重新加工，
// 否则「深度 → 简单」只能拿到已经烧进效果的图，回不去。
const rawsByTemplate = {};
let currentId = TEMPLATES[0].id;

// 保留键：图片处理模式。不是模板 field，但会塞进 values 里，
// 好让 render(v) 在「简单」模式下自己决定要不要上 CSS filter。
const MODE_KEY = "imgMode";
const MODE_SIMPLE = "simple";
const MODE_DEEP = "deep";

// 声明了 fx 的 image 字段才需要处理模式开关。
const fxFields = (tpl) => tpl.fields.filter((f) => f.type === "image" && f.fx);

function defaultsFor(tpl) {
  return {
    ...Object.fromEntries(tpl.fields.map((f) => [f.key, f.default])),
    [MODE_KEY]: MODE_SIMPLE,
  };
}

function getValues(tpl) {
  if (!stateByTemplate[tpl.id]) stateByTemplate[tpl.id] = defaultsFor(tpl);
  return stateByTemplate[tpl.id];
}

function getRaws(tpl) {
  if (!rawsByTemplate[tpl.id]) rawsByTemplate[tpl.id] = {};
  return rawsByTemplate[tpl.id];
}

function applyPreset(tpl, preset) {
  stateByTemplate[tpl.id] = { ...defaultsFor(tpl), ...preset.values };
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
      (fxFields(tpl).length
        ? `<div class="field"><label for="field-imgmode">上传图处理方式</label>
            <select id="field-imgmode" data-imgmode>
              <option value="${MODE_SIMPLE}" ${v[MODE_KEY] !== MODE_DEEP ? "selected" : ""}>简单（实时滤镜）</option>
              <option value="${MODE_DEEP}" ${v[MODE_KEY] === MODE_DEEP ? "selected" : ""}>深度（重处理：${esc(
              fxFields(tpl)
                .map((f) => RECIPE_LABELS[f.fx] || f.fx)
                .join(" / ")
            )}）</option>
            </select></div>`
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

    const modeSelect = form.querySelector("[data-imgmode]");
    if (modeSelect) {
      modeSelect.addEventListener("change", () => {
        v[MODE_KEY] = modeSelect.value;
        // 模式本身也影响 render(v)（简单模式靠 CSS filter），先重画一次
        renderPoster();
        // 再把已上传的原图按新模式重新加工一遍
        fxFields(tpl).forEach((f) => {
          const input = form.querySelector(`[data-k="${CSS.escape(f.key)}"]`);
          applyFxField(tpl, f, input?.closest(".field")?.querySelector("label"));
        });
      });
    }

    form.querySelectorAll("[data-k]").forEach((el) => {
      const key = el.dataset.k;
      if (el.dataset.type === "image") {
        const labelEl = el.closest(".field")?.querySelector("label");
        el.addEventListener("change", () => {
          const file = el.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const field = tpl.fields.find((f) => f.key === key);
            getRaws(tpl)[key] = reader.result;
            if (field?.fx) {
              applyFxField(tpl, field, labelEl);
            } else {
              v[key] = reader.result;
              renderPoster();
            }
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

  // 每个字段一个递增票号：连点两次上传时，只让最后一次的结果落地，
  // 避免慢的那次盖掉快的那次。
  const fxTickets = {};

  // 把某个 fx 字段的原图按当前模式加工进 values。
  // 简单模式直接用原图（视觉效果交给 render 里的 CSS filter），
  // 深度模式走 canvas 重处理。processImage 内部已经兜底回落原图。
  async function applyFxField(tpl, field, labelEl) {
    const raws = getRaws(tpl);
    const raw = raws[field.key];
    if (!raw) return; // 还没上传过，别动模板默认占位图
    const v = getValues(tpl);

    if (v[MODE_KEY] !== MODE_DEEP) {
      v[field.key] = raw;
      renderPoster();
      return;
    }

    const ticketKey = `${tpl.id}:${field.key}`;
    const ticket = (fxTickets[ticketKey] = (fxTickets[ticketKey] || 0) + 1);
    if (labelEl) labelEl.textContent = `${field.label}（处理中…）`;
    try {
      const out = await processImage(raw, field.fx, v);
      if (fxTickets[ticketKey] !== ticket) return; // 已被更新的上传取代
      v[field.key] = out;
      renderPoster();
    } finally {
      if (fxTickets[ticketKey] === ticket && labelEl) labelEl.textContent = field.label;
    }
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
    // 原图也要一起丢掉，否则重置后切换处理模式会把旧上传图又拉回来
    delete rawsByTemplate[currentId];
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
