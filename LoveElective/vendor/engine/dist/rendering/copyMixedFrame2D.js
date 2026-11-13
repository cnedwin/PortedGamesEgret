import { IMAGE_LIMITS_2D, isImageData2D } from '@egret/contracts';
import { array, copyClips2D, copyFrameHeader2D, copyRectangleCommand2D, finite, FrameCopyError, invalid, object, opacity, read, rectangle, transform } from './copyFrame2D.js';
import { MixedImageBudget } from './imageFrameBudget.js';
function copyTable(value) {
    const input = array(value, true);
    // Bound admission work before allocation or reads of oversized tables.
    if (input.length > IMAGE_LIMITS_2D.maxImagesPerFrame)
        throw new FrameCopyError('budget');
    // Snapshot indexed data, never a caller iterator. Allocation faults escape.
    const images = new Array(input.length);
    for (let index = 0; index < input.length; index++) {
        const image = read(input.source, index);
        if (!isImageData2D(image))
            invalid();
        images[index] = image;
    }
    return Object.freeze(images);
}
function copyRegion(value, image) {
    const source = object(value);
    // As for Texture, finish the descriptor snapshot before integer semantics.
    const xInput = read(source, 'x'), yInput = read(source, 'y');
    const widthInput = read(source, 'width'), heightInput = read(source, 'height');
    const x = finite(xInput), y = finite(yInput), width = finite(widthInput), height = finite(heightInput);
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || x < 0 || y < 0 || width <= 0 || height <= 0)
        invalid();
    const right = x + width, bottom = y + height;
    if (!Number.isSafeInteger(right) || !Number.isSafeInteger(bottom) || right > image.width || bottom > image.height)
        invalid();
    return Object.freeze({ x, y, width, height });
}
/** CPU-only contracts snapshot; production hosts keep their rectangle dispatch. */
export function copyMixedFrame2D(input, options) {
    const { source, ratio, clipBudget, frameId, width, height, clearColor, clearAlpha, backingWidth, backingHeight, commandsInput } = copyFrameHeader2D(input, options);
    const commands = [];
    const budget = new MixedImageBudget();
    let images;
    let clipCount = 0;
    for (let index = 0; index < commandsInput.length; index++) {
        const item = object(read(commandsInput.source, index));
        const kind = read(item, 'kind');
        if (kind === 'rect') {
            const command = copyRectangleCommand2D(item, ratio, clipBudget, clipCount);
            clipCount += command.clips.length;
            commands.push(command);
        }
        else if (kind === 'image') {
            if (images === undefined) {
                images = copyTable(read(source, 'images'));
                budget.registerTable(images);
            }
            const matrix = transform(read(item, 'matrix')), rect = rectangle(read(item, 'rect'), matrix, ratio);
            const alpha = opacity(read(item, 'alpha'));
            const clips = copyClips2D(item, ratio, clipBudget, clipCount, true);
            clipCount += clips.length;
            const imageIndex = finite(read(item, 'imageIndex'));
            if (!Number.isSafeInteger(imageIndex) || imageIndex < 0 || imageIndex >= images.length)
                invalid();
            const image = images[imageIndex];
            const sourceRect = copyRegion(read(item, 'sourceRect'), image);
            budget.registerView(image, sourceRect);
            commands.push(Object.freeze({ kind: 'image', matrix, rect, alpha, clips, imageIndex, sourceRect }));
        }
        else
            invalid();
    }
    return { frame: Object.freeze({ frameId, width, height, clearColor, clearAlpha, commands: Object.freeze(commands), ...(images === undefined ? {} : { images }) }), width: backingWidth, height: backingHeight };
}
