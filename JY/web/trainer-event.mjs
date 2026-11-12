import { parseTrainerScript } from './cifa-trainer.mjs';
export { playTrainer } from './cifa-trainer.mjs';

export const trainerEventId = 692;

export async function loadTrainer() {
  const response = await fetch(`/api/event/${trainerEventId}`);
  if (!response.ok) throw new Error(`無法讀取原作事件 ${trainerEventId}（${response.status}）`);
  return parseTrainerScript(await response.text());
}

