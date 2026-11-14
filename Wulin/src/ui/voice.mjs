import { clampVolume } from './soundtrack.mjs';

const KEY = 'wulin-voice';
const VOICE_DIR = new URL('../../assets/audio/voice/', import.meta.url);
const clipUrl = (clip) => new URL(clip + '.mp3', VOICE_DIR);
const knownFemale = /female|女|hanhan|yating|hsiao|xiaoxiao|xiaoyi|yaoyao|huihui|mei[- ]?jia|ting[- ]?ting/i;
const knownMale = /\bmale|男|zhiwei|yunxi|yunyang|kangkang/i;
const locale = voice => voice.lang.toLowerCase().replaceAll('_', '-');

function chineseFemale(voices) {
  const mandarin = voices.filter(voice => /^(?:zh|cmn)(?:-|$)/.test(locale(voice)) && !/(?:^|-)(?:hk|mo|yue)(?:-|$)/.test(locale(voice)) && !knownMale.test(voice.name));
  return mandarin.find(voice => /-tw(?:-|$)/.test(locale(voice)) && knownFemale.test(voice.name))
    ?? mandarin.find(voice => /-tw(?:-|$)/.test(locale(voice)))
    ?? mandarin.find(voice => knownFemale.test(voice.name))
    ?? mandarin[0];
}

/** Main lines are shipped as Taiwanese Mandarin recordings. System speech handles generated text. */
export function createVoice(storage, synth = globalThis.speechSynthesis, { clips, onSpeaking = () => {} } = {}) {
  let settings = { on: true, volume: .82 };
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (typeof saved?.on === 'boolean') settings.on = saved.on;
    if (Number.isFinite(saved?.volume)) settings.volume = clampVolume(saved.volume);
  } catch {}

  let systemVoice;
  function loadVoices() { systemVoice = chineseFemale(synth?.getVoices?.() ?? []); }
  loadVoices();
  synth?.addEventListener?.('voiceschanged', loadVoices);
  let active;
  let shouted = -Infinity;
  let preloadBatch;

  function stop() {
    const line = active;
    active = null;
    if (line?.source) {
      try { line.source.stop(); } catch {}
    }
    if (line?.utterance) synth.cancel();
    if (line) onSpeaking(false);
  }

  function finish(line) {
    if (active !== line) return;
    active = null;
    onSpeaking(false);
  }

  function speakSystem(line) {
    loadVoices();
    if (!systemVoice || typeof globalThis.SpeechSynthesisUtterance !== 'function' || !line.text) return finish(line);
    try {
      const speech = new SpeechSynthesisUtterance(line.text);
      speech.lang = systemVoice.lang;
      speech.voice = systemVoice;
      speech.pitch = 1.13;
      speech.rate = line.short ? 1.03 : .96;
      speech.volume = settings.volume;
      speech.onstart = () => { if (active === line) onSpeaking(true); };
      speech.onend = speech.onerror = () => finish(line);
      line.utterance = speech;
      synth.speak(speech);
    } catch {
      finish(line);
    }
  }

  async function playClip(line, clip) {
    try {
      const buffer = await clips.load(clipUrl(clip));
      if (active !== line) return;
      const context = clips.context;
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = settings.volume;
      source.buffer = buffer;
      source.connect(gain).connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        finish(line);
      };
      line.source = source;
      line.gain = gain;
      onSpeaking(true);
      source.start();
    } catch {
      if (active === line) speakSystem(line);
    }
  }

  function say(text, { clip, short = false, preferSystem = false } = {}) {
    if (!settings.on || !settings.volume || (!text && !clip)) return false;
    loadVoices();
    const hasSpeech = systemVoice && typeof globalThis.SpeechSynthesisUtterance === 'function';
    const taiwanSpeech = hasSpeech && /-tw(?:-|$)/.test(locale(systemVoice));
    const hasClip = clip && clips?.ready && !(preferSystem && taiwanSpeech);
    if (!hasClip && !hasSpeech) return false;
    stop();
    const line = { text, short };
    active = line;
    if (hasClip) void playClip(line, clip);
    else speakSystem(line);
    return true;
  }

  return {
    get on() { return settings.on; },
    get volume() { return settings.volume; },
    set(change) {
      if (typeof change.on === 'boolean') settings.on = change.on;
      if (Number.isFinite(change.volume)) settings.volume = clampVolume(change.volume);
      try { storage?.setItem(KEY, JSON.stringify(settings)); } catch {}
      if (!settings.on || settings.volume === 0) stop();
      else if (active?.gain) active.gain.gain.setTargetAtTime(settings.volume, clips.context.currentTime, .04);
    },
    say,
    /** Warm only the current lineup's calls, without delaying entry or filling the network queue. */
    prepareBattle(artIds) {
      if (!settings.on || !settings.volume || !clips?.ready) return;
      const batch = {};
      preloadBatch = batch;
      const queue = [...new Set(artIds)];
      async function warm() {
        while (preloadBatch === batch && settings.on && settings.volume && queue.length) {
          const id = queue.shift();
          try { await clips.load(clipUrl('art-' + id)); } catch { /* Retry on demand. */ }
        }
      }
      const workers = Math.min(4, queue.length);
      for (let i = 0; i < workers; i++) void warm();
    },
    endBattle() { preloadBatch = undefined; },
    shout(text, clip) {
      const now = Date.now();
      if (active || now - shouted < 2600) return false;
      if (!say(text, { clip, short: true })) return false;
      shouted = now;
      return true;
    },
    stop,
  };
}
