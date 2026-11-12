const containers = new Map([
  [1233, ['cupboard', false, 0]], [1234, ['cupboard', true, 0]],
  [1245, ['cupboard', false, -Math.PI / 2]], [1246, ['cupboard', true, -Math.PI / 2]],
  [1303, ['chest', false, 0]], [1304, ['chest', true, 0]],
  [1305, ['chest', false, -Math.PI / 2]], [1306, ['chest', true, -Math.PI / 2]],
  [1477, ['chest', false, 0, 'low']], [1478, ['chest', true, 0, 'low']],
  [1747, ['chest', false, 0, 'moss']], [1748, ['chest', true, 0, 'moss']],
  [1749, ['chest', false, -Math.PI / 2, 'low']], [1750, ['chest', true, -Math.PI / 2, 'low']],
]);

export function storyContainer(pictureId) {
  const entry = containers.get(pictureId);
  if (!entry) return;
  const [kind, open, rotation, finish] = entry;
  return { kind, state: open ? 'open' : 'closed', rotation, finish };
}
