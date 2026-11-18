// SPDX-License-Identifier: Apache-2.0
// A whole small 3D game from one call. The picture is a World3D app; everything else is `play`, drawn clear over
// it on a canvas of its own: the keys, the pointer, sound, timers, tweens, text and buttons. What is added here is
// what a 3D game makes its world of: boxes, balls and a ground that are placed by plain numbers, a camera that
// follows, a sun, tests of distance and overlap, and pieces thrown out by a hit.
import { EgretError } from '@egret/runtime';
import { play } from '../play.js';
import { Object3D, Scene3D } from '../../rendering/world3d/Object3D.js';
import { Mesh3D } from '../../rendering/world3d/Mesh3D.js';
import { createPerspectiveCamera3D } from '../../rendering/world3d/Camera3D.js';
import { createDirectionalLight3D, createHemisphereLight3D } from '../../rendering/world3d/Light3D.js';
import { createStandardMaterial3D, setColor3D } from '../../rendering/world3d/Material3D.js';
import { createBoxGeometry3D, createCylinderGeometry3D, createSphereGeometry3D } from '../../rendering/world3d/primitives3D.js';
import { linearColor3D } from '../../rendering/world3d/GeometryBuilder3D.js';
import { Raycaster3D } from '../../rendering/world3d/Raycast3D.js';
import { mat4Identity, mat4Multiply, quatToEuler, vec3TransformMat4 } from '../../rendering/world3d/math3D.js';
import { createWorld3DApp } from './app3D.js';
const invalid = (why) => new EgretError('PLAY_OPTIONS_INVALID', { cause: new TypeError(why) });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const above = (value) => finite(value) && value > 0;
const colour = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffff;
const RADIANS = Math.PI / 180;
// Primitive geometry is transferred to its thing. Loaded models remain borrowed; burst geometry belongs to the game.
const ownedGeometry = new WeakMap();
const throwCleanupFailures = (failures) => {
    if (failures.length === 1)
        throw failures[0];
    if (failures.length > 1)
        throw new AggregateError(failures, 'Play3D cleanup failed');
};
const cleanUp = (actions) => {
    const failures = [];
    for (const action of actions) {
        try {
            action();
        }
        catch (cause) {
            failures.push(cause);
        }
    }
    throwCleanupFailures(failures);
};
/**
 * A thing of the world: a box, a ball, a cylinder or a cone. It is placed, turned and sized by plain numbers, which
 * can be set at any time and tweened, and it takes properties of the game's own.
 */
export class PlayThing3D {
    /** What the thing is drawn with: its own mesh, or the model given to `game.add`. */
    node;
    /** Half its width, height and depth as made, before its scale. */
    halfX;
    halfY;
    halfZ;
    /**
     * Where the middle of its box is from its place, before its scale: 0 for what `play3d` makes, and for a model
     * whatever its geometry says, as for a figure that stands on its place.
     */
    middleX;
    middleY;
    middleZ;
    #material;
    #color;
    #turn = [0, 0, 0];
    #removed = false;
    /**
     * A thing of its own geometry and colour, or one of a model made elsewhere: then `half` and `middle` are its box,
     * and its colour is the model's own. Geometry passed directly is owned and released when the thing leaves;
     * an Object3D and its geometry and materials stay owned by their caller.
     */
    constructor(shape, color, half, middle = [0, 0, 0]) {
        this.#color = color;
        if (shape instanceof Object3D) {
            this.node = shape;
            quatToEuler(this.#turn, shape.quaternion);
            for (const axis of [0, 1, 2])
                this.#turn[axis] /= RADIANS;
        }
        else {
            ownedGeometry.set(this, shape);
            this.#material = createStandardMaterial3D({ color, roughness: 0.75 });
            const mesh = new Mesh3D(shape, this.#material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.node = mesh;
        }
        [this.halfX, this.halfY, this.halfZ] = half;
        [this.middleX, this.middleY, this.middleZ] = middle;
    }
    #place(index, value) {
        if (!finite(value))
            return;
        this.node.position[index] = value;
        this.node.markTransformDirty();
    }
    #size(index, value) {
        if (!finite(value))
            return;
        this.node.scale[index] = value;
        this.node.markTransformDirty();
    }
    #turned(index, degrees) {
        if (!finite(degrees))
            return;
        this.#turn[index] = degrees;
        this.node.setRotation(this.#turn[0] * RADIANS, this.#turn[1] * RADIANS, this.#turn[2] * RADIANS);
    }
    get x() {
        return this.node.position[0];
    }
    set x(value) {
        this.#place(0, value);
    }
    /** Up. */
    get y() {
        return this.node.position[1];
    }
    set y(value) {
        this.#place(1, value);
    }
    /** Towards the camera as the game starts; away from it is less. */
    get z() {
        return this.node.position[2];
    }
    set z(value) {
        this.#place(2, value);
    }
    /** Turns about its own axes, in degrees. */
    get rotationX() {
        return this.#turn[0];
    }
    set rotationX(value) {
        this.#turned(0, value);
    }
    get rotationY() {
        return this.#turn[1];
    }
    set rotationY(value) {
        this.#turned(1, value);
    }
    get rotationZ() {
        return this.#turn[2];
    }
    set rotationZ(value) {
        this.#turned(2, value);
    }
    /** Its size as a share of the size it was made with; setting it sets all three of the ones below. */
    get scale() {
        return this.node.scale[0];
    }
    set scale(value) {
        if (!finite(value))
            return;
        this.node.setScale(value);
    }
    get scaleX() {
        return this.node.scale[0];
    }
    set scaleX(value) {
        this.#size(0, value);
    }
    get scaleY() {
        return this.node.scale[1];
    }
    set scaleY(value) {
        this.#size(1, value);
    }
    get scaleZ() {
        return this.node.scale[2];
    }
    set scaleZ(value) {
        this.#size(2, value);
    }
    get visible() {
        return this.node.visible;
    }
    set visible(value) {
        this.node.visible = value === true;
    }
    /** Its colour, `0xRRGGBB`. What is not a colour is not taken; a model keeps the colours it has. */
    get color() {
        return this.#color;
    }
    set color(value) {
        if (!colour(value) || this.#material === undefined)
            return;
        this.#color = value;
        setColor3D(this.#material.color, value);
    }
    /** Whether `game.remove` has taken it out of the world. Setting it afterwards does nothing that is seen. */
    get removed() {
        return this.#removed;
    }
    /** Used by game removal and teardown; only resources made for this thing are retired. */
    leave() {
        if (this.#removed)
            return;
        this.#removed = true;
        const geometry = ownedGeometry.get(this);
        ownedGeometry.delete(this);
        cleanUp([() => this.node.removeFromParent(), () => geometry?.dispose(), () => this.#material?.dispose()]);
    }
}
const PIECES = 96;
/** How deep a ground is under its top. */
const GROUND_DEPTH = 8;
/** The upright box of a thing in the world: its middle and half its size, scaled. */
function boxOf(thing) {
    return [
        thing.x + thing.middleX * thing.scaleX,
        thing.y + thing.middleY * thing.scaleY,
        thing.z + thing.middleZ * thing.scaleZ,
        thing.halfX * Math.abs(thing.scaleX),
        thing.halfY * Math.abs(thing.scaleY),
        thing.halfZ * Math.abs(thing.scaleZ)
    ];
}
/** How far two things overlap on each axis; all three are above 0 when they overlap. */
export function overlap3D(a, b, shrink = 0) {
    const p = boxOf(a), q = boxOf(b);
    return [
        p[3] + q[3] - 2 * shrink - Math.abs(p[0] - q[0]),
        p[4] + q[4] - 2 * shrink - Math.abs(p[1] - q[1]),
        p[5] + q[5] - 2 * shrink - Math.abs(p[2] - q[2])
    ];
}
/**
 * The box of a model, in its own units and about its own place: half its size and where its middle is. Every mesh
 * under it counts, placed as it is under it; the model's own place, turn and scale do not.
 */
export function modelBox3D(model) {
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity], corner = new Float32Array(3);
    const visit = (node, matrix) => {
        const geometry = node.geometry;
        if (geometry !== undefined && geometry.vertexCount > 0) {
            const box = geometry.boundingBox;
            for (let i = 0; i < 8; i++) {
                corner[0] = i & 1 ? box[3] : box[0];
                corner[1] = i & 2 ? box[4] : box[1];
                corner[2] = i & 4 ? box[5] : box[2];
                vec3TransformMat4(corner, corner, matrix);
                for (let k = 0; k < 3; k++) {
                    low[k] = Math.min(low[k], corner[k]);
                    high[k] = Math.max(high[k], corner[k]);
                }
            }
        }
        for (const child of node.children) {
            child.updateWorldMatrix();
            const placed = new Float32Array(16);
            mat4Multiply(placed, matrix, child.matrix);
            visit(child, placed);
        }
    };
    visit(model, mat4Identity(new Float32Array(16)));
    if (!(low[0] <= high[0]))
        return { half: [0.5, 0.5, 0.5], middle: [0, 0, 0] };
    return {
        half: [(high[0] - low[0]) / 2, (high[1] - low[1]) / 2, (high[2] - low[2]) / 2],
        middle: [(high[0] + low[0]) / 2, (high[1] + low[1]) / 2, (high[2] + low[2]) / 2]
    };
}
/** The move that takes `a` out of `b` by the shortest way, or undefined when they are apart. */
export function pushOut3D(a, b) {
    const [x, y, z] = overlap3D(a, b);
    if (!(x > 0 && y > 0 && z > 0))
        return undefined;
    const p = boxOf(a), q = boxOf(b);
    // Compare the same box centres as the overlap, including offset or mirrored models.
    // Up or down first where the ways are as short as one another: a thing set down on a floor stands on it.
    if (y <= x && y <= z)
        return { x: 0, y: p[1] >= q[1] ? y : -y, z: 0 };
    if (x <= z)
        return { x: p[0] >= q[0] ? x : -x, y: 0, z: 0 };
    return { x: 0, y: 0, z: p[2] >= q[2] ? z : -z };
}
/** Starts a 3D game in the page. See the guide `play3d.md`. */
export async function play3d(options) {
    if (options === null || typeof options !== 'object')
        throw invalid('play3d takes an object of options');
    const { setup, update, background = 0x0b1020 } = options;
    if (!colour(background))
        throw invalid('background is a colour from 0 to 0xffffff');
    if (setup !== undefined && typeof setup !== 'function')
        throw invalid('setup is a function');
    if (update !== undefined && typeof update !== 'function')
        throw invalid('update is a function');
    if (options.canvas !== undefined)
        throw invalid('play3d makes its own canvases');
    let game, app, deep, unplace;
    let clearing = false, closing = false, worldDisposed = false, generation = 0;
    let disposal;
    const admit = () => {
        if (clearing || closing)
            throw invalid('the 3D world is clearing or disposed');
    };
    const beginClosing = () => {
        if (closing)
            return;
        closing = true;
        generation++;
    };
    const scene = new Scene3D();
    scene.background = linearColor3D(background);
    const eye = createPerspectiveCamera3D({ fov: 55, near: 0.1, far: 500 });
    const sky = createHemisphereLight3D({ color: 0xcfe3ff, groundColor: 0x3a3f4a, intensity: 0.9 });
    const sun = createDirectionalLight3D({ color: 0xfff4e0, intensity: 2.4, castShadow: true });
    sun.shadow.extent = 24;
    sun.shadow.far = 120;
    const things = new Set();
    // The camera: where the game put it, what it looks at, and how far a shake has it out of place.
    const base = [0, 6, 12], aim = [0, 0, 0], shaken = [0, 0, 0];
    let followed, turning = false, offset = [0, 4, 8], smooth = 6, shakeAmount = 0, shakeLeft = 0, shakeSpan = 1;
    const settle = () => {
        eye.setPosition(base[0] + shaken[0], base[1] + shaken[1], base[2] + shaken[2]);
        eye.lookAt(aim[0], aim[1], aim[2]);
        // The sun keeps its direction and stays over what is looked at, so its shadows are there.
        sun.setPosition(aim[0] + 8, aim[1] + 16, aim[2] + 10);
        sun.lookAt(aim[0], aim[1], aim[2]);
    };
    const camera = {
        get x() {
            return base[0];
        },
        set x(value) {
            if (finite(value))
                base[0] = value;
        },
        get y() {
            return base[1];
        },
        set y(value) {
            if (finite(value))
                base[1] = value;
        },
        get z() {
            return base[2];
        },
        set z(value) {
            if (finite(value))
                base[2] = value;
        },
        get fov() {
            return eye.fov;
        },
        set fov(value) {
            if (finite(value) && value > 1 && value < 170)
                eye.fov = value;
        },
        lookAt(x, y, z) {
            if (!finite(x) || !finite(y) || !finite(z))
                return;
            aim[0] = x;
            aim[1] = y;
            aim[2] = z;
        },
        node: eye
    };
    // Pieces of a burst: a few small boxes, made once and used again.
    const pieceShape = createBoxGeometry3D({ width: 1, height: 1, depth: 1 });
    const pieces = [];
    let nextPiece = 0;
    const make = (geometry, color, half, at) => {
        admit();
        if (!colour(color))
            throw invalid('a colour is a number from 0 to 0xffffff');
        if (at === null || typeof at !== 'object')
            throw invalid('a place is an object with x, y and z');
        const { x, y, z } = at;
        // Read caller properties before allocating, then recheck in case a getter began teardown.
        admit();
        const thing = new PlayThing3D(geometry(), color, half);
        thing.node.setPosition(finite(x) ? x : 0, finite(y) ? y : 0, finite(z) ? z : 0);
        scene.addChild(thing.node);
        things.add(thing);
        return thing;
    };
    const isThing = (body) => body instanceof PlayThing3D;
    // Taps on things: found by a ray from the camera through the pointer when it goes down.
    const taps = new Map(), ray = new Raycaster3D();
    let tapFailure;
    const tapped = (flat) => {
        if (taps.size === 0 || !flat.pointer.pressed)
            return;
        for (const thing of taps.keys())
            if (thing.removed)
                taps.delete(thing);
        eye.updateWorldMatrices();
        scene.updateWorldMatrices();
        ray.setFromCamera((flat.pointer.x / flat.width) * 2 - 1, 1 - (flat.pointer.y / flat.height) * 2, eye);
        let hits;
        try {
            hits = ray.intersect(scene);
        }
        catch {
            return;
        }
        for (const hit of hits) {
            // The thing a mesh that was hit belongs to: the nearest one up its line that has a tap.
            for (let node = hit.object; node !== undefined; node = node.parent) {
                const thing = [...taps.keys()].find(each => each.node === node);
                if (thing === undefined || !thing.visible)
                    continue;
                const callback = taps.get(thing);
                try {
                    const result = callback();
                    if (result !== null && result !== undefined && typeof result.then === 'function')
                        result.then(undefined, cause => {
                            tapFailure ??= { cause };
                        });
                }
                catch (cause) {
                    tapFailure ??= { cause };
                }
                return;
            }
        }
    };
    const clear = () => {
        if (clearing)
            throw invalid('the 3D world is clearing or disposed');
        clearing = true;
        generation++;
        try {
            const leaving = [...things];
            things.clear();
            taps.clear();
            for (const piece of pieces) {
                piece.life = 0;
                piece.thing.visible = false;
            }
            followed = undefined;
            base[0] = 0;
            base[1] = 6;
            base[2] = 12;
            aim[0] = aim[1] = aim[2] = 0;
            shakeLeft = 0;
            shaken[0] = shaken[1] = shaken[2] = 0;
            cleanUp(leaving.map(thing => () => thing.leave()));
        }
        finally {
            clearing = false;
        }
    };
    const disposeWorld = () => {
        beginClosing();
        if (worldDisposed)
            return;
        worldDisposed = true;
        cleanUp([
            clear,
            ...pieces.map(piece => () => piece.thing.leave()),
            () => pieceShape.dispose(),
            () => unplace?.(),
            () => app?.dispose(),
            () => deep?.remove()
        ]);
    };
    // Where the camera keeps to by a thing: its offset, turned with the thing when asked.
    const placeBy = (thing) => {
        let [x, y, z] = offset;
        if (turning) {
            const turn = thing.rotationY * RADIANS, c = Math.cos(turn), s = Math.sin(turn);
            [x, z] = [x * c + z * s, -x * s + z * c];
        }
        return [thing.x + x, thing.y + y, thing.z + z];
    };
    const after = (seconds) => {
        if (followed !== undefined && !followed.removed) {
            const share = smooth > 0 ? 1 - Math.exp(-smooth * seconds) : 1, [x, y, z] = placeBy(followed);
            base[0] = base[0] + (x - base[0]) * share;
            base[1] = base[1] + (y - base[1]) * share;
            base[2] = base[2] + (z - base[2]) * share;
            aim[0] = followed.x;
            aim[1] = followed.y;
            aim[2] = followed.z;
        }
        if (shakeLeft > 0) {
            shakeLeft -= seconds;
            const reach = shakeLeft > 0 ? shakeAmount * (shakeLeft / shakeSpan) : 0;
            for (let i = 0; i < 3; i++)
                shaken[i] = (Math.random() * 2 - 1) * reach;
        }
        for (const piece of pieces) {
            if (piece.life <= 0)
                continue;
            piece.life -= seconds;
            if (piece.life <= 0) {
                piece.thing.visible = false;
                continue;
            }
            piece.vy -= piece.gravity * seconds;
            piece.thing.x += piece.vx * seconds;
            piece.thing.y += piece.vy * seconds;
            piece.thing.z += piece.vz * seconds;
            piece.thing.scale = piece.size * (piece.life / piece.span);
        }
        settle();
    };
    const extend = (flat) => {
        const added = {
            box(width, height, depth, color, at = {}) {
                admit();
                if (!above(width) || !above(height) || !above(depth))
                    throw invalid('a box has a width, height and depth above 0');
                return make(() => createBoxGeometry3D({ width, height, depth }), color, [width / 2, height / 2, depth / 2], at);
            },
            sphere(radius, color, at = {}) {
                admit();
                if (!above(radius))
                    throw invalid('a sphere has a radius above 0');
                return make(() => createSphereGeometry3D({ radius, widthSegments: 24, heightSegments: 16 }), color, [radius, radius, radius], at);
            },
            cylinder(radius, height, color, at = {}) {
                admit();
                if (!above(radius) || !above(height))
                    throw invalid('a cylinder has a radius and a height above 0');
                return make(() => createCylinderGeometry3D({ radiusTop: radius, radiusBottom: radius, height, radialSegments: 24 }), color, [radius, height / 2, radius], at);
            },
            cone(radius, height, color, at = {}) {
                admit();
                if (!above(radius) || !above(height))
                    throw invalid('a cone has a radius and a height above 0');
                return make(() => createCylinderGeometry3D({ radiusTop: 0, radiusBottom: radius, height, radialSegments: 24 }), color, [radius, height / 2, radius], at);
            },
            ground(size, color, y = 0) {
                admit();
                if (!above(size) || !finite(y))
                    throw invalid('a ground has a size above 0');
                // Deep, so that a thing falling fast in a slow frame is still pushed back up out of it and not through it.
                const thing = make(() => createBoxGeometry3D({ width: size, height: GROUND_DEPTH, depth: size }), color, [size / 2, GROUND_DEPTH / 2, size / 2], {
                    y: y - GROUND_DEPTH / 2
                });
                thing.node.castShadow = false;
                return thing;
            },
            add(model, at = {}) {
                admit();
                if (!(model instanceof Object3D))
                    throw invalid('add takes a mesh, a group or a loaded model');
                if (at === null || typeof at !== 'object')
                    throw invalid('a place is an object with x, y and z');
                const { x, y, z } = at;
                admit();
                const { half, middle } = modelBox3D(model);
                admit();
                if (model.parent !== undefined)
                    model.removeFromParent();
                const thing = new PlayThing3D(model, 0xffffff, half, middle);
                if (finite(x))
                    thing.x = x;
                if (finite(y))
                    thing.y = y;
                if (finite(z))
                    thing.z = z;
                scene.addChild(model);
                things.add(thing);
                return thing;
            },
            onTap(target, callback) {
                if (typeof callback !== 'function')
                    throw invalid('onTap takes a thing or a sprite, and a function');
                if (!isThing(target)) {
                    flat.onTap(target, callback);
                    return;
                }
                taps.set(target, callback);
            },
            remove(body) {
                if (isThing(body)) {
                    things.delete(body);
                    taps.delete(body);
                    if (followed === body)
                        followed = undefined;
                    body.leave();
                }
                else
                    flat.remove(body);
            },
            near(a, b, distance) {
                if (!isThing(a) || !isThing(b))
                    return !isThing(a) && !isThing(b) && flat.near(a, b, distance ?? 0);
                if (a.removed || b.removed || !a.visible || !b.visible)
                    return false;
                const reach = distance ??
                    Math.max(a.halfX * Math.abs(a.scaleX), a.halfZ * Math.abs(a.scaleZ)) +
                        Math.max(b.halfX * Math.abs(b.scaleX), b.halfZ * Math.abs(b.scaleZ));
                const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
                return dx * dx + dy * dy + dz * dz <= reach * reach;
            },
            overlaps(a, b, shrink = 0) {
                if (!isThing(a) || !isThing(b))
                    return !isThing(a) && !isThing(b) && flat.overlaps(a, b, shrink);
                if (a === b || a.removed || b.removed || !a.visible || !b.visible)
                    return false;
                const [x, y, z] = overlap3D(a, b, finite(shrink) ? shrink : 0);
                return x > 0 && y > 0 && z > 0;
            },
            hits(a, others, shrink = 0) {
                for (const other of others)
                    if (other !== a && whole.overlaps(a, other, shrink))
                        return other;
                return undefined;
            },
            hitsAll(a, others, shrink = 0) {
                return others.filter(other => other !== a && whole.overlaps(a, other, shrink));
            },
            pushOut(a, b) {
                if (!isThing(a) || !isThing(b) || a === b || a.removed || b.removed || !a.visible || !b.visible)
                    return undefined;
                return pushOut3D(a, b);
            },
            follow(thing, where = {}) {
                if (thing !== undefined && !isThing(thing))
                    throw invalid('follow takes a thing of the world');
                followed = thing;
                if (thing === undefined)
                    return;
                offset = [finite(where.x) ? where.x : 0, finite(where.y) ? where.y : 4, finite(where.z) ? where.z : 8];
                smooth = finite(where.smooth) && where.smooth >= 0 ? where.smooth : 6;
                turning = where.turn === true;
                // It starts where it will stay, and does not fly in from where the camera was.
                [base[0], base[1], base[2]] = placeBy(thing);
                aim[0] = thing.x;
                aim[1] = thing.y;
                aim[2] = thing.z;
            },
            hitStop(seconds = 0.06) {
                flat.hitStop(seconds);
                if (above(seconds))
                    generation++;
            },
            shake(amount = 0.3, seconds = 0.25) {
                if (!above(amount) || !above(seconds))
                    return;
                shakeAmount = Math.max(shakeLeft > 0 ? shakeAmount : 0, Math.min(amount, 10));
                shakeLeft = shakeSpan = Math.min(seconds, 5);
            },
            burst(x, y, z, o = {}) {
                admit();
                if (!finite(x) || !finite(y) || !finite(z) || o === null || typeof o !== 'object')
                    return;
                const count = Math.min(PIECES, Math.max(1, Math.floor(finite(o.count) ? o.count : 12))), speed = above(o.speed) ? o.speed : 5, life = above(o.life) ? Math.min(o.life, 10) : 0.6, size = above(o.size) ? o.size : 0.18, gravity = finite(o.gravity) ? o.gravity : 12, color = colour(o.color) ? o.color : 0xffffff;
                admit();
                for (let i = 0; i < count; i++) {
                    let piece = pieces[nextPiece];
                    if (piece === undefined) {
                        const thing = new PlayThing3D(pieceShape, color, [0.5, 0.5, 0.5]);
                        // Pieces own their separate material, while the game owns their one shared shape.
                        ownedGeometry.delete(thing);
                        thing.node.castShadow = false;
                        scene.addChild(thing.node);
                        piece = pieces[nextPiece] = { thing, vx: 0, vy: 0, vz: 0, life: 0, span: 1, gravity: 0, size: 1 };
                    }
                    nextPiece = (nextPiece + 1) % PIECES;
                    // A direction over the whole ball, a little upwards.
                    const turn = flat.random.range(0, 2 * Math.PI), lift = flat.random.range(-0.4, 1), flatness = Math.sqrt(Math.max(0, 1 - lift * lift)), pace = speed * flat.random.range(0.5, 1);
                    piece.vx = Math.cos(turn) * flatness * pace;
                    piece.vy = lift * pace;
                    piece.vz = Math.sin(turn) * flatness * pace;
                    piece.life = piece.span = life * flat.random.range(0.6, 1);
                    piece.gravity = gravity;
                    piece.size = size;
                    piece.thing.color = color;
                    piece.thing.x = x;
                    piece.thing.y = y;
                    piece.thing.z = z;
                    piece.thing.scale = size;
                    piece.thing.visible = true;
                }
            },
            dispose() {
                if (disposal !== undefined)
                    return disposal;
                beginClosing();
                // Publish before callbacks, but stop the flat game synchronously so a motion cannot keep chaining.
                let resolve, reject;
                disposal = new Promise((done, fail) => {
                    resolve = done;
                    reject = fail;
                });
                void (async () => {
                    const failures = [];
                    try {
                        await flat.dispose();
                    }
                    catch (cause) {
                        failures.push(cause);
                    }
                    try {
                        disposeWorld();
                    }
                    catch (cause) {
                        failures.push(cause);
                    }
                    throwCleanupFailures(failures);
                })().then(resolve, reject);
                return disposal;
            }
        };
        // Everything of the flat game is there under these: its getters read the game's own state, whoever asks.
        const whole = Object.create(flat, {
            ...Object.getOwnPropertyDescriptors(added),
            scene: { value: scene, enumerable: true },
            camera: { value: camera, enumerable: true },
            sun: { value: sun, enumerable: true },
            app: {
                get: () => app,
                enumerable: true
            }
        });
        return whole;
    };
    const flat = await play({
        ...options,
        // The interface is drawn by WebGL2 unless WebGPU is asked for, as the overlay of a World3D app is.
        backend: options.backend ?? 'webgl2',
        transparent: true,
        async setup(given) {
            admit();
            if (game === undefined) {
                // The picture goes on a canvas of its own, under the game's, in the same place whatever the page does.
                const over = given.canvas, holder = over.parentElement;
                if (holder === null)
                    throw invalid('play3d needs its canvas in the page');
                const page = over.ownerDocument, win = page.defaultView ?? globalThis;
                const under = (deep = page.createElement('canvas'));
                under.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;display:block';
                over.style.position = 'relative';
                holder.insertBefore(under, over);
                const place = () => {
                    const outer = holder.getBoundingClientRect(), box = over.getBoundingClientRect();
                    under.style.left = box.left - outer.left + holder.scrollLeft + 'px';
                    under.style.top = box.top - outer.top + holder.scrollTop + 'px';
                    under.style.width = box.width + 'px';
                    under.style.height = box.height + 'px';
                };
                place();
                const Resize = globalThis.ResizeObserver, observer = Resize ? new Resize(place) : undefined;
                observer?.observe(over);
                win.addEventListener('resize', place);
                unplace = () => {
                    observer?.disconnect();
                    win.removeEventListener('resize', place);
                };
                app = await createWorld3DApp(under, {
                    backend: options.backend === 'webgpu' ? 'webgpu' : 'webgl2',
                    ...(options.onError === undefined ? {} : { onError: options.onError })
                });
                scene.addChild(eye);
                scene.addChild(sky);
                scene.addChild(sun);
                settle();
                app.show(scene, eye);
                game = extend(given);
            }
            else
                clear();
            await setup?.(game);
            settle();
        },
        update(seconds) {
            if (game === undefined)
                return;
            const current = game, version = generation;
            const running = () => generation === version &&
                !clearing &&
                !closing &&
                !current.paused &&
                current.scope.state === 'open' &&
                current.browser.loop.state === 'running';
            if (!running())
                return;
            if (tapFailure !== undefined) {
                const { cause } = tapFailure;
                tapFailure = undefined;
                throw cause;
            }
            tapped(current);
            if (!running())
                return;
            update?.(seconds, current);
            if (!running())
                return;
            after(seconds);
        }
    }).catch((cause) => {
        try {
            disposeWorld();
        }
        catch (cleanupFailure) {
            throw new AggregateError([cause, cleanupFailure], 'Play3D setup and cleanup failed');
        }
        throw cause;
    });
    return game ?? extend(flat);
}
//# sourceMappingURL=BrowserPlay3D.js.map