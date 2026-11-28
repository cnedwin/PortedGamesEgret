import assert from 'node:assert/strict';
import test from 'node:test';
import {groundDetail, roadTints} from '../src/view/environment-detail.mjs';

const arenas={county:18,peach:18,bamboo:17.5,snow:18,palace:18,pass:23,depot:23,citadel:23};
const assertMesh=(mesh,maxTriangles)=>{
  const n=mesh.positions.length/3;
  assert(Number.isInteger(n)&&n>0);
  assert.equal(mesh.colors.length,n*3);
  assert(mesh.positions.every(Number.isFinite));assert(mesh.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
  assert.equal(mesh.indices.length%3,0);assert(mesh.indices.length/3<=maxTriangles);
  assert(mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<n));
  for(let i=0;i<mesh.indices.length;i+=3){
    const [a,b,c]=[...mesh.indices.slice(i,i+3)].map(k=>[...mesh.positions.slice(k*3,k*3+3)]);
    // Every triangle faces upwards; the original flat surface remains a top-facing mesh.
    assert((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>0,'winding/degenerate triangle');
  }
};

test('ground macro variation is deterministic, flat, seamless and retains metre UVs at every quality',()=>{
  for(const [name,radius] of Object.entries(arenas))for(const quality of ['low','medium','high']){
    const mesh=groundDetail(name,radius,quality);
    assert.deepEqual(mesh,groundDetail(name,radius,quality));assertMesh(mesh,1500);
    assert.equal(mesh.normals.length,mesh.positions.length);assert.equal(mesh.uvs.length,mesh.positions.length/3*2);
    assert(mesh.colors.some(c=>c<.90));assert(mesh.colors.every(c=>c>=.67));
    let minimum=800,maximum=-800;const central=[];
    for(let i=0,j=0;i<mesh.positions.length;i+=3,j+=2){
      const [x,y,z]=mesh.positions.slice(i,i+3);
      assert.equal(y,0);assert.deepEqual([...mesh.normals.slice(i,i+3)],[0,1,0]);
      assert(Math.abs(mesh.uvs[j]-(x+800))<1e-4);assert(Math.abs(mesh.uvs[j+1]-(800-z))<1e-4);
      minimum=Math.min(minimum,x,z);maximum=Math.max(maximum,x,z);
      if(Math.hypot(x,z)<radius)central.push(mesh.colors[i]);
    }
    assert.deepEqual([minimum,maximum],[-800,800]);
    assert(Math.max(...central)-Math.min(...central)>.035,`${name} macro variation visible`);
  }
});

test('road tints retain a bounded strip, deterministic weathering and a readable centre',()=>{
  for(const name of ['bamboo','pass','depot','citadel']){
    const a=roadTints(name,4,16);assert.deepEqual(a,roadTints(name,4,16));assert.equal(a.length,5*17*3);
    assert(a.every(c=>Number.isFinite(c)&&c>=.68&&c<=1));
    const midpoint=8*5*3;assert(a[midpoint+2*3]>a[midpoint],`${name} centre differs from shoulder`);
  }
});
