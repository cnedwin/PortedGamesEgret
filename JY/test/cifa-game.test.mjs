import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGameScript, runGameScript } from '../src/cifa-game.mjs';

test('whole-game Cifa uses native short circuit and supplies optional integer arguments', async () => {
  const program = parseGameScript(`
    if (CheckRoleAttack(0, 90, 100) && HaveItemBool(143)) {
      BreakStoneGate();
    }
    Talk("先休息吧。", 0, 1);
    if (!TryBattle(2)) { exit(); }
    NewTalk("出發。", 0, 0);
  `);
  const calls = [];
  await runGameScript(program, (name, ...args) => {
    calls.push([name, ...args]);
    if (name === 'checkroleattack') return Promise.resolve(false);
    if (name === 'trybattle') return true;
  });
  assert.deepEqual(calls, [
    ['checkroleattack', 0, 90, 100], ['talk', '先休息吧。', 0, 1, -1],
    ['trybattle', 2, -1], ['newtalk', '出發。', 0, 0, -1],
  ]);
});

test('game Cifa repairs only the original event 676 ingredient guard', async () => {
  const source = `
    if (!checkHave5Item(138, 139, 140, 141, 142))
    {
      Talk("請先找齊材料。", 75, 0, 2481);
      exit();
      AddItemWithoutHint(138, -1);
      AddItem(176, 1);
  `;
  assert.throws(() => parseGameScript(source), /expected }/);
  const program = parseGameScript(source, { eventId: 676 });
  for (const [hasIngredients, expected] of [
    [false, [['talk', '請先找齊材料。', 75, 0, 2481]]],
    [true, [['additemwithouthint', 138, -1], ['additem', 176, 1]]],
  ]) {
    const calls = [];
    await runGameScript(program, (name, ...args) => {
      if (name === 'checkhave5item') return hasIngredients;
      calls.push([name, ...args]);
    });
    assert.deepEqual(calls, expected);
  }
});

test('event 458 exits after praise and lets low morality reach the rematch', async () => {
  const source = `
    if (CheckRoleMorality(0, 50, 100))
    {
      Talk("最近江湖上對你的風評還挺不錯的，希望你繼續保持下去.", 68, 0, 1645);
    }
    exit();
    Talk("你這作惡多端的小子，老道饒不了你．", 68, 0, 1644);
    if (!TryBattle(75)) { LightScene(); exit(); }
    ModifyEvent(-2, -2, -2, -2, 459, -1, -1, -2, -2, -2, -2, -2, -2);
    LightScene();
  `;
  const program = parseGameScript(source, { eventId: 458 });
  for (const [morality, outcome, expected] of [
    [50, false, ['talk:1645']],
    [49, false, ['talk:1644', 'battle:75', 'lightscene']],
    [49, true, ['talk:1644', 'battle:75', 'next:459', 'lightscene']],
  ]) {
    const seen = [];
    await runGameScript(program, (name, ...args) => {
      if (name === 'checkrolemorality') return morality >= args[1] && morality <= args[2];
      if (name === 'talk') seen.push(`talk:${args[3]}`);
      if (name === 'trybattle') { seen.push(`battle:${args[0]}`); return outcome; }
      if (name === 'modifyevent') seen.push(`next:${args[4]}`);
      if (name === 'lightscene') seen.push(name);
    });
    assert.deepEqual(seen, expected);
  }
});

test('whole-game Cifa rejects calls absent from the resource corpus', () => {
  assert.throws(() => parseGameScript('RunFile("other");'), /unsupported call runfile/);
  assert.throws(() => parseGameScript('TryBattle();'), /trybattle expects 1 or 2 arguments/);
});
