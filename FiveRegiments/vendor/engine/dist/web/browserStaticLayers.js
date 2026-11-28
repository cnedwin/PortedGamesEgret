// SPDX-License-Identifier: Apache-2.0
// Bind the explicit layer cache of the WebGL2 or WebGPU Host to the ordinary Engine host transaction.
// No canvas readback, texture conversion, or replacement display tree.
import { EgretError } from '@egret/runtime';
const invalid = () => new EgretError('BROWSER_GAME_OPTIONS_INVALID');
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
function rgb(value, max) {
    if (value === undefined)
        return undefined;
    if (!Array.isArray(value) || value.length !== 3)
        throw invalid();
    const row = [value[0], value[1], value[2]];
    if (!row.every(v => finite(v) && v >= 0 && v <= max))
        throw invalid();
    return Object.freeze(row);
}
function effect(input) {
    if (input === undefined)
        return undefined;
    if (!input || typeof input !== 'object')
        throw invalid();
    const { bounds, multiply: scale, add: emission } = input;
    if (!bounds || typeof bounds !== 'object')
        throw invalid();
    const { x, y, width, height } = bounds;
    if (![x, y, width, height].every(finite) || width <= 0 || height <= 0)
        throw invalid();
    const multiply = rgb(scale, 4), add = rgb(emission, 1);
    return Object.freeze({
        bounds: Object.freeze({ x, y, width, height }),
        ...(multiply === undefined ? {} : { multiply }),
        ...(add === undefined ? {} : { add })
    });
}
/** Keep the original Host's surface, lifecycle and profile; only select its explicit renderer. */
export function createBrowserStaticLayers(host) {
    const owned = new WeakSet();
    let placements = Object.freeze([]), revision = 0, closed = false, setting = false;
    const api = Object.freeze({
        createLayer() {
            if (closed || setting)
                throw invalid();
            const layer = host.createSharedLayer2D();
            owned.add(layer);
            return layer;
        },
        setPlacements(input) {
            if (closed || setting || !Array.isArray(input))
                throw invalid();
            setting = true;
            try {
                const next = [];
                const count = input.length;
                if (!Number.isSafeInteger(count) || count < 0 || count > 512)
                    throw invalid();
                for (let index = 0; index < count; index++) {
                    const item = input[index];
                    if (!item || typeof item !== 'object')
                        throw invalid();
                    const { layer, x, y, width, height } = item, light = effect(item.effect);
                    if (!owned.has(layer) ||
                        layer.state !== 'ready' ||
                        ![x, y, width, height].every(finite) ||
                        width <= 0 ||
                        height <= 0)
                        throw invalid();
                    next.push(Object.freeze({ layer, x, y, width, height, ...(light === undefined ? {} : { effect: light }) }));
                }
                // A later input getter may dispose a previous layer or the game.
                if (closed || next.some(row => row.layer.state !== 'ready') || revision === Number.MAX_SAFE_INTEGER)
                    throw invalid();
                placements = Object.freeze(next);
                revision++;
            }
            finally {
                setting = false;
            }
        },
        getStatus: () => host.getSharedLayerStatus(),
        whenReady: () => host.whenReady(),
        get revision() {
            return revision;
        }
    });
    const adapter = Object.freeze({
        surface: host.surface,
        sharedFrameProfile: host.sharedFrameProfile,
        ...(host.sharedBlendSpace === undefined ? {} : { sharedBlendSpace: host.sharedBlendSpace }),
        start: () => host.start(),
        stop: () => host.stop(),
        close() {
            closed = true;
            placements = Object.freeze([]);
            return host.close();
        },
        setTimeout(callback, delayMs) {
            return host.setTimeout(callback, delayMs);
        },
        renderSharedFrame(frame) {
            // A readable replacement keeps its previous revision; stale/disposed
            // placements are not secretly drawn as transparent substitutes.
            return placements.length === 0
                ? host.renderSharedFrame(frame)
                : host.renderSharedFrameWithLayers(frame, placements);
        }
    });
    return Object.freeze({ api, adapter });
}
