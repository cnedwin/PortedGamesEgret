import assert from 'node:assert/strict';
import { test } from 'node:test';
import { floatingFeedback, feedbackLook } from '../src/view/hud-feedback.mjs';

test('a floating notice appears immediately, eases away and reaches zero at the original lifetime',()=>{
  const start=floatingFeedback(0),middle=floatingFeedback(.45),tail=floatingFeedback(.79),end=floatingFeedback(.9);
  assert.equal(start.alpha,1);
  assert(start.offset===0&&start.scale>=1);
  assert(middle.alpha===1&&middle.offset>0);
  assert(tail.alpha>0&&tail.alpha<1&&tail.offset>middle.offset);
  assert.equal(end.alpha,0);
  assert.equal(end.offset,30);
  assert.equal(end.scale,1);
});

test('reduced motion uses the same readable lifetime without movement or size changes',()=>{
  for(const age of [0,.1,.45,.79,.9]){
    const steady=floatingFeedback(age,true),normal=floatingFeedback(age);
    assert.equal(steady.offset,0);
    assert.equal(steady.scale,1);
    assert.equal(steady.alpha,normal.alpha);
  }
});

test('emphasis is presentation only and cannot overrun the bounded plate',()=>{
  const normal=feedbackLook('','1234'),strong=feedbackLook('crit','1234'),warning=feedbackLook('bad crit','1234');
  assert(strong.size>normal.size);
  assert.notEqual(normal.edge,strong.edge);
  assert.notEqual(warning.text,strong.text);
  for(const type of ['', 'crit', 'bad', 'horse', 'bad crit']){
    const look=feedbackLook(type,'1234567890');
    assert(look.width<=104&&look.height<=34&&look.width>=32);
  }
});
