import test from 'node:test';
import assert from 'node:assert/strict';
import {capsuleCrossContour,traceCapsuleCross} from '../src/art/forecast-geometry.mjs';
import {forecastHits} from '../src/sim/campaign-ai.mjs';

function outline(radius,width){
 const points=[];let current;
 const graphics={moveTo(x,y){points.push(current={x,y});return this;},lineTo(x,y){points.push(current={x,y});return this;},
  drawArc(x,y,r,a,b){for(let i=1;i<=128;i++){const angle=a+(b-a)*i/128;points.push(current={x:x+Math.cos(angle)*r,y:y+Math.sin(angle)*r});}return this;}};
 traceCapsuleCross(graphics,0,0,radius,width);return points;
}
function inside(points,x,y){
 let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;
 }return yes;
}

test('capsule cross has one closed continuous outline and includes all four round end caps',()=>{
 const shape=capsuleCrossContour(310,74);assert.equal(shape,capsuleCrossContour(310,74));assert(Object.isFrozen(shape));
 assert.deepEqual(shape.bounds,{minX:-347,minY:-347,maxX:347,maxY:347});
 assert(Math.abs(shape.length-(8*(310-37)+4*Math.PI*37))<1e-8);
 const points=outline(310,74);assert(Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<1e-8);
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
  assert(inside(points,dx*346.99,dy*346.99),'red rounded cap includes its proper inner edge');
  assert(!inside(points,dx*347.01,dy*347.01),'red fill stops at capsule edge');
 }
});

test('cross red fill and existing hit rule agree at arm interiors, rounded caps and safe diagonals',()=>{
 const points=outline(310,74),mark={shape:'cross',x:0,y:0,radius:310,width:74};
 for(const [x,y,hit]of [[350,0,false],[346.9,0,true],[330,20,true],[330,34,false],[200,36.9,true],[200,37.1,false],[200,200,false],[-200,-200,false]]){
  assert.equal(inside(points,x,y),hit,`paint ${x},${y}`);assert.equal(forecastHits({x,y},mark,0),hit,`rule ${x},${y}`);
 }
 // With the real player's 18-unit disc, it is safe only beyond cap + radius.
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
  assert(forecastHits({x:dx*364.99,y:dy*364.99},mark));
  assert(!forecastHits({x:dx*365.01,y:dy*365.01},mark));
 }
});

test('progress traverses that same contour, not an unrelated outer circle',()=>{
 const shape=capsuleCrossContour(310,74);let last;
 const g={moveTo(x,y){last={x,y};return this;},lineTo(x,y){last={x,y};return this;},drawArc(x,y,r,a,b){last={x:x+Math.cos(b)*r,y:y+Math.sin(b)*r};return this;}};
 traceCapsuleCross(g,20,30,310,74,0);assert.equal(last,undefined);
 traceCapsuleCross(g,20,30,310,74,.5);
 assert(Math.hypot(last.x-20,last.y-(30+347))<1e-7,'half progress reaches the opposite south cap');
 traceCapsuleCross(g,20,30,310,74,1);assert(Math.hypot(last.x-20,last.y-(30-347))<1e-7);
 assert(shape.length>0);
});
