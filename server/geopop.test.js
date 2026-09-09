import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateCounts, createLayout, copyFromCaption } from '../js/tools/geopop-layout.js';

test('geometry allocation preserves the total and excludes zero-weight sizes', () => {
  assert.deepEqual(allocateCounts(9, [25,45,30]), [2,4,3]);
  assert.deepEqual(allocateCounts(13, [0,70,30]), [0,9,4]);
  assert.deepEqual(allocateCounts(24, [100,0,0]), [24,0,0]);
  assert.deepEqual(allocateCounts(9, [0,0,0]), [0,0,0]);
  for (let total=1;total<=24;total++) {
    for (const weights of [[1,1,1],[10,90,0],[0,1,0],[99,1,1]]) {
      const counts=allocateCounts(total,weights);
      assert.equal(counts.reduce((a,b)=>a+b,0),total);
      counts.forEach((n,i)=>{assert.ok(Number.isInteger(n)&&n>=0);if(!weights[i])assert.equal(n,0);});
    }
  }
});

test('seeded layouts are reproducible with distinct size tiers and bounded anchors', () => {
  const config={seed:42,count:12,large:25,medium:50,small:25};
  const layout=createLayout(config);
  assert.deepEqual(layout,createLayout(config));
  assert.notDeepEqual(layout,createLayout({...config,seed:43}));
  assert.deepEqual([0,1,2].map(t=>layout.filter(x=>x.tier===t).length),[3,6,3]);
  for(const item of layout) {
    const [min,max]=[[.39,.57],[.19,.29],[.065,.13]][item.tier];
    assert.ok(item.w>=min&&item.w<=max);
    assert.ok(item.x>=.14&&item.x<=.86&&item.y>=.10&&item.y<=.90);
  }
  assert.equal(createLayout({...config,large:0,medium:0,small:0}).length,0);
});

test('copy retains the actual caption and does not invent a recognized subject on failure', () => {
  assert.equal(copyFromCaption('a white goose standing on the floor').title,'GOOSE\nPOISE');
  const street=copyFromCaption('a woman walking a dog on a street');
  assert.ok(street.body.startsWith('A woman walking a dog on a street.'));
  const unknown=copyFromCaption('a telescope beside the window');
  assert.equal(unknown.title,'TELESCOPE\nBESIDE');
  assert.throws(()=>copyFromCaption('  '));
});
