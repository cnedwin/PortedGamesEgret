// Temporary harness: shows the 3D realm alone. Not part of the game.
import { NODES } from '../data/map.mjs';
import { createStage } from './stage.mjs';
import { createLand } from './terrain.mjs';
import { createWaters } from './water.mjs';
import { createFlora } from './flora.mjs';
import { createPlaces } from './cities.mjs';
import { FACTIONS } from '../data/factions.mjs';
const q = new URLSearchParams(location.search);
const canvas = document.querySelector('#world');
const { app, scene, camera, rig } = await createStage(canvas, { quality: q.get('quality') ?? undefined });
const flora = createFlora(scene, { quality: app.quality });
const land = createLand(scene, { quality: app.quality, onTile: flora.onTile });
const waters = createWaters(scene, { quality: app.quality });
const owner = {}; for (const f of Object.values(FACTIONS)) for (const p of f.places) owner[p] = f.colour;
const places = createPlaces(scene, { quality: app.quality, colourOf: (id) => owner[id] ?? null });
rig.setGround((x, z) => Math.max(0, land.heightAt(x, z)));
const at = NODES[q.get('at') ?? 'luoyang'];
rig.jumpTo(+(q.get('x') ?? at.x), +(q.get('z') ?? at.y), +(q.get('d') ?? 60));
window.dev = { app, scene, camera, rig, land, frames: 0 };
app.show(scene, camera, {
  onUpdate(s) {
    rig.update(s);
    land.update(rig.view.x, rig.view.z, Math.min(290, rig.view.d * 1.5 + 100));
    waters.update(s);
    places.update(rig.view.x, rig.view.z, Math.min(290, rig.view.d * 1.5 + 100));
    window.dev.frames++;
  }
});
