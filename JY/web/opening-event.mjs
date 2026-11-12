import { animationFrames, modifySceneEvent, parseOpeningScript, runOpeningScript } from './cifa-opening.mjs';

export const openingEventId = 691;

export async function loadOpening() {
  const response = await fetch(`/api/event/${openingEventId}`);
  if (!response.ok) throw new Error(`无法读取原作事件 ${openingEventId}（${response.status}）`);
  const commands = parseOpeningScript(await response.text());
  const pictures = new Set();
  const portraits = new Set();
  for (const { name, args } of commands) {
    if (name === 'Talk') portraits.add(args[1]);
    if (name === 'PlayAnimation') {
      const { frames, final } = animationFrames(...args);
      for (const raw of [...frames, final]) pictures.add(args[0] === -1 ? raw : Math.trunc(raw / 2));
    }
  }
  return { commands, pictures: [...pictures], portraits: [...portraits] };
}

export async function playOpening({ opening, scene, slot, signal, view, sound = true }) {
  const framePeriod = 1000 / 60;
  let presented = 0;

  await runOpeningScript(opening.commands, {
    beforeCommand(command, index) {
      signal.throwIfAborted();
      view.command(command.name, index);
    },
    talk(text, head, style, voice) {
      // The supplied pack has no recordings for these dialogue voice IDs.
      return view.talk({ text, head, style, voice });
    },
    async animate(target, begin, end) {
      const { frames, final } = animationFrames(target, begin, end);
      const event = target === -1 ? undefined : scene.events[target];
      if (target !== -1 && !event) throw new Error(`动画找不到场景事件槽 ${target}`);
      function setPicture(raw, progress) {
        if (event) {
          event.beginPic = raw;
          event.currentPic = raw;
          event.endPic = raw;
        } else view.setPlayerPicture(raw);
        view.animationPose?.({ target, from: begin, to: end, picture: event ? raw : raw * 2, progress });
      }
      view.animationStart();
      for (const [index, raw] of frames.entries()) {
        signal.throwIfAborted();
        const started = performance.now();
        setPicture(raw, index / Math.max(1, frames.length - 1));
        await view.presentFrame();
        view.animationFrame(++presented, event ? Math.trunc(raw / 2) : raw);
        const remaining = framePeriod - (performance.now() - started);
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      }
      signal.throwIfAborted();
      setPicture(final, 1);
      view.requestFrame();
    },
    setTowards(direction) { view.setFacing(direction); },
    async playWave(id) {
      if (id !== 24) throw new Error(`未接入音效 ${id}`);
      if (!sound) return;
      const audio = new Audio(`/audio/wave/${id}.wav`);
      signal.addEventListener('abort', () => audio.pause(), { once: true });
      await audio.play().catch(() => {});
    },
    modifyEvent(...args) {
      modifySceneEvent(scene, slot, ...args);
      view.requestFrame();
    },
  });
}
