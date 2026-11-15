// What is kept between terms: the album of endings, achievements and the
// perks they unlock, the perk picker at the start of a new term, and the
// card that shows what a finished term added.
import { W } from '../engine/stage.mjs';
import { THEME, SERIF } from '../engine/ui.mjs';
import { rgba, ellipse } from '../art/draw.mjs';
import { HEROINES, HEROINE_IDS } from '../data/cast.mjs';
import { ACHIEVEMENTS, PERKS } from '../data/memories.mjs';
import * as sim from '../sim.mjs';

/** Every ending in album order: two for each senior, then the one for going alone. */
const ENDING_KEYS = [...HEROINE_IDS.flatMap(id => [`${id}:love`, `${id}:friend`]), 'solo'];
const ENDING_NAME = { love: ['恋爱结局', 'Love ending'], friend: ['未完待续', 'To be continued'], solo: ['独自的星空', "A sky of one's own"] };
const achievementName = id => ACHIEVEMENTS.find(a => a.id === id)?.name;

/** How many endings have been seen, out of all of them. */
export const endingCount = m => `${ENDING_KEYS.filter(k => m.endings[k]).length} / ${ENDING_KEYS.length}`;

/** The album: endings, achievements and perks. Resolves when it is closed. */
export function openAlbum(game) {
  const { ui, stage, L } = game,
    m = game.memories;
  return new Promise(resolve => {
    const PW = 1120,
      PH = 650;
    const panel = ui.panel({ x: (W - PW) / 2, y: 36, w: PW, h: PH, res: 1.2, modal: true });
    const view = { tab: 'endings' };
    const close = () => {
      panel.close();
      resolve();
    };
    panel.dismiss = close;
    const repaint = () => panel.paint(paint);

    const pages = {
      endings(p) {
        ENDING_KEYS.forEach((key, i) => {
          const x = 30 + (i % 5) * 214,
            y = 104 + Math.floor(i / 5) * 172,
            [girl, kind] = key.includes(':') ? key.split(':') : [null, 'solo'],
            seen = m.endings[key];
          p.card(x, y, 202, 160, { r: 18, fill: seen ? '#fff8ef' : '#efe8ee', shadow: 0.08 });
          if (girl && seen) game.avatar(p, girl, x + 14, y + 16, 64);
          else {
            p.g.fillStyle = rgba(girl ? HEROINES[girl].color : THEME.violet, seen ? 0.85 : 0.25);
            p.g.fill(ellipse(x + 46, y + 48, 32, 32));
            p.text(seen ? '★' : '?', x + 46, y + 30, { size: 30, weight: 800, color: '#ffffff', align: 'center' });
          }
          const name = girl ? (seen || m.endings[`${girl}:love`] || m.endings[`${girl}:friend`] ? L(HEROINES[girl].name) : '？？？') : L(['独自', 'Alone']);
          p.text(name, x + 92, y + 24, { size: 17, weight: 800, color: girl ? HEROINES[girl].color : THEME.violet, maxW: 104 });
          p.text(L(ENDING_NAME[kind]), x + 92, y + 52, { size: 14, weight: 700, color: seen ? THEME.ink : THEME.faint, maxW: 104 });
          p.text(seen ? `${L(['已见', 'Seen'])} ×${seen}` : L(['尚未见到', 'Not seen yet']), x + 16, y + 104, {
            size: 13,
            color: seen ? THEME.soft : THEME.faint,
          });
          if (kind === 'love' && !seen)
            p.text(L(['读完四章 · 好感 88', 'All four chapters · 88 affection']), x + 16, y + 126, { size: 12, color: THEME.faint, maxW: 176 });
        });
      },
      achievements(p) {
        ACHIEVEMENTS.forEach((a, i) => {
          const x = 30 + (i % 2) * 534,
            y = 100 + Math.floor(i / 2) * 58,
            got = m.achievements[a.id];
          p.card(x, y, 522, 50, { r: 14, fill: got ? '#fff8ef' : '#efe8ee', shadow: 0.06 });
          p.star(x + 26, y + 25, 13, got ? THEME.gold : '#cbbfca');
          p.text(L(a.name), x + 50, y + 6, { size: 16, weight: 800, color: got ? THEME.ink : THEME.faint });
          p.text(L(a.desc), x + 50, y + 28, { size: 13, color: got ? THEME.soft : THEME.faint, maxW: 460 });
        });
      },
      perks(p) {
        p.text(
          L(['开始新学期时可以从已解锁的天赋里选一个带上。', 'When a new term begins, you may bring one perk you have unlocked.']),
          30,
          98,
          { size: 15, color: THEME.soft },
        );
        PERKS.forEach((perk, i) => {
          const x = 30 + (i % 2) * 534,
            y = 132 + Math.floor(i / 2) * 92,
            open = !perk.needs || m.achievements[perk.needs];
          p.card(x, y, 522, 82, { r: 16, fill: open ? '#fff8ef' : '#efe8ee', shadow: 0.06 });
          p.text(L(perk.name), x + 22, y + 10, { size: 18, weight: 800, color: open ? THEME.violet : THEME.faint });
          p.text(L(perk.desc), x + 22, y + 38, { size: 14, color: open ? THEME.ink : THEME.faint, maxW: 480 });
          if (!open)
            p.text(`${L(['解锁条件', 'Unlocked by'])}: ${L(achievementName(perk.needs))}`, x + 22, y + 58, { size: 12, color: THEME.faint });
        });
      },
    };

    function paint(p) {
      p.sheet(0, 0, PW, PH - 8, { accent: THEME.rose });
      p.text(L(['回忆册', 'Memories']), 30, 24, { size: 30, weight: 800, family: SERIF });
      p.text(
        `${L(['已修完', 'Terms finished'])} ${m.terms}${L([' 个学期', ''])}  ·  ${L(['结局', 'Endings'])} ${endingCount(m)}  ·  ${L(['成就', 'Achievements'])} ${
          Object.keys(m.achievements).length
        } / ${ACHIEVEMENTS.length}`,
        30,
        66,
        { size: 14, color: THEME.soft },
      );
      [
        ['endings', ['结局', 'Endings']],
        ['achievements', ['成就', 'Achievements']],
        ['perks', ['开学天赋', 'Perks']],
      ].forEach(([id, label], i) =>
        p.segment(560 + i * 142, 24, 132, 44, L(label), view.tab === id, () => {
          view.tab = id;
          repaint();
        }, { size: 16 }),
      );
      p.button(PW - 30 - 96, 24, 96, 44, L(['关闭', 'Close']), close, { kind: 'dark', size: 16 });
      pages[view.tab](p);
    }
    repaint();
    panel.node.alpha = 0;
    stage.tween(panel.node, { alpha: 1 }, 0.25);
  });
}

/** Choose a perk for the new term. Resolves with its id, or null for none. Skipped when none are unlocked. */
export function pickPerk(game) {
  const { ui, stage, L } = game,
    open = sim.unlockedPerks(game.memories);
  if (!open.length) return Promise.resolve(null);
  return new Promise(resolve => {
    const cols = Math.min(3, open.length),
      rows = Math.ceil(open.length / 3),
      PW = 60 + cols * 330,
      PH = 200 + rows * 104;
    const panel = ui.panel({ x: (W - PW) / 2, y: Math.max(30, (720 - PH) / 2), w: PW, h: PH, res: 1.25, modal: true });
    const done = id => {
      panel.close();
      resolve(id);
    };
    panel.paint(p => {
      p.sheet(0, 0, PW, PH - 8, { accent: THEME.violet });
      p.text(L(['带一个天赋开学', 'Bring a perk into the new term']), PW / 2, 24, { size: 26, weight: 800, align: 'center', family: SERIF });
      p.text(L(['从前几个学期里学到的东西。', 'Something you learned in terms gone by.']), PW / 2, 66, { size: 15, color: THEME.soft, align: 'center' });
      open.forEach((perk, i) => {
        const x = 30 + (i % 3) * 330,
          y = 104 + Math.floor(i / 3) * 104;
        p.button(x, y, 318, 92, L(perk.name), () => done(perk.id), { kind: 'primary', color: THEME.violet, sub: L(perk.desc), size: 19, r: 18 });
      });
      p.button(PW / 2 - 130, PH - 76, 260, 48, L(['不带天赋', 'No perk']), () => done(null), { kind: 'dark', size: 16 });
    });
    panel.node.alpha = 0;
    stage.tween(panel.node, { alpha: 1 }, 0.25);
  });
}

/** After the summary: what this term added to the memories. Skipped when nothing is new. */
export function showUnlocks(game, fresh) {
  const { ui, stage, L } = game;
  const lines = [
    ...fresh.endings.map(key => {
      const [girl, kind] = key.includes(':') ? key.split(':') : [null, 'solo'];
      return ['♥', `${L(['新结局', 'New ending'])}: ${girl ? L(HEROINES[girl].name) + ' · ' : ''}${L(ENDING_NAME[kind])}`, THEME.rose];
    }),
    ...fresh.achievements.map(id => ['★', `${L(['成就', 'Achievement'])}: ${L(achievementName(id))}`, THEME.gold]),
    ...fresh.perks.map(id => ['✦', `${L(['解锁天赋', 'Perk unlocked'])}: ${L(PERKS.find(x => x.id === id).name)}`, THEME.violet]),
  ];
  if (!lines.length) return Promise.resolve();
  return new Promise(resolve => {
    const PW = 640,
      shown = lines.slice(0, 10),
      PH = 190 + shown.length * 40;
    const panel = ui.panel({ x: (W - PW) / 2, y: Math.max(30, (720 - PH) / 2), w: PW, h: PH, res: 1.25, modal: true });
    const done = () => {
      panel.close();
      resolve();
    };
    panel.dismiss = done;
    panel.paint(p => {
      p.sheet(0, 0, PW, PH - 8, { accent: THEME.gold });
      p.text(L(['写进回忆册', 'Added to your memories']), PW / 2, 24, { size: 26, weight: 800, align: 'center', family: SERIF });
      shown.forEach(([mark, text, color], i) => {
        p.text(mark, 50, 86 + i * 40, { size: 20, weight: 800, color });
        p.text(text, 84, 88 + i * 40, { size: 17, weight: 700, maxW: PW - 120 });
      });
      if (lines.length > shown.length)
        p.text(`… +${lines.length - shown.length}`, 84, 88 + shown.length * 40, { size: 15, color: THEME.soft });
      p.button(PW / 2 - 110, PH - 74, 220, 48, L(['好', 'OK']), done, { kind: 'primary', size: 18 });
    });
    panel.node.alpha = 0;
    stage.tween(panel.node, { alpha: 1 }, 0.3);
    game.audio.play('heart');
  });
}
