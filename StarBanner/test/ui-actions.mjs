// Browser acceptance helpers. UI targets come from the engine's semantic tester, not DOM selectors or guessed pixels.
// 检查通过引擎语义测试器按名称找控件；棋盘仍走原有键盘、鼠标、触屏输入。
export async function ready(page, query, seconds = 180) {
  await page.waitForFunction(() => window.egretGame?.ready && window.egretGame?.ui?.tester, null,
    { timeout: seconds * 1000, polling: 120 });
  await page.evaluate(async () => window.egretGame.ui.ready());
  if (query) {
    // An async predicate can be a truthy Promise before the result has been published in this Playwright path.
    // Wait synchronously for the actual, visible native semantic node instead.
    await page.waitForFunction(name => {
      const host = window.egretGame.ui;
      try {
        const found=host.tester.findAll(name);
        return found.length===1&&!found[0].inert&&!found[0].disabled&&found[0].bounds?.width>0;
      } catch { return false; }
    }, query, { timeout: seconds * 1000, polling: 150 });
  }
  await page.evaluate(async () => window.egretGame.ui.ready());
}

export const state = (page, query) => page.evaluate(async name => {
  const host = window.egretGame.ui; await host.ready(); return host.tester.state(name);
}, query);

export const nodes = page => page.evaluate(async () => {
  const host = window.egretGame.ui; await host.ready(); return host.semantics.snapshot.nodes;
});

export async function target(page, query) {
  return page.evaluate(async name => {
    const host = window.egretGame.ui;
    await host.ready();
    const node = host.tester.find(name);
    if (!node.bounds || node.disabled || node.inert)
      throw new Error('Semantic target not actionable: ' + name);
    const box = host.overlay.canvas.getBoundingClientRect(), frame = host.game.frame, b = node.bounds;
    return { x: box.x + (b.x + b.width / 2) * box.width / frame.width,
      y: box.y + (b.y + b.height / 2) * box.height / frame.height, id: node.id };
  }, query);
}

export async function press(page, query, device = 'semantic') {
  if (device === 'semantic') {
    await page.evaluate(async name => {
      const host = window.egretGame.ui; await host.ready(); host.tester.press(name);
    }, query);
  } else {
    const p = await target(page, query);
    if (device === 'touch') await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
  }
  await page.evaluate(async () => window.egretGame.ui.ready());
}

export async function focus(page, query) {
  await page.evaluate(async name => {
    const host = window.egretGame.ui; await host.ready(); host.tester.focus(name); host.focus?.();
  }, query);
}

export const awaitMode = (page, mode, seconds = 120) => page.waitForFunction(
  mode => window.egretGame?.battle?.mode === mode, mode, { timeout: seconds * 1000, polling: 120 });
export const cursor = (page, p) => page.evaluate(({ x, y }) => window.egretGame.battle.cursorTo(x, y), p);
export const readBattle = (page, fn, arg) => page.evaluate(fn,arg);

// Uses the public 3D projection and the same tile-centre geometry as the game. The actual click/tap reaches the board.
export async function boardPoint(page, tile) {
  return page.evaluate(({ x, y }) => {
    const { stage } = window.egretGame;
    const canvas=stage.canvas,box=canvas.getBoundingClientRect();
    // Use the loaded game's actual engine projection, not a second unbundled engine identity.
    const result=stage.projectTile(x,y,box.width,box.height);
    return { x:box.x+result.x,y:box.y+result.y,ok:result.inFront,
      tile:stage.rig.tileAt(result.x,result.y,box.width,box.height),viewport:[innerWidth,innerHeight] };
  },tile);
}

export async function boardTap(page, tile, device = 'mouse') {
  const point = await boardPoint(page,tile);
  if (!point.ok || point.tile?.x !== tile.x || point.tile?.y !== tile.y ||
      point.x < 0 || point.y < 0 || point.x > point.viewport[0] || point.y > point.viewport[1])
    throw new Error('Tile not in the actual viewport: ' + JSON.stringify({tile,point}));
  if (device === 'touch') await page.touchscreen.tap(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
}
export const menuName = label => 'button:' + label;
export async function chooseMove(page, from, to) {
  await cursor(page,from); await page.keyboard.press('Enter'); await awaitMode(page,'move');
  await cursor(page,to); await page.keyboard.press('Enter'); await awaitMode(page,'act');
  await ready(page,menuName('待命'));
}

/** The nearest legal destination is read from the unchanged tactical rules; it is never committed directly. */
export async function legalAdvance(page, prioritizeCapture=true) {
  return page.evaluate(async prioritizeCapture => {
    const { reach, stops, actionsAt } = await import(new URL('src/sim/rules.mjs',location.href).href);
    const { game: g, human } = window.egretGame.battle;
    const units = g.units.filter(u=>u.owner===human&&!u.done), foes=g.units.filter(u=>u.owner!==human);
    if (!units.length||!foes.length) return null;
    const u=units[0],distance=p=>Math.min(...foes.map(f=>Math.abs(f.x-p.x)+Math.abs(f.y-p.y)));
    const choices=stops(g,u,reach(g,u)).map(p=>({
      x:p.x,y:p.y,d:distance(p),cost:p.cost,
      capture:actionsAt(g,u,p.x,p.y).some(action=>action.kind==='capture')
    })).sort((a,b)=>(prioritizeCapture?Number(b.capture)-Number(a.capture):0)||a.d-b.d||b.cost-a.cost||a.y-b.y||a.x-b.x);
    return { from:{x:u.x,y:u.y},to:choices[0],unit:u.id };
  },prioritizeCapture);
}

/** Follow normal move/wait/occupy and computer turns until a legal attack is available. */
export async function reachAttack(page, { onCapture = () => {}, onTurn = () => {}, maxTurns = 5, prioritizeCapture = true, maxMoves=8 } = {}) {
  let attack;
  for(let round=0;round<maxTurns;round++){
    attack=await page.evaluate(()=>window.egretGame.battle.findAttack());
    if (attack) return attack;
    for(let i=0;i<maxMoves;i++){
      const plan=await legalAdvance(page,prioritizeCapture);
      if(!plan) break;
      await chooseMove(page,plan.from,plan.to);
      const capture=prioritizeCapture&&await page.evaluate(()=>window.egretGame.ui.tester.exists('button:占领'));
      await press(page,menuName(capture?'占领':'待命'));
      await awaitMode(page,'idle');
      if(capture) await onCapture(plan);
    }
    attack=await page.evaluate(()=>window.egretGame.battle.findAttack());
    if(attack) return attack;
    const turn=await page.evaluate(()=>window.egretGame.battle.game.turn);
    await page.keyboard.press('KeyF');
    await page.waitForFunction(n=>window.egretGame.battle.game.turn>n&&window.egretGame.battle.mode==='idle',
      turn,{timeout:240000,polling:150});
    await onTurn(turn+1);
  }
  return null;
}
