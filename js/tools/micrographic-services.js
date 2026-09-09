// Only copy a small geometry vocabulary. Network SVG never becomes arbitrary
// HTML, and cannot bring scripts, foreignObject, events, links or URL paints.
export function sanitizeIcon(source) {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.localName !== 'svg' || doc.querySelector('parsererror')) throw new Error('图标格式无效');
  const tags = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
  const attrs = new Set(['d', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'points',
    'fill', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform']);
  const clean = element => {
    if (!tags.has(element.localName)) return '';
    const safe = document.createElementNS('http://www.w3.org/2000/svg', element.localName);
    for (const attr of element.attributes) {
      if (!attrs.has(attr.name) || /url\s*\(|javascript:|data:|https?:/i.test(attr.value)) continue;
      safe.setAttribute(attr.name, ['fill', 'stroke'].includes(attr.name) && attr.value !== 'none' ? 'currentColor' : attr.value);
    }
    for (const child of element.children) {
      const markup = clean(child);
      if (markup) safe.append(new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml').documentElement.firstElementChild);
    }
    return new XMLSerializer().serializeToString(safe);
  };
  const viewBox = svg.getAttribute('viewBox') || '0 0 24 24';
  if (!/^[-\d.e+\s,]+$/i.test(viewBox)) throw new Error('图标尺寸无效');
  const body = [...svg.children].map(clean).join('');
  if (!body) throw new Error('图标没有可用的矢量路径');
  return { body, viewBox };
}

const iconCache = new Map();
export async function findIcon(query, signal, variant = 0) {
  const term = String(query).trim().slice(0, 40);
  if (!term) throw new Error('请输入图标关键词');
  const cacheKey = `${term.toLowerCase()}:${variant}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);
  const search = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(term)}&prefix=mdi&limit=32`, { signal });
  if (!search.ok) throw new Error('在线图标搜索暂时不可用');
  const data = await search.json();
  const names = (data.icons || []).filter(name => /^mdi:[a-z0-9-]+$/.test(name));
  if (!names.length) throw new Error(`没有找到「${term}」的图标`);
  const name = names[variant % Math.min(names.length, 8)];
  const response = await fetch(`https://api.iconify.design/${name.replace(':', '/')}.svg`, { signal });
  if (!response.ok) throw new Error('图标下载失败');
  const icon = { ...sanitizeIcon(await response.text()), name, query: term,
    source: `https://icon-sets.iconify.design/mdi/${name.slice(4)}/`, license: 'Apache-2.0', online: true };
  if (iconCache.size > 120) iconCache.clear();
  iconCache.set(cacheKey, icon);
  return icon;
}

// Original geometry for a complete demo and an explicit offline fallback.
export const DEMO_ICONS = [
  { name: 'demo-sun', viewBox: '0 0 24 24', body: '<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4M4 4l3 3m10 10 3 3M4 20l3-3M17 7l3-3"/></g>' },
  { name: 'demo-crossing', viewBox: '0 0 24 24', body: '<path fill="currentColor" d="M2 3h20v3H2zm0 5h20v3H2zm0 5h20v3H2zm0 5h20v3H2z"/>' },
  { name: 'demo-building', viewBox: '0 0 24 24', body: '<g fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V3h11v19M15 10h5v12M1 22h22M8 7h3M8 11h3M8 15h3M8 19h3"/></g>' },
];
export const PLACEHOLDER_ICON = { name: 'offline-placeholder', viewBox: '0 0 24 24',
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2 22 12 12 22 2 12Z"/><circle cx="12" cy="12" r="3"/></g>' };
