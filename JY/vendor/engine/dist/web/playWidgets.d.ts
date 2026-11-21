import { Sprite } from '@egret/engine';
import type { PlayGame } from './BrowserPlay.js';
/** A bar to show, as for health: where and how large, its value and maximum, its colors and layer. */
export interface PlayBarOptions {
    readonly x: number;
    readonly y: number;
    /** 120 by 12 unless given. `x` and `y` are its left and its top. */
    readonly width?: number;
    readonly height?: number;
    /** How full it is: `value` out of `max`. 1 of 1 unless given. */
    readonly value?: number;
    readonly max?: number;
    readonly color?: number;
    /** The colour of the empty part. */
    readonly back?: number;
    readonly layer?: Sprite;
}
/** A bar of health, time or power. Setting `value` slides it there; a fall leaves a pale trail that catches up. */
export declare class PlayBar extends Sprite {
    #private;
    constructor(width: number, height: number, value: number, max: number, color: number, back: number);
    get value(): number;
    set value(next: number);
    get max(): number;
    set max(next: number);
    get color(): number;
    set color(next: number);
    /** Moves what is shown towards the value, by the seconds since the last step. */
    step(seconds: number): void;
    draw(): void;
}
/** A line of dialogue: who says it, the choices offered, its color and how fast it types. */
export interface PlaySayOptions {
    /** The name shown above the words. */
    readonly who?: string;
    /** Answers to choose from. `say` then gives the index of the one chosen. */
    readonly choices?: readonly string[];
    /** The colour of the name and of the chosen answer. */
    readonly color?: number;
    /** Letters a second as the words appear; 0 shows them at once. 40 unless given. */
    readonly speed?: number;
}
/** A menu to show: its title, where it goes, how wide and its color. */
export interface PlayMenuOptions {
    readonly title?: string;
    /** The middle of the menu. The middle of the stage unless given. */
    readonly x?: number;
    readonly y?: number;
    readonly width?: number;
    /** The colour of the chosen item. */
    readonly color?: number;
}
/** A toast to show: how long and in what color. */
export interface PlayToastOptions {
    readonly seconds?: number;
    readonly color?: number;
}
/** Breaks words into lines no wider than `units`: at a space where there is one, between any two wide characters. */
export declare function wrapPlayWords(words: string, units: number): string[];
/** The widgets of one game. `tick` is called once a step, also while the game is paused, with seconds of the wall. */
export declare function createPlayWidgets(game: PlayGame, wake?: () => void): {
    bar(options: PlayBarOptions): PlayBar;
    toast(words: string, options?: PlayToastOptions): void;
    say(words: string, options?: PlaySayOptions): Promise<number | undefined>;
    sayPage(words: string, options?: PlaySayOptions): Promise<number | undefined>;
    menu(items: readonly string[], options?: PlayMenuOptions): Promise<number>;
    readonly asking: boolean;
    tick(seconds: number): void;
    reset(): void;
};
//# sourceMappingURL=playWidgets.d.ts.map