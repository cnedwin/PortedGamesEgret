import { coordinate, GeometryPreparationError, prepareRectangles2D, clearClipRectangleContext2D } from './prepareRectangles2D.js';
import { prepareImage2D } from './prepareImages2D.js';
import { prepareTexturedMesh2D } from './prepareTexturedMesh2D.js';
import { TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
const ledgerPrototype = TexturedPreparationBudget2D.prototype;
const admitPredicate = ledgerPrototype.admitPredicate, admitVertices = ledgerPrototype.admitPreparedVertices;
const admitSource = ledgerPrototype.admitSourceTriangles, replayStage = ledgerPrototype.tryReplayStageCost;
const admitTuple = ledgerPrototype.admitTupleComparison;
function firstPartyLedger(budget) {
    // The Host constructs this exact ledger. Default/custom direct invocations
    // must not lose predicate callbacks through an optional aggregate replay.
    try {
        return Object.getPrototypeOf(budget) === ledgerPrototype && budget.admitPredicate === admitPredicate
            && budget.admitPreparedVertices === admitVertices && budget.admitSourceTriangles === admitSource
            && budget.admitTupleComparison === admitTuple && budget.tryReplayStageCost === replayStage;
    }
    catch {
        return false;
    }
}
/** Private scratch factory; no registration, public export, retained frame or authority token. */
export function createClipRectangleContext2D(options, budget) {
    if (!firstPartyLedger(budget))
        return undefined;
    try {
        return { options, budget, active: true, entries: new Map() };
    }
    catch {
        return undefined;
    } // Optional metadata allocation cannot reject valid geometry.
}
/** Preserve painter barriers and share one frame ledger across all three preparation paths. */
export function prepareTexturedDraws2D(admitted, options, budget, cache, containedClipping = false) {
    coordinate(options.pixelRatio);
    const trustedClipping = containedClipping && firstPartyLedger(budget);
    // The ordinary Host owns both the immutable input and its preparation cache.
    if (trustedClipping && cache)
        cache.cache.enableRecurringTexturedKeys(cache);
    const clipContext = trustedClipping ? createClipRectangleContext2D(options, budget) : undefined;
    try {
        const { frame, width, height } = admitted, draws = [];
        let rectangles = [], sourceCommandIndices = [];
        const flush = () => {
            if (rectangles.length === 0)
                return;
            // No frame spread: rectangle preparation has no image or geometry payload authority.
            const commandIndices = [];
            const cacheSlot = cache?.cache.slot(cache, rectangles, width, height, undefined, undefined, true, sourceCommandIndices[0]);
            const prepared = prepareRectangles2D({ frameId: frame.frameId, width: frame.width, height: frame.height,
                clearColor: frame.clearColor, clearAlpha: frame.clearAlpha, commands: rectangles }, width, height, options, budget, commandIndices, cache, sourceCommandIndices, trustedClipping, clipContext);
            draws.push({ kind: 'rect', prepared, commandIndices: commandIndices.map(index => sourceCommandIndices[index]), ...(cacheSlot ? { cacheSlot } : {}) });
            rectangles = [];
            sourceCommandIndices = [];
        };
        for (const record of admitted.commands) {
            const command = record.command;
            if (command.kind === 'rect') {
                rectangles.push(command);
                sourceCommandIndices.push(record.commandIndex);
                continue;
            }
            flush();
            const cacheSlot = cache?.cache.slot(cache, [command], width, height, record.image, record.geometry, false, record.commandIndex);
            if (command.kind === 'image') {
                const prepared = prepareImage2D(command, width, height, options, budget, cacheSlot, trustedClipping, clipContext);
                draws.push({ kind: 'image', prepared, commandIndex: record.commandIndex, ...(cacheSlot ? { cacheSlot } : {}) });
            }
            else {
                if (record.geometry === undefined)
                    throw new GeometryPreparationError('precision');
                const prepared = prepareTexturedMesh2D(command, record.geometry, width, height, options, budget, cacheSlot, trustedClipping, clipContext);
                draws.push({ kind: 'mesh', prepared, commandIndex: record.commandIndex, ...(cacheSlot ? { cacheSlot } : {}) });
            }
            // Empty image/mesh rows remain barriers; fan/source debits are never repeated here.
        }
        flush();
        return draws;
    }
    finally {
        clearClipRectangleContext2D(clipContext);
    }
}
//# sourceMappingURL=prepareTexturedDraws2D.js.map