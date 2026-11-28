// Localized faction seal text, shared by native data views.
import { FACTIONS,LATER } from '../data/factions.mjs';
import { getLanguage } from '../i18n.mjs';
export function markOf(f) {
  if (!f) return '—';
  if (getLanguage() !== 'en') return f.flag ?? '—';
  const name = f.name?.en ?? FACTIONS[f.id]?.en ?? LATER[f.id]?.en ?? f.en ?? '';
  return (name.replace(/^The /, '')[0] ?? '—').toUpperCase();
}
