// Summarize the official verify-screens report plus its independent native overlay semantic receipts.
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
    const png=fs.readFileSync(r.picture),pixelSize=[png.readUInt32BE(16),png.readUInt32BE(20)];
    const expected=r.viewport.map(v=>Math.round(v*r.dpr));
    if(pixelSize.some((v,i)=>v!==expected[i]))throw Error('Wrong physical size for '+r.picture);
    // The semantic bounds include the selected radio's 3px rather than 2px border. A <=1 CSS pixel seam is
    // reported separately: the two adjacent hit areas are verified by actual pointer presses, not pixel strokes.
    const apartDetails=r.findings.filter(f=>f.check==='apart').map(f=>{
      const one=r.controls.find(c=>c.name===f.controls[0]),two=r.controls.find(c=>c.name===f.controls[1]),a=one?.box,b=two?.box;
      if(!a||!b)return{controls:f.controls,decoration:false};
      const x=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),y=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
      const css=Math.min(x,y),unit=Math.min(r.viewport[0]/r.logical[0],r.viewport[1]/r.logical[1]),logical=css/unit;
      // Adjacent radio faces share a nominal edge; the selected 3-unit stroke adds 0.5 unit per edge. HUD
      // menu rows have a positive layout gap, but their drop shadows enter visual bounds. Retain every warning.
      const radio=one.role==='radio'&&two.role==='radio'&&logical<=.61;
      const menu=/^hud-menu-\d+:row-/.test(one.id)&&/^hud-menu-\d+:row-/.test(two.id)&&logical<=2;
      return{controls:f.controls,cssOverlap:css,logicalOverlap:logical,decoration:radio||menu,
        reason:radio?'radio focus stroke at a shared edge':menu?'HUD row shadow/stroke extending past its separate hit area':null};
    });
    const seams=apartDetails.filter(f=>f.cssOverlap<=1).length;
    const safe=Object.keys(r.safe).every(k=>Math.abs(r.safe[k]-r.engineSafe[k])<=2);
    const heights=r.texts.map(t=>t.box.height).sort((a,b)=>a-b);
    rows.push({profile:screen.name,...r,pixelSize,semanticEdgeSeams:seams,apartDetails,visualDecorations:apartDetails.filter(f=>f.decoration).length,engineSafeMatches: safe,
      textBounds:{count:heights.length,minCssHeight:heights[0]??null,medianCssHeight:heights[Math.floor(heights.length/2)]??null}});
  }
  routes.push({profile:screen.name,officialPass:screen.pass,played:screen.played?.pass??null,route:local.route??[]});
  console.log(screen.name+': '+local.rows.map(r=>r.state+' '+r.errors+'/'+r.warnings).join(', '));
}
const summary={officialPass:official.pass,officialProfiles:official.screens.length,rows,routes,missing,
  method:'Official verifier captures real per-profile UI route; native World3D control probe is unavailable, so actual semantic bounds supply separate CSS geometry. Disabled/inert controls excluded; text bound height is not an exact font size.'};
fs.writeFileSync(path.join(out,'native-screen-report.json'),JSON.stringify(summary,null,2)+'\n');
process.exitCode=(!official.pass||missing||rows.some(r=>r.errors>0||!r.engineSafeMatches))?1:0;
