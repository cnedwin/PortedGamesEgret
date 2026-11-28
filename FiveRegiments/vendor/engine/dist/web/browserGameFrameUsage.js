/** The usage of a game's frames, telling its warnings to `warn`. */
export function createGameFrameUsage(warn) {
    const FRAME_PAGES = 64, FRAME_REGIONS = 4096, FRAME_IMAGE_BYTES = 67108864;
    let usage = Object.freeze({
        pages: 0,
        regions: 0,
        imageBytes: 0,
        limits: Object.freeze({ pages: FRAME_PAGES, regions: FRAME_REGIONS, imageBytes: FRAME_IMAGE_BYTES }),
        refusedFrames: 0
    });
    let nearLimit = false, refusing = false;
    const measure = (frame) => {
        let bytes = 0;
        for (const page of frame.pages)
            if (page.builtin === undefined)
                bytes += page.source.byteLength;
        usage = Object.freeze({
            pages: frame.pages.length,
            regions: frame.regions.length,
            imageBytes: bytes,
            limits: usage.limits,
            refusedFrames: usage.refusedFrames
        });
        refusing = false;
        // Told when a frame first comes within a fifth of a limit, and again only after it has gone back below seven
        // tenths of every one.
        const share = Math.max(usage.pages / FRAME_PAGES, usage.regions / FRAME_REGIONS, usage.imageBytes / FRAME_IMAGE_BYTES);
        if (!nearLimit && share >= 0.8) {
            nearLimit = true;
            warn({
                code: 'FRAME_IMAGES_NEAR_LIMIT',
                message: 'A frame holds ' +
                    usage.pages +
                    ' of ' +
                    FRAME_PAGES +
                    ' images and ' +
                    usage.regions +
                    ' of ' +
                    FRAME_REGIONS +
                    ' regions. Labels of createAtlasLabel share images.',
                usage
            });
        }
        else if (nearLimit && share < 0.7)
            nearLimit = false;
    };
    return {
        current: () => usage,
        measure,
        refuse(cause) {
            usage = Object.freeze({ ...usage, refusedFrames: usage.refusedFrames + 1 });
            if (!refusing) {
                refusing = true;
                warn({
                    code: 'FRAME_IMAGE_BUDGET',
                    message: 'A frame held more images than a frame may (' +
                        FRAME_PAGES +
                        ' images, ' +
                        FRAME_REGIONS +
                        ' regions, 64 MiB), and was not drawn; the last frame stays on the screen until one fits.',
                    usage,
                    cause
                });
            }
        }
    };
}
