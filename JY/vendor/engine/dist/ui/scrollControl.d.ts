import type { DisplayObject } from '@egret/runtime';
import type { HoverInput } from '../hoverInputTypes.js';
import type { PointerInput } from '../pointerInputTypes.js';
/**
 * The scroll position of one axis of a clipped viewport an application draws itself.
 *
 * It owns the offset only. The wheel arrives from the hover input, a drag of the scrollbar thumb
 * from the contact input, and keys through its methods. The application moves its content and
 * draws its thumb from what the control reports. Panning the content with a finger is a gesture
 * and is not recognized here.
 */
export type ScrollAxis = 'x' | 'y';
/** How the wheel scrolls: the hover input, the target, and how far one line is. */
export interface ScrollWheelOptions {
    readonly hover: HoverInput;
    /** The viewport. A wheel over it or over a descendant scrolls. */
    readonly target: DisplayObject;
    /** Logical units of one wheel line. Defaults to 40. */
    readonly lineLength?: number;
    /**
     * Reads the other axis of the wheel when its own is still: an ordinary mouse wheel, which turns only up and down,
     * then scrolls a sideways list. Leave it off for a list inside a page that scrolls the other way, whose wheel should
     * scroll the page. Defaults to false.
     */
    readonly crossAxis?: boolean;
}
/** A scroll thumb to drag: its input and target, its track's length and its shortest length. */
export interface ScrollThumbOptions {
    readonly input: PointerInput;
    /** The thumb of the scrollbar. One contact drags it. */
    readonly target: DisplayObject;
    /** Length of the track the thumb moves along, in logical units. */
    readonly trackLength: number;
    /** The shortest the thumb is drawn. Defaults to 16, and is never more than the track. */
    readonly minimumLength?: number;
}
/** A scroll control to make: its axis, the lengths of its viewport and content, its wheel and thumb, and what it calls. */
export interface ScrollControlOptions {
    /** The axis of the stage the offset moves along. Defaults to 'y'. */
    readonly axis?: ScrollAxis;
    /** Lengths of the viewport and of the content along the axis, in logical units. */
    readonly viewportLength: number;
    readonly contentLength: number;
    /** Where it starts. Defaults to 0 and is clamped to the range. */
    readonly offset?: number;
    readonly wheel?: ScrollWheelOptions;
    readonly thumb?: ScrollThumbOptions;
    readonly onScroll?: (offset: number) => void;
    readonly onDragChange?: (dragging: boolean) => void;
}
/** Where the thumb is on its track and how long it is. */
export interface ScrollThumb {
    /** Where the thumb begins on its track, and how long it is, in logical units. */
    readonly start: number;
    readonly length: number;
}
/** Scrolling along one axis: the offset and its maximum, the thumb, and calls that scroll by lines, pages or to the ends. */
export interface ScrollControl {
    readonly axis: ScrollAxis;
    readonly offset: number;
    /** The largest offset: the content that does not fit, or zero. */
    readonly maximum: number;
    readonly viewportLength: number;
    readonly contentLength: number;
    /** Present when a thumb was given. A thumb as long as its track means nothing can scroll. */
    readonly thumb: ScrollThumb | undefined;
    readonly dragging: boolean;
    readonly enabled: boolean;
    /** Each returns whether the offset changed. */
    scrollTo(offset: number): boolean;
    scrollBy(delta: number): boolean;
    /** One wheel line, or one viewport less one line, toward the end (1) or the start (-1). */
    line(direction: 1 | -1): boolean;
    page(direction: 1 | -1): boolean;
    toStart(): boolean;
    toEnd(): boolean;
    /** New lengths after a layout or a change of content. The offset is clamped to the new range. */
    setLengths(viewportLength: number, contentLength: number): void;
    setEnabled(enabled: boolean): void;
    dispose(): void;
}
/** Scrolls content past a viewport along one axis, by wheel, by dragging a thumb, or by calls. */
export declare function createScrollControl(options: ScrollControlOptions): ScrollControl;
//# sourceMappingURL=scrollControl.d.ts.map