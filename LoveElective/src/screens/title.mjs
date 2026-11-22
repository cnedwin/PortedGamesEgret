// Keep the menu available while the title illustration loads independently.
import { W, H } from '../engine/stage.mjs';
import { SERIF } from '../engine/ui.mjs';
import { rgba, star } from '../art/draw.mjs';
import { loadCover } from '../art/character-art.mjs';
import { endingCount } from './memories.mjs';

function coverImage(g, image) {
  const ratio = Math.max(W / image.width, H / image.height);
  const width = image.width * ratio, height = image.height * ratio;
  g.drawImage(image, (W - width) / 2, (H - height) / 2, width, height);
}

/** Show the title and resolve to the selected way to start. */
export function titleScreen(game) {
  const { ui, stage, world, L } = game;
  return new Promise(resolve => {
    world.calm = false;
    world.setScene('gate', 'dusk');
    game.hideHud();
    // An opaque base also covers the world while the title textures are prepared.
    const backdrop = stage.rect(ui.layer, 0x18162b);
    const artwork = stage.pic(ui.layer);
    artwork.node.alpha = 0;
    const scene = ui.panel({ x: 0, y: 0, w: W, h: H, res: 1 });
    const menu = ui.panel({ x: 0, y: 0, w: 600, h: H, res: 1.25 });
    let confirmNew = false;
    let ending = false;

    function paintScene() {
      scene.paint(p => {
        const g = p.g;
        const fade = g.createLinearGradient(0, H - 186, 0, H);
        fade.addColorStop(0, rgba('#211b2e', 0));
        fade.addColorStop(1, rgba('#181527', .80));
        g.fillStyle = fade;
        g.fillRect(0, H - 186, W, 186);
        g.strokeStyle = rgba('#f8d9cd', .28);
        g.strokeRect(19.5, 19.5, W - 39, H - 39);
        p.text(L(['基于新白鹭引擎开发', 'Built with Egret Rebuild']), W - 41, H - 54, {
          size: 13, color: '#efdedf', align: 'right',
        });
      });
    }

    function paintMenu() {
      menu.paint(p => {
        const g = p.g;
        const side = g.createLinearGradient(0, 0, 598, 0);
        side.addColorStop(0, '#1e1a2e');
        side.addColorStop(.43, rgba('#261d35', .96));
        side.addColorStop(.75, rgba('#291f36', .63));
        side.addColorStop(1, rgba('#291f36', 0));
        g.fillStyle = side;
        g.fillRect(0, 0, 600, H);
        g.strokeStyle = rgba('#f8d9cd', .28);
        g.beginPath();
        g.moveTo(19.5, H - 20);
        g.lineTo(19.5, 19.5);
        g.lineTo(206, 19.5);
        g.stroke();

        g.fillStyle = '#efbba3';
        g.fill(star(79, 144, 13, 3, 4));
        g.fill(star(100, 132, 6, 1.5, 4));
        g.fillStyle = p.gradient(118, 245, '#d78e9b', rgba('#d78e9b', 0));
        g.fillRect(118, 143, 232, 1.5);
        p.text('心动选修课', 62, 174, { size: 75, weight: 800, family: SERIF, color: '#fff2e3' });
        p.text('Love Elective', 68, 268, { size: 39, weight: 600, family: SERIF, color: '#e5a8b4' });
        p.text(L(['在星空祭之前，认真认识一个人。', 'Before the Star Festival, get to know someone.']), 70, 343, {
          size: 19, color: '#f2dce0', maxW: 345, lineH: 29,
        });

        let y = 424;
        const canContinue = game.hasSave();
        if (canContinue) {
          p.button(70, y, 286, 54, L(['继续学期', 'Continue']), () => finish('continue'), { kind: 'primary', size: 21 });
          y += 64;
        }
        p.button(70, y, 286, 54,
          confirmNew ? L(['确认覆盖存档', 'Confirm overwrite']) : L(['开始新学期', 'New Term']),
          () => {
            if (canContinue && !confirmNew) {
              confirmNew = true;
              paintMenu();
            } else finish('new');
          }, { kind: canContinue ? 'ghost' : 'primary', size: confirmNew ? 18 : 21 });
        y += 68;
        p.button(70, y, 138, 42, game.lang === 'zh' ? 'English' : '中文', () => {
          game.setLang(game.lang === 'zh' ? 'en' : 'zh');
          paintScene();
          paintMenu();
        }, { kind: 'ghost', size: 16 });
        p.button(218, y, 138, 42, game.audio.muted ? L(['声音关', 'Sound off']) : L(['声音开', 'Sound on']), () => {
          game.audio.setMuted(!game.audio.muted);
          game.savePrefs();
          paintMenu();
        }, { kind: 'ghost', size: 16 });
        y += 52;
        // The album of endings, achievements and perks kept across terms.
        p.button(70, y, 286, 42, `${L(['回忆册', 'Memories'])}  ·  ${endingCount(game.memories)}`, () => finish('album'), {
          kind: 'ghost',
          size: 16,
        });
      });
    }

    function finish(result) {
      if (ending) return;
      ending = true;
      ui.keys = null;
      scene.enabled = menu.enabled = false;
      game.fadeOut().then(() => {
        artwork.destroy();
        ui.layer.removeChild(backdrop);
        backdrop.dispose();
        scene.close();
        menu.close();
        resolve(result);
      });
    }

    paintScene();
    paintMenu();
    void loadCover().then(async image => {
      if (!image || ending) return;
      await artwork.paint(W, H, 1, g => coverImage(g, image));
      if (!ending && artwork.bitmap) stage.tween(artwork.node, { alpha: 1 }, 0.28);
    }).catch(stage.fail);
    ui.keys = key => {
      if (key === 'Enter') finish(game.hasSave() ? 'continue' : 'new');
    };
    menu.node.alpha = 0;
    stage.tween(menu.node, { alpha: 1 }, .52, { delay: .12 });
    game.fadeIn(.65);
  });
}
