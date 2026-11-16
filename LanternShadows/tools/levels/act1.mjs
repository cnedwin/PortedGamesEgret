// Act one: the road to the Southern Gate of Heaven. Eighty cells long and twelve high; the terrace is the bottom
// three rows. Left to right: a post to try the staff on, the first soldiers and an archer on a stone step, a
// climb over clouds, a raised terrace held by three, and the guard before the gate.
import { grid } from '../level.mjs';

export const title = 'Act one: the Southern Gate';
export const level = grid(80, 12)
  .fill('X', 0, 9, 80, 3)
  // The beginning.
  .put('S', 3, 8)
  .put('p', 9, 8)
  // The first soldiers, and a step with an archer on it.
  .put('s', 18, 8)
  .fill('X', 22, 7, 4, 2)
  .put('a', 24, 6)
  .put('s', 29, 8)
  // The climb.
  .put('c', 32, 8)
  .fill('-', 34, 7, 4, 1)
  .fill('-', 39, 5, 4, 1)
  .put('a', 41, 4)
  .put('s', 40, 8)
  .fill('-', 44, 7, 4, 1)
  .put('p', 46, 6)
  // The raised terrace.
  .fill('X', 50, 8, 12, 1)
  .put('s', 53, 7)
  .put('s', 57, 7)
  .put('a', 60, 7)
  // The guard, and the gate.
  .put('c', 64, 8)
  .put('s', 68, 8)
  .put('s', 71, 8)
  .put('G', 75, 8);
