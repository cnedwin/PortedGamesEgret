import { SCENE_W, SCENE_H, drawScene } from './scenes.mjs';
import { drawCampusMap } from './map.mjs';

const locations = new Set(["gate","classroom","library","field","artroom","musicroom","lab","cafe","rooftop","dorm","street","festival"]);
const imageRequests = new Map();
const outside = new Set(['gate', 'field', 'rooftop', 'street', 'festival']);
const foreground = {
  gate: ['sakura', -52, -53, 300, 1],
  classroom: ['pothos', 1092, 539, 190, 0.72],
  library: ['lamp', -25, 558, 276, 0.81],
  field: ['grass', 1070, 563, 260, 0.76],
  artroom: ['paints', 1024, 544, 272, 0.8],
  musicroom: ['peonies', 1090, 535, 225, 0.74],
  lab: ['pothos', -45, 549, 196, 0.64],
  cafe: ['peonies', 1069, 529, 241, 0.83],
  rooftop: ['sakura', -74, -50, 270, 0.8],
  dorm: ['pothos', 1070, 492, 235, 0.75],
  street: ['peonies', -62, 519, 254, 0.68],
  festival: ['sakura', -69, -52, 275, 0.72],
};

function campusImage(name) {
  if (!imageRequests.has(name)) {
    const image = new Image();
    image.src = new URL('../../assets/campus/' + name + '.webp', import.meta.url).href;
    imageRequests.set(name, image.decode().then(() => image, () => null));
  }
  return imageRequests.get(name);
}

function cover(g, image) {
  const scale = Math.max(SCENE_W / image.naturalWidth, SCENE_H / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  g.imageSmoothingQuality = 'high';
  g.drawImage(image, (SCENE_W - width) / 2, (SCENE_H - height) / 2, width, height);
}

function grade(g, light, outdoors) {
  if (light === 'day') return;
  g.save();
  const wash = g.createLinearGradient(0, 0, 0, SCENE_H);
  if (light === 'dusk') {
    wash.addColorStop(0, outdoors ? '#6e64a54b' : '#885b7659');
    wash.addColorStop(0.52, '#d2817a28');
    wash.addColorStop(1, '#4231566b');
    g.fillStyle = wash;
    g.fillRect(0, 0, SCENE_W, SCENE_H);
    const reflection = g.createRadialGradient(905, 287, 20, 905, 287, 600);
    reflection.addColorStop(0, '#ffbe8354');
    reflection.addColorStop(1, '#ffbe8300');
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = reflection;
    g.fillRect(0, 0, SCENE_W, SCENE_H);
  } else {
    wash.addColorStop(0, outdoors ? '#101735a0' : '#151d41ac');
    wash.addColorStop(0.6, '#25245492');
    wash.addColorStop(1, '#0c142fc1');
    g.fillStyle = wash;
    g.fillRect(0, 0, SCENE_W, SCENE_H);
  }
  g.restore();
}

function rim(g, light) {
  const shadow = g.createRadialGradient(670, 330, 220, 655, 350, 830);
  shadow.addColorStop(0, '#171c3e00');
  shadow.addColorStop(1, light === 'night' ? '#100d3f7a' : '#24214552');
  g.fillStyle = shadow;
  g.fillRect(0, 0, SCENE_W, SCENE_H);
}

function front(g, image, settings, light) {
  const [, x, y, w, opacity] = settings;
  g.save();
  g.globalAlpha = opacity;
  if (light === 'night') g.filter = 'brightness(0.57) saturate(0.71)';
  else if (light === 'dusk') g.filter = 'brightness(0.85) saturate(0.93)';
  g.drawImage(image, x, y, w, w * image.naturalHeight / image.naturalWidth);
  g.restore();
}

/** Load only the currently requested location and its foreground cutout. */
export async function loadCampusScene(id) {
  if (!locations.has(id)) return null;
  const settings = foreground[id];
  const [painting, prop] = await Promise.all([campusImage(id), campusImage(settings[0])]);
  return painting ? { painting, prop, settings } : null;
}

/** A matte painting behind the actor, and a transparent independent near plane. */
export function paintCampusScene(g, id, plane, light, art) {
  if (!art) {
    drawScene(g, id, plane, light);
    return;
  }
  if (plane === 'mid') {
    cover(g, art.painting);
    if (id !== 'festival') grade(g, light, outside.has(id));
    rim(g, light);
  } else if (plane === 'near' && art.prop) front(g, art.prop, art.settings, light);
}

export function loadCampusMap() {
  return campusImage('campus-map');
}

const lamps = [[640, 412], [670, 435], [620, 439], [640, 611], [581, 606], [699, 605],
  [269, 406], [375, 405], [518, 253], [744, 276], [923, 452], [1119, 539], [994, 525], [844, 564]];

export function paintCampusMap(g, light, image) {
  if (!image) {
    drawCampusMap(g, light);
    return;
  }
  cover(g, image);
  grade(g, light, true);
  if (light !== 'day') {
    for (const [x, y] of lamps) {
      const halo = g.createRadialGradient(x, y, 0, x, y, 24);
      halo.addColorStop(0, light === 'night' ? '#ffe6a9a8' : '#ffdf965b');
      halo.addColorStop(1, '#ffd48f00');
      g.fillStyle = halo;
      g.fillRect(x - 24, y - 24, 48, 48);
    }
  }
  rim(g, light);
}
