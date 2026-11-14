import { AnimationMixer3D, Bone3D, Mesh3D, Object3D, Skeleton3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createFigureGeometry } from './figure-geometry.mjs';
import { ACTIONS, ACTION_FADE, FADE, clipOf } from './figure-motion.mjs';
import { figureStyle } from './figure-style.mjs';

export { ACTION_NAMES, STRIKE_OF } from './figure-motion.mjs';

// Color planes carry the seams and shaded folds at a distance. A fine grid
// sampled over the face and the edges of the hems would shimmer in the arena.
const COSTUME = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: .86, metallic: 0 });

function createRig(w) {
  const bones = [];
  const bone = (name, parent, x, y, z) => {
    const node = new Bone3D();
    node.name = name;
    node.setPosition(x, y, z);
    node.index = bones.length;
    bones.push(node);
    parent?.addChild(node);
    return node;
  };
  const body = bone('hips', null, 0, .92, 0);
  const chest = bone('chest', body, 0, .1, 0);
  const head = bone('head', chest, 0, .5, 0);
  const armL = { shoulder: bone('shoulderL', chest, .2 * w, .4, 0) };
  const armR = { shoulder: bone('shoulderR', chest, -.2 * w, .4, 0) };
  armL.elbow = bone('elbowL', armL.shoulder, 0, -.29, 0);
  armR.elbow = bone('elbowR', armR.shoulder, 0, -.29, 0);
  const grip = bone('grip', armR.elbow, 0, -.31, .02);
  const legL = { hip: bone('legL', body, .09 * w, -.02, 0) };
  const legR = { hip: bone('legR', body, -.09 * w, -.02, 0) };
  legL.knee = bone('kneeL', legL.hip, 0, -.45, 0);
  legR.knee = bone('kneeR', legR.hip, 0, -.45, 0);
  const clothFront = bone('clothFront', body, 0, -.10, .11);
  const clothBack = bone('clothBack', body, 0, -.10, -.11);
  return { bones, body, chest, head, armL, armR, grip, legL, legR, clothFront, clothBack };
}

/** A single skinned mesh, including the face, robe, accessories and equipped weapon. */
export function createFigure({ color = 0x5b6c8a, school, female = false, rank = 1, weapon = null, monk = false, age, seed = 1, portraitId, quality = 'medium' } = {}) {
  const style = figureStyle({ color, school, female, rank, monk, age, seed, portraitId });
  const node = new Object3D();
  const rig = createRig(style.w);
  rig.body.updateWorldMatrices();
  const mesh = new Mesh3D(createFigureGeometry(style, rig, weapon, quality), COSTUME);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  node.addChild(mesh);
  mesh.addChild(rig.body);
  mesh.updateWorldMatrices();
  mesh.bind(new Skeleton3D(rig.bones));
  node.setScale(style.height);

  const mixer = new AnimationMixer3D(node);
  let playing = null;
  const start = (name) => {
    const spec = ACTIONS[name];
    const next = mixer.clipAction(clipOf(name));
    next.loop = spec.length === undefined ? 'repeat' : 'once';
    next.clampWhenFinished = true;
    if (!playing || playing === next || playing.paused) {
      // A repeated move starts again at its anticipation pose.
      if (playing && playing !== next) playing.stop();
      next.reset().play();
    } else playing.crossFadeTo(next, ACTION_FADE[name] ?? FADE);
    playing = next;
  };
  const figure = {
    node, mesh, bones: rig.bones, height: style.height,
    action: 'idle',
    time: 0,
    /** Another action to return to when a one-off finishes. */
    base: 'idle',
    play(name, { base } = {}) {
      if (!ACTIONS[name]) return;
      if (base) figure.base = base;
      if (figure.action === 'down' && name !== 'idle' && name !== 'guard') return;
      if (ACTIONS[name].length === undefined) figure.base = name;
      figure.action = name;
      figure.time = 0;
      start(name);
    },
    get busy() {
      return ACTIONS[figure.action].length !== undefined && figure.time < ACTIONS[figure.action].length;
    },
    update(dt) {
      figure.time += dt;
      const action = ACTIONS[figure.action];
      if (action.length !== undefined && figure.time >= action.length && !action.stay) {
        figure.action = figure.base;
        figure.time = 0;
        start(figure.action);
      }
      mixer.update(dt);
    },
  };
  start('idle');
  mixer.update(0);
  return figure;
}
