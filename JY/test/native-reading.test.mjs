import test from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const { paginateDialogue, createOpeningDialogue } = await import('../web/opening-dialogue.mjs');
const { createDialogueJournal } = await import('../web/jyx2/ui/dialogue-journal.mjs');
const { createReadingRows } = await import('../web/jyx2/ui/native/reading-view.mjs');

const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function scope(){const c=new AbortController(),rows=[];return {signal:c.signal,use(value){rows.push(value);return value},dispose(){if(c.signal.aborted)return;c.abort();for(const x of rows)x.dispose?.()}};}
function lab(){
  let latest,blocks=[],width=400;const callbacks=[];
  const game={scope:scope(),engine:{createScope:scope},invalidate(){},
    browser:{async createParagraphLabel(offer){const job=defer();callbacks.push({offer,job});return {ready:job.promise,bounds:{height:50},display:{text:offer.text}}}},
    show(description,options){
      const positions=new Map();let disposed=false;
      const view={description,options,focus(){return true},refresh(){},show(){},hide(){},activate(){},deactivate(){},cover(){},reveal(){},
        close(){disposed=true},textReady(){return Promise.resolve()},rect(){return {width,height:300}},
        get(name){if(!positions.has(name))positions.set(name,{addChild(x){blocks.push(x)}});return positions.get(name)},
        replaceChildren(name,children){this.children=children},scroll(){return {maximum:10,scrollTo(){}}},
        get disposed(){return disposed}};
      latest=view;options.built?.(view);return view;
    }};
  return {game,callbacks,get latest(){return latest},get blocks(){return blocks},resize(value){width=value;latest.options.built?.(latest)}};
}
const generic='An original training page with independent fixture writing. '.repeat(4);

test('logical pagination is retained; no layout change adjusts event acknowledgement',async()=>{
  const h=lab(),pages=[],frames=[],barrier=defer();let acknowledgements=0;
  const dialogue=createOpeningDialogue({game:h.game,onPage:page=>pages.push(page),presentFrame:()=>{frames.push(1);return barrier.promise},onAcknowledge:()=>acknowledgements++});
  const flow=dialogue.talk({text:generic,head:-1,style:3,voice:7});
  await turn();assert.equal(dialogue.waiting,false);assert.equal(dialogue.confirm(),false);
  h.callbacks[0].job.resolve();await turn();assert.equal(frames.length,1);assert.equal(pages.length,0);barrier.resolve();await turn();
  assert.equal(dialogue.waiting,true);assert.equal(pages.length,1);assert.equal(pages[0].voice,7);
  assert.equal(pages[0].text,paginateDialogue(generic)[0]);assert.equal(dialogue.confirm(),true);assert.equal(dialogue.confirm(),false);
  await turn();h.callbacks[1].job.resolve();await turn();assert.equal(pages[1].page,2);assert.equal(dialogue.skip(),true);
  assert.equal(await flow,false);assert.equal(acknowledgements,2);assert.equal(dialogue.presenting,false);
});

test('closing a pending acknowledgement rejects the caller, never reports a further page',async()=>{
  const h=lab(),pages=[];const dialogue=createOpeningDialogue({game:h.game,onPage:p=>pages.push(p)});
  const action=dialogue.talk({text:generic,head:-1,style:3});await turn();h.callbacks[0].job.resolve();await turn();
  assert.equal(dialogue.waiting,true);dialogue.close();await assert.rejects(action,{name:'AbortError'});
  assert.equal(dialogue.confirm(),false);assert.equal(pages.length,1);
});

test('a superseded portrait/landscape paragraph cannot attach into the replacement view',async()=>{
  const h=lab();const rows=createReadingRows({game:h.game,scope:h.game.scope,body:'body',rows:()=>[{body:'New fixture'}]});
  const view=h.game.show({},{});const one=rows.render(view);let done=false;void rows.ready().then(()=>{done=true});
  const two=rows.render(view);await turn();h.callbacks[0].job.resolve();await one;assert.equal(done,false);
  h.callbacks[1].job.resolve();await two;await rows.ready();assert.equal(h.blocks.length,1);assert.equal(h.blocks[0].text,'New fixture');
  rows.close();
});

test('journal review, paging, and close preserve caller entries and their 60-page bound',async()=>{
  const h=lab(),controller=new AbortController(),entries=[];let restored=0;
  const journal=createDialogueJournal(entries,{game:h.game,signal:controller.signal,restoreFocus:()=>restored++});
  for(let i=0;i<62;i++)journal.record('Fixture '+i,'Independent review note '+i);
  assert.equal(entries.length,60);assert.equal(entries[0].speaker,'Fixture 2');const before=structuredClone(entries);
  journal.show();await turn();assert.ok(journal.open);for(const p of h.callbacks)p.job.resolve();await turn();
  const view=h.latest;view.options.bind['journal-previous'].tap();await turn();for(const p of h.callbacks)p.job.resolve();await turn();
  assert.deepEqual(entries,before);assert.equal(journal.handleKey('Escape',false),true);await turn();assert.equal(journal.open,false);assert.equal(restored,1);
  assert.deepEqual(entries,before);controller.abort();
});
