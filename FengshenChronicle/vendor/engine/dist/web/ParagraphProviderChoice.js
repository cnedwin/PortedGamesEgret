// SPDX-License-Identifier: Apache-2.0
// Picks the paragraph provider a device can afford: CanvasKit where WebAssembly runs and there is memory for it, the
// canvas provider elsewhere. A WeChat mini game has no WebAssembly global (WXWebAssembly stands in its place, for a
// package that ships its own compressed module), so it is given the canvas provider unless CanvasKit is asked for.
import { EgretError } from '@egret/runtime';
import { createCanvasKitParagraphProvider } from './CanvasKitParagraphProvider.js';
import { createCanvasParagraphProvider } from './CanvasParagraphProvider.js';
function read(device) {
    const global = globalThis;
    const memory = device?.deviceMemory ?? global.navigator?.deviceMemory;
    return {
        webAssembly: device?.webAssembly ??
            (typeof global.WebAssembly === 'object' && typeof global.WebAssembly?.instantiate === 'function'),
        miniGame: device?.miniGame ?? (typeof global.wx === 'object' && typeof global.wx?.getSystemInfoSync === 'function'),
        deviceMemory: typeof memory === 'number' && Number.isFinite(memory) && memory > 0 ? memory : undefined
    };
}
/**
 * Creates the paragraph provider the device can afford. Both providers take the same requests and give the same
 * metrics and geometry; the canvas provider needs no WebAssembly, refuses right-to-left text, and lays out with the
 * fonts the page or the mini game has registered.
 */
export async function chooseParagraphProvider(options = {}) {
    if (options === null || typeof options !== 'object')
        throw new EgretError('PARAGRAPH_REQUEST_INVALID');
    const prefer = options.prefer ?? 'auto';
    if (prefer !== 'auto' && prefer !== 'canvaskit' && prefer !== 'canvas')
        throw new EgretError('PARAGRAPH_REQUEST_INVALID');
    if (options.loadCanvasKit !== undefined && typeof options.loadCanvasKit !== 'function')
        throw new EgretError('PARAGRAPH_REQUEST_INVALID');
    const lowMemory = options.lowMemory ?? 2;
    if (typeof lowMemory !== 'number' || !Number.isFinite(lowMemory) || lowMemory < 0)
        throw new EgretError('PARAGRAPH_REQUEST_INVALID');
    const canvas = (reason, cause) => Object.freeze({
        backend: 'canvas',
        reason,
        provider: createCanvasParagraphProvider(options.canvas),
        ...(cause === undefined ? {} : { cause })
    });
    const canvasKit = async () => {
        const loaded = await options.loadCanvasKit();
        return Object.freeze({
            backend: 'canvaskit',
            reason: prefer === 'canvaskit' ? 'asked' : 'loaded',
            provider: createCanvasKitParagraphProvider(loaded)
        });
    };
    if (prefer === 'canvas')
        return canvas('asked');
    if (options.loadCanvasKit === undefined) {
        if (prefer === 'canvaskit')
            throw new EgretError('PARAGRAPH_REQUEST_INVALID', { cause: 'CanvasKit was asked for with no loadCanvasKit' });
        return canvas('no-loader');
    }
    if (prefer === 'canvaskit')
        return canvasKit();
    const device = read(options.device);
    if (!device.webAssembly)
        return canvas('no-webassembly');
    if (device.miniGame)
        return canvas('mini-game');
    if (device.deviceMemory !== undefined && device.deviceMemory <= lowMemory)
        return canvas('low-memory');
    try {
        return await canvasKit();
    }
    catch (cause) {
        return canvas('load-failed', cause);
    }
}
