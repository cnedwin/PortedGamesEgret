// SPDX-License-Identifier: Apache-2.0
// A small performance readout for a World3D game: frame time, the game's own
// parts of a frame, and what the renderer drew. It tells a slow device apart
// from a slow game. The numbers are gathered whether or not they are shown.
import { World3DError } from '../../rendering/world3d/core3D.js';
/** Makes a panel that shows a 3D view's frame times and draws. */
export function createWorld3DStats(renderer, options = {}) {
    if (!renderer?.info)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'renderer');
    const smoothing = options.smoothing ?? 0.1, refreshMs = options.refreshMs ?? 250;
    if (!(smoothing > 0 && smoothing <= 1) || !(refreshMs >= 0))
        throw new World3DError('WORLD3D_INPUT_INVALID', 'stats');
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const average = { frame: 0 };
    let box, last = 0, mark = 0, shownAt = -Infinity, slowest = 0, drawCalls = 0, triangles = 0;
    if (options.container) {
        box = options.container.ownerDocument.createElement('pre');
        box.className = 'egret-world3d-stats';
        box.style.cssText =
            'position:absolute;left:8px;top:8px;margin:0;padding:4px 6px;font:11px/1.35 ui-monospace,monospace;' +
                'color:#e8f0ff;background:rgba(0,0,0,0.6);pointer-events:none;z-index:10;white-space:pre';
        options.container.appendChild(box);
    }
    const blend = (name, value) => {
        average[name] = (average[name] ?? value) + (value - (average[name] ?? value)) * smoothing;
    };
    const stats = {
        average,
        get slowest() {
            return slowest;
        },
        get fps() {
            return average['frame'] > 0 ? 1000 / average['frame'] : 0;
        },
        get drawCalls() {
            return drawCalls;
        },
        get triangles() {
            return triangles;
        },
        begin() {
            const t = now();
            if (last) {
                const gap = t - last;
                blend('frame', gap);
                slowest = Math.max(slowest * 0.995, gap);
            }
            last = mark = t;
        },
        lap(name) {
            if (typeof name !== 'string' || name === 'frame' || name === '')
                throw new World3DError('WORLD3D_INPUT_INVALID', 'lap');
            const t = now();
            blend(name, t - mark);
            mark = t;
        },
        end() {
            const t = now();
            drawCalls = renderer.info.drawCalls;
            triangles = renderer.info.triangles;
            if (!box || t - shownAt < refreshMs)
                return;
            shownAt = t;
            const parts = Object.keys(average)
                .filter(name => name !== 'frame')
                .map(name => `${name} ${average[name].toFixed(2)} ms`);
            const info = renderer.info;
            box.textContent =
                `${stats.fps.toFixed(0)} fps  ${average['frame'].toFixed(1)} ms (slowest ${slowest.toFixed(1)})\n` +
                    (parts.length ? parts.join('  ') + '\n' : '') +
                    `draws ${info.drawCalls}  triangles ${info.triangles}  lights dropped ${info.lightsDropped}\n` +
                    `programs ${info.programs}  geometries ${info.geometries}  textures ${info.textures}`;
        },
        dispose() {
            box?.remove();
            box = undefined;
        }
    };
    return stats;
}
//# sourceMappingURL=stats3D.js.map