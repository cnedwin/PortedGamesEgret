/**
 * One physical control, written as a short string:
 * `Key:KeyW` (a `KeyboardEvent.code`), `Mouse:0` (a button number), `Pad:a` or `Pad:7` (a standard gamepad button
 * name or number), `Pad:leftStick` / `Pad:rightStick` (a stick, for vector actions), `Pad:leftStickX+` (one half of a
 * stick axis, for buttons and axes), and `Touch:<name>` for an on-screen control.
 */
export type InputBinding = string;
/** Whether an action is a button, one axis, or a vector of two. */
export type InputActionKind = 'button' | 'axis' | 'vector';
/** An action and the controls that drive it. */
export interface InputActionDefinition {
    /** `button` (the default) is pressed or not; `axis` runs from -1 to 1; `vector` is a direction of length up to 1. */
    readonly kind?: InputActionKind;
    /** For a button: any of these presses it. */
    readonly bindings?: readonly InputBinding[];
    /** For an axis: controls that push it negative and positive. */
    readonly negative?: readonly InputBinding[];
    readonly positive?: readonly InputBinding[];
    /** For a vector: controls for each direction, and sticks or touch sticks that give the whole vector. */
    readonly up?: readonly InputBinding[];
    readonly down?: readonly InputBinding[];
    readonly left?: readonly InputBinding[];
    readonly right?: readonly InputBinding[];
    readonly sticks?: readonly InputBinding[];
    /** Analog input below this is taken as nothing. Defaults to 0.2. */
    readonly deadZone?: number;
}
/** Actions by name, with the controls that drive each. */
export type InputActionMap = Readonly<Record<string, InputActionDefinition>>;
/** A slot of an action that a binding can be put in: `bindings`, `negative`, `positive`, `up`, ... */
export type InputBindingSlot = 'bindings' | 'negative' | 'positive' | 'up' | 'down' | 'left' | 'right' | 'sticks';
/** The value of a vector action, each axis -1 to 1. */
export interface InputVector {
    readonly x: number;
    readonly y: number;
}
/** Named actions driven by keys, buttons and sticks: what is pressed now, values, rebinding and saving. */
export interface InputActions {
    /** The names of the actions, in the order they were defined. */
    readonly names: readonly string[];
    /** A control was pressed, or moved to `value` (0 to 1). Unknown controls are ignored. */
    press(binding: InputBinding, value?: number): void;
    release(binding: InputBinding): void;
    /** A stick or touch stick points at x, y (each -1 to 1, y down). */
    setStick(binding: InputBinding, x: number, y: number): void;
    /** Lets every control go, as when the page loses focus. */
    releaseAll(): void;
    /** True while a button action is held. */
    pressed(action: string): boolean;
    /** True on the frame a button action went down, or up. */
    justPressed(action: string): boolean;
    justReleased(action: string): boolean;
    /** An axis action from -1 to 1, or a button action as 0 or 1. */
    value(action: string): number;
    /** A vector action, of length at most 1; y is down. */
    vector(action: string): InputVector;
    /** Ends the frame: the "just" states are cleared. Call once a frame after the game read its input. */
    endFrame(): void;
    /** The controls of one slot of an action. */
    bindingsOf(action: string, slot?: InputBindingSlot): readonly InputBinding[];
    /** Puts `binding` at `index` of a slot (appending when `index` is the slot's length) and takes it off any other action. */
    rebind(action: string, binding: InputBinding, options?: {
        readonly slot?: InputBindingSlot;
        readonly index?: number;
    }): void;
    /** Back to the bindings the map was made with. */
    resetBindings(): void;
    /** The bindings that differ from the map, as plain data to save. */
    saveBindings(): InputBindingsSave;
    /** Applies saved bindings; unknown actions and malformed entries are skipped. */
    loadBindings(saved: unknown): void;
    /** Told after each press or release that changed an action, with the action's name. */
    subscribe(listener: (action: string, pressed: boolean) => void): () => void;
    /** The control last pressed, for a "press a key" rebinding screen; undefined after `endFrame` until another. */
    readonly lastPressed: InputBinding | undefined;
}
/** Bindings as saved, to load back with `loadBindings`. */
export interface InputBindingsSave {
    readonly version: 1;
    readonly actions: Readonly<Record<string, Partial<Record<InputBindingSlot, readonly InputBinding[]>>>>;
}
/** Makes the actions of `map`. */
export declare function createInputActions(map: InputActionMap): InputActions;
/** A readable name for a binding, for settings screens: `Key:KeyW` is `W`, `Mouse:0` is `Left button`. */
export declare function describeInputBinding(binding: InputBinding): string;
//# sourceMappingURL=inputActions.d.ts.map