// 声音：全部现场合成，不带音频文件。
//
// 三消的爽感有一半在声音上，而最便宜、最有效的一招是**音高随连锁递升**——
// 同一个音色往上走，玩家的耳朵会自己听出"这一下比上一下狠"。
// 所以这里没有"消除音效"这一个音，只有一条随连锁升高的音阶。

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let ready = false;

  /** 必须在一次真实手势里调用，否则浏览器不给声音。 */
  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    ready = true;
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  function tone({ freq, type = 'triangle', dur = 0.16, gain = 0.5, slideTo = null, delay = 0 }) {
    if (!ready || muted) return;
    const t0 = now() + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.18, gain = 0.4, from = 2400, to = 300, delay = 0 }) {
    if (!ready || muted) return;
    const t0 = now() + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, to), t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter).connect(env).connect(master);
    source.start(t0);
  }

  const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];

  return {
    unlock,
    get ready() {
      return ready;
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** 交换：一记很短的木头声。 */
    swap() {
      noise({ dur: 0.06, gain: 0.18, from: 1800, to: 600 });
    },
    /** 交换失败：往下掉的两个音。 */
    refuse() {
      tone({ freq: 180, type: 'sine', dur: 0.1, gain: 0.25, slideTo: 120 });
    },
    /** 消除：音高随连锁走五声音阶，第六层之后不再升（耳朵会累）。 */
    clear(chain = 1) {
      const step = PENTATONIC[Math.min(chain - 1, PENTATONIC.length - 1)];
      const freq = 392 * 2 ** (step / 12);
      tone({ freq, type: 'triangle', dur: 0.14, gain: 0.34 });
      tone({ freq: freq * 2, type: 'sine', dur: 0.1, gain: 0.16 });
      if (chain >= 5) noise({ dur: 0.2, gain: 0.28, from: 5200, to: 700 });
    },
    /** 特殊块炸开。 */
    boom() {
      noise({ dur: 0.34, gain: 0.55, from: 1400, to: 90 });
      tone({ freq: 96, type: 'sine', dur: 0.32, gain: 0.4, slideTo: 44 });
    },
    /** 双特殊块连携：全屏那一下。 */
    combo() {
      noise({ dur: 0.7, gain: 0.6, from: 6000, to: 60 });
      tone({ freq: 130, type: 'sawtooth', dur: 0.6, gain: 0.3, slideTo: 52 });
      [0, 4, 7, 12].forEach((semi, i) => tone({ freq: 523 * 2 ** (semi / 12), type: 'triangle', dur: 0.5, gain: 0.18, delay: 0.06 * i }));
    },
    /** 出牌：一道上行的风声。 */
    cast(ult = false) {
      noise({ dur: ult ? 0.5 : 0.22, gain: ult ? 0.5 : 0.3, from: 400, to: 4200 });
      if (ult) tone({ freq: 220, type: 'sawtooth', dur: 0.45, gain: 0.22, slideTo: 660 });
    },
    /** 命中：闷一下。 */
    hit() {
      tone({ freq: 150, type: 'sine', dur: 0.18, gain: 0.45, slideTo: 70 });
      noise({ dur: 0.12, gain: 0.3, from: 900, to: 200 });
    },
    /** 治疗：往上飘的柔音。 */
    heal() {
      [0, 4, 7].forEach((semi, i) => tone({ freq: 523 * 2 ** (semi / 12), type: 'sine', dur: 0.32, gain: 0.2, delay: 0.05 * i }));
    },
    /** 护盾：一记金属闷响。 */
    guard() {
      tone({ freq: 300, type: 'square', dur: 0.16, gain: 0.16, slideTo: 420 });
      noise({ dur: 0.16, gain: 0.2, from: 3200, to: 900 });
    },
    /** 敌人出手。 */
    enemyHit() {
      tone({ freq: 90, type: 'sawtooth', dur: 0.3, gain: 0.4, slideTo: 48 });
      noise({ dur: 0.24, gain: 0.4, from: 700, to: 120 });
    },
    /** 抽牌。 */
    draw() {
      noise({ dur: 0.09, gain: 0.16, from: 2600, to: 1400 });
    },
    win() {
      [0, 4, 7, 12, 16].forEach((semi, i) => tone({ freq: 392 * 2 ** (semi / 12), type: 'triangle', dur: 0.5, gain: 0.26, delay: 0.1 * i }));
    },
    lose() {
      [0, -3, -7, -12].forEach((semi, i) => tone({ freq: 330 * 2 ** (semi / 12), type: 'sine', dur: 0.5, gain: 0.26, delay: 0.14 * i }));
    },
  };
}
