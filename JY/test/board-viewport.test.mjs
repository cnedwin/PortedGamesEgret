import test from 'node:test';
import assert from 'node:assert/strict';
import { containBoard, boardPoint, designPoint } from '../web/board-viewport.mjs';

test('legacy board stays centered when the engine expands the stage', () => {
  assert.deepEqual(containBoard({x:-80,y:0,width:800,height:360},640,360),
    {x:0,y:0,width:640,height:360,scale:1});
  const board=containBoard({x:0,y:0,width:360,height:640},640,360);
  assert.equal(board.width,360);
  assert.equal(board.height,202.5);
  assert.equal(board.y,218.75);
  assert.equal(board.scale,.5625);
});
test('board coordinates roundtrip after orientation and points outside the board cannot select a tile',()=>{
  const board=containBoard({x:-20,y:-30,width:400,height:700},640,360);
  const p=boardPoint(board,172,224);
  assert.deepEqual(designPoint(board,p.x,p.y),{x:172,y:224});
  assert.equal(designPoint(board,board.x,board.y-1),undefined);
  assert.equal(designPoint(board,board.x+board.width+1,board.y),undefined);
});
