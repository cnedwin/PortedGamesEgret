const completedFrames = new WeakMap();
const weakGet = WeakMap.prototype.get;
const weakSet = WeakMap.prototype.set;
const apply = Reflect.apply;
/** Engine-only commit after every owned table, command and record is frozen. */
export function registerTexturedFrame(frame) {
    apply(weakSet, completedFrames, [frame, frame]);
}
/** Identity lookup reads no caller field and grants no resource/GPU authority. */
export function readOwnedTexturedFrame(value) {
    return apply(weakGet, completedFrames, [value]);
}
// Shared completion has its own exact protocol identity within the existing
// Engine-private bridge. Neither registry is exported through the public SDK.
const completedSharedFrames = new WeakMap();
export function registerSharedFrame(frame) {
    apply(weakSet, completedSharedFrames, [frame, frame]);
}
export function readOwnedSharedFrame(value) {
    return apply(weakGet, completedSharedFrames, [value]);
}
//# sourceMappingURL=texturedFrameState.js.map