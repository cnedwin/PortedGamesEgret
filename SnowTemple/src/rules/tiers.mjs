// The climb after the first clearing: each tier adds one rule to all the rules below it. And the mark
// a run is given at its end.

export const TIERS = [
  { name: '初上山', text: '原样。' },
  { name: '添兵', text: '第二拨多两个人，其中一个是铁甲头目。' },
  { name: '火箭', text: '弓手改放火箭，落处起火。' },
  { name: '带火', text: '陆谦一开始就使地火和旋斩。' },
  { name: '薄酒', text: '葫芦只有两口，敌人出手更快。' }
];

/** The rules in force at a tier (1 is the first). Past the listed tiers, everyone only grows tougher. */
export function rulesFor(tier = 1) {
  const beyond = Math.max(0, tier - TIERS.length);
  return {
    tier,
    extraMen: tier >= 2,
    fireArrows: tier >= 3,
    luBurning: tier >= 4,
    gourd: tier >= 5 ? 2 : 3,
    haste: tier >= 5 ? 0.86 : 1,
    hp: 1 + (tier >= 2 ? 0.08 : 0) + beyond * 0.1,
    damage: 1 + beyond * 0.08
  };
}

export const tierName = (tier) => TIERS[Math.min(tier, TIERS.length) - 1].name + (tier > TIERS.length ? ` +${tier - TIERS.length}` : '');

/**
 * Mark a run. `par` is the time allowed before seconds begin to cost. Falls cost most, then blows taken;
 * parries and ripostes earn a little back.
 */
export function grade({ time, falls, hurts = 0, parries = 0, ripostes = 0 }, par = 240) {
  const score = Math.round(
    100 - falls * 25 - Math.min(30, hurts * 2) - Math.min(25, Math.max(0, time - par) / 6) + Math.min(8, parries * 2) + Math.min(8, ripostes * 2)
  );
  return { score: Math.max(0, Math.min(100, score)), mark: score >= 90 ? '甲' : score >= 72 ? '乙' : score >= 50 ? '丙' : '丁' };
}
