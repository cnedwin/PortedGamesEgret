import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sceneBannerOpacity, sceneBannerOutline } from '../src/view/scene-presentation.mjs';

test('non-interactive scene title is readable on its very first frame and keeps the original lifetime',()=>{
  const duration=2.2;
  assert(sceneBannerOpacity(duration,duration)>=.8);
  assert.equal(sceneBannerOpacity(duration-.18,duration),1);
  assert.equal(sceneBannerOpacity(.8,duration),1);
  assert(sceneBannerOpacity(.1,duration)>0&&sceneBannerOpacity(.1,duration)<1);
  assert.equal(sceneBannerOpacity(0,duration),0);
});

test('reduced motion has no appearance animation and does not extend the banner lifetime',()=>{
  for(const remaining of [2.2,1,.01])
    assert.equal(sceneBannerOpacity(remaining,2.2,true),1);
  assert.equal(sceneBannerOpacity(0,2.2,true),0);
});

test('scene title ornament fits the old banner rectangle at all supported sizes',()=>{
  for(const [w,h] of [[90,54],[220,68],[320,65],[665,94]]){
    const outline=sceneBannerOutline(w,h);
    assert(outline.length===8);
    for(const [x,y] of outline)assert(x>=0&&x<=w&&y>=0&&y<=h);
    assert.equal(Math.min(...outline.map(p=>p[0])),0);
    assert.equal(Math.max(...outline.map(p=>p[0])),w);
  }
});
