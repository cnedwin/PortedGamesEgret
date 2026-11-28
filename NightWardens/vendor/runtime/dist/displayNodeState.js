import { EgretError } from './EgretError.js';
// The display tree's own records. displayTreeState is the only module that changes them; the
// visual and managed state read them here, so neither needs to import the tree operations back.
export const nodes = new WeakSet();
export const terminated = new WeakSet();
export const roots = new WeakSet();
export const parents = new WeakMap();
export const childLists = new WeakMap();
/** Identity-only authentication never reads a forged or proxied Stage. */
export function isStageRoot(value) {
    return roots.has(value);
}
export function isDisplayNode(value) {
    return nodes.has(value);
}
export function isTerminated(node) {
    return terminated.has(node);
}
export function parentOf(node) {
    return parents.get(node);
}
/** Return a snapshot so callers cannot mutate the authoritative child list. */
export function childrenOf(node) {
    return [...(childLists.get(node) ?? [])];
}
/** Callback-free O(1) readers for budgeted traversal; never clone the list. */
export function childCountOf(node) {
    return childLists.get(node)?.length ?? 0;
}
export function childAtOf(node, index) {
    return childLists.get(node)?.[index];
}
export function assertLive(node) {
    if (terminated.has(node))
        throw new EgretError('OBJECT_DISPOSED');
}
