// A shop on the shopping street: clothes, presents, supplies or hairstyles.
import { THEME } from '../engine/ui.mjs';
import { rgba } from '../art/draw.mjs';
import { drawItemIcon } from '../art/icons.mjs';
import { drawGarmentIcon } from '../art/garments.mjs';
import { drawMannequin } from '../art/figure.mjs';
import { CLOTHES, GIFTS, SUPPLIES, HAIRSTYLES, SHOPS, SLOTS, STYLES } from '../data/items.mjs';
import * as sim from '../sim.mjs';

const PER_PAGE = 10;

/** Open a shop by id (see SHOPS). Resolves when the player leaves. */
export function openShop(game, shopId) {
  const { ui, L } = game,
    s = game.state,
    shop = SHOPS[shopId];
  const table = { clothes: CLOTHES, gifts: GIFTS, supplies: SUPPLIES, hair: HAIRSTYLES }[shop.kind];
  return new Promise(resolve => {
    const view = { page: 0, selected: shop.stock[0] };
    const panel = ui.panel({ x: 130, y: 84, w: 1020, h: 626, res: 1.2, modal: true });
    const close = () => {
      panel.close();
      game.showHud();
      resolve();
    };
    panel.dismiss = close;

    function drawIcon(p, id, x, y, size) {
      const g = p.g;
      if (shop.kind === 'clothes') {
        g.save();
        g.translate(x, y);
        drawGarmentIcon(g, id, size, null, drawMannequin);
        g.restore();
      } else if (shop.kind === 'hair') {
        p.image(game.face('hero', 'smile', { hair: { ...s.hero.hair, bangs: id } }), x, y, size, size, { r: size / 2 });
      } else drawItemIcon(g, table[id].icon, x, y, size);
    }

    function describe(id) {
      const def = table[id];
      if (shop.kind === 'clothes') {
        const styles = Object.entries(def.styles)
          .map(([t, n]) => `${L(STYLES[t])} +${n}`)
          .join('  ');
        return (
          `${L(SLOTS[def.slot])}  ·  ${L(['魅力', 'Charm'])} +${def.charm}  ·  ${styles}` +
          (def.only === 'f'
            ? `\n${L(['女装：买来送给学姐，她会收进衣橱。', 'For the seniors: buy it as a present and it joins her wardrobe.'])}`
            : '')
        );
      }
      if (shop.kind === 'gifts')
        return L([
          '送给学姐的礼物。每个人的喜好都不一样，试着从她说的话里找线索。',
          'A present for a senior. Tastes differ; listen for hints in what each of them says.',
        ]);
      if (shop.kind === 'supplies') return L(def.desc) + '  ·  ' + L(['在手机的背包里使用', 'use it from the bag in your phone']);
      return L(['换一个发型。发色可以在宿舍的衣橱里随时更改。', 'A new hairstyle. Hair colour can be changed any time in the dormitory wardrobe.']);
    }

    function paint(p) {
      p.card(0, 0, 1020, 618, { r: 28 });
      p.title(L(shop.name), 34, 24, { size: 28 });
      p.text('¥', 800, 28, { size: 24, weight: 800, color: THEME.gold });
      p.text(String(s.money), 826, 29, { size: 22, weight: 800 });
      p.button(900, 22, 92, 40, L(['离开', 'Leave']), close, { kind: 'dark', size: 16 });
      const pages = Math.ceil(shop.stock.length / PER_PAGE);
      shop.stock.slice(view.page * PER_PAGE, view.page * PER_PAGE + PER_PAGE).forEach((id, i) => {
        const x = 34 + (i % 5) * 192,
          y = 92 + Math.floor(i / 5) * 186,
          def = table[id];
        const owned = sim.owns(s, shop.kind, id),
          picked = view.selected === id;
        p.card(x, y, 180, 174, {
          r: 18,
          fill: picked ? '#fff4f8' : '#faf8ff',
          shadow: 0.1,
          stroke: picked ? THEME.rose : THEME.line,
          lineW: picked ? 3 : 1.5,
        });
        drawIcon(p, id, x + 42, y + 8, 96);
        p.text(L(def.name), x + 90, y + 108, { size: 15, weight: 700, align: 'center' });
        if (owned) p.chip(L(['已拥有', 'Owned']), x + 56, y + 138, { color: THEME.mint, size: 13 });
        else
          p.text(`¥ ${def.price}`, x + 90, y + 136, {
            size: 17,
            weight: 800,
            color: s.money >= def.price ? THEME.rose : THEME.faint,
            align: 'center',
          });
        if (s.bag[id]) p.chip('×' + s.bag[id], x + 136, y + 8, { color: THEME.violet, size: 12, h: 20, padX: 7 });
        p.hit(
          x,
          y,
          180,
          174,
          () => {
            view.selected = id;
            panel.paint(paint);
          },
          { r: 18 },
        );
      });
      if (pages > 1) {
        p.button(
          34,
          474,
          60,
          34,
          '‹',
          () => {
            view.page = (view.page + pages - 1) % pages;
            panel.paint(paint);
          },
          { size: 20 },
        );
        p.text(`${view.page + 1} / ${pages}`, 130, 480, { size: 16, weight: 700, color: THEME.soft, align: 'center' });
        p.button(
          166,
          474,
          60,
          34,
          '›',
          () => {
            view.page = (view.page + 1) % pages;
            panel.paint(paint);
          },
          { size: 20 },
        );
      }
      // The selected item in detail, with the buy button.
      const id = view.selected,
        def = table[id];
      p.card(34, 518, 952, 84, { r: 18, fill: rgba('#2b2a4a', 0.05), shadow: 0, stroke: null });
      p.text(L(def.name), 54, 528, { size: 20, weight: 800 });
      p.text(describe(id), 54, 556, { size: 14, color: THEME.soft, maxW: 660, lineH: 19 });
      const owned = sim.owns(s, shop.kind, id),
        poor = s.money < def.price;
      p.button(
        770,
        536,
        196,
        50,
        owned ? L(['已拥有', 'Owned']) : `${L(['购买', 'Buy'])}  ¥ ${def.price}`,
        () => {
          if (sim.buy(s, shopId, id)) {
            game.audio.play('good');
            game.toast(`${L(['买下了', 'Bought'])} ${L(def.name)}`, 'good');
            game.save();
          }
          panel.paint(paint);
        },
        { kind: 'primary', disabled: owned || poor, sub: poor && !owned ? L(['钱不够', 'Not enough money']) : undefined, size: 18 },
      );
    }
    panel.paint(paint);
  });
}
