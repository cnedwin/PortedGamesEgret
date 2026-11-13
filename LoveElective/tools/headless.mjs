// Plays a whole term without a page and prints how it went. The "player" here
// follows a simple plan: court the given seniors, train the stat each respects,
// work when short of money and sleep when tired.
//
//   node tools/headless.mjs                 court Shen Qingge
//   node tools/headless.mjs linxia bailu    court two seniors at once
import * as sim from '../src/sim.mjs';
import { HEROINES, HEROINE_IDS } from '../src/data/cast.mjs';
import { PLACES, PLACE_IDS } from '../src/data/places.mjs';
import { CHAPTERS_SCRIPT } from '../src/story/chapters.mjs';

/** Where each stat is trained. */
const TRAIN = {
  intellect: ['library', 'study'],
  fitness: ['field', 'train'],
  art: ['artroom', 'sketch'],
  eq: ['rooftop', 'gaze'],
  charm: ['musicroom', 'sing'],
};

/** Play the chapter's choices, always taking the option that pleases her most. */
function playChapter(s, girl, chapter) {
  const walk = steps => {
    for (const step of steps) {
      if (step[0] !== 'pick') continue;
      const best = step[1].reduce((a, b) => ((b.fx?.aff ?? 0) > (a.fx?.aff ?? 0) ? b : a));
      sim.applyEffect(s, girl, best.fx);
      if (best.then) walk(best.then);
    }
  };
  walk(CHAPTERS_SCRIPT[girl][chapter]);
  sim.finishChapter(s, girl, chapter);
}

/** Choose the approach that moves the gauge towards the middle of her comfortable range. */
function approachFor(s, girl) {
  const [lo, hi] = HEROINES[girl].pace,
    mid = (lo + hi) / 2,
    pull = s.girls[girl].pull;
  return pull < mid - 7 ? 'closer' : pull > mid + 7 ? 'space' : 'steady';
}

export function playTerm(targets, { log = false } = {}) {
  const s = sim.newGame();
  const say = (...args) => {
    if (log) console.log(`day ${s.day} slot ${s.slot}:`, ...args);
  };
  let guard = 0;
  while (!s.finale && guard++ < 2000) {
    const before = sim.clock(s).absolute;
    // Go to a target who is on campus, preferring one whose next chapter is ready.
    const present = targets.filter(t => {
      const at = sim.whereIs(s, t);
      return at && sim.placeOpen(s, at);
    });
    present.sort((a, b) => (sim.chapterAt(s, b, sim.whereIs(s, b)) ? 1 : 0) - (sim.chapterAt(s, a, sim.whereIs(s, a)) ? 1 : 0));
    for (const girl of present) {
      const place = sim.whereIs(s, girl),
        g = s.girls[girl];
      sim.enter(s, place);
      const chapter = sim.chapterAt(s, girl, place);
      if (chapter) {
        playChapter(s, girl, chapter);
        say(girl, 'chapter', chapter, 'aff', g.aff);
      }
      if (!g.met) continue;
      if (sim.canChat(s, girl)) sim.chat(s, girl, approachFor(s, girl));
      if (sim.canGift(s, girl)) {
        const gift = HEROINES[girl].gifts.love[s.day % 2];
        if (!s.bag[gift] && s.money >= sim.priceOf('gifts', gift) + 60) sim.buy(s, 'giftshop', gift);
        if (s.bag[gift]) sim.give(s, girl, gift);
      }
      if (sim.canDate(s, girl) && s.slot < 3) {
        const r = sim.date(s, girl, s.money >= 50 ? 'cafe' : 'gate');
        if (r) {
          say(girl, 'date +' + r.gain);
          break;
        }
      }
    }
    if (sim.clock(s).absolute !== before || s.finale) continue;
    // Otherwise spend the slot on the hero himself.
    if (s.energy < 25) {
      sim.enter(s, 'dorm');
      if (s.slot === 3) sim.sleep(s);
      else sim.act(s, 'dorm', 'nap');
      continue;
    }
    if (s.money < 120 && sim.placeOpen(s, 'cafe')) {
      sim.enter(s, 'cafe');
      sim.act(s, 'cafe', 'barista');
      continue;
    }
    const needy = targets.map(t => HEROINES[t].stat).sort((a, b) => sim.statValue(s, a) - sim.statValue(s, b))[0];
    const [place, act] = TRAIN[needy];
    if (sim.placeOpen(s, place)) {
      sim.enter(s, place);
      if (!sim.act(s, place, act)) sim.advance(s);
    } else if (s.slot === 3) {
      sim.enter(s, 'dorm');
      sim.sleep(s);
    } else sim.advance(s);
    for (const { q, state } of sim.visibleQuests(s)) if (state === 'ready') sim.claim(s, q.id);
  }
  return s;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targets = process.argv.slice(2).filter(id => HEROINE_IDS.includes(id));
  const s = playTerm(targets.length ? targets : ['qingge'], { log: true });
  console.log(
    '\nstats',
    s.stats,
    'money',
    s.money,
    'places',
    PLACE_IDS.filter(id => s.visited[id])
      .map(id => PLACES[id].name[1])
      .join(', '),
  );
  for (const id of HEROINE_IDS) {
    const g = s.girls[id];
    if (g.met)
      console.log(
        HEROINES[id].name[1].padEnd(14),
        'affection',
        String(g.aff).padStart(3),
        'chapter',
        g.chapter,
        'dates',
        g.dates,
        '→',
        sim.confess(s, id),
      );
  }
}
