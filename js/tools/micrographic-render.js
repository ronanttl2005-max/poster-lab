import { PAGE, createLayout, shapeMarkup, fitText, esc } from './micrographic-layout.js';

export const FONT = 'Arial, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif';
export const DEMO_COPY = {
  title: '光/影', caption: 'A quiet crossing catches the afternoon light. Long shadows draw a second city across the warm concrete.',
  keywords: ['CONTRAST', 'URBAN', 'SHADOW', 'GEOMETRY'], iconQueries: ['sun', 'walk', 'city'],
};

// Original vector street scene; no reference lettering is baked into the demo.
export function demoScene() {
  return `<defs><linearGradient id="mg-wall" x2="1" y2="1"><stop stop-color="#b6aa8b"/><stop offset="1" stop-color="#797665"/></linearGradient>
    <linearGradient id="mg-road" x2="0" y2="1"><stop stop-color="#48483f"/><stop offset="1" stop-color="#252d2c"/></linearGradient></defs>
    <rect width="750" height="1000" fill="url(#mg-wall)"/>
    <g stroke="#66675a" stroke-width="2" opacity=".65"><path d="M0 180h750M0 360h750M0 540h750M0 720h750M215 0v780M560 0v780"/></g>
    <g fill="#252f2e" stroke="#8b8876" stroke-width="9"><path d="M44 194h90v66H44zm0 185h90v66H44zm0 185h90v66H44z"/></g>
    <path d="M0 0h750v130L350 780H0Z" fill="#172524" opacity=".67"/><path d="M0 0h215L750 495v255Z" fill="#172524" opacity=".37"/>
    <rect y="780" width="750" height="58" fill="#706b54"/><rect y="838" width="750" height="162" fill="url(#mg-road)"/>
    <g fill="#c1c0ac"><path d="M167 860h440l-22 12H146zm-50 30h443l-25 14H93zm-58 35h450l-29 17H34zm-66 42h460l-34 20H-34z"/></g>
    <path d="M218 -20 232 842" stroke="#17201d" stroke-width="19"/><path d="M223 315h169" stroke="#17201d" stroke-width="12"/>
    <rect x="355" y="313" width="46" height="100" rx="10" fill="#19251f"/>
    <rect x="362" y="322" width="32" height="36" rx="8" fill="#b24833"/><rect x="362" y="369" width="32" height="35" rx="7" fill="#37675f"/>
    <circle cx="378" cy="332" r="4" fill="#e7d5af"/><path d="M378 337v14m-5-11h10" stroke="#e7d5af" stroke-width="4"/>
    <path d="M542 824 697 987h30L552 817Z" fill="#172321" opacity=".75"/>
    <g fill="#1e2824"><circle cx="545" cy="784" r="7"/><path d="m540 792-7 22 7 2-5 19h6l9-22 6 17h6l-8-28-2-10z"/></g>`;
}

export function renderMicrographic(v, content, icons, imageUrl, measure, { photo = true, guides = v.guides } = {}) {
  const { box, cells, bands } = createLayout(v);
  const ink = /^#[0-9a-f]{6}$/i.test(v.ink) ? v.ink : '#fffff5';
  const border = shapeMarkup(v.shape, box) + shapeMarkup(v.shape, box, Number(v.gap));
  const texts = cells.map(cell => {
    const { x, y, w, h, type, align } = cell;
    if (type.startsWith('icon')) {
      const icon = icons[Number(type.slice(4))];
      if (!icon) return '';
      const size = Math.min(w, h, 88) * .9;
      const ix = align === 'end' ? x + w - size : align === 'middle' ? x + (w - size) / 2 : x;
      return `<svg data-kind="icon" x="${ix}" y="${y + (h - size) / 2}" width="${size}" height="${size}" viewBox="${esc(icon.viewBox)}" fill="currentColor">${icon.body}</svg>`;
    }
    let text = '', weight = 700, maxSize = 29;
    if (type === 'title') { text = content.title; maxSize = 96; weight = 800; }
    else if (type === 'copy') { text = content.caption.toUpperCase(); maxSize = 15; weight = 400; }
    else if (type === 'serial') { text = String((Number(v.seed) || 1) % 100).padStart(2, '0'); maxSize = 14; }
    else if (type.startsWith('words')) text = content.keywords.slice(Number(type.slice(5)), Number(type.slice(5)) + 2).join(' ');
    else if (type.startsWith('word')) text = content.keywords[Number(type.slice(4))] || '';
    maxSize *= Number(v.typeScale) / 100;
    if (type === 'title' || /^word\d/.test(type)) maxSize = Math.min(maxSize, w / Math.max(1, measure(text, 1, weight)));
    const fitted = fitText(text, w, h, maxSize, measure, weight);
    const tx = align === 'end' ? x + w : align === 'middle' ? x + w / 2 : x;
    const top = y + (h - fitted.lines.length * fitted.lineHeight) / 2;
    return `<text data-kind="${type}" text-anchor="${align}" font-weight="${weight}" font-size="${fitted.size}">${fitted.lines.map((line, i) => `<tspan x="${tx}" y="${top + fitted.size * .91 + i * fitted.lineHeight}">${esc(line)}</tspan>`).join('')}</text>`;
  }).join('');
  const grid = guides ? `<g data-guides="true" fill="none" stroke="#8cffba" stroke-width=".7" opacity=".7">${bands.map(b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`).join('')}${cells.map(c => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" stroke-dasharray="3 4"/>`).join('')}</g>` : '';
  const bg = photo ? (imageUrl ? `<image href="${esc(imageUrl)}" width="750" height="1000" preserveAspectRatio="xMidYMid slice"/>` : demoScene()) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.width}" height="${PAGE.height}" viewBox="0 0 750 1000" role="img" aria-label="${esc(content.title || 'Micro-graphic 标签')}">
    <title>${esc(content.title || 'Micro-graphic 标签')}</title><desc>${esc(content.caption)}; Icons: ${esc(icons.map(i => `${i.name}${i.online ? ' / Pictogrammers / Apache-2.0' : ' / Poster Lab'}`).join(', '))}</desc>
    ${bg}${photo ? `<rect width="750" height="1000" fill="#000" opacity="${Number(v.shade) / 100}"/>` : ''}
    <g color="${ink}" fill="${ink}" font-family="${FONT}">
      <g fill="none" stroke="${ink}" stroke-width="${Number(v.stroke)}" opacity=".75">${border}</g>${texts}</g>${grid}</svg>`;
}
