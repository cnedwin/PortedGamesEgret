import { HEROINES } from '../data/cast.mjs';

const activityLooks = {
  linxia: [{ name: 'pool', slot: 'dress', garment: 'swim-onepiece' }],
  tangmi: [{ name: 'pajama', slot: 'top', garment: 'pajama-top' }],
  bailu: [
    { name: 'lounge', slot: 'outer', garment: 'lounge-robe' },
    { name: 'stargazing', slot: 'outer', garment: 'cardigan' },
  ],
};

// Choose the closest painted silhouette for freely mixed outfits. The upper
// layers matter most because the dialogue framing shows the head and torso.
const visiblePieces = [['dress', 9], ['outer', 7], ['top', 5], ['bottom', 2]];

export function storyLook({ id, wear }) {
  const outfits = HEROINES[id]?.outfits;
  if (!wear || !outfits) return { name: id };

  const activity = activityLooks[id]?.find(look => wear[look.slot]?.id === look.garment);
  if (activity) return { name: `${id}-${activity.name}`, colors: wear[activity.slot].c };

  let best = 'uniform';
  let weight = 0;
  for (const name of ['uniform', 'casual', 'date']) {
    const outfit = outfits[name];
    const score = visiblePieces.reduce((sum, [slot, points]) =>
      sum + (outfit[slot]?.id && outfit[slot].id === wear[slot]?.id ? points : 0), 0);
    if (score > weight) {
      best = name;
      weight = score;
    }
  }
  return { name: best === 'uniform' ? id : `${id}-${best}` };
}
