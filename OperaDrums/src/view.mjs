// The Egret overlay follows the audio clock. It paints the notes, instruments and strike feedback without touching the score.
import { LEAD } from './sim/chart.mjs';
import { CLEAR, SCORE } from './sim/judge.mjs';
import { ROMAN } from './sim/songs.mjs';
import { createEncoreStage } from './encore-stage.mjs';
import {
  ASH, BRONZE, CORAL, GOLD, INK, IVORY, JADE, LACQUER, NOTE_HALF, RED,
  drawImpact, drawLane, drawReceiver, drawSeal, drawStick, drawStrip, rect
} from './stage-drawing.mjs';

/** The instruments' picture, by the address the page loads it at. */
export const INSTRUMENTS = 'assets/instruments.png';
export const LAYOUT = Object.freeze({
  laneY: 203, laneTop: 146, laneBottom: 262, hitX: 168, gaugeY: 298, gaugeLeft: 395, gaugeRight: 755, spawnX: 1008
});
const JUDGEMENT_Y = 296;
const KINDS = ['drum', 'gong'];
const clamp = (value) => Math.max(0, Math.min(1, value));

export function createView(game, { words, roman, parent, place }) {
  // Keep the moving rectangles and their glyphs in separate passes so the engine can batch each together.
  // All of it is drawn in the stage's own 960 × 540 units, under `parent`, which the page places and scales.
  const layer = () => game.sprite(undefined, parent);
  const layers = {
    lane: layer(), guides: layer(), receiver: layer(), rolls: layer(),
    notes: layer(), labels: layer(), furnishings: layer(), stage: layer(),
    effects: layer(), words: layer()
  };
  function sprite(draw, layer, x = 0, y = 0) {
    const node = game.sprite(draw, layer);
    node.x = x;
    node.y = y;
    return node;
  }
  function label(text, x, y, size, color = IVORY, alignment = 'center') {
    return game.text(text, { x, y, size, color, align: alignment, baseline: 'middle', bold: true, layer: layers.words });
  }
  const { hitX, laneY, laneTop, laneBottom, gaugeY, gaugeLeft, gaugeRight, spawnX } = LAYOUT;
  sprite((g) => drawLane(g, LAYOUT), layers.lane);
  sprite(drawReceiver, layers.receiver, hitX, laneY);
  const encoreStage = createEncoreStage(game, layers.receiver, LAYOUT);

  const guides = Array.from({ length: 12 }, () =>
    sprite((g) => {
      rect(g, GOLD, -1, laneTop + 8, 2, laneBottom - laneTop - 16);
      rect(g, IVORY, -4, laneTop + 4, 8, 3);
    }, layers.guides)
  );
  const beats = Array.from({ length: LEAD.beats }, (_, index) => {
    const lamp = sprite((g) => {
      rect(g, BRONZE, -5, -5, 10, 10);
      rect(g, GOLD, -3, -3, 6, 6);
    }, layers.lane, 840 + index * 23, gaugeY);
    lamp.rotation = 45;
    return lamp;
  });

  const gaugeWidth = gaugeRight - gaugeLeft;
  sprite((g) => {
    rect(g, 0x090e0e, -5, -12, gaugeWidth + 10, 24, 0.8);
    rect(g, BRONZE, -3, -8, gaugeWidth + 6, 16);
    rect(g, INK, -2, -7, gaugeWidth + 4, 14);
  }, layers.lane, gaugeLeft, gaugeY);
  const gaugeFill = [CORAL, JADE].map((color) => sprite((g) => {
    rect(g, color, 0, -5, gaugeWidth, 10);
    rect(g, IVORY, 0, -5, gaugeWidth, 2, 0.45);
  }, layers.lane, gaugeLeft, gaugeY));
  const threshold = sprite((g) => {
    rect(g, IVORY, -1, -11, 2, 22);
    rect(g, GOLD, -4, -12, 8, 3);
  }, layers.lane, gaugeLeft, gaugeY);
  const gaugeLabel = label('', gaugeLeft - 14, gaugeY, 25, IVORY, 'right');

  // The lacquer and engraved metal are baked into a small transparent layer.
  // Only the sticks and brief highlights move, avoiding per-frame path packing for the instrument bodies.
  game.image(INSTRUMENTS, { x: 177, y: 399, width: 218, height: 112, layer: layers.furnishings })
    .catch((cause) => console.warn('Instrument artwork was unavailable.', cause));
  const sticks = {
    drum: sprite((g) => drawStick(g, false), layers.stage, 91, 363),
    gong: sprite((g) => drawStick(g, true), layers.stage, 193, 360)
  };
  const flash = {
    drum: sprite((g) => rect(g, IVORY, -21, -1, 42, 3), layers.stage, 118, 383),
    gong: sprite((g) => rect(g, GOLD, -16, -1, 32, 3), layers.stage, 223, 394)
  };
  flash.drum.rotation = 3;
  flash.gong.rotation = -54;
  const strikes = { drum: 0, gong: 0 };
  const impacts = {
    drum: sprite((g) => drawImpact(g, 'drum', false), layers.effects, hitX, laneY),
    gong: sprite((g) => drawImpact(g, 'gong', false), layers.effects, hitX, laneY),
    accent: sprite((g) => drawImpact(g, 'gong', true), layers.effects, hitX, laneY)
  };
  for (const effect of Object.values(impacts)) effect.alpha = 0;

  const judgement = label('', hitX, JUDGEMENT_Y, 33);
  const timing = label('', hitX, JUDGEMENT_Y + 33, 22);
  const combo = label('', 253, JUDGEMENT_Y, 29, GOLD, 'left');
  const comboLabel = label('', 253, JUDGEMENT_Y + 28, 19, IVORY, 'left');
  const live = new Map();
  const spare = new Map();
  const visible = new Set();
  let shownChart = null;
  let english = roman();
  let warm = 0;
  let gaugeShown = -1;
  let judgementAge = 99;
  let rollFlash = 0;

  function setScene(open) {
    for (const layer of Object.values(layers)) layer.visible = open;
  }
  setScene(false);

  function showGauge(level, value) {
    const fraction = clamp(value / 100);
    const clear = CLEAR[level];
    threshold.x = gaugeLeft + gaugeWidth * clear / 100;
    for (let index = 0; index < gaugeFill.length; index++) {
      const bar = gaugeFill[index];
      bar.visible = fraction > 0 && (value >= clear) === (index === 1);
      bar.scaleX = fraction;
    }
  }

  function showGuides(time, speed) {
    const beatLength = 60 / shownChart.bpm;
    const beatAtHit = (time - LEAD.seconds) / beatLength;
    const firstBeat = Math.max(0, Math.ceil(beatAtHit));
    for (let index = 0; index < guides.length; index++) {
      const guide = guides[index];
      const beat = firstBeat + index;
      const x = hitX + (beat - beatAtHit) * beatLength * speed;
      guide.visible = x < 960 && beat < shownChart.beats;
      if (!guide.visible) continue;
      guide.alpha = beat % 4 === 0 ? 0.32 : 0.14;
      guide.x = x;
    }
    const beatIndex = Math.floor(beatAtHit);
    for (let index = 0; index < beats.length; index++) {
      beats[index].alpha = beatIndex >= 0 && beatIndex % LEAD.beats === index ? 1 : 0.29;
    }
  }

  const lookOf = (note) => note.roll ? 'roll' : [note.kind, note.big, note.syllable].join(':');
  function writeGlyph(entry) {
    const { label: glyph, note } = entry;
    glyph.text = english ? ROMAN[note.syllable] : note.syllable;
    glyph.size = english ? (note.big ? 22 : 17) : (note.big ? 32 : 25);
  }
  function makeNote(note) {
    const seal = sprite((g) => drawSeal(g, note), layers.notes);
    if (!note.roll && note.kind === 'gong') seal.rotation = 45;
    const entry = { seal, note, look: lookOf(note), label: game.text('', {
      bold: true, size: 24, color: IVORY, align: 'center', baseline: 'middle', layer: layers.labels
    }) };
    if (note.roll) {
      entry.strip = sprite(drawStrip, layers.rolls);
      entry.cap = sprite((g) => {
        rect(g, GOLD, -3, -17, 6, 34);
        rect(g, IVORY, -2, -13, 2, 26);
      }, layers.rolls);
    }
    writeGlyph(entry);
    return entry;
  }
  function showNote(entry, value) {
    entry.seal.visible = entry.label.visible = value;
    if (entry.strip) entry.strip.visible = entry.cap.visible = value;
  }
  function takeNote(note) {
    if (live.has(note.index)) return live.get(note.index);
    const entry = spare.get(lookOf(note))?.pop() ?? makeNote(note);
    showNote(entry, true);
    live.set(note.index, entry);
    return entry;
  }
  function parkNote(entry) {
    showNote(entry, false);
    if (!spare.has(entry.look)) spare.set(entry.look, []);
    spare.get(entry.look).push(entry);
  }
  function removeNotes() {
    const remove = (entry) => {
      game.remove(entry.seal);
      game.remove(entry.label);
      if (entry.strip) {
        game.remove(entry.strip);
        game.remove(entry.cap);
      }
    };
    for (const entry of live.values()) remove(entry);
    for (const list of spare.values()) for (const entry of list) remove(entry);
    live.clear();
    spare.clear();
  }
  function showNotes(run, time, speed) {
    if (english !== roman()) {
      english = roman();
      for (const entry of live.values()) writeGlyph(entry);
      for (const list of spare.values()) for (const entry of list) writeGlyph(entry);
      gaugeLabel.text = words('gaugeName');
    }
    if (warm > 0 && --warm === 0) for (const list of spare.values()) for (const entry of list) showNote(entry, false);
    const notes = shownChart.notes;
    const lookahead = (spawnX - hitX) / speed;
    visible.clear();
    for (let index = notes.length - 1; index >= Math.max(0, run.next - 12); index--) {
      const note = notes[index];
      const end = note.t + note.roll;
      if (note.t - time > lookahead || end - time < -0.4 || (!note.roll && run.judged.has(note.index))) continue;
      visible.add(note.index);
      const entry = takeNote(note);
      const position = hitX + (note.t - time) * speed;
      entry.seal.x = entry.label.x = note.roll ? Math.max(hitX, position) : position;
      entry.seal.y = entry.label.y = laneY;
      entry.seal.alpha = entry.label.alpha = clamp(1 - Math.max(0, time - end - 0.05) * 5);
      if (entry.strip) {
        const endX = hitX + (end - time) * speed;
        const left = entry.seal.x + NOTE_HALF - 2;
        entry.strip.visible = entry.cap.visible = endX > left;
        entry.strip.x = left;
        entry.cap.x = Math.max(left, endX);
        entry.strip.y = entry.cap.y = laneY;
        entry.strip.scaleX = Math.max(0, endX - left) / 100;
      }
      game.toFront(entry.seal);
      game.toFront(entry.label);
    }
    for (const [index, entry] of live) if (!visible.has(index)) {
      parkNote(entry);
      live.delete(index);
    }
  }

  function mark(key, detail = '') {
    judgement.text = words(key);
    judgement.color = key === 'great' ? GOLD : key === 'ok' ? IVORY : ASH;
    timing.text = detail;
    judgementAge = 0;
  }
  function animateFeedback(seconds) {
    judgementAge += seconds;
    const alpha = clamp(1 - Math.max(0, judgementAge - 0.30) * 3.8);
    judgement.alpha = timing.alpha = alpha;
    judgement.y = JUDGEMENT_Y - (game.reducedMotion ? 0 : Math.min(judgementAge, 0.13) * 55);
    timing.y = judgement.y + 33;
    rollFlash = Math.max(0, rollFlash - seconds);
    for (const kind of KINDS) {
      strikes[kind] = Math.max(0, strikes[kind] - seconds * 4.7);
      const pressure = game.reducedMotion ? 0 : strikes[kind];
      flash[kind].alpha = strikes[kind] * 0.55;
      sticks[kind].rotation = (kind === 'drum' ? 16 : -13) + pressure * (kind === 'drum' ? 34 : 29);
    }
    for (const ring of Object.values(impacts)) {
      if (ring.alpha <= 0) continue;
      ring.alpha = Math.max(0, ring.alpha - seconds * 3.4);
      ring.scaleX = ring.scaleY = game.reducedMotion ? 1 : 1 + (1 - ring.alpha) * 0.24;
    }
  }

  function hit(kind, strength, accent = false) {
    strikes[kind] = Math.max(strikes[kind], strength);
    const ring = impacts[accent ? 'accent' : kind];
    ring.alpha = strength;
    ring.scaleX = ring.scaleY = 1;
  }
  function spark(kind, count) {
    if (game.reducedMotion) return;
    // Bursts fly in the world's units: the stage's point and sizes are carried over by `place`.
    const at = place(hitX, laneY);
    game.burst(at.x, at.y, { color: kind === 'drum' ? CORAL : GOLD, count, speed: 125 * at.scale, life: 0.24, size: 3 * at.scale });
  }

  return {
    setEncorePhase: encoreStage.setEncorePhase,
    encoreCue: encoreStage.encoreCue,

    reset(chart) {
      removeNotes();
      setScene(true);
      shownChart = chart;
      english = roman();
      judgement.text = timing.text = combo.text = comboLabel.text = '';
      gaugeLabel.text = words('gaugeName');
      gaugeShown = -1;
      judgementAge = 99;
      rollFlash = 0;
      encoreStage.reset();
      for (const ring of Object.values(impacts)) ring.alpha = 0;
      for (const kind of KINDS) strikes[kind] = 0;
      animateFeedback(0);
      showGauge(chart.difficulty, 0);

      // Prime each glyph and batch shape during the count-in so the first dense bar has no first-use setup.
      const looks = new Map();
      for (const note of chart.notes) {
        const look = lookOf(note);
        const old = looks.get(look);
        if (!old) looks.set(look, { sample: note, count: 1 });
        else old.count = Math.min(10, old.count + 1);
      }
      for (const [look, { sample, count }] of looks) {
        const list = [];
        for (let index = 0; index < count; index++) {
          const entry = makeNote(sample);
          entry.seal.x = entry.label.x = -220 - index * 10;
          entry.seal.y = entry.label.y = laneY;
          if (entry.strip) entry.strip.x = entry.cap.x = -300;
          list.push(entry);
        }
        spare.set(look, list);
      }
      warm = 2;
    },

    show(run, time, speed, seconds) {
      if (!shownChart) return;
      showGuides(time, speed);
      showNotes(run, time, speed);
      if (Math.abs(run.gauge - gaugeShown) > 0.16) {
        gaugeShown = run.gauge;
        showGauge(shownChart.difficulty, run.gauge);
      }
      combo.text = run.combo >= 2 ? String(run.combo) : '';
      comboLabel.text = run.combo >= 2 ? words('comboName') : '';
      animateFeedback(seconds);
      encoreStage.step(seconds);
    },

    struck(kind, result, detail) {
      const { type, note, judgement: rating } = result;
      if (type === 'judged') {
        mark(note.kind === kind ? rating : 'timingWrong', detail);
        hit(kind, rating === 'great' ? 0.92 : rating === 'ok' ? 0.68 : 0.31, Boolean(note.big && rating !== 'miss'));
        if (rating !== 'miss') spark(kind, note.big ? 16 : 7);
      } else if (type === 'double') {
        judgement.text = '×2';
        judgement.color = GOLD;
        timing.text = '';
        judgementAge = 0;
        hit(kind, 1, true);
        spark(kind, 13);
      } else if (type === 'roll') {
        hit(kind, 0.66);
        judgement.text = '+' + SCORE.roll;
        judgement.color = GOLD;
        timing.text = '';
        judgementAge = 0;
        if (rollFlash === 0) {
          spark(kind, 4);
          rollFlash = 0.09;
        }
      } else {
        if (detail) mark('timingOffbeat', detail);
        hit(kind, 0.25);
      }
    },

    missed() {
      mark('timingMissed');
    },

    clear() {
      removeNotes();
      encoreStage.reset();
      shownChart = null;
      setScene(false);
    }
  };
}
