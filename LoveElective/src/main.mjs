// Start-up and the overall flow of a play-through:
// title → prologue → days on campus → the last night → ending → title.
import { createGame } from './game.mjs';
import { titleScreen } from './screens/title.mjs';
import { playScript } from './screens/story.mjs';
import { campus } from './screens/campus.mjs';
import { finale } from './screens/finale.mjs';
import { PROLOGUE } from './story/scenes.mjs';
import { preloadCharacterArt } from './art/character-art.mjs';

const canvas = document.getElementById('stage');
const errorBox = document.getElementById('error');
const params = new URLSearchParams(location.search);

function showError(error) {
  console.error(error);
  // If WebGPU was asked for and failed, play with WebGL2 instead.
  if (canvas.dataset.backend === 'webgpu') {
    params.set('backend', 'webgl2');
    location.replace(`${location.pathname}?${params}`);
    return;
  }
  errorBox.hidden = false;
  errorBox.textContent = `游戏遇到了问题，请刷新页面重试。 / Something went wrong. Please reload the page.\n${error?.code ?? ''} ${error?.message ?? error}`;
}

/** Keep the 16:9 picture as large as the window allows. */
function fit() {
  const k = Math.min(innerWidth / 1280, innerHeight / 720);
  canvas.style.width = Math.floor(1280 * k) + 'px';
  canvas.style.height = Math.floor(720 * k) + 'px';
}
addEventListener('resize', fit);
fit();

async function start() {
  await preloadCharacterArt();
  // WebGL2 by default; ?backend=webgpu draws with WebGPU where the browser has it.
  let backend = params.get('backend') === 'webgpu' && navigator.gpu ? 'webgpu' : 'webgl2';
  const pixelRatio = Math.min(2, Math.max(1, Number(params.get('ratio')) || Math.min(devicePixelRatio || 1, 1.5)));
  let game;
  canvas.dataset.backend = backend;
  try {
    game = await createGame(canvas, { backend, pixelRatio, onError: showError });
  } catch (error) {
    if (backend !== 'webgpu') throw error;
    backend = 'webgl2';
    game = await createGame(canvas, { backend, pixelRatio, onError: showError });
  }
  canvas.dataset.backend = backend;
  canvas.addEventListener('pointerdown', () => game.audio.unlock());
  addEventListener('keydown', () => game.audio.unlock());
  window.loveElective = game; // handy for inspecting a running game from the console

  for (;;) {
    const choice = await titleScreen(game);
    if (choice === 'continue' && game.load()) {
      await game.fadeIn();
    } else {
      game.newGame();
      await game.world.setScene('gate', 'day');
      await game.fadeIn();
      await playScript(game, PROLOGUE, { light: 'day' });
      game.save();
    }
    await campus(game);
    await finale(game);
    await game.fadeOut();
  }
}

start().catch(showError);
