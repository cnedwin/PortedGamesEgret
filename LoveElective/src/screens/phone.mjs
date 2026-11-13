// The hero's phone: the seniors and how things stand with each, tasks,
// the bag, his own stats, and settings.
import { THEME } from '../engine/ui.mjs';
import { rgba, rrect, ellipse } from '../art/draw.mjs';
import { drawItemIcon } from '../art/icons.mjs';
import { drawGarmentIcon } from '../art/garments.mjs';
import { drawMannequin } from '../art/figure.mjs';
import { HEROINES, HEROINE_IDS, LEVELS, STATS } from '../data/cast.mjs';
import { PLACES } from '../data/places.mjs';
import { GIFTS, SUPPLIES, CLOTHES, STYLES } from '../data/items.mjs';
import * as sim from '../sim.mjs';

const TABS = [
  ['girls', ['学姐', 'Seniors']],
  ['quests', ['任务', 'Tasks']],
  ['bag', ['背包', 'Bag']],
  ['me', ['我', 'Me']],
  ['system', ['设置', 'Settings']],
];
const QUESTS_PER_PAGE = 5;

/** Open the phone on a tab. Resolves with 'quit' if the player returns to the title, otherwise undefined. */
export function openPhone(game, tab = 'girls') {
  const { ui, stage, L } = game,
    s = game.state;
  return new Promise(resolve => {
    const view = { tab, page: 0, confirm: false };
    const panel = ui.panel({ x: 150, y: 80, w: 980, h: 620, res: 1.2, modal: true });
    const close = result => {
      panel.close();
      resolve(result);
    };
    panel.dismiss = () => close();
    const repaint = () => panel.paint(paint);

    function rewardText(r) {
      const parts = [];
      if (r.money) parts.push(`¥ ${r.money}`);
      for (const [k, n] of Object.entries(r.stats ?? {})) parts.push(`${L(STATS[k])} +${n}`);
      for (const [k, n] of Object.entries(r.items ?? {})) parts.push(`${L((GIFTS[k] ?? SUPPLIES[k]).name)} ×${n}`);
      if (r.aff) parts.push(`${L(HEROINES[r.aff[0]].name)} ♥ +${r.aff[1]}`);
      return parts.join('  ·  ');
    }

    const pages = {
      girls(p) {
        HEROINE_IDS.forEach((id, i) => {
          const h = HEROINES[id],
            g = s.girls[id],
            y = 96 + i * 72;
          p.card(26, y, 928, 64, { r: 18, fill: '#f9f1ec', shadow: 0.08 });
          if (!g.met) {
            p.g.fillStyle = rgba('#2b2a4a', 0.7);
            p.g.fill(ellipse(60, y + 32, 25, 25));
            p.text('?', 60, y + 14, { size: 26, weight: 800, color: '#ffffff', align: 'center' });
            p.text(L(['尚未相遇', 'Not met yet']), 100, y + 10, { size: 18, weight: 800, color: THEME.soft });
            p.text(`${L(['听说有位学姐常在', 'They say a senior is often at'])} ${L(PLACES[h.home].name)}${L(['出现', ''])}`, 100, y + 36, {
              size: 14,
              color: THEME.faint,
            });
            return;
          }
          game.avatar(p, id, 35, y + 7, 50);
          p.text(L(h.name), 100, y + 8, { size: 19, weight: 800, color: h.color });
          p.chip(L(LEVELS[sim.level(g.aff)].name), 100, y + 36, { color: h.color, size: 12, h: 20, padX: 8 });
          p.heart(248, y + 20, 7);
          p.bar(264, y + 14, 190, 12, g.aff, 100, { color: THEME.rose, color2: THEME.pink });
          p.text(String(g.aff), 464, y + 8, { size: 16, weight: 800 });
          p.text(`${L(['喜欢', 'Likes'])}: ${h.likes.map(t => L(STYLES[t])).join(' · ')}`, 250, y + 36, { size: 13, color: THEME.soft });
          const where = sim.whereIs(s, id);
          p.text(where ? `${L(['现在在', 'Now at'])} ${L(PLACES[where].name)}` : L(['现在不在学校', 'Off campus right now']), 520, y + 8, {
            size: 14,
            weight: 700,
            color: where ? THEME.ink : THEME.faint,
          });
          const need = sim.chapterNeeds(s, id);
          let hint;
          if (!need) hint = L(['故事已全部读完 · 星空祭见', 'Her story is complete · see you at the Star Festival']);
          else if (need.affOk && need.statOk)
            hint = `★ ${L(['新的故事：去', 'A new story: find her at'])} ${L(PLACES[h.home].name)}${L(['找她', ''])}`;
          else hint = `${L(['下一章', 'Next chapter'])}: ♥ ${need.aff}` + (need.statNeed ? `  ·  ${L(STATS[need.stat])} ${need.statNeed}` : '');
          p.text(hint, 520, y + 34, {
            size: 13,
            weight: need?.affOk && need?.statOk ? 800 : 500,
            color: need?.affOk && need?.statOk ? THEME.rose : THEME.soft,
          });
        });
      },

      quests(p) {
        const order = { ready: 0, open: 1, done: 2 };
        const list = sim.visibleQuests(s).sort((a, b) => order[a.state] - order[b.state]);
        const total = Math.max(1, Math.ceil(list.length / QUESTS_PER_PAGE));
        view.page = Math.min(view.page, total - 1);
        list.slice(view.page * QUESTS_PER_PAGE, (view.page + 1) * QUESTS_PER_PAGE).forEach(({ q, state }, i) => {
          const y = 96 + i * 90;
          p.card(26, y, 928, 80, { r: 18, fill: state === 'done' ? '#f0eaee' : '#f9f1ec', shadow: 0.08 });
          if (q.girl) game.avatar(p, q.girl, 40, y + 14, 52);
          else {
            p.g.fillStyle = p.gradient(40, 52, THEME.gold, THEME.warn);
            p.g.fill(rrect(40, y + 14, 52, 52, 16));
            p.star(66, y + 40, 15, '#ffffff');
          }
          p.text(L(q.name), 108, y + 10, { size: 18, weight: 800, color: state === 'done' ? THEME.faint : THEME.ink });
          p.text(L(q.desc), 108, y + 36, { size: 14, color: THEME.soft, maxW: 600 });
          p.text(`${L(['奖励', 'Reward'])}: ${rewardText(q.reward)}`, 108, y + 56, { size: 13, weight: 700, color: THEME.violet });
          if (state === 'ready')
            p.button(
              790,
              y + 18,
              146,
              44,
              L(['领取奖励', 'Claim']),
              () => {
                if (sim.claim(s, q.id)) {
                  game.audio.play('good');
                  game.toast(`${L(q.name)} · ${rewardText(q.reward)}`, 'good');
                  game.save();
                }
                repaint();
              },
              { kind: 'primary', size: 16 },
            );
          else
            p.chip(state === 'done' ? L(['已完成', 'Done']) : L(['进行中', 'In progress']), 836, y + 28, {
              color: state === 'done' ? THEME.faint : THEME.sky,
              size: 13,
            });
        });
        if (total > 1) {
          p.button(
            390,
            556,
            60,
            36,
            '‹',
            () => {
              view.page = (view.page + total - 1) % total;
              repaint();
            },
            { size: 20 },
          );
          p.text(`${view.page + 1} / ${total}`, 490, 563, { size: 16, weight: 700, color: THEME.soft, align: 'center' });
          p.button(
            530,
            556,
            60,
            36,
            '›',
            () => {
              view.page = (view.page + 1) % total;
              repaint();
            },
            { size: 20 },
          );
        }
      },

      bag(p) {
        const ids = Object.keys(s.bag);
        if (!ids.length)
          p.text(L(['背包是空的。商业街的店里有礼物和补给。', 'Your bag is empty. The shops on the street sell presents and supplies.']), 34, 110, {
            size: 18,
            color: THEME.faint,
          });
        ids.slice(0, 18).forEach((id, i) => {
          const x = 30 + (i % 6) * 154,
            y = 96 + Math.floor(i / 6) * 160,
            def = GIFTS[id] ?? SUPPLIES[id] ?? CLOTHES[id];
          p.card(x, y, 144, 150, { r: 18, fill: '#f9f1ec', shadow: 0.08 });
          p.well(x + 8, y + 6, 128, 75, { active: !!SUPPLIES[id] });
          if (CLOTHES[id]) {
            p.g.save();
            p.g.translate(x + 34, y + 6);
            drawGarmentIcon(p.g, id, 76, null, drawMannequin);
            p.g.restore();
          } else drawItemIcon(p.g, def.icon, x + 34, y + 6, 76);
          p.text(L(def.name), x + 72, y + 86, { size: 14, weight: 700, align: 'center', maxW: 136, lineH: 17 });
          p.chip('×' + s.bag[id], x + 100, y + 8, { color: THEME.violet, size: 12, h: 20, padX: 7 });
          if (SUPPLIES[id])
            p.button(
              x + 22,
              y + 112,
              100,
              30,
              L(['使用', 'Use']),
              () => {
                if (sim.useSupply(s, id)) {
                  game.audio.play('good');
                  game.toast(`${L(def.name)} · ${L(def.desc)}`, 'good');
                  game.showHud();
                  game.save();
                }
                repaint();
              },
              { kind: 'primary', size: 14, color: THEME.mint },
            );
          else p.text(L(['礼物', 'Present']), x + 72, y + 120, { size: 12, color: THEME.faint, align: 'center' });
        });
      },

      me(p) {
        game.avatar(p, 'hero', 40, 104, 96);
        p.text(L(['大一新生', 'First-year student']), 156, 112, { size: 22, weight: 800 });
        p.text(`${L(['第', 'Day '])}${s.day}${L([' 天', ''])}  ·  ¥ ${s.money}  ·  ${L(['体力', 'Energy'])} ${s.energy}`, 156, 146, {
          size: 16,
          color: THEME.soft,
        });
        p.text(
          `${L(['约会', 'Dates'])} ${s.counters.date ?? 0}  ·  ${L(['送礼', 'Presents'])} ${s.counters.gift ?? 0}  ·  ${L(['打工', 'Shifts'])} ${s.counters.work ?? 0}`,
          156,
          172,
          { size: 14, color: THEME.faint },
        );
        Object.keys(STATS).forEach((k, i) => {
          const y = 232 + i * 52,
            bonus = k === 'charm' ? sim.outfitCharm(s.hero.wear) : 0;
          p.text(L(STATS[k]), 40, y, { size: 18, weight: 700 });
          p.bar(120, y + 6, 330, 16, s.stats[k] + bonus, 100, { color: [THEME.sky, THEME.mint, THEME.violet, THEME.rose, THEME.gold][i] });
          p.text(String(s.stats[k]) + (bonus ? ` +${bonus}` : ''), 462, y, { size: 18, weight: 800 });
        });
        p.text(L(['当前穿搭', 'Current outfit']), 580, 112, { size: 18, weight: 800 });
        const styles = Object.entries(sim.outfitStyles(s.hero.wear)).sort((a, b) => b[1] - a[1]);
        styles.forEach(([tag, n], i) => {
          p.text(L(STYLES[tag]), 580, 150 + i * 36, { size: 16, weight: 600 });
          p.bar(650, 156 + i * 36, 220, 12, n, 10, { color: THEME.violet, color2: THEME.pink });
          p.text(String(n), 900, 148 + i * 36, { size: 16, weight: 800, align: 'right' });
        });
        p.text(
          L(['在宿舍的衣橱里换装。魅力会算上穿搭加成。', 'Change clothes at the wardrobe in the dormitory. Charm includes your outfit bonus.']),
          580,
          480,
          { size: 14, color: THEME.soft, maxW: 340 },
        );
      },

      system(p) {
        p.button(
          60,
          120,
          400,
          60,
          game.lang === 'zh' ? 'Switch to English' : '切换到中文',
          () => {
            game.setLang(game.lang === 'zh' ? 'en' : 'zh');
            game.showHud();
            repaint();
          },
          { size: 19, r: 18 },
        );
        p.button(
          60,
          196,
          400,
          60,
          game.audio.muted ? L(['声音：关', 'Sound: off']) : L(['声音：开', 'Sound: on']),
          () => {
            game.audio.setMuted(!game.audio.muted);
            game.savePrefs();
            repaint();
          },
          { size: 19, r: 18 },
        );
        p.button(
          60,
          272,
          400,
          60,
          L(['保存进度', 'Save progress']),
          () => {
            game.save();
            game.toast(L(['已保存', 'Saved']), 'good');
          },
          { size: 19, r: 18 },
        );
        p.button(
          60,
          348,
          400,
          60,
          view.confirm ? L(['再点一次确认返回标题', 'Tap again to return to the title']) : L(['保存并返回标题', 'Save and return to the title']),
          () => {
            if (!view.confirm) {
              view.confirm = true;
              repaint();
              return;
            }
            game.save();
            close('quit');
          },
          { kind: view.confirm ? 'primary' : 'plain', size: 19, r: 18, color: THEME.warn },
        );
        p.text(L(['游戏会在每次行动后自动保存到这个浏览器。', 'The game saves to this browser automatically after every action.']), 520, 130, {
          size: 16,
          color: THEME.soft,
          maxW: 400,
        });
        p.text(
          L([
            '基于新白鹭引擎开发的校园恋爱养成 Demo。',
            'A campus romance demo built with Egret Rebuild.',
          ]),
          520,
          200,
          { size: 14, color: THEME.faint, maxW: 400 },
        );
      },
    };

    function paint(p) {
      p.sheet(0, 0, 980, 612, { accent: THEME.violet });
      TABS.forEach(([id, label], i) => {
        const x = 26 + i * 132;
        p.segment(x, 26, 122, 46, L(label), view.tab === id, () => {
          view.tab = id;
          view.page = 0;
          view.confirm = false;
          repaint();
        }, { size: 18 });
      });
      const ready = sim.visibleQuests(s).filter(x => x.state === 'ready').length;
      if (ready) p.chip(String(ready), 26 + 132 + 96, 20, { color: THEME.rose, size: 12, h: 20, padX: 7 });
      p.button(858, 28, 96, 42, L(['关闭', 'Close']), () => close(), { kind: 'dark', size: 16 });
      pages[view.tab](p);
    }

    repaint();
    panel.node.alpha = 0;
    panel.node.y = 110;
    stage.tween(panel.node, { alpha: 1, y: 80 }, 0.25);
  });
}
