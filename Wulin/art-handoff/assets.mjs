const manifestUrl = new URL('./manifest.json', import.meta.url);
let pending;

export function loadArt() {
  pending ??= fetch(manifestUrl)
    .then(response => {
      if (!response.ok) throw new Error(`Wulin art manifest: ${response.status}`);
      return response.json();
    })
    .catch(error => {
      pending = undefined;
      throw error;
    });
  return pending;
}

export const artUrl = path => path ? new URL(path, manifestUrl).href : undefined;

/** Stable art IDs take precedence. The original leader is identified by
 * the in-game school, name and origin, never by the current rank. */
export function portraitFor(art, person) {
  const custom = art.portraits[person.portraitId];
  if (custom) return custom;
  const gender = person.female ? 'female' : 'male';
  if (person.origin === '掌门') {
    const leader = art.portraits['leader-' + person.school];
    return leader?.name === person.name ? leader : art.portraits['founder-' + gender];
  }
  // Give generated disciples a stable face without changing the world RNG or save data.
  let hash = 0;
  for (const char of `${person.name}:${person.id ?? ''}`) hash = (Math.imul(31, hash) + char.codePointAt(0)) >>> 0;
  return art.portraits[`common-${gender}-${hash % 6 + 1}`] ?? art.portraits['disciple-' + gender];
}

export function portraitUrl(art, person, { view = 'bust', expression } = {}) {
  const portrait = portraitFor(art, person);
  if (!portrait) return undefined;
  return artUrl(portrait.expressions[expression] ?? portrait[view] ?? portrait.bust);
}
