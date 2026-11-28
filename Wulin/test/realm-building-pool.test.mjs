import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'node:module';
import { createHash } from 'node:crypto';
register('../tools/egret-resolve.mjs', import.meta.url);
const { createBuilding, createRealmBuildingPool } = await import('../src/view/buildings.mjs');
const { SECTS } = await import('../src/data/sects.mjs');
const hash=a=>a?createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex'):null;
const attr=a=>a&&[a.data.constructor.name,a.itemSize,a.normalized,a.dynamic,hash(a.data)];
function shape(g){return g&&[g.topology,g.vertexCount,g.groups,[...g.attributes].map(([name,a])=>[name,attr(a)]),attr(g.index)];}
function collect(node){const rows=[];node.traverse(n=>rows.push(n));return rows;}
function state(n){return {type:n.type,position:[...n.position],scale:[...n.scale],rotation:[...n.quaternion],visible:n.visible,layers:n.layers,renderOrder:n.renderOrder,castShadow:n.castShadow,receiveShadow:n.receiveShadow,frustumCulled:n.frustumCulled,cullDistance:n.cullDistance,pickable:n.pickable,children:n.children.length,geometry:shape(n.geometry),smoke:n.smoke};}

test('realm building templates keep all original geometry bytes, materials and per-style render state',()=>{
  const make=createRealmBuildingPool();
  for(const style of [null,...SECTS.map(s=>s.id)])for(const kind of ['hall','gate','library','tower','dorm']){
    const level=kind==='hall'?3:2,original=collect(createBuilding(kind,level,style)),one=collect(make(kind,level,style)),two=collect(make(kind,level,style));
    assert.equal(one.length,original.length);assert.equal(two.length,original.length);
    for(let i=0;i<one.length;i++){
      assert.deepEqual(state(one[i]),state(original[i]),`${style}:${kind}:${i}`);
      assert.deepEqual(state(two[i]),state(original[i]));
      assert.notEqual(one[i],two[i]);assert.notEqual(one[i].position,two[i].position);
      if(one[i].geometry){assert.equal(one[i].geometry,two[i].geometry);assert.equal(one[i].material,original[i].material);}
    }
    one[0].setPosition(23,5,-12);one[0].setScale(.2);one[0].setRotation(0,.4,0);one[1].visible=false;
    assert.deepEqual(state(two[0]),state(original[0]));assert.deepEqual(state(two[1]),state(original[1]));
  }
});

test('separate realm pools do not exchange ownership or geometry lifetime',()=>{
  const a=createRealmBuildingPool(),b=createRealmBuildingPool();
  const first=collect(a('hall',3,'shaolin')),second=collect(b('hall',3,'shaolin'));
  assert.notEqual(first.find(n=>n.geometry).geometry,second.find(n=>n.geometry).geometry);
  assert.deepEqual(first.map(state),second.map(state));
});
