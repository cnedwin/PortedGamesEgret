// Calendar-driven visual colour only. The simulation remains the sole owner of time.
import { dateOf } from '../sim/core.mjs';

const NAMES = ['spring', 'summer', 'autumn', 'winter'];
const LABELS = ['春', '夏', '秋', '冬'];

/** Smooth seasonal weights, peaking in months 3, 6, 9 and 12. */
export function seasonOf(day = 0) {
  const safeDay = Math.max(0, Number.isFinite(day) ? day : 0);
  const date = dateOf(safeDay);
  const phase = (((safeDay % 360) - 60 + 360) % 360) / 90;
  const from = Math.floor(phase);
  const fraction = phase - from;
  const blend = fraction * fraction * (3 - 2 * fraction);
  const weights = [0, 0, 0, 0];
  weights[from] = 1 - blend;
  weights[(from + 1) % 4] = blend;
  const dominant = blend < 0.5 ? from : (from + 1) % 4;
  return { day: Math.floor(safeDay), month: date.month, name: NAMES[dominant], label: LABELS[dominant], spring: weights[0], summer: weights[1], autumn: weights[2], winter: weights[3] };
}
