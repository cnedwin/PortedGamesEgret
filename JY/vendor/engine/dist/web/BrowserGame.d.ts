import type { AssetLease, DisplayObject, DiagnosticHandler, Engine, Scope, Stage, SharedFrameOptions2D, Texture } from '@egret/engine';
import type { TextField } from '@egret/engine/text';
import type { BrowserFrameLoop } from './loop.js';
import type { PointerInput } from './pointer.js';
import type { KeyboardInput } from './keyboard.js';
import type { createBrowserHoverInput } from './hover.js';
/** The hover and wheel input of the page, as `createBrowserHoverInput` of `@egret/engine/web/hover` makes it. */
type BrowserGameHoverInput = ReturnType<typeof createBrowserHoverInput>;
import type { BrowserStatsPanel } from './BrowserStatsPanel.js';
/** Which GPU interface a browser game draws with. */
export type BrowserGameBackend = 'webgpu' | 'webgl2';
/** How the canvas fills the element it is in: not at all, whole inside it, covering it, or stretched to it. */
export type BrowserGameFit = 'none' | 'contain' | 'cover' | 'stretch';
/** A text label to make: its text, font, size and weight, line height, color, locale and direction. */
export interface BrowserGameLabelOptions {
    readonly text?: string;
    /** A font the page has: a family of the system, or one the page loaded. "sans-serif" unless given. */
    readonly fontFamily?: string;
    /** In stage units: 24 unless given. */
    readonly fontSize?: number;
    readonly fontWeight?: number;
    readonly italic?: boolean;
    /** In stage units: a quarter more than the font size unless given. */
    readonly lineHeight?: number;
    /** 0xffffff unless given. */
    readonly color?: number;
    /** The language of the text, such as "zh" or "en": "en" unless given. */
    readonly locale?: string;
    readonly direction?: 'ltr' | 'rtl';
}
/** A label to make: its words and style, and the scope that owns it. */
export interface BrowserGameLabelCreateOptions extends BrowserGameLabelOptions {
    /**
     * The scope that owns the label's display object. Defaults to `game.scope`. Give the `context.scope` of a UI leaf to
     * use the label as that leaf's content; the label then ends with that scope.
     */
    readonly scope?: Scope;
}
/** A line of text on the stage whose words can be set like a value. */
export interface BrowserGameLabel {
    /** The text on the stage: place it with `display.x` and `display.y`, add it where it belongs. */
    readonly display: TextField;
    /** Setting it draws the new words when they are ready; until then the old ones stay. */
    text: string;
    /** Settles when the words last set are on the stage, and rejects if they could not be drawn. */
    readonly ready: Promise<void>;
    /** Changes any of the options; what is left out stays. */
    set(options: BrowserGameLabelOptions): void;
    dispose(): void;
}
/** A browser game to make: its canvas and size, its backend and colors, its update, its input and stats, and how it fits the page. */
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
    /**
     * Where translucent draws mix with what is under them: "linear" light unless given, or the stored "srgb"
     * codes, as a 2D canvas and Egret 5 mix them, so a faint white over a dark ground stays faint.
     */
    readonly blendSpace?: 'linear' | 'srgb';
    /**
     * Whether render effects are drawn: blurs, colour matrices, glows, outlines, and masks of images or of shapes.
     * Off unless given; a frame with an effect is refused without it.
     */
    readonly effects?: boolean;
    /** One step of the game, called before each frame with the seconds since the step before. */
    readonly update?: (deltaSeconds: number) => void;
    /** Told once of what stopped the game's loop. Without it the failure is thrown where the console shows it. */
    readonly onError?: (error: unknown) => void;
    /** Touch, mouse and pen on display objects, and the keyboard. Both are made unless false is given. */
    readonly pointer?: boolean;
    readonly keyboard?: boolean;
    /**
     * Hover and the mouse wheel over display objects, as `createBrowserHoverInput` makes them: what a scroll control's
     * `wheel` and a button's hover look need. Made only when true is given; its module is loaded only then.
     */
    readonly hover?: boolean;
    /** A panel over the canvas with frames a second, what a frame holds and how busy the Host is. Not made unless true is given. */
    readonly stats?: boolean;
    /** "none" unless given. The canvas is sized inside `fitTo`, or its parent element, and again whenever that changes size. */
    readonly fit?: BrowserGameFit;
    readonly fitTo?: HTMLElement;
    /** The loop starts at once unless false is given; then `game.loop.start()` starts it. */
    readonly autoStart?: boolean;
}
/** A game in a canvas: its Engine, host and stage, its frame loop and input, and calls that load textures and make labels. */
export interface BrowserGame {
    readonly backend: BrowserGameBackend;
    readonly engine: Engine;
    /** The Host that draws: its status says what it holds and what last went wrong. It ends with the game. */
    readonly host: {
        getStatus(): {
            readonly pendingFrames: number;
        };
        whenIdle(): Promise<void>;
    };
    /** The stage of the Engine: what is added to it is drawn. */
    readonly stage: Stage;
    /** A scope for what the game creates. It is disposed with the game. */
    readonly scope: Scope;
    /** The frame the loop draws: the stage's size and what it is cleared to. */
    readonly frame: SharedFrameOptions2D;
    readonly loop: BrowserFrameLoop;
    readonly pointer: PointerInput | undefined;
    readonly keyboard: KeyboardInput | undefined;
    /** The hover and wheel input, when `hover: true` was given. */
    readonly hover: BrowserGameHoverInput | undefined;
    readonly stats: BrowserStatsPanel | undefined;
    /**
     * Loads a PNG image from an address and gives the lease of its texture, for `new Bitmap(lease)` or
     * `graphics.beginBitmapFill(lease)`. The lease belongs to the game's scope. The same address loaded twice is one texture.
     */
    loadTexture(url: string): Promise<AssetLease<Texture>>;
    /**
     * The lease of a texture of pixels painted in code: `width` × `height` pixels of 4 bytes each, red, green, blue and
     * alpha, rows from the top, alpha not multiplied in (as `ImageData` holds them). The bytes are copied, so the array can
     * be changed after. At most 4,096 pixels on an edge and 4,194,304 in all. The lease belongs to the game's scope; each
     * call is a texture of its own, ended with its lease.
     */
    textureFromPixels(width: number, height: number, pixels: Uint8Array | Uint8ClampedArray): Promise<AssetLease<Texture>>;
    /**
     * The lease of a texture of what a canvas holds now, as `textureFromPixels` of its pixels. A canvas with a 2D context,
     * or none yet, is read with that context; one drawn by WebGL or WebGPU is copied through a 2D canvas first. To scale
     * down a larger picture, or read an image or bitmap, `textureFromCanvas` of `@egret/engine/web/kit` gives a texture.
     */
    textureFromCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<AssetLease<Texture>>;
    /** A line of text for the stage. The first call loads the page's text rasterizer. */
    createLabel(options?: BrowserGameLabelCreateOptions): Promise<BrowserGameLabel>;
    /**
     * Stage units in one CSS pixel as the canvas is shown now, the larger of across and down: `44 * game.unitsPerCssPixel`
     * is a touch target a finger can hit. 1 before the canvas is laid out.
     */
    readonly unitsPerCssPixel: number;
    /**
     * Gives a display object a hit area at least `cssPixels` (44 unless given) square as the canvas is shown now, centred
     * on what it draws and never smaller than it, so a small icon is as easy to press as a finger needs. Call it again
     * after the node, its ancestors or the canvas change transform or size. Returns the area, in the node's own units.
     */
    padHitArea(node: DisplayObject, cssPixels?: number): {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
    };
    /** A place in the page, as a pointer event gives it in `clientX` and `clientY`, as a place on the stage. */
    toStage(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
    /** Stops the loop and ends the input, the scope, the Engine and its Host. */
    dispose(): Promise<void>;
}
/**
 * What a game does with the diagnostics of its Engine. An error the Engine can only report, such as a listener of
 * pointer input that threw, which ends that input, is told as a failure of the loop is: to `onError`, or to the page,
 * where the console shows it. Without this it was told to no one, and the game went on without its input.
 */
export declare function gameDiagnostics(onError: ((error: unknown) => void) | undefined): DiagnosticHandler;
/**
 * Makes a game ready to draw: `await createBrowserGame({ canvas, width, height, update })`, then add display objects
 * to `game.stage`. Everything it makes is what the separate entries make; a game that outgrows it takes them apart.
 */
export declare function createBrowserGame(options: BrowserGameOptions): Promise<BrowserGame>;
export {};
//# sourceMappingURL=BrowserGame.d.ts.map