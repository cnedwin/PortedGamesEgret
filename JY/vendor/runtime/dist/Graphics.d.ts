import type { DisplayObject } from "./DisplayObject.js";
/** Drawing state belongs to one node; every primitive snapshots its fill. */
export declare class Graphics {
    private readonly owner;
    private fill;
    constructor(owner: DisplayObject);
    beginFill(value: number, alpha?: number): this;
    drawRect(x: number, y: number, width: number, height: number): this;
    endFill(): this;
    clear(): void;
}
//# sourceMappingURL=Graphics.d.ts.map