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
  if (person.origin !== '掌门') return undefined;
  const leader = art.portraits['leader-' + person.school];
  return leader?.name === person.name ? leader : undefined;
}

export function portraitUrl(art, person, { view = 'bust', expression } = {}) {
  const portrait = portraitFor(art, person);
  if (!portrait) return undefined;
  return artUrl(portrait.expressions[expression] ?? portrait[view] ?? portrait.bust);
}
