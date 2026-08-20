const DEFAULT_TIMEOUT_MS = 3000;
const TOKEN_KEY = "posterLabAdminToken";

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode etc.; token just won't persist.
  }
}

export function getApiOrigin() {
  const base = getApiBase();
  return base.endsWith("/api") ? base.slice(0, -4) : "";
}

export async function apiWrite(method, path, body, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON error bodies fall through to the status check below.
    }
    if (!response.ok) {
      const message = payload?.error?.message || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload?.data ?? payload;
  } finally {
    clearTimeout(timer);
  }
}

export function friendlyWriteError(error) {
  if (error?.status === 401) return "管理密钥不正确：点「⚙ 密钥」重新设置。";
  if (error?.status === 503) return "线上服务未配置管理密钥（POSTER_LAB_ADMIN_TOKEN），暂时只能在本机修改。";
  if (error?.name === "AbortError") return "请求超时，请重试。";
  return `操作失败：${error?.message || error}`;
}

function normalizeBase(value) {
  const base = String(value || "").trim().replace(/\/$/, "");
  if (!base) return "";
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function getApiBase() {
  const params = new URLSearchParams(globalThis.location?.search || "");
  const configured =
    params.get("api") ||
    globalThis.POSTER_API_BASE ||
    globalThis.PUBLIC_API_BASE;

  if (configured) return normalizeBase(configured);

  const { protocol } = globalThis.location || {};
  if (protocol === "file:") return "http://localhost:4173/api";
  return "/api";
}

async function fetchJson(path, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getApiBase()}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function unwrapArray(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return null;
}

function validInspirations(items) {
  return (
    Array.isArray(items) &&
    items.every(
      (item) =>
        item &&
        typeof item.file === "string" &&
        typeof item.title === "string" &&
        typeof item.styleId === "string" &&
        Array.isArray(item.tags)
    )
  );
}

function validStyles(items) {
  return (
    Array.isArray(items) &&
    items.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Array.isArray(item.palette) &&
        Array.isArray(item.refs)
    )
  );
}

export async function loadCatalog({ fallbackInspirations, fallbackStyles }) {
  try {
    const bootstrap = await fetchJson("/bootstrap");
    const inspirations = unwrapArray(bootstrap, "inspirations");
    const styles = unwrapArray(bootstrap, "styles");
    const folders = unwrapArray(bootstrap, "folders") || [];
    if (validInspirations(inspirations) && validStyles(styles)) {
      return { inspirations, styles, folders, source: "api" };
    }
  } catch {
    // Older/smaller backends may expose only the collection routes below.
  }

  const [inspirationResult, styleResult] = await Promise.allSettled([
    fetchJson("/inspirations"),
    fetchJson("/styles"),
  ]);
  const remoteInspirations =
    inspirationResult.status === "fulfilled"
      ? unwrapArray(inspirationResult.value, "inspirations")
      : null;
  const remoteStyles =
    styleResult.status === "fulfilled"
      ? unwrapArray(styleResult.value, "styles")
      : null;

  const inspirations = validInspirations(remoteInspirations)
    ? remoteInspirations
    : fallbackInspirations;
  const styles = validStyles(remoteStyles) ? remoteStyles : fallbackStyles;
  const source =
    inspirations !== fallbackInspirations || styles !== fallbackStyles
      ? "api-partial"
      : "bundled";

  return { inspirations, styles, folders: [], source };
}

// Downscale to keep uploads small, then send as base64 to the API.
export async function uploadImageFile(file, { maxEdge = 1800 } = {}) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  let payloadUrl = dataUrl;
  if (scale < 1 || dataUrl.length > 6 * 1024 * 1024) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const keepPng = file.type === "image/png" && dataUrl.length < 4 * 1024 * 1024;
    payloadUrl = keepPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
  }

  const result = await apiWrite("POST", "/uploads", { name: file.name, dataUrl: payloadUrl }, { timeoutMs: 60000 });
  if (!result?.src) throw new Error("上传接口没有返回文件地址");
  return result.src;
}
