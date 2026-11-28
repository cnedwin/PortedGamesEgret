// First-party Apache-2.0 implementation. Native admission follows the existing
// first-party ImageData2D pattern; geometry policy is independently authored.
import { canonicalComponents, copyPayload, createGeometryRegistry2D, elementLength, floatBrand, indexBrand, readGeometryField, requireGeometryCapacity, requireGeometryDescriptor, triangleListShape } from './geometryAdmission2D.js';
const freeze = Object.freeze;
const RangeFault = RangeError;
const owned = createGeometryRegistry2D();
const subject = 'Textured geometry';
/** Copies and checks a textured mesh; malformed arrays are refused with a TypeError. */
export function createTexturedGeometry2D(input) {
    requireGeometryDescriptor(input, subject);
    // G1: finish all successful ordered reads before examining any field.
    // Local staging makes descriptor reentry independent of this invocation.
    const positionsInput = readGeometryField(input, 'positions', subject);
    const uvsInput = readGeometryField(input, 'uvs', subject);
    const lightColorsInput = readGeometryField(input, 'lightColors', subject);
    const indicesInput = readGeometryField(input, 'indices', subject);
    // G2 must finish for every field before G3 touches the first backing.
    const positionsTag = floatBrand(positionsInput, subject);
    const uvsTag = floatBrand(uvsInput, subject);
    const lightColorsTag = floatBrand(lightColorsInput, subject);
    const indicesTag = indexBrand(indicesInput, subject);
    const positionsLength = elementLength(positionsInput, positionsTag, subject);
    const uvsLength = elementLength(uvsInput, uvsTag, subject);
    const lightColorsLength = elementLength(lightColorsInput, lightColorsTag, subject);
    const indicesLength = elementLength(indicesInput, indicesTag, subject);
    const vertexCount = positionsLength / 2;
    const indexCount = indicesLength;
    // G4: shape outranks capacity; both precede copies and canonical arrays.
    if (!triangleListShape(vertexCount, indexCount) ||
        uvsLength !== positionsLength ||
        lightColorsLength !== 4 * vertexCount) {
        throw new RangeFault('Textured geometry array shape is invalid');
    }
    const logicalByteLength = 64 * vertexCount + 4 * indexCount;
    requireGeometryCapacity(vertexCount, indexCount, logicalByteLength, subject);
    // G5 completes every native copy before G6 examines any copied component.
    const positionsCopy = copyPayload(positionsInput, positionsTag, positionsLength);
    const uvsCopy = copyPayload(uvsInput, uvsTag, uvsLength);
    const lightColorsCopy = copyPayload(lightColorsInput, lightColorsTag, lightColorsLength);
    const indicesCopy = copyPayload(indicesInput, indicesTag, indicesLength);
    // Components keep the values given; texture coordinates lie within 0 to 1.
    const positions = canonicalComponents(positionsCopy, positionsLength, 'position', vertexCount, 'exact', subject);
    const uvs = canonicalComponents(uvsCopy, uvsLength, 'unit', vertexCount, 'exact', subject);
    const lightColors = canonicalComponents(lightColorsCopy, lightColorsLength, 'unit', vertexCount, 'exact', subject);
    const indices = canonicalComponents(indicesCopy, indicesLength, 'index', vertexCount, 'exact', subject);
    // Logical accounting describes canonical payload units, not physical heap
    // usage or an allocation guarantee. Only the completed frozen value is owned.
    const geometry = freeze({
        vertexCount,
        indexCount,
        triangleCount: indexCount / 3,
        logicalByteLength,
        positions,
        uvs,
        lightColors,
        indices
    });
    owned.own(geometry);
    return geometry;
}
/** Whether a value is a geometry made by `createTexturedGeometry2D`, without reading any of its properties. */
export function isTexturedGeometry2D(value) {
    return owned.has(value);
}
