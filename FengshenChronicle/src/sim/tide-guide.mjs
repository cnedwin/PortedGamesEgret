import { forecastHits } from './campaign-ai.mjs';
import { clearLine } from './world.mjs';

const clearance = 6;
const reactionMargin = 0.05;
const samples = 96;
const angleStep = 2 * Math.PI / samples;
const compass = ['右', '右下', '下', '左下', '左', '左上', '上', '右上'];

// Presentation only. Search for a straight walk to the safe side of the ring
// using the same terrain check as movement, with a little room for the stick.
function walkToRing(mapId, hero, mark, radius, budget, heading) {
  let best = null;
  let nearest = budget;
  for (let index = 0; index < samples; index++) {
    const angle = heading + index * angleStep;
    const x = mark.x + Math.cos(angle) * radius;
    const y = mark.y + Math.sin(angle) * radius;
    const distance = Math.hypot(x - hero.x, y - hero.y);
    if (distance >= nearest) continue;
    const target = {x, y};
    if (!clearLine(mapId, hero, target, hero.radius + clearance)) continue;
    nearest = distance;
    best = target;
  }
  return best;
}

function withDirection(kind, hero, target) {
  const octant = Math.round(Math.atan2(target.y - hero.y, target.x - hero.x) / (Math.PI / 4));
  return {kind, target, direction: compass[(octant + 8) % 8]};
}

export function tideEscapeGuide(mapId, hero, mark) {
  if (mark?.kind !== 'undertow') return null;
  if (!forecastHits(hero, mark, hero.radius)) return {kind:'safe'};
  const budget = hero.speed * Math.max(0, mark.remaining - reactionMargin);
  const heading = Math.atan2(hero.y - mark.y, hero.x - mark.x);
  const outer = walkToRing(mapId, hero, mark, mark.radius + hero.radius + clearance, budget, heading);
  if (outer) return withDirection('outer', hero, outer);
  const inner = walkToRing(mapId, hero, mark, Math.max(0, mark.innerRadius - hero.radius - clearance), budget, heading);
  return inner ? withDirection('inner', hero, inner) : null;
}
