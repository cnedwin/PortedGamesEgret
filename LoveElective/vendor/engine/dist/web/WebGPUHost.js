import { SHARED_FRAME_PROFILE_2D } from '@egret/contracts';
import { admitSharedWebGPUOptions } from './sharedWebGPUOptions.js';
import { prepareSharedDraws2D, SharedPreparationError } from '../rendering/prepareSharedDraws2D.js';
import { planSharedSubmission2D, packSharedSubmission2D, materializeSharedPages2D, checkSharedCapacity2D, SharedStorageError2D } from './prepareSharedSubmission2D.js';
import { attachSharedSceneSources2D, packSharedSceneCardUniform3D, packSharedSceneLambertUniform3D } from './sharedSubmissionStorage2D.js';
import { prepareSharedBatches2D } from '../rendering/preparedSharedBatches2D.js';
import { decodeSharedSRGB } from '../rendering/sharedColor2D.js';
import { createSharedWebGPUPipeline, SHARED_BLENDS } from './webgpuSharedPass.js';
import { createSharedEffectPipeline, EFFECT_PASSES } from './sharedEffectShaders.js';
import { createSharedResolvePipeline } from './webgpuSharedResolvePass.js';
import { createWebGPURetentionPool } from './webgpuRetentionPool.js';
import { readOwnedTexturedFrame, readOwnedSharedFrame } from '#egret-textured-frame-state';
import { IMAGE_LIMITS_2D, TEXTURED_FRAME_PROFILE_2D } from '@egret/contracts';
import { EgretError } from '@egret/runtime';
import { copyMixedFrame2D } from '../rendering/copyMixedFrame2D.js';
import { FrameCopyError, FrameInputReadError } from '../rendering/copyFrame2D.js';
import { GeometryPreparationError } from '../rendering/prepareRectangles2D.js';
import { prepareMixedDraws2D } from '../rendering/prepareMixedDraws2D.js';
import { PreparedBatchScratch2D, prepareAdjacentBatches2D } from '../rendering/preparedBatches2D.js';
import { PreparedFrameCache2D } from '../rendering/preparedFrameCache2D.js';
import { ImagePackingAllocationError, packImageVertices2D } from '../rendering/packImageVertices2D.js';
import { packWebGPUVertices, WebGPUPackingError, createWebGPURectanglePipeline, encodeWebGPURectangles } from './webgpuPass.js';
import { createWebGPUImagePipeline, encodeWebGPUImage } from './webgpuImagePass.js';
import { ImageProjectionError, planImageProjections, copyProjectionPixels } from './imageProjections2D.js';
import { observed, deferred, cleanupWebGPUBuffer, cleanupWebGPUTexture, observeWebGPUDeviceLoss, observeAuthenticatedWebGPUDeviceLoss } from './webgpuLifetime.js';
import { admitTexturedFrame2D, TexturedFrameAdmissionError2D } from '../rendering/admitTexturedFrame2D.js';
import { prepareTexturedDraws2D } from '../rendering/prepareTexturedDraws2D.js';
import { TexturedPreparationBudget2D } from '../rendering/texturedPreparationBudget2D.js';
import { TexturedMeshPackingAllocationError } from '../rendering/packTexturedMesh2D.js';
import { runOwnedPreparationScope } from '../rendering/ownedPreparationFailure2D.js';
import { planTexturedImageProjections } from './imageProjections2D.js';
import { planTexturedSubmissionStorage2D, packTexturedDrawPayloads2D, materializeTexturedSubmission2D, isTexturedSubmissionAdmissionError2D } from './prepareTexturedSubmission2D.js';
import { admitTexturedWebGPUOptions } from './texturedWebGPUOptions.js';
import { createWebGPUTexturedPipeline } from './webgpuTexturedPass.js';
import { createWebGPUBindingCache } from './webgpuBindingCache.js';
const DEVICE_LIMIT_KEYS = ['maxTextureDimension2D', 'maxBufferSize', 'maxVertexBuffers', 'maxVertexAttributes', 'maxVertexBufferArrayStride', 'maxColorAttachments', 'maxColorAttachmentBytesPerSample', 'maxBindGroups', 'maxBindingsPerBindGroup', 'maxSampledTexturesPerShaderStage', 'maxSamplersPerShaderStage', 'maxUniformBuffersPerShaderStage', 'maxUniformBufferBindingSize', 'maxBindGroupsPlusVertexBuffers', 'maxInterStageShaderVariables'];
const DEFAULTS = { pixelRatio: 1, maxBackingPixels: 16777216, maxCommands: 65536, maxClipRectangles: 262144, maxPreparedVertices: 1048576, maxClipEdgeTests: 4194304, maxUploadBytes: 33554432, maxPendingUploadBytes: 67108864, maxPendingFrames: 2, maxReadbackBytes: 67108864, enableReadback: false };
function error(code, cause) { return new EgretError(code, { cause }); }
/** Private control-flow origin; callers receive only publicError, never this signal. */
class ClassifiedWebGPUFailure {
    code;
    original;
    publicError;
    constructor(code, original = undefined, publicError = error(code, original)) {
        this.code = code;
        this.original = original;
        this.publicError = publicError;
    }
}
function isObject(value) { return typeof value === 'object' && value !== null; }
// Neither an options field nor a caller-supplied callback selects this mode.
const SHARED_MODE = Symbol('owned shared host mode'), SHARED_SCENE_MODE = Symbol('owned shared scene mode');
const SHARED_OPTIONS = new WeakMap();
const SHARED_SCENE_OWNERS = new WeakSet();
const B1_MODE = Symbol('owned B1 host mode');
const TEXTURED_MODE = Symbol('owned textured host mode');
const TEXTURED_SCENE_MODE = Symbol('owned textured scene host mode');
const TEXTURED_OWNERS = new WeakSet();
const TEXTURED_OPTIONS = new WeakMap();
const B1_PROTOCOL_FIELDS = ['version', 'createSceneFrame3D', 'isSceneFrame3D', 'getScene3DErrorOrigin', 'packMeshGeometry3D', 'getMeshPacking3DErrorOrigin', 'createWebGPUMeshPipeline', 'encodeWebGPUMesh'];
const CARD_UNIFORM_BYTES = 112;
const LAMBERT_UNIFORM_BYTES = 128;
const B1_LIMITS = { draws: 64, geometries: 64, cpu: 8388608, scene: 4194304, pendingScene: 8388608, uniform: 4096, pendingUniform: 8192, depth: 16777216, pendingDepth: 33554432 };
const B1_OWNERS = new WeakSet();
const B1_FUNCTIONS = new WeakMap();
/** The sole lifecycle/submission authority; resource helpers only record settled ownership. */
class WebGPUHostImplementation {
    surface;
    options;
    borrowed;
    borrowedPolicy = false;
    callback;
    state = 'new';
    starting;
    startingPending = false;
    closing;
    busy = false;
    cpu = deferred();
    firstFailure = null;
    callbackFailureCount = 0;
    lastCallbackFailure = null;
    cleanupOutcome = 'not-started';
    unsafeCause;
    unsafe = false;
    finalizing = false;
    lastSerial = 0;
    pendingUploadBytes = 0;
    pendingReadbackBytes = 0;
    pendingTextureBytes = 0;
    pendingGeometryBytes = 0;
    pendingColorBytes = 0;
    pendingCanonicalBytes = 0;
    pendingSceneBytes = 0;
    pendingUniformBytes = 0;
    pendingDepthBytes = 0;
    ledger = new Set();
    batchScratch = new PreparedBatchScratch2D();
    preparationCache = new PreparedFrameCache2D();
    // Fixed-size observations only; original records/native owners still authorize every transition.
    resourceCpu = { canonicalBytes: 0, scratchBytes: 0, highCanonicalBytes: 0, highScratchBytes: 0, highTemporaryBytes: 0, saturated: false };
    resourceUnknown = { knownLogicalBytes: 0, objects: 0, highKnownLogicalBytes: 0, highObjects: 0, saturated: false };
    resourceReuse = { current: { idleBytes: 0, idleEntries: 0, leasedBytes: 0, leasedEntries: 0, reservedBytes: 0, reservedEntries: 0, detachedBytes: 0, detachedEntries: 0, unknownBytes: 0, unknownEntries: 0 }, highWater: { idleBytes: 0, idleEntries: 0, leasedBytes: 0, leasedEntries: 0, reservedBytes: 0, reservedEntries: 0, detachedBytes: 0, detachedEntries: 0, unknownBytes: 0, unknownEntries: 0 }, saturated: false };
    resourceHighPending = { frames: 0, uploadCreditBytes: 0, pageCreditBytes: 0, readbackCreditBytes: 0, geometryCreditBytes: 0, colorCreditBytes: 0, sceneCreditBytes: 0, uniformCreditBytes: 0, depthCreditBytes: 0 };
    resourceHighImages = { readyBytes: 0, readyEntries: 0, pinnedReadyBytes: 0, pinnedReadyEntries: 0, allocatedLogicalBytes: 0, reservedCreditBytes: 0 };
    resourceTotals = { pageWriteCalls: 0, pageWriteBytes: 0, readyCapacityEvictions: 0 };
    resourceSaturated = false;
    resourceReadyBytes = 0;
    resourcePinnedBytes = 0;
    resourcePinnedEntries = 0;
    imageEpoch = {};
    bufferPool = createWebGPURetentionPool(this.imageEpoch, this.resourceReuse);
    bindingCache = createWebGPUBindingCache(this.imageEpoch);
    // Detached allocations retain an explicit owner even when an earlier native
    // destroy throws. Unknown destruction is charged permanently and never retried.
    bufferCleanup = new Set();
    closingBuffers = [];
    imageEnabled = false;
    imageRevision = {};
    imageDirectory = new WeakMap();
    imageOldest;
    imageNewest;
    readyCount = 0;
    allocatedImageBytes = 0;
    reservedImageBytes = 0;
    imageCleanup = new Set();
    ticket;
    device;
    destroyDevice;
    context;
    configure;
    unconfigure;
    currentTexture;
    configured = false;
    format = 'rgba8unorm';
    limits = { maxTextureDimension2D: 0, maxBufferSize: 0 };
    pipeline;
    imagePipeline;
    imageLayout;
    texturedPipeline;
    texturedLayout;
    meshPipeline;
    meshLayout;
    cardPipeline;
    cardLayout;
    texturedSceneMeshPipeline;
    texturedSceneMeshLayout;
    lambertMeshPipeline;
    lambertMeshLayout;
    sampler;
    sharedPipelines = new Map();
    sharedSamplers = new Map();
    effectPipelines = new Map();
    resolvePipeline;
    resolveLayout;
    push;
    pop;
    write;
    writeTexture;
    submit;
    fence;
    buffer;
    texture;
    bindGroup;
    encoder;
    removeListener;
    // Pending borrowed device.lost retains only this detachable cell after lease return.
    lossCell = {};
    generation = 0;
    attempt = 0;
    episodeAttempts = 0;
    generationFailure = null;
    owner;
    usedDevices = new WeakSet();
    readiness;
    readinessPending = false;
    recoveryAttempt;
    stagePumpScheduled = false;
    cancelStagePump;
    monotonicNow;
    now() { this.monotonicNow ??= globalThis.performance.now.bind(globalThis.performance); return this.monotonicNow(); }
    timers;
    constructor(input, mode) {
        if (mode === SHARED_MODE || mode === SHARED_SCENE_MODE) {
            try {
                const admitted = admitSharedWebGPUOptions(input, mode === SHARED_SCENE_MODE);
                this.surface = admitted.surface;
                Object.defineProperty(this, 'surface', { writable: false, configurable: false });
                this.options = admitted.configuration;
                this.borrowed = admitted.borrowed;
                this.callback = admitted.callback;
                SHARED_OPTIONS.set(this, admitted.configuration);
            }
            catch (cause) {
                throw error('WEBGPU_OPTIONS_INVALID', cause);
            }
        }
        else if (mode === TEXTURED_MODE || mode === TEXTURED_SCENE_MODE) {
            try {
                const admitted = admitTexturedWebGPUOptions(input);
                this.surface = admitted.surface;
                Object.defineProperty(this, 'surface', { writable: false, configurable: false });
                this.options = admitted.configuration;
                this.borrowed = admitted.borrowed;
                this.callback = admitted.callback;
                TEXTURED_OPTIONS.set(this, admitted.configuration);
                TEXTURED_OWNERS.add(this);
            }
            catch (cause) {
                throw error('WEBGPU_OPTIONS_INVALID', cause);
            }
        }
        else {
            try {
                if (!isObject(input))
                    throw new TypeError('options');
                const canvas = input.canvas, policy = input.device, callback = input.onDiagnostic;
                if (!isObject(canvas))
                    throw new TypeError('canvas');
                let borrowed;
                if (policy !== undefined) {
                    if (!isObject(policy))
                        throw new TypeError('device policy');
                    const kind = policy.kind;
                    if (kind === 'borrow') {
                        const device = policy.device;
                        if (!isObject(device))
                            throw new TypeError('device');
                        borrowed = device;
                    }
                    else if (kind !== 'acquire')
                        throw new TypeError('device kind');
                }
                const values = {};
                for (const key of Object.keys(DEFAULTS)) {
                    const supplied = input[key], value = supplied === undefined ? DEFAULTS[key] : supplied;
                    if (key === 'enableReadback' ? typeof value !== 'boolean' : typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || (key !== 'pixelRatio' && !Number.isSafeInteger(value)))
                        throw new TypeError(key);
                    Object.defineProperty(values, key, { value, enumerable: true });
                }
                if (callback !== undefined && typeof callback !== 'function')
                    throw new TypeError('diagnostic callback');
                this.surface = canvas;
                Object.defineProperty(this, 'surface', { writable: false, configurable: false });
                this.options = Object.freeze(values);
                this.borrowed = borrowed;
                this.callback = callback;
            }
            catch (cause) {
                throw error('WEBGPU_OPTIONS_INVALID', cause);
            }
        }
        this.borrowedPolicy = this.borrowed !== undefined;
        if (mode === SHARED_MODE || mode === SHARED_SCENE_MODE) {
            Object.defineProperties(this, { sharedFrameProfile: { value: SHARED_FRAME_PROFILE_2D, enumerable: true },
                renderSharedFrame: { value: (frame) => this.renderSharedOwnedFrame(frame), enumerable: true },
                getSessionStatus: { value: () => Object.freeze({ state: this.state === 'active' ? 'ready' : this.state, generation: this.generation, attempt: this.attempt, firstFailure: this.firstFailure, generationFailure: this.generationFailure }), enumerable: true },
                whenReady: { value: () => this.sharedWhenReady(), enumerable: true }, recover: { value: (device) => this.recoverShared(device), enumerable: true },
                stageSharedFrame: { value: (frame, options) => this.renderSharedOwnedFrame(frame, undefined, { options, scene: false }), enumerable: true },
                getSharedStatus: { value: () => Object.freeze({ host: this.getStatus(), pendingGeometryBytes: this.pendingGeometryBytes, pendingColorBytes: this.pendingColorBytes, pendingCanonicalBytes: this.pendingCanonicalBytes, resources: this.resourceStatus() }), enumerable: true } });
            if (mode === SHARED_SCENE_MODE) {
                B1_OWNERS.add(this);
                SHARED_SCENE_OWNERS.add(this);
                Object.defineProperties(this, { renderSceneSharedFrame: { value: (scene, overlay) => this.renderSharedOwnedFrame(overlay, scene), enumerable: true },
                    stageSceneSharedFrame: { value: (scene, overlay, options) => this.renderSharedOwnedFrame(overlay, scene, { options, scene: true }), enumerable: true },
                    getSceneStatus: { value: () => Object.freeze({ host: this.getStatus(), pendingSceneBytes: this.pendingSceneBytes, pendingUniformBytes: this.pendingUniformBytes, pendingDepthBytes: this.pendingDepthBytes }), enumerable: true } });
            }
        }
        if (mode === B1_MODE || mode === TEXTURED_SCENE_MODE) {
            // Keep mode and the captured function table in module-owned weak
            // storage; no instance field exposes the token or a mutable registry.
            B1_OWNERS.add(this);
            // Same owner and inherited ordinary lifecycle. Scene methods are
            // own closures only on B1 instances; no ordinary prototype gains them.
            Object.defineProperties(this, {
                renderSceneFrame: { value: (scene, overlay) => this.render(overlay, scene), enumerable: true },
                getSceneStatus: { value: () => Object.freeze({ host: this.getStatus(), pendingSceneBytes: this.pendingSceneBytes, pendingUniformBytes: this.pendingUniformBytes, pendingDepthBytes: this.pendingDepthBytes }), enumerable: true },
            });
        }
        if (mode === TEXTURED_MODE || mode === TEXTURED_SCENE_MODE) {
            // Own immutable ports preserve the ordinary and B1 prototypes.
            Object.defineProperties(this, {
                texturedFrameProfile: { value: TEXTURED_FRAME_PROFILE_2D, enumerable: true },
                renderTexturedFrame: { value: (frame) => this.renderTexturedOwnedFrame(frame), enumerable: true },
                getTexturedStatus: { value: () => Object.freeze({ host: this.getStatus(), pendingGeometryBytes: this.pendingGeometryBytes }), enumerable: true },
            });
        }
        if (mode === TEXTURED_SCENE_MODE) {
            // Explicit opt-in owns both protocols and one submission authority.
            Object.defineProperty(this, 'renderSceneTexturedFrame', {
                value: (scene, overlay) => this.renderSceneTexturedOwnedFrame(scene, overlay),
                enumerable: true,
            });
        }
    }
    getStatus() { return Object.freeze({ state: this.state === 'lost' ? 'failed' : this.state === 'restoring' ? 'starting' : this.state, lastSerial: this.lastSerial, pendingFrames: this.ledger.size, pendingUploadBytes: this.pendingUploadBytes, pendingReadbackBytes: this.pendingReadbackBytes, firstFailure: this.firstFailure, callbackFailureCount: this.callbackFailureCount, lastCallbackFailure: this.lastCallbackFailure, cleanupOutcome: this.cleanupOutcome }); }
    sampleResourcePending() {
        this.resourceHighPending.frames = Math.max(this.resourceHighPending.frames, this.ledger.size);
        this.resourceHighPending.uploadCreditBytes = Math.max(this.resourceHighPending.uploadCreditBytes, this.pendingUploadBytes);
        this.resourceHighPending.pageCreditBytes = Math.max(this.resourceHighPending.pageCreditBytes, this.pendingTextureBytes);
        this.resourceHighPending.readbackCreditBytes = Math.max(this.resourceHighPending.readbackCreditBytes, this.pendingReadbackBytes);
        this.resourceHighPending.geometryCreditBytes = Math.max(this.resourceHighPending.geometryCreditBytes, this.pendingGeometryBytes);
        this.resourceHighPending.colorCreditBytes = Math.max(this.resourceHighPending.colorCreditBytes, this.pendingColorBytes);
        this.resourceHighPending.sceneCreditBytes = Math.max(this.resourceHighPending.sceneCreditBytes, this.pendingSceneBytes);
        this.resourceHighPending.uniformCreditBytes = Math.max(this.resourceHighPending.uniformCreditBytes, this.pendingUniformBytes);
        this.resourceHighPending.depthCreditBytes = Math.max(this.resourceHighPending.depthCreditBytes, this.pendingDepthBytes);
    }
    sampleResourceImages() {
        this.resourceHighImages.readyBytes = Math.max(this.resourceHighImages.readyBytes, this.resourceReadyBytes);
        this.resourceHighImages.readyEntries = Math.max(this.resourceHighImages.readyEntries, this.readyCount);
        this.resourceHighImages.pinnedReadyBytes = Math.max(this.resourceHighImages.pinnedReadyBytes, this.resourcePinnedBytes);
        this.resourceHighImages.pinnedReadyEntries = Math.max(this.resourceHighImages.pinnedReadyEntries, this.resourcePinnedEntries);
        this.resourceHighImages.allocatedLogicalBytes = Math.max(this.resourceHighImages.allocatedLogicalBytes, this.allocatedImageBytes);
        this.resourceHighImages.reservedCreditBytes = Math.max(this.resourceHighImages.reservedCreditBytes, this.reservedImageBytes);
    }
    resourceTotal(key, amount) {
        const old = this.resourceTotals[key];
        if (amount > Number.MAX_SAFE_INTEGER - old) {
            this.resourceTotals[key] = Number.MAX_SAFE_INTEGER;
            this.resourceSaturated = true;
        }
        else
            this.resourceTotals[key] = old + amount;
    }
    resourcePageWrite(bytes) { this.resourceTotal('pageWriteCalls', 1); this.resourceTotal('pageWriteBytes', bytes); }
    /** Read-only logical observations; no native call, callback or state transition. */
    resourceStatus() {
        return Object.freeze({
            current: Object.freeze({
                pending: Object.freeze({ frames: this.ledger.size, uploadCreditBytes: this.pendingUploadBytes, pageCreditBytes: this.pendingTextureBytes, readbackCreditBytes: this.pendingReadbackBytes, geometryCreditBytes: this.pendingGeometryBytes, colorCreditBytes: this.pendingColorBytes, sceneCreditBytes: this.pendingSceneBytes, uniformCreditBytes: this.pendingUniformBytes, depthCreditBytes: this.pendingDepthBytes }),
                cpu: Object.freeze({ canonicalBytes: this.resourceCpu.canonicalBytes, scratchBytes: this.resourceCpu.scratchBytes, temporaryBytes: this.resourceCpu.canonicalBytes + this.resourceCpu.scratchBytes }),
                images: Object.freeze({ readyBytes: this.resourceReadyBytes, readyEntries: this.readyCount, pinnedReadyBytes: this.resourcePinnedBytes, pinnedReadyEntries: this.resourcePinnedEntries, allocatedLogicalBytes: this.allocatedImageBytes, reservedCreditBytes: this.reservedImageBytes }),
                reusable: Object.freeze({ ...this.resourceReuse.current }),
                unknownNative: Object.freeze({ knownLogicalBytes: this.resourceUnknown.knownLogicalBytes, objects: this.resourceUnknown.objects }),
            }),
            highWater: Object.freeze({
                pending: Object.freeze({ ...this.resourceHighPending }),
                cpu: Object.freeze({ canonicalBytes: this.resourceCpu.highCanonicalBytes, scratchBytes: this.resourceCpu.highScratchBytes, temporaryBytes: this.resourceCpu.highTemporaryBytes }),
                images: Object.freeze({ ...this.resourceHighImages }),
                reusable: Object.freeze({ ...this.resourceReuse.highWater }),
                unknownNative: Object.freeze({ knownLogicalBytes: this.resourceUnknown.highKnownLogicalBytes, objects: this.resourceUnknown.highObjects }),
            }),
            totals: Object.freeze({ ...this.resourceTotals }),
            saturated: this.resourceSaturated || this.resourceCpu.saturated || this.resourceReuse.saturated || this.resourceUnknown.saturated,
        });
    }
    noteUnknownResource(resource) {
        if (resource.diagnosticUnknown || resource.settlement === 'destroyed' || resource.settlement === 'context-invalidated')
            return;
        resource.diagnosticUnknown = true;
        const bytes = resource.logicalByteLength ?? 0, state = this.resourceUnknown;
        if (bytes > Number.MAX_SAFE_INTEGER - state.knownLogicalBytes || state.objects === Number.MAX_SAFE_INTEGER)
            state.saturated = true;
        state.knownLogicalBytes = Math.min(Number.MAX_SAFE_INTEGER, state.knownLogicalBytes + bytes);
        state.objects = Math.min(Number.MAX_SAFE_INTEGER, state.objects + 1);
        state.highKnownLogicalBytes = Math.max(state.highKnownLogicalBytes, state.knownLogicalBytes);
        state.highObjects = Math.max(state.highObjects, state.objects);
    }
    noteUnknownRecord(record) {
        for (const resource of record.resources)
            this.noteUnknownResource(resource);
        for (const resource of record.textures)
            this.noteUnknownResource(resource);
        for (const lease of record.bufferLeases)
            if (lease)
                this.noteUnknownResource(lease.handle.resource);
        if (record.imageUse)
            for (const entry of record.imageUse.hits.values())
                if (entry.resource)
                    this.noteUnknownResource(entry.resource);
        if (record.shared)
            for (const raw of record.shared.rawTargets)
                if (raw.texture !== undefined)
                    this.noteUnknownResource(raw);
    }
    active() {
        if (this.state !== 'active')
            throw this.stateError();
    }
    stateError() { return error(this.state === 'stopped' ? 'WEBGPU_STOPPED' : this.state === 'closing' || this.state === 'closed' ? 'WEBGPU_CLOSED' : this.state === 'failed' ? 'WEBGPU_FAILED' : this.state === 'lost' || this.state === 'restoring' ? 'WEBGPU_DEVICE_LOST' : 'WEBGPU_NOT_STARTED', (SHARED_OPTIONS.get(this)?.recovery ? this.generationFailure : this.firstFailure)?.cause); }
    startupCancelled() {
        return this.state === 'stopped' || this.state === 'closing' || this.state === 'closed';
    }
    startupGate() {
        if (this.state === 'failed' && this.firstFailure) {
            throw new ClassifiedWebGPUFailure(this.firstFailure.code, this.firstFailure.cause);
        }
        if (this.state !== 'starting') {
            throw new ClassifiedWebGPUFailure('WEBGPU_START_CANCELLED', this.firstFailure?.cause);
        }
    }
    proofFailed(cause) { if (this.owner) {
        this.owner.unknown = true;
        this.noteUnknownResource(this.owner);
    } for (const record of this.ledger)
        this.noteUnknownRecord(record); this.preparationCache.clear(); this.invalidateImageResidency(); if (!this.unsafe) {
        this.unsafe = true;
        this.unsafeCause = cause;
    } }
    fail(code, cause, phase, serial, unsafe = false) {
        this.preparationCache.clear();
        this.invalidateImageResidency();
        const attempt = this.recoveryAttempt;
        const safeRecovery = attempt && !attempt.cancelled && this.state === 'restoring' && !unsafe && !this.unsafe;
        const failure = Object.freeze({ code, cause, phase: attempt ? 'device' : phase, serial });
        if (safeRecovery)
            attempt.failure ??= error(code, cause);
        if (unsafe) {
            if (this.owner)
                this.owner.unknown = true;
            this.proofFailed(cause);
        }
        if (this.firstFailure === null)
            this.firstFailure = failure;
        this.generationFailure = failure;
        if (this.state !== 'closing' && this.state !== 'closed' && this.state !== 'stopped' && !safeRecovery)
            this.state = 'failed';
        this.cancelTicket(error(code, cause));
        this.diagnose(failure);
        this.revokeStages(error(code, cause));
        return error(code, cause);
    }
    diagnose(failure) {
        const serial = failure.serial;
        const callback = this.callback;
        if (callback && this.state !== 'closed' && !this.finalizing) {
            queueMicrotask(() => {
                if (this.state === 'closed')
                    return;
                const callbackFailure = (fault) => { this.callbackFailureCount = Math.min(Number.MAX_SAFE_INTEGER, this.callbackFailureCount + 1); this.lastCallbackFailure = Object.freeze({ code: 'WEBGPU_DIAGNOSTIC_CALLBACK_FAILED', cause: fault, phase: 'callback', serial }); };
                try {
                    observed(callback.call(undefined, Object.freeze({ ...failure, severity: 'error' }))).catch(callbackFailure);
                }
                catch (fault) {
                    callbackFailure(fault);
                }
            });
        }
    }
    cancelTicket(cause) { if (this.ticket && !this.ticket.bound) {
        this.ticket.reject(cause);
        this.ticket = undefined;
    } }
    stop() {
        if (this.state === 'new' || this.state === 'starting' || this.state === 'active' || this.state === 'lost' || this.state === 'restoring')
            this.state = 'stopped';
        const failure = error('WEBGPU_STOPPED');
        this.revokeRecovery(failure);
        this.revokeStages(failure);
        this.invalidateImageResidency();
        this.cancelTicket(failure);
    }
    start() {
        if (this.state === 'lost' || this.state === 'restoring')
            return observed(Promise.reject(error('WEBGPU_DEVICE_LOST', this.generationFailure?.cause)));
        // A B1 loader can stop/close reentrantly while startup is still owned.
        // Reuse its pending barrier; settled terminal states keep their errors.
        if (B1_OWNERS.has(this) && this.startingPending)
            return this.starting;
        if (this.state === 'starting' || this.state === 'active')
            return this.starting;
        if (this.state !== 'new')
            return observed(Promise.reject(this.stateError()));
        const barrier = deferred();
        this.starting = barrier.promise;
        this.startingPending = true;
        this.state = 'starting';
        if (SHARED_OPTIONS.has(this)) {
            this.readiness = barrier;
            this.readinessPending = true;
        }
        // Cache before any getter/call can reenter start or close.
        this.initialize().then(() => { this.startingPending = false; if (this.readiness === barrier)
            this.readinessPending = false; barrier.resolve(); }, cause => { this.startingPending = false; if (this.readiness === barrier)
            this.readinessPending = false; barrier.reject(cause); });
        return barrier.promise;
    }
    method(object, key, gate) {
        const value = object[key];
        gate();
        if (typeof value !== 'function')
            throw new TypeError(String(key));
        return value.bind(object);
    }
    sharedWhenReady() {
        if (this.recoveryAttempt)
            this.checkRecoveryDeadline(this.recoveryAttempt);
        if (this.state === 'starting' || this.state === 'active' || this.state === 'lost' || this.state === 'restoring')
            return this.readiness?.promise ?? observed(Promise.reject(this.stateError()));
        return observed(Promise.reject(this.stateError()));
    }
    /** Fixed WebIDL getters authenticate the native receiver; method capture never adopts it. */
    captureNativeDevice(device, gate) {
        if (!isObject(device) || this.usedDevices.has(device))
            throw new TypeError('Fresh native GPUDevice required');
        const constructor = globalThis.GPUDevice;
        gate();
        if (typeof constructor !== 'function')
            throw new TypeError('Native GPUDevice unavailable');
        const prototype = constructor.prototype;
        gate();
        const lostGetter = Object.getOwnPropertyDescriptor(prototype, 'lost')?.get;
        const limitsGetter = Object.getOwnPropertyDescriptor(prototype, 'limits')?.get;
        if (typeof lostGetter !== 'function' || typeof limitsGetter !== 'function')
            throw new TypeError('Native GPUDevice accessors unavailable');
        const lost = observed(lostGetter.call(device));
        gate();
        const limitsObject = limitsGetter.call(device);
        gate();
        const limits = {};
        for (const key of DEVICE_LIMIT_KEYS) {
            limits[key] = limitsObject[key];
            gate();
            if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0)
                throw new TypeError('Device limit');
        }
        if (limits['maxVertexBuffers'] < 1 || limits['maxVertexAttributes'] < 4 || limits['maxVertexBufferArrayStride'] < 44 || limits['maxColorAttachments'] < 1 || limits['maxColorAttachmentBytesPerSample'] < 4 || limits['maxBindGroups'] < 1 || limits['maxBindingsPerBindGroup'] < 3 || limits['maxSampledTexturesPerShaderStage'] < 1 || limits['maxSamplersPerShaderStage'] < 1 || limits['maxUniformBuffersPerShaderStage'] < 1 || limits['maxUniformBufferBindingSize'] < 128 || limits['maxBindGroupsPlusVertexBuffers'] < 2 || limits['maxInterStageShaderVariables'] < 3)
            throw new TypeError('Device capabilities');
        const queue = device.queue;
        gate();
        const capture = (key) => this.method(device, key, gate);
        return { device, lost, limits, add: capture('addEventListener'), remove: capture('removeEventListener'),
            write: this.method(queue, 'writeBuffer', gate), writeTexture: this.method(queue, 'writeTexture', gate), submit: this.method(queue, 'submit', gate), fence: this.method(queue, 'onSubmittedWorkDone', gate),
            push: capture('pushErrorScope'), pop: capture('popErrorScope'), buffer: capture('createBuffer'), texture: capture('createTexture'), encoder: capture('createCommandEncoder'), bindGroup: capture('createBindGroup'), sampler: capture('createSampler'), shader: capture('createShaderModule'), pipeline: capture('createRenderPipelineAsync') };
    }
    nativeLoss(owner, cause) {
        if (this.owner !== owner || owner.invalidated || this.state === 'closed')
            return;
        owner.invalidated = true;
        if (owner.unknown || this.unsafe) {
            this.revokeStages(error('WEBGPU_DEVICE_LOST', cause));
            return;
        }
        const wasReady = this.state === 'active' && !this.readinessPending;
        if (wasReady)
            this.episodeAttempts = 0;
        const terminal = this.state === 'stopped' || this.state === 'closing';
        if (!terminal)
            this.state = 'lost';
        const failure = Object.freeze({ code: 'WEBGPU_DEVICE_LOST', cause, phase: 'device', serial: null });
        this.firstFailure ??= failure;
        this.generationFailure = failure;
        const refused = error('WEBGPU_DEVICE_LOST', cause);
        for (const record of this.ledger)
            if (record.owner === owner) {
                record.failure ??= refused;
                record.stage?.native.reject(refused);
            }
        if (!terminal && !this.recoveryAttempt) {
            this.readiness = deferred();
            this.readinessPending = true;
        }
        // Confirmed generation loss invalidates CPU retention before ready stages retire.
        // Otherwise context-invalidated settlement reaches a still-active ledger.
        this.invalidateImageResidency();
        this.revokeStages(refused);
        this.cancelTicket(refused);
        this.diagnose(failure);
        if (!terminal && !this.recoveryAttempt && SHARED_OPTIONS.get(this)?.recovery?.mode === 'automatic') {
            // Publication was revoked synchronously; the one automatic attempt begins in a later microtask.
            queueMicrotask(() => { if (this.state === 'lost' && !this.recoveryAttempt && this.episodeAttempts === 0)
                observed(this.recoverShared()); });
        }
    }
    checkRecoveryDeadline(attempt) {
        if (this.recoveryAttempt !== attempt || attempt.cancelled || this.now() < attempt.deadline)
            return;
        attempt.cancelled = true;
        this.state = 'failed';
        const failure = error('WEBGPU_RECOVERY_TIMEOUT');
        this.generationFailure = Object.freeze({ code: 'WEBGPU_RECOVERY_TIMEOUT', cause: failure, phase: 'device', serial: null });
        this.firstFailure ??= this.generationFailure;
        attempt.barrier.reject(failure);
        this.readinessPending = false;
        this.revokeStages(failure);
        this.diagnose(this.generationFailure);
    }
    revokeRecovery(cause) {
        const attempt = this.recoveryAttempt;
        if (attempt) {
            attempt.cancelled = true;
            attempt.cancelTimer?.();
            attempt.cancelTimer = undefined;
            attempt.barrier.reject(cause);
            this.readinessPending = false;
        }
        else if (this.readinessPending && this.readiness?.promise !== this.starting) {
            this.readiness?.reject(cause);
            this.readinessPending = false;
        }
    }
    recoverShared(device) {
        const recovery = SHARED_OPTIONS.get(this)?.recovery;
        try {
            if (!recovery)
                throw error('WEBGPU_RECOVERY_DISABLED');
            if (this.busy)
                throw error('WEBGPU_REENTRANT');
            if (this.state === 'stopped' || this.state === 'closing' || this.state === 'closed' || this.state === 'failed')
                throw this.stateError();
            if (this.recoveryAttempt) {
                this.checkRecoveryDeadline(this.recoveryAttempt);
                return this.recoveryAttempt.barrier.promise;
            }
            if (this.state !== 'lost')
                throw error('WEBGPU_RECOVERY_STATE_INVALID');
            if (this.episodeAttempts >= 3)
                throw error('WEBGPU_RECOVERY_LIMIT');
            if (this.attempt === Number.MAX_SAFE_INTEGER || this.generation === Number.MAX_SAFE_INTEGER)
                throw error('WEBGPU_GENERATION_EXHAUSTED');
            let captured;
            this.busy = true;
            this.cpu = deferred();
            try {
                if (this.borrowedPolicy) {
                    if (device === undefined)
                        throw new TypeError('Replacement borrowed device required');
                    captured = this.captureNativeDevice(device, () => { if (this.state !== 'lost')
                        throw this.stateError(); });
                }
                else if (device !== undefined)
                    throw new TypeError('Acquire policy does not accept a device');
            }
            catch (cause) {
                if (this.state !== 'lost')
                    throw this.stateError();
                throw error('WEBGPU_RECOVERY_DEVICE_INVALID', cause);
            }
            finally {
                this.busy = false;
                this.cpu.resolve();
            }
            const barrier = this.readinessPending && this.readiness ? this.readiness : deferred();
            this.readiness = barrier;
            this.readinessPending = true;
            this.attempt++;
            this.episodeAttempts++;
            this.state = 'restoring';
            const attempt = { barrier, actual: Promise.resolve(), deadline: this.now() + recovery.timeoutMs, failure: undefined, cancelled: false, cancelTimer: undefined };
            this.recoveryAttempt = attempt;
            attempt.cancelTimer = this.ownedTimeout(() => this.checkRecoveryDeadline(attempt), recovery.timeoutMs);
            const gate = () => { this.checkRecoveryDeadline(attempt); if (attempt.cancelled || this.state !== 'restoring')
                throw this.stateError(); };
            attempt.actual = observed((async () => {
                try {
                    if (this.startingPending && this.starting)
                        await Promise.allSettled([this.starting]);
                    await Promise.allSettled([...this.ledger].map(record => record.outcome));
                    gate();
                    await this.releaseGeneration();
                    gate();
                    if (this.unsafe)
                        throw error('WEBGPU_CLOSE_UNSAFE', this.unsafeCause);
                    this.imageEpoch = {};
                    this.bufferPool = createWebGPURetentionPool(this.imageEpoch, this.resourceReuse);
                    this.bindingCache = createWebGPUBindingCache(this.imageEpoch);
                    this.imageDirectory = new WeakMap();
                    this.lossCell = {};
                    this.owner = undefined;
                    this.sharedPipelines.clear();
                    this.sharedSamplers.clear();
                    await this.initialize(captured);
                    this.checkRecoveryDeadline(attempt);
                    if (attempt.cancelled || this.state !== 'active')
                        throw this.stateError();
                    this.generationFailure = null;
                    this.readinessPending = false;
                    barrier.resolve();
                }
                catch (cause) {
                    if (!this.startupCancelled() && !attempt.cancelled) {
                        await this.releaseGeneration();
                        this.checkRecoveryDeadline(attempt);
                        if (!this.startupCancelled() && !attempt.cancelled) {
                            this.state = this.unsafe || this.episodeAttempts >= 3 ? 'failed' : 'lost';
                            const code = this.unsafe ? 'WEBGPU_CLOSE_UNSAFE' : this.episodeAttempts >= 3 ? 'WEBGPU_RECOVERY_LIMIT' : 'WEBGPU_RECOVERY_FAILED';
                            const failure = error(code, cause);
                            this.generationFailure = Object.freeze({ code, cause, phase: 'device', serial: null });
                            this.firstFailure ??= this.generationFailure;
                            barrier.reject(failure);
                            this.readinessPending = false;
                        }
                    }
                    if (this.startupCancelled()) {
                        barrier.reject(this.stateError());
                        this.readinessPending = false;
                    }
                }
                finally {
                    attempt.cancelTimer?.();
                    attempt.cancelTimer = undefined;
                    if (this.recoveryAttempt === attempt)
                        this.recoveryAttempt = undefined;
                }
            })());
            return barrier.promise;
        }
        catch (cause) {
            return observed(Promise.reject(cause));
        }
    }
    async releaseGeneration() {
        for (const record of [...this.ledger])
            if (!record.unsafe) {
                try {
                    this.retire(record);
                }
                catch (cause) {
                    this.proofFailed(cause);
                }
            }
        this.closeBuffers();
        this.closeImageResidency();
        if (this.configured) {
            this.configured = false;
            try {
                this.unconfigure();
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        if (this.removeListener) {
            const remove = this.removeListener;
            this.removeListener = undefined;
            try {
                remove();
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        await Promise.resolve();
        delete this.lossCell.notify;
        delete this.lossCell.unknown;
        if (this.destroyDevice) {
            const destroy = this.destroyDevice;
            this.destroyDevice = undefined;
            try {
                destroy();
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        this.clearNativeReferences();
    }
    clearNativeReferences() {
        this.device = undefined;
        this.owner = undefined;
        this.context = undefined;
        this.configure = undefined;
        this.unconfigure = undefined;
        this.currentTexture = undefined;
        this.push = undefined;
        this.pop = undefined;
        this.write = undefined;
        this.writeTexture = undefined;
        this.submit = undefined;
        this.fence = undefined;
        this.buffer = undefined;
        this.texture = undefined;
        this.bindGroup = undefined;
        this.encoder = undefined;
        this.pipeline = undefined;
        this.imagePipeline = undefined;
        this.imageLayout = undefined;
        this.texturedPipeline = undefined;
        this.texturedLayout = undefined;
        this.meshPipeline = undefined;
        this.meshLayout = undefined;
        this.sampler = undefined;
        this.resolvePipeline = undefined;
        this.resolveLayout = undefined;
        this.effectPipelines.clear();
        this.cardPipeline = undefined;
        this.cardLayout = undefined;
        this.texturedSceneMeshPipeline = undefined;
        this.texturedSceneMeshLayout = undefined;
        this.lambertMeshPipeline = undefined;
        this.lambertMeshLayout = undefined;
        this.sharedPipelines.clear();
        this.sharedSamplers.clear();
    }
    async initialize(supplied) {
        let stage = 'WEBGPU_UNAVAILABLE';
        let createCardPipeline;
        let createTexturedSceneMeshPipeline;
        let createLambertMeshPipeline;
        const operation = this.recoveryAttempt;
        const gate = () => {
            if (operation) {
                this.checkRecoveryDeadline(operation);
                if (operation.failure)
                    throw new ClassifiedWebGPUFailure(operation.failure.code, operation.failure.cause, operation.failure);
                if (this.recoveryAttempt !== operation || operation.cancelled || this.state !== 'restoring')
                    throw new ClassifiedWebGPUFailure('WEBGPU_START_CANCELLED', this.generationFailure?.cause);
            }
            else
                this.startupGate();
        };
        try {
            if (B1_OWNERS.has(this)) {
                stage = 'WEBGPU_START_FAILED';
                // Observe the literal import immediately. The existing starting
                // barrier drains it even when a loader boundary calls stop/close.
                const shared = SHARED_SCENE_OWNERS.has(this);
                const namespace = await (shared ? observed(import('./sharedB1.js')) : observed(import('./b1.js')));
                gate();
                const getter = shared ? namespace.getBuiltinSharedB1Protocol : namespace.getBuiltinB1Protocol;
                gate();
                const predicate = shared ? namespace.isBuiltinSharedB1Protocol : namespace.isBuiltinB1Protocol;
                gate();
                if (typeof getter !== 'function' || typeof predicate !== 'function')
                    throw new TypeError('B1 built-in exports');
                const protocol = getter();
                gate();
                if (!predicate(protocol))
                    throw new TypeError('B1 built-in identity');
                gate();
                if (Object.getPrototypeOf(protocol) !== Object.prototype || Object.getOwnPropertySymbols(protocol).length !== 0)
                    throw new TypeError('B1 built-in object');
                const keys = Object.keys(protocol);
                if (keys.length !== B1_PROTOCOL_FIELDS.length || keys.some((key, index) => key !== B1_PROTOCOL_FIELDS[index]))
                    throw new TypeError('B1 built-in keys');
                const functions = {};
                for (const key of B1_PROTOCOL_FIELDS) {
                    const descriptor = Object.getOwnPropertyDescriptor(protocol, key);
                    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable || descriptor.writable || descriptor.configurable)
                        throw new TypeError('B1 built-in descriptor');
                    const value = descriptor.value;
                    if (key === 'version') {
                        if (value !== (shared ? 'egret.internal.shared-b1/1' : 'egret.internal.b1/1'))
                            throw new TypeError('B1 built-in version');
                    }
                    else {
                        if (typeof value !== 'function')
                            throw new TypeError('B1 built-in function');
                        // Capture each actual function once into the owner table.
                        Object.defineProperty(functions, key, { value, enumerable: true });
                    }
                }
                if (!Object.isFrozen(protocol))
                    throw new TypeError('B1 built-in freeze');
                B1_FUNCTIONS.set(this, Object.freeze(functions));
                if (shared) {
                    const sceneModule = namespace;
                    createCardPipeline = sceneModule.createSharedWebGPUCardPipeline;
                    gate();
                    createTexturedSceneMeshPipeline = sceneModule.createSharedWebGPUTexturedMeshPipeline;
                    gate();
                    createLambertMeshPipeline = sceneModule.createSharedWebGPULambertMeshPipeline;
                    gate();
                    if (typeof createCardPipeline !== 'function' || typeof createTexturedSceneMeshPipeline !== 'function' || typeof createLambertMeshPipeline !== 'function')
                        throw new TypeError('Shared scene sampled pipeline exports');
                }
                gate();
            }
            const navigatorValue = globalThis.navigator;
            gate();
            const gpu = navigatorValue?.gpu;
            gate();
            if (!gpu)
                throw new ClassifiedWebGPUFailure('WEBGPU_UNAVAILABLE');
            const preferred = this.method(gpu, 'getPreferredCanvasFormat', gate);
            const format = preferred();
            gate();
            if (format !== 'rgba8unorm' && format !== 'bgra8unorm')
                throw new ClassifiedWebGPUFailure('WEBGPU_FORMAT_UNSUPPORTED');
            this.format = format;
            stage = 'WEBGPU_CONTEXT_UNAVAILABLE';
            const getContext = this.method(this.surface, 'getContext', gate);
            const context = getContext('webgpu');
            gate();
            if (!context)
                throw new ClassifiedWebGPUFailure('WEBGPU_CONTEXT_UNAVAILABLE');
            this.context = context;
            this.configure = this.method(context, 'configure', gate);
            this.unconfigure = this.method(context, 'unconfigure', gate);
            this.currentTexture = this.method(context, 'getCurrentTexture', gate);
            let device;
            if (supplied)
                device = supplied.device;
            else if (this.borrowed)
                device = this.borrowed;
            else {
                stage = 'WEBGPU_ADAPTER_UNAVAILABLE';
                const request = this.method(gpu, 'requestAdapter', gate);
                const adapter = await observed(request());
                gate();
                if (!adapter)
                    throw new ClassifiedWebGPUFailure('WEBGPU_ADAPTER_UNAVAILABLE');
                stage = 'WEBGPU_DEVICE_FAILED';
                const acquire = this.method(adapter, 'requestDevice', gate);
                device = await observed(acquire());
            }
            // Acquire ownership before checking cancellation so close can clean a late device.
            this.device = device;
            stage = 'WEBGPU_START_FAILED';
            const cleanupGate = () => undefined;
            if (!this.borrowedPolicy) {
                try {
                    this.destroyDevice = this.method(device, 'destroy', cleanupGate);
                }
                catch (cause) {
                    this.proofFailed(cause);
                    throw cause;
                }
            }
            const recovery = SHARED_OPTIONS.get(this)?.recovery;
            const native = recovery ? (supplied ?? this.captureNativeDevice(device, gate)) : undefined;
            gate();
            const lost = native?.lost ?? device.lost;
            const add = native?.add ?? this.method(device, 'addEventListener', gate), remove = native?.remove ?? this.method(device, 'removeEventListener', gate);
            const queue = native ? undefined : device.queue;
            gate();
            this.write = native?.write ?? this.method(queue, 'writeBuffer', gate);
            this.writeTexture = native?.writeTexture ?? this.method(queue, 'writeTexture', gate);
            this.submit = native?.submit ?? this.method(queue, 'submit', gate);
            this.fence = native?.fence ?? this.method(queue, 'onSubmittedWorkDone', gate);
            this.push = native?.push ?? this.method(device, 'pushErrorScope', gate);
            this.pop = native?.pop ?? this.method(device, 'popErrorScope', gate);
            this.buffer = native?.buffer ?? this.method(device, 'createBuffer', gate);
            this.encoder = native?.encoder ?? this.method(device, 'createCommandEncoder', gate);
            this.texture = native?.texture ?? this.method(device, 'createTexture', gate);
            this.bindGroup = native?.bindGroup ?? this.method(device, 'createBindGroup', gate);
            const sampler = native?.sampler ?? this.method(device, 'createSampler', gate), shader = native?.shader ?? this.method(device, 'createShaderModule', gate), pipeline = native?.pipeline ?? this.method(device, 'createRenderPipelineAsync', gate);
            const captured = native?.limits ?? {};
            if (!native) {
                const limits = device.limits;
                gate();
                for (const key of DEVICE_LIMIT_KEYS) {
                    captured[key] = limits[key];
                    gate();
                    if (!Number.isSafeInteger(captured[key]) || captured[key] <= 0)
                        throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
                }
            }
            if (SHARED_OPTIONS.has(this)) {
                if (this.generation === Number.MAX_SAFE_INTEGER)
                    throw new ClassifiedWebGPUFailure('WEBGPU_GENERATION_EXHAUSTED');
                const owner = { number: ++this.generation, device, pool: this.bufferPool, cache: this.bindingCache, epoch: this.imageEpoch, format: this.format, alpha: SHARED_OPTIONS.get(this).outputAlpha, fence: this.fence, pop: this.pop, native: { write: this.write, writeTexture: this.writeTexture, submit: this.submit, push: this.push, buffer: this.buffer, texture: this.texture, bindGroup: this.bindGroup, encoder: this.encoder, configure: this.configure, unconfigure: this.unconfigure, currentTexture: this.currentTexture }, invalidated: false, unknown: false };
                this.owner = owner;
                this.usedDevices.add(device);
                if (recovery)
                    this.borrowed = undefined;
                const cell = this.lossCell;
                if (recovery) {
                    cell.notify = cause => this.nativeLoss(owner, cause);
                    cell.unknown = cause => { if (this.owner === owner) {
                        owner.unknown = true;
                        const failure = this.fail('WEBGPU_DEVICE_LOST', cause, 'device', null, true);
                        this.revokeRecovery(failure);
                        this.revokeStages(failure);
                    } };
                    observeAuthenticatedWebGPUDeviceLoss(lost, cell);
                }
                else {
                    cell.notify = cause => { this.fail('WEBGPU_DEVICE_LOST', cause, 'device', null, true); this.revokeStages(error('WEBGPU_DEVICE_LOST', cause)); };
                    observeWebGPUDeviceLoss(lost, cell);
                }
            }
            else {
                this.lossCell.notify = cause => { this.fail('WEBGPU_DEVICE_LOST', cause, 'device', null, true); };
                observeWebGPUDeviceLoss(lost, this.lossCell);
            }
            gate();
            stage = 'WEBGPU_START_FAILED';
            const observedOwner = this.owner;
            const listener = (event) => { if (observedOwner && this.owner !== observedOwner)
                return; this.fail('WEBGPU_UNCAPTURED_ERROR', event.error, 'device', null); };
            this.removeListener = () => remove('uncapturederror', listener);
            add('uncapturederror', listener);
            gate();
            if (captured['maxVertexBuffers'] < 1 || captured['maxVertexAttributes'] < (SHARED_OPTIONS.has(this) ? 4 : TEXTURED_OWNERS.has(this) ? 3 : 2) || captured['maxVertexBufferArrayStride'] < (SHARED_OPTIONS.has(this) ? 44 : TEXTURED_OWNERS.has(this) ? 32 : 24) || captured['maxColorAttachments'] < 1 || captured['maxColorAttachmentBytesPerSample'] < 4 || captured['maxBindGroups'] < 1 || captured['maxBindingsPerBindGroup'] < 3 || captured['maxSampledTexturesPerShaderStage'] < 1 || captured['maxSamplersPerShaderStage'] < 1 || captured['maxUniformBuffersPerShaderStage'] < 1 || captured['maxUniformBufferBindingSize'] < (SHARED_OPTIONS.has(this) ? 128 : B1_OWNERS.has(this) ? 64 : 16) || captured['maxBindGroupsPlusVertexBuffers'] < 2 || captured['maxInterStageShaderVariables'] < (SHARED_OPTIONS.has(this) ? 3 : TEXTURED_OWNERS.has(this) ? 2 : 1))
                throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
            if (SHARED_OPTIONS.get(this)?.enableEffects && (captured['maxUniformBufferBindingSize'] < 448 || captured['maxSampledTexturesPerShaderStage'] < 2))
                throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
            this.limits = { maxTextureDimension2D: captured['maxTextureDimension2D'], maxBufferSize: captured['maxBufferSize'] };
            const scopes = [];
            const pipelines = [];
            const builtin = B1_FUNCTIONS.get(this);
            const capturedShader = (descriptor) => {
                gate();
                const module = shader(descriptor);
                gate();
                return module;
            };
            const capturedPipeline = (descriptor) => {
                gate();
                const result = observed(pipeline(descriptor));
                // A later call/gate can throw; close must still drain every already started peer.
                pipelines.push(result);
                gate();
                return result;
            };
            let synchronous;
            try {
                this.scoped(null, 'startup', scopes, gate, () => {
                    if (SHARED_OPTIONS.has(this)) {
                        for (const sampled of [false, true])
                            for (const blend of SHARED_BLENDS)
                                createSharedWebGPUPipeline(capturedShader, capturedPipeline, sampled, blend);
                        createSharedResolvePipeline(capturedShader, capturedPipeline, this.format, SHARED_OPTIONS.get(this).outputAlpha === 'opaque');
                        if (builtin)
                            builtin.createWebGPUMeshPipeline(capturedShader, capturedPipeline, 'rgba8unorm-srgb');
                        createCardPipeline?.(capturedShader, capturedPipeline);
                        createTexturedSceneMeshPipeline?.(capturedShader, capturedPipeline);
                        createLambertMeshPipeline?.(capturedShader, capturedPipeline);
                        if (SHARED_OPTIONS.get(this).enableEffects)
                            for (const mode of EFFECT_PASSES)
                                createSharedEffectPipeline(capturedShader, capturedPipeline, mode);
                        for (const filter of ['nearest', 'linear'])
                            for (const u of ['clamp-to-edge', 'repeat', 'mirror-repeat'])
                                for (const v of ['clamp-to-edge', 'repeat', 'mirror-repeat']) {
                                    const value = sampler({ addressModeU: u, addressModeV: v, addressModeW: 'clamp-to-edge', minFilter: filter, magFilter: filter, mipmapFilter: 'nearest', lodMinClamp: 0, lodMaxClamp: 0, maxAnisotropy: 1 });
                                    this.sharedSamplers.set(filter + ':' + u + ':' + v, value);
                                    gate();
                                }
                    }
                    else {
                        createWebGPURectanglePipeline(capturedShader, capturedPipeline, this.format);
                        createWebGPUImagePipeline(capturedShader, capturedPipeline, this.format);
                        // The same captured boundary immediately owns this third
                        // Promise; no scene pipeline or import starts in ordinary mode.
                        if (builtin)
                            builtin.createWebGPUMeshPipeline(capturedShader, capturedPipeline, this.format);
                        if (TEXTURED_OWNERS.has(this))
                            createWebGPUTexturedPipeline(capturedShader, capturedPipeline, this.format);
                        gate();
                        this.sampler = sampler({ addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge', addressModeW: 'clamp-to-edge', magFilter: 'nearest', minFilter: 'nearest', mipmapFilter: 'nearest', lodMinClamp: 0, lodMaxClamp: 0, maxAnisotropy: 1 });
                        gate();
                    }
                });
            }
            catch (cause) {
                // Occurrence is independent of the arbitrary thrown value, including undefined.
                synchronous = { cause };
            }
            // Pop all scopes before awaiting independently observed async pipeline work.
            const outcomes = await Promise.allSettled([...scopes, ...pipelines]);
            if (synchronous && this.startupCancelled())
                throw synchronous.cause;
            gate();
            if (synchronous)
                throw synchronous.cause;
            const rejected = outcomes.find(outcome => outcome.status === 'rejected');
            if (rejected?.status === 'rejected')
                throw rejected.reason;
            // Scope outcomes do not select pipeline roles. Their own ordered
            // results retain the old two/three roles and add scene2/textured3.
            const roles = outcomes.slice(scopes.length);
            if (SHARED_OPTIONS.has(this)) {
                let index = 0;
                for (const sampled of [false, true])
                    for (const blend of SHARED_BLENDS) {
                        const value = roles[index++].value;
                        const layout = this.method(value, 'getBindGroupLayout', gate)(0);
                        gate();
                        this.sharedPipelines.set((sampled ? 'sampled:' : 'solid:') + blend, { pipeline: value, layout });
                    }
                this.resolvePipeline = roles[index++].value;
                this.resolveLayout = this.method(this.resolvePipeline, 'getBindGroupLayout', gate)(0);
                gate();
                if (builtin) {
                    this.meshPipeline = roles[index++].value;
                    this.meshLayout = this.method(this.meshPipeline, 'getBindGroupLayout', gate)(0);
                    gate();
                }
                if (createCardPipeline) {
                    this.cardPipeline = roles[index++].value;
                    this.cardLayout = this.method(this.cardPipeline, 'getBindGroupLayout', gate)(0);
                    gate();
                }
                if (createTexturedSceneMeshPipeline) {
                    this.texturedSceneMeshPipeline = roles[index++].value;
                    this.texturedSceneMeshLayout = this.method(this.texturedSceneMeshPipeline, 'getBindGroupLayout', gate)(0);
                    gate();
                }
                if (createLambertMeshPipeline) {
                    this.lambertMeshPipeline = roles[index++].value;
                    this.lambertMeshLayout = this.method(this.lambertMeshPipeline, 'getBindGroupLayout', gate)(0);
                    gate();
                }
                if (SHARED_OPTIONS.get(this).enableEffects)
                    for (const mode of EFFECT_PASSES) {
                        const pipeline = roles[index++].value, layout = this.method(pipeline, 'getBindGroupLayout', gate)(0);
                        gate();
                        this.effectPipelines.set(mode, { pipeline, layout });
                    }
            }
            else {
                this.pipeline = roles[0].value;
                this.imagePipeline = roles[1].value;
                // Auto group0 is valid only after image pipeline settlement; no scopes span an await.
                const layout = this.method(this.imagePipeline, 'getBindGroupLayout', gate);
                gate();
                this.imageLayout = layout(0);
                gate();
                if (builtin) {
                    this.meshPipeline = roles[2].value;
                    const meshLayout = this.method(this.meshPipeline, 'getBindGroupLayout', gate);
                    this.meshLayout = meshLayout(0);
                    gate();
                }
                if (TEXTURED_OWNERS.has(this)) {
                    this.texturedPipeline = roles[builtin ? 3 : 2].value;
                    const texturedLayout = this.method(this.texturedPipeline, 'getBindGroupLayout', gate);
                    this.texturedLayout = texturedLayout(0);
                    gate();
                }
            }
            const configureScopes = [];
            let configureFailure;
            try {
                this.scoped(null, 'startup', configureScopes, gate, () => this.configureSurface(gate));
            }
            catch (cause) {
                configureFailure = { cause };
            }
            const configured = await Promise.allSettled(configureScopes);
            if (configureFailure && this.startupCancelled())
                throw configureFailure.cause;
            gate();
            if (configureFailure)
                throw configureFailure.cause;
            const failed = configured.find(outcome => outcome.status === 'rejected');
            if (failed?.status === 'rejected')
                throw failed.reason;
            this.state = 'active';
            this.imageEnabled = true;
            this.generationFailure = null;
        }
        catch (cause) {
            const classified = cause instanceof ClassifiedWebGPUFailure ? cause : undefined;
            const original = classified ? classified.original : cause;
            if (this.startupCancelled()) {
                throw error('WEBGPU_START_CANCELLED', original);
            }
            if (operation?.cancelled)
                throw this.stateError();
            if (this.state === 'lost' || (!operation && SHARED_OPTIONS.get(this)?.recovery && this.readiness?.promise !== this.starting))
                throw error('WEBGPU_DEVICE_LOST', this.generationFailure?.cause);
            if (classified && this.firstFailure?.code === classified.code) {
                throw classified.publicError;
            }
            // Public EgretError instances are ordinary external causes, regardless of their code.
            throw this.fail(classified ? classified.code : stage, original, 'startup', null);
        }
    }
    scoped(serial, phase, outcomes, gate, work) {
        const owner = this.owner, push = this.push, pop = this.pop;
        const scopeFailure = (code, cause, unsafe = false) => {
            if (owner?.invalidated && !owner.unknown)
                return error('WEBGPU_DEVICE_LOST', cause);
            if (owner && this.owner !== owner) {
                if (unsafe)
                    this.proofFailed(cause);
                return error(code, cause);
            }
            return this.fail(code, cause, phase, serial, unsafe);
        };
        const filters = ['out-of-memory', 'internal', 'validation'];
        let pushed = 0;
        try {
            for (const filter of filters) {
                gate();
                push(filter);
                pushed++;
                gate();
            }
            work();
        }
        finally {
            while (pushed > 0) {
                const filter = filters[--pushed];
                try {
                    const result = observed(pop()).then(fault => {
                        if (fault) {
                            const code = filter === 'validation' ? 'WEBGPU_VALIDATION' : filter === 'internal' ? 'WEBGPU_INTERNAL' : 'WEBGPU_OUT_OF_MEMORY';
                            throw new ClassifiedWebGPUFailure(code, fault, scopeFailure(code, fault));
                        }
                    }, cause => {
                        throw new ClassifiedWebGPUFailure('WEBGPU_SCOPE_FAILED', cause, scopeFailure('WEBGPU_SCOPE_FAILED', cause, true));
                    });
                    outcomes.push(observed(result));
                }
                catch (cause) {
                    const failure = new ClassifiedWebGPUFailure('WEBGPU_SCOPE_FAILED', cause, scopeFailure('WEBGPU_SCOPE_FAILED', cause, true));
                    outcomes.push(observed(Promise.reject(failure)));
                }
            }
        }
    }
    configureSurface(gate) {
        gate();
        // A throwing external configure may already have changed the leased context.
        this.configured = true;
        this.configure({ device: this.device, format: this.format, colorSpace: 'srgb', alphaMode: SHARED_OPTIONS.get(this)?.outputAlpha ?? 'premultiplied', usage: 16 | (this.options.enableReadback ? 1 : 0) });
        gate();
    }
    ownedBuffer(size, usage, record, gate) {
        gate();
        const buffer = (record.owner?.native.buffer ?? this.buffer)({ size, usage });
        // Record ownership immediately, even if capture getters throw or close reentrantly.
        const resource = { buffer, destroy: () => { throw new TypeError('uncaptured destroy'); }, unmap: () => { throw new TypeError('uncaptured unmap'); }, map: () => Promise.reject(new TypeError('uncaptured map')), mappedRange: () => { throw new TypeError('uncaptured range'); }, mapped: false, cleaned: false, logicalByteLength: size };
        if (record.owner)
            resource.generation = record.owner;
        record.resources.push(resource);
        let destroy;
        try {
            destroy = this.method(buffer, 'destroy', () => undefined);
        }
        catch (cause) {
            record.unsafe = true;
            this.proofFailed(cause);
            throw cause;
        }
        Object.assign(resource, { destroy });
        gate();
        const unmap = this.method(buffer, 'unmap', gate), map = this.method(buffer, 'mapAsync', gate), mappedRange = this.method(buffer, 'getMappedRange', gate);
        Object.assign(resource, { unmap, map, mappedRange });
        gate();
        return resource;
    }
    ownedTexture(view, record, gate, candidate) {
        gate();
        const texture = (record.owner?.native.texture ?? this.texture)({ size: { width: view.region.width, height: view.region.height, depthOrArrayLayers: 1 }, dimension: '2d', format: candidate.entry.format, mipLevelCount: 1, sampleCount: 1, usage: 2 | 4 });
        // Register the returned object before any gate or cleanup/view getter can reenter close.
        const resource = { texture, destroy: () => { throw new TypeError('uncaptured texture destroy'); }, cleaned: false, logicalByteLength: candidate.entry.bytes };
        if (record.owner)
            resource.generation = record.owner;
        record.textures.push(resource);
        candidate.entry.resource = resource;
        record.imageUse.reserved -= candidate.entry.bytes;
        this.reservedImageBytes -= candidate.entry.bytes;
        this.allocatedImageBytes += candidate.entry.bytes;
        this.sampleResourceImages();
        let destroy;
        try {
            destroy = this.method(texture, 'destroy', () => undefined);
        }
        catch (cause) {
            record.unsafe = true;
            this.proofFailed(cause);
            throw cause;
        }
        Object.assign(resource, { destroy });
        gate();
        const createView = this.method(texture, 'createView', gate);
        gate();
        const result = createView();
        candidate.entry.view = result;
        record.views.push(result);
        gate();
        return { texture, view: result };
    }
    planImageResidency(projectionPlan, draws, shared = false) {
        this.active();
        const hits = new Map(), candidates = new Map();
        const buckets = new Map();
        let bytes = 0;
        for (const draw of draws) {
            if (draw.kind === 'rect' || draw.packed.vertexCount === 0 || hits.has(draw.viewIndex) || candidates.has(draw.viewIndex))
                continue;
            const view = projectionPlan.views[draw.viewIndex], region = view.region;
            const cropKey = (shared ? 'shared:egret.alpha8-capped-srgb-pma8/1:rgba8unorm-srgb:' : '') + `${region.x},${region.y},${region.width},${region.height}`;
            let bucket = this.imageDirectory.get(view.image) ?? buckets.get(view.image);
            if (!bucket) {
                bucket = new Map();
                buckets.set(view.image, bucket);
            }
            const entry = bucket.get(cropKey);
            if (this.imageEnabled && entry?.epoch === this.imageEpoch && entry.state === 'ready')
                hits.set(draw.viewIndex, entry);
            else {
                candidates.set(draw.viewIndex, { image: view.image, viewIndex: draw.viewIndex, transferred: false,
                    entry: { format: shared ? 'rgba8unorm-srgb' : 'rgba8unorm', identity: {}, epoch: this.imageEpoch, bucket, cropKey, bytes: view.byteLength, resource: undefined,
                        view: undefined, pinCount: 0, previous: undefined, next: undefined, state: 'cold' } });
                bytes += view.byteLength;
            }
        }
        const protectedHits = new Set(hits.values()), victims = [];
        let available = this.allocatedImageBytes + this.reservedImageBytes, count = this.readyCount;
        for (let entry = this.imageOldest; entry; entry = entry.next) {
            if (available + bytes <= 33554432 && count + candidates.size <= 256)
                break;
            if (entry.epoch !== this.imageEpoch || entry.state !== 'ready' || entry.pinCount !== 0 || protectedHits.has(entry))
                continue;
            victims.push(entry);
            available -= entry.bytes;
            count--;
        }
        return { epoch: this.imageEpoch, revision: this.imageRevision, victims, bytes,
            use: { epoch: this.imageEpoch, hits, candidates, reserved: 0, pinned: false, finished: false, touchedQueue: false } };
    }
    assertImagePlanCurrent(plan) {
        this.active();
        if (!this.imageEnabled || plan.epoch !== this.imageEpoch || plan.revision !== this.imageRevision)
            throw new TypeError('stale image plan');
    }
    unlinkImageResidency(entry) {
        if (entry.previous)
            entry.previous.next = entry.next;
        else
            this.imageOldest = entry.next;
        if (entry.next)
            entry.next.previous = entry.previous;
        else
            this.imageNewest = entry.previous;
        entry.previous = undefined;
        entry.next = undefined;
    }
    appendImageResidency(entry) {
        entry.previous = this.imageNewest;
        entry.next = undefined;
        if (this.imageNewest)
            this.imageNewest.next = entry;
        else
            this.imageOldest = entry;
        this.imageNewest = entry;
    }
    detachReadyImage(entry) {
        this.imageCleanup.add(entry);
        this.bindingCache.invalidateTexture(entry.identity);
        if (entry.state === 'ready') {
            entry.bucket.delete(entry.cropKey);
            this.unlinkImageResidency(entry);
            entry.state = 'detached';
            this.readyCount--;
            this.resourceReadyBytes -= entry.bytes;
            if (entry.pinCount > 0) {
                this.resourcePinnedBytes -= entry.bytes;
                this.resourcePinnedEntries--;
            }
            this.sampleResourceImages();
            this.imageRevision = {};
        }
    }
    destroyReadyImage(entry) {
        // Registration and dependent-binding invalidation precede native cleanup.
        this.detachReadyImage(entry);
        const resource = entry.resource;
        if (resource.cleaned)
            return;
        const failures = cleanupWebGPUTexture(resource);
        if (failures.length) {
            this.noteUnknownResource(resource);
            this.proofFailed(failures[0]);
            throw failures[0];
        }
        // The native callback ran with the entire detached allocation charged.
        this.allocatedImageBytes -= entry.bytes;
        this.imageCleanup.delete(entry);
    }
    beginImageResidency(record, plan) {
        this.active();
        if (!this.busy || !this.imageEnabled || plan.epoch !== this.imageEpoch || plan.revision !== this.imageRevision)
            throw new TypeError('stale image plan');
        const use = plan.use;
        record.imageUse = use;
        for (const candidate of use.candidates.values())
            this.imageDirectory.set(candidate.image, candidate.entry.bucket);
        // Pin the complete hit set before touching order or entering any native call.
        for (const entry of use.hits.values()) {
            if (entry.pinCount === 0) {
                this.resourcePinnedBytes += entry.bytes;
                this.resourcePinnedEntries++;
            }
            entry.pinCount++;
        }
        this.sampleResourceImages();
        use.pinned = true;
        for (const entry of use.hits.values()) {
            this.unlinkImageResidency(entry);
            this.appendImageResidency(entry);
        }
        this.imageRevision = {};
        // This phase only transfers metadata. Buffer leases must be attached and
        // claimed before any victim's captured native destroy can reenter.
        for (const entry of plan.victims) {
            const capacityVictim = entry.state === 'ready';
            this.detachReadyImage(entry);
            if (capacityVictim && entry.state === 'detached')
                this.resourceTotal('readyCapacityEvictions', 1);
        }
        use.reserved = plan.bytes;
        this.reservedImageBytes += plan.bytes;
        this.sampleResourceImages();
        return use;
    }
    realizeImageResidency(record, use, viewIndex, gate) {
        gate();
        const hit = use.hits.get(viewIndex);
        if (hit) {
            record.views.push(hit.view);
            return { texture: hit.resource.texture, view: hit.view };
        }
        const candidate = use.candidates.get(viewIndex), projection = record.projectionPlan.views[viewIndex];
        const owned = this.ownedTexture(projection, record, gate, candidate);
        if (record.stage) {
            record.stage.writes.push({ kind: 'texture', texture: owned.texture, data: record.projections[viewIndex], width: projection.region.width, height: projection.region.height, offset: 0 });
            return owned;
        }
        // Attempted queue writes retain the original fence obligation, including throws.
        use.touchedQueue = true;
        (record.owner?.native.writeTexture ?? this.writeTexture)({ texture: owned.texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 }, aspect: 'all' }, record.projections[viewIndex], { offset: 0, bytesPerRow: 4 * projection.region.width, rowsPerImage: projection.region.height }, { width: projection.region.width, height: projection.region.height, depthOrArrayLayers: 1 });
        if (record.shared)
            this.resourcePageWrite(record.projections[viewIndex].byteLength);
        gate();
        return owned;
    }
    sharedWrite(record, buffer, data, unit) {
        if (record.stage) {
            record.stage.writes.push({ kind: 'buffer', buffer, data, unit, offset: 0 });
            return;
        }
        if (record.imageUse)
            record.imageUse.touchedQueue = true;
        (record.owner?.native.write ?? this.write)(buffer, 0, data);
    }
    isReuseEligible(record) {
        return this.state === 'active' && this.imageEnabled && (SHARED_OPTIONS.get(this)?.recovery ? !this.generationFailure : !this.firstFailure) && (!record.owner || record.owner === this.owner && !record.owner.invalidated) && !this.unsafe && !this.finalizing
            && !record.failure && !record.unsafe;
    }
    isImagePromotionEligible(record) {
        return this.isReuseEligible(record) && record.imageUse?.epoch === this.imageEpoch;
    }
    finishImageResidency(record, allowPromotion) {
        const use = record.imageUse;
        if (!use || use.finished)
            return;
        use.finished = true;
        if (use.pinned) {
            use.pinned = false;
            for (const entry of use.hits.values()) {
                if (entry.state === 'ready' && entry.pinCount === 1) {
                    this.resourcePinnedBytes -= entry.bytes;
                    this.resourcePinnedEntries--;
                }
                entry.pinCount--;
            }
            this.sampleResourceImages();
        }
        const failed = (cause) => {
            const failure = this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', record.serial, true);
            record.unsafe = true;
            record.failure ??= failure;
        };
        for (const candidate of use.candidates.values()) {
            const entry = candidate.entry, resource = entry.resource;
            if (!resource || candidate.transferred)
                continue;
            // Re-read qualification, winner and slot after every earlier cleanup callback.
            if (allowPromotion && this.isImagePromotionEligible(record) && entry.epoch === this.imageEpoch
                && !entry.bucket.has(entry.cropKey) && this.readyCount < 256) {
                try {
                    const revision = {};
                    entry.bucket.set(entry.cropKey, entry);
                    this.appendImageResidency(entry);
                    entry.state = 'ready';
                    this.readyCount++;
                    this.resourceReadyBytes += entry.bytes;
                    this.sampleResourceImages();
                    candidate.transferred = true;
                    record.textures.splice(record.textures.indexOf(resource), 1);
                    this.imageRevision = revision;
                }
                catch (cause) {
                    // No native call occurs during publication; restore the original owner.
                    if (entry.bucket.get(entry.cropKey) === entry)
                        entry.bucket.delete(entry.cropKey);
                    if (entry.state === 'ready') {
                        this.unlinkImageResidency(entry);
                        this.readyCount--;
                        this.resourceReadyBytes -= entry.bytes;
                        entry.state = 'cold';
                        this.sampleResourceImages();
                    }
                    candidate.transferred = false;
                    failed(cause);
                }
            }
            if (!candidate.transferred && !resource.cleaned) {
                const failures = cleanupWebGPUTexture(resource);
                if (failures.length) {
                    this.noteUnknownResource(resource);
                    for (const cause of failures)
                        failed(cause);
                }
                else
                    this.allocatedImageBytes -= entry.bytes;
            }
        }
        this.reservedImageBytes -= use.reserved;
        use.reserved = 0;
        use.hits.clear();
        use.candidates.clear();
        record.imageUse = undefined;
        this.imageRevision = {};
    }
    invalidateImageResidency() {
        this.imageEnabled = false;
        this.imageRevision = {};
        this.bufferPool.invalidate();
        this.bindingCache.invalidate();
    }
    closeImageResidency() {
        this.invalidateImageResidency();
        while (this.imageOldest) {
            const entry = this.imageOldest;
            try {
                this.destroyReadyImage(entry);
            }
            catch (cause) {
                this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', null, true);
            }
            // Registration failure leaves the directory owner intact, never lost.
            if (entry === this.imageOldest)
                break;
        }
        for (const entry of this.imageCleanup) {
            if (entry.resource.cleaned)
                continue;
            try {
                this.destroyReadyImage(entry);
            }
            catch (cause) {
                this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', null, true);
            }
        }
    }
    planBuffers(p) {
        const requests = [];
        const add = (role, usage, byteLength) => {
            if (byteLength > 0)
                requests.push({ kind: 'buffer', id: requests.length, role, usage, byteLength });
        };
        // Preserve the native allocation order and exact sizes of every route.
        for (const draw of p.draws) {
            if (draw.packed.data.byteLength === 0)
                continue;
            add('vertex', 40, draw.packed.data.byteLength);
            if (draw.kind !== 'rect')
                add('uniform', 72, 16);
        }
        if (p.scene) {
            for (const mesh of p.scene.meshes) {
                add('vertex', 40, mesh.vertexBytes);
                add('index', 24, mesh.indexBytes);
            }
            for (const _draw of p.scene.draws)
                add('uniform', 72, 64);
        }
        return this.bufferPool.plan(requests);
    }
    submissionBuffer(record, requestId, gate) {
        gate();
        const existing = record.bufferLeases[requestId];
        if (existing)
            return existing;
        const request = record.bufferPlan.requests[requestId];
        if (request.kind !== 'buffer')
            throw new TypeError('Expected buffer lease');
        const resource = this.ownedBuffer(request.byteLength, request.usage, record, gate);
        const lease = (record.owner?.pool ?? this.bufferPool).registerCreated(request, resource);
        // Slots are preallocated before admission commits, in request order.
        // Transfer from the raw owner without a post-registration allocation.
        record.bufferLeases[requestId] = lease;
        record.resources.length--;
        return lease;
    }
    submissionBinding(record, key, entries, image, gate) {
        gate();
        const binding = (record.owner?.cache ?? this.bindingCache).lookup(key) ?? (record.owner?.native.bindGroup ?? this.bindGroup)({ layout: key.layout, entries });
        // The record owns the returned binding before checking a native callback's state.
        record.bindings.push(binding);
        record.bindingCandidates.push({ key, binding, image });
        gate();
        return binding;
    }
    // The historical method name is retained, but the single cleanup path is
    // kind-aware for mixed target/buffer victims, returns and terminal close.
    destroyPooledBuffer(handle, pool = this.bufferPool, cache = this.bindingCache) {
        this.bufferCleanup.add(handle);
        if (handle.kind === 'buffer')
            cache.invalidateBuffer(handle.identity);
        pool.detach(handle);
        if (handle.resource.cleaned)
            return;
        const failures = handle.kind === 'buffer' ? cleanupWebGPUBuffer(handle.resource) : cleanupWebGPUTexture(handle.resource);
        if (handle.resource.settlement === 'context-invalidated')
            pool.contextInvalidated(handle);
        else
            pool.destroyed(handle, failures.length === 0);
        if (failures.length) {
            this.noteUnknownResource(handle.resource);
            this.proofFailed(failures[0]);
            throw failures[0];
        }
        this.bufferCleanup.delete(handle);
    }
    closeBuffers() {
        this.bufferPool.invalidate();
        this.bindingCache.clear();
        this.closingBuffers = this.bufferPool.detachIdleForClose();
        for (const handle of this.closingBuffers) {
            try {
                this.destroyPooledBuffer(handle);
            }
            catch (cause) {
                this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', null, true);
            }
        }
        for (const handle of this.bufferCleanup) {
            if (handle.resource.cleaned)
                continue;
            try {
                this.destroyPooledBuffer(handle);
            }
            catch (cause) {
                this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', null, true);
            }
        }
        this.closingBuffers = [];
    }
    ownedDepth(width, height, record, gate) {
        gate();
        const texture = (record.owner?.native.texture ?? this.texture)({ size: { width, height, depthOrArrayLayers: 1 }, dimension: '2d', format: 'depth32float', mipLevelCount: 1, sampleCount: 1, usage: 16 });
        // Ownership precedes every gate and getter, including a getter that
        // calls close. A failed cleanup capture is never retried by retirement.
        const resource = { texture, destroy: () => { throw new TypeError('uncaptured depth destroy'); }, cleaned: false, logicalByteLength: 4 * width * height };
        if (record.owner)
            resource.generation = record.owner;
        record.textures.push(resource);
        let destroy;
        try {
            destroy = this.method(texture, 'destroy', () => undefined);
        }
        catch (cause) {
            record.unsafe = true;
            this.proofFailed(cause);
            throw cause;
        }
        Object.assign(resource, { destroy });
        gate();
        const createView = this.method(texture, 'createView', gate);
        const view = createView();
        record.views.push(view);
        gate();
        return view;
    }
    admitScene(value, deferDevice = false, allowSharedImages = false) {
        const functions = B1_FUNCTIONS.get(this);
        // Only the actual CPU module's identity predicate grants access to
        // immutable fields. Foreign objects/proxies receive no property reads.
        if (!functions || !functions.isSceneFrame3D(value))
            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
        const scene = value, count = scene.draws.length, distinct = scene.geometries.length, cardCount = scene.cards?.length ?? 0;
        // Legacy scene routes have no shared image-page admission or sampled pass.
        if (cardCount > 0 && !allowSharedImages)
            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
        if (count + cardCount > B1_LIMITS.draws || distinct > B1_LIMITS.geometries)
            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_BUDGET');
        let vertexAttributes, lambertCount = 0;
        for (const draw of scene.draws) {
            if (draw.lambert) {
                if (!draw.texture)
                    throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
                lambertCount++;
            }
            if (draw.texture) {
                if (!allowSharedImages)
                    throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
                // Authentic frames assign one UV and optional normal table per geometry identity.
                (vertexAttributes ??= new Map()).set(draw.geometry, { texcoords: draw.texture.texcoords, normals: draw.lambert?.normals });
            }
        }
        let cpuBytes = 0, sceneBytes = 0;
        const uniformBytes = 64 * count + (LAMBERT_UNIFORM_BYTES - 64) * lambertCount + CARD_UNIFORM_BYTES * cardCount;
        for (const geometry of scene.geometries) {
            const attributes = vertexAttributes?.get(geometry), components = attributes?.normals ? 11 : attributes ? 8 : 6;
            const vertexBytes = 4 * components * geometry.vertexCount, indexBytes = 4 * geometry.indexCount;
            cpuBytes += 8 * (components * geometry.vertexCount + geometry.indexCount);
            sceneBytes += vertexBytes + indexBytes;
            if (!deferDevice && (vertexBytes > this.limits.maxBufferSize || indexBytes > this.limits.maxBufferSize))
                throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
        }
        if (![cpuBytes, sceneBytes, uniformBytes].every(Number.isSafeInteger) || cpuBytes > B1_LIMITS.cpu || sceneBytes > B1_LIMITS.scene || uniformBytes > B1_LIMITS.uniform)
            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_BUDGET');
        if (cpuBytes !== scene.cpuLogicalBytes || sceneBytes !== scene.sceneBytes || uniformBytes !== scene.uniformBytes)
            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
        if (!deferDevice && count > 0 && 64 > this.limits.maxBufferSize)
            throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
        return { scene, functions, sceneBytes, uniformBytes, depthBytes: 0, vertexAttributes, lambertCount, meshes: [], draws: [], cards: [] };
    }
    packScene(plan, trustedFailures, textureViews) {
        const packed = new Map();
        for (const geometry of plan.scene.geometries) {
            let mesh;
            try {
                const attributes = plan.vertexAttributes?.get(geometry);
                // Only the authenticated shared B1 factory supports UV and normal payloads.
                const pack = plan.functions.packMeshGeometry3D;
                mesh = attributes ? pack(geometry, attributes.texcoords, attributes.normals) : plan.functions.packMeshGeometry3D(geometry);
            }
            catch (cause) {
                // Origin is queried only at this trusted invocation boundary;
                // a foreign class/code is never authority for helper mapping.
                const origin = plan.functions.getMeshPacking3DErrorOrigin(cause);
                const code = origin === 'budget' ? 'WEBGPU_FRAME_BUDGET' : origin === 'validation' && cause.code === 'MESH3D_PACK_F32_UNSUPPORTED' ? 'WEBGPU_PRECISION_UNSUPPORTED' : 'WEBGPU_FRAME_INVALID';
                const failure = new ClassifiedWebGPUFailure(code, cause);
                trustedFailures?.add(failure);
                throw failure;
            }
            this.active();
            packed.set(geometry, mesh);
            plan.meshes.push(mesh);
        }
        for (const draw of plan.scene.draws) {
            const mesh = packed.get(draw.geometry);
            if (!mesh) {
                const failure = new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
                trustedFailures?.add(failure);
                throw failure;
            }
            // CPU MVP is an immutable 16-number tuple. Upload its column-major
            // float32 ABI directly: no elements property, transpose or Y flip.
            const lambert = draw.lambert !== undefined;
            const uniform = lambert ? packSharedSceneLambertUniform3D(draw) : new Float32Array(draw.mvp);
            const viewIndex = mesh.indexCount > 0 ? textureViews?.get(draw.geometry) : undefined;
            if (mesh.indexCount > 0 && draw.texture && viewIndex === undefined) {
                const failure = new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
                trustedFailures?.add(failure);
                throw failure;
            }
            this.active();
            plan.draws.push({ mesh, uniform, viewIndex, lambert });
        }
    }
    preflight(input, sceneInput) {
        try {
            const scene = arguments.length === 2 ? this.admitScene(sceneInput) : undefined;
            const copied = copyMixedFrame2D(input, this.options);
            this.active();
            if (scene) {
                if (copied.frame.clearAlpha !== 1)
                    throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID');
                scene.depthBytes = 4 * copied.width * copied.height;
                if (!Number.isSafeInteger(scene.depthBytes) || scene.depthBytes > B1_LIMITS.depth)
                    throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_BUDGET');
            }
            // Reserve every scene byte, including each empty draw's uniform,
            // before existing UI packing consumes its remaining upload budget.
            const reserved = scene ? scene.sceneBytes + scene.uniformBytes : 0;
            if (reserved > this.options.maxUploadBytes)
                throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_BUDGET');
            const preparation = this.preparationCache.context(scene ? 2 : 0, this.options);
            const prepared = prepareMixedDraws2D(copied.frame, copied.width, copied.height, this.options, preparation);
            let projectionPlan;
            let projectionFailure;
            try {
                projectionPlan = planImageProjections(copied.frame, 'premultiplied', failure => { projectionFailure = failure; });
            }
            catch (cause) {
                // Fence owned planner faults before the broader helper-class mappings.
                // An old admission object or undefined is not authority for this call.
                if (projectionFailure !== undefined && projectionFailure === cause)
                    throw new ClassifiedWebGPUFailure(projectionFailure.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_FRAME_INVALID', cause);
                throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID', cause);
            }
            if (copied.width > this.limits.maxTextureDimension2D || copied.height > this.limits.maxTextureDimension2D)
                throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
            for (const view of projectionPlan.views) {
                if (view.region.width > this.limits.maxTextureDimension2D || view.region.height > this.limits.maxTextureDimension2D)
                    throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
            }
            const draws = [];
            let upload = reserved;
            for (const draw of prepared) {
                const remainingUpload = this.options.maxUploadBytes - upload;
                if (draw.kind === 'rect') {
                    // Preserve rectangle caller-budget-before-device precedence without a concat copy.
                    const rangeSources = [];
                    const packed = packWebGPUVertices(draw.prepared, copied.width, copied.height, { maxUploadBytes: remainingUpload, maxBufferSize: this.limits.maxBufferSize }, undefined, rangeSources, draw.cacheSlot);
                    const rangeCommands = rangeSources.map(index => draw.commandIndices[index]);
                    const rangeClips = rangeCommands.map(index => copied.frame.commands[index].clips);
                    upload += packed.data.byteLength;
                    draws.push({ kind: 'rect', packed, rangeCommands, rangeClips });
                }
                else {
                    let packed;
                    try {
                        packed = packImageVertices2D(draw.prepared, copied.width, copied.height, Math.min(remainingUpload, this.limits.maxBufferSize), undefined, draw.cacheSlot);
                    }
                    catch (cause) {
                        if (cause instanceof ImagePackingAllocationError)
                            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID', cause.original);
                        // This conversion is confined to the trusted packer, never a GPU/caller throw.
                        if (cause instanceof GeometryPreparationError && cause.reason === 'budget' && this.limits.maxBufferSize < remainingUpload)
                            throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT', cause.cause);
                        throw cause;
                    }
                    upload += packed.data.byteLength;
                    if (packed.vertexCount > 0) {
                        if (16 > this.options.maxUploadBytes - upload)
                            throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_BUDGET');
                        if (16 > this.limits.maxBufferSize)
                            throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
                        upload += 16;
                    }
                    const command = copied.frame.commands[draw.commandIndex];
                    draws.push({ kind: 'image', packed, viewIndex: projectionPlan.commandViews[draw.commandIndex], alpha: command.alpha, clips: command.clips, ...(command.kind === 'image' ? { crop: command.sourceRect } : {}), uniform: undefined });
                }
            }
            let rowPitch = 0, staging = 0, output = 0;
            const ticket = this.ticket && !this.ticket.bound ? this.ticket : undefined;
            if (ticket) {
                rowPitch = Math.ceil(copied.width * 4 / 256) * 256;
                staging = rowPitch * copied.height;
                output = copied.width * copied.height * 4;
                if (![rowPitch, staging, output, staging + output].every(Number.isSafeInteger) || staging + output > this.options.maxReadbackBytes)
                    throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_BUDGET');
                if (staging > this.limits.maxBufferSize)
                    throw new ClassifiedWebGPUFailure('WEBGPU_DEVICE_LIMIT');
            }
            const capacity = () => {
                if (this.ledger.size >= this.options.maxPendingFrames || upload > this.options.maxPendingUploadBytes - this.pendingUploadBytes || staging + output > this.options.maxReadbackBytes - this.pendingReadbackBytes || projectionPlan.projectionBytes > IMAGE_LIMITS_2D.maxPendingTextureBytes - this.pendingTextureBytes)
                    throw new ClassifiedWebGPUFailure('WEBGPU_BACKPRESSURE');
                if (scene && (scene.sceneBytes > B1_LIMITS.pendingScene - this.pendingSceneBytes || scene.uniformBytes > B1_LIMITS.pendingUniform - this.pendingUniformBytes || scene.depthBytes > B1_LIMITS.pendingDepth - this.pendingDepthBytes))
                    throw new ClassifiedWebGPUFailure('WEBGPU_BACKPRESSURE');
            };
            capacity();
            if (this.lastSerial === Number.MAX_SAFE_INTEGER)
                throw new ClassifiedWebGPUFailure('WEBGPU_SERIAL_EXHAUSTED');
            // Logical admission remains unchanged. Only covered READY hits skip copying;
            // cold and zero-coverage crops retain their original preparation order.
            const imagePlan = this.planImageResidency(projectionPlan, draws);
            let projections;
            try {
                projections = projectionPlan.views.map((view, index) => imagePlan.use.hits.has(index) ? undefined : copyProjectionPixels(view, 'premultiplied'));
                for (const draw of draws)
                    if (draw.kind === 'image' && draw.packed.vertexCount > 0)
                        draw.uniform = new Float32Array([draw.alpha, 0, 0, 0]);
            }
            catch (cause) {
                throw new ClassifiedWebGPUFailure('WEBGPU_FRAME_INVALID', cause);
            }
            // Only whole admitted frames reach the trusted scene allocations.
            // Reentrant stop/close is observed again before any ledger mutation.
            if (scene)
                this.packScene(scene);
            this.active();
            capacity();
            return { ...copied, draws, upload, geometryBytes: 0, projectionPlan, projections, rowPitch, staging, output, ticket, scene, imagePlan };
        }
        catch (cause) {
            if (this.state !== 'active')
                throw this.stateError();
            if (cause instanceof ClassifiedWebGPUFailure)
                throw cause.publicError;
            if (cause instanceof FrameInputReadError)
                throw error('WEBGPU_FRAME_INVALID', cause.cause);
            if (cause instanceof FrameCopyError)
                throw error(cause.reason === 'backing' ? 'WEBGPU_BACKING_LIMIT' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_FRAME_INVALID', cause.cause);
            if (cause instanceof ImageProjectionError)
                throw error(cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_FRAME_INVALID', cause);
            if (cause instanceof GeometryPreparationError)
                throw error(cause.reason === 'range' ? 'WEBGPU_GEOMETRY_RANGE' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_PRECISION_UNSUPPORTED', cause.cause);
            if (cause instanceof WebGPUPackingError)
                throw error(cause.reason === 'device' ? 'WEBGPU_DEVICE_LIMIT' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_PRECISION_UNSUPPORTED', cause.cause);
            throw error('WEBGPU_FRAME_INVALID', cause);
        }
    }
    texturedOwnerSnapshot() {
        this.active();
        return { pendingFrames: this.ledger.size, pendingUploadBytes: this.pendingUploadBytes, pendingReadbackBytes: this.pendingReadbackBytes,
            pendingTextureBytes: this.pendingTextureBytes, pendingGeometryBytes: this.pendingGeometryBytes, serial: this.lastSerial };
    }
    texturedSceneOwnerSnapshot() {
        return { ...this.texturedOwnerSnapshot(), pendingSceneBytes: this.pendingSceneBytes,
            pendingUniformBytes: this.pendingUniformBytes, pendingDepthBytes: this.pendingDepthBytes };
    }
    /** Mapping requires the exact failure captured by this owned invocation. */
    ownedTexturedPreparationError(cause) {
        if (cause instanceof ImagePackingAllocationError || cause instanceof TexturedMeshPackingAllocationError)
            return error('WEBGPU_FRAME_INVALID', cause.original);
        if (cause instanceof TexturedFrameAdmissionError2D)
            return error(cause.reason === 'backing' ? 'WEBGPU_BACKING_LIMIT' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_FRAME_INVALID', cause);
        if (cause instanceof ImageProjectionError)
            return error(cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_FRAME_INVALID', cause);
        if (cause instanceof GeometryPreparationError)
            return error(cause.reason === 'range' ? 'WEBGPU_GEOMETRY_RANGE' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_PRECISION_UNSUPPORTED', cause.cause);
        if (cause instanceof WebGPUPackingError)
            return error(cause.reason === 'device' ? 'WEBGPU_DEVICE_LIMIT' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : 'WEBGPU_PRECISION_UNSUPPORTED', cause.cause);
        if (isTexturedSubmissionAdmissionError2D(cause))
            return error(cause.reason === 'device' ? 'WEBGPU_DEVICE_LIMIT' : cause.reason === 'backpressure' ? 'WEBGPU_BACKPRESSURE' : cause.reason === 'serial' ? 'WEBGPU_SERIAL_EXHAUSTED' : 'WEBGPU_FRAME_BUDGET', cause);
        return error('WEBGPU_FRAME_INVALID', cause);
    }
    preflightTextured(frame) {
        let ownedFailure;
        try {
            return runOwnedPreparationScope(() => {
                const options = TEXTURED_OPTIONS.get(this);
                const budget = new TexturedPreparationBudget2D(options);
                // Owned immutable clips may reuse only successful validation in this call.
                const admitted = admitTexturedFrame2D(frame, options, budget, true);
                // Register every image/Mesh crop before preparation can suppress coverage.
                const projectionPlan = planTexturedImageProjections(frame);
                // Only this ordinary TEXTURED path owns the ledger and enables contained clipping.
                // Direct helpers, MIXED, shared rendering and scene/B1 keep their original path.
                const draws = prepareTexturedDraws2D(admitted, options, budget, this.preparationCache.context(1, options), true);
                const ticket = this.ticket && !this.ticket.bound ? this.ticket : undefined;
                const storage = planTexturedSubmissionStorage2D({ admitted, draws, projectionPlan, options, hardware: this.limits,
                    owner: this.texturedOwnerSnapshot(), readback: ticket !== undefined });
                const payload = packTexturedDrawPayloads2D(storage, budget);
                const imagePlan = this.planImageResidency(projectionPlan, payload.draws);
                const plan = materializeTexturedSubmission2D(payload, new Set(imagePlan.use.hits.keys()), () => this.texturedOwnerSnapshot());
                return { ...plan, ticket, imagePlan };
            }, failure => { ownedFailure = failure; });
        }
        catch (cause) {
            // Stop/close/terminal state wins even when a concurrent owned allocation throws.
            if (this.state !== 'active')
                throw this.stateError();
            if (ownedFailure !== undefined && ownedFailure === cause) {
                throw this.ownedTexturedPreparationError(cause);
            }
            // Matching classes/codes, previous tokens and arbitrary native throws are foreign.
            throw error('WEBGPU_FRAME_INVALID', cause);
        }
    }
    preflightTexturedScene(sceneInput, overlayInput) {
        let ownedFailure;
        // A token from another invocation, including an allocation hook's old
        // private failure, cannot authorize this combined scene classification.
        let trustedSceneFailures;
        try {
            // This allocation may itself fail or reenter close. Keep it inside
            // the same state-first failure boundary as all later preparation.
            const sceneFailures = new WeakSet();
            trustedSceneFailures = sceneFailures;
            this.active();
            const sceneFailure = code => {
                const failure = new ClassifiedWebGPUFailure(code);
                sceneFailures.add(failure);
                throw failure;
            };
            return runOwnedPreparationScope(() => {
                const functions = B1_FUNCTIONS.get(this);
                // Authenticate both immutable inputs before either payload read.
                if (!functions || !functions.isSceneFrame3D(sceneInput))
                    sceneFailure('WEBGPU_FRAME_INVALID');
                const frame = readOwnedTexturedFrame(overlayInput);
                if (frame === undefined)
                    sceneFailure('WEBGPU_FRAME_INVALID');
                let scene;
                try {
                    scene = this.admitScene(sceneInput);
                }
                catch (cause) {
                    // Genuine metadata admission invokes no caller payload or GPU.
                    if (cause instanceof ClassifiedWebGPUFailure)
                        sceneFailures.add(cause);
                    throw cause;
                }
                if (frame.clearAlpha !== 1)
                    sceneFailure('WEBGPU_FRAME_INVALID');
                const options = TEXTURED_OPTIONS.get(this);
                const budget = new TexturedPreparationBudget2D(options);
                const admitted = admitTexturedFrame2D(frame, options, budget);
                const projectionPlan = planTexturedImageProjections(frame);
                const draws = prepareTexturedDraws2D(admitted, options, budget, this.preparationCache.context(3, options));
                // Reserve this exact ticket once; preparation may request a later one.
                const ticket = this.ticket && !this.ticket.bound ? this.ticket : undefined;
                const storage = planTexturedSubmissionStorage2D({ admitted, draws, projectionPlan, options, hardware: this.limits,
                    owner: this.texturedSceneOwnerSnapshot(), readback: ticket !== undefined,
                    sceneReservation: { sceneBytes: scene.sceneBytes, uniformBytes: scene.uniformBytes,
                        maxSceneBytes: B1_LIMITS.scene, maxUniformBytes: B1_LIMITS.uniform, maxDepthBytes: B1_LIMITS.depth,
                        maxPendingSceneBytes: B1_LIMITS.pendingScene, maxPendingUniformBytes: B1_LIMITS.pendingUniform, maxPendingDepthBytes: B1_LIMITS.pendingDepth } });
                scene.depthBytes = storage.sceneStorage.depthBytes;
                // Whole admission precedes both domains' payload allocations.
                this.packScene(scene, sceneFailures);
                this.active();
                const payload = packTexturedDrawPayloads2D(storage, budget, undefined, () => this.active());
                const imagePlan = this.planImageResidency(projectionPlan, payload.draws);
                const plan = materializeTexturedSubmission2D(payload, new Set(imagePlan.use.hits.keys()), () => this.texturedSceneOwnerSnapshot(), undefined, () => this.active());
                this.active();
                return { ...plan, ticket, scene, imagePlan };
            }, failure => { ownedFailure = failure; });
        }
        catch (cause) {
            if (this.state !== 'active')
                throw this.stateError();
            // B1 control flow is private; 2D mapping also needs this invocation.
            if (cause instanceof ClassifiedWebGPUFailure && trustedSceneFailures?.has(cause))
                throw cause.publicError;
            if (ownedFailure !== undefined && ownedFailure === cause)
                throw this.ownedTexturedPreparationError(cause);
            throw error('WEBGPU_FRAME_INVALID', cause);
        }
    }
    renderSceneTexturedOwnedFrame(scene, overlay) {
        this.active();
        if (this.busy)
            throw error('WEBGPU_REENTRANT');
        this.busy = true;
        this.cpu = deferred();
        try {
            return this.submitPrepared(this.preflightTexturedScene(scene, overlay));
        }
        finally {
            this.busy = false;
            this.cpu.resolve();
        }
    }
    renderTexturedOwnedFrame(input) {
        this.active();
        if (this.busy)
            throw error('WEBGPU_REENTRANT');
        if (SHARED_OPTIONS.has(this))
            throw error('WEBGPU_FRAME_PROFILE_UNSUPPORTED');
        this.busy = true;
        this.cpu = deferred();
        try {
            if (readOwnedSharedFrame(input) !== undefined)
                throw error('WEBGPU_FRAME_PROFILE_UNSUPPORTED');
            const frame = readOwnedTexturedFrame(input);
            if (frame === undefined)
                throw error('WEBGPU_FRAME_INVALID');
            return this.submitPrepared(this.preflightTextured(frame));
        }
        finally {
            this.busy = false;
            this.cpu.resolve();
        }
    }
    renderFrame(input) {
        return this.render(input);
    }
    render(input, sceneInput) {
        if (this.busy)
            throw error('WEBGPU_REENTRANT');
        this.active();
        this.busy = true;
        this.cpu = deferred();
        try {
            // Preserve the legacy busy/state priority, then refuse the new owned protocol.
            if (SHARED_OPTIONS.has(this) || readOwnedSharedFrame(input) !== undefined || readOwnedTexturedFrame(input) !== undefined)
                throw error('WEBGPU_FRAME_PROFILE_UNSUPPORTED');
            const p = arguments.length === 2 ? this.preflight(input, sceneInput) : this.preflight(input);
            return this.submitPrepared(p);
        }
        finally {
            this.busy = false;
            this.cpu.resolve();
        }
    }
    sharedOwnerSnapshot() {
        this.active();
        return { ...this.texturedSceneOwnerSnapshot(), pendingSceneBytes: this.pendingSceneBytes, pendingUniformBytes: this.pendingUniformBytes, pendingDepthBytes: this.pendingDepthBytes, pendingColorBytes: this.pendingColorBytes, pendingCanonicalBytes: this.pendingCanonicalBytes };
    }
    renderSharedOwnedFrame(input, sceneInput, staging) {
        this.active();
        if (this.busy)
            throw error('WEBGPU_REENTRANT');
        this.busy = true;
        this.cpu = deferred();
        let batch, signal, materialized = 0;
        const hasScene = staging ? staging.scene : arguments.length === 2;
        try {
            let ownedFailure;
            const trusted = new WeakSet();
            const refuse = code => { const failure = new ClassifiedWebGPUFailure(code); trusted.add(failure); throw failure; };
            let admitted;
            try {
                admitted = runOwnedPreparationScope(() => {
                    const options = SHARED_OPTIONS.get(this);
                    if (!options)
                        refuse('WEBGPU_FRAME_PROFILE_UNSUPPORTED');
                    const frame = readOwnedSharedFrame(input);
                    if (!frame)
                        refuse('WEBGPU_FRAME_PROFILE_UNSUPPORTED');
                    const functions = B1_FUNCTIONS.get(this);
                    if (hasScene && (!SHARED_SCENE_OWNERS.has(this) || !functions?.isSceneFrame3D(sceneInput)))
                        refuse('WEBGPU_FRAME_INVALID');
                    if (staging) {
                        try {
                            signal = this.captureStageSignal(staging.options);
                        }
                        catch (cause) {
                            if (cause instanceof ClassifiedWebGPUFailure)
                                trusted.add(cause);
                            throw cause;
                        }
                    }
                    if (frame.outputAlpha !== options.outputAlpha || frame.outputRepresentation !== (options.outputAlpha === 'opaque' ? 'egret.srgb-opaque-unorm8/1' : 'egret.srgb-premultiplied-unorm8/1'))
                        refuse('WEBGPU_FRAME_PROFILE_UNSUPPORTED');
                    if (options.outputAlpha === 'opaque' && frame.clearAlpha !== 1)
                        refuse('WEBGPU_FRAME_INVALID');
                    const width = Math.ceil(frame.width * options.pixelRatio), height = Math.ceil(frame.height * options.pixelRatio);
                    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width > 4294967295 || height > 4294967295 || width > Math.floor(options.maxBackingPixels / height))
                        refuse('WEBGPU_BACKING_LIMIT');
                    let scene;
                    if (hasScene) {
                        try {
                            scene = this.admitScene(sceneInput, true, true);
                        }
                        catch (cause) {
                            if (cause instanceof ClassifiedWebGPUFailure)
                                trusted.add(cause);
                            throw cause;
                        }
                        scene.depthBytes = 4 * width * height;
                    }
                    const overlay = prepareSharedDraws2D(frame, width, height, options), ticket = this.ticket && !this.ticket.bound ? this.ticket : undefined;
                    const cards = scene?.scene.cards;
                    const attached = scene ? attachSharedSceneSources2D(overlay, cards ?? [], scene.scene.draws) : undefined;
                    const prepared = attached?.prepared ?? overlay;
                    // Joint logical fees include scene geometry, uniforms, and merged image pages before native work.
                    const sceneBufferBytes = scene ? scene.scene.geometries.flatMap(geometry => {
                        const attributes = scene.vertexAttributes?.get(geometry), stride = attributes?.normals ? 44 : attributes ? 32 : 24;
                        return [stride * geometry.vertexCount, 4 * geometry.indexCount];
                    }) : [];
                    if (scene && scene.scene.draws.length > 0)
                        sceneBufferBytes.push(scene.lambertCount ? LAMBERT_UNIFORM_BYTES : 64);
                    if (cards?.length)
                        sceneBufferBytes.push(CARD_UNIFORM_BYTES);
                    const storage = planSharedSubmission2D(prepared, options, { ...this.limits, sceneBufferBytes }, this.sharedOwnerSnapshot(), staging ? options.enableReadback : ticket !== undefined, scene, attached?.projectionPlan);
                    if (scene) {
                        this.packScene(scene, trusted, attached?.textureViews);
                        if (cards && attached)
                            for (const [index, card] of cards.entries()) {
                                scene.cards.push({ viewIndex: attached.cardViews[index], uniform: packSharedSceneCardUniform3D(card) });
                            }
                    }
                    this.active();
                    const packed = packSharedSubmission2D(prepared);
                    this.active();
                    const demands = [];
                    for (const entry of packed) {
                        if ('barrier' in entry)
                            continue;
                        const viewIndex = entry.prepared.pageIndex;
                        if (viewIndex === undefined)
                            demands.push({ kind: 'rect' });
                        else
                            demands.push({ kind: entry.prepared.command.kind === 'mesh' ? 'mesh' : 'image', packed: { vertexCount: entry.vertexCount }, viewIndex });
                    }
                    for (const group of prepared.effects.groups)
                        if (group.maskPageIndex !== undefined)
                            demands.push({ kind: 'image', packed: { vertexCount: 3 }, viewIndex: group.maskPageIndex });
                    if (scene) {
                        for (const draw of scene.draws)
                            if (draw.viewIndex !== undefined)
                                demands.push({ kind: 'mesh', packed: draw.mesh, viewIndex: draw.viewIndex });
                        for (const card of scene.cards)
                            demands.push({ kind: 'image', packed: { vertexCount: 6 }, viewIndex: card.viewIndex });
                    }
                    const imagePlan = this.planImageResidency(storage.projectionPlan, demands, true);
                    const pages = materializeSharedPages2D(storage, new Set(imagePlan.use.candidates.keys()), this.sharedOwnerSnapshot(), this.resourceCpu);
                    materialized = pages.canonicalBytes;
                    this.active();
                    checkSharedCapacity2D(storage, this.sharedOwnerSnapshot(), pages.canonicalBytes);
                    batch = prepareSharedBatches2D(packed, this.limits.maxBufferSize, this.batchScratch);
                    this.active();
                    return { storage, imagePlan, ...pages, scene, ticket, batch };
                }, failure => { ownedFailure = failure; });
            }
            catch (cause) {
                if (this.state !== 'active')
                    throw this.stateError();
                if (cause instanceof ClassifiedWebGPUFailure && trusted.has(cause))
                    throw cause.publicError;
                if (cause === ownedFailure) {
                    if (cause instanceof SharedPreparationError)
                        throw error(cause.reason === 'profile' ? 'WEBGPU_FRAME_PROFILE_UNSUPPORTED' : cause.reason === 'budget' ? 'WEBGPU_FRAME_BUDGET' : cause.reason === 'precision' ? 'WEBGPU_PRECISION_UNSUPPORTED' : 'WEBGPU_FRAME_INVALID', cause);
                    if (cause instanceof SharedStorageError2D)
                        throw error(cause.reason === 'device' ? 'WEBGPU_DEVICE_LIMIT' : cause.reason === 'backpressure' ? 'WEBGPU_BACKPRESSURE' : cause.reason === 'serial' ? 'WEBGPU_SERIAL_EXHAUSTED' : 'WEBGPU_FRAME_BUDGET', cause);
                    if (cause instanceof GeometryPreparationError)
                        throw this.ownedTexturedPreparationError(cause);
                }
                throw error('WEBGPU_FRAME_INVALID', cause);
            }
            return this.submitShared(admitted, staging ? { signal } : undefined);
        }
        finally {
            if (!batch?.transferred)
                this.resourceCpu.canonicalBytes -= materialized;
            if (batch && !batch.transferred)
                this.batchScratch.release(batch);
            this.busy = false;
            this.cpu.resolve();
        }
    }
    captureStageSignal(options) {
        const gate = () => this.active();
        try {
            if (options !== undefined && !isObject(options))
                throw new TypeError('Upload options');
            const signal = options?.signal;
            gate();
            if (signal === undefined)
                return undefined;
            if (!isObject(signal))
                throw new TypeError('Upload signal');
            const add = this.method(signal, 'addEventListener', gate), remove = this.method(signal, 'removeEventListener', gate);
            const aborted = signal.aborted;
            gate();
            if (typeof aborted !== 'boolean')
                throw new TypeError('Signal aborted');
            const captured = { signal, add, remove, aborted: false, abortFailure: undefined, readingReason: false };
            if (aborted) {
                const failure = this.stageAbortReason(captured);
                throw new ClassifiedWebGPUFailure(failure.code, failure.cause, failure);
            }
            return captured;
        }
        catch (cause) {
            if (this.state !== 'active')
                throw this.stateError();
            if (cause instanceof ClassifiedWebGPUFailure)
                throw cause;
            throw new ClassifiedWebGPUFailure('WEBGPU_UPLOAD_OPTIONS_INVALID', cause);
        }
    }
    stageAbortReason(signal) {
        if (signal.abortFailure)
            return signal.abortFailure;
        signal.aborted = true;
        signal.readingReason = true;
        let failure;
        try {
            const reason = signal.signal.reason;
            failure = error('WEBGPU_UPLOAD_ABORTED', reason);
        }
        catch (cause) {
            failure = error('WEBGPU_UPLOAD_OPTIONS_INVALID', cause);
        }
        signal.readingReason = false;
        if (this.state !== 'active')
            failure = this.stateError();
        signal.abortFailure = failure;
        return failure;
    }
    stageGate(record) {
        this.active();
        if (record.owner !== this.owner || record.owner?.invalidated)
            throw error('WEBGPU_UPLOAD_STALE');
        if (record.stage && !record.stage.failure && record.stage.phase !== 'submitted' && this.now() >= record.stage.deadline)
            this.revokeStage(record, error('WEBGPU_UPLOAD_EXPIRED'));
        this.active();
        if (record.stage?.failure)
            throw record.stage.failure;
        if (record.stage?.phase === 'revoked')
            throw error('WEBGPU_UPLOAD_ABORTED');
    }
    removeStageListener(stage) {
        if (stage.removeOnce)
            return;
        stage.removeOnce = true;
        stage.cancelDeadline?.();
        stage.cancelDeadline = undefined;
        const listener = stage.listener, signal = stage.signal;
        stage.listener = undefined;
        stage.signal = undefined;
        if (listener && signal)
            signal.remove('abort', listener);
    }
    /** A retained public ticket closes over only its cleared record, never admission arguments. */
    createStageHandle(record) {
        const stage = record.stage;
        const host = this;
        const handle = Object.freeze({
            ready: stage.ready.promise,
            submit() { if (this !== handle)
                throw error('WEBGPU_UPLOAD_INVALID'); return host.submitStage(record); },
            dispose() { if (this !== handle)
                throw error('WEBGPU_UPLOAD_INVALID'); if (stage.phase === 'submitted' || stage.phase === 'revoked')
                return; host.revokeStage(record, error('WEBGPU_UPLOAD_DISPOSED')); }
        });
        return handle;
    }
    admitStageRecord(record, p, done, signal, deadline) {
        const stage = { deadline, plan: p, frameId: p.storage.prepared.frame.frameId, generation: record.owner.number, done, ready: deferred(), native: deferred(), signal, phase: 'admitted',
            failure: undefined, returned: false, listener: undefined, removeOnce: false, cancelDeadline: undefined, recipe: undefined, writes: [], cursor: 0, outcomes: [], touched: false, proofStarted: false, proofSettled: false, inside: false };
        record.stage = stage;
        record.completion = observed(done.promise.then(() => { if (record.failure)
            throw record.failure; }));
        const handle = this.createStageHandle(record);
        try {
            stage.cancelDeadline = this.ownedTimeout(() => this.revokeStage(record, error('WEBGPU_UPLOAD_EXPIRED')), 10000);
            if (signal) {
                stage.listener = () => {
                    if (signal.aborted || stage.phase === 'submitted' || stage.phase === 'revoked')
                        return;
                    // Revoke authority before the controlled reason getter, but publish its tagged result afterwards.
                    stage.phase = 'revoked';
                    signal.aborted = true;
                    const failure = this.stageAbortReason(signal);
                    this.revokeStage(record, failure);
                };
                signal.add('abort', stage.listener, { once: true });
                this.active();
                const aborted = signal.signal.aborted;
                this.active();
                if (typeof aborted !== 'boolean')
                    throw new TypeError('Signal aborted');
                if (aborted && !signal.aborted)
                    stage.listener();
                if (stage.failure)
                    throw stage.failure;
            }
            this.stageGate(record);
            for (const handle of record.bufferPlan.victims)
                this.bufferCleanup.add(handle);
            this.beginImageResidency(record, p.imagePlan);
            this.bufferPool.claim(record.bufferPlan);
            record.bufferClaimed = true;
            this.stageGate(record);
            stage.returned = true;
            this.scheduleStagePump();
            return handle;
        }
        catch (cause) {
            const failure = this.state !== 'active' ? this.stateError() : stage.failure ?? error('WEBGPU_UPLOAD_OPTIONS_INVALID', cause);
            // No native operation has begun. Subscription failures unwind this exact charged record synchronously.
            stage.phase = 'revoked';
            stage.failure = failure;
            record.failure = failure;
            stage.ready.reject(failure);
            stage.native.reject(failure);
            try {
                this.removeStageListener(stage);
            }
            catch { }
            try {
                this.retire(record);
            }
            finally {
                done.resolve();
            }
            throw failure;
        }
    }
    revokeStages(cause) {
        // Latch every authority before the first captured signal-removal callback can reenter.
        const affected = [];
        for (const record of this.ledger) {
            const stage = record.stage;
            if (stage && stage.phase !== 'submitted' && !stage.failure) {
                stage.phase = 'revoked';
                stage.failure = cause;
                record.failure ??= cause;
                stage.ready.reject(cause);
                stage.native.reject(cause);
                affected.push(record);
            }
        }
        for (const record of affected)
            this.finishStageRevocation(record);
    }
    revokeStage(record, cause) {
        const stage = record.stage;
        if (stage.phase === 'submitted' || stage.failure)
            return;
        stage.phase = 'revoked';
        stage.failure = this.state === 'active' ? cause : this.stateError();
        record.failure ??= stage.failure;
        stage.ready.reject(stage.failure);
        stage.native.reject(stage.failure);
        this.finishStageRevocation(record);
    }
    finishStageRevocation(record) {
        const stage = record.stage;
        try {
            this.removeStageListener(stage);
        }
        catch (cause) {
            stage.failure ??= error('WEBGPU_UPLOAD_OPTIONS_INVALID', cause);
            record.failure ??= stage.failure;
        }
        if (![...this.ledger].some(item => item.stage?.phase === 'admitted' || item.stage?.phase === 'uploading')) {
            this.cancelStagePump?.();
            this.cancelStagePump = undefined;
            this.stagePumpScheduled = false;
        }
        if (!stage.returned || stage.inside)
            return;
        if (stage.proofSettled)
            this.retireStage(record);
        else if (!stage.proofStarted)
            this.proveStage(record);
    }
    retireStage(record) {
        const stage = record.stage;
        // Scope rejection and observer failure are Host/owner classifications.
        // Latch them before the shared retirement sink can release this record.
        if (this.unsafe || record.owner?.unknown)
            record.unsafe = true;
        try {
            if (!record.unsafe)
                this.retire(record);
        }
        catch (cause) {
            record.unsafe = true;
            record.failure ??= this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', record.serial, true);
        }
        finally {
            stage.writes.length = 0;
            stage.recipe = undefined;
            stage.done.resolve();
        }
    }
    scheduleStagePump() {
        if (this.stagePumpScheduled)
            return;
        this.stagePumpScheduled = true;
        this.cancelStagePump = this.ownedTimeout(() => { this.cancelStagePump = undefined; this.stagePumpScheduled = false; this.pumpStages(); }, 0);
    }
    pumpStages() {
        if (this.busy) {
            this.scheduleStagePump();
            return;
        }
        let remaining = 4194304, more = false;
        this.busy = true;
        this.cpu = deferred();
        try {
            for (const record of this.ledger) {
                const stage = record.stage;
                if (!stage || (stage.phase !== 'admitted' && stage.phase !== 'uploading'))
                    continue;
                if (remaining === 0) {
                    more = true;
                    continue;
                }
                stage.inside = true;
                const gate = () => this.stageGate(record);
                try {
                    gate();
                    stage.phase = 'uploading';
                    this.scoped(null, 'frame', stage.outcomes, gate, () => {
                        if (!stage.recipe) {
                            for (const entry of stage.plan.imagePlan.victims) {
                                gate();
                                this.destroyReadyImage(entry);
                                gate();
                            }
                            for (const handle of record.bufferPlan.victims) {
                                gate();
                                this.destroyPooledBuffer(handle);
                                gate();
                            }
                            const color = record.bufferPlan.requests.find(request => request.kind === 'color').id;
                            const depth = record.bufferPlan.requests.find(request => request.kind === 'depth')?.id;
                            stage.recipe = this.prepareSharedGPU(record, stage.plan, color, depth, gate);
                        }
                        while (stage.cursor < stage.writes.length) {
                            const write = stage.writes[stage.cursor];
                            const unit = write.kind === 'buffer' ? write.unit : 4 * write.width;
                            const available = write.kind === 'buffer' ? write.data.byteLength - write.offset : 4 * write.width * write.height - write.offset;
                            const count = Math.min(available, Math.floor(remaining / unit) * unit);
                            if (count === 0) {
                                more = true;
                                break;
                            }
                            gate();
                            stage.touched = true;
                            if (record.imageUse)
                                record.imageUse.touchedQueue = true;
                            if (write.kind === 'buffer') {
                                const view = new Uint8Array(write.data.buffer, write.data.byteOffset + write.offset, count);
                                record.owner.native.write(write.buffer, write.offset, view);
                            }
                            else {
                                const row = write.width * 4, rows = count / row;
                                record.owner.native.writeTexture({ texture: write.texture, mipLevel: 0, origin: { x: 0, y: write.offset / row, z: 0 }, aspect: 'all' }, write.data, { offset: write.offset, bytesPerRow: row, rowsPerImage: rows }, { width: write.width, height: rows, depthOrArrayLayers: 1 });
                                this.resourcePageWrite(count);
                            }
                            write.offset += count;
                            remaining -= count;
                            gate();
                            if (count === available)
                                stage.cursor++;
                        }
                    });
                }
                catch (cause) {
                    const failure = stage.failure ?? (this.state !== 'active' ? this.stateError() : cause instanceof ClassifiedWebGPUFailure ? cause.publicError : this.fail('WEBGPU_RENDER_FAILED', cause, 'frame', null));
                    this.revokeStage(record, failure);
                }
                finally {
                    stage.inside = false;
                }
                if (stage.failure || stage.cursor === stage.writes.length)
                    this.proveStage(record);
                else
                    more = true;
            }
        }
        finally {
            this.busy = false;
            this.cpu.resolve();
        }
        if (more && this.state === 'active')
            this.scheduleStagePump();
    }
    proveStage(record) {
        const stage = record.stage;
        if (stage.proofStarted)
            return;
        stage.proofStarted = true;
        if (!stage.failure)
            stage.phase = 'proof';
        const outcomes = [...stage.outcomes];
        if (stage.touched) {
            try {
                outcomes.push(observed(record.owner.fence()).catch(cause => { throw this.recordAsyncFailure(record, 'WEBGPU_QUEUE_FAILED', cause, 'frame'); }));
            }
            catch (cause) {
                outcomes.push(observed(Promise.reject(this.recordAsyncFailure(record, 'WEBGPU_QUEUE_FAILED', cause, 'frame'))));
            }
        }
        observed(Promise.allSettled(outcomes).then(results => {
            stage.proofSettled = true;
            const rejected = results.find(result => result.status === 'rejected');
            if (rejected?.status === 'rejected' && !stage.failure) {
                const cause = rejected.reason;
                this.revokeStage(record, cause instanceof ClassifiedWebGPUFailure ? cause.publicError : cause);
            }
            if (!stage.failure) {
                try {
                    this.stageGate(record);
                    stage.phase = 'ready';
                    stage.ready.resolve(Object.freeze({ generation: stage.generation, frameId: stage.frameId }));
                }
                catch (cause) {
                    this.revokeStage(record, cause);
                }
            }
            if (stage.failure)
                this.retireStage(record);
        })).catch(cause => { record.unsafe = true; record.failure = this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', null, true); stage.ready.reject(record.failure); stage.done.resolve(); });
    }
    submitStage(record) {
        const stage = record.stage;
        this.active();
        if (this.busy)
            throw error('WEBGPU_REENTRANT');
        if (stage.generation !== this.generation || this.owner?.invalidated)
            throw error('WEBGPU_UPLOAD_STALE');
        if (stage.phase === 'submitted')
            throw error('WEBGPU_UPLOAD_USED');
        if (!stage.failure && this.now() >= stage.deadline)
            this.revokeStage(record, error('WEBGPU_UPLOAD_EXPIRED'));
        this.active();
        if (stage.failure)
            throw stage.failure;
        if (stage.phase !== 'ready')
            throw error('WEBGPU_UPLOAD_NOT_READY');
        if (this.lastSerial === Number.MAX_SAFE_INTEGER)
            throw error('WEBGPU_SERIAL_EXHAUSTED');
        this.busy = true;
        this.cpu = deferred();
        const plan = stage.plan, { storage } = plan, { frame, width, height } = storage.prepared;
        let ticket, staging, synchronous, submitted = false, touched = false;
        const outcomes = [];
        try {
            record.serial = ++this.lastSerial;
            stage.phase = 'submitted';
            if (record.imageUse)
                record.imageUse.touchedQueue = false;
            ticket = this.ticket && !this.ticket.bound ? this.ticket : undefined;
            if (ticket)
                ticket.bound = true;
            this.removeStageListener(stage);
            const gate = () => { this.active(); if (record.owner !== this.owner || record.owner?.invalidated)
                throw error('WEBGPU_UPLOAD_STALE'); };
            this.scoped(record.serial, 'frame', outcomes, gate, () => {
                const oldWidth = this.surface.width;
                gate();
                const oldHeight = this.surface.height;
                gate();
                if (oldWidth !== width) {
                    this.surface.width = width;
                    gate();
                }
                if (oldHeight !== height) {
                    this.surface.height = height;
                    gate();
                }
                const actualWidth = this.surface.width;
                gate();
                const actualHeight = this.surface.height;
                gate();
                if (actualWidth !== width || actualHeight !== height)
                    throw new Error('Canvas rejected dimensions');
                if (oldWidth !== width || oldHeight !== height)
                    this.configureSurface(gate);
                staging = ticket ? this.ownedBuffer(storage.staging, 9, record, gate) : undefined;
                touched = true;
                submitted = this.drawSharedGPU(record, plan, stage.recipe, staging, ticket, gate);
            });
        }
        catch (cause) {
            synchronous = this.state !== 'active' ? this.stateError() : cause instanceof ClassifiedWebGPUFailure ? cause.publicError : this.fail('WEBGPU_RENDER_FAILED', cause, 'frame', record.serial);
            record.failure = synchronous;
        }
        try {
            this.finishSubmission(record, ticket, stage.done, outcomes, touched, synchronous, submitted, staging, frame.frameId, width, height, storage.rowPitch, storage.output);
            return Object.freeze({ generation: stage.generation, frameId: frame.frameId, serial: record.serial, completed: stage.native.promise });
        }
        finally {
            this.busy = false;
            this.cpu.resolve();
        }
    }
    recordAsyncFailure(record, code, cause, phase) {
        const owner = record.owner;
        if (owner?.invalidated && !owner.unknown && !record.unsafe)
            return record.failure ?? error('WEBGPU_DEVICE_LOST', cause);
        record.unsafe = true;
        if (owner)
            owner.unknown = true;
        if (owner && this.owner !== owner) {
            this.proofFailed(cause);
            return error(code, cause);
        }
        return this.fail(code, cause, phase, record.serial, true);
    }
    submissionTarget(record, requestId, gate) {
        gate();
        const request = record.bufferPlan.requests[requestId];
        if (request.kind === 'buffer')
            throw new TypeError('Expected target lease');
        let lease = record.bufferLeases[requestId];
        if (!lease) {
            const raw = record.shared?.rawTargets.find(slot => slot.requestId === requestId);
            if (!raw)
                throw new TypeError('Missing raw target owner');
            // The slot already exists: retain the returned native object before
            // allocating its registered wrapper or reading any external method.
            raw.logicalByteLength = request.byteLength;
            raw.texture = (record.owner?.native.texture ?? this.texture)({ size: { width: request.width, height: request.height, depthOrArrayLayers: 1 }, dimension: '2d', format: request.format, mipLevelCount: 1, sampleCount: 1, usage: request.usage });
            const texture = raw.texture;
            try {
                raw.destroy = this.method(texture, 'destroy', () => undefined);
            }
            catch (cause) {
                record.unsafe = true;
                this.proofFailed(cause);
                throw cause;
            }
            gate();
            const resource = { texture, destroy: raw.destroy, cleaned: false, logicalByteLength: request.byteLength, ...(raw.diagnosticUnknown ? { diagnosticUnknown: true } : {}) };
            if (record.owner)
                resource.generation = record.owner;
            lease = (record.owner?.pool ?? this.bufferPool).registerCreated(request, resource);
            record.bufferLeases[requestId] = lease;
            // Only the completed, recorded registration transfers ownership.
            raw.texture = undefined;
            raw.destroy = undefined;
        }
        if (lease.handle.kind === 'buffer')
            throw new TypeError('Target lease kind');
        const resource = lease.handle.resource, view = this.method(resource.texture, 'createView', gate)();
        record.views.push(view);
        gate();
        return { resource, view };
    }
    submitShared(p, stageInput) {
        const { storage, imagePlan, scene, batch } = p, { prepared } = storage, { frame, width, height } = prepared;
        this.assertImagePlanCurrent(imagePlan);
        const requests = [];
        const buffer = (role, usage, byteLength) => { if (byteLength > 0)
            requests.push({ kind: 'buffer', id: requests.length, role, usage, byteLength }); };
        for (const draw of batch.draws) {
            buffer('vertex', 40, draw.data.byteLength);
            buffer('uniform', 72, 128);
        }
        if (scene) {
            for (const mesh of scene.meshes) {
                buffer('vertex', 40, mesh.vertexBytes);
                buffer('index', 24, mesh.indexBytes);
            }
            for (const draw of scene.draws)
                buffer('uniform', 72, draw.uniform.byteLength);
            for (const card of scene.cards)
                buffer('uniform', 72, card.uniform.byteLength);
        }
        for (const group of prepared.effects.groups)
            buffer('uniform', 72, group.uniform.byteLength);
        const colorId = requests.length;
        requests.push({ kind: 'color', id: colorId, width, height, format: 'rgba8unorm-srgb', usage: 20, byteLength: storage.colorBytes, sampleCount: 1, mipLevelCount: 1, depthOrArrayLayers: 1, recipe: 'egret.srgb-pma8-target/1' });
        for (let i = 0; i < prepared.effects.targetCount; i++)
            requests.push({ kind: 'color', id: requests.length, width, height, format: 'rgba8unorm-srgb', usage: 20, byteLength: storage.colorBytes, sampleCount: 1, mipLevelCount: 1, depthOrArrayLayers: 1, recipe: 'egret.srgb-pma8-target/1' });
        const depthId = scene ? requests.length : undefined;
        if (scene)
            requests.push({ kind: 'depth', id: depthId, width, height, format: 'depth32float', usage: 16, byteLength: scene.depthBytes, sampleCount: 1, mipLevelCount: 1, depthOrArrayLayers: 1, recipe: 'egret.shared-reverse-depth/1' });
        const bufferPlan = this.bufferPool.plan(requests), bufferLeases = new Array(requests.length).fill(undefined);
        for (const lease of bufferPlan.leases)
            bufferLeases[lease.requestId] = lease;
        const rawTargets = [{ requestId: colorId, texture: undefined, destroy: undefined, cleanupAttempted: false }];
        for (let i = 0; i < prepared.effects.targetCount; i++)
            rawTargets.push({ requestId: colorId + 1 + i, texture: undefined, destroy: undefined, cleanupAttempted: false });
        if (depthId !== undefined)
            rawTargets.push({ requestId: depthId, texture: undefined, destroy: undefined, cleanupAttempted: false });
        this.assertImagePlanCurrent(imagePlan);
        checkSharedCapacity2D(storage, this.sharedOwnerSnapshot(), p.canonicalBytes);
        const stageDeadline = stageInput ? this.now() + 10000 : 0;
        this.active();
        const owner = this.owner;
        // This shared-only path requires the exact prepared generation before charging a record.
        if (!owner || owner.invalidated || owner.number !== this.generation || owner.device !== this.device
            || owner.epoch !== imagePlan.epoch || owner.pool !== this.bufferPool)
            throw error('WEBGPU_DEVICE_LOST', this.generationFailure?.cause);
        const serial = stageInput ? 0 : ++this.lastSerial, done = deferred();
        const record = { owner, batchPlan: batch, shared: { frame, draws: batch.draws, colorBytes: storage.colorBytes + storage.effectBytes, canonicalBytes: p.canonicalBytes, rawTargets },
            serial, upload: storage.upload, readback: storage.staging + storage.output, textureBytes: prepared.pageBytes, geometryBytes: prepared.geometryBytes,
            sceneBytes: scene?.sceneBytes ?? 0, uniformBytes: scene?.uniformBytes ?? 0, depthBytes: scene?.depthBytes ?? 0,
            resources: [], textures: [], views: [], bindings: [], frame: undefined, projectionPlan: storage.projectionPlan, projections: p.projections, draws: [], imageUse: undefined,
            bufferPlan, bufferClaimed: false, bufferLeases, bufferReturns: undefined, retiring: false, bindingCandidates: [], scene: scene?.scene, meshes: scene?.meshes ?? [], sceneDraws: scene?.draws ?? [],
            outcome: done.promise, completion: done.promise, failure: undefined, unsafe: false, retired: false };
        this.ledger.add(record);
        batch.transferred = true;
        this.pendingUploadBytes += record.upload;
        this.pendingReadbackBytes += record.readback;
        this.pendingTextureBytes += record.textureBytes;
        this.pendingGeometryBytes += record.geometryBytes;
        this.pendingSceneBytes += record.sceneBytes;
        this.pendingUniformBytes += record.uniformBytes;
        this.pendingDepthBytes += record.depthBytes;
        // Active targets and retained canonical CPU arrays have separate ledgers.
        // Neither is an upload byte or a second idle retention allowance.
        this.pendingColorBytes += storage.colorBytes + storage.effectBytes;
        this.pendingCanonicalBytes += p.canonicalBytes;
        this.sampleResourcePending();
        if (stageInput)
            return this.admitStageRecord(record, p, done, stageInput.signal, stageDeadline);
        const ticket = p.ticket;
        if (ticket)
            ticket.bound = true;
        const outcomes = [];
        let touchedQueue = false, synchronous, staging, submitted = false;
        const gate = () => this.active();
        try {
            for (const handle of bufferPlan.victims)
                this.bufferCleanup.add(handle);
            const imageUse = this.beginImageResidency(record, imagePlan);
            this.bufferPool.claim(bufferPlan);
            record.bufferClaimed = true;
            for (const entry of imagePlan.victims) {
                gate();
                this.destroyReadyImage(entry);
                gate();
            }
            for (const handle of bufferPlan.victims) {
                gate();
                this.destroyPooledBuffer(handle);
                gate();
            }
            this.scoped(serial, 'frame', outcomes, gate, () => {
                const oldWidth = this.surface.width;
                gate();
                const oldHeight = this.surface.height;
                gate();
                if (oldWidth !== width) {
                    this.surface.width = width;
                    gate();
                }
                if (oldHeight !== height) {
                    this.surface.height = height;
                    gate();
                }
                const actualWidth = this.surface.width;
                gate();
                const actualHeight = this.surface.height;
                gate();
                if (actualWidth !== width || actualHeight !== height)
                    throw new Error('Canvas rejected dimensions');
                if (oldWidth !== width || oldHeight !== height)
                    this.configureSurface(gate);
                const recipe = this.prepareSharedGPU(record, p, colorId, depthId, gate);
                const { vertices, bindings, meshes, sceneBindings, color, depth, resolveBinding } = recipe;
                staging = ticket ? this.ownedBuffer(storage.staging, 9, record, gate) : undefined;
                touchedQueue = true;
                submitted = this.drawSharedGPU(record, p, recipe, staging, ticket, gate);
            });
        }
        catch (cause) {
            synchronous = cause instanceof ClassifiedWebGPUFailure ? cause.publicError : this.fail('WEBGPU_RENDER_FAILED', cause, 'frame', serial);
            record.failure = synchronous;
        }
        return this.finishSubmission(record, ticket, done, outcomes, touchedQueue, synchronous, submitted, staging, frame.frameId, width, height, storage.rowPitch, storage.output);
    }
    prepareSharedGPU(record, p, colorId, depthId, gate) {
        const { batch, scene } = p, imageUse = record.imageUse;
        const realized = new Map();
        for (const draw of batch.draws) {
            const index = draw.prepared.pageIndex;
            if (index !== undefined && !realized.has(index))
                realized.set(index, this.realizeImageResidency(record, imageUse, index, gate));
        }
        for (const group of p.storage.prepared.effects.groups) {
            const index = group.maskPageIndex;
            if (index !== undefined && !realized.has(index))
                realized.set(index, this.realizeImageResidency(record, imageUse, index, gate));
        }
        if (scene) {
            for (const draw of scene.draws) {
                const index = draw.viewIndex;
                if (index !== undefined && !realized.has(index))
                    realized.set(index, this.realizeImageResidency(record, imageUse, index, gate));
            }
            for (const card of scene.cards) {
                const index = card.viewIndex;
                if (!realized.has(index))
                    realized.set(index, this.realizeImageResidency(record, imageUse, index, gate));
            }
        }
        let requestId = 0;
        const vertices = new Map(), bindings = new Map();
        for (const draw of batch.draws) {
            const vertex = this.submissionBuffer(record, requestId++, gate).handle.resource, lease = this.submissionBuffer(record, requestId++, gate), uniform = lease.handle.resource;
            vertices.set(draw, vertex);
            this.sharedWrite(record, vertex.buffer, draw.data, 44);
            gate();
            this.sharedWrite(record, uniform.buffer, draw.uniform, 128);
            gate();
            const source = draw.prepared, index = source.pageIndex, sampled = index !== undefined, role = this.sharedPipelines.get((sampled ? 'sampled:' : 'solid:') + source.material.blend);
            const image = sampled ? imageUse.hits.get(index) ?? imageUse.candidates.get(index).entry : undefined;
            const view = sampled ? realized.get(index).view : undefined, sampler = sampled ? this.sharedSamplers.get(source.material.filter + ':' + source.material.addressU + ':' + source.material.addressV) : undefined;
            const key = { session: this.imageEpoch, layout: role.layout, texture: image?.identity, view, sampler, uniform: lease.handle, offset: 0, size: 128 };
            const entries = [{ binding: 0, resource: { buffer: uniform.buffer, offset: 0, size: 128 } }];
            if (sampled)
                entries.push({ binding: 1, resource: view }, { binding: 2, resource: sampler });
            bindings.set(draw, this.submissionBinding(record, key, entries, image, gate));
        }
        const meshes = new Map(), sceneBindings = new Map();
        if (scene) {
            for (const mesh of scene.meshes) {
                const vertex = mesh.vertexBytes ? this.submissionBuffer(record, requestId++, gate).handle.resource : undefined, index = mesh.indexBytes ? this.submissionBuffer(record, requestId++, gate).handle.resource : undefined;
                meshes.set(mesh, { vertex, index });
                if (vertex) {
                    this.sharedWrite(record, vertex.buffer, mesh.vertices, mesh.vertexBytes / mesh.vertexCount);
                    gate();
                }
                if (index) {
                    this.sharedWrite(record, index.buffer, mesh.indices, 4);
                    gate();
                }
            }
            for (const draw of scene.draws) {
                const lease = this.submissionBuffer(record, requestId++, gate);
                const size = draw.lambert ? LAMBERT_UNIFORM_BYTES : 64;
                this.sharedWrite(record, lease.handle.resource.buffer, draw.uniform, size);
                gate();
                const index = draw.viewIndex, layout = index === undefined ? this.meshLayout : draw.lambert ? this.lambertMeshLayout : this.texturedSceneMeshLayout;
                const image = index === undefined ? undefined : imageUse.hits.get(index) ?? imageUse.candidates.get(index).entry;
                const view = index === undefined ? undefined : realized.get(index).view;
                const key = { session: this.imageEpoch, layout, texture: image?.identity, view, sampler: undefined, uniform: lease.handle, offset: 0, size };
                const entries = [{ binding: 0, resource: { buffer: lease.handle.resource.buffer, offset: 0, size } }];
                if (view)
                    entries.push({ binding: 1, resource: view });
                sceneBindings.set(draw, this.submissionBinding(record, key, entries, image, gate));
            }
        }
        const cardBindings = [];
        if (scene)
            for (const card of scene.cards) {
                const lease = this.submissionBuffer(record, requestId++, gate);
                const uniform = lease.handle.resource.buffer, index = card.viewIndex;
                this.sharedWrite(record, uniform, card.uniform, CARD_UNIFORM_BYTES);
                gate();
                const image = imageUse.hits.get(index) ?? imageUse.candidates.get(index).entry;
                const view = realized.get(index).view;
                const key = { session: this.imageEpoch, layout: this.cardLayout, texture: image.identity, view, sampler: undefined, uniform: lease.handle, offset: 0, size: CARD_UNIFORM_BYTES };
                const entries = [{ binding: 0, resource: { buffer: uniform, offset: 0, size: CARD_UNIFORM_BYTES } }, { binding: 1, resource: view }];
                cardBindings.push(this.submissionBinding(record, key, entries, image, gate));
            }
        const effectUniforms = new Map();
        for (const group of p.storage.prepared.effects.groups) {
            const uniform = this.submissionBuffer(record, requestId++, gate).handle.resource;
            this.sharedWrite(record, uniform.buffer, group.uniform, 16);
            gate();
            effectUniforms.set(group, uniform);
        }
        const effectTargets = [];
        for (let i = 0; i < p.storage.prepared.effects.targetCount; i++)
            effectTargets.push(this.submissionTarget(record, colorId + 1 + i, gate));
        const effects = new Map();
        for (const group of p.storage.prepared.effects.groups) {
            const bindings = new Map(), source = effectTargets[(group.depth - 1) * 2], scratch = effectTargets[(group.depth - 1) * 2 + 1];
            for (const mode of EFFECT_PASSES) {
                const role = this.effectPipelines.get(mode);
                const entries = [{ binding: 0, resource: { buffer: effectUniforms.get(group).buffer, offset: 0, size: 448 } }, { binding: 1, resource: (mode === 'vertical' ? scratch : source).view }];
                if (mode === 'composite')
                    entries.push({ binding: 2, resource: group.maskPageIndex === undefined ? source.view : realized.get(group.maskPageIndex).view });
                const binding = record.owner.native.bindGroup({ layout: role.layout, entries });
                record.bindings.push(binding);
                gate();
                bindings.set(mode, binding);
            }
            effects.set(group, bindings);
        }
        const color = this.submissionTarget(record, colorId, gate), depth = depthId === undefined ? undefined : this.submissionTarget(record, depthId, gate);
        const resolveBinding = record.owner.native.bindGroup({ layout: this.resolveLayout, entries: [{ binding: 0, resource: color.view }] });
        record.bindings.push(resolveBinding);
        gate();
        return { vertices, bindings, meshes, sceneBindings, cardBindings, color, depth, resolveBinding, effectTargets, effects };
    }
    drawSharedGPU(record, p, recipe, staging, ticket, gate) {
        const { storage, scene, batch } = p, { frame, width, height } = storage.prepared, serial = record.serial;
        const { vertices, bindings, meshes, sceneBindings, color, depth, resolveBinding } = recipe;
        const texture = record.owner.native.currentTexture();
        gate();
        const canvasView = this.method(texture, 'createView', gate)();
        gate();
        const encoder = record.owner.native.encoder();
        gate();
        const begin = this.method(encoder, 'beginRenderPass', gate), finish = this.method(encoder, 'finish', gate), copy = ticket ? this.method(encoder, 'copyTextureToBuffer', gate) : undefined;
        const c = frame.clearColor, a = frame.clearAlpha;
        const attachment = { view: color.view, loadOp: 'clear', storeOp: 'store', clearValue: { r: a * decodeSharedSRGB(((c >>> 16) & 255) / 255), g: a * decodeSharedSRGB(((c >>> 8) & 255) / 255), b: a * decodeSharedSRGB((c & 255) / 255), a } };
        const capture = (pass, keys) => { const captured = {}; for (const key of keys) {
            const method = this.method(pass, key, gate);
            Object.defineProperty(captured, key, { value: (...args) => { gate(); const result = method(...args); gate(); return result; } });
        } return captured; };
        if (scene) {
            const raw = begin({ colorAttachments: [attachment], depthStencilAttachment: { view: depth.view, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' } });
            gate();
            const pass = capture(raw, scene.draws.some(draw => draw.mesh.indexCount > 0) ? ['setPipeline', 'setViewport', 'setScissorRect', 'setVertexBuffer', 'setIndexBuffer', 'setBindGroup', 'drawIndexed'] : []), end = this.method(raw, 'end', gate);
            for (const draw of scene.draws)
                if (draw.mesh.indexCount > 0) {
                    const mesh = meshes.get(draw.mesh);
                    const pipeline = draw.viewIndex === undefined ? this.meshPipeline : draw.lambert ? this.lambertMeshPipeline : this.texturedSceneMeshPipeline;
                    scene.functions.encodeWebGPUMesh(pass, pipeline, mesh.vertex.buffer, mesh.index.buffer, sceneBindings.get(draw), draw.mesh.indexCount, width, height);
                }
            // Opaque cards share the mesh depth attachment; the HUD opens a depth-free pass.
            if (recipe.cardBindings.length > 0) {
                const cards = capture(raw, ['setPipeline', 'setViewport', 'setScissorRect', 'setBindGroup', 'draw']);
                cards.setPipeline(this.cardPipeline);
                cards.setViewport(0, 0, width, height, 0, 1);
                cards.setScissorRect(0, 0, width, height);
                for (const binding of recipe.cardBindings) {
                    cards.setBindGroup(0, binding);
                    cards.draw(6);
                }
            }
            end();
            gate();
        }
        const openPass = (view, clear, initial = false) => {
            const colors = initial ? attachment : { view, loadOp: clear ? 'clear' : 'load', storeOp: 'store', ...(clear ? { clearValue: { r: 0, g: 0, b: 0, a: 0 } } : {}) };
            const raw = begin({ colorAttachments: [colors] });
            gate();
            return { pass: capture(raw, ['setPipeline', 'setViewport', 'setScissorRect', 'setVertexBuffer', 'setBindGroup', 'draw']), end: this.method(raw, 'end', gate) };
        };
        let active = openPass(color.view, false, !scene);
        const drawOne = (draw) => {
            const role = this.sharedPipelines.get((draw.prepared.pageIndex === undefined ? 'solid:' : 'sampled:') + draw.prepared.material.blend);
            active.pass.setPipeline(role.pipeline);
            active.pass.setViewport(0, 0, width, height, 0, 1);
            active.pass.setScissorRect(0, 0, width, height);
            active.pass.setVertexBuffer(0, vertices.get(draw).buffer);
            active.pass.setBindGroup(0, bindings.get(draw));
            active.pass.draw(draw.vertexCount);
        };
        if (storage.prepared.effects.groups.length === 0) {
            for (const draw of batch.draws)
                drawOne(draw);
        }
        else {
            const byOrdinal = new Map(batch.draws.map(draw => [draw.prepared.command.ordinal, draw]));
            const enters = new Map(storage.prepared.effects.groups.map(group => [group.enter, group])), exits = new Map(storage.prepared.effects.groups.map(group => [group.exit, group]));
            const effectPass = (group, mode, view, clear) => {
                const run = openPass(view, clear);
                run.pass.setPipeline(this.effectPipelines.get(mode).pipeline);
                run.pass.setViewport(0, 0, width, height, 0, 1);
                run.pass.setScissorRect(0, 0, width, height);
                run.pass.setBindGroup(0, recipe.effects.get(group).get(mode));
                run.pass.draw(3);
                run.end();
                gate();
            };
            for (const command of frame.commands) {
                const enter = enters.get(command.ordinal), exit = exits.get(command.ordinal);
                if (enter) {
                    active.end();
                    gate();
                    active = openPass(recipe.effectTargets[(enter.depth - 1) * 2].view, true);
                }
                else if (exit) {
                    active.end();
                    gate();
                    const source = recipe.effectTargets[(exit.depth - 1) * 2], scratch = recipe.effectTargets[(exit.depth - 1) * 2 + 1];
                    if (exit.radius > 0) {
                        effectPass(exit, 'horizontal', scratch.view, true);
                        effectPass(exit, 'vertical', source.view, true);
                    }
                    const parent = exit.depth === 1 ? color : recipe.effectTargets[(exit.depth - 2) * 2];
                    effectPass(exit, 'composite', parent.view, false);
                    active = openPass(parent.view, false);
                }
                else {
                    const draw = byOrdinal.get(command.ordinal);
                    if (draw)
                        drawOne(draw);
                }
            }
        }
        active.end();
        gate();
        const resolveRaw = begin({ colorAttachments: [{ view: canvasView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
        gate();
        const resolve = capture(resolveRaw, ['setPipeline', 'setViewport', 'setScissorRect', 'setBindGroup', 'draw']), endResolve = this.method(resolveRaw, 'end', gate);
        resolve.setPipeline(this.resolvePipeline);
        resolve.setViewport(0, 0, width, height, 0, 1);
        resolve.setScissorRect(0, 0, width, height);
        resolve.setBindGroup(0, resolveBinding);
        resolve.draw(3);
        endResolve();
        gate();
        if (staging) {
            try {
                copy({ texture }, { buffer: staging.buffer, bytesPerRow: storage.rowPitch, rowsPerImage: height }, { width, height, depthOrArrayLayers: 1 });
            }
            catch (cause) {
                throw new ClassifiedWebGPUFailure('WEBGPU_READBACK_FAILED', cause, this.fail('WEBGPU_READBACK_FAILED', cause, 'readback', serial));
            }
            gate();
        }
        const commands = finish();
        gate();
        record.owner.native.submit([commands]);
        gate();
        return true;
    }
    /** One queue, scope, fence, readback and retirement owner for every supported plan. */
    submitPrepared(p) {
        // All original logical admission, packing and per-draw uniform allocations
        // have finished. Extra concat storage has a separate bounded CPU owner.
        const batchPlan = prepareAdjacentBatches2D(p.draws, this.limits.maxBufferSize, this.batchScratch);
        try {
            this.active();
            return this.submitBatched({ ...p, draws: batchPlan.draws }, batchPlan);
        }
        finally {
            if (!batchPlan.transferred)
                this.batchScratch.release(batchPlan);
        }
    }
    submitBatched(p, batchPlan) {
        const imagePlan = p.imagePlan;
        this.assertImagePlanCurrent(imagePlan);
        const bufferPlan = this.planBuffers(p);
        const bufferLeases = new Array(bufferPlan.requests.length).fill(undefined);
        for (const lease of bufferPlan.leases)
            bufferLeases[lease.requestId] = lease;
        this.assertImagePlanCurrent(imagePlan);
        const serial = ++this.lastSerial, done = deferred();
        const record = { batchPlan, serial, upload: p.upload, readback: p.staging + p.output, textureBytes: p.projectionPlan.projectionBytes, geometryBytes: p.geometryBytes, sceneBytes: p.scene?.sceneBytes ?? 0, uniformBytes: p.scene?.uniformBytes ?? 0, depthBytes: p.scene?.depthBytes ?? 0, resources: [], textures: [], views: [], bindings: [], imageUse: undefined, bufferPlan, bufferClaimed: false, bufferLeases, bufferReturns: undefined, retiring: false, bindingCandidates: [], frame: p.frame, projectionPlan: p.projectionPlan, projections: p.projections, draws: p.draws, scene: p.scene?.scene, meshes: p.scene?.meshes ?? [], sceneDraws: p.scene?.draws ?? [], outcome: done.promise, completion: done.promise, failure: undefined, unsafe: false, retired: false };
        this.ledger.add(record);
        batchPlan.transferred = true;
        this.pendingUploadBytes += record.upload;
        this.pendingReadbackBytes += record.readback;
        this.pendingTextureBytes += record.textureBytes;
        this.pendingSceneBytes += record.sceneBytes;
        this.pendingUniformBytes += record.uniformBytes;
        this.pendingDepthBytes += record.depthBytes;
        this.pendingGeometryBytes += record.geometryBytes;
        // Bind precisely the unbound ticket whose capacity this preflight reserved.
        const ticket = p.ticket;
        if (ticket)
            ticket.bound = true;
        const outcomes = [];
        let touchedQueue = false, synchronous, staging, submitted = false;
        const gate = () => this.active();
        try {
            // Every match and victim has an owner before the first native call.
            for (const handle of bufferPlan.victims)
                this.bufferCleanup.add(handle);
            const imageUse = this.beginImageResidency(record, imagePlan);
            this.bufferPool.claim(bufferPlan);
            record.bufferClaimed = true;
            for (const entry of imagePlan.victims) {
                gate();
                this.destroyReadyImage(entry);
                gate();
            }
            for (const handle of bufferPlan.victims) {
                gate();
                this.destroyPooledBuffer(handle);
                gate();
            }
            let bufferRequest = 0;
            this.scoped(serial, 'frame', outcomes, gate, () => {
                const oldWidth = this.surface.width;
                gate();
                const oldHeight = this.surface.height;
                gate();
                if (oldWidth !== p.width) {
                    this.surface.width = p.width;
                    gate();
                }
                if (oldHeight !== p.height) {
                    this.surface.height = p.height;
                    gate();
                }
                const width = this.surface.width;
                gate();
                const height = this.surface.height;
                gate();
                if (width !== p.width || height !== p.height)
                    throw new Error('Canvas rejected dimensions');
                if (oldWidth !== p.width || oldHeight !== p.height)
                    this.configureSurface(gate);
                const realized = new Map();
                for (const draw of p.draws) {
                    if (draw.kind === 'rect' || draw.packed.vertexCount === 0 || realized.has(draw.viewIndex))
                        continue;
                    realized.set(draw.viewIndex, this.realizeImageResidency(record, imageUse, draw.viewIndex, gate));
                }
                const vertices = new Map();
                const bindings = new Map();
                for (const draw of p.draws) {
                    if (draw.packed.data.byteLength === 0)
                        continue;
                    const vertex = this.submissionBuffer(record, bufferRequest++, gate).handle.resource;
                    vertices.set(draw, vertex);
                    touchedQueue = true;
                    this.write(vertex.buffer, 0, draw.packed.data);
                    gate();
                    if (draw.kind !== 'rect') {
                        const lease = this.submissionBuffer(record, bufferRequest++, gate), uniform = lease.handle.resource;
                        touchedQueue = true;
                        this.write(uniform.buffer, 0, draw.uniform);
                        gate();
                        const image = imageUse.hits.get(draw.viewIndex) ?? imageUse.candidates.get(draw.viewIndex).entry;
                        const view = realized.get(draw.viewIndex).view;
                        const key = { session: this.imageEpoch, layout: draw.kind === 'mesh' ? this.texturedLayout : this.imageLayout,
                            texture: image.identity, view, sampler: this.sampler, uniform: lease.handle, offset: 0, size: 16 };
                        const binding = this.submissionBinding(record, key, [{ binding: 0, resource: view }, { binding: 1, resource: this.sampler },
                            { binding: 2, resource: { buffer: uniform.buffer, offset: 0, size: 16 } }], image, gate);
                        bindings.set(draw, binding);
                    }
                }
                let meshes;
                let sceneBindings;
                if (p.scene) {
                    meshes = new Map();
                    sceneBindings = new Map();
                    // The identity-keyed CPU plan packs and uploads each geometry
                    // once. Every draw, even an empty one, owns its 64-byte MVP.
                    // RGB remains the packer's encoded float32 payload; the
                    // opaque mesh pipeline adds no color-space conversion.
                    for (const mesh of p.scene.meshes) {
                        const vertex = mesh.vertexBytes > 0 ? this.submissionBuffer(record, bufferRequest++, gate).handle.resource : undefined;
                        const index = mesh.indexBytes > 0 ? this.submissionBuffer(record, bufferRequest++, gate).handle.resource : undefined;
                        meshes.set(mesh, { vertex, index });
                        if (vertex) {
                            touchedQueue = true;
                            this.write(vertex.buffer, 0, mesh.vertices);
                            gate();
                        }
                        if (index) {
                            touchedQueue = true;
                            this.write(index.buffer, 0, mesh.indices);
                            gate();
                        }
                    }
                    for (const draw of p.scene.draws) {
                        const lease = this.submissionBuffer(record, bufferRequest++, gate), uniform = lease.handle.resource;
                        touchedQueue = true;
                        this.write(uniform.buffer, 0, draw.uniform);
                        gate();
                        const key = { session: this.imageEpoch, layout: this.meshLayout, texture: undefined, view: undefined,
                            sampler: undefined, uniform: lease.handle, offset: 0, size: 64 };
                        const binding = this.submissionBinding(record, key, [{ binding: 0, resource: { buffer: uniform.buffer, offset: 0, size: 64 } }], undefined, gate);
                        sceneBindings.set(draw, binding);
                    }
                }
                const depth = p.scene ? this.ownedDepth(p.width, p.height, record, gate) : undefined;
                staging = ticket ? this.ownedBuffer(p.staging, 1 | 8, record, gate) : undefined;
                const texture = this.currentTexture();
                gate();
                const view = this.method(texture, 'createView', gate)();
                gate();
                const encoder = this.encoder();
                gate();
                const begin = this.method(encoder, 'beginRenderPass', gate), finish = this.method(encoder, 'finish', gate), copy = ticket ? this.method(encoder, 'copyTextureToBuffer', gate) : undefined;
                const color = p.frame.clearColor, alpha = p.frame.clearAlpha;
                const attachment = { view, loadOp: 'clear', storeOp: 'store', clearValue: { r: ((color >>> 16) & 255) / 255 * alpha, g: ((color >>> 8) & 255) / 255 * alpha, b: (color & 255) / 255 * alpha, a: alpha } };
                if (p.scene) {
                    // One target and encoder: reverse-depth scene first, then a
                    // depth-free painter pass that loads the stored scene color.
                    const scenePass = begin({ colorAttachments: [attachment], depthStencilAttachment: { view: depth, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' } });
                    gate();
                    const capturedScene = {};
                    const sceneMethods = p.scene.draws.some(draw => draw.mesh.indexCount > 0) ? ['setPipeline', 'setViewport', 'setScissorRect', 'setVertexBuffer', 'setIndexBuffer', 'setBindGroup', 'drawIndexed'] : [];
                    for (const key of sceneMethods) {
                        const method = this.method(scenePass, key, gate);
                        Object.defineProperty(capturedScene, key, { value: (...args) => { gate(); const value = method(...args); gate(); return value; } });
                    }
                    const endScene = this.method(scenePass, 'end', gate);
                    for (const draw of p.scene.draws) {
                        if (draw.mesh.indexCount === 0)
                            continue;
                        const mesh = meshes.get(draw.mesh);
                        p.scene.functions.encodeWebGPUMesh(capturedScene, this.meshPipeline, mesh.vertex.buffer, mesh.index.buffer, sceneBindings.get(draw), draw.mesh.indexCount, p.width, p.height);
                    }
                    endScene();
                    gate();
                }
                const pass = begin({ colorAttachments: [p.scene ? { view, loadOp: 'load', storeOp: 'store' } : attachment] });
                gate();
                // Capture each pass method once; wrappers check terminal state after every call.
                const captured = {};
                const clearOnlyRectangles = p.draws.length === 0 && p.frame.images === undefined;
                const hasImage = p.draws.some(draw => draw.kind !== 'rect' && draw.packed.vertexCount > 0);
                const hasDraw = clearOnlyRectangles || p.draws.some(draw => draw.kind === 'rect' || draw.packed.vertexCount > 0);
                const methods = hasDraw ? ['setPipeline', 'setViewport', 'setScissorRect', 'setVertexBuffer', 'draw'] : [];
                if (hasImage)
                    methods.push('setBindGroup');
                for (const key of methods) {
                    const method = this.method(pass, key, gate);
                    Object.defineProperty(captured, key, { value: (...args) => { gate(); const value = method(...args); gate(); return value; } });
                }
                const end = this.method(pass, 'end', gate);
                if (clearOnlyRectangles)
                    encodeWebGPURectangles(captured, this.pipeline, undefined, [], p.width, p.height);
                for (const draw of p.draws) {
                    if (draw.kind === 'rect')
                        encodeWebGPURectangles(captured, this.pipeline, vertices.get(draw)?.buffer, draw.packed.ranges, p.width, p.height);
                    else if (draw.packed.vertexCount > 0)
                        encodeWebGPUImage(captured, draw.kind === 'mesh' ? this.texturedPipeline : this.imagePipeline, vertices.get(draw).buffer, bindings.get(draw), draw.packed.vertexCount, p.width, p.height);
                }
                end();
                gate();
                if (staging) {
                    try {
                        copy({ texture }, { buffer: staging.buffer, bytesPerRow: p.rowPitch, rowsPerImage: p.height }, { width: p.width, height: p.height, depthOrArrayLayers: 1 });
                    }
                    catch (cause) {
                        throw new ClassifiedWebGPUFailure('WEBGPU_READBACK_FAILED', cause, this.fail('WEBGPU_READBACK_FAILED', cause, 'readback', serial));
                    }
                    gate();
                }
                const commands = finish();
                gate();
                touchedQueue = true;
                this.submit([commands]);
                submitted = true;
                gate();
            });
        }
        catch (cause) {
            synchronous = cause instanceof ClassifiedWebGPUFailure ? cause.publicError : this.fail('WEBGPU_RENDER_FAILED', cause, 'frame', serial);
            record.failure = synchronous;
        }
        return this.finishSubmission(record, ticket, done, outcomes, touchedQueue, synchronous, submitted, staging, p.frame.frameId, p.width, p.height, p.rowPitch, p.output);
    }
    finishSubmission(record, ticket, done, outcomes, touchedQueue, synchronous, submitted, staging, frameId, width, height, rowPitch, output) {
        const serial = record.serial;
        let result;
        const nativeOutcomes = [...outcomes], nativeFailure = synchronous;
        if (submitted && staging && !synchronous) {
            try {
                outcomes.push(this.readPixels(staging, record, frameId, width, height, rowPitch, output).then(value => { result = value; }));
            }
            catch (cause) {
                synchronous = this.recordAsyncFailure(record, 'WEBGPU_READBACK_FAILED', cause, 'readback');
                record.failure = synchronous;
            }
        }
        if (touchedQueue || record.imageUse?.touchedQueue) {
            let proof;
            try {
                proof = observed((record.owner?.fence ?? this.fence)()).catch(cause => { throw this.recordAsyncFailure(record, 'WEBGPU_QUEUE_FAILED', cause, 'frame'); });
            }
            catch (cause) {
                proof = observed(Promise.reject(this.recordAsyncFailure(record, 'WEBGPU_QUEUE_FAILED', cause, 'frame')));
            }
            outcomes.push(proof);
            nativeOutcomes.push(proof);
        }
        if (record.stage) {
            const stage = record.stage;
            observed(Promise.allSettled(nativeOutcomes).then(results => {
                const rejected = results.find(value => value.status === 'rejected');
                if (nativeFailure)
                    stage.native.reject(nativeFailure);
                else if (record.owner?.invalidated)
                    stage.native.reject(record.failure ?? error('WEBGPU_DEVICE_LOST'));
                else if (rejected?.status === 'rejected')
                    stage.native.reject(rejected.reason instanceof ClassifiedWebGPUFailure ? rejected.reason.publicError : rejected.reason);
                else
                    stage.native.resolve();
            }));
        }
        const settled = Promise.allSettled(outcomes).then(results => {
            const rejected = results.find(value => value.status === 'rejected');
            if (rejected?.status === 'rejected')
                record.failure ??= rejected.reason instanceof ClassifiedWebGPUFailure ? rejected.reason.publicError : rejected.reason;
            if (this.unsafe)
                record.unsafe = true;
            if (!record.unsafe)
                this.retire(record);
            if (ticket) {
                if (record.failure)
                    ticket.reject(record.failure);
                else if (!SHARED_OPTIONS.get(this)?.recovery && this.firstFailure)
                    ticket.reject(error(this.firstFailure.code, this.firstFailure.cause));
                else if (result)
                    ticket.resolve(result);
                else
                    ticket.reject(error('WEBGPU_READBACK_FAILED'));
                if (this.ticket === ticket)
                    this.ticket = undefined;
            }
            done.resolve();
        });
        observed(settled).catch(cause => { record.unsafe = true; record.failure = this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', serial, true); ticket?.reject(record.failure); done.resolve(); });
        record.completion = observed(done.promise.then(() => {
            if (record.failure)
                throw record.failure;
            if (!SHARED_OPTIONS.get(this)?.recovery && this.firstFailure && (this.firstFailure.serial === null || this.firstFailure.serial <= serial))
                throw error(this.firstFailure.code, this.firstFailure.cause);
        }));
        if (synchronous)
            throw synchronous;
        return undefined;
    }
    readPixels(staging, record, frameId, width, height, rowPitch, output) {
        const owner = record.owner, format = owner?.format ?? this.format, alpha = owner?.alpha ?? 'premultiplied';
        const mapping = observed(staging.map(1));
        return observed(mapping.then(() => {
            if (owner?.invalidated)
                throw record.failure ?? error('WEBGPU_DEVICE_LOST');
            staging.mapped = true;
            const mapped = new Uint8Array(staging.mappedRange()), bytes = new Uint8Array(output);
            if (owner?.invalidated)
                throw record.failure ?? error('WEBGPU_DEVICE_LOST');
            for (let y = 0; y < height; y++)
                bytes.set(mapped.subarray(y * rowPitch, y * rowPitch + width * 4), y * width * 4);
            if (format === 'bgra8unorm')
                for (let i = 0; i < bytes.length; i += 4) {
                    const blue = bytes[i];
                    bytes[i] = bytes[i + 2];
                    bytes[i + 2] = blue;
                }
            const value = { serial: record.serial, frameId, width, height, format: 'rgba8unorm', sourceFormat: format, colorSpace: 'srgb', alphaMode: alpha, bytes };
            return owner ? Object.freeze({ ...value, generation: owner.number }) : Object.freeze({ ...value, alphaMode: 'premultiplied' });
        }).catch(cause => { throw this.recordAsyncFailure(record, 'WEBGPU_READBACK_FAILED', cause, 'readback'); }));
    }
    retire(record) {
        if (record.retired || record.retiring)
            return;
        record.retiring = true;
        const pool = record.owner?.pool ?? this.bufferPool, cache = record.owner?.cache ?? this.bindingCache;
        if (record.unsafe || record.owner?.unknown)
            this.noteUnknownRecord(record);
        const failed = (cause) => {
            const failure = this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', record.serial, true);
            record.failure ??= failure;
            record.unsafe = true;
        };
        const cleanLease = (index) => {
            const lease = record.bufferLeases[index];
            if (!lease)
                return;
            try {
                this.destroyPooledBuffer(lease.handle, pool, cache);
            }
            catch (cause) {
                failed(cause);
            }
            // The persistent detached owner retains unknown destruction. If its
            // registration failed before cleanup, keep this record's exact slot.
            if (lease.handle.resource.cleaned)
                record.bufferLeases[index] = undefined;
        };
        try {
            // Admission can detach victims before the first scheduled task. Their existing
            // cleanup ownership must settle even when the stage is revoked before that task.
            if (record.stage?.plan && record.imageUse) {
                for (const entry of record.stage.plan.imagePlan.victims) {
                    if (entry.state === 'detached' && this.imageCleanup.has(entry) && !entry.resource.cleaned) {
                        try {
                            this.destroyReadyImage(entry);
                        }
                        catch (cause) {
                            failed(cause);
                        }
                    }
                }
            }
            if (record.stage && record.bufferClaimed) {
                for (const handle of record.bufferPlan.victims) {
                    if (this.bufferCleanup.has(handle) && !handle.resource.cleaned) {
                        try {
                            this.destroyPooledBuffer(handle, pool, cache);
                        }
                        catch (cause) {
                            failed(cause);
                        }
                    }
                }
            }
            if (!record.bufferClaimed)
                record.bufferLeases.fill(undefined);
            if (!record.bufferReturns && this.isReuseEligible(record)) {
                const leases = record.bufferLeases.filter((lease) => lease !== undefined);
                // Any later metadata failure leaves this exact reservation and
                // every lease reachable from the unretired ledger record.
                record.bufferReturns = pool.reserveReturns(leases);
            }
            const retained = new Set(record.bufferReturns?.retained);
            for (const resource of record.resources)
                for (const cause of cleanupWebGPUBuffer(resource))
                    failed(cause);
            for (let index = 0; index < record.bufferLeases.length; index++) {
                const lease = record.bufferLeases[index];
                if (lease && !retained.has(lease.handle))
                    cleanLease(index);
            }
            for (const resource of record.textures) {
                let candidateOwned = false;
                if (record.imageUse)
                    for (const candidate of record.imageUse.candidates.values()) {
                        if (candidate.entry.resource === resource) {
                            candidateOwned = true;
                            break;
                        }
                    }
                if (candidateOwned)
                    continue;
                for (const cause of cleanupWebGPUTexture(resource))
                    failed(cause);
            }
            if (record.shared)
                for (const raw of record.shared.rawTargets) {
                    if (raw.texture === undefined || raw.cleanupAttempted)
                        continue;
                    // Unknown cleanup is terminal. Keep the exact native owner and
                    // the submission charge; neither close nor a later retire retries.
                    raw.cleanupAttempted = true;
                    try {
                        if (!raw.destroy)
                            throw new TypeError('Target destruction method was not captured');
                        if (!record.owner?.invalidated)
                            raw.destroy();
                        raw.texture = undefined;
                        raw.destroy = undefined;
                    }
                    catch (cause) {
                        failed(cause);
                    }
                }
            this.finishImageResidency(record, !this.finalizing);
            if (record.bufferReturns) {
                let published = false;
                if (this.isReuseEligible(record)) {
                    try {
                        pool.publishReturns(record.bufferReturns);
                        published = true;
                    }
                    catch (cause) {
                        failed(cause);
                    }
                }
                if (published) {
                    // The pool is now the sole native owner. Clear only the
                    // transferred slots before any subsequent metadata work.
                    for (let index = 0; index < record.bufferLeases.length; index++) {
                        const lease = record.bufferLeases[index];
                        if (lease && retained.has(lease.handle))
                            record.bufferLeases[index] = undefined;
                    }
                    record.bufferReturns = undefined;
                }
                else {
                    pool.cancelReturns(record.bufferReturns);
                    record.bufferReturns = undefined;
                    for (let index = 0; index < record.bufferLeases.length; index++)
                        cleanLease(index);
                    retained.clear();
                }
            }
            if (this.isReuseEligible(record)) {
                try {
                    cache.publish(record.bindingCandidates.filter(candidate => retained.has(candidate.key.uniform)
                        && (!candidate.image || candidate.image.state === 'ready' && !candidate.image.resource.cleaned)));
                }
                catch (cause) {
                    failed(cause);
                }
            }
            // An uncompleted ownership transfer must retain both its ledger
            // charge and record for explicit close; never silently drop it.
            if (record.bufferLeases.some(lease => lease !== undefined))
                throw new TypeError('Unfinished buffer cleanup');
            if (record.shared?.rawTargets.some(raw => raw.texture !== undefined))
                throw new TypeError('Unfinished target cleanup');
            // New staged/recovery authority retains unknown charges. Legacy immediate
            // retirement releases logical accounting only after its once cleanup;
            // unsafe outcome and persistent detached owners remain quarantined.
            if ((record.stage || SHARED_OPTIONS.get(this)?.recovery) && (record.unsafe || record.resources.some(resource => resource.settlement === 'unknown') || record.textures.some(resource => resource.settlement === 'unknown')))
                throw new TypeError('Unknown native ownership remains charged');
            this.ledger.delete(record);
            this.pendingUploadBytes -= record.upload;
            this.pendingReadbackBytes -= record.readback;
            this.pendingTextureBytes -= record.textureBytes;
            this.pendingSceneBytes -= record.sceneBytes;
            this.pendingUniformBytes -= record.uniformBytes;
            this.pendingDepthBytes -= record.depthBytes;
            this.pendingGeometryBytes -= record.geometryBytes;
            if (record.shared) {
                this.pendingColorBytes -= record.shared.colorBytes;
                this.pendingCanonicalBytes -= record.shared.canonicalBytes;
                this.resourceCpu.canonicalBytes -= record.shared.canonicalBytes;
                record.shared.draws.length = 0;
                delete record.shared;
            }
            record.resources.length = 0;
            record.textures.length = 0;
            record.views.length = 0;
            record.bindings.length = 0;
            record.projections.length = 0;
            record.draws.length = 0;
            record.frame = undefined;
            record.projectionPlan = undefined;
            record.meshes.length = 0;
            record.sceneDraws.length = 0;
            record.scene = undefined;
            record.bufferLeases.length = 0;
            record.bindingCandidates.length = 0;
            this.batchScratch.release(record.batchPlan);
            record.retired = true;
            if (record.stage) {
                record.stage.writes.length = 0;
                record.stage.recipe = undefined;
                record.stage.outcomes.length = 0;
                record.stage.plan = undefined;
            }
            delete record.owner;
        }
        catch (cause) {
            failed(cause);
            throw cause;
        }
        finally {
            record.retiring = false;
        }
    }
    requestReadback() {
        try {
            this.active();
            if (!this.options.enableReadback)
                throw error('WEBGPU_READBACK_DISABLED');
            if (this.ticket)
                throw error('WEBGPU_READBACK_PENDING');
            this.ticket = { ...deferred(), bound: false };
            return this.ticket.promise;
        }
        catch (cause) {
            return observed(Promise.reject(cause));
        }
    }
    whenIdle() {
        if (this.cleanupOutcome === 'unsafe')
            return observed(Promise.reject(error('WEBGPU_CLOSE_UNSAFE', this.unsafeCause)));
        const shared = SHARED_OPTIONS.has(this), recovery = SHARED_OPTIONS.get(this)?.recovery;
        if (shared && (recovery || [...this.ledger].some(record => record.stage))) {
            const pending = [...this.ledger].map(record => record.completion);
            const capturedFailure = this.state === 'lost' || this.state === 'failed' ? this.generationFailure : null;
            if (this.startingPending && this.starting)
                pending.push(this.starting);
            const attempt = this.recoveryAttempt;
            if (attempt)
                pending.push(attempt.barrier.promise, attempt.actual);
            return observed(Promise.allSettled(pending).then(results => {
                const rejected = results.find(result => result.status === 'rejected');
                if (rejected?.status === 'rejected')
                    throw rejected.reason;
                if (capturedFailure)
                    throw error(capturedFailure.code, capturedFailure.cause);
            }));
        }
        if (this.firstFailure)
            return observed(Promise.reject(error(this.firstFailure.code, this.firstFailure.cause)));
        if (this.state === 'closed')
            return Promise.resolve();
        const serial = this.lastSerial, pending = [...this.ledger].map(record => record.completion);
        if (this.starting)
            pending.push(this.starting);
        return observed(Promise.allSettled(pending).then(results => { const failed = results.find(result => result.status === 'rejected'); if (failed?.status === 'rejected')
            throw failed.reason; if (this.firstFailure && (this.firstFailure.serial === null || this.firstFailure.serial <= serial))
            throw error(this.firstFailure.code, this.firstFailure.cause); }));
    }
    close() {
        if (this.closing)
            return this.closing;
        this.invalidateImageResidency();
        this.preparationCache.clear();
        const barrier = deferred();
        this.closing = barrier.promise;
        this.state = 'closing';
        this.cleanupOutcome = 'pending';
        this.revokeRecovery(error('WEBGPU_CLOSED'));
        this.revokeStages(error('WEBGPU_CLOSED'));
        this.cancelTicket(error('WEBGPU_CLOSED'));
        this.cleanup().then(barrier.resolve, barrier.reject);
        return barrier.promise;
    }
    async cleanup() {
        if (this.starting)
            await Promise.allSettled([this.starting]);
        if (this.recoveryAttempt)
            await Promise.allSettled([this.recoveryAttempt.actual]);
        if (this.busy)
            await this.cpu.promise;
        await Promise.allSettled([...this.ledger].map(record => record.outcome));
        if (this.fence && !this.unsafe && !this.owner?.invalidated) {
            try {
                await observed(this.fence());
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        this.finalizing = true;
        for (const record of [...this.ledger]) {
            try {
                this.retire(record);
            }
            catch (cause) {
                this.fail('WEBGPU_RENDER_FAILED', cause, 'cleanup', record.serial, true);
            }
        }
        this.closeBuffers();
        this.closeImageResidency();
        if (this.configured) {
            this.configured = false;
            try {
                this.unconfigure();
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        if (this.removeListener) {
            const remove = this.removeListener;
            this.removeListener = undefined;
            try {
                remove();
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        // Deliver a loss queued by a cleanup boundary before detaching the leased observer.
        await Promise.resolve();
        // The safe return boundary ends the borrowed lease; deliberate owned destruction is ignored.
        delete this.lossCell.notify;
        delete this.lossCell.unknown;
        if (this.destroyDevice) {
            const destroy = this.destroyDevice;
            this.destroyDevice = undefined;
            try {
                destroy();
            }
            catch (cause) {
                this.proofFailed(cause);
            }
        }
        this.cardPipeline = undefined;
        this.cardLayout = undefined;
        this.texturedSceneMeshPipeline = undefined;
        this.texturedSceneMeshLayout = undefined;
        this.lambertMeshPipeline = undefined;
        this.lambertMeshLayout = undefined;
        if (SHARED_OPTIONS.get(this)?.recovery && !this.unsafe) {
            this.borrowed = undefined;
            this.clearNativeReferences();
        }
        this.cleanupOutcome = this.unsafe ? 'unsafe' : 'safe';
        this.state = 'closed';
        if (this.unsafe)
            throw error('WEBGPU_CLOSE_UNSAFE', this.unsafeCause);
    }
    setTimeout(callback, delayMs) { return this.ownedTimeout(callback, delayMs); }
    ownedTimeout(callback, delayMs) {
        this.timers ??= { set: globalThis.setTimeout.bind(globalThis), clear: globalThis.clearTimeout.bind(globalThis) };
        const timer = this.timers.set(callback, delayMs);
        let cancelled = false;
        const clear = this.timers.clear;
        return () => { if (!cancelled) {
            cancelled = true;
            clear(timer);
        } };
    }
}
export function createWebGPUHost(options) { return new WebGPUHostImplementation(options); }
/** Opt-in factory; runtime identity comes exclusively from completed Engine captures. */
export function createTexturedWebGPUHost(options) {
    return new WebGPUHostImplementation(options, TEXTURED_MODE);
}
export function createB1WebGPUHostInternal(options) {
    // The closed constructor branch installs the two own methods. Keep them
    // out of the ordinary class type/prototype; this assertion adds no authority.
    return new WebGPUHostImplementation(options, B1_MODE);
}
export function createTexturedB1WebGPUHostInternal(options) {
    return new WebGPUHostImplementation(options, TEXTURED_SCENE_MODE);
}
export function createSharedWebGPUHost(options) { return new WebGPUHostImplementation(options, SHARED_MODE); }
export function createSharedSceneWebGPUHostInternal(options) { return new WebGPUHostImplementation(options, SHARED_SCENE_MODE); }
