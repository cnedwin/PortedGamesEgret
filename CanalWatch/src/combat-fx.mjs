import { GATES, RAIDERS, WIDTH } from './sim/data.mjs';
import { WAYS } from './sim/world.mjs';

const INK = 0x172425;
const SILK = 0xffecc3;
const AMBER = 0xffbe61;
const VERMILION = 0xe75a37;
const JADE = 0xb1eedf;
const BLUE = 0x6ab9ba;
const GOLD = 0xe7aa50;

function polygon(g, color, points, alpha = 1) {
  const [x, y] = points[0];
  g.beginFill(color, alpha).moveTo(x, y);
  for (const [px, py] of points.slice(1)) g.lineTo(px, py);
  g.lineTo(x, y).endFill();
}

function stroke(g, points, width, color, alpha = 1) {
  const [x, y] = points[0];
  g.lineStyle(width, color, alpha, { joints: 'round', caps: 'round' }).moveTo(x, y);
  for (const [px, py] of points.slice(1)) g.lineTo(px, py);
  g.lineStyle(0);
}

function ring(g, radius, width, color, alpha = 1) {
  g.lineStyle(width, color, alpha).drawCircle(0, 0, radius).lineStyle(0);
}

function shards(g, color, count, extent, start = 8) {
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count + .23;
    const x = Math.cos(angle), y = Math.sin(angle);
    const far = extent * (i % 3 === 0 ? 1 : .74);
    polygon(g, color, [[x * start - y * 2.4, y * start + x * 2.4],
      [x * far, y * far], [x * start + y * 1.4, y * start - x * 1.4]], .9);
  }
}

const painters = {
  bolt(g) {
    polygon(g, BLUE, [[-12, 0], [5, -5], [25, 0], [5, 5]], .7);
    polygon(g, SILK, [[-3, 0], [9, -2.6], [22, 0], [9, 2.6]]);
    stroke(g, [[-7, -6], [7, -7], [17, -4]], 1.35, JADE, .85);
    stroke(g, [[-7, 6], [7, 7], [17, 4]], 1.35, JADE, .85);
  },
  arrow(g) {
    ring(g, 10, 1.5, INK, .65);
    shards(g, JADE, 7, 22, 5);
    polygon(g, SILK, [[-6, 0], [0, -6], [6, 0], [0, 6]]);
  },
  shield(g) {
    ring(g, 12, 3, INK, .75);
    ring(g, 11.5, 1.45, SILK, .9);
    shards(g, GOLD, 9, 28, 7);
    polygon(g, SILK, [[-10, 0], [0, -4], [9, 0], [0, 4]]);
  },
  stone(g) {
    g.beginFill(INK, .4).drawCircle(0, 0, 16).endFill();
    ring(g, 16, 3.4, INK, .65);
    ring(g, 15, 2, AMBER, .93);
    ring(g, 9, 2, 0xb79a73, .65);
    shards(g, SILK, 12, 24, 11);
  },
  splash(g) {
    g.beginFill(BLUE, .36).drawCircle(0, 0, 14).endFill();
    ring(g, 16, 3.6, INK, .68);
    ring(g, 15, 2.25, JADE);
    ring(g, 8, 1.8, SILK, .82);
    shards(g, JADE, 13, 23, 9);
  },
  fire(g) {
    polygon(g, VERMILION, [[-16, 2], [-8, -5], [-10, -12], [1, -9], [7, -17],
      [9, -7], [17, -4], [10, 3], [15, 10], [4, 8], [-2, 15], [-6, 8], [-15, 9]], .86);
    polygon(g, AMBER, [[-9, 2], [-3, -5], [2, -8], [4, -2], [10, 1], [2, 6], [-4, 7]]);
    g.beginFill(SILK).drawCircle(0, 0, 3.6).endFill();
    shards(g, AMBER, 9, 24, 9);
  },
  gong(g) {
    ring(g, 19, 2.7, INK, .65);
    ring(g, 19, .95, AMBER, .9);
    ring(g, 15, .75, SILK, .58);
    shards(g, AMBER, 8, 21, 18);
  },
  sink(g) {
    painters.splash(g);
    ring(g, 19, 1.5, BLUE, .8);
    polygon(g, AMBER, [[-14, 6], [-12, -1], [-4, -2], [-7, 4]], .7);
    polygon(g, 0xaf753f, [[7, -5], [15, -8], [13, 0], [10, 4]], .88);
  },
  shore(g) {
    ring(g, 14, 2, INK, .65);
    ring(g, 13, 1.45, JADE, .95);
    stroke(g, [[-10, 4], [0, -3], [10, 4]], 2.8, JADE);
    stroke(g, [[-9, -2], [0, -9], [9, -2]], 1.6, SILK, .86);
  },
  gate(g) {
    for (const y of [-8, 0, 8]) stroke(g, [[-16, y + 2], [-8, y - 2], [0, y + 1], [10, y - 2]], 2.45, JADE, .95);
    shards(g, SILK, 9, 23, 12);
  },
  alarm(g) {
    ring(g, 18, 5, INK, .72);
    ring(g, 18, 2.7, VERMILION, .98);
    shards(g, AMBER, 9, 25, 13);
  }
};

export function createCombatEffects(game, { sound, layers }) {
  const slots = Array.from({ length: 28 }, () => {
    const sprite = game.sprite(undefined, layers.accents);
    sprite.visible = false;
    return { sprite, kind: '', start: 0, life: 0, size: 0 };
  });
  const labels = new Set();
  let cursor = 0;

  function stamp(kind, time, x, y, size, life, angle = 0) {
    const entry = slots[cursor];
    cursor = (cursor + 1) % slots.length;
    const sprite = entry.sprite;
    if (entry.kind !== kind) {
      sprite.graphics.clear();
      painters[kind](sprite.graphics);
      entry.kind = kind;
    }
    entry.start = time;
    entry.life = game.reducedMotion ? Math.min(life, .3) : life;
    entry.size = size;
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = angle;
    sprite.scaleX = sprite.scaleY = size * (game.reducedMotion ? .9 : .58);
    sprite.alpha = game.reducedMotion ? .67 : 1;
    sprite.visible = true;
  }

  function reward(x, y, value) {
    if (labels.size >= 14) return;
    const label = game.text(`+${value}`, { x, y: y - 24, size: 19, color: AMBER, align: 'center', bold: true, layer: layers.words });
    labels.add(label);
    game.tween(label).to({ y: y - (game.reducedMotion ? 24 : 48), alpha: 0 }, .78, 'quadOut').onFinish(() => {
      if (labels.delete(label)) game.remove(label);
    });
  }

  function advance(now) {
    for (const entry of slots) {
      const sprite = entry.sprite;
      if (!sprite.visible) continue;
      const progress = (now - entry.start) / entry.life;
      if (progress >= 1) {
        sprite.visible = false;
      } else if (!game.reducedMotion) {
        const spread = 1 - (1 - progress) ** 2;
        sprite.alpha = (1 - progress) ** .72;
        sprite.scaleX = sprite.scaleY = entry.size * (.58 + spread * .57);
      }
    }
  }

  function show(world, events) {
    const now = world.time;
    advance(now);
    if (!events.length) return;
    let bursts = 0, shots = 0;
    const landings = new Set();
    const important = [], regular = [];
    const cue = (name, detail, priority = false) => {
      (priority ? important : regular).push([name, detail]);
    };
    const burst = (x, y, color, count, speed) => {
      if (!game.reducedMotion && bursts++ < 4) game.burst(x, y, { color, count, speed, life: .55, size: 2.8 });
    };

    for (const event of events) {
      switch (event.type) {
        case 'shot': {
          if (shots++ < 3) cue('shot', event.tower);
          const tower = world.towers[event.from];
          if (!tower) break;
          const angle = tower.angle;
          const kind = event.tower === 'fire' ? 'fire' : event.tower === 'trebuchet' ? 'stone' : 'bolt';
          stamp(kind, now, tower.x + Math.cos(angle) * 18, tower.y + Math.sin(angle) * 13 - 6,
            kind === 'stone' ? .63 : .88, .33, angle * 180 / Math.PI);
          break;
        }
        case 'hit': {
          const target = event.id === undefined ? undefined : world.raiders.find(raider => raider.id === event.id);
          const kind = target?.kind ?? events.find(hit => hit.type === 'kill' && hit.id === event.id)?.kind;
          const water = kind ? RAIDERS[kind].way === 'water' : WAYS.water.nearest(event.x, event.y).distance <= WIDTH.water / 2;
          const style = event.tower === 'fire' ? 'fire' : event.splash ? (water ? 'splash' : 'stone') : kind === 'shield' ? 'shield' : water ? 'splash' : 'arrow';
          const size = event.splash ? Math.min(event.splash / 18, 3.4) : style === 'fire' ? 1.18 : 1;
          stamp(style, now, event.x, event.y, size, event.splash ? .68 : .42);
          if (event.splash || style === 'fire') burst(event.x, event.y, water ? JADE : AMBER, event.splash ? 12 : 6, 108);
          cue('hit', style === 'stone' ? 'trebuchet' : style === 'splash' ? 'water' : style === 'arrow' ? 'crossbow' : style);
          break;
        }
        case 'kill': {
          const boat = RAIDERS[event.kind].way === 'water';
          const flagship = event.kind === 'flagship';
          stamp(boat ? 'sink' : 'shield', now, event.x, event.y, flagship ? 3.22 : boat ? 1.55 : .78, boat ? .92 : .46);
          burst(event.x, event.y, boat ? JADE : AMBER, flagship ? 20 : 10, boat ? 118 : 79);
          reward(event.x, event.y, event.bounty);
          cue(boat ? 'sink' : 'down', event.kind, flagship);
          if (flagship && !game.reducedMotion) game.shake(3.2, .22);
          break;
        }
        case 'ashore':
          if (!landings.has(event.from)) {
            landings.add(event.from);
            stamp('shore', now, event.x, event.y, 1.45, .74);
            burst(event.x, event.y, JADE, 8, 80);
            cue('ashore', undefined, true);
          }
          break;
        case 'gong':
          stamp('gong', now, event.x, event.y, Math.min(event.radius / 24, 6.4), .82);
          cue('gong');
          break;
        case 'gate': {
          const point = WAYS.water.at(GATES[event.gate].at);
          stamp('gate', now, point.x, point.y, 1.65, .63, point.angle * 180 / Math.PI);
          if (event.open) cue('gate-open', undefined, true);
          break;
        }
        case 'leak': {
          const end = WAYS[RAIDERS[event.kind].way].at(WAYS[RAIDERS[event.kind].way].length - 55);
          stamp('alarm', now, end.x, end.y, 2, .67);
          if (!game.reducedMotion) game.shake(3, .17);
          cue('leak', undefined, true);
          break;
        }
      }
    }
    for (const [name, detail] of important.concat(regular).slice(0, 9)) sound(name, detail);
  }

  return {
    show,
    clear() {
      for (const { sprite } of slots) sprite.visible = false;
      for (const label of labels) game.remove(label);
      labels.clear();
    }
  };
}
