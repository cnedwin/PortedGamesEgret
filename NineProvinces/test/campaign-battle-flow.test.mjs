import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from '../src/sim/world.mjs';
import { muster, finishBattle } from '../src/sim/military.mjs';
import { along, routeLine } from '../src/sim/ways.mjs';
import { campaignBattleBriefing, captureCampaignBattle, campaignBattleAftermath, campaignAftermathView, campaignBattlePresentation } from '../src/ui/campaign-battle.mjs';

function siege(troops = 4000) {
  const state = createGame({ seed: 31, faction: 'liubei', branch: 'free' });
  const start = muster(state, state.player, 'pingyuan', { commander: 'liubei', troops });
  assert.equal(start.ok, true);
  const army = state.armies[start.army];
  Object.assign(army, { at: 'nanpi', cameFrom: 'pingyuan', besieging: 'nanpi', target: 'nanpi', path: [] });
  const setup = { id: 'b-flow', kind: 'siege', place: { node: 'nanpi' }, special: null,
    factions: [state.player, state.nodes.nanpi.owner],
    units: [{ side: 0, army: army.id, general: 'liubei', deputies: [], troops },
      { side: 1, garrison: 'nanpi', general: null, deputies: [], troops: state.nodes.nanpi.troops }] };
  const result = { winner: 0, why: 'keep', gateTaken: true, units: [{ troops: 3000, morale: 70, fates: {} }, { troops: 0, morale: 0, fates: {} }], seconds: 90 };
  return { state, setup, result, army };
}

test('briefing totals are relative to the player and describe the unchanged asymmetric objectives', () => {
  const { setup } = siege();
  const before = JSON.stringify(setup);
  const attack = campaignBattleBriefing(setup, setup.factions[0]);
  const defence = campaignBattleBriefing(setup, setup.factions[1]);
  assert.equal(attack.ours.troops, 4000);
  assert.equal(defence.enemy.troops, 4000);
  assert.match(attack.objective[0], /10秒/);
  assert.match(defence.objective[0], /日落/);
  assert.match(campaignBattleBriefing({ ...setup, special: 'wuchao' }, setup.factions[0]).objective[0], /粮仓/);
  assert.equal(JSON.stringify(setup), before);
});

test('after a real settlement, presentation reports the actual captured city, garrison and surviving army without settling twice', () => {
  const { state, setup, result, army } = siege();
  const context = captureCampaignBattle(state, setup);
  finishBattle(state, setup, result);
  const after = JSON.stringify(state);
  const report = campaignBattleAftermath(state, setup, result, context);
  assert.equal(report.place.changed, true);
  assert.equal(report.place.owner, state.player);
  assert.equal(report.place.garrison, state.nodes.nanpi.troops);
  assert.equal(report.armies[0].troops, state.armies[army.id].troops);
  assert.equal(report.armies[0].fieldRemaining, 3000);
  assert.equal(report.armies[0].disposition, 'stationed');
  assert.deepEqual(report.returnView.selection, { node: 'nanpi' });
  assert.deepEqual(campaignAftermathView(state, report, { kind: 'inspect-garrison', army: army.id }).selection, { army: army.id });
  assert.deepEqual(campaignAftermathView(state, report, { kind: 'inspect-garrison', army: 'unrelated' }), report.returnView);
  assert.equal(state.stats.battlesWon, 1);
  assert.equal(JSON.stringify(state), after);
  assert.deepEqual(campaignBattleAftermath(state, setup, result, context), report);
});

test('defeat follows a surviving retreating army instead of leaving a stale battle-city selection', () => {
  const { state, setup, result, army } = siege();
  const context = captureCampaignBattle(state, setup);
  result.winner = 1;
  result.why = 'retreat';
  result.gateTaken = false;
  result.units[1].troops = setup.units[1].troops;
  finishBattle(state, setup, result);
  const report = campaignBattleAftermath(state, setup, result, context);
  assert.equal(report.armies[0].disposition, 'withdrawing');
  assert.equal(report.armies[0].target, 'pingyuan');
  assert.deepEqual(report.returnView.selection, { army: army.id });
  assert.deepEqual(campaignAftermathView(state, report, { kind: 'inspect-town', node: 'pingyuan' }).selection, { node: 'pingyuan' });
  assert.equal(report.place.changed, false);
  assert.ok(Number.isFinite(report.returnView.camera.x));
});

test('taking Nanpi ends every friendly siege at once without spending another campaign day', () => {
  const { state, setup, result, army } = siege();
  const support = muster(state, state.player, 'pingyuan', { commander: 'zhangfei', troops: 1200 });
  assert.equal(support.ok, true);
  const reinforcement = state.armies[support.army];
  Object.assign(reinforcement, { at: 'nanpi', target: 'nanpi', path: [], besieging: 'nanpi', inBattle: setup.id });
  setup.units.splice(1, 0, { side: 0, army: reinforcement.id, general: 'zhangfei', deputies: [], troops: 1200 });
  result.units.splice(1, 0, { troops: 1200, morale: 70, fates: {} });
  const before = captureCampaignBattle(state, setup);
  const day = state.day;
  finishBattle(state, setup, result);
  const report = campaignBattleAftermath(state, setup, result, before);
  assert.equal(state.day, day);
  assert.equal(state.nodes.nanpi.owner, state.player);
  assert.equal(reinforcement.troops, 1200);
  assert.deepEqual([army.besieging, reinforcement.besieging, reinforcement.target, reinforcement.inBattle], [null, null, null, null]);
  assert.ok(report.armies.every(row => row.disposition === 'stationed'));
});

test('winning an engagement does not falsely report taking a city that is still being besieged', () => {
  const { state, setup, result } = siege();
  const context = captureCampaignBattle(state, setup);
  result.gateTaken = false; result.why = 'broken';
  finishBattle(state, setup, result);
  const report = campaignBattleAftermath(state, setup, result, context);
  assert.equal(report.place.changed, false);
  assert.equal(report.place.owner, setup.factions[1]);
  assert.equal(report.armies[0].disposition, 'besieging');
  assert.equal(report.won, true);
  assert.deepEqual(report.returnView.selection, { army: report.armies[0].id });
});

test('a road retreat returns the camera to the army actual reversed-link position', () => {
  const { state, setup, result, army } = siege();
  setup.place = { link: ['pingyuan', 'nanpi'] };
  army.at = null;
  army.link = { from: 'pingyuan', to: 'nanpi', kind: 'land', length: 100, done: 70 };
  const context = captureCampaignBattle(state, setup);
  result.winner = 1; result.gateTaken = false;
  finishBattle(state, setup, result);
  const report = campaignBattleAftermath(state, setup, result, context);
  const point = along(routeLine(army.link.from, army.link.to), army.link.done / army.link.length);
  assert.deepEqual(report.returnView.selection, { army: army.id });
  assert.equal(report.returnView.camera.x, point.x);
  assert.equal(report.returnView.camera.z, point.z);
});

test('dissolved armies and missing old presentation context degrade safely without altering old battle recordings', () => {
  const { state, setup, result, army } = siege(1000);
  result.winner = 1; result.gateTaken = false; result.units[0].troops = 0;
  finishBattle(state, setup, result);
  assert.equal(state.armies[army.id], undefined);
  const oldTape = { version: 1, setup, frames: [], actions: [] };
  const oldBytes = JSON.stringify(oldTape);
  const report = campaignBattleAftermath(state, setup, result);
  assert.equal(report.armies[0].disposition, 'dissolved');
  assert.deepEqual(report.returnView.selection, { node: 'nanpi' });
  assert.equal(report.fameDelta, null);
  assert.equal(JSON.stringify(oldTape), oldBytes);
});

test('an already-settled campaign ending is exposed without advancing an extra world day', () => {
  const { state, setup, result } = siege();
  state.over = { kind: 'fallen', day: state.day };
  const before = JSON.stringify(state);
  const report = campaignBattleAftermath(state, setup, result);
  assert.deepEqual(report.ending, state.over);
  assert.notEqual(report.ending, state.over);
  assert.equal(JSON.stringify(state), before);
});

test('Nanpi presentation applies only to the player assault and does not change the battle snapshot', () => {
  const { state, setup } = siege();
  const before = JSON.stringify(setup);
  assert.deepEqual(campaignBattlePresentation(state, setup), { ...setup, presentation: 'nanpi-sunset' });
  assert.equal(JSON.stringify(setup), before);
  assert.strictEqual(campaignBattlePresentation({ player: setup.factions[1] }, setup), setup);
  const field = { ...setup, kind: 'field' };
  assert.strictEqual(campaignBattlePresentation(state, field), field);
});
