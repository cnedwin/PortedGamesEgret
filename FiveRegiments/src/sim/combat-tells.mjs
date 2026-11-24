import { ARTS, SKILLS } from './regiments.mjs';

export const facing = (line) => (line === 'L' ? 'R' : line === 'R' ? 'L' : line);
export const OPPONENT_WIND = 0.4;
export const CHARGED_RELEASE = 0.1;

// [commitment time, attack line, travel/reach for the tell]. Only the HUD reads the
// reaches here. The real strike/arrow continues to resolve in fight.mjs.
const repeated = (count, initial, gap, lines, reach) =>
  Array.from({ length: count }, (_, i) => [initial + i * gap, lines[i % lines.length], reach]);
const skillTells = {
  charge: [[0.48, 'T', SKILLS.charge.range]],
  bull: [[SKILLS.bull.wind, 'T', SKILLS.bull.range]],
  turning: [[0.28, 'R', SKILLS.turning.reach]],
  moon: [[0.18, 'L', SKILLS.moon.reach]],
  spin: [[0.30, 'R', SKILLS.spin.reach]],
  swing: repeated(SKILLS.swing.hits, 0.18, 0.20, ['R', 'L'], SKILLS.swing.reach),
  whirl: repeated(SKILLS.whirl.hits, 0.25, 0.30, ['R', 'L'], SKILLS.whirl.reach),
  mist: [[0.32, null, SKILLS.mist.radius + 2.2]],
  down: [[0.72, 'O', SKILLS.down.radius + SKILLS.down.ahead]],
  wave: [[0.38, null, SKILLS.wave.range]],
  leap: [[0.56, 'O', SKILLS.leap.dash + 0.8]],
  returnSpear: [[SKILLS.returnSpear.release, 'T', SKILLS.returnSpear.reach]],
  stepCut: [[0.38, 'R', SKILLS.stepCut.reach + SKILLS.stepCut.step]],
  flowers: repeated(SKILLS.flowers.hits, 0.16, 0.17, ['T'], SKILLS.flowers.reach),
  boar: [[0, 'T', 3.6], [0.6, 'T', 5.6]],
  drop: [[0.52, 'O', SKILLS.drop.radius + 2]],
  fan: [[0.42, null, 16]],
  gale: [[0.42, null, 18]],
  backStep: [[0.26, null, 15]],
  blast: [[0.55, null, 18]],
  web: [[0.36, null, 16]],
  volley: repeated(ARTS.volley.shots, 0.25, 0.2, [null], 18),
  finisher: [[0.28, 'T', ARTS.finisher.reach + 0.44]],
  shieldSlam: [[0.20, 'T', ARTS.shieldSlam.reach]],
  axeSmash: [[0.55, 'R', ARTS.axeSmash.reach]],
  poleAxeSmash: [[0.55, 'R', ARTS.poleAxeSmash.reach]]
};
const wide = new Set(['spin', 'turning', 'moon', 'whirl', 'down', 'drop', 'mist', 'leap']);
const ranged = new Set(['fan', 'gale', 'backStep', 'blast', 'web', 'volley', 'wave']);
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const angle = (n) => Math.atan2(Math.sin(n), Math.cos(n));

/** Extra readable preparation for an opponent's fastest attacks only. */
export function opponentSkillLead(id) {
  const first = skillTells[id]?.[0]?.[0];
  return first === undefined ? 0 : Math.max(0, OPPONENT_WIND - first);
}

/** Spread the existing preparatory pose over the extra time until the first contact. */
export function telegraphPoseTime(action) {
  if (!action?.leadTotal) return action?.t ?? 0;
  const first = action.kind === 'skill' ? skillTells[action.id]?.[0]?.[0]
    : action.kind === 'kick' ? 0.24 : ARTS.couch.wind;
  if (!first || action.t >= first) return action.t;
  const elapsed = action.leadTotal - (action.lead ?? 0) + action.t;
  return first * clamp01(elapsed / (action.leadTotal + first));
}

function readIntent(foe) {
  const a = foe.act;
  if (a?.kind === 'swing' && !a.struck) {
    const committed = a.driveAt !== undefined;
    const end = committed ? a.driveAt + CHARGED_RELEASE : a.wind;
    return {
      kind: a.kind, line: a.line, reach: a.reach, arc: a.blow.arc + 0.45,
      end, left: end - a.t, waiting: a.awaitingRelease || !committed && a.held > 0
    };
  }
  if (a?.kind === 'skill') {
    const charging = !a.met && (a.id === 'bull' && a.t < SKILLS.bull.wind + SKILLS.bull.run || a.id === 'boar' && a.t < 0.42);
    const beats = skillTells[a.id];
    const beat = charging ? beats[0] : beats?.find(([time]) => time > a.t + 1e-6);
    if (!beat) return null;
    const [time, line, reach] = beat;
    const shot = ranged.has(a.id);
    return { kind: shot ? 'bow' : 'skill', id: a.id, line, reach, arc: wide.has(a.id) ? Math.PI : shot ? 0.72 : 1.2,
      end: time + (a.leadTotal ?? 0), left: time + (a.lead ?? 0) - a.t };
  }
  if (a?.kind === 'kick' && a.t < 0.24) {
    return { kind: 'kick', line: null, reach: 1.45, arc: 1.15, end: 0.24 + (a.leadTotal ?? 0), left: 0.24 + (a.lead ?? 0) - a.t };
  }
  if (a?.kind === 'lance' && !a.met && a.t < ARTS.couch.wind + ARTS.couch.last && foe.horse.speed > 0) {
    const wind = ARTS.couch.wind;
    return { kind: 'lance', id: 'couch', line: 'T', reach: ARTS.couch.reach + foe.horse.speed * 0.35, arc: 0.75,
      face: foe.horse.face + ARTS.couch.aim, end: wind + (a.leadTotal ?? 0), left: wind + (a.lead ?? 0) - a.t };
  }
  if (foe.draw && foe.r.bow) {
    const end = foe.r.bow.draw;
    return { kind: 'bow', line: null, reach: 18, arc: 0.65, end, left: end - foe.draw.t, waiting: true };
  }
  return null;
}

/** Imminent attacks take priority when two opponents prepare visible blows. */
export function incomingAttack({ hero, men }) {
  let best = null;
  let priority = Infinity;
  for (const foe of men) {
    if (!foe.alive || foe.stun > 0 || foe.side === hero.side) continue;
    const intent = readIntent(foe);
    if (!intent) continue;
    const dx = hero.x - foe.x, dz = hero.z - foe.z;
    const distance = Math.hypot(dx, dz);
    const toHero = Math.atan2(dx, dz);
    if (distance > intent.reach + hero.body + 0.9 || Math.abs(angle(toHero - (intent.face ?? foe.face))) > intent.arc) continue;
    const rank = Math.max(0, intent.left) + distance * 0.025 + (intent.waiting ? 0.16 : 0);
    if (rank >= priority) continue;
    const fromFront = Math.abs(angle(toHero + Math.PI - hero.face)) <= 78 * Math.PI / 180;
    const line = fromFront ? facing(intent.line) : null;
    best = { kind: intent.kind, id: intent.id ?? null, line, progress: clamp01(1 - Math.max(0, intent.left) / intent.end), who: foe.id };
    priority = rank;
  }
  return best;
}
