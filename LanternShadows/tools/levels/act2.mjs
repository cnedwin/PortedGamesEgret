// Act two: the orchard of the peaches of immortality. A hundred cells long and twelve high; the turf is the bottom
// three rows. Left to right: the first tree and a peach to knock down, a shield-bearer to learn on, boughs with a
// crane over them, a climb through the branches, a raised bank held by a shield and a spear, and the last stretch
// to the moon gate. Peaches hang where a jump or a lifting blow can reach them.
import { grid } from '../level.mjs';

export const title = 'Act two: the Peach Orchard';
export const tiles = 'orchard';
export const level = grid(100, 12)
  .fill('X', 0, 9, 100, 3)
  // The way in.
  .put('S', 3, 8)
  .put('t', 9, 8)
  .hang('o', 11, 5)
  .put('h', 17, 8)
  // Boughs, and the first crane.
  .put('t', 23, 8)
  .fill('-', 21, 7, 3, 1)
  .hang('k', 27, 5)
  .put('s', 31, 8)
  .put('c', 35, 8)
  // The climb through the branches.
  .fill('-', 38, 7, 3, 1)
  .put('h', 40, 8)
  .put('t', 44, 8)
  .fill('-', 42, 5, 4, 1)
  .put('a', 44, 4)
  .hang('o', 40, 4)
  .fill('-', 47, 7, 3, 1)
  .hang('k', 50, 4)
  // The raised bank.
  .fill('X', 54, 8, 10, 1)
  .put('h', 57, 7)
  .put('s', 61, 7)
  .hang('k', 59, 3)
  .put('t', 67, 8)
  .hang('o', 69, 5)
  .put('c', 70, 8)
  // The last stretch.
  .put('s', 74, 8)
  .hang('k', 76, 4)
  .put('h', 78, 8)
  .put('t', 83, 8)
  .fill('-', 80, 7, 3, 1)
  .put('a', 81, 6)
  .hang('k', 85, 5)
  .hang('o', 86, 5)
  .put('c', 89, 8)
  .put('G', 94, 8);
