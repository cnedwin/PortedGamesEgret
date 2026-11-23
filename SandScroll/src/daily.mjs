import { ENDLESS } from './sim/sand.mjs';

const DAY_MS = 86_400_000;

/** Every player gets the same original scroll and piece sequence on a given UTC day. */
export function dailyChallenge(now = new Date()) {
  const dayIndex = Math.floor(now.getTime() / DAY_MS);
  return {
    day: now.toISOString().slice(0, 10),
    level: (dayIndex % ENDLESS + ENDLESS) % ENDLESS,
    seed: Math.imul(dayIndex, 0x9e3779b1) >>> 0 || 1
  };
}
