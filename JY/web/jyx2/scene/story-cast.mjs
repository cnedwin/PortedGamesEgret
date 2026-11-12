// Default KYS mode 3: scene, event array slot, inclusive raw picture range, pose.
// A portrait speaker may be a party member, a visitor, or the narrator. The
// event slot and visible picture are both required to identify an on-map actor.
const placements = [
  [0, 0, 5166, 5166, { role: 1, direction: 3 }], // 胡斐, 1/10/11 and leave 950
  [4, 1, 5284, 5284, { role: 9, direction: 3 }], // 張無忌, 70–72 and leave 954
  [6, 1, 7406, 7436, { role: 74, direction: 3 }], // 北丑, 826
  [11, 7, 5348, 5348, { role: 7, direction: 3 }], // 何太沖, scene change in 90
  [11, 8, 5364, 5364, { role: 8, direction: 3 }], // 唐文亮, scene change in 90
  [24, 1, 5212, 5212, { role: 3, direction: 3 }], // 苗人鳳, entrance confrontation 30
  [24, 8, 5214, 5215, { role: 3, direction: 3, pose: 'sit', action: 'injured' }], // moves in 35
  [24, 8, 5216, 5216, { role: 3, direction: 3, pose: 'sit' }], // heals in 32
  [34, 0, 5364, 5364, { role: 8, direction: 3 }], // 唐文亮, 126
  [40, 3, 5722, 5748, { role: 35, direction: 3, pose: 'sit', visualOffset: [-.35, .25] }], // 令狐沖, 236 and leave 966
  [49, 2, 5210, 5210, { role: 2, direction: 3, visualOffset: [.8, .75] }], // 程靈素, at the counter in 39–42 and 952
  [50, 1, 5168, 5168, { role: 4, direction: 3 }], // 閻基, appears in 20
  [51, 14, 6292, 6292, { role: 50, direction: 3 }], // 喬峰, 525
  [52, 1, 6300, 6300, { role: 51, direction: 3 }], // 慕容復, 487 and leave 984
  [52, 2, 6298, 6298, { role: 76, direction: 3 }], // 王語嫣, 488 and leave 998
  [56, 1, 5862, 5886, { role: 36, direction: 3 }], // 林平之, 286 and leave 968
  [57, 1, 5696, 5696, { role: 19, direction: 1, pose: 'sit' }], // 岳不群, 195
  [64, 0, 5098, 5098, { role: 73, direction: 3 }], // 南賢, 821
  [68, 7, 5348, 5348, { role: 7, direction: 3 }], // 何太沖, 134
  [75, 1, 6088, 6088, { role: 55, direction: 3, pose: 'sit' }], // 郭靖, 466/467
  [75, 2, 6090, 6090, { role: 56, direction: 3, pose: 'sit' }], // 黃蓉, 466/468
];

const sceneCast = new Map();
for (const [scene, slot, first, last, pose] of placements) {
  if (!sceneCast.has(scene)) sceneCast.set(scene, new Map());
  const slots = sceneCast.get(scene);
  if (!slots.has(slot)) slots.set(slot, []);
  slots.get(slot).push({ first, last, pose });
}

export function submapStoryActor(sceneId, slot, currentPic) {
  return sceneCast.get(sceneId)?.get(slot)?.find(({ first, last }) => currentPic >= first && currentPic <= last)?.pose;
}

export function submapStoryRoles(sceneId) {
  const cast = sceneCast.get(sceneId);
  return new Set(cast && [...cast.values()].flatMap(rows => rows.map(({ pose }) => String(pose.role))));
}
