import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, NODES, project } from '../src/data/map.mjs';
import { buildTerritoryGrid, territoryPixels } from '../src/view/territory.mjs';

test('land ownership follows settlements and leaves open water uncoloured', () => {
  const { ids, grid, cols, rows } = buildTerritoryGrid();
  const at = (x, z) => grid[Math.floor(z / MAP.height * rows) * cols + Math.floor(x / MAP.width * cols)];
  assert.equal(ids[at(NODES.luoyang.x, NODES.luoyang.y)], 'luoyang');
  assert.equal(ids[at(NODES.chengdu.x, NODES.chengdu.y)], 'chengdu');
  const offshore = project(124.4, 28.1);
  assert.equal(at(offshore.x, offshore.y), -1);
});

test('borders separate factions and an ownership change joins contiguous territory', () => {
  const lands = { cols: 4, rows: 1, grid: new Int16Array([0, 1, 2, -1]) };
  const owners = ['shu', 'shu', 'wei'];
  const colour = id => id === 'shu' ? 0x39765d : 0x9a555f;
  const before = territoryPixels(lands, owners, colour);
  assert.equal(before[0], 0x39);
  assert(before[3] < before[7], 'a boundary cell has a stronger line');
  assert.equal(before[8], 0x9a);
  assert.equal(before[15], 0);
  owners[2] = 'shu';
  const conquered = territoryPixels(lands, owners, colour);
  assert.equal(conquered[7], conquered[3]);
  assert.equal(conquered[8], 0x39);
});
