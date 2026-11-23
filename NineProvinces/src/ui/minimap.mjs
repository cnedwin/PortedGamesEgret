// 小地图：右上角一幅缩小的天下全图——山川底图、各势力的疆域、本方都城的金点、眼下镜头看到的范围。点一下或拖动，
// 镜头就飞到那里。
// The minimap: a small picture of the whole realm in the top right — the painted land, each power's territory, a gold
// dot at the player's capital, and the part the camera sees now. A tap or a drag flies the camera there.
import { MAP, NODES } from '../data/map.mjs';
import { factionColour } from '../view3d/realm.mjs';
import { landOwnersGrid, paintBase, paintLands } from '../view/mapart.mjs';
import { h } from './dom.mjs';

const W = 232;
const H = Math.round((W * MAP.height) / MAP.width);

export function createMinimap(app, host) {
  const scale = (W * 2) / MAP.width;
  const base = paintBase(scale);
  // Who holds each patch: worked out once on a coarse grid of the painted land.
  const bigBase = paintBase(0.25);
  const sample = document.createElement('canvas');
  sample.width = MAP.width;
  sample.height = MAP.height;
  sample.getContext('2d').drawImage(bigBase, 0, 0, MAP.width, MAP.height);
  const lands = landOwnersGrid(sample, 12);
  const canvas = h('canvas.minimap', { width: W * 2, height: H * 2, role: 'img', 'aria-label': 'map' });
  const box = h('div#minimap', canvas);
  host.append(box);
  const g = canvas.getContext('2d');
  let landLayer = null;
  function refresh() {
    const s = app.state ?? app.demoState;
    if (!s) return;
    const rgb = (o) => {
      const c = factionColour(s, o);
      return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    };
    landLayer = paintLands(lands, (id) => s.nodes[id]?.owner ?? null, rgb);
  }
  function draw() {
    const s = app.state ?? app.demoState;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(base, 0, 0, canvas.width, canvas.height);
    if (landLayer) {
      g.globalAlpha = 0.85;
      g.drawImage(landLayer, 0, 0, canvas.width, canvas.height);
      g.globalAlpha = 1;
    }
    const k = canvas.width / MAP.width;
    if (s?.player) {
      const cap = NODES[s.factions[s.player]?.capital];
      if (cap) {
        g.fillStyle = '#f1d792';
        g.strokeStyle = '#2a1a06';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cap.x * k, cap.y * k, 5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      // The player's armies as small marks.
      g.fillStyle = '#ffffff';
      for (const a of Object.values(s.armies)) {
        if (a.faction !== s.player) continue;
        const n = NODES[a.link ? a.link.to : a.at];
        if (n) g.fillRect(n.x * k - 2, n.y * k - 2, 4, 4);
      }
    }
    // What the camera sees.
    const v = app.map.rig.view;
    const w = v.d * 1.45,
      hgt = v.d * 0.95;
    g.strokeStyle = 'rgba(255, 246, 220, 0.95)';
    g.lineWidth = 2;
    g.strokeRect((v.x - w / 2) * k, (v.z - hgt * 0.75) * k, w * k, hgt * k);
  }
  function jump(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * MAP.width,
      z = ((e.clientY - r.top) / r.height) * MAP.height;
    app.map.rig.glideTo(x, z, app.map.rig.view.td, 0.5);
  }
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    canvas.setPointerCapture?.(e.pointerId);
    jump(e);
  });
  canvas.addEventListener('pointermove', (e) => dragging && jump(e));
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('pointercancel', () => (dragging = false));
  refresh();
  draw();
  return { refresh, draw, element: box };
}
