import test from 'node:test';
import assert from 'node:assert/strict';
const wrapPlayWords=(words,units)=>{const chars=[...words], out=[];while(chars.length)out.push(chars.splice(0,Math.floor(units)).join(''));return out;};
import { noticeDescription, noticeOptions, createNativeNotices } from '../src/ui/native-notice.mjs';

const all = node => [node, ...(node.children??[]).flatMap(all)];
function contrast(a,b) {
  const light=c=>[16,8,0].map(shift=>(c>>shift&255)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
  const values=[light(a),light(b)].sort((a,b)=>b-a);
  return (values[0]+.05)/(values[1]+.05);
}
test('native notices avoid common HUD controls and retain contrast in landscape and portrait',()=>{
  for(const screen of [{width:873,height:325},{width:1280,height:800},{width:390,height:844},{width:768,height:1024}]){
    const portrait=screen.height>screen.width;
    for(const tone of ['notice','success','warning']){
      const root=noticeDescription('各项事务已全部开放。此后可在江湖中研习武学、派遣弟子、查看山门。',tone,{...screen,portrait,world:true,staged:true},wrapPlayWords);
      assert(root.y>=(portrait?250:52));
      if(screen.height<520){assert(root.x>=184);assert(root.x+root.width<=screen.width-358);}
      assert(root.width<screen.width && root.x+root.width<=screen.width);
      assert(root.y+root.height<screen.height);
      for(const part of all(root).filter(n=>n.type==='text'))assert(contrast(root.color,part.color)>=4.5);
      const options=noticeOptions('各项事务已全部开放。',tone,{...screen,portrait,world:true,staged:true});
      assert(options.placement.foreground&&options.persistent&&contrast(options.background,options.color)>=4.5);
      assert(all(root).every(part=>!part._action&&part.type!=='button'&&part.type!=='toggle'));
      assert.equal(all(root).filter(p=>p.type==='text').map(p=>p.text).join(''),'各项事务已全部开放。此后可在江湖中研习武学、派遣弟子、查看山门。');
    }
  }
});
test('action feedback replaces the persistent news then expires; mounting new views keeps it on top without focus',()=>{
  let ctx={world:{},ui:{page:'seat',notice:'江湖新消息'},helpers:{isStaged:()=>true}}, opened=[],jobs=[];
  const game={screen:{width:1280,height:800},safe:{width:1280,height:800},uiScale:1,orientation:'landscape',
    toast(words,opts){const handle={words,opts,closed:false,get active(){return !this.closed},close(){this.closed=true}};opened.push(handle);return handle;}};
  const notices=createNativeNotices(game,{context:()=>ctx,translate:String,wrap:wrapPlayWords,schedule:(fn,ms)=>{jobs.push({fn,ms});return jobs.length-1;},cancel:()=>{}});
  notices.sync();assert.equal(opened.length,1);assert.equal(opened[0].words,'江湖新消息');
  notices.toast('成功','success');assert.equal(opened.length,2);assert(opened[0].closed);assert.equal(jobs.at(-1).ms,3200);
  notices.sync(true);assert(!opened[1].closed);assert.equal(opened.length,2);
  notices.toast('失败','warning');assert.equal(jobs.at(-1).ms,4800);assert(opened[1].closed);
  jobs[0].fn();assert.equal(opened.length,3,'expired previous timer must not dismiss newer toast');
  ctx={...ctx,ui:{...ctx.ui,sheet:{kind:'settings'}}};
  notices.sync();assert(opened.at(-1).closed);
  const inline=notices.inline('tablet');assert.equal(inline.width,'fill');assert.equal(inline.anchor,undefined);assert.equal(inline.children[0].text,'失败');
  jobs[1].fn();assert(opened.at(-1).closed,'world news is not painted over modal');
  ctx={...ctx,ui:{...ctx.ui,sheet:null}};notices.sync();
  assert.equal(opened.at(-1).words,'江湖新消息');
  assert(opened.every(h=>h.opts.placement.foreground&&h.opts.persistent));
});
