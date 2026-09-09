import { makeCanvas } from './shared.js';

// Self-contained illustrated cutouts: no external reference pixels or branding.
export function typeflowDemo() {
  const canvas = makeCanvas(900, 660), c = canvas.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 900, 660);
  const sphere = (x, y, rx, ry, colors) => {
    const g = c.createRadialGradient(x-rx*.35,y-ry*.4,2,x,y,Math.max(rx,ry));
    colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));
    c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  };
  // Floating chrome disc and vermilion satellite.
  sphere(145,140,68,86,['#eff7ff','#b8d3dd','#527588','#263d48']);
  sphere(151,145,39,58,['#e6c498','#ae895d','#503b25']);
  sphere(213,150,22,36,['#fff5e1','#ed4934','#760f1d']);
  // Soft metallic folded form with an ochre plinth.
  c.fillStyle='#ac8a4f';c.fillRect(407,165,78,76);
  c.save();c.translate(449,133);c.rotate(.3);
  const g=c.createLinearGradient(-60,-70,50,70);g.addColorStop(0,'#d6e4e8');g.addColorStop(.45,'#76929e');g.addColorStop(1,'#293c45');
  c.fillStyle=g;c.beginPath();c.moveTo(-60,-14);c.bezierCurveTo(-80,-57,-14,-18,-24,-69);c.bezierCurveTo(20,-115,25,-17,67,-12);c.bezierCurveTo(104,27,45,56,17,25);c.bezierCurveTo(-21,10,-35,72,-52,24);c.closePath();c.fill();c.restore();
  // Melting clock.
  c.save();c.translate(743,150);c.fillStyle='#baa568';c.beginPath();c.moveTo(-65,-54);c.bezierCurveTo(56,-75,48,-32,35,1);c.bezierCurveTo(18,28,49,114,19,111);c.bezierCurveTo(-8,109,-6,35,-31,14);c.bezierCurveTo(-59,-4,-88,-21,-65,-54);c.fill();
  c.fillStyle='#e6ece2';c.beginPath();c.ellipse(-11,-28,48,25,.13,0,Math.PI*2);c.fill();c.strokeStyle='#313d37';c.lineWidth=3;c.beginPath();c.moveTo(-10,-43);c.lineTo(-11,-26);c.lineTo(12,-19);c.stroke();c.restore();
  // Enamel eye.
  c.save();c.translate(149,475);c.fillStyle='#866650';c.beginPath();c.moveTo(-89,0);c.quadraticCurveTo(-4,-80,89,0);c.quadraticCurveTo(0,72,-89,0);c.fill();
  c.fillStyle='#e2e5df';c.beginPath();c.ellipse(0,0,70,30,0,0,Math.PI*2);c.fill();c.restore();
  sphere(149,475,26,29,['#8fcbd6','#3b96b0','#18496b']);sphere(149,475,12,17,['#243342','#050c19']);
  // Dark hourglass, gold sand.
  c.fillStyle='#17222c';c.fillRect(409,384,80,10);c.fillRect(409,550,80,10);
  c.strokeStyle='#17222c';c.lineWidth=3;c.beginPath();c.moveTo(413,390);c.lineTo(413,552);c.moveTo(485,390);c.lineTo(485,552);c.stroke();
  c.fillStyle='#8badae';c.beginPath();c.moveTo(416,398);c.lineTo(482,398);c.bezierCurveTo(480,432,458,452,455,471);c.bezierCurveTo(458,498,480,514,482,546);c.lineTo(416,546);c.bezierCurveTo(418,514,438,490,441,471);c.bezierCurveTo(438,451,418,432,416,398);c.fill();
  c.fillStyle='#d8b268';c.beginPath();c.moveTo(420,540);c.lineTo(449,501);c.lineTo(478,540);c.fill();
  // Petal-like porcelain cluster.
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;sphere(742+Math.cos(a)*39,475+Math.sin(a)*50,23,34,['#fff1de','#d5b3a4','#876469']);}
  sphere(741,475,22,27,['#edd4ad','#8d6d5a','#453f3c']);
  return canvas;
}
