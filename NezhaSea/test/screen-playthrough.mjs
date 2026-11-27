/** Responsive browser journey: real keyboard / CDP touch / simulated standard pad.
 * Fixed encounter/loadout fixtures isolate navigation from random loot and wave duration.
 */
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { ROOT, launch, openPage, report, serve } from '../../tools/lib/browser.mjs';
const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = relative(ROOT, gameDir).split('\\').join('/');
const out = process.env.NEZHA_SCREEN_JOURNEY;
if (out) await mkdir(out, { recursive: true });
const profiles = [
  { label: 'notch portrait / touch', id:'notch', width:393, height:852, scale:3, touch:true, insets:{top:59,right:0,bottom:34,left:0}, mode:'touch' },
  { label: 'notch landscape / keyboard', id:'wide', width:852, height:393, scale:3, touch:true, insets:{top:0,right:59,bottom:21,left:59}, mode:'keyboard' },
  { label: 'tablet portrait / simulated gamepad', id:'tablet', width:768, height:1024, scale:2, touch:true, insets:{top:0,right:0,bottom:0,left:0}, mode:'pad' }
];
const server = await serve(), browser = await launch(), checks = [], problems = [];
const verified = (ok, message) => { checks.push([Boolean(ok), message]); if (!ok) throw new Error(message); };
try {
  for (const config of profiles) {
    const { label, id, width, height, scale, touch, insets, mode } = config;
    const page = await openPage(browser, server.url + path + '/?seed=11&lang=en', {
      width,height,scale,touch,
      before: page => page.addInitScript(({insets, mode}) => {
        window.__egretAgent = {insets};
        if (mode === 'pad') {
          const pad = {index:0,id:'Standard virtual pad',mapping:'standard',connected:true,axes:[0,0,0,0],
            buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
          window.screenPad = pad;
          Object.defineProperty(navigator, 'getGamepads', {value:()=>[pad]});
        }
      }, {insets,mode})
    });
    const state = (fn,arg) => page.evaluate(fn,arg);
    const until = (fn,arg,seconds=30) => page.waitForFunction(fn,arg,{timeout:seconds*1000,polling:100});
    const screen = (name, seconds=30) => until(name => window.nezhaSea?.screen===name,name,seconds);
    const exists = part => state(part => Boolean(window.nezhaSea.ui.tree.publish().nodes.find(n=>!n.inert&&!n.hidden&&n.id.endsWith(':'+part))),part);
    const pause = ms => page.waitForTimeout(ms);
    const pulse = async (index) => {
      await state(i=>Object.assign(window.screenPad.buttons[i],{pressed:true,value:1}),index);
      await pause(120);
      await state(i=>Object.assign(window.screenPad.buttons[i],{pressed:false,value:0}),index);
      await pause(120);
    };
    const nodeOf = part => state(part=>{
      const {game,ui} = window.nezhaSea;
      const node=ui.tree.publish().nodes.find(n=>!n.inert&&!n.hidden&&n.id.endsWith(':'+part));
      if(!node) return null;
      const rect=game.canvas.getBoundingClientRect(), scale=rect.width/game.screen.width;
      return {id:node.id,x:rect.left+(node.bounds.x+node.bounds.width/2)*scale,
        y:rect.top+(node.bounds.y+node.bounds.height/2)*scale,disabled:node.disabled};
    },part);
    const focus = () => state(()=>window.nezhaSea.ui.part);
    async function activate(part) {
      await until(part=>window.nezhaSea.ui.tree.publish().nodes.some(n=>!n.inert&&!n.hidden&&n.id.endsWith(':'+part)),part);
      if (mode === 'touch') {
        const p = await nodeOf(part); if(!p || p.disabled) throw new Error('Unavailable '+part);
        await page.touchscreen.tap(p.x,p.y);
      } else if (mode === 'keyboard') {
        for(let i=0;i<70&&await focus()!==part;i++) await page.keyboard.press('Tab');
        if(await focus()!==part) throw new Error('Tab cannot reach '+part);
        await page.keyboard.press('Enter');
      } else {
        // A named focus setup controls for directional traversal order on the
        // dense tablet fixture. Activation and movement are standard pad samples.
        await state(part=>{
          const {ui,game}=window.nezhaSea;
          const node=ui.tree.publish().nodes.find(n=>!n.inert&&!n.hidden&&n.id.endsWith(':'+part));
          if(!node||node.disabled) throw new Error('Unavailable '+part);
          ui.tree.perform(node.id,'focus');game.canvas.focus();ui.tree.publish();
        },part);
        await pulse(0);
      }
      await pause(140);
    }
    const shot = name => out ? page.screenshot({path:resolve(out,id+'-'+name+'.png')}) : Promise.resolve();
    const confirmation = async () => {
      await until(()=>window.nezhaSea.game.asking||window.nezhaSea.ui.tree.publish().nodes.some(n=>!n.inert&&!n.hidden&&n.id.endsWith(':sellConfirm')));
      return (await exists('sellConfirm'))?'sellConfirm':'yes';
    };
    try {
      await until(()=>window.nezhaSea?.ready&&window.nezhaSea.screen==='title');
      await shot('title');
      await activate('hero_boy'); await activate('danger1');
      verified(await state(()=>window.nezhaSea.app.hero==='boy'&&window.nezhaSea.app.danger===1),label+' selects hero and difficulty');
      await activate('start'); await screen('play'); await shot('battle');
      const from = await state(()=>window.nezhaSea.app.run.player.x);
      if(mode==='touch'){
        const point=await state(()=>{
          const {game}=window.nezhaSea;
          const r=game.canvas.getBoundingClientRect(), k=r.width/game.screen.width;
          const p=game.toStage(150,500);return {x:r.left+p.x*k,y:r.top+p.y*k};
        });
        const cdp=await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+55,y:point.y,id:1}]});
        await pause(650);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      } else if(mode==='keyboard'){
        await page.keyboard.down('d'); await pause(650); await page.keyboard.up('d');
      } else {
        await state(()=>{window.screenPad.axes[0]=0.9;}); await pause(650); await state(()=>{window.screenPad.axes[0]=0;});
      }
      verified(await state(x=>window.nezhaSea.app.run.player.x>x+10,from),label+' moves using chosen device');
      if(mode==='keyboard')await page.keyboard.press('p');
      else if(mode==='pad')await pulse(9);
      else await activate('pause');
      await screen('menu'); await shot('pause'); await activate('resume'); await screen('play');
      // Deterministic wave and currency fixture, not an assertion of natural loot.
      await state(()=>{const run=window.nezhaSea.app.run;run.waveLeft=Math.min(run.waveLeft,2);run.pending=Math.max(run.pending,1);run.pearls=999;});
      await screen('levelUp');
      for(let i=0;i<8&&await state(()=>window.nezhaSea.screen)==='levelUp';i++)await activate('upgrade0');
      await screen('shop');await shot('offers');
      if (mode === 'pad') {
        verified(await exists('offerBuy0') && await exists('relic0') && !await exists('gearTab'),
          label+' selects the actual simultaneous tablet panes');
        const before = await focus();
        await pulse(12);
        verified(await focus() !== before && Boolean(await focus()), label+' directional pad navigates the market');
      }
      await activate('offerBuy0');
      verified(await state(()=>window.nezhaSea.app.run.shop.offers[0].sold),label+' purchases a relic');
      if(await exists('gearTab'))await activate('gearTab');
      await state(()=>{
        const {app,refresh}=window.nezhaSea;
        app.picked=null;app.run.weapons=[['ring',0],['ring',0],['ribbon',0]].map(([kind,tier])=>({kind,tier,divine:false,cooldown:0,angle:0,also:0}));refresh();
      });
      if(!(await exists('relic0'))&&await exists('gearTab'))await activate('gearTab');
      await shot('gear');
      await activate('relic0');await activate('relic1');
      verified(await state(()=>window.nezhaSea.app.run.weapons.length===2&&window.nezhaSea.app.run.weapons.some(w=>w.kind==='ring'&&w.tier===1)),label+' merges two matching relics');
      await activate('relic1');await activate('sell');
      const yes=await confirmation();await shot('confirm');
      await activate(yes);
      verified(await state(()=>window.nezhaSea.app.run.weapons.length===1),label+' confirms sale');
      await activate('next');await screen('play');
      verified(await state(()=>window.nezhaSea.app.run.wave===2),label+' advances to next wave');
      await state(()=>{const run=window.nezhaSea.app.run;run.player.hp=0.5;run.player.guard=0;run.weapons=[];});
      await screen('end',60);await until(()=>window.nezhaSea.ui.tree.publish().nodes.some(n=>!n.inert&&n.id.endsWith(':again')));
      await shot('end');
      verified(await state(()=>JSON.parse(localStorage.getItem('nezha-sea')).data.best.boy?.[1]===2),label+' result and persistence');
      await activate('title');await screen('title');
      verified(true,label+' returns to title');
    } catch(error) {
      checks.push([false,label+': '+error.message.split('\n')[0]]);
      await shot('failure').catch(()=>{});
    } finally { problems.push(...page.problems.map(p=>label+': '+p)); await page.context().close(); }
  }
} finally { await browser.close();await server.close();report('Responsive fixture journeys (Chromium SwiftShader; virtual notch/touch/pad)',checks,problems); }
