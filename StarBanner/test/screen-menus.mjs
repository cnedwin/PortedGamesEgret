// An English menu/layout route for short landscape and portrait screens and a tablet.
import fs from 'node:fs';
import path from 'node:path';
import { ready, press, nodes } from './ui-actions.mjs';
import { geometry } from './screen-route.mjs';
export default async function(player){
  const page=player.page,url=new URL(page.url());
  url.searchParams.set('lang','en');url.searchParams.set('quality','low');url.searchParams.set('seed','3');url.searchParams.set('map','wheat');
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url.href);
  await ready(page,'dialog:Starbanner Tactics');
  const device=await player.read(()=>matchMedia('(pointer:coarse)').matches)?'touch':'mouse',rows=[];
  let output;
  const snap=async name=>{
    const shot=await player.checkpoint(name);const row=await geometry(player,name,shot);rows.push(row);
    if(shot?.picture)output=path.join(path.dirname(shot.picture),'native-semantic.json');
    if(output)fs.writeFileSync(output,JSON.stringify({rows},null,2)+'\n');
    const cjk=(await nodes(page)).filter(n=>n.role!=='button'||n.name!=='中文').filter(n=>/[㐀-鿿]/.test(n.name));
    player.expect(cjk.length===0,'English semantic names contain no untranslated Chinese in '+name+': '+cjk.map(n=>n.name).join(','));
  };
  await snap('title');
  await press(page,'button:Settings',device);await ready(page,'dialog:Settings');await snap('settings');
  await press(page,'button:Done',device);await ready(page,'dialog:Starbanner Tactics');
  await press(page,'button:Skirmish',device);await ready(page,'dialog:Skirmish');await snap('setup-map');
  await press(page,'button:Your commander',device);await ready(page,'radio:Seline');await snap('setup-you');
  await press(page,'button:Opponent',device);await ready(page,'radio:Garron');await snap('setup-foe');
  await press(page,'button:Difficulty',device);await ready(page,'radio:Normal');await snap('setup-options');
  await press(page,'button:Back',device);await ready(page,'dialog:Starbanner Tactics');
  await press(page,'button:How to play',device);await ready(page,'dialog:How to play');
  for(let n=1;n<=5;n++){
    await snap('help-'+n);
    if(n<5){const next='button:Next '+(n+1)+'/5';await ready(page,next);await press(page,next,device);}
  }
  await press(page,'button:Done',device);await ready(page,'dialog:Starbanner Tactics');
  await press(page,'button:Campaign',device);await ready(page,'dialog:Campaign');await snap('campaign');
  player.expect(rows.every(row=>row.errors===0),'English controls stay inside the stand-in safe area');
}
