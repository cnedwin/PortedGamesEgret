// The generic virtual clock owns only fixed-step scheduling, not game rules
// or controls. A host samples each discrete input only on the admitted step.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {advanceVirtualFrame,INTERACTIVE_TEMPO} from '../src/view/virtual-clock.mjs';

const STEP=1/60;
function legacy(carry,dt,scale){
  carry+=dt*scale;
  let steps=0;
  while(carry>=STEP){carry-=STEP;steps++;}
  return {steps,remainder:carry};
}
function timeline(fps,paced,frames=fps*10){
  let carry=0,total=0,last=-1,maxGap=0,skips=0;
  for(let i=0;i<frames;i++){
    const plan=advanceVirtualFrame(carry,1/fps,STEP,{paced});
    carry=plan.remainder;total+=plan.steps;
    if(plan.steps){if(last>=0)maxGap=Math.max(maxGap,i-last);last=i;}
    else skips++;
    assert.ok(carry>=0&&carry<STEP);
  }
  return {total,maxGap,skips};
}

test('normal interactive time is uniformly modestly slower on common display rates',()=>{
  assert.equal(INTERACTIVE_TEMPO,.9);
  for(const fps of [30,60,90,120]){
    const baseline=timeline(fps,false),paced=timeline(fps,true);
    assert.ok(Math.abs(baseline.total-600)<=1);
    assert.ok(Math.abs(paced.total-540)<=1);
    assert.ok(paced.maxGap<=baseline.maxGap+1,'at steady '+fps+' Hz the scheduler adds at most one presentation frame');
  }
});

test('deterministic capture/tool scheduling retains exact legacy carry, local rate and step decisions',()=>{
  let carry=0;
  for(const dt of [0,1/120,1/60,.019,.044,0,.1,.008,.016]){
    for(const scale of [1,.7,.35,0]){
      const old=legacy(carry,dt,scale),next=advanceVirtualFrame(carry,dt,STEP,{scale,paced:false});
      assert.equal(next.steps,old.steps);
      assert.equal(next.remainder,old.remainder);
      assert.equal(next.scale,scale);
      carry=next.remainder;
    }
  }
});

test('waiting retains its fraction and settlement remains on the original unpaced clock',()=>{
  const carry=STEP*.72,waiting=advanceVirtualFrame(carry,.1,STEP,{scale:0,paced:false});
  assert.equal(waiting.steps,0);
  assert.equal(waiting.remainder,carry);
  const settled=advanceVirtualFrame(carry,.08,STEP,{scale:.35,paced:false}),old=legacy(carry,.08,.35);
  assert.equal(settled.steps,old.steps);
  assert.equal(settled.remainder,old.remainder);
});

test('a short latched abstract input arriving on a zero-step frame is consumed exactly once at the next step',()=>{
  let carry=0,consumed=[],edges=[],created=false,extraFrames=0;
  for(let i=0;i<50;i++){
    const plan=advanceVirtualFrame(carry,1/60,STEP,{paced:true});
    carry=plan.remainder;
    if(plan.steps===0&&!created){edges.push('short-press');created=true;extraFrames=i;}
    for(let step=0;step<plan.steps;step++)while(edges.length)consumed.push([edges.shift(),i]);
  }
  assert.ok(created);
  assert.deepEqual(consumed,[['short-press',extraFrames+1]]);
});
