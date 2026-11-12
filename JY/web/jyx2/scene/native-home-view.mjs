import { quatFromAxisAngle, quatMultiply } from '@egret/engine/world3d';
import { homeOpeningAnimation } from '../home3d-actors/opening-animation.mjs';
import { createNativeHomeExit } from '../home3d/native-exit-effect.mjs';
import { createNativeSceneView } from './native-inn-view.mjs';

const axes = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function resolveActor(person, spec) {
  const anchor = spec.anchors?.[person.anchor]?.position;
  return { position: anchor, ...homeOpeningAnimation(person.animation) };
}

function prepareProps(environment, spec) {
  const props = new Map();
  const nodes = new Map();
  environment.scene.traverse(node => { if (!nodes.has(node.name)) nodes.set(node.name, node); });
  for (const { slot, node, lid, openAxis, openAngle } of spec.props ?? []) {
    const object = nodes.get(node);
    const hinge = nodes.get(lid);
    const axis = axes[openAxis];
    if (!object || !hinge || !axis || !Number.isFinite(openAngle)) continue;
    const closed = hinge.quaternion.slice();
    const rotation = quatFromAxisAngle(new Float32Array(4), axis, openAngle);
    const opened = quatMultiply(new Float32Array(4), closed, rotation);
    props.set(slot, { object, hinge, closed, opened });
  }

  return {
    slots: [...props.keys()],
    update(events = []) {
      const openedSlots = [];
      for (const entry of events) {
        const prop = props.get(entry.slot);
        if (!prop) continue;
        prop.event = entry;
        prop.object.visible = entry.currentPic > 0;
        const open = entry.event1 <= 0;
        if (prop.open !== open) {
          prop.hinge.setQuaternion(...(open ? prop.opened : prop.closed));
          prop.open = open;
        }
        if (open && prop.object.visible) openedSlots.push(entry.slot);
      }
      return openedSlots;
    },
    pick({ ray }) {
      let nearest;
      let distance = Infinity;
      for (const { object, event } of props.values()) {
        if (!object.visible || !(event?.event1 > 0)) continue;
        const hit = ray.intersect(object, { firstHitOnly: true })[0];
        if (!hit || hit.distance >= distance) continue;
        distance = hit.distance;
        nearest = { x: event.x, y: event.y };
      }
      return nearest;
    },
  };
}

export function createNativeHomeView(viewport, overlay, options) {
  return createNativeSceneView(viewport, overlay, options, {
    sceneId: 70, classKey: 'home3d', assetDirectory: '/jyx2/home3d/', manifest: 'scene.json',
    actorDirectory: '/jyx2/home3d-actors/', modelIds: ['0', 'doll'], terrainEdge: false, requireInstancing: true,
    resolveActor, prepareProps, createExitEffect: createNativeHomeExit,
  });
}
