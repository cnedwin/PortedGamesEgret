import type { TexturedRenderFrame2D, SharedRenderFrame2D } from '@egret/contracts';
/** Engine-only commit after every owned table, command and record is frozen. */
export declare function registerTexturedFrame(frame: TexturedRenderFrame2D): void;
/** Identity lookup reads no caller field and grants no resource/GPU authority. */
export declare function readOwnedTexturedFrame(value: unknown): TexturedRenderFrame2D | undefined;
export declare function registerSharedFrame(frame: SharedRenderFrame2D): void;
export declare function readOwnedSharedFrame(value: unknown): SharedRenderFrame2D | undefined;
//# sourceMappingURL=texturedFrameState.d.ts.map