// 关卡里的界面：关名、剩余弹丸、分数与连击（位图字体）、力度滑条、发射与全景按钮。
// The interface over a level: its name, the pellets left, the score and the combo in the bitmap font, the
// power slider, and the buttons to fire, to see the whole city, to start again and to leave.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';
import { drawPellet } from '../art/shapes.mjs';
import { PELLETS } from '../sim/rules.mjs';
import { SANS } from './kit.mjs';

function inlay(g, x, y, width) {
  g.lineStyle(1, 0xb58a58, 0.58).moveTo(x + 6, y).lineTo(x + width - 6, y).lineStyle(0);
  for (const cx of [x + 3, x + width - 3]) {
    g.beginFill(0xc79e64, 0.88).moveTo(cx, y - 2).lineTo(cx + 2, y).lineTo(cx, y + 2).lineTo(cx - 2, y).lineTo(cx, y - 2).endFill();
  }
}

export async function createHud(game, scope, kit, { font, fontPages, title, subtitle, challenge, pellets, power, onPower, onFire, onOverview, onRestart, onMenu, onSettings, onHint, onCloseHint }) {
  const root = game.stage.addChild(scope.use(new DisplayObjectContainer()));

  kit.panel({ x: 12, y: 10, width: 276, height: 101, container: root, alpha: 0.9 });
  const trim = root.addChild(scope.use(new Sprite())).graphics;
  inlay(trim, 32, 74, 236);
  await kit.label(root, title, { x: 32, y: 19, size: 26, weight: 700, color: 0xffebc1 });
  const detail = await kit.label(root, subtitle, { x: 34, y: 53, size: 13, color: 0xd4c19d, family: SANS });
  const detailScale = Math.min(1, 233 / Math.max(1, detail.display.width));
  detail.display.scaleX = detail.display.scaleY = detailScale;
  const quiver = root.addChild(scope.use(new Sprite()));
  quiver.x = 30;
  quiver.y = 93;
  const shells = pellets.map((type, i) => {
    const x = i * 27 + 11;
    quiver.graphics.lineStyle(1, 0x8d693e, 0.9).beginFill(0x151614, 0.95).drawCircle(x, 0, 11).endFill().lineStyle(0);
    const shell = quiver.addChild(scope.use(new Sprite()));
    shell.x = x;
    drawPellet(shell.graphics, type, (PELLETS[type]?.radius ?? 7) * 0.86);
    return shell;
  });

  kit.panel({ x: 772, y: 66, width: 168, height: 47, container: root, alpha: 0.9 });
  await kit.label(root, '分数', { x: 786, y: 81, size: 14, color: 0xd9c399 });
  const score = scope.use(createBitmapText({ font, pages: fontPages, text: '0', align: 'right', maxWidth: 220 }));
  root.addChild(score.display);
  score.display.scaleX = score.display.scaleY = 0.68;
  score.display.x = 928 - 220 * 0.68;
  score.display.y = 72;
  const combo = scope.use(createBitmapText({ font, pages: fontPages, text: '', align: 'center', maxWidth: 260 }));
  const comboHolder = root.addChild(scope.use(new DisplayObjectContainer()));
  comboHolder.addChild(combo.display);
  combo.display.x = -130;
  combo.display.y = -26;
  comboHolder.x = 480;
  comboHolder.y = 120;
  comboHolder.alpha = 0;

  // Made left to right, so Tab moves across them in the order they are seen.
  const hintButton = await kit.button({ x: 440, y: 14, width: 92, height: 44, text: '提示', name: '提示', onActivate: onHint, container: root, small: true });
  const settings = await kit.button({ x: 960 - 20 - 400, y: 14, width: 92, height: 44, text: '设置', name: '设置', onActivate: onSettings, container: root, small: true });
  const buttons = {
    overview: await kit.button({ x: 960 - 20 - 300, y: 14, width: 92, height: 44, text: '全景', name: '全景 · 看整座城', onActivate: onOverview, container: root, small: true }),
    restart: await kit.button({ x: 960 - 20 - 200, y: 14, width: 92, height: 44, text: '重来', name: '重来 · 重新开始本关', onActivate: onRestart, container: root, small: true }),
    menu: await kit.button({ x: 960 - 20 - 100, y: 14, width: 100, height: 44, text: '选关', name: '回到选关', onActivate: onMenu, container: root, small: true })
  };

  // The power slider under the name, clear of the crossbow at the foot of the city; the fire button bottom right.
  kit.panel({ x: 12, y: 115, width: 276, height: 67, container: root, alpha: 0.9 });
  const touch = globalThis.matchMedia?.('(pointer: coarse)').matches;
  const slider = await kit.slider({ x: 40, y: 160, length: 230, value: power, text: touch ? '力度 · 拖动滑条' : '力度 · 拖动或用 W / S', onChange: onPower, container: root });
  const fire = await kit.button({ x: 960 - 20 - 170, y: 540 - 80, width: 170, height: 64, text: '发射', sub: touch ? '松手 · 或轻点发射' : '空格 · 或拖拽拉弦', name: '发射', primary: true, onActivate: onFire, container: root, disabledAlpha: 0.22 });
  const hintBox = root.addChild(scope.use(new DisplayObjectContainer()));
  hintBox.visible = false;
  kit.panel({ x: 14, y: 411, width: 544, height: 104, container: hintBox });
  await kit.label(hintBox, '机关线索', { x: 32, y: 424, size: 16, weight: 700, color: 0xe7b973 });
  const hintText = await kit.label(hintBox, ' ', { x: 32, y: 454, size: 16, color: 0xf6ead0 });
  await kit.label(hintBox, `巧解目标 · ${challenge}`, { x: 32, y: 483, size: 14, color: 0xb4cdbd, family: SANS });
  const closeHint = await kit.button({ x: 472, y: 421, width: 74, height: 30, text: '关闭', name: '关闭提示', small: true, onActivate: onCloseHint, container: hintBox });
  closeHint.root.visible = false;
  const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');
  let currentHint = null;
  function layoutHint() {
    hintBox.visible = Boolean(currentHint) && !portrait.matches;
    closeHint.root.visible = hintBox.visible && currentHint.button === '对准';
    closeHint.setEnabled(closeHint.root.visible);
  }
  portrait.addEventListener('change', layoutHint);
  scope.use({ dispose: () => portrait.removeEventListener('change', layoutHint) });

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
    setHint(hint) {
      currentHint = hint;
      layoutHint();
      if (hint) void hintText.set(hint.text);
      const label = hint?.button ?? '提示';
      void hintButton.setText(label);
      hintButton.setName(label);
    },
    setReady(ready) {
      if (ready === wasReady) return;
      wasReady = ready;
      fire.setEnabled(ready);
      hintButton.setEnabled(ready);
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
