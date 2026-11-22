import type { DisplayObject } from '@egret/runtime';
import { play } from '../play.js';
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
    /**
     * How much it shines with its own colour, lit or not: 0 (the default) not at all, 1 as bright as its colour,
     * more for a lamp or a screen. A thing that glows is not hidden by fog. A model keeps the materials it has.
     */
    get glow(): number;
    set glow(value: number);
    /**
     * How much of it is seen, 0 to 1: 1 (the default) is solid, less lets what is behind it show through, as glass, a
     * ghost or, with `glow`, a beam of light, whose light is added to what is behind it. A see-through thing casts no
     * shadow. A model keeps the materials it has.
     */
    get opacity(): number;
    set opacity(value: number);
    /** Whether `game.remove` has taken it out of the world. Setting it afterwards does nothing that is seen. */
    get removed(): boolean;
    /** Used by game removal and teardown; only resources made for this thing are retired. */
    leave(): void;
}
/**
 * A lamp: light from a point of the world that fades out by `range`. It is placed and changed by plain numbers, and
 * `game.remove` puts it out. Up to eight are lit fully; more are lit by a coarser way.
 */
export declare class PlayLamp3D {
    #private;
    readonly node: Light3D;
    constructor(color: number, intensity: number, range: number);
    get x(): number;
    set x(value: number);
    get y(): number;
    set y(value: number);
    get z(): number;
    set z(value: number);
    get color(): number;
    set color(value: number);
    /** How bright it is; 0 is dark. */
    get intensity(): number;
    set intensity(value: number);
    /** How far it reaches before it has faded out, in units of the world. */
    get range(): number;
    set range(value: number);
    get visible(): boolean;
    set visible(value: boolean);
    get removed(): boolean;
    leave(): void;
}
/** A lamp to light: how bright, and how far it reaches. */
export interface PlayLampOptions3D {
    /** How bright it is: 4 unless given. */
    readonly intensity?: number;
    /** How far it reaches: 8 unless given. */
    readonly range?: number;
}
/** What falls from the sky: snow, rain, or nothing. */
export type PlayWeather3D = 'snow' | 'rain' | 'none';
/** Weather to show: how much rain or snow. */
export interface PlayWeatherOptions3D {
    /** How much falls: 1 unless given, from 0 to 3. */
    readonly amount?: number;
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
/** How the camera follows: where it sits behind, how smoothly, and whether it turns with the target. */
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
    /**
     * How far above the thing the camera looks: 0 unless given. A tall tower or a sky the thing moves under is framed by
     * looking higher; the camera keeps its place.
     */
    readonly lookY?: number;
}
/** A burst of particles: its color and count, how fast and how long they fly, their size and gravity. */
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
export type PlayLookName3D = 'day' | 'dusk' | 'night' | 'fog' | 'snow';
/** How a 3D play game looks: its background and sky, its ground, its light and sun, and its fog. */
export interface PlayLook3D {
    /** What is behind everything, and the colour of the fog. */
    readonly background?: number;
    /** The colour of the light from above. */
    readonly sky?: number;
    /** The colour of the light from below. */
    readonly ground?: number;
    /** How strong the light from above and below is, 0 to 16: 0.22 at night, 0.9 by day. */
    readonly light?: number;
    /** The colour of the sun. */
    readonly sun?: number;
    /** How strong the sun is, 0 to 16: 0.35 at night, 2.4 by day. */
    readonly sunIntensity?: number;
    /** The side the sun shines from, as `[x, y, z]`; y up. */
    readonly sunFrom?: readonly [number, number, number];
    /** How thick the air is: 0 is clear, 0.02 a haze, 0.06 a fog. */
    readonly fog?: number;
}
/** The looks every game is given, by name. */
export declare const PLAY_LOOKS_3D: Readonly<Record<PlayLookName3D, Required<PlayLook3D>>>;
/** Everything a small 3D game is given: its scene and camera, its input, and calls that make, move and light things. */
export interface Play3DGame extends Omit<PlayGame, 'remove' | 'near' | 'overlaps' | 'hits' | 'hitsAll' | 'pushOut' | 'burst' | 'shake' | 'onTap'> {
    readonly scene: Scene3D;
    readonly camera: PlayCamera3D;
    /** The light of the day. It keeps its direction and stays over what the camera looks at. */
    readonly sun: Light3D;
    /** The World3D app under the game, for what this does not cover. */
    readonly app: World3DApp;
    /**
     * The light and air of the world: `'day'`, `'dusk'`, `'night'`, `'fog'` or `'snow'`, or the parts of one to change:
     * `{ background, sky, ground, light, sun, sunIntensity, sunFrom, fog }`, colours as `0xRRGGBB`, `sunFrom` the side
     * the sun shines from as `[x, y, z]`, and `fog` its thickness, 0 for none. A restart keeps it.
     */
    look(look: PlayLookName3D | PlayLook3D): void;
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
    /** Takes a thing or a lamp out of the world, or a sprite off the interface. */
    remove(body: Body | PlayLamp3D): void;
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
    /**
     * Makes things one: a group that is placed, turned, scaled, tweened and tested as one thing, with the things in
     * it where they are within it. Their places are now from the group's place, which is `at`, 0 unless given. Test
     * the group, not its parts, for overlaps; removing the group removes its parts.
     */
    group(parts: readonly PlayThing3D[], at?: PlayPlace3D): PlayThing3D;
    /** A lamp at a place: light of a colour that fades out by its range. */
    lamp(color: number, at?: PlayPlace3D, options?: PlayLampOptions3D): PlayLamp3D;
    /**
     * Snow or rain falling around what the camera looks at, or `'none'` to stop it. `{ amount }` is how much, 1
     * unless given. A restart keeps it.
     */
    weather(kind: PlayWeather3D, options?: PlayWeatherOptions3D): void;
}
/** A small 3D game to start: its setup and update, and the options of a 2D play game. */
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
interface Play3DSurface {
    readonly ready?: Promise<World3DApp>;
    show?(scene: Scene3D, camera: Camera3D): void;
    unplace?(): void;
    remove?(): void;
}
/** Starts a 3D game in the page. See the guide `play3d.md`. */
export declare function play3d(options: Play3DOptions): Promise<Play3DGame>;
/** Internal host entry. The flat session owns input and UI; the surface presents the original scene. */
export declare function createPlay3DSession(options: Play3DOptions, startFlat: typeof play, attach: (given: PlayGame, options: Play3DOptions) => Play3DSurface): Promise<Play3DGame>;
export {};
//# sourceMappingURL=BrowserPlay3D.d.ts.map