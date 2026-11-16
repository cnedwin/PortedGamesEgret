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
import { BonePose } from "./BonePose.js";
import { PosedData } from "./PosedData.js";
import { Color } from "./Utils.js";
/** The setup pose for a bone. */
export class BoneData extends PosedData {
    /** The index of the bone in {@link Skeleton.bones}. */
    index = 0;
    /** The parent bone, or null if this bone is the root. */
    parent = null;
    /** The bone's length. */
    length = 0;
    // Nonessential.
    /** The color of the bone as it was in Spine. Available only when nonessential data was exported. Bones are not usually
     * rendered at runtime. */
    color = new Color();
    /** The bone icon name as it was in Spine, or null if nonessential data was not exported. */
    icon;
    /** The bone icon's display size scale, or 1 if nonessential data was not exported. */
    iconSize = 1;
    /** The bone icon's display rotation in degrees, or 0 if nonessential data was not exported. */
    iconRotation = 0;
    /** False if the bone was hidden in Spine and nonessential data was exported. Does not affect runtime rendering. */
    visible = false;
    constructor(index, name, parent) {
        super(name, new BonePose());
        if (index < 0)
            throw new Error("index must be >= 0.");
        if (!name)
            throw new Error("name cannot be null.");
        this.index = index;
        this.parent = parent;
    }
    copy(parent) {
        const copy = new BoneData(this.index, this.name, parent);
        copy.length = this.length;
        copy.setupPose.set(this.setupPose);
        return copy;
    }
}
/** Determines how a bone inherits world transforms from parent bones. */
export var Inherit;
(function (Inherit) {
    Inherit[Inherit["Normal"] = 0] = "Normal";
    Inherit[Inherit["OnlyTranslation"] = 1] = "OnlyTranslation";
    Inherit[Inherit["NoRotationOrReflection"] = 2] = "NoRotationOrReflection";
    Inherit[Inherit["NoScale"] = 3] = "NoScale";
    Inherit[Inherit["NoScaleOrReflection"] = 4] = "NoScaleOrReflection";
})(Inherit || (Inherit = {}));
