// Act three: the Tushita Palace, where Laozi refines his elixir. A hundred and twenty-eight cells long and twelve high; the
// floor is the bottom three rows. Left to right: the first grate that breathes fire, a furnace to knock over onto
// a boy with a fan, galleries with an alchemist on them, a run of grates, a raised floor held by the household,
// the last stretch, and the court before the door, where Laozi himself is waiting. Peaches are few here.
import { grid } from '../level.mjs';

export const title = 'Act three: the Tushita Palace';
export const tiles = 'palace';
export const level = grid(128, 12)
  .fill('X', 0, 9, 128, 3)
  // The way in: one grate to learn the fire's turn on.
  .put('S', 3, 8)
  .put('v', 10, 8)
  // A furnace, and a boy with a fan beyond it to knock it onto.
  .put('f', 16, 8)
  .put('n', 20, 8)
  .put('s', 25, 8)
  // Galleries, with an alchemist looking down.
  .fill('-', 29, 7, 3, 1)
  .fill('-', 33, 5, 4, 1)
  .put('d', 35, 4)
  .put('v', 34, 8)
  .put('h', 39, 8)
  .put('c', 43, 8)
  // A run of grates, fanned from the far end.
  .put('v', 47, 8)
  .put('v', 51, 8)
  .put('v', 55, 8)
  .put('n', 59, 8)
  .hang('o', 53, 5)
  .fill('-', 49, 6, 5, 1)
  // The raised floor.
  .fill('X', 63, 8, 12, 1)
  .put('f', 65, 7)
  .put('d', 68, 7)
  .put('s', 71, 7)
  .put('n', 73, 7)
  .put('c', 78, 8)
  // The last stretch.
  .put('v', 82, 8)
  .put('h', 85, 8)
  .put('f', 88, 8)
  .put('d', 91, 8)
  .fill('-', 89, 6, 4, 1)
  .put('a', 91, 5)
  .put('c', 95, 8)
  .hang('o', 98, 5)
  // The court before the door, with two grates in its floor.
  .put('c', 104, 8)
  .put('v', 109, 8)
  .put('v', 119, 8)
  .put('L', 115, 8)
  .put('G', 123, 8);
