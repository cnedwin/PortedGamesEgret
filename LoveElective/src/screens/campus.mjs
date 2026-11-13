// Daily life on campus: the map, a visit to a place, and time with a senior
// (chatting with push-and-pull, presents, dates, picking her outfit).
import { W, H } from '../engine/stage.mjs';
import { THEME, SERIF } from '../engine/ui.mjs';
import { rgba, ellipse, rrect, star, poly } from '../art/draw.mjs';
import { loadCampusMap, paintCampusMap } from '../art/campus-art.mjs';
import { drawItemIcon } from '../art/icons.mjs';
import { drawGarmentIcon } from '../art/garments.mjs';
import { drawMannequin } from '../art/figure.mjs';
import { HEROINES, LEVELS, STATS } from '../data/cast.mjs';
import { PLACES, PLACE_IDS, SLOTS_OF_DAY, DATE_SPOTS } from '../data/places.mjs';
import { GIFTS, CLOTHES } from '../data/items.mjs';
import { CHAPTERS_SCRIPT } from '../story/chapters.mjs';
import { CHAT_LINES, GIFT_LINES, DATE_LINES, JEALOUS_LINES } from '../story/lines.mjs';
import * as sim from '../sim.mjs';
import { playScript } from './story.mjs';
import { openPhone } from './phone.mjs';
import { openShop } from './shop.mjs';
import { openWardrobe } from './wardrobe.mjs';

const pickOne = list => list[Math.floor(Math.random() * list.length)];
const lightOf = s => SLOTS_OF_DAY[s.slot].light;

/** Play days on campus until the term ends or the player returns to the title. */
export async function campus(game) {
  game.quit = false;
  while (!game.state.finale && !game.quit) {
    const place = await mapScreen(game);
    if (!place) break;
    await placeScreen(game, place);
    game.save();
  }
  game.hideHud();
}

// ------------------------------------------------------------------ map

function mapScreen(game) {
  const { stage, ui, world, L } = game,
    s = game.state;
  return new Promise(resolve => {
    world.root.visible = false;
    const group = stage.group();
    stage.root.setChildIndex(group, 1);
    const map = stage.pic(group),
      pinLayer = stage.group(group);
    const pins = ui.panel({ x: 0, y: 0, w: W, h: H, res: 1, parent: pinLayer });
    let light = null;
    const mapImage = loadCampusMap();

    async function paintMap() {
      const nextLight = lightOf(s);
      if (light === nextLight) return;
      light = nextLight;
      const image = await mapImage;
      if (leaving || light !== nextLight) return;
      map.paint(W, H, 1, g => paintCampusMap(g, nextLight, image), 'map:' + nextLight);
    }

    function paintPins() {
      pins.paint(p => {
        const g = p.g;
        for (const id of PLACE_IDS) {
          const place = PLACES[id],
            [x, y] = place.map,
            open = sim.placeOpen(s, id);
          // Seniors already met are shown wherever they are; one not met yet only at her usual place.
          const here = open ? sim.girlsAt(s, id).filter(girl => s.girls[girl].met || HEROINES[girl].home === id) : [];
          const name = L(place.name),
            nameW = p.measure(name, 17, 750);
          const w = nameW + 42 + here.length * 37,
            py = y - place.pin,
            left = x - w / 2;
          const fill = open ? rgba('#272038', .94) : rgba('#493e51', .9);
          p.card(left, py, w, 42, { r: 11, fill, stroke: open ? '#be8f9f' : '#746273', shadow: .36 });
          g.fillStyle = open ? '#eab7a5' : '#bca4b6';
          g.fill(poly([[left + 12, py + 20], [left + 16, py + 16], [left + 20, py + 20], [left + 16, py + 24]]));
          p.text(name, left + 27, py + 10, { size: 17, weight: 750, color: open ? '#fff8eb' : '#d8c9d3' });
          g.fillStyle = fill;
          g.fill(poly([[x - 7, py + 41], [x + 7, py + 41], [x, py + 49]]));
          if (!open) {
            p.chip(L(['夜间关闭', 'Closed at night']), x - 33, py + 51, { size: 11, h: 18, color: '#433849' });
            continue;
          }
          here.forEach((girl, i) => {
            const ax = left + nameW + 34 + i * 37,
              ay = py + 5;
            if (s.girls[girl].met) game.avatar(p, girl, ax, ay, 34);
            else {
              g.fillStyle = rgba('#2b2a4a', 0.75);
              g.fill(ellipse(ax + 17, ay + 17, 17, 17));
              p.text('?', ax + 17, ay + 5, { size: 18, weight: 800, color: '#ffffff', align: 'center' });
            }
            if (sim.chapterAt(s, girl, id)) {
              g.fillStyle = THEME.gold;
              g.fill(star(ax + 30, ay + 2, 9, 4));
              g.lineWidth = 1.5;
              g.strokeStyle = '#ffffff';
              g.stroke(star(ax + 30, ay + 2, 9, 4));
            }
          });
          p.hit(Math.min(left, x - 80), py - 4, Math.max(w, 160), place.pin + 20, () => go(id), { r: 20 });
        }
        p.card(W / 2 - 285, H - 53, 570, 36, { r: 11, fill: rgba('#272038', .9), stroke: '#77586d', shadow: .2 });
        p.text(L(['选择要去的地方 · 金色星星表示有新的故事', 'Choose where to go · a gold star marks a new story']), W / 2, H - 45, {
          size: 15,
          weight: 600,
          color: '#ffffff',
          align: 'center',
        });
      });
    }

    const refresh = () => {
      paintMap();
      paintPins();
      game.showHud(phone);
    };
    async function phone() {
      const result = await openPhone(game);
      if (result === 'quit') {
        game.quit = true;
        leave(null);
      } else refresh();
    }
    // The map and its labels shift by different amounts as the pointer moves, so labels float above it.
    const stop = stage.onTick(dt => {
      const tx = (stage.pointer.x / W - 0.5) * 2,
        ty = (stage.pointer.y / H - 0.5) * 2;
      map.node.scaleX = map.node.scaleY = 1.05;
      map.node.x += (-W * 0.025 - tx * 14 - map.node.x) * Math.min(1, dt * 4);
      map.node.y += (-H * 0.025 - ty * 8 - map.node.y) * Math.min(1, dt * 4);
      pinLayer.x += (-tx * 22 - pinLayer.x) * Math.min(1, dt * 4);
      pinLayer.y += (-ty * 14 - pinLayer.y) * Math.min(1, dt * 4);
    });

    let leaving = false;
    async function leave(result) {
      if (leaving) return;
      leaving = true;
      await game.fadeOut(0.3);
      stop();
      pins.close();
      map.destroy();
      stage.root.removeChild(group);
      group.dispose();
      world.root.visible = true;
      resolve(result);
    }
    const go = id => leave(id);

    refresh();
    game.fadeIn();
  });
}

// ------------------------------------------------------------------ a place

/** Short text for what an activity gives and costs. */
function actSummary(game, act) {
  const { L } = game,
    parts = [];
  for (const [stat, n] of Object.entries(act.gain ?? {})) parts.push(`${L(STATS[stat])} +${n}`);
  if (act.pay) parts.push(`¥ +${Math.round(act.pay[0] + sim.statValue(game.state, act.pay[1]) * act.pay[2])}`);
  if (act.cost) parts.push(`¥ −${act.cost}`);
  if (act.energy) parts.push(`${L(['体力', 'Energy'])} ${act.energy > 0 ? '+' : '−'}${Math.abs(act.energy)}`);
  return parts.join('  ·  ');
}

async function placeScreen(game, placeId) {
  const { world, L } = game,
    s = game.state,
    place = PLACES[placeId];
  sim.enter(s, placeId);
  await world.setScene(place.scene, lightOf(s));
  game.showHud(null);
  await game.fadeIn(0.3);

  for (;;) {
    // Story chapters come first: meeting a senior whose next chapter is ready plays it.
    for (const girl of sim.girlsAt(s, placeId)) {
      const chapter = sim.chapterAt(s, girl, placeId);
      if (!chapter) continue;
      game.hideHud();
      await playScript(game, CHAPTERS_SCRIPT[girl][chapter], { girl });
      sim.finishChapter(s, girl, chapter);
      game.save();
      game.toast(`${L(HEROINES[girl].name)} · ${L(['故事第 ', 'Story chapter '])}${chapter}${L([' 章 完成', ' complete'])}`, 'good');
      await world.setScene(place.scene, lightOf(s));
    }

    const before = sim.clock(s).absolute;
    const choice = await placeMenu(game, placeId);
    if (choice.type === 'leave') break;
    if (choice.type === 'quit') {
      game.quit = true;
      break;
    }
    if (choice.type === 'girl') {
      const moved = await girlScreen(game, choice.id);
      if (moved) break;
    } else if (choice.type === 'act') {
      const act = choice.act;
      if (act.special === 'quests') await openPhone(game, 'quests');
      else if (act.special === 'wardrobe') await openWardrobe(game, 'hero');
      else if (act.special?.startsWith('shop:')) await openShop(game, act.special.slice(5));
      else if (act.special === 'sleep') {
        await game.fadeOut(0.5);
        sim.sleep(s);
        game.toast(
          s.finale
            ? L(['学期的最后一夜到了', 'The last night of term has come'])
            : L(['睡得很好，新的一天开始了', "A good night's sleep. A new day begins"]),
          'info',
        );
      } else {
        const r = sim.act(s, placeId, act.id);
        if (r) {
          const parts = Object.entries(r.gain).map(([k, n]) => `${L(STATS[k])} +${n}`);
          if (r.pay) parts.push(`¥ +${r.pay}`);
          if (r.energy > 0) parts.push(`${L(['体力', 'Energy'])} +${r.energy}`);
          game.toast(`${L(act.name)}  →  ${parts.join('  ·  ')}`, 'good');
          game.audio.play('good');
          if (!act.free) await game.fadeOut(0.3);
        }
      }
    }
    game.save();
    if (s.finale) break;
    if (sim.clock(s).absolute !== before) {
      // Time moved on: the light changes, and the place may have closed for the night.
      if (!sim.placeOpen(s, placeId)) {
        game.toast(L(['天黑了，这里要关门了', 'It is dark, and this place is closing']), 'info');
        break;
      }
      await world.setScene(place.scene, lightOf(s));
      await game.fadeIn(0.3);
    }
    game.showHud(null);
  }
  await game.fadeOut(0.3);
  await world.hideActor();
}

/** The list of people and things to do at a place. Resolves with the player's choice. */
function placeMenu(game, placeId) {
  const { ui, stage, L } = game,
    s = game.state,
    place = PLACES[placeId];
  return new Promise(resolve => {
    const here = sim.girlsAt(s, placeId).filter(id => s.girls[id].met);
    const h = 150 + (here.length ? 96 : 34) + place.acts.length * 70 + 62;
    const panel = ui.panel({ x: 36, y: 92, w: 430, h, res: 1.25 });
    const done = result => {
      panel.close();
      resolve(result);
    };
    game.showHud(async () => {
      const result = await openPhone(game);
      if (result === 'quit') done({ type: 'quit' });
      else {
        game.showHud();
        panel.paint(paint);
      }
    });

    function paint(p) {
      p.sheet(0, 0, 430, h - 8);
      p.title(L(place.name), 28, 22, { size: 28 });
      p.text(L(['在这里的人', 'Who is here']), 28, 84, { size: 15, weight: 700, color: THEME.soft });
      let y = 110;
      if (here.length) {
        here.forEach((girl, i) => {
          const x = 28 + i * 96;
          game.avatar(p, girl, x + 12, y, 62);
          p.text(L(HEROINES[girl].name), x + 43, y + 66, { size: 14, weight: 700, align: 'center' });
          p.hit(x, y - 4, 88, 92, () => done({ type: 'girl', id: girl }), { r: 16 });
        });
        y += 96;
      } else {
        p.text(L(['现在没有认识的人在这里。', 'Nobody you know is here right now.']), 28, y, { size: 16, color: THEME.faint });
        y += 34;
      }
      p.g.fillStyle = THEME.line;
      p.g.fillRect(28, y, 374, 1.5);
      y += 14;
      for (const act of place.acts) {
        const blocked = sim.actBlocked(s, act);
        const sub =
          blocked === 'energy'
            ? L(['体力不足', 'Not enough energy'])
            : blocked === 'money'
              ? L(['钱不够', 'Not enough money'])
              : actSummary(game, act) || undefined;
        p.button(28, y, 374, 58, L(act.name), () => done({ type: 'act', act }), {
          kind: act.special ? 'plain' : 'primary',
          disabled: !!blocked,
          sub,
          size: 19,
          r: 18,
          color: act.special ? undefined : THEME.violet,
        });
        y += 70;
      }
      p.button(28, y, 374, 46, L(['回到校园地图', 'Back to the campus map']), () => done({ type: 'leave' }), { kind: 'dark', size: 17 });
    }
    panel.paint(paint);
    panel.node.x = 6;
    panel.node.alpha = 0;
    stage.tween(panel.node, { x: 36, alpha: 1 }, 0.3);
  });
}

// ------------------------------------------------------------------ time with a senior

const ZONE_NOTE = {
  sweet: [['正合她的心意！', 'Exactly how she likes it!'], 'good'],
  near: [null, 'info'],
  forward: [['她后退了半步……你太着急了。', 'She steps back half a pace... you are rushing her.'], 'bad'],
  distant: [['她觉得你有些疏远。', 'She finds you a little distant.'], 'bad'],
};

const DATE_STORY = {
  cafe: ['你们点了同一款蛋糕，用了两把叉子。', 'You order the same cake, and ask for two forks.'],
  street: ['你们逛了一家又一家店，她在一面橱窗前停了很久。', 'You wander from shop to shop. She lingers a long while at one window.'],
  gate: ['樱花落在她的发梢上。你们走得比平时慢。', 'Cherry petals settle in her hair. You walk more slowly than usual.'],
  rooftop: ['天台的风很大。她往你这边靠了半步。', 'It is windy on the roof. She moves half a step closer to you.'],
};

/** Returns true if the two of them left the place together (a date). */
async function girlScreen(game, girl) {
  const { world, L } = game,
    s = game.state;
  const X = 380;
  await world.showActor(game.spec(girl, 'smile'), { x: X });
  const line = async (step, toastText, tone) => {
    await playScript(game, [step], { girl, keepActor: true });
    if (toastText) game.toast(toastText, tone);
    await world.showActor(game.spec(girl, 'smile'), { x: X });
  };
  const gainText = n =>
    n > 0
      ? `♥ ${L(['好感', 'Affection'])} +${n}`
      : n < 0
        ? `${L(['好感', 'Affection'])} ${n}`
        : L(['今天她已经聊得很尽兴了', 'She has had her fill of talk for today']);

  for (;;) {
    const choice = await girlMenu(game, girl);
    if (choice.type === 'bye') break;
    if (choice.type === 'chat') {
      const r = sim.chat(s, girl, choice.approach);
      const [expr, zh, en] = pickOne(CHAT_LINES[girl][r.zone]);
      const [note, tone] = ZONE_NOTE[r.zone];
      if (note) game.toast(L(note), tone);
      if (r.gain > 0) game.audio.play('good');
      await line([girl, expr, zh, en], gainText(r.gain), r.gain > 0 ? 'good' : 'bad');
    } else if (choice.type === 'gift') {
      const item = await giftPicker(game);
      if (!item) continue;
      const r = sim.give(s, girl, item);
      const [expr, zh, en] = GIFT_LINES[girl][r.taste];
      if (r.taste === 'love') world.effect('heart');
      game.audio.play(r.gain > 0 ? 'good' : 'bad');
      await line([girl, expr, zh, en], gainText(r.gain), r.gain > 0 ? 'good' : 'bad');
      if (r.clothes) game.toast(L(['这件衣服加入了她的衣橱', 'It has joined her wardrobe']), 'info');
    } else if (choice.type === 'date') {
      const spot = await datePicker(game);
      if (!spot) continue;
      const r = sim.date(s, girl, spot.id);
      if (!r) continue;
      // Seniors who are fond of the hero and see him leave with someone else react first.
      for (const other of r.jealous) {
        const [expr, zh, en] = JEALOUS_LINES[other];
        await playScript(
          game,
          [
            ['in', other, expr],
            [other, expr, zh, en],
          ],
          { girl: other },
        );
        game.toast(`${L(HEROINES[other].name)} · ${L(['好感', 'Affection'])} −4`, 'bad');
      }
      await game.fadeOut(0.35);
      const [expr, zh, en] = DATE_LINES[girl][r.zone === 'sweet' ? 'good' : 'ok'];
      game.hideHud();
      const playing = playScript(
        game,
        [
          ['bg', spot.id],
          ['in', girl, 'smile'],
          ['n', ...DATE_STORY[spot.id]],
          ['fx', r.zone === 'sweet' ? 'heart' : 'none'],
          [girl, expr, zh, en],
        ],
        { girl },
      );
      await game.fadeIn(0.4);
      await playing;
      game.toast(gainText(r.gain), 'good');
      return true;
    } else if (choice.type === 'dress') {
      await openWardrobe(game, girl);
      await world.showActor(game.spec(girl, 'smile'), { x: X });
    }
    game.save();
  }
  await world.hideActor();
  return false;
}

/** Her card with affection, the push-and-pull gauge and what the hero can do. */
function girlMenu(game, girl) {
  const { ui, stage, L } = game,
    s = game.state,
    g = s.girls[girl],
    h = HEROINES[girl];
  return new Promise(resolve => {
    const panel = ui.panel({ x: 700, y: 92, w: 540, h: 600, res: 1.25 });
    const done = result => {
      panel.close();
      resolve(result);
    };
    game.showHud(null);
    panel.paint(p => {
      const c = p.g,
        lv = sim.level(g.aff);
      p.sheet(0, 0, 540, 592, { accent: h.color });
      p.text(L(h.name), 30, 22, { size: 32, weight: 800, color: h.color });
      p.text(L(h.role), 30, 68, { size: 15, color: THEME.soft });
      p.chip(L(LEVELS[lv].name), 510 - p.measure(L(LEVELS[lv].name), 15, 700) - 24, 28, { color: h.color, size: 15, h: 30, padX: 12 });
      // Affection.
      p.heart(42, 112, 9);
      p.bar(64, 104, 380, 16, g.aff, 100, { color: THEME.rose, color2: THEME.pink });
      p.text(`${g.aff} / 100`, 510, 100, { size: 17, weight: 800, align: 'right' });
      // Push-and-pull gauge: her comfortable range appears after a few talks.
      p.text(L(['拉扯', 'Push and pull']), 30, 140, { size: 15, weight: 700, color: THEME.soft });
      const gx = 30,
        gw = 480,
        gy = 168,
        at = v => gx + ((v + 50) / 100) * gw;
      c.fillStyle = rgba('#2b2a4a', 0.1);
      c.fill(rrect(gx, gy, gw, 12, 6));
      if (g.chats >= 3) {
        c.fillStyle = rgba(THEME.mint, 0.75);
        c.fill(rrect(at(h.pace[0]), gy, at(h.pace[1]) - at(h.pace[0]), 12, 6));
      }
      c.fillStyle = THEME.rose;
      c.fill(ellipse(at(g.pull), gy + 6, 10, 10));
      c.fillStyle = '#ffffff';
      c.fill(ellipse(at(g.pull), gy + 6, 4.5, 4.5));
      p.text(L(['← 留白', '← Space']), gx, gy + 18, { size: 13, color: THEME.faint });
      p.text(L(['靠近 →', 'Closer →']), gx + gw, gy + 18, { size: 13, color: THEME.faint, align: 'right' });
      p.text(
        g.chats >= 3
          ? L(['绿色是她觉得舒服的距离', 'Green marks the distance she is comfortable with'])
          : L(['多聊几次，就能看出她喜欢的距离', 'Talk a few more times to learn the distance she likes']),
        gx + gw / 2,
        gy + 18,
        { size: 13, color: THEME.soft, align: 'center' },
      );

      // Chat: three ways to approach her.
      const canChat = sim.canChat(s, girl);
      p.text(
        canChat
          ? L(['聊天 · 选择这次的距离', 'Chat · choose your distance this time'])
          : L(['这个时段已经聊过了', 'You have already talked this part of the day']),
        30,
        222,
        { size: 15, weight: 700, color: THEME.soft },
      );
      [
        ['space', ['留点余白', 'Give space'], ['不急着靠近', 'hold back'], THEME.sky],
        ['steady', ['自然相处', 'Stay easy'], ['保持现在的距离', 'keep things as they are'], THEME.mint],
        ['closer', ['靠近一步', 'Step closer'], ['主动一点', 'be forward'], THEME.pink],
      ].forEach(([approach, name, sub, color], i) =>
        p.button(30 + i * 164, 248, 152, 62, L(name), () => done({ type: 'chat', approach }), {
          kind: 'primary',
          color,
          disabled: !canChat,
          sub: L(sub),
          size: 18,
          r: 18,
        }),
      );

      const canGift = sim.canGift(s, girl);
      p.button(30, 330, 480, 54, L(['送礼物', 'Give a present']), () => done({ type: 'gift' }), {
        kind: 'plain',
        disabled: !canGift,
        sub: canGift ? undefined : L(['今天已经送过了', 'Already given one today']),
        size: 19,
        r: 18,
      });
      const canDate = sim.canDate(s, girl),
        dateWhy =
          g.aff < sim.DATE_AFFECTION
            ? L([`好感达到 ${sim.DATE_AFFECTION} 才能邀约`, `Needs ${sim.DATE_AFFECTION} affection`])
            : s.day - g.dateDay < sim.DATE_EVERY
              ? L(['刚约会过，过两天再约吧', 'You went out recently; ask again in a day or two'])
              : s.energy < 20
                ? L(['体力不足', 'Not enough energy'])
                : undefined;
      p.button(30, 396, 480, 54, L(['邀她出去走走', 'Ask her out']), () => done({ type: 'date' }), {
        kind: 'plain',
        disabled: !canDate,
        sub: canDate ? L(['会用掉这段时间', 'uses this part of the day']) : dateWhy,
        size: 19,
        r: 18,
      });
      const canDress = g.aff >= sim.DRESS_AFFECTION;
      p.button(30, 462, 480, 54, L(['帮她搭配衣服', 'Choose her outfit']), () => done({ type: 'dress' }), {
        kind: 'plain',
        disabled: !canDress,
        sub: canDress ? undefined : L([`好感达到 ${sim.DRESS_AFFECTION} 后她才愿意听你的建议`, `Needs ${sim.DRESS_AFFECTION} affection`]),
        size: 19,
        r: 18,
      });
      p.button(30, 530, 480, 44, L(['下次再聊', 'See you later']), () => done({ type: 'bye' }), { kind: 'dark', size: 17 });
    });
    panel.node.alpha = 0;
    panel.node.x = 730;
    stage.tween(panel.node, { alpha: 1, x: 700 }, 0.25);
  });
}

/** Choose a present from the bag. Resolves with the item id, or null. */
function giftPicker(game) {
  const { ui, L } = game,
    s = game.state;
  return new Promise(resolve => {
    const items = Object.keys(s.bag).filter(id => GIFTS[id] || CLOTHES[id]);
    const panel = ui.panel({ x: 240, y: 130, w: 800, h: 470, res: 1.25, modal: true });
    const done = result => {
      panel.close();
      resolve(result);
    };
    panel.dismiss = () => done(null);
    panel.paint(p => {
      p.sheet(0, 0, 800, 462);
      p.title(L(['送什么好呢', 'What to give']), 30, 22);
      if (!items.length)
        p.text(
          L([
            '背包里没有可以送的礼物。去商业街的礼物小铺看看吧。',
            'There is nothing to give in your bag. Try The Gift Nook on the shopping street.',
          ]),
          30,
          110,
          { size: 18, color: THEME.soft, maxW: 740 },
        );
      items.slice(0, 10).forEach((id, i) => {
        const x = 30 + (i % 5) * 150,
          y = 92 + Math.floor(i / 5) * 150,
          def = GIFTS[id] ?? CLOTHES[id];
        p.card(x, y, 138, 138, { r: 18, fill: '#fffaf1', shadow: 0.1 });
        if (GIFTS[id]) drawItemIcon(p.g, def.icon, x + 31, y + 8, 76);
        else {
          p.g.save();
          p.g.translate(x + 31, y + 8);
          drawGarmentIcon(p.g, id, 76, null, drawMannequin);
          p.g.restore();
        }
        p.text(L(def.name), x + 69, y + 90, { size: 14, weight: 700, align: 'center', maxW: 130, lineH: 17 });
        p.chip('×' + s.bag[id], x + 96, y + 8, { color: THEME.violet, size: 12, h: 20, padX: 7 });
        p.hit(x, y, 138, 138, () => done(id), { r: 18 });
      });
      p.button(620, 398, 150, 44, L(['算了', 'Never mind']), () => done(null), { kind: 'dark', size: 16 });
    });
  });
}

/** Choose where to go on a date. Resolves with the spot, or null. */
function datePicker(game) {
  const { ui, L } = game,
    s = game.state;
  return new Promise(resolve => {
    const panel = ui.panel({ x: 390, y: 150, w: 500, h: 420, res: 1.25, modal: true });
    const done = result => {
      panel.close();
      resolve(result);
    };
    panel.dismiss = () => done(null);
    panel.paint(p => {
      p.sheet(0, 0, 500, 412);
      p.title(L(['去哪里呢', 'Where to']), 30, 22);
      DATE_SPOTS.forEach((spot, i) => {
        const closed = !PLACES[spot.id].night && s.slot >= 3,
          poor = s.money < spot.cost;
        p.button(30, 92 + i * 66, 440, 54, L(spot.name), () => done(spot), {
          kind: 'primary',
          color: THEME.pink,
          disabled: closed || poor,
          sub: spot.cost ? `¥ ${spot.cost}` : L(['免费', 'Free']),
          size: 18,
          r: 18,
        });
      });
      p.button(320, 356, 150, 40, L(['算了', 'Never mind']), () => done(null), { kind: 'dark', size: 16 });
    });
  });
}
