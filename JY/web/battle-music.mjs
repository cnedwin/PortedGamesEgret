async function readBinary(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法讀取 ${url}（${response.status}）`);
  return response.arrayBuffer();
}

export function createBattleMusic(enabled = true) {
  let context;
  let initializing;
  let player;
  let generation = 0;

  function unlock() {
    if (!enabled) return Promise.resolve();
    context ??= new AudioContext();
    return context.resume();
  }

  async function prepare(audioContext) {
    const processor = document.querySelector('meta[name=jy-music-processor]')?.content
      ?? '/music-lib/spessasynth_lib/spessasynth_processor.min.js';
    const [{ Sequencer, WorkletSynthesizer }, soundBank] = await Promise.all([
      import('spessasynth_lib'), readBinary('/audio/midi/mid.sf2'),
      audioContext.audioWorklet.addModule(processor),
    ]);
    const synth = new WorkletSynthesizer(audioContext);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const gain = audioContext.createGain();
    gain.gain.value = 0.45;
    synth.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioContext.destination);
    await synth.soundBankManager.addSoundBank(soundBank, 'kys-mid');
    await synth.isReady;
    return { synth, analyser, sequencer: new Sequencer(synth), samples: new Float32Array(analyser.fftSize) };
  }

  function stop() {
    generation++;
    player?.sequencer.pause();
    player?.synth.stopAll(true);
  }

  return {
    unlock,
    async play(track) {
      stop();
      if (!enabled || !Number.isInteger(track) || track < 1) return;
      const token = generation;
      const resumed = unlock();
      initializing ??= prepare(context).catch(error => {
        initializing = undefined;
        throw error;
      });
      const [ready, binary] = await Promise.all([initializing, readBinary(`/audio/midi/${track}.mid`), resumed]);
      if (token !== generation) return;
      player = ready;
      const { sequencer } = player;
      sequencer.loadNewSongList([{ binary, fileName: `${track}.mid` }]);
      sequencer.loopCount = Infinity;
      sequencer.play();
    },
    stop,
    level() {
      if (!player || player.sequencer.paused || !player.sequencer.midiData || context.state !== 'running') return 0;
      const { analyser, samples } = player;
      analyser.getFloatTimeDomainData(samples);
      return Math.max(...samples.map(Math.abs));
    },
    close() {
      stop();
      player?.synth.destroy();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
  };
}
