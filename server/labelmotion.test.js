import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentKit, makeLabels, arrangeLabels, validQuad, quadProject, moveLabel } from '../js/tools/labelmotion-layout.js';

test('content generation preserves short user phrases and matches themed icons',()=>{
  const kit=contentKit('叶材日常','植物，自然生长');
  assert.ok(kit.words.includes('叶材日常'));
  assert.ok(kit.icons.includes('leaf'));
  assert.ok(contentKit('咖啡').icons.includes('cup'));
  assert.equal(makeLabels('A\n\nB','城市').length,2);
  assert.equal(makeLabels(Array(30).fill('长标签').join('\n'),'').length,18);
});
test('every automatic layout is deterministic, bounded and free from label overlaps',()=>{
  const labels=makeLabels(Array.from({length:18},(_,i)=>'标签'+i).join('\n'),'城市');
  for(const mode of ['scatter','diagonal','grid'])for(let seed=1;seed<=30;seed++){
    const items=arrangeLabels(labels,seed,mode);
    assert.deepEqual(items,arrangeLabels(labels,seed,mode));
    for(const a of items){
      assert.ok(a.x>=26&&a.x+a.w<=724&&a.y>=245&&a.y+a.h<=935);
      for(const b of items)if(a!==b)assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
    }
  }
});
test('perspective maps all corners and preserves straight lines',()=>{
  const q=[{x:20,y:30},{x:320,y:60},{x:250,y:500},{x:40,y:450}];
  assert.ok(validQuad(q));
  [[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],i)=>{
    const p=quadProject(q,u,v);assert.ok(Math.abs(p.x-q[i].x)<1e-7);assert.ok(Math.abs(p.y-q[i].y)<1e-7);
  });
  const a=quadProject(q,0,.5), b=quadProject(q,.5,.5), c=quadProject(q,1,.5);
  assert.ok(Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))<1e-7);
  assert.equal(validQuad([q[0],q[2],q[1],q[3]]),false);
  assert.equal(validQuad(Array(4).fill({x:0,y:0})),false);
});
test('dragging stays within the label area',()=>{
  const item={x:50,y:300,w:180,h:82};
  assert.deepEqual(moveLabel(item,-100,-100),{...item,x:26,y:245});
  assert.deepEqual(moveLabel(item,2000,2000),{...item,x:544,y:853});
});
