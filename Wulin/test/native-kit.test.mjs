import test from 'node:test';
import assert from 'node:assert/strict';
import { button, col, text, field, choice, compile, COLORS, SKIN, BODY_FONT, commandSeal } from '../src/ui/native-kit.mjs';
test('descriptions preserve actions, names, disabled state and native paragraphs',()=>{
  let seen;
  const {root,bind}=compile(col([text('story',{lines:2}),button('Start','new',{page:'seat'},{disabled:true}),field('Name','own-name',''),choice('Rank',null,{id:'rank'},1,[[1,'First'],[2,'Second']])]),{dispatch:(...args)=>seen=args});
  assert.equal(root.children[0].paragraph.maxLines,2);
  assert.equal(root.children[1].type,'button');
  assert.equal(bind[root.children[1].name].disabled(),true);
  bind[root.children[2].name].tap({},null);
  assert.equal(seen[0],'@field');assert.equal(seen[1].id,'own-name');
  bind[root.children[3].name].tap({},null);
  assert.deepEqual(seen[1].options,[[1,'First'],[2,'Second']]);
  assert.equal(new Set(root.children.map(x=>x.name)).size,4);
});

test('large native view keeps every authored paragraph rather than degrading after fourteen',()=>{
  const rows=Array.from({length:40},(_,i)=>text('段落 '+i,{lines:3,height:70}));
  const native=compile(col(rows));
  assert.equal(native.root.children.filter(part=>!!part.paragraph).length,40);
  assert.ok(native.root.children.every(part=>part.type==='text'&&part.paragraph.maxLines===3));
});

test('document palette distinguishes action hierarchy and preserves readable Chinese text',()=>{
  const light=c=>[16,8,0].map(shift=>(c>>shift&255)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const pair=[light(a),light(b)].sort((a,b)=>b-a);return (pair[0]+.05)/(pair[1]+.05);};
  for(const kind of ['paper','outline','scene','primary','danger']){
    const part=button('確認','act',{}, {kind});
    assert.ok(contrast(part.color,part.textColor)>=4.5,kind);
    assert.equal(part.height,48);
    const disabled=button('確認','act',{}, {kind,disabled:true});
    assert.ok(contrast(SKIN.disabled,disabled.textColor)>=4.5,kind+' disabled');
  }
  assert.ok(contrast(COLORS.paper,COLORS.ink)>10);
  assert.ok(contrast(COLORS.paper,COLORS.muted)>6);
  const phrase=text('掌門案卷',{lines:2});
  assert.equal(phrase.fontFamily,BODY_FONT);
  const compiled=compile(col([phrase,commandSeal()]));
  assert.equal(compiled.root.children[0].paragraph.fontFamilies[0],BODY_FONT);
  assert.equal(compiled.root.children[1].semantic,false);
  assert.equal(compiled.root.children[1].src,'./assets/ui/command-seal.png');
  assert.deepEqual(Object.keys(compiled.bind),[]);
});
test('native paragraphs use the supplied physical raster density, not fixed double density',()=>{
  const raw=col([text('山门根基渐稳，方可遣人出战。',{lines:2}),button('要务','goal',{}, {detail:'完成第一项要务'})]);
  const {root}=compile(raw,{paragraphDensity:1.5});
  assert.deepEqual(root.children.map(p=>p.paragraph.density),[1.5,1.5]);
  assert.equal(compile(raw,{paragraphDensity:7}).root.children[0].paragraph.density,2,'protect the existing texture budget');
  assert.equal(compile(raw).root.children[0].paragraph.density,2,'standalone descriptions retain their previous default');
});

test('paragraph backing density remains stable between screen layout and its next real draw',async()=>{
  const {createParagraphDensity}=await import('../src/ui/native-kit.mjs');
  const resolve=createParagraphDensity();
  // The game has not drawn yet; do not infer density from the initial browser canvas.
  assert.equal(resolve({width:1280,height:800},{width:300,height:150},1),2);
  const frame={width:1280,height:800},backing={width:1920,height:1200};
  assert.equal(resolve(frame,backing,1),1.5);
  assert.equal(resolve(frame,backing,1.2),1.8);
  // CSS layout changed but the canvas still holds previous pixels. This may happen for every variant.
  const smaller={width:960,height:600};
  assert.equal(resolve(smaller,backing,1),1.5);
  assert.equal(resolve(smaller,backing,1),1.5);
  assert.equal(resolve(smaller,{width:1440,height:900},1),1.5);
  assert.equal(resolve(smaller,{width:1440,height:900},2.2),2,'dense mobile layout preserves the previous cap');
});
