import type { RenderFrame2D, TexturedRenderFrame2D } from '@egret/contracts';
import type { SceneFrame3D } from '../rendering/scene3d.js';
import type { WebGPUHost, WebGPUHostOptions, WebGPUHostStatus, TexturedWebGPUHost, TexturedWebGPUHostOptions } from './webgpu.js';
export type { TexturedWebGPUHostOptions } from './webgpu.js';
export type SceneWebGPUHostOptions = WebGPUHostOptions;
export interface SceneWebGPUHostStatus {
    readonly host: WebGPUHostStatus;
    readonly pendingSceneBytes: number;
    readonly pendingUniformBytes: number;
    readonly pendingDepthBytes: number;
}
export interface SceneWebGPUHost extends WebGPUHost {
    renderSceneFrame(scene: SceneFrame3D, overlay: RenderFrame2D): undefined;
    getSceneStatus(): SceneWebGPUHostStatus;
}
export interface TexturedSceneWebGPUHost extends TexturedWebGPUHost, SceneWebGPUHost {
    renderSceneTexturedFrame(scene: SceneFrame3D, overlay: TexturedRenderFrame2D): undefined;
}
export declare function createSceneWebGPUHost(options: SceneWebGPUHostOptions): SceneWebGPUHost;
/** Own the scene and captured textured overlay through one explicit host. */
export declare function createTexturedSceneWebGPUHost(options: TexturedWebGPUHostOptions): TexturedSceneWebGPUHost;
export { createSharedSceneWebGPUHost } from './sharedB1.js';
export type { SharedSceneWebGPUHost, SharedSceneWebGPUHostOptions } from './WebGPUHost.js';
export type { SharedDeviceSessionState, SharedDeviceSessionStatus, SharedHostResourceStatus } from './sharedDeviceSession.js';
export type { SharedFrameUploadOptions, SharedFrameUploadReady, SharedFrameSubmission, SharedFrameUpload } from './sharedFrameUpload.js';
//# sourceMappingURL=scene3d.d.ts.map