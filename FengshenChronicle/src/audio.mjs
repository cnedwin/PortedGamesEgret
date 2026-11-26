const CUES = [
  'attack', 'hit', 'hero-hurt', 'artifactCast', 'artifactHit', 'artifactReturn', 'enemyAttack',
  'telegraphBoss', 'rareLoot', 'pickup', 'equip', 'quest', 'heal', 'death', 'victory', 'ui'
];
const SCENES = ['city', 'trail', 'boss'];
const defaults = { music: .55, effects: .8 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const asset = (folder, name, extension) => new URL('../assets/audio/' + folder + '/' + name + '.' + extension, import.meta.url).href;

export function createSound(storage) {
  const mix = { ...defaults };
  for (const channel of Object.keys(mix)) {
    try {
      const saved = storage.getItem('ported-games-egret:fengshen:volume:' + channel);
      if (saved !== null && Number.isFinite(Number(saved))) mix[channel] = clamp(Number(saved), 0, 1);
    } catch { /* The mixer still works without persistent storage. */ }
  }
  const clips = new Map(), active = new Set(), last = new Map();
  let context, bus, decoding, raf = 0, mixStamp = 0, duckUntil = 0, musicGain = 1;
  let players, current, scene = 'city', muted = false, visible = true, entered = false;
  let lastCue = '', triggered = 0;

  function loadEffects() {
    decoding ??= Promise.allSettled(CUES.map(async cue => {
      const response = await fetch(asset('sfx', cue, 'wav'));
      if (!response.ok) throw Error('Missing sound: ' + cue);
      clips.set(cue, await context.decodeAudioData(await response.arrayBuffer()));
    }));
  }

  function makePlayers() {
    return [0,1].map(() => {
      const audio = new Audio();
      audio.preload = 'none';
      audio.loop = true;
      audio.volume = 0;
      return { audio, gain: 0, target: 0, scene: null, pending: false };
    });
  }

  function volumeFor(player) {
    return clamp(player.gain * mix.music * musicGain * (muted || !visible ? 0 : 1), 0, 1);
  }

  function mixMusic(time) {
    const elapsed = mixStamp ? clamp(time - mixStamp, 1, 66) : 16;
    mixStamp = time;
    const duck = time < duckUntil ? .58 : 1;
    const transition = duck < musicGain ? 62 : 220;
    musicGain += (duck - musicGain) * (1 - Math.exp(-elapsed / transition));
    for (const player of players) {
      const difference = player.target - player.gain;
      player.gain += clamp(difference, -elapsed / 380, elapsed / 510);
      player.audio.volume = volumeFor(player);
      if (!player.target && player.gain <= .001 && !player.pending) player.audio.pause();
    }
    if (players.some(player => Math.abs(player.target - player.gain) > .001) || duckUntil > time || Math.abs(musicGain-1) > .01) {
      raf = requestAnimationFrame(mixMusic);
    } else raf = 0;
  }

  function animateMix() {
    if (!raf && players && visible && !muted) {
      mixStamp = 0;
      raf = requestAnimationFrame(mixMusic);
    }
  }

  function applyScene() {
    if (!players || !entered || muted || !visible || !mix.music) return;
    if (current?.scene !== scene) {
      const next = players.find(player => player !== current);
      next.audio.pause();
      next.scene = scene;
      next.audio.src = asset('music', scene, 'ogg');
      next.audio.currentTime = 0;
      next.gain = next.target = 0;
      next.pending = false;
      current = next;
    }
    const player = current, requestedScene = scene;
    const activate = () => {
      if (player.scene !== requestedScene) return;
      player.pending = false;
      if (player !== current || !visible || muted || !mix.music) return;
      for (const item of players) item.target = Number(item === player);
      animateMix();
    };
    if (player.pending) return;
    player.audio.volume = volumeFor(player);
    if (!player.audio.paused && player.audio.readyState >= 2) activate();
    else {
      // Leave the incoming track silent until decoding has started. This
      // keeps the previous cue audible during a cold request on mobile.
      player.pending = true;
      player.audio.play().then(activate).catch(() => {
        if (player.scene === requestedScene) player.pending = false;
      });
    }
  }

  function stopVoices() {
    for (const voice of active) {
      try { voice.stop(); } catch { /* The voice already reached its end. */ }
    }
    active.clear();
  }

  function stopMusic() {
    cancelAnimationFrame(raf);
    raf = 0;
    duckUntil = 0;
    musicGain = 1;
    for (const player of players ?? []) {
      player.audio.pause();
      player.gain = player.target = 0;
      player.pending = false;
      player.audio.volume = 0;
    }
  }

  function unlock() {
    if (muted || !visible) return;
    players ??= makePlayers();
    if (globalThis.AudioContext) {
      try {
        if (!context) {
          context = new AudioContext();
          bus = context.createGain();
          bus.gain.value = mix.effects;
          const limiter = context.createDynamicsCompressor();
          limiter.threshold.value = -8;
          limiter.knee.value = 9;
          limiter.ratio.value = 6;
          limiter.attack.value = .005;
          limiter.release.value = .14;
          bus.connect(limiter).connect(context.destination);
        }
        if (context.state === 'suspended') context.resume().catch(() => {});
        loadEffects();
      } catch { /* Autoplay policy may allow only streamed music. */ }
    }
    applyScene();
  }

  return {
    unlock,
    setScene(name) {
      if (!SCENES.includes(name)) return;
      entered = true;
      scene = name;
      applyScene();
    },
    setMute(value) {
      muted = value;
      if (muted) { stopVoices(); stopMusic(); }
      else if (players) unlock();
    },
    setVisible(value) {
      visible = value;
      if (visible) applyScene();
      else { stopVoices(); stopMusic(); }
    },
    setLevel(channel, value) {
      if (!Object.hasOwn(mix,channel) || !Number.isFinite(value)) return;
      mix[channel] = clamp(value,0,1);
      try { storage.setItem('ported-games-egret:fengshen:volume:' + channel,String(mix[channel])); } catch { /* Session only. */ }
      if (channel === 'music') {
        if (!mix.music) stopMusic();
        else applyScene();
      } else if (bus) bus.gain.setTargetAtTime(mix.effects,context.currentTime,.02);
    },
    play(type, pan = 0) {
      const clip = clips.get(type);
      if (muted || !visible || !mix.effects || !clip || context.state !== 'running' || active.size >= 10) return;
      const now = context.currentTime;
      if (now - (last.get(type) ?? -1) < (type === 'ui' ? .09 : .075)) return;
      last.set(type,now);
      const voice = context.createBufferSource();
      voice.buffer = clip;
      if (type === 'attack' || type === 'hit') voice.playbackRate.value = .97 + Math.random() * .07;
      const stereo = context.createStereoPanner();
      stereo.pan.value = clamp(pan,-.72,.72);
      voice.connect(stereo).connect(bus);
      voice.onended = () => { active.delete(voice); voice.disconnect(); stereo.disconnect(); };
      active.add(voice);
      voice.start();
      lastCue = type;
      triggered++;
      if (['hero-hurt','artifactHit','rareLoot','victory'].includes(type)) {
        duckUntil = performance.now() + 260;
        animateMix();
      }
    },
    inspect() {
      return {
        scene, muted, levels: { ...mix }, clips: clips.size, lastCue, triggered,
        musicPlaying: !!current && !current.audio.paused && current.audio.readyState >= 2,
        musicTime: current?.audio.currentTime ?? 0, musicVolume: current?.audio.volume ?? 0,
        activeVoices: active.size, state: context?.state ?? 'idle'
      };
    }
  };
}
