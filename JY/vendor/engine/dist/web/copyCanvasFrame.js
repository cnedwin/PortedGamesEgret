import { IMAGE_LIMITS_2D, isImageData2D } from '@egret/contracts';
import { EgretError } from '@egret/runtime';
/** Private host boundary: source failures retain their original cause, not its apparent class. */
export class CanvasImageCopyError extends Error {
    reason;
    constructor(reason, options) {
        super(`Canvas image copy ${reason}`, options);
        this.reason = reason;
    }
}
function fail(state, failure) {
    // Only deliberate construction reports provenance; public instances from owned
    // operations cannot impersonate this invocation's exact escaping failure.
    state.onFailure?.(failure);
    throw failure;
}
function invalid(state) {
    return fail(state, state.imageObserved ? new CanvasImageCopyError('invalid') : new EgretError('CANVAS_FRAME_INVALID'));
}
function sourceOperation(state, action) {
    let failure;
    try {
        return action();
    }
    catch (cause) {
        if (!state.imageObserved)
            throw cause;
        failure = { cause };
    }
    // Notify after the source catch, so an observer fault is never a source read.
    return fail(state, new CanvasImageCopyError('read', { cause: failure.cause }));
}
function read(state, source, key) {
    return sourceOperation(state, () => source[key]);
}
function array(state, value) {
    return sourceOperation(state, () => Array.isArray(value));
}
function record(state, value) {
    if (typeof value !== 'object' || value === null)
        invalid(state);
    return value;
}
function finite(state, value) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        invalid(state);
    return value;
}
function alpha(state, value) {
    const result = finite(state, value);
    if (result < 0 || result > 1)
        invalid(state);
    return result;
}
function color(state, value) {
    const result = finite(state, value);
    if (!Number.isInteger(result) || result < 0 || result > 0xffffff)
        invalid(state);
    return result;
}
function matrix(state, value, ratio) {
    const source = record(state, value);
    const result = {
        a: finite(state, read(state, source, 'a')), b: finite(state, read(state, source, 'b')),
        c: finite(state, read(state, source, 'c')), d: finite(state, read(state, source, 'd')),
        tx: finite(state, read(state, source, 'tx')), ty: finite(state, read(state, source, 'ty')),
    };
    for (const component of Object.values(result))
        finite(state, component * ratio);
    return result;
}
function rectangle(state, value, transform, ratio) {
    const source = record(state, value);
    const result = {
        x: finite(state, read(state, source, 'x')), y: finite(state, read(state, source, 'y')),
        width: finite(state, read(state, source, 'width')), height: finite(state, read(state, source, 'height')),
    };
    if (result.width < 0 || result.height < 0)
        invalid(state);
    const right = finite(state, result.x + result.width);
    const bottom = finite(state, result.y + result.height);
    // Validate every derived corner before the first bitmap or state mutation.
    for (const x of [result.x, right]) {
        for (const y of [result.y, bottom]) {
            finite(state, finite(state, transform.a * x + transform.c * y + transform.tx) * ratio);
            finite(state, finite(state, transform.b * x + transform.d * y + transform.ty) * ratio);
        }
    }
    return result;
}
function length(state, value) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        invalid(state);
    return value;
}
function imageTable(state, value) {
    if (!array(state, value))
        invalid(state);
    const source = value;
    const count = length(state, read(state, source, 'length'));
    // Count rejection precedes allocation and every indexed read, including hostile proxies.
    if (count > IMAGE_LIMITS_2D.maxImagesPerFrame)
        fail(state, new CanvasImageCopyError('budget'));
    const images = [];
    for (let index = 0; index < count; index++) {
        const image = read(state, source, String(index));
        if (!isImageData2D(image))
            invalid(state);
        images.push(image);
    }
    // Authenticate the complete table before any metadata read or payload accounting.
    const identities = new Set();
    let bytes = 0;
    for (const image of images) {
        if (identities.has(image))
            continue;
        identities.add(image);
        bytes += image.byteLength;
        if (!Number.isSafeInteger(bytes) || bytes > IMAGE_LIMITS_2D.maxImageTableBytes)
            fail(state, new CanvasImageCopyError('budget'));
    }
    return Object.freeze(images);
}
function sourceRegion(state, value, image) {
    const source = record(state, value);
    // New region fields complete their snapshot before semantics; legacy geometry stays immediate.
    const x = read(state, source, 'x'), y = read(state, source, 'y');
    const width = read(state, source, 'width'), height = read(state, source, 'height');
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number' ||
        !Number.isSafeInteger(x) || !Number.isSafeInteger(y) || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
        x < 0 || y < 0 || width <= 0 || height <= 0 ||
        !Number.isSafeInteger(x + width) || !Number.isSafeInteger(y + height) || x + width > image.width || y + height > image.height)
        invalid(state);
    return Object.freeze({ x: x === 0 ? 0 : x, y: y === 0 ? 0 : y, width, height });
}
function copyCanvasFrameMode(value, ratio, budget, allowImages, onImageObserved, onFailure) {
    const state = { imageObserved: false, sourceIteration: false, onFailure };
    const source = record(state, value);
    const frameId = finite(state, read(state, source, 'frameId'));
    const width = finite(state, read(state, source, 'width'));
    const height = finite(state, read(state, source, 'height'));
    if (!Number.isSafeInteger(frameId) || frameId <= 0 || width <= 0 || height <= 0)
        invalid(state);
    const clearColor = color(state, read(state, source, 'clearColor'));
    const clearAlpha = alpha(state, read(state, source, 'clearAlpha'));
    const input = read(state, source, 'commands');
    if (!array(state, input))
        invalid(state);
    const commands = [];
    let images;
    let views;
    let viewCount = 0, projectionBytes = 0;
    let traversalFailure;
    try {
        // Native for-of retains custom iteration and IteratorClose precedence. Only its
        // machinery is source origin; body validation and owned allocation are not.
        state.sourceIteration = true;
        for (const item of input) {
            state.sourceIteration = false;
            const command = record(state, item);
            const kind = read(state, command, 'kind');
            if (allowImages && kind === 'image' && !state.imageObserved) {
                state.imageObserved = true;
                onImageObserved();
                images = imageTable(state, read(state, source, 'images'));
                views = new Map();
            }
            if (kind !== 'rect' && !(allowImages && kind === 'image'))
                invalid(state);
            const transform = matrix(state, read(state, command, 'matrix'), ratio);
            const rect = rectangle(state, read(state, command, 'rect'), transform, ratio);
            const fill = kind === 'rect' ? color(state, read(state, command, 'color')) : undefined;
            const opacity = alpha(state, read(state, command, 'alpha'));
            const inputClips = read(state, command, 'clips');
            if (!array(state, inputClips))
                invalid(state);
            const clips = [];
            if (kind === 'rect') {
                state.sourceIteration = true;
                for (const itemClip of inputClips) {
                    state.sourceIteration = false;
                    const clip = record(state, itemClip);
                    const clipMatrix = matrix(state, read(state, clip, 'matrix'), ratio);
                    clips.push({ matrix: clipMatrix, rect: rectangle(state, read(state, clip, 'rect'), clipMatrix, ratio) });
                    state.sourceIteration = true;
                }
                state.sourceIteration = false;
                commands.push({ kind: 'rect', matrix: transform, rect, color: fill, alpha: opacity, clips });
            }
            else {
                const clipSource = inputClips;
                const clipCount = length(state, read(state, clipSource, 'length'));
                for (let index = 0; index < clipCount; index++) {
                    const clip = record(state, read(state, clipSource, String(index)));
                    const clipMatrix = matrix(state, read(state, clip, 'matrix'), ratio);
                    clips.push(Object.freeze({ matrix: Object.freeze(clipMatrix), rect: Object.freeze(rectangle(state, read(state, clip, 'rect'), clipMatrix, ratio)) }));
                }
                const inputIndex = read(state, command, 'imageIndex');
                if (typeof inputIndex !== 'number' || !Number.isSafeInteger(inputIndex) || inputIndex < 0 || inputIndex >= images.length)
                    invalid(state);
                const imageIndex = inputIndex === 0 ? 0 : inputIndex;
                const image = images[imageIndex];
                const sourceRect = sourceRegion(state, read(state, command, 'sourceRect'), image);
                const key = `${sourceRect.x},${sourceRect.y},${sourceRect.width},${sourceRect.height}`;
                let regions = views.get(image);
                if (regions === undefined) {
                    regions = new Set();
                    views.set(image, regions);
                }
                if (!regions.has(key)) {
                    const bytes = 4 * sourceRect.width * sourceRect.height;
                    viewCount++;
                    projectionBytes += bytes;
                    if (viewCount > IMAGE_LIMITS_2D.maxViewsPerFrame || !Number.isSafeInteger(bytes) ||
                        !Number.isSafeInteger(projectionBytes) || projectionBytes > IMAGE_LIMITS_2D.maxProjectionBytes)
                        fail(state, new CanvasImageCopyError('budget'));
                    regions.add(key);
                }
                commands.push(Object.freeze({ kind: 'image', matrix: Object.freeze(transform), rect: Object.freeze(rect), alpha: opacity, clips: Object.freeze(clips), imageIndex, sourceRect }));
            }
            state.sourceIteration = true;
        }
        state.sourceIteration = false;
    }
    catch (cause) {
        traversalFailure = { cause, source: state.imageObserved && state.sourceIteration };
    }
    if (traversalFailure !== undefined) {
        // Native IteratorClose has already resolved the abrupt completion's precedence.
        if (traversalFailure.source)
            fail(state, new CanvasImageCopyError('read', { cause: traversalFailure.cause }));
        throw traversalFailure.cause;
    }
    const backingWidth = Math.ceil(width * ratio);
    const backingHeight = Math.ceil(height * ratio);
    if (!Number.isSafeInteger(backingWidth) || !Number.isSafeInteger(backingHeight) ||
        backingWidth <= 0 || backingHeight <= 0 ||
        backingWidth > 4294967295 || backingHeight > 4294967295 ||
        backingWidth > Math.floor(budget / backingHeight)) {
        fail(state, new EgretError('CANVAS_BACKING_LIMIT'));
    }
    const frame = images === undefined ? { frameId, width, height, clearColor, clearAlpha, commands } :
        Object.freeze({ frameId, width, height, clearColor, clearAlpha, commands: Object.freeze(commands), images });
    return { frame, width: backingWidth, height: backingHeight };
}
export function copyCanvasFrame(value, ratio, budget) {
    const copied = copyCanvasFrameMode(value, ratio, budget, false, () => { });
    return { ...copied, frame: copied.frame };
}
export function copyCanvasMixedFrame(value, ratio, budget, onImageObserved, onFailure) {
    return copyCanvasFrameMode(value, ratio, budget, true, onImageObserved, onFailure);
}
//# sourceMappingURL=copyCanvasFrame.js.map