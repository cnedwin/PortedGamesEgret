import { IMAGE_LIMITS_2D, TEXTURED_FRAME_PROFILE_2D, isImageData2D, isTexturedGeometry2D } from '@egret/contracts';
import { coordinate } from './prepareRectangles2D.js';
import { noteOwnedPreparationFailure } from './ownedPreparationFailure2D.js';
/** Private metadata classification; the host also requires current-invocation provenance. */
export class TexturedFrameAdmissionError2D extends Error {
    reason;
    constructor(reason) {
        super(`Textured frame admission ${reason}`);
        this.reason = reason;
    }
}
function fail(reason) {
    throw noteOwnedPreparationFailure(new TexturedFrameAdmissionError2D(reason));
}
function length(value, maximum) {
    if (!Number.isSafeInteger(value) || value < 0)
        fail('invalid');
    if (value > maximum)
        fail('budget');
    return value;
}
function index(value, count) {
    if (!Number.isSafeInteger(value) || value < 0 || value >= count)
        fail('invalid');
    return value;
}
function alpha(value) { if (!Number.isFinite(value) || value < 0 || value > 1)
    fail('invalid'); }
function color(value) { if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffff)
    fail('invalid'); }
function matrix(value) { for (const component of [value.a, value.b, value.c, value.d, value.tx, value.ty])
    coordinate(component); }
/** Validate every affine arithmetic intermediate without predicates or triangle payload reads. */
function rectangle(m, r, ratio) {
    matrix(m);
    for (const component of [r.x, r.y, r.width, r.height])
        coordinate(component);
    if (r.width < 0 || r.height < 0)
        fail('invalid');
    const right = coordinate(r.x + r.width), bottom = coordinate(r.y + r.height);
    for (const [x, y] of [[r.x, r.y], [right, r.y], [right, bottom], [r.x, bottom]]) {
        const px = coordinate(coordinate(coordinate(m.a * x) + coordinate(m.c * y)) + m.tx);
        const py = coordinate(coordinate(coordinate(m.b * x) + coordinate(m.d * y)) + m.ty);
        coordinate(px * ratio);
        coordinate(py * ratio);
    }
}
function crop(region, image) {
    const { x, y, width, height } = region;
    if (![x, y, width, height].every(Number.isSafeInteger) || x < 0 || y < 0 || width <= 0 || height <= 0 ||
        !Number.isSafeInteger(x + width) || !Number.isSafeInteger(y + height) || x + width > image.width || y + height > image.height)
        fail('invalid');
}
/** Admit an already owner-authenticated frame. This helper grants no frame authority. */
export function admitTexturedFrame2D(frame, options, budget, reuseValidatedClips = false) {
    if (frame.profile !== TEXTURED_FRAME_PROFILE_2D || !Number.isSafeInteger(frame.frameId) || frame.frameId <= 0 ||
        !Number.isFinite(frame.width) || frame.width <= 0 || !Number.isFinite(frame.height) || frame.height <= 0)
        fail('invalid');
    color(frame.clearColor);
    alpha(frame.clearAlpha);
    // Nominal DPR accepts every finite positive value; backing admission precedes geometry limits.
    const ratio = options.pixelRatio;
    if (!Number.isFinite(ratio) || ratio <= 0)
        fail('invalid');
    const width = Math.ceil(frame.width * ratio), height = Math.ceil(frame.height * ratio);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
        width > 4294967295 || height > 4294967295 || width > Math.floor(options.maxBackingPixels / height))
        fail('backing');
    // All three lengths precede indexed payload; iterable or instance callbacks are unnecessary.
    const commandCount = length(frame.commands.length, Math.min(65536, options.maxCommands));
    const imageCount = length(frame.images.length, IMAGE_LIMITS_2D.maxImagesPerFrame);
    const geometryCount = length(frame.geometries.length, 128);
    const geometries = new Set(), images = new Set();
    let uniqueGeometryBytes = 0, imageBytes = 0;
    const geometryLimit = Math.min(16777216, options.maxFrameGeometryBytes);
    for (let i = 0; i < geometryCount; i++) {
        const geometry = frame.geometries[i];
        if (!isTexturedGeometry2D(geometry))
            fail('invalid');
        if (!geometries.has(geometry)) {
            if (geometry.logicalByteLength > geometryLimit - uniqueGeometryBytes)
                fail('budget');
            uniqueGeometryBytes += geometry.logicalByteLength;
            geometries.add(geometry);
        }
    }
    for (let i = 0; i < imageCount; i++) {
        const image = frame.images[i];
        if (!isImageData2D(image))
            fail('invalid');
        if (!images.has(image)) {
            if (image.byteLength > IMAGE_LIMITS_2D.maxImageTableBytes - imageBytes)
                fail('budget');
            imageBytes += image.byteLength;
            images.add(image);
        }
    }
    const commands = [];
    let clipsCharged = 0, sourceCharged = 0;
    // Only the ordinary Host selects this after owned-frame authentication, with
    // immutable first-party clips, captured options and its fresh stock ledger.
    // Direct/default and scene/B1 calls keep every original numeric read.
    let validatedClips;
    let validatedClipCount = 0;
    if (reuseValidatedClips) {
        try {
            validatedClips = [];
        }
        catch { /* Optional scratch allocation cannot replace required admission. */ }
    }
    try {
        for (let commandIndex = 0; commandIndex < commandCount; commandIndex++) {
            const command = frame.commands[commandIndex];
            if (command.kind !== 'rect' && command.kind !== 'image' && command.kind !== 'mesh')
                fail('invalid');
            const geometry = command.kind === 'mesh' ? frame.geometries[index(command.geometryIndex, geometryCount)] : undefined;
            if (geometry !== undefined) {
                // Storage deduplication never discounts repeated source work; debit before matrix/indices.
                if (geometry.triangleCount > options.maxSourceTriangles - sourceCharged)
                    fail('budget');
                budget.admitSourceTriangles(geometry.triangleCount);
                sourceCharged += geometry.triangleCount;
            }
            matrix(command.matrix);
            alpha(command.alpha);
            const image = command.kind === 'rect' ? undefined : frame.images[index(command.imageIndex, imageCount)];
            if (image !== undefined && command.kind !== 'rect')
                crop(command.sourceRect, image);
            if (command.kind === 'rect')
                color(command.color);
            if (command.kind !== 'mesh')
                rectangle(command.matrix, command.rect, ratio);
            const clipCount = length(command.clips.length, Math.min(262144, options.maxClipRectangles) - clipsCharged);
            clipsCharged += clipCount;
            for (let i = 0; i < clipCount; i++) {
                const clip = command.clips[i];
                let validated = false;
                if (validatedClips !== undefined) {
                    for (let retained = 0; retained < validatedClipCount; retained++) {
                        if (validatedClips[retained] === clip) {
                            validated = true;
                            break;
                        }
                    }
                }
                if (!validated) {
                    // Required validation stays outside optional storage catches.
                    rectangle(clip.matrix, clip.rect, ratio);
                    if (validatedClips !== undefined && validatedClipCount < 64) {
                        try {
                            validatedClips[validatedClipCount] = clip;
                            validatedClipCount++;
                        }
                        catch {
                            // Drop only optional reuse; subsequent occurrences keep the original path.
                            validatedClips.length = 0;
                            validatedClips = undefined;
                            validatedClipCount = 0;
                        }
                    }
                }
            }
            commands.push({ command, commandIndex, ...(image === undefined ? {} : { image }), ...(geometry === undefined ? {} : { geometry }) });
        }
        return { frame, width, height, uniqueGeometryBytes, commands };
    }
    finally {
        // Internal indexed storage invokes no caller-overridable array method.
        // Release all successful references on both ordinary and exceptional exits.
        if (validatedClips !== undefined)
            validatedClips.length = 0;
        validatedClips = undefined;
    }
}
