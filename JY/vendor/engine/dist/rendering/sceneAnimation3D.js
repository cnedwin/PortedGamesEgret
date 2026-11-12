// SPDX-License-Identifier: Apache-2.0
import { Scene3DError } from './sceneFrame3D.js';
import { isSceneWorld3D } from './sceneWorld3D.js';
const MAX_TRACKS = 256;
const MAX_KEYS = 8192;
const MAX_TRANSFORM_COMPONENT = 2 ** 24;
const MIN_SCALE_MAGNITUDE = 2 ** -24;
export function isAnimationTranslationInRange(value) {
    return value.every(component => Math.abs(component) <= MAX_TRANSFORM_COMPONENT);
}
export function isAnimationScaleInRange(value) {
    return value.every(component => Math.abs(component) >= MIN_SCALE_MAGNITUDE && Math.abs(component) <= MAX_TRANSFORM_COMPONENT);
}
export function hasMatchingAnimationScaleSigns(a, b) {
    return a.every((component, axis) => (component < 0) === (b[axis] < 0));
}
function invalid(field) {
    throw new Scene3DError('SCENE3D_INPUT_INVALID', field);
}
function budget() {
    throw new Scene3DError('SCENE3D_BUDGET');
}
function source(read) {
    try {
        return read();
    }
    catch (cause) {
        throw new Scene3DError('SCENE3D_INPUT_READ_FAILED', cause);
    }
}
function record(value, field) {
    if (!value || typeof value !== 'object')
        invalid(field);
    return value;
}
function array(value, field) {
    if (!source(() => Array.isArray(value)))
        invalid(field);
    return value;
}
function count(values, field) {
    const length = source(() => values.length);
    if (!Number.isSafeInteger(length) || length < 1)
        invalid(field);
    return length;
}
function own(values, index) {
    return source(() => Object.hasOwn(values, index) ? values[index] : undefined);
}
function finite(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        invalid(field);
    return value === 0 ? 0 : value;
}
function components(value, size, field) {
    const values = array(value, field);
    if (count(values, field) !== size)
        invalid(field);
    const a = finite(own(values, 0), field), b = finite(own(values, 1), field), c = finite(own(values, 2), field);
    return size === 3 ? [a, b, c] : [a, b, c, finite(own(values, 3), field)];
}
function unitQuaternion([x, y, z, w]) {
    // Scale before taking the norm so finite extreme inputs cannot overflow or round the whole norm to zero.
    const largest = Math.max(Math.abs(x), Math.abs(y), Math.abs(z), Math.abs(w));
    if (largest === 0)
        invalid('animation key rotation');
    const a = x / largest, b = y / largest, c = z / largest, d = w / largest;
    const length = Math.hypot(a, b, c, d);
    return [a / length, b / length, c / length, d / length];
}
function readKey(value) {
    const key = record(value, 'animation key');
    const fields = source(() => ({
        timeSeconds: key.timeSeconds, translation: key.translation, rotation: key.rotation, scale: key.scale,
    }));
    const timeSeconds = finite(fields.timeSeconds, 'animation key time');
    if (timeSeconds < 0)
        invalid('animation key time');
    const translation = components(fields.translation, 3, 'animation key translation');
    if (!isAnimationTranslationInRange(translation))
        invalid('animation key translation');
    const scale = components(fields.scale, 3, 'animation key scale');
    if (!isAnimationScaleInRange(scale))
        invalid('animation key scale');
    const rotation = unitQuaternion(components(fields.rotation, 4, 'animation key rotation'));
    return { timeSeconds, translation, rotation, scale };
}
function blendVector(a, b, t) {
    const from = 1 - t;
    return [a[0] * from + b[0] * t, a[1] * from + b[1] * t, a[2] * from + b[2] * t];
}
function sinc(angle) {
    return angle === 0 ? 1 : Math.sin(angle) / angle;
}
function blendRotation(a, b, t) {
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    const direction = dot < 0 ? -1 : 1;
    const distance = Math.hypot(a[0] - direction * b[0], a[1] - direction * b[1], a[2] - direction * b[2], a[3] - direction * b[3]);
    // The chord retains precision when the quaternions are nearly parallel.
    // Using sinc for both SLERP weights also covers coincident orientations.
    const angle = 2 * Math.asin(Math.min(1, distance / 2));
    const denominator = sinc(angle);
    const from = (1 - t) * sinc((1 - t) * angle) / denominator;
    const to = direction * t * sinc(t * angle) / denominator;
    return unitQuaternion([
        a[0] * from + b[0] * to, a[1] * from + b[1] * to, a[2] * from + b[2] * to, a[3] * from + b[3] * to,
    ]);
}
function sampleTrack({ keys, interpolation }, time, read, blend) {
    const first = keys[0], last = keys[keys.length - 1];
    if (time <= first.timeSeconds)
        return read(first);
    if (time >= last.timeSeconds)
        return read(last);
    let lower = 0, upper = keys.length - 1;
    while (upper - lower > 1) {
        const middle = Math.floor((lower + upper) / 2);
        if (keys[middle].timeSeconds <= time)
            lower = middle;
        else
            upper = middle;
    }
    const left = keys[lower], right = keys[upper];
    if (interpolation === 'step' || time === left.timeSeconds)
        return read(left);
    const fraction = (time - left.timeSeconds) / (right.timeSeconds - left.timeSeconds);
    return blend(read(left), read(right), fraction);
}
function keyPose(key) {
    return key;
}
function blendPose(a, b, t) {
    return {
        translation: blendVector(a.translation, b.translation, t),
        rotation: blendRotation(a.rotation, b.rotation, t),
        scale: blendVector(a.scale, b.scale, t),
    };
}
export function matrixForSceneNodePose3D(pose) {
    const [x, y, z, w] = pose.rotation;
    const [sx, sy, sz] = pose.scale;
    const [tx, ty, tz] = pose.translation;
    const xx = 2 * x * x, yy = 2 * y * y, zz = 2 * z * z;
    const xy = 2 * x * y, xz = 2 * x * z, yz = 2 * y * z;
    const xw = 2 * x * w, yw = 2 * y * w, zw = 2 * z * w;
    // Each rotation column receives its local scale. The final column is the unscaled translation.
    return [
        (1 - yy - zz) * sx, (xy + zw) * sx, (xz - yw) * sx, 0,
        (xy - zw) * sy, (1 - xx - zz) * sy, (yz + xw) * sy, 0,
        (xz + yw) * sz, (yz - xw) * sz, (1 - xx - yy) * sz, 0,
        tx, ty, tz, 1,
    ];
}
function clipTime(elapsedSeconds, durationSeconds, mode) {
    const elapsed = finite(elapsedSeconds, 'animation elapsed time');
    if (elapsed < 0)
        invalid('animation elapsed time');
    if (mode !== 'once' && mode !== 'loop')
        invalid('animation playback mode');
    return mode === 'loop' && durationSeconds > 0 ? elapsed % durationSeconds : Math.min(elapsed, durationSeconds);
}
function sampleComponent(track, time, fallback, blend) {
    return track ? sampleTrack(track, time, key => key.value, blend) : fallback;
}
/** Tracks and base poses are owned and validated by the GLB reader before binding. */
export function bindImportedSceneAnimationClip3D(world, tracks, durationSeconds, name) {
    return Object.freeze({
        ...(name === undefined ? {} : { name }),
        durationSeconds,
        sample(elapsedSeconds, mode = 'once') {
            const time = clipTime(elapsedSeconds, durationSeconds, mode);
            // glTF components keep independent timelines and share one immutable world revision.
            return world.withNodeTransforms(tracks.map(track => ({
                id: track.nodeId,
                localMatrix: matrixForSceneNodePose3D({
                    translation: sampleComponent(track.translation, time, track.base.translation, blendVector),
                    rotation: sampleComponent(track.rotation, time, track.base.rotation, blendRotation),
                    scale: sampleComponent(track.scale, time, track.base.scale, blendVector),
                }),
            })));
        },
    });
}
/** An owned rigid-node clip sampled with an explicit time and playback policy. */
export function createSceneAnimationClip3D(input) {
    const raw = record(input, 'animation clip');
    const rawTracks = array(source(() => raw.tracks), 'animation tracks');
    const trackCount = count(rawTracks, 'animation tracks');
    if (trackCount > MAX_TRACKS)
        budget();
    // Admit the complete key budget before reading any key payload.
    const descriptions = [];
    const targets = new Set();
    let totalKeys = 0;
    for (let index = 0; index < trackCount; index++) {
        const track = record(own(rawTracks, index), 'animation track');
        const { nodeId, interpolation, keys: rawKeys } = source(() => ({
            nodeId: track.nodeId, interpolation: track.interpolation, keys: track.keys,
        }));
        if (typeof nodeId !== 'string' || nodeId.length === 0 || nodeId.length > 96 || targets.has(nodeId)) {
            invalid('animation track node id');
        }
        if (interpolation !== 'step' && interpolation !== 'linear')
            invalid('animation track interpolation');
        targets.add(nodeId);
        const keys = array(rawKeys, 'animation keys');
        const keyCount = count(keys, 'animation keys');
        if (keyCount > MAX_KEYS - totalKeys)
            budget();
        totalKeys += keyCount;
        descriptions.push({ nodeId, interpolation, keys, keyCount });
    }
    const tracks = [];
    let durationSeconds = 0;
    for (const { nodeId, interpolation, keys: sourceKeys, keyCount } of descriptions) {
        const keys = [];
        for (let index = 0; index < keyCount; index++) {
            const key = readKey(own(sourceKeys, index));
            const previous = keys[index - 1];
            if (previous && key.timeSeconds <= previous.timeSeconds)
                invalid('animation key time order');
            if (previous && interpolation === 'linear' &&
                !hasMatchingAnimationScaleSigns(key.scale, previous.scale)) {
                invalid('animation linear scale sign');
            }
            keys.push(key);
        }
        durationSeconds = Math.max(durationSeconds, keys[keys.length - 1].timeSeconds);
        tracks.push({ nodeId, interpolation, keys });
    }
    function sample(world, elapsedSeconds, mode = 'once') {
        if (!isSceneWorld3D(world))
            invalid('animation world identity');
        const time = clipTime(elapsedSeconds, durationSeconds, mode);
        return world.withNodeTransforms(tracks.map(track => ({
            id: track.nodeId, localMatrix: matrixForSceneNodePose3D(sampleTrack(track, time, keyPose, blendPose)),
        })));
    }
    return Object.freeze({ durationSeconds, sample });
}
//# sourceMappingURL=sceneAnimation3D.js.map