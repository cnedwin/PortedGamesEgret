import { EgretError } from "@egret/runtime";
import { startEngine } from './startEngine.js';
import { admitGameClockOptions } from './gameClock.js';
/** Reserve the surface before startup; failed startup uses the normal close path. */
export async function createEngine(options) {
    const host = options.host;
    let renderer;
    try {
        const port = host.renderFrame;
        if (port !== undefined && typeof port !== "function")
            throw new EgretError("INVALID_RENDERER");
        renderer = port;
    }
    catch (cause) {
        throw new EgretError("INVALID_RENDERER", { cause });
    }
    const diagnostic = options.onDiagnostic;
    const stableOptions = { host, ...(diagnostic === undefined ? {} : { onDiagnostic: diagnostic }) };
    const timeoutMs = options.shutdownTimeoutMs ?? 1000;
    if (!Number.isFinite(timeoutMs) || !Number.isInteger(timeoutMs) || timeoutMs <= 0)
        throw new EgretError("INVALID_TIMEOUT");
    let clockValue;
    try {
        clockValue = options.clock;
    }
    catch (cause) {
        throw new EgretError('CLOCK_OPTIONS_INVALID', { cause });
    }
    const clockOptions = admitGameClockOptions(clockValue);
    return startEngine(stableOptions, timeoutMs, { legacy: renderer, textured: undefined, profile: undefined }, clockOptions);
}
