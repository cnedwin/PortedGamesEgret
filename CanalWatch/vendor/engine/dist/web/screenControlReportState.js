// SPDX-License-Identifier: Apache-2.0
// The named browser accessibility projection owns the real semantic tree and its canvas. Share only that
// live, read-only association with the screen verifier: no tree entry import here, no duplicate tree or
// page-global control API.
const projections = new WeakMap();
export function registerScreenSemantics(surface, semantics) {
    projections.set(surface, semantics);
    return () => {
        if (projections.get(surface) === semantics)
            projections.delete(surface);
    };
}
export function screenSemanticsFor(surface) {
    const semantics = projections.get(surface);
    return semantics?.state === 'active' ? semantics : undefined;
}
