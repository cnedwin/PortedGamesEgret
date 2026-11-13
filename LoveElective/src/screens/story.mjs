// Plays a story script (see src/story/chapters.mjs for the step format):
// backgrounds, a senior on screen, the dialogue box with text that writes
// itself out, choices, and the effects of those choices on the save.
import { hasStoryPortrait } from '../art/character-art.mjs';
import { W } from '../engine/stage.mjs';
import { THEME, FONT, SERIF, wrapText } from '../engine/ui.mjs';
import { rgba, rrect, poly } from '../art/draw.mjs';
import { HEROINES } from '../data/cast.mjs';
import { SLOTS_OF_DAY } from '../data/places.mjs';
import * as sim from '../sim.mjs';

const BOX = { x: 58, y: 506, w: 1164, h: 198 };
const TEXT = { x: 58, y: 62, w: 1010, size: 25, lineH: 40 };
/** How fast text writes itself out, in game units per second. */
const REVEAL_SPEED = 1150;

/**
 * Play `script`. `girl` is the senior the choices affect.
 * Resolves when the script has finished and the dialogue box is gone.
 */
export async function playScript(game, script, { girl = null, keepActor = false, light } = {}) {
  const { stage, ui, world, L } = game;
  const lightNow = () => light ?? (game.state ? SLOTS_OF_DAY[game.state.slot].light : 'day');
  let skipping = false;

  // The box itself, repainted when the speaker changes.
  const box = ui.panel({ ...BOX, res: 1.25 });
  box.solid = true;
  // Two copies of the text picture: one clipped to the lines already shown,
  // one clipped to the growing part of the line being written.
  const done = stage.group(box.node),
    doing = stage.group(box.node);
  const textA = stage.pic(done),
    textB = stage.pic(doing);
  for (const group of [done, doing]) {
    group.x = TEXT.x;
    group.y = TEXT.y;
  }
  let advance = null,
    shownActor = null;
  box.blank = () => advance?.();
  ui.background = () => advance?.();
  ui.keys = key => {
    if (key === ' ' || key === 'Enter') advance?.();
    if (key === 'Control') skipping = true;
  };
  box.node.alpha = 0;
  stage.tween(box.node, { alpha: 1 }, 0.25);

  function paintBox(name, color) {
    box.paint(p => {
      const g = p.g;
      const accent = color ?? THEME.violet;
      p.sheet(0, 26, BOX.w, BOX.h - 32, { accent });
      g.strokeStyle = '#e3ccd5';
      g.stroke(rrect(8, 34, BOX.w - 16, BOX.h - 48, 10));
      if (name) {
        const w = Math.max(156, p.measure(name, 22, 750, SERIF) + 52);
        p.card(34, 2, w, 44, { r: 10, fill: '#39304d', stroke: '#756179', shadow: .24 });
        g.fillStyle = accent;
        g.fill(rrect(34, 8, 3, 32, 2));
        p.text(name, 34 + w / 2, 9, { size: 22, weight: 750, family: SERIF, color: THEME.light, align: 'center' });
      }
      p.button(BOX.w - 122, 36, 96, 38, L(['跳过', 'Skip']), () => {
        skipping = true;
        advance?.();
      }, { kind: 'plain', size: 15 });
      g.fillStyle = accent;
      g.fill(poly([[BOX.w - 64, BOX.h - 42], [BOX.w - 47, BOX.h - 42], [BOX.w - 55.5, BOX.h - 30]]));
    });
  }

  /** Show one line of text and wait for a tap. */
  async function say(name, color, text, style = {}) {
    paintBox(name, color);
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `${style.weight ?? 500} ${TEXT.size}px ${FONT}`;
    let lines = wrapText(measure, text, TEXT.w),
      size = TEXT.size,
      lineH = TEXT.lineH;
    if (lines.length > 3) {
      size = 21;
      lineH = 32;
      measure.font = `${style.weight ?? 500} ${size}px ${FONT}`;
      lines = wrapText(measure, text, TEXT.w);
    }
    const widths = lines.map(l => measure.measureText(l).width + 8);
    const canvas = stage.canvas(TEXT.w + 20, lines.length * lineH + 8, 1.5, g => {
      g.font = `${style.weight ?? 500} ${size}px ${FONT}`;
      g.textBaseline = 'top';
      g.fillStyle = style.color ?? THEME.ink;
      if (style.italic) g.font = `italic ${g.font}`;
      lines.forEach((line, i) => g.fillText(line, 0, i * lineH + 4));
    });
    const key = 'line' + Math.random().toString(36).slice(2);
    done.clipRect = { x: 0, y: 0, width: 1, height: 1 };
    doing.clipRect = { x: 0, y: 0, width: 1, height: 1 };
    await Promise.all([textA.show(canvas, canvas.res, key), textB.show(canvas, canvas.res, key)]);
    if (skipping) {
      done.clipRect = { x: 0, y: 0, width: TEXT.w + 20, height: lines.length * lineH + 8 };
      await stage.wait(0.03);
      return;
    }

    await new Promise(resolve => {
      let line = 0,
        x = 0,
        finished = false;
      const end = () => {
        stop();
        advance = null;
        resolve();
      };
      const stop = stage.onTick(dt => {
        if (finished) {
          if (skipping) end();
          return;
        }
        x += dt * REVEAL_SPEED;
        while (line < lines.length && x >= widths[line]) {
          x -= widths[line];
          line++;
        }
        done.clipRect = { x: 0, y: 0, width: TEXT.w + 20, height: Math.max(1, line * lineH + (line ? 4 : 0)) };
        if (line >= lines.length) {
          finished = true;
          doing.clipRect = { x: 0, y: 0, width: 1, height: 1 };
          done.clipRect = { x: 0, y: 0, width: TEXT.w + 20, height: lines.length * lineH + 8 };
        } else doing.clipRect = { x: 0, y: line * lineH + 4, width: Math.max(1, x), height: lineH };
      });
      // The first tap finishes writing the line; the next one moves on.
      advance = () => {
        if (!finished) {
          line = lines.length;
          x = 0;
          return;
        }
        game.audio.play('page');
        end();
      };
    });
  }

  /** Offer choices in the middle of the screen; resolves with the chosen option. */
  function pick(options) {
    skipping = false;
    return new Promise(resolve => {
      // The senior steps aside so the choices do not cover her face.
      const actorX = world.actor?.x,
        beside = actorX !== undefined && !world.actor.full;
      if (beside) world.moveActor(300);
      const pw = beside ? 700 : 900,
        px = beside ? 540 : 190;
      const h = options.length * 78 + 20,
        panel = ui.panel({ x: px, y: (470 - h) / 2 + 30, w: pw, h, res: 1.25, modal: true });
      ui.keys = key => {
        const n = Number(key);
        if (n >= 1 && n <= options.length) choose(options[n - 1]);
      };
      function choose(option) {
        ui.keys = k => {
          if (k === ' ' || k === 'Enter') advance?.();
          if (k === 'Control') skipping = true;
        };
        panel.close();
        if (beside) world.moveActor(actorX);
        resolve(option);
      }
      panel.paint(p =>
        options.forEach((o, i) => {
          const y = 10 + i * 78;
          p.card(0, y, pw, 62, { r: 12, fill: rgba('#fff8ed', .96), stroke: '#e4ccd9', shadow: .25 });
          p.chip(String(i + 1), 14, y + 16, { color: THEME.rose, size: 16, h: 30, padX: 11 });
          const size = p.measure(L(o.t), 21, 600) > pw - 90 ? 16 : 21;
          p.text(L(o.t), 62, y + (size === 21 ? 17 : 12), { size, weight: 600, maxW: pw - 90, lineH: 20 });
          p.hit(0, y, pw, 62, () => choose(o), { r: 12 });
        }),
      );
      panel.node.alpha = 0;
      panel.node.y += 16;
      stage.tween(panel.node, { alpha: 1, y: panel.node.y - 16 }, 0.3);
    });
  }

  async function run(steps) {
    for (const step of steps) {
      const [op, a, b, c] = step;
      if (op === 'bg') {
        if (shownActor === 'professor') {
          shownActor = null;
          await world.hideActor();
        }
        await world.setScene(a, b ?? lightNow());
      } else if (op === 'in') {
        shownActor = a;
        await world.showActor(game.spec(a, b), { view: 'bust', x: W / 2 });
      } else if (op === 'out') {
        shownActor = null;
        await world.hideActor();
      } else if (op === 'fx') {
        if (!skipping) {
          world.effect(a);
          if (a === 'heart') game.audio.play('heart');
          await stage.wait(a === 'heart' ? 0.7 : 0.35);
        }
      } else if (op === 'n') {
        await say(null, THEME.soft, L([a, b]), { color: THEME.soft });
      } else if (op === 'me') {
        await say(L(['我', 'Me']), THEME.sky, L([a, b]));
      } else if (op === 'th') {
        await say(L(['我', 'Me']), THEME.sky, `（${L([a, b])}）`, { color: THEME.soft, italic: game.lang !== 'zh' });
      } else if (op === 'pf') {
        if (!skipping && shownActor !== 'professor' && hasStoryPortrait({ id: 'professor' })) {
          shownActor = 'professor';
          await world.showActor({ id: 'professor' }, { view: 'bust', x: W / 2 });
        }
        await say(L(['温教授', 'Professor Wen']), '#8a6fd0', L([a, b]));
      } else if (op === 'pick') {
        const option = await pick(a);
        if (option.fx && game.state) {
          const gained = sim.applyEffect(game.state, girl, option.fx);
          if (gained > 0) {
            game.toast(`♥ ${L(['好感', 'Affection'])} +${gained}`, 'good');
            game.audio.play('good');
          } else if (gained < 0) game.toast(`${L(['好感', 'Affection'])} ${gained}`, 'bad');
        }
        if (option.then) await run(option.then);
      } else if (HEROINES[op]) {
        // A senior speaks: update her expression first.
        if (shownActor === op || world.actor) await world.showActor(game.spec(op, a), { view: 'bust', x: world.actor?.x ?? W / 2 });
        await say(L(HEROINES[op].name), HEROINES[op].color, L([b, c]));
      }
    }
  }

  await run(script);
  advance = null;
  ui.background = null;
  ui.keys = null;
  await stage.tween(box.node, { alpha: 0 }, 0.2);
  textA.destroy();
  textB.destroy();
  box.close();
  if (!keepActor) await world.hideActor();
}
