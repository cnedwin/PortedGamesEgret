import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterFoundingOfficers } from '../src/ui/founding.mjs';

const officers = [
  { ref: 'history:zhaoyun', id: 'zhaoyun', zh: '赵云', en: 'Zhao Yun' },
  { ref: 'history:guanyu', id: 'guanyu', zh: '关羽', en: 'Guan Yu' },
  { ref: 'roster:u1', id: 'u1', zh: '叶听雨', en: 'Ye Tingyu' }
];

test('founding search accepts names and spaced pinyin without changing the chosen officer', () => {
  assert.deepEqual(filterFoundingOfficers(officers, 'ｚｈａｏ ｙｕｎ', 'history:guanyu').map(g => g.ref), ['history:zhaoyun', 'history:guanyu']);
  assert.deepEqual(filterFoundingOfficers(officers, '听雨', 'history:guanyu').map(g => g.ref), ['history:guanyu', 'roster:u1']);
  assert.equal(officers.length, 3);
});

test('companion search keeps a selected companion but excludes the ruler and other companions', () => {
  assert.deepEqual(filterFoundingOfficers(officers, 'nothing', 'roster:u1', ['history:guanyu']).map(g => g.ref), ['roster:u1']);
  assert.deepEqual(filterFoundingOfficers(officers, '', '', ['history:guanyu', 'roster:u1']).map(g => g.ref), ['history:zhaoyun']);
});
