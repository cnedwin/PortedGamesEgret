// What a page of the spear manual can teach. Each page offers three of these; the one chosen changes
// how one of the hero's deeds works for the rest of the run.

export const BOONS = {
  fiveStars: { name: '寒星五点', text: '寒星由三道变为五道。' },
  piercing: { name: '透甲寒星', text: '寒星穿透敌人，一道可伤数人。' },
  parryWine: { name: '挡回一口', text: '弹反成功，葫芦回一口酒（每十秒一次）。' },
  parryBreath: { name: '借力', text: '弹反成功，气力回满。' },
  slipBreak: { name: '乘隙', text: '闪过攻击后三秒内，下一枪必定打断对手并重创。' },
  fireCut: { name: '火燎原', text: '第三段重劈和蓄力劈在落点留下一圈火。' },
  denseRain: { name: '密雨', text: '枪雨范围收窄三成，落枪多六成。' },
  ram: { name: '撞阵', text: '踏雪时撞开并撞伤挡路的人。' },
  sharp: { name: '磨枪', text: '枪伤加两成。' },
  keen: { name: '养气', text: '枪意增长快五成。' }
};

/** Three boons he does not have yet (fewer when few are left). */
export function offer(rand, owned, count = 3) {
  const left = Object.keys(BOONS).filter((id) => !owned.includes(id)),
    picked = [];
  while (picked.length < count && left.length) picked.push(left.splice(Math.floor(rand() * left.length), 1)[0]);
  return picked;
}
