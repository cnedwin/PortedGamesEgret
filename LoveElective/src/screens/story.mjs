// Plays a story script (see src/story/chapters.mjs for the step format):
// backgrounds, a senior on screen, the dialogue box with text that writes
// itself out, choices, and the effects of those choices on the save.
import { W } from '../engine/stage.mjs';
import { THEME, FONT, SERIF, wrapText } from '../engine/ui.mjs';
import { rgba, rrect, poly } from '../art/draw.mjs';
import { HEROINES, STATS } from '../data/cast.mjs';
import { GIFTS, SUPPLIES, CLOTHES } from '../data/items.mjs';
import { SLOTS_OF_DAY } from '../data/places.mjs';
import * as sim from '../sim.mjs';
import { openWardrobe } from './wardrobe.mjs';

const BOX = { x: 58, y: 506, w: 1164, h: 198 };
const TEXT = { x: 58, y: 62, w: 1010, size: 25, lineH: 40 };
/** How fast text writes itself out, in game units per second. */
const REVEAL_SPEED = 1150;

/**
 * Play `script`. `girl` is the senior the choices affect.
 * Resolves when the script has finished and the dialogue box is gone.
 */
export async function playScript(game, script, { girl = null, keepActor = false, light, checkpoint = null,
  outfit = null, prefetchOpeningVoice = false, exitLabel = null } = {}) {
  const { stage, ui, world, L } = game;
  const lightNow = () => light ?? (game.state ? SLOTS_OF_DAY[game.state.slot].light : 'day');
  let skipping = false, cancelled = false, nextVoice = null;
  const canExit = Boolean(checkpoint || exitLabel);
  const saveCheckpoint=()=>{if(checkpoint)game.save();};
  const pause=()=>{cancelled=true;game.audio.stopVoice?.();advance?.();};
  const skip=()=>{skipping=true;game.audio.stopVoice?.();};
  const actorSpec = (who, expression) => {
    const spec = game.spec(who, expression);
    return who === girl && outfit ? { ...spec, wear: outfit.lead.wear } : spec;
  };

  // The box itself, repainted when the speaker changes.
  const box = ui.panel({ ...BOX, res: 1.25 });
  box.solid = true;
  // Two copies of the text picture: one clipped to the lines already shown,
  // one clipped to the growing part of the line being written.
  const done = stage.group(box.node),
    doing = stage.group(box.node);
  const textA = stage.pic(done),
    textB = stage.pic(doing);
  for (const group of [done, doing]) {
    group.x = TEXT.x;
    group.y = TEXT.y;
  }
  let advance = null,
    shownActor = null;
  box.blank = () => advance?.();
  ui.background = () => advance?.();
  ui.keys = key => {
    if (key === ' ' || key === 'Enter') advance?.();
    if (key === 'Control') skip();
    if (key === 'Escape' && canExit) pause();
  };
  box.node.alpha = 0;
  stage.tween(box.node, { alpha: 1 }, 0.25);

  function paintBox(name, color, voiced) {
    box.paint(p => {
      const g = p.g;
      const accent = color ?? THEME.violet;
      p.sheet(0, 26, BOX.w, BOX.h - 32, { accent });
      g.strokeStyle = '#e3ccd5';
      g.stroke(rrect(8, 34, BOX.w - 16, BOX.h - 48, 10));
      if (name) {
        const w = Math.max(156, p.measure(name, 22, 750, SERIF) + 52);
        p.card(34, 2, w, 44, { r: 10, fill: '#39304d', stroke: '#756179', shadow: .24 });
        g.fillStyle = accent;
        g.fill(rrect(34, 8, 3, 32, 2));
        p.text(name, 34 + w / 2, 9, { size: 22, weight: 750, family: SERIF, color: THEME.light, align: 'center' });
      }
      p.button(BOX.w - 122, 36, 96, 38, L(['跳过', 'Skip']), () => {
        skip();
        advance?.();
      }, { kind: 'plain', size: 15 });
      if (canExit) p.button(BOX.w-250,36,118,38,L(exitLabel ?? ['稍後繼續','Resume later']),pause,{kind:'plain',size:14});
      if (checkpoint && voiced) p.button(BOX.w-364,36,104,38,L(['重聽','Replay voice']),()=>game.audio.replayVoice?.(),{kind:'plain',size:14});
      g.fillStyle = accent;
      g.fill(poly([[BOX.w - 64, BOX.h - 42], [BOX.w - 47, BOX.h - 42], [BOX.w - 55.5, BOX.h - 30]]));
    });
  }

  /** Show one line of text and wait for a tap. */
  async function say(name, color, text, style = {}) {
    if (cancelled) return;
    game.audio.stopVoice?.();
    game.storyStatus={id:checkpoint?.id??null,cursor:checkpoint?.cursor??null,speaker:name,text,choices:[],paused:false};
    const voiced = Boolean(nextVoice && !skipping);
    if (voiced) Promise.resolve(game.audio.voice?.(nextVoice)).catch(()=>{});
    nextVoice=null;
    paintBox(name, color, voiced);
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `${style.weight ?? 500} ${TEXT.size}px ${FONT}`;
    let lines = wrapText(measure, text, TEXT.w),
      size = TEXT.size,
      lineH = TEXT.lineH;
    if (lines.length > 3) {
      size = 21;
      lineH = 32;
      measure.font = `${style.weight ?? 500} ${size}px ${FONT}`;
      lines = wrapText(measure, text, TEXT.w);
    }
    const widths = lines.map(l => measure.measureText(l).width + 8);
    const canvas = stage.canvas(TEXT.w + 20, lines.length * lineH + 8, 1.5, g => {
      g.font = `${style.weight ?? 500} ${size}px ${FONT}`;
      g.textBaseline = 'top';
      g.fillStyle = style.color ?? THEME.ink;
      if (style.italic) g.font = `italic ${g.font}`;
      lines.forEach((line, i) => g.fillText(line, 0, i * lineH + 4));
    });
    const key = 'line' + Math.random().toString(36).slice(2);
    done.clipRect = { x: 0, y: 0, width: 1, height: 1 };
    doing.clipRect = { x: 0, y: 0, width: 1, height: 1 };
    await Promise.all([textA.show(canvas, canvas.res, key), textB.show(canvas, canvas.res, key)]);
    if (cancelled) return;
    if (skipping) {
      done.clipRect = { x: 0, y: 0, width: TEXT.w + 20, height: lines.length * lineH + 8 };
      await stage.wait(0.03);
      return;
    }
    if (style.upcomingVoice) game.audio.prefetchVoice?.(style.upcomingVoice);

    await new Promise(resolve => {
      let line = 0,
        x = 0,
        finished = false;
      const end = () => {
        stop();
        game.audio.stopVoice?.();
        advance = null;
        resolve();
      };
      const stop = stage.onTick(dt => {
        if (finished) {
          if (skipping) end();
          return;
        }
        x += dt * REVEAL_SPEED;
        while (line < lines.length && x >= widths[line]) {
          x -= widths[line];
          line++;
        }
        done.clipRect = { x: 0, y: 0, width: TEXT.w + 20, height: Math.max(1, line * lineH + (line ? 4 : 0)) };
        if (line >= lines.length) {
          finished = true;
          doing.clipRect = { x: 0, y: 0, width: 1, height: 1 };
          done.clipRect = { x: 0, y: 0, width: TEXT.w + 20, height: lines.length * lineH + 8 };
        } else doing.clipRect = { x: 0, y: line * lineH + 4, width: Math.max(1, x), height: lineH };
      });
      // The first tap finishes writing the line; the next one moves on.
      advance = () => {
        if(cancelled){end();return;}
        if (!finished) {
          line = lines.length;
          x = 0;
          return;
        }
        game.audio.play('page');
        end();
      };
    });
  }

  /** Offer choices in the middle of the screen; resolves with the chosen option. */
  function pick(options) {
    skipping = false;
    return new Promise(resolve => {
      // The senior steps aside so the choices do not cover her face.
      const actorX = world.actor?.x,
        beside = actorX !== undefined && !world.actor.full;
      if (beside) world.moveActor(300);
      const pw = beside ? 700 : 900,
        px = beside ? 540 : 190;
      const h = options.length * 78 + (canExit?74:20),
        panel = ui.panel({ x: px, y: (470 - h) / 2 + 30, w: pw, h, res: 1.25, modal: true, title: L(['劇情選擇','Story choices']) });
      ui.keys = key => {
        if(key==='Escape'&&canExit){cancelled=true;choose(null);return;}
        const n = Number(key);
        if (n >= 1 && n <= options.length) choose(options[n - 1]);
      };
      function choose(option) {
        ui.keys = k => {
          if (k === ' ' || k === 'Enter') advance?.();
          if (k === 'Control') skip();
          if (k === 'Escape' && canExit) pause();
        };
        panel.close();
        if (beside) world.moveActor(actorX);
        resolve(option);
      }
      panel.paint(p =>
        options.forEach((o, i) => {
          const y = 10 + i * 78;
          p.card(0, y, pw, 62, { r: 12, fill: rgba('#fff8ed', .96), stroke: '#e4ccd9', shadow: .25 });
          p.chip(String(i + 1), 14, y + 16, { color: THEME.rose, size: 16, h: 30, padX: 11 });
          const size = p.measure(L(o.t), 21, 600) > pw - 90 ? 16 : 21;
          p.text(L(o.t), 62, y + (size === 21 ? 17 : 12), { size, weight: 600, maxW: pw - 90, lineH: 20 });
          p.hit(0, y, pw, 62, () => choose(o), { r: 12, label: L(o.t) });
          if(canExit&&i===options.length-1)p.button(pw-212,h-52,196,40,L(exitLabel ?? ['保存並稍後繼續','Save and resume later']),()=>{cancelled=true;choose(null);},{size:14});
        }),
      );
      panel.node.alpha = 0;
      panel.node.y += 16;
      stage.tween(panel.node, { alpha: 1, y: panel.node.y - 16 }, 0.3);
    });
  }

  async function run(steps,prefix='') {
    for (let index=0;index<steps.length;index++) {
      if(cancelled)return;
      const step=steps[index],key=prefix+index;
      const [op, a, b, c] = step;
      const completed=Boolean(checkpoint?.done[key]);
      if(checkpoint){checkpoint.cursor=key;saveCheckpoint();}
      // Visual setup is reconstructed on resume. Completed dialogue, effects
      // and wardrobe actions are not replayed; committed choices are retained.
      if(completed&&!['bg','in','out','music','voice','pick','branch'].includes(op)){nextVoice=null;continue;}
      if(op==='voice'){nextVoice=a;continue;}
      if(op==='music'){game.audio.setMusic?.(a);continue;}
      if(op==='branch'){
        const match=sim.bailuZeroMatches(game.state,a);await run(match?b:c,key+(match?'.yes.':'.no.'));
      }else if(op==='wardrobe'){
        game.audio.stopVoice?.();game.storyStatus={id:checkpoint?.id??null,cursor:key,wardrobe:a,choices:[]};
        box.node.visible = false;
        try {
          await openWardrobe(game,a,{tab:b?.tab??'outer',invited:true});
        } finally {
          box.node.visible = true;
        }
      }else if(op==='social-outfit-note'){
        const status=sim.socialStatus(game.state,a),lead=game.state.girls[status.lead];
        const leadNames=sim.pieces(lead.wear).map(piece=>CLOTHES[piece.id]).filter(Boolean).map(item=>L(item.name)).join(' · ');
        const heroNames=sim.pieces(game.state.hero.wear).map(piece=>CLOTHES[piece.id]).filter(Boolean).map(item=>L(item.name)).join(' · ');
        await say(null,THEME.soft,L([`她選的穿搭：${leadNames}。`,`Her chosen outfit: ${leadNames}.`]));
        await say(null,THEME.soft,L([`你選的穿搭：${heroNames}。`,`Your chosen outfit: ${heroNames}.`]));
      }else if(op==='outfit-note'){
        const wear=game.state.girls.bailu.wear,outer=CLOTHES[wear.outer?.id];
        await say(null,THEME.soft,outer?L([`她把你們選的${outer.name[0]}披上，留住了剛才調好的配色。`,`She puts on the ${outer.name[1]}, keeping the colours you chose together.`]):L(['她保留了自己喜歡的造型，另外把一條備用圍巾放進袋子。','She keeps the look she likes and packs a spare scarf.']));
      }else if (op === 'bg') {
        if (shownActor === 'professor') {
          shownActor = null;
          await world.hideActor();
        }
        await world.setScene(a, b ?? lightNow());
      } else if (op === 'in') {
        shownActor = a;
        await world.showActor(actorSpec(a, b), { view: 'bust', x: W / 2, enter: !completed });
      } else if (op === 'out') {
        shownActor = null;
        await world.hideActor();
      } else if (op === 'fx') {
        if (!skipping) {
          world.effect(a);
          if (a === 'heart') game.audio.play('heart');
          await stage.wait(a === 'heart' ? 0.7 : 0.35);
        }
      } else if (op === 'n') {
        const upcoming = steps[index + 1];
        const upcomingVoice = prefetchOpeningVoice && upcoming?.[0] === 'voice' ? upcoming[1] : undefined;
        await say(null, THEME.soft, L([a, b]), { color: THEME.soft, upcomingVoice });
      } else if (op === 'me') {
        await say(L(['我', 'Me']), THEME.sky, L([a, b]));
      } else if (op === 'th') {
        await say(L(['我', 'Me']), THEME.sky, `（${L([a, b])}）`, { color: THEME.soft, italic: game.lang !== 'zh' });
      } else if (op === 'pf') {
        if (!skipping && shownActor !== 'professor') {
          shownActor = 'professor';
          await world.showActor({ id: 'professor' }, { view: 'bust', x: W / 2 });
        }
        await say(L(['温教授', 'Professor Wen']), '#8a6fd0', L([a, b]));
      } else if (op === 'pick') {
        game.audio.stopVoice?.();
        game.storyStatus={id:checkpoint?.id??null,cursor:key,choices:a.map(o=>L(o.t)),text:'',paused:false};
        const retained=checkpoint?.choices[key],previous=Number.isInteger(retained)&&retained>=0&&retained<a.length;
        const option = previous?a[retained]:await pick(a);
        if(!option)return;
        if(checkpoint&&!previous)checkpoint.choices[key]=a.indexOf(option);
        if (!previous&&option.fx && game.state) {
          const gained = sim.applyEffect(game.state, girl, option.fx);
          if (gained > 0) {
            game.toast(`♥ ${L(['好感', 'Affection'])} +${gained}`, 'good');
            game.audio.play('good');
          } else if (gained < 0) game.toast(`${L(['好感', 'Affection'])} ${gained}`, 'bad');
          // Stats, money, energy and items a choice brings get a line of their own.
          const parts = [];
          for (const [k, n] of Object.entries(option.fx.stats ?? {})) parts.push(`${L(STATS[k])} ${n > 0 ? '+' : '−'}${Math.abs(n)}`);
          if (option.fx.money) parts.push(`¥ ${option.fx.money > 0 ? '+' : '−'}${Math.abs(option.fx.money)}`);
          if (option.fx.energy) parts.push(`${L(['体力', 'Energy'])} ${option.fx.energy > 0 ? '+' : '−'}${Math.abs(option.fx.energy)}`);
          const item = option.fx.item && (GIFTS[option.fx.item] ?? SUPPLIES[option.fx.item] ?? CLOTHES[option.fx.item]);
          if (item) parts.push(`${L(['获得', 'Got'])} ${L(item.name)}`);
          if (parts.length) game.toast(parts.join('  ·  '), 'good');
        }
        saveCheckpoint();
        if (option.then) await run(option.then,key+'.choice'+a.indexOf(option)+'.');
      } else if (HEROINES[op]) {
        // A senior speaks: update her expression first.
        if (shownActor === op || world.actor) await world.showActor(actorSpec(op, a), { view: 'bust', x: world.actor?.x ?? W / 2 });
        await say(L(HEROINES[op].name), HEROINES[op].color, L([b, c]));
      }
      if(checkpoint&&!cancelled){checkpoint.done[key]=true;saveCheckpoint();}
    }
  }

  await run(script);
  game.audio.stopVoice?.();
  game.storyStatus={id:checkpoint?.id??null,paused:cancelled,choices:[]};
  advance = null;
  ui.background = null;
  ui.keys = null;
  await stage.tween(box.node, { alpha: 0 }, 0.2);
  textA.destroy();
  textB.destroy();
  box.close();
  if (!keepActor) await world.hideActor();
  return {completed:!cancelled};
}
