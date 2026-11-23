import { launch, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const server = await serve();
const browser = await launch();
const checks = [];
const problems = [];
let page;
const check = (ok, description) => checks.push([Boolean(ok), description]);

function watchAudio() {
  const connect = AudioNode.prototype.connect;
  const meters = new Map();
  AudioNode.prototype.connect = function (target, ...args) {
    if (target === this.context.destination) {
      const meter = this.context.createAnalyser();
      connect.call(this, meter);
      meters.set(this.context, meter);
    }
    return connect.call(this, target, ...args);
  };
  window.audioPeak = () => {
    let peak = 0;
    for (const [context, meter] of meters) {
      if (context.state !== 'running') continue;
      const samples = new Float32Array(meter.fftSize);
      meter.getFloatTimeDomainData(samples);
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    }
    return peak;
  };
}

for (const name of ['play', 'unpaint']) {
  try {
    page = await openPage(browser, server.url + 'SandScroll/?lang=zh&seed=1&backend=webgl2', {
      width: 873, height: 325, touch: true, before: (opened) => opened.addInitScript(watchAudio)
    });
    const at = (screen) => page.waitForFunction((expected) => window.egretGame?.ready && egretGame.screen === expected, screen);
    const button = (label) => page.getByRole('button', { name: label, exact: true });
    const tap = async (label) => {
      await button(label).waitFor();
      const { x, y, width, height } = await button(label).boundingBox();
      await page.touchscreen.tap(x + width / 2, y + height / 2);
    };
    const round = () => page.evaluate(() => {
      const { round } = egretGame.app;
      return { time: round.time, seed: round.seed, level: round.level.id };
    });
    const focus = () => page.evaluate(() => egretGame.app.game.keyboard.getSnapshot().focusedId);
    const peak = (ms) => page.evaluate(async (duration) => {
      let peak = 0;
      const end = performance.now() + duration;
      while (performance.now() < end) {
        peak = Math.max(peak, audioPeak());
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      return peak;
    }, ms);
    await at('title');
    await tap(name === 'play' ? '今日试笔' : '拆画');
    if (name === 'unpaint') {
      await at('pick');
      await tap('青峰');
    }
    await at(name);
    await until(page, () => window.audioPeak() > 1e-5, 8);
    await tap('暂停');
    await button('继续').waitFor();
    const resumeHeight = (await button('继续').boundingBox()).height;
    check(resumeHeight >= 44, `${name}: Continue is at least 44 CSS pixels high (${resumeHeight.toFixed(1)})`);
    const initialFocus = await focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    check(initialFocus && await focus() === initialFocus, `${name}: Tab wraps inside pause controls`);
    await page.keyboard.press('Shift+Tab');
    const reverseFocus = await focus();
    await page.keyboard.press('Tab');
    check(reverseFocus && reverseFocus !== initialFocus && await focus() === initialFocus, `${name}: Shift+Tab also wraps inside pause controls`);
    // The analyser includes samples from before the mute until its first silent block.
    await until(page, () => window.audioPeak() < 1e-6, 8);
    const before = await round();
    const monitoring = peak(1300);
    await page.setViewportSize({ width: 325, height: 873 });
    await until(page, () => egretGame.ready && egretGame.app.stage.height === 960, 8);
    const highest = Math.max(await monitoring, await peak(350));
    const after = await round();
    const stillPaused = await button('继续').isVisible();
    check(stillPaused && before.time === after.time, `${name}: portrait rebuild retains the pause menu and frozen timer`);
    check(before.seed === after.seed && before.level === after.level, `${name}: the same round survives rebuild`);
    check(highest < 1e-6, `${name}: the audio bus stays silent through rotation (peak ${highest.toFixed(5)})`);
    if (stillPaused) {
      await tap('继续');
      await until(page, () => window.audioPeak() > 1e-5, 8);
      check((await round()).time > after.time, `${name}: Continue resumes time and digital audio`);
    }

    // Fixture: finish the same round without having to play to its score or grain target.
    await page.evaluate((mode) => {
      const game = egretGame.app.round;
      window.finishedRound = game;
      if (mode === 'unpaint') game.collected = game.total;
      else game.cleared = game.level.target;
    }, name);
    await until(page, () => window.finishedRound.over, 8);
    await tap('暂停');
    await button('继续').waitFor();
    const countdown = await page.evaluate(() => egretGame.current.settlement?.wait);
    await page.setViewportSize({ width: 873, height: 325 });
    await until(page, () => egretGame.ready && egretGame.app.stage.width === 960, 8);
    const savedPause = await button('继续').isVisible();
    const preserved = await page.evaluate(() => ({
      round: egretGame.app.round === window.finishedRound,
      countdown: egretGame.current.settlement?.wait
    }));
    check(savedPause && preserved.round && countdown > 0 && preserved.countdown === countdown, `${name}: rotating during paused settlement keeps the finished round and its countdown`);
    if (savedPause) {
      await tap('继续');
      await until(page, () => egretGame.ready && egretGame.screen === 'end', 8);
      check(await page.evaluate(() => egretGame.app.round === window.finishedRound), `${name}: Continue reaches the original round's settlement`);
    }
  } catch (error) {
    check(false, `${name}: ${error.message.split('\n')[0]}`);
  } finally {
    if (page) {
      problems.push(...page.problems);
      await page.context().close();
      page = undefined;
    }
  }
}
await browser.close();
await server.close();
report('SandScroll pause across rotation (headless Chromium, SwiftShader)', checks, problems);
