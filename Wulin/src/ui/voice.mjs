// Spoken lines. The page has no recorded voices; it asks the device to read
// Chinese text aloud, and gives each speaker a pitch and pace of their own so
// that a narrator, an old master and a young disciple do not sound alike.
// Where the device cannot speak Chinese, everything here quietly does nothing.

const KEY = 'wulin-voice';

/** A number from 0 to 1 that is always the same for the same name. */
function grain(name = '') {
  let sum = 7;
  for (const char of name) sum = (sum * 31 + char.codePointAt(0)) % 9973;
  return sum / 9973;
}

/**
 * @param storage where the player's choice is kept (localStorage, or anything like it)
 * @param synth   the device's speech synthesis; left out, the page's own
 */
export function createVoice(storage, synth = globalThis.speechSynthesis) {
  let settings = { on: true, volume: 0.9 };
  try {
    settings = { ...settings, ...JSON.parse(storage.getItem(KEY) ?? '{}') };
  } catch {
    // An unreadable choice is the same as none.
  }
  let voices = [];
  const load = () => {
    const all = synth?.getVoices?.() ?? [];
    // Mandarin of the mainland first, then any other Chinese the device has.
    voices = ['zh-CN', 'cmn', 'zh'].flatMap((prefix) => all.filter((voice) => voice.lang.replace('_', '-').startsWith(prefix)));
    voices = [...new Set(voices)];
  };
  load();
  synth?.addEventListener?.('voiceschanged', load);
  let shouted = 0;

  const voice = {
    /** Whether this device can read Chinese aloud at all. */
    get supported() {
      return !!synth && typeof SpeechSynthesisUtterance === 'function' && voices.length > 0;
    },
    get on() {
      return settings.on;
    },
    get volume() {
      return settings.volume;
    },
    set(change) {
      settings = { ...settings, ...change };
      try {
        storage.setItem(KEY, JSON.stringify(settings));
      } catch {
        // Kept for this visit only.
      }
      if (!settings.on) synth?.cancel?.();
    },
    /** How a speaker sounds: `{ voice, pitch, rate }`. With nobody given, the narrator. */
    tone(who) {
      if (!who) return { voice: voices[0], pitch: 0.95, rate: 0.98 };
      const g = grain(who.name),
        age = who.age ?? 30;
      // A device with a woman's and a man's voice lends each to its own; with one voice, pitch tells them apart.
      const named = voices.filter((v) => (who.female ? /female|女|xiaoxiao|xiaoyi|ting|mei/i : /\bmale|男|yunxi|yunyang|kangkang/i).test(v.name));
      const base = who.female ? 1.25 : 0.72;
      return {
        voice: named[Math.floor(g * named.length)] ?? voices[Math.floor(g * voices.length)] ?? voices[0],
        pitch: Math.max(0.3, Math.min(1.9, base + (g - 0.5) * 0.3 - Math.max(0, age - 45) * 0.006 + Math.max(0, 22 - age) * 0.02)),
        rate: Math.max(0.7, Math.min(1.3, 1.02 + (grain(who.name + '速') - 0.5) * 0.16 - Math.max(0, age - 50) * 0.006)),
      };
    },
    /** Reads a passage, in place of whatever was being read. */
    say(text, who = null) {
      if (!settings.on || !voice.supported || !text) return false;
      synth.cancel();
      return utter(text, who, 1);
    },
    /** A short cry in the middle of a fight. Never interrupts, and not more often than every few seconds. */
    shout(text, who) {
      const now = Date.now();
      if (!settings.on || !voice.supported || synth.speaking || now - shouted < 2600) return false;
      shouted = now;
      return utter(text, who, 1.12);
    },
    stop() {
      synth?.cancel?.();
    },
  };
  function utter(text, who, haste) {
    const tone = voice.tone(who),
      line = new SpeechSynthesisUtterance(text);
    line.lang = tone.voice?.lang ?? 'zh-CN';
    if (tone.voice) line.voice = tone.voice;
    line.pitch = tone.pitch;
    line.rate = tone.rate * haste;
    line.volume = settings.volume;
    synth.speak(line);
    return true;
  }
  return voice;
}
