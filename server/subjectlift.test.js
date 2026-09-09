import test from 'node:test';
import assert from 'node:assert/strict';
import { coverRect, alphaBounds, refineAlpha, matteTensor } from '../js/tools/subjectlift-layout.js';

test('photo and silhouette cover the frame without gaps for landscape and portrait inputs', () => {
  for (const [w,h] of [[1600,900],[900,1600],[1080,720]]) for (const focus of [0,.5,1]) {
    const r = coverRect(w,h,0,720,1080,720,focus,focus);
    assert.ok(r.x <= 0 && r.y <= 720);
    assert.ok(r.x+r.w >= 1080 && r.y+r.h >= 1440);
    assert.equal(r.w/r.h,w/h);
  }
});

test('matte decoder accepts renamed single-output ONNX exports and rejects RGB or ambiguous outputs', () => {
  const matte = {dims:[1,1,512,512]};
  for (const name of ['logits','output_image','output']) assert.equal(matteTensor({[name]:matte}),matte);
  assert.throws(()=>matteTensor({}), /主体蒙版/);
  assert.throws(()=>matteTensor({a:matte,b:matte}), /主体蒙版/);
  assert.throws(()=>matteTensor({output:{dims:[1,3,512,512]}}), /主体蒙版/);
});

test('combined alpha bounds retain disconnected subjects and edge pixels', () => {
  const data = new Uint8ClampedArray(6*5*4);
  assert.equal(alphaBounds(data,6,5),null);
  data[(1*6+2)*4+3]=255;
  data[(4*6+5)*4+3]=200;
  data[3]=3; // ignore almost transparent fringe
  assert.deepEqual(alphaBounds(data,6,5),{x:2,y:1,w:4,h:4});
  data[3]=255;
  assert.deepEqual(alphaBounds(data,6,5),{x:0,y:0,w:6,h:5});
});

test('matte refinement preserves background, solid foreground and smooth monotonic edges', () => {
  assert.equal(refineAlpha(0),0); assert.equal(refineAlpha(255),255);
  assert.equal(refineAlpha(127,128,0),0); assert.equal(refineAlpha(128,128,0),255);
  assert.equal(refineAlpha(128,128,30),128);
  let last=0;
  for(let a=0;a<256;a++) { const next=refineAlpha(a); assert.ok(next>=last && next<=255); last=next; }
});
