const MAX_ENTRIES = 65536, MAX_BYTES = 16777216;
// Limits cover ready and pending derived entries. Empty weak-index cells do not
// keep nodes alive, and these logical fees do not claim a physical heap limit.
// The replacement marker adds one explicit eight-byte slot to bookkeeping.
// A no-payload probe retains only bookkeeping and the existing scalar key.
const PROBE_BYTES = 264 + 32 + 14 * 8;
const INITIAL_BYTES = PROBE_BYTES + 32 + 9 * 8 + 24;
const owners = new WeakMap(), nodes = new WeakMap();
const readOwner = owners.get.bind(owners), writeOwner = owners.set.bind(owners);
const readSlots = nodes.get.bind(nodes), writeSlots = nodes.set.bind(nodes);
const SAME = Object.is, FREEZE = Object.freeze, Seen = Set;
const seenHas = Set.prototype.has.call.bind(Set.prototype.has);
const seenAdd = Set.prototype.add.call.bind(Set.prototype.add);
const appendRect = Array.prototype.push.call.bind(Array.prototype.push);
function unlinkPending(entry) {
    const session = entry.session;
    if (session === undefined)
        return;
    if (entry.pendingPrevious === undefined)
        session.head = entry.pendingNext;
    else
        entry.pendingPrevious.pendingNext = entry.pendingNext;
    if (entry.pendingNext === undefined)
        session.tail = entry.pendingPrevious;
    else
        entry.pendingNext.pendingPrevious = entry.pendingPrevious;
    entry.pendingPrevious = undefined;
    entry.pendingNext = undefined;
    entry.session = undefined;
}
function unlink(entry) {
    const owner = entry.owner;
    if (entry.previous === undefined)
        owner.head = entry.next;
    else
        entry.previous.next = entry.next;
    if (entry.next === undefined)
        owner.tail = entry.previous;
    else
        entry.next.previous = entry.previous;
    entry.previous = undefined;
    entry.next = undefined;
}
function discard(entry) {
    if (entry.linked) {
        unlink(entry);
        entry.owner.entries--;
        entry.owner.bytes -= entry.bytes;
        entry.linked = false;
    }
    unlinkPending(entry);
    if (entry.slots[entry.profile] === entry)
        entry.slots[entry.profile] = undefined;
    entry.key = undefined;
    entry.data = undefined;
    entry.seen = undefined;
    entry.ready = false;
    entry.complete = false;
    entry.replacedWithoutHit = false;
    entry.bytes = 0;
}
function newest(entry) {
    const owner = entry.owner;
    if (owner.tail === entry)
        return;
    unlink(entry);
    entry.previous = owner.tail;
    if (owner.tail === undefined)
        owner.head = entry;
    else
        owner.tail.next = entry;
    owner.tail = entry;
}
function room(owner, bytes, entries, keep) {
    if (owner.closed || bytes > MAX_BYTES || (keep !== undefined && bytes > MAX_BYTES - keep.bytes))
        return false;
    while (entries > MAX_ENTRIES - owner.entries || bytes > MAX_BYTES - owner.bytes) {
        const victim = owner.head === keep ? owner.head?.next : owner.head;
        if (victim === undefined)
            return false;
        discard(victim);
    }
    return true;
}
function add(entry, bytes) {
    // Reserve before the measurement set or payload retains another reference.
    if (!room(entry.owner, bytes, 0, entry))
        return false;
    entry.owner.bytes += bytes;
    entry.bytes += bytes;
    return true;
}
function record(entry, value, fields) {
    const seen = entry.seen;
    if (seenHas(seen, value))
        return true;
    if (!add(entry, 32 + fields * 8))
        return false;
    seenAdd(seen, value);
    return true;
}
function matrixBytes(entry, value) { return record(entry, value, 6); }
function rectBytes(entry, value) { return record(entry, value, 4); }
function clipBytes(entry, value) {
    return record(entry, value, 2) && matrixBytes(entry, value.matrix) && rectBytes(entry, value.rect);
}
function ordinaryBytes(entry, clips) {
    if (clips === undefined || seenHas(entry.seen, clips))
        return true;
    if (!add(entry, 24 + clips.length * 8))
        return false;
    seenAdd(entry.seen, clips);
    for (let i = 0; i < clips.length; i++)
        if (!clipBytes(entry, clips[i]))
            return false;
    return true;
}
function texturedBytes(entry, clips) {
    for (let cursor = clips; cursor !== undefined; cursor = cursor.previous) {
        if (seenHas(entry.seen, cursor))
            return true;
        if (!record(entry, cursor, 3) || !clipBytes(entry, cursor.clip))
            return false;
    }
    return true;
}
function sameMatrix(left, right) {
    return left === right || SAME(left.a, right.a) && SAME(left.b, right.b) && SAME(left.c, right.c)
        && SAME(left.d, right.d) && SAME(left.tx, right.tx) && SAME(left.ty, right.ty);
}
function sameClip(left, right) {
    return left === right || sameMatrix(left.matrix, right.matrix)
        && SAME(left.rect.x, right.rect.x) && SAME(left.rect.y, right.rect.y)
        && SAME(left.rect.width, right.rect.width) && SAME(left.rect.height, right.rect.height);
}
function sameOrdinary(left, right) {
    if (left === right)
        return true;
    if (left === undefined || right === undefined || left.length !== right.length)
        return false;
    for (let i = 0; i < left.length; i++)
        if (!sameClip(left[i], right[i]))
            return false;
    return true;
}
function sameTextured(left, right) {
    if (left === right)
        return true;
    if (left?.depth !== right?.depth)
        return false;
    while (left !== undefined && right !== undefined) {
        if (left === right)
            return true;
        if (!sameClip(left.clip, right.clip))
            return false;
        left = left.previous;
        right = right.previous;
    }
    return left === right;
}
function sameRevision(key, state) {
    return key.structure === state.structureRevision && key.transform === state.transformRevision
        && key.appearance === state.appearanceRevision && key.content === state.contentRevision && key.binding === state.bindingRevision;
}
function sameContext(key, state, parent, alpha) {
    return sameRevision(key, state) && SAME(key.a, parent.a) && SAME(key.b, parent.b) && SAME(key.c, parent.c)
        && SAME(key.d, parent.d) && SAME(key.tx, parent.tx) && SAME(key.ty, parent.ty) && SAME(key.alpha, alpha);
}
function linkPending(entry, session) {
    entry.session = session;
    entry.pendingPrevious = session.tail;
    if (session.tail === undefined)
        session.head = entry;
    else
        session.tail.pendingNext = entry;
    session.tail = entry;
}
/** Only a successful scalar observation is retained; this state can never be a hit. */
function observeProbe(entry, session, state, parent, alpha) {
    const key = entry.key;
    unlinkPending(entry);
    entry.owner.bytes -= entry.bytes - PROBE_BYTES;
    entry.bytes = PROBE_BYTES;
    entry.data = undefined;
    entry.seen = undefined;
    entry.ready = false;
    entry.complete = false;
    key.ordinaryClips = undefined;
    key.texturedClips = undefined;
    key.structure = state.structureRevision;
    key.transform = state.transformRevision;
    key.appearance = state.appearanceRevision;
    key.content = state.contentRevision;
    key.binding = state.bindingRevision;
    key.a = parent.a;
    key.b = parent.b;
    key.c = parent.c;
    key.d = parent.d;
    key.tx = parent.tx;
    key.ty = parent.ty;
    key.alpha = alpha;
    newest(entry);
    linkPending(entry, session);
    return entry;
}
/** Optional metadata allocation cannot turn an otherwise valid capture into a refusal. */
export function beginCaptureSession(stage, profile) {
    try {
        let owner = readOwner(stage);
        if (owner === undefined) {
            owner = { closed: false, entries: 0, bytes: 0, head: undefined, tail: undefined };
            writeOwner(stage, owner);
        }
        if (owner.closed)
            return undefined;
        return { owner, profile, active: true, head: undefined, tail: undefined };
    }
    catch {
        return undefined;
    }
}
export function readCaptureDerived(session, node, state, parent, alpha, ordinaryClips, texturedClips) {
    if (session === undefined || !session.active || session.owner.closed)
        return undefined;
    const entry = readSlots(node)?.[session.profile], key = entry?.key;
    if (entry === undefined || key === undefined || !entry.ready || entry.owner !== session.owner || entry.data === undefined)
        return undefined;
    if (!sameContext(key, state, parent, alpha)
        || !sameOrdinary(key.ordinaryClips, ordinaryClips) || !sameTextured(key.texturedClips, texturedClips))
        return undefined;
    entry.replacedWithoutHit = false;
    newest(entry);
    return entry.data;
}
export function beginCaptureNode(session, node, state, parent, alpha, ordinaryClips, texturedClips) {
    if (session === undefined || !session.active || session.owner.closed)
        return undefined;
    let entry;
    let reserved = false;
    try {
        let slots = readSlots(node);
        if (slots === undefined) {
            slots = { ordinary: undefined, textured: undefined };
            writeSlots(node, slots);
        }
        const old = slots[session.profile];
        const replacement = old !== undefined && old.owner === session.owner && old.ready;
        if (replacement && old.key !== undefined
            && (old.data === undefined ? !sameContext(old.key, state, parent, alpha) : old.replacedWithoutHit)) {
            // Two consecutive replacements stop payload churn. A stable probe only
            // permits cold rebuilding below; it never bypasses complete-key matching.
            return observeProbe(old, session, state, parent, alpha);
        }
        const replacedWithoutHit = replacement && old.data !== undefined;
        if (old !== undefined)
            discard(old);
        if (!room(session.owner, INITIAL_BYTES, 1))
            return undefined;
        session.owner.bytes += INITIAL_BYTES;
        session.owner.entries++;
        reserved = true;
        const key = { structure: state.structureRevision, transform: state.transformRevision,
            appearance: state.appearanceRevision, content: state.contentRevision, binding: state.bindingRevision,
            a: parent.a, b: parent.b, c: parent.c, d: parent.d, tx: parent.tx, ty: parent.ty, alpha,
            ordinaryClips: undefined, texturedClips: undefined };
        const data = { matrix: undefined, ordinaryClips: undefined, texturedClips: undefined, commandClips: undefined,
            rectangles: [], bitmapMatrix: undefined, bitmapRect: undefined, textRect: undefined, meshChecked: false };
        entry = { owner: session.owner, slots, profile: session.profile, session: undefined, key, data,
            seen: new Seen(), bytes: INITIAL_BYTES, ready: false, complete: false, linked: false, replacedWithoutHit,
            previous: undefined, next: undefined, pendingPrevious: undefined, pendingNext: undefined };
        entry.linked = true;
        entry.previous = session.owner.tail;
        if (session.owner.tail === undefined)
            session.owner.head = entry;
        else
            session.owner.tail.next = entry;
        session.owner.tail = entry;
        seenAdd(entry.seen, key);
        seenAdd(entry.seen, data);
        seenAdd(entry.seen, data.rectangles);
        if (!ordinaryBytes(entry, ordinaryClips) || !texturedBytes(entry, texturedClips)) {
            discard(entry);
            return undefined;
        }
        key.ordinaryClips = ordinaryClips;
        key.texturedClips = texturedClips;
        slots[session.profile] = entry;
        linkPending(entry, session);
        return entry;
    }
    catch {
        if (entry !== undefined)
            discard(entry);
        else if (reserved) {
            session.owner.bytes -= INITIAL_BYTES;
            session.owner.entries--;
        }
        return undefined;
    }
}
// Each guarded block handles only optional cache ownership, never collector arithmetic,
// resource qualification, public output allocation or a capture-budget operation.
export function rememberCaptureBase(entry, matrix, ordinaryClips, texturedClips) {
    if (entry?.data === undefined)
        return;
    try {
        if (!matrixBytes(entry, matrix) || !ordinaryBytes(entry, ordinaryClips) || !texturedBytes(entry, texturedClips)) {
            discard(entry);
            return;
        }
        entry.data.matrix = matrix;
        entry.data.ordinaryClips = ordinaryClips;
        entry.data.texturedClips = texturedClips;
    }
    catch {
        discard(entry);
    }
}
export function rememberCaptureRectangle(entry, rect) {
    if (entry?.data === undefined)
        return;
    try {
        if (!rectBytes(entry, rect) || !add(entry, 8)) {
            discard(entry);
            return;
        }
        appendRect(entry.data.rectangles, rect);
    }
    catch {
        discard(entry);
    }
}
export function rememberCaptureClips(entry, clips) {
    if (entry?.data === undefined || entry.data.commandClips !== undefined)
        return;
    try {
        if (!ordinaryBytes(entry, clips)) {
            discard(entry);
            return;
        }
        entry.data.commandClips = clips;
    }
    catch {
        discard(entry);
    }
}
export function rememberCaptureBitmap(entry, matrix, rect) {
    if (entry?.data === undefined)
        return;
    try {
        if (!matrixBytes(entry, matrix) || !rectBytes(entry, rect)) {
            discard(entry);
            return;
        }
        entry.data.bitmapMatrix = matrix;
        entry.data.bitmapRect = rect;
    }
    catch {
        discard(entry);
    }
}
export function rememberCaptureText(entry, rect) {
    if (entry?.data === undefined)
        return;
    try {
        if (!rectBytes(entry, rect)) {
            discard(entry);
            return;
        }
        entry.data.textRect = rect;
    }
    catch {
        discard(entry);
    }
}
export function rememberCaptureMesh(entry) { if (entry?.data !== undefined)
    entry.data.meshChecked = true; }
export function completeCaptureNode(entry, state) {
    if (entry === undefined || entry.key === undefined)
        return;
    if (!sameRevision(entry.key, state)) {
        discard(entry);
        return;
    }
    // Collector arithmetic and resource checks still completed before this call.
    // Probe publication records only a successful observation, never derived data.
    if (entry.data === undefined) {
        entry.complete = true;
        return;
    }
    if (entry.data.matrix === undefined) {
        discard(entry);
        return;
    }
    try {
        FREEZE(entry.data.rectangles);
        FREEZE(entry.data);
        entry.seen = undefined;
        entry.complete = true;
    }
    catch {
        discard(entry);
    }
}
export function publishCaptureSession(session) {
    if (session === undefined || !session.active)
        return;
    while (session.head !== undefined) {
        const entry = session.head;
        if (entry.complete && !session.owner.closed) {
            unlinkPending(entry);
            entry.ready = true;
        }
        else
            discard(entry);
    }
    session.active = false;
}
export function abandonCaptureSession(session) {
    if (session === undefined || !session.active)
        return;
    while (session.head !== undefined)
        discard(session.head);
    session.active = false;
}
/** Mutation/terminal paths only release numeric derived values; no allocation or callback. */
export function invalidateCaptureNode(node) {
    const slots = readSlots(node);
    if (slots?.ordinary !== undefined)
        discard(slots.ordinary);
    if (slots?.textured !== undefined)
        discard(slots.textured);
}
export function clearCaptureStage(stage) {
    const owner = readOwner(stage);
    if (owner === undefined)
        return;
    owner.closed = true;
    while (owner.head !== undefined)
        discard(owner.head);
}
//# sourceMappingURL=frameCaptureCache.js.map