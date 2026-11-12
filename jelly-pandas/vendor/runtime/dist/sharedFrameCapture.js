import { createSharedMaterial2D, isSharedGeometry2D, isTexturedGeometry2D } from '@egret/contracts';
import { assertLive, childAtOf, childCountOf, isDisplayNode, isStageRoot, parentOf } from './displayTreeState.js';
import { engineOf } from './ownership.js';
import { finite, visualOf } from './displayVisualState.js';
import { composeDisplayTransform } from './displayTransform.js';
import { bitmapCaptureState, readBitmapImage } from './Bitmap.js';
import { readMeshState } from './meshDisplayState.js';
import { readMeshCaptureImage } from './meshCaptureSnapshot.js';
import { assertTextFieldScope, readTextFieldState } from './textDisplayState.js';
import { EgretError } from './EgretError.js';
const freeze = Object.freeze;
const defaultMaterial = createSharedMaterial2D({});
const identity = freeze({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
function debit(used, count, limit, code = 'FRAME_BUDGET_EXCEEDED') {
    if (!Number.isSafeInteger(count) || count < 0 || count > limit - used)
        throw new EgretError(code);
    return used + count;
}
/** Call-local logical charges are independent of visibility and actual allocation. */
class CaptureBudget {
    nodes = 0;
    units = 0;
    triangles = 0;
    geometryBytes = 0;
    sourceBytes = 0;
    canonicalBytes = 0;
    commands = 0;
    clipReferences = 0;
    // Header plus all five empty table arrays are charged even for a clear-only frame.
    metadata = 256 + 5 * 24;
    geometryOwners = new Set();
    sourceOwners = new Set();
    clipOwners = new Set();
    node() { this.nodes = debit(this.nodes, 1, 65536); }
    authoring(count) { this.units = debit(this.units, count, 65536); }
    geometry(value) {
        if (!isTexturedGeometry2D(value) && !isSharedGeometry2D(value))
            throw new EgretError('MESH_GEOMETRY_INVALID');
        this.triangles = debit(this.triangles, value.triangleCount, 65536);
        if (this.geometryOwners.has(value))
            return;
        debit(this.geometryOwners.size, 1, 128);
        this.geometryBytes = debit(this.geometryBytes, value.logicalByteLength, 16777216);
        this.geometryOwners.add(value);
    }
    source(value) {
        if (this.sourceOwners.has(value))
            return;
        debit(this.sourceOwners.size, 1, 64, 'FRAME_IMAGE_BUDGET');
        const source = debit(this.sourceBytes, value.byteLength, 16777216, 'FRAME_IMAGE_BUDGET');
        const canonical = debit(this.canonicalBytes, value.byteLength, 16777216, 'FRAME_IMAGE_BUDGET');
        this.sourceBytes = source;
        this.canonicalBytes = canonical;
        this.sourceOwners.add(value);
    }
    metadataBytes(bytes) { this.metadata = debit(this.metadata, bytes, 33554432); }
    emission(clips, barrier) {
        const count = barrier ? 0 : clips?.depth ?? 0;
        this.commands = debit(this.commands, 1, 65536);
        this.clipReferences = debit(this.clipReferences, count, 262144);
        this.metadataBytes(8 + (barrier ? 64 : 192 + 24 + 8 * count));
        if (!barrier)
            for (let cursor = clips; cursor !== undefined; cursor = cursor.previous) {
                if (this.clipOwners.has(cursor.clip))
                    continue;
                this.metadataBytes(80);
                this.clipOwners.add(cursor.clip);
            }
    }
}
const liveTree = { count: childCountOf, child: childAtOf, parent: parentOf };
function checkNode(node, parent, engine, seen, tree) {
    if (!isDisplayNode(node) || seen.has(node) || tree.parent(node) !== parent)
        throw new EgretError('DISPLAY_TREE_INVARIANT');
    assertLive(node);
    if (engineOf(node) !== engine)
        throw new EgretError('ENGINE_MISMATCH');
    seen.add(node);
}
/** All-tree metadata and geometry admission precedes any visible resource use. */
function admitTree(stage, engine, budget, readBitmap, tree) {
    const admitted = new Map(), seen = new Set(), stack = [];
    function enter(node, parent) {
        budget.node();
        checkNode(node, parent, engine, seen, tree);
        const primitives = visualOf(node).primitives;
        budget.authoring(primitives.length);
        const bitmap = readBitmap(node), mesh = readMeshState(node), text = readTextFieldState(node);
        if (bitmap !== undefined)
            budget.authoring(1);
        if (mesh !== undefined) {
            budget.authoring(1);
            budget.geometry(mesh.geometry);
        }
        if (text?.committed !== undefined)
            budget.authoring(1);
        admitted.set(node, { primitives, primitiveCount: primitives.length, bitmap, mesh, text });
        stack.push({ node, children: tree.count(node), nextChild: 0 });
    }
    enter(stage, undefined);
    while (stack.length !== 0) {
        const cursor = stack[stack.length - 1];
        if (cursor.nextChild === cursor.children) {
            stack.pop();
            continue;
        }
        const child = tree.child(cursor.node, cursor.nextChild++);
        if (child === undefined)
            throw new EgretError('DISPLAY_TREE_INVARIANT');
        enter(child, cursor.node);
    }
    return admitted;
}
function checkedMatrix(matrix) {
    if (![matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty].every(finite))
        throw new EgretError('FRAME_TRANSFORM_INVALID');
    return freeze(matrix);
}
function point(matrix, x, y) {
    if (!finite(x) || !finite(y) || !finite(matrix.a * x + matrix.c * y + matrix.tx)
        || !finite(matrix.b * x + matrix.d * y + matrix.ty))
        throw new EgretError('FRAME_TRANSFORM_INVALID');
}
function rectangle(matrix, rect) {
    const right = rect.x + rect.width, bottom = rect.y + rect.height;
    if (!finite(right) || !finite(bottom))
        throw new EgretError('FRAME_TRANSFORM_INVALID');
    point(matrix, rect.x, rect.y);
    point(matrix, right, rect.y);
    point(matrix, right, bottom);
    point(matrix, rect.x, bottom);
    return freeze({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
}
function referencedTuples(matrix, geometry) {
    const shared = isSharedGeometry2D(geometry);
    for (let offset = 0; offset < geometry.indexCount; offset++) {
        const index = geometry.indices[offset];
        point(matrix, geometry.positions[2 * index], geometry.positions[2 * index + 1]);
        const u = geometry.uvs[2 * index], v = geometry.uvs[2 * index + 1];
        if (!finite(u) || !finite(v))
            throw new EgretError('FRAME_TRANSFORM_INVALID');
        for (let component = 0; component < 4; component++) {
            const value = geometry.lightColors[4 * index + component];
            if (!finite(value) || value < 0 || value > 1)
                throw new EgretError('FRAME_TRANSFORM_INVALID');
        }
        if (shared)
            for (let component = 0; component < 3; component++) {
                const value = geometry.darkColors[3 * index + component];
                if (!finite(value) || value < 0 || value > 1)
                    throw new EgretError('FRAME_TRANSFORM_INVALID');
            }
    }
    // GPU page-q and periodic precision admission belongs to Host preparation.
}
function flattenClips(chain) {
    const result = new Array(chain?.depth ?? 0);
    for (let cursor = chain; cursor !== undefined; cursor = cursor.previous)
        result[cursor.depth - 1] = cursor.clip;
    return freeze(result);
}
function materialKey(material) {
    const light = material.light, dark = material.dark;
    return light[0] + ',' + light[1] + ',' + light[2] + ',' + light[3] + ';'
        + dark[0] + ',' + dark[1] + ',' + dark[2] + ';' + material.blend + ';' + material.samplingDomain
        + ';' + material.filter + ';' + material.addressU + ';' + material.addressV + ';' + material.regionIsolation
        + ';' + material.mipLevel + ';' + material.minFilter + ';' + material.magFilter + ';' + material.maxAnisotropy;
}
function regionKey(region) {
    const packed = region.packed;
    return packed.x + ',' + packed.y + ',' + packed.width + ',' + packed.height + ',' + region.logicalWidth
        + ',' + region.logicalHeight + ',' + region.trimX + ',' + region.trimY + ',' + region.quarterTurn;
}
function plainRegion(sourceRect) {
    return { packed: sourceRect, logicalWidth: sourceRect.width, logicalHeight: sourceRect.height, trimX: 0, trimY: 0, quarterTurn: 0 };
}
function bitmapRegion(bitmap) {
    if (bitmap.viewRegion !== null)
        return bitmap.viewRegion;
    const layout = bitmap.layout;
    if (layout === undefined)
        return plainRegion(bitmap.sourceRect);
    // This is a new-profile representation boundary, after current entitlement.
    // Legacy atlas commits/captures retain their broader safe-integer dimensions.
    if (layout.sourceWidth > 1048576 || layout.sourceHeight > 1048576 || layout.trimX > 1048576 || layout.trimY > 1048576) {
        throw new EgretError('FRAME_PROFILE_METADATA_UNSUPPORTED');
    }
    return { packed: bitmap.sourceRect, logicalWidth: layout.sourceWidth, logicalHeight: layout.sourceHeight,
        trimX: layout.trimX, trimY: layout.trimY, quarterTurn: layout.packedRotation === 0 ? 0 : 1 };
}
function bitmapRect(bitmap, material) {
    if (material.samplingDomain === 'region')
        return { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    const view = bitmap.viewRegion, layout = bitmap.layout;
    const turn = view?.quarterTurn ?? (layout?.packedRotation === 90 ? 1 : 0);
    return { x: view?.trimX ?? layout?.trimX ?? 0, y: view?.trimY ?? layout?.trimY ?? 0,
        width: turn === 1 || turn === 3 ? bitmap.sourceRect.height : bitmap.sourceRect.width,
        height: turn === 1 || turn === 3 ? bitmap.sourceRect.width : bitmap.sourceRect.height };
}
/** Cold, iterative capture. All mutable owners stay inside this invocation. */
export function collectSharedFrameContent(stage) {
    return captureSharedContent(stage, bitmapCaptureState);
}
/** Runtime-private fixed Bitmap assembly; never forwarded by a package root. */
export function collectPreparedSharedFrameContent(stage, view) {
    return captureSharedContent(stage, view.read);
}
/** Private single-edge overlay; ordinary capture always uses the unchanged live readers. */
export function collectSubtreeSharedFrameContent(stage, target, candidate) {
    const tree = { count: node => node === target ? 1 : childCountOf(node),
        child: (node, index) => node === target ? (index === 0 ? candidate : undefined) : childAtOf(node, index),
        parent: node => node === candidate ? target : parentOf(node) };
    return captureSharedContent(stage, bitmapCaptureState, tree);
}
function captureSharedContent(stage, readBitmap, tree = liveTree) {
    if (!isStageRoot(stage))
        throw new EgretError('FRAME_STAGE_INVALID');
    const engine = engineOf(stage);
    engine.assertOpen();
    const budget = new CaptureBudget(), admitted = admitTree(stage, engine, budget, readBitmap, tree);
    engine.assertOpen();
    const commands = [], pages = [], regions = [];
    const materials = [], geometries = [];
    const pageIndexes = new Map(), regionIndexes = new Map();
    const materialIndexes = new Map(), geometryIndexes = new Map();
    const seen = new Set(), stack = [];
    let nextOccurrence = 0, nextBoundary = 0;
    function materialIndex(material) {
        const key = materialKey(material), found = materialIndexes.get(key);
        if (found !== undefined)
            return found;
        debit(materials.length, 1, 256);
        budget.metadataBytes(192 + 8);
        const index = materials.length;
        materials.push(material);
        materialIndexes.set(key, index);
        return index;
    }
    function regionIndex(image, value) {
        const key = regionKey(value), owner = regionIndexes.get(image), found = owner?.get(key);
        if (found !== undefined)
            return found;
        debit(regions.length, 1, 128, 'FRAME_IMAGE_BUDGET');
        let pageIndex = pageIndexes.get(image);
        if (pageIndex === undefined) {
            budget.metadataBytes(96 + 8);
            pageIndex = pages.length;
            pages.push(freeze({ source: image, sourceRepresentation: 'egret.srgb-straight-rgba8/1',
                canonicalRepresentation: 'egret.alpha8-capped-srgb-pma8/1' }));
            pageIndexes.set(image, pageIndex);
        }
        budget.metadataBytes(128 + 8);
        const packed = freeze({ x: value.packed.x, y: value.packed.y, width: value.packed.width, height: value.packed.height });
        const index = regions.length;
        regions.push(freeze({ pageIndex, packed, logicalWidth: value.logicalWidth, logicalHeight: value.logicalHeight,
            trimX: value.trimX, trimY: value.trimY, quarterTurn: value.quarterTurn }));
        const entries = owner ?? new Map();
        entries.set(key, index);
        if (owner === undefined)
            regionIndexes.set(image, entries);
        return index;
    }
    function geometryIndex(geometry) {
        const found = geometryIndexes.get(geometry);
        if (found !== undefined)
            return found;
        budget.metadataBytes(8);
        const index = geometries.length;
        geometries.push(geometry);
        geometryIndexes.set(geometry, index);
        return index;
    }
    function barrier(reason, pair) {
        budget.emission(undefined, true);
        commands.push(freeze({ kind: 'barrier', ordinal: commands.length, occurrenceId: pair.occurrenceId,
            boundaryId: pair.boundaryId, reason }));
    }
    function open(reason) {
        const pair = { occurrenceId: nextOccurrence++, boundaryId: nextBoundary++ };
        barrier(reason, pair);
        return pair;
    }
    function close(explicit, clip, effect) {
        if (effect !== undefined)
            barrier('effect-exit', effect);
        if (clip !== undefined)
            barrier('clip-exit', clip);
        if (explicit !== undefined)
            barrier('explicit-exit', explicit);
    }
    function empty(occurrenceId) { barrier('empty', { occurrenceId, boundaryId: nextBoundary++ }); }
    function drawState(occurrenceId, material, matrix, opacity, clips) {
        budget.emission(clips, false);
        return { ordinal: commands.length, occurrenceId, materialIndex: materialIndex(material), matrix, opacity, clips: flattenClips(clips) };
    }
    function enter(node, parent, parentMatrix, parentAlpha, inheritedClips, inheritedMaterial) {
        checkNode(node, parent, engine, seen, tree);
        const metadata = admitted.get(node), state = visualOf(node);
        if (metadata === undefined || state.primitives !== metadata.primitives || state.primitives.length !== metadata.primitiveCount
            || readBitmap(node) !== metadata.bitmap || readMeshState(node) !== metadata.mesh || readTextFieldState(node) !== metadata.text) {
            throw new EgretError('DISPLAY_TREE_INVARIANT');
        }
        const explicit = state.renderBoundary === 'isolate' ? open('explicit-enter') : undefined;
        const alpha = parentAlpha * state.alpha;
        if (!state.visible || state.alpha === 0 || alpha === 0) {
            close(explicit, undefined);
            return;
        }
        if (!finite(alpha))
            throw new EgretError('FRAME_TRANSFORM_INVALID');
        const material = state.sharedMaterial ?? inheritedMaterial;
        const matrix = checkedMatrix(composeDisplayTransform(parentMatrix, state));
        let clips = inheritedClips, clip;
        if (state.clipRect !== undefined) {
            const rect = rectangle(matrix, state.clipRect);
            clip = open('clip-enter');
            if (rect.width === 0 || rect.height === 0) {
                close(explicit, clip);
                return;
            }
            clips = { previous: clips, clip: freeze({ matrix, rect }), depth: (clips?.depth ?? 0) + 1 };
        }
        let effect;
        if (state.renderEffect !== undefined) {
            const settings = state.renderEffect, mask = settings.alphaMask;
            let maskPageIndex;
            if (mask !== undefined) {
                assertLive(mask);
                if (engineOf(mask) !== engine)
                    throw new EgretError('ENGINE_MISMATCH');
                const binding = readBitmap(mask);
                if (!binding)
                    throw new EgretError('DISPLAY_EFFECT_MASK_INVALID');
                const image = readBitmapImage(binding.lease).image, region = bitmapRegion(binding), packed = region.packed;
                if (packed.x !== 0 || packed.y !== 0 || packed.width !== image.width || packed.height !== image.height || region.quarterTurn !== 0 || region.trimX !== 0 || region.trimY !== 0 || region.logicalWidth !== image.width || region.logicalHeight !== image.height)
                    throw new EgretError('DISPLAY_EFFECT_MASK_UNSUPPORTED');
                budget.source(image);
                maskPageIndex = regions[regionIndex(image, region)].pageIndex;
            }
            effect = { occurrenceId: nextOccurrence++, boundaryId: nextBoundary++ };
            budget.emission(undefined, true);
            budget.metadataBytes(128 + 80 * (clips?.depth ?? 0));
            commands.push(freeze({ kind: 'barrier', ordinal: commands.length, ...effect, reason: 'effect-enter', effect: freeze({ blurRadius: settings.blurRadius ?? 0, maskPageIndex, maskRect: settings.maskRect, matrix, clips: flattenClips(clips) }) }));
            // Parent clips apply to the composited result, not intermediate blur taps.
            clips = undefined;
        }
        for (let index = 0; index < metadata.primitiveCount; index++) {
            const primitive = metadata.primitives[index], occurrenceId = nextOccurrence++;
            const rect = rectangle(matrix, primitive.rect), effective = alpha * primitive.alpha;
            if (rect.width === 0 || rect.height === 0 || effective === 0) {
                empty(occurrenceId);
                continue;
            }
            commands.push(freeze({ kind: 'rect', ...drawState(occurrenceId, material, matrix, alpha, clips),
                rect, fillColor: primitive.color, fillAlpha: primitive.alpha }));
        }
        const bitmap = metadata.bitmap;
        if (bitmap !== undefined) {
            const occurrenceId = nextOccurrence++;
            const rect = rectangle(matrix, bitmapRect(bitmap, material));
            const snapshot = readBitmapImage(bitmap.lease);
            const region = bitmapRegion(bitmap);
            budget.source(snapshot.image);
            const sharedRegionIndex = regionIndex(snapshot.image, region);
            commands.push(freeze({ kind: 'image', ...drawState(occurrenceId, material, matrix, alpha, clips), rect, regionIndex: sharedRegionIndex }));
        }
        const mesh = metadata.mesh;
        if (mesh !== undefined) {
            const occurrenceId = nextOccurrence++, snapshot = readMeshCaptureImage(mesh);
            if (mesh.regionOnly && material.samplingDomain !== 'region')
                throw new EgretError('SHARED_MATERIAL_UNSUPPORTED');
            referencedTuples(matrix, mesh.geometry);
            budget.source(snapshot.image);
            if (mesh.geometry.indexCount === 0)
                empty(occurrenceId);
            else {
                const sharedRegionIndex = regionIndex(snapshot.image, mesh.viewRegion ?? plainRegion(mesh.sourceRect));
                const sharedGeometryIndex = geometryIndex(mesh.geometry);
                commands.push(freeze({ kind: 'mesh', ...drawState(occurrenceId, material, matrix, alpha, clips),
                    regionIndex: sharedRegionIndex, geometryIndex: sharedGeometryIndex }));
            }
        }
        const text = metadata.text;
        if (text !== undefined) {
            assertTextFieldScope(text.scope);
            const committed = text.committed;
            if (committed !== undefined) {
                const occurrenceId = nextOccurrence++;
                if (committed.lease === undefined || committed.raster === undefined || committed.sourceRect === undefined)
                    empty(occurrenceId);
                else {
                    const rect = rectangle(matrix, committed.raster), snapshot = readBitmapImage(committed.lease);
                    budget.source(snapshot.image);
                    if (rect.width === 0 || rect.height === 0)
                        empty(occurrenceId);
                    else {
                        const sharedRegionIndex = regionIndex(snapshot.image, snapshot.viewRegion ?? plainRegion(committed.sourceRect));
                        commands.push(freeze({ kind: 'image', ...drawState(occurrenceId, material, matrix, alpha, clips), rect, regionIndex: sharedRegionIndex }));
                    }
                }
            }
        }
        stack.push({ node, children: tree.count(node), nextChild: 0, matrix, alpha, clips, material, explicit, clip, effect });
    }
    enter(stage, undefined, identity, 1, undefined, defaultMaterial);
    while (stack.length !== 0) {
        const cursor = stack[stack.length - 1];
        if (cursor.nextChild === cursor.children) {
            close(cursor.explicit, cursor.clip, cursor.effect);
            stack.pop();
            continue;
        }
        const child = tree.child(cursor.node, cursor.nextChild++);
        if (child === undefined)
            throw new EgretError('DISPLAY_TREE_INVARIANT');
        enter(child, cursor.node, cursor.matrix, cursor.alpha, cursor.clips, cursor.material);
    }
    engine.assertOpen();
    return freeze({ commands: freeze(commands), pages: freeze(pages), regions: freeze(regions),
        materials: freeze(materials), geometries: freeze(geometries) });
}
