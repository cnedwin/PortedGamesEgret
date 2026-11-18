import type { DisplayObject } from '@egret/runtime';
import type { PlayGame, PlayOptions } from '../play.js';
import { Object3D, Scene3D } from '../../rendering/world3d/Object3D.js';
import type { Geometry3D } from '../../rendering/world3d/Geometry3D.js';
import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import type { Light3D } from '../../rendering/world3d/Light3D.js';
import type { World3DApp } from './app3D.js';
/** Where a thing is made. What is left out is 0. */
export interface PlayPlace3D {
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
}
/**
 * A thing of the world: a box, a ball, a cylinder or a cone. It is placed, turned and sized by plain numbers, which
 * can be set at any time and tweened, and it takes properties of the game's own.
 */
export declare class PlayThing3D {
    #private;
    /** What the thing is drawn with: its own mesh, or the model given to `game.add`. */
    readonly node: Object3D;
    /** Half its width, height and depth as made, before its scale. */
    readonly halfX: number;
    readonly halfY: number;
    readonly halfZ: number;
    /**
     * Where the middle of its box is from its place, before its scale: 0 for what `play3d` makes, and for a model
     * whatever its geometry says, as for a figure that stands on its place.
     */
    readonly middleX: number;
    readonly middleY: number;
    readonly middleZ: number;
    [own: string]: unknown;
    /**
     * A thing of its own geometry and colour, or one of a model made elsewhere: then `half` and `middle` are its box,
     * and its colour is the model's own. Geometry passed directly is owned and released when the thing leaves;
     * an Object3D and its geometry and materials stay owned by their caller.
     */
    constructor(shape: Geometry3D | Object3D, color: number, half: readonly [number, number, number], middle?: readonly [number, number, number]);
    get x(): number;
    set x(value: number);
    /** Up. */
    get y(): number;
    set y(value: number);
    /** Towards the camera as the game starts; away from it is less. */
    get z(): number;
    set z(value: number);
    /** Turns about its own axes, in degrees. */
    get rotationX(): number;
    set rotationX(value: number);
    get rotationY(): number;
    set rotationY(value: number);
    get rotationZ(): number;
    set rotationZ(value: number);
    /** Its size as a share of the size it was made with; setting it sets all three of the ones below. */
    get scale(): number;
    set scale(value: number);
    get scaleX(): number;
    set scaleX(value: number);
    get scaleY(): number;
    set scaleY(value: number);
    get scaleZ(): number;
    set scaleZ(value: number);
    get visible(): boolean;
    set visible(value: boolean);
    /** Its colour, `0xRRGGBB`. What is not a colour is not taken; a model keeps the colours it has. */
    get color(): number;
    set color(value: number);
    /** Whether `game.remove` has taken it out of the world. Setting it afterwards does nothing that is seen. */
    get removed(): boolean;
    /** Used by game removal and teardown; only resources made for this thing are retired. */
    leave(): void;
}
/** The camera: where it is and what it looks at, by plain numbers. */
export interface PlayCamera3D {
    x: number;
    y: number;
    z: number;
    /** The angle it sees from top to bottom, in degrees. */
    fov: number;
    /** Turns it to look at a point. It goes on looking there as it moves. */
    lookAt(x: number, y: number, z: number): void;
    readonly node: Camera3D;
}
export interface PlayFollow3D {
    /** Where the camera stays from the thing: 0, 4 and 8 unless given, which is above and behind. */
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
    /** How quickly it catches up: 6 unless given; 0 keeps it exactly there. */
    readonly smooth?: number;
    /**
     * Turns the place of the camera with the thing's `rotationY`, so that it stays behind a car or a figure that turns:
     * `{ y: 3, z: 7, turn: true }` is above and behind whichever way the thing faces. False unless given.
     */
    readonly turn?: boolean;
}
export interface PlayBurst3D {
    readonly color?: number;
    readonly count?: number;
    readonly speed?: number;
    readonly life?: number;
    readonly size?: number;
    readonly gravity?: number;
}
type Body = PlayThing3D | DisplayObject;
/** What `play3d` gives: everything `play` gives for the interface and the game's time, and a world of things. */
export interface Play3DGame extends Omit<PlayGame, 'remove' | 'near' | 'overlaps' | 'hits' | 'hitsAll' | 'pushOut' | 'burst' | 'shake' | 'onTap'> {
    readonly scene: Scene3D;
    readonly camera: PlayCamera3D;
    /** The light of the day. It keeps its direction and stays over what the camera looks at. */
    readonly sun: Light3D;
    /** The World3D app under the game, for what this does not cover. */
    readonly app: World3DApp;
    /** A box of this width, height and depth, its middle at the place given. */
    box(width: number, height: number, depth: number, color: number, at?: PlayPlace3D): PlayThing3D;
    /** A ball. */
    sphere(radius: number, color: number, at?: PlayPlace3D): PlayThing3D;
    /** A cylinder standing on its end. */
    cylinder(radius: number, height: number, color: number, at?: PlayPlace3D): PlayThing3D;
    /** A cone standing on its base. */
    cone(radius: number, height: number, color: number, at?: PlayPlace3D): PlayThing3D;
    /** A square floor of this size whose top is at the height given, 0 unless said. */
    ground(size: number, color: number, y?: number): PlayThing3D;
    /**
     * Makes a model of your own a thing of the world: a mesh of your geometry, a group, or what `loadGltf3D` gave.
     * Its box for the tests is worked out from its geometry; it keeps its own materials.
     */
    add(model: Object3D, at?: PlayPlace3D): PlayThing3D;
    /**
     * Calls the function when the thing is tapped or clicked, by a ray from the camera through the pointer; the
     * nearest thing hit gets it. A sprite of the interface is given to `onTap` of `play` as before.
     */
    onTap(target: PlayThing3D | DisplayObject, callback: () => unknown): void;
    /** Takes a thing out of the world, or a sprite off the interface. */
    remove(body: Body): void;
    /** Whether the middles of two things are within a distance: the sum of their radii unless given. */
    near(a: Body, b: Body, distance?: number): boolean;
    /** Whether two things overlap, taken as upright boxes. */
    overlaps(a: Body, b: Body, shrink?: number): boolean;
    hits<T extends Body>(a: Body, others: readonly T[], shrink?: number): T | undefined;
    hitsAll<T extends Body>(a: Body, others: readonly T[], shrink?: number): T[];
    /**
     * How far to move thing `a` so it no longer overlaps thing `b`, by the shortest way out: one of x, y and z is not
     * 0. Undefined when they do not overlap. A `y` above 0 means `a` stands on `b`.
     */
    pushOut(a: PlayThing3D, b: PlayThing3D): {
        x: number;
        y: number;
        z: number;
    } | undefined;
    /** Keeps the camera by a thing and looking at it; without a thing, lets the camera be. */
    follow(thing?: PlayThing3D, where?: PlayFollow3D): void;
    /** Shakes the camera by up to this many units of the world. */
    shake(amount?: number, seconds?: number): void;
    /** Throws small pieces out from a point of the world. */
    burst(x: number, y: number, z: number, options?: PlayBurst3D): void;
}
export interface Play3DOptions extends Omit<PlayOptions, 'setup' | 'update' | 'canvas'> {
    readonly setup?: (game: Play3DGame) => void | Promise<void>;
    readonly update?: (seconds: number, game: Play3DGame) => void;
}
/** How far two things overlap on each axis; all three are above 0 when they overlap. */
export declare function overlap3D(a: PlayThing3D, b: PlayThing3D, shrink?: number): [number, number, number];
/**
 * The box of a model, in its own units and about its own place: half its size and where its middle is. Every mesh
 * under it counts, placed as it is under it; the model's own place, turn and scale do not.
 */
export declare function modelBox3D(model: Object3D): {
    half: [number, number, number];
    middle: [number, number, number];
};
/** The move that takes `a` out of `b` by the shortest way, or undefined when they are apart. */
export declare function pushOut3D(a: PlayThing3D, b: PlayThing3D): {
    x: number;
    y: number;
    z: number;
} | undefined;
/** Starts a 3D game in the page. See the guide `play3d.md`. */
export declare function play3d(options: Play3DOptions): Promise<Play3DGame>;
export {};
//# sourceMappingURL=BrowserPlay3D.d.ts.map