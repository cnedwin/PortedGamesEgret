import { packSharedDraws2D } from '../rendering/packSharedDraws2D.js';
import { noteOwnedPreparationFailure } from '../rendering/ownedPreparationFailure2D.js';
import { SharedStorageError2D, planSharedStorageFees2D, withSharedReadbackLayout2D, checkSharedCapacity2D as checkSharedStorageCapacity2D, materializeSharedPages2D as materializeSharedStoragePages2D } from './sharedSubmissionStorage2D.js';
// Retain the existing error constructor identity and private WebGPU callable types.
export { SharedStorageError2D } from './sharedSubmissionStorage2D.js';
export const checkSharedCapacity2D = checkSharedStorageCapacity2D;
export const materializeSharedPages2D = materializeSharedStoragePages2D;
function failDevice() { throw noteOwnedPreparationFailure(new SharedStorageError2D('device')); }
/** Preserve WebGPU fees, 256-byte rows, native checks and pending order before payloads. */
export function planSharedSubmission2D(prepared, options, hardware, owner, readback, scene, sharedProjection) {
    const fees = planSharedStorageFees2D(prepared, options, scene), { width, height } = prepared;
    const rowPitch = readback ? Math.ceil(4 * width / 256) * 256 : 0, staging = rowPitch * height, output = readback ? fees.colorBytes : 0;
    const layout = withSharedReadbackLayout2D(fees, { rowPitch, staging, output });
    if (width > hardware.maxTextureDimension2D || height > hardware.maxTextureDimension2D || staging > hardware.maxBufferSize)
        failDevice();
    for (const bytes of hardware.sceneBufferBytes ?? [])
        if (bytes > hardware.maxBufferSize)
            failDevice();
    for (const draw of prepared.entries)
        if (draw.kind === 'draw' && (44 * draw.vertexReservation > hardware.maxBufferSize || 128 > hardware.maxBufferSize))
            failDevice();
    const views = sharedProjection?.views ?? prepared.frame.pages.map(page => { const image = page.source; if (image.width > hardware.maxTextureDimension2D || image.height > hardware.maxTextureDimension2D)
        failDevice(); return { image, region: { x: 0, y: 0, width: image.width, height: image.height }, byteLength: image.byteLength }; });
    if (sharedProjection)
        for (const view of views)
            if (view.image.width > hardware.maxTextureDimension2D || view.image.height > hardware.maxTextureDimension2D)
                failDevice();
    const projectionPlan = sharedProjection ?? { views, commandViews: [], projectionBytes: prepared.pageBytes, scratchBytes: 0 };
    const storage = { ...layout, options, projectionPlan };
    checkSharedCapacity2D(storage, owner);
    return storage;
}
export const packSharedSubmission2D = packSharedDraws2D;
