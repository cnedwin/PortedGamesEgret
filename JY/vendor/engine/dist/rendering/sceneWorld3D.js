// SPDX-License-Identifier: Apache-2.0
import { createMatrix4, multiplyMatrix4 } from './matrix4.js';
import { isMeshGeometry3D } from './meshGeometry3D.js';
import { createAuthoredSceneFrame3D, isSceneWorldCard3D, Scene3DError } from './sceneFrame3D.js';
const worlds = new WeakSet();
const cameras = new WeakMap();
const MAX_NODES = 256;
const MAX_DRAWS = 64;
const UP = [0, 1, 0];
function invalid(field) {
    throw new Scene3DError('SCENE3D_INPUT_INVALID', field);
}
function budget() { throw new Scene3DError('SCENE3D_BUDGET'); }
function source(read) {
    try {
        return read();
    }
    catch (cause) {
        throw new Scene3DError('SCENE3D_INPUT_READ_FAILED', cause);
    }
}
function vector(value, field) {
    const array = source(() => Array.isArray(value) ? value : undefined);
    if (!array || source(() => array.length) !== 3)
        invalid(field);
    const result = source(() => [array[0], array[1], array[2]]);
    if (!result.every(v => typeof v === 'number' && Number.isFinite(v)))
        invalid(field);
    return result;
}
function unit(vector, field) {
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    if (!Number.isFinite(length) || length === 0)
        invalid(field);
    if (length >= 2 ** -1022)
        return [vector[0] / length, vector[1] / length, vector[2] / length];
    // A subnormal hypot can round away a significant part of the true length.
    const largest = Math.max(Math.abs(vector[0]), Math.abs(vector[1]), Math.abs(vector[2]));
    const scaled = [vector[0] / largest, vector[1] / largest, vector[2] / largest];
    const scaledLength = Math.hypot(scaled[0], scaled[1], scaled[2]);
    return [scaled[0] / scaledLength, scaled[1] / scaledLength, scaled[2] / scaledLength];
}
function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) { return (a[0] * b[0] + a[1] * b[1]) + a[2] * b[2]; }
function finite(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        invalid(field);
    return value;
}
function cameraProjection(input) {
    if (!input || typeof input !== 'object')
        invalid('projection');
    const { kind, aspect: rawAspect, near: rawNear, far: rawFar } = source(() => ({
        kind: input.kind, aspect: input.aspect, near: input.near, far: input.far,
    }));
    const aspect = finite(rawAspect, 'aspect'), near = finite(rawNear, 'near'), far = finite(rawFar, 'far');
    if (aspect <= 0 || near < 0 || far <= near)
        invalid('projection');
    let halfHeight;
    if (kind === 'perspective') {
        const angle = finite(source(() => input.verticalFov), 'verticalFov');
        if (angle <= 0 || angle >= Math.PI || near <= 0)
            invalid('perspective');
        halfHeight = near * Math.tan(angle / 2);
    }
    else if (kind === 'orthographic') {
        halfHeight = finite(source(() => input.height), 'height') / 2;
    }
    else
        invalid('projection.kind');
    const halfWidth = aspect * halfHeight;
    if (!Number.isFinite(halfHeight) || !Number.isFinite(halfWidth) || halfHeight <= 0 || halfWidth <= 0)
        invalid('projection.extents');
    return Object.freeze({ kind, left: -halfWidth, right: halfWidth, bottom: -halfHeight, top: halfHeight, near, far });
}
export function createSceneCamera3D(input) {
    if (!input || typeof input !== 'object')
        invalid('camera');
    const fields = source(() => ({ eye: input.eye, target: input.target, up: input.up, projection: input.projection }));
    const eye = vector(fields.eye, 'eye'), target = vector(fields.target, 'target'), up = vector(fields.up === undefined ? UP : fields.up, 'up');
    const back = unit([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]], 'eye/target');
    const right = unit(cross(unit(up, 'up'), back), 'up/eye/target');
    const vertical = cross(back, right);
    // Column-major world-to-view transform. Camera looks down negative view Z.
    const view = createMatrix4([
        right[0], vertical[0], back[0], 0, right[1], vertical[1], back[1], 0, right[2], vertical[2], back[2], 0,
        -dot(right, eye), -dot(vertical, eye), -dot(back, eye), 1,
    ]);
    const projection = cameraProjection(fields.projection);
    const camera = Object.freeze({ projectionKind: projection.kind });
    cameras.set(camera, { view, projection });
    return camera;
}
function localMatrix(input) {
    const matrix = createMatrix4(input);
    if (matrix[3] !== 0 || matrix[7] !== 0 || matrix[11] !== 0 || matrix[15] !== 1)
        invalid('node.localMatrix');
    return matrix;
}
function checkId(id) {
    if (typeof id !== 'string' || id.length === 0 || id.length > 96)
        invalid('node.id');
}
function normalizeLighting(input) {
    if (!input || typeof input !== 'object')
        invalid('lighting');
    const raw = source(() => ({ direction: input.direction, ambient: input.ambient, intensity: input.intensity }));
    const ambient = finite(raw.ambient, 'lighting.ambient'), intensity = finite(raw.intensity, 'lighting.intensity');
    if (ambient < 0 || intensity < 0 || ambient + intensity > 1)
        invalid('lighting range');
    const direction = unit(vector(raw.direction, 'lighting.direction'), 'lighting.direction');
    return Object.freeze({ direction: Object.freeze(direction), ambient, intensity });
}
function normalTransform(matrix) {
    const scale = Math.max(...[0, 1, 2, 4, 5, 6, 8, 9, 10].map(index => Math.abs(matrix[index])));
    if (!Number.isFinite(scale) || scale === 0)
        invalid('lit node normal transform');
    const c0 = [matrix[0] / scale, matrix[1] / scale, matrix[2] / scale];
    const c1 = [matrix[4] / scale, matrix[5] / scale, matrix[6] / scale];
    const c2 = [matrix[8] / scale, matrix[9] / scale, matrix[10] / scale];
    const n0 = cross(c1, c2), n1 = cross(c2, c0), n2 = cross(c0, c1);
    const determinant = dot(c0, n0);
    const matrixNorm = Math.max(...c0.map((value, row) => Math.abs(value) + Math.abs(c1[row]) + Math.abs(c2[row])));
    const adjugateNorm = Math.max(...[n0, n1, n2].map(column => Math.abs(column[0]) + Math.abs(column[1]) + Math.abs(column[2])));
    const reciprocalCondition = Math.abs(determinant) / (matrixNorm * adjugateNorm);
    if (!Number.isFinite(reciprocalCondition) || reciprocalCondition < 2 ** -16)
        invalid('lit node normal transform');
    const cofactor = [...n0, ...n1, ...n2];
    const largest = Math.max(...cofactor.map(Math.abs));
    const mirrored = determinant < 0;
    // This bounded cofactor matrix is direction-equivalent to the inverse transpose.
    // Preserve determinant sign before fragment normalization and double-sided facing.
    const normalMatrix = Object.freeze(cofactor.map(value => Math.fround((mirrored ? -value : value) / largest) || 0));
    return Object.freeze({ normalMatrix, mirrored });
}
function assemble(nodes, textures, lighting) {
    const byId = new Map(nodes.map(node => [node.id, node]));
    if (byId.size !== nodes.length)
        invalid('duplicate node.id');
    const transforms = new Map();
    const active = new Set();
    const resolve = (node) => {
        const saved = transforms.get(node.id);
        if (saved)
            return saved;
        if (active.has(node.id))
            invalid('node hierarchy cycle');
        active.add(node.id);
        let transform = node.localMatrix;
        if (node.parentId !== undefined) {
            const parent = byId.get(node.parentId);
            if (!parent)
                invalid('node.parentId');
            transform = multiplyMatrix4(resolve(parent), transform);
        }
        active.delete(node.id);
        transforms.set(node.id, transform);
        return transform;
    };
    // Resolve graph order once per world revision. Draw order remains authored.
    const draws = nodes.flatMap(node => {
        const transform = resolve(node);
        let basis;
        return node.meshes.map(geometry => {
            const surface = textures?.get(geometry);
            const normal = surface && 'normals' in surface
                ? { ...(basis ??= normalTransform(transform)), normals: surface.normals } : undefined;
            return { geometry, transform, normal };
        });
    });
    // Keep prepared normal transforms across light-only edits of the same revision.
    const cards = nodes.flatMap(node => node.cards.map(card => ({ card, transform: resolve(node) })));
    function publish(light) {
        const world = {
            nodeCount: nodes.length,
            capture(camera) {
                const owned = cameras.get(camera);
                if (!owned)
                    invalid('camera identity');
                const lambert = light ? new Map() : undefined;
                const commands = draws.map((draw, index) => {
                    if (lambert && draw.normal && light) {
                        lambert.set(index, Object.freeze({ ...draw.normal, lighting: light }));
                    }
                    return { geometry: draw.geometry, modelView: multiplyMatrix4(owned.view, draw.transform) };
                });
                return createAuthoredSceneFrame3D({ projection: owned.projection, draws: commands }, cards.length ? cards.map(draw => ({ card: draw.card, modelView: multiplyMatrix4(owned.view, draw.transform) })) : undefined, textures, lambert);
            },
            withNodes(input) {
                return assemble([...nodes, ...captureNodes(input, nodes.length, draws.length + cards.length)], textures, light);
            },
            withNodeTransform(id, input) {
                if (!byId.has(id))
                    invalid('node.id');
                const transform = localMatrix(input);
                return assemble(nodes.map(node => node.id === id ? { ...node, localMatrix: transform } : node), textures, light);
            },
            withNodeTransforms(edits) {
                if (!source(() => Array.isArray(edits)))
                    invalid('node transforms');
                const count = source(() => edits.length);
                if (!Number.isSafeInteger(count) || count < 0)
                    invalid('node transforms length');
                if (count > nodes.length)
                    budget();
                if (count === 0)
                    return revision;
                const replacements = new Map();
                for (let i = 0; i < count; i++) {
                    const edit = source(() => edits[i]);
                    if (!edit || typeof edit !== 'object')
                        invalid('node transform');
                    const id = source(() => edit.id);
                    if (!byId.has(id) || replacements.has(id))
                        invalid('node.id');
                    replacements.set(id, localMatrix(source(() => edit.localMatrix)));
                }
                // Resolve the hierarchy once after the entire pose has been validated.
                return assemble(nodes.map(node => {
                    const transform = replacements.get(node.id);
                    return transform ? { ...node, localMatrix: transform } : node;
                }), textures, light);
            },
        };
        const revision = Object.freeze(light ? { ...world, withLighting(input) {
                return publish(normalizeLighting(input));
            } } : world);
        worlds.add(revision);
        return revision;
    }
    return publish(lighting);
}
function captureNodes(input, existingNodes, drawCount) {
    if (!source(() => Array.isArray(input)))
        invalid('nodes');
    const count = source(() => input.length);
    if (!Number.isSafeInteger(count) || count < 0)
        invalid('nodes.length');
    if (count > MAX_NODES - existingNodes)
        budget();
    const nodes = [];
    for (let index = 0; index < count; index++) {
        const row = source(() => input[index]);
        if (!row || typeof row !== 'object')
            invalid('node');
        const { id, parentId, localMatrix: matrix, meshes, cards } = source(() => ({
            id: row.id, parentId: row.parentId, localMatrix: row.localMatrix, meshes: row.meshes, cards: row.cards,
        }));
        checkId(id);
        if (parentId !== undefined)
            checkId(parentId);
        const attached = [];
        if (meshes !== undefined) {
            if (!source(() => Array.isArray(meshes)))
                invalid('node.meshes');
            const length = source(() => meshes.length);
            if (!Number.isSafeInteger(length) || length < 0)
                invalid('node.meshes.length');
            if (length > MAX_DRAWS - drawCount)
                budget();
            for (let meshIndex = 0; meshIndex < length; meshIndex++) {
                const mesh = source(() => meshes[meshIndex]);
                if (!isMeshGeometry3D(mesh))
                    invalid('node.meshes identity');
                attached.push(mesh);
            }
            drawCount += length;
        }
        const attachedCards = [];
        if (cards !== undefined) {
            if (!source(() => Array.isArray(cards)))
                invalid('node.cards');
            const length = source(() => cards.length);
            if (!Number.isSafeInteger(length) || length < 0)
                invalid('node.cards.length');
            if (length > MAX_DRAWS - drawCount)
                budget();
            for (let cardIndex = 0; cardIndex < length; cardIndex++) {
                const card = source(() => cards[cardIndex]);
                if (!isSceneWorldCard3D(card))
                    invalid('node.cards identity');
                attachedCards.push(card);
            }
            drawCount += length;
        }
        nodes.push({ id, parentId, localMatrix: localMatrix(matrix), meshes: Object.freeze(attached), cards: Object.freeze(attachedCards) });
    }
    return nodes;
}
export function isSceneWorld3D(value) {
    return typeof value === 'object' && value !== null && worlds.has(value);
}
export function createSceneWorld3D(input) {
    return assemble(captureNodes(input, 0, 0));
}
/** The GLB binder provides immutable UVs and opaque images before publication. */
export function createTexturedSceneWorld3D(input, textures) {
    return assemble(captureNodes(input, 0, 0), new Map(textures));
}
/** The explicit Lambert binder owns the normals and image leases at publication. */
export function createLambertSceneWorld3D(input, surfaces, lighting) {
    return assemble(captureNodes(input, 0, 0), new Map(surfaces), normalizeLighting(lighting));
}
//# sourceMappingURL=sceneWorld3D.js.map