const noBubble = () => { };
/** A snapshot of the current visit to a pointer event, never a retained mutable dispatcher. */
export function pointerTapActivation(node, event) {
    const { globalX: stageX, globalY: stageY, session } = event.payload;
    const position = {};
    // A child handler may have moved or removed an ancestor before the event reaches it. The stage point remains real.
    try {
        const local = node.globalToLocal(stageX, stageY);
        position.localX = local.x;
        position.localY = local.y;
    }
    catch {
        // A singular or unavailable current transform has no local point.
    }
    return Object.freeze({
        source: session.pointerType,
        pointerId: session.pointerId,
        target: event.target,
        currentTarget: node,
        stageX,
        stageY,
        ...position,
        stopPropagation: () => event.stopPropagation()
    });
}
export function semanticTapActivation(node) {
    return Object.freeze({ source: 'semantic', target: node, currentTarget: node, stopPropagation: noBubble });
}
export function directViewActivation(name, source) {
    return Object.freeze({ source, target: name, currentTarget: name, isTarget: true, stopPropagation: noBubble });
}
export function viewTapActivation(activation, currentTarget, target) {
    return Object.freeze({
        ...activation,
        target,
        currentTarget,
        isTarget: activation.target === activation.currentTarget
    });
}
