// Summarize official overlay control receipts, screenshot dimensions and supplemental semantic text metadata.
// Usage: node test/screen-report.mjs <official-output-directory>
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve(process.argv[2]??'');
const official=JSON.parse(fs.readFileSync(path.join(out,'report.json'),'utf8'));
const rows=[],routes=[];
let missing=0;
for(const screen of official.screens){
  const source=path.join(out,screen.name,'native-semantic.json');
  if(!fs.existsSync(source)){missing++;console.log(screen.name+': no semantic receipt');continue;}
  const local=JSON.parse(fs.readFileSync(source,'utf8'));
  for(const r of local.rows){
    const checkpoint=screen.checkpoints?.find(c=>c.name===r.state);
    if(!checkpoint||checkpoint.controls!==r.engineControls||!checkpoint.controlReceipt?.fresh||
      !r.fresh||r.controls?.length!==checkpoint.controls)
      throw Error('Missing or inconsistent native control receipt for '+screen.name+'/'+r.state);
    const png=fs.readFileSync(r.picture),pixelSize=[png.readUInt32BE(16),png.readUInt32BE(20)];
    const expected=r.viewport.map(v=>Math.round(v*r.dpr));
    if(pixelSize.some((v,i)=>v!==expected[i]))throw Error('Wrong physical size for '+r.picture);
    const safe=r.engineSafe&&Object.keys(r.safe).every(k=>Math.abs(r.safe[k]-r.engineSafe[k])<=2);
    const heights=r.texts.map(t=>t.box.height).sort((a,b)=>a-b);
    rows.push({profile:screen.name,...r,pixelSize,engineSafeMatches: safe,
      textBounds:{count:heights.length,minCssHeight:heights[0]??null,medianCssHeight:heights[Math.floor(heights.length/2)]??null}});
  }
  routes.push({profile:screen.name,officialPass:screen.pass,played:screen.played?.pass??null,route:local.route??[]});
  console.log(screen.name+': '+local.rows.map(r=>r.state+' '+r.errors+'/'+r.warnings).join(', '));
}
const summary={officialPass:official.pass,officialProfiles:official.screens.length,rows,routes,missing,
  method:'Official verifier captures each game state and the native World3D hit geometry. Semantic text bounds are supplemental visual metadata, not an exact font size or a second control geometry test.'};
fs.writeFileSync(path.join(out,'native-screen-report.json'),JSON.stringify(summary,null,2)+'\n');
process.exitCode=(!official.pass||missing||rows.some(r=>r.errors>0||r.warnings>0||r.engineWarnings.length||!r.engineSafeMatches))?1:0;
