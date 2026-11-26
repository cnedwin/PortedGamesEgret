import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../src/sim.mjs';
import { CHAPTERS_SCRIPT } from '../src/story/chapters.mjs';
import { qinggeFestivalRoute, qinggeFestivalPreparation, qinggeFestivalEpilogue } from '../src/story/qingge-festival.mjs';

test('the same budget bookmark can lead to two preparations and festival tails', () => {
  const term = sim.newGame({ seed: 127 });
  sim.finishChapter(term, 'qingge', 2);
  const bookmark = sim.serialize(term);
  const choices = CHAPTERS_SCRIPT.qingge[3].find(step => step[0] === 'pick')[1];
  const routes = choices.map(choice => {
    const replay = sim.deserialize(bookmark);
    sim.applyEffect(replay, 'qingge', choice.fx);
    return {
      id: qinggeFestivalRoute(replay),
      preparation: qinggeFestivalPreparation(replay),
      epilogue: qinggeFestivalEpilogue(replay),
    };
  });
  assert.deepEqual(routes.map(route => route.id), ['review', 'rehearsal']);
  assert.ok(routes.every(route => route.preparation.length && route.epilogue.length));
  assert.notDeepEqual(routes[0].preparation, routes[1].preparation);
  assert.notDeepEqual(routes[0].epilogue, routes[1].epilogue);
  assert.equal(sim.serialize(term), bookmark);
});

test('legacy terms retain the honest choice or play the original ending without a recorded choice', () => {
  const term = sim.newGame({ seed: 77 });
  const unmarked = sim.deserialize(sim.serialize(term));
  assert.deepEqual(qinggeFestivalPreparation(unmarked), []);
  assert.deepEqual(qinggeFestivalEpilogue(unmarked), []);
  term.flags.qingge_honest = true;
  const honest = sim.deserialize(sim.serialize(term));
  assert.equal(qinggeFestivalRoute(honest), 'review');
  assert.ok(qinggeFestivalEpilogue(honest).length);
});
