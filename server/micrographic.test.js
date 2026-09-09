import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, createLayout, fitText } from '../js/tools/micrographic-layout.js';
import { renderMicrographic, DEMO_COPY } from '../js/tools/micrographic-render.js';
import { DEMO_ICONS } from '../js/tools/micrographic-services.js';

const defaults = { shape: 'rectangle', scale: 100, x: 50, y: 57, seed: 15, columns: 3, gap: 7, stroke: .8, ink: '#fffff5', shade: 8, typeScale: 100 };
const measure = (s, size) => Array.from(s).reduce((sum, c) => sum + (/[\u3400-\u9fff]/.test(c) ? 1 : .6) * size, 0);

// Independent point-in-shape checks, not the layout's own safe-span function.
function contains(shape, x, y) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  if (shape === 'triangle') return y >= Math.abs(x - .5) * 2;
  if (shape === 'diamond') return Math.abs(x - .5) + Math.abs(y - .5) <= .5 + 1e-9;
  if (shape === 'ellipse' || shape === 'oval') return (x - .5) ** 2 * 4 + (y - .5) ** 2 * 4 <= 1 + 1e-9;
  if (shape === 'hexagon') return y >= .5 - 2 * x && y >= 2 * x - 1.5 && y <= .5 + 2 * x && y <= 2.5 - 2 * x;
  return true;
}

test('micrographic: every cell stays within each shape and never overlaps, including extreme controls', () => {
  for (const { value: shape } of SHAPES) for (let seed = 1; seed <= 60; seed++) for (const scale of [45, 100, 130]) {
    const { box, cells } = createLayout({ ...defaults, shape, seed, scale, columns: 2 + seed % 4, gap: 3 + seed % 12, x: seed % 2 ? 10 : 90, y: seed % 2 ? 90 : 10 });
    assert.ok(box.x >= 20 && box.y >= 20 && box.x + box.w <= 730.001 && box.y + box.h <= 980.001);
    for (const c of cells) {
      assert.ok(c.w > 0 && c.h > 0, `${shape} positive cells`);
      for (const [x, y] of [[c.x,c.y], [c.x+c.w,c.y], [c.x,c.y+c.h], [c.x+c.w,c.y+c.h]]) {
        assert.ok(contains(shape, (x-box.x)/box.w, (y-box.y)/box.h), `${shape}/${seed}: cell outside outline`);
      }
    }
    for (let i = 0; i < cells.length; i++) for (let j = i+1; j < cells.length; j++) {
      const a = cells[i], b = cells[j];
      assert.ok(a.x+a.w <= b.x+.001 || b.x+b.w <= a.x+.001 || a.y+a.h <= b.y+.001 || b.y+b.h <= a.y+.001);
    }
  }
});

test('micrographic: seed reproduces layout; new seeds and column counts alter it', () => {
  assert.deepEqual(createLayout(defaults), createLayout({ ...defaults }));
  assert.notDeepEqual(createLayout(defaults), createLayout({ ...defaults, seed: 16 }));
  assert.notDeepEqual(createLayout(defaults), createLayout({ ...defaults, columns: 5 }));
});

test('micrographic: text fitting retains long English/CJK copy within measured bounds', () => {
  for (const text of ['光与影之间', 'SUPERCALIFRAGILISTICEXPIALIDOCIOUS', 'Light crosses the city. 城市里的光影，停留在这一刻。'.repeat(4)]) {
    const fit = fitText(text, 90, 30, 96, measure);
    assert.ok(fit.lines.every(line => measure(line, fit.size) <= 90));
    assert.ok(fit.lines.length * fit.lineHeight <= 30);
    assert.equal(fit.lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  }
});

test('micrographic: SVG escapes user text and export omits guides and photograph when requested', () => {
  const hostile = { ...DEMO_COPY, title: '<script>x</script>', caption: '" onload="evil()' };
  const svg = renderMicrographic({ ...defaults, guides: true }, hostile, DEMO_ICONS, 'data:image/png;base64,AAAA', measure, { photo: false, guides: false });
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('<image'));
  assert.ok(!svg.includes('data-guides'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(renderMicrographic({ ...defaults, guides: true }, DEMO_COPY, [], '', measure).includes('data-guides'));
});
