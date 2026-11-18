import type { BrowserGame, BrowserGameBackend } from '../game.js';
export interface World3DOverlayOptions {
    /** The stage size, in the interface's own units. */
    readonly width: number;
    readonly height: number;
    /** The 2D backend; WebGL2 by default, so the 3D renderer keeps WebGPU for itself where it uses it. */
    readonly backend?: 'auto' | BrowserGameBackend;
    /** Canvas pixels per unit of the canvas width; the device's ratio, at most 2, by default. */
    readonly pixelRatio?: number;
    /** One step of the interface, called before each 2D frame. */
    readonly update?: (deltaSeconds: number) => void;
    readonly onError?: (error: unknown) => void;
    /** Send presses on empty parts of the interface to the 3D canvas. On by default. */
    readonly passThrough?: boolean;
}
export interface World3DOverlay {
    /** The 2D game on the overlay: its stage, scope, pointer, keyboard, loop and textures. */
    readonly game: BrowserGame;
    readonly canvas: HTMLCanvasElement;
    /** Ends the 2D game and takes the overlay canvas away. The 3D canvas is left as it was. */
    dispose(): Promise<void>;
}
/**
 * Lays a transparent 2D stage over `canvas` (the 3D canvas, which must sit in a positioned parent) and starts it.
 * Give interface nodes hit areas as usual; presses elsewhere fall through to the 3D canvas.
 */
export declare function createWorld3DOverlay(canvas: HTMLCanvasElement, options: World3DOverlayOptions): Promise<World3DOverlay>;
//# sourceMappingURL=overlay3D.d.ts.map