// A title-screen roster, deliberately separate from any campaign's evolving
// officers. Only these small validated records are persisted between campaigns.
export const OFFICER_LIMIT = 12;
export const OFFICER_STATS = ['lead','war','int','pol','cha'];
export const OFFICER_TRAITS = ['tongyu','yongmeng','bingfa','neizheng','qinmin','shanshe','shuishou','zhongyi'];
const clean = value => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g,'') : '';

export function validateOfficer(input) {
  const d = input && typeof input === 'object' ? input : {}, errors = [];
  const zh = clean(d.zh), en = clean(d.en) || zh;
  if (!zh || [...zh].length > 12 || /[<>]/.test(zh)) errors.push('name');
  if (en.length > 48 || /[<>]/.test(en)) errors.push('english');
  const age = Number(d.age), portrait = Number(d.portrait ?? 0);
  if (!Number.isInteger(age) || age < 16 || age > 60) errors.push('age');
  if (!Number.isInteger(portrait) || portrait < 0 || portrait > 23) errors.push('portrait');
  if (d.service !== 'player' && d.service !== 'free') errors.push('service');
  const stats = Object.fromEntries(OFFICER_STATS.map(k => [k, Number(d.stats?.[k])]));
  if (Object.values(stats).some(n => !Number.isInteger(n) || n < 20 || n > 90)) errors.push('stats');
  else if (Object.values(stats).reduce((a,b) => a+b,0) > 350) errors.push('budget');
  const trait = d.trait === '' || d.trait === null || d.trait === undefined ? null : String(d.trait);
  if (trait !== null && !OFFICER_TRAITS.includes(trait)) errors.push('trait');
  const officer = { id: typeof d.id === 'string' && /^u[0-9a-z]{1,12}$/.test(d.id) ? d.id : null,
    zh, en, age, female: d.female === true, portrait, service: d.service, stats, trait };
  return { ok: errors.length === 0, errors, officer };
}

/** A malformed/oversized saved roster cannot overwrite static officer data. */
export function normalizeRoster(input) {
  const out = [], ids = new Set();
  if (!Array.isArray(input)) return out;
  for (const item of input.slice(0, 128)) {
    const row = validateOfficer(item);
    if (!row.ok || !row.officer.id || ids.has(row.officer.id)) continue;
    ids.add(row.officer.id); out.push(row.officer);
    if (out.length >= OFFICER_LIMIT) break;
  }
  return out;
}

export function newRosterOfficer(draft, input = []) {
  const roster = normalizeRoster(input), row = validateOfficer(draft);
  if (roster.length >= OFFICER_LIMIT) return { ...row, ok: false, errors: ['limit'] };
  if (!row.ok) return row;
  if (roster.some(g => g.zh === row.officer.zh)) return { ...row, ok: false, errors: ['duplicate'] };
  const ids = new Set(roster.map(g => g.id));
  let serial = 1;
  while (ids.has('u' + serial.toString(36))) serial++;
  row.officer.id = 'u' + serial.toString(36);
  return row;
}
