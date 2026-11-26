// SPDX-License-Identifier: Apache-2.0
import { EgretError } from '@egret/runtime';
import { captureUiLayout } from '@egret/runtime/ui';
const freeze = Object.freeze;
const sourceMarker = freeze({});
// Layout caches retain numeric descriptors, never historical data source snapshots.
export function withoutSources(tree) {
    function copy(node) {
        const result = freeze({
            ...node,
            ...(node.kind === 'virtualList'
                ? {
                    source: sourceMarker
                }
                : {}),
            ...(node.children === undefined
                ? {}
                : {
                    children: freeze(node.children.map(copy))
                })
        });
        return result;
    }
    const root = copy(tree.root);
    return captureUiLayout(root);
}
export function preparationError(cause, cleanupErrors) {
    if (cause instanceof EgretError && cleanupErrors.length === 0)
        return cause;
    return new EgretError(cause instanceof EgretError ? cause.code : 'UI_PREPARE_FAILED', { cause, cleanupErrors });
}
export function fail(code, reason) {
    throw new EgretError(code, reason === undefined ? {} : { cause: new Error(reason) });
}
/** Why a root is busy with its own work: a preparation that has not settled, or a commit being made. */
export function failBusy(preparing) {
    fail('UI_BUSY', preparing
        ? 'an earlier prepare() of this root has not settled yet: await it, then prepare again'
        : 'a commit of this root is being made');
}
export function next(value) {
    if (value >= Number.MAX_SAFE_INTEGER)
        fail('UI_REVISION_EXHAUSTED');
    return value + 1;
}
export function number(value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
        fail('UI_VALUE_INVALID');
    return value === 0 ? 0 : value;
}
export function viewport(value) {
    return freeze({
        width: number(value.width, Number.MIN_VALUE, 16384),
        height: number(value.height, Number.MIN_VALUE, 16384)
    });
}
export function origin(value, size) {
    const x = number(value.x, -1048576, 1048576), y = number(value.y, -1048576, 1048576);
    if (Math.abs(x + size.width) > 1048576 || Math.abs(y + size.height) > 1048576)
        fail('UI_VALUE_INVALID');
    return freeze({
        x,
        y
    });
}
