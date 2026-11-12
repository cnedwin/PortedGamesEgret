const operations = new Map([
  ['talk', { name: 'Talk', method: 'talk', arguments: 'siii' }],
  ['playanimation', { name: 'PlayAnimation', method: 'animate', arguments: 'iii' }],
  ['settowards', { name: 'SetTowards', method: 'setTowards', arguments: 'i' }],
  ['playwave', { name: 'PlayWave', method: 'playWave', arguments: 'i' }],
  ['modifyevent', { name: 'ModifyEvent', method: 'modifyEvent', arguments: 'iiiiiiiiiiiii' }],
]);

const int32 = value => Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff;
const eventFields = [
  'cannotWalk', 'index', 'event1', 'event2', 'event3', 'currentPic', 'endPic', 'beginPic', 'picDelay',
];

/** Parse the five straight-line Cifa host calls used by the original opening event. */
export function parseOpeningScript(source) {
  let offset = 0;
  let context = '';
  const commands = [];
  const trivia = /\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//y;
  const identifier = /[A-Za-z_][A-Za-z0-9_]*/y;
  const integer = /[+-]?(?:0|[1-9][0-9]*)/y;
  const string = /"(?:[^"\\\u0000-\u001f]|\\["\\nrt])*"/y;

  function match(pattern) {
    pattern.lastIndex = offset;
    const result = pattern.exec(source);
    if (!result) return undefined;
    offset = pattern.lastIndex;
    return result[0];
  }

  function skip() {
    while (match(trivia)) { /* consume whitespace and comments */ }
  }

  function fail(message) {
    const lines = source.slice(0, offset).split(/\r\n|\r|\n/);
    throw new SyntaxError(`Cifa ${lines.length}:${lines.at(-1).length + 1}${context ? ` (${context})` : ''}: ${message}`);
  }

  function expect(token) {
    skip();
    if (source[offset] !== token) fail(`expected ${token}`);
    offset++;
  }

  function readArgument(kind) {
    skip();
    if (kind === 's') {
      const value = match(string);
      if (value === undefined) fail('expected a quoted string literal');
      return JSON.parse(value);
    }
    const value = Number(match(integer));
    if (!int32(value)) fail('expected a signed 32-bit decimal integer');
    return value || 0;
  }

  skip();
  while (offset < source.length) {
    context = match(identifier);
    if (!context) fail('expected a host call');
    const operation = operations.get(context.toLowerCase());
    if (!operation) fail('unsupported host call');
    expect('(');
    const args = [];
    for (const kind of operation.arguments) {
      if (args.length) expect(',');
      args.push(readArgument(kind));
    }
    expect(')');
    expect(';');
    commands.push({ name: operation.name, args });
    skip();
  }
  return commands;
}

/** Each host operation finishes before the next statement takes effect. */
export async function runOpeningScript(commands, host) {
  for (const [index, command] of commands.entries()) {
    const { name, args } = command;
    const operation = operations.get(name.toLowerCase());
    if (!operation) throw new Error(`Unsupported opening host call: ${name}`);
    if (host.beforeCommand) await host.beforeCommand(command, index);
    await host[operation.method](...args);
  }
}

/** Reproduce Event::playAnimation's different player and event-picture ranges. */
export function animationFrames(target, begin, end) {
  if (![target, begin, end].every(int32) || target < -1 || begin < 0 || end < 0) {
    throw new RangeError('Invalid opening animation arguments');
  }
  const player = target === -1;
  const first = player ? Math.trunc(begin / 2) : begin;
  const final = player ? Math.trunc(end / 2) : end;
  const step = Math.sign(final - first);
  const count = Math.abs(final - first) + (player ? 1 : 0);
  if (count > 4096) throw new RangeError('Opening animation frame count exceeds 4096');
  return { frames: Array.from({ length: count }, (_, index) => first + index * step), final };
}

/** Apply ModifyEvent to the current scene using the original event slot and grid semantics. */
export function modifySceneEvent(scene, currentEventIndex, ...args) {
  if (args.length !== 13 || !args.every(int32)) throw new TypeError('Invalid ModifyEvent arguments');
  const [sceneId, requestedSlot, ...fields] = args;
  if (sceneId >= 0 && sceneId !== scene.id) throw new RangeError(`ModifyEvent cannot modify another scene: ${sceneId}`);
  const slot = requestedSlot < 0 ? currentEventIndex : requestedSlot;
  const event = scene.events[slot];
  if (!event) throw new RangeError(`ModifyEvent event slot ${slot} is outside scene bounds`);

  const inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && x < scene.width && y >= 0 && y < scene.height;
  const grid = scene.layers.eventIndex;
  const hasSource = inBounds(event.x, event.y);
  if (grid.length !== scene.width * scene.height || !hasSource && (event.x !== -1 || event.y !== -1)) {
    throw new RangeError('ModifyEvent source tile is outside scene bounds');
  }
  const newX = fields[9] < -1 ? event.x : fields[9];
  const newY = fields[10] < -1 ? event.y : fields[10];
  const removed = newX < 0 || newY < 0;
  if (!removed && !inBounds(newX, newY)) throw new RangeError('ModifyEvent destination tile is outside scene bounds');

  for (const [index, field] of eventFields.entries()) {
    const value = fields[index];
    if (value >= -1) event[field] = (value << 16) >> 16;
  }
  // setPosition transfers the grid's old entry, which can differ from the event's Index field.
  const oldTile = event.x + event.y * scene.width;
  const gridIndex = hasSource ? grid[oldTile] : slot;
  if (hasSource) grid[oldTile] = -1;
  event.x = removed ? -1 : newX;
  event.y = removed ? -1 : newY;
  if (!removed) grid[newX + newY * scene.width] = gridIndex;
  return event;
}
