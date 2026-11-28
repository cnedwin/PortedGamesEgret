// SPDX-License-Identifier: Apache-2.0
// What the pointer and the hover input share: which targets may receive them, how their cleanup
// callbacks run, and when a closed input lets go of its Engine.
import { DisplayObject, DisplayObjectContainer, EgretError } from '@egret/runtime';
// Captured when the module loads, so a later change to these accessors cannot redirect admission.
const getter = (prototype, key) => Object.getOwnPropertyDescriptor(prototype, key).get;
const parent = getter(DisplayObject.prototype, 'parent'), visible = getter(DisplayObject.prototype, 'visible');
const touch = getter(DisplayObject.prototype, 'touchEnabled'), children = getter(DisplayObjectContainer.prototype, 'touchChildren');
/**
 * Whether a target may receive routed input now. The Engine and the scope must still be open, the
 * target attached and touch-enabled, every node up to the stage visible, and every ancestor letting
 * its children be touched. An input that has closed passes no owner, scope or operations.
 */
export function acceptsRoutedInput(target, owner, scope, operations, maxNodes) {
    if (owner === undefined || scope === undefined || operations === undefined)
        return false;
    try {
        owner.assertReady();
        scope.assertOpen();
    }
    catch {
        return false;
    }
    if (!operations.isAttached(target, maxNodes) || Reflect.apply(touch, target, []) !== true)
        return false;
    let node = target, visited = 0;
    while (node !== undefined) {
        if (++visited > maxNodes)
            throw new EgretError('HIT_TEST_TREE_LIMIT');
        if (Reflect.apply(visible, node, []) !== true)
            return false;
        if (node !== target && Reflect.apply(children, node, []) !== true)
            return false;
        node = Reflect.apply(parent, node, []);
    }
    return true;
}
/** Runs every callback, whatever an earlier one threw. */
export function runCleanup(callbacks) {
    let first, failed = false;
    const others = [];
    for (const callback of callbacks)
        try {
            callback();
        }
        catch (cause) {
            if (!failed) {
                first = cause;
                failed = true;
            }
            else
                others.push(cause);
        }
    return { failed, first, others };
}
/**
 * Wraps the public operations of one input, which may reenter one another. When the outermost
 * operation returns, `settle` runs; that is where a closed input lets go of its Engine. A failure of
 * `settle` after the operation itself failed is reported as `combined(operationFailure, settleFailure)`.
 */
export function createRoutedOperations(settle, combined) {
    let calls = 0;
    return function invoke(operation) {
        let value, first, failed = false;
        calls++;
        try {
            value = operation();
        }
        catch (cause) {
            failed = true;
            first = cause;
        }
        finally {
            calls--;
        }
        if (calls === 0)
            try {
                settle();
            }
            catch (cause) {
                if (failed)
                    throw combined(first, cause);
                throw cause;
            }
        if (failed)
            throw first;
        return value;
    };
}
