// The original score and Foley bank are rendered by tools/render-audio.mjs.
const FILES = new URL('../assets/audio/', import.meta.url);
const SCENES = {
  title: ['title', 'wind'],
  road: ['road', 'wind'],
  yard: ['yard', 'embers'],
  gate: ['road', 'temple'],
  boss1: ['boss1', 'temple'],
  boss2: ['boss2', 'temple'],
  end: ['end', 'temple']
};
const DEEDS = {
  swing: ['weapon-ready', 0.22],
  guardUp: ['weapon-ready', 0.25],
  deflect: ['deflect', 0.43, 2],
  block: ['block', 0.64, 2],
  parry: ['parry', 0.76, 3],
  guardBreak: ['guard-break', 0.70, 3],
  shieldBreak: ['shield-break', 0.62, 2],
  postureBreak: ['posture-break', 0.75, 3],
  interrupt: ['interrupt', 0.42, 2],
  dodge: ['dodge', 0.42],
  slip: ['slip', 0.58, 2],
  glideStart: ['glide', 0.50],
  fall: ['fall', 0.63, 3],
  bodyLand: ['body-land', 0.67, 3],
  riposte: ['riposte', 0.49, 2],
  riposteHit: ['riposte-thrust', 0.43, 2],
  starsStart: ['stars-ready', 0.44],
  stars: ['stars', 0.52, 2],
  starHit: ['star-hit', 0.36],
  cutArrow: ['cut-arrow', 0.51, 2],
  rain: ['rain', 0.55, 2],
  burst: ['burst', 0.63, 2],
  death: ['death', 0.34],
  drinkStart: ['drink-start', 0.35],
  drink: ['drink', 0.42],
  rest: ['rest', 0.56],
  revive: ['revive', 0.57, 2],
  party: ['party', 0.53, 2],
  alert: ['alert', 0.27],
  rise: ['rise', 0.41]
};
const SWINGS = ['swing-short', 'swing-wide', 'swing-heavy'];
const MIN_GAP = { alert: 0.18, dropLand: 0.075, pickup: 0.09, spear: 0.095, footstep: 0.095, starHit: 0.045 };
const UI = { start: 0.58, open: 0.41, close: 0.40, select: 0.36, confirm: 0.58, back: 0.40 };

function forEvent(event, alternate) {
  switch (event.type) {
    case 'slash': return [SWINGS[event.cut] ?? SWINGS[0], event.hit ? 0.29 : 0.47];
    case 'hit':
      if (event.source === 'riposte') return ['hit-riposte', 0.74, 3];
      return event.heavy ? ['hit-heavy', 0.65, 2] : ['hit-light', 0.47, 2];
    case 'hurt': return event.heavy ? ['hurt-heavy', 0.72, 3] : ['hurt-light', 0.60, 2];
    case 'windup':
      if (event.move?.unblockable) return ['warn-danger', 0.64, 3];
      return event.kind === 'bow' ? ['warn-arrow', 0.36] : ['warn-guard', 0.32];
    case 'strike':
      if (event.move?.name === 'fire') return ['strike-fire', 0.60, 2];
      if (event.move?.shape === 'disc') return ['strike-earth', 0.65, 2];
      if (event.kind === 'bow') return ['strike-arrow', 0.44];
      if (event.kind === 'shield') return ['strike-shield', 0.51];
      return ['strike-blade', event.kind === 'lu' ? 0.59 : 0.45];
    case 'dropLand':
    case 'pickup': {
      const kind = event.kind === 'page' ? 'paper' : ['coin', 'silver'].includes(event.kind) ? 'metal' : 'bottle';
      return event.type === 'pickup' ? ['pick-' + kind, 0.42] : ['drop-' + kind, 0.26];
    }
    case 'spear': return ['spear-' + alternate, 0.31];
    case 'footstep': return ['step-' + (event.surface === 'stone' ? 'stone' : 'snow') + '-' + alternate, 0.26];
    case 'cine': return event.id === 'rage' ? ['rage', 0.76, 3] : null;
    case 'stage': return event.stage === 'gate' ? ['gate', 0.64, 2] : null;
    default: return DEEDS[event.type];
  }
}

export function createAudio() {
  const buffers = new Map();
  const bankRequests = new Map();
  const banks = new Map();
  const channels = { music: {}, ambience: {} };
  const voices = new Set();
  const lastPlayed = new Map();
  let context, master, music, ambience, fx, menu;
  let enabled = true, paused = false, mood = 'road', request = 0;
  let listenerX = 0, listenerZ = 0, offset = 0;
  let layoutRequest, layout, pendingUi, duckedUntil = 0;

  function gain(value, downstream) {
    const node = context.createGain();
    node.gain.value = value;
    node.connect(downstream);
    return node;
  }

  async function load(name) {
    if (!buffers.has(name)) {
      const promise = fetch(new URL(name + '.wav', FILES))
        .then((response) => response.ok ? response.arrayBuffer() : null)
        .then((bytes) => bytes && context.decodeAudioData(bytes))
        .catch(() => null);
      buffers.set(name, promise);
      promise.then((clip) => {
        if (!clip && buffers.get(name) === promise) buffers.delete(name);
      });
    }
    return buffers.get(name);
  }

  function prepareFoley(name) {
    if (bankRequests.has(name)) return bankRequests.get(name);
    layoutRequest ??= fetch(new URL('cues.json', FILES))
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null);
    const prepared = Promise.all([load(name), layoutRequest]).then(([clip, index]) => {
      if (!clip || !index?.sampleRate || !index?.cues) {
        bankRequests.delete(name);
        if (!index) layoutRequest = null;
        return;
      }
      layout = index;
      banks.set(name, clip);
      if (name === 'foley-intro') {
        if (pendingUi && enabled && context.currentTime - pendingUi.at < 0.75) playUi(pendingUi.action);
        pendingUi = null;
      }
    });
    bankRequests.set(name, prepared);
    return prepared;
  }

  function mix() {
    if (!context) return;
    const at = context.currentTime;
    master.gain.setTargetAtTime(enabled ? 0.87 : 0, at, 0.045);
    ambience.gain.setTargetAtTime(paused ? 0.065 : 0.22, at, 0.16);
    fx.gain.setTargetAtTime(paused ? 0.18 : 0.83, at, 0.085);
    music.gain.cancelScheduledValues(at);
    music.gain.setTargetAtTime(paused ? 0.15 : at < duckedUntil ? 0.19 : 0.42, at, 0.085);
    if (!paused && at < duckedUntil) music.gain.setTargetAtTime(0.42, duckedUntil, 0.18);
  }

  function crossfade(channel, clip, name, destination, duration) {
    if (!clip || channel.name === name) return;
    const at = context.currentTime;
    if (channel.source) {
      channel.level.gain.cancelScheduledValues(at);
      channel.level.gain.setTargetAtTime(0, at, duration * 0.24);
      channel.source.stop(at + duration + 0.05);
    }
    const source = context.createBufferSource();
    const level = gain(0, destination);
    source.buffer = clip;
    source.loop = name !== 'end';
    source.connect(level);
    level.gain.setTargetAtTime(1, at, duration * 0.20);
    source.onended = () => {
      source.disconnect();
      level.disconnect();
      if (channel.source === source) channel.source = null;
    };
    source.start(at);
    Object.assign(channel, { source, level, name });
  }

  async function playScene() {
    if (!context || !enabled) return;
    const token = ++request;
    const battle = mood !== 'title' ? prepareFoley('foley') : null;
    const [piece, weather] = SCENES[mood];
    const [score, atmosphere] = await Promise.all([load(piece), load(weather)]);
    if (request !== token || !enabled) return;
    crossfade(channels.music, score, piece, music, 0.62);
    crossfade(channels.ambience, atmosphere, weather, ambience, 0.88);

    // Keep the two current buffers and the Foley banks. Fading sources keep their buffers alive.
    for (const name of buffers.keys()) {
      if (name !== piece && name !== weather && !name.startsWith('foley')) buffers.delete(name);
    }
    // On normal entry the title and the two-tap UI answer load ahead of the battle bank.
    if (!battle) prepareFoley('foley');
    return battle;
  }

  function resume() {
    if (context.state === 'running') return Promise.resolve();
    return context.resume().catch(() => {});
  }

  function start() {
    if (!context) {
      const Audio = globalThis.window?.AudioContext ?? globalThis.window?.webkitAudioContext;
      if (!Audio) return Promise.resolve();
      try {
        context = new Audio();
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 18;
        compressor.ratio.value = 4.2;
        compressor.attack.value = 0.008;
        compressor.release.value = 0.22;
        compressor.connect(context.destination);
        master = gain(enabled ? 0.87 : 0, compressor);
        music = gain(0.42, master);
        ambience = gain(0.22, master);
        fx = gain(0.83, master);
        menu = gain(0.64, master);
      } catch {
        context = null;
        return Promise.resolve();
      }
    }
    // Resuming must begin synchronously in the click/touch handler. Asset decode can finish later.
    return resume().then(() => enabled ? Promise.all([prepareFoley('foley-intro'), playScene()]) : undefined);
  }

  function setMood(next) {
    mood = next === 'boss' ? 'boss1' : next;
    if (!Object.hasOwn(SCENES, mood)) mood = 'road';
    return playScene();
  }

  function setOn(value) {
    if (enabled === value) return;
    enabled = value;
    mix();
    if (!enabled) {
      pendingUi = null;
      return;
    }
    if (context) return start();
  }

  function setPaused(value) {
    if (paused === value) return;
    paused = value;
    mix();
  }

  function release(voice) {
    if (voice.released) return;
    voice.released = true;
    voices.delete(voice);
    voice.source.disconnect();
    voice.level.disconnect();
    voice.pan?.disconnect();
  }

  function oneShot(name, amount, priority, event, bus) {
    if (!layout || !context || !enabled || context.state !== 'running') return;
    const cue = layout.cues[name];
    if (!cue) return;
    const [bank, frame, length] = cue;
    const buffer = banks.get(bank);
    if (!buffer) return;
    const at = context.currentTime;
    if (voices.size >= 12) {
      let replace;
      for (const voice of voices) {
        if (voice.priority < priority && (!replace || voice.priority < replace.priority)) replace = voice;
      }
      if (!replace) return;
      replace.level.gain.setTargetAtTime(0, at, 0.009);
      replace.source.stop(at + 0.025);
      voices.delete(replace);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const positioned = Number.isFinite(event?.x) && Number.isFinite(event?.z);
    const dx = positioned ? event.x - listenerX : 0;
    const dz = positioned ? event.z - listenerZ : 0;
    const distance = Math.hypot(dx, dz);
    const attenuation = Math.max(priority >= 3 ? 0.61 : 0.25, 1 / Math.sqrt(1 + (distance / 7) ** 2));
    const level = gain(amount * attenuation, bus);
    let pan;
    if (positioned && context.createStereoPanner) {
      pan = context.createStereoPanner();
      pan.pan.value = Math.max(-0.64, Math.min(0.64, dx / 18));
      source.connect(pan).connect(level);
    } else source.connect(level);
    const duration = length / layout.sampleRate;
    const voice = { source, level, pan, priority, until: at + duration + 0.01 };
    source.onended = () => release(voice);
    voices.add(voice);
    source.start(at + 0.004, frame / layout.sampleRate, duration);
    if (priority === 3) {
      duckedUntil = Math.max(duckedUntil, at + (name === 'warn-danger' ? 0.48 : 0.33));
      mix();
    }
  }

  function play(event) {
    if (!layout || !enabled || paused || context.state !== 'running') return;
    const at = context.currentTime;
    const gap = MIN_GAP[event.type] ?? 0;
    if (at - (lastPlayed.get(event.type) ?? -Infinity) < gap) return;
    const cue = forEvent(event, offset++ % 2 ? 'a' : 'b');
    if (!cue) return;
    if (gap) lastPlayed.set(event.type, at);
    oneShot(cue[0], cue[1], cue[2] ?? 1, event, fx);
  }

  function playUi(action) {
    const amount = UI[action];
    if (!amount || !context || !enabled) return;
    if (!banks.has('foley-intro')) {
      pendingUi = { action, at: context.currentTime };
      return;
    }
    if (context.state !== 'running') {
      resume().then(() => oneShot('ui-' + action, amount, 4, null, menu));
      return;
    }
    oneShot('ui-' + action, amount, 4, null, menu);
  }

  function update() {
    if (!context) return;
    for (const voice of voices) if (voice.until < context.currentTime) release(voice);
  }

  return {
    start, setMood, setOn, setPaused, play, playUi, update,
    gong: () => oneShot('gong', 0.53, 2, null, fx),
    setListener(x, z) {
      listenerX = x;
      listenerZ = z;
    }
  };
}
