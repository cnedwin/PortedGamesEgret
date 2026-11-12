import { isTexturedGeometry2D } from '@egret/contracts';
import { EgretError } from './EgretError.js';
function debit(used, count, limit) {
    // Subtraction admission precedes addition, allocation and indexed work.
    if (!Number.isSafeInteger(count) || count < 0 || count > limit - used) {
        throw new EgretError('FRAME_BUDGET_EXCEEDED');
    }
    return used + count;
}
/** Hidden-inclusive authoring admission is independent of emitted frame tables. */
export class TexturedCaptureBudget {
    nodes = 0;
    units = 0;
    triangles = 0;
    geometryBytes = 0;
    commands = 0;
    clipReferences = 0;
    geometries = new Set();
    admitNode() { this.nodes = debit(this.nodes, 1, 65536); }
    admitAuthoringUnits(count) { this.units = debit(this.units, count, 65536); }
    admitSourceTriangles(count) { this.triangles = debit(this.triangles, count, 65536); }
    admitGeometry(geometry) {
        if (!isTexturedGeometry2D(geometry))
            throw new EgretError('MESH_GEOMETRY_INVALID');
        if (this.geometries.has(geometry))
            return;
        debit(this.geometries.size, 1, 128);
        this.geometryBytes = debit(this.geometryBytes, geometry.logicalByteLength, 16777216);
        this.geometries.add(geometry);
    }
    admitEmission(clipCount) {
        const commands = debit(this.commands, 1, 65536);
        const clips = debit(this.clipReferences, clipCount, 262144);
        this.commands = commands;
        this.clipReferences = clips;
    }
}
//# sourceMappingURL=texturedFrameBudget.js.map