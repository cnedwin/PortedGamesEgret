import type { Engine, Scope, Stage, SharedFrameOptions2D } from '@egret/engine';
import type { BrowserFrameLoop } from './loop.js';
import type { PointerInput } from './pointer.js';
import type { KeyboardInput } from './keyboard.js';
import type { BrowserStatsPanel } from './BrowserStatsPanel.js';
export type BrowserGameBackend = 'webgpu' | 'webgl2';
export interface BrowserGameOptions {
    /** The canvas the game is drawn on. The page gives it its size on the screen. */
    readonly canvas: HTMLCanvasElement;
    /** The size of the stage, in the game's own units, whatever the size of the canvas on the page. */
    readonly width: number;
    readonly height: number;
    /** "auto", unless given: WebGPU where the browser gives an adapter, WebGL2 otherwise. */
    readonly backend?: 'auto' | BrowserGameBackend;
    /** Canvas pixels for each unit of the canvas's own width. The device's ratio unless given, and then never more than 2. */
    readonly pixelRatio?: number;
    /** What a frame is cleared to before the stage is drawn: 0x000000 and 1 unless given. */
    readonly clearColor?: number;
    readonly clearAlpha?: number;
    /** One step of the game, called before each frame with the seconds since the step before. */
    readonly update?: (deltaSeconds: number) => void;
    /** Told once of what stopped the game's loop. Without it the failure is thrown where the console shows it. */
    readonly onError?: (error: unknown) => void;
    /** Touch, mouse and pen on display objects, and the keyboard. Both are made unless false is given. */
    readonly pointer?: boolean;
    readonly keyboard?: boolean;
    /** A panel over the canvas with frames a second, what a frame holds and how busy the Host is. Not made unless true is given. */
    readonly stats?: boolean;
    /** The loop starts at once unless false is given; then `game.loop.start()` starts it. */
    readonly autoStart?: boolean;
}
export interface BrowserGame {
    readonly backend: BrowserGameBackend;
    readonly engine: Engine;
    /** The stage of the Engine: what is added to it is drawn. */
    readonly stage: Stage;
    /** A scope for what the game creates. It is disposed with the game. */
    readonly scope: Scope;
    /** The frame the loop draws: the stage's size and what it is cleared to. */
    readonly frame: SharedFrameOptions2D;
    readonly loop: BrowserFrameLoop;
    readonly pointer: PointerInput | undefined;
    readonly keyboard: KeyboardInput | undefined;
    readonly stats: BrowserStatsPanel | undefined;
    /** A place in the page, as a pointer event gives it in `clientX` and `clientY`, as a place on the stage. */
    toStage(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
    /** Stops the loop and ends the input, the scope, the Engine and its Host. */
    dispose(): Promise<void>;
}
/**
 * Makes a game ready to draw: `await createBrowserGame({ canvas, width, height, update })`, then add display objects
 * to `game.stage`. Everything it makes is what the separate entries make; a game that outgrows it takes them apart.
 */
export declare function createBrowserGame(options: BrowserGameOptions): Promise<BrowserGame>;
//# sourceMappingURL=BrowserGame.d.ts.map