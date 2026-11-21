const ACTORS = [null, 'steady', 'grand', 'eager'];
const CHATTER = new Set(['opening', 'aside']);
const BUNDLE = new URL('../assets/audio/voices.json', import.meta.url);

/** A single speaker for the table. A confirmed call can interrupt banter or an older call. */
export function createTableVoice(on, duck, onSpeakerChanged) {
  const speaker = new Audio();
  speaker.preload = 'auto';
  speaker.volume = .87;
  const clips = new Map();
  let load, bank, requested, current, turn = 0, last = -Infinity, paused = false, shown = null, retryAt = 0;
  const blocked = () => !on || paused || document.hidden;

  function show(seat) {
    if (shown !== seat) {
      shown = seat;
      onSpeakerChanged?.(seat);
    }
  }

  function play() {
    const playingTurn = turn;
    duck(true);
    speaker.play()?.catch(() => {
      if (playingTurn === turn && !blocked()) stop();
    });
  }

  function stop() {
    turn++;
    current = undefined;
    requested = undefined;
    speaker.pause();
    show(null);
    duck(false);
  }

  function start({ seat, actor, cue }) {
    const bytes = bank?.[actor]?.[cue];
    if (!bytes || blocked()) return false;
    const key = actor + '/' + cue;
    if (!clips.has(key)) {
      const mp3 = Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0));
      clips.set(key, URL.createObjectURL(new Blob([mp3], { type: 'audio/mpeg' })));
    }
    turn++;
    speaker.pause();
    show(null);
    speaker.src = clips.get(key);
    current = seat;
    last = performance.now();
    play();
    return true;
  }

  function prepare() {
    if (!on || load || performance.now() < retryAt) return;
    load = fetch(BUNDLE).then((response) => {
      if (!response.ok) throw new Error('Cannot load table voice clips');
      return response.json();
    }).then((payload) => {
      bank = payload;
      const next = requested;
      requested = undefined;
      if (next && performance.now() <= next.deadline) start(next);
    }).catch(() => {
      requested = undefined;
      load = undefined;
      retryAt = performance.now() + 5000;
    });
  }

  function sync() {
    if (blocked()) {
      requested = undefined;
      turn++;
      speaker.pause();
      show(null);
      duck(false);
    } else if (current && speaker.paused && !speaker.ended) {
      play();
    }
  }

  speaker.addEventListener('ended', () => {
    if (speaker.ended) stop();
  });
  speaker.addEventListener('error', () => {
    if (speaker.error) stop();
  });
  speaker.addEventListener('playing', () => {
    if (current && !blocked() && !speaker.paused) show(current);
  });
  document.addEventListener('visibilitychange', sync);

  return {
    prepare,
    say(seat, cue) {
      const actor = ACTORS[seat];
      if (!actor || blocked()) return false;
      const now = performance.now();
      if (CHATTER.has(cue) && (current || requested || now - last < 5000)) return false;
      if (bank) return start({ seat, actor, cue });
      // Skip a cue if a slow connection would put it over a later action.
      requested = { seat, actor, cue, deadline: now + (CHATTER.has(cue) ? 480 : 180) };
      prepare();
      return true;
    },
    setOn(value) {
      on = value;
      if (on) prepare();
      else stop();
    },
    pause(value) {
      paused = value;
      sync();
    },
    stop
  };
}
