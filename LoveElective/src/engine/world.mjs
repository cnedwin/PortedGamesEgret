// The scene behind the interface: three background layers that slide against
// each other as the pointer moves, a character standing between them, drifting
// particles in front, and a few stage effects. This is what gives the flat
// paintings their sense of depth.
import { W, H } from './stage.mjs';
import { drawScene, ambient, SCENE_W, SCENE_H } from '../art/scenes.mjs';
import { drawFigure, FIGURE_W, FIGURE_H } from '../art/figure.mjs';
import { heart, star, ellipse, rgba } from '../art/draw.mjs';

/** How far each layer shifts with the pointer, and how much it is enlarged so its edges never show. */
const DEPTH = { far: { shift: 10, zoom: 1.03 }, mid: { shift: 24, zoom: 1.06 }, actor: { shift: 34 }, near: { shift: 58, zoom: 1.14 } };
/** Painting resolution of each layer: distant and blurred layers need fewer pixels. */
const LAYER_RES = { far: 0.5, mid: 0.8, near: 0.42 };

/** The part of the figure redrawn for a blink: [x, y, w, h] in figure units. */
const EYES = [126, 158, 148, 76];

const PARTICLES = {
  petal: {
    size: 26,
    count: 22,
    draw(g) {
      g.fillStyle = '#ffc4d8';
      g.beginPath();
      g.moveTo(13, 2);
      g.bezierCurveTo(24, 6, 22, 20, 13, 24);
      g.bezierCurveTo(4, 20, 2, 6, 13, 2);
      g.fill();
      g.fillStyle = rgba('#ffffff', 0.5);
      g.fill(ellipse(11, 10, 3, 6));
    },
  },
  dust: {
    size: 32,
    count: 16,
    draw(g) {
      const r = g.createRadialGradient(16, 16, 0, 16, 16, 15);
      r.addColorStop(0, rgba('#fff6d8', 0.9));
      r.addColorStop(1, rgba('#fff6d8', 0));
      g.fillStyle = r;
      g.fillRect(0, 0, 32, 32);
    },
  },
  spark: {
    size: 28,
    count: 18,
    draw(g) {
      g.fillStyle = '#ffffff';
      g.fill(star(14, 14, 13, 3.6, 4));
    },
  },
  heart: {
    size: 40,
    count: 14,
    draw(g) {
      g.fillStyle = '#ff6f9c';
      g.fill(heart(20, 19, 13));
      g.fillStyle = rgba('#ffffff', 0.6);
      g.fill(ellipse(13, 13, 3, 4.5));
    },
  },
};

/** Which drifting particles suit each place and time of day. */
function particlesFor(scene, light) {
  if (scene === 'gate') return 'petal';
  if (light === 'night' && (scene === 'rooftop' || scene === 'field')) return 'spark';
  return scene === 'street' || scene === 'field' || scene === 'rooftop' ? null : 'dust';
}

export function createWorld(stage) {
  const root = stage.group();
  const layers = {};
  for (const name of ['far', 'mid']) layers[name] = stage.pic(root);
  const actorGroup = stage.group(root);
  layers.near = stage.pic(root);
  const fxGroup = stage.group(root);
  const flash = stage.rect(root, 0xffffff);
  flash.alpha = 0;

  const world = { root, scene: null, light: 'day', actor: null, zoom: 1, shakeTime: 0, calm: false };
  let particles = [],
    particleKind = null,
    sceneToken = 0;
  const cam = { x: 0, y: 0 };

  function place(name) {
    const d = DEPTH[name],
      node = layers[name].node,
      z = d.zoom * world.zoom;
    node.scaleX = node.scaleY = z;
    node.x = (W - W * z) / 2 - cam.x * d.shift;
    node.y = (H - H * z) / 2 - cam.y * d.shift * 0.5;
  }

  /** Change the place and light. Layers are cached by the engine under scene keys. */
  world.setScene = async (scene, light = 'day') => {
    if (world.scene === scene && world.light === light) return;
    const token = ++sceneToken,
      first = !world.scene;
    world.scene = scene;
    world.light = light;
    if (!first) await stage.tween(root, { alpha: 0 }, 0.22, { ease: 'in' });
    if (token !== sceneToken) return;
    await Promise.all(
      ['far', 'mid', 'near'].map(name => {
        const key = `scene:${scene}:${light}:${name}`;
        const canvas = stage.canvas(SCENE_W, SCENE_H, LAYER_RES[name], g => drawScene(g, scene, name, light));
        stage.keep(canvas, key, 9);
        return layers[name].show(canvas, canvas.res, key);
      }),
    );
    world.setParticles(particlesFor(scene, light));
    if (world.actor) tintActor();
    stage.tween(root, { alpha: 1 }, 0.3);
  };

  function tintActor() {
    const [r, g, b] = ambient(world.light);
    world.actor?.pic.tint(r, g, b, 1);
    world.actor?.blink.tint(r, g, b, 1);
  }

  /**
   * Show a character. view 'bust' frames head to thigh for conversation;
   * 'full' shows the whole figure for the wardrobe. x is the centre in game units.
   */
  world.showActor = async (spec, { view = 'bust', x = W / 2, key, enter = true } = {}) => {
    const full = view === 'full';
    const scale = full ? 0.665 : 1.24,
      crop = full ? FIGURE_H : 600;
    const res = full ? 1.5 : 1.0;
    const id = key ?? JSON.stringify(spec) + view;
    if (!world.actor) {
      const group = stage.group(actorGroup);
      world.actor = { group, pic: stage.pic(group), blink: stage.pic(group), id: null, x, nextBlink: 2, blinkLeft: 0, t: 0 };
      world.actor.blink.node.visible = false;
      group.alpha = 0;
    }
    const a = world.actor,
      fresh = a.id === null;
    if (a.id === id && a.x === x) return;
    a.id = id;
    a.full = full;
    a.scale = scale;
    const paintFigure = (blink, [cx, cy, cw, ch]) =>
      stage.canvas(cw * scale, ch * scale, res, g => {
        g.scale(scale, scale);
        g.translate(-cx, -cy);
        drawFigure(g, spec, { blink });
      });
    const body = paintFigure(false, [0, 0, FIGURE_W, crop]);
    const eyes = paintFigure(true, EYES);
    a.blink.node.x = EYES[0] * scale;
    a.blink.node.y = EYES[1] * scale;
    await Promise.all([a.pic.show(body, body.res, 'actor:' + id), a.blink.show(eyes, eyes.res, 'blink:' + id)]);
    tintActor();
    a.w = FIGURE_W * scale;
    a.h = crop * scale;
    a.baseY = full ? H - a.h - 6 : 64;
    if (fresh || a.x !== x) {
      const from = a.x ?? x;
      a.x = x;
      if (fresh && enter) {
        a.offset = 40;
        stage.tween(a, { offset: 0 }, 0.45);
        stage.tween(a.group, { alpha: 1 }, 0.35);
      } else {
        a.offset = from - x;
        stage.tween(a, { offset: 0 }, 0.35);
        a.group.alpha = 1;
      }
    } else a.group.alpha = 1;
  };

  world.hideActor = async () => {
    const a = world.actor;
    if (!a) return;
    world.actor = null;
    await stage.tween(a.group, { alpha: 0 }, 0.25, { ease: 'in' });
    a.pic.destroy();
    a.blink.destroy();
    actorGroup.removeChild(a.group);
    a.group.dispose();
  };

  /** Slide the character sideways to a new centre x. */
  world.moveActor = x => {
    const a = world.actor;
    if (!a || a.x === x) return;
    a.offset = (a.offset ?? 0) + a.x - x;
    a.x = x;
    stage.tween(a, { offset: 0 }, 0.35);
  };

  /** A little hop, used when a character is startled or delighted. */
  world.hop = () => {
    const a = world.actor;
    if (!a) return;
    a.hop = 0;
    stage.tween(a, { hop: 1 }, 0.4, { ease: 'linear' });
  };

  world.setParticles = kind => {
    if (kind === particleKind) return;
    particleKind = kind;
    for (const p of particles) p.pic.destroy();
    particles = [];
    if (!kind) return;
    const def = PARTICLES[kind],
      canvas = stage.canvas(def.size, def.size, 2, g => def.draw(g));
    for (let i = 0; i < def.count; i++) {
      const pic = stage.pic(fxGroup),
        depth = 0.5 + Math.random() * 1.1;
      pic.show(canvas, canvas.res, 'particle:' + kind);
      pic.node.anchorOffsetX = pic.node.anchorOffsetY = def.size / 2;
      particles.push({ pic, depth, x: Math.random() * W, y: Math.random() * H, phase: Math.random() * 6.28, spin: (Math.random() - 0.5) * 80 });
    }
  };

  /** One-off effects: 'heart' bursts hearts, 'shake' jolts the camera, 'flash' whites out for a moment. */
  world.effect = kind => {
    if (kind === 'shake') world.shakeTime = 0.45;
    if (kind === 'flash') {
      flash.alpha = 0.85;
      stage.tween(flash, { alpha: 0 }, 0.7);
    }
    if (kind === 'heart') {
      const def = PARTICLES.heart,
        canvas = stage.canvas(def.size, def.size, 2, g => def.draw(g));
      for (let i = 0; i < def.count; i++) {
        const pic = stage.pic(fxGroup),
          node = pic.node,
          s = 0.6 + Math.random() * 1.1;
        pic.show(canvas, canvas.res, 'particle:heart');
        node.anchorOffsetX = node.anchorOffsetY = def.size / 2;
        node.x = W / 2 + (Math.random() - 0.5) * 420;
        node.y = 330 + Math.random() * 160;
        node.scaleX = node.scaleY = 0.1;
        node.alpha = 0.95;
        stage.tween(node, { scaleX: s, scaleY: s }, 0.35, { ease: 'back', delay: i * 0.04 });
        stage
          .tween(node, { y: node.y - 190 - Math.random() * 140, alpha: 0 }, 1.5 + Math.random() * 0.6, { ease: 'out', delay: i * 0.04 })
          .then(() => pic.destroy());
      }
      world.hop();
    }
  };

  /** Slowly push the camera in (1 = normal). */
  world.zoomTo = (z, seconds = 0.8) => stage.tween(world, { zoom: z }, seconds, { ease: 'inOut' });

  stage.onTick((dt, time) => {
    // The camera eases towards the pointer and drifts a little by itself.
    const tx = world.calm ? 0 : (stage.pointer.x / W - 0.5) * 2 + Math.sin(time * 0.31) * 0.18;
    const ty = world.calm ? 0 : (stage.pointer.y / H - 0.5) * 2 + Math.cos(time * 0.23) * 0.12;
    cam.x += (tx - cam.x) * Math.min(1, dt * 3.2);
    cam.y += (ty - cam.y) * Math.min(1, dt * 3.2);
    let sx = 0,
      sy = 0;
    if (world.shakeTime > 0) {
      world.shakeTime -= dt;
      const k = world.shakeTime * 26;
      sx = Math.sin(time * 90) * k;
      sy = Math.cos(time * 70) * k * 0.6;
    }
    root.x = sx;
    root.y = sy;
    for (const name of ['far', 'mid', 'near']) place(name);

    const a = world.actor;
    if (a) {
      a.t += dt;
      const breathe = Math.sin(a.t * 1.7) * 0.004,
        hop = a.hop !== undefined && a.hop < 1 ? -Math.sin(a.hop * Math.PI) * 26 : 0;
      const z = world.zoom,
        g = a.group;
      g.scaleX = z;
      g.scaleY = z * (1 + breathe);
      g.x = a.x - (a.w * z) / 2 + (a.offset ?? 0) - cam.x * DEPTH.actor.shift;
      g.y = a.baseY - (z - 1) * a.h * 0.3 - breathe * a.h + hop - cam.y * DEPTH.actor.shift * 0.4;
      // Blinking: swap in the closed-eye patch for a moment every few seconds.
      a.nextBlink -= dt;
      if (a.nextBlink <= 0) {
        a.blinkLeft = 0.13;
        a.nextBlink = 2.4 + Math.random() * 3.2;
      }
      a.blinkLeft -= dt;
      a.blink.node.visible = a.blinkLeft > 0;
    }

    for (const p of particles) {
      const node = p.pic.node;
      if (particleKind === 'petal') {
        p.y += dt * 46 * p.depth;
        p.x += dt * (26 + Math.sin(time * 1.3 + p.phase) * 34) * p.depth;
        node.rotation += dt * p.spin;
      } else if (particleKind === 'spark') {
        node.alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.9 + p.phase));
      } else {
        p.y -= dt * 9 * p.depth;
        p.x += Math.sin(time * 0.5 + p.phase) * dt * 10;
        node.alpha = 0.25 + 0.3 * Math.abs(Math.sin(time * 0.6 + p.phase));
      }
      if (p.y > H + 30) {
        p.y = -30;
        p.x = Math.random() * W;
      }
      if (p.y < -40) {
        p.y = H + 20;
        p.x = Math.random() * W;
      }
      if (p.x > W + 30) p.x = -30;
      const s = particleKind === 'spark' ? 0.4 * p.depth : particleKind === 'dust' ? 0.9 * p.depth : 0.7 * p.depth;
      node.scaleX = node.scaleY = s;
      node.x = p.x - cam.x * 40 * p.depth;
      node.y = p.y - cam.y * 16 * p.depth;
    }
  });

  return world;
}
