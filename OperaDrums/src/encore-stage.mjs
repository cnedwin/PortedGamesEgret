import { GOLD, IVORY, rect } from './stage-drawing.mjs';

const BRIGHT = 0xffdc91;
const BRASS = 0xe89141;
const ROSE = 0xcb7168;
const CUES = {
  ready: { duration: 0.48, strength: 0.54, startScale: 1, endScale: 1.08 },
  start: { duration: 0.52, strength: 0.94, startScale: 0.97, endScale: 1.19 },
  end: { duration: 0.64, strength: 0.62, startScale: 1.10, endScale: 0.96 },
  break: { duration: 0.52, strength: 0.78, startScale: 1, endScale: 1 }
};

function rail(g, { laneTop, laneBottom, hitX }, color, strong) {
  const weight = strong ? 2 : 1;
  for (const y of [laneTop - weight, laneBottom]) {
    rect(g, color, 0, y - 2, 960, 5, strong ? 0.18 : 0.09);
    rect(g, color, 0, y, 960, weight, strong ? 0.85 : 0.68);
    rect(g, color, hitX - 59, y, 118, weight + 1, 0.9);
    rect(g, color, 12, y, 35, weight + 1, 0.74);
    rect(g, color, 913, y, 35, weight + 1, 0.74);
  }
}

function seal(g, color, radius, strong) {
  g.lineStyle(strong ? 2.5 : 1.5, color, 0.91).drawCircle(0, 0, radius).lineStyle(0);
  if (strong) g.lineStyle(1, color, 0.52).drawCircle(0, 0, radius + 4).lineStyle(0);
  rect(g, color, -6, -radius - 1, 12, strong ? 3 : 2);
  rect(g, color, -6, radius - 1, 12, strong ? 3 : 2);
  rect(g, color, -radius - 1, -3, strong ? 4 : 3, 6);
  rect(g, color, radius - 2, -3, strong ? 4 : 3, 6);
}

/** The Encore accents sit beneath the seals. All geometry is built once and the lane itself stays still. */
export function createEncoreStage(game, layer, layout) {
  function pair(lineColor, ringColor, radius, strong) {
    const edge = game.sprite(g => rail(g, layout, lineColor, strong), layer);
    const rim = game.sprite(g => seal(g, ringColor, radius, strong), layer);
    rim.x = layout.hitX;
    rim.y = layout.laneY;
    edge.visible = rim.visible = false;
    return { edge, rim };
  }
  const ready = pair(BRASS, GOLD, 50, false);
  const active = pair(GOLD, BRIGHT, 52, true);
  const flare = pair(BRIGHT, IVORY, 55, true);
  const release = pair(ROSE, ROSE, 52, false);
  let phase = 'charge';
  let pulse = null;
  let age = 0;
  const show = ({ edge, rim }, visible) => { edge.visible = rim.visible = visible; };

  function setEncorePhase(next) {
    if (next === phase) return;
    phase = next;
    show(ready, phase === 'ready');
    show(active, phase === 'active');
  }

  function paintPulse() {
    if (!pulse) return;
    const { art, duration, strength, startScale, endScale } = pulse;
    const fraction = Math.min(1, age / duration);
    const reduced = game.reducedMotion;
    const remaining = 1 - fraction;
    art.edge.alpha = remaining * strength * (reduced ? 0.64 : 1);
    art.rim.alpha = art.edge.alpha;
    art.rim.scaleX = art.rim.scaleY = reduced ? 1 : endScale + (startScale - endScale) * remaining * remaining;
    if (fraction === 1) {
      show(art, false);
      pulse = null;
    }
  }

  return {
    setEncorePhase,
    encoreCue(kind) {
      if (!CUES[kind]) return;
      if (pulse) show(pulse.art, false);
      const art = kind === 'break' ? release : flare;
      pulse = { art, ...CUES[kind] };
      age = 0;
      show(art, true);
      paintPulse();
    },
    step(seconds) {
      if (!pulse) return;
      age += seconds;
      paintPulse();
    },
    reset() {
      setEncorePhase('charge');
      show(flare, false);
      show(release, false);
      pulse = null;
    }
  };
}
