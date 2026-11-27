// Targeted multilingual title screenshots, using the official screen profiles and the actual native text nodes.
import fs from 'node:fs';
import path from 'node:path';
import { ready } from './ui-actions.mjs';
import { geometry } from './screen-route.mjs';
export default async function(player){
  await player.page.emulateMedia({reducedMotion:'reduce'});
  const rows=[];
  for(const [lang,name] of [['zh','星旗战记'],['en','Starbanner Tactics']]){
    const url=new URL(player.page.url());for(const [key,value] of Object.entries({lang,quality:'low',seed:'3',map:'wheat'}))url.searchParams.set(key,value);
    await player.page.goto(url.href);
    await ready(player.page,'dialog:'+name);
    const shot=await player.checkpoint('title-'+lang);
    rows.push(await geometry(player,'title-'+lang,shot));
    if(shot?.picture)fs.writeFileSync(path.join(path.dirname(shot.picture),'native-semantic.json'),JSON.stringify({rows},null,2)+'\n');
  }
  player.expect(rows.every(row=>row.errors===0&&row.warnings===0&&row.engineWarnings.length===0),
    'both title languages pass native geometry and page checks');
}
