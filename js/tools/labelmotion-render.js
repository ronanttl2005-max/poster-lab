import { makeCanvas, mulberry32 } from './shared.js';
import { PAPER, quadProject } from './labelmotion-layout.js';
const FONT = '"Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif';

export function drawIcon(ctx, name, x, y, size) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 40, size / 40);
  ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = d => ctx.stroke(new Path2D(d));
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); };
  switch (name) {
    case 'bike': circle(9, 29, 7); circle(32, 29, 7); path('M9 29L17 14L25 29H9L20 20L32 29L26 11H31M13 13H21'); circle(23, 4, 2); break;
    case 'leaf': path('M6 34C-2 9 20 2 35 4C38 25 27 41 6 34ZM7 33L29 10M15 24L14 14M22 18L31 20'); break;
    case 'cup': path('M5 15H29V28Q29 36 17 36Q5 36 5 28ZM29 17H35Q41 27 29 28M11 9V3M21 9V3'); break;
    case 'clock': circle(20, 23, 15); path('M20 23V13M20 2V8M15 2H25M31 8L35 4'); break;
    case 'building': path('M5 36V16H16V5H26V20H35V36ZM16 16V36M26 20V36'); for(let x=9;x<35;x+=10) for(let y=23;y<35;y+=7)ctx.fillRect(x,y,3,3); break;
    case 'layers': path('M20 3L37 14L20 25L3 14ZM4 23L20 34L36 23'); break;
    case 'dots': for(let x=4;x<38;x+=8)for(let y=4;y<38;y+=8)ctx.fillRect(x,y,2.5,2.5); break;
    case 'wave': path('M2 20Q7 -8 12 20T22 20T32 20T42 20'); break;
    case 'disc': circle(20,20,17);circle(20,20,4);path('M8 20A12 12 0 0 1 20 8M32 20A12 12 0 0 1 20 32'); break;
    case 'sun': circle(20,20,8); for(let i=0;i<8;i++){ctx.save();ctx.translate(20,20);ctx.rotate(i*Math.PI/4);path('M0 13V19');ctx.restore();} break;
    default: path('M20 1L24 15L39 20L24 24L20 39L15 24L1 20L15 15Z');
  }
  ctx.restore();
}
function fitText(ctx, text, x, y, maxWidth, size, weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  while(ctx.measureText(text).width > maxWidth && size > 6) ctx.font = `${weight} ${--size}px ${FONT}`;
  ctx.fillText(text, x, y, maxWidth);
}
function wrap(ctx, value, x, y, width, size, maxLines) {
  ctx.font = `400 ${size}px ${FONT}`;
  let line = '', row = 0;
  const chars = Array.from(value.replace(/\n/g, ' '));
  for(let i=0; i<chars.length; i++) {
    if(ctx.measureText(line + chars[i]).width > width) {
      if(row === maxLines - 1) { ctx.fillText(line.slice(0,-1) + '…', x, y + row * size * 1.4); return; }
      ctx.fillText(line, x, y + row++ * size * 1.4); line = '';
    }
    line += chars[i];
  }
  ctx.fillText(line, x, y + row * size * 1.4);
}
export function renderPaper(values, items, { transparent = false, material = false } = {}) {
  const c = makeCanvas(PAPER.width, PAPER.height), ctx = c.getContext('2d');
  if(!transparent) { ctx.fillStyle = values.paper; ctx.fillRect(0,0,c.width,c.height); }
  ctx.fillStyle = ctx.strokeStyle = values.ink;
  ctx.textBaseline = 'top';
  fitText(ctx, values.title || '未命名', 50, 64, 648, 125, 850);
  ctx.globalAlpha = 0.65;
  fitText(ctx, values.eyebrow || 'LABEL STUDY / 001', 54, 204, 640, 13, 500);
  ctx.globalAlpha = 1;
  for(const item of items) {
    const { x, y, w, text, icon, variant } = item;
    if(values.labelStyle === 'sticker') {
      ctx.fillStyle = values.accent; ctx.beginPath(); ctx.roundRect(x-6,y-5,w+12,104,6); ctx.fill();
      ctx.fillStyle = ctx.strokeStyle = values.ink;
    }
    if(variant === 0) { drawIcon(ctx,icon,x,y+2,54); fitText(ctx,text,x,y+61,w,34); }
    else if(variant === 1) { fitText(ctx,text,x,y+2,w,34); drawIcon(ctx,icon,x,y+43,54); }
    else { drawIcon(ctx,icon,x,y+19,57); fitText(ctx,text,x+65,y+33,w-65,32); }
  }
  ctx.globalAlpha = 0.72;
  wrap(ctx,values.description,54,965,450,13,3);
  fitText(ctx,'PL / '+String(values.seed).padStart(3,'0'),585,977,112,12,500);
  ctx.globalAlpha = 1;
  if(material && !transparent) {
    const strength = values.texture / 100;
    const rng = mulberry32(54);
    ctx.fillStyle = '#2b251b';
    for(let i=0;i<12500;i++) {ctx.globalAlpha = rng()*0.12*strength;ctx.fillRect(rng()*c.width,rng()*c.height,0.6+rng(),0.6+rng());}
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0,0,c.width,c.height);
    g.addColorStop(0,`rgba(255,255,255,${values.light/220})`);g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(10,18,14,${values.light/230})`);
    ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  }
  return c;
}
function triangle(ctx, source, s, d) {
  const [a,b,c]=s, [p,q,r]=d;
  const den=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);
  const solve = key => [
    (p[key]*(b.y-c.y)+q[key]*(c.y-a.y)+r[key]*(a.y-b.y))/den,
    (p[key]*(c.x-b.x)+q[key]*(a.x-c.x)+r[key]*(b.x-a.x))/den,
    (p[key]*(b.x*c.y-c.x*b.y)+q[key]*(c.x*a.y-a.x*c.y)+r[key]*(a.x*b.y-b.x*a.y))/den
  ];
  const x=solve('x'), y=solve('y');
  ctx.save();ctx.beginPath();
  // Tiny overlap prevents antialiasing seams between adjacent mesh triangles.
  const mid={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
  d.forEach((v,i)=>{const dx=v.x-mid.x,dy=v.y-mid.y,len=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](v.x+dx/len*.55,v.y+dy/len*.55);});
  ctx.closePath();ctx.clip();ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);ctx.drawImage(source,0,0);ctx.restore();
}
export function drawOnSurface(ctx, paper, quad) {
  const steps=12;
  ctx.save();ctx.beginPath();quad.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y));ctx.closePath();ctx.clip();
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
    const uv=[[i/steps,j/steps],[(i+1)/steps,j/steps],[(i+1)/steps,(j+1)/steps],[i/steps,(j+1)/steps]];
    const src=uv.map(([u,v])=>({x:u*paper.width,y:v*paper.height})), dst=uv.map(([u,v])=>quadProject(quad,u,v));
    triangle(ctx,paper,[src[0],src[1],src[2]],[dst[0],dst[1],dst[2]]);
    triangle(ctx,paper,[src[0],src[2],src[3]],[dst[0],dst[2],dst[3]]);
  }
  ctx.restore();
}
