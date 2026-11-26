// Read only the data syntax used by showcase/games.js. Keep source spans so a
// save touches the edited strings and moves whole game entries as written.
const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const NUMBER = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ESCAPES = { '"': '"', "'": "'", '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };
const LANGUAGES = ['zh', 'en'];
const MAX_DEPTH = 64;

class Reader {
  constructor(source) {
    if (typeof source !== 'string') throw new TypeError('Catalog source must be text');
    this.source = source;
    this.at = 0;
  }

  fail(reason) {
    const line = this.source.slice(0, this.at).split(/\r\n|[\r\n\u2028\u2029]/).length;
    throw new SyntaxError(reason + ' (catalog line ' + line + ')');
  }

  trivia() {
    while (this.at < this.source.length) {
      if (/\s/.test(this.source[this.at])) {
        this.at++;
      } else if (this.source.startsWith('//', this.at)) {
        this.at += 2;
        while (this.at < this.source.length && !/[\r\n\u2028\u2029]/.test(this.source[this.at])) this.at++;
      } else if (this.source.startsWith('/*', this.at)) {
        const end = this.source.indexOf('*/', this.at + 2);
        if (end < 0) this.fail('Unterminated comment');
        this.at = end + 2;
      } else {
        return;
      }
    }
  }

  take(char) {
    this.trivia();
    if (this.source[this.at] !== char) return false;
    this.at++;
    return true;
  }

  expect(char) {
    if (!this.take(char)) this.fail('Expected ' + char);
  }

  match(pattern) {
    pattern.lastIndex = this.at;
    const result = pattern.exec(this.source);
    if (!result) return null;
    this.at = pattern.lastIndex;
    return result[0];
  }

  word(name) {
    this.trivia();
    if (this.match(IDENTIFIER) !== name) this.fail('Expected ' + name);
  }

  string() {
    const quote = this.source[this.at++];
    let value = '';
    while (this.at < this.source.length) {
      const char = this.source[this.at++];
      if (char === quote) return value;
      if (/[\r\n\u2028\u2029]/.test(char)) this.fail('Unescaped line break in string');
      if (char !== '\\') {
        value += char;
        continue;
      }
      const escape = this.source[this.at++];
      if (Object.hasOwn(ESCAPES, escape)) {
        value += ESCAPES[escape];
      } else if (escape === 'u' || escape === 'x') {
        const width = escape === 'u' ? 4 : 2;
        const hex = this.source.slice(this.at, this.at + width);
        if (hex.length !== width || !/^[0-9a-f]+$/i.test(hex)) this.fail('Invalid hexadecimal escape');
        value += String.fromCharCode(Number.parseInt(hex, 16));
        this.at += width;
      } else if (escape === '0' && !/[0-9]/.test(this.source[this.at] ?? '')) {
        value += '\0';
      } else {
        this.fail('Invalid string escape');
      }
    }
    this.fail('Unterminated string');
  }

  value(depth = 0) {
    this.trivia();
    if (depth > MAX_DEPTH) this.fail('Too many nested catalog values');
    const start = this.at;
    const char = this.source[this.at];
    let value, items, properties;
    if (char === '"' || char === "'") {
      value = this.string();
    } else if (this.take('[')) {
      items = [];
      while (!this.take(']')) {
        items.push(this.value(depth + 1));
        if (!this.take(',')) {
          this.expect(']');
          break;
        }
      }
      value = items.map(item => item.value);
    } else if (this.take('{')) {
      properties = new Map();
      while (!this.take('}')) {
        this.trivia();
        const next = this.source[this.at];
        const key = next === '"' || next === "'" ? this.string() : this.match(IDENTIFIER);
        if (key === null || UNSAFE_KEYS.has(key) || properties.has(key)) this.fail('Invalid or duplicate property ' + key);
        this.expect(':');
        properties.set(key, this.value(depth + 1));
        if (!this.take(',')) {
          this.expect('}');
          break;
        }
      }
      value = Object.fromEntries([...properties].map(([key, item]) => [key, item.value]));
    } else {
      const number = this.match(NUMBER);
      if (number !== null) {
        value = Number(number);
        if (!Number.isFinite(value)) this.fail('Catalog numbers must be finite');
      } else {
        const literal = this.match(IDENTIFIER);
        switch (literal) {
          case 'true': value = true; break;
          case 'false': value = false; break;
          case 'null': value = null; break;
          default: this.fail('Expected a data literal');
        }
      }
    }
    return { value, start, end: this.at, items, properties };
  }

  declaration(name) {
    this.word('export');
    this.word('const');
    this.word(name);
    this.expect('=');
    const item = this.value();
    this.expect(';');
    return item;
  }
}

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const plainObject = value => value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function parseCatalog(source) {
  const reader = new Reader(source);
  const featuredId = reader.declaration('FEATURED_ID').value;
  const { items } = reader.declaration('GAMES');
  reader.trivia();
  if (reader.at !== source.length) reader.fail('Unexpected text following GAMES');
  if (!items) reader.fail('GAMES must be an array');
  const entries = new Map();
  for (const item of items) {
    const id = item.value?.id;
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) reader.fail('Missing or invalid game ID');
    if (entries.has(id)) reader.fail('Duplicate game ID ' + id);
    const summary = item.properties.get('summary');
    if (!summary?.properties || !LANGUAGES.every(language => nonempty(summary.value[language]))) {
      reader.fail('Missing bilingual summary for ' + id);
    }
    entries.set(id, { item, summary });
  }
  if (!entries.has(featuredId)) reader.fail('FEATURED_ID must name a featured game in GAMES');
  return { featuredId, entries };
}

export function readCatalog(source) {
  const { featuredId, entries } = parseCatalog(source);
  return { featuredId, games: [...entries.values()].map(({ item }) => item.value) };
}

// HTML punctuation and legacy JavaScript line separators stay inside the
// serialized string even if this module is embedded in an HTML document.
function quote(text) {
  return JSON.stringify(text).replace(/[<>&\u2028\u2029]/g,
    char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
}

function editSummary(source, item, summary, updates) {
  const changed = LANGUAGES.map(language => ({
    ...summary.properties.get(language), next: updates[language],
  })).filter(({ value, next }) => value !== next).sort((a, b) => a.start - b.start);
  let text = '';
  let at = item.start;
  for (const { start, end, next } of changed) {
    text += source.slice(at, start) + quote(next);
    at = end;
  }
  return text + source.slice(at, item.end);
}

export function writeCatalog(source, order, summaries = {}) {
  const { entries } = parseCatalog(source);
  if (!Array.isArray(order) || order.length !== entries.size || new Set(order).size !== entries.size ||
      !order.every(id => entries.has(id))) {
    throw new TypeError('Game order must contain each existing ID exactly once');
  }
  if (!plainObject(summaries)) throw new TypeError('Summaries must be keyed by game ID');
  for (const [id, updated] of Object.entries(summaries)) {
    if (!entries.has(id) || !plainObject(updated) || Object.keys(updated).length !== LANGUAGES.length ||
        !LANGUAGES.every(language => Object.hasOwn(updated, language) && nonempty(updated[language]))) {
      throw new TypeError('Invalid bilingual summary update for ' + id);
    }
  }
  let output = '';
  let at = 0;
  let index = 0;
  for (const { item: slot } of entries.values()) {
    const id = order[index++];
    const { item, summary } = entries.get(id);
    const text = Object.hasOwn(summaries, id)
      ? editSummary(source, item, summary, summaries[id])
      : source.slice(item.start, item.end);
    output += source.slice(at, slot.start) + text;
    at = slot.end;
  }
  return output + source.slice(at);
}
