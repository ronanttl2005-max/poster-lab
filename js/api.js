const DEFAULT_TIMEOUT_MS = 3000;

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
    if (validInspirations(inspirations) && validStyles(styles)) {
      return { inspirations, styles, source: "api" };
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

  return { inspirations, styles, source };
}
