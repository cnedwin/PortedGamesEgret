import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { ARTS, CLASSES } from '../src/data/arts.mjs';
import { PLACES, RESOURCE_NAMES } from '../src/data/places.mjs';
import { SECTS, ELDERS, OFFICES, RANKS } from '../src/data/sects.mjs';
import { BUILDINGS, GRADES, PILLS, WEAPONS } from '../src/data/goods.mjs';
import { DIFFICULTIES, FOCUSES, MERIDIANS, RELICS, SCENARIOS } from '../src/data/extras.mjs';
import { EVENTS, FORMATIONS, HOUSE_RULES, TALENTS, TRIALS, WANDERERS } from '../src/data/jianghu.mjs';
import { PLEAS, QUALITIES, TRAIT_NOTES } from '../src/core/disciples.mjs';
import { APT_NAMES, STAT_NAMES, TRAITS, ORIGINS } from '../src/core/persons.mjs';
import { GOALS, LAST_WORD } from '../src/core/goals.mjs';
import { FEATURES } from '../src/core/unlocks.mjs';
const { createLocale } = await import('../src/ui/locale.mjs');

const han = /\p{Script=Han}/u;
const defined = (...xs) => xs.flat(Infinity).filter(x=>typeof x==='string');
test('both languages cover the authored names, goals, abilities and event branches',()=>{
  const locale=createLocale('en-US');
  const strings=defined(
    ARTS.map(a=>[a.name,a.moves.map(m=>m.name)]), Object.values(CLASSES).map(c=>c.name),
    PLACES.map(p=>[p.name,p.note]),Object.values(RESOURCE_NAMES),
    SECTS.map(s=>[s.name,s.leader.name,s.role]),Object.values(ELDERS).flat().map(p=>p.name),
    Object.values(OFFICES).map(o=>o.name),RANKS.map(r=>r.name),
    Object.values(BUILDINGS).map(b=>[b.name,b.does]), GRADES.map(g=>g?.name),Object.values(PILLS).map(p=>p.name),Object.values(WEAPONS),
    DIFFICULTIES.map(d=>d.name),Object.values(FOCUSES).map(f=>[f.name,f.does]),MERIDIANS.map(m=>[m.name,m.a.label,m.b.label]),RELICS.map(r=>[r.name,r.tale]),Object.values(SCENARIOS).map(s=>[s.name,s.does]),
    Object.values(FORMATIONS).map(f=>[f.name,f.does]),Object.values(HOUSE_RULES).map(r=>[r.name,r.does]),Object.values(TALENTS).map(t=>[t.name,t.does]),Object.values(TRIALS).map(t=>t.text),
    WANDERERS.map(w=>[w.name,w.about,w.wish]),EVENTS.map(e=>[e.title,e.text,e.choices.map(c=>[c.label,c.hint,c.text,c.risk?.text])]),
    QUALITIES.map(q=>[q.name,q.about]),Object.values(TRAIT_NOTES),Object.values(APT_NAMES),Object.values(STAT_NAMES),Object.values(TRAITS).map(t=>t.name),ORIGINS.map(o=>o.name),
    GOALS.map(g=>[g.title,g.text,g.how]),LAST_WORD.title,LAST_WORD.text,LAST_WORD.how,FEATURES.map(f=>[f.name,f.about,f.hint]),
  );
  assert.ok(strings.length>700);
  for(const words of strings) assert.doesNotMatch(locale.translate(words),han,words);
  assert.deepEqual(locale.missing(),[]);
  locale.setLanguage('zh-CN');
  for(const words of strings)assert.equal(locale.translate(words),words);
});

test('dynamic disciple pleas retain person names, choice descriptions and outcomes in English',()=>{
  const locale=createLocale('en-US'), person={name:'赵山峰'};
  locale.registerNames([person.name]);
  for(const plea of Object.values(PLEAS)){
    const texts=defined(plea.title,plea.text(person),plea.choices.map(c=>[c.label,c.hint,c.text(person)]));
    for(const words of texts)locale.translate(words);
  }
  assert.deepEqual(locale.missing(),[]);
});
