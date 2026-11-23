import test from 'node:test';
import assert from 'node:assert/strict';
import { homeCity } from '../src/view/home-city.mjs';

const campaign = () => ({
  player: 'liubei',
  factions: { liubei: { capital: 'xiakou' } },
  nodes: {
    xiakou: { owner: 'liubei' },
    pingyuan: { owner: 'liubei' },
    luoyang: { owner: 'caocao' },
    hulao: { owner: 'liubei' }
  }
});

test('returning to friendly territory prefers the last owned city and otherwise the capital', () => {
  const state = campaign();
  assert.equal(homeCity(state, 'pingyuan'), 'pingyuan');
  assert.equal(homeCity(state, 'luoyang'), 'xiakou');
  assert.equal(homeCity(state, 'hulao'), 'xiakou');
});

test('losing the remembered city or capital still lets the player return to remaining territory', () => {
  const state = campaign();
  state.nodes.xiakou.owner = 'caocao';
  assert.equal(homeCity(state, 'xiakou'), 'pingyuan');
  state.nodes.pingyuan.owner = 'caocao';
  assert.equal(homeCity(state, 'pingyuan'), 'hulao');
  state.nodes.hulao.owner = 'caocao';
  assert.equal(homeCity(state, 'hulao'), null);
});
