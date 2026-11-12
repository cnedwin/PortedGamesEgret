import { hostInteger, parseCifaScript, runCifaScript, trainerRandom } from './cifa-trainer.mjs';

const callsByArity = [
  'askjoin teamisfull darkscene lightscene askbattle check14booksplaced dead zeroallmp askrest rest '
    + 'checkfemaleinteam breakstonegate autosave openallsubmap showmorality showfame allleave fightfortop shop exit',
  'isusingitem addmorality join playwave addfame settowards changemainmapmusic inteam checkenoughmoney '
    + 'leaveteam checkrolesexual haveitembool opensubmap playmusic getitemcountinbag floor to_string',
  'additemwithouthint checkeventid additem addmaxhp oldsetsceneposition setroleusepoison addiq addattack '
    + 'setsexual addspeed setmptype addmaxmp random',
  'checkrolemorality playanimation checkroleattack oldlearnmagic roleadditem checksubmappic',
  'setrolemagic submapviewfromto walkfromto changesubmappic',
  'setsubmaplayerdata add3eventnum checkhave5item',
  'backhome play2amination',
];
const arities = new Map(callsByArity.flatMap((names, arity) => names.split(' ').map(name => [name, arity])));
arities.set('modifyevent', 13);
arities.set('talk', [3, 4]);
arities.set('newtalk', [3, 4]);
arities.set('trybattle', [1, 2]);

/** Parse the event syntax and host calls used by the original game resources. */
export function parseGameScript(source, { eventId } = {}) {
  if (eventId === 458) {
    // The default 4in1 script exits before its low-morality rematch. Exit after the praise only.
    source = source.replace(
      /(if\s*\(CheckRoleMorality\(0,\s*50,\s*100\)\)\s*\{\s*Talk\([^\r\n]*,\s*1645\);)\s*}\s*exit\(\);(?=\s*Talk\([^\r\n]*,\s*1644\);)/i,
      '$1\n    exit();\n}',
    );
  } else if (eventId === 676) {
    // The default 4in1 script lacks the closing brace after the missing-ingredients exit.
    source = source.replace(
      /(if\s*\(!checkHave5Item\(138,\s*139,\s*140,\s*141,\s*142\)\)\s*\{\s*Talk\([^\r\n]*\);\s*exit\(\);)(\s*AddItemWithoutHint\(138,\s*-1\);)/i,
      '$1\n}$2',
    );
  }
  return parseCifaScript(source, arities);
}

/** Invoke lower-case event hosts in script order and wait for each operation. */
export async function runGameScript(program, invoke, { sample = Math.random } = {}) {
  await runCifaScript(program, (name, values) => {
    if (name === 'floor') return Math.floor(values[0]);
    if (name === 'to_string') return String(values[0]);
    if (name === 'random') return trainerRandom(values[0], values[1], sample);
    if (name === 'talk' || name === 'newtalk') {
      // The two original aliases collect the dialogue string separately from the numeric fields.
      const [head = -1, style = -1, voice = -1] = values.filter(value => typeof value === 'number').map(hostInteger);
      const text = values.find(value => typeof value === 'string' && value.length > 0) ?? '';
      return invoke(name, text, head, style, voice);
    }
    const args = values.map(hostInteger);
    if (name === 'trybattle' && args.length === 1) args.push(-1);
    return invoke(name, ...args);
  });
}
