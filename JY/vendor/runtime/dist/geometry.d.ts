/** A place: `x` and `y`. */
export declare class Point {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    /** The distance from the origin. */
    get length(): number;
    setTo(x: number, y: number): this;
    clone(): Point;
    copyFrom(source: {
        readonly x: number;
        readonly y: number;
    }): void;
    equals(other: {
        readonly x: number;
        readonly y: number;
    }): boolean;
    /** A new point that is this one moved by another. */
    add(other: {
        readonly x: number;
        readonly y: number;
    }): Point;
    /** A new point that is this one less another. */
    subtract(other: {
        readonly x: number;
        readonly y: number;
    }): Point;
    /** Moves it by an amount. */
    offset(dx: number, dy: number): void;
    /** Scales it to a length, keeping its direction. A point at the origin stays there. */
    normalize(thickness: number): void;
    toString(): string;
    static distance(a: {
        readonly x: number;
        readonly y: number;
    }, b: {
        readonly x: number;
        readonly y: number;
    }): number;
    /** The point a fraction `f` of the way from `b` to `a`: `a` at 1, `b` at 0, as Egret's. */
    static interpolate(a: {
        readonly x: number;
        readonly y: number;
    }, b: {
        readonly x: number;
        readonly y: number;
    }, f: number): Point;
    /** The point at a length and an angle in radians from the origin. */
    static polar(length: number, angle: number): Point;
}
/** A rectangle: its top left corner `x`, `y`, and its `width` and `height`. */
export declare class Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
    get left(): number;
    /** Moves the left side, keeping the right side where it is. */
    set left(value: number);
    get right(): number;
    set right(value: number);
    get top(): number;
    /** Moves the top side, keeping the bottom side where it is. */
    set top(value: number);
    get bottom(): number;
    set bottom(value: number);
    get topLeft(): Point;
    set topLeft(value: {
        readonly x: number;
        readonly y: number;
    });
    get bottomRight(): Point;
    set bottomRight(value: {
        readonly x: number;
        readonly y: number;
    });
    setTo(x: number, y: number, width: number, height: number): this;
    clone(): Rectangle;
    copyFrom(source: RectangleLike): void;
    equals(other: RectangleLike): boolean;
    /** Whether it has no area. */
    isEmpty(): boolean;
    setEmpty(): void;
    /** Whether a point is inside it: its left and top sides count, its right and bottom do not. */
    contains(x: number, y: number): boolean;
    containsPoint(point: {
        readonly x: number;
        readonly y: number;
    }): boolean;
    /** Whether another rectangle lies wholly inside it. An empty one lies nowhere. */
    containsRect(other: RectangleLike): boolean;
    /** Whether the two share some area. */
    intersects(other: RectangleLike): boolean;
    /** The area the two share, or an empty rectangle. */
    intersection(other: RectangleLike): Rectangle;
    /** The least rectangle holding both. An empty one adds nothing. */
    union(other: RectangleLike): Rectangle;
    /** Grows it by `dx` on the left and on the right, and `dy` at the top and at the bottom. */
    inflate(dx: number, dy: number): void;
    inflatePoint(point: {
        readonly x: number;
        readonly y: number;
    }): void;
    offset(dx: number, dy: number): void;
    offsetPoint(point: {
        readonly x: number;
        readonly y: number;
    }): void;
    toString(): string;
}
/** Anything with a rectangle's x, y, width and height. */
export interface RectangleLike {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/**
 * A matrix of the plane, as Egret's and a canvas's: a point (x, y) goes to (a·x + c·y + tx, b·x + d·y + ty).
 * `concat`, `rotate`, `scale` and `translate` add a change after the ones it has; `prepend` adds one before them.
 */
export declare class Matrix {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
    constructor(a?: number, b?: number, c?: number, d?: number, tx?: number, ty?: number);
    setTo(a: number, b: number, c: number, d: number, tx: number, ty: number): this;
    clone(): Matrix;
    copyFrom(source: MatrixLike): this;
    equals(other: MatrixLike): boolean;
    identity(): void;
    /** Adds another matrix's change after this one's. */
    concat(other: MatrixLike): void;
    /** The same as `concat`. */
    append(a: number, b: number, c: number, d: number, tx: number, ty: number): this;
    /** Adds a change before this one's. */
    prepend(a: number, b: number, c: number, d: number, tx: number, ty: number): this;
    /** Turns it into its inverse. One with no inverse becomes what Egret made of it: no scale, and its move reversed. */
    invert(): void;
    /** Adds a turn by an angle in radians. */
    rotate(angle: number): void;
    scale(sx: number, sy: number): void;
    translate(dx: number, dy: number): void;
    /** Where a point goes. */
    transformPoint(x: number, y: number, result?: Point): Point;
    /** Where a direction goes: the change without its move. */
    deltaTransformPoint(point: {
        readonly x: number;
        readonly y: number;
    }): Point;
    /** Sets it to scale, then turn by an angle in radians, then move. */
    createBox(scaleX: number, scaleY: number, rotation?: number, tx?: number, ty?: number): void;
    /**
     * Sets it to the matrix `beginGradientFill` takes for a box of a width and height at `tx`, `ty`, turned by an
     * angle in radians: the gradient's own square of 1638.4 units fitted to the box.
     */
    createGradientBox(width: number, height: number, rotation?: number, tx?: number, ty?: number): void;
    toString(): string;
}
/** Anything with a 2D matrix's six numbers. */
export interface MatrixLike {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly tx: number;
    readonly ty: number;
}
//# sourceMappingURL=geometry.d.ts.map