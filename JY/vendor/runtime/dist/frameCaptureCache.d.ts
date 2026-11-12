import type { ClipRectangle2D, Matrix2D, Rectangle2D } from '@egret/contracts';
import type { DisplayObject } from './DisplayObject.js';
import type { Stage } from './Stage.js';
import type { VisualState } from './displayVisualState.js';
/** Collector-owned numeric links; no link refers back to a display node. */
export interface CaptureClipChain {
    readonly previous: CaptureClipChain | undefined;
    readonly clip: ClipRectangle2D;
    readonly depth: number;
}
export type CaptureProfile = 'ordinary' | 'textured';
export interface CaptureDerived {
    readonly matrix: Matrix2D;
    readonly ordinaryClips: readonly ClipRectangle2D[] | undefined;
    readonly texturedClips: CaptureClipChain | undefined;
    readonly commandClips: readonly ClipRectangle2D[] | undefined;
    readonly rectangles: readonly Rectangle2D[];
    readonly bitmapMatrix: Matrix2D | undefined;
    readonly bitmapRect: Rectangle2D | undefined;
    readonly textRect: Rectangle2D | undefined;
    readonly meshChecked: boolean;
}
interface MutableDerived {
    matrix: Matrix2D | undefined;
    ordinaryClips: readonly ClipRectangle2D[] | undefined;
    texturedClips: CaptureClipChain | undefined;
    commandClips: readonly ClipRectangle2D[] | undefined;
    rectangles: Rectangle2D[];
    bitmapMatrix: Matrix2D | undefined;
    bitmapRect: Rectangle2D | undefined;
    textRect: Rectangle2D | undefined;
    meshChecked: boolean;
}
interface CaptureKey {
    structure: number;
    transform: number;
    appearance: number;
    content: number;
    binding: number;
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
    alpha: number;
    ordinaryClips: readonly ClipRectangle2D[] | undefined;
    texturedClips: CaptureClipChain | undefined;
}
interface NodeSlots {
    ordinary: CaptureDraft | undefined;
    textured: CaptureDraft | undefined;
}
interface CacheOwner {
    closed: boolean;
    entries: number;
    bytes: number;
    head: CaptureDraft | undefined;
    tail: CaptureDraft | undefined;
}
export interface CaptureSession {
    readonly owner: CacheOwner;
    readonly profile: CaptureProfile;
    active: boolean;
    head: CaptureDraft | undefined;
    tail: CaptureDraft | undefined;
}
/** A bounded pending entry contains values and weak-index cells, never their key. */
export interface CaptureDraft {
    readonly owner: CacheOwner;
    readonly slots: NodeSlots;
    readonly profile: CaptureProfile;
    session: CaptureSession | undefined;
    key: CaptureKey | undefined;
    data: MutableDerived | undefined;
    seen: Set<object> | undefined;
    bytes: number;
    ready: boolean;
    complete: boolean;
    linked: boolean;
    replacedWithoutHit: boolean;
    previous: CaptureDraft | undefined;
    next: CaptureDraft | undefined;
    pendingPrevious: CaptureDraft | undefined;
    pendingNext: CaptureDraft | undefined;
}
/** Optional metadata allocation cannot turn an otherwise valid capture into a refusal. */
export declare function beginCaptureSession(stage: Stage, profile: CaptureProfile): CaptureSession | undefined;
export declare function readCaptureDerived(session: CaptureSession | undefined, node: DisplayObject, state: VisualState, parent: Matrix2D, alpha: number, ordinaryClips: readonly ClipRectangle2D[] | undefined, texturedClips: CaptureClipChain | undefined): CaptureDerived | undefined;
export declare function beginCaptureNode(session: CaptureSession | undefined, node: DisplayObject, state: VisualState, parent: Matrix2D, alpha: number, ordinaryClips: readonly ClipRectangle2D[] | undefined, texturedClips: CaptureClipChain | undefined): CaptureDraft | undefined;
export declare function rememberCaptureBase(entry: CaptureDraft | undefined, matrix: Matrix2D, ordinaryClips: readonly ClipRectangle2D[] | undefined, texturedClips: CaptureClipChain | undefined): void;
export declare function rememberCaptureRectangle(entry: CaptureDraft | undefined, rect: Rectangle2D): void;
export declare function rememberCaptureClips(entry: CaptureDraft | undefined, clips: readonly ClipRectangle2D[]): void;
export declare function rememberCaptureBitmap(entry: CaptureDraft | undefined, matrix: Matrix2D, rect: Rectangle2D): void;
export declare function rememberCaptureText(entry: CaptureDraft | undefined, rect: Rectangle2D): void;
export declare function rememberCaptureMesh(entry: CaptureDraft | undefined): void;
export declare function completeCaptureNode(entry: CaptureDraft | undefined, state: VisualState): void;
export declare function publishCaptureSession(session: CaptureSession | undefined): void;
export declare function abandonCaptureSession(session: CaptureSession | undefined): void;
/** Mutation/terminal paths only release numeric derived values; no allocation or callback. */
export declare function invalidateCaptureNode(node: DisplayObject): void;
export declare function clearCaptureStage(stage: Stage): void;
export {};
//# sourceMappingURL=frameCaptureCache.d.ts.map