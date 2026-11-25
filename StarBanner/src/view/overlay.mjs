// 棋盘上的提示：能走到的格子（蓝）、能打到的格子（红）、战意技的范围（金）、敌人的威胁范围（紫），走的路线，
// 以及光标——四角的方框随拍子轻轻呼吸，头顶一枚小箭头上下跳。
// The marks on the board: tiles a unit can reach (blue), tiles it can strike (red), an art's area (gold), an enemy's
// threat (violet), the path it would take, and the cursor: four corner brackets breathing to the beat and a little
// arrow bobbing above.
import { InstancedMesh3D, Mesh3D, Object3D, createBoxGeometry3D, createConeGeometry3D, createPlaneGeometry3D, createUnlitMaterial3D, mat4Compose, quatFromEuler } from '@egret/engine/world3d';
import { TILE } from './stage.mjs';

export const MARK = {
  move: [0.25, 0.6, 1.0, 0.42],
  attack: [1.0, 0.27, 0.25, 0.45],
  art: [1.0, 0.8, 0.2, 0.5],
  threat: [0.62, 0.32, 0.95, 0.34],
  drop: [0.35, 0.95, 0.55, 0.45],
  pick: [1.0, 0.9, 0.35, 0.6]
};

const UP = quatFromEuler(new Float32Array(4), -Math.PI / 2, 0, 0);

/** The marks of the board `bounds` tiles across. */
export function createOverlay(scene, bounds) {
  const root = new Object3D();
  root.name = 'overlay';
  scene.addChild(root);
  const capacity = bounds.w * bounds.h;
  let fog;
  if (bounds.fog) {
    const fogMaterial = createUnlitMaterial3D({ color: [0.07, 0.10, 0.19], opacity: 0.65, alphaMode: 'blend', depthWrite: false, toneMapped: false, fog: false });
    fog = new InstancedMesh3D(createPlaneGeometry3D({ width: TILE + 0.012, height: TILE + 0.012 }), fogMaterial, capacity);
    fog.name = 'war-fog';
    fog.count = 0;
    fog.castShadow = false;
    fog.receiveShadow = false;
    fog.renderOrder = 4;
    root.addChild(fog);
  }
  const tileMaterial = createUnlitMaterial3D({ color: [1, 1, 1], opacity: 1, alphaMode: 'blend', depthWrite: false, toneMapped: false, fog: false });
  const tiles = new InstancedMesh3D(createPlaneGeometry3D({ width: TILE * 0.92, height: TILE * 0.92 }), tileMaterial, capacity, 4);
  tiles.count = 0;
  tiles.renderOrder = 5;
  tiles.castShadow = false;
  tiles.receiveShadow = false;
  root.addChild(tiles);
  // Path: small diamonds along the way.
  const pathMaterial = createUnlitMaterial3D({ color: [1, 0.95, 0.6], toneMapped: false, fog: false });
  const dots = new InstancedMesh3D(createBoxGeometry3D({ width: 0.34, height: 0.06, depth: 0.34 }), pathMaterial, 64);
  dots.count = 0;
  dots.renderOrder = 6;
  root.addChild(dots);
  // The cursor.
  const cursor = new Object3D();
  root.addChild(cursor);
  const bracketMaterial = createUnlitMaterial3D({ color: [1, 0.86, 0.25], toneMapped: false, fog: false });
  const corners = [];
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ]) {
    const corner = new Object3D();
    const a = new Mesh3D(createBoxGeometry3D({ width: 0.5, height: 0.08, depth: 0.12 }), bracketMaterial);
    const b = new Mesh3D(createBoxGeometry3D({ width: 0.12, height: 0.08, depth: 0.5 }), bracketMaterial);
    a.setPosition(-sx * 0.19, 0, 0);
    b.setPosition(0, 0, -sz * 0.19);
    corner.addChild(a);
    corner.addChild(b);
    corner.userData.dir = [sx, sz];
    cursor.addChild(corner);
    corners.push(corner);
  }
  const arrow = new Mesh3D(createConeGeometry3D({ radius: 0.26, height: 0.5, radialSegments: 4 }), bracketMaterial);
  arrow.setRotation(Math.PI, 0, 0);
  cursor.addChild(arrow);
  for (const m of [arrow, ...corners.flatMap((c) => c.children)]) {
    m.castShadow = false;
    m.renderOrder = 7;
  }

  const m4 = new Float32Array(16);
  const centre = (x, y) => [(x + 0.5 - bounds.w / 2) * TILE, (y + 0.5 - bounds.h / 2) * TILE];
  const heightOf = (x, y) => (bounds.water?.(x, y) ? -0.28 : 0.04);
  let clock = 0;
  let cursorAt = { x: 0, y: 0 },
    cursorPos = null,
    arrowHeight = 2.4;
  const overlay = {
    fog(visible) {
      if (!fog) return;
      let count = 0;
      for (let y = 0; y < bounds.h; y++) for (let x = 0; x < bounds.w; x++) {
        if (visible.has(y * bounds.w + x)) continue;
        const [cx, cz] = centre(x, y);
        mat4Compose(m4, [cx, heightOf(x, y) + 0.01, cz], UP, [1, 1, 1]);
        fog.setMatrixAt(count++, m4);
      }
      fog.count = count;
    },
    /** Show `list` of {x, y, kind} tile marks; kinds from MARK. Replaces what was shown. */
    tiles(list) {
      tiles.count = Math.min(capacity, list.length);
      list.slice(0, capacity).forEach((t, i) => {
        const [cx, cz] = centre(t.x, t.y);
        mat4Compose(m4, [cx, heightOf(t.x, t.y) + 0.02, cz], UP, [1, 1, 1]);
        tiles.setMatrixAt(i, m4);
        const c = MARK[t.kind] ?? MARK.move;
        tiles.setColorAt(i, c[0], c[1], c[2], c[3]);
      });
    },
    path(steps) {
      dots.count = Math.min(64, steps.length);
      steps.slice(0, 64).forEach((p, i) => {
        const [cx, cz] = centre(p.x, p.y);
        mat4Compose(m4, [cx, heightOf(p.x, p.y) + 0.08, cz], quatFromEuler(new Float32Array(4), 0, Math.PI / 4, 0), [i === steps.length - 1 ? 1.5 : 1, 1, i === steps.length - 1 ? 1.5 : 1]);
        dots.setMatrixAt(i, m4);
      });
    },
    clear() {
      tiles.count = 0;
      dots.count = 0;
    },
    /** Put the cursor on tile (x, y); `height` is how tall the thing under it stands (the arrow floats above). */
    cursor(x, y, height = 1.6) {
      cursorAt = { x, y };
      arrowHeight = height + 0.8;
    },
    showCursor(on) {
      cursor.visible = on;
    },
    update(seconds) {
      clock += seconds;
      const [tx, tz] = centre(cursorAt.x, cursorAt.y);
      const ty = heightOf(cursorAt.x, cursorAt.y) + 0.08;
      if (!cursorPos) cursorPos = [tx, ty, tz];
      const k = 1 - Math.exp(-seconds * 22);
      cursorPos[0] += (tx - cursorPos[0]) * k;
      cursorPos[1] += (ty - cursorPos[1]) * k;
      cursorPos[2] += (tz - cursorPos[2]) * k;
      cursor.setPosition(cursorPos[0], cursorPos[1], cursorPos[2]);
      const breathe = 0.86 + Math.sin(clock * 5) * 0.05;
      for (const c of corners) {
        const [sx, sz] = c.userData.dir;
        c.setPosition(sx * breathe, 0, sz * breathe);
      }
      arrow.setPosition(0, arrowHeight + Math.abs(Math.sin(clock * 4)) * 0.25, 0);
      arrow.setRotation(Math.PI, clock * 1.5, 0);
    },
    dispose() {
      root.removeFromParent();
    }
  };
  return overlay;
}
