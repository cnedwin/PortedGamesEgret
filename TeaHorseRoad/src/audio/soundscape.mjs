// 声场：听者（createAudioListener3D）挂在相机上；每辆车一台发动机、一串马铃，溪流和湖边各有水声，都是场景里的
// 定位声源（createPositionalAudio3D），随距离衰减、随方位左右。喇叭、狼嚎、山匪吆喝、撞击和水花在发生的地方响起；
// 配乐和界面音不定位。所有声音由 synth.mjs 合成，第一次按键或触屏后才开始发声，这是浏览器的要求。
//
// The soundscape: the listener (`createAudioListener3D`) rides on the camera. Each truck has an engine and a string of
// bells, and the stream and the lake shore have the sound of water: positional sources in the scene
// (`createPositionalAudio3D`) that fade with distance and sit left or right. The horn, howls, shouts, knocks and splashes
// sound where they happen; the music and the interface are not placed. Every sound is made by synth.mjs, and nothing
// sounds before the first key or touch, as browsers ask.
import { createAudioListener3D, createPositionalAudio3D } from '@egret/engine/webgl2/world3d';
import { RATE, SOUNDS } from './synth.mjs';

/**
 * The sound of the game. `camera` carries the listener; `waters` are the places with running water as `[x, y, z]`.
 * `update(seconds, convoy)` each frame; `play(name, at?)` for a sound once (placed when `at` is given).
 */
export function createSoundscape(scene, camera, { waters = [], volume = 0.8, music = true } = {}) {
  // Sound is optional on browsers/embedded web views without Web Audio.
  // Keep the controls and saved audio settings usable; do not fake a host API.
  const nativeContext = globalThis.AudioContext;
  const legacyContext = typeof nativeContext !== 'function' && typeof globalThis.webkitAudioContext === 'function'
    ? new globalThis.webkitAudioContext() : undefined;
  if (typeof nativeContext !== 'function' && !legacyContext) {
    return {
      available: false, started: false, volume, music,
      async start() {}, attach() {}, play() {}, setMood() {}, hush() {}, update() {}, dispose() {}
    };
  }
  const listener = createAudioListener3D({ volume, ...(legacyContext ? { context: legacyContext } : {}) });
  camera.addChild(listener);
  const context = listener.context,
    buffers = {};
  // Synthesized samples become a buffer through the listener (ENGINE-NOTES.md, item 16).
  const audioBuffer = (samples) => listener.bufferFrom(samples, RATE);
  const buffer = (name) => {
    return buffers[name] ??= audioBuffer(SOUNDS[name]());
  };

  // Water: a loop at each place, heard within some tens of metres.
  const streams = waters.map(([x, y, z], i) => {
    const source = createPositionalAudio3D(listener, { buffer: buffer('stream'), loop: true, volume: 0.9, refDistance: 8, maxDistance: 140, rolloffFactor: 1.3, playbackRate: 0.9 + i * 0.07 });
    source.setPosition(x, y, z);
    scene.addChild(source);
    return source;
  });
  // Wind over the snow, everywhere at once, louder high up.
  const wind = createPositionalAudio3D(listener, { buffer: buffer('wind'), loop: true, volume: 0, spatial: false });
  camera.addChild(wind);

  const engines = [],
    bells = [];
  let tuneSource = null,
    tuneMood = -1,
    musicWorker = null,
    starting = null,
    started = false,
    musicOn = music,
    bellTimer = [];
  const tunes = [];

  /** Give each truck its engine and bells. */
  function attach(convoy) {
    for (const truck of convoy.trucks) {
      const engine = createPositionalAudio3D(listener, { buffer: buffer('engine'), loop: true, volume: truck === convoy.lead ? 0.55 : 0.4, refDistance: 6, maxDistance: 220, rolloffFactor: 1.1 });
      engine.setPosition(0, 0.6, -2.4);
      truck.model.root.addChild(engine);
      engines.push({ truck, source: engine });
      const bell = createPositionalAudio3D(listener, { buffer: buffer('bell'), volume: 0.35, refDistance: 5, maxDistance: 120 });
      bell.setPosition(0, 1.6, -1.6);
      truck.model.root.addChild(bell);
      bells.push({ truck, source: bell });
      bellTimer.push(Math.random() * 2);
    }
  }

  /** A one-off sound, placed at `at` or not placed. */
  function play(name, at, { volume: gain = 0.8, rate = 1 } = {}) {
    if (!started) return;
    const source = createPositionalAudio3D(listener, { buffer: buffer(name), volume: gain, refDistance: 8, maxDistance: 260, playbackRate: rate, spatial: Boolean(at) });
    if (at) {
      source.setPosition(at[0], at[1], at[2]);
      scene.addChild(source);
    } else camera.addChild(source);
    const node = source.play();
    node.onended = () => {
      source.removeFromParent();
      source.dispose();
    };
  }

  function fadeTune() {
    if (tuneSource) {
      const old = tuneSource;
      old.gain.gain.setTargetAtTime(0, context.currentTime, 0.6);
      setTimeout(() => (old.stop(), old.removeFromParent(), old.dispose()), 2500);
      tuneSource = null;
    }
  }

  function playTune() {
    const ready = tunes[tuneMood];
    if (!started || !musicOn || tuneSource || !ready) return;
    tuneSource = createPositionalAudio3D(listener, { buffer: ready, loop: true, volume: 0, spatial: false });
    camera.addChild(tuneSource);
    tuneSource.play();
    tuneSource.gain.gain.setTargetAtTime(0.32, context.currentTime, 0.8);
  }

  function prepareTunes() {
    if (musicWorker || (tunes[0] && tunes[1])) return;
    const worker = new Worker(new URL('./musicWorker.mjs', import.meta.url), { type: 'module' });
    musicWorker = worker;
    worker.onmessage = ({ data: { mood, samples } }) => {
      if (musicWorker !== worker) return;
      tunes[mood] = audioBuffer(samples);
      // A worker result may arrive after a new mood or a mute.
      if (mood === tuneMood) playTune();
      if (tunes[0] && tunes[1]) {
        worker.terminate();
        musicWorker = null;
      }
    };
    worker.onerror = (error) => {
      worker.terminate();
      if (musicWorker === worker) musicWorker = null;
      console.warn('music worker', error.message);
    };
  }

  /** Change to the calm tune, the tense tune, or silence without synthesizing in a frame. */
  function setMood(mood) {
    if (!started || mood === tuneMood) return;
    tuneMood = mood;
    fadeTune();
    if (musicOn && mood >= 0) prepareTunes();
    playTune();
  }

  return {
    available: true,
    listener,
    attach,
    play,
    setMood,
    get started() {
      return started;
    },
    /** Begin sounding, from a key or touch of the player's. */
    async start() {
      if (started) return starting;
      // A touch press does not grant autoplay activation until release.
      if (context.state !== 'running' && navigator.userActivation?.isActive === false) return;
      starting ??= listener.resume().then(() => {
        started = context.state === 'running';
        if (!started) return;
        for (const source of streams) source.play();
        wind.play();
        // The engines loop from the start; their pitch follows the throttle through the source (ENGINE-NOTES.md, item 15).
        for (const engine of engines) engine.source.play();
        if (musicOn) prepareTunes();
      }).finally(() => { starting = null; });
      return starting;
    },
    set volume(value) {
      listener.volume = value;
    },
    get volume() {
      return listener.volume;
    },
    set music(on) {
      musicOn = on;
      if (on && started) {
        prepareTunes();
        playTune();
      } else fadeTune();
    },
    /** Pause everything while the game is paused, by quieting the listener. */
    hush(on) {
      listener.output.gain.setTargetAtTime(on ? 0.0001 : 1, context.currentTime, 0.15);
    },
    update(seconds, { snow = 0 } = {}) {
      if (!started) return;
      // Engines: pitch follows the speed, and the throttle opens them up.
      for (const engine of engines) {
        const { truck, source } = engine,
          speed = Math.abs(truck.vehicle.speed),
          rate = 0.75 + Math.min(1.3, speed / 16) + Math.abs(truck.vehicle.throttle) * 0.12;
        engine.rate = (engine.rate ?? rate) + (rate - (engine.rate ?? rate)) * Math.min(1, seconds * 4);
        source.playbackRate = engine.rate;
      }
      // Bells: a stroke now and then while the truck rolls, more often over rough ground.
      bells.forEach(({ truck, source }, i) => {
        const speed = Math.abs(truck.vehicle.speed);
        bellTimer[i] -= seconds * (0.4 + speed / 8);
        if (bellTimer[i] <= 0 && speed > 0.8) {
          bellTimer[i] = 0.6 + Math.random() * 1.2;
          source.playbackRate = 0.96 + Math.random() * 0.08;
          source.play();
        }
      });
      wind.volume += (snow * 0.45 - wind.volume) * Math.min(1, seconds);
      listener.update();
    },
    dispose() {
      musicWorker?.terminate();
      musicWorker = null;
      listener.dispose();
      if (legacyContext && legacyContext.state !== 'closed') void legacyContext.close().catch(() => {});
    }
  };
}

