import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { InstancedMesh3D, Mesh3D, Scene3D, createBoxGeometry3D, createPerspectiveCamera3D } =
  await import('@egret/engine/world3d');
const { bowstringDraws } = await import('../src/view/figures.mjs');
const { createView } = await import('../src/view/view.mjs');

test('future combat draws use native automatic-instance preparation, retaining authored FX streams', async () => {
  const scene = new Scene3D(),
    camera = createPerspectiveCamera3D({}),
    stock = createBoxGeometry3D({}),
    models = new Proxy({}, { get: () => stock });
  scene.addChild(camera);
  const view = createView(scene, camera, models, { detail: 'low', density: 0.01, particles: 0.2 });
  const [cord] = bowstringDraws();
  let calls = 0;
  try {
    await view.preparePrograms({
      shadowsEnabled: true,
      async preparePrograms(requests, options) {
        calls++;
        assert.equal(options?.includeAutoInstancing, true, 'delegate companion-variant preparation to the engine');
        const strings = requests.filter(({ mesh, material }) => mesh.geometry === cord.geometry && material === cord.material);
        assert.equal(strings.length, 1, 'only one representative bowstring is needed');
        const coins = requests.filter(({ material }) => material.vertexColors && material.metallic === 0.3 && material.emissiveIntensity === 0.25);
        assert.equal(coins.length, 1, 'prepare a representative ordinary coin draw');
        for (const descriptor of [...strings, ...coins]) {
          assert.ok(descriptor.mesh instanceof Mesh3D);
          assert.ok(!(descriptor.mesh instanceof InstancedMesh3D), 'do not synthesize an instance solely to warm a program');
          assert.equal(descriptor.mesh.canInstance, true);
          assert.equal(descriptor.fog, true);
          assert.equal(descriptor.receiveShadows, true);
        }
        const authoredEffects = requests.filter(({ mesh }) => mesh instanceof InstancedMesh3D && mesh.instanceColorSize === 4);
        assert.ok(authoredEffects.length >= 2, 'footprints and falling spears still prepare their real RGBA instance variants');
        assert.ok(authoredEffects.every(({ mesh }) => mesh.instanceColors && mesh.capacity > 1));
      }
    });
    assert.equal(calls, 1);
  } finally {
    view.disposeCharacters();
  }
});
