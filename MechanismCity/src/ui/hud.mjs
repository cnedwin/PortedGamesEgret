// 关卡里的界面：关名、剩余弹丸、分数与连击（位图字体）、力度滑条、发射与全景按钮。
// The interface over a level: its name, the pellets left, the score and the combo in the bitmap font, the
// power slider, and the buttons to fire, to see the whole city, to start again and to leave.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';
import { drawPellet } from '../art/shapes.mjs';
import { PELLETS } from '../sim/rules.mjs';
import { SANS } from './kit.mjs';

export async function createHud(game, scope, kit, { font, fontPages, title, subtitle, pellets, power, onPower, onFire, onOverview, onRestart, onMenu, onSettings }) {
  const root = game.stage.addChild(scope.use(new DisplayObjectContainer()));

  // Top left: the name of the level and the pellets in the quiver.
  kit.panel({ x: 12, y: 10, width: 300, height: 92, container: root, alpha: 0.78 });
  await kit.label(root, title, { x: 30, y: 22, size: 24, weight: 700, color: 0xf6e2b0 });
  await kit.label(root, subtitle, { x: 30, y: 54, size: 13, color: 0xb8ac94, family: SANS });
  const quiver = root.addChild(scope.use(new Sprite()));
  quiver.x = 30;
  quiver.y = 82;
  // Pellets are drawn in a row, each in a small sprite of its own so each can be placed.
  const shells = pellets.map((type, i) => {
    const shell = quiver.addChild(scope.use(new Sprite()));
    shell.x = i * 24 + 8;
    shell.graphics.beginFill(0x000000, 0.35).drawCircle(0, 0, 11).endFill();
    drawPellet(shell.graphics, type, (PELLETS[type]?.radius ?? 7) * 0.95);
    return shell;
  });

  // Top right: the score and the combo, in the game's own gold lettering.
  const score = scope.use(createBitmapText({ font, pages: fontPages, text: '0', align: 'right', maxWidth: 220 }));
  root.addChild(score.display);
  score.display.x = 960 - 20 - 220;
  score.display.y = 70;
  const combo = scope.use(createBitmapText({ font, pages: fontPages, text: '', align: 'center', maxWidth: 260 }));
  const comboHolder = root.addChild(scope.use(new DisplayObjectContainer()));
  comboHolder.addChild(combo.display);
  combo.display.x = -130;
  combo.display.y = -26;
  comboHolder.x = 480;
  comboHolder.y = 120;
  comboHolder.alpha = 0;

  // Made left to right, so Tab moves across them in the order they are seen.
  const settings = await kit.button({ x: 960 - 20 - 400, y: 14, width: 92, height: 44, text: '设置', name: '设置', onActivate: onSettings, container: root, small: true });
  const buttons = {
    overview: await kit.button({ x: 960 - 20 - 300, y: 14, width: 92, height: 44, text: '全景', name: '全景 · 看整座城', onActivate: onOverview, container: root, small: true }),
    restart: await kit.button({ x: 960 - 20 - 200, y: 14, width: 92, height: 44, text: '重来', name: '重来 · 重新开始本关', onActivate: onRestart, container: root, small: true }),
    menu: await kit.button({ x: 960 - 20 - 100, y: 14, width: 100, height: 44, text: '选关', name: '回到选关', onActivate: onMenu, container: root, small: true })
  };

  // The power slider under the name, clear of the crossbow at the foot of the city; the fire button bottom right.
  kit.panel({ x: 12, y: 108, width: 300, height: 74, container: root, alpha: 0.78 });
  const slider = await kit.slider({ x: 40, y: 160, length: 230, value: power, text: '力度 · 拖动或用 W / S', onChange: onPower, container: root });
  const fire = await kit.button({ x: 960 - 20 - 170, y: 540 - 80, width: 170, height: 64, text: '发射', sub: '空格 · 或拖拽拉弦', name: '发射', primary: true, onActivate: onFire, container: root, disabledAlpha: 0.22 });

  let wasReady = null,
    shownScore = 0,
    targetScore = 0;
  return {
    root,
    slider,
    fire,
    buttons,
    settings,
    /** The pellets fired so far. */
    setUsed(used) {
      shells.forEach((shell, i) => (shell.alpha = i < used ? 0.18 : 1));
    },
    setPower: (value) => slider.control.setValue(value),
    setReady(ready) {
      if (ready === wasReady) return;
      wasReady = ready;
      fire.setEnabled(ready);
    },
    setScore(value) {
      targetScore = value;
    },
    /** A combo of mechanisms set off one after another: shown in the middle, it swells and fades. */
    showCombo(count, points) {
      combo.text = count > 1 ? `${count}连击 +${points}` : `+${points}`;
      comboHolder.alpha = 1;
      comboHolder.scaleX = comboHolder.scaleY = 0.6;
      animate(game.engine, scope, comboHolder).to({ scaleX: 1.15, scaleY: 1.15 }, 0.16, 'backOut').to({ scaleX: 1, scaleY: 1 }, 0.12).wait(0.7).to({ alpha: 0 }, 0.4, 'quadIn').start();
    },
    update(seconds) {
      if (shownScore !== targetScore) {
        shownScore = Math.min(targetScore, shownScore + Math.max(10, Math.ceil((targetScore - shownScore) * seconds * 6)));
        score.text = String(shownScore);
      }
    }
  };
}
