// The damage formula's table: for every pair of regiments, the share of the defender's health an ordinary blow, a
// held blow and the attacker's biggest skill or art takes, by the formula in src/sim/regiments.mjs (DAMAGE), and the
// biggest single blow there is. Then it plays bouts between the computer's men and measures what really happens:
// how much each landed blow took, the biggest blow, and how long a bout lasts.
// `node tools/formula.mjs [bouts]`.
import { ARMOUR, ARTS, CRIT, DAMAGE, ORDER, REGIMENTS, SKILLS } from '../src/sim/regiments.mjs';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
import { createBrains } from '../src/sim/brain.mjs';

const pct = (v) => (v * 100).toFixed(1) + '%';

/** The share of `defender`'s health a blow of `raw` damage of `kind` takes (the average over a light armour's deflections). */
function share(defender, raw, kind) {
  const r = REGIMENTS[defender];
  const a = ARMOUR[r.armour];
  const after = (d) => {
    const x = (d * DAMAGE.power * DAMAGE.armourK) / (DAMAGE.armourK + a.body[kind]) / r.health;
    return x / (1 + x / DAMAGE.cap);
  };
  const full = after(raw);
  if (!a.deflect) return { full, avg: full };
  return { full, avg: full * (1 - a.deflect.chance) + after(raw * (1 - a.deflect.less)) * a.deflect.chance };
}

/** An attacker's ordinary blow (or full-draw arrow), and his biggest skill or art: [name, raw, kind]. */
function blowsOf(regiment) {
  const r = REGIMENTS[regiment];
  if (r.bow) {
    const list = r.skills.map((id) => [SKILLS[id].name.zh, r.bow.full * (Array.isArray(SKILLS[id].damage) ? Math.max(...SKILLS[id].damage) : SKILLS[id].damage ?? 0), 'thrust']);
    list.push([ARTS[r.art].name.zh + '（一箭）', (r.bow.full * ARTS[r.art].damage) / ARTS[r.art].shots, 'thrust']);
    return { ordinary: ['满弓一箭', r.bow.full, 'thrust'], held: null, big: list.sort((a, b) => b[1] - a[1])[0] };
  }
  const cut = r.blows.R.damage;
  const list = r.skills.map((id) => [SKILLS[id].name.zh, cut * (Array.isArray(SKILLS[id].damage) ? Math.max(...SKILLS[id].damage) : SKILLS[id].damage ?? 0), 'cut']);
  for (const id of [r.art, r.offArt].filter(Boolean)) if (!ARTS[id].mounted) list.push([ARTS[id].name.zh, (id === 'shieldSlam' ? r.shield.damage : cut) * ARTS[id].damage, id === 'shieldSlam' ? 'blunt' : 'cut']);
  return { ordinary: ['普通一刀', cut, 'cut'], held: ['蓄满一刀', cut * 1.6, 'cut'], big: list.sort((a, b) => b[1] - a[1])[0] };
}

console.log(`伤害公式 · The formula: POWER ${DAMAGE.power}, K ${DAMAGE.armourK}, CAP ${DAMAGE.cap}, crit ×${CRIT.power}`);
console.log('攻 → 守：普通一击 / 蓄力 / 最大技能或战技（暴击时）· attacker → defender: ordinary / held / biggest (crit)');
let biggest = { v: 0 };
for (const a of ORDER) {
  const b = blowsOf(a);
  const row = [];
  for (const d of ORDER) {
    if (d === a) continue;
    const o = share(d, b.ordinary[1], b.ordinary[2]).avg;
    const h = b.held ? share(d, b.held[1], b.held[2]).avg : null;
    const big = share(d, b.big[1] * CRIT.power, b.big[2]).full;
    if (big > biggest.v) biggest = { v: big, text: `${REGIMENTS[a].name.zh}「${b.big[0]}」暴击 → ${REGIMENTS[d].name.zh}` };
    row.push(`${REGIMENTS[d].name.zh} ${pct(o)}${h ? ' / ' + pct(h) : ''} / ${pct(big)}`);
  }
  console.log(`${REGIMENTS[a].name.zh}（${b.big[0]}）→ ${row.join('  ')}`);
}
console.log(`单次最大 · biggest single blow: ${pct(biggest.v)}  ${biggest.text}`);

// ---- what happens in play ----
const bouts = Number(process.argv[2] ?? 12);
const shares = [];
let top = { v: 0 },
  time = 0,
  n = 0,
  swings = 0;
for (const a of ORDER)
  for (const d of ORDER) {
    if (a === d) continue;
    for (let seed = 1; seed <= bouts; seed++) {
      const game = createFight({ hero: { regiment: a }, foes: [{ regiment: d }], seed: seed * 31, place: { radius: 18, posts: [] } });
      const brains = createBrains(game, { level: 0.6, hero: true });
      let lead = 0;
      while (!game.over && game.time < 180) {
        const inputs = {};
        for (const [id, br] of Object.entries(brains)) inputs[id] = br.think(game, TICK);
        for (const e of step(game, inputs)) {
          if (e.type !== 'hit' || e.poison) continue;
          const man = game.men.find((m) => m.id === e.who);
          const s = e.damage / man.maxHp;
          shares.push(s);
          if (s > top.v) top = { v: s, text: `${e.skill ?? (e.arrow ? 'arrow' : 'blow')} on ${man.regiment}` };
        }
        // Count the times the lead changes hands (by share of health left).
        const [h, f] = game.men;
        const now = Math.sign(h.hp / h.maxHp - f.hp / f.maxHp);
        if (now && now !== lead) {
          if (lead) swings++;
          lead = now;
        }
      }
      time += game.time;
      n++;
    }
  }
shares.sort((x, y) => x - y);
const at = (q) => pct(shares[Math.floor(q * (shares.length - 1))]);
console.log(`\n实战 · In play (${n} bouts, strength 0.6): a landed blow takes median ${at(0.5)}, 10% of them under ${at(0.1)}, 10% over ${at(0.9)}; biggest ${pct(top.v)} (${top.text})`);
console.log(`一场平均 ${(time / n).toFixed(0)} 秒，领先方平均易手 ${(swings / n).toFixed(1)} 次 · a bout lasts ${(time / n).toFixed(0)} s on average and the lead changes hands ${(swings / n).toFixed(1)} times`);
