import { BRAND_PROFILE_MAP, BRAND_PROFILES, BRAND_SETS, BRAND_SET_MAP } from "./brands.js";
import { DEFAULT_BRAND_OPTIONS, getBrandOptions, normalizeBrandOptions, setBrandOptions } from "./brand-export.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const positions = [
  ["top-left", "左上"], ["top-right", "右上"], ["bottom-left", "左下"], ["bottom-right", "右下"], ["center", "居中"],
];
const blendModes = [
  ["normal", "正常叠放"], ["screen", "滤色（Screen）"], ["multiply", "正片叠底（Multiply）"],
  ["overlay", "叠加（Overlay）"], ["lighten", "变亮（Lighten）"],
];

let panelCounter = 0;

export function applyBrandSet(setId) {
  const set = BRAND_SET_MAP[setId];
  if (!set) return null;
  return { set, options: setOptions({ ...set.options, setId: set.id }) };
}

function setOptions(input) {
  return setBrandOptions({ ...DEFAULT_BRAND_OPTIONS, ...input, setId: input?.setId || "", enabled: true });
}

export function getCurrentBrandOptions() {
  return getBrandOptions();
}

export function renderBrandOverlay(stage, input = getBrandOptions()) {
  if (!stage) return;
  stage.querySelector(".poster-brand-overlay")?.remove();
  const options = normalizeBrandOptions(input);
  const brand = BRAND_PROFILE_MAP[options.brandId];
  if (!options.enabled || !brand?.logo) return;
  const img = document.createElement("img");
  img.className = "poster-brand-overlay";
  img.src = brand.logo;
  img.alt = `${brand.name} logo`;
  img.draggable = false;
  img.style.width = `${options.scale}%`;
  img.style.opacity = String(options.opacity);
  img.style.mixBlendMode = options.blendMode === "normal" ? "normal" : options.blendMode;
  img.style.margin = `${options.margin}px`;
  if (options.position.includes("top")) img.style.top = "0";
  else if (options.position.includes("bottom")) img.style.bottom = "0";
  else img.style.top = "50%";
  if (options.position.includes("left")) img.style.left = "0";
  else if (options.position.includes("right")) img.style.right = "0";
  else { img.style.left = "50%"; img.style.transform = "translate(-50%, -50%)"; }
  stage.append(img);
}

export function mountBrandKit(container, { compact = false, onChange, onApplySet } = {}) {
  if (!container) return () => {};
  const instanceId = `brand-kit-${++panelCounter}`;
  let options = getBrandOptions();
  const setOptionsInMemory = (next) => {
    options = setBrandOptions({ ...options, ...next });
    onChange?.(options);
    syncLabels();
  };
  container.innerHTML = `
    <section class="brand-kit ${compact ? "brand-kit-compact" : ""}" data-brand-kit="${instanceId}">
      <div class="brand-kit-head">
        <div>
          <div class="brand-kit-kicker">BRAND KIT</div>
          <h3>品牌套图</h3>
        </div>
        <span class="brand-kit-status" data-status></span>
      </div>
      <p class="brand-kit-help">导出 PNG 时自动叠加透明 logo；位置、大小、透明度和混合方式可随时微调。</p>
      <div class="brand-kit-grid">
        <label class="brand-kit-field brand-kit-wide"><span>品牌 logo</span>
          <select data-k="brandId">
            <option value="">不叠加 logo</option>
            ${BRAND_PROFILES.map((brand) => `<option value="${esc(brand.id)}">${esc(brand.name)} · ${esc(brand.nameEn)}</option>`).join("")}
          </select>
        </label>
        <label class="brand-kit-field brand-kit-wide"><span>品牌套图预设</span>
          <select data-k="setId">
            <option value="">手动配置</option>
            ${BRAND_SETS.map((set) => `<option value="${esc(set.id)}">${esc(set.name)}</option>`).join("")}
          </select>
        </label>
        <button class="brand-kit-apply" type="button" data-apply>应用套图</button>
        <label class="brand-kit-field"><span>位置</span>
          <select data-k="position">${positions.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
        </label>
        <label class="brand-kit-field"><span>混合方式</span>
          <select data-k="blendMode">${blendModes.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
        </label>
        <label class="brand-kit-field"><span>大小 <em data-label="scale"></em></span>
          <input type="range" data-k="scale" min="6" max="42" step="1" />
        </label>
        <label class="brand-kit-field"><span>透明度 <em data-label="opacity"></em></span>
          <input type="range" data-k="opacity" min="0.05" max="1" step="0.05" />
        </label>
        <label class="brand-kit-field"><span>边距 <em data-label="margin"></em></span>
          <input type="range" data-k="margin" min="0" max="140" step="1" />
        </label>
      </div>
      <div class="brand-kit-note" data-note></div>
    </section>`;

  const panel = container.querySelector(`[data-brand-kit="${instanceId}"]`);
  const inputs = Object.fromEntries([...panel.querySelectorAll("[data-k]")].map((node) => [node.dataset.k, node]));
  const status = panel.querySelector("[data-status]");
  const note = panel.querySelector("[data-note]");

  function syncLabels() {
    const brand = BRAND_PROFILE_MAP[options.brandId];
    inputs.brandId.value = options.brandId;
    inputs.setId.value = options.setId || "";
    inputs.position.value = options.position;
    inputs.blendMode.value = options.blendMode === "source-over" ? "normal" : options.blendMode;
    inputs.scale.value = options.scale;
    inputs.opacity.value = options.opacity;
    inputs.margin.value = options.margin;
    panel.querySelector('[data-label="scale"]').textContent = `${Math.round(options.scale)}%`;
    panel.querySelector('[data-label="opacity"]').textContent = `${Math.round(options.opacity * 100)}%`;
    panel.querySelector('[data-label="margin"]').textContent = `${Math.round(options.margin)}px`;
    status.textContent = options.enabled && brand ? `已启用 · ${brand.name}` : "未启用";
    status.className = `brand-kit-status ${options.enabled && brand ? "is-on" : ""}`;
    note.textContent = brand ? brand.description : "选择一个品牌，或直接套用活动主视觉预设。";
  }

  inputs.brandId.addEventListener("change", () => setOptionsInMemory({ brandId: inputs.brandId.value, enabled: !!inputs.brandId.value }));
  ["position", "blendMode"].forEach((key) => inputs[key].addEventListener("change", () => setOptionsInMemory({ [key]: inputs[key].value })));
  ["scale", "opacity", "margin"].forEach((key) => inputs[key].addEventListener("input", () => setOptionsInMemory({ [key]: Number(inputs[key].value) })));
  inputs.setId.addEventListener("change", () => {
    if (inputs.setId.value) {
      const set = BRAND_SET_MAP[inputs.setId.value];
      note.textContent = set?.desc || "";
    }
  });
  panel.querySelector("[data-apply]").addEventListener("click", () => {
    const set = BRAND_SET_MAP[inputs.setId.value];
    if (!set) return;
    const applied = applyBrandSet(set.id);
    options = applied.options;
    syncLabels();
    onApplySet?.(set, options);
    onChange?.(options);
  });
  syncLabels();

  return () => { container.innerHTML = ""; };
}
