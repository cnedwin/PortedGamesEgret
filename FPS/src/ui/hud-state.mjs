// Native HUD presentation data only. The simulation remains the single source of all values.
import { MISSION, PLAYER } from '../data.mjs';
export const HUD_COLORS=Object.freeze({text:0xe9efe9,dim:0xa7b8b9,accent:0x5fe8b0,cyan:0x58e0ff,gold:0xffd376,red:0xff5a4a,panel:0x10181d,track:0x263438});
const rarity=[0xcccccc,0xd8d8d8,0x5bd16a,0x4d9bff,0xb868ff,0xffbf33,0xff4d40];
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
const number=value=>Math.round(value).toLocaleString('en-US');
const clock=seconds=>{const s=Math.max(0,Math.floor(seconds));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const rows=n=>Array.from({length:n},()=>({text:'',color:HUD_COLORS.text,ttl:0}));
export function newHudState(){return {touch:false,title:'',clock:'00:00',terminals:[{text:'',done:false,live:false},{text:'',done:false,live:false},{text:'',done:false,live:false}],uplinkVisible:false,uplinkLabel:'',uplinkHint:'',uplinkTime:'',uplinkValue:0,uplinkColor:HUD_COLORS.cyan,health:'100',armor:'60',healthValue:1,armorValue:1,healthColor:HUD_COLORS.accent,bandages:'',grenades:'',value:'',weapon:'',weaponKey:'rifle',ammo:'',reserve:'',ammoColor:HUD_COLORS.text,ammoNote:'',slots:'1  •  2  •  3',promptText:'',promptValue:0,promptVisible:false,busyText:'',busyValue:0,busyVisible:false,busyColor:HUD_COLORS.accent,feed:rows(5),loot:rows(9),commsText:'',speaker:'',commsLeft:0,warnText:'',warnLeft:0,hitLeft:0,hitColor:HUD_COLORS.text,hurtPulse:0,hurt: Array.from({length:6},()=>({ttl:0,bearing:0,armor:false})),gap:5,crossAlpha:1,scope:false,vignette:0};}
export function refreshHudState(s,game,t,touch){const p=game.player,w=game.weapons[p.weapon],active=game.transfer(),relay=active?.relay,extract=game.terminalsDone===game.terminals.length,eta=extract?Math.ceil(game.heliEta):0;
 s.touch=touch;s.health=String(Math.ceil(p.health));s.armor=String(Math.ceil(p.armor));s.healthValue=clamp(p.health/PLAYER.health);s.armorValue=clamp(p.armor/PLAYER.armor);s.healthColor=p.health<=30?HUD_COLORS.red:HUD_COLORS.accent;s.bandages=`✚ ${p.bandages}`;s.grenades=`● ${p.grenades}`;if(s.lastLootValue!==game.lootValue){s.lastLootValue=game.lootValue;s.value=`◈ ${number(game.lootValue)}`;}
 s.weapon=t.weapons[p.weapon];s.weaponKey=p.weapon;s.ammo=String(w.ammo);s.reserve='/ '+(Number.isFinite(w.reserve)?w.reserve:'∞');s.ammoColor=w.ammo<=w.mag*.25?HUD_COLORS.red:HUD_COLORS.text;s.ammoNote=p.drawing>0?t.drawing:w.ammo===0&&w.reserve===0?t.noAmmo:w.ammo<=w.mag*.25&&w.reloading<=0?t.lowAmmo:'';if(s.slotWeapon!==p.weapon){s.slotWeapon=p.weapon;s.slots=['rifle','pistol','marksman'].map((key,i)=>key===p.weapon?`[${i+1}]`:` ${i+1} `).join(' · ');}
 const spread=w.def.spread[0]+(w.def.spread[1]-w.def.spread[0])*p.aim;s.gap=Math.round(5+spread*(1+w.heat*1.4)*(p.speed>1?1.5:1)*(p.grounded?1:2.2)*620);s.crossAlpha=clamp(p.sprinting||p.healing>0?.25:p.weapon==='pistol'?1-p.aim*.6:1-p.aim);s.scope=p.weapon==='marksman'&&p.aim>.8;
 s.title=extract?t.objectiveExtract:`${t.objective}  ${game.terminalsDone}/${game.terminals.length}`;s.clock=clock(game.t);
 for(let i=0;i<Math.min(3,game.terminals.length);i++){const terminal=game.terminals[i],row=s.terminals[i];row.text=`${'ABC'[i]}${terminal.done?' ✓ ': '  '}${t.places[terminal.key]}`;row.done=terminal.done;row.live=terminal===active||terminal.key===active?.key;}
 s.uplinkVisible=Boolean(active||extract);if(s.uplinkVisible){s.uplinkLabel=extract?(eta?t.eta:t.boardNow):relay?`${t.relayCheck} ${active.phase+1}/2`:t.places[active.key];s.uplinkTime=extract?(eta?clock(eta):''):relay?(relay.inRange?clock(Math.ceil((1-relay.progress)*MISSION.relaySeconds)):`${Math.ceil(Math.hypot(relay.x-p.x,relay.z-p.z))} m`):clock(Math.ceil((1-active.progress)*active.duration));s.uplinkHint=extract?(eta?t.evadeUntilLanding:t.boardHint):relay?(relay.inRange?t.syncing:t.relayMove):!active.inRange?t.transferLost:t.transferPhases[active.phase??0];s.uplinkValue=clamp(Math.round((extract?1-game.heliEta/MISSION.heliSeconds:active.progress)*100)/100);s.uplinkColor=relay?HUD_COLORS.gold:HUD_COLORS.cyan;}
 const prompt=game.prompt;s.promptVisible=Boolean(prompt);s.promptText=prompt?(touch?t.useTouch:t.use)[prompt.kind]:'';s.promptValue=clamp(Math.round((prompt?.progress??0)*100)/100);
 let busy='',share=0;if(game.extracting>0){busy=t.extracting;share=game.extracting/MISSION.extractSeconds;}else if(p.healing>0){busy=t.healing;share=1-p.healing/PLAYER.bandageTime;}else if(w.reloading>0){busy=t.reloading;share=1-w.reloading/w.reloadTime;}if(!busy&&relay){busy=relay.inRange?t.syncing:t.relayMove;share=relay.progress;}else if(!busy&&active&&!active.inRange){busy=t.transferLost;share=active.progress;}
 s.busyText=busy;s.busyVisible=Boolean(busy);s.busyValue=clamp(Math.round(share*100)/100);s.busyColor=!relay&&active&&!active.inRange?HUD_COLORS.red:HUD_COLORS.accent;s.vignette=clamp(s.hurtPulse*.8+Math.max(0,1-p.health/45)*.55);return s;}
function line(rows,text,color,ttl){for(let i=rows.length-1;i>0;i--)Object.assign(rows[i],rows[i-1]);Object.assign(rows[0],{text,color,ttl});}
export function applyHudEvent(s,e,t){const feed=(text,color=HUD_COLORS.text)=>line(s.feed,text,color,4.5);
 switch(e.type){
  case 'shot':if(e.enemy){s.hitLeft=e.killed ? .32 : .16;s.hitColor=e.killed?HUD_COLORS.red:e.head?HUD_COLORS.gold:HUD_COLORS.text;}break;
  case 'enemyDown':feed(`${t.killed} ${t.enemies[e.enemy.kind]}${e.head?' · '+t.headshot:''}`,e.head?HUD_COLORS.gold:HUD_COLORS.text);break;
  case 'bark':feed(`${t.enemies[e.enemy.kind]} ${t.barks[e.key]??''}`,HUD_COLORS.red);if(e.key==='grenade'){s.warnText=t.grenadeWarn;s.warnLeft=2.6;}break;
  case 'lootLeft':feed(`${t.bagFull} ${t.items[e.item.key]}`,HUD_COLORS.gold);break;
  case 'loot':for(const item of e.items)line(s.loot,`${t.items[item.key]}${item.value?'   '+number(item.value):''}`,rarity[item.rarity]??HUD_COLORS.text,5);break;
  case 'terminal':feed(`${t.places[e.terminal.key]} ✓ +${number(MISSION.intelValue)}`,HUD_COLORS.accent);feed(t.resupply+(e.resupply?.rifle||e.resupply?.marksman?' · '+t.ammoSupplied:''),HUD_COLORS.accent);break;
  case 'comms':s.speaker=t.speaker;s.commsText=t.comms[e.key]??'';s.commsLeft=5.5;break;
  case 'playerHit':for(let i=s.hurt.length-1;i>0;i--)Object.assign(s.hurt[i],s.hurt[i-1]);Object.assign(s.hurt[0],{ttl:.9,bearing:e.bearing,armor:e.armor});s.hurtPulse=clamp(s.hurtPulse+.25+e.amount/40);break;
 }
}
export function advanceHudTimers(s,dt){const d=Math.max(0,dt);for(const row of s.feed)row.ttl=Math.max(0,row.ttl-d);for(const row of s.loot)row.ttl=Math.max(0,row.ttl-d);for(const arc of s.hurt)arc.ttl=Math.max(0,arc.ttl-d);s.hitLeft=Math.max(0,s.hitLeft-d);s.commsLeft=Math.max(0,s.commsLeft-d);s.warnLeft=Math.max(0,s.warnLeft-d);s.hurtPulse=Math.max(0,s.hurtPulse-d*1.6);}
/** Existing map reveals only actors that are actually seen or recently fired. */
export const eligibleMapEnemy=e=>!e.dead&&(e.sees||e.firedAgo<2.5);
/** The engine projects into viewport coordinates. Refit only the existing HUD marker to safe area. */
export function edgeMarker(projection,screen,safe,inset=16,out={}){const left=safe.x+inset,top=safe.y+inset,right=Math.max(left,safe.x+safe.width-inset),bottom=Math.max(top,safe.y+safe.height-inset);let x=screen.x+projection.x,y=screen.y+projection.y;const inside=projection.inFront&&x>=left&&x<=right&&y>=top&&y<=bottom;
 if(!inside){const cx=screen.x+screen.width*.5,cy=screen.y+screen.height*.5;let dx=x-cx,dy=y-cy;if(!projection.inFront){dx=(dx<0?-1:1)*(Math.abs(dx)+1);dy=Math.abs(dy)+1;}if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6)dy=1;const sx=dx>0?(right-cx)/dx:dx<0?(left-cx)/dx:Infinity,sy=dy>0?(bottom-cy)/dy:dy<0?(top-cy)/dy:Infinity;const k=Math.max(0,Math.min(sx,sy));x=cx+k*dx;y=cy+k*dy;}
 out.x=clamp(x,left,right);out.y=clamp(y,top,bottom);out.edge=!inside;return out;}

// Conservative native HUD text advance, in logical units. CJK and wide glyphs
// reserve a full em; narrow Latin punctuation reserves less. Layout does not
// require a DOM measurement and keeps all translations inside the card.
const glyphEm=ch=>/[^\u0000-\u007f]/.test(ch)?1.04:/[MW@%]/.test(ch)?1:/[\s.,:;!'|ilI]/.test(ch)?.40:.70;
export function hudTextWidth(text,size){return Array.from(text).reduce((w,ch)=>w+glyphEm(ch)*size,0);}
export function wrapHudText(text,maxWidth,size){const chars=Array.from(text),lines=[];let start=0;while(start<chars.length){let end=start,width=0,lastBreak=-1;while(end<chars.length){const next=glyphEm(chars[end])*size;if(end>start&&width+next>maxWidth)break;width+=next;if(/[\s，。；、！？,.!?;]/.test(chars[end]))lastBreak=end+1;end++;}if(end<chars.length&&lastBreak>start&&lastBreak-start>Math.floor((end-start)*.55))end=lastBreak;lines.push(chars.slice(start,end).join('').trim());start=end;while(start<chars.length&&/\s/.test(chars[start]))start++;}return lines.length?lines:[''];}
