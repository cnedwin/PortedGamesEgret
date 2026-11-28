// Native, data-described dialog content. The modal shell owns focus, the
// scroll viewport and return/navigation; rules remain in the action dispatcher.
import { ART_BY_ID, ARTS, CLASSES, levelOf } from '../data/arts.mjs';
import { MERIDIANS, RELIC_BY_ID } from '../data/extras.mjs';
import { BUILDINGS, ECONOMY, PILLS, armorName } from '../data/goods.mjs';
import { FORMATIONS, TALENTS } from '../data/jianghu.mjs';
import { PLACES, PLACE_BY_ID, RESOURCE_NAMES, RESOURCES } from '../data/places.mjs';
import { OFFICES, RANKS, SECTS, SECT_BY_ID } from '../data/sects.mjs';
import { describeItem } from '../core/editor.mjs';
import { CUSTOM_ART_LIMIT, SPY_COST, gearOffer, innerLevels, meridianNeed } from '../core/extras.mjs';
import { goalView } from '../core/goals.mjs';
import { formationsFor, pendingView } from '../core/jianghu.mjs';
import { APT_NAMES, STAT_NAMES, STAT_KEYS, TRAITS, hpMax, prowess } from '../core/persons.mjs';
import { QUALITIES, TRAIT_NOTES, aptitudeScore, attention, qualityOf, recommendJobs, wordsOf } from '../core/disciples.mjs';
import { TOURNEY, tourneyField, tourneyBout } from '../core/tourney.mjs';
import { stillToCome } from '../core/unlocks.mjs';
import { TEACHING, teachingOffers } from '../core/library.mjs';
import { SEAT_PLOTS, availablePlots } from '../core/seat-layout.mjs';
import { beds, buildAvailability, canFallBackAtHome, ledger, membersOf, openingProtection, placesOf, recruitAvailability, residents, strength, usedCells } from '../core/world.mjs';
import { portraitUrl } from '../../art-handoff/assets.mjs';
import { text, button, row, col, image, bar, field, choice, COLORS, TITLE_FONT } from './native-kit.mjs';

const INK=COLORS.ink, GOLD=COLORS.gold, CINNABAR=COLORS.vermillion, GREEN=COLORS.jade;
const fmt = new Intl.NumberFormat('zh-CN');
const num = (value) => fmt.format(Math.round(value));
const flat = (...nodes) => nodes.flat(Infinity).filter(Boolean);
const para = (value, props = {}) => text(value, { size: 16, lines: 2, ...props });
const lead = (value, props = {}) => para(value, { bold: true, size: 18, ...props });
const note = (value, props = {}) => para(value, { size: 15, color: COLORS.muted, fontWeight: 500, ...props });
const warn = (value, props = {}) => para(value, { color: CINNABAR, ...props });
const heading = value => row([col([],{width:4,height:23,color:CINNABAR,semantic:false}),text(value,{bold:true,size:20,fontFamily:TITLE_FONT,color:INK,height:32,width:'fill'}),col([],{width:24,height:1,color:GOLD,semantic:false})],{height:36,gap:6,padding:2,color:COLORS.wash,card:true,border:{color:COLORS.edge,width:1}});
const close = (label = '取消') => button(label, 'close', {}, { kind: 'outline' });
const primary = (label, act, data = {}, props = {}) => button(label, act, data, { kind: 'primary', ...props });
const secondary = (label, act, data = {}, props = {}) => button(label, act, data, { kind: 'outline', ...props });
const form = (label, id, options, current = options[0]?.[0] ?? '') => choice(label, null, { id }, current, options);
const opt = (label, change, current, options, data = {}) => choice(label, change, data, current, options);
const fact = (label, value) => row([
  text(label, { color: COLORS.muted, width: '32%', size: 15, height: 'fill' }),
  text(String(value), { width: 'fill', height: 'fill', size: 16, fontWeight: 600, lines: 1 }),
], { height: 42, gap: 8, padding:5, color:COLORS.panel, card:true, border:{color:0xdbc9a7,width:1} });
const card = (title, content, action) => col(flat(lead(title, { lines: 1, height: 30, color:INK }), content, action), { padding: 9, gap: 5, card: true, color:COLORS.wash,border:{color:COLORS.edge,width:1} });
const pair = (title, content) => card(title, para(content));
const sheet = (title, children, footer = []) => ({ title: String(title), children: flat(children), footer: flat(footer) });
const plotLabel = (plot) => `第 ${plot + 1} 块地 · ${SEAT_PLOTS[plot].x < 0 ? '西侧' : '东侧'}`;
const gradeName = (person) => QUALITIES[qualityOf(person)]?.name ?? '';
const traits = (person) => (person.traits ?? []).map((key) => `${TRAITS[key]?.name ?? key}（${TRAIT_NOTES[key] ?? ''}）`).join('　') || '平和';
const pillText = (pill) => {
  const e = pill.effect;
  return e.hp ? '疗伤' : e.nei ? '增长修为' : e.cure ? '解毒' : e.stat ? '臂腰腿内各 +1（每人限二十颗）' : e.aptitude ? '最弱的一项资质 +5' : e.insight ? '闭关时服用，更易有悟' : '';
};
const commonJobs = [...RESOURCES.map((key) => [`gather:${key}`, `采集${RESOURCE_NAMES[key]}`]), ['craft:weapon','铸造兵器'], ['craft:armor','织造护具'], ['craft:pill','炼丹'], ['patrol','行侠仗义'], ['extort','欺压良民'], ['travel','下山历练（三十日，长进快而有险）'], ['rest','休息']];
const LOG_TYPES = { moment: '弟子', tourney: '论剑', 'tourney-call': '论剑', start: '立派', conquer: '征伐', repel: '守御', fallback: '退守', fall: '覆灭', settle: '分舵', death: '讣告', desert: '叛离', insight: '领悟', succession: '传位', summit: '大会', event: '奇遇', intel: '情报', hostilities: '交战', court: '朝廷', join: '来投' };
const onOff = [['on','开启'], ['off','静音']];
const volumes = Array.from({ length: 21 }, (_, i) => [String(i / 20), `${i * 5}%`]);
const volumeOf = (source) => String(Math.round(source.volume * 20) / 20);

/** Large rosters keep a stable, bounded working set. Paging edits only this
 * sheet's view state; no disciples, history or editor fields are discarded. */
function pageRows(ui, id, items, draw, size = 10, empty = '暂无记录。') {
  if (!items.length) return [note(empty)];
  const last = Math.max(0, Math.ceil(items.length / size) - 1);
  const page = Math.max(0, Math.min(last, Number(ui.sheet.listPages?.[id]) || 0));
  const itemsHere = items.slice(page * size, (page + 1) * size).map(draw);
  if (!last) return itemsHere;
  return [...itemsHere, row([
    secondary('上一页', 'sheet-list-page', { list: id, page: page - 1 }, { disabled: page === 0, width: 'fill' }),
    text(`${page + 1} / ${last + 1}`, { width: 68, height: 48, align: 'center', size: 14 }),
    secondary('下一页', 'sheet-list-page', { list: id, page: page + 1 }, { disabled: page === last, width: 'fill' }),
  ], { height: 48, gap: 5 })];
}

export const SHEET_KINDS = Object.freeze('guide guard goal load build applicant job batch wheel master move settle march event person assign moment unlock tourney duel season herald outcome siege gear pills meridian create offices retreat fight diplomacy teaching settings editor'.split(' '));

export function createSheet(ctx) {
  const { world, ui, picture, art, slots, music, voice, worldAmbience, feedbackAudio, storage, helpers } = ctx;
  const { me, books, open, dayText, founder, leaderOf, jobText, jobName, bestArtText, jobChoices, weaponText, picked, waiting, marchParty, storedQuality, modNote } = helpers;
  const data = ui.sheet;
  if (!data || !SHEET_KINDS.includes(data.kind)) return null;
  // A save/load or settings sheet is valid even before the player has a world.
  const kind = data.kind;
  const face = (person, view = 'bust', width = 88, height = 104) => {
    const src = person && art ? portraitUrl(art, person, { view }) : undefined;
    return src ? image(src, { width, height, label: person.name }) :
      col([text(ui.language === 'en' ? '◆' : (person?.name ?? '？')[0], { size: 34, color: GOLD, align: 'center', height: 'fill' })], { width, height, card: true });
  };
  const personCard = (person, act = 'person') => row([
    face(person, 'bust', 62, 84),
    secondary(`${person.name} · ${gradeName(person)}`, act, { id: person.id }, {
      detail: `${RANKS[person.rank].name} · ${person.level} 级 · 战力 ${num(prowess(person))} · ${bestArtText(person)}`,
      name: `${act}-${person.id}`, height: 84,
    }),
  ], { height: 90, gap: 7, padding: 3, card: true, color:COLORS.panel,border:{color:COLORS.edge,width:1} });
  const portraitBlock = (p, copy, view = 'bust') => row([
    face(p, view, view === 'full' ? 120 : 88, view === 'full' ? 166 : 126),
    col(flat(lead(`${p.name} · ${gradeName(p)}`, { lines:2 }), para(copy, { lines: 4 })), { width: 'fill', gap: 4 }),
  ], { height: view === 'full' ? 180 : 166, gap: 12, card: true, color:COLORS.panel,border:{color:COLORS.goldLight,width:1},padding: 6 });
  const formation = (party) => form('阵法', 'formation', formationsFor(me(), party).map((id) => [id, `${FORMATIONS[id].name}：${FORMATIONS[id].does}`]), books().formation ?? 'line');
  const movesOf = (person) => Object.keys(person.arts).filter((id) => CLASSES[ART_BY_ID[id].klass].combat)
    .flatMap((id) => ART_BY_ID[id].moves.map((move, slot) => ({ id, slot, move })))
    .filter(({ id, move }) => levelOf(person.arts[id]) >= move.level);

  switch (kind) {
    case 'guide': {
      const home = world.places[ui.place];
      if (!home) return sheet('掌门手札', para('据点已失，可在纪事查看局势。'), close('合上手札'));
      const leader = leaderOf(me());
      const free = Math.max(0, Math.min(beds(world, ui.place), ECONOMY.headcountCap) - residents(world, ui.place).length);
      const protection = openingProtection(world);
      const steps = [
        ['先点一座建筑', `这里还有 ${free} 张空铺。厢房满了就扩建，空地可用来兴建。`, 'build', '查看山门'],
        ['再见一位求师者', `招贤榜前有 ${home.applicants.length} 人。掌门在此、有空铺，就能当场收录。`, 'recruit', '走访招贤榜'],
        ['给山门留一笔进项', '店铺每旬进账。安排好住处与弟子，再点「行」过一旬，回来看粮草和薪俸。', 'here', '查看山下店铺'],
        ['把新弟子编入练功队伍', '新弟子入门后在休息。先安排一门能学的武艺，学成后检查出招次序。', 'train', '安排练功'],
      ].filter(([, , tab]) => tab !== 'here' || open('here'));
      const later = stillToCome(world);
      // Put the first order above the longer welcome and protection copy.
      // The handbook opens on a 325px-high phone without asking the player
      // to scroll before they can perform the tutorial's first action.
      const stepButton = ([title, copy, tab, label], i) => button(label, 'guide-go', { tab }, {
        name: i === 0 ? 'guide-first-step' : `guide-step-${tab}`,
        kind: i === 0 ? 'primary' : 'outline',
        detail: `第 ${i + 1} 步 · ${title}。 ${copy}`,
        height: i === 0 ? 104 : 112, lines: 3,
      });
      return sheet('掌门手札', [
        stepButton(steps[0], 0),
        lead((leader ? `你已接掌本派，现任掌门是${leader.name}。` : '本派暂缺掌门。') + '先把山门安顿好，再决定何时出山。', { lines: 2 }),
        protection?.active && warn(`立足期余 ${num(protection.daysLeft)} 日。若你先对某派出兵，会提前结束和对方的开局休战。`, { lines: 3 }),
        steps.slice(1).map((step, i) => stepButton(step, i + 1)),
        later.length && [heading('日后开放'), note('山门立稳之后，这些事会一样一样交到你手上。'), pageRows(ui,'future',later,f=>pair(f.name,f.hint),5)],
      ], [row([
        secondary('守山门准备', 'prepare-defense', {}, { name: 'guide-defence', width: 'fill', size: 14 }),
        secondary('合上手札', 'close', {}, { name: 'guide-close', width: 'fill', size: 14 }),
      ], { height: 48, gap: 6 })]);
    }
    case 'guard': {
      const place = world.places[ui.place];
      if (!place) return sheet('守山门准备', para('本派暂无据点。'), close('关闭'));
      const guard = residents(world, ui.place).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10);
      const gateIndex = place.buildings.findIndex((b) => b.kind === 'gate');
      const gate = place.buildings[gateIndex]?.level ?? 0;
      const protection = openingProtection(world);
      return sheet('守山门准备', [
        para(`${PLACE_BY_ID[ui.place].name}受袭时，由留在此地的十名最强弟子迎战。`),
        fact('驻守', `${guard.length} 人 · 战力 ${num(strength(guard))}`), fact('山门防御', gate ? `${gate} 级 · +${gate * 4}%` : '尚未修建'),
        fact('现有储备', `银 ${num(books().silver)} 两 · 粮 ${num(books().grain)} 石`), fact('每旬薪俸', `${num(ledger(world, me()).wages)} 两`),
        protection?.active && warn(`立足期还剩 ${num(protection.daysLeft)} 日。`),
        para('留足薪俸，扩建山门。让留守弟子练功、带好兵器，再到「出招与站位」检查谁打前排。', { lines: 4 }),
      ], [close('返回'), gateIndex >= 0 && primary('查看山门扩建', 'guard-gate', { index: gateIndex }), secondary('查看弟子', 'page', { page: 'disciples' })]);
    }
    case 'goal': {
      const goal = goalView(world);
      if (!goal) return sheet('要务', note('眼下暂无待办要务。'), close('返回'));
      const reward = !goal.last && Object.entries(goal.gives).map(([key, amount]) => `${{ silver:'银两', grain:'粮草', renown:'威望' }[key]} +${num(amount)}`).join('　');
      return sheet(goal.title, [para(goal.text, { lines: 4 }), !goal.last && [para(goal.how), fact('进度', `${num(goal.now)} / ${num(goal.wanted)}`), bar(goal.now / goal.wanted, { height: 13 }), note(reward)]], [
        secondary('掌门手札', 'guide-open'), close('返回'), goal.done ? primary('领取赏赐', 'goal-claim') : goal.go && primary('前往', 'goal-go'),
      ]);
    }
    case 'load': {
      const saves = slots.list();
      return sheet('载入存档', saves.length ? saves.map((s) => secondary(`${s.slot === 'auto' ? '自动存档' : '存档位 ' + s.slot} · ${s.label ?? ''}`, 'load', { slot: s.slot })) : note('这个浏览器里还没有存档。'), [secondary('导入存档文件', 'import'), close('关闭')]);
    }
    case 'build': {
      const spec = PLACE_BY_ID[ui.place], plot = ui.buildPlot;
      const free = Math.max(0, spec.cells - usedCells(world, ui.place));
      const empty = availablePlots(world.places[ui.place].buildings);
      const check = (id) => buildAvailability(world, me(), ui.place, id, plot);
      const selected = data.buildKind ?? Object.keys(BUILDINGS).find((id) => check(id).ok) ?? 'dorm';
      data.buildKind = selected;
      const availability = check(selected);
      return sheet(plot === null ? '兴建建筑' : `在第 ${plot + 1} 块地兴建`, [
        fact('余地', `${spec.name} · ${free} 格`), fact('银两', `${num(books().silver)} 两`),
        empty.length && opt('建筑位置', 'build-location', plot ?? '', [['','由管事安排'], ...empty.map(i => [i,plotLabel(i)])]),
        pageRows(ui,'catalog',Object.entries(BUILDINGS),([id, b]) => {
          const status = check(id);
          return secondary(b.name, 'build-kind', { kind: id }, { selected: id === selected, detail: `${b.does} · ${num(b.cost)} 两 · ${b.cells} 格${status.ok ? '' : ' · ' + status.why}`, height: 88 });
        },9), !availability.ok && warn(availability.why),
      ], [close(), primary(`兴建${BUILDINGS[selected].name}`, 'build', {}, { disabled: !availability.ok })]);
    }
    case 'applicant': {
      const p = world.places[ui.place].applicants[data.index];
      if (!p) return sheet('招贤榜', note('此人已经离去。'), close('关闭'));
      const availability = recruitAvailability(world, me(), ui.place, data.index);
      return sheet(`招贤榜 · ${p.name}`, [
        portraitBlock(p, `${p.origin} · ${p.female ? '女' : '男'} · ${p.age} 岁`),
        para(`品评：${QUALITIES[qualityOf(p)].about}（资质评分 ${aptitudeScore(p)}）`, { lines: 3 }),
        para(`性情：${traits(p)}`, { lines: 4 }),
        para(`资质：${Object.entries(p.apt).map(([key, value]) => `${APT_NAMES[key]} ${value}`).join('　')}`, { lines: 3 }),
        para(`根骨：${STAT_KEYS.map(key => `${STAT_NAMES[key]} ${Math.round(p.stats[key])}`).join('　')}`, { lines: 3 }),
        note(`入门时交束修 ${p.fee} 两。${availability.ok ? '掌门在此，厢房有空铺。' : availability.why + '。'}`),
      ], [close('暂不收录'), primary('收录弟子', 'recruit', { index: data.index }, { disabled: !availability.ok })]);
    }
    case 'job': {
      const p = picked();
      return sheet('改派差事', [form(p.name, 'job-select', jobChoices(p)), note(`眼下：${jobText(p)}`)], [close(), primary('确认差事', 'job')]);
    }
    case 'batch':
      return sheet('批量改派差事', [para(`将为所选 ${ui.batch.size} 名弟子统一安排差事。`), form('差事', 'job-select', [['auto','各自修练最合适的武学'], ...commonJobs])], [close(), primary('确认改派', 'batch-job')]);
    case 'wheel': {
      const p = picked(), size = RANKS[p.rank].slots || 4, wheel = p.wheel ?? [];
      const moves = movesOf(p).map(({ id, slot, move }) => [`${id}:${slot}`, `${ART_BY_ID[id].name}·${move.name}`]);
      return sheet(`出招次序 · ${p.name}`, [
        note(`交手时按此次序循环出招，共 ${size} 格。同一兵器的招式才能连用；留空的格子由本人自行斟酌。`, { lines: 4 }),
        Array.from({ length: size }, (_,i) => form(`第 ${i + 1} 招`, `wheel-${i}`, [['','（自行斟酌）'],...moves], wheel[i] ? `${wheel[i].art}:${wheel[i].move}` : '')),
        form('站位', 'row-select', [['','按兵器长短'],['front','站前排'],['back','站后排']], p.row ?? ''),
      ], [secondary('交还本人安排', 'wheel-auto'), close(), primary('定下次序', 'wheel')]);
    }
    case 'master': {
      const p = picked(), elders = membersOf(world, me()).filter(m => m.rank >= 4 && m.id !== p.id).map(m => [m.id,`${m.name}（${RANKS[m.rank].name}，${bestArtText(m)}）`]);
      return sheet('拜师', [form(p.name, 'master-select', elders, p.master ?? elders[0]?.[0]), note('师父的造诣越高，徒弟修练越快。')], [close(), primary('行拜师礼','master',{}, { disabled: !elders.length })]);
    }
    case 'move': {
      const p = picked();
      return sheet('调往别处', form(p.name, 'move-select', placesOf(world, me()).map(id => [id, PLACE_BY_ID[id].name]), p.place), [close(), primary('启程','move')]);
    }
    case 'settle':
      return sheet('开设分舵', [para(`在${PLACE_BY_ID[data.place].name}设立分舵需 1,500 两，建成后自带正殿、山门、招贤榜与一间厢房。`, { lines: 4 }), note(`库中有银 ${num(books().silver)} 两。`)], [close(), primary('确认开设','settle',{place:data.place})]);
    case 'march': {
      const party = marchParty(), guard = residents(world, data.place).sort((a,b) => prowess(b)-prowess(a)).slice(0,10), owner = SECT_BY_ID[world.places[data.place].owner], protection = openingProtection(world);
      if (!owner) return sheet('商议出兵', note('此处无主，可开设分舵。'), close('返回'));
      return sheet('商议出兵', [
        lead(`进攻${owner.name}的${PLACE_BY_ID[data.place].name}。`),
        protection?.active && !protection.provoked.includes(owner.id) && warn(`立足期仍在。此时出兵，${owner.name}日后可反击本派。`, { lines: 3 }),
        fact('我方出战', `${party.length} 人 · 战力 ${num(strength(party))}`), fact('对方守卫', `${guard.length} 人 · 战力 ${num(strength(guard))}`), fact('两派关系', Math.round(books().relations[owner.id])),
        formation(party), note('出战者取全派战力最高的十人，伤重者留守。本派阵法需有长老或掌门在阵中。得胜则据点易主；开战后两派交恶。', { lines: 5 }),
      ], [close(), primary('出兵','march',{place:data.place}, { disabled: !party.length })]);
    }
    case 'event': {
      const view = pendingView(world);
      if (!view) return sheet('江湖', note('此事已了。'), close('关闭'));
      data.title = view.title;
      const person = view.portraitId ? { portraitId: view.portraitId, name: view.title.split(' · ')[1], school: me() } : null;
      const src = person && art ? portraitUrl(art, person, { view:'full', expression:view.expression }) : undefined;
      return sheet(view.title, [
        view.kind === 'plea' && portraitBlock(view.person, `${RANKS[view.person.rank].name} · ${view.person.level} 级 · ${traits(view.person)}`),
        src && image(src, { height: 220, width: 'fill', label: person.name }),
        view.kind !== 'plea' && heading(({ wish:'心愿',trial:'初试',legacy:'托付' })[view.kind] ?? '江湖奇人'),
        para(view.text,{lines:8}),
        view.choices.map((c,index) => secondary(c.label, 'answer', { index }, { disabled: !!c.why, detail:c.why||c.hint,height:76 })),
      ]);
    }
    case 'person': {
      const p = picked(), all = membersOf(world, me());
      if (!p) return sheet('弟子', note('本派暂无门人。'), close('关闭'));
      const many = placesOf(world, me()).length > 1, elders = all.filter(m=>m.rank>=4&&m.id!==p.id), master = world.persons[p.master];
      return sheet(p.name, [
        portraitBlock(p,`${RANKS[p.rank].name} · ${p.origin} · ${p.female?'女':'男'} · ${p.age} 岁 · ${p.level} 级` + (p.laurels ? ` · 论剑魁首 ×${p.laurels}` : ''),'full'),
        heading('气血与修为'), fact('气血', hpMax(p)), bar(1-(p.wounds??0),{height:12,color:GREEN}), fact('忠诚', Math.round(p.loyalty)), bar(p.loyalty/100,{height:12,color:GOLD}),
        fact('战力',prowess(p)), fact('差事',jobText(p)), fact('所长',bestArtText(p)), fact('师承',master?.name??'无'),
        para(STAT_KEYS.map(key=>`${STAT_NAMES[key]} ${Math.round(p.stats[key])}`).join('　'),{lines:3}),
        para(`兵器：${weaponText(p)}　护具：${armorName(p.gear.armor||1)}　经脉：${p.meridians?.length??0} / 8`,{lines:3}),
        p.talent && para(`天赋：${TALENTS[p.talent].name}（${TALENTS[p.talent].does}${p.talentDeep?'，心愿已了，其效加倍':''}）`,{lines:4}),
        para(`资质：${Object.entries(p.apt).map(([k,v])=>`${APT_NAMES[k]} ${v}`).join('　')}　评 ${aptitudeScore(p)}（${gradeName(p)}）`,{lines:3}),
        para(`性情：${traits(p)}`,{lines:4}), para('武学：'+(Object.entries(p.arts).sort((a,b)=>ART_BY_ID[b[0]].tier-ART_BY_ID[a[0]].tier).slice(0,8).map(([id,points])=>`${ART_BY_ID[id].name} ${levelOf(points)}重`).join('　')||'尚未习武'), {lines:5}),
        heading('事务'),
        primary('修练武学','page',{ page:'arts' }), secondary('改派差事','sheet',{kind:'job'}),
        open('wheel')&&secondary('出招与站位','sheet',{kind:'wheel'}), open('gear')&&secondary('装备丹药','sheet',{kind:'gear'}), open('meridian')&&secondary('经脉','sheet',{kind:'meridian'}),
        p.rank>=3&&secondary('自创武学','sheet',{kind:'create'}), p.rank<4&&secondary('晋升','promote',{id:p.id}),
        p.rank<4&&elders.length&&open('master')&&secondary('拜师','sheet',{kind:'master'}),many&&secondary('调往','sheet',{kind:'move'}),
        heading('生平'), pageRows(ui,'biography',(p.life??[]).slice(-12).reverse(),e=>pair(dayText(e.day),e.text),4,p.rank>=4?'入门已久，旧事不必细表。':'入门时日尚浅，还没有值得一记的事。'),
      ],close('关闭'));
    }
    case 'assign': {
      const idleOnly = data.idle === undefined ? attention(world, me()).idle.length > 0 : String(data.idle)==='true';
      const plan = recommendJobs(world,me(),{idleOnly});
      const count = kind=>plan.filter(({job})=>job.kind===kind).length;
      const summary = [['train','修练'],['gather','采集'],['craft','制造'],['patrol','行侠']].filter(([k])=>count(k)).map(([k,label])=>`${label} ${count(k)} 人`).join(' · ');
      return sheet('一键安排差事', [
        note((idleOnly?'按「闲着」名单安排差事。':'全派重新安排；闭关、历练或重伤中的人保留差事。')+'资质好的去修练最合适的武学，资质平平的杂役和外门弟子里抽三成去采集、制造。',{lines:6}),
        lead(plan.length?`将改派 ${plan.length} 人：${summary}。`:'各人差事已是最合适的了，不必再动。',{lines:3}),
        pageRows(ui,'assign',plan.slice(0,40),({person,job,why})=>pair(`${person.name} · ${gradeName(person)}`,`${jobName(job)} · ${why}`)),
      ], [secondary(idleOnly?'改为全派重排':'只排闲着的人','sheet',{kind:'assign',idle:!idleOnly}),close(),primary('照此安排','assign',{idle:idleOnly},{disabled:!plan.length})]);
    }
    case 'moment': {
      const p=world.persons[data.person];
      return sheet('弟子长进',[p&&portraitBlock(p,wordsOf(p)),para(data.text,{lines:4})],[p&&secondary('看看此人','person',{id:p.id}),primary('甚好','close')]);
    }
    case 'unlock':
      if(data.locked)return sheet(ui.language==='en'?'Battle · Not yet open':'战阵·尚待开启',[
        lead(ui.language==='en'?'The seal opens as your sect grows.':'山门根基渐稳，方可遣人出战。'),
        para(ui.language==='en'?'Complete five objectives or reach the first season (90 days).':'开派满一季（九十日）或完成前五项要务后开放。',{lines:4}),
        ...data.features.map(f=>pair(f.name,f.about)),
      ],primary('知道了','close'));
      return sheet('山门日盛',[note('门派有了些根基，新的事务交到你手上：'),data.features.map(f=>pair(f.name,f.about))],primary('知道了','close'));
    case 'tourney': {
      const meet=world.tourney;
      const fighter=p=>portraitBlock(p,`${SECT_BY_ID[p.school]?.name??''} · ${RANKS[p.rank].name} · ${p.level} 级 · 战力 ${num(prowess(p))}`);
      if(!meet){
        const last=world.tourneys?.at(-1);
        if(!last)return sheet('论剑大会',note('大会已散。'),close('关闭'));
        const mine=last.mine&&last.champion.sect===me()&&last.mine.place==='魁首';
        return sheet(`第 ${last.edition} 届论剑大会 · 落幕`,[
          heading(mine?'夺魁':'论剑'),lead(`魁首：${SECT_BY_ID[last.champion.sect].name} ${last.champion.name}${last.runner?`；亚军：${SECT_BY_ID[last.runner.sect].name} ${last.runner.name}`:''}。`,{lines:3}),
          para((last.mine?`本派 ${last.mine.name}：${last.mine.place}。`:'本派未遣人出战。')+(last.prize?`魁首门派得赠《${last.prize}》抄本。`:''),{lines:4}),
          note(`魁首门派威望 +${TOURNEY.renown[0]}、银 ${num(TOURNEY.silver[0])} 两；亚军威望 +${TOURNEY.renown[1]}；四强威望 +${TOURNEY.renown[2]}。下一届在三年之后。`,{lines:5}),
        ],primary('知道了','close'));
      }
      if(meet.stage==='call'){
        const f=tourneyField(world);
        return sheet(`第 ${meet.edition} 届论剑大会`,[
          para('三年一度的论剑大会今日开擂。各派遣一名弟子出战，掌门、长老与江湖奇人不得下场，比的是各家亲手调教出来的后辈。',{lines:5}),
          heading('各派来人'), pageRows(ui,'contenders',f.others,fighter,3),
          heading('本派遣谁出战'),pageRows(ui,'entrants',f.own.slice(0,8),p=>personCard(p,'tourney-enter'),5,'门中没有可出战的弟子（需无重伤、已习得拳脚兵刃）。'),
        ], secondary('本届不参加','tourney-skip'));
      }
      const bout=tourneyBout(world);
      if(!bout)return sheet(`第 ${meet.edition} 届论剑大会`,para('本轮轮空，直接晋级。'),primary('继续','tourney-auto'));
      return sheet(`论剑大会 · ${bout.round}`,[
        lead(`还剩 ${meet.alive.length} 人。这一场：`),fighter(bout.mine),fighter(bout.rival),note('上场可亲自观战、下令；也可交由弟子自行应战，当即见分晓。落败者只受些轻伤。',{lines:4}),
      ],[secondary('交由弟子应战','tourney-auto'),primary('上场','tourney-fight')]);
    }
    case 'duel': {
      const able=membersOf(world,me()).filter(p=>p.wounds<=0.3).sort((a,b)=>prowess(b)-prowess(a));
      return sheet('登擂',[note('点一人登擂，与过路的好手单打独斗。胜则扬名，负则带伤。伤重者不在此列。',{lines:4}),pageRows(ui,'duel',able,p=>personCard(p,'duel'),12,'无人可战。')],close());
    }
    case 'season': {
      const {was,now,mine,abroad,title,growth=[]}=data;
      const todo=waiting().filter(([, ,people])=>people.length);
      const change=(label,key,unit='')=>{
        const delta=Math.round(now[key]-was[key]);
        return row([text(label,{width:'30%',size:14,color:GOLD}),text(`${num(now[key])}${unit}`,{width:'fill',bold:true}),text(delta?(delta>0?'+':'')+num(delta):'—',{width:80,color:delta<0?CINNABAR:GREEN,align:'right'})],{height:40});
      };
      const list=(entries,none,id)=>pageRows(ui,id,entries,r=>pair(LOG_TYPES[r.type]??'江湖',r.text),3,none);
      return sheet(title,[
        change('银两','silver','两'),change('粮草','grain','石'),change('威望','renown'),change('门人','members','人'),change('据点','places','处'),
        heading('弟子长进'),pageRows(ui,'growth',growth,([name,copy])=>pair(name,copy),3,'这一季无人有大长进。'),
        todo.length&&[heading('待你定夺'),todo.map(([key,label,people])=>secondary(`${label} ${people.length} 人`,'only-go',{only:key}))],
        heading('本派'),list(mine,'这一季山门无事。','mine'),heading('江湖'),list(abroad,'这一季江湖平静。','abroad'),note('季报可在设置里关掉。'),
      ],primary('继续','close'));
    }
    case 'herald':
      return sheet(data.label,[heading(data.label),para(data.text,{lines:7})],[button('知道了','close',{},{kind:data.prepare?'outline':'primary'}),data.prepare&&primary('整备守军','prepare-defense')]);
    case 'outcome':
      return sheet(data.title??'江湖',para(data.text,{lines:8}),primary('知道了','close'));
    case 'siege': {
      const pending=world.pending;
      if(pending?.kind!=='siege')return sheet('来犯',note('来敌已退。'),close('关闭'));
      const party=pending.party.map(id=>world.persons[id]).filter(Boolean),guard=residents(world,pending.place).sort((a,b)=>prowess(b)-prowess(a)).slice(0,10);
      return sheet(`${SECT_BY_ID[pending.attacker].name}来犯`,[
        lead(`${SECT_BY_ID[pending.attacker].name}的人马已到${PLACE_BY_ID[pending.place].name}山门之外。`,{lines:3}),fact('来敌',`${party.length} 人 · 战力 ${num(strength(party))}`),fact('我方守卫',`${guard.length} 人 · 战力 ${num(strength(guard))}`),
        formation(guard),note('守在此处的人迎战，山门与箭楼助守。亲自指挥，或交由守将自行应对。',{lines:4}),
        canFallBackAtHome(world,pending.attacker,pending.place)&&warn('这次可退守内院。若战败，山门保住，但要损失两成银粮，弟子可能受伤或战殁。此安排只生效一次。',{lines:5}),
      ],[secondary('交由守将','siege-auto'),primary('亲自指挥','siege-fight')]);
    }
    case 'gear': {
      const p=picked(),offer=gearOffer(world,p.id),relics=books().relics??[],pills=Object.entries(books().stock).filter(([id])=>id.startsWith('pill:'));
      const holder=id=>Object.values(world.persons).find(w=>w.gear.weapon?.relic===id)?.name;
      return sheet(`装备丹药 · ${p.name}`,[
        fact('兵器',weaponText(p)),fact('护具',armorName(p.gear.armor||1)),
        offer.ok?primary(`打造下一品（${offer.silver}两、铁矿 ${offer.iron}）`,'gear-up'):note(offer.why),
        heading('神兵'),relics.length?pageRows(ui,'relics',relics,id=>{
          const r=RELIC_BY_ID[id], slot=({sword:'剑',saber:'刀',spear:'枪',staff:'棍',glove:'拳套',stylus:'点穴笔',dart:'暗器'})[r.slot];
          return secondary(`${r.name}（${slot}，攻 ${r.power}）`,'relic',{id},{detail:`${r.tale}。${holder(id)?'现由'+holder(id)+'佩用':'尚在库中'}，点此赐予${p.name}`,height:100});
        },8):note('本派尚无神兵。神兵不可打造，只在江湖事件中现世。',{lines:3}),
        heading('丹药'),pills.length?pills.map(([id,count])=>secondary(`服用${PILLS[id.slice(5)]?.name??id}（余 ${count}）`,'pill-use',{id:id.slice(5)})):note('库中无丹药，可在山门的丹房炼制。'),
      ],close('关闭'));
    }
    case 'pills':
      return sheet('丹房',[note(`以药材炼丹，成丹入库，在弟子的「装备丹药」中服用。库中药材 ${Math.round(books().res.herb)}。`,{lines:4}),Object.entries(PILLS).map(([id,p])=>secondary(`${p.name}（库存 ${books().stock['pill:'+id]??0}）`,'pill-make',{id},{detail:`需 ${p.needs} 级丹房 · 药材 ${Math.ceil(p.cost/6)} · ${pillText(p)}`,height:82}))],close('关闭'));
    case 'meridian': {
      const p=picked(),opened=p.meridians??[],next=MERIDIANS[opened.length];
      const gift=g=>Object.entries(g).filter(([key])=>key!=='label').map(([key,amount])=>key==='vigor'?`气血 +${Math.round(amount*100)}%`:`${STAT_NAMES[key]} +${amount}`).join('、');
      return sheet(`经脉 · ${p.name}`,[
        para('已通：'+(opened.map((part,i)=>`${MERIDIANS[i].name}（${MERIDIANS[i][part].label}）`).join('、')||'尚未打通任何经脉'),{lines:5}),
        next?[note(`下一脉「${next.name}」：各门内功重数合计需 ${meridianNeed(p)}，现有 ${innerLevels(p)}。两种走法只能择一，不可更改。`,{lines:5}),['a','b'].map(c=>secondary(next[c].label,'meridian',{choice:c},{disabled:innerLevels(p)<meridianNeed(p),detail:gift(next[c]),height:76}))]:lead('奇经八脉俱已贯通。'),
      ],close('关闭'));
    }
    case 'create': {
      const p=picked(),moves=movesOf(p).map(({id,slot,move})=>[`${id}:${slot}`,`${ART_BY_ID[id].name}·${move.name}（威力 ${Math.round(move.power)}）`]),mine=(world.customArts??[]).filter(a=>a.sect===me());
      return sheet(`自创武学 · ${p.name}`,[
        note(`从已学会的招式里取三招，合成一门本派独有的武学。三招须用同一种兵器（或同为空手）。每派至多 ${CUSTOM_ART_LIMIT} 门，已有 ${mine.length} 门${mine.length?'：'+mine.map(a=>a.name).join('、'):''}。`,{lines:7}),
        field('名称','art-name','',{maxLength:8,placeholder:'如：松风剑'}),[0,1,2].map(i=>form(`第${'一二三'[i]}招`,`pick-${i}`,moves,moves[Math.min(i,moves.length-1)]?.[0])),
      ],[close(),primary('开宗立派','create-art',{},{disabled:moves.length===0})]);
    }
    case 'offices': {
      const all=membersOf(world,me()).filter(p=>p.rank>=2).sort((a,b)=>b.rank-a.rank||b.stats.wit-a.stats.wit),held=books().offices;
      return sheet('任命职位',[note(`职位的增益随任职者的悟性而定。一人只任一职。舵主与左右堂主管的是${PLACE_BY_ID[ui.place].name}一处，长老管全派。`,{lines:5}),
        Object.entries(OFFICES).map(([id,o])=>opt(o.name,'office',held[o.scope==='place'?`${id}@${ui.place}`:id]??'',[['','（空缺）'],...all.map(p=>[p.id,`${p.name}（${RANKS[p.rank].name}，悟性 ${Math.round(p.stats.wit)}）`])],{office:id})),
      ],primary('完成','close'));
    }
    case 'retreat':
      return sheet('确认撤退',warn('撤退即认负。跑得出战场的弟子可以保全，来不及的仍会倒下。',{lines:4}),[close('继续作战'),button('确认撤退','fight-retreat',{},{kind:'danger'})]);
    case 'fight': {
      const last=ui.lastFight;
      if(!last)return sheet('战报',note('暂无战报。'),close('关闭'));
      const [label,page]=last.tourney?['返回论剑','battle']:world.outcome?.result==='lost'?['查看纪事','chronicle']:last.fellBack?['返回山门','seat']:['返回江湖','world'];
      return sheet(`战报 · ${last.title}`,[
        lead(last.won?'此战告捷':'此战失利',{color:last.won?GREEN:CINNABAR,size:24}),para(last.verdict,{lines:6}),heading('交战记录'),pageRows(ui,'fight',last.lines,copy=>para(copy,{lines:2}),10,'两军未及交手。'),
      ],primary(label,'page',{page}));
    }
    case 'diplomacy':
      return sheet('门派往来',[
        pageRows(ui,'diplomacy',SECTS.filter(s=>s.id!==me()),s=>{
          const theirs=world.sects[s.id];
          if(!theirs.alive)return card(s.name,[face(founder(s),'bust',72,96),note('已除名')]);
          const l=ledger(world,s.id),relation=Math.round(books().relations[s.id]);
          return card(s.name,[
            row([face(leaderOf(s.id)??founder(s),'bust',76,96),para(`${['邪','中立','正'][s.standing+1]} · ${l.members} 人 · ${l.places} 处 · 战力 ${num(l.strength)}`,{lines:4,width:'fill'})],{height:96,gap:8}),fact('两派关系',relation),
            secondary('馈赠 500 两','gift',{sect:s.id}),secondary('求授武学','sheet',{kind:'teaching',sect:s.id}),
            s.id in (books().spies??{})?note('卧底在内'):open('spy')&&secondary(`安插卧底（${SPY_COST}两）`,'spy',{sect:s.id}),
          ]);
        },4),
        note(`关系到 ${ECONOMY.allyRelation} 的门派，与本派据点相邻的道路即成商路，每旬各得 ${ECONOMY.allyRouteIncome} 两；本派两处据点之间的道路每旬得 ${ECONOMY.routeIncome} 两，两端每有一间店铺再加 ${ECONOMY.routeShopBonus} 两。`,{lines:7}),
        note('关系高的门派不易来犯，馈赠可以改善关系。有卧底在内的门派，与之交手时我方攻势加八分；卧底每旬有小概率败露，败露则两派交恶。',{lines:6}),
      ],close('关闭'));
    case 'teaching': {
      const offers=teachingOffers(world,me(),data.sect),relation=Math.round(books().relations[data.sect]);
      return sheet(`向${SECT_BY_ID[data.sect].name}求授`,[
        note(`眼下交情 ${relation}。对方肯教的，是它自家能授、而本派尚无的通用武学；各派的绝学概不外传。每求一门，耗交情 ${TEACHING.goodwill}。`,{lines:5}),
        pageRows(ui,'teaching',offers,o=>{
          const a=ART_BY_ID[o.id];
          return card(`《${a.name}》`,para(`${CLASSES[a.klass].name} · ${a.tier}阶${o.open?'':` · 需交情 ${o.relation}`}`),secondary(`${num(o.silver)} 两`,'ask-teaching',{sect:data.sect,id:a.id},{disabled:!o.open||books().silver<o.silver}));
        },8,'它会的，本派都已有了。'),
      ],close('关闭'));
    }
    case 'settings': {
      const audio=(label,source,change,volumeChange)=>[opt(label,change,source.on?'on':'off',onOff),opt(label+'音量',volumeChange,volumeOf(source),volumes)];
      return sheet('游戏设置',[
        opt('语言','language',ui.language??'zh',[['zh','简体中文'],['en','English']]),
        opt('画质','quality',storedQuality?.()??'',[['','自动'],['high','高'],['medium','中'],['low','低（省电）']]),
        note(picture.stage?'改动画质后会重新载入页面，进度先自动保存。':'这台设备画不了 3D，山门以画卷示意，战斗以文字结算。',{lines:4}),
        opt('季报','season',storage?.getItem('wulin-season')??'on',[['on','每季一报'],['off','不报']]),
        heading('音乐与声音'),audio('背景音乐',music,'music','music-volume'),audio('操作与战斗音效',feedbackAudio,'feedback-sound','feedback-volume'),secondary('试听音效','feedback-test'),
        audio('场景环境声',worldAmbience,'ambience','ambience-volume'),audio('中文播报',voice,'voice','voice-volume'),secondary('试听女声','voice-test'),
        note('序章、战报提示和招式采用合成的台湾国语女声。设备有台湾国语语音时，也可朗读即时详情。',{lines:4}),
        world&&stillToCome(world).length&&[note(`功能随门派壮大逐步开放，尚有 ${stillToCome(world).length} 项未开。老手可以一次全开。`,{lines:3}),secondary('开放全部功能','open-all')],
        note('连按两次 F8，或连续点击顶栏日期五次，可打开修改器。'),heading('数据包（MOD）'),
        note(`${modNote()||'未装载'}。数据包是一个 JSON 文件，可改经济与建筑数值、门派配色、武学名称与威力，并添加事件；装载或卸下后会重新载入页面。`,{lines:6}),
        secondary('装载数据包','mod-load'),secondary('卸下数据包','mod-clear',{},{disabled:!modNote()}),
      ],[world&&secondary('修改器','editor'),primary('完成','close')]);
    }
    case 'editor': {
      if(!world)return sheet('数据修改器',note('请先进入游戏。'),close('关闭'));
      const theirs=world.sects[data.sect],members=membersOf(world,data.sect),p=world.persons[data.person]??members[0],placeId=data.place??PLACES[0].id;
      const edit=(label,change,value,extra={})=>field(label,`${change}${extra.key?'-'+extra.key:extra.index!==undefined?'-'+extra.index:''}`,String(Math.round(value*100)/100),{type:'number',change,data:extra});
      return sheet('数据修改器',[
        opt('门派','ed-sect',data.sect,SECTS.filter(s=>world.sects[s.id].alive).map(s=>[s.id,s.name])),
        heading('门派'), edit('银两','ed-silver',theirs.silver),edit('粮草','ed-grain',theirs.grain),edit('威望','ed-renown',theirs.renown),edit('正邪','ed-virtue',theirs.virtue),edit('朝廷','ed-court',theirs.court),
        RESOURCES.map(key=>edit(RESOURCE_NAMES[key],'ed-res',theirs.res[key],{key})),
        heading('角色'),opt('人物','ed-person',p?.id??'',members.map(w=>[w.id,w.name])),
        p&&[
          field('姓名','ed-name',p.name,{change:'ed-name'}),edit('等级','ed-level',p.level),edit('忠诚','ed-loyalty',p.loyalty),edit('年龄','ed-age',p.age),
          STAT_KEYS.map(key=>edit(STAT_NAMES[key],'ed-stat',p.stats[key],{key})),Object.keys(p.apt).map(key=>edit(APT_NAMES[key]+'资质','ed-apt',p.apt[key],{key})),
          form('武学','ed-art',ARTS.map(a=>[a.id,`${a.name}（${levelOf(p.arts[a.id]??0)}重）`])),field('重数','ed-art-level','10',{type:'number',min:0,max:10}),secondary('设为此重','ed-art'),
        ],
        heading('物品'),note('代号如 pill:heal1、weapon:sword:5、armor:3'),field('物品','ed-item','weapon:sword:7'),field('数量','ed-count','1',{type:'number'}),secondary('设定数量','ed-stock'),
        pageRows(ui,'stock',Object.entries(theirs.stock),([id,count])=>fact(describeItem(id)?.name??id,`× ${count}`),15,'库中无物。'),
        heading('据点与外交'),opt('据点','ed-place',placeId,PLACES.map(s=>[s.id,s.name])),
        opt('归属','ed-owner',world.places[placeId].owner??'',[['','无主'],...SECTS.filter(s=>world.sects[s.id].alive).map(s=>[s.id,s.name])]),
        world.places[placeId].buildings.map((b,index)=>edit(BUILDINGS[b.kind].name,'ed-building',b.level,{index})),
        data.sect!==me()&&edit('与本派关系','ed-relation',books().relations[data.sect]??0),warn('改动立即生效；超出常规范围的数值也会生效。',{lines:3}),
      ],[secondary('还原到打开前','ed-revert'),primary('关闭','close')]);
    }
    default: return null;
  }
}
