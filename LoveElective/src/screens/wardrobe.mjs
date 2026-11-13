// The wardrobe: dress the hero (or a senior who trusts his taste), piece by
// piece, and dye either colour of anything worn.
import { THEME } from '../engine/ui.mjs';
import { rgba, rrect, hsl } from '../art/draw.mjs';
import { drawGarmentIcon, GARMENTS } from '../art/garments.mjs';
import { drawMannequin } from '../art/figure.mjs';
import { HEROINES } from '../data/cast.mjs';
import { CLOTHES, SLOTS, STYLES, HAIRSTYLES, DYES, HAIR_DYES } from '../data/items.mjs';
import * as sim from '../sim.mjs';

const PER_PAGE = 8;
const ACTOR_X = 408;

/** Open the wardrobe for 'hero' or a senior's id. Resolves when it is closed. */
export function openWardrobe(game, who) {
  const { ui, world, L } = game,
    s = game.state,
    hero = who === 'hero';
  return new Promise(resolve => {
    const tabs = hero ? ['top', 'bottom', 'outer', 'shoes', 'legs', 'acc', 'hair'] : ['top', 'bottom', 'dress', 'outer', 'shoes', 'legs', 'acc'];
    const view = { tab: 'top', page: 0, selected: null, channel: 0 };
    const panel = ui.panel({ x: 560, y: 86, w: 690, h: 624, res: 1.25 });
    const stylePanel = ui.panel({ x: 22, y: 86, w: 236, h: 330, res: 1.25 });
    game.showHud(null);

    const wear = () => sim.wearOf(s, who);
    const worn = id => sim.pieces(wear()).find(p => p.id === id) ?? [wear().top, wear().bottom].find(p => p?.id === id && !wear().dress);
    const showActor = () => world.showActor(game.spec(who, 'smile'), { view: 'full', x: ACTOR_X, enter: false });

    function setColor(color) {
      if (view.tab === 'hair') s.hero.hair.color = color;
      else if (view.selected && worn(view.selected)) sim.dye(s, who, view.selected, view.channel, color);
      else return;
      refresh();
    }

    function paintStyle(p) {
      const styles = sim.outfitStyles(wear()),
        entries = Object.entries(styles).sort((a, b) => b[1] - a[1]);
      p.card(0, 0, 236, 322, { r: 22, fill: rgba('#ffffff', 0.9) });
      p.text(hero ? L(['穿搭风格', 'Outfit style']) : L(HEROINES[who].name), 20, 16, {
        size: 18,
        weight: 800,
        color: hero ? THEME.ink : HEROINES[who].color,
      });
      p.text(`${L(['魅力加成', 'Charm bonus'])} +${sim.outfitCharm(wear())}`, 20, 44, { size: 15, weight: 700, color: THEME.rose });
      entries.slice(0, 6).forEach(([tag, n], i) => {
        p.text(L(STYLES[tag]), 20, 76 + i * 30, { size: 15, weight: 600 });
        p.bar(78, 81 + i * 30, 104, 10, n, 10, { color: THEME.violet, color2: THEME.pink });
        p.text(String(n), 216, 74 + i * 30, { size: 15, weight: 800, align: 'right' });
      });
      if (!hero)
        p.text(`${L(['她偏爱', 'She favours'])}: ${HEROINES[who].likes.map(t => L(STYLES[t])).join(' · ')}`, 20, 270, {
          size: 14,
          color: THEME.soft,
          maxW: 200,
        });
      else
        p.text(L(['穿成学姐喜欢的风格，好感提升得更快。', "Dress in a senior's favourite style and she warms to you faster."]), 20, 262, {
          size: 13,
          color: THEME.soft,
          maxW: 200,
          lineH: 18,
        });
    }

    function paint(p) {
      const g = p.g;
      p.card(0, 0, 690, 616, { r: 26 });
      // Tabs.
      tabs.forEach((tab, i) => {
        const x = 20 + i * 93,
          on = tab === view.tab;
        g.fillStyle = on ? p.gradient(x, 87) : rgba('#2b2a4a', 0.06);
        g.fill(rrect(x, 18, 87, 38, 19));
        p.text(L(SLOTS[tab]), x + 43.5, 26, { size: 15, weight: 700, color: on ? '#ffffff' : THEME.soft, align: 'center' });
        p.hit(
          x,
          18,
          87,
          38,
          () => {
            view.tab = tab;
            view.page = 0;
            view.selected = null;
            refresh(false);
          },
          { r: 19 },
        );
      });

      // Items of this kind.
      const items = view.tab === 'hair' ? Object.keys(s.hero.hairs) : sim.closet(s, who).filter(id => CLOTHES[id].slot === view.tab);
      const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
      view.page = Math.min(view.page, pages - 1);
      if (!items.length)
        p.text(L(['这一栏还是空的。去商业街的花漾衣橱看看吧。', 'Nothing here yet. Visit Bloom Boutique on the shopping street.']), 30, 120, {
          size: 17,
          color: THEME.faint,
          maxW: 620,
        });
      items.slice(view.page * PER_PAGE, view.page * PER_PAGE + PER_PAGE).forEach((id, i) => {
        const x = 22 + (i % 4) * 163,
          y = 70 + Math.floor(i / 4) * 158;
        const isHair = view.tab === 'hair',
          on = isHair ? s.hero.hair.bangs === id : !!worn(id),
          picked = view.selected === id;
        p.card(x, y, 153, 148, {
          r: 18,
          fill: on ? '#fff4f8' : '#faf8ff',
          shadow: 0.1,
          stroke: picked ? THEME.rose : on ? THEME.pink : THEME.line,
          lineW: picked ? 3 : 1.5,
        });
        if (isHair) {
          p.image(game.face('hero', 'smile', { hair: { ...s.hero.hair, bangs: id } }), x + 34, y + 8, 86, 86, { r: 43 });
          p.text(L(HAIRSTYLES[id].name), x + 76, y + 104, { size: 14, weight: 700, align: 'center' });
        } else {
          g.save();
          g.translate(x + 30, y + 6);
          drawGarmentIcon(g, id, 94, worn(id)?.c, drawMannequin);
          g.restore();
          p.text(L(CLOTHES[id].name), x + 76, y + 104, { size: 14, weight: 700, align: 'center' });
        }
        if (on) p.chip(L(['穿着中', 'Worn']), x + 8, y + 8, { color: THEME.rose, size: 11, h: 20, padX: 7 });
        p.hit(
          x,
          y,
          153,
          148,
          () => {
            if (isHair) s.hero.hair.bangs = id;
            else {
              sim.toggleWear(s, who, id);
              view.selected = worn(id) ? id : null;
            }
            refresh();
          },
          { r: 18 },
        );
      });
      if (pages > 1) {
        p.button(
          560,
          388,
          50,
          30,
          '‹',
          () => {
            view.page = (view.page + pages - 1) % pages;
            refresh(false);
          },
          { size: 18 },
        );
        p.button(
          618,
          388,
          50,
          30,
          '›',
          () => {
            view.page = (view.page + 1) % pages;
            refresh(false);
          },
          { size: 18 },
        );
      }

      // Dye.
      const dyeing = view.tab === 'hair' ? 'hair' : view.selected && worn(view.selected) ? view.selected : null;
      g.fillStyle = THEME.line;
      g.fillRect(22, 392, 520, 1.5);
      if (!dyeing)
        p.text(L(['点选一件穿着中的服饰，就可以给它染色。', 'Tap something being worn to dye it.']), 22, 408, { size: 16, color: THEME.faint });
      else {
        const name = dyeing === 'hair' ? L(['发色', 'Hair colour']) : L(CLOTHES[dyeing].name);
        p.text(`${L(['染色', 'Dye'])} · ${name}`, 22, 404, { size: 17, weight: 800 });
        if (dyeing !== 'hair')
          [
            ['主色', 'Main'],
            ['辅色', 'Trim'],
          ].forEach((label, i) => {
            const x = 420 + i * 84,
              on = view.channel === i;
            g.fillStyle = on ? THEME.ink : rgba('#2b2a4a', 0.08);
            g.fill(rrect(x, 400, 78, 30, 15));
            p.text(L(label), x + 39, 405, { size: 14, weight: 700, color: on ? '#ffffff' : THEME.soft, align: 'center' });
            p.hit(
              x,
              400,
              78,
              30,
              () => {
                view.channel = i;
                refresh(false);
              },
              { r: 15 },
            );
          });
        const swatches = dyeing === 'hair' ? HAIR_DYES : DYES;
        const current = dyeing === 'hair' ? s.hero.hair.color : (worn(dyeing).c?.[view.channel] ?? GARMENTS[dyeing].c[view.channel]);
        swatches.forEach((color, i) => {
          const x = 24 + (i % 11) * 59,
            y = 442 + Math.floor(i / 11) * 40;
          g.fillStyle = color;
          g.fill(rrect(x, y, 50, 32, 10));
          g.lineWidth = color.toLowerCase() === current?.toLowerCase() ? 3 : 1;
          g.strokeStyle = color.toLowerCase() === current?.toLowerCase() ? THEME.rose : rgba('#2b2a4a', 0.2);
          g.stroke(rrect(x, y, 50, 32, 10));
          p.hit(x, y, 50, 32, () => setColor(color), { r: 10 });
        });
        // Free colour: hue runs left to right, lightness top to bottom.
        const bx = 24,
          by = 526,
          bw = 644,
          bh = 34;
        g.save();
        g.clip(rrect(bx, by, bw, bh, 12));
        for (let i = 0; i < bw; i += 4) {
          const grad = g.createLinearGradient(0, by, 0, by + bh);
          grad.addColorStop(0, hsl((i / bw) * 360, 0.75, 0.82));
          grad.addColorStop(0.5, hsl((i / bw) * 360, 0.7, 0.58));
          grad.addColorStop(1, hsl((i / bw) * 360, 0.6, 0.28));
          g.fillStyle = grad;
          g.fillRect(bx + i, by, 4, bh);
        }
        g.restore();
        p.hit(bx, by, bw, bh, (x, y) => setColor(hsl((x / bw) * 360, 0.72 - (y / bh) * 0.12, 0.82 - (y / bh) * 0.54)), { hover: false });
        p.text(L(['点色带可以调出任意颜色', 'Tap the strip for any colour']), bx, by + 40, { size: 12, color: THEME.faint });
      }

      // Presets for a senior, and the close button.
      if (!hero)
        [
          ['uniform', ['常服', 'Usual']],
          ['casual', ['日常', 'Casual']],
          ['date', ['约会', 'Date']],
        ].forEach(([name, label], i) => {
          const locked = name !== 'uniform' && s.girls[who].aff < (name === 'casual' ? sim.DRESS_AFFECTION : 60);
          p.button(
            196 + i * 104,
            572,
            96,
            34,
            L(label),
            () => {
              sim.wearPreset(s, who, name);
              view.selected = null;
              refresh();
            },
            { size: 14, disabled: locked },
          );
        });
      p.button(530, 568, 140, 40, L(['穿好了', 'Done']), close, { kind: 'primary', size: 17 });
    }

    function refresh(redress = true) {
      if (redress) showActor();
      panel.paint(paint);
      stylePanel.paint(paintStyle);
    }

    async function close() {
      panel.close();
      stylePanel.close();
      game.save();
      if (hero) await world.hideActor();
      resolve();
    }

    world.hideActor().then(() => {
      showActor();
    });
    panel.paint(paint);
    stylePanel.paint(paintStyle);
  });
}
