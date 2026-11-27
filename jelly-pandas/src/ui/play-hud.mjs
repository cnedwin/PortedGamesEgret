// Native battle HUD. Text is held by the engine atlas; counters share a fixed bitmap-font page.
import { Bitmap, DisplayObjectContainer, Sprite } from '@egret/engine';
import { createBitmapText, parseBitmapFont } from '@egret/engine/bitmapfont';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { CHARMS, RUN, SKINS, TOYS } from '../data.mjs';

const C={ink:0x2a1838,panel:0x241637,cream:0xfff6e4,muted:0xe3d7ef,green:0xb5ff9a,gold:0xffd878,red:0xff7a8f,blue:0x59d7ff};
const TRICKS=[['slam','trickSlam'],['bump','trickBump'],['roll','trickRoll']];
const FAMILY='Arial';
const clamp=(x)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const clock=(s)=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const assign=(obj,key,value)=>{if(obj[key]===value)return false;obj[key]=value;return true;};
const faceRect=i=>({x:i%4*384+32,y:Math.floor(i/4)*512+24,width:320,height:320});

/** Generate one immutable font texture at startup, not one raster per changing number. */
async function numericAtlas(game) {
  const chars='0123456789:/+-…?★', cw=32,ch=48;
  const canvas=typeof OffscreenCanvas==="function"?new OffscreenCanvas(cw*chars.length,ch):Object.assign(document.createElement("canvas"),{width:cw*chars.length,height:ch});
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Counter font raster unavailable');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font='900 38px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=2.6;ctx.strokeStyle='#2a1838';ctx.fillStyle='#ffffff';
  const glyphs=[];
  Array.from(chars).forEach((c,i)=>{
    const x=i*cw;ctx.strokeText(c,x+cw/2,ch/2);ctx.fillText(c,x+cw/2,ch/2);
    glyphs.push({id:c.codePointAt(0),x,y:0,width:cw,height:ch,xoffset:0,yoffset:0,xadvance:cw,page:0,chnl:15});
  });
  const font=parseBitmapFont({info:{face:'Jelly counters',size:38},common:{lineHeight:ch,base:38,scaleW:canvas.width,scaleH:ch},pages:['counter-page'],chars:glyphs,kernings:[]});
  return {font,pages:[await game.textureFromCanvas(canvas)]};
}

/** All UI art is drawn by the native stage. Positions and widths are stage units, kept inside the current safe part. */
export async function createPlayHud(game,{root,atlas,locale,semantics,onChanged,onError}) {
  const scope=game.scope,hold=node=>scope.use(node),{t,name}=locale;
  const keepSemantic=handle=>scope.use({dispose:()=>handle.remove()});
  const numbers=await numericAtlas(game);
  let dirty=false,visible=false,touch=false,screen=game.screen,current=null,now=0,layoutChanged=true;
  let partySignature='',toySignature='',mask=-1,challengeUntil=Infinity,announceUntil=0,announceText='',hurtUntil=0;
  const mark=()=>{dirty=true;};
  const flush=()=>{if(dirty){dirty=false;game.invalidate();onChanged?.();}};
  const group=(parent=root)=>parent.addChild(hold(new DisplayObjectContainer()));
  const sprite=(parent=root)=>parent.addChild(hold(new Sprite()));
  const draw=(node,w,h,{fill=C.panel,alpha=.82,border=C.ink,stroke=1.2,radius=10}={})=>{
    const g=node.graphics;g.clear();
    if(stroke)g.lineStyle(stroke,border,1);
    g.beginFill(fill,alpha).drawRoundRect(0,0,Math.max(1,w),Math.max(1,h),radius,radius).endFill();
  };
  const setVisible=(node,on)=>{if(assign(node,'visible',!!on))mark();};
  const place=(node,x,y)=>{if(assign(node,'x',x)|assign(node,'y',y))mark();};
  const label=async(parent,words='',size=13,color=C.cream,weight=700)=>{
    const native=await game.createAtlasLabel({scope,text:words,fontFamily:FAMILY,fontSize:size,fontWeight:weight,color,locale:locale.lang,strokeWidth:.75,strokeColor:C.ink});
    parent.addChild(native.display);
    let text=words,tint=color,lang=locale.lang,anchor=[0,0,'left',Infinity],generation=0;
    const position=()=>{
      if(native.display.isDisposed)return;
      const b=native.bounds,scale=Math.min(1,anchor[3]/Math.max(1,b.width));
      assign(native.display,'scaleX',scale);assign(native.display,'scaleY',scale);
      const x=anchor[0]-(anchor[2]==='center'?b.width*scale/2:anchor[2]==='right'?b.width*scale:0)-b.x*scale;
      const y=anchor[1]-b.y*scale;
      place(native.display,x,y);mark();
    };
    const ready=()=>{const g=++generation;void native.ready.then(()=>{if(g===generation){position();flush();}}).catch(onError);};
    ready();
    return {native,display:native.display,
      set(value,colour=tint){value=String(value);if(value===text&&colour===tint&&lang===locale.lang)return;
        text=value;tint=colour;lang=locale.lang;native.set({text:value,color:colour,locale:lang});ready();mark();},
      at(x,y,align='left',maxWidth=Infinity){anchor=[x,y,align,maxWidth];position();}
    };
  };
  const number=(parent,value,size,color=C.cream)=>{
    const text=scope.use(createBitmapText({...numbers,text:String(value),color}));
    parent.addChild(text.display);const scale=size/48;
    text.display.scaleX=text.display.scaleY=scale;
    let anchor=[0,0,'left'];
    const align=()=>place(text.display,anchor[0]-(anchor[2]==='center'?text.width*scale/2:anchor[2]==='right'?text.width*scale:0),anchor[1]);
    return {display:text.display,set(value,tint=text.color){value=String(value);let changed=false;
      if(text.text!==value){text.text=value;changed=true;}
      if(text.color!==tint){text.color=tint;changed=true;}
      if(changed){align();mark();}},
      at(x,y,alignment='left'){anchor=[x,y,alignment];align();}
    };
  };
  const bar=(parent,colour)=>{
    const holder=group(parent),track=sprite(holder),fill=sprite(holder);
    let width=1,height=1,value=0,tint=colour;
    const paint=()=>{draw(track,width,height,{fill:0x160b28,alpha:.88,stroke:1,radius:height/2});
      fill.graphics.clear();fill.graphics.beginFill(tint).drawRoundRect(0,0,Math.max(1,width-2),Math.max(1,height-2),Math.max(1,height/2-1)).endFill();
      fill.x=1;fill.y=1;fill.scaleX=value;mark();};
    return {holder,track,fill,layout(x,y,w,h){place(holder,x,y);if(w!==width||h!==height){width=w;height=h;paint();}},set(v,c=tint){
      v=clamp(v);if(c!==tint){tint=c;paint();}if(v!==value){value=v;fill.scaleX=value;mark();}}};
  };

  const vignette=sprite(),top=group(),xp=bar(top,C.green),levelWord=await label(top,t('level'),12,C.cream),
    levelNumber=number(top,1,18),timer=number(top,'0:00',34),killIcon=await label(top,'🍬',20),killNumber=number(top,0,26);
  const boss=group(),bossName=await label(boss,'',16,C.red,800),bossHP=bar(boss,C.red);
  const announcement=group(),announcementText=await label(announcement,'',28,C.cream,900);
  const challenge=group(),challengePlate=sprite(challenge),challengeTitle=await label(challenge,t('trickTitle'),15,C.gold,800),
    challengeCount=number(challenge,'0/3',19,C.gold),challengeGoal=await label(challenge,t('trickGoal'),11,C.muted,600);
  const challengeSteps=[];
  for(const [key,word] of TRICKS) {const bg=sprite(challenge),text=await label(challenge,t(word),11,C.cream);challengeSteps.push({key,word,bg,text});}
  const party=group(),rows=[];
  for(let i=0;i<4;i++){
    const node=group(party),background=sprite(node);
    const head=atlas?node.addChild(hold(new Bitmap(atlas))):sprite(node);
    if(atlas)head.sourceRect=faceRect(0);
    const title=await label(node,'',12,C.cream),hp=bar(node,C.green),hpNumber=number(node,0,14),stamina=bar(node,C.blue);
    rows.push({node,background,head,title,hp,hpNumber,stamina,skin:-1});
  }
  const build=group(),chips=[];
  for(let i=0;i<RUN.toySlots+RUN.charmSlots;i++){
    const node=group(build),background=sprite(node),icon=await label(node,'',17,C.cream),level=number(node,1,13,C.gold);
    chips.push({node,background,icon,level});node.visible=false;
  }
  const hint=await label(root,t('clickToPlay'),15,C.cream);
  keepSemantic(semantics.add({id:'play-hud',role:'group',describe:()=>({name:locale.zh()?'比赛状态':'Match status',bounds:semanticBoundsOf(top),hidden:!visible})}));
  keepSemantic(semantics.add({id:'jelly-xp',parent:'play-hud',role:'progressbar',describe:()=>({name:t('level')+' '+(current?.level??1),bounds:semanticBoundsOf(xp.track),range:{min:0,max:Math.max(1,current?.xpNeed??1),now:Math.max(0,Math.min(current?.xp??0,Math.max(1,current?.xpNeed??1)))}})}));
  keepSemantic(semantics.add({id:'jelly-time',parent:'play-hud',role:'group',describe:()=>({name:locale.zh()?'计时 '+clock(current?.t??0):'Time '+clock(current?.t??0),bounds:semanticBoundsOf(timer.display)})}));
  keepSemantic(semantics.add({id:'jelly-kills',parent:'play-hud',role:'group',describe:()=>({name:t('kills')+' '+(current?.kills??0),bounds:semanticBoundsOf(killNumber.display)})}));
  keepSemantic(semantics.add({id:'jelly-boss',parent:'play-hud',role:'progressbar',describe:()=>({name:current?.boss?name(current.boss.def):(locale.zh()?'首领':'Boss'),bounds:semanticBoundsOf(boss),hidden:!boss.visible,range:{min:0,max:Math.max(1,current?.boss?.maxHp??1),now:Math.max(0,Math.min(current?.boss?.hp??0,Math.max(1,current?.boss?.maxHp??1)))}})}));
  keepSemantic(semantics.add({id:'jelly-announcement',parent:'play-hud',role:'status',describe:()=>({name:announcement.visible?announceText:'',bounds:semanticBoundsOf(announcement),hidden:!visible})}));
  keepSemantic(semantics.add({id:'jelly-tricks',parent:'play-hud',role:'group',describe:()=>({name:t('trickTitle')+' '+TRICKS.filter(([key])=>current?.pandas.find(p=>p.human)?.tricks?.[key]).length+'/3',bounds:semanticBoundsOf(challenge),hidden:!challenge.visible})}));
  for(let i=0;i<rows.length;i++)keepSemantic(semantics.add({id:'jelly-party-'+i,parent:'play-hud',role:'group',describe:()=>{
    const panda=current?.pandas[i];return {name:panda?name(SKINS[panda.skin])+' '+(panda.down?t('down'):Math.ceil(panda.hp)):'',bounds:semanticBoundsOf(rows[i].node),hidden:!panda||!rows[i].node.visible};
  }}));
  keepSemantic(semantics.add({id:'jelly-build',parent:'play-hud',role:'group',describe:()=>{
    const p=current?.pandas.find(x=>x.human)??current?.pandas[0];
    return {name:p?(locale.zh()?'本局构筑：':'Build: ')+p.toys.map(a=>name(TOYS[a.id])+' '+a.level).concat([...p.charms].map(([id,l])=>name(CHARMS[id])+' '+l)).join(', '):'',bounds:semanticBoundsOf(build),hidden:!p};
  }}));
  let itemCount=0,partyCount=0,short=false;
  function layout(next=game.screen){
    screen=next;
    const s=screen.safe,x=s.x,y=s.y,w=s.width,h=s.height,b=y+h,r=x+w,mid=x+w/2;
    const narrow=w<560;short=!narrow&&h<430;
    const pad=8,headH=17;
    xp.layout(x+pad,y+pad,w-pad*2,headH);
    levelWord.at(mid-14,y+pad+1,'right',52);levelNumber.at(mid-8,y+pad-1);
    timer.at(mid,y+29,'center');killIcon.at(r-pad-87,y+31);killNumber.at(r-pad,y+29,'right');
    const bossW=Math.min(w-2*pad,Math.max(130,w*(narrow?.75:.46)));
    place(boss,mid-bossW/2,y+65);bossName.at(bossW/2,0,'center',bossW);bossHP.layout(0,21,bossW,13);
    const chW=Math.min(narrow?Math.max(140,w*.56):286,w-2*pad),chH=66;
    const chX=short?mid-chW/2:r-pad-chW,chY=y+(short?63:narrow?82:78);
    place(challenge,chX,chY);draw(challengePlate,chW,chH,{fill:C.panel,alpha:.9,border:0xa987cb,stroke:1,radius:12});
    challengeTitle.at(8,4,'left',chW-63);challengeCount.at(chW-8,0,'right');
    const cell=(chW-20)/3;challengeSteps.forEach((a,i)=>{
      place(a.bg,6+i*(cell+3),25);draw(a.bg,cell,21,{fill:0x6f4b82,alpha:.75,stroke:0,radius:7});
      a.text.at(6+i*(cell+3)+cell/2,28,'center',cell-5);
    });
    challengeGoal.at(chW/2,49,'center',chW-14);
    // The compact landscape moves the party to the upper-right, keeping the two thumbs free.
    const rowW=narrow?Math.min(140,w*.38):short?153:180,rowH=short?31:38, gap=4;
    const partyY=touch?(short?y+62:y+(screen.orientation==='portrait'?108:90)):Math.max(y+95,b-pad-partyCount*(rowH+gap)-25);
    place(party,touch&&short?r-pad-rowW:x+pad,partyY);
    rows.forEach((row,i)=>{
      place(row.node,0,i*(rowH+gap));draw(row.background,rowW,rowH,{fill:0x1c102e,alpha:.82,radius:10});
      place(row.head,4,4);
      if(atlas)row.head.scaleX=row.head.scaleY=(rowH-8)/320;
      else draw(row.head,rowH-8,rowH-8,{fill:0x6ad5a6,radius:10});
      const textX=rowH+1;
      row.title.at(textX,2,'left',rowW-textX-4);
      row.hp.layout(textX,rowH-14,rowW-textX-4,10);
      row.hpNumber.at(rowW-5,rowH-17,'right');
      row.stamina.layout(textX,rowH-3,rowW-textX-4,3);
    });
    const chipSize=narrow?25:28,cols=Math.max(1,Math.floor((w-2*pad)/chipSize));
    const nrows=Math.max(1,Math.ceil(itemCount/cols));
    const maxCols=Math.min(itemCount,cols);
    place(build,mid-maxCols*chipSize/2,b-pad-nrows*chipSize);
    chips.forEach((chip,i)=>{
      place(chip.node,(i%cols)*chipSize,Math.floor(i/cols)*chipSize);
      draw(chip.background,chipSize-2,chipSize-2,{fill:0x3a2353,alpha:.94,border:0x936da8,stroke:1,radius:7});
      chip.icon.at((chipSize-2)/2,0,'center',chipSize-6);chip.level.at(chipSize-4,chipSize-15,'right');
    });
    // Native radial gradient covers the whole stage, including under safe-area bars.
    const vg=vignette.graphics;vg.clear();
    vg.beginRadialGradientFill(screen.width/2,screen.height/2,Math.max(1,screen.width/2),[
      {offset:0,color:0xa61937,alpha:0},{offset:.56,color:0xa61937,alpha:0},{offset:1,color:0xd72858,alpha:.74}
    ],Math.max(1,screen.height/2)).drawRect(0,0,screen.width,screen.height).endFill();
    announcementText.at(mid,y+Math.max(104,h*.23),'center',w-20);
    hint.at(mid,y+h*.7,'center',w-20);
    layoutChanged=false;mark();flush();
  }
  function localize(){
    levelWord.set(t('level'));challengeTitle.set(t('trickTitle'));challengeGoal.set(t('trickGoal'));
    hint.set(t('clickToPlay'));challengeSteps.forEach(a=>a.text.set(t(a.word)));partySignature='';toySignature='';mask=-1;mark();
  }
  function setPlayers(gameState){
    const roster=gameState.pandas.map(p=>p.skin+':'+p.human).join(',')+locale.lang;
    if(roster!==partySignature){
      partySignature=roster;partyCount=gameState.pandas.length;layoutChanged=true;
      rows.forEach((row,i)=>{
        const p=gameState.pandas[i];setVisible(row.node,!!p);if(!p)return;
        if(atlas&&row.skin!==p.skin){row.head.sourceRect=faceRect(p.skin);row.skin=p.skin;mark();}
        row.title.set(name(SKINS[p.skin])+(p.human?' ★':''));setVisible(row.stamina.holder,!!p.human);
      });
    }
    gameState.pandas.forEach((p,i)=>{
      const row=rows[i];if(!row)return;
      row.hp.set(p.down?p.revive/3.5:p.hp/p.maxHp,p.down?C.green:p.hp/p.maxHp<.3?C.red:C.green);
      row.hpNumber.set(p.down?'…':Math.max(0,Math.ceil(p.hp)));
      row.stamina.set(p.stamina/2.5);
      if(assign(row.head,'alpha',p.down?.45:1))mark();
    });
  }
  function setBuild(human){
    const sig=human.toys.map(a=>a.id+':'+a.level+':'+a.evo).join('|')+'/'+[...human.charms].map(a=>a.join(':')).join('|')+locale.lang;
    if(sig===toySignature)return;
    toySignature=sig;
    const list=human.toys.map(a=>({icon:TOYS[a.id].icon,level:a.evo?'★':a.level,evo:a.evo})).concat([...human.charms].map(([id,l])=>({icon:CHARMS[id].icon,level:l,charm:true})));
    itemCount=list.length;layoutChanged=true;
    chips.forEach((chip,i)=>{
      const def=list[i];setVisible(chip.node,!!def);if(!def)return;
      chip.icon.set(def.icon);chip.level.set(def.level,def.evo?C.green:def.charm?C.blue:C.gold);
    });
  }
  function setChallenge(human,gameState){
    const next=TRICKS.reduce((m,[key],i)=>m|(human.tricks?.[key]?1<<i:0),0);
    if(next!==mask){
      mask=next;const count=TRICKS.filter(([key])=>human.tricks?.[key]).length;
      if(count===3&&challengeUntil===Infinity)challengeUntil=gameState.t+4;
      challengeCount.set(count+'/3');
      challengeSteps.forEach((step,i)=>{
        step.text.set((next&(1<<i)?'✓ ':'')+t(step.word),next&(1<<i)?C.green:C.cream);
        step.bg.alpha=next&(1<<i)?1:.7;
      });
      mark();
    }
    setVisible(challenge,!!human.tricks&&gameState.state==='play'&&gameState.t<challengeUntil&&!gameState.boss);
  }
  function start(){
    visible=true;setVisible(root,true);partySignature=toySignature='';mask=-1;challengeUntil=Infinity;
    announceUntil=0;announceText='';hurtUntil=0;vignette.alpha=0;setVisible(announcement,false);setVisible(boss,false);
    localize();layout();flush();
  }
  function hide(){visible=false;setVisible(root,false);flush();}
  function setTouch(on){if(touch!==on){touch=on;layout();}}
  function say(text,when,seconds=2.6,kind=''){
    announceText=text;announceUntil=when+seconds;announcementText.set(text,kind==='danger'?C.red:kind==='good'?C.green:C.cream);
    setVisible(announcement,true);mark();flush();
  }
  function consume(events,gameState,when){
    for(const ev of events)switch(ev.type){
      case 'announce':
        if(ev.key==='bossIncoming')say(name(ev.name)+' '+t('bossIncoming'),when,3.5,'danger');
        else if(ev.key==='bossDown')say(name(ev.name)+' ✔',when,3,'good');
        else if(ev.key==='trickReward')say(t('trickReward')+' +'+ev.xp+' XP',when,3,'good');
        else say(t(ev.key),when,2.6,ev.key==='surge'?'danger':'');
        break;
      case 'hurt':if(gameState.pandas[ev.panda]?.human){hurtUntil=when+.4;mark();}break;
      case 'down':say(name(SKINS[gameState.pandas[ev.panda].skin])+' '+t('down'),when,3,'danger');break;
      case 'revived':say(name(SKINS[gameState.pandas[ev.panda].skin])+' '+t('revived'),when,2,'good');break;
      case 'chest':say(t(ev.upgrades===0?'chestXp':'chest'),when,2,'good');break;
      case 'evolve':{const toy=TOYS[ev.toy];say(toy.icon+' '+name(toy.evo)+'!',when,2.6,'good');break;}
    }
  }
  function update(gameState,when,captured){
    if(!visible)return;current=gameState;now=when;
    const human=gameState.pandas.find(p=>p.human)??gameState.pandas[0];
    if(!human)return;
    timer.set(clock(gameState.t),RUN.bossTimes[gameState.bossIndex]-gameState.t>0&&RUN.bossTimes[gameState.bossIndex]-gameState.t<10?C.red:C.cream);
    killNumber.set(gameState.kills);levelNumber.set(gameState.level);xp.set(gameState.xp/gameState.xpNeed);
    setPlayers(gameState);setBuild(human);setChallenge(human,gameState);
    setVisible(boss,!!gameState.boss);
    if(gameState.boss){bossName.set(name(gameState.boss.def));bossHP.set(gameState.boss.hp/gameState.boss.maxHp);}
    setVisible(hint.display,!captured&&gameState.t<=6&&!touch);
    if(now>announceUntil)setVisible(announcement,false);
    const low=!human.down&&human.hp<human.maxHp*.3;
    const fade=Math.max(0,(hurtUntil-now)/.4);
    if(assign(vignette,'alpha',Math.min(1,(low?.3+.13*Math.sin(now*4):0)+fade*.65)))mark();
    if(layoutChanged){layout();if(human.tricks){mask=-1;setChallenge(human,gameState);}}
    flush();
  }
  hide();layout();
  return {start,hide,setTouch,localize,consume,update,layout,say,get visible(){return visible;},get buildRows(){const s=screen.safe;return Math.ceil(itemCount/Math.max(1,Math.floor((s.width-16)/(s.width<560?25:28))));},get numberAtlasPages(){return numbers.pages.length;}};
}
