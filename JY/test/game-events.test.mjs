import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGameScript, runGameScript } from '../src/cifa-game.mjs';
import { playGameEvent } from '../src/game-events.mjs';

function scene(id) {
  return {
    id, width: 1, height: 1,
    events: [{ x: 0, y: 0, event1: -1, event2: -1, event3: -1, cannotWalk: 0, index: 0,
      currentPic: -1, beginPic: -1, endPic: -1, picDelay: 0 }],
    layers: Object.fromEntries(['earth', 'building', 'decoration', 'eventIndex', 'buildingHeight', 'decorationHeight']
      .map(name => [name, new Int16Array(1)])),
  };
}

test('the tournament keeps its solo rule and restores original recruit events when companions leave', async () => {
  const home = scene(70);
  const returns = new Map([[0, scene(0)], [40, scene(40)]]);
  const departures = new Map([
    [950, parseGameScript('Talk("離隊",0,1); LeaveTeam(1); ModifyEvent(0,0,1,1,951,-1,-1,5166,5166,5166,0,-2,-2);')],
    [972, parseGameScript('Talk("離隊",0,1); LeaveTeam(38); ModifyEvent(40,0,1,1,973,-1,-1,6410,6410,6410,0,-2,-2);')],
  ]);
  const shown = [];
  const party = [0, 1, 38];
  const progress = await playGameEvent({
    program: parseGameScript('Talk("邀請",0,1); AllLeave();'), run: runGameScript,
    game: { party, inventory: new Map(), roleState: [], scenePatches: new Map() },
    catalog: { leaveEvents: new Map([[1, 950], [38, 972]]) },
    sceneId: 70, eventSlot: 0,
    view: {
      getScene: id => id === 70 ? home : returns.get(id),
      getProgram: id => departures.get(id),
      talk: text => shown.push(text),
    },
  });
  assert.deepEqual(shown, ['邀請']);
  assert.deepEqual(progress.party, [0]);
  assert.deepEqual(party, [0, 1, 38]);
  assert.equal(returns.get(0).events[0].event1, -1);
  assert.equal(progress.scenePatches.get(0).events[0][1].event1, 951);
  assert.equal(progress.scenePatches.get(40).events[0][1].event1, 973);
  assert.equal(progress.shouldSave, true);
});
