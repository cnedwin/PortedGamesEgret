import { FX_FRAMES } from './effects.mjs';
import { loadLandscape } from './landscape.mjs';
import { gearArt, gearArtFiles } from '../rpg-ui.mjs';
import { ITEMS } from '../sim/data.mjs';
import { loadProfessionArt } from './professions.mjs';
import { yieldArtPreparation } from './prepare.mjs';

const RESOLUTION = 2;
const ACTOR_FILES = ['hero','hero-elite','actors','foe-moves','hero-walk','hero-elite-walk','townsfolk'];

// Source coordinates are in the original illustration sheets. The pin is the
// ground contact, so swapping gear or moving to another pose keeps feet aligned.
const HERO_PINS = [[226,429],[681,436],[1115,426],[1589,424],[222,871],[638,868],[1087,872],[1591,851]];
const SWORDS = [
  [[61,377],[128,253]], [[485,349],[556,232]], [[1304,281],[1198,230]], [[1473,367],[1447,249]],
  [[378,782],[314,696]], [[771,791],[713,710]], [[1311,502],[1211,535]], [[1710,806],[1655,731]]
];
const WALK_ART = [
  {
    pins: [[228,428],[676,424],[1121,428],[1567,426],[223,874],[668,862],[1111,874],[1558,864]],
    blades: [
      [[108,370],[151,254]], [[559,375],[600,255]], [[1004,373],[1045,257]], [[1453,377],[1496,256]],
      [[366,808],[303,699]], [[797,809],[738,702]], [[1247,807],[1188,695]], [[1694,807],[1635,701]]
    ],
    opposite: {2:[1038,305,186,127],3:[1505,302,141,129],6:[1014,746,207,132],7:[1497,744,123,125]}
  },
  {
    pins: [[229,422],[675,418],[1118,421],[1563,419],[223,865],[670,858],[1109,864],[1559,856]],
    blades: [
      [[101,399],[156,252]], [[553,400],[602,251]], [[996,399],[1043,251]], [[1441,400],[1492,252]],
      [[370,819],[301,687]], [[808,819],[743,693]], [[1256,818],[1187,692]], [[1696,822],[1632,692]]
    ],
    opposite: {2:[1043,304,180,123],3:[1497,303,142,123],6:[1024,747,183,121],7:[1491,744,130,123]}
  }
];
const ENEMIES = ['raider', 'wolf', 'shaman', 'boss'];
const CAST = [
  { kind: 'elder', bounds: [76,8,342,481], pin: [254,477], height: 113 },
  { kind: 'smith', bounds: [617,9,311,475], pin: [759,472], height: 106 },
  { kind: 'raider', bounds: [1065,0,346,491], pin: [1270,466], height: 116 },
  { kind: 'wolf', bounds: [2,574,469,441], pin: [234,977], height: 87 },
  { kind: 'shaman', bounds: [526,483,445,541], pin: [764,1008], height: 120 },
  { kind: 'boss', bounds: [972,480,564,544], pin: [1271,1009], height: 162 }
];
const ACTION_PINS = [[220,426],[692,352],[1104,404],[1520,401],[210,856],[666,818],[1098,852],[1553,861]];

function loadImage(path) {
  const image = new Image();
  image.src = new URL('../../assets/' + path + '.webp', import.meta.url).href;
  return image.decode().then(() => image);
}

function sheetCell(index) {
  const x = Math.floor((index % 4) * 1774 / 4), y = Math.floor(Math.floor(index / 4) * 887 / 2);
  return [x, y, Math.floor((index % 4 + 1) * 1774 / 4) - x, Math.floor((Math.floor(index / 4) + 1) * 887 / 2) - y];
}

function cutout(g, image, sheetSize, bounds, pin, scale) {
  const [x, y, w, h] = bounds;
  const scaleX = image.naturalWidth / sheetSize[0], scaleY = image.naturalHeight / sheetSize[1];
  g.drawImage(image, x * scaleX, y * scaleY, w * scaleX, h * scaleY, (x - pin[0]) * scale, (y - pin[1]) * scale, w * scale, h * scale);
}

function paintHeldSword(g, sword, pin, scale, color) {
  const [[tipX,tipY],[guardX,guardY]] = sword;
  // Keep the sharp highlight on painted pixels in this frame, including when
  // the blade crosses a transparent gap during the lunge.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.beginPath();
  g.moveTo((tipX - pin[0]) * scale, (tipY - pin[1]) * scale);
  g.lineTo((guardX - pin[0]) * scale, (guardY - pin[1]) * scale);
  g.strokeStyle = color;
  g.lineWidth = 2.3;
  g.lineCap = 'round';
  g.stroke();
  g.restore();
}

function bladeAnchor(sword, pin, scale) {
  const [tip, guard] = sword.map(([x,y]) => [(x - pin[0]) * scale, (y - pin[1]) * scale]);
  const dx = tip[0] - guard[0], dy = tip[1] - guard[1];
  return {
    x: (tip[0] + guard[0]) / 2, y: (tip[1] + guard[1]) / 2,
    tipX: tip[0], tipY: tip[1],
    length: Math.hypot(dx,dy), rotation: Math.atan2(dy,dx) * 180 / Math.PI
  };
}

function paintWalk(g, sheet, index, art, bladeColor) {
  const pin = art.pins[index], scale = .285, sheetSize = [1774,887];
  cutout(g, sheet, sheetSize, sheetCell(index), pin, scale);
  const patch = art.opposite[index];
  if (patch) {
    // The two contacts use opposite leading legs. Mirror only the stance
    // inside its trouser/boot patch, leaving the torso and weapon anchored.
    const [sx,sy,w,h] = patch;
    const x = (sx - pin[0]) * scale, y = (sy - pin[1]) * scale;
    g.clearRect(x,y,w * scale,h * scale);
    g.save();
    g.translate(x * 2 + w * scale,0);
    g.scale(-1,1);
    cutout(g, sheet, sheetSize, patch, pin, scale);
    g.restore();
  }
  if (bladeColor) paintHeldSword(g,art.blades[index],pin,scale,bladeColor);
}

function fitItem(g, image, w, h) {
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  g.drawImage(image, -width / 2, -height / 2, width, height);
}

function ringMark(g, width, height, color) {
  g.beginPath();
  g.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  g.strokeStyle = color;
  g.stroke();
}

function paintGate(g) {
  const glow = g.createRadialGradient(0,0,5,0,0,58);
  glow.addColorStop(0,'rgba(221,180,85,.24)');
  glow.addColorStop(1,'rgba(221,180,85,0)');
  g.save();
  g.scale(1,.55);
  g.fillStyle=glow;
  g.fillRect(-60,-60,120,120);
  g.restore();
  g.lineWidth=2;
  ringMark(g,110,57,'#cfab68');
  ringMark(g,90,43,'#7d9b89');
  g.lineWidth=1.5;
  for(let n=0;n<12;n++) {
    const a=n*Math.PI/6, x=Math.cos(a), y=Math.sin(a);
    g.beginPath();
    g.moveTo(x*49,y*25);
    g.lineTo(x*54,y*29);
    g.strokeStyle=n%3===0?'#f7d391':'#acb492';
    g.stroke();
  }
}

function paintQuest(g) {
  g.fillStyle = '#f8d290';
  g.strokeStyle = '#593f2b';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0,-16); g.lineTo(12,0); g.lineTo(0,16); g.lineTo(-12,0); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#6f4529';
  g.fillRect(-1.5,-7,3,8); g.fillRect(-1.5,4,3,3);
}

function paintWorldLabel(g, name, accent) {
  g.fillStyle = '#172320d9';
  g.beginPath(); g.roundRect(-63,-11,126,21,4); g.fill();
  g.strokeStyle = accent; g.lineWidth = 1;
  g.stroke();
  g.font = '600 13px "Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  g.fillStyle = '#f4ddaa';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name,0,0,119);
}

async function texture(game, scope, canvas) {
  const lease = await game.textureFromCanvas(canvas);
  scope.use({ dispose: () => lease.release() });
  return lease;
}

async function atlasPage(game, scope, entries, frames, page, sizes) {
  // Egret accepts at most 4,194,304 pixels per source image. Keep the
  // protagonist poses grouped by armor and pack other sprites separately.
  const pad = 4, maxWidth = 2048;
  entries.sort((a, b) => b.h - a.h || b.w - a.w);
  let x = pad, y = pad, row = 0;
  let painted=0;
  for (const entry of entries) {
    const width = entry.w * RESOLUTION, height = entry.h * RESOLUTION;
    if (x + width + pad > maxWidth) { x = pad; y += row + pad; row = 0; }
    Object.assign(entry, { x, y, width, height });
    x += width + pad;
    row = Math.max(row, height);
  }
  const atlas = document.createElement('canvas');
  atlas.width = maxWidth;
  atlas.height = y + row + pad;
  sizes[page]={width:atlas.width,height:atlas.height,pixels:atlas.width*atlas.height};
  if (atlas.width * atlas.height > 4194304) throw Error('Illustration atlas page exceeds Egret texture capacity');
  const g = atlas.getContext('2d');
  for (const entry of entries) {
    g.save();
    g.beginPath();
    g.rect(entry.x, entry.y, entry.width, entry.height);
    g.clip();
    g.translate(entry.x + entry.width / 2, entry.y + entry.pivotY * RESOLUTION);
    g.scale(RESOLUTION, RESOLUTION);
    entry.draw(g);
    g.restore();
    const { x, y, width, height, w, h, pivotY, weaponAnchor, offhandAnchor } = entry;
    frames[entry.key] = { x, y, width, height, w, h, pivotY, page, weaponAnchor, offhandAnchor };
    if(++painted%8===0)await yieldArtPreparation();
  }
  await yieldArtPreparation();
  const lease=await texture(game,scope,atlas);
  await yieldArtPreparation();
  return lease;
}

export async function buildArt(game, scope, maps) {
  const [landscape, actorSheets, gearSheets, professionArt] = await Promise.all([
    loadLandscape(),
    Promise.all(ACTOR_FILES.map(name => loadImage('actors/' + name))),
    Promise.all(gearArtFiles.map(name => loadImage('gear/' + name))),
    loadProfessionArt(loadImage)
  ]);
  const gear = Object.fromEntries(gearArtFiles.map((key, i) => [key,gearSheets[i]]));
  const [standard, elite, cast, actions, standardWalk, eliteWalk,town] = actorSheets;
  const entries = [], aliases = {};
  const add = (key, w, h, draw, pivotY = h / 2, weaponAnchor) => entries.push({key, w, h, draw, pivotY, weaponAnchor});
  entries.push(...professionArt.entries);
  Object.assign(aliases,professionArt.aliases);

  const heroStates = [
    ['hero', standard, null, standardWalk, WALK_ART[0]], ['heroSteel', standard, '#e6f3e7', standardWalk, WALK_ART[0]],
    ['heroElite', elite, '#8c7754', eliteWalk, WALK_ART[1]], ['heroEliteSteel', elite, null, eliteWalk, WALK_ART[1]]
  ];
  for (const [kind, sheet, blade, walkSheet, walkArt] of heroStates) {
    for (const back of [false,true]) {
      const label = kind + (back ? 'Back' : '');
      const first = back ? 4 : 0;
      for (const [column, pose] of [[0,'0'],[2,'attack'],[3,'hurt']]) {
        const index = first + column;
        const pin = HERO_PINS[index], scale = .285;
        add(label + ':' + pose, 156, 146, g => {
          cutout(g, sheet, [1774,887], sheetCell(index), pin, scale);
          if (blade) paintHeldSword(g, SWORDS[index], pin, scale, blade);
        }, 128, bladeAnchor(SWORDS[index],pin,scale));
      }
      for (let phase=0; phase<4; phase++) {
        const index = first + phase;
        add(label + ':walk' + phase,156,146,g => paintWalk(g,walkSheet,index,walkArt,blade),128,
          bladeAnchor(walkArt.blades[index],walkArt.pins[index],.285));
      }
      aliases[label + ':fallen'] = label + ':hurt';
    }
  }

  for (const {kind,bounds,pin,height} of CAST) {
    if (kind === 'smith') continue;
    const width = kind === 'boss' ? 216 : kind === 'wolf' ? 166 : 146;
    const pivot = height + 7;
    add(kind + ':0',width,pivot+19,g => cutout(g,cast,[1536,1024],bounds,pin,height/bounds[3]),pivot);
    const enemy = ENEMIES.indexOf(kind);
    if (enemy >= 0) {
      for (const [row,pose] of ['attack','hurt'].entries()) {
        const index = row * 4 + enemy;
        const scale = kind === 'wolf' ? .26 : height / 425;
        add(kind + ':' + pose,width,pivot+19,g => cutout(g,actions,[1774,887],sheetCell(index),ACTION_PINS[index],scale),pivot);
      }
    } else {
      aliases[kind + ':attack'] = kind + ':0';
      aliases[kind + ':hurt'] = kind + ':0';
    }
    for (const step of [1,2,3]) aliases[kind + ':' + step] = kind + ':0';
    aliases[kind + ':fallen'] = kind + ':hurt';
    for (const frame of ['0','1','2','3','attack','hurt','fallen']) aliases[kind+'Back:'+frame]=kind+':'+frame;
  }

  const residentKinds = ['smith','apothecary','merchant','scout'];
  const townSize = [town.naturalWidth,town.naturalHeight], cellW = townSize[0]/2, cellH = townSize[1]/2;
  for (const [index,kind] of residentKinds.entries()) {
    const x = index%2*cellW, y = Math.floor(index/2)*cellH;
    const pin = [x + cellW*.52,y + cellH*.94], scale = 116/cellH;
    add(kind+':0',148,138,g => cutout(g,town,townSize,[x,y,cellW,cellH],pin,scale),117);
    for (const pose of ['1','2','3','attack','hurt','fallen']) aliases[kind+':'+pose] = kind+':0';
    for (const pose of ['0','1','2','3','attack','hurt','fallen']) aliases[kind+'Back:'+pose] = kind+':0';
  }

  for (const [key,image] of Object.entries(gear)) {
    add('gear:' + key,52,52,g => fitItem(g,image,key === 'gold' ? 30 : 45,key === 'gold' ? 32 : 46));
  }
  for (const id of Object.keys(ITEMS)) aliases['item:' + id] = 'gear:' + gearArt(id);
  add('ring',62,52,g => fitItem(g,gear.ring,57,47));
  add('portal',128,76,paintGate);
  add('quest',34,48,paintQuest);
  add('node:beacon',70,82,g=>landscape.paintGatherable(g),72);
  for (const fx of FX_FRAMES) add(fx.key,fx.w,fx.h,fx.draw,fx.pivotY);
  for (const frame of landscape.ambientFrames ?? []) add(frame.key,frame.w,frame.h,
    g => landscape.paintAmbient(g,frame.kind,frame.frame),frame.pivotY);
  for (const [id,map] of Object.entries(maps)) {
    await yieldArtPreparation();
    for (const npc of map.npcs) add('npc-tag:'+npc.id,130,24,g => paintWorldLabel(g,npc.name,'#bb9a62'));
    for (const portal of map.portals ?? [map.portal]) add('portal:'+id+':'+portal.id,130,24,g => paintWorldLabel(g,portal.name,'#8ab9b0'));
  }
  for (const [key,target] of Object.entries({
    gold:'item:gold', potion:'item:potion', sword:'item:iron-sword', armor:'item:scale-armor', seal:'item:jade-seal',
    slash:'fx-cut:2', impact:'fx-impact:1', dust:'fx-dust', heal:'fx-sigil', level:'fx-sigil'
  })) aliases[key] = target;
  for (let n=0; n<10; n++) {
    add('digit:'+n,17,25,g => {
      g.textAlign='center'; g.textBaseline='middle'; g.font='bold 23px Georgia,serif';
      g.lineWidth=3; g.strokeStyle='#26221c'; g.strokeText(String(n),0,0);
      g.fillStyle='#f2d299'; g.fillText(String(n),0,0);
    });
  }

  const frames = {}, atlases = [], atlasSizes=[];
  const plainHero = entry => entry.key.startsWith('hero') && !entry.key.startsWith('heroElite');
  atlases.push(await atlasPage(game, scope, entries.filter(plainHero), frames, 0,atlasSizes));
  atlases.push(await atlasPage(game, scope, entries.filter(entry => entry.key.startsWith('heroElite')), frames, 1,atlasSizes));
  atlases.push(await atlasPage(game, scope, entries.filter(entry => !entry.key.startsWith('hero') && !entry.group), frames, 2,atlasSizes));
  const boots = entries.filter(entry => entry.key.startsWith('hero') || entry.group==='profession').map(entry => ({
    key:'boots:'+entry.key, w:90, h:56, pivotY:48,
    draw(g) {
      entry.draw(g);
      if(entry.eraseWeapon){entry.eraseWeapon(g);return;}
      const blade = entry.weaponAnchor;
      if (!blade) return;
      // The skirt/boot crop shares the actor's ground contact. Exclude any
      // blade pixels that touch the crop before adding the shoe material.
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.lineWidth = 9;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(blade.tipX,blade.tipY);
      g.lineTo(blade.x*2-blade.tipX,blade.y*2-blade.tipY);
      g.stroke();
      g.restore();
    }
  }));
  atlases.push(await atlasPage(game,scope,boots,frames,3,atlasSizes));
  atlases.push(await atlasPage(game,scope,entries.filter(entry=>entry.group==='profession'),frames,4,atlasSizes));
  atlases.push(await atlasPage(game,scope,entries.filter(entry=>entry.group==='campaignEnemy'),frames,5,atlasSizes));
  for (const [alias,source] of Object.entries(aliases)) frames[alias] = frames[source];
  for (const [alias,source] of Object.entries(aliases)) {
    if (frames['boots:'+source]) frames['boots:'+alias] = frames['boots:'+source];
  }

  const grounds={}, structures={};
  for (const [id,map] of Object.entries(maps)) {
    await yieldArtPreparation();
    const ground=document.createElement('canvas');
    ground.width=map.width; ground.height=map.height;
    landscape.paintGround(ground.getContext('2d'),id,map);
    const lease=await texture(game,scope,ground);
    await yieldArtPreparation();
    grounds[id]={lease,width:ground.width,height:ground.height};
    structures[id]=[];
    for (const [i,obstacle] of map.obstacles.entries()) {
      const {width,height,kind}=obstacle, extra=kind==='tree' ? Math.max(130,height) : 100;
      const canvas=document.createElement('canvas');
      canvas.width=width+100; canvas.height=height+extra+40;
      const pivotX=canvas.width/2, pivotY=canvas.height-22, context=canvas.getContext('2d');
      context.translate(pivotX,pivotY);
      landscape.paintStructure(context,kind,width,height,i,id);
      const propLease=await texture(game,scope,canvas);
      structures[id].push({lease:propLease,x:obstacle.x+width/2,y:obstacle.y+height,pivotX,pivotY,kind});
      if(i%3===2)await yieldArtPreparation();
    }
  }
  const ambientActors = Object.fromEntries(Object.keys(maps).map(id => [id,landscape.ambientActors?.(id,maps[id]) ?? []]));
  return { atlas: atlases[0], atlases, atlasSizes, frames, grounds, structures, ambientActors, res: RESOLUTION };
}
