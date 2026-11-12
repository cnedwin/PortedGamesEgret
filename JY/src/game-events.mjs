import { animationFrames, modifySceneEvent } from './cifa-opening.mjs';

const layers = ['earth', 'building', 'decoration', 'eventIndex', 'buildingHeight', 'decorationHeight'];
const clamp = (value, maximum = 100) => Math.max(0, Math.min(maximum, value));
const short = value => (value << 16) >> 16;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const stop = Symbol('end of game event');

export function applyScenePatch(scene, patch) {
  if (!patch) return scene;
  if (patch.entranceCondition !== undefined) scene.entranceCondition = patch.entranceCondition;
  for (const [slot, event] of patch.events ?? []) Object.assign(scene.events[slot], event);
  for (const [cell, value] of patch.eventTiles ?? []) scene.layers.eventIndex[cell] = value;
  for (const [name, cells] of Object.entries(patch.layers ?? {})) {
    for (const [cell, value] of cells) scene.layers[name][cell] = value;
  }
  return scene;
}

function scenePatch(before, after, previous) {
  const patch = { ...previous };
  const events = new Map(patch.events);
  let changed = false;
  for (const [index, event] of after.events.entries()) if (!same(event, before.events[index])) {
    events.set(index, event);
    changed = true;
  }
  const changedLayers = { ...patch.layers };
  for (const name of layers) {
    const cells = new Map(name === 'eventIndex' ? patch.eventTiles : changedLayers[name]);
    const next = after.layers[name], old = before.layers[name];
    for (let index = 0; index < next.length; index++) if (next[index] !== old[index]) {
      cells.set(index, next[index]);
      changed = true;
    }
    if (name === 'eventIndex') patch.eventTiles = [...cells];
    else if (cells.size) changedLayers[name] = [...cells];
  }
  if (before.entranceCondition !== after.entranceCondition) {
    patch.entranceCondition = after.entranceCondition;
    changed = true;
  }
  return changed ? { ...patch, events: [...events], layers: changedLayers } : undefined;
}

function setPic(event, picture) {
  event.currentPic = event.beginPic = event.endPic = picture;
}

function setMagic(role, index, id, level) {
  if (index < 0 || index >= 10) return;
  const magics = (role.learnedMagics ?? []).map((magic, slot) => ({ slot, ...magic }));
  role.learnedMagics = magics.filter(magic => magic.slot !== index);
  if (id > 0) role.learnedMagics.push({ id, level, slot: index });
  role.learnedMagics.sort((a, b) => a.slot - b.slot);
}

/** Execute original event hosts on staged state so an interrupted script cannot partly save. */
export async function playGameEvent({ program, run, game, catalog, sceneId, eventSlot, usedItem, view }) {
  const party = [...game.party];
  const inventory = new Map(game.inventory);
  const rolePatches = new Map(game.roleState.map(role => [role.id, role]));
  const roles = new Map();
  const drafts = new Map();
  const scenes = new Map(game.scenePatches);
  const flags = { ...game.save?.flags };
  let shouldSave = false;
  let ended;
  let lastBattle = game.save?.lastBattle;

  function role(id) {
    if (roles.has(id)) return roles.get(id);
    if (!catalog.roles[id]) throw new Error(`原作角色 ${id} 不存在`);
    const record = structuredClone({ ...catalog.roles[id], ...rolePatches.get(id) });
    roles.set(id, record);
    return record;
  }

  async function scene(id = sceneId) {
    const resolved = id < 0 ? sceneId : id;
    if (!drafts.has(resolved)) {
      const original = await view.getScene(resolved);
      drafts.set(resolved, { original, draft: structuredClone(original) });
    }
    return drafts.get(resolved).draft;
  }

  const getSlot = slot => slot < 0 ? eventSlot : slot;
  async function event(id, slot) {
    const record = (await scene(id)).events[getSlot(slot)];
    if (!record) throw new Error(`原作場景 ${id} 缺少事件槽 ${slot}`);
    return record;
  }

  function addItem(id, amount) {
    if (id < 0 || !amount) return;
    const remaining = (inventory.get(id) ?? 0) + amount;
    if (remaining > 0) inventory.set(id, remaining);
    else inventory.delete(id);
  }

  async function reward(id, amount) {
    addItem(id, amount);
    if (id >= 0 && amount !== 0) {
      await preview();
      await view.reward(id, amount);
    }
  }

  async function preview() {
    if (drafts.has(sceneId)) await view.preview(drafts.get(sceneId).draft);
  }

  async function talk(text, head, style, voice = -1) {
    await preview();
    return view.talk(text, head, style, voice);
  }

  async function oldTalk(id, head, style) {
    return talk(await view.oldTalk(id), head, style);
  }

  async function modify(id, slot, ...fields) {
    const target = await scene(id);
    return modifySceneEvent(target, eventSlot, id, slot, ...fields);
  }

  async function join(id) {
    if (party.includes(id) || party.length >= 6) return;
    const member = role(id);
    party.push(id);
    for (const item of member.carriedItems) await reward(item.id, item.count || 1);
    member.carriedItems = [];
  }

  async function battle(id, exp) {
    await preview();
    const activeRoles = [...rolePatches.values()].filter(entry => !roles.has(entry.id));
    activeRoles.push(...roles.values());
    const result = await view.battle(id, exp, inventory, party, activeRoles);
    for (const [item, delta] of result.inventoryDelta) addItem(item, delta);
    for (const { expGot, levelsGained, ...patch } of result.settlement) Object.assign(role(patch.id), patch);
    lastBattle = { id, won: result.won };
    return result.won;
  }

  function rest() {
    for (const id of party) {
      const member = role(id);
      Object.assign(member, { hp: member.maxHp, mp: member.maxMp, physicalPower: 100, hurt: 0, poison: 0 });
    }
  }

  async function animate(target, first, last, ...parallel) {
    const current = await scene();
    const { frames, final } = animationFrames(target, first, last);
    const sprite = target >= 0 ? await event(sceneId, target) : undefined;
    const others = await Promise.all(parallel.map(async ([slot, picture]) => ({ picture, sprite: await event(sceneId, slot) })));
    const begin = frames[0] ?? final;
    const extras = others.flatMap(({ picture }) => [...frames, final].map(frame => picture + frame - begin));
    await view.animation(current, target, frames, final, (picture, offset) => {
      if (sprite) setPic(sprite, picture);
      for (const entry of others) setPic(entry.sprite, entry.picture + offset);
    }, extras);
  }

  async function raise(id, field, amount, label, cap, hpField) {
    const member = role(id);
    const before = member[field];
    member[field] = clamp(before + amount, cap);
    if (hpField) member[hpField] = clamp(member[hpField] + amount, member[field]);
    await view.message(`${member.name}${label}增加${member[field] - before}`);
  }

  async function learn(id, magicId, hide) {
    const member = role(id);
    const magic = catalog.magics[magicId];
    if (!magic || magicId <= 0) return;
    const slots = (member.learnedMagics ?? []).map((entry, slot) => ({ slot, ...entry }));
    const known = slots.find(entry => entry.id === magicId);
    if (known && known.level < 900) setMagic(member, known.slot, magicId, Math.min(999, known.level + 100));
    if (!known) {
      const index = Array.from({ length: 10 }, (_, slot) => slot).find(slot => !slots.some(entry => entry.slot === slot));
      if (index !== undefined) setMagic(member, index, magicId, 0);
    }
    if (!hide) await view.message(`${member.name}習得武學${magic.name}`);
  }

  const hosts = {
    talk, newtalk: talk, oldtalk: oldTalk,
    modifyevent: modify,
    askjoin: () => view.ask('是否要求加入？'),
    askbattle: () => view.ask('是否與之過招？'),
    askrest: () => view.ask('請選擇是或否？'),
    trybattle: battle,
    join,
    leaveteam(id) { if (id !== 0 && party.includes(id)) party.splice(party.indexOf(id), 1); },
    async allleave() {
      // The tournament invitation requires a solo party. Run each original
      // departure's map edits so required companions can still be re-recruited.
      for (const id of party.slice(1)) {
        const departure = catalog.leaveEvents?.get?.(id);
        if (departure === undefined) continue;
        const program = await view.getProgram(departure);
        await run(program, (name, ...args) => {
          if (name !== 'talk' && name !== 'newtalk') return invokeHost(name, ...args);
        });
      }
      party.splice(1);
    },
    teamisfull: () => party.length >= 6,
    inteam: id => party.includes(id),
    isusingitem: id => usedItem === id,
    getitemcountinbag: id => inventory.get(id) ?? 0,
    haveitembool: id => (inventory.get(id) ?? 0) > 0,
    checkhave5item: (...ids) => ids.every(id => inventory.has(id)),
    checkenoughmoney: amount => (inventory.get(catalog.moneyItemId) ?? 0) >= amount,
    additem: reward,
    additemwithouthint: addItem,
    darkscene: () => view.fade(0),
    async lightscene() { await preview(); await view.fade(1); },
    playanimation: animate,
    play2amination: (a, start, end, b, bStart) => animate(a, start, end, [b, bStart]),
    async breakstonegate() {
      await animate(-1, 7664, 7688);
      await animate(2, 7690, 7746, [3, 7748], [4, 7806]);
    },
    async backhome(a, start, end, b, bStart) {
      await view.hidePlayer();
      await animate(a, start, end, [b, bStart]);
      ended = 'complete';
      throw stop;
    },
    settowards: view.setFacing,
    oldsetsceneposition: view.setPosition,
    submapviewfromto: (...coordinates) => view.travel(false, ...coordinates),
    walkfromto: (...coordinates) => view.travel(true, ...coordinates),
    playwave: view.wave,
    playmusic: view.music,
    changemainmapmusic(id) { flags.mainMusic = id; },
    checkrolemorality: (id, min, max) => role(id).morality >= min && role(id).morality <= max,
    checkroleattack: (id, min) => role(id).attack >= min,
    checkrolesexual: value => value > 255 || role(0).sexual === value,
    checkfemaleinteam: () => party.some(id => role(id).sexual === 1),
    checkeventid: async (slot, value) => (await event(sceneId, slot)).event1 === value,
    checksubmappic: async (id, slot, value) => {
      const entry = await event(id, slot);
      return [entry.currentPic, entry.beginPic, entry.endPic].includes(value);
    },
    check14booksplaced: async () => (await scene()).events.slice(11, 25).every(entry => entry.currentPic === 4664),
    async add3eventnum(id, slot, a, b, c) {
      const entry = await event(id, slot);
      entry.event1 = short(entry.event1 + a);
      entry.event2 = short(entry.event2 + b);
      entry.event3 = short(entry.event3 + c);
    },
    async setsubmaplayerdata(id, layer, x, y, value) {
      const target = await scene(id);
      if (!layers[layer] || x < 0 || y < 0 || x >= target.width || y >= target.height) throw new RangeError('場景圖層座標越界');
      target.layers[layers[layer]][x + y * target.width] = short(value);
    },
    async changesubmappic(id, layer, oldPicture, picture) {
      const cells = (await scene(id)).layers[layers[layer]];
      for (let index = 0; index < cells.length; index++) if (cells[index] === oldPicture) cells[index] = short(picture);
    },
    async opensubmap(id) { (await scene(id)).entranceCondition = 0; },
    async openallsubmap() {
      for (const id of catalog.sceneIds) (await scene(id)).entranceCondition = [2, 38].includes(id) ? 2 : [75, 80].includes(id) ? 1 : 0;
    },
    addmorality(amount) { const hero = role(0); hero.morality = clamp(hero.morality + amount); },
    async addfame(amount) {
      const hero = role(0);
      const before = hero.fame;
      hero.fame += amount;
      if (before <= 200 && hero.fame > 200) await modify(70, 11, 0, 11, 932, -1, -1, 7968, 7968, 7968, 0, 18, 21);
    },
    showmorality: () => view.message(`你的道德指數為${role(0).morality}`),
    showfame: () => view.message(`你的聲望為${role(0).fame}`),
    rest,
    zeroallmp() { for (const id of party) role(id).mp = 0; },
    setroleusepoison(id, value) { role(id).usePoison = value; },
    setmptype(id, value) { role(id).mpType = value; },
    setsexual(id, value) { role(id).sexual = value; },
    oldlearnmagic: learn,
    setrolemagic(id, slot, magic, level) { setMagic(role(id), slot, magic, level); },
    addiq: (id, amount) => raise(id, 'iq', amount, '資質', 100),
    addattack: (id, amount) => raise(id, 'attack', amount, '武力', 100),
    addspeed: (id, amount) => raise(id, 'speed', amount, '輕功', 100),
    addmaxhp: (id, amount) => raise(id, 'maxHp', amount, '生命', 999, 'hp'),
    addmaxmp: (id, amount) => raise(id, 'maxMp', amount, '內力', 999, 'mp'),
    roleadditem(id, itemId, amount) {
      const member = role(id);
      const contents = new Map(member.carriedItems.map(item => [item.id, item.count]));
      if (contents.has(itemId) || contents.size < 4) contents.set(itemId, (contents.get(itemId) ?? 0) + amount);
      member.carriedItems = [...contents].filter(([item, count]) => item >= 0 && count > 0).sort((a, b) => a[0] - b[0])
        .map(([id, count]) => ({ id, count }));
    },
    async shop() {
      await oldTalk(0xb9e, 0x6f, 0);
      const id = Math.floor(Math.random() * catalog.shops.length);
      const stock = catalog.shops[id];
      const sold = new Map(flags.shopSold ?? []);
      const bought = await view.shop(stock.map((entry, index) => ({ ...entry, index,
        name: catalog.items[entry.id]?.name, count: entry.count - (sold.get(`${id}:${index}`) ?? 0) })),
      inventory.get(catalog.moneyItemId) ?? 0);
      const row = stock[bought];
      const key = `${id}:${bought}`;
      if (!row || (sold.get(key) ?? 0) >= row.count || (inventory.get(catalog.moneyItemId) ?? 0) < row.price) return;
      addItem(catalog.moneyItemId, -row.price);
      addItem(row.id, 1);
      sold.set(key, (sold.get(key) ?? 0) + 1);
      flags.shopSold = [...sold];
      await oldTalk(0xba0, 0x6f, 0);
    },
    dead() { ended = 'defeat'; throw stop; },
    async fightfortop() {
      const heads = [8, 21, 23, 31, 32, 43, 7, 11, 14, 20, 33, 34, 10, 12, 19, 22, 56, 68, 13, 55, 62, 67, 70, 71, 26, 57, 60, 64, 3, 69];
      for (let round = 0; round < 15; round++) {
        const draw = round * 2 + Math.floor(Math.random() * 2);
        await oldTalk(2854 + draw, heads[draw], Math.floor(Math.random() * 2) * 4 + Math.floor(Math.random() * 2));
        if (!await battle(102 + draw, 0)) hosts.dead();
        await hosts.darkscene();
        await hosts.lightscene();
        if (round % 3 === 2) {
          await oldTalk(2891, 70, 4);
          rest();
          await hosts.darkscene();
          await hosts.lightscene();
        }
      }
      for (let id = 2884; id <= 2889; id++) await oldTalk(id, 0, id === 2889 ? 1 : 3);
      await reward(0x8f, 1);
    },
    autosave() { shouldSave = true; },
  };

  function invokeHost(name, ...args) {
    const operation = Object.hasOwn(hosts, name) && hosts[name];
    if (!operation) throw new Error(`原作事件指令尚未接入 ${name}`);
    return operation(...args);
  }

  try {
    await run(program, invokeHost);
  } catch (error) {
    if (error !== stop) throw error;
  }
  if (ended === 'defeat') return { ended };
  for (const [id, { original, draft }] of drafts) {
    const patch = scenePatch(original, draft, scenes.get(id));
    if (patch) {
      scenes.set(id, patch);
      shouldSave = true;
    }
  }
  for (const [id, member] of roles) {
    const before = { ...catalog.roles[id], ...rolePatches.get(id) };
    const updates = Object.fromEntries(Object.entries(member).filter(([key, value]) => !same(before[key], value)));
    if (Object.keys(updates).length) {
      rolePatches.set(id, { ...rolePatches.get(id), ...updates, id });
      shouldSave = true;
    }
  }
  shouldSave ||= !same([...inventory], [...game.inventory]) || !same(party, game.party)
    || !same(flags, game.save?.flags ?? {}) || !same(lastBattle, game.save?.lastBattle) || Boolean(ended);
  return { inventory, party, roleState: [...rolePatches.values()], scenePatches: scenes, flags, lastBattle, shouldSave, ended,
    changedScenes: new Map([...drafts].filter(([id]) => scenes.get(id) !== game.scenePatches.get(id)).map(([id, entry]) => [id, entry.draft])) };
}
