// SPDX-License-Identifier: Apache-2.0
// Egret 5's Point, Rectangle and Matrix, for code that is moved over with them. Each is also a plain object of the
// shape the engine takes, `{ x, y }`, `{ x, y, width, height }` and `{ a, b, c, d, tx, ty }`, so one can be passed
// wherever such an object is asked for. Angles are in radians, as they were there.
/** A place: `x` and `y`. */
export class Point {
    x;
    y;
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    /** The distance from the origin. */
    get length() {
        return Math.hypot(this.x, this.y);
    }
    setTo(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    clone() {
        return new Point(this.x, this.y);
    }
    copyFrom(source) {
        this.x = source.x;
        this.y = source.y;
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    /** A new point that is this one moved by another. */
    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }
    /** A new point that is this one less another. */
    subtract(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }
    /** Moves it by an amount. */
    offset(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
    /** Scales it to a length, keeping its direction. A point at the origin stays there. */
    normalize(thickness) {
        const length = this.length;
        if (length > 0) {
            this.x *= thickness / length;
            this.y *= thickness / length;
        }
    }
    toString() {
        return `(x=${this.x}, y=${this.y})`;
    }
    static distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
    /** The point a fraction `f` of the way from `b` to `a`: `a` at 1, `b` at 0, as Egret's. */
    static interpolate(a, b, f) {
        return new Point(b.x + (a.x - b.x) * f, b.y + (a.y - b.y) * f);
    }
    /** The point at a length and an angle in radians from the origin. */
    static polar(length, angle) {
        return new Point(length * Math.cos(angle), length * Math.sin(angle));
    }
}
/** A rectangle: its top left corner `x`, `y`, and its `width` and `height`. */
export class Rectangle {
    x;
    y;
    width;
    height;
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    get left() {
        return this.x;
    }
    /** Moves the left side, keeping the right side where it is. */
    set left(value) {
        this.width += this.x - value;
        this.x = value;
    }
    get right() {
        return this.x + this.width;
    }
    set right(value) {
        this.width = value - this.x;
    }
    get top() {
        return this.y;
    }
    /** Moves the top side, keeping the bottom side where it is. */
    set top(value) {
        this.height += this.y - value;
        this.y = value;
    }
    get bottom() {
        return this.y + this.height;
    }
    set bottom(value) {
        this.height = value - this.y;
    }
    get topLeft() {
        return new Point(this.left, this.top);
    }
    set topLeft(value) {
        this.top = value.y;
        this.left = value.x;
    }
    get bottomRight() {
        return new Point(this.right, this.bottom);
    }
    set bottomRight(value) {
        this.bottom = value.y;
        this.right = value.x;
    }
    setTo(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        return this;
    }
    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }
    copyFrom(source) {
        this.setTo(source.x, source.y, source.width, source.height);
    }
    equals(other) {
        return this.x === other.x && this.y === other.y && this.width === other.width && this.height === other.height;
    }
    /** Whether it has no area. */
    isEmpty() {
        return this.width <= 0 || this.height <= 0;
    }
    setEmpty() {
        this.setTo(0, 0, 0, 0);
    }
    /** Whether a point is inside it: its left and top sides count, its right and bottom do not. */
    contains(x, y) {
        return x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.height;
    }
    containsPoint(point) {
        return this.contains(point.x, point.y);
    }
    /** Whether another rectangle lies wholly inside it. An empty one lies nowhere. */
    containsRect(other) {
        if (other.width <= 0 || other.height <= 0)
            return false;
        return (other.x >= this.x &&
            other.y >= this.y &&
            other.x + other.width <= this.x + this.width &&
            other.y + other.height <= this.y + this.height);
    }
    /** Whether the two share some area. */
    intersects(other) {
        return !this.intersection(other).isEmpty();
    }
    /** The area the two share, or an empty rectangle. */
    intersection(other) {
        const left = Math.max(this.x, other.x), top = Math.max(this.y, other.y), right = Math.min(this.x + this.width, other.x + other.width), bottom = Math.min(this.y + this.height, other.y + other.height);
        return right <= left || bottom <= top ? new Rectangle() : new Rectangle(left, top, right - left, bottom - top);
    }
    /** The least rectangle holding both. An empty one adds nothing. */
    union(other) {
        if (this.isEmpty())
            return new Rectangle(other.x, other.y, other.width, other.height);
        if (other.width <= 0 || other.height <= 0)
            return this.clone();
        const left = Math.min(this.x, other.x), top = Math.min(this.y, other.y);
        return new Rectangle(left, top, Math.max(this.x + this.width, other.x + other.width) - left, Math.max(this.y + this.height, other.y + other.height) - top);
    }
    /** Grows it by `dx` on the left and on the right, and `dy` at the top and at the bottom. */
    inflate(dx, dy) {
        this.x -= dx;
        this.width += 2 * dx;
        this.y -= dy;
        this.height += 2 * dy;
    }
    inflatePoint(point) {
        this.inflate(point.x, point.y);
    }
    offset(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
    offsetPoint(point) {
        this.offset(point.x, point.y);
    }
    toString() {
        return `(x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height})`;
    }
}
/**
 * A matrix of the plane, as Egret's and a canvas's: a point (x, y) goes to (a·x + c·y + tx, b·x + d·y + ty).
 * `concat`, `rotate`, `scale` and `translate` add a change after the ones it has; `prepend` adds one before them.
 */
export class Matrix {
    a;
    b;
    c;
    d;
    tx;
    ty;
    constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
    }
    setTo(a, b, c, d, tx, ty) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
        return this;
    }
    clone() {
        return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
    }
    copyFrom(source) {
        return this.setTo(source.a, source.b, source.c, source.d, source.tx, source.ty);
    }
    equals(other) {
        return (this.a === other.a &&
            this.b === other.b &&
            this.c === other.c &&
            this.d === other.d &&
            this.tx === other.tx &&
            this.ty === other.ty);
    }
    identity() {
        this.setTo(1, 0, 0, 1, 0, 0);
    }
    /** Adds another matrix's change after this one's. */
    concat(other) {
        this.setTo(this.a * other.a + this.b * other.c, this.a * other.b + this.b * other.d, this.c * other.a + this.d * other.c, this.c * other.b + this.d * other.d, this.tx * other.a + this.ty * other.c + other.tx, this.tx * other.b + this.ty * other.d + other.ty);
    }
    /** The same as `concat`. */
    append(a, b, c, d, tx, ty) {
        this.concat({ a, b, c, d, tx, ty });
        return this;
    }
    /** Adds a change before this one's. */
    prepend(a, b, c, d, tx, ty) {
        const m = { a: this.a, b: this.b, c: this.c, d: this.d, tx: this.tx, ty: this.ty };
        this.setTo(a, b, c, d, tx, ty);
        this.concat(m);
        return this;
    }
    /** Turns it into its inverse. One with no inverse becomes what Egret made of it: no scale, and its move reversed. */
    invert() {
        const det = this.a * this.d - this.b * this.c;
        if (det === 0 || !Number.isFinite(det)) {
            this.setTo(0, 0, 0, 0, -this.tx, -this.ty);
            return;
        }
        const { a, b, c, d, tx, ty } = this;
        this.setTo(d / det, -b / det, -c / det, a / det, (c * ty - d * tx) / det, (b * tx - a * ty) / det);
    }
    /** Adds a turn by an angle in radians. */
    rotate(angle) {
        if (angle === 0)
            return;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        this.concat({ a: cos, b: sin, c: -sin, d: cos, tx: 0, ty: 0 });
    }
    scale(sx, sy) {
        this.concat({ a: sx, b: 0, c: 0, d: sy, tx: 0, ty: 0 });
    }
    translate(dx, dy) {
        this.tx += dx;
        this.ty += dy;
    }
    /** Where a point goes. */
    transformPoint(x, y, result) {
        const out = result ?? new Point();
        return out.setTo(this.a * x + this.c * y + this.tx, this.b * x + this.d * y + this.ty);
    }
    /** Where a direction goes: the change without its move. */
    deltaTransformPoint(point) {
        return new Point(this.a * point.x + this.c * point.y, this.b * point.x + this.d * point.y);
    }
    /** Sets it to scale, then turn by an angle in radians, then move. */
    createBox(scaleX, scaleY, rotation = 0, tx = 0, ty = 0) {
        const cos = Math.cos(rotation), sin = Math.sin(rotation);
        // Adding 0 makes a zero that came out negative an ordinary one.
        this.setTo(scaleX * cos + 0, scaleX * sin + 0, -scaleY * sin + 0, scaleY * cos + 0, tx, ty);
    }
    /**
     * Sets it to the matrix `beginGradientFill` takes for a box of a width and height at `tx`, `ty`, turned by an
     * angle in radians: the gradient's own square of 1638.4 units fitted to the box.
     */
    createGradientBox(width, height, rotation = 0, tx = 0, ty = 0) {
        this.createBox(width / 1638.4, height / 1638.4, rotation, tx + width / 2, ty + height / 2);
    }
    toString() {
        return `(a=${this.a}, b=${this.b}, c=${this.c}, d=${this.d}, tx=${this.tx}, ty=${this.ty})`;
    }
}
//# sourceMappingURL=geometry.js.map