import { AnimationMixer3D, Mesh3D, Object3D, quatSlerp } from '@egret/engine/world3d';

export function createNativeStoryContainers(scene, asset) {
  const entries = new Map(), moss = new Map();
  const rotation = new Float32Array(4);
  const chestClip = asset.animations.find(clip => clip.name === 'chest-hinge');

  function tint(model) {
    model.traverse(mesh => {
      if (!(mesh instanceof Mesh3D)) return;
      function aged(source) {
        if (!moss.has(source)) {
          const material = source.clone().setColor(0x73804e);
          material.map = undefined;
          moss.set(source, material);
        }
        return moss.get(source);
      }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(aged) : aged(mesh.material);
    });
  }

  function create({ kind, finish }) {
    const source = ['closed', 'open'].map(state => asset.scene.getObjectByName(`${kind}-${state}`));
    if (!source.every(Boolean)) return;
    const root = scene.addChild(new Object3D());
    const [closed, open] = source.map(model => root.addChild(model.clone()));
    if (finish) root.setScale(1, .70, 1);
    const record = { root, closed, open };
    const template = asset.scene.getObjectByName(`${kind}-hinge`);
    if (template && kind === 'cupboard') {
      const moving = template.clone();
      const lid = moving.getObjectByName('CupboardLid'), opened = open.getObjectByName('CupboardLid');
      if (lid && opened) {
        record.moving = root.addChild(moving);
        record.lid = { node: lid, closed: lid.quaternion.slice(), opened: opened.quaternion.slice() };
        record.duration = .35;
      }
    } else if (template && kind === 'chest' && chestClip) {
      record.moving = root.addChild(template.clone());
      record.mixer = new AnimationMixer3D(record.moving);
      record.action = record.mixer.clipAction(chestClip).play();
      record.action.paused = true;
      record.duration = chestClip.duration;
    }
    if (finish === 'moss') tint(root);
    return record;
  }

  return {
    begin() { for (const entry of entries.values()) if (entry) entry.root.visible = false; },
    draw(key, descriptor, x, y, z, elapsedMs) {
      const id = `${key}:${descriptor.kind}:${descriptor.finish ?? ''}`;
      if (!entries.has(id)) entries.set(id, create(descriptor));
      const entry = entries.get(id);
      if (!entry) return;
      const { root, closed, open, moving, mixer, action, lid, duration } = entry;
      const time = Number.isFinite(elapsedMs) ? elapsedMs : 0;
      if (entry.state !== descriptor.state) {
        entry.startedAt = entry.state === undefined ? undefined : time;
        entry.state = descriptor.state;
      }
      const progress = moving && entry.startedAt !== undefined
        ? Math.max(0, Math.min(1, (time - entry.startedAt) / (duration * 1000))) : 1;
      const animating = progress < 1;
      const opened = entry.state === 'open';
      root.visible = true;
      root.setPosition(x, y, z).setRotation(0, descriptor.rotation, 0);
      closed.visible = !animating && !opened;
      open.visible = !animating && opened;
      if (moving) moving.visible = animating;
      if (animating) {
        const pose = opened ? progress : 1 - progress;
        if (action) {
          action.time = pose * duration;
          mixer.update(0);
        } else lid.node.setQuaternion(...quatSlerp(rotation, lid.closed, lid.opened, pose));
      }
      return root;
    },
    dispose() {
      for (const entry of entries.values()) {
        entry?.mixer?.stopAll();
        entry?.root.removeFromParent();
      }
      for (const material of moss.values()) material.dispose();
      entries.clear();
      moss.clear();
    },
  };
}
