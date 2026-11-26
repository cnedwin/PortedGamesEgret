// 开发用：让每关的参考解跑一遍试通，列出结果、最吃力的杆件、造价和用时。
// For development: send each level's reference across and list the outcome, the hardest-working member, cost and time.
import { LEVELS } from '../src/sim/levels.mjs';
import { costOf, problemsOf } from '../src/sim/design.mjs';
import { runToEnd } from '../src/sim/run.mjs';
const only = process.argv[2];
for (const level of LEVELS) {
  if (only && !level.id.startsWith(only)) continue;
  const bad = problemsOf(level, level.reference);
  if (bad.length) console.log(`${level.id} INVALID`, bad.slice(0, 4).map((b) => b.why + ':' + JSON.stringify(b.member ?? b.pontoon)).join(' '));
  const t0 = performance.now();
  const out = runToEnd(level, level.reference);
  const ms = performance.now() - t0;
  console.log(`${level.id} ${out.won ? 'WON ' : 'LOST'} ${out.reason ?? ''} t=${out.time.toFixed(1)}s peak=${out.peak.toFixed(2)}(${out.worst?.material} ${out.worst?.pull ? 'pull' : 'push'}) broken=${out.broken} cost=${costOf(level.reference)} budget=${level.budget} members=${level.reference.members.length} ${(ms).toFixed(0)}ms`);
}
