// The game object shared by every screen: engine stage, scene, interface,
// current save, language, and the small pieces all screens use (top bar,
// pop-up messages, portraits, fades).
import { createStage, W, H } from './engine/stage.mjs';
import { createUI, THEME } from './engine/ui.mjs';
import { createWorld } from './engine/world.mjs';
import { createAudio } from './audio.mjs';
import { drawFigure, FIGURE_TOP } from './art/figure.mjs';
import { rgba, ellipse } from './art/draw.mjs';
import { HEROINES, HERO } from './data/cast.mjs';
import { SLOTS_OF_DAY, WEEKDAYS, DAYS_IN_TERM } from './data/places.mjs';
import * as sim from './sim.mjs';

const SAVE_KEY = 'love-elective-save-v1';
const PREFS_KEY = 'love-elective-prefs-v1';

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: play without saving */
  }
}

export async function createGame(canvas, options) {
  const stage = await createStage(canvas, options);
  const world = createWorld(stage);
  const uiLayer = stage.group();
  const ui = createUI(stage, uiLayer);
  const curtain = stage.rect(stage.root, 0x14122a);
  curtain.alpha = 1;
  const audio = createAudio();
  ui.onTap = () => audio.play('tap');

  const prefs = JSON.parse(readStorage(PREFS_KEY) ?? '{}');
  const params = new URLSearchParams(location.search);
  const game = {
    stage,
    world,
    ui,
    audio,
    state: null,
    lang: params.get('lang') ?? prefs.lang ?? (navigator.language?.startsWith('zh') ? 'zh' : 'en'),
    /** Pick the current language from a [中文, English] pair. */
    L: pair => (Array.isArray(pair) ? pair[game.lang === 'zh' ? 0 : 1] : pair),
  };
  audio.setMuted(prefs.muted ?? false);

  game.savePrefs = () => writeStorage(PREFS_KEY, JSON.stringify({ lang: game.lang, muted: audio.muted }));
  game.setLang = lang => {
    game.lang = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    game.savePrefs();
  };
  game.setLang(game.lang);

  // ---- saving
  game.hasSave = () => !!sim.deserialize(readStorage(SAVE_KEY) ?? '');
  game.save = () => {
    if (game.state) writeStorage(SAVE_KEY, sim.serialize(game.state));
  };
  game.load = () => {
    game.state = sim.deserialize(readStorage(SAVE_KEY) ?? '');
    return !!game.state;
  };
  game.newGame = () => {
    game.state = sim.newGame();
  };
  game.clearSave = () => {
    game.state = null;
    writeStorage(SAVE_KEY, '');
  };

  // ---- characters
  /** The description the character painter needs for the hero or a senior, as currently dressed. */
  game.spec = (who, expr = 'normal') => {
    const s = game.state;
    if (who === 'hero') return { ...HERO.look, hair: s?.hero.hair ?? HERO.look.hair, wear: s?.hero.wear ?? HERO.wear, expr };
    return { ...HEROINES[who].look, wear: s?.girls[who].wear ?? HEROINES[who].outfits.uniform, expr };
  };

  const faces = new Map();
  /** A square head-and-shoulders portrait as a canvas, for drawing into panels. `change` overrides parts of the look. */
  game.face = (who, expr = 'smile', change) => {
    const spec = { ...game.spec(who, expr), ...change },
      key = JSON.stringify(spec);
    let c = faces.get(key);
    if (!c) {
      if (faces.size > 80) faces.clear();
      c = document.createElement('canvas');
      c.width = c.height = 160;
      const g = c.getContext('2d'),
        k = 160 / 236;
      g.scale(k, k);
      g.translate(-82, -(FIGURE_TOP + 4));
      drawFigure(g, spec);
      faces.set(key, c);
    }
    return c;
  };

  /** Draw a round portrait with a coloured ring into a panel painter. */
  game.avatar = (p, who, x, y, size, { ring, expr } = {}) => {
    const g = p.g;
    g.fillStyle = rgba(ring ?? (who === 'hero' ? THEME.sky : HEROINES[who].color), 0.25);
    g.fill(ellipse(x + size / 2, y + size / 2, size / 2, size / 2));
    p.image(game.face(who, expr), x, y, size, size, { r: size / 2 });
    g.lineWidth = Math.max(2, size * 0.06);
    g.strokeStyle = ring ?? (who === 'hero' ? THEME.sky : HEROINES[who].color);
    g.stroke(ellipse(x + size / 2, y + size / 2, size / 2 - 1, size / 2 - 1));
  };

  // ---- fades
  game.fadeOut = (seconds = 0.35) => {
    stage.root.setChildIndex(curtain, stage.root.numChildren - 1);
    return stage.tween(curtain, { alpha: 1 }, seconds, { ease: 'in' });
  };
  game.fadeIn = (seconds = 0.45) => stage.tween(curtain, { alpha: 0 }, seconds, { ease: 'out' });

  // ---- pop-up messages
  const toasts = [];
  /** Show a short message near the top of the screen. tone: 'good' | 'bad' | 'info'. */
  game.toast = (text, tone = 'info') => {
    const color = tone === 'good' ? THEME.rose : tone === 'bad' ? THEME.soft : THEME.violet;
    const panel = ui.panel({ x: (W - 620) / 2, y: 92 + toasts.length * 58, w: 620, h: 52, res: 1.25 });
    panel.paint(p => {
      const w = Math.min(600, p.measure(text, 19, 700) + 56);
      p.card((620 - w) / 2, 4, w, 42, { r: 21, fill: rgba('#ffffff', 0.95), shadow: 0.25 });
      p.g.fillStyle = color;
      p.g.fill(ellipse((620 - w) / 2 + 22, 25, 6, 6));
      p.text(text, 310 + 8, 13, { size: 19, weight: 700, color: THEME.ink, align: 'center' });
    });
    toasts.push(panel);
    panel.node.alpha = 0;
    stage
      .tween(panel.node, { alpha: 1 }, 0.2)
      .then(() => stage.wait(1.7))
      .then(() => stage.tween(panel.node, { alpha: 0 }, 0.35))
      .then(() => {
        toasts.splice(toasts.indexOf(panel), 1);
        panel.close();
      });
  };

  // ---- top bar
  let hud = null;
  /** Show or refresh the bar with the date, energy, money and the phone button. */
  game.showHud = onPhone => {
    const s = game.state,
      c = sim.clock(s),
      L = game.L;
    hud ??= ui.panel({ x: 0, y: 0, w: W, h: 76, res: 1.25 });
    if (onPhone !== undefined) hud.onPhone = onPhone;
    hud.paint(p => {
      p.card(18, 12, 396, 52, { r: 26, fill: rgba('#ffffff', 0.92) });
      p.chip(L(['第', 'Day ']) + c.day + L([' 天', '']) + ' / ' + DAYS_IN_TERM, 28, 24, { color: THEME.rose, size: 15, h: 28 });
      p.text(`${L(WEEKDAYS[c.weekday])} · ${L(SLOTS_OF_DAY[c.slot].name)}`, 168, 25, { size: 19, weight: 700 });
      const light = SLOTS_OF_DAY[c.slot].light;
      // A small sun, sunset or moon for the time of day.
      p.g.fillStyle = light === 'night' ? '#8fa6ff' : light === 'dusk' ? THEME.warn : THEME.gold;
      p.g.fill(ellipse(386, 38, 11, 11));
      if (light === 'night') {
        p.g.fillStyle = '#ffffff';
        p.g.fill(ellipse(381, 34, 9, 9));
      }
      p.card(428, 12, 250, 52, { r: 26, fill: rgba('#ffffff', 0.92) });
      p.text(L(['体力', 'Energy']), 446, 27, { size: 15, weight: 700, color: THEME.soft });
      p.bar(508, 31, 110, 14, s.energy, 100, { color: s.energy < 25 ? THEME.warn : THEME.mint, color2: s.energy < 25 ? THEME.gold : THEME.sky });
      p.text(String(s.energy), 628, 25, { size: 18, weight: 800 });
      p.card(692, 12, 150, 52, { r: 26, fill: rgba('#ffffff', 0.92) });
      p.text('¥', 712, 23, { size: 22, weight: 800, color: THEME.gold });
      p.text(String(s.money), 736, 24, { size: 20, weight: 800 });
      if (hud.onPhone) p.button(W - 176, 12, 158, 52, L(['手机', 'Phone']), hud.onPhone, { kind: 'primary', size: 19 });
    });
    hud.node.visible = true;
  };
  game.hideHud = () => {
    if (hud) hud.node.visible = false;
  };

  stage.start();
  return game;
}

export { W, H, sim };
