const trainerArities = new Map([
  ['newtalk', 3], ['getitemcountinbag', 1], ['random', 2], ['trybattle', 2],
  ['additem', 2], ['additemwithouthint', 2], ['autosave', 0], ['floor', 1], ['to_string', 1],
]);
const precedence = new Map([['&&', 1], ['<', 2], ['+', 3], ['-', 3], ['/', 4]]);

/** Parse the expressions and statements used by the original trainer event. */
export function parseTrainerScript(source) {
  return parseCifaScript(source, trainerArities);
}

export function parseCifaScript(source, arities) {
  const tokens = [];
  const pattern = /(?<trivia>\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)|(?<name>[A-Za-z_][A-Za-z0-9_]*)|(?<number>[0-9]+(?:\.[0-9]+)?)|(?<string>"(?:[^"\\\u0000-\u001f]|\\["\\nrt])*")|(?<symbol>&&|[{}()[\],;=+/<!-])/y;
  function fail(message, offset) {
    const lines = source.slice(0, offset).split(/\r\n|\r|\n/);
    throw new SyntaxError(`Cifa ${lines.length}:${lines.at(-1).length + 1}: ${message}`);
  }

  for (let offset = 0; offset < source.length;) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match) fail('unsupported token', offset);
    const { trivia, name, number, string, symbol } = match.groups;
    if (!trivia) {
      if (name) tokens.push({ kind: 'name', value: name.toLowerCase(), offset });
      else if (number) tokens.push({ kind: 'literal', value: Number(number), offset });
      else if (string) tokens.push({ kind: 'literal', value: JSON.parse(string), offset });
      else tokens.push({ kind: symbol, value: symbol, offset });
    }
    offset = pattern.lastIndex;
  }
  tokens.push({ kind: 'eof', offset: source.length });
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];
  function accept(kind, value) {
    const token = peek();
    if (token.kind !== kind || value !== undefined && token.value !== value) return false;
    consume();
    return true;
  }
  function expect(kind) {
    if (!accept(kind)) fail(`expected ${kind}`, peek().offset);
  }
  function list(close) {
    const values = [];
    if (accept(close)) return values;
    do { values.push(expression()); } while (accept(','));
    expect(close);
    return values;
  }
  function primary() {
    const token = peek();
    if (accept('-')) return { kind: 'negate', operand: primary() };
    if (accept('!')) return { kind: 'not', operand: primary() };
    if (accept('(')) {
      const value = expression();
      expect(')');
      return value;
    }
    if (accept('{')) return { kind: 'array', values: list('}') };
    if (accept('literal')) return token;
    if (accept('name')) {
      if (accept('(')) {
        if (!arities.has(token.value)) fail(`unsupported call ${token.value}`, token.offset);
        const args = list(')');
        const arity = arities.get(token.value);
        const accepted = Array.isArray(arity) ? arity : [arity];
        if (!accepted.includes(args.length)) fail(`${token.value} expects ${accepted.join(' or ')} arguments`, token.offset);
        return { kind: 'call', name: token.value, args };
      }
      if (accept('[')) {
        const index = expression();
        expect(']');
        return { kind: 'index', name: token.value, index };
      }
      return token;
    }
    fail('expected expression', token.offset);
  }
  function expression(minimum = 1) {
    let left = primary();
    while ((precedence.get(peek().kind) ?? 0) >= minimum) {
      const operator = consume().kind;
      const right = expression(precedence.get(operator) + 1);
      left = { kind: 'binary', operator, left, right };
    }
    return left;
  }
  function block() {
    expect('{');
    const body = [];
    while (peek().kind !== '}' && peek().kind !== 'eof') body.push(statement());
    expect('}');
    return body;
  }
  function statement() {
    if (accept('name', 'if')) {
      expect('(');
      const condition = expression();
      expect(')');
      const yes = block();
      const no = accept('name', 'else') ? block() : [];
      return { kind: 'if', condition, yes, no };
    }
    if (peek().kind === 'name' && tokens[cursor + 1]?.kind === '=') {
      const name = consume().value;
      expect('=');
      const value = expression();
      expect(';');
      return { kind: 'assign', name, value };
    }
    const offset = peek().offset;
    const call = expression();
    if (call.kind !== 'call') fail('expected a call or assignment', offset);
    expect(';');
    return call;
  }

  const program = [];
  while (peek().kind !== 'eof') program.push(statement());
  return program;
}

/** Windows Cifa scales an integer from rand() over the full 0..RAND_MAX range. */
export function trainerRandom(min, max, sample = Math.random) {
  const randMax = 32767;
  return min + Math.floor(sample() * (randMax + 1)) / randMax * (max - min);
}

export function trainerEventRandom(min, max, wins, sample = Math.random) {
  const value = trainerRandom(min, max, sample);
  // At zero wins the inclusive upper draw produces k=136 for the 136-entry array.
  if (wins === 0 && min === -3 && max === 3 && value === 3) return trainerRandom(min, max, () => 32766 / 32768);
  return value;
}

export async function playTrainer({ program, inventory, view }) {
  const bag = new Map(inventory);
  let battle;
  const add = (id, amount) => bag.set(id, (bag.get(id) ?? 0) + amount);
  await runTrainerScript(program, {
    random: (min, max) => trainerEventRandom(min, max, bag.get(198) ?? 0),
    getitemcountinbag: id => bag.get(id) ?? 0,
    newtalk: (text, head, style) => view.talk({ text, head, style, voice: -1 }),
    async trybattle(id, getExp) {
      battle = await view.battle(id, getExp, bag);
      for (const [item, change] of battle.inventoryDelta) {
        add(item, change);
        if (bag.get(item) === 0) bag.delete(item);
      }
      return battle.won;
    },
    async additem(id, amount) {
      add(id, amount);
      await view.showItem(id, amount);
    },
    additemwithouthint: add,
    autosave: () => view.save(bag, battle),
  });
}

export function hostInteger(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new RangeError('Cifa host argument must fit a signed 32-bit integer');
  }
  return Math.trunc(value) || 0;
}

/** Host calls finish before the next script statement takes effect. */
export async function runTrainerScript(program, host) {
  await runCifaScript(program, (name, values) => {
    if (name === 'floor') return Math.floor(values[0]);
    if (name === 'to_string') return String(values[0]);
    if (name === 'random') return host.random(...values);
    if (name === 'newtalk') return host.newtalk(String(values[0]), ...values.slice(1).map(hostInteger));
    return host[name](...values.map(hostInteger));
  });
}

export async function runCifaScript(program, callHost) {
  const variables = new Map();
  const exit = Symbol('Cifa exit');
  function variable(name) {
    if (!variables.has(name)) throw new Error(`Uninitialized Cifa variable: ${name}`);
    return variables.get(name);
  }
  async function argumentsOf(nodes) {
    const values = [];
    for (const node of nodes) values.push(await evaluate(node));
    return values;
  }
  async function call({ name, args }) {
    const values = await argumentsOf(args);
    if (name === 'exit') throw exit;
    return callHost(name, values);
  }
  async function evaluate(node) {
    switch (node.kind) {
      case 'literal': return node.value;
      case 'name': return variable(node.value);
      case 'negate': return -(await evaluate(node.operand));
      case 'not': return !(await evaluate(node.operand));
      case 'array': return argumentsOf(node.values);
      case 'index': {
        const values = variable(node.name);
        const index = Math.max(0, hostInteger(await evaluate(node.index)));
        if (!Array.isArray(values) || index >= values.length) throw new RangeError(`Cifa index ${node.name}[${index}] is outside its array`);
        return values[index];
      }
      case 'call': return call(node);
      case 'binary': {
        const left = await evaluate(node.left);
        if (node.operator === '&&') return left ? Boolean(await evaluate(node.right)) : 0;
        const right = await evaluate(node.right);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '/': return left / right;
          case '<': return left < right;
        }
      }
    }
    throw new Error(`Unsupported Cifa expression ${node.kind}`);
  }
  async function execute(statements) {
    for (const statement of statements) {
      if (statement.kind === 'assign') variables.set(statement.name, await evaluate(statement.value));
      else if (statement.kind === 'if') await execute(await evaluate(statement.condition) ? statement.yes : statement.no);
      else await call(statement);
    }
  }
  try {
    await execute(program);
  } catch (error) {
    if (error !== exit) throw error;
  }
}
