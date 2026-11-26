// Render-only staging. Coordinates fit one battle hex and never alter collision,
// formation modifiers, RNG, attack timing, or the campaign snapshot.
export function formationSlots(formation, count) {
  count = Math.max(0, Math.min(24, Math.floor(count)));
  if (!count) return [];
  if (count === 1) return [[0, 0]];
  const points = [];
  if (formation === 'arrowhead' || formation === 'fishscale') {
    for (let row = 0; points.length < count; row++) {
      const width = formation === 'arrowhead' ? row * 2 + 1 : [1, 3, 5, 5, 3, 1][row % 6];
      for (let c = 0; c < width && points.length < count; c++) points.push([c - (width - 1) / 2, -row * .95]);
    }
  } else if (formation === 'craneswing' || formation === 'crescent') {
    const columns = Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      const x = i % columns - (columns - 1) / 2;
      points.push([x, (formation === 'craneswing' ? -.5 : .6) * Math.abs(x) - Math.floor(i / columns) * 1.05]);
    }
  } else {
    const columns = formation === 'longsnake' || formation === 'yoke' ? 2 : formation === 'geese' ? 6 : Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / columns), column = i % columns;
      points.push([(column - (columns - 1) / 2) * (formation === 'yoke' ? 2.5 : 1) + (formation === 'geese' ? row % 2 * .35 : 0), -row * (formation === 'geese' ? 1.35 : 1)]);
    }
  }
  const cx = points.reduce((sum,p) => sum + p[0], 0) / count, cz = points.reduce((sum,p) => sum + p[1], 0) / count;
  let radius = 0;
  for (const p of points) {p[0] -= cx; p[1] -= cz; radius = Math.max(radius, Math.hypot(...p));}
  const scale = Math.min(.6, 1.45 / Math.max(.01, radius));
  return points.map(([x,z]) => [x * scale, z * scale]);
}

/** A real attack can be presented once even if a unit's ordinary cooldown resets. */
export function freshAttack(unit, previous) {
  const attack = unit.lastAttack;
  if (!attack || !Number.isFinite(attack.time) || !Number.isInteger(attack.target)) return null;
  const stamp = attack.time + ':' + attack.target + ':' + attack.kind;
  return stamp === previous ? null : {unit: unit.id, target: attack.target, kind: attack.kind, t: attack.time, stamp};
}

/** Ground-plane framing at the stage's real 38-degree FOV; include plate height. */
export function battleCameraFrame(points, field) {
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minZ=Math.min(...points.map(p=>p.z)),maxZ=Math.max(...points.map(p=>p.z));
  const width=Math.max(160,field.right-field.left),height=Math.max(110,field.bottom-field.top),tan=Math.tan(19*Math.PI/180);
  const distance=Math.max(42,Math.min(260,Math.max((maxX-minX+8)*field.height/(2*tan*width),(maxZ-minZ+10)*.85*field.height/(2*tan*height))*1.2));
  const pitch=(64-22*(1-(distance-20)/280)**1.6)*Math.PI/180;
  const pixels=field.height/(2*distance*tan);
  return {x:(minX+maxX)/2+(field.width/2-(field.left+field.right)/2)/pixels,z:(minZ+maxZ)/2+(field.height/2-(field.top+field.bottom)/2)/(pixels*Math.sin(pitch)),distance};
}

/** Only the opt-in Nanpi scene borrows the realm's lighting, then restores it. */
export function createSiegeLighting(stage, sunset) {
  if (!stage) return {update() {}, dispose() {}};
  const {sun,sky,haze,scene} = stage;
  const lights = [sun,sky].filter(Boolean).map(light => ({light, color:[...light.color], groundColor:[...light.groundColor], intensity:light.intensity, position:[...light.position], quaternion:[...light.quaternion]}));
  const oldHaze = haze ? [...haze] : null;
  const oldScene = scene ? {background:scene.background, environment:scene.environment, environmentIntensity:scene.environmentIntensity} : null;
  const post = stage.app?.quality !== 'low' ? stage.app?.renderer?.postProcess : null;
  const oldPost = post ? {bloomIntensity:post.bloomIntensity, contrast:post.contrast, saturation:post.saturation, vignette:post.vignette} : null;
  let disposed = false;
  if (scene && sunset) {scene.background = sunset; scene.environment = sunset; scene.environmentIntensity = .22;}
  if (haze) haze.splice(0,3,.59,.49,.41);
  if (sun) {sun.color.set([1,.72,.46]); sun.intensity=2.35;}
  if (sky) {sky.color.set([.57,.64,.78]); sky.groundColor.set([.38,.29,.21]); sky.intensity=.48;}
  if (post) Object.assign(post,{bloomIntensity:.28,contrast:1.1,saturation:1.02,vignette:.2});
  return {
    update(centre, ground) {
      if (disposed || !sun) return;
      sun.setPosition(centre.x-120,ground+75,centre.z+110);
      sun.lookAt(centre.x,ground,centre.z);
    },
    dispose() {
      if (disposed) return; disposed=true;
      for (const state of lights) {state.light.color.set(state.color); state.light.groundColor.set(state.groundColor); state.light.intensity=state.intensity; state.light.setPosition(...state.position); state.light.setQuaternion(...state.quaternion);}
      if (oldHaze) haze.splice(0,3,...oldHaze);
      if (oldScene) Object.assign(scene,oldScene);
      if (oldPost) Object.assign(post,oldPost);
    }
  };
}
