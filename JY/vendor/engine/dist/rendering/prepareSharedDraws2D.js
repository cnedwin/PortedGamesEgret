import { isImageData2D, isSharedGeometry2D, isSharedMaterial2D, isTexturedGeometry2D } from '@egret/contracts';
import { prepareEffects2D } from './sharedEffects2D.js';
import { Preparation, coordinate, clipPolygon2D, finishPolygonWinding2D } from './prepareRectangles2D.js';
import { TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
import { noteOwnedPreparationFailure } from './ownedPreparationFailure2D.js';
import { decodeSharedSRGB } from './sharedColor2D.js';
export class SharedPreparationError extends Error {
    reason;
    constructor(reason) {
        super('Shared preparation ' + reason);
        this.reason = reason;
    }
}
export function sharedFailure(reason) { throw noteOwnedPreparationFailure(new SharedPreparationError(reason)); }
const ATTRS = ['u', 'v', 'r', 'g', 'b', 'a', 'dr', 'dg', 'db'];
function unit(value) { if (!Number.isFinite(value) || value < 0 || value > 1)
    sharedFailure('precision'); return value === 0 ? 0 : value; }
function uv(value) { if (!Number.isFinite(value))
    sharedFailure('precision'); return value === 0 ? 0 : value; }
function add(used, value, limit) { if (!Number.isSafeInteger(value) || value < 0 || value > limit - used)
    sharedFailure('budget'); return used + value; }
/** Address qualification follows f32 preparation and never clamps/modulos authored vertices. */
export function qualifySharedUV(point, draw, frame) {
    if (draw.pageIndex === undefined)
        return;
    const region = draw.region, page = frame.pages[draw.pageIndex].source, material = draw.material;
    const width = material.samplingDomain === 'page' ? page.width : region.logicalWidth;
    const height = material.samplingDomain === 'page' ? page.height : region.logicalHeight;
    const periodic = material.samplingDomain === 'page' && (material.addressU !== 'clamp-to-edge' || material.addressV !== 'clamp-to-edge');
    const limit = periodic ? 8192 : 1048576;
    const u = Math.fround(point.u), v = Math.fround(point.v), x = Math.fround(u * width), y = Math.fround(v * height);
    if (!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > limit || Math.abs(y) > limit)
        sharedFailure('precision');
}
function policyFor(budget) {
    const sameXY = (a, b) => { budget.admitTupleComparison(); return a.x === b.x && a.y === b.y; };
    const sameAttributes = (a, b) => { budget.admitTupleComparison(); return ATTRS.every(key => a[key] === b[key]); };
    const assertAppend = (length) => { if (!Number.isSafeInteger(length) || length < 0 || length >= 64)
        sharedFailure('budget'); };
    const policy = { maxCorners: 64, before(a, b) { budget.admitTupleComparison(); return a.x < b.x || (a.x === b.x && a.y < b.y); }, sameTuple(a, b) { return sameXY(a, b) && sameAttributes(a, b); }, assertAppend };
    const normalize = (preparation, input) => {
        if (input.length > 64)
            sharedFailure('budget');
        const result = [];
        for (const p of input) {
            const value = { x: coordinate(p.x), y: coordinate(p.y), u: uv(p.u), v: uv(p.v), r: unit(p.r), g: unit(p.g), b: unit(p.b), a: unit(p.a), dr: unit(p.dr), dg: unit(p.dg), db: unit(p.db) };
            const previous = result[result.length - 1];
            if (previous && sameXY(previous, value)) {
                if (!sameAttributes(previous, value))
                    sharedFailure('precision');
            }
            else {
                assertAppend(result.length);
                result.push(value);
            }
        }
        if (result.length > 1 && sameXY(result[0], result[result.length - 1])) {
            if (!sameAttributes(result[0], result[result.length - 1]))
                sharedFailure('precision');
            result.pop();
        }
        for (let i = 0; i < result.length; i++)
            for (let j = i + 1; j < result.length; j++)
                if (sameXY(result[i], result[j])) {
                    sameAttributes(result[i], result[j]);
                    sharedFailure('precision');
                }
        return result.length < 3 ? [] : finishPolygonWinding2D(preparation, result);
    };
    return { policy, normalize };
}
const attach = (p, q, weight, complementary, x, y) => {
    const value = (key) => { const n = complementary ? q[key] + weight * (p[key] - q[key]) : p[key] + weight * (q[key] - p[key]); return key === 'u' || key === 'v' ? uv(n) : unit(n); };
    return { x: coordinate(x), y: coordinate(y), u: value('u'), v: value('v'), r: value('r'), g: value('g'), b: value('b'), a: value('a'), dr: value('dr'), dg: value('dg'), db: value('db') };
};
function transform(p, m, ratio) {
    const x = coordinate(coordinate(coordinate(m.a * p.x) + coordinate(m.c * p.y)) + m.tx);
    const y = coordinate(coordinate(coordinate(m.b * p.x) + coordinate(m.d * p.y)) + m.ty);
    return { ...p, x: coordinate(x * ratio), y: coordinate(y * ratio) };
}
/** Authentic completion is checked by Host; this cold helper still defends all table references. */
export function prepareSharedDraws2D(frame, width, height, options) {
    if (frame.profile !== 'egret.shared-frame2d/1' || frame.colorRecipe !== 'egret.linear-srgb-pma/1' || frame.targetRepresentation !== 'egret.srgb-pma8-target/1')
        sharedFailure('profile');
    if (frame.commands.length > options.maxCommands || frame.commands.length > 65536 || frame.pages.length > 64 || frame.regions.length > 128 || frame.materials.length > 256 || frame.geometries.length > 128)
        sharedFailure('budget');
    const effects = prepareEffects2D(frame, options.pixelRatio, options.enableEffects === true);
    const budget = new TexturedPreparationBudget2D(options);
    let geometryBytes = 0, pageBytes = 0, clipsCount = 0;
    for (const command of frame.commands)
        if (command.kind === 'barrier' && command.effect)
            clipsCount = add(clipsCount, command.effect.clips.length, options.maxClipRectangles);
    for (const page of frame.pages) {
        if (!isImageData2D(page.source) || page.sourceRepresentation !== 'egret.srgb-straight-rgba8/1' || page.canonicalRepresentation !== 'egret.alpha8-capped-srgb-pma8/1')
            sharedFailure('frame');
        pageBytes = add(pageBytes, page.source.byteLength, 16777216);
    }
    for (const material of frame.materials) {
        if (!isSharedMaterial2D(material))
            sharedFailure('frame');
        if (material.blend === 'add-preserve' && frame.outputAlpha !== 'opaque')
            sharedFailure('profile');
    }
    for (const geometry of frame.geometries) {
        if (!isTexturedGeometry2D(geometry) && !isSharedGeometry2D(geometry))
            sharedFailure('frame');
        geometryBytes = add(geometryBytes, geometry.logicalByteLength, options.maxFrameGeometryBytes);
    }
    for (const region of frame.regions) {
        const page = frame.pages[region.pageIndex]?.source, p = region.packed;
        if (!Number.isSafeInteger(region.pageIndex) || !page || ![p.x, p.y, p.width, p.height, region.logicalWidth, region.logicalHeight, region.trimX, region.trimY, region.quarterTurn].every(Number.isSafeInteger)
            || p.x < 0 || p.y < 0 || p.width <= 0 || p.height <= 0 || p.x + p.width > page.width || p.y + p.height > page.height || region.logicalWidth <= 0 || region.logicalHeight <= 0 || region.logicalWidth > 1048576 || region.logicalHeight > 1048576 || region.trimX < 0 || region.trimY < 0 || region.quarterTurn < 0 || region.quarterTurn > 3)
            sharedFailure('frame');
        const odd = region.quarterTurn === 1 || region.quarterTurn === 3;
        if (region.trimX + (odd ? p.height : p.width) > region.logicalWidth || region.trimY + (odd ? p.width : p.height) > region.logicalHeight)
            sharedFailure('frame');
    }
    for (let i = 0; i < frame.commands.length; i++) {
        const command = frame.commands[i];
        if (command.ordinal !== i || !Number.isSafeInteger(command.occurrenceId) || command.occurrenceId < 0)
            sharedFailure('frame');
        if (command.kind === 'barrier')
            continue;
        if (!frame.materials[command.materialIndex])
            sharedFailure('frame');
        clipsCount = add(clipsCount, command.clips.length, options.maxClipRectangles);
        if (command.kind !== 'rect' && !frame.regions[command.regionIndex])
            sharedFailure('frame');
        if (command.kind === 'mesh') {
            const geometry = frame.geometries[command.geometryIndex];
            if (!geometry)
                sharedFailure('frame');
            budget.admitSourceTriangles(geometry.triangleCount);
        }
    }
    const entries = [];
    let upload = 0;
    for (const command of frame.commands) {
        if (command.kind === 'barrier') {
            entries.push({ kind: 'barrier', ordinal: command.ordinal, occurrenceId: command.occurrenceId });
            continue;
        }
        const material = frame.materials[command.materialIndex], region = command.kind === 'rect' ? undefined : frame.regions[command.regionIndex], pageIndex = region?.pageIndex;
        const preparation = new Preparation(options, budget, true), m = command.matrix, ratio = coordinate(options.pixelRatio);
        for (const n of [m.a, m.b, m.c, m.d, m.tx, m.ty])
            coordinate(n);
        unit(command.opacity);
        const clips = command.clips.map(clip => preparation.rectangle(clip));
        const viewport = [{ x: 0, y: 0 }, { x: coordinate(width), y: 0 }, { x: coordinate(width), y: coordinate(height) }, { x: 0, y: coordinate(height) }];
        const { policy, normalize } = policyFor(budget), polygons = [];
        let vertexReservation = 0;
        // Both SHARED Hosts authenticate the frame before this private helper owns its budget.
        // Shared polygons retain attributed corners and charge the same XY comparisons as TEXTURED meshes.
        const intersect = (polygon, clip) => preparation.tryContainedClip(polygon, clip, 'mesh') ?? clipPolygon2D(preparation, polygon, clip, normalize, attach, policy, 'mesh');
        const descriptor = { region, material, pageIndex };
        const accept = (points) => {
            for (const p of points)
                qualifySharedUV(p, descriptor, frame);
            const authored = preparation.sign(points[0], points[1], points[2]);
            if (authored === 0)
                return;
            const rank = preparation.sign({ x: 0, y: 0 }, { x: m.a, y: m.b }, { x: m.c, y: m.d });
            if (rank === 0)
                return;
            const transformed = points.map(p => transform(p, m, ratio));
            const sign = preparation.sign(transformed[0], transformed[1], transformed[2]);
            if (sign === 0)
                return;
            if (sign !== authored * rank)
                sharedFailure('precision');
            let polygon = normalize(preparation, transformed);
            for (const clip of clips)
                polygon = intersect(polygon, clip);
            polygon = intersect(polygon, viewport);
            for (const p of polygon)
                qualifySharedUV(p, descriptor, frame);
            if (polygon.length < 3 || command.opacity === 0)
                return;
            const count = (polygon.length - 2) * 3;
            budget.admitPreparedVertices(count);
            vertexReservation += count;
            polygons.push(polygon);
        };
        if (command.kind === 'mesh') {
            const g = frame.geometries[command.geometryIndex], shared = isSharedGeometry2D(g);
            for (let i = 0; i < g.indexCount; i += 3) {
                const points = [];
                for (let k = 0; k < 3; k++) {
                    const n = g.indices[i + k], p = 2 * n, c = 4 * n, d = 3 * n;
                    points.push({ x: coordinate(g.positions[p]), y: coordinate(g.positions[p + 1]), u: uv(g.uvs[p]), v: uv(g.uvs[p + 1]), r: unit(g.lightColors[c]), g: unit(g.lightColors[c + 1]), b: unit(g.lightColors[c + 2]), a: unit(g.lightColors[c + 3]), dr: shared ? unit(g.darkColors[d]) : 0, dg: shared ? unit(g.darkColors[d + 1]) : 0, db: shared ? unit(g.darkColors[d + 2]) : 0 });
                }
                accept(points);
            }
        }
        else {
            const rect = command.rect, right = coordinate(rect.x + rect.width), bottom = coordinate(rect.y + rect.height);
            for (const n of [rect.x, rect.y, rect.width, rect.height])
                coordinate(n);
            const color = command.kind === 'rect' ? command.fillColor : 0xffffff, a = command.kind === 'rect' ? unit(command.fillAlpha) : 1;
            const red = decodeSharedSRGB(((color >>> 16) & 255) / 255), green = decodeSharedSRGB(((color >>> 8) & 255) / 255), blue = decodeSharedSRGB((color & 255) / 255);
            const corners = [[rect.x, rect.y, 0, 0], [right, rect.y, 1, 0], [right, bottom, 1, 1], [rect.x, bottom, 0, 1]];
            const points = corners.map(row => {
                let u = row[2], v = row[3];
                if (region && material.samplingDomain === 'page') {
                    const p = region.packed, odd = region.quarterTurn === 1 || region.quarterTurn === 3, w = odd ? p.height : p.width, h = odd ? p.width : p.height, s = u * w, t = v * h;
                    const x = region.quarterTurn === 1 ? h - t : region.quarterTurn === 2 ? w - s : region.quarterTurn === 3 ? t : s;
                    const y = region.quarterTurn === 1 ? s : region.quarterTurn === 2 ? h - t : region.quarterTurn === 3 ? w - s : t;
                    const page = frame.pages[pageIndex].source;
                    u = (p.x + x) / page.width;
                    v = (p.y + y) / page.height;
                }
                return { x: row[0], y: row[1], u, v, r: red, g: green, b: blue, a, dr: 0, dg: 0, db: 0 };
            });
            accept(points);
        }
        upload = add(upload, 44 * vertexReservation + 128, Number.MAX_SAFE_INTEGER);
        entries.push({ kind: 'draw', command, material, region, pageIndex, polygons, vertexReservation });
    }
    return { effects, frame, width, height, entries, budget, geometryBytes, pageBytes, upload: upload + effects.uniformBytes };
}
//# sourceMappingURL=prepareSharedDraws2D.js.map