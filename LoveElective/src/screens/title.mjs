// Title screen: the logo, the seven seniors in a row, and the main menu.
import { W, H } from '../engine/stage.mjs';
import { THEME, SERIF } from '../engine/ui.mjs';
import { rgba, heart, star } from '../art/draw.mjs';
import { drawFigure } from '../art/figure.mjs';
import { HEROINES, HEROINE_IDS } from '../data/cast.mjs';

/** Shows the title and resolves with 'new' or 'continue'. */
export function titleScreen(game) {
  const { ui, stage, world, L } = game;
  return new Promise(resolve => {
    world.calm = false;
    world.setScene('gate', 'dusk');
    game.hideHud();
    const cast = ui.panel({ x: 0, y: 0, w: W, h: H, res: 0.9 });
    const menu = ui.panel({ x: 0, y: 0, w: 560, h: H, res: 1.25 });
    let confirmNew = false;

    function paint() {
      cast.paint(p => {
        const g = p.g;
        // The seniors stand in a row, the middle ones a little further forward.
        const order = [0, 6, 1, 5, 2, 4, 3];
        for (const i of order) {
          const id = HEROINE_IDS[i],
            k = 0.5 + (3 - Math.abs(i - 3)) * 0.035;
          g.save();
          g.translate(520 + i * 108 - 200 * k, H - 1040 * k + 150 - (3 - Math.abs(i - 3)) * 8);
          g.scale(k, k);
          drawFigure(g, {
            ...HEROINES[id].look,
            wear: HEROINES[id].outfits.uniform,
            expr: ['smile', 'joy', 'smile', 'tease', 'normal', 'joy', 'smile'][i],
          });
          g.restore();
        }
        const fade = g.createLinearGradient(0, H - 150, 0, H);
        fade.addColorStop(0, rgba('#1b1440', 0));
        fade.addColorStop(1, rgba('#1b1440', 0.7));
        g.fillStyle = fade;
        g.fillRect(0, H - 150, W, 150);
        p.text(L(['基于新白鹭引擎开发的游戏 Demo', 'A game demo built with Egret Rebuild']), W - 28, H - 36, {
          size: 15,
          color: rgba('#ffffff', 0.85),
          align: 'right',
        });
      });
      menu.paint(p => {
        const g = p.g,
          side = g.createLinearGradient(0, 0, 560, 0);
        side.addColorStop(0, rgba('#1b1440', 0.72));
        side.addColorStop(0.7, rgba('#1b1440', 0.4));
        side.addColorStop(1, rgba('#1b1440', 0));
        g.fillStyle = side;
        g.fillRect(0, 0, 560, H);
        g.fillStyle = THEME.pink;
        g.fill(heart(86, 118, 20));
        g.fillStyle = '#ffe9a8';
        g.fill(star(118, 92, 9, 3.6, 4));
        p.text('心动选修课', 56, 150, { size: 76, weight: 800, family: SERIF, color: '#ffffff', stroke: [rgba('#ff5c8d', 0.55), 10] });
        p.text('LOVE ELECTIVE', 62, 252, { size: 25, weight: 700, color: '#ffd9e6' });
        g.fillStyle = p.gradient(62, 300, THEME.pink, rgba(THEME.violet, 0));
        g.fillRect(62, 292, 300, 3);
        p.text(L(['三十天，七位学姐，一份只能自己完成的作业。', 'Thirty days, seven seniors, and one assignment only you can finish.']), 62, 308, {
          size: 18,
          color: rgba('#ffffff', 0.9),
          maxW: 400,
        });
        let y = 400;
        if (game.hasSave()) {
          p.button(62, y, 280, 58, L(['继续学期', 'Continue']), () => finish('continue'), { kind: 'primary', size: 22 });
          y += 72;
        }
        // Starting over replaces the saved term, so ask twice.
        p.button(
          62,
          y,
          280,
          58,
          confirmNew ? L(['再点一次，覆盖存档', 'Tap again to overwrite']) : L(['新的学期', 'New Term']),
          () => {
            if (game.hasSave() && !confirmNew) {
              confirmNew = true;
              paint();
            } else finish('new');
          },
          { kind: game.hasSave() ? 'ghost' : 'primary', size: confirmNew ? 18 : 22 },
        );
        y += 72;
        p.button(
          62,
          y,
          134,
          46,
          game.lang === 'zh' ? 'English' : '中文',
          () => {
            game.setLang(game.lang === 'zh' ? 'en' : 'zh');
            paint();
          },
          { kind: 'ghost', size: 17 },
        );
        p.button(
          208,
          y,
          134,
          46,
          game.audio.muted ? L(['声音：关', 'Sound: off']) : L(['声音：开', 'Sound: on']),
          () => {
            game.audio.setMuted(!game.audio.muted);
            game.savePrefs();
            paint();
          },
          { kind: 'ghost', size: 17 },
        );
      });
    }

    function finish(result) {
      game.fadeOut().then(() => {
        cast.close();
        menu.close();
        resolve(result);
      });
    }

    paint();
    menu.node.x = -40;
    menu.node.alpha = 0;
    stage.tween(menu.node, { x: 0, alpha: 1 }, 0.6, { delay: 0.2 });
    game.fadeIn(0.8);
  });
}
