// Test numeric presentation envelopes without a GPU or a game simulation.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createVisualPulse,noticeOpacity} from '../src/view/presentation-envelope.mjs';

test('one visual pulse starts immediately, decays smoothly and ends inside its original window',()=>{
  const pulse=createVisualPulse();
  const peak=2.5,duration=.12;
  assert.equal(pulse.begin(peak,duration),peak);
  let last=peak;
  for(let i=0;i<12;i++){
    const next=pulse.advance(.01);
    assert.ok(next<=last&&next>=0&&next<=peak);
    last=next;
  }
  assert.equal(last,0);
  assert.equal(pulse.advance(.1),0);
  const a=createVisualPulse(),b=createVisualPulse();
  a.begin(peak,duration);b.begin(peak,duration);
  assert.ok(Math.abs(a.advance(.07)-(b.advance(.03),b.advance(.04)))<1e-12);
});

test('new visual accents replace rather than add to one bounded light; clear leaves no afterglow',()=>{
  const pulse=createVisualPulse();
  pulse.begin(4,.10);pulse.advance(.045);
  assert.equal(pulse.begin(1.5,.15),1.5);
  assert.ok(pulse.advance(.02)<1.5);
  pulse.clear();assert.equal(pulse.advance(.001),0);
});

test('notification opacity preserves the immediate display and only eases the original short tail',()=>{
  for(const remaining of [.9,.5,.2,.18])assert.equal(noticeOpacity(remaining),1);
  const values=[.18,.135,.09,.045,0].map(noticeOpacity);
  assert.equal(values[0],1);assert.equal(values.at(-1),0);
  assert.ok(values[1]<1&&values[1]>values[2]&&values[2]>values[3]&&values[3]>0);
  assert.equal(noticeOpacity(-.1),0);
  assert.equal(noticeOpacity(.9),1,'a refreshed message is legible immediately');
});
