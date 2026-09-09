import { mulberry32, pick } from './shared.js';

export const PALETTES = [
  ['#00cee8', '#ff0088', '#fff044', '#ff551d', '#aa00ff', '#0347ff', '#00ec5a'],
  ['#ff461c', '#c2ff00', '#7143ff', '#00ccf5', '#ff70c5', '#1948ff', '#fff15e'],
  ['#ffe600', '#033fff', '#ff174b', '#10df9a', '#a500ff', '#ff6b00', '#00d5e5'],
  ['#ff8eaf', '#7727ee', '#f3fc54', '#ff591a', '#39c9ef', '#00d779', '#2452fb'],
];

// Largest-remainder apportionment: exact count, zero-weight tiers stay empty.
export function allocateCounts(total, weights) {
  total = Math.max(0, Math.round(Number(total) || 0));
  const safe = weights.map(w => Math.max(0, Number(w) || 0));
  const sum = safe.reduce((a, b) => a + b, 0);
  if (!sum) return safe.map(() => 0);
  const quotas = safe.map(w => total * w / sum);
  const counts = quotas.map(Math.floor);
  const order = quotas.map((q, i) => ({ i, rest: q - counts[i] }))
    .filter(({ i }) => safe[i] > 0).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (let n = total - counts.reduce((a, b) => a + b, 0), i = 0; i < n; i++) counts[order[i % order.length].i]++;
  return counts;
}

export function createLayout({ seed, count, large, medium, small, family = 'mixed' }) {
  const rng = mulberry32(seed);
  const counts = allocateCounts(count, [large, medium, small]);
  const anchors = [[.24, .19], [.79, .36], [.23, .64], [.76, .78], [.26, .85], [.78, .14], [.16, .42], [.80, .57]];
  const sizes = [[.39, .57], [.19, .29], [.065, .13]];
  const kinds = family === 'round' ? ['ring', 'circle', 'semi', 'star']
    : family === 'angular' ? ['square', 'grid', 'checker', 'zigzag', 'triangle']
      : ['ring', 'zigzag', 'square', 'semi', 'checker', 'grid', 'star', 'circle', 'triangle'];
  let index = 0;
  return counts.flatMap((n, tier) => Array.from({ length: n }, () => {
    const [ax, ay] = anchors[index++ % anchors.length];
    const w = sizes[tier][0] + rng() * (sizes[tier][1] - sizes[tier][0]);
    const largeKinds = family === 'round' ? ['ring', 'circle', 'semi']
      : family === 'angular' ? ['zigzag', 'square', 'triangle'] : ['ring', 'zigzag', 'square'];
    const kind = tier === 0 ? pick(rng, largeKinds)
      : tier === 2 && family === 'mixed' && rng() > .45 ? 'dots' : pick(rng, kinds);
    return { tier, kind, x: Math.min(.86, Math.max(.14, ax + (rng() - .5) * .12)),
      y: Math.min(.90, Math.max(.10, ay + (rng() - .5) * .1)), w,
      rotation: (rng() - .5) * .85, color: Math.floor(rng() * 7) };
  }));
}

export function copyFromCaption(caption) {
  const clean = String(caption || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!clean) throw new Error('画面描述为空');
  const subjects = [
    [/\b(goose|geese)\b/i, 'GOOSE', 'POISE'], [/\b(duck|ducks)\b/i, 'DUCK', 'STUDY'],
    [/\b(bird|birds|swan)\b/i, 'WILD', 'POISE'], [/\b(dog|puppy)\b/i, 'PLAYFUL', 'COMPANION'],
    [/\b(cat|kitten)\b/i, 'FELINE', 'MOMENT'], [/\b(woman|man|person|people|girl|boy)\b/i, 'URBAN', 'RHYTHM'],
    [/\b(flower|flowers|plant|vase)\b/i, 'BOTANIC', 'PULSE'], [/\b(car|bike|bicycle|motorcycle)\b/i, 'CITY', 'MOTION'],
    [/\b(food|plate|cake|fruit|sandwich)\b/i, 'DAILY', 'FLAVOUR'],
    [/\b(bottle|cup|glass)\b/i, 'OBJECT', 'RHYTHM'],
  ];
  const match = subjects.find(([re]) => re.test(clean));
  // Unknown subjects use words from the actual caption, never a claimed category.
  const words = clean.replace(/[^a-zA-Z\s]/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'with', 'there', 'that', 'this'].includes(w.toLowerCase()));
  const title = match ? `${match[1]}\n${match[2]}` : `${(words[0] || 'VISUAL').toUpperCase()}\n${(words[1] || 'STUDY').toUpperCase()}`;
  const sentence = clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[.!?]+$/, '') + '.';
  return { title, body: `${sentence} Bold colour and shifting geometry turn an everyday scene into a graphic moment.` };
}
