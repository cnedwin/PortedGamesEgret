// Continuous, locally weighted skin for the authored static figures. The source GLBs contain no motion capture.
import {
  Attribute3D, Bone3D, Mesh3D, Object3D, Skeleton3D, mat4Compose, mat4Multiply, vec3TransformMat4,
} from '@egret/engine/world3d';

const ZERO = [0, 0, 0], ONE = [1, 1, 1], IDENTITY = [0, 0, 0, 1];
const cache = new WeakMap();
const PROFILE = {
  rifle: { shoulder: [.13, .767], elbow: [.29, .752], wrist: [.445, .735] },
  rush: { shoulder: [.13, .79], elbow: [.285, .775], wrist: [.405, .765] },
  heavy: { shoulder: [.217, .767], elbow: [.335, .57], wrist: [.345, .37] },
};
// Source rifle landmarks, in its preserved model coordinates. All enemy roles
// currently share this rifle; the visual transform never changes ballistic rays.
export function soldierWeaponHold(model) {
  const b=model.bounds, scale=.8/(b[5]-b[2]);
  const position=[.04-(b[0]+b[3])*.5*scale, 1.12-b[1]*scale, -.37-(b[2]+b[5])*.5*scale];
  const at=point=>point.map((v,i)=>v*scale+position[i]);
  return {transform:{scale,position:[position[0],position[1]-1.4,position[2]]},
    palms:[at([-.02269963,.24919644,-.09545191]),at([-.00190891,.17792905,.26791168])]};
}
const smooth = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = a => Math.hypot(...a);
const addScaled = (a, b, scale) => a.map((v, i) => v + b[i] * scale);
const unit = a => a.map(v => v / Math.max(length(a), 1e-12));
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function rotation(from, to) {
  const a = unit(from), b = unit(to), xyz = cross(a, b);
  const q = [...xyz, 1 + dot(a, b)], size = Math.hypot(...q);
  if (size < 1e-8) return [0, 1, 0, 0];
  return q.map(v => v / size);
}
function multiply(a, b) {
  return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
}
function segment(point, a, b) {
  const delta = subtract(b, a), t = Math.max(0, Math.min(1, dot(subtract(point, a), delta) / dot(delta, delta)));
  return { t, distance: length(subtract(point, addScaled(a, delta, t))) };
}

// Hanging gauntlets and hip pouches overlap in front-view coordinates. Propagate
// ownership over the actual surface, including welded UV seams, once at boot.
function hangingSleeves(geometry, bind) {
  const raw=geometry.getAttribute('position').data, count=raw.length/3, points=new Float32Array(raw.length);
  const neighbors=Array.from({length:count},()=>[]), welded=new Map(), p=new Float32Array(3);
  const connect=(a,b,d)=>{neighbors[a].push(b,d);neighbors[b].push(a,d);};
  for(let i=0;i<count;i++) {
    vec3TransformMat4(p,raw.subarray(i*3,i*3+3),bind);points.set(p,i*3);
    const key=Array.from(p,v=>Math.round(v*100000)).join('/'), same=welded.get(key);
    if(same!==undefined)connect(i,same,0);else welded.set(key,i);
  }
  const indices=geometry.index?.data??Uint32Array.from({length:count},(_,i)=>i);
  for(let at=0;at<indices.length;at+=3)for(let edge=0;edge<3;edge++) {
    const a=indices[at+edge],b=indices[at+(edge+1)%3];
    connect(a,b,Math.hypot(points[a*3]-points[b*3],points[a*3+1]-points[b*3+1],points[a*3+2]-points[b*3+2]));
  }
  const distance=seed=>{
    const distances=new Float64Array(count).fill(Infinity), ids=[], values=[];
    const push=(id,value)=>{
      let at=ids.length;ids.push(id);values.push(value);
      while(at>0){const parent=(at-1)>>1;if(values[parent]<=value)break;ids[at]=ids[parent];values[at]=values[parent];at=parent;}
      ids[at]=id;values[at]=value;
    };
    for(let i=0;i<count;i++)if(seed(points[i*3]/1.78,points[i*3+1]/1.78)){distances[i]=0;push(i,0);}
    while(ids.length){
      const id=ids[0],value=values[0],lastId=ids.pop(),lastValue=values.pop();
      if(ids.length){let at=0;while(at*2+1<ids.length){let child=at*2+1;if(child+1<ids.length&&values[child+1]<values[child])child++;if(values[child]>=lastValue)break;ids[at]=ids[child];values[at]=values[child];at=child;}ids[at]=lastId;values[at]=lastValue;}
      if(value>distances[id])continue;
      const adjacent=neighbors[id];
      for(let i=0;i<adjacent.length;i+=2){const next=adjacent[i],candidate=value+adjacent[i+1];if(candidate<distances[next]){distances[next]=candidate;push(next,candidate);}}
    }
    return distances;
  };
  const torso=distance((x,y)=>Math.abs(x)<.18||y<.24);
  return [-1,1].map(side=>{
    const arm=distance((x,y)=>x*side>.34&&y>.25&&y<.82);
    return Float32Array.from(arm,(value,i)=>smooth(-.06,.06,torso[i]-value));
  });
}

/** Preserve each complete source surface and its UVs. Only four normalised bone influences are added. */
export function prepareSoldierSkin(model, kind) {
  const existing = cache.get(model);
  if (existing) return existing;
  const height = 1.78, scale = height / (model.bounds[4] - model.bounds[1]);
  const profile = PROFILE[kind] ?? PROFILE.rifle;
  const arms = [-1, 1].map(side => ({
    side, shoulder: [side*profile.shoulder[0]*height, profile.shoulder[1]*height, 0],
    elbow: [side*profile.elbow[0]*height, profile.elbow[1]*height, 0],
    wrist: [side*profile.wrist[0]*height, profile.wrist[1]*height, 0],
    handAxis: kind==='heavy' ? unit([side*.15,-1,0]) : [side,0,0],
    knuckle: kind==='heavy' ? .11 : .07,
  }));
  // Ground, pelvis, head, two thighs and two shins, shoulder carrier, then both three-bone arms.
  const transforms = mat4Compose(new Float32Array(16), [0, -model.bounds[1]*scale, 0], IDENTITY, [scale, scale, scale]);
  const point = new Float32Array(3), vertex = new Float32Array(3);
  const pieces = model.meshes.map(source => {
    if (source.material.normalMap && source.geometry.getAttribute('uv') && !source.geometry.getAttribute('tangent')) {
      source.geometry.computeTangents();
    }
    const bind = mat4Multiply(new Float32Array(16), transforms, source.matrix);
    const bakedJoints=source.geometry.getAttribute('joints'),bakedWeights=source.geometry.getAttribute('weights');
    if(bakedJoints || bakedWeights) {
      const count=source.geometry.vertexCount*4;
      if(!bakedJoints||!bakedWeights||bakedJoints.itemSize!==4||bakedWeights.itemSize!==4||
        bakedJoints.data.length!==count||bakedWeights.data.length!==count)throw Error('Incomplete authored soldier skin');
      for(let i=0;i<count;i+=4){
        let sum=0;
        for(let slot=0;slot<4;slot++){
          const joint=bakedJoints.data[i+slot],weight=bakedWeights.data[i+slot];
          if(!Number.isInteger(joint)||joint<0||joint>=16||!Number.isFinite(weight)||weight<0||weight>1)throw Error('Invalid authored soldier skin');
          sum+=weight;
        }
        if(Math.abs(sum-1)>1e-5)throw Error('Unnormalised authored soldier skin');
      }
      // Shipping GLBs contain the exact GPU-reviewed weights; no graph search or
      // vertex-weight inference runs on the phone. Keep the source attributes.
      return {...source,bind};
    }
    const sleeves=kind==='heavy' ? hangingSleeves(source.geometry,bind) : undefined;
    const positions = source.geometry.getAttribute('position').data;
    const count = positions.length / 3, joints = new Uint32Array(count * 4), weights = new Float32Array(count * 4);
    const influence = new Float64Array(16);
    for (let index = 0; index < count; index++) {
      influence.fill(0);
      vertex.set(positions.subarray(index*3, index*3+3));
      vec3TransformMat4(point, vertex, bind);
      const y = point[1] / height, x = point[0] / height;
      const leg = 1 - smooth(.45, .55, y), left = 1 - smooth(-.025, .025, x), shin = 1 - smooth(.225, .29, y);
      influence[3] = leg * left * (1-shin); influence[4] = leg * left * shin;
      influence[5] = leg * (1-left) * (1-shin); influence[6] = leg * (1-left) * shin;
      const head = smooth(.79, .86, y) * (1-smooth(.12, .18, Math.abs(x)));
      influence[2] = (1-leg) * head;
      influence[1] = (1-leg) * (1-head);
      for (let side = 0; side < arms.length; side++) {
        const arm = arms[side];
        if (point[0] * arm.side < 0) continue;
        const upper = segment(point, arm.shoulder, arm.elbow), lower = segment(point, arm.elbow, arm.wrist);
        const l1 = length(subtract(arm.elbow, arm.shoulder)), l2 = length(subtract(arm.wrist, arm.elbow));
        const along = upper.distance < lower.distance ? upper.t*l1 : l1+lower.t*l2;
        const radius = (kind === 'heavy' ? .14 : .11) * height;
        // Loose sleeves extend well beyond a centre-line capsule. Keep that whole
        // cloth envelope on its arm; only the shoulder root blends into the torso.
        const envelope = smooth(.115,.19,Math.abs(x))*smooth(.53,.60,y)*(1-smooth(.875,.92,y));
        const capsule = (1-smooth(radius*.65, radius, Math.min(upper.distance,lower.distance))) *
          smooth(profile.shoulder[0]*.78, profile.shoulder[0]*1.12, Math.abs(x));
        const membership = sleeves ? sleeves[side][index] : Math.max(envelope, capsule);
        if (membership <= 0) continue;
        for (let bone=0; bone<8; bone++) influence[bone] *= 1-membership;
        const fore = smooth(l1-.05*height, l1+.05*height, along);
        const hand = smooth(l1+l2-.035*height, l1+l2+.015*height, along);
        const start = 8+side*3;
        influence[start] = membership*(1-fore);
        influence[start+1] = membership*fore*(1-hand);
        const fingertip=kind==='heavy' ? 0 : smooth(.045,.075,dot(subtract(point,arm.wrist),arm.handAxis));
        influence[start+2] = membership*fore*hand*(1-fingertip);
        influence[14+side] = membership*fore*hand*fingertip;
      }
      let total = 0;
      for (let slot=0; slot<4; slot++) {
        let best = 0;
        for (let bone=1; bone<influence.length; bone++) if (influence[bone] > influence[best]) best = bone;
        joints[index*4+slot] = best; weights[index*4+slot] = Math.max(0, influence[best]);
        total += weights[index*4+slot]; influence[best] = -1;
      }
      for (let slot=0; slot<4; slot++) weights[index*4+slot] /= total;
    }
    source.geometry.setAttribute('joints', new Attribute3D(joints, 4));
    source.geometry.setAttribute('weights', new Attribute3D(weights, 4));
    return { ...source, bind };
  });
  const prepared = { pieces, arms, kind };
  cache.set(model, prepared);
  return prepared;
}

function poseArm(bones, arm, target, palmDirection) {
  const a = arm.shoulder, first = subtract(arm.elbow,a), second = subtract(arm.wrist,arm.elbow);
  const l1 = length(first), l2 = length(second), toward = subtract(target,a), axis = unit(toward);
  const distance = Math.max(Math.abs(l1-l2)+1e-4, Math.min(l1+l2-1e-4,length(toward)));
  const along = (l1*l1-l2*l2+distance*distance)/(2*distance), height = Math.sqrt(Math.max(0,l1*l1-along*along));
  const pole = [arm.side,-.55,.15], projected = unit(addScaled(pole,axis,-dot(pole,axis)));
  const elbow = addScaled(addScaled(a,axis,along),projected,height), wrist = addScaled(a,axis,distance);
  const upper = rotation(first,subtract(elbow,a)), lower = rotation(second,subtract(wrist,elbow));
  bones[0].setQuaternion(...upper);
  bones[1].setQuaternion(...multiply([-upper[0],-upper[1],-upper[2],upper[3]],lower));
  // Aim the actual palm toward the measured grip, independently of the elbow.
  const hand=rotation(arm.handAxis,palmDirection);
  bones[2].setQuaternion(...multiply([-lower[0],-lower[1],-lower[2],lower[3]],hand));
}

/** One independent bone palette per actor; source geometry and PBR material stay shared across the crowd. */
export function createSoldierSkin(prepared, bulk, palms = [[.02145,1.3236,-.4480],[.03844,1.2654,-.1511]]) {
  const root = new Object3D(), body = new Object3D();root.addChild(body);
  const bone = (name,parent,at) => { const b=new Bone3D();b.name=name;b.setPosition(...at);parent.addChild(b);return b; };
  const ground = bone('skin-ground',body,ZERO), upper = bone('skin-pelvis',ground,[0,.9,0]);
  const head = bone('skin-head',upper,[0,.62,0]);
  const legs = [-1,1].map((side,index) => {
    const thigh=bone('skin-thigh-'+index,ground,[side*.1*bulk,.9,0]);
    return {thigh,shin:bone('skin-shin-'+index,thigh,[0,-.44,0])};
  });
  const shoulders = bone('skin-shoulders',upper,[0,.5,0]);
  const armBones = prepared.arms.map((arm,index) => {
    const upperArm=bone('skin-upper-arm-'+index,shoulders,subtract(arm.shoulder,[0,1.4,0]));
    const forearm=bone('skin-forearm-'+index,upperArm,subtract(arm.elbow,arm.shoulder));
    const hand=bone('skin-hand-'+index,forearm,subtract(arm.wrist,arm.elbow));
    return [upperArm,forearm,hand];
  });
  const fingers=prepared.arms.map((arm,index)=>bone('skin-grip-fingers-'+index,armBones[index][2],arm.handAxis.map(v=>v*arm.knuckle)));
  root.updateWorldMatrices(true);
  const skeleton = new Skeleton3D([ground,upper,head,legs[0].thigh,legs[0].shin,legs[1].thigh,legs[1].shin,shoulders,...armBones.flat(),...fingers]);
  for(const source of prepared.pieces){
    const mesh = new Mesh3D(source.geometry,source.material);mesh.name='soldier-'+prepared.kind+'/continuous-body';
    mesh.castShadow=mesh.receiveShadow=true;mesh.bind(skeleton,source.bind);root.addChild(mesh);
  }
  const directions=[[.9,.3,-.1],[-.95,-.15,-.1]].map(unit);
  const reach=prepared.kind==='heavy' ? .095 : .055;
  for(let side=0;side<2;side++) {
    const wrist=addScaled(palms[side],directions[side],-reach);
    poseArm(armBones[side],prepared.arms[side],wrist,directions[side]);
    if(prepared.kind!=='heavy') {
      const curl=side===0 ? -.95 : -1.25;
      fingers[side].setQuaternion(0,0,Math.sin(curl/2),Math.cos(curl/2));
    }
  }
  return {root,body,upper,head,shoulders,legs,skeleton};
}
