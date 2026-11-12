import { prepareRectangles2D, coordinate } from './prepareRectangles2D.js';
import { prepareImage2D } from './prepareImages2D.js';
/** Consume a trusted copied frame; runs preserve painter order and share preparation caps. */
export function prepareMixedDraws2D(frame, width, height, options, cache) {
    // Clear-only frames retain the rectangle preparer's unconditional nominal-DPR envelope.
    coordinate(options.pixelRatio);
    const draws = [];
    let rectangles = [], sourceCommandIndices = [];
    let remainingVertices = Math.min(options.maxPreparedVertices, 4294967295);
    let remainingEdgeTests = options.maxClipEdgeTests;
    const remaining = () => ({ pixelRatio: options.pixelRatio, maxPreparedVertices: remainingVertices, maxClipEdgeTests: remainingEdgeTests });
    const debit = (vertices, edgeTests) => {
        // Existing preparers admit bounded fan vertices and determinant calls, not packed bytes.
        // Float32 fan collapse happens later and never refunds these whole-frame charges.
        remainingVertices -= vertices;
        remainingEdgeTests -= edgeTests;
    };
    const flushRectangles = () => {
        if (!rectangles.length)
            return;
        // Do not spread the frame: rectangle preparation has no image-table read authority.
        const commandIndices = [];
        const cacheSlot = cache?.cache.slot(cache, rectangles, width, height, undefined, undefined, true, sourceCommandIndices[0]);
        const prepared = prepareRectangles2D({ frameId: frame.frameId, width: frame.width, height: frame.height, clearColor: frame.clearColor, clearAlpha: frame.clearAlpha, commands: rectangles }, width, height, remaining(), undefined, commandIndices, cache, sourceCommandIndices);
        let vertices = 0;
        for (const command of prepared.commands)
            vertices += (command.pointIndices.length - 2) * 3;
        debit(vertices, prepared.edgeTests);
        draws.push({ kind: 'rect', prepared, commandIndices: commandIndices.map(index => sourceCommandIndices[index]), ...(cacheSlot ? { cacheSlot } : {}) });
        rectangles = [];
        sourceCommandIndices = [];
    };
    for (let commandIndex = 0; commandIndex < frame.commands.length; commandIndex++) {
        const command = frame.commands[commandIndex];
        if (command.kind === 'rect') {
            rectangles.push(command);
            sourceCommandIndices.push(commandIndex);
        }
        else {
            flushRectangles();
            const cacheSlot = cache?.cache.slot(cache, [command], width, height, frame.images?.[command.imageIndex], undefined, false, commandIndex);
            const prepared = prepareImage2D(command, width, height, remaining(), undefined, cacheSlot);
            debit(prepared.pointIndices.length ? (prepared.pointIndices.length - 2) * 3 : 0, prepared.edgeTests);
            // Empty images still separate runs and retain their original projection association.
            // The existing attributed geometry keeps full position/UV tuples attached.
            draws.push({ kind: 'image', prepared, commandIndex, ...(cacheSlot ? { cacheSlot } : {}) });
        }
    }
    flushRectangles();
    return draws;
}
//# sourceMappingURL=prepareMixedDraws2D.js.map