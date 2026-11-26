// 自检（?check=1）：用引擎的界面测试工具（@egret/engine/ui/testing），按名字在语义树里找到按钮、按下去，
// 走一遍「选关 → 第一关 → 试通 → 过桥」，结果写在控制台和 window.egretGame.check 里。真机上没有自动化工具时用它。
// The self check (?check=1): with the engine's UI tester (@egret/engine/ui/testing) it finds buttons by name in the
// semantic tree and presses them, through levels → the first level → test → across, and writes the outcome to the
// console and to window.egretGame.check. It serves on devices where no automation tool is at hand.
import { createUiTester } from '@egret/engine/ui/testing';

export async function selfCheck(app, egret, semantics) {
  const tester = createUiTester({ semantics, advance: (seconds) => new Promise((r) => setTimeout(r, seconds * 1000)) });
  const steps = [];
  const note = (step, ok, detail = '') => {
    steps.push({ step, ok, detail });
    console.log(`[check] ${ok ? 'ok' : 'FAIL'} ${step} ${detail}`);
  };
  const until = async (test, seconds = 20) => {
    for (let t = 0; t < seconds * 10; t++) {
      if (test()) return true;
      await tester.wait(0.1);
    }
    return false;
  };
  try {
    await until(() => egret.ready && !egret.busy);
    note('title', tester.exists(`button:${app.say('levels')}`));
    tester.press(`button:${app.say('levels')}`);
    note('levels', await until(() => egret.screen === 'levels'));
    tester.press(`button:1-1 ${egret.levelById('1-1').name[app.lang()]}`);
    await until(() => egret.screen === 'build');
    note('site', egret.screen === 'build', egret.view?.level?.id ?? '');
    if (egret.overlay === 'tip') tester.press(`button:${app.say('gotIt')}`);
    // The reference drawing of the level goes in through the screen, as a player would have built it.
    const level = egret.view.level;
    if (!egret.view.design.members.length) {
      app.update((d) => (d.designs[level.id] = level.reference));
      await app.go('build', level.id);
      if (egret.overlay === 'tip') tester.press(`button:${app.say('gotIt')}`);
    }
    tester.press(`button:${app.say('test')}`);
    note('test', await until(() => egret.view?.running), '');
    const ended = await until(() => egret.overlay === 'result', 60);
    note('crossing', ended, ended ? tester.text(`heading:${app.say('won')}`) || '' : '');
  } catch (cause) {
    note('error', false, String(cause?.message ?? cause));
  }
  egret.check = { passed: steps.every((s) => s.ok), steps };
  console.log(`[check] ${egret.check.passed ? 'PASSED' : 'FAILED'}`);
  return egret.check;
}
