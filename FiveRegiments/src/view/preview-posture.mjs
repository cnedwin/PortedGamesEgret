// Character-selection presentation only. Keep the captured pose and lower-body contacts, then lift the
// chest and head using actual retargeted bone coordinates (not per-model magic Euler angles).
import {qinv,qrot,sub} from './rig.mjs';
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export function createPreviewPosture(rig){
  // Each rig has its own local head orientation. Use the generated model's original forward direction.
  const headForward=rig.bone('head')?qrot(qinv(rig.world('head').r),rig.dirToRig([0,0,1])):null;
  const torso=()=>sub(rig.toBody(rig.world('neck_01').t),rig.toBody(rig.world('pelvis').t));
  const gaze=()=>rig.dirToBody(qrot(rig.world('head').r,headForward));
  const pitch=v=>Math.atan2(v[2],Math.max(1e-6,v[1]));
  const gazePitch=v=>Math.atan2(v[1],Math.hypot(v[0],v[2]));
  const gazeYaw=v=>Math.atan2(v[0],v[2]);
  return function upright(mounted=false){
    if(!headForward||!rig.bone('neck_01')||!rig.bone('pelvis'))return;
    // Keep a small natural forward inclination, slightly more when seated. Correct the lower trunk first,
    // then the residual arch up the chain, without rotating the pelvis, legs or holder.
    const target=mounted?.065:.04;
    for(const [bone,limit,share] of [['spine_01',.405,1.15],['spine_03',.16,1.30],['spine_05',.09,1.6]]){
      const current=torso();
      const lift=clamp((target-pitch(current))*share,-limit,limit);
      const center=clamp(Math.atan2(current[0],Math.max(1e-6,current[1]))*.28,-.06,.06);
      rig.bend(bone,0,lift,center);
    }
    // Near-level gaze with a slight lift. Follow the remaining measured error rather than adding a fixed
    // angle on top of all those spine rotations. Both rotations are bounded to natural neck/head ranges.
    const desired=.045;
    let v=gaze();
    rig.bend('neck_01',clamp(-gazeYaw(v)*.65,-.13,.13),clamp((gazePitch(v)-desired)*.7,-.18,.18));
    v=gaze();
    rig.bend('head',clamp(-gazeYaw(v),-.12,.12),clamp(gazePitch(v)-desired,-.15,.15));
  };
}
