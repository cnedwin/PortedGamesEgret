// SPDX-License-Identifier: Apache-2.0
// Page elements that follow points of a World3D scene: names over heads,
// damage numbers, objective markers that cling to the edge of the screen when
// their target is off it. The interface of a 3D game is usually ordinary page
// elements laid over the canvas; this places them each frame.
import { World3DError } from '../../rendering/world3d/core3D.js';
import { projectToViewport3D } from '../../rendering/world3d/GeometryBuilder3D.js';
/**
 * A layer of page elements that follow scene points. Each element is moved with a CSS transform, so give it
 * `position: absolute; left: 0; top: 0` and centre it with a negative margin or a translate of its own child.
 * A marker gets `data-on-edge` while clamped and `hidden` while its target is behind the camera without clamping.
 */
export function createScreenMarkers3D(options) {
    if (!options?.container || typeof options.container.appendChild !== 'function' || !options.camera)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'screen markers');
    const container = options.container;
    const markers = [];
    const world = new Float32Array(3);
    const layer = {
        markers,
        camera: options.camera,
        add(element, marker) {
            if (!element || !marker?.target)
                throw new World3DError('WORLD3D_INPUT_INVALID', 'marker');
            let target = marker.target;
            const added = !element.parentNode;
            if (added)
                container.appendChild(element);
            const point = { x: 0, y: 0, depth: 0, inFront: false, onScreen: false };
            let onEdge = false, angle = 0, disposed = false;
            const margin = marker.margin ?? 24;
            const entry = {
                element,
                point,
                get onEdge() {
                    return onEdge;
                },
                get angle() {
                    return angle;
                },
                retarget(next) {
                    if (!next)
                        throw new World3DError('WORLD3D_INPUT_INVALID', 'marker target');
                    target = next;
                },
                dispose() {
                    if (disposed)
                        return;
                    disposed = true;
                    const at = markers.indexOf(entry);
                    if (at >= 0)
                        markers.splice(at, 1);
                    if (added)
                        element.remove();
                },
                update(width, height) {
                    if (Array.isArray(target))
                        world.set(target);
                    else {
                        const node = target;
                        node.updateWorldMatrix();
                        const m = node.matrixWorld;
                        world[0] = m[12];
                        world[1] = m[13];
                        world[2] = m[14];
                    }
                    if (marker.offset)
                        for (let i = 0; i < 3; i++)
                            world[i] += marker.offset[i];
                    const camera = layer.camera;
                    projectToViewport3D(camera, world, width, height, point);
                    const eye = camera.matrixWorld;
                    const far = marker.maxDistance !== undefined &&
                        Math.hypot(world[0] - eye[12], world[1] - eye[13], world[2] - eye[14]) > marker.maxDistance;
                    let x = point.x, y = point.y;
                    angle = Math.atan2(y - height / 2, x - width / 2);
                    onEdge = false;
                    if (!point.onScreen && marker.clampToEdge) {
                        // Push the point out from the centre to the screen's edge along its direction.
                        // Behind the camera the projection already keeps the side the target lies on; one straight behind
                        // goes to the bottom edge.
                        let dx = x - width / 2, dy = y - height / 2;
                        if (!point.inFront && Math.hypot(dx, dy) < 1)
                            dy = 1;
                        if (!point.inFront) {
                            // Behind the camera a target is always off the screen, however close to the centre it projects.
                            const length = Math.hypot(dx, dy);
                            dx /= length;
                            dy /= length;
                        }
                        angle = Math.atan2(dy, dx);
                        const halfW = width / 2 - margin, halfH = height / 2 - margin;
                        const scale = Math.min(halfW / Math.max(Math.abs(dx), 1e-9), halfH / Math.max(Math.abs(dy), 1e-9));
                        x = width / 2 + dx * scale;
                        y = height / 2 + dy * scale;
                        x = Math.min(width - margin, Math.max(margin, x));
                        y = Math.min(height - margin, Math.max(margin, y));
                        onEdge = true;
                    }
                    const hidden = far || (!point.onScreen && !marker.clampToEdge);
                    element.hidden = hidden;
                    if (onEdge)
                        element.dataset['onEdge'] = '';
                    else
                        delete element.dataset['onEdge'];
                    if (!hidden)
                        element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
                    point.x = x;
                    point.y = y;
                }
            };
            markers.push(entry);
            return entry;
        },
        update() {
            const width = container.clientWidth, height = container.clientHeight;
            if (!(width > 0 && height > 0))
                return;
            layer.camera.updateViewMatrices();
            for (const marker of [...markers])
                marker.update(width, height);
        },
        dispose() {
            for (const marker of [...markers])
                marker.dispose();
        }
    };
    return layer;
}
