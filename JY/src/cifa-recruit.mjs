import { hostInteger, parseCifaScript, runCifaScript } from './cifa-trainer.mjs';

const operations = new Map([
  ['talk', [4, 'talk']],
  ['modifyevent', [13, 'modifyEvent']],
  ['askjoin', [0, 'askJoin']],
  ['checkrolemorality', [3, 'checkRoleMorality']],
  ['teamisfull', [0, 'teamIsFull']],
  ['exit', [0]],
  ['darkscene', [0, 'darkScene']],
  ['lightscene', [0, 'lightScene']],
  ['join', [1, 'join']],
]);
const arities = new Map(Array.from(operations, ([name, [arity]]) => [name, arity]));

/** Parse the original Duan Yu recruitment events 476 and 477. */
export function parseRecruitScript(source) {
  return parseCifaScript(source, arities);
}

export async function runRecruitScript(program, host) {
  await runCifaScript(program, (name, values) => {
    const method = operations.get(name)?.[1];
    if (!method) throw new Error(`Unsupported recruitment host call: ${name}`);
    if (name === 'talk') {
      const [text, ...args] = values;
      if (typeof text !== 'string') throw new TypeError('Recruitment dialogue must be a string');
      return host.talk(text, ...args.map(hostInteger));
    }
    return host[method](...values.map(hostInteger));
  });
}
