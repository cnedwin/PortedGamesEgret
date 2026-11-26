import type { InputActions } from '@egret/engine/kit';
/** Where input actions read the browser: which element takes keys and pointers, whether gamepads count, and which keys pass through. */
export interface BrowserInputActionsOptions {
    /** Where keys are listened for; the window by default. */
    readonly keyTarget?: EventTarget;
    /** Where mouse buttons are listened for, such as the canvas; none by default. */
    readonly pointerTarget?: EventTarget;
    /** Read connected gamepads on each `poll()`. On by default. */
    readonly gamepads?: boolean;
    /** Keep the page from acting on bound keys (scrolling on Space and the arrows). On by default. */
    readonly preventDefault?: boolean;
    /** Keys that are passed on even when bound, such as F5 or F12. */
    readonly passKeys?: readonly string[];
    /**
     * Leave alone a key something before has already acted on, which says so by `preventDefault`. The game's keyboard input
     * does this for a key a focused control took — Space on a focused button, the arrows on a focused slider — so with
     * `true` that key does not also press an action. Off by default.
     */
    readonly skipPrevented?: boolean;
}
/** Input actions driven by the browser's keys, pointers and gamepads: poll them each frame. */
export interface BrowserInputActions {
    /** Reads the gamepads; call once a frame before the game reads its actions. */
    poll(): void;
    dispose(): void;
}
/** Listens to the page for the controls of `actions`. */
export declare function bindBrowserInputActions(actions: InputActions, options?: BrowserInputActionsOptions): BrowserInputActions;
/** A touch stick to put on the page: its binding, radius, the zone it appears in and its class. */
export interface TouchStickOptions {
    /** The binding the stick drives; `Touch:stick` by default. Put it in a vector action's `sticks`. */
    readonly binding?: string;
    /** Pixels from the centre to full tilt. Defaults to 56. */
    readonly radius?: number;
    /** Where a touch may start the stick: the left half of the element by default, or the whole of it. */
    readonly zone?: 'left' | 'right' | 'all';
    /** Class names of the base and the knob, which the stick creates inside the element. */
    readonly className?: string;
}
/** Touch controls on the page: their elements; dispose of them to take them off. */
export interface TouchControl {
    /** The elements the control made, to style. */
    readonly elements: readonly HTMLElement[];
    dispose(): void;
}
/**
 * A stick that appears where a finger lands in its zone of `element` and follows it. The element should cover
 * the screen area the stick works in, with `touch-action: none`.
 */
export declare function createTouchStick(element: HTMLElement, actions: InputActions, options?: TouchStickOptions): TouchControl;
/** Makes `element` an on-screen button that holds `binding` (such as `Touch:jump`) while a finger is on it. */
export declare function createTouchButton(element: HTMLElement, actions: InputActions, binding: string): TouchControl;
/**
 * The page's local storage as a save storage, or a memory stand-in where the page has none (a private window, a
 * blocked site): every call is guarded, so a save never throws for want of storage.
 */
export declare function browserSaveStorage(): {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    readonly persistent: boolean;
};
//# sourceMappingURL=BrowserInputActions.d.ts.map