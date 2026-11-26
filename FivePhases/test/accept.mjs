import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [], problems = [];
const ok = message => checks.push([true, message]);
const server = await serve();
const url = server.url + 'FivePhases/';
let browser;
const WIDTH = 750, HEIGHT = 1624;
const MUTE = 'fivephases.audio.muted';

// The game normally seeds each new round from Date.now(). A fixed test clock
// makes the board and hand repeatable without changing the production rules.
const fixedSeed = page => page.addInitScript(() => { Date.now = () => 7; });
const idle = page => until(page, () => fivephases.ready && fivephases.lock === null && !fivephases.busy, 45);
const title = page => until(page, () => window.fivephases?.ready && fivephases.lock === 'title' && fivephases.ui.active === 'title', 45);
const semanticPress = (page, label) => page.evaluate(label => fivephases.ui.tester.press('button:' + label), label);
const status = page => page.evaluate(() => {
  const g = fivephases;
  return { steps: g.battle.steps, turn: g.battle.turn, board: [...g.battle.board.kind],
    hand: g.battle.hand.map(c => c.uid), energy: { ...g.battle.energy }, enemy: g.battle.enemy.id, hp: g.battle.hero.hp,
    cards: [...g.battle.deck, ...g.battle.hand, ...g.battle.discard].map(c => c.id).sort(), lock: g.lock,
    active: g.ui.active, modal: g.ui.modalOpen, faults: g.stats().updateFaults };
});
async function control(page, name) {
  const result = await page.evaluate(name => {
    const u = fivephases.ui, record = u.buttons().find(b => b.name === name), r = u.clientRect(name);
    return record && r ? { ...record, bounds: r, viewport: [innerWidth, innerHeight],
      hit: Boolean(document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)) } : null;
  }, name);
  assert(result, 'Missing native control ' + name);
  const r = result.bounds;
  assert(r.width > 0 && r.height > 0 && r.x >= -1 && r.y >= -1 && r.x+r.width <= result.viewport[0]+1 &&
    r.y+r.height <= result.viewport[1]+1 && result.hit, 'Offscreen native control: ' + name);
  return { ...result, x: r.x+r.width/2, y:r.y+r.height/2 };
}
async function tap(page, name, touch = false) {
  const { x, y } = await control(page, name);
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
async function legalPoints(page) {
  return page.evaluate(() => {
    const move = fivephases.hint(), r = fivephases.ui.boardRect();
    if (!move || !r) return null;
    return move.map(i => ({ x: r.x + (i%7+.5)*r.width/7, y: r.y + (Math.floor(i/7)+.5)*r.height/7 }));
  });
}
async function twoTaps(page, touch = false) {
  const before = await status(page), points = await legalPoints(page);
  assert(points?.length === 2, 'No legal swap');
  for (const p of points) {
    if (touch) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
  }
  await until(page, () => !fivephases.busy && fivephases.lock === null, 45);
  const after = await status(page);
  assert.equal(after.steps, before.steps-1, 'Two taps must perform one valid board move');
}
async function drag(page, touch = false) {
  const before = await status(page), points = await legalPoints(page);
  assert(points?.length === 2);
  const [a,b] = points;
  const scroll = await page.evaluate(() => [scrollX, scrollY]);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const finger = p => ({ x:p.x,y:p.y,id:1,radiusX:2,radiusY:2,force:1 });
    let held = false;
    try {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(a)]});held=true;
      for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger({x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5})]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=false;
    } finally {
      if(held)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      await cdp.detach();
    }
  } else {
    await page.mouse.move(a.x,a.y);await page.mouse.down();
    try { await page.mouse.move(b.x,b.y,{steps:5}); }
    finally { await page.mouse.up(); }
  }
  await idle(page);
  const after = await status(page);
  assert.equal(after.steps,before.steps-1,'A drag must perform one valid board move');
  assert.deepEqual(await page.evaluate(()=>[scrollX,scrollY]),scroll,'Board input must not scroll the page');
}
async function baseline(page, name) {
  const result = await matchBaseline(page, gameDir, name);
  assert(result.written || result.passed, 'Screenshot mismatch: ' + name + ' ' + result.share);
  ok('screenshot ' + name + (result.written ? ' captured' : ' matches: ' + (result.share*100).toFixed(2) + '%'));
}

// Short explicit settlement fixture: use the same game play and animation
// path with a prepared one-HP enemy and a legal attack. It tests UI states, not
// natural chapter difficulty; the full chapter is separately accepted on real devices.
async function settleFixture(page, bestChain) {
  await idle(page);
  await page.evaluate(async best => {
    const g = fivephases;
    const { cardById } = await import(new URL('src/core/cards.mjs',location.href));
    const card = { ...cardById('fire-slash'), uid:'accept-settlement' };
    g.battle.bestChain = best;
    g.battle.enemy.hp = 1;
    g.battle.enemy.shield = 0;
    g.battle.hand = [card];
    g.battle.energy.fire = 10;
    g.play(card.uid);
  },bestChain);
  await until(page, () => ['reward','over'].includes(fivephases.lock), 30);
}

try {
  browser = await launch();
  if (process.argv.includes('--death-boundary-only')) {
    // Targeted regression for the transition from a visible combat intent
    // to a defeated enemy. The old empty semantic name stopped the frame loop.
    const probe = await openPage(browser,url,{width:900,height:960,before:fixedSeed,reducedMotion:true});
    try {
      await title(probe);
      await semanticPress(probe,'开阵');
      await idle(probe);
      await settleFixture(probe,7);
      assert.equal((await status(probe)).lock,'reward');
      assert.equal(await probe.evaluate(()=>fivephases.ui.active),'reward');
      for(let i=0;i<3;i++)await control(probe,'reward-'+i);
      assert.match(await probe.evaluate(()=>fivephases.ui.tester.outline()),/择一张牌/);
      assert(!probe.problems.some(p=>p.includes('UI_SEMANTICS_DESCRIPTION')));
      await tap(probe,'reward-0');await idle(probe);
      assert.equal((await status(probe)).enemy,'chijiao');
      assert.equal((await status(probe)).faults,0);
      ok('defeated enemy publishes valid semantics and actual reward advances');
    } finally {
      problems.push(...probe.problems);await probe.context().close();
    }
  } else {
  const desktop = await openPage(browser,url,{width:900,height:960,before:fixedSeed,reducedMotion:true});
  try {
    await title(desktop);
    assert.equal(await desktop.evaluate(()=>fivephases.ui.backend),'webgl2');
    await baseline(desktop,'title');

    // Name-based activation reaches the native semantic tree, not HTML buttons.
    await semanticPress(desktop,'阵法说明');
    await until(desktop,()=>fivephases.ui.modalOpen,5);
    assert(await desktop.evaluate(()=> {
      try { fivephases.ui.tester.press('button:开阵'); return false; }
      catch { return fivephases.lock === 'title'; }
    }), 'Guide must make the title start control inert');
    await semanticPress(desktop,'返回');
    await until(desktop,()=>!fivephases.ui.modalOpen,5);
    ok('native title and rules modal via semantic controls');

    const mutedBefore = await desktop.evaluate(key=>localStorage.getItem(key)==='1',MUTE);
    await tap(desktop,'mute');
    assert.equal(await desktop.evaluate(key=>localStorage.getItem(key)==='1',MUTE),!mutedBefore);
    await desktop.reload();
    await title(desktop);
    assert.equal(await desktop.evaluate(key=>localStorage.getItem(key)==='1',MUTE),!mutedBefore);
    assert.equal((await control(desktop,'mute')).text,mutedBefore?'声音':'静音');
    await tap(desktop,'mute');
    assert.equal(await desktop.evaluate(key=>localStorage.getItem(key)==='1',MUTE),mutedBefore);
    ok('mute preference, reload, and toggle back');

    await semanticPress(desktop,'开阵');
    await idle(desktop);
    const initial = await status(desktop);
    assert.equal(initial.enemy,'shanjiao');assert.equal(initial.hp,1000);assert.equal(initial.steps,3);
    assert.equal(initial.hand.length,5);
    await tap(desktop,'hand-details');
    await until(desktop,()=>fivephases.ui.modalOpen,5);
    // The fixed clock determines the actual card list. The normal native
    // details modal is captured; the battle animation behind it is dimmed.
    await baseline(desktop,'hand-details');
    const points=await legalPoints(desktop);
    assert(points?.length===2);
    for(const p of points)await desktop.mouse.click(p.x,p.y);
    const covered=await status(desktop);
    assert.equal(covered.steps,initial.steps);
    assert.deepEqual(covered.board,initial.board);
    assert.equal(covered.modal,true);
    await desktop.keyboard.press('Escape');
    await until(desktop,()=>!fivephases.ui.modalOpen,5);
    ok('hand details trap input and Escape closes native modal');

    // Starting elemental energy is zero; attempting to play a visible card
    // must not spend energy or alter the hand.
    await tap(desktop,'hand-0');
    assert.deepEqual((await status(desktop)).energy,initial.energy);
    assert.deepEqual((await status(desktop)).hand,initial.hand);
    ok('unaffordable native card is not consumed');
    await twoTaps(desktop);
    await drag(desktop);
    ok('mouse two-tap and drag board swaps');

    await settleFixture(desktop,10);
    assert.equal((await status(desktop)).lock,'reward');
    const rewards = await desktop.evaluate(()=>fivephases.ui.buttons().filter(b=>/^reward-[0-2]$/.test(b.name)).map(b=>b.card?.id));
    assert.equal(rewards.length,3);assert.equal(new Set(rewards).size,3);
    for(let i=0;i<3;i++)await control(desktop,'reward-'+i);
    await control(desktop,'skip-reward');
    await tap(desktop,'reward-0');
    await idle(desktop);
    const second=await status(desktop);
    assert.equal(second.enemy,'chijiao');assert(second.cards.includes(rewards[0]));
    assert.equal(second.cards.length,initial.cards.length+1);
    ok('prepared reward UI: three native candidates and selected deck transfer');

    await settleFixture(desktop,6);
    const secondRewards=await desktop.evaluate(()=>fivephases.ui.buttons().filter(b=>/^reward-[0-2]$/.test(b.name)).length);
    assert.equal(secondRewards,3);
    await semanticPress(desktop,'不拿了，继续');
    await idle(desktop);
    const third=await status(desktop);
    assert.equal(third.enemy,'hundun');assert.deepEqual(third.cards,second.cards);
    ok('prepared second reward skip leaves the deck unchanged');

    await settleFixture(desktop,8);
    const done=await status(desktop);
    assert.equal(done.lock,'over');assert.equal(done.active,'over');assert.equal(done.enemy,'hundun');
    const resultOutline=await desktop.evaluate(()=>fivephases.ui.tester.outline());
    assert.match(resultOutline,/三关皆破/);
    assert.match(resultOutline,/最高连锁 10 层/);
    await control(desktop,'restart');
    await semanticPress(desktop,'再来一局');await idle(desktop);
    const fresh=await status(desktop);
    assert.equal(fresh.enemy,'shanjiao');assert.equal(fresh.hp,1000);
    assert.equal(fresh.steps,3);assert.equal(fresh.turn,1);assert.equal(fresh.faults,0);
    assert.deepEqual(fresh.cards,initial.cards);
    ok('prepared settlement sums the best chain and semantic restart resets the run');
  } finally {
    problems.push(...desktop.problems);await desktop.context().close();
  }

  const mobile=await openPage(browser,url,{width:390,height:844,touch:true,before:fixedSeed,reducedMotion:true});
  try {
    await title(mobile);await tap(mobile,'start',true);await idle(mobile);
    assert(await mobile.evaluate(()=>matchMedia('(pointer:coarse)').matches));
    const native=await control(mobile,'hand-details');assert(native.bounds.height>=44);
    await twoTaps(mobile,true);await drag(mobile,true);
    await tap(mobile,'hand-details',true);
    await until(mobile,()=>fivephases.ui.modalOpen,5);
    await tap(mobile,'close',true);
    await until(mobile,()=>!fivephases.ui.modalOpen,5);
    ok('390×844 Chromium touch: two taps, drag without scroll, and details');
  } finally {
    problems.push(...mobile.problems);await mobile.context().close();
  }

  // Deliberately fail one real title resource in an isolated context. The
  // expected injected network error is kept separate from the clean run.
  let blocked=false;
  const failure=await openPage(browser,url,{width:390,height:844,reducedMotion:true,before:async page=>{
    await fixedSeed(page);
    // A sibling still loading after the rejection must not replace the retry screen.
    await page.route('**/assets/art/arena.webp',async route=>{await new Promise(resolve=>setTimeout(resolve,1300));return route.continue();});
    await page.route('**/assets/art/title.webp',route=>{
      if(!blocked){blocked=true;return route.abort('failed');}
      return route.continue();
    });
  }});
  try {
    await failure.getByRole('button',{name:'重新加载',exact:true}).waitFor({state:'attached',timeout:30000});
    assert(blocked,'The intended real resource was not blocked');
    await failure.waitForTimeout(1600);
    assert.equal(await failure.getByRole('button',{name:'重新加载',exact:true}).count(),1,'Late resources must not hide retry');
    const injected=failure.problems.splice(0);
    assert(injected.length>0,'No failure evidence from blocked resource');
    console.log('# expected cold-load failure: ' + injected.join(' | '));
    const fallback=failure.locator('#boot button');
    if(await fallback.count())await fallback.click();
    else {
      const r=await failure.locator('#stage').boundingBox();assert(r);
      // Native error panel's reload button, not a synthetic invocation.
      await failure.mouse.click(r.x+r.width*375/WIDTH,r.y+r.height*968/HEIGHT);
    }
    await title(failure);
    assert.equal(await failure.evaluate(()=>fivephases.ui.active),'title');
    ok('real resource failure offers retry and next navigation reaches title');
  } finally {
    problems.push(...failure.problems);await failure.context().close();
  }
  }
} catch (error) {
  checks.push([false, error.stack ?? String(error)]);
} finally {
  await browser?.close();await server.close();
}
report('FivePhases native UI browser acceptance',checks,problems);
