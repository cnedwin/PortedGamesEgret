// 徽章：科技树和演义树上圆形的章——铜圈、暗色的心里一抹远山，正中一个楷体字。按状态着色：已完成的是本色和金光，
// 进行中的是金色，未开的是灰的，错过的再压一道斜线。每种只画一次。
// Emblems: the round medallions of the tree of inventions and the tree of the tale — a bronze ring, a dark centre with
// a wash of distant hills, one character in the middle. Coloured by state: done in its own colour with a gold light,
// under way in gold, not yet open in grey, and missed struck through. Each is drawn once.
import { KAI } from './mapart.mjs';

const cache = new Map();

/** A data URL of a medallion `size` pixels across, for `char` in colour `hue` (`#rrggbb`) and a state. */
export function emblem(char, hue, state = 'open', size = 64) {
  const key = [char, hue, state, size].join('|');
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  g.scale((size * 2) / 100, (size * 2) / 100);
  const grey = state === 'shut' || state === 'missed' || state === 'pending';
  // The ring.
  const ring = g.createLinearGradient(10, 10, 90, 90);
  ring.addColorStop(0, grey ? '#9aa0a8' : '#f4dd9a');
  ring.addColorStop(0.5, grey ? '#5c6168' : '#a77d32');
  ring.addColorStop(1, grey ? '#2e3136' : '#5a3f15');
  g.fillStyle = ring;
  g.beginPath();
  g.arc(50, 50, 48, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = grey ? 'rgba(20, 22, 26, 0.7)' : 'rgba(60, 38, 8, 0.8)';
  g.lineWidth = 1;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
    g.beginPath();
    g.moveTo(50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44);
    g.lineTo(50 + Math.cos(a) * 47, 50 + Math.sin(a) * 47);
    g.stroke();
  }
  // The centre: the colour of its way, with hills washed in.
  const inner = g.createRadialGradient(42, 38, 4, 50, 50, 42);
  inner.addColorStop(0, grey ? '#4a4f57' : hue);
  inner.addColorStop(1, grey ? '#1b1d21' : '#120f0b');
  g.fillStyle = inner;
  g.beginPath();
  g.arc(50, 50, 40, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(50, 50, 40, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (const [x, w, hgt] of [
    [22, 34, 22],
    [52, 42, 30],
    [80, 30, 18]
  ]) {
    g.beginPath();
    g.moveTo(x - w, 92);
    g.quadraticCurveTo(x - w * 0.3, 92 - hgt, x, 90 - hgt);
    g.quadraticCurveTo(x + w * 0.3, 92 - hgt, x + w, 92);
    g.fill();
  }
  g.restore();
  // The character.
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 46px ${KAI}`;
  g.shadowColor = 'rgba(0, 0, 0, 0.9)';
  g.shadowBlur = 6;
  g.fillStyle = grey ? '#b9bec5' : state === 'now' ? '#fff1c4' : '#f4e6c4';
  g.fillText(char, 50, 52);
  g.shadowBlur = 0;
  if (state === 'missed') {
    g.strokeStyle = 'rgba(196, 70, 58, 0.85)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(26, 74);
    g.lineTo(74, 26);
    g.stroke();
  }
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
