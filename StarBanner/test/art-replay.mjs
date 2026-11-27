// Build a valid late-game save by replaying ordinary orders through the unmodified rules and AI.
// This is not a meter/health cheat or a claim of a live human playthrough.
import '../vendor/node-register.mjs';
import { createGame, act, artReady, cloneGame, actionsAt } from '../src/sim/rules.mjs';
import { mapById } from '../src/sim/maps.mjs';
import { createBrain, nextOrder } from '../src/sim/ai.mjs';
const { openSave, SAVE_KEY } = await import('../src/saves.mjs');

export function makeArtReplay(seed = 17) {
  const sides=[{commander:'garron',ai:false},{commander:'vireta',ai:true,level:'easy'}],
    setup={map:'wheat',sides,human:0,seed,fog:false},game=createGame(mapById('wheat'),sides,seed),
    brains=[createBrain('normal'),createBrain('easy')],orders=[];
  let commander;
  for(let step=0;step<1000&&!game.over;step++){
    commander=game.units.find(u=>u.owner===0&&u.type==='commander'&&!u.done);
    if(game.current===0&&commander&&artReady(game,0)&&actionsAt(game,commander,commander.x,commander.y).some(a=>a.kind==='art'))break;
    const order=nextOrder(game,brains[game.current]);orders.push(order);act(game,order);
  }
  if(game.over||game.current!==0||!commander||!artReady(game,0))throw Error('No legal rally opportunity in replay');
  const items=new Map(),storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,String(v)),removeItem:k=>items.delete(k)};
  const saved=openSave(storage,'zh');
  saved.update(data=>{
    data.settings.music=false;data.settings.reducedMotion=true;data.settings.speed=3;
    data.battle={setup,game:cloneGame(game)};
    data.lastSetup={map:'wheat',you:'garron',foe:'vireta',level:'easy',first:true,fog:false};
  });
  return {seed,orders,setup,game:cloneGame(game),commander:{id:commander.id,x:commander.x,y:commander.y},
    save:items.get(SAVE_KEY)};
}
