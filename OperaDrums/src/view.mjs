// 画面：戏台的背景（守旧、出将入相两扇门、台毯）由页面画一次，见 ground.mjs；这里用引擎的 play 画会动的东西——
// 鼓面、从右往左流过来的音符和它们的字、判定字、连击数、「彩」槽、两盏宫灯和击中时的火花。画面只读判定的状态。
// The view: the stage behind (the backdrop, the two doors and the carpet) is painted once by the page, in
// ground.mjs; here the engine's play draws what moves — the drum face, the notes flowing in from the right with their
// syllables, the judgement, the combo, the cheer gauge, two palace lanterns and the sparks of a hit. The view only
// reads the state of the judging.
import { CLEAR } from './sim/judge.mjs';
import { ROMAN } from './sim/songs.mjs';

export const LACQUER = 0x1d1412,
  VERMILION = 0xb8231e,
  GOLD = 0xd9a441,
  IVORY = 0xf3e6c8,
  BRONZE = 0xa8742a,
  JADE = 0x2f7a6b,
  SMOKE = 0x6b625a;

/** Where things are on the 960 × 540 stage. */
export const LAYOUT = { laneY: 196, laneTop: 140, laneBottom: 252, hitX: 176, gaugeY: 112, gaugeLeft: 390, gaugeRight: 930, spawnX: 1010 };
const RADIUS = { small: 27, big: 38 };

/** The colour of a note's face. */
const faceOf = (note) => (note.kind === 'drum' ? VERMILION : BRONZE);

/**
 * A note: a square seal, vermilion for the drum and bronze for the gongs, edged in ivory; a big note has a gold frame
 * inside. Gong notes are turned to stand on a corner, so the two kinds differ in shape as well as colour. Notes are
 * made of rectangles only: they move every frame, and the engine draws moving rectangles far more cheaply than moving
 * circles (see ENGINE-NOTES).
 */
function drawNote(g, note) {
  const r = note.big ? RADIUS.big : RADIUS.small,
    side = note.kind === 'gong' ? r * 1.5 : r * 1.72;
  const square = (half, color) => g.beginFill(color).drawRect(-half, -half, half * 2, half * 2).endFill();
  square(side / 2 + 3, IVORY);
  square(side / 2, faceOf(note));
  if (note.big) {
    square(side / 2 - 5, GOLD);
    square(side / 2 - 8, faceOf(note));
  }
}

/** A roll: a long gold bar from its start to its end, `length` units long. */
function drawRoll(g, length) {
  const half = RADIUS.small * 0.86;
  g.beginFill(IVORY).drawRect(-half - 3, -half * 0.7 - 3, length + half * 2 + 6, half * 1.4 + 6).endFill();
  g.beginFill(GOLD).drawRect(-half, -half * 0.7, length + half * 2, half * 1.4).endFill();
  g.beginFill(IVORY).drawRect(-half - 3, -half - 3, half * 2 + 6, half * 2 + 6).endFill();
  g.beginFill(VERMILION).drawRect(-half, -half, half * 2, half * 2).endFill();
}

/** A palace lantern hanging from a cord, about its top. */
function drawLantern(g) {
  g.lineStyle(2, LACQUER, 0.9).moveTo(0, 0).lineTo(0, 18).lineStyle(0);
  g.beginFill(GOLD).drawRect(-14, 16, 28, 6).endFill();
  g.beginFill(VERMILION).drawEllipse(-24, 20, 48, 54).endFill();
  g.beginFill(0xe6553a, 0.7).drawEllipse(-12, 24, 24, 46).endFill();
  g.beginFill(GOLD).drawRect(-14, 72, 28, 6).endFill();
  g.lineStyle(1.5, GOLD, 1);
  for (let k = -2; k <= 2; k++) g.moveTo(k * 4, 78).lineTo(k * 4, 98);
  g.lineStyle(0);
}

/**
 * The moving part of the view. `show(run, time, speed)` puts every sprite where the song is at `time`; `struck(kind,
 * result)` answers a stroke at once.
 */
export function createView(game, { words, roman }) {
  // The labels of the notes have a layer of their own over the notes, so the discs are drawn together and the labels
  // together, and not one after the other.
  const layers = { lane: game.sprite(), notes: game.sprite(), labels: game.sprite(), front: game.sprite(), words: game.sprite() };
  // The lane: a dark lacquer band edged in gold, and the drum face where notes are struck.
  game.sprite((g) => {
    g.beginFill(LACQUER, 0.92).drawRect(0, LAYOUT.laneTop, 960, LAYOUT.laneBottom - LAYOUT.laneTop).endFill();
    g.beginFill(GOLD).drawRect(0, LAYOUT.laneTop - 3, 960, 3).drawRect(0, LAYOUT.laneBottom, 960, 3).endFill();
    g.beginFill(0x2a1d19).drawRect(0, LAYOUT.laneTop, 260, LAYOUT.laneBottom - LAYOUT.laneTop).endFill();
    g.lineStyle(2, GOLD, 0.35, { dash: [4, 6] }).moveTo(260, LAYOUT.laneY).lineTo(960, LAYOUT.laneY).lineStyle(0);
  }, layers.lane);
  const target = game.sprite((g) => {
    g.lineStyle(3, IVORY, 0.85).drawCircle(0, 0, RADIUS.big + 4).lineStyle(0);
    g.lineStyle(2, GOLD, 0.6).drawCircle(0, 0, RADIUS.small + 2).lineStyle(0);
  }, layers.lane);
  target.x = LAYOUT.hitX;
  target.y = LAYOUT.laneY;
  // The flash of a stroke on the drum face: red for the drum, gold for the gongs.
  const pulses = {
    drum: game.circle(LAYOUT.hitX, LAYOUT.laneY, RADIUS.big, VERMILION, layers.lane),
    gong: game.sprite((g) => g.lineStyle(10, GOLD, 1).drawCircle(0, 0, RADIUS.big + 2).lineStyle(0), layers.lane)
  };
  pulses.gong.x = LAYOUT.hitX;
  pulses.gong.y = LAYOUT.laneY;
  for (const pulse of Object.values(pulses)) pulse.alpha = 0;

  // The cheer gauge, with a mark at what clears the song.
  const gaugeBack = game.sprite(undefined, layers.lane);
  const gaugeFill = game.sprite(undefined, layers.lane);
  const gaugeWidth = LAYOUT.gaugeRight - LAYOUT.gaugeLeft;
  const gaugeLabel = game.text('', { x: LAYOUT.gaugeLeft - 10, y: LAYOUT.gaugeY - 9, size: 18, color: GOLD, align: 'right', bold: true, layer: layers.lane });

  const judgement = game.text('', { x: LAYOUT.hitX, y: LAYOUT.laneTop - 34, size: 30, color: GOLD, align: 'center', bold: true, layer: layers.words });
  const combo = game.text('', { x: LAYOUT.hitX, y: LAYOUT.laneBottom + 12, size: 26, color: IVORY, align: 'center', bold: true, layer: layers.words });
  const comboLabel = game.text('', { x: LAYOUT.hitX, y: LAYOUT.laneBottom + 42, size: 14, color: GOLD, align: 'center', layer: layers.words });

  const lanterns = [100, 860].map((x) => {
    const lantern = game.sprite(drawLantern, layers.front);
    lantern.x = x;
    lantern.y = 270;
    return lantern;
  });

  const live = new Map();
  let warm = 0,
    shownChart = null,
    sway = 0,
    judgementAge = 99;

  function drawGauge(difficulty, value) {
    const clear = CLEAR[difficulty];
    gaugeBack.graphics.clear().beginFill(LACQUER, 0.85).drawRoundRect(LAYOUT.gaugeLeft, LAYOUT.gaugeY - 8, gaugeWidth, 16, 8).endFill();
    gaugeBack.graphics.beginFill(GOLD, 0.95).drawRect(LAYOUT.gaugeLeft + (gaugeWidth * clear) / 100 - 1, LAYOUT.gaugeY - 13, 3, 26).endFill();
    const width = Math.max(0, (gaugeWidth * value) / 100);
    gaugeFill.graphics.clear();
    if (width > 0) gaugeFill.graphics.beginFill(value >= clear ? GOLD : VERMILION).drawRoundRect(LAYOUT.gaugeLeft, LAYOUT.gaugeY - 6, Math.max(12, width), 12, 6).endFill();
  }
  let gaugeShown = -1;

  // Notes are kept and used again: a note of the same look (kind, size, syllable) that has passed is the next one's.
  // A sprite drawn for the first time costs a spike of frame time under software rendering, so every look a song
  // needs is drawn during the count-in, before the first note comes.
  const spare = new Map();
  const lookOf = (note) => (note.roll ? `roll:${note.index}` : `${note.kind}:${note.big}:${note.syllable}:${roman()}`);
  function makeNote(note, pixelsPerSecond) {
    const sprite = game.sprite((g) => (note.roll ? drawRoll(g, note.roll * pixelsPerSecond) : drawNote(g, note)), layers.notes);
    sprite.label = game.text(roman() ? ROMAN[note.syllable] : note.syllable, { size: roman() ? (note.big ? 18 : 14) : note.big ? 30 : 22, color: IVORY, align: 'center', baseline: 'middle', bold: true, layer: layers.labels });
    if (!note.roll && note.kind === 'gong') sprite.rotation = 45;
    sprite.look = lookOf(note);
    return sprite;
  }
  function noteSprite(note, pixelsPerSecond) {
    let sprite = live.get(note.index);
    if (sprite) return sprite;
    sprite = spare.get(lookOf(note))?.pop() ?? makeNote(note, pixelsPerSecond);
    sprite.visible = sprite.label.visible = true;
    live.set(note.index, sprite);
    return sprite;
  }
  function letGo(sprite) {
    if (sprite.look.startsWith('roll:')) return game.remove(sprite), game.remove(sprite.label);
    sprite.visible = sprite.label.visible = false;
    if (!spare.has(sprite.look)) spare.set(sprite.look, []);
    spare.get(sprite.look).push(sprite);
  }
  function dropSpares() {
    for (const list of spare.values()) for (const sprite of list) game.remove(sprite), game.remove(sprite.label);
    spare.clear();
  }

  return {
    /** A new song: every note of the last one taken away. */
    reset(chart, pixelsPerSecond) {
      for (const sprite of live.values()) game.remove(sprite), game.remove(sprite.label);
      live.clear();
      dropSpares();
      // Enough of each look for a screenful, drawn now, off the stage, and put aside.
      const counts = new Map();
      for (const note of chart.notes) if (!note.roll) counts.set(lookOf(note), Math.min(10, (counts.get(lookOf(note)) ?? 0) + 1));
      for (const [look, count] of counts) {
        const sample = chart.notes.find((note) => !note.roll && lookOf(note) === look);
        const list = [];
        for (let i = 0; i < count; i++) {
          const sprite = makeNote(sample, pixelsPerSecond);
          sprite.x = sprite.label.x = -200 - i * 10;
          sprite.y = sprite.label.y = LAYOUT.laneY;
          list.push(sprite);
        }
        spare.set(look, list);
      }
      warm = 2;
      shownChart = chart;
      gaugeShown = -1;
      judgement.text = '';
      combo.text = '';
      comboLabel.text = '';
      gaugeLabel.text = words('gaugeName');
      drawGauge(chart.difficulty, 0);
    },

    /** Put everything where the song is at `time`. `speed` is the notes' speed in units a second. */
    show(run, time, speed, seconds) {
      if (!shownChart) return;
      // The spares are drawn once off the stage, then hidden until a note takes one.
      if (warm > 0 && --warm === 0) for (const list of spare.values()) for (const sprite of list) sprite.visible = sprite.label.visible = false;
      const notes = shownChart.notes,
        ahead = (LAYOUT.spawnX - LAYOUT.hitX) / speed;
      // Notes from a little behind the drum to the right edge, latest drawn first so the next note is in front.
      const visible = new Set();
      for (let i = notes.length - 1; i >= Math.max(0, run.next - 12); i--) {
        const note = notes[i];
        const end = note.t + note.roll;
        if (note.t - time > ahead || end - time < -0.4) continue;
        if (run.judged.has(note.index) && !note.roll) continue;
        visible.add(note.index);
        const sprite = noteSprite(note, speed);
        sprite.x = LAYOUT.hitX + (note.t - time) * speed;
        sprite.y = LAYOUT.laneY;
        sprite.alpha = time > end + 0.1 ? Math.max(0, 1 - (time - end - 0.1) * 4) : 1;
        sprite.label.x = sprite.x;
        sprite.label.y = sprite.y;
        sprite.label.alpha = sprite.alpha;
        game.toFront(sprite);
        game.toFront(sprite.label);
      }
      for (const [index, sprite] of live)
        if (!visible.has(index)) {
          letGo(sprite);
          live.delete(index);
        }
      if (Math.abs(run.gauge - gaugeShown) > 0.2) {
        gaugeShown = run.gauge;
        drawGauge(shownChart.difficulty, run.gauge);
      }
      combo.text = run.combo >= 5 ? String(run.combo) : '';
      comboLabel.text = run.combo >= 5 ? words('comboName') : '';
      // Pulses and the judgement fade; the lanterns settle.
      for (const pulse of Object.values(pulses)) pulse.alpha = Math.max(0, pulse.alpha - seconds * 6);
      judgementAge += seconds;
      judgement.alpha = Math.max(0, 1 - Math.max(0, judgementAge - 0.25) * 4);
      judgement.y = LAYOUT.laneTop - 34 - (game.reducedMotion ? 0 : Math.min(judgementAge, 0.15) * 40);
      sway *= Math.exp(-seconds * 3);
      lanterns.forEach((lantern, i) => (lantern.rotation = Math.sin(game.time * 3 + i) * sway));
    },

    /** A stroke of `kind` and what it met. */
    struck(kind, result) {
      pulses[kind].alpha = 0.75;
      if (result.type === 'judged') {
        const key = result.judgement;
        judgement.text = words(key);
        judgement.color = key === 'great' ? GOLD : key === 'ok' ? IVORY : SMOKE;
        judgementAge = 0;
        if (key !== 'miss') {
          game.burst(LAYOUT.hitX, LAYOUT.laneY, { color: kind === 'drum' ? 0xff7a4d : GOLD, count: result.note.big ? 24 : 10, speed: 220, life: 0.35, size: 3 });
          if (result.note.big) {
            sway = game.reducedMotion ? 0 : 12;
            if (!game.reducedMotion) game.shake(3, 0.12);
          }
        }
      } else if (result.type === 'double') {
        game.burst(LAYOUT.hitX, LAYOUT.laneY, { color: IVORY, count: 16, speed: 300, life: 0.4, size: 2.5 });
      }
    },

    /** Notes passed by unstruck. */
    missed(count) {
      if (!count) return;
      judgement.text = words('miss');
      judgement.color = SMOKE;
      judgementAge = 0;
    },

    clear() {
      for (const sprite of live.values()) game.remove(sprite), game.remove(sprite.label);
      live.clear();
      dropSpares();
      shownChart = null;
      judgement.text = '';
      combo.text = '';
      comboLabel.text = '';
      gaugeLabel.text = '';
      gaugeBack.graphics.clear();
      gaugeFill.graphics.clear();
    }
  };
}
