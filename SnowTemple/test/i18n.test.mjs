import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSnowLocale, normalizeLanguage } from '../src/i18n.mjs';
import { DIALOGUE } from '../src/dialogue.mjs';
import { TIERS, tierName } from '../src/rules/tiers.mjs';
import { AFFIXES } from '../src/rules/yard.mjs';
import { BOONS } from '../src/rules/boons.mjs';
import { LOOT, GRADES } from '../src/rules/tune.mjs';
import { createLessons } from '../src/lessons.mjs';

const cjk = /[\u3400-\u9fff]/;
function stringsOf(object) {
  return Object.values(object).flatMap(value =>
    value && typeof value === 'object' ? stringsOf(value) :
      typeof value === 'string' && cjk.test(value) ? [value] : []);
}

test('all original dialogue, lessons, tiers, boons, elite names and loot labels have English text', () => {
  const entries = stringsOf([DIALOGUE, TIERS, AFFIXES, BOONS, LOOT, GRADES]);
  for (const event of [
    { type: 'stage', stage: 'yard' }, { type: 'block' }, { type: 'guardBreak' },
    { type: 'stage', stage: 'boss' }, { type: 'slash', cut: 2 }, { type: 'dodge' },
    { type: 'glideStart' }, { type: 'drink' }, { type: 'ignite' }, { type: 'arrowStuck' }
  ]) entries.push(createLessons()(event));
  const lang = createSnowLocale('en');
  for (const entry of entries) {
    assert.ok(entry);
    assert.ok(lang.t(entry) && !cjk.test(lang.t(entry)), entry);
  }
  lang.set('zh');
  for (const entry of entries) assert.equal(lang.t(entry), entry);
});

test('dynamic chapter results and wave text remain localized without changing saved grades', () => {
  const lang = createSnowLocale('en');
  for (const label of [
    '守到第 23 拨', '第 12 拨', '最远第 9 拨',
    '第一回　完　' + tierName(7),
    '上面还有一重：' + tierName(2) + '。' + TIERS[1].text,
    '头目「' + AFFIXES.iron.name + '」　' + AFFIXES.iron.text,
    '习得　' + Object.values(BOONS)[0].name
  ]) assert.ok(!cjk.test(lang.t(label)), label + ' => ' + lang.t(label));
  assert.equal(lang.t('甲'), 'A');
  assert.equal(lang.set('other'), 'en');
  assert.equal(normalizeLanguage('bad', 'zh'), 'zh');
  lang.set('zh');
  assert.equal(lang.t('甲'), '甲');
});
