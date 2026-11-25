import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { CAMPAIGN, campaignChapter, campaignSetup } = await import('../src/sim/campaign.mjs');
const { mapById } = await import('../src/sim/maps.mjs');
const { createGame, cloneGame } = await import('../src/sim/rules.mjs');
const { SAVE_KEY, openSave, campaignProgressOf, campaignChapterUnlocked, campaignBattleOf, keepCampaignBattle, clearCampaignBattle, recordCampaignResult } = await import('../src/saves.mjs');

function storage(initial) {
  const items = new Map(initial);
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key)
  };
}

function match(setup) {
  return { setup, game: cloneGame(createGame(mapById(setup.map), setup.sides, setup.seed)) };
}

test('all three story chapters have bilingual scenarios with valid seeded battles', () => {
  assert.deepEqual(CAMPAIGN.map((chapter) => chapter.map), ['wheat', 'coves', 'spine']);
  assert.deepEqual(CAMPAIGN.map((chapter) => chapter.fog), [false, true, true]);
  assert.equal(campaignChapter('missing'), null);
  assert.equal(campaignSetup('missing'), null);
  for (const chapter of CAMPAIGN) {
    for (const key of ['title', 'brief', 'objective', 'after']) {
      assert.ok(chapter[key].zh.trim());
      assert.ok(chapter[key].en.trim());
    }
    const setup = campaignSetup(chapter.id);
    const { game } = match(setup);
    assert.equal(setup.campaign, chapter.id);
    assert.equal(game.map, chapter.map);
    assert.equal(game.players[setup.human].commander, chapter.you);
    assert.deepEqual(match(setup), match(campaignSetup(chapter.id)));
  }
});

test('v1 saves migrate with settings, skirmish and its record intact', () => {
  const { campaign, ...setup } = campaignSetup('ford');
  const v1 = { settings: { language: 'en', music: false }, battle: match(setup), record: { won: 2, lost: 1 }, lastSetup: { map: 'wheat' } };
  const store = storage([[SAVE_KEY, JSON.stringify({ version: 1, data: v1 })]]);
  const migrated = openSave(store);
  assert.equal(JSON.parse(store.getItem(SAVE_KEY)).version, 2);
  for (const key of Object.keys(v1)) assert.deepEqual(migrated.data[key], v1[key]);
  assert.deepEqual(campaignProgressOf(migrated.data), { completed: [], next: 'ford', complete: false });
  assert.equal(campaignBattleOf(migrated.data), null);
});

test('campaign defeats, wins, saves and retries do not overwrite a skirmish', () => {
  const store = storage();
  let save = openSave(store);
  const ford = match(campaignSetup('ford'));
  const coves = match(campaignSetup('coves'));
  const pass = match(campaignSetup('pass'));
  const skirmish = { ...ford, setup: { ...ford.setup } };
  delete skirmish.setup.campaign;
  assert.equal(campaignChapterUnlocked(save.data, 'ford'), true);
  assert.equal(campaignChapterUnlocked(save.data, 'coves'), false);
  save.update((data) => {
    data.battle = skirmish;
    assert.equal(keepCampaignBattle(data, coves), false);
    assert.equal(keepCampaignBattle(data, ford), true);
  });
  save = openSave(store);
  assert.deepEqual(save.data.battle, skirmish);
  assert.deepEqual(campaignBattleOf(save.data), ford);
  save.update((data) => {
    assert.equal(recordCampaignResult(data, 'coves', true).next, 'ford');
    assert.deepEqual(campaignBattleOf(data), ford);
    assert.equal(recordCampaignResult(data, 'ford', false).next, 'ford');
    assert.equal(campaignBattleOf(data), null);
    assert.equal(recordCampaignResult(data, 'ford', true).next, 'coves');
    assert.equal(recordCampaignResult(data, 'ford', true).next, 'coves');
    assert.equal(keepCampaignBattle(data, coves), true);
    assert.equal(recordCampaignResult(data, 'coves', true).next, 'pass');
    assert.equal(keepCampaignBattle(data, pass), true);
    clearCampaignBattle(data);
    assert.equal(campaignBattleOf(data), null);
    assert.equal(recordCampaignResult(data, 'pass', true).complete, true);
  });
  save = openSave(store);
  assert.deepEqual(campaignProgressOf(save.data), { completed: ['ford', 'coves', 'pass'], next: null, complete: true });
  assert.deepEqual(save.data.battle, skirmish);
  assert.deepEqual(save.data.record, { won: 0, lost: 0, byMap: {} });
});
