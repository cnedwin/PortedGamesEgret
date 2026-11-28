import assert from 'node:assert/strict';
import test from 'node:test';
import { setLanguage } from '../src/i18n.mjs';
import { createGame, income, upkeep, power } from '../src/sim/world.mjs';
import { readCampaignHeader, buildCampaignHeader, campaignHeaderHeight } from '../src/ui/native-topbar.mjs';
import { miniMapTarget, miniMapMarks, layoutMiniMap } from '../src/ui/native-minimap-model.mjs';
import { MAP, NODES } from '../src/data/map.mjs';
import { pathToFileURL } from 'node:url';
async function enginePath(){if(process.env.NINE_ENGINE_VIEW)return pathToFileURL(process.env.NINE_ENGINE_VIEW);await import('../vendor/node-register.mjs');return new URL('../vendor/engine/dist/web/view.js',import.meta.url);}

const fixture=()=>({state:createGame({seed:1,faction:'liubei',branch:'free'}),screen:'play',paused:true,speed:2,dialogOpen:false,settings:{territoryMap:false},homeCity:()=> 'pingyuan',goHome(){this.home=true},open(id){this.opened=id},setPaused(v){this.paused=v},setSpeed(v){this.speed=v},setSetting(k,v){this.settings[k]=v}});

test('Campaign header values use the same income, upkeep and settings without advancing time',()=>{
 setLanguage('zh');const app=fixture(),before=JSON.stringify(app.state);const header=readCampaignHeader(app),f=app.state.factions[app.state.player];
 let coin=0,grain=0;for(const id of Object.keys(app.state.nodes))if(app.state.nodes[id].owner===f.id){const m=income(app.state,id);coin+=m.coin;grain+=m.grain;}const upkeepNow=upkeep(app.state,f.id);
 assert.equal(header.raw.netCoin,coin-upkeepNow.coin);assert.equal(header.raw.netGrain,grain-upkeepNow.grain);assert.equal(header.raw.troops,upkeepNow.troops);assert.equal(header.raw.cities,power(app.state,f.id).cities);assert(header.paused);assert.equal(header.speed,2);assert.equal(JSON.stringify(app.state),before);
});

test('Native controls use old callbacks without implicitly unpausing, and all variants share named types',async()=>{
 for(const language of ['zh','en']){
  setLanguage(language);const app=fixture(),state=readCampaignHeader(app), calls=[];const {description,bind}=buildCampaignHeader(app,state,{selectSpeed:()=>calls.push('speed')});
  const names=(n,m=new Map())=>{if(n.name){assert(!m.has(n.name));m.set(n.name,n.type);}n.children?.forEach(x=>names(x,m));return m;};
  const first=names(description.root);for(const k of ['portrait','tablet','tabletPortrait'])assert.deepEqual([...names(description[k])].sort(),[...first].sort());
  for(const n of Object.keys(bind))assert(first.has(n),n);
  bind['campaign-speed'].tap();assert.deepEqual(calls,['speed']);assert.equal(app.paused,true);
  bind['campaign-pause'].tap();assert.equal(app.paused,false);bind['campaign-pause'].tap();assert.equal(app.paused,true);
  bind['campaign-home'].tap();assert(app.home);
  bind['campaign-territory'].tap();assert.equal(app.settings.territoryMap,true);
  bind['campaign-settings'].tap();assert.equal(app.opened,'settings');
  bind['campaign-research'].tap();assert.equal(app.opened,'tech');
 }
});

test('Minimap geometry clamps drag coordinates, preserves aspect and uses same original marks',()=>{
 const app=fixture();const map=layoutMiniMap({x:-12,y:5,width:890,height:350},.92,122,false);assert(map.width>0&&map.height>0);assert(map.x>=-12&&map.x+map.width<=878);assert(map.y>=122&&map.y+map.height<=355);assert(Math.abs(map.width/map.height-MAP.width/MAP.height)<1e-7);
 assert.deepEqual(miniMapTarget(0,0,map.width,map.height),{x:0,z:0});assert.deepEqual(miniMapTarget(map.width,map.height,map.width,map.height),{x:MAP.width,z:MAP.height});assert.deepEqual(miniMapTarget(-99,map.height*3,map.width,map.height),{x:0,z:MAP.height});
 assert.deepEqual(miniMapMarks(app.state,'pingyuan',{x:100,z:200,d:50}).home,{x:NODES.pingyuan.x,z:NODES.pingyuan.y});
 const marks=miniMapMarks(app.state,'pingyuan',{x:100,z:200,d:50});assert.equal(marks.camera.width,72.5);assert.equal(marks.camera.height,47.5);
});

test('Actual engine planner keeps all visible campaign controls at least 44 CSS pixels',async()=>{
 const {checkView,planView}=await import(await enginePath());
 for(const lang of ['zh','en']){
  setLanguage(lang);const app=fixture(),header=readCampaignHeader(app),{description}=buildCampaignHeader(app,header,{selectSpeed(){}});checkView(description);
  for(const [w,h,l,t,r,b] of [[568,320,0,0,0,0],[873,325,20,0,20,0],[852,393,59,0,59,0],[390,844,0,40,0,30],[768,1024,0,0,0,0],[1024,768,0,0,0,0],[1280,800,0,0,0,0]]){
   const scale=44/48,screen={x:0,y:0,width:w/scale,height:h/scale},safe={x:l/scale,y:t/scale,width:(w-l-r)/scale,height:(h-t-b)/scale},portrait=h>w;
   const plan=planView(description,{screen,safe,orientation:portrait?'portrait':'landscape',form:Math.min(w,h)>=600?'tablet':'phone'});
   for(const {part,rect} of plan.parts){if(!['button','toggle'].includes(part.type)&&part.role!=='button'||part.visible===false)continue;assert(rect.width*scale>=43.999&&rect.height*scale>=43.999,`${lang}/${w}x${h}/${part.name}: ${rect.width*scale}×${rect.height*scale}`);assert(rect.x>=safe.x&&rect.y>=safe.y&&rect.x+rect.width<=safe.x+safe.width+1e-7&&rect.y+rect.height<=safe.y+safe.height+1e-7,part.name+' safe');}
   assert(plan.parts[plan.names.get('campaign-topbar')].rect.height===campaignHeaderHeight(portrait));
  }
 }
});
