import { makeCanvas, subjectHalftone, mulberry32 } from './shared.js';
import { alphaBounds, coverRect, refineAlpha } from './subjectlift-layout.js';

export function createLayers(source, mask, values) {
  const w = source.width, h = source.height;
  const cutout = makeCanvas(w, h), ctx = cutout.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const rgba = ctx.getImageData(0, 0, w, h), alpha = mask.getContext('2d').getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) rgba.data[i * 4 + 3] = Math.round(
    rgba.data[i * 4 + 3] * refineAlpha(alpha[i * 4 + 3], values.threshold, values.softness) / 255);
  ctx.putImageData(rgba, 0, 0);
  const bounds = alphaBounds(rgba.data, w, h);
  const silhouette = makeCanvas(w, h), s = silhouette.getContext('2d');
  s.drawImage(cutout, 0, 0); s.globalCompositeOperation = 'source-in';
  s.fillStyle = values.color; s.fillRect(0, 0, w, h);
  let subject = cutout;
  if (values.effect === 'dots' && bounds) {
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < binary.length; i++) binary[i] = rgba.data[i * 4 + 3] > 80 ? 1 : 0;
    subject = subjectHalftone(source, { x: 0, y: 0, w, h, mask: binary }, {
      dot: values.dot, color: '#111111', useLuma: false });
    const dots = subject.getContext('2d');
    dots.globalCompositeOperation = 'source-in'; dots.drawImage(cutout, 0, 0);
  }
  return { cutout, silhouette, subject, bounds };
}

export function renderPoster(canvas, source, layers, v) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, split = H * v.split / 100;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = v.color; ctx.fillRect(0, 0, W, H);
  const photo = coverRect(source.width, source.height, 0, split, W, H - split, v.photoX / 100, v.photoY / 100);
  ctx.save(); ctx.beginPath(); ctx.rect(0, split, W, H - split); ctx.clip();
  ctx.drawImage(source, photo.x, photo.y, photo.w, photo.h);
  ctx.drawImage(layers.silhouette, photo.x, photo.y, photo.w, photo.h);
  ctx.restore();
  const b = layers.bounds;
  if (b) {
    const scale = Math.min(W * .6 / b.w, split * .7 / b.h) * v.scale / 100;
    const sw = b.w * scale, sh = b.h * scale;
    const x = (W - sw) * v.subjectX / 100, y = (split - sh) * v.subjectY / 100;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, split); ctx.clip();
    ctx.drawImage(layers.subject, b.x, b.y, b.w, b.h, x, y, sw, sh); ctx.restore();
  }
  if (v.textLayout !== 'none') {
    const fs = v.fontSize * W / 1080;
    ctx.font = `500 ${fs}px Arial, "PingFang SC", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = v.textColor;
    const left = v.leftText.split('\n').slice(0, 3), right = v.rightText.split('\n').slice(0, 3);
    const y = v.textLayout === 'seam' ? split - fs * 2.1 : split * .5;
    for (const [lines, x] of [[left, W * .21], [right, W * .79]]) {
      lines.forEach((line, i) => ctx.fillText(line, x, y + (i - (lines.length - 1) / 2) * fs * 1.4, W * .34));
    }
  }
}

// Deterministic layered illustration, available offline; its mask is not an AI result.
export function createDemo() {
  const source = makeCanvas(1200, 800), ctx = source.getContext('2d'), rng = mulberry32(19);
  ctx.fillStyle = '#093b87'; ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = '#2e5548'; ctx.beginPath(); ctx.moveTo(0, 540); ctx.lineTo(1200, 310); ctx.lineTo(1200, 800); ctx.lineTo(0, 800); ctx.fill();
  for (let i = 0; i < 18000; i++) {
    const x = rng() * 1200, y = rng() * 800;
    if (y < 540 - x * 230 / 1200) continue;
    ctx.fillStyle = ['#78925b', '#47653e', '#244333', '#a4aa66'][Math.floor(rng() * 4)];
    ctx.fillRect(x, y, 1 + rng() * 3, 2 + rng() * 4);
  }
  ctx.fillStyle = '#102d28'; ctx.beginPath(); ctx.ellipse(753, 655, 175, 26, -.28, 0, Math.PI * 2); ctx.fill();
  const foreground = makeCanvas(1200, 800), f = foreground.getContext('2d');
  f.lineJoin = 'round'; f.lineCap = 'round';
  const shape = (path, fill, stroke = '#899f9b', width = 3) => {
    const p = new Path2D(path); f.fillStyle = fill; f.strokeStyle = stroke; f.lineWidth = width; f.fill(p); f.stroke(p);
  };
  shape('M554 302 L643 285 Q672 290 676 325 L684 465 L565 480 Z', '#9caaa4');
  shape('M562 430 L607 430 L602 544 L582 640 Q568 657 546 642 L550 548 Z', '#dce5d9');
  shape('M609 427 L650 431 L648 536 L641 648 Q620 667 597 650 L600 538 Z', '#c5d3c9');
  shape('M545 632 L583 635 L588 660 Q583 676 536 667 Z', '#cdd8ca');
  shape('M602 637 L640 638 L654 661 Q640 679 593 668 Z', '#e2e5d8');
  shape('M557 288 Q587 266 626 284 L652 320 L648 450 Q600 477 551 445 L541 339 Z', '#e4e8d9');
  shape('M548 308 Q520 309 518 352 L500 420 L512 467 Q526 477 536 460 L529 419 L554 357 Z', '#d5ded3');
  shape('M640 303 Q668 306 670 342 L682 414 L669 472 Q650 486 643 462 L653 411 L633 349 Z', '#c1cfc5');
  shape('M555 251 Q545 203 580 182 Q630 159 656 206 L655 253 Q643 292 592 288 Z', '#eef0df');
  shape('M565 214 Q600 182 642 211 L640 251 Q609 277 573 249 Z', '#263e38');
  shape('M574 213 Q608 195 636 215 L631 228 Q603 211 577 230 Z', '#a4b2a0', '#a4b2a0', 1);
  shape('M565 319 L617 313 L624 368 L570 376 Z', '#8b9d94');
  f.fillStyle = '#de5f36'; f.fillRect(574, 330, 12, 8); f.fillStyle = '#dfe4d4'; f.fillRect(592, 327, 17, 8);
  f.strokeStyle = '#91a299'; f.lineWidth = 4;
  for (let y = 385; y < 440; y += 15) { f.beginPath(); f.moveTo(564, y); f.lineTo(634, y - 3); f.stroke(); }
  ctx.drawImage(foreground, 0, 0);
  const mask = makeCanvas(1200, 800), m = mask.getContext('2d');
  m.drawImage(foreground, 0, 0); m.globalCompositeOperation = 'source-in'; m.fillStyle = '#ffffff'; m.fillRect(0, 0, 1200, 800);
  return { source, mask };
}
