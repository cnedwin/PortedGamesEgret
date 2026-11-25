import { Mesh3D, Skeleton3D } from '@egret/engine/world3d';

/** Each fighter poses its own nodes while the geometry and materials belong to the template. */
export function cloneFigureScene(source) {
  const nodes = new Map();
  function cloneNode(node) {
    const copy = node.clone(false);
    nodes.set(node, copy);
    for (const child of node.children) copy.addChild(cloneNode(child));
    return copy;
  }

  const scene = cloneNode(source);
  const skeletons = new Map();
  for (const [node, copy] of nodes) {
    if (!(node instanceof Mesh3D) || !node.skeleton) continue;
    const original = node.skeleton;
    if (!skeletons.has(original)) {
      const bones = original.bones.map(bone => nodes.get(bone));
      skeletons.set(original, new Skeleton3D(bones, original.inverseBindMatrices));
    }
    copy.bind(skeletons.get(original), node.bindMatrix);
  }
  return scene;
}
