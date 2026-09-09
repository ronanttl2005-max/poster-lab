import test from 'node:test';
import assert from 'node:assert/strict';
import {maskRows, freeSpans} from '../js/tools/typeflow-layout.js';

test('contour follows occupied rows rather than the enclosing rectangle', () => {
  const rows = maskRows(Uint8Array.from([0,0,255,0,0, 0,255,255,255,0, 255,255,255,255,255]),5,3,1);
  assert.deepEqual(rows,[[2,3],[1,4],[0,5]]);
  const item={rect:{x:10,y:10,w:50,h:30},rows,sourceWidth:5,sourceHeight:3};
  assert.deepEqual(freeSpans([item],10,19,0,100,0),[[0,30],[40,100]]);
  assert.deepEqual(freeSpans([item],30,39,0,100,0),[[0,10],[60,100]]);
  assert.deepEqual(freeSpans([item],0,9,0,100,0),[[0,100]]);
});

test('overlapping subjects merge, gap and scaled rows protect the whole line', () => {
  const item={rect:{x:20,y:10,w:30,h:30},rows:[[0,3],[1,2],[0,3]],sourceWidth:3,sourceHeight:3};
  const next={...item,rect:{...item.rect,x:45}};
  assert.deepEqual(freeSpans([next,item],10,40,0,100,5),[[0,15],[80,100]]);
  assert.deepEqual(freeSpans([item],10,40,25,45,0),[]);
});

test('empty alpha and hollow shapes keep reliable envelopes',()=>{
  assert.deepEqual(maskRows(new Uint8Array(16),2,2),[null,null]);
  assert.deepEqual(maskRows(Uint8Array.from([255,0,0,255]),4,1,1),[[0,4]]);
  assert.deepEqual(freeSpans([],0,20,5,100),[[5,100]]);
});
