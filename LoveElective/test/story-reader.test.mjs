import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the real runner with only drawing/input adapters replaced. These
// checks prove scheduling and reader policy, not browser rendering or hardware.
const source = readFileSync(new URL('../src/screens/story.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export async function playScript', 'async function playScript');
const loadRunner = new Function('W', 'THEME', 'FONT', 'SERIF', 'wrapText', 'rgba', 'rrect', 'poly',
  'HEROINES', 'STATS', 'GIFTS', 'SUPPLIES', 'CLOTHES', 'SLOTS_OF_DAY', 'sim', 'openWardrobe', source + '\nreturn playScript;');
const wrapText = (_g, text) => String(text).split('\n');
const runner = loadRunner(1280, { violet: '#000', soft: '#000', sky: '#000', ink: '#000' }, '', '', wrapText,
  () => '', () => ({}), () => ({}), { linxia: { name: ['林夏', 'Lin Xia'], color: '#000' } }, {}, {}, {},
  { shirt: { name: ['襯衫', 'Shirt'] }, trousers: { name: ['長褲', 'Trousers'] } }, [{ light: 'day' }],
  { bailuZeroMatches: (s, key) => Boolean(s.flags[key]), socialStatus: () => ({ lead: 'linxia' }),
    pieces: wear => Object.values(wear).filter(Boolean), applyEffect: () => 0 }, async () => {});
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness(t, script, reader, { language = 'zh', deferLines = false, holdFastWait = false } = {}) {
  const original = { document: globalThis.document, add: globalThis.addEventListener, remove: globalThis.removeEventListener };
  const listeners = new Map(), ticks = new Set(), panels = [], nativeHandles = [], heldWaits = [];
  const listen = (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); };
  const unlisten = (type, fn) => listeners.get(type)?.delete(fn);
  const g = { measureText: text => ({ width: String(text).length * 12 }), stroke() {}, fill() {} };
  let releaseLines;
  const linesReady = deferLines ? new Promise(resolve => { releaseLines = resolve; }) : Promise.resolve();
  globalThis.document = { hidden: false, createElement: () => ({ getContext: () => g }),
    addEventListener: (type, fn) => listen('document:' + type, fn), removeEventListener: (type, fn) => unlisten('document:' + type, fn) };
  globalThis.addEventListener = listen;
  globalThis.removeEventListener = unlisten;
  const ui = {
    panel() {
      const panel = { node: { visible: true }, buttons: [], closed: false, close() { this.closed = true; },
        nativeLines(lines, style) {
          const handle = { lines, style, ready: linesReady, reveals: [], all: 0, closed: false,
            reveal(line, pixels) { this.reveals.push([line, pixels]); },
            showAll() { this.all++; }, close() { this.closed = true; } };
          nativeHandles.push(handle);
          return handle;
        },
        paint(fn) {
          this.buttons = [];
          const record = (x, y, w, h, label, tap, options = {}) => this.buttons.push({ label, tap, options });
          fn({ g, sheet() {}, card() {}, text() {}, chip() {}, measure: text => String(text).length * 12,
            button: record, hit: (x, y, w, h, tap, options) => record(x, y, w, h, options?.label, tap, options) });
        } };
      panels.push(panel);
      return panel;
    },
  };
  const voiceCalls = [];
  const game = {
    ui, lang: language, state: { slot: 0, flags: { branch: true }, hero: { wear: { bottom: { id: 'trousers' } } },
      girls: { linxia: { wear: { top: { id: 'shirt' } } } } },
    L: pair => Array.isArray(pair) ? pair[language === 'zh' ? 0 : 1] : pair,
    stage: {
      tween: async (target, values) => { Object.assign(target, values); },
      wait: seconds => holdFastWait && seconds === .03 ? new Promise(resolve => heldWaits.push(resolve)) : Promise.resolve(),
      onTick(fn) { ticks.add(fn); return () => ticks.delete(fn); } },
    world: { actor: null, async showActor() { this.actor = { x: 640, full: false }; }, async hideActor() { this.actor = null; },
      async setScene() {}, moveActor() {}, effect() {} },
    spec: (id, expr) => ({ id, expr }), save() {}, toast() {},
    audio: { stopVoice() {}, play() {}, setMusic() {}, voice(id) { voiceCalls.push(id); }, prefetchVoice() {} },
  };
  let done = false, result;
  const playing = runner(game, script, { reader, exitLabel: ['退出', 'Exit'] }).then(value => { done = true; result = value; });
  const h = {
    game, panels, nativeHandles, listeners, voiceCalls, heldWaits,
    get done() { return done; }, get result() { return result; },
    key(key, e) { ui.keys?.(key, e); },
    emit(type, event = {}) { for (const fn of [...listeners.get(type) ?? []]) fn(event); },
    async tick(dt = 2) { await flush(); for (const fn of [...ticks]) fn(dt); await flush(); },
    async until(predicate) { for (let i = 0; i < 60 && !predicate(); i++) await flush(); assert.ok(predicate(), 'Runner reached the expected state'); },
    button(label) { return panels.filter(p => !p.closed).flatMap(p => p.buttons).find(b => b.label === label); },
    click(label) { const b = this.button(label); assert.ok(b, 'Visible button: ' + label); if (!b.options.disabled) b.tap(); },
    releaseLines: () => releaseLines?.(),
    async finishByHand() {
      for (let i = 0; i < 80 && !done; i++) {
        await this.tick();
        if (game.storyStatus?.choices?.length) this.key('1'); else ui.background?.();
        await flush();
      }
      assert.ok(done);
      await playing;
    },
  };
  t.after(async () => {
    releaseLines?.();
    for (const resolve of heldWaits.splice(0)) resolve();
    if (!done) { h.key('Escape'); await flush(); }
    globalThis.document = original.document;
    if (original.add === undefined) delete globalThis.addEventListener; else globalThis.addEventListener = original.add;
    if (original.remove === undefined) delete globalThis.removeEventListener; else globalThis.removeEventListener = original.remove;
  });
  return h;
}

test('reader skip never advances a line that was unread on entry, even after marking it', async t => {
  const marked = [];
  const h = harness(t, [['n', '第一次', 'First'], ['n', '第二次', 'Second']],
    { has: () => false, mark: (key, text) => marked.push([key, text]) });
  await h.until(() => h.game.storyStatus?.text === '第一次');
  assert.equal(h.button('快进已读').options.disabled, true);
  assert.equal(marked.length, 0);
  h.key('Control');
  h.click('快进已读');
  await h.tick();
  assert.deepEqual(marked, [['0', JSON.stringify(['第一次', 'First'])]]);
  h.key('Control', { repeat: true });
  await h.tick();
  assert.equal(h.game.storyStatus.text, '第一次');
  assert.equal(marked.length, 1);
  h.game.ui.background();
  await h.until(() => h.game.storyStatus?.text === '第二次');
  await h.finishByHand();
});

test('enabled skip crosses read text and stops before an unread voiced line', async t => {
  const h = harness(t, [['n', '已讀', 'Read'], ['voice', 'social-pool-01'], ['linxia', 'smile', '新句', 'New']],
    { has: key => key === '0', mark() {} });
  await h.until(() => h.game.storyStatus?.text === '已讀');
  h.click('快进已读');
  // The retained text may become ready before this input. A clock tick then finishes its reveal,
  // and the following tick consumes the skip; either scheduling path must stop on the unread line.
  for (let i = 0; i < 3 && h.game.storyStatus?.text === '已讀'; i++) await h.tick();
  await h.until(() => h.game.storyStatus?.text === '新句');
  assert.deepEqual(h.voiceCalls, ['social-pool-01']);
  await h.tick();
  await h.tick();
  assert.equal(h.done, false);
  assert.equal(h.game.storyStatus.text, '新句');
  await h.finishByHand();
});

test('changed text at a previously read step remains unread', async t => {
  const seen = new Map([['0', JSON.stringify(['舊句', 'Old line'])]]);
  const h = harness(t, [['n', '改過的新句', 'Updated line']],
    { has: (key, text) => seen.get(key) === text, mark: (key, text) => seen.set(key, text) });
  await h.until(() => h.game.storyStatus?.text === '改過的新句');
  assert.equal(h.game.storyStatus.readAtEntry, false);
  assert.equal(h.button('快进已读').options.disabled, true);
  h.key('Control');
  await h.tick();
  assert.equal(h.done, false);
  assert.equal(seen.get('0'), JSON.stringify(['改過的新句', 'Updated line']));
  await h.finishByHand();
});

test('a fresh choice blocks held Control until release and a new press', async t => {
  const marks = [];
  const h = harness(t, [['n', '起點', 'Start'], ['pick', [{ t: ['甲', 'A'], then: [['n', '分支甲', 'Branch A']] }]], ['n', '終點', 'End']],
    { has: () => true, mark: (key, text) => marks.push([key, text]) });
  await h.until(() => h.game.storyStatus?.text === '起點');
  h.key('Control');
  await h.tick();
  await h.tick();
  await h.until(() => h.game.storyStatus?.choices?.length === 1);
  h.key('Control', { repeat: true });
  h.key('1');
  await h.until(() => h.game.storyStatus?.text === '分支甲');
  h.key('Control', { repeat: true });
  await h.tick();
  await h.tick();
  assert.equal(h.game.storyStatus.text, '分支甲');
  h.emit('keyup', { key: 'Control' });
  h.key('Control');
  for (let i = 0; i < 5 && !h.done; i++) await h.tick();
  assert.equal(h.done, true);
  assert.deepEqual(marks.map(([key]) => key), ['0', '1.choice0.0', '2']);
});

test('reader identity keeps nested branches and both dynamic outfit lines separate', async t => {
  const has = [], marks = [];
  const script = [['n', '共同', 'Shared'], ['pick', [{ t: ['選', 'Choose'], then: [['n', '選後', 'After choice']] }]],
    ['branch', 'branch', [['n', '近', 'Close']], [['n', '遠', 'Far']]], ['social-outfit-note', 'pool']];
  const h = harness(t, script, { has: (key, text) => { has.push([key, text]); return false; }, mark: (key, text) => marks.push([key, text]) });
  await h.until(() => h.game.storyStatus?.text === '共同');
  await h.finishByHand();
  assert.deepEqual(has.map(([key]) => key), ['0', '1.choice0.0', '2.yes.0', '3.lead', '3.hero']);
  assert.deepEqual(has, marks);
  assert.deepEqual(JSON.parse(has[0][1]), ['共同', 'Shared']);
  assert.deepEqual(JSON.parse(has[3][1]), ['她選的穿搭：襯衫。', 'Her chosen outfit: Shirt.']);
  assert.deepEqual(JSON.parse(has[4][1]), ['你選的穿搭：長褲。', 'Your chosen outfit: Trousers.']);
});

test('cancellation during native line preparation never marks undisplayed text', async t => {
  const marks = [];
  const h = harness(t, [['n', '尚未顯示', 'Not displayed']], { has: () => false, mark: (...args) => marks.push(args) }, { deferLines: true });
  await h.until(() => h.game.storyStatus?.text === '尚未顯示');
  h.key('Escape');
  h.releaseLines();
  await h.until(() => h.done);
  assert.deepEqual(marks, []);
  assert.deepEqual(h.result, { completed: false });
  assert.ok(h.nativeHandles.every(handle => handle.closed), 'native text is released after cancellation');
});

test('native dialogue reveals in the original two-tap sequence and retires each line', async t => {
  const h = harness(t, [['n', '第一句尚未完全顯示', 'First line'], ['n', '第二句', 'Second line']], undefined);
  await h.until(() => h.nativeHandles.length === 1);
  const first = h.nativeHandles[0];
  assert.deepEqual(first.lines, ['第一句尚未完全顯示']);
  assert.deepEqual(first.reveals[0], [0, 0]);
  await h.tick(.001);
  assert.ok(first.reveals.some(([line, pixels]) => line === 0 && pixels > 0));
  assert.equal(first.all, 0);
  h.game.ui.background();
  await h.tick(.01);
  assert.equal(first.all, 1, 'first tap finishes the current line');
  assert.equal(h.game.storyStatus.text, '第一句尚未完全顯示');
  h.game.ui.background();
  await h.until(() => h.nativeHandles.length === 2);
  assert.equal(first.closed, true, 'the previous native lines are retired');
  await h.finishByHand();
  assert.ok(h.nativeHandles.every(handle => handle.closed), 'all native lines are released on exit');
});

test('Control release during the skip delay leaves the current read line visible', async t => {
  const h = harness(t, [['n', '起點', 'Start'], ['n', '下一句', 'Next']],
    { has: () => true, mark() {} }, { holdFastWait: true });
  await h.until(() => h.game.storyStatus?.text === '起點');
  h.key('Control');
  await h.tick();
  await h.tick();
  await h.until(() => h.heldWaits.length > 0);
  const releasedLine = h.game.storyStatus.text;
  h.emit('keyup', { key: 'Control' });
  h.heldWaits.shift()();
  await flush();
  await h.tick();
  assert.equal(h.done, false);
  assert.equal(h.game.storyStatus.text, releasedLine);
  await h.finishByHand();
});

test('hidden or cancelled text is not added to read history', async t => {
  const marks = [];
  const h = harness(t, [['n', '背景中的句子', 'A background line']],
    { has: () => false, mark: (...args) => marks.push(args) });
  await h.until(() => h.game.storyStatus?.text === '背景中的句子');
  document.hidden = true;
  h.emit('document:visibilitychange');
  await h.tick();
  assert.deepEqual(marks, []);
  document.hidden = false;
  await h.tick();
  assert.equal(marks.length, 1);
  h.key('Escape');
  await h.until(() => h.done);
  assert.equal([...h.listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
});

test('without reader the original Skip still skips fresh text and registers no reader listeners', async t => {
  const h = harness(t, [['n', '甲', 'A'], ['n', '乙', 'B']], undefined);
  await h.until(() => h.game.storyStatus?.text === '甲');
  h.click('跳过');
  for (let i = 0; i < 5 && !h.done; i++) await h.tick();
  assert.equal(h.done, true);
  assert.equal([...h.listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
});
