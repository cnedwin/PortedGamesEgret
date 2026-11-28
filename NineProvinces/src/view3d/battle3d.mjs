// 地图上的战斗：战场就是天下图上的那一片格子，镜头飞过去，战场外的地暗下来；各部兵马按所在的格子站阵，走动时平滑
// 地挪过去，接敌就前冲后撤，溃逃时四散；城上的守兵站在城墙顶。头顶是部队的名牌，掉兵时冒出伤害数字，放战法时
// 战法名以大字浮现、火攻点起火焰，弓弩部队射出一阵阵箭雨，城门被攻破时门扇倒下。
// The battle on the map: the field is that stretch of the realm's hexes; the camera flies there and the land outside
// the field dims. Each unit stands in formation on its hex and slides smoothly as it moves, lunges and falls back in a
// melee, scatters when routed; defenders on the walls stand on the wall top. Over each unit is its plate; losses rise as
// numbers, a tactic's name appears in large characters, fire tactics set flames, bows loose volleys of arrows, and the
// gate's leaves fall when it is broken.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  Texture3D,
  createBoxGeometry3D,
  createGradientCubeTexture3D,
  createParticleEmitter3D,
  createRingGeometry3D,
  createStandardMaterial3D,
  linearColor3D,
  mat4Compose,
  quatFromEuler
} from '@egret/engine/world3d';
import { UNITS } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { nm } from '../i18n.mjs';
import { distance, neighbours, ring as hexRing, tacticPreview } from '../sim/battle.mjs';
import { FERRY_HOLD_SECONDS } from '../sim/battle-ferry.mjs';
import { HEX_W, hexCenter } from '../sim/hexgrid.mjs';
import { FOOTPRINTS } from '../sim/land.mjs';
import { wallTop } from './cities.mjs';
import { figureOf, isSiegeFigure } from './troops.mjs';
import {formationSlots, freshAttack, createSiegeLighting, battleCameraFrame} from './battle-staging.mjs';
import { createNativeBattleMarkers } from './native-battle-markers.mjs';
import {createBattleReframeGate,battleReframeIndices,chooseBattleLocateAnchor,locateCameraOffset} from './battle-viewport-reframe.mjs';
import { catapultStone, CATAPULT_ARM_PIVOT, CATAPULT_LOAD_POINT, TOWER_DECK_PIVOT, TOWER_DECK_PITCH } from './siege-tall-equipment.mjs';
import { catapultPitch, siegeMount, CATAPULT_RELEASE_PITCH, CATAPULT_RELEASE_TIME, CATAPULT_RESET_TIME } from './siege-motion.mjs';
import { createSiegeShots } from './siege-shots.mjs';


function softDot() {
  const n = 32,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
      const a = Math.max(0, 1 - d) ** 1.6;
      data.set([255, 255, 255, Math.round(a * 255)], (y * n + x) * 4);
    }
  return new Texture3D({ width: n, height: n, data }, { colorSpace: 'srgb' });
}

/**
 * Lay the battle over the realm. The attached Play host draws native unit plates and calligraphy;
 * on hears taps on units and hexes.
 */
export function createBattle3D(realm, b, { colours, side, rulers, on, calm, canDeploy, showMarkers=()=>true }) {
  const { scene, land, troops, camera, rig } = realm;
  const siegeSample = b.setup.presentation === 'nanpi-sunset';
  const tacticalFormation = siegeSample || (b.setup.kind === 'field' && !b.setup.special);
  const sunset = siegeSample ? createGradientCubeTexture3D([83,103,137],[224,160,96],[109,91,69],32) : null;
  const lightLease = siegeSample ? createSiegeLighting(realm.stage,sunset) : null;
  realm.select?.({});
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const isCalm = () => Boolean(calm?.() || reduced?.matches);
  const n = b.tiles.length;
  // Where each hex is on the map, and the height a soldier stands at there.
  const place = b.setup.place?.node ? FOOTPRINTS[b.setup.place.node] : null;
  const top = place && b.setup.kind === 'siege' ? wallTop(place) : null;
  const pos = Array.from({ length: n }, (_, i) => {
    const [wc, wr] = b.world[i];
    const p = hexCenter(wc, wr);
    const ground = Math.max(0, land.heightAt(p.x, p.z));
    const tile = b.tiles[i];
    const water = tile === 'water' || tile === 'ship';
    return { x: p.x, z: p.z, y: tile === 'wall' && top !== null ? top : water ? Math.max(ground, 0) : ground, water };
  });
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const p of pos) (minX = Math.min(minX, p.x)), (minZ = Math.min(minZ, p.z)), (maxX = Math.max(maxX, p.x)), (maxZ = Math.max(maxZ, p.z));
  const centre = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  let introFramed=false,lastOrderFrame='',framing=null;
  const viewportReframe=createBattleReframeGate();
  function frameScene(indices, seconds=.6, entering=false) {
    const points=indices.map(i=>pos[i]).filter(Boolean);if(!points.length)return;
    const r=realm.canvasRect(),host=realm.uiHost,mapper=host.mapper(),safe=host.metrics().safe;
    const lo=mapper.toScene(safe.x,safe.y),hi=mapper.toScene(safe.x+safe.width,safe.y+safe.height);
    const field={width:r.width,height:r.height,left:Math.max(20,lo.x+12),right:Math.min(r.width-20,hi.x-12),top:Math.max(20,lo.y+12),bottom:Math.min(r.height-25,hi.y-12)};
    for(const rect of host.mapOcclusionRects()){
      const a=mapper.toScene(rect.x,rect.y),b=mapper.toScene(rect.x+rect.width,rect.y+rect.height),w=b.x-a.x;
      if(w>r.width*.55&&a.y<r.height*.2)field.top=Math.max(field.top,b.y+12);
      else if(w<r.width*.4&&a.x<r.width*.2)field.left=Math.max(field.left,b.x+12);
      else if(w<r.width*.45&&b.x>r.width*.8)field.right=Math.min(field.right,a.x-12);
      else if(a.y>r.height*.35)field.bottom=Math.min(field.bottom,a.y-12);
    }
    const target=battleCameraFrame(points,field);framing={...target,field,indices:indices.slice()};
    follow=null;
    // Enter close to the destination; flying from the title's distant capital
    // leaves a nominally ready deployment looking at empty ground for a second.
    if(entering)rig.jumpTo(target.x,target.z+4,target.distance*1.04);
    rig.glideTo(target.x,target.z,target.distance,isCalm()?0:seconds);
  }
  land.setField([minX - HEX_W / 2, minZ - HEX_W / 2, maxX + HEX_W / 2, maxZ + HEX_W / 2]);
  // Look between the two sides where they will meet: the gate, or the middle of the defenders, and the attackers' line.
  const meanOf = (side) => {
    const list = b.units.filter((u) => u.side === side && u.pos >= 0).map((u) => pos[u.pos]);
    if (!list.length) return centre;
    return { x: list.reduce((a, p) => a + p.x, 0) / list.length, z: list.reduce((a, p) => a + p.z, 0) / list.length };
  };
  const front = b.gate ? pos[b.gate.at] : meanOf(1),
    them = meanOf(0);
  const openingDistance = Math.max(siegeSample?44:48, Math.min(siegeSample?60:72, Math.hypot(front.x-them.x,front.z-them.z)*1.35));
  rig.glideTo((front.x+them.x)/2, (front.z+them.z)/2+2, openingDistance, 1.2);
  const cols = colours.map((c) => linearColor3D(c));

  // ——— Selection ring and the gate ———
  const ringMaterial = createStandardMaterial3D({ color: 0xf3cf6a, emissive: 0xf3cf6a, emissiveIntensity: 1.5, roughness: 1, metallic: 0 });
  ringMaterial.depthWrite = false;
  const ring = new Mesh3D(createRingGeometry3D({ innerRadius: 1.15, outerRadius: 1.32, thetaSegments: 48 }), ringMaterial);
  ring.setRotation(-Math.PI / 2, 0, 0);
  ring.visible = false;
  ring.pickable = false;
  scene.addChild(ring);
  const own = [ring];
  const flat = [0, 0, 0, 1];
  quatFromEuler(flat, -Math.PI / 2, 0, 0);
  const cellGeometry = createRingGeometry3D({ innerRadius: 1.53, outerRadius: 1.64, thetaSegments: 6, thetaStart: Math.PI / 6 });
  const makeCells = (colour, opacity, through = false) => {
    const material = createStandardMaterial3D({ color: colour, emissive: colour, emissiveIntensity: .9, opacity, roughness: 1, depthWrite: false, depthTest: !through, side: 'double' });
    const mesh = new InstancedMesh3D(cellGeometry, material, n);
    mesh.count = 0; mesh.pickable = false; mesh.frustumCulled = false;scene.addChild(mesh);own.push(mesh);return mesh;
  };
  const rangeCells = makeCells(0x84aeb2, .55), targetCells = makeCells(0xe8bb61, .9), dangerCells = makeCells(0xcb6650, .8, true);
  rangeCells.name='battle-range';targetCells.name='battle-order';dangerCells.name='battle-area-preview';
  const lineGeometry=createBoxGeometry3D({width:.075,height:.045,depth:1});
  const makeOrderLines=colour=>{
    const mesh=new InstancedMesh3D(lineGeometry,createStandardMaterial3D({color:colour,emissive:colour,emissiveIntensity:.8,roughness:1,depthTest:false,depthWrite:false}),n);
    mesh.count=0;mesh.pickable=false;mesh.frustumCulled=false;scene.addChild(mesh);own.push(mesh);return mesh;
  };
  const routeLines=makeOrderLines(0x9bd5cf),attackLine=makeOrderLines(0xe38462);
  const flankOwn = makeOrderLines(0xebc972), flankFoe = makeOrderLines(0xe68065);
  const flankCues = [null, null];
  const previewLines=makeOrderLines(0xe8cb85),previewCells=makeCells(0xe8cb85,.95,true);
  previewLines.name='battle-pending-route';previewCells.name='battle-pending-order';
  routeLines.name='battle-route-lines';attackLine.name='battle-target-line';
  const lineMatrix=new Float32Array(16),lineRotation=[0,0,0,1];
  function orderSegment(mesh,index,from,to){
    const a=pos[from],c=pos[to];if(!a||!c||index>=n)return index;
    const length=Math.hypot(c.x-a.x,c.z-a.z);if(length<.001)return index;
    quatFromEuler(lineRotation,0,Math.atan2(c.x-a.x,c.z-a.z),0);
    mat4Compose(lineMatrix,[(a.x+c.x)/2,Math.max(a.y,c.y)+.25,(a.z+c.z)/2],lineRotation,[1,1,length]);mesh.setMatrixAt(index,lineMatrix);return index+1;
  }
  let viewPhase = 'deploy', armedTactic = null, previewKey = '', pendingOrder = null;
  const previewMatrix = new Float32Array(16);
  function putCells(mesh, cells) {
    let count = 0;
    for (const i of cells) {
      const p = pos[i];if (!p || count >= n) continue;
      mat4Compose(previewMatrix, [p.x, p.y + .14, p.z], flat, [1, 1, 1]);mesh.setMatrixAt(count++, previewMatrix);
    }
    mesh.count = count;
  }

  let commandPaths;
  function drawCommandPlan(orders) {
    if (orders.some(order => order.valid) && !commandPaths) {
      const create = colour => ({ lines: makeOrderLines(colour), cells: makeCells(colour, .78, true) });
      commandPaths = { move: create(0x88d4d6), attack: create(0xe8a27a) };
      commandPaths.move.lines.name = 'battle-plan-moves';
      commandPaths.attack.lines.name = 'battle-plan-attacks';
    }
    if (!commandPaths) return;
    for (const [kind, { lines, cells }] of Object.entries(commandPaths)) {
      let count = 0;
      const destinations = new Set();
      for (const order of orders) {
        if (!order.valid || order.kind !== kind) continue;
        let from = b.units[order.unit]?.pos;
        if (from === undefined || from < 0) continue;
        for (const at of order.path) {
          count = orderSegment(lines, count, from, at);
          from = at;
        }
        if (kind === 'attack') count = orderSegment(lines, count, from, order.hex);
        destinations.add(order.hex);
      }
      lines.count = count;
      putCells(cells, destinations);
    }
  }
  // Match the simulation's target footprint, including its three-hex line order.
  function tacticCells(u, tc, centre) {
    if (tc.shape === 'ring1' || tc.shape === 'ring2') return hexRing(centre, tc.shape === 'ring1' ? 1 : 2);
    if (tc.shape === 'line') {
      const cells = [centre];let at = centre;
      for (let k = 0; k < 2; k++) { const next = neighbours(at).slice().sort((x, y) => distance(y, u.pos) - distance(x, u.pos))[0];if (next === undefined) break;cells.push(next);at = next; }
      return cells;
    }
    if (tc.shape === 'one') return [centre];
    return b.units.filter(o => !o.gone && o.pos >= 0 && o.side !== u.side).map(o => o.pos);
  }
  function refreshPreview() {
    const u = selected !== null ? b.units[selected] : null;
    const key = [viewPhase, selected, u?.pos,u?.order,u?.goal,u?.path?.join(','),u?.target?.id,u?.intent,u?.intentAnchor, armedTactic?.tactic,armedTactic?.target, pendingOrder?.unit,pendingOrder?.kind,pendingOrder?.hex,pendingOrder?.target,pendingOrder?.valid,pendingOrder?.path?.join(','), hoverHex, goalHex, b.units.map(o => o.gone ? -1 : o.pos).join(',')].join('|');
    if (key === previewKey) return;previewKey = key;
    rangeCells.count = targetCells.count = dangerCells.count = 0;
    routeLines.count=attackLine.count=0;
    previewLines.count=previewCells.count=0;
    targetable.clear();
    if (!u || u.gone || u.pos < 0 || u.side !== side||viewPhase==='result') return;
    if (viewPhase === 'deploy') {
      putCells(rangeCells, pos.flatMap((_, i) => canDeploy?.(u, i) ? [i] : []));
      return;
    }
    const tc = armedTactic ? TACTICS[armedTactic.tactic] : null;
    const reach = tc ? tacticPreview(b,u,tc.id).reach : UNITS[u.kind].range;
    putCells(rangeCells, !tc && u.intent === 'guard' && Number.isInteger(u.intentAnchor)
      ? hexRing(u.intentAnchor, 2) : hexRing(u.pos, reach));
    if (pendingOrder && !tc) {
      const ordered=b.units[pendingOrder.unit];
      if(ordered&&!ordered.gone){
        const colour=pendingOrder.valid?0xf0d391:0xcf765b;
        previewLines.material.setColor(colour);previewLines.material.setEmissive(colour);previewCells.material.setColor(colour);previewCells.material.setEmissive(colour);
        let previous=ordered.pos,count=0;
        for(const at of pendingOrder.path??[]){count=orderSegment(previewLines,count,previous,at);previous=at;}
        previewLines.count=count;
        const destination=pendingOrder.gate?pendingOrder.hex:pendingOrder.kind==='attack'?b.units[pendingOrder.target]?.pos:pendingOrder.hex;
        if(Number.isInteger(destination)&&destination>=0)putCells(previewCells,[destination]);
      }
      return;
    }
    if (!tc) {
      let previous=u.pos,count=0;for(const at of u.path??[]){count=orderSegment(routeLines,count,previous,at);previous=at;}routeLines.count=count;
      const foe=u.order==='attack'&&u.target&&!u.target.gone?u.target:null;
      if(foe)attackLine.count=orderSegment(attackLine,0,u.pos,foe.pos);
      const goal=foe?.pos??u.goal;if(goal!==null)putCells(targetCells,[goal]);return;
    }
    const target=armedTactic.target!=null?b.units[armedTactic.target]:b.units.find(o=>!o.gone&&o.pos===hoverHex&&o.side!==u.side);
    for(const o of b.units)if(o.side!==u.side&&tacticPreview(b,u,tc.id,o).valid)targetable.add(o.id);
    const preview=tacticPreview(b,u,tc.id,target);if(preview.valid)putCells(dangerCells,preview.hexes);
  }
  let gateMesh = null, gateYaw = 0, gateImpact = 0, gateFall = 0;
  const gateLeaves=[];
  if (b.gate) {
    const g = pos[b.gate.at];
    gateYaw = place ? Math.atan2(g.x - place.x, g.z - place.z) : 0;
    if(siegeSample){
      gateMesh=new Object3D('group');gateMesh.name='battle-siege-gate';
      const doorMaterial=createStandardMaterial3D({color:0x60402a,roughness:.85,metallic:.05});
      const bandMaterial=createStandardMaterial3D({color:0x7d7964,roughness:.5,metallic:.6});
      for(const side of[-1,1]){
        const hinge=new Object3D('group');hinge.setPosition(side*.85,0,0);
        const leaf=new Mesh3D(createBoxGeometry3D({width:.85,height:2.05,depth:.18}),doorMaterial);
        leaf.setPosition(-side*.425,1.025,0);leaf.castShadow=true;hinge.addChild(leaf);
        for(const y of[.35,1.1,1.8]){const band=new Mesh3D(createBoxGeometry3D({width:.85,height:.075,depth:.24}),bandMaterial);band.setPosition(-side*.425,y,0);hinge.addChild(band);}
        gateMesh.addChild(hinge);gateLeaves.push(hinge);
      }
      gateMesh.setPosition(g.x,place?.level??g.y,g.z);
    }else{
      gateMesh = new Mesh3D(createBoxGeometry3D({ width: 0.95, height: 0.95, depth: 0.25 }), createStandardMaterial3D({ color: 0x5a3a22, roughness: 0.8, metallic: 0.1 }));
      gateMesh.setPosition(g.x, (place?.level ?? g.y) + 0.47, g.z);
    }
    gateMesh.setRotation(0, gateYaw, 0);
    gateMesh.castShadow = true;
    scene.addChild(gateMesh);
    own.push(gateMesh);
  }
  const keepRing=(siegeSample||b.ferry)&&b.keep!==null?new Mesh3D(createRingGeometry3D({innerRadius:1.25,outerRadius:1.4,thetaSegments:48}),createStandardMaterial3D({color:0xd4b16f,emissive:0xd4b16f,emissiveIntensity:.8,roughness:1,opacity:.65,depthWrite:false,side:'double'})):null;
  if(keepRing){const p=pos[b.keep];keepRing.name=b.ferry?'battle-crossing-objective':'battle-keep-objective';keepRing.setPosition(p.x,p.y+.12,p.z);keepRing.setRotation(-Math.PI/2,0,0);keepRing.pickable=false;scene.addChild(keepRing);own.push(keepRing);}

  // ——— Fire and dust ———
  const dot = softDot();
  const fires = new Map();
  const fireOptions = { capacity: 160, rate: 34, lifetime: [0.5, 1.1], speed: [0.4, 1.1], direction: [0, 1, 0], spread: 0.5, gravity: [0, 1.2, 0], drag: 0.6, startSize: 0.55, endSize: 0.15, startColor: [1, 0.62, 0.18], endColor: [0.55, 0.12, 0.04], startOpacity: 0.95, endOpacity: 0, shape: 'sphere', radius: 0.7, map: dot, blending: 'additive' };
  const smokeOptions = { capacity: 90, rate: 10, lifetime: [1.4, 2.6], speed: [0.4, 0.9], direction: [0, 1, 0], spread: 0.35, gravity: [0.3, 0.5, 0], drag: 0.3, startSize: 0.6, endSize: 2.2, startColor: [0.25, 0.22, 0.2], endColor: [0.45, 0.43, 0.42], startOpacity: 0.55, endOpacity: 0, shape: 'sphere', radius: 0.6, map: dot };
  function fireAt(i) {
    const p = pos[i];
    const flame = createParticleEmitter3D(fireOptions),
      smoke = createParticleEmitter3D(smokeOptions);
    for (const e of [flame, smoke]) {
      e.setPosition(p.x, p.y + 0.3, p.z);
      e.pickable = false;
      scene.addChild(e);
    }
    flame.name='battle-fire';smoke.name='battle-smoke';
    fires.set(i, { flame, smoke });
  }
  const bursts = [];
  function burst(i, colour, count = 28) {
    const p = pos[i];
    if (!p) return;
    let item = bursts.find(o => o.life <= 0);
    if (!item) {
      if (bursts.length >= (isCalm() ? 6 : 12)) return;
      const e = createParticleEmitter3D({ capacity: 64, rate: 0, lifetime: [.18, .55], speed: [1.1, 3.6], direction: [0, 1, 0], spread: 1.1, gravity: [0, -5, 0], drag: 1.2, startSize: .17, endSize: .025, startOpacity: .95, endOpacity: 0, shape: 'sphere', radius: .4, map: dot, blending: 'additive' });
      e.name='battle-sparks';
      e.pickable = false;scene.addChild(e);item = {e, life: 0};bursts.push(item);
    }
    const e = item.e;e.reset();e.visible = true;e.startColor.set(colour);e.endColor.set(colour);
    e.setPosition(p.x, p.y + 0.5, p.z);
    e.burst(Math.min(64, isCalm() ? Math.ceil(count * .45) : count));item.life = .75;
  }
  const pulseGeometry = {
    arc: createRingGeometry3D({ innerRadius: .68, outerRadius: 1, thetaSegments: 28, thetaLength: Math.PI * 1.15 }),
    wave: createRingGeometry3D({ innerRadius: .91, outerRadius: 1, thetaSegments: 48 }),
    ward: createRingGeometry3D({ innerRadius: .86, outerRadius: 1, thetaSegments: 6, thetaStart: Math.PI / 6 })
  };
  const pulses = [];
  function pulse(i, colour = 0xe8c37c, kind = 'wave', strength = 1, heading = 0) {
    const p = pos[i];if (!p) return;
    let item = pulses.find(o => o.life <= 0 && o.kind === kind);
    if(!item){item=pulses.find(o=>o.life<=0);if(item){item.kind=kind;item.mesh.geometry=pulseGeometry[kind];item.mesh.name='battle-impact-'+kind;}}
    if (!item) {
      if (pulses.length >= 18) return;
      const material = createStandardMaterial3D({color: colour, emissive: colour, emissiveIntensity: 1.15, opacity: .8, depthWrite: false, side:'double', roughness:1});
      const mesh = new Mesh3D(pulseGeometry[kind], material);mesh.pickable = false;scene.addChild(mesh);item = {mesh, material, kind, life:0};pulses.push(item);
      mesh.name='battle-impact-'+kind;
    }
    item.material.setColor(colour);item.material.setEmissive(colour);item.life = item.duration = isCalm() ? .28 : kind === 'ward' ? .8 : .48;item.p = p;item.strength = strength;item.heading = heading;item.mesh.visible = true;
  }

  // ——— Arrows ———
  const arrowCap = 600;
  const arrows = new InstancedMesh3D(createBoxGeometry3D({ width: 0.025, height: 0.025, depth: 0.42 }), createStandardMaterial3D({ color: 0x3a2a1c, roughness: 0.8, metallic: 0 }), arrowCap);
  arrows.count = 0;
  arrows.name='battle-arrows';
  arrows.frustumCulled = false;
  arrows.pickable = false;
  scene.addChild(arrows);
  own.push(arrows);
  const flights = [];
  const volleyAt = new Map();
  const shots = b.units.some(unit => unit.kind === 'catapult')
    ? createSiegeShots(scene, catapultStone(false).plain, target => {
        burst(target.at, [.68, .56, .4], 18);
        pulse(target.at, 0xcab48e, 'wave', 1.5);
        on.siegeImpact?.();
      })
    : null;

  // ——— Units as drawn ———
  const shown = b.units.map((u) => {
    const p = pos[u.pos] ?? centre;
    return { x: p.x, z: p.z, y: p.y ?? 0, heading: 0, troops: u.troops, loss: 0, lossAt: 0, lunge: 0, attackStamp:null, attackPose:0, siegePose:0, hit:0, hitWait:0, colour:new Float32Array(3), slots:[], slotsKey:'',
      cell: u.pos, climbPose: 0, deck: 0, throwAge: CATAPULT_RESET_TIME, stoneTarget: null };
  });
  const targetable=new Set();
  const nativeMarkers=createNativeBattleMarkers(realm.uiHost,{camera,canvasRect:realm.canvasRect,units:b.units,shown,colours,side,
    onTap:i=>on.tapUnit(i),onHover:i=>{hoverHex=b.units[i].pos;},onFocus:on.focusUnit,visible:showMarkers});
  function floatText(x,y,z,text,kind){nativeMarkers.spawn(x,y,z,text,kind);}

  function showTactic(u, tacticId, targetId) {
    const tc = TACTICS[tacticId];
    const s = shown[u.id];
    nativeMarkers.spawn(s.x,s.y+2.2,s.z,nm(tc),'brush',{ours:u.side===side,signature:Boolean(tc.general)});
    const helping = ['atk','def','spd','heal','rally','rage'].includes(tc.kind);
    const colour = tc.kind === 'burn' ? 0xe58237 : tc.kind === 'heal' || tc.kind === 'rally' ? 0x88c8ad : tc.kind === 'confuse' || tc.kind === 'fear' ? 0xb6a0cf : 0xe6c078;
    const affected = helping ? b.units.filter(o => !o.gone && o.pos >= 0 && o.side === u.side && (tc.shape==='all'||tc.shape==='self'&&o===u||tc.shape==='allies'&&distance(u.pos,o.pos)<=3)).map(o=>o.pos) : tacticCells(u, tc, b.units[targetId]?.pos ?? u.pos);
    pulse(u.pos, colour, 'ward', 1.5);
    for(const at of affected.slice(0,12)) {pulse(at, colour, helping ? 'ward' : tc.kind==='dmg' ? 'arc' : 'wave', tc.general ? 2.1 : 1.4, s.heading);if(!helping)burst(at,tc.kind==='burn'?[1,.52,.12]:[.95,.8,.5],18);}
  }

  // ——— Picking ———
  const nearestHex = (g) => {
    let best = -1,
      bd = HEX_W * 0.62;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(pos[i].x - g.x, pos[i].z - g.z);
      if (d < bd) (bd = d), (best = i);
    }
    return best;
  };
  let hoverHex = -1,
    selected = null,
    goalHex = -1,
    follow = null, followOffset={x:0,z:2};
  realm.setMode({
    hides: (a) => Boolean(a.inBattle),
    pick(g) {
      const i = nearestHex(g);
      if (i < 0) return null;
      const u = b.units.findIndex((o) => !o.gone && o.pos === i);
      return u >= 0 ? { unit: u, hex: i } : { hex: i };
    },
    hover(g) {
      hoverHex = g ? nearestHex(g) : -1;
    },
    hexes() {
      const sel = selected !== null ? b.units[selected] : null;
      const chosen = goalHex >= 0 ? pos[goalHex] : sel && sel.pos >= 0 ? pos[sel.pos] : null;
      return { hover: hoverHex >= 0 ? pos[hoverHex] : null, chosen, grid: siegeSample&&viewPhase==='fight'?0:1 };
    },
    /** The player moved the view by hand: stop following a unit. */
    release() {
      follow = null;
    },
    tap(hit) {
      if (!hit) return;
      if (hit.unit !== undefined) on.tapUnit(hit.unit);
      else on.tapHex(hit.hex);
    }
  });

  let time = 0;
  const m = new Float32Array(16),
    q = [0, 0, 0, 1];
  const stop = realm.onFrame((dt) => {
    time += dt;
    if(siegeSample&&!introFramed){introFramed=true;frameScene([...b.units.map(u=>u.pos),b.gate?.at].filter(Number.isInteger),.7,true);}
    const viewport=realm.canvasRect(),host=realm.uiHost;
    if(viewportReframe.observe(viewport.width,viewport.height,host.metrics().portrait,host.game.pointer.down||!showMarkers())){
      // Native HUD has already arranged this size. Refit the same battle
      // extents without advancing it, resurrecting a unit, or making a new
      // renderer. Do not alter the player's camera on unchanged viewports.
      const indices=battleReframeIndices(b,{selected,preview:pendingOrder,includeObjectives:siegeSample});
      if(indices.length){frameScene(indices,0);rig.snap();}
    }
    lightLease?.update(centre,land.heightAt(centre.x,centre.z));
    // Events since the last frame.
    for (; seenEvents < b.events.length; seenEvents++) {
      const ev = b.events[seenEvents];
      if (ev.kind === 'tactic') showTactic(b.units[ev.unit], ev.tactic, ev.target);
      if (ev.kind === 'flankContact' && pos[ev.at]) {
        const ours = ev.side === side;
        const lines = ours ? flankOwn : flankFoe;
        const at = pos[ev.at];
        flankCues[ours ? 0 : 1] = time + 1.4;
        lines.count = ev.approaches.reduce((count, from) => orderSegment(lines, count, from, ev.at), 0);
        pulse(ev.at, ours ? 0xebc972 : 0xe68065, 'wave', 1.5);
        floatText(at.x, at.y + 2, at.z, nm({ zh: '夹击', en: 'Pincer' }), 'hit');
      }
      if (ev.kind === 'rout') { const u=b.units[ev.unit];if(u?.pos>=0){floatText(shown[u.id].x,shown[u.id].y+2,shown[u.id].z,nm(UNITS[u.kind]),'rout');pulse(u.pos,0xa88e78,'wave',1.7);} }
      if (ev.kind === 'gateOpen' && gateMesh) {
        if(!siegeSample)gateMesh.setRotation(Math.PI / 2.2, gateYaw, 0);
        burst(b.gate.at, [0.8, 0.7, 0.5], 50);
        pulse(b.gate.at,0xe8c37c,'wave',3);
      }
      if(ev.kind==='structureHit'&&ev.structure==='gate'&&siegeSample){
        gateImpact=.3;const attacker=shown[ev.unit];if(attacker){attacker.siegePose=.42;attacker.attackPose=.42;}
        burst(ev.at,[.78,.62,.38],16);pulse(ev.at,0xd7bd88,'wave',1.2);
      }
      on.event?.(ev);
    }
    if (flankCues[0] !== null && time >= flankCues[0]) { flankOwn.count = 0; flankCues[0] = null; }
    if (flankCues[1] !== null && time >= flankCues[1]) { flankFoe.count = 0; flankCues[1] = null; }
    if(gateMesh&&siegeSample){
      gateImpact=Math.max(0,gateImpact-dt);
      if(b.gate.open)gateFall=Math.min(1,gateFall+dt/(isCalm() ? .2 : .7));
      for(const [index,leaf]of gateLeaves.entries())leaf.setRotation(-gateFall*Math.PI*.46,index?gateImpact*.12:-gateImpact*.12,0);
    }
    if (keepRing) {
      const attacking = b.keepHeld > 0;
      const progress = attacking ? b.keepHeld / 10 : b.ferry ? b.ferry.secured / FERRY_HOLD_SECONDS : 0;
      keepRing.material.opacity = .5 + Math.min(1, progress) * .4;
      keepRing.material.setColor(attacking ? 0x9bd5cf : progress > 0 ? 0x8bb8d4 : 0xd4b16f);
      const p = pos[b.keep];
      troops.add('standard', p.x, p.y, p.z, 0, cols[attacking ? 0 : 1], 0, 1.2);
    }
    // Fires.
    for (const [i, f] of fires) {
      if (!b.fire[i]) {
        f.flame.emitting = false;
        f.smoke.emitting = false;
        if (f.flame.aliveCount === 0) {
          scene.removeChild(f.flame);
          scene.removeChild(f.smoke);
          fires.delete(i);
          continue;
        }
      }
      f.flame.update(dt);
      f.smoke.update(dt);
    }
    for (const i of Object.keys(b.fire)) if (b.fire[i] && !fires.has(+i) && fires.size < (isCalm()?10:20)) fireAt(+i);
    for (const item of bursts) if(item.life>0){item.life-=dt;item.e.update(dt);if(item.life<=0)item.e.visible=false;}
    for(const item of pulses) if(item.life>0){item.life-=dt;const a=1-Math.max(0,item.life)/item.duration,scale=item.strength*(.45+a*.9);item.mesh.setScale(scale);item.mesh.setPosition(item.p.x,item.p.y+.2+(item.kind==='ward'?a*.6:0),item.p.z);item.mesh.setRotation(item.kind==='arc'?-Math.PI*.3:-Math.PI/2,item.kind==='arc'?item.heading:0,item.kind==='arc'?-a*.5:0);item.material.opacity=(1-a)*.75;item.mesh.visible=item.life>0;}
    shots?.update(dt);
    // Units.
    b.units.forEach((u, i) => {
      const s = shown[i];
      if (u.gone || u.pos < 0) return;
      const p = pos[u.pos];
      s.throwAge = Math.min(CATAPULT_RESET_TIME, s.throwAge + dt);
      s.climbPose = Math.max(0, s.climbPose - dt);
      if (s.cell !== u.pos) {
        if (viewPhase === 'fight' && u.side === 0 && u.onWall && u.climbing === u.pos && UNITS[u.kind].group === 'inf') {
          s.climbPose = .55;
          pulse(u.pos, 0xcbb17d, 'wave', 1.05);
          floatText(p.x, p.y + 1.25, p.z, nm({ zh: '登墙', en: 'Wall scaled' }), 'hit');
        }
        s.cell = u.pos;
      }
      const wall = u.kind === 'tower' && !u.routed && Number.isInteger(u.climbing) &&
        b.tiles[u.climbing] === 'wall' && distance(u.pos, u.climbing) <= 1 ? pos[u.climbing] : null;
      if (u.kind === 'tower') {
        s.deck = isCalm() ? Number(Boolean(wall)) : Math.max(0, Math.min(1, s.deck + (wall ? dt : -dt) / .28));
      }
      const k = 1 - Math.exp(-dt * 5);
      const dx = p.x - s.x,
        dz = p.z - s.z;
      s.x += dx * k;
      s.z += dz * k;
      s.y += (p.y - s.y) * k;
      // The simulation holds a unit object, while some callers may still use an id.
      let foe = typeof u.target === 'number' ? b.units[u.target] : u.target;
      const attack=freshAttack(u,s.attackStamp),attackTick=Boolean(attack);
      if (attack) {
        s.attackStamp = attack.stamp;
        s.attackPose = .38;
        foe = b.units[attack.target];
        if (u.kind === 'catapult' && foe?.pos >= 0) {
          s.throwAge = 0;
          s.stoneTarget = foe.pos;
        }
        on.attack?.({ unit: attack.unit, target: attack.target, kind: attack.kind, t: attack.t });
      }
      s.attackPose=Math.max(0,s.attackPose-dt);s.siegePose=Math.max(0,s.siegePose-dt);
      let face = s.heading;
      if (wall) face = Math.atan2(wall.x - s.x, wall.z - s.z);
      else if (Math.hypot(dx, dz) > 0.2) face = Math.atan2(dx, dz);
      else if (foe && foe.pos >= 0) face = Math.atan2(pos[foe.pos].x - s.x, pos[foe.pos].z - s.z);
      if (u.routed) face += Math.PI;
      let dh = face - s.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      s.heading += dh * Math.min(1, dt * 6);
      // Losses show as rising numbers, gathered over a moment.
      if (u.troops < s.troops - 0.5) {
        s.loss += s.troops - u.troops;
        s.hit = .22;
        if(s.hitWait<=0){pulse(u.pos,0xe7c494,'arc',.8,s.heading+Math.PI/2);burst(u.pos,[.95,.83,.6],8);s.hitWait=.35;}
        s.troops = u.troops;
      } else s.troops = u.troops;
      s.lossAt += dt;
      s.hit=Math.max(0,s.hit-dt);s.hitWait=Math.max(0,s.hitWait-dt);
      if (s.loss >= 1 && s.lossAt > 0.35) {
        floatText(s.x + (Math.random() - 0.5) * 0.8, s.y + 1.4, s.z, '-' + Math.round(s.loss), u.side === side ? 'hurt' : 'hit');
        s.loss = 0;
        s.lossAt = 0;
      }
      // In melee: a lunge toward the foe and back.
      const melee = foe && foe.pos >= 0 && !foe.gone && distance(u.pos, foe.pos) <= 1;
      if(attackTick&&melee)s.lunge=.45;else s.lunge*=Math.exp(-dt*10);
      drawUnit(u, s, i);
      // Volleys from bows at their target.
      if (attackTick && foe && u.kind !== 'catapult' && UNITS[u.kind].range > 1 && foe.pos >= 0 && distance(u.pos, foe.pos) <= UNITS[u.kind].range && !u.routed) {
        const last = volleyAt.get(i) ?? -9;
        if (time - last > .15 && flights.length < arrowCap - 7) {
          volleyAt.set(i, time);
          const f = pos[foe.pos];
          for (let a = 0; a < (isCalm()?3:7); a++) flights.push({ fx: s.x + (Math.random() - 0.5), fy: s.y + 0.65, fz: s.z + (Math.random() - 0.5), tx: f.x + (Math.random() - 0.5) * 1.4, ty: f.y + 0.2, tz: f.z + (Math.random() - 0.5) * 1.4, t: -a * 0.022, dur: 0.42 });
        }
      }
    });
    // Arrows in flight.
    let na = 0;
    for (let k = flights.length - 1; k >= 0; k--) {
      const f = flights[k];
      f.t += dt;
      if (f.t >= f.dur) {
        flights.splice(k, 1);
        continue;
      }
      if (f.t < 0 || na >= arrowCap) continue;
      const t = f.t / f.dur;
      const x = f.fx + (f.tx - f.fx) * t,
        z = f.fz + (f.tz - f.fz) * t,
        y = f.fy + (f.ty - f.fy) * t + Math.sin(t * Math.PI) * 2.4;
      const vy = (f.ty - f.fy) + Math.cos(t * Math.PI) * Math.PI * 2.4;
      const horiz = Math.hypot(f.tx - f.fx, f.tz - f.fz);
      quatFromEuler(q, -Math.atan2(vy, horiz), Math.atan2(f.tx - f.fx, f.tz - f.fz), 0);
      mat4Compose(m, [x, y, z], q, [1, 1, 1]);
      arrows.setMatrixAt(na++, m);
    }
    arrows.count = na;
    // The view keeps a unit it was asked to look at in the middle, until the player moves it.
    if (follow !== null) {
      const fu = b.units[follow];
      if (fu.gone || fu.pos < 0) follow = null;
      else {
        rig.view.tx = shown[follow].x+followOffset.x;
        rig.view.tz = shown[follow].z+followOffset.z;
      }
    }
    // The ring under the chosen unit.
    const su = selected !== null ? b.units[selected] : null;
    refreshPreview();
    ring.visible = Boolean(su && !su.gone && su.pos >= 0);
    if (ring.visible) {
      const s = shown[selected];
      ring.setPosition(s.x, s.y + 0.08, s.z);
      ringMaterial.emissiveIntensity = isCalm()?1.1:1.15+Math.sin(time*3)*.18;
    }
    nativeMarkers.frame(dt,{selected,targetable});
  });
  let seenEvents = b.events.length;

  function drawUnit(u, s, i) {
    const kind = figureOf(u.kind);
    const baseColour = cols[u.side];
    const flash = isCalm()?0:Math.min(.35,s.hit*1.6);
    for(let c=0;c<3;c++)s.colour[c]=baseColour[c]*(1-flash)+flash;
    const colour = s.colour;
    const S = siegeSample&&kind==='ram'?2.05:1.75;
    const engine = isSiegeFigure(kind);
    const cap=kind==='boat'?2:engine?1:kind==='horse'||kind==='horsebow'?(siegeSample?10:6):siegeSample?16:9;
    const count = Math.max(1, Math.min(cap, Math.ceil(u.troops / (kind === 'boat' ? 2500 : siegeSample&&!engine?350:700))));
    const per = kind === 'boat' ? 2 : 3;
    const gap = (kind === 'horse' || kind === 'horsebow' ? 0.5 : kind === 'boat' ? 0.75 : 0.4) * S;
    const sin = Math.sin(s.heading),
      cos = Math.cos(s.heading);
    const lungeX = sin * s.lunge,
      lungeZ = cos * s.lunge;
    if(tacticalFormation&&!engine&&s.slotsKey!==u.formation+':'+count){s.slots=formationSlots(u.formation,count);s.slotsKey=u.formation+':'+count;}
    for (let k = 0; k < count; k++) {
      const c = (k % per) - (per - 1) / 2,
        row = Math.floor(k / per);
      let lx = engine ? 0 : tacticalFormation?s.slots[k][0]:c * gap + (row % 2) * gap * 0.3,
        lz = engine ? 0 : tacticalFormation?s.slots[k][1]:(0.5 - row) * gap * 1.1;
      if (u.routed) {
        lx += Math.sin(i * 7 + k * 3.1) * 0.6;
        lz += Math.cos(i * 5 + k * 2.3) * 0.6;
      }
      const x = s.x + lx * cos + lz * sin + lungeX * (k % 2 ? 1 : 0.6),
        z = s.z - lx * sin + lz * cos + lungeZ * (k % 2 ? 1 : 0.6);
      const ground = b.tiles[u.pos] === 'wall' || u.onWall ? s.y : Math.max(0, land.heightAt(x, z));
      const bob = engine ? 0 : Math.abs(Math.sin(time * (u.routed ? 11 : 7) + k * 1.7 + i)) * (u.path?.length || u.routed ? 0.05 : 0.012);
      if(siegeSample&&kind==='ram'){
        troops.add('ram-frame',x,ground,z,s.heading,colour,0,S);
        const stroke=isCalm()?0:Math.sin(Math.min(1,s.siegePose/.42)*Math.PI/2)*.36;
        troops.add('ram-beam',x+sin*stroke,ground,z+cos*stroke,s.heading,colour,0,S);
        for (const direction of [-1, 1]) for (const rank of [-1, 1]) {
          const cx = direction * S * .46, cz = rank * S * .32;
          const crewX = x + cx * cos + cz * sin, crewZ = z - cx * sin + cz * cos;
          troops.add('sword', crewX, Math.max(0, land.heightAt(crewX, crewZ)), crewZ, s.heading, colour, -stroke * .15, 1.35);
        }
      } else if (kind === 'catapult') {
        const quiet = isCalm();
        const pitch = quiet ? 0 : catapultPitch(s.throwAge);
        const pivot = siegeMount(x, ground, z, s.heading, S, CATAPULT_ARM_PIVOT);
        troops.add('catapult-base', x, ground, z, s.heading, colour, 0, S);
        troops.add('catapult-arm', ...pivot, s.heading, colour, pitch, S, true);
        if (s.throwAge < CATAPULT_RELEASE_TIME || s.throwAge >= CATAPULT_RESET_TIME || quiet) {
          const loaded = siegeMount(x, ground, z, s.heading, S, CATAPULT_ARM_PIVOT, CATAPULT_LOAD_POINT, pitch);
          troops.add('catapult-load', ...loaded, s.heading, colour, pitch, S, true);
        }
        if (s.stoneTarget !== null) {
          const release = siegeMount(x, ground, z, s.heading, S, CATAPULT_ARM_PIVOT, CATAPULT_LOAD_POINT, CATAPULT_RELEASE_PITCH);
          shots?.launch(release, { ...pos[s.stoneTarget], at: s.stoneTarget }, CATAPULT_RELEASE_TIME, quiet);
          s.stoneTarget = null;
        }
      } else if (kind === 'tower') {
        troops.add(kind, x, ground, z, s.heading, colour, 0, S);
        const pivot = siegeMount(x, ground, z, s.heading, S, TOWER_DECK_PIVOT);
        const angle = TOWER_DECK_PITCH.idle + (TOWER_DECK_PITCH.deployed - TOWER_DECK_PITCH.idle) * s.deck;
        troops.add('tower-board', ...pivot, s.heading, colour, angle, S, true);
      } else {
        const braced=tacticalFormation&&kind==='spear'&&!u.routed&&(u.order==='hold'||s.attackPose>0);
        const posed=braced?'spear-braced':tacticalFormation&&kind==='bow'&&s.attackPose>0?'bow-loose':kind;
        const climb = isCalm() ? 0 : Math.sin(Math.PI * s.climbPose / .55);
        troops.add(posed, x, (kind === 'boat' ? Math.max(ground, s.y) : ground) + (isCalm()?0:bob) + climb * .16,
          z, s.heading + (u.routed ? Math.sin(k) * 0.6 : 0), colour, -s.lunge * .3 + (isCalm() ? 0 : s.hit * .6) - climb * .22, S);
      }
    }
    if (u.general) troops.add('standard', s.x - cos * 0.2 - sin * 0.9, s.y, s.z + sin * 0.2 - cos * 0.9, s.heading, colour, 0, S * 0.9);
  }

  return {
    markers:nativeMarkers,
    preview(phase, armed) { viewPhase=phase;armedTactic=armed; },
    commandPlan: drawCommandPlan,
    orderPreview(preview) {
      pendingOrder=preview?{...preview,path:preview.path?.slice()??[]}:null;previewKey='';
      if(siegeSample&&preview){
        const key=[preview.unit,preview.kind,preview.hex,preview.target,preview.path?.join(',')].join(':');
        if(key!==lastOrderFrame){lastOrderFrame=key;const unit=b.units[preview.unit],destination=preview.gate?preview.hex:preview.kind==='attack'?b.units[preview.target]?.pos:preview.hex;frameScene([unit?.pos,...(preview.path??[]),destination].filter(Number.isInteger));}
      }else lastOrderFrame='';
    },
    get framing(){return framing?{...framing,field:{...framing.field},indices:framing.indices.slice()}:null;},
    select(i) {
      selected = i;
      goalHex = -1;
    },
    goal(hexIndex) {
      goalHex = hexIndex;
    },
    lookAtHex(i) {
      if (i < 0 || !pos[i]) return;
      const u=b.units.findIndex(o=>!o.gone&&o.pos===i),r=realm.canvasRect(),host=realm.uiHost;
      const d=Math.min(rig.view.td,45);
      follow=u>=0?u:null;
      followOffset={x:0,z:u>=0?2:0};
      if(r.height<=500||r.height>r.width){
        const mapper=host.mapper(),rectCss=box=>{
          const a=mapper.toScene(box.x,box.y),b=mapper.toScene(box.x+box.width,box.y+box.height);
          return {left:a.x,top:a.y,right:b.x,bottom:b.y};
        };
        const field={width:r.width,height:r.height,safe:rectCss(host.metrics().safe),obstacles:host.mapOcclusionRects().map(rectCss)};
        const anchor=chooseBattleLocateAnchor(field);
        if(anchor)followOffset=locateCameraOffset(field,d,anchor,u>=0?2.9:0);
      }
      const point=u>=0?shown[u]:pos[i];
      rig.glideTo(point.x+followOffset.x,point.z+followOffset.z,d,.6);
    },
    overview(){
      if(siegeSample){frameScene([...b.units.filter(u=>!u.gone).map(u=>u.pos),b.gate?.at,b.keep].filter(Number.isInteger));return;}
      follow=null;const rect=realm.canvasRect(),aspect=Math.max(.45,rect.width/Math.max(1,rect.height));
      const extent=Math.max((maxX-minX)/aspect,maxZ-minZ),d=Math.max(78,Math.min(170,extent*1.65));
      rig.glideTo(centre.x,centre.z,d,isCalm()?0:.6);
    },
    destroy() {
      stop();
      nativeMarkers.dispose();
      shots?.destroy();
      realm.setMode(null);
      land.setField(null);
      for (const mesh of own) scene.removeChild(mesh);
      for (const f of fires.values()) {
        scene.removeChild(f.flame);
        scene.removeChild(f.smoke);
      }
      for (const x of bursts) scene.removeChild(x.e);
      for (const p of pulses) scene.removeChild(p.mesh);
      lightLease?.dispose();sunset?.dispose();
    }
  };
}
