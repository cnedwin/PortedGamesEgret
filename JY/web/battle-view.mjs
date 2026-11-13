import { Bitmap, Sprite, createAssetRef, createAssetType, createSharedMaterial2D, createTexture, isTexture } from '@egret/engine';
import { createTextField } from '@egret/engine/text';
import { combatArtGroup, createCombatArt, impactArtId } from './jyx2/effects/combat-art.mjs';
import { loadActorArt } from './jyx2/actors/actor-art.mjs';

const smap = 'smap';
const groupFor = role => role.fightGroup ?? `fight/fight${String(role.headId).padStart(3, '0')}`;
const effectGroup = id => `eft/eft${String(id).padStart(3, '0')}`;
const tileId = raw => Math.trunc(raw / 2);
const artKey = (group, id) => `battle:${group}:${id}`;
const battleTexture = createAssetType('kys-battle-texture', isTexture);
const actorGroup = 'jyx2-actor';
const artworkProviders = new WeakMap();
const bloodGroups = ['eft/bld000', 'eft/bld001', 'eft/bld002', 'eft/bld003', 'eft/bld004'];

function motion(role, tick) {
  if (role.dead) return ['defeat', (tick - (role.defeatFrame ?? tick)) * 27];
  const hitAge = tick - (role.hitFrame ?? -Infinity);
  if (role.action === 'stagger' || hitAge < 13) return ['hit', Number.isFinite(hitAge) ? hitAge * 42 : 0];
  if (role.action === 'guard') return ['guard', role.opCount * 38];
  if (role.action === 'attack') return ['attack', role.actFrame * 32];
  if (role.action === 'dodge') return ['dodge', role.actFrame * 95];
  if (role.action === 'walk') return ['walk', role.walkFrames * (1000 / 60)];
  return ['idle', tick * (1000 / 60)];
}

export async function createBattleView({ engine, cache, spec, width, height, scale, loadArt, bakeGround, json, itemEffectIds,
  visualStyle, outputAlpha = 'opaque', arena, grid }) {
  const project = (x, y) => [(x - y) * 18 * scale, (x + y) * 9 * scale];
  const floor = [];
  const buildings = [];
  for (let index = 0; !arena && index < spec.width * spec.height; index++) {
    const x = index % spec.width;
    const y = Math.floor(index / spec.width);
    const [px, py] = project(x, y);
    const earth = tileId(spec.layers.earth[index]);
    const building = tileId(spec.layers.building[index]);
    if (earth > 0) floor.push({ key: `g${index}`, group: smap, id: earth, px, py, depth: py });
    if (building > 0) buildings.push({ key: `b${index}`, group: smap, id: building, px, py, depth: py });
  }
  const roles = [...spec.team, ...spec.enemy];
  const usedMagics = [1, ...roles.flatMap(role => (role.learnedMagics ?? []).map(magic => magic.id))];
  const effects = new Set(usedMagics.map(id => spec.magics[id]?.effectId).filter(id => Number.isInteger(id) && id >= 0));
  const spriteRoles = arena ? roles.filter(role => !arena.hasRole(role.id)) : roles;
  const actorsPromise = visualStyle === 'jyx2' ? loadActorArt(spriteRoles.map(role => role.id), scale) : undefined;
  for (const id of itemEffectIds) if (id >= 0) effects.add(id);
  const names = [...new Set([...spriteRoles.map(groupFor), ...[...effects].map(effectGroup), ...bloodGroups])];
  const tiles = new Set(arena ? [] : await json('/api/art/smap'));
  const terrain = [...new Set([...floor, ...buildings].map(item => item.id))].filter(id => tiles.has(id));
  const groups = await Promise.all(names.map(async name => [name, (await json(`/api/art/${name}`)).sort((a, b) => a - b)]));
  groups.push([smap, terrain], ['title', [203, 205]], ['title-red', [203]]);
  const available = new Map(groups);
  const art = new Map((await Promise.all(groups.map(async ([group, ids]) =>
    [...await loadArt(group === 'title-red' ? 'title' : group, ids, group === 'title-red', group.includes('/') ? 256 : 1024)]
      .map(([id, texture]) => [artKey(group, id), texture]),
  ))).flat());
  const actors = await actorsPromise;
  if (actors) for (const [id, texture] of actors.textures) art.set(artKey(actorGroup, id), texture);
  const combatArt = visualStyle === 'jyx2' ? createCombatArt(usedMagics, arena ? 2 : 1) : new Map();
  for (const [id, texture] of combatArt) art.set(artKey(combatArtGroup, id), texture);
  const glowMaterial = combatArt.size && !arena ? createSharedMaterial2D({ blend: outputAlpha === 'opaque' ? 'add-preserve' : 'add-accumulate',
    filter: 'linear' }) : undefined;
  arena?.setSpriteArt(art);
  const encounterZoom = arena ? roles.length >= 13 ? .91 : roles.length >= 9 ? .98 : 1.08 : 1;
  const groundArt = new Map(terrain.map(id => [id, art.get(artKey(smap, id))]));
  const groundGroup = `field${spec.battlefieldId}`;
  let groundIndex = 0;
  const floorOrder = bakeGround(floor.sort((a, b) => a.depth - b.depth || a.px - b.px), groundArt, () => --groundIndex)
    .map(item => ({ ...item, group: groundGroup, key: `floor${item.id}` }));
  for (const item of floorOrder) art.set(artKey(groundGroup, item.id), groundArt.get(item.id));

  const scope = engine.createScope();
  try {
    let provider = artworkProviders.get(engine);
    if (!provider) {
      provider = {
        async load(ref) {
          const { image, region } = this.art.get(ref.id);
          return createTexture(image, region);
        },
        dispose(texture) { texture.dispose(); },
      };
      engine.assets.register(battleTexture, provider);
      artworkProviders.set(engine, provider);
    }
    provider.art = art;
    const keys = [...art.keys()].filter(key => !arena || /^battle:title(?:-red)?:/.test(key));
    const leases = new Map();
    for (let offset = 0; offset < keys.length; offset += 128) {
      const batch = keys.slice(offset, offset + 128);
      const group = engine.createAssetGroup(scope, batch.map(key => createAssetRef(battleTexture, key)));
      const values = await group.ready;
      batch.forEach((key, index) => leases.set(key, values[index]));
    }

    const root = engine.stage.addChild(scope.use(new Sprite()));
    const ground = root.addChild(scope.use(new Sprite()));
    const objects = root.addChild(scope.use(new Sprite()));
    const gauges = root.addChild(scope.use(new Sprite()));
    const overlays = engine.stage.addChild(scope.use(new Sprite()));
    const flash = overlays.addChild(scope.use(new Bitmap(leases.get(artKey('title', 203)))));
    flash.visible = false;
    const numberNodes = new Map();
    scope.use({ dispose() {
      for (const number of numberNodes.values()) number.scope.dispose();
      numberNodes.clear();
    } });
    const groundNodes = new Map();
    const objectNodes = new Map();
    const gaugeNodes = new Map();

    function put(container, nodes, items) {
      const next = [];
      for (const item of items) {
        const key = artKey(item.group, item.id);
        const texture = art.get(key);
        if (!texture) continue;
        const { dx, dy, region } = texture;
        const artScale = texture.scale ?? 1;
        const x = Math.round(item.px - dx), y = Math.round(item.py - dy), zoom = root.scaleX;
        if (x * zoom + root.x >= width || y * zoom + root.y >= height
          || (x + region.width * artScale) * zoom + root.x <= 0 || (y + region.height * artScale) * zoom + root.y <= 0) continue;
        const lease = leases.get(key);
        let node = nodes.get(item.key);
        if (!node) {
          node = scope.use(new Bitmap(lease));
          if (item.group === combatArtGroup) node.sharedMaterial = glowMaterial;
          nodes.set(item.key, node);
        } else if (node.textureLease !== lease) node.textureLease = lease;
        node.anchorOffsetX = item.rotation ? region.width / 2 : 0;
        node.anchorOffsetY = item.rotation ? region.height / 2 : 0;
        node.x = x + node.anchorOffsetX * artScale;
        node.y = y + node.anchorOffsetY * artScale;
        node.scaleX = node.scaleY = artScale;
        node.rotation = item.rotation ?? 0;
        node.alpha = item.alpha ?? 1;
        next.push(node);
      }
      const keep = new Set(next);
      for (let index = container.numChildren - 1; index >= 0; index--) {
        const node = container.getChildAt(index);
        if (!keep.has(node)) container.removeChild(node);
      }
      next.forEach((node, index) => {
        if (node.parent !== container) container.addChild(node);
        if (container.getChildAt(index) !== node) container.setChildIndex(node, index);
      });
    }

    function drawGauge(role, index, px, py) {
      let gauge = gaugeNodes.get(index);
      if (!gauge) {
        gauge = { node: gauges.addChild(scope.use(new Sprite())) };
        gaugeNodes.set(index, gauge);
      }
      gauge.node.visible = role.hp > 0;
      gauge.node.x = Math.round(px - 18);
      gauge.node.y = Math.round(py - 55);
      const hp = Math.max(0, Math.min(36, Math.ceil(36 * role.hp / role.maxHp)));
      const posture = Math.max(0, Math.min(36, Math.ceil(36 * role.posture / role.maxPosture)));
      if (gauge.hp === hp && gauge.posture === posture) return;
      Object.assign(gauge, { hp, posture });
      const g = gauge.node.graphics;
      g.clear();
      g.beginFill(0x1f1912, .88).drawRect(-1, -1, 38, 9).endFill();
      if (hp) g.beginFill(role.side === 0 ? 0x83b376 : 0xc35a47).drawRect(0, 0, hp, 4).endFill();
      if (posture) g.beginFill(0xe2bb58).drawRect(0, 5, posture, 2).endFill();
    }

    let preparingNumbers = false;

    async function prepareNumbers() {
      if (preparingNumbers) return;
      preparingNumbers = true;
      try {
        // An area attack can submit more distinct numbers than the text cache can rasterize at once.
        for (const number of numberNodes.values()) {
          if (number.prepared || number.scope.signal.aborted) continue;
          try {
            await number.node.prepare();
            number.prepared = true;
          } catch (error) {
            if (number.scope.signal.aborted) continue;
            if (error.code === 'TEXT_CACHE_BUDGET') break; // Retry on the next frame if the shared cache is busy.
            number.prepared = true;
            console.warn(error);
          }
        }
      } finally {
        preparingNumbers = false;
      }
    }

    function drawNumbers(texts, zoom) {
      const active = new Set(texts.map(text => text.key));
      for (const [key, number] of numberNodes) if (!active.has(key)) {
        number.scope.dispose();
        numberNodes.delete(key);
      }
      for (const entry of texts) {
        let number = numberNodes.get(entry.key);
        if (!number) {
          const owned = engine.createScope();
          const node = overlays.addChild(createTextField(engine, owned, cache));
          node.setRequest({ text: entry.text, fontFamily: 'Microsoft YaHei', fontSize: entry.size,
            lineHeight: entry.size + 4, fontWeight: 700, fontStyle: 'normal', locale: 'zh-TW',
            direction: 'ltr', density: 1, fillColor: entry.color });
          number = { node, scope: owned };
          numberNodes.set(entry.key, number);
        }
        const [px, py] = project(entry.x, entry.y);
        number.node.x = Math.round(root.x + px * zoom);
        number.node.y = Math.round(root.y + py * zoom);
      }
      void prepareNumbers();
    }

    const gridContext = grid.getContext('2d');
    grid.width = width;
    grid.height = height;
    grid.hidden = false;

    function tileAt(px, py) {
      const x = (px - root.x) / (18 * scale * root.scaleX);
      const y = (py - root.y) / (9 * scale * root.scaleY);
      return { x: Math.round((y + x) / 2), y: Math.round((y - x) / 2) };
    }

    function drawGrid(state, cursor) {
      const ctx = gridContext;
      ctx.clearRect(0, 0, width, height);
      if (!state.canAct) return;
      const cells = state.selection?.cells ?? [];
      const rx = 18 * scale * root.scaleX, ry = 9 * scale * root.scaleY;
      const moving = state.selection?.type === 'move';
      for (const { x, y } of cells.length ? cells : [state.turn]) {
        const [px, py] = project(x, y);
        const sx = root.x + px * root.scaleX, sy = root.y + py * root.scaleY;
        if (sx < -rx || sx > width + rx || sy < -ry || sy > height + ry) continue;
        const selected = cursor?.x === x && cursor?.y === y;
        ctx.beginPath();
        ctx.moveTo(sx, sy - ry + 1);
        ctx.lineTo(sx + rx - 2, sy);
        ctx.lineTo(sx, sy + ry - 1);
        ctx.lineTo(sx - rx + 2, sy);
        ctx.closePath();
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeStyle = selected || !cells.length ? '#ffe1a3' : moving ? '#8bd5ca' : '#f5a17d';
        ctx.fillStyle = selected ? '#ffdb9160' : moving ? '#4acdb826' : '#fa775333';
        if (cells.length) ctx.fill();
        ctx.stroke();
      }
    }

    function draw(state, cursor) {
      const { focus, closeUp, shakeX, shakeY, swordLight, swordLightColor, texts, blood } = state.presentation;
      const zoom = state.presentation.zoom * (closeUp ? 1 : encounterZoom);
      const [cameraX, cameraY] = project(focus.x, focus.y);
      root.scaleX = root.scaleY = zoom;
      root.x = Math.round(width / 2 + (shakeX - cameraX) * zoom);
      root.y = Math.round(height / 2 + (shakeY - cameraY + (closeUp ? 20 * scale : 0)) * zoom);
      if (cursor && state.selection) {
        const [px, py] = project(cursor.x, cursor.y);
        const x = root.x + px * zoom, y = root.y + py * zoom;
        root.x += Math.min(width * .82, Math.max(width * .18, x)) - x;
        root.y += Math.min(height * .79, Math.max(height * .21, y)) - y;
      }
      put(ground, groundNodes, floorOrder);
      const sorted = [...buildings];
      const frames = [];
      function paint(item, position) {
        if (arena) {
          frames.push({ key: item.key, art: artKey(item.group, item.id), alpha: item.alpha ?? 1,
            rotation: item.rotation, ...position });
        } else sorted.push(item);
      }
      for (const [index, gauge] of gaugeNodes) if (index >= state.roles.length) gauge.node.visible = false;
      for (const [index, role] of state.roles.entries()) {
        const [px, py] = project(role.x, role.y);
        const [clip, elapsed] = motion(role, state.frame);
        const renderedActor = actors?.frame(role.id, clip, role.facing, elapsed);
        const group = renderedActor === undefined ? groupFor(role) : actorGroup;
        const ids = available.get(group);
        const id = renderedActor ?? (art.has(artKey(group, role.picture)) ? role.picture : ids?.[0]);
        const height = role.z ?? 0;
        if (!arena?.hasRole(role.id)) {
          paint({ key: `r${index}`, group, id, px: px + role.shakeX, py: py - height, depth: py, alpha: role.alpha,
            rotation: renderedActor === undefined ? role.rotation : 0 }, { x: role.x, y: role.y, z: height, shakeX: role.shakeX });
        }
        if (role.breathless && role.hp > 0) sorted.push({ key: `stagger${index}`, group: 'title', id: 205,
          px: px - 5, py: py - height - 36 * scale, depth: py + 1, rotation: role.cooldown });
        drawGauge(role, index, px, py - height);
      }
      for (const [index, effect] of state.effects.entries()) {
        const group = effectGroup(effect.effectId);
        const ids = available.get(group);
        const [px, py] = project(effect.x, effect.y);
        const upgraded = effect.itemId === undefined && combatArt.has(effect.magicId);
        if (ids?.length) paint({ key: `f${index}`, group, id: ids[effect.frame % ids.length],
          px, py: py - (effect.z ?? 0), depth: py, alpha: arena && upgraded ? .45 : .8 },
          { x: effect.x, y: effect.y, z: effect.z, effect: true });
        if (effect.itemId === undefined && combatArt.has(effect.magicId)) {
          const remaining = 1 - effect.frame / effect.totalFrames;
          paint({ key: `glow${index}`, group: combatArtGroup, id: effect.magicId,
            px, py: py - (effect.z ?? 0) - 11, depth: py + .1, alpha: Math.max(0, remaining) * .8,
            rotation: effect.angle ?? 0 }, { x: effect.x, y: effect.y, z: (effect.z ?? 0) + 11, effect: true, additive: true });
        }
      }
      for (const [index, effect] of state.presentation.impacts.entries()) {
        const id = impactArtId(effect.magicId);
        if (!combatArt.has(id)) continue;
        const [px, py] = project(effect.x, effect.y);
        paint({ key: `impact${index}`, group: combatArtGroup, id, px, py: py - effect.z - 17 * scale,
          depth: py + 1.1, alpha: effect.alpha * .85 }, { x: effect.x, y: effect.y, z: effect.z + 17 * scale,
          effect: true, additive: true });
      }
      for (const entry of blood) {
        const [px, py] = project(entry.x, entry.y);
        const id = available.get(entry.group)?.[entry.frame];
        if (id !== undefined) paint({ key: `blood${entry.key}`, group: entry.group, id, px, py: py - entry.z, depth: py + 1, alpha: entry.alpha },
          { x: entry.x, y: entry.y, z: entry.z, effect: true });
      }
      arena?.draw(state, root.x, root.y, zoom, frames);
      sorted.sort((a, b) => a.depth - b.depth || a.px - b.px);
      put(objects, objectNodes, sorted);
      flash.visible = swordLight > 0;
      if (flash.visible) {
        const group = swordLightColor === 0xffffff ? 'title' : 'title-red';
        const lease = leases.get(artKey(group, 203));
        if (flash.textureLease !== lease) flash.textureLease = lease;
        flash.scaleX = flash.scaleY = width * swordLight / (20 * flash.naturalWidth);
        flash.x = width / 2 - flash.naturalWidth * flash.scaleX / 2;
        flash.y = height / 2 - flash.naturalHeight * flash.scaleY / 2 - 40;
      }
      drawNumbers(texts, zoom);
      drawGrid(state, cursor);
    }

    return { draw, tileAt, close() { grid.hidden = true; scope.dispose(); art.clear(); } };
  } catch (error) {
    scope.dispose();
    art.clear();
    throw error;
  }
}
