import { Sprite } from '@egret/engine';
import type { DisplayObject, Engine, Graphics, Motion, Scope } from '@egret/engine';
import type { Random } from '@egret/engine/kit';
import type { BrowserGame, BrowserGameBackend } from './game.js';
import type { SfxRecipe } from './playSfx.js';
export interface PlayOptions {
    /** The size of the stage, in the game's own units: whole numbers above 0. The canvas is scaled to fit. */
    readonly width: number;
    readonly height: number;
    /** What a frame is cleared to. Black unless given. */
    readonly background?: number;
    /** Clears a frame to nothing, so that what the page has under the canvas shows through. `background` is then not drawn. */
    readonly transparent?: boolean;
    /** Where the canvas goes. Without it the game fills the window. */
    readonly parent?: HTMLElement;
    /** A canvas of the page to draw on, as it is placed there. Without it one is made and fitted. */
    readonly canvas?: HTMLCanvasElement;
    /** Builds the game. Updates begin when it has returned, or when the promise it returns has resolved. */
    readonly setup?: (game: PlayGame) => void | Promise<void>;
    /** One step of the game, with the seconds since the step before. */
    readonly update?: (seconds: number, game: PlayGame) => void;
    /** Told of what stopped the game. Without it the failure is thrown where the console shows it. */
    readonly onError?: (error: unknown) => void;
    /** The seed of `game.random`. A different one each time unless given. */
    readonly seed?: number | string;
    /** `'auto'` unless given. */
    readonly backend?: 'auto' | BrowserGameBackend;
    /** Under what name `game.save` keeps its values in the page's storage. The page's path unless given. */
    readonly saveKey?: string;
}
export interface PlayTextOptions {
    readonly x?: number;
    readonly y?: number;
    /** The height of the letters, in stage units. 24 unless given. */
    readonly size?: number;
    /** White unless given. */
    readonly color?: number;
    /** Which part of the words `x` is: their left end (the default), their middle or their right end. */
    readonly align?: 'left' | 'center' | 'right';
    readonly bold?: boolean;
    /**
     * Where the text goes. `'ui'` (the default) stays put over the game; `'world'` moves with `game.view` and the
     * shake; a sprite makes the text its child, so the two move, turn, fade and go together, and `x` and `y` are
     * then measured from the sprite's own origin.
     */
    readonly layer?: 'ui' | 'world' | Sprite;
    /** Which part of the words `y` is: their top (the default) or their middle. */
    readonly baseline?: 'top' | 'middle';
    /** The language of the words, as `'zh'` or `'en'`. Chosen from the words unless given. */
    readonly locale?: string;
}
/** A line of text: a sprite to place, fade, tween and remove like any other, with words that can be changed. */
export declare class PlayText extends Sprite {
    #private;
    constructor(text: string, changed: (text: string) => void, color?: number, size?: number, styled?: (style: {
        readonly color?: number;
        readonly size?: number;
    }) => void);
    get text(): string;
    set text(value: string | number);
    /** The colour of the words, `0xRRGGBB`. What is not a colour is not taken. */
    get color(): number;
    set color(value: number);
    /** The size of the words. What is not a size above 0 is not taken. */
    get size(): number;
    set size(value: number);
}
export interface PlayKeys {
    /** Whether any of the keys is held. A key is `'left'`, `'right'`, `'up'`, `'down'`, `'space'`, `'enter'`, `'escape'`, `'shift'`, a letter, a digit, or a `KeyboardEvent.code`. */
    down(...keys: string[]): boolean;
    /** Whether any of the keys went down since the last update. */
    pressed(...keys: string[]): boolean;
    /** Whether any of the keys came up since the last update. */
    released(...keys: string[]): boolean;
    /**
     * The arrows and WASD as a direction: x and y from -1 to 1, y down, of length 1 at most. The left stick of a
     * gamepad counts as well, as far as it is pushed.
     */
    axis(): {
        x: number;
        y: number;
    };
    /** The right stick of a gamepad, for looking or aiming: x and y from -1 to 1, y down; 0 and 0 without one. */
    look(): {
        x: number;
        y: number;
    };
}
export interface PlayPointer {
    /** Where the mouse, pen or finger is, on the stage. It follows the mouse whether or not a button is held. */
    readonly x: number;
    readonly y: number;
    /** Whether a button or a finger is down. */
    readonly down: boolean;
    /** Whether it went down, or came up, since the last update. */
    readonly pressed: boolean;
    readonly released: boolean;
    /** The way of a swipe that ended since the last update. */
    readonly swipe: 'left' | 'right' | 'up' | 'down' | undefined;
    /** Whether the pointer is over what a sprite draws, taken as an upright box. */
    over(node: DisplayObject): boolean;
    /**
     * How far the mouse moved since the last update, in pixels of the screen: for looking about with the mouse. It
     * goes on counting at the edge of the screen while the pointer is locked.
     */
    readonly dx: number;
    readonly dy: number;
    /**
     * Hides the cursor and keeps the mouse to the game, for looking about. A browser allows it only after a click, so
     * call it from a tap or from an update where `pressed` is true; Escape gives the mouse back.
     */
    lock(): void;
    /** Gives the mouse back. */
    unlock(): void;
    /** Whether the pointer is locked to the game. */
    readonly locked: boolean;
    /** The turn of the mouse wheel since the last update: above 0 towards the user. */
    readonly wheel: number;
}
/** A tween of `game.tween`: a motion that can be waited for. */
export type PlayMotion<T extends object> = Motion<T> & {
    /** Resolves when the motion has finished or been stopped: `await game.tween(s).to({ x: 9 }, 0.2).done`. */
    readonly done: Promise<void>;
};
export interface PlayButtonOptions {
    readonly x: number;
    readonly y: number;
    /** 160 by 44 unless given. */
    readonly width?: number;
    readonly height?: number;
    readonly color?: number;
    readonly textColor?: number;
    /** The height of the letters; 0.45 of the button's height unless given. */
    readonly size?: number;
    /** `game.ui` unless given. */
    readonly layer?: Sprite;
}
/** A button: a sprite whose middle is at (x, y), with its words in `label`. */
export type PlayButton = Sprite & {
    readonly label: PlayText;
};
/** A sound that goes on until it is stopped: music, an engine, the wind. Change it while it plays. */
export interface PlayLoop {
    /** 0 to 1. */
    volume: number;
    /** 1 as written, 2 an octave up, from 0.25 to 4: an engine's pitch follows its speed. */
    pitch: number;
    /** -1 the left side alone, 1 the right alone. */
    pan: number;
    /** Ends it, over `seconds` of fading, 0.1 unless given. Stopping it twice does nothing. */
    stop(seconds?: number): void;
    readonly stopped: boolean;
}
export interface PlaySfx {
    /** Plays an effect by name: one of `names`. `pitch` is 1 as written, 2 an octave up. */
    play(name: string, options?: {
        readonly volume?: number;
        readonly pitch?: number;
        readonly pan?: number;
    }): void;
    /**
     * Plays an effect again and again until it is stopped: `hum` and `wind` are made to be looped, and a list of tones
     * defined with `define` loops as a tune. `restart` and `dispose` stop every loop; a pause holds them.
     */
    loop(name: string, options?: {
        readonly volume?: number;
        readonly pitch?: number;
        readonly pan?: number;
        readonly fadeIn?: number;
    }): PlayLoop;
    /** Adds an effect, or replaces one. It can be played from the next update on. */
    define(name: string, recipe: SfxRecipe): void;
    /** The names that can be played. */
    readonly names: readonly string[];
    /** 0 to 1, for every effect. */
    volume: number;
    muted: boolean;
}
export interface PlayBurstOptions {
    readonly color?: number;
    /** How many pieces; 12 unless given. */
    readonly count?: number;
    /** How fast they fly, in units a second; 160 unless given. */
    readonly speed?: number;
    /** How long they last, in seconds; 0.5 unless given. */
    readonly life?: number;
    /** Their radius; 3 unless given. */
    readonly size?: number;
    /** How hard they fall, in units a second each second; 0 unless given. */
    readonly gravity?: number;
}
/**
 * The listener the Engine is given for a tap. A listener of the Engine runs to its end and returns nothing, and one
 * that returns a promise is refused, which ends pointer input; so what the game's function returns is not handed on.
 * When it is a promise, as an `async` function returns, its failure is told as the function's own would be.
 */
export declare function tapListener(callback: () => unknown, fail: (cause: unknown) => void): () => void;
export interface PlayGame {
    readonly width: number;
    readonly height: number;
    /** Seconds of play so far: it stands still while the game is paused or stopped by `hitStop`. */
    readonly time: number;
    /** The layer the game is drawn in. It moves with `view` and shakes. */
    readonly world: Sprite;
    /** A layer over the world that stays put: scores, buttons, messages. */
    readonly ui: Sprite;
    /** Which part of the world is seen: the world's point (`view.x`, `view.y`) is drawn at the stage's corner. */
    readonly view: {
        x: number;
        y: number;
    };
    readonly keys: PlayKeys;
    readonly pointer: PlayPointer;
    readonly sfx: PlaySfx;
    /** Random numbers that repeat for the same `seed`: `int(1, 6)`, `range(0, 1)`, `chance(0.25)`, `pick(list)`. */
    readonly random: Random;
    /** 1 as played; 0.5 is slow motion. */
    timeScale: number;
    /** A new sprite in the world (or in `layer`), with what `draw` draws in it. */
    sprite(draw?: (graphics: Graphics) => void, layer?: Sprite): Sprite;
    /** A filled rectangle whose middle is at (x, y), in the world or in `layer`. */
    rect(x: number, y: number, width: number, height: number, color: number, layer?: Sprite): Sprite;
    /** A filled circle whose middle is at (x, y), in the world or in `layer`. */
    circle(x: number, y: number, radius: number, color: number, layer?: Sprite): Sprite;
    /** A button with words on it, in the `ui` layer. `onTap` is called when it is tapped or clicked. */
    button(words: string, options: PlayButtonOptions, onTap: () => void): PlayButton;
    /** Puts a sprite in front of the others of its layer. Sprites are otherwise drawn in the order they were made. */
    toFront(node: DisplayObject): void;
    /** A line of text. It appears a moment after it is made; nothing has to wait for it. */
    text(text: string | number, options?: PlayTextOptions): PlayText;
    /** Takes a sprite off the stage and ends it. */
    remove(node: DisplayObject): void;
    /** Calls a function when the sprite is tapped or clicked. */
    onTap(node: DisplayObject, callback: () => void): void;
    /** Whether what two sprites draw overlaps, taken as upright boxes. `shrink` takes that much off every side of both. */
    overlaps(a: DisplayObject, b: DisplayObject, shrink?: number): boolean;
    /** The first of the sprites that overlaps `a`, or undefined. */
    hits<T extends DisplayObject>(a: DisplayObject, others: readonly T[], shrink?: number): T | undefined;
    /** Every one of the sprites that overlaps `a`. */
    hitsAll<T extends DisplayObject>(a: DisplayObject, others: readonly T[], shrink?: number): T[];
    /**
     * How far to move `a` so that it no longer overlaps `b`, by the shorter way out: `{ x, y }`, one of them 0, or
     * undefined when they do not overlap. A `y` below 0 means `a` was pushed up, onto `b`.
     */
    pushOut(a: DisplayObject, b: DisplayObject): {
        x: number;
        y: number;
    } | undefined;
    /** Whether the middles of what two sprites draw are within `distance` of each other: a test of circles. */
    near(a: DisplayObject, b: DisplayObject, distance: number): boolean;
    /** Moves numbers of an object over time: `game.tween(s).to({ x: 100, alpha: 0 }, 0.3, 'quadOut')`. It starts by itself. */
    tween<T extends object>(target: T): PlayMotion<T>;
    /** Calls a function once, after seconds of play. The function returned calls it off. */
    after(seconds: number, callback: () => void): () => void;
    /** A promise that resolves after seconds of play: `await game.wait(0.3)`. */
    wait(seconds: number): Promise<void>;
    /** Calls a function again and again, seconds of play apart. The function returned ends it. */
    every(seconds: number, callback: () => void): () => void;
    /** Shakes the world by up to `amount` units for `seconds`. */
    shake(amount?: number, seconds?: number): void;
    /** Covers the stage with a colour that fades away over `seconds`. */
    flash(color?: number, seconds?: number): void;
    /** Stops play for a moment, as a hard hit does: no updates and no timers for `seconds`. */
    hitStop(seconds?: number): void;
    /** Throws pieces out from a point of the world. */
    burst(x: number, y: number, options?: PlayBurstOptions): void;
    /** Keeps a value in the page's storage, as JSON, and reads one back. */
    save(key: string, value: unknown): void;
    load<T>(key: string, fallback: T): T;
    /** Stops updates and timers; `update` is not called while paused. The keys and the pointer can still be asked from a tap or a timer of the page. */
    pause(): void;
    resume(): void;
    readonly paused: boolean;
    /**
     * Starts the game again: everything in the world and the `ui` layer is removed, timers and tweens are called
     * off, and `setup` runs again. Updates begin when it has finished.
     */
    restart(): Promise<void>;
    /** The game `play` is built on: its Engine, scope, loop and input, for what this entry does not cover. */
    readonly browser: BrowserGame;
    readonly engine: Engine;
    readonly scope: Scope;
    readonly canvas: HTMLCanvasElement;
    /** Ends the game and takes away the canvas `play` made. */
    dispose(): Promise<void>;
}
/** Starts a game in the page. See the guide `play.md`. */
export declare function play(options: PlayOptions): Promise<PlayGame>;
//# sourceMappingURL=BrowserPlay.d.ts.map