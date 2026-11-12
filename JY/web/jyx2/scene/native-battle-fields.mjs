const authored = new Set([0, 1, 2, 5, 25]);
const caves = new Set([16, 17, 18, 25]);
const fields = [
  'snowfield', 'woodland', 'village', 'stone-court', 'stockade', 'courtyard', 'estate', 'estate-garden',
  'temple-approach', 'riverside-court', 'mountain-court', 'peach-garden', 'lake-crossing', 'marsh-village',
  'wudang-hall', 'stone-hall', 'treasure-cave', 'spider-cave', 'deep-cave', 'summit-hall', 'emei-hall',
  'stone-terrace', 'escort-court', 'blackwood-cliff', 'beggars-grove', 'sanctuary',
].map((name, field) => ({ name, authored: authored.has(field), outdoor: !caves.has(field) }));

export function nativeBattleField(field) {
  return Number.isInteger(field) ? fields[field] : undefined;
}

export function nativeBattleName(field) {
  return nativeBattleField(field)?.name;
}
