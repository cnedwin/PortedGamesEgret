/** Only our validation uses this error; arbitrary input/allocation faults escape intact. */
export class FrameCopyError extends Error {
    reason;
    constructor(reason, cause = undefined) {
        super(`Frame copy ${reason}`, { cause });
        this.reason = reason;
    }
}
/** A getter may throw an old validation error; origin, rather than its class, controls mapping. */
export class FrameInputReadError extends Error {
    constructor(cause) { super('Frame input read failed', { cause }); }
}
export function read(source, key) {
    try {
        return source[key];
    }
    catch (cause) {
        throw new FrameInputReadError(cause);
    }
}
export function invalid() { throw new FrameCopyError('invalid'); }
export function object(value) {
    if (typeof value !== 'object' || value === null)
        invalid();
    return value;
}
export function finite(value) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        invalid();
    return value === 0 ? 0 : value;
}
export function opacity(value) {
    const number = finite(value);
    if (number < 0 || number > 1)
        invalid();
    return number;
}
export function rgb(value) {
    const number = finite(value);
    if (!Number.isInteger(number) || number < 0 || number > 0xffffff)
        invalid();
    return number;
}
export function array(value, wrapArrayCheck = false) {
    // Legacy rectangle checks retain raw faults; only new image checks opt in.
    let isArray;
    if (wrapArrayCheck) {
        try {
            isArray = Array.isArray(value);
        }
        catch (cause) {
            throw new FrameInputReadError(cause);
        }
    }
    else
        isArray = Array.isArray(value);
    if (!isArray)
        invalid();
    const source = value;
    const length = read(source, 'length');
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0)
        invalid();
    return { source, length };
}
export function transform(value) {
    const source = object(value);
    return Object.freeze({ a: finite(read(source, 'a')), b: finite(read(source, 'b')), c: finite(read(source, 'c')), d: finite(read(source, 'd')), tx: finite(read(source, 'tx')), ty: finite(read(source, 'ty')) });
}
export function rectangle(value, matrix, ratio) {
    const source = object(value);
    const x = finite(read(source, 'x')), y = finite(read(source, 'y')), width = finite(read(source, 'width')), height = finite(read(source, 'height'));
    if (width < 0 || height < 0)
        invalid();
    const right = finite(x + width), bottom = finite(y + height);
    // Check every arithmetic operation, including cancellation-prone partial sums.
    for (const px of [x, right])
        for (const py of [y, bottom]) {
            finite(finite(finite(finite(matrix.a * px) + finite(matrix.c * py)) + matrix.tx) * ratio);
            finite(finite(finite(finite(matrix.b * px) + finite(matrix.d * py)) + matrix.ty) * ratio);
        }
    return Object.freeze({ x, y, width, height });
}
export function copyFrameHeader2D(input, options) {
    const ratio = options.pixelRatio, pixelBudget = options.maxBackingPixels;
    const commandBudget = options.maxCommands, clipBudget = options.maxClipRectangles;
    const source = object(input);
    const frameId = finite(read(source, 'frameId')), width = finite(read(source, 'width')), height = finite(read(source, 'height'));
    if (!Number.isSafeInteger(frameId) || frameId <= 0 || width <= 0 || height <= 0)
        invalid();
    const clearColor = rgb(read(source, 'clearColor')), clearAlpha = opacity(read(source, 'clearAlpha'));
    const backingWidth = Math.ceil(width * ratio), backingHeight = Math.ceil(height * ratio);
    if (!Number.isSafeInteger(backingWidth) || !Number.isSafeInteger(backingHeight) || backingWidth <= 0 || backingHeight <= 0 || backingWidth > 4294967295 || backingHeight > 4294967295 || backingWidth > Math.floor(pixelBudget / backingHeight))
        throw new FrameCopyError('backing');
    const commandsInput = array(read(source, 'commands'));
    if (commandsInput.length > commandBudget)
        throw new FrameCopyError('budget');
    return { source, ratio, clipBudget, frameId, width, height, clearColor, clearAlpha, backingWidth, backingHeight, commandsInput };
}
export function copyClips2D(item, ratio, clipBudget, clipCount, wrapArrayCheck = false) {
    const clipsInput = array(read(item, 'clips'), wrapArrayCheck);
    if (clipsInput.length > clipBudget - clipCount)
        throw new FrameCopyError('budget');
    const clips = [];
    for (let clipIndex = 0; clipIndex < clipsInput.length; clipIndex++) {
        const clip = object(read(clipsInput.source, clipIndex));
        const clipMatrix = transform(read(clip, 'matrix'));
        clips.push(Object.freeze({ matrix: clipMatrix, rect: rectangle(read(clip, 'rect'), clipMatrix, ratio) }));
    }
    return Object.freeze(clips);
}
export function copyRectangleCommand2D(item, ratio, clipBudget, clipCount) {
    const matrix = transform(read(item, 'matrix')), rect = rectangle(read(item, 'rect'), matrix, ratio);
    const color = rgb(read(item, 'color')), alpha = opacity(read(item, 'alpha'));
    const clips = copyClips2D(item, ratio, clipBudget, clipCount);
    return Object.freeze({ kind: 'rect', matrix, rect, color, alpha, clips });
}
export function copyFrame2D(input, options) {
    const { ratio, clipBudget, frameId, width, height, clearColor, clearAlpha, backingWidth, backingHeight, commandsInput } = copyFrameHeader2D(input, options);
    const commands = [];
    let clipCount = 0;
    // Snapshot length and read each indexed element once; input iterators have no authority.
    for (let index = 0; index < commandsInput.length; index++) {
        const item = object(read(commandsInput.source, index));
        if (read(item, 'kind') !== 'rect')
            invalid();
        const command = copyRectangleCommand2D(item, ratio, clipBudget, clipCount);
        clipCount += command.clips.length;
        commands.push(command);
    }
    return { frame: Object.freeze({ frameId, width, height, clearColor, clearAlpha, commands: Object.freeze(commands) }), width: backingWidth, height: backingHeight };
}
//# sourceMappingURL=copyFrame2D.js.map