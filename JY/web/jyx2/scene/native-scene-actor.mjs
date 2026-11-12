import { AnimationMixer3D, Mesh3D, Skeleton3D } from '@egret/engine/world3d';

const linear = values => values.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);

// A normal node clone shares resources. Each animated guest needs its own bone transforms.
export function cloneNativeSceneActor(asset, tint, tints) {
  const cloned = asset.scene.clone();
  const nodes = new Map();
  const skeletons = new Map();
  const color = tint === undefined ? undefined : linear([tint >> 16, tint >> 8 & 255, tint & 255].map(value => value / 255));
  function recolor(source) {
    if (!tints.has(source)) tints.set(source, new Map());
    const variants = tints.get(source);
    if (!variants.has(tint)) {
      const material = source.clone();
      color.forEach((value, i) => { material.color[i] *= value; });
      variants.set(tint, material);
    }
    return variants.get(tint);
  }
  function pair(original, copy) {
    nodes.set(original, copy);
    original.children.forEach((child, i) => pair(child, copy.children[i]));
  }
  pair(asset.scene, cloned);
  let bones = 0;
  for (const [node, copy] of nodes) {
    if (!(node instanceof Mesh3D)) continue;
    if (color) copy.material = Array.isArray(node.material) ? node.material.map(recolor) : recolor(node.material);
    if (!node.skeleton) continue;
    const skin = node.skeleton;
    if (!skeletons.has(skin)) {
      const joints = skin.bones.map(bone => nodes.get(bone));
      if (joints.some(joint => !joint)) throw Error('A native actor has a joint outside its glTF scene.');
      skeletons.set(skin, new Skeleton3D(joints, skin.inverseBindMatrices));
      bones += joints.length;
    }
    copy.bind(skeletons.get(skin), node.bindMatrix);
  }
  const mixer = new AnimationMixer3D(cloned);
  const actions = new Map(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  return { cloned, mixer, actions, bones, skins: skeletons.size };
}
