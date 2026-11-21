/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated April 5, 2025. Replaces all prior versions.
 *
 * Copyright (c) 2013-2025, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import { ClippingAttachment, MeshAttachment, RegionAttachment } from "./attachments/index.js";
import { SkeletonClipping } from "./SkeletonClipping.js";
import { BlendMode } from "./SlotData.js";
export class SkeletonRendererCore {
    commandPool = new CommandPool();
    worldVertices = new Float32Array(12 * 1024);
    quadIndices = new Uint16Array([0, 1, 2, 2, 3, 0]);
    clipping = new SkeletonClipping();
    renderCommands = [];
    render(skeleton, pma = false, inColor, stride = 2, slotZOffset = 0) {
        this.commandPool.reset();
        this.renderCommands.length = 0;
        const clipper = this.clipping;
        let z = 0;
        const drawOrder = skeleton.drawOrder.appliedPose;
        for (let i = 0, n = drawOrder.length; i < n; i++) {
            const slot = drawOrder[i];
            if (!slot.bone.active) {
                clipper.clipEnd(slot);
                continue;
            }
            const pose = slot.appliedPose;
            const attachment = pose.attachment;
            if (!attachment) {
                clipper.clipEnd(slot);
                continue;
            }
            const slotColor = pose.color;
            const alpha = slotColor.a;
            if (alpha === 0 && !(attachment instanceof ClippingAttachment)) {
                clipper.clipEnd(slot);
                continue;
            }
            let vertices;
            let verticesCount;
            let uvs;
            let indices;
            let indicesCount;
            let attachmentColor;
            // biome-ignore lint/suspicious/noExplicitAny: texture depends on the runtime
            let texture;
            if (attachment instanceof RegionAttachment) {
                attachmentColor = attachment.color;
                if (attachmentColor.a === 0) {
                    clipper.clipEnd(slot);
                    continue;
                }
                const sequence = attachment.sequence;
                const sequenceIndex = sequence.resolveIndex(pose);
                attachment.computeWorldVertices(slot, attachment.getOffsets(pose), this.worldVertices, 0, stride);
                vertices = this.worldVertices;
                verticesCount = 4;
                uvs = sequence.getUVs(sequenceIndex);
                indices = this.quadIndices;
                indicesCount = 6;
                texture = sequence.regions[sequenceIndex]?.texture;
            }
            else if (attachment instanceof MeshAttachment) {
                attachmentColor = attachment.color;
                if (attachmentColor.a === 0) {
                    clipper.clipEnd(slot);
                    continue;
                }
                if (this.worldVertices.length < attachment.worldVerticesLength)
                    this.worldVertices = new Float32Array(attachment.worldVerticesLength);
                attachment.computeWorldVertices(skeleton, slot, 0, attachment.worldVerticesLength, this.worldVertices, 0, stride);
                vertices = this.worldVertices;
                verticesCount = attachment.worldVerticesLength >> 1;
                const sequence = attachment.sequence;
                const sequenceIndex = sequence.resolveIndex(pose);
                uvs = sequence.getUVs(sequenceIndex);
                indices = attachment.triangles;
                indicesCount = indices.length;
                texture = sequence.regions[sequenceIndex]?.texture;
            }
            else if (attachment instanceof ClippingAttachment) {
                clipper.clipEnd(slot);
                clipper.clipStart(skeleton, slot, attachment);
                continue;
            }
            else {
                clipper.clipEnd(slot);
                continue;
            }
            if (!texture) {
                clipper.clipEnd(slot);
                continue;
            }
            const skelColor = skeleton.color;
            let color, darkColor;
            if (pma) {
                let a;
                if (inColor) {
                    a = Math.floor(inColor[3] * skelColor.a * slotColor.a * attachmentColor.a * 255);
                    const r = Math.floor(a * inColor[0] * skelColor.r * slotColor.r * attachmentColor.r);
                    const g = Math.floor(a * inColor[1] * skelColor.g * slotColor.g * attachmentColor.g);
                    const b = Math.floor(a * inColor[2] * skelColor.b * slotColor.b * attachmentColor.b);
                    color = (a << 24) | (r << 16) | (g << 8) | b;
                }
                else {
                    a = Math.floor(skelColor.a * slotColor.a * attachmentColor.a * 255);
                    const r = Math.floor(a * skelColor.r * slotColor.r * attachmentColor.r);
                    const g = Math.floor(a * skelColor.g * slotColor.g * attachmentColor.g);
                    const b = Math.floor(a * skelColor.b * slotColor.b * attachmentColor.b);
                    color = (a << 24) | (r << 16) | (g << 8) | b;
                }
                darkColor = 0xff000000;
                if (pose.darkColor) {
                    const { r, g, b } = pose.darkColor;
                    darkColor = 0xff000000 |
                        (Math.floor(r * a) << 16) |
                        (Math.floor(g * a) << 8) |
                        Math.floor(b * a);
                }
            }
            else {
                if (inColor) {
                    const a = Math.floor(inColor[3] * skelColor.a * slotColor.a * attachmentColor.a * 255);
                    const r = Math.floor(inColor[0] * skelColor.r * slotColor.r * attachmentColor.r * 255);
                    const g = Math.floor(inColor[1] * skelColor.g * slotColor.g * attachmentColor.g * 255);
                    const b = Math.floor(inColor[2] * skelColor.b * slotColor.b * attachmentColor.b * 255);
                    color = (a << 24) | (r << 16) | (g << 8) | b;
                }
                else {
                    const a = Math.floor(skelColor.a * slotColor.a * attachmentColor.a * 255);
                    const r = Math.floor(skelColor.r * slotColor.r * attachmentColor.r * 255);
                    const g = Math.floor(skelColor.g * slotColor.g * attachmentColor.g * 255);
                    const b = Math.floor(skelColor.b * slotColor.b * attachmentColor.b * 255);
                    color = (a << 24) | (r << 16) | (g << 8) | b;
                }
                darkColor = 0;
                if (pose.darkColor) {
                    const { r, g, b } = pose.darkColor;
                    darkColor = (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);
                }
            }
            if (clipper.isClipping()) {
                clipper.clipTrianglesUnpacked(vertices, 0, indices, indicesCount, uvs, stride);
                vertices = clipper.clippedVerticesTyped;
                verticesCount = clipper.clippedVerticesLength / stride;
                uvs = clipper.clippedUVsTyped;
                indices = clipper.clippedTrianglesTyped;
                indicesCount = clipper.clippedTrianglesLength;
            }
            const cmd = this.commandPool.getCommand(verticesCount, indicesCount, stride);
            cmd.blendMode = slot.data.blendMode;
            cmd.texture = texture;
            cmd.positions.set(vertices.subarray(0, verticesCount * stride));
            // Store slot depth before batching so renderers can separate overlapping attachments.
            if (stride >= 3) {
                for (let j = 2, n = verticesCount * stride; j < n; j += stride)
                    cmd.positions[j] = z;
            }
            cmd.uvs.set(uvs.subarray(0, verticesCount << 1));
            for (let j = 0; j < verticesCount; j++) {
                cmd.colors[j] = color;
                cmd.darkColors[j] = darkColor;
            }
            if (indices instanceof Uint16Array) {
                cmd.indices.set(indices.subarray(0, indicesCount));
            }
            else {
                cmd.indices.set(indices.slice(0, indicesCount));
            }
            this.renderCommands.push(cmd);
            z += slotZOffset;
            clipper.clipEnd(slot);
        }
        clipper.clipEnd();
        return this.batchCommands(stride);
    }
    batchSubCommands(commands, first, last, numVertices, numIndices, stride) {
        const firstCmd = commands[first];
        const batched = this.commandPool.getCommand(numVertices, numIndices, stride);
        batched.blendMode = firstCmd.blendMode;
        batched.texture = firstCmd.texture;
        let positionsOffset = 0;
        let uvsOffset = 0;
        let colorsOffset = 0;
        let indicesOffset = 0;
        let vertexOffset = 0;
        for (let i = first; i <= last; i++) {
            const cmd = commands[i];
            batched.positions.set(cmd.positions, positionsOffset);
            positionsOffset += cmd.numVertices * stride;
            batched.uvs.set(cmd.uvs, uvsOffset);
            uvsOffset += cmd.numVertices << 1;
            batched.colors.set(cmd.colors, colorsOffset);
            batched.darkColors.set(cmd.darkColors, colorsOffset);
            colorsOffset += cmd.numVertices;
            // cannot fast copy - indices need vertex offset adjustment
            for (let j = 0; j < cmd.numIndices; j++)
                batched.indices[indicesOffset + j] = cmd.indices[j] + vertexOffset;
            indicesOffset += cmd.numIndices;
            vertexOffset += cmd.numVertices;
        }
        return batched;
    }
    batchCommands(stride) {
        if (this.renderCommands.length === 0)
            return undefined;
        let root;
        let last;
        let first = this.renderCommands[0];
        let startIndex = 0;
        let i = 1;
        let numVertices = first.numVertices;
        let numIndices = first.numIndices;
        while (i <= this.renderCommands.length) {
            const cmd = i < this.renderCommands.length ? this.renderCommands[i] : null;
            if (cmd && cmd.numVertices === 0 && cmd.numIndices === 0) {
                i++;
                continue;
            }
            const canBatch = cmd !== null &&
                cmd.texture === first.texture &&
                cmd.blendMode === first.blendMode &&
                cmd.colors[0] === first.colors[0] &&
                cmd.darkColors[0] === first.darkColors[0] &&
                numIndices + cmd.numIndices < 0xffff;
            if (canBatch) {
                numVertices += cmd.numVertices;
                numIndices += cmd.numIndices;
            }
            else {
                const batched = this.batchSubCommands(this.renderCommands, startIndex, i - 1, numVertices, numIndices, stride);
                if (!last) {
                    root = last = batched;
                }
                else {
                    last.next = batched;
                    last = batched;
                }
                if (i === this.renderCommands.length)
                    break;
                first = this.renderCommands[i];
                startIndex = i;
                numVertices = first.numVertices;
                numIndices = first.numIndices;
            }
            i++;
        }
        return root;
    }
}
class CommandPool {
    pool = [];
    inUse = [];
    getCommand(numVertices, numIndices, stride) {
        let cmd;
        for (const c of this.pool) {
            if (c._positions.length >= numVertices * stride && c._indices.length >= numIndices) {
                cmd = c;
                break;
            }
        }
        if (!cmd) {
            const _positions = new Float32Array(numVertices * stride);
            const _uvs = new Float32Array(numVertices << 1);
            const _colors = new Uint32Array(numVertices);
            const _darkColors = new Uint32Array(numVertices);
            const _indices = new Uint16Array(numIndices);
            cmd = {
                positions: _positions,
                uvs: _uvs,
                colors: _colors,
                darkColors: _darkColors,
                indices: _indices,
                _positions,
                _uvs,
                _colors,
                _darkColors,
                _indices,
                numVertices,
                numIndices,
                blendMode: BlendMode.Normal,
                texture: null
            };
        }
        else {
            this.pool.splice(this.pool.indexOf(cmd), 1);
            cmd.next = undefined;
            cmd.numVertices = numVertices;
            cmd.numIndices = numIndices;
            cmd.positions = cmd._positions.subarray(0, numVertices * stride);
            cmd.uvs = cmd._uvs.subarray(0, numVertices << 1);
            cmd.colors = cmd._colors.subarray(0, numVertices);
            cmd.darkColors = cmd._darkColors.subarray(0, numVertices);
            cmd.indices = cmd._indices.subarray(0, numIndices);
        }
        this.inUse.push(cmd);
        return cmd;
    }
    reset() {
        this.pool.push(...this.inUse);
        this.inUse.length = 0;
    }
}
