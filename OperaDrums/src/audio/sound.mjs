// 声音：把 synth.mjs 算出的采样交给引擎的混音器（`@egret/engine/audio` 加网页的 Web Audio 后端）。伴奏整首是一个
// 声部，曲子里的时间就从这个声部的位置来；按下去的那一下由页面事件的时间戳换成「那一刻耳朵听到的是曲子的第几秒」。
// Sound: the samples of synth.mjs handed to the engine's mixer (`@egret/engine/audio` with the page's Web Audio
// backend). The backing of a song is one voice, and the song's time comes from that voice's position; a stroke's page
// event time is turned into "the second of the song being heard at that moment".
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { RATE, backingOf, ban, cai, cang, clicksOf, drum, ling, tai } from './synth.mjs';

/** The sound a stroke makes: the syllable of the note it met, or the drum or the small gong when it met none. */
export const STROKE_SOUND = { 仓: 'cang', 才: 'cai', 台: 'tai', 令: 'ling', 八: 'drum', 大: 'drum', 嘟: 'drum' };

/**
 * Make the sound of the game in `scope` (play's `game.scope`). `on` mutes everything; `music` is the volume of the
 * backing, 0 to 1.
 */
export async function createSound(scope, { on = true, music = 0.8 } = {}) {
  const audio = scope.use(createBrowserAudio({ buses: [{ name: 'music', volume: music }, 'effects'], limiter: true }));
  const { mixer, context } = audio;
  mixer.master.setMuted(!on);
  const decode = (samples) => mixer.decode(encodeWav([samples], RATE));
  const effects = {};
  for (const [name, make] of Object.entries({ drum, tai, ling, cai, cang, ban: () => ban(true) })) effects[name] = await decode(make());
  const backings = new Map();
  let voice = null;

  const sound = {
    mixer,
    context,
    /** A stroke's sound, at once. */
    strike(name) {
      const effect = effects[name] ?? effects.drum;
      mixer.play(effect, { bus: 'effects', maxInstances: 6 });
    },
    /** Decode the backing of `song` (kept for the visit), so starting it is instant. */
    async prepare(song) {
      if (!backings.has(song.id)) backings.set(song.id, await decode(backingOf(song).samples));
      return backings.get(song.id);
    },
    /** Start the backing of `song` from `offset` seconds; the song's clock follows it. */
    async start(song, offset = 0) {
      sound.stop();
      const backing = await sound.prepare(song);
      voice = mixer.play(backing, { bus: 'music', whileSilent: 'start', offset });
      return voice;
    },
    /** Play a count of clicks for setting the delay; returns its voice. */
    async clicks(beats, gap, lead) {
      sound.stop();
      voice = mixer.play(await decode(clicksOf(beats, gap, lead)), { bus: 'music', whileSilent: 'start' });
      return voice;
    },
    stop() {
      voice?.stop();
      voice = null;
    },
    get playing() {
      return voice !== null && voice.state !== 'ended';
    },
    /**
     * The second of the playing voice heard at page time `ms` (a `performance.now()` or an event's `timeStamp`). The
     * voice's position counts what the output has been given; `getOutputTimestamp` says which of that is coming out of
     * the speakers now, so the time is of what is heard, not of what was sent.
     */
    heardAt(ms = performance.now()) {
      if (!voice) return 0;
      const position = voice.position;
      if (mixer.state !== 'running') return position;
      const stamp = typeof context.getOutputTimestamp === 'function' ? context.getOutputTimestamp() : null;
      if (stamp && stamp.performanceTime > 0) {
        const late = context.currentTime - stamp.contextTime;
        return position - late + (ms - stamp.performanceTime) / 1000;
      }
      return position - (context.outputLatency || context.baseLatency || 0) + (ms - performance.now()) / 1000;
    },
    pause: () => mixer.suspend('game'),
    resume: () => mixer.resume('game'),
    setOn: (value) => mixer.master.setMuted(!value),
    setMusic: (value) => mixer.bus('music').setVolume(value),
    get state() {
      return mixer.state;
    }
  };
  return sound;
}
