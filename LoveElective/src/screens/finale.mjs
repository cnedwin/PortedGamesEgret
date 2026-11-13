// The last night of term: choose whom to tell, play the ending, and show a
// summary of the thirty days.
import { W } from '../engine/stage.mjs';
import { THEME, SERIF } from '../engine/ui.mjs';
import { rgba } from '../art/draw.mjs';
import { HEROINES, HEROINE_IDS, LEVELS, STATS } from '../data/cast.mjs';
import { FINALE_INTRO, ENDINGS, ENDING_SOLO } from '../story/scenes.mjs';
import * as sim from '../sim.mjs';
import { playScript } from './story.mjs';

export async function finale(game) {
  if (game.quit || !game.state?.finale) return;
  const s = game.state;
  game.hideHud();
  const intro = playScript(game, FINALE_INTRO, { light: 'night' });
  await game.fadeIn();
  await intro;
  const girl = await chooseSomeone(game);
  let result = 'solo';
  if (girl) {
    result = sim.confess(s, girl);
    await playScript(game, ENDINGS[girl][result], { girl, light: 'night', keepActor: true });
  } else {
    await playScript(game, ENDING_SOLO, { light: 'night' });
  }
  await summary(game, girl, result);
  await game.world.hideActor();
  game.clearSave();
}

/** The seniors close enough to confess to, and the choice to stay silent. */
function chooseSomeone(game) {
  const { ui, L } = game,
    s = game.state,
    list = sim.confessable(s);
  return new Promise(resolve => {
    const w = Math.max(520, list.length * 150 + 60),
      panel = ui.panel({ x: (W - w) / 2, y: 150, w, h: 400, res: 1.25, modal: true });
    const done = id => {
      panel.close();
      resolve(id);
    };
    panel.paint(p => {
      p.card(0, 0, w, 392, { r: 28 });
      p.text(L(['把心意告诉谁？', 'Whom will you tell?']), w / 2, 26, { size: 28, weight: 800, align: 'center', family: SERIF });
      if (!list.length)
        p.text(L(['这学期，还没有谁走进你的心里。', 'This term, nobody has yet found a way into your heart.']), w / 2, 150, {
          size: 18,
          color: THEME.soft,
          align: 'center',
        });
      list.forEach((id, i) => {
        const x = (w - list.length * 150) / 2 + i * 150,
          h = HEROINES[id];
        game.avatar(p, id, x + 25, 92, 100);
        p.text(L(h.name), x + 75, 200, { size: 18, weight: 800, color: h.color, align: 'center' });
        p.text(`♥ ${s.girls[id].aff}`, x + 75, 226, { size: 15, weight: 700, color: THEME.rose, align: 'center' });
        p.hit(x + 8, 84, 134, 174, () => done(id), { r: 20 });
      });
      p.button(w / 2 - 150, 310, 300, 52, L(['今晚，谁也不说', 'Tonight, tell no one']), () => done(null), { kind: 'dark', size: 18 });
    });
  });
}

function summary(game, girl, result) {
  const { ui, stage, L } = game,
    s = game.state;
  return new Promise(resolve => {
    const panel = ui.panel({ x: 200, y: 50, w: 880, h: 620, res: 1.2, modal: true });
    const title =
      result === 'love' ? ['恋爱结局', 'Love Ending'] : result === 'friend' ? ['未完待续', 'To Be Continued'] : ['独自的星空', "A Sky of One's Own"];
    const line =
      result === 'love'
        ? ['作业完成。成绩：满分。', 'Assignment complete. Grade: full marks.']
        : result === 'friend'
          ? ['心意已经送到。答案，留给下一个学期。', 'Your feelings have been delivered. The answer waits for next term.']
          : ['这门课允许重修。', 'This course may be retaken.'];
    panel.paint(p => {
      p.card(0, 0, 880, 612, { r: 30, fill: rgba('#ffffff', 0.96) });
      p.text(L(title), 440, 30, { size: 44, weight: 800, family: SERIF, align: 'center', color: result === 'love' ? THEME.rose : THEME.ink });
      if (girl) p.text(L(HEROINES[girl].name), 440, 92, { size: 22, weight: 700, color: HEROINES[girl].color, align: 'center' });
      p.text(L(line), 440, 128, { size: 17, color: THEME.soft, align: 'center' });
      p.text(L(['三十天的成绩单', 'Thirty days in review']), 50, 178, { size: 18, weight: 800 });
      Object.keys(STATS).forEach((k, i) => {
        p.text(L(STATS[k]), 50, 214 + i * 34, { size: 16, weight: 600 });
        p.bar(120, 220 + i * 34, 220, 12, sim.statValue(s, k), 100, { color: THEME.violet, color2: THEME.sky });
        p.text(String(sim.statValue(s, k)), 352, 212 + i * 34, { size: 16, weight: 800 });
      });
      p.text(`${L(['约会', 'Dates'])} ${s.counters.date ?? 0}  ·  ${L(['送礼', 'Presents'])} ${s.counters.gift ?? 0}  ·  ¥ ${s.money}`, 50, 396, {
        size: 15,
        color: THEME.soft,
      });
      p.text(L(['与学姐们', 'With the seniors']), 470, 178, { size: 18, weight: 800 });
      HEROINE_IDS.forEach((id, i) => {
        const g = s.girls[id],
          y = 210 + i * 42;
        if (g.met) game.avatar(p, id, 470, y, 34);
        p.text(g.met ? L(HEROINES[id].name) : '？？？', 514, y + 6, { size: 15, weight: 700, color: g.met ? HEROINES[id].color : THEME.faint });
        p.bar(600, y + 12, 150, 10, g.aff, 100, { color: THEME.rose, color2: THEME.pink });
        p.text(g.met ? L(LEVELS[sim.level(g.aff)].name) : '', 762, y + 6, { size: 13, color: THEME.soft });
      });
      p.button(
        300,
        536,
        280,
        54,
        L(['回到标题', 'Back to the title']),
        () => {
          panel.close();
          resolve();
        },
        { kind: 'primary', size: 20 },
      );
    });
    panel.node.alpha = 0;
    stage.tween(panel.node, { alpha: 1 }, 0.5);
  });
}
