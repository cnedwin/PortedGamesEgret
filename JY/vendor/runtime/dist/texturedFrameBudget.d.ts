import type { TexturedGeometry2D } from '@egret/contracts';
/** Hidden-inclusive authoring admission is independent of emitted frame tables. */
export declare class TexturedCaptureBudget {
    private nodes;
    private units;
    private triangles;
    private geometryBytes;
    private commands;
    private clipReferences;
    private readonly geometries;
    admitNode(): void;
    admitAuthoringUnits(count: number): void;
    admitSourceTriangles(count: number): void;
    admitGeometry(geometry: TexturedGeometry2D): void;
    admitEmission(clipCount: number): void;
}
//# sourceMappingURL=texturedFrameBudget.d.ts.map