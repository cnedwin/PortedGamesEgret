import { Sprite } from '@egret/engine';
import type { PlayGame } from './BrowserPlay.js';
/** A touch stick to show: where, how large, and whether it shows without touch. */
export interface PlayStickOptions {
    /** The middle of the stick. Near the bottom left of the stage unless given. */
    readonly x?: number;
    readonly y?: number;
    /** How far the knob moves; 48 unless given. */
    readonly radius?: number;
    /** Shown before any finger has touched the stage. */
    readonly always?: boolean;
}
/** A touch button to show: where, the key it presses, how large, its color, and whether it shows without touch. */
export interface PlayTouchButtonOptions {
    readonly x: number;
    readonly y: number;
    /** The key it holds while a finger is on it: `'space'` unless given. Any name `keys.down` takes. */
    readonly key?: string;
    readonly radius?: number;
    readonly color?: number;
    readonly always?: boolean;
}
/** What the controls tell the game: keys held and let go, and where the stick is. */
export interface PlayTouchPort {
    hold(key: string): void;
    letGo(key: string): void;
    stick(x: number, y: number): void;
    /** A stage place for a place of the page. */
    toStage(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
    /** The layer the controls are drawn on: over the ui, so a box of words does not hide them. */
    readonly layer: Sprite;
}
/** The controls of one game. `claim` is asked first for each press: a press it takes is not the game's pointer. */
export declare function createPlayTouch(game: PlayGame, port: PlayTouchPort): {
    stick(options?: PlayStickOptions): Sprite;
    button(words: string, options: PlayTouchButtonOptions): Sprite;
    claim(event: PointerEvent): boolean;
    move(event: PointerEvent): void;
    end(event: PointerEvent): boolean;
    reset(): void;
};
//# sourceMappingURL=playTouch.d.ts.map