import { TEMPLATES, TEMPLATE_MAP } from "./templates.js";
import { STYLE_MAP } from "../data/styles.js";

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

export function mountEditor(root) {
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
            <div id="poster-stage"></div>
          </div>
        </div>
        <div class="editor-hint">750 × 1000 画布 · 导出为 2 倍分辨率 PNG（1500 × 2000）</div>
      </div>
    </div>`;

  const picker = root.querySelector("#tpl-picker");
  const form = root.querySelector("#editor-form");
  const stage = root.querySelector("#poster-stage");
  const scaler = root.querySelector("#stage-scaler");

  function fitStage() {
    const wrap = root.querySelector(".editor-stage-wrap");
    const avail = Math.min(wrap.clientWidth - 60, 640);
    const scale = Math.min(avail / 750, 0.82);
    scaler.style.transform = `scale(${scale})`;
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
      })
    );
  }

  function renderForm() {
    const tpl = TEMPLATE_MAP[currentId];
    const v = getValues(tpl);
    form.innerHTML =
      `<p style="font-size:12px;color:var(--text-2);margin-bottom:14px;">${tpl.desc}</p>` +
      tpl.fields
        .map((f) => {
          const val = v[f.key] ?? f.default;
          if (f.type === "textarea")
            return `<div class="field"><label>${f.label}</label><textarea data-k="${f.key}">${val}</textarea></div>`;
          if (f.type === "color")
            return `<div class="field"><label>${f.label}</label><input type="color" data-k="${f.key}" value="${val}" /></div>`;
          if (f.type === "image")
            return `<div class="field"><label>${f.label}</label><input type="file" accept="image/*" data-k="${f.key}" data-type="image" /></div>`;
          if (f.type === "select")
            return `<div class="field"><label>${f.label}</label><select data-k="${f.key}">${f.options
              .map((o) => `<option value="${o.value}" ${o.value === val ? "selected" : ""}>${o.label}</option>`)
              .join("")}</select></div>`;
          if (f.type === "range")
            return `<div class="field"><label>${f.label}（${val}）</label><input type="range" data-k="${f.key}" min="${f.min}" max="${f.max}" value="${val}" /></div>`;
          return `<div class="field"><label>${f.label}</label><input type="text" data-k="${f.key}" value="${String(val).replace(/"/g, "&quot;")}" /></div>`;
        })
        .join("");

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

  renderPicker();
  renderForm();
  renderPoster();
  fitStage();
}
