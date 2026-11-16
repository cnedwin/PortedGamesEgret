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
/** The base class for an object with a number of poses:
 * - {@link data}: The setup pose.
 * - {@link pose}: The unconstrained pose. Set by animations and application code.
 * - {@link appliedPose}: The pose to use for rendering. Possibly modified by constraints.
 */
export class Posed {
    /** The constraint's setup pose data. */
    data;
    pose;
    constrainedPose;
    appliedPose;
    constructor(data, pose, constrainedPose) {
        if (data == null)
            throw new Error("data cannot be null.");
        this.data = data;
        this.pose = pose;
        this.constrainedPose = constrainedPose;
        this.appliedPose = pose;
    }
    /** Sets the unconstrained pose to the setup pose. */
    setupPose() {
        this.pose.set(this.data.setupPose);
    }
    /** The setup pose data. May be shared with multiple instances. */
    getData() {
        return this.data;
    }
    /** The unconstrained pose for this object, set by animations and application code. */
    getPose() {
        return this.pose;
    }
    /** The pose to use for rendering. If no constraints modify this pose, this is the same as {@link pose}. Otherwise it is a
     * copy of {@link pose} modified by constraints. */
    getAppliedPose() {
        return this.appliedPose;
    }
    /** Sets the applied pose to the unconstrained pose, for when no constraints will modify the pose. */
    unconstrained() {
        this.appliedPose = this.pose;
    }
    /** Sets the applied pose to the constrained pose, in anticipation of the applied pose being modified by constraints. */
    constrained() {
        this.appliedPose = this.constrainedPose;
    }
    /** Sets the constrained pose to the unconstrained pose, as a starting point for constraints to be applied. */
    resetConstrained() {
        this.constrainedPose.set(this.pose);
    }
}
