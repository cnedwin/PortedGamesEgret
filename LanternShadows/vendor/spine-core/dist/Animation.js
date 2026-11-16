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
import { SequenceMode, SequenceModeValues } from "./attachments/Sequence.js";
import { Color, StringSet, Utils } from "./Utils.js";
/** Stores a list of timelines to animate a skeleton's pose over time.
 *
 * See <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine Runtimes
 * Guide. */
export class Animation {
    /** The animation's name, unique across all animations in the skeleton.
     *
     * See {@link SkeletonData.findAnimation}. */
    name;
    /** The duration of the animation in seconds, which is usually the highest time of all frames in the timelines. The duration is
     * used to know when the animation has completed and, for animations that repeat, when it should loop back to the start. */
    timelines = [];
    timelineIds;
    /** {@link Skeleton.getBones} indices that this animation's timelines modify.
     *
     * See {@link BoneTimeline.bones}. */
    bones;
    // Nonessential.
    /** The color of the animation as it was in Spine, or a default color if nonessential data was not exported. */
    color = new Color(1, 1, 1, 1);
    /** The duration of the animation in seconds, which is usually the highest time of all frames in the timeline. The duration is
     * used to know when it has completed and when it should loop back to the start. */
    duration;
    constructor(name, timelines, duration) {
        if (!name)
            throw new Error("name cannot be null.");
        this.name = name;
        this.duration = duration;
        this.timelineIds = new StringSet();
        this.bones = [];
        this.setTimelines(timelines);
    }
    setTimelines(timelines) {
        if (!timelines)
            throw new Error("timelines cannot be null.");
        this.timelines = timelines;
        const n = timelines.length;
        this.timelineIds.clear();
        this.bones.length = 0;
        const boneSet = new Set();
        const items = timelines;
        for (let i = 0; i < n; i++) {
            const timeline = items[i];
            this.timelineIds.addAll(timeline.propertyIds);
            if (isBoneTimeline(timeline) && boneSet.add(timeline.boneIndex))
                this.bones.push(timeline.boneIndex);
        }
    }
    /** Returns true if this animation contains a timeline with any of the specified property IDs.
     *
     * See {@link Timeline.propertyIds}. */
    hasTimeline(ids) {
        for (let i = 0; i < ids.length; i++)
            if (this.timelineIds.contains(ids[i]))
                return true;
        return false;
    }
    /** Applies the animation's timelines to the specified skeleton.
     *
     * See {@link Timeline.apply} and
     * <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine Runtimes
     * Guide.
     * @param skeleton The skeleton the animation is applied to. This provides access to the bones, slots, and other skeleton
     *           components the timelines may change.
     * @param lastTime The last time in seconds this animation was applied. Some timelines trigger only at discrete times, in which
     *           case all keys are triggered between `lastTime` (exclusive) and `time` (inclusive). Pass -1
     *           the first time an animation is applied to ensure frame 0 is triggered.
     * @param time The time in seconds the skeleton is being posed for. Timelines find the frame before and after this time and
     *           interpolate between the frame values.
     * @param loop True if `time` beyond the {@link duration} repeats the animation, else the last frame is used.
     * @param events If any events are fired, they are added to this list. Pass null to ignore fired events or if no timelines fire
     *           events.
     * @param alpha 0 applies setup or current values (depending on `from`), 1 uses timeline values, and intermediate
     *           values interpolate between them. Adjusting `alpha` over time can mix an animation in or out.
     * @param from Controls how `alpha` and `add` mix from current or setup pose values to timeline values.
     * @param add If true, for timelines that support it, their values are added to the setup or current values (depending on
     *           `from`).
     * @param out True when the animation is mixing out, else it is mixing in. Used by timelines that perform instant transitions.
     * @param appliedPose True to modify {@link Posed.appliedPose}, else {@link Posed.pose} is modified. */
    apply(skeleton, lastTime, time, loop, events, alpha, from, add, out, appliedPose) {
        if (!skeleton)
            throw new Error("skeleton cannot be null.");
        if (loop && this.duration !== 0) {
            time %= this.duration;
            if (lastTime > 0)
                lastTime %= this.duration;
        }
        const timelines = this.timelines;
        for (let i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose);
    }
}
/** Controls whether `alpha` and `add` mix from current or setup pose values and what happens before the
 * first key.
 *
 * See {@link Timeline.apply}. */
export var MixFrom;
(function (MixFrom) {
    /** Alpha mixes from the current pose. Before the first key, no change is made. */
    MixFrom[MixFrom["current"] = 0] = "current";
    /** Alpha mixes from the setup pose. Before the first key, the setup pose is used. */
    MixFrom[MixFrom["setup"] = 1] = "setup";
    /** Alpha mixes from the current pose. Before the first key, alpha mixes from the current pose to the setup pose. */
    MixFrom[MixFrom["first"] = 2] = "first";
})(MixFrom || (MixFrom = {}));
export var Property;
(function (Property) {
    Property[Property["rotate"] = 0] = "rotate";
    Property[Property["x"] = 1] = "x";
    Property[Property["y"] = 2] = "y";
    Property[Property["scaleX"] = 3] = "scaleX";
    Property[Property["scaleY"] = 4] = "scaleY";
    Property[Property["shearX"] = 5] = "shearX";
    Property[Property["shearY"] = 6] = "shearY";
    Property[Property["inherit"] = 7] = "inherit";
    Property[Property["rgb"] = 8] = "rgb";
    Property[Property["alpha"] = 9] = "alpha";
    Property[Property["rgb2"] = 10] = "rgb2";
    Property[Property["attachment"] = 11] = "attachment";
    Property[Property["deform"] = 12] = "deform";
    Property[Property["event"] = 13] = "event";
    Property[Property["drawOrder"] = 14] = "drawOrder";
    Property[Property["drawOrderFolder"] = 15] = "drawOrderFolder";
    Property[Property["ikConstraint"] = 16] = "ikConstraint";
    Property[Property["transformConstraint"] = 17] = "transformConstraint";
    Property[Property["pathConstraintPosition"] = 18] = "pathConstraintPosition";
    Property[Property["pathConstraintSpacing"] = 19] = "pathConstraintSpacing";
    Property[Property["pathConstraintMix"] = 20] = "pathConstraintMix";
    Property[Property["physicsConstraintInertia"] = 21] = "physicsConstraintInertia";
    Property[Property["physicsConstraintStrength"] = 22] = "physicsConstraintStrength";
    Property[Property["physicsConstraintDamping"] = 23] = "physicsConstraintDamping";
    Property[Property["physicsConstraintMass"] = 24] = "physicsConstraintMass";
    Property[Property["physicsConstraintWind"] = 25] = "physicsConstraintWind";
    Property[Property["physicsConstraintGravity"] = 26] = "physicsConstraintGravity";
    Property[Property["physicsConstraintMix"] = 27] = "physicsConstraintMix";
    Property[Property["physicsConstraintReset"] = 28] = "physicsConstraintReset";
    Property[Property["sequence"] = 29] = "sequence";
    Property[Property["sliderTime"] = 30] = "sliderTime";
    Property[Property["sliderMix"] = 31] = "sliderMix";
})(Property || (Property = {}));
/** The base class for all timelines.
 *
 * See <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine
 * Runtimes Guide. */
export class Timeline {
    propertyIds;
    frames;
    /** True if this timeline supports being applied additively.
     *
     * See the `add` parameter in {@link Timeline.apply}. */
    additive = false;
    /** True if this timeline sets values instantaneously and does not support interpolation between frames. */
    instant = false;
    constructor(frameCount, ...propertyIds) {
        this.propertyIds = propertyIds;
        this.frames = Utils.newFloatArray(frameCount * this.getFrameEntries());
    }
    getPropertyIds() {
        return this.propertyIds;
    }
    /** The number of values stored per frame. */
    getFrameEntries() {
        return 1;
    }
    /** The number of frames in this timeline. */
    getFrameCount() {
        return this.frames.length / this.getFrameEntries();
    }
    /** The duration of the timeline in seconds, which is usually the highest time of all frames in the timeline. */
    getDuration() {
        return this.frames[this.frames.length - this.getFrameEntries()];
    }
    /** Linear search using the specified stride (default 1).
     * @param time Must be >= the first value in `frames`.
     * @return The index of the first value <= `time`. */
    static search(frames, time, step = 1) {
        const n = frames.length;
        for (let i = step; i < n; i += step)
            if (frames[i] > time)
                return i - step;
        return n - step;
    }
}
export function isSlotTimeline(obj) {
    return typeof obj === 'object' && obj !== null && typeof obj.slotIndex === 'number';
}
/** The base class for timelines that interpolate between frame values using stepped, linear, or a Bezier curve. */
export class CurveTimeline extends Timeline {
    curves; // type, x, y, ...
    constructor(frameCount, bezierCount, ...propertyIds) {
        super(frameCount, ...propertyIds);
        this.curves = Utils.newFloatArray(frameCount + bezierCount * 18 /*BEZIER_SIZE*/);
        this.curves[frameCount - 1] = 1 /*STEPPED*/;
    }
    /** Sets the specified key frame to linear interpolation. */
    setLinear(frame) {
        this.curves[frame] = 0 /*LINEAR*/;
    }
    /** Sets the specified key frame to stepped interpolation. */
    setStepped(frame) {
        this.curves[frame] = 1 /*STEPPED*/;
    }
    /** Shrinks the storage for Bezier curves, for use when `bezierCount` (specified in the constructor) was larger
     * than the actual number of Bezier curves. */
    shrink(bezierCount) {
        const size = this.getFrameCount() + bezierCount * 18 /*BEZIER_SIZE*/;
        if (this.curves.length > size) {
            const newCurves = Utils.newFloatArray(size);
            Utils.arrayCopy(this.curves, 0, newCurves, 0, size);
            this.curves = newCurves;
        }
    }
    /** Stores the segments for the specified Bezier curve. For timelines that modify multiple values, there may be more than
     * one curve per frame.
     * @param bezier The ordinal of this Bezier curve for this timeline, between 0 and `bezierCount - 1` (specified
     *           in the constructor), inclusive.
     * @param frame Between 0 and `frameCount - 1`, inclusive.
     * @param value The index of the value for this frame that this curve is used for.
     * @param time1 The time for the first key.
     * @param value1 The value for the first key.
     * @param cx1 The time for the first Bezier handle.
     * @param cy1 The value for the first Bezier handle.
     * @param cx2 The time of the second Bezier handle.
     * @param cy2 The value for the second Bezier handle.
     * @param time2 The time for the second key.
     * @param value2 The value for the second key. */
    setBezier(bezier, frame, value, time1, value1, cx1, cy1, cx2, cy2, time2, value2) {
        const curves = this.curves;
        let i = this.getFrameCount() + bezier * 18 /*BEZIER_SIZE*/;
        if (value === 0)
            curves[frame] = 2 /*BEZIER*/ + i;
        const tmpx = (time1 - cx1 * 2 + cx2) * 0.03, tmpy = (value1 - cy1 * 2 + cy2) * 0.03;
        const dddx = ((cx1 - cx2) * 3 - time1 + time2) * 0.006, dddy = ((cy1 - cy2) * 3 - value1 + value2) * 0.006;
        let ddx = tmpx * 2 + dddx, ddy = tmpy * 2 + dddy;
        let dx = (cx1 - time1) * 0.3 + tmpx + dddx * 0.16666667, dy = (cy1 - value1) * 0.3 + tmpy + dddy * 0.16666667;
        let x = time1 + dx, y = value1 + dy;
        for (let n = i + 18 /*BEZIER_SIZE*/; i < n; i += 2) {
            curves[i] = x;
            curves[i + 1] = y;
            dx += ddx;
            dy += ddy;
            ddx += dddx;
            ddy += dddy;
            x += dx;
            y += dy;
        }
    }
    /** Returns the Bezier interpolated value for the specified time.
     * @param frameIndex The index into {@link frames} for the values of the frame before `time`.
     * @param valueOffset The offset from `frameIndex` to the value this curve is used for.
     * @param i The index of the Bezier segments. See {@link getCurveType}. */
    getBezierValue(time, frameIndex, valueOffset, i) {
        const curves = this.curves;
        if (curves[i] > time) {
            const x = this.frames[frameIndex], y = this.frames[frameIndex + valueOffset];
            return y + (time - x) / (curves[i] - x) * (curves[i + 1] - y);
        }
        const n = i + 18 /*BEZIER_SIZE*/;
        for (i += 2; i < n; i += 2) {
            if (curves[i] >= time) {
                const x = curves[i - 2], y = curves[i - 1];
                return y + (time - x) / (curves[i] - x) * (curves[i + 1] - y);
            }
        }
        frameIndex += this.getFrameEntries();
        const x = curves[n - 2], y = curves[n - 1];
        return y + (time - x) / (this.frames[frameIndex] - x) * (this.frames[frameIndex + valueOffset] - y);
    }
}
/** The base class for a {@link CurveTimeline} that sets one property with a curve. */
export class CurveTimeline1 extends CurveTimeline {
    constructor(frameCount, bezierCount, propertyId) {
        super(frameCount, bezierCount, propertyId);
    }
    getFrameEntries() {
        return 2 /*ENTRIES*/;
    }
    /** Sets the time and value for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, value) {
        frame <<= 1;
        this.frames[frame] = time;
        this.frames[frame + 1 /*VALUE*/] = value;
    }
    /** Returns the interpolated value for the specified time. */
    getCurveValue(time) {
        const frames = this.frames;
        let i = frames.length - 2;
        for (let ii = 2; ii <= i; ii += 2) {
            if (frames[ii] > time) {
                i = ii - 2;
                break;
            }
        }
        const curveType = this.curves[i >> 1];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i], value = frames[i + 1 /*VALUE*/];
                return value + (time - before) / (frames[i + 2 /*ENTRIES*/] - before) * (frames[i + 2 /*ENTRIES*/ + 1 /*VALUE*/] - value);
            }
            case 1 /*STEPPED*/:
                return frames[i + 1 /*VALUE*/];
        }
        return this.getBezierValue(time, i, 1 /*VALUE*/, curveType - 2 /*BEZIER*/);
    }
    /** Returns the interpolated value for properties relative to the setup value. The timeline value is added to the setup
     * value, rather than replacing it.
     *
     * See {@link Timeline.apply}.
     * @param current The current value for the property.
     * @param setup The setup value for the property. */
    getRelativeValue(time, alpha, from, add, current, setup) {
        if (time < this.frames[0])
            return CurveTimeline1.beforeFirstKey(from, alpha, current, setup);
        const value = this.getCurveValue(time);
        return from === MixFrom.setup ? setup + value * alpha : current + (add ? value : value + setup - current) * alpha;
    }
    getAbsoluteValue(time, alpha, from, add, current, setup, value) {
        if (value === undefined)
            return this.getAbsoluteValue1(time, alpha, from, add, current, setup);
        else
            return this.getAbsoluteValue2(time, alpha, from, add, current, setup, value);
    }
    getAbsoluteValue1(time, alpha, from, add, current, setup) {
        if (time < this.frames[0])
            return CurveTimeline1.beforeFirstKey(from, alpha, current, setup);
        const value = this.getCurveValue(time);
        return from === MixFrom.setup ? setup + (add ? value : value - setup) * alpha
            : current + (add ? value : value - current) * alpha;
    }
    getAbsoluteValue2(time, alpha, from, add, current, setup, value) {
        if (time < this.frames[0])
            return CurveTimeline1.beforeFirstKey(from, alpha, current, setup);
        return from === MixFrom.setup ? setup + (add ? value : value - setup) * alpha
            : current + (add ? value : value - current) * alpha;
    }
    /** Returns the interpolated value for scale properties. The timeline and setup values are multiplied and sign adjusted.
     *
     * See {@link Timeline.apply}.
     * @param current The current value for the property.
     * @param setup The setup value for the property. */
    getScaleValue(time, alpha, from, add, out, current, setup) {
        if (time < this.frames[0])
            return CurveTimeline1.beforeFirstKey(from, alpha, current, setup);
        const value = this.getCurveValue(time) * setup;
        if (alpha === 1 && !add)
            return value;
        let base = from === MixFrom.setup ? setup : current;
        if (add)
            return base + (value - setup) * alpha;
        if (out)
            return base + (Math.abs(value) * Math.sign(base) - base) * alpha;
        base = Math.abs(base) * Math.sign(value);
        return base + (value - base) * alpha;
    }
    static beforeFirstKey(from, alpha, current, setup) {
        switch (from) {
            case MixFrom.setup: return setup;
            case MixFrom.first: return current + (setup - current) * alpha;
            case MixFrom.current: return current;
        }
    }
}
export function isBoneTimeline(obj) {
    return typeof obj === 'object' && obj !== null && typeof obj.boneIndex === 'number';
}
/** The base class for timelines that change 1 bone property with a curve. */
export class BoneTimeline1 extends CurveTimeline1 {
    boneIndex;
    constructor(frameCount, bezierCount, boneIndex, property) {
        super(frameCount, bezierCount, `${property}|${boneIndex}`);
        this.boneIndex = boneIndex;
        this.additive = true;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const bone = skeleton.bones[this.boneIndex];
        if (bone.active)
            this.apply1(appliedPose ? bone.appliedPose : bone.pose, bone.data.setupPose, time, alpha, from, add, out);
    }
}
/** The base class for timelines that change two bone properties with a curve. */
export class BoneTimeline2 extends CurveTimeline {
    boneIndex;
    /** @param bezierCount The maximum number of Bezier curves. See {@link shrink}.
     * @param propertyIds Unique identifiers for the properties the timeline modifies. */
    constructor(frameCount, bezierCount, boneIndex, property1, property2) {
        super(frameCount, bezierCount, `${property1}|${boneIndex}`, `${property2}|${boneIndex}`);
        this.boneIndex = boneIndex;
        this.additive = true;
    }
    getFrameEntries() {
        return 3 /*ENTRIES*/;
    }
    /** Sets the time and values for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, value1, value2) {
        frame *= 3 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*VALUE1*/] = value1;
        this.frames[frame + 2 /*VALUE2*/] = value2;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const bone = skeleton.bones[this.boneIndex];
        if (bone.active)
            this.apply1(appliedPose ? bone.appliedPose : bone.pose, bone.data.setupPose, time, alpha, from, add, out);
    }
}
/** Changes {@link BonePose.rotation}. */
export class RotateTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.rotate);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.rotation = this.getRelativeValue(time, alpha, from, add, pose.rotation, setup.rotation);
    }
}
/** Changes {@link BonePose.x} and {@link BonePose.y}. */
export class TranslateTimeline extends BoneTimeline2 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.x, Property.y);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        const frames = this.frames;
        if (time < frames[0]) {
            switch (from) {
                case MixFrom.setup:
                    pose.x = setup.x;
                    pose.y = setup.y;
                    break;
                case MixFrom.first:
                    pose.x += (setup.x - pose.x) * alpha;
                    pose.y += (setup.y - pose.y) * alpha;
                    break;
            }
            return;
        }
        let x = 0, y = 0;
        const i = Timeline.search(frames, time, 3 /*ENTRIES*/);
        const curveType = this.curves[i / 3 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                const t = (time - before) / (frames[i + 3 /*ENTRIES*/] - before);
                x += (frames[i + 3 /*ENTRIES*/ + 1 /*VALUE1*/] - x) * t;
                y += (frames[i + 3 /*ENTRIES*/ + 2 /*VALUE2*/] - y) * t;
                break;
            }
            case 1 /*STEPPED*/:
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                break;
            default:
                x = this.getBezierValue(time, i, 1 /*VALUE1*/, curveType - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 2 /*VALUE2*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        if (from === MixFrom.setup) {
            pose.x = setup.x + x * alpha;
            pose.y = setup.y + y * alpha;
        }
        else if (add) {
            pose.x += x * alpha;
            pose.y += y * alpha;
        }
        else {
            pose.x += (setup.x + x - pose.x) * alpha;
            pose.y += (setup.y + y - pose.y) * alpha;
        }
    }
}
/** Changes {@link BonePose.x}. */
export class TranslateXTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.x);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.x = this.getRelativeValue(time, alpha, from, add, pose.x, setup.x);
    }
}
/** Changes {@link BonePose.y}. */
export class TranslateYTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.y);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.y = this.getRelativeValue(time, alpha, from, add, pose.y, setup.y);
    }
}
/** Changes {@link BonePose.scaleX} and {@link BonePose.scaleY}. */
export class ScaleTimeline extends BoneTimeline2 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.scaleX, Property.scaleY);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        const frames = this.frames;
        if (time < frames[0]) {
            switch (from) {
                case MixFrom.setup:
                    pose.scaleX = setup.scaleX;
                    pose.scaleY = setup.scaleY;
                    break;
                case MixFrom.first:
                    pose.scaleX += (setup.scaleX - pose.scaleX) * alpha;
                    pose.scaleY += (setup.scaleY - pose.scaleY) * alpha;
                    break;
            }
            return;
        }
        let x, y;
        const i = Timeline.search(frames, time, 3 /*ENTRIES*/);
        const curveType = this.curves[i / 3 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                const t = (time - before) / (frames[i + 3 /*ENTRIES*/] - before);
                x += (frames[i + 3 /*ENTRIES*/ + 1 /*VALUE1*/] - x) * t;
                y += (frames[i + 3 /*ENTRIES*/ + 2 /*VALUE2*/] - y) * t;
                break;
            }
            case 1 /*STEPPED*/:
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                break;
            default:
                x = this.getBezierValue(time, i, 1 /*VALUE1*/, curveType - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 2 /*VALUE2*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        x *= setup.scaleX;
        y *= setup.scaleY;
        if (alpha === 1 && !add) {
            pose.scaleX = x;
            pose.scaleY = y;
        }
        else {
            let bx = 0, by = 0;
            if (from === MixFrom.setup) {
                bx = setup.scaleX;
                by = setup.scaleY;
            }
            else {
                bx = pose.scaleX;
                by = pose.scaleY;
            }
            if (add) {
                pose.scaleX = bx + (x - setup.scaleX) * alpha;
                pose.scaleY = by + (y - setup.scaleY) * alpha;
            }
            else if (out) {
                pose.scaleX = bx + (Math.abs(x) * Math.sign(bx) - bx) * alpha;
                pose.scaleY = by + (Math.abs(y) * Math.sign(by) - by) * alpha;
            }
            else {
                bx = Math.abs(bx) * Math.sign(x);
                by = Math.abs(by) * Math.sign(y);
                pose.scaleX = bx + (x - bx) * alpha;
                pose.scaleY = by + (y - by) * alpha;
            }
        }
    }
}
/** Changes a {@link BonePose.scaleX}. */
export class ScaleXTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.scaleX);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.scaleX = this.getScaleValue(time, alpha, from, add, out, pose.scaleX, setup.scaleX);
    }
}
/** Changes a {@link BonePose.scaleY}. */
export class ScaleYTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.scaleY);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.scaleY = this.getScaleValue(time, alpha, from, add, out, pose.scaleY, setup.scaleY);
    }
}
/** Changes {@link Bone.shearX} and {@link Bone.shearY}. */
export class ShearTimeline extends BoneTimeline2 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.shearX, Property.shearY);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        const frames = this.frames;
        if (time < frames[0]) {
            switch (from) {
                case MixFrom.setup:
                    pose.shearX = setup.shearX;
                    pose.shearY = setup.shearY;
                    break;
                case MixFrom.first:
                    pose.shearX += (setup.shearX - pose.shearX) * alpha;
                    pose.shearY += (setup.shearY - pose.shearY) * alpha;
                    break;
            }
            return;
        }
        let x = 0, y = 0;
        const i = Timeline.search(frames, time, 3 /*ENTRIES*/);
        const curveType = this.curves[i / 3 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                const t = (time - before) / (frames[i + 3 /*ENTRIES*/] - before);
                x += (frames[i + 3 /*ENTRIES*/ + 1 /*VALUE1*/] - x) * t;
                y += (frames[i + 3 /*ENTRIES*/ + 2 /*VALUE2*/] - y) * t;
                break;
            }
            case 1 /*STEPPED*/:
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                break;
            default:
                x = this.getBezierValue(time, i, 1 /*VALUE1*/, curveType - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 2 /*VALUE2*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        if (from === MixFrom.setup) {
            pose.shearX = setup.shearX + x * alpha;
            pose.shearY = setup.shearY + y * alpha;
        }
        else if (add) {
            pose.shearX += x * alpha;
            pose.shearY += y * alpha;
        }
        else {
            pose.shearX += (setup.shearX + x - pose.shearX) * alpha;
            pose.shearY += (setup.shearY + y - pose.shearY) * alpha;
        }
    }
}
/** Changes {@link Bone.shearX} and {@link Bone.shearY}. */
export class ShearXTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.shearX);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.shearX = this.getRelativeValue(time, alpha, from, add, pose.shearX, setup.shearX);
    }
}
/** Changes {@link Bone.shearX} and {@link Bone.shearY}. */
export class ShearYTimeline extends BoneTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, boneIndex, Property.shearY);
    }
    apply1(pose, setup, time, alpha, from, add, out) {
        pose.shearY = this.getRelativeValue(time, alpha, from, add, pose.shearY, setup.shearY);
    }
}
/** Changes {@link BonePose.inherit}. */
export class InheritTimeline extends Timeline {
    boneIndex;
    constructor(frameCount, boneIndex) {
        super(frameCount, `${Property.inherit}|${boneIndex}`);
        this.boneIndex = boneIndex;
        this.instant = true;
    }
    getFrameEntries() {
        return 2 /*ENTRIES*/;
    }
    /** Sets the inherit transform mode for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, inherit) {
        frame *= 2 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*INHERIT*/] = inherit;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        const pose = appliedPose ? bone.appliedPose : bone.pose;
        if (out) {
            if (from !== MixFrom.current)
                pose.inherit = bone.data.setupPose.inherit;
        }
        else {
            const frames = this.frames;
            if (time < frames[0]) {
                if (from !== MixFrom.current)
                    pose.inherit = bone.data.setupPose.inherit;
            }
            else
                pose.inherit = this.frames[Timeline.search(frames, time, 2 /*ENTRIES*/) + 1 /*INHERIT*/];
        }
    }
}
/** The base class for timelines that change any number of slot properties with a curve. */
export class SlotCurveTimeline extends CurveTimeline {
    slotIndex;
    constructor(frameCount, bezierCount, slotIndex, ...propertyIds) {
        super(frameCount, bezierCount, ...propertyIds);
        this.slotIndex = slotIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const slot = skeleton.slots[this.slotIndex];
        if (slot.bone.active)
            this.apply1(slot, appliedPose ? slot.appliedPose : slot.pose, time, alpha, from, add);
    }
}
/** Changes {@link SlotPose.color}. */
export class RGBATimeline extends SlotCurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, slotIndex, //
        `${Property.rgb}|${slotIndex}`, //
        `${Property.alpha}|${slotIndex}`);
    }
    getFrameEntries() {
        return 5 /*ENTRIES*/;
    }
    /** Sets the time in seconds, red, green, blue, and alpha for the specified key frame. */
    setFrame(frame, time, r, g, b, a) {
        frame *= 5 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
        this.frames[frame + 4 /*A*/] = a;
    }
    apply1(slot, pose, time, alpha, from, add) {
        const color = pose.color;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = slot.data.setupPose.color;
            switch (from) {
                case MixFrom.setup:
                    color.setFromColor(setup);
                    break;
                case MixFrom.first:
                    color.add((setup.r - color.r) * alpha, (setup.g - color.g) * alpha, (setup.b - color.b) * alpha, (setup.a - color.a) * alpha);
                    break;
            }
            return;
        }
        let r = 0, g = 0, b = 0, a = 0;
        const i = Timeline.search(frames, time, 5 /*ENTRIES*/);
        const curveType = this.curves[i / 5 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                const t = (time - before) / (frames[i + 5 /*ENTRIES*/] - before);
                r += (frames[i + 5 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 5 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 5 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                a += (frames[i + 5 /*ENTRIES*/ + 4 /*A*/] - a) * t;
                break;
            }
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                a = this.getBezierValue(time, i, 4 /*A*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
        }
        if (alpha === 1)
            color.set(r, g, b, a);
        else {
            if (from === MixFrom.setup) {
                const setup = slot.data.setupPose.color;
                color.set(setup.r + (r - setup.r) * alpha, setup.g + (g - setup.g) * alpha, setup.b + (b - setup.b) * alpha, setup.a + (a - setup.a) * alpha);
            }
            else
                color.add((r - color.r) * alpha, (g - color.g) * alpha, (b - color.b) * alpha, (a - color.a) * alpha);
        }
    }
}
/** Changes RGB for a slot's {@link SlotPose.color}. */
export class RGBTimeline extends SlotCurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, slotIndex, `${Property.rgb}|${slotIndex}`);
    }
    getFrameEntries() {
        return 4 /*ENTRIES*/;
    }
    /** Sets the time in seconds, red, green, blue, and alpha for the specified key frame. */
    setFrame(frame, time, r, g, b) {
        frame <<= 2;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
    }
    apply1(slot, pose, time, alpha, from, add) {
        const color = pose.color;
        let r = 0, g = 0, b = 0;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = slot.data.setupPose.color;
            switch (from) {
                case MixFrom.setup: {
                    color.r = setup.r;
                    color.g = setup.g;
                    color.b = setup.b;
                    break;
                }
                case MixFrom.first: {
                    color.r += (setup.r - color.r) * alpha;
                    color.g += (setup.g - color.g) * alpha;
                    color.b += (setup.b - color.b) * alpha;
                    break;
                }
            }
            return;
        }
        const i = Timeline.search(frames, time, 4 /*ENTRIES*/);
        const curveType = this.curves[i >> 2];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                const t = (time - before) / (frames[i + 4 /*ENTRIES*/] - before);
                r += (frames[i + 4 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 4 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 4 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                break;
            }
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
        }
        if (alpha !== 1) {
            if (from === MixFrom.setup) {
                const setup = slot.data.setupPose.color;
                r = setup.r + (r - setup.r) * alpha;
                g = setup.g + (g - setup.g) * alpha;
                b = setup.b + (b - setup.b) * alpha;
            }
            else {
                r = color.r + (r - color.r) * alpha;
                g = color.g + (g - color.g) * alpha;
                b = color.b + (b - color.b) * alpha;
            }
        }
        color.r = r < 0 ? 0 : (r > 1 ? 1 : r);
        color.g = g < 0 ? 0 : (g > 1 ? 1 : g);
        color.b = b < 0 ? 0 : (b > 1 ? 1 : b);
    }
}
/** Changes alpha for a slot's {@link SlotPose.color}. */
export class AlphaTimeline extends CurveTimeline1 {
    slotIndex = 0;
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, `${Property.alpha}|${slotIndex}`);
        this.slotIndex = slotIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        const color = (appliedPose ? slot.appliedPose : slot.pose).color;
        let a = 0;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = slot.data.setupPose.color.a;
            switch (from) {
                case MixFrom.setup:
                    color.a = setup;
                    break;
                case MixFrom.first:
                    color.a += (setup - color.a) * alpha;
                    break;
            }
            return;
        }
        a = this.getCurveValue(time);
        if (alpha !== 1) {
            if (from === MixFrom.setup) {
                const setup = slot.data.setupPose.color;
                a = setup.a + (a - setup.a) * alpha;
            }
            else
                a = color.a + (a - color.a) * alpha;
        }
        color.a = a < 0 ? 0 : (a > 1 ? 1 : a);
    }
}
/** Changes {@link SlotPose.color} and {@link SlotPose.darkColor} for two color tinting. */
export class RGBA2Timeline extends SlotCurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, slotIndex, //
        `${Property.rgb}|${slotIndex}`, //
        `${Property.alpha}|${slotIndex}`, //
        `${Property.rgb2}|${slotIndex}`);
    }
    getFrameEntries() {
        return 8 /*ENTRIES*/;
    }
    /** Sets the time in seconds, light, and dark colors for the specified key frame. */
    setFrame(frame, time, r, g, b, a, r2, g2, b2) {
        frame <<= 3;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
        this.frames[frame + 4 /*A*/] = a;
        this.frames[frame + 5 /*R2*/] = r2;
        this.frames[frame + 6 /*G2*/] = g2;
        this.frames[frame + 7 /*B2*/] = b2;
    }
    apply1(slot, pose, time, alpha, from, add) {
        // biome-ignore lint/style/noNonNullAssertion: reference runtime
        const light = pose.color, dark = pose.darkColor;
        let r2 = 0, g2 = 0, b2 = 0;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = slot.data.setupPose;
            // biome-ignore lint/style/noNonNullAssertion: reference runtime
            const setupLight = setup.color, setupDark = setup.darkColor;
            switch (from) {
                case MixFrom.setup: {
                    light.setFromColor(setupLight);
                    dark.r = setupDark.r;
                    dark.g = setupDark.g;
                    dark.b = setupDark.b;
                    break;
                }
                case MixFrom.first: {
                    light.add((setupLight.r - light.r) * alpha, (setupLight.g - light.g) * alpha, (setupLight.b - light.b) * alpha, (setupLight.a - light.a) * alpha);
                    dark.r += (setupDark.r - dark.r) * alpha;
                    dark.g += (setupDark.g - dark.g) * alpha;
                    dark.b += (setupDark.b - dark.b) * alpha;
                    break;
                }
            }
            return;
        }
        let r = 0, g = 0, b = 0, a = 0;
        const i = Timeline.search(frames, time, 8 /*ENTRIES*/);
        const curveType = this.curves[i >> 3];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                r2 = frames[i + 5 /*R2*/];
                g2 = frames[i + 6 /*G2*/];
                b2 = frames[i + 7 /*B2*/];
                const t = (time - before) / (frames[i + 8 /*ENTRIES*/] - before);
                r += (frames[i + 8 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 8 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 8 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                a += (frames[i + 8 /*ENTRIES*/ + 4 /*A*/] - a) * t;
                r2 += (frames[i + 8 /*ENTRIES*/ + 5 /*R2*/] - r2) * t;
                g2 += (frames[i + 8 /*ENTRIES*/ + 6 /*G2*/] - g2) * t;
                b2 += (frames[i + 8 /*ENTRIES*/ + 7 /*B2*/] - b2) * t;
                break;
            }
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                r2 = frames[i + 5 /*R2*/];
                g2 = frames[i + 6 /*G2*/];
                b2 = frames[i + 7 /*B2*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                a = this.getBezierValue(time, i, 4 /*A*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
                r2 = this.getBezierValue(time, i, 5 /*R2*/, curveType + 18 /*BEZIER_SIZE*/ * 4 - 2 /*BEZIER*/);
                g2 = this.getBezierValue(time, i, 6 /*G2*/, curveType + 18 /*BEZIER_SIZE*/ * 5 - 2 /*BEZIER*/);
                b2 = this.getBezierValue(time, i, 7 /*B2*/, curveType + 18 /*BEZIER_SIZE*/ * 6 - 2 /*BEZIER*/);
        }
        if (alpha === 1)
            light.set(r, g, b, a);
        else if (from === MixFrom.setup) {
            const setupPose = slot.data.setupPose;
            let setup = setupPose.color;
            light.set(setup.r + (r - setup.r) * alpha, setup.g + (g - setup.g) * alpha, setup.b + (b - setup.b) * alpha, setup.a + (a - setup.a) * alpha);
            // biome-ignore lint/style/noNonNullAssertion: reference runtime
            setup = setupPose.darkColor;
            r2 = setup.r + (r2 - setup.r) * alpha;
            g2 = setup.g + (g2 - setup.g) * alpha;
            b2 = setup.b + (b2 - setup.b) * alpha;
        }
        else {
            light.add((r - light.r) * alpha, (g - light.g) * alpha, (b - light.b) * alpha, (a - light.a) * alpha);
            r2 = dark.r + (r2 - dark.r) * alpha;
            g2 = dark.g + (g2 - dark.g) * alpha;
            b2 = dark.b + (b2 - dark.b) * alpha;
        }
        dark.r = r2 < 0 ? 0 : (r2 > 1 ? 1 : r2);
        dark.g = g2 < 0 ? 0 : (g2 > 1 ? 1 : g2);
        dark.b = b2 < 0 ? 0 : (b2 > 1 ? 1 : b2);
    }
}
/** Changes {@link SlotPose.color} and {@link SlotPose.darkColor} for two color tinting. */
export class RGB2Timeline extends SlotCurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, slotIndex, //
        `${Property.rgb}|${slotIndex}`, //
        `${Property.rgb2}|${slotIndex}`);
    }
    getFrameEntries() {
        return 7 /*ENTRIES*/;
    }
    /** Sets the time in seconds, light, and dark colors for the specified key frame. */
    setFrame(frame, time, r, g, b, r2, g2, b2) {
        frame *= 7 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
        this.frames[frame + 4 /*R2*/] = r2;
        this.frames[frame + 5 /*G2*/] = g2;
        this.frames[frame + 6 /*B2*/] = b2;
    }
    apply1(slot, pose, time, alpha, from, add) {
        // biome-ignore lint/style/noNonNullAssertion: reference runtime
        const light = pose.color, dark = pose.darkColor;
        let r = 0, g = 0, b = 0, r2 = 0, g2 = 0, b2 = 0;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = slot.data.setupPose;
            // biome-ignore lint/style/noNonNullAssertion: reference runtime
            const setupLight = setup.color, setupDark = setup.darkColor;
            switch (from) {
                case MixFrom.setup:
                    light.r = setupLight.r;
                    light.g = setupLight.g;
                    light.b = setupLight.b;
                    dark.r = setupDark.r;
                    dark.g = setupDark.g;
                    dark.b = setupDark.b;
                    break;
                case MixFrom.first:
                    light.r += (setupLight.r - light.r) * alpha;
                    light.g += (setupLight.g - light.g) * alpha;
                    light.b += (setupLight.b - light.b) * alpha;
                    dark.r += (setupDark.r - dark.r) * alpha;
                    dark.g += (setupDark.g - dark.g) * alpha;
                    dark.b += (setupDark.b - dark.b) * alpha;
                    break;
            }
            return;
        }
        const i = Timeline.search(frames, time, 7 /*ENTRIES*/);
        const curveType = this.curves[i / 7 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                r2 = frames[i + 4 /*R2*/];
                g2 = frames[i + 5 /*G2*/];
                b2 = frames[i + 6 /*B2*/];
                const t = (time - before) / (frames[i + 7 /*ENTRIES*/] - before);
                r += (frames[i + 7 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 7 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 7 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                r2 += (frames[i + 7 /*ENTRIES*/ + 4 /*R2*/] - r2) * t;
                g2 += (frames[i + 7 /*ENTRIES*/ + 5 /*G2*/] - g2) * t;
                b2 += (frames[i + 7 /*ENTRIES*/ + 6 /*B2*/] - b2) * t;
                break;
            }
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                r2 = frames[i + 4 /*R2*/];
                g2 = frames[i + 5 /*G2*/];
                b2 = frames[i + 6 /*B2*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                r2 = this.getBezierValue(time, i, 4 /*R2*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
                g2 = this.getBezierValue(time, i, 5 /*G2*/, curveType + 18 /*BEZIER_SIZE*/ * 4 - 2 /*BEZIER*/);
                b2 = this.getBezierValue(time, i, 6 /*B2*/, curveType + 18 /*BEZIER_SIZE*/ * 5 - 2 /*BEZIER*/);
        }
        if (alpha !== 1) {
            if (from === MixFrom.setup) {
                const setupPose = slot.data.setupPose;
                let setup = setupPose.color;
                r = setup.r + (r - setup.r) * alpha;
                g = setup.g + (g - setup.g) * alpha;
                b = setup.b + (b - setup.b) * alpha;
                // biome-ignore lint/style/noNonNullAssertion: reference runtime
                setup = setupPose.darkColor;
                r2 = setup.r + (r2 - setup.r) * alpha;
                g2 = setup.g + (g2 - setup.g) * alpha;
                b2 = setup.b + (b2 - setup.b) * alpha;
            }
            else {
                r = light.r + (r - light.r) * alpha;
                g = light.g + (g - light.g) * alpha;
                b = light.b + (b - light.b) * alpha;
                r2 = dark.r + (r2 - dark.r) * alpha;
                g2 = dark.g + (g2 - dark.g) * alpha;
                b2 = dark.b + (b2 - dark.b) * alpha;
            }
        }
        light.r = r < 0 ? 0 : (r > 1 ? 1 : r);
        light.g = g < 0 ? 0 : (g > 1 ? 1 : g);
        light.b = b < 0 ? 0 : (b > 1 ? 1 : b);
        dark.r = r2 < 0 ? 0 : (r2 > 1 ? 1 : r2);
        dark.g = g2 < 0 ? 0 : (g2 > 1 ? 1 : g2);
        dark.b = b2 < 0 ? 0 : (b2 > 1 ? 1 : b2);
    }
}
/** Changes {@link SlotPose.ttachment}. */
export class AttachmentTimeline extends Timeline {
    slotIndex = 0;
    /** The attachment name for each key frame. May contain null values to clear the attachment. */
    attachmentNames;
    constructor(frameCount, slotIndex) {
        super(frameCount, `${Property.attachment}|${slotIndex}`);
        this.slotIndex = slotIndex;
        this.attachmentNames = new Array(frameCount);
        this.instant = true;
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the attachment name for the specified key frame. */
    setFrame(frame, time, attachmentName) {
        this.frames[frame] = time;
        this.attachmentNames[frame] = attachmentName;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        const pose = appliedPose ? slot.appliedPose : slot.pose;
        if (out || time < this.frames[0]) {
            if (from !== MixFrom.current)
                this.setAttachment(skeleton, pose, slot.data.attachmentName);
        }
        else
            this.setAttachment(skeleton, pose, this.attachmentNames[Timeline.search(this.frames, time)]);
    }
    setAttachment(skeleton, pose, attachmentName) {
        pose.setAttachment(!attachmentName ? null : skeleton.getAttachment(this.slotIndex, attachmentName));
    }
}
/** Changes {@link SlotPose.deform} to deform a {@link VertexAttachment}. */
export class DeformTimeline extends CurveTimeline {
    slotIndex;
    /** The attachment that will be deformed.
     *
     * See {@link VertexAttachment.getTimelineAttachment}. */
    attachment;
    /** The vertices for each key frame. */
    vertices;
    constructor(frameCount, bezierCount, slotIndex, attachment) {
        super(frameCount, bezierCount, `${Property.deform}|${slotIndex}|${attachment.id}`);
        this.slotIndex = slotIndex;
        this.attachment = attachment;
        this.vertices = new Array(frameCount);
        this.additive = true;
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time and vertices for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds.
     * @param vertices Vertex positions for an unweighted VertexAttachment, or deform offsets if it has weights. */
    setFrame(frame, time, vertices) {
        this.frames[frame] = time;
        this.vertices[frame] = vertices;
    }
    /** @param value1 Ignored (0 is used for a deform timeline).
     * @param value2 Ignored (1 is used for a deform timeline). */
    setBezier(bezier, frame, value, time1, value1, cx1, cy1, cx2, cy2, time2, value2) {
        const curves = this.curves;
        let i = this.getFrameCount() + bezier * 18 /*BEZIER_SIZE*/;
        if (value === 0)
            curves[frame] = 2 /*BEZIER*/ + i;
        const tmpx = (time1 - cx1 * 2 + cx2) * 0.03, tmpy = cy2 * 0.03 - cy1 * 0.06;
        const dddx = ((cx1 - cx2) * 3 - time1 + time2) * 0.006, dddy = (cy1 - cy2 + 0.33333333) * 0.018;
        let ddx = tmpx * 2 + dddx, ddy = tmpy * 2 + dddy;
        let dx = (cx1 - time1) * 0.3 + tmpx + dddx * 0.16666667, dy = cy1 * 0.3 + tmpy + dddy * 0.16666667;
        let x = time1 + dx, y = dy;
        for (let n = i + 18 /*BEZIER_SIZE*/; i < n; i += 2) {
            curves[i] = x;
            curves[i + 1] = y;
            dx += ddx;
            dy += ddy;
            ddx += dddx;
            ddy += dddy;
            x += dx;
            y += dy;
        }
    }
    getCurvePercent(time, frame) {
        const curves = this.curves;
        let i = curves[frame];
        switch (i) {
            case 0 /*LINEAR*/: {
                const x = this.frames[frame];
                return (time - x) / (this.frames[frame + this.getFrameEntries()] - x);
            }
            case 1 /*STEPPED*/:
                return 0;
        }
        i -= 2 /*BEZIER*/;
        if (curves[i] > time) {
            const x = this.frames[frame];
            return curves[i + 1] * (time - x) / (curves[i] - x);
        }
        const n = i + 18 /*BEZIER_SIZE*/;
        for (i += 2; i < n; i += 2) {
            if (curves[i] >= time) {
                const x = curves[i - 2], y = curves[i - 1];
                return y + (time - x) / (curves[i] - x) * (curves[i + 1] - y);
            }
        }
        const x = curves[n - 2], y = curves[n - 1];
        return y + (1 - y) * (time - x) / (this.frames[frame + this.getFrameEntries()] - x);
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const slots = skeleton.slots;
        if (!this.attachment.isTimelineActive(slots, this.slotIndex, appliedPose))
            return;
        const timelineSlots = this.attachment.timelineSlots;
        const frames = this.frames;
        if (time < frames[0]) {
            this.applyBeforeFirst(slots[this.slotIndex], appliedPose, alpha, from);
            for (const slotIndex of timelineSlots)
                this.applyBeforeFirst(slots[slotIndex], appliedPose, alpha, from);
            return;
        }
        let v1, v2;
        let percent;
        if (time >= frames[frames.length - 1]) {
            percent = 0;
            v1 = this.vertices[frames.length - 1];
            v2 = null;
        }
        else {
            const frame = Timeline.search(frames, time);
            percent = this.getCurvePercent(time, frame);
            v1 = this.vertices[frame];
            v2 = this.vertices[frame + 1];
        }
        const vertexCount = this.vertices[0].length;
        this.applyToSlot(slots[this.slotIndex], appliedPose, v1, v2, percent, vertexCount, alpha, from, add);
        for (const slotIndex of timelineSlots)
            this.applyToSlot(slots[slotIndex], appliedPose, v1, v2, percent, vertexCount, alpha, from, add);
    }
    applyBeforeFirst(slot, appliedPose, alpha, from) {
        if (!slot.bone.active)
            return;
        const pose = appliedPose ? slot.appliedPose : slot.pose;
        if (pose.attachment == null || pose.attachment.timelineAttachment !== this.attachment)
            return;
        const deformArray = pose.deform;
        if (deformArray.length === 0)
            from = MixFrom.setup;
        switch (from) {
            case MixFrom.setup:
                deformArray.length = 0;
                break;
            case MixFrom.first: {
                if (alpha === 1) {
                    deformArray.length = 0;
                    return;
                }
                const vertexCount = this.vertices[0].length;
                deformArray.length = vertexCount;
                const deform = deformArray;
                const vertexAttachment = pose.attachment;
                if (vertexAttachment.bones === null) {
                    const setupVertices = vertexAttachment.vertices;
                    for (let i = 0; i < vertexCount; i++)
                        deform[i] += (setupVertices[i] - deform[i]) * alpha;
                }
                else {
                    alpha = 1 - alpha;
                    for (let i = 0; i < vertexCount; i++)
                        deform[i] *= alpha;
                }
            }
        }
    }
    applyToSlot(slot, appliedPose, v1, v2, percent, vertexCount, alpha, from, add) {
        if (!slot.bone.active)
            return;
        const pose = appliedPose ? slot.appliedPose : slot.pose;
        if (pose.attachment === null || pose.attachment.timelineAttachment !== this.attachment)
            return;
        const vertexAttachment = pose.attachment;
        const deform = pose.deform;
        if (deform.length === 0)
            from = MixFrom.setup;
        const fromSetup = from === MixFrom.setup;
        deform.length = vertexCount;
        if (v2 === null) { // Time is after last frame.
            if (alpha === 1) {
                if (add && !fromSetup) {
                    if (!vertexAttachment.bones) { // Unweighted vertex positions, no alpha.
                        const setupVertices = vertexAttachment.vertices;
                        for (let i = 0; i < vertexCount; i++)
                            deform[i] += v1[i] - setupVertices[i];
                    }
                    else { // Weighted deform offsets, no alpha.
                        for (let i = 0; i < vertexCount; i++)
                            deform[i] += v1[i];
                    }
                }
                else // Vertex positions or deform offsets, no alpha.
                    Utils.arrayCopy(v1, 0, deform, 0, vertexCount);
            }
            else if (fromSetup) {
                if (!vertexAttachment.bones) { // Unweighted vertex positions, with alpha.
                    const setupVertices = vertexAttachment.vertices;
                    for (let i = 0; i < vertexCount; i++) {
                        const setup = setupVertices[i];
                        deform[i] = setup + (v1[i] - setup) * alpha;
                    }
                }
                else { // Weighted deform offsets, with alpha.
                    for (let i = 0; i < vertexCount; i++)
                        deform[i] = v1[i] * alpha;
                }
            }
            else if (add) {
                if (!vertexAttachment.bones) { // Unweighted vertex positions, no alpha.
                    const setupVertices = vertexAttachment.vertices;
                    for (let i = 0; i < vertexCount; i++)
                        deform[i] += (v1[i] - setupVertices[i]) * alpha;
                }
                else { // Weighted deform offsets, alpha.
                    for (let i = 0; i < vertexCount; i++)
                        deform[i] += v1[i] * alpha;
                }
            }
            else { // Vertex positions or deform offsets, with alpha.
                for (let i = 0; i < vertexCount; i++)
                    deform[i] += (v1[i] - deform[i]) * alpha;
            }
        }
        else { // Between frames.
            if (alpha === 1) {
                if (add && !fromSetup) {
                    if (!vertexAttachment.bones) { // Unweighted vertex positions, no alpha.
                        const setupVertices = vertexAttachment.vertices;
                        for (let i = 0; i < vertexCount; i++) {
                            const prev = v1[i];
                            deform[i] += prev + (v2[i] - prev) * percent - setupVertices[i];
                        }
                    }
                    else { // Weighted deform offsets, no alpha.
                        for (let i = 0; i < vertexCount; i++) {
                            const prev = v1[i];
                            deform[i] += prev + (v2[i] - prev) * percent;
                        }
                    }
                }
                else if (percent === 0)
                    Utils.arrayCopy(v1, 0, deform, 0, vertexCount);
                else { // Vertex positions or deform offsets, no alpha.
                    for (let i = 0; i < vertexCount; i++) {
                        const prev = v1[i];
                        deform[i] = prev + (v2[i] - prev) * percent;
                    }
                }
            }
            else if (fromSetup) {
                if (!vertexAttachment.bones) { // Unweighted vertex positions, with alpha.
                    const setupVertices = vertexAttachment.vertices;
                    for (let i = 0; i < vertexCount; i++) {
                        const prev = v1[i], setup = setupVertices[i];
                        deform[i] = setup + (prev + (v2[i] - prev) * percent - setup) * alpha;
                    }
                }
                else { // Weighted deform offsets, with alpha.
                    for (let i = 0; i < vertexCount; i++) {
                        const prev = v1[i];
                        deform[i] = (prev + (v2[i] - prev) * percent) * alpha;
                    }
                }
            }
            else if (add) {
                if (!vertexAttachment.bones) { // Unweighted vertex positions, with alpha.
                    const setupVertices = vertexAttachment.vertices;
                    for (let i = 0; i < vertexCount; i++) {
                        const prev = v1[i];
                        deform[i] += (prev + (v2[i] - prev) * percent - setupVertices[i]) * alpha;
                    }
                }
                else { // Weighted deform offsets, with alpha.
                    for (let i = 0; i < vertexCount; i++) {
                        const prev = v1[i];
                        deform[i] += (prev + (v2[i] - prev) * percent) * alpha;
                    }
                }
            }
            else {
                for (let i = 0; i < vertexCount; i++) {
                    const prev = v1[i];
                    deform[i] += (prev + (v2[i] - prev) * percent - deform[i]) * alpha;
                }
            }
        }
    }
}
/** Changes {@link Slot.getSequenceIndex} for an attachment's {@link Sequence}. */
export class SequenceTimeline extends Timeline {
    static ENTRIES = 3;
    static MODE = 1;
    static DELAY = 2;
    slotIndex;
    attachment;
    constructor(frameCount, slotIndex, attachment) {
        super(frameCount, `${Property.sequence}|${slotIndex}|${attachment.sequence.id}`);
        this.slotIndex = slotIndex;
        this.attachment = attachment;
        this.instant = true;
    }
    getFrameEntries() {
        return SequenceTimeline.ENTRIES;
    }
    getSlotIndex() {
        return this.slotIndex;
    }
    /** The attachment for which the {@link SlotPose.sequenceIndex} will be set.
     *
     * See {@link VertexAttachment.timelineAttachment}. */
    getAttachment() {
        return this.attachment;
    }
    /** Sets the time, mode, index, and frame time for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time Seconds between frames. */
    setFrame(frame, time, mode, index, delay) {
        const frames = this.frames;
        frame *= SequenceTimeline.ENTRIES;
        frames[frame] = time;
        frames[frame + SequenceTimeline.MODE] = mode | (index << 4);
        frames[frame + SequenceTimeline.DELAY] = delay;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const slots = skeleton.slots;
        if (!this.attachment.isTimelineActive(slots, this.slotIndex, appliedPose))
            return;
        const timelineSlots = this.attachment.timelineSlots;
        const frames = this.frames;
        if (out || time < frames[0]) {
            if (from !== MixFrom.current) {
                this.setupPose(slots[this.slotIndex], appliedPose);
                for (const slotIndex of timelineSlots)
                    this.setupPose(slots[slotIndex], appliedPose);
            }
            return;
        }
        const i = Timeline.search(frames, time, SequenceTimeline.ENTRIES);
        const before = frames[i];
        const modeAndIndex = frames[i + SequenceTimeline.MODE];
        const delay = frames[i + SequenceTimeline.DELAY];
        this.applyToSlot(slots[this.slotIndex], appliedPose, time, before, modeAndIndex, delay);
        for (const slotIndex of timelineSlots)
            this.applyToSlot(slots[slotIndex], appliedPose, time, before, modeAndIndex, delay);
    }
    setupPose(slot, appliedPose) {
        if (!slot.bone.active)
            return;
        const pose = appliedPose ? slot.appliedPose : slot.pose;
        if (pose.attachment === null || pose.attachment.timelineAttachment !== this.attachment)
            return;
        pose.sequenceIndex = -1;
    }
    applyToSlot(slot, appliedPose, time, before, modeAndIndex, delay) {
        if (!slot.bone.active)
            return;
        const pose = appliedPose ? slot.appliedPose : slot.pose;
        if (pose.attachment === null || pose.attachment.timelineAttachment !== this.attachment)
            return;
        let index = modeAndIndex >> 4, count = pose.attachment.sequence.regions.length;
        const mode = SequenceModeValues[modeAndIndex & 0xf];
        if (mode !== SequenceMode.hold) {
            index += (((time - before) / delay + 0.00001) | 0);
            switch (mode) {
                case SequenceMode.once:
                    index = Math.min(count - 1, index);
                    break;
                case SequenceMode.loop:
                    index %= count;
                    break;
                case SequenceMode.pingpong: {
                    const n = (count << 1) - 2;
                    index = n === 0 ? 0 : index % n;
                    if (index >= count)
                        index = n - index;
                    break;
                }
                case SequenceMode.onceReverse:
                    index = Math.max(count - 1 - index, 0);
                    break;
                case SequenceMode.loopReverse:
                    index = count - 1 - (index % count);
                    break;
                case SequenceMode.pingpongReverse: {
                    const n = (count << 1) - 2;
                    index = n === 0 ? 0 : (index + count - 1) % n;
                    if (index >= count)
                        index = n - index;
                }
            }
        }
        pose.sequenceIndex = index;
    }
}
/** Fires an {@link Event} when specific animation times are reached. */
export class EventTimeline extends Timeline {
    static propertyIds = [`${Property.event}`];
    /** The event for each key frame. */
    events;
    constructor(frameCount) {
        super(frameCount, ...EventTimeline.propertyIds);
        this.events = new Array(frameCount);
        this.instant = true;
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the event for the specified key frame. */
    setFrame(frame, event) {
        this.frames[frame] = event.time;
        this.events[frame] = event;
    }
    /** Fires events for frames > `lastTime` and <= `time`. */
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        if (!firedEvents)
            return;
        const frames = this.frames;
        const frameCount = this.frames.length;
        if (lastTime > time) { // Apply after lastTime for looped animations.
            // Reference runtime passes null for MixFrom here. This timeline doesn't use it, but TS keeps the type non-null.
            this.apply(null, lastTime, Number.MAX_VALUE, firedEvents, 0, from, false, false, false);
            lastTime = -1;
        }
        else if (lastTime >= frames[frameCount - 1]) // Last time is after last frame.
            return;
        if (time < frames[0])
            return;
        let i = 0;
        if (lastTime < frames[0])
            i = 0;
        else {
            i = Timeline.search(frames, lastTime) + 1;
            const frameTime = frames[i];
            while (i > 0) { // Fire multiple events with the same frame.
                if (frames[i - 1] !== frameTime)
                    break;
                i--;
            }
        }
        for (; i < frameCount && time >= frames[i]; i++)
            firedEvents.push(this.events[i]);
    }
}
/** Changes the {@link Skeleton.getDrawOrder}. */
export class DrawOrderTimeline extends Timeline {
    static propertyID = `${Property.drawOrder}`;
    static propertyIds = [DrawOrderTimeline.propertyID];
    /** The draw order for each key frame. See {@link setFrame}. */
    drawOrders;
    constructor(frameCount) {
        super(frameCount, ...DrawOrderTimeline.propertyIds);
        this.drawOrders = new Array(frameCount);
        this.instant = true;
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the draw order for the specified key frame.
     * @param drawOrder Ordered {@link Skeleton.slots} indices, or null to use setup pose
     *           draw order. */
    setFrame(frame, time, drawOrder) {
        this.frames[frame] = time;
        this.drawOrders[frame] = drawOrder;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const pose = (appliedPose ? skeleton.drawOrder.appliedPose : skeleton.drawOrder.pose);
        const setup = skeleton.slots;
        if (out || time < this.frames[0]) {
            if (from !== MixFrom.current)
                Utils.arrayCopy(setup, 0, pose, 0, skeleton.slots.length);
            return;
        }
        const order = this.drawOrders[Timeline.search(this.frames, time)];
        if (!order)
            Utils.arrayCopy(setup, 0, pose, 0, skeleton.slots.length);
        else {
            for (let i = 0, n = order.length; i < n; i++)
                pose[i] = setup[order[i]];
        }
    }
}
/** Changes a subset of the {@link Skeleton.getDrawOrder | draw order}. */
export class DrawOrderFolderTimeline extends Timeline {
    static propertyID = `${Property.drawOrderFolder}`;
    slots;
    inFolder;
    drawOrders;
    /** @param slots {@link Skeleton.slots} indices controlled by this timeline, in setup order.
     * @param slotCount The maximum number of slots in the skeleton. */
    constructor(frameCount, slots, slotCount) {
        super(frameCount, ...DrawOrderFolderTimeline.propertyIds(slots));
        this.slots = slots;
        this.drawOrders = new Array(frameCount);
        this.inFolder = new Array(slotCount);
        for (const i of slots)
            this.inFolder[i] = true;
        this.instant = true;
    }
    static propertyIds(slots) {
        const n = slots.length;
        const ids = new Array(n);
        for (let i = 0; i < n; i++)
            ids[i] = `${DrawOrderFolderTimeline.propertyID}|${slots[i]}`;
        return ids;
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** The {@link Skeleton.getSlots} indices that this timeline affects, in setup order. */
    getSlots() {
        return this.slots;
    }
    /** The draw order for each frame. See {@link setFrame}. */
    getDrawOrders() {
        return this.drawOrders;
    }
    /** Sets the time and draw order for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds.
     * @param drawOrder Ordered {@link getSlots} indices, or null to use setup pose order. */
    setFrame(frame, time, drawOrder) {
        this.frames[frame] = time;
        this.drawOrders[frame] = drawOrder;
    }
    apply(skeleton, lastTime, time, events, alpha, from, add, out, appliedPose) {
        const pose = (appliedPose ? skeleton.drawOrder.appliedPose : skeleton.drawOrder.pose);
        const setup = skeleton.slots;
        if (out || time < this.frames[0]) {
            if (from !== MixFrom.current)
                this.setup(pose, setup);
        }
        else {
            const order = this.drawOrders[Timeline.search(this.frames, time)];
            if (!order)
                this.setup(pose, setup);
            else {
                const inFolder = this.inFolder;
                const slots = this.slots;
                for (let i = 0, found = 0, done = slots.length;; i++) {
                    if (inFolder[pose[i].data.index]) {
                        pose[i] = setup[slots[order[found]]];
                        if (++found === done)
                            break;
                    }
                }
            }
        }
    }
    setup(pose, setup) {
        const { inFolder, slots } = this;
        for (let i = 0, found = 0, done = slots.length;; i++) {
            if (inFolder[pose[i].data.index]) {
                pose[i] = setup[slots[found]];
                if (++found === done)
                    break;
            }
        }
    }
}
export function isConstraintTimeline(obj) {
    return typeof obj === 'object' && obj !== null && typeof obj.constraintIndex === 'number';
}
/** Changes {@link IkConstraintPose.mix)}, {@link IkConstraintPose.softness},
 * {@link IkConstraintPose.bendDirection}, {@link IkConstraintPose.stretch}, and
 * {@link IkConstraintPose.compress}. */
export class IkConstraintTimeline extends CurveTimeline {
    constraintIndex = 0;
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, `${Property.ikConstraint}|${constraintIndex}`);
        this.constraintIndex = constraintIndex;
    }
    getFrameEntries() {
        return 6 /*ENTRIES*/;
    }
    /** Sets the time, mix, softness, bend direction, compress, and stretch for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds.
     * @param bendDirection 1 or -1. */
    setFrame(frame, time, mix, softness, bendDirection, compress, stretch) {
        frame *= 6 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*MIX*/] = mix;
        this.frames[frame + 2 /*SOFTNESS*/] = softness;
        this.frames[frame + 3 /*BEND_DIRECTION*/] = bendDirection;
        this.frames[frame + 4 /*COMPRESS*/] = compress ? 1 : 0;
        this.frames[frame + 5 /*STRETCH*/] = stretch ? 1 : 0;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (!constraint.active)
            return;
        const pose = appliedPose ? constraint.appliedPose : constraint.pose;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = constraint.data.setupPose;
            switch (from) {
                case MixFrom.setup: {
                    pose.mix = setup.mix;
                    pose.softness = setup.softness;
                    pose.bendDirection = setup.bendDirection;
                    pose.compress = setup.compress;
                    pose.stretch = setup.stretch;
                    break;
                }
                case MixFrom.first: {
                    pose.mix += (setup.mix - pose.mix) * alpha;
                    pose.softness += (setup.softness - pose.softness) * alpha;
                    pose.bendDirection = setup.bendDirection;
                    pose.compress = setup.compress;
                    pose.stretch = setup.stretch;
                    break;
                }
            }
            return;
        }
        let mix = 0, softness = 0;
        const i = Timeline.search(frames, time, 6 /*ENTRIES*/);
        const curveType = this.curves[i / 6 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                mix = frames[i + 1 /*MIX*/];
                softness = frames[i + 2 /*SOFTNESS*/];
                const t = (time - before) / (frames[i + 6 /*ENTRIES*/] - before);
                mix += (frames[i + 6 /*ENTRIES*/ + 1 /*MIX*/] - mix) * t;
                softness += (frames[i + 6 /*ENTRIES*/ + 2 /*SOFTNESS*/] - softness) * t;
                break;
            }
            case 1 /*STEPPED*/:
                mix = frames[i + 1 /*MIX*/];
                softness = frames[i + 2 /*SOFTNESS*/];
                break;
            default:
                mix = this.getBezierValue(time, i, 1 /*MIX*/, curveType - 2 /*BEZIER*/);
                softness = this.getBezierValue(time, i, 2 /*SOFTNESS*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        const base = from === MixFrom.setup ? constraint.data.setupPose : pose;
        pose.mix = base.mix + (mix - base.mix) * alpha;
        pose.softness = base.softness + (softness - base.softness) * alpha;
        if (out) {
            if (from === MixFrom.setup) {
                pose.bendDirection = base.bendDirection;
                pose.compress = base.compress;
                pose.stretch = base.stretch;
            }
        }
        else {
            pose.bendDirection = frames[i + 3 /*BEND_DIRECTION*/];
            pose.compress = frames[i + 4 /*COMPRESS*/] !== 0;
            pose.stretch = frames[i + 5 /*STRETCH*/] !== 0;
        }
    }
}
/** Changes {@link TransformConstraintPose.mixRotate}, {@link TransformConstraintPose.mixX},
 * {@link TransformConstraintPose.mixY}, {@link TransformConstraintPose.mixScaleX},
 * {@link TransformConstraintPose.mixScaleY}, and {@link TransformConstraintPose.mixShearY}. */
export class TransformConstraintTimeline extends CurveTimeline {
    /** The index of the transform constraint slot in {@link Skeleton.transformConstraints} that will be changed. */
    constraintIndex = 0;
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, `${Property.transformConstraint}|${constraintIndex}`);
        this.constraintIndex = constraintIndex;
        this.additive = true;
    }
    getFrameEntries() {
        return 7 /*ENTRIES*/;
    }
    /** Sets the time, rotate mix, translate mix, scale mix, and shear mix for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, mixRotate, mixX, mixY, mixScaleX, mixScaleY, mixShearY) {
        const frames = this.frames;
        frame *= 7 /*ENTRIES*/;
        frames[frame] = time;
        frames[frame + 1 /*ROTATE*/] = mixRotate;
        frames[frame + 2 /*X*/] = mixX;
        frames[frame + 3 /*Y*/] = mixY;
        frames[frame + 4 /*SCALEX*/] = mixScaleX;
        frames[frame + 5 /*SCALEY*/] = mixScaleY;
        frames[frame + 6 /*SHEARY*/] = mixShearY;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (!constraint.active)
            return;
        const pose = appliedPose ? constraint.appliedPose : constraint.pose;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = constraint.data.setupPose;
            switch (from) {
                case MixFrom.setup: {
                    pose.mixRotate = setup.mixRotate;
                    pose.mixX = setup.mixX;
                    pose.mixY = setup.mixY;
                    pose.mixScaleX = setup.mixScaleX;
                    pose.mixScaleY = setup.mixScaleY;
                    pose.mixShearY = setup.mixShearY;
                    break;
                }
                case MixFrom.first: {
                    pose.mixRotate += (setup.mixRotate - pose.mixRotate) * alpha;
                    pose.mixX += (setup.mixX - pose.mixX) * alpha;
                    pose.mixY += (setup.mixY - pose.mixY) * alpha;
                    pose.mixScaleX += (setup.mixScaleX - pose.mixScaleX) * alpha;
                    pose.mixScaleY += (setup.mixScaleY - pose.mixScaleY) * alpha;
                    pose.mixShearY += (setup.mixShearY - pose.mixShearY) * alpha;
                    break;
                }
            }
            return;
        }
        let rotate, x, y, scaleX, scaleY, shearY;
        const i = Timeline.search(frames, time, 7 /*ENTRIES*/);
        const curveType = this.curves[i / 7 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                scaleX = frames[i + 4 /*SCALEX*/];
                scaleY = frames[i + 5 /*SCALEY*/];
                shearY = frames[i + 6 /*SHEARY*/];
                const t = (time - before) / (frames[i + 7 /*ENTRIES*/] - before);
                rotate += (frames[i + 7 /*ENTRIES*/ + 1 /*ROTATE*/] - rotate) * t;
                x += (frames[i + 7 /*ENTRIES*/ + 2 /*X*/] - x) * t;
                y += (frames[i + 7 /*ENTRIES*/ + 3 /*Y*/] - y) * t;
                scaleX += (frames[i + 7 /*ENTRIES*/ + 4 /*SCALEX*/] - scaleX) * t;
                scaleY += (frames[i + 7 /*ENTRIES*/ + 5 /*SCALEY*/] - scaleY) * t;
                shearY += (frames[i + 7 /*ENTRIES*/ + 6 /*SHEARY*/] - shearY) * t;
                break;
            }
            case 1 /*STEPPED*/:
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                scaleX = frames[i + 4 /*SCALEX*/];
                scaleY = frames[i + 5 /*SCALEY*/];
                shearY = frames[i + 6 /*SHEARY*/];
                break;
            default:
                rotate = this.getBezierValue(time, i, 1 /*ROTATE*/, curveType - 2 /*BEZIER*/);
                x = this.getBezierValue(time, i, 2 /*X*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 3 /*Y*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                scaleX = this.getBezierValue(time, i, 4 /*SCALEX*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
                scaleY = this.getBezierValue(time, i, 5 /*SCALEY*/, curveType + 18 /*BEZIER_SIZE*/ * 4 - 2 /*BEZIER*/);
                shearY = this.getBezierValue(time, i, 6 /*SHEARY*/, curveType + 18 /*BEZIER_SIZE*/ * 5 - 2 /*BEZIER*/);
        }
        const base = from === MixFrom.setup ? constraint.data.setupPose : pose;
        if (add) {
            pose.mixRotate = base.mixRotate + rotate * alpha;
            pose.mixX = base.mixX + x * alpha;
            pose.mixY = base.mixY + y * alpha;
            pose.mixScaleX = base.mixScaleX + scaleX * alpha;
            pose.mixScaleY = base.mixScaleY + scaleY * alpha;
            pose.mixShearY = base.mixShearY + shearY * alpha;
        }
        else {
            pose.mixRotate = base.mixRotate + (rotate - base.mixRotate) * alpha;
            pose.mixX = base.mixX + (x - base.mixX) * alpha;
            pose.mixY = base.mixY + (y - base.mixY) * alpha;
            pose.mixScaleX = base.mixScaleX + (scaleX - base.mixScaleX) * alpha;
            pose.mixScaleY = base.mixScaleY + (scaleY - base.mixScaleY) * alpha;
            pose.mixShearY = base.mixShearY + (shearY - base.mixShearY) * alpha;
        }
    }
}
/** The base class for timelines that change 1 constraint property with a curve. */
export class ConstraintTimeline1 extends CurveTimeline1 {
    constraintIndex;
    constructor(frameCount, bezierCount, constraintIndex, property) {
        super(frameCount, bezierCount, `${property}|${constraintIndex}`);
        this.constraintIndex = constraintIndex;
    }
}
/** Changes {@link PathConstraintPose.position}. */
export class PathConstraintPositionTimeline extends ConstraintTimeline1 {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.pathConstraintPosition);
        this.additive = true;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (constraint.active) {
            const pose = appliedPose ? constraint.appliedPose : constraint.pose;
            pose.position = this.getAbsoluteValue(time, alpha, from, add, pose.position, constraint.data.setupPose.position);
        }
    }
}
/** Changes {@link PathConstraintPose.spacing}. */
export class PathConstraintSpacingTimeline extends ConstraintTimeline1 {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.pathConstraintSpacing);
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (constraint.active) {
            const pose = appliedPose ? constraint.appliedPose : constraint.pose;
            pose.spacing = this.getAbsoluteValue(time, alpha, from, false, pose.spacing, constraint.data.setupPose.spacing);
        }
    }
}
/** Changes {@link PathConstraint.mixRotate}, {@link PathConstraint.mixX}, and
 * {@link PathConstraint.mixY}. */
export class PathConstraintMixTimeline extends CurveTimeline {
    constraintIndex;
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, `${Property.pathConstraintMix}|${constraintIndex}`);
        this.constraintIndex = constraintIndex;
    }
    getFrameEntries() {
        return 4 /*ENTRIES*/;
    }
    /** Sets the time and color for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, mixRotate, mixX, mixY) {
        const frames = this.frames;
        frame <<= 2;
        frames[frame] = time;
        frames[frame + 1 /*ROTATE*/] = mixRotate;
        frames[frame + 2 /*X*/] = mixX;
        frames[frame + 3 /*Y*/] = mixY;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (!constraint.active)
            return;
        const pose = appliedPose ? constraint.appliedPose : constraint.pose;
        const frames = this.frames;
        if (time < frames[0]) {
            const setup = constraint.data.setupPose;
            switch (from) {
                case MixFrom.setup: {
                    pose.mixRotate = setup.mixRotate;
                    pose.mixX = setup.mixX;
                    pose.mixY = setup.mixY;
                    break;
                }
                case MixFrom.first: {
                    pose.mixRotate += (setup.mixRotate - pose.mixRotate) * alpha;
                    pose.mixX += (setup.mixX - pose.mixX) * alpha;
                    pose.mixY += (setup.mixY - pose.mixY) * alpha;
                    break;
                }
            }
            return;
        }
        let rotate, x, y;
        const i = Timeline.search(frames, time, 4 /*ENTRIES*/);
        const curveType = this.curves[i >> 2];
        switch (curveType) {
            case 0 /*LINEAR*/: {
                const before = frames[i];
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                const t = (time - before) / (frames[i + 4 /*ENTRIES*/] - before);
                rotate += (frames[i + 4 /*ENTRIES*/ + 1 /*ROTATE*/] - rotate) * t;
                x += (frames[i + 4 /*ENTRIES*/ + 2 /*X*/] - x) * t;
                y += (frames[i + 4 /*ENTRIES*/ + 3 /*Y*/] - y) * t;
                break;
            }
            case 1 /*STEPPED*/:
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                break;
            default:
                rotate = this.getBezierValue(time, i, 1 /*ROTATE*/, curveType - 2 /*BEZIER*/);
                x = this.getBezierValue(time, i, 2 /*X*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 3 /*Y*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
        }
        const base = from === MixFrom.setup ? constraint.data.setupPose : pose;
        if (add) {
            pose.mixRotate = base.mixRotate + rotate * alpha;
            pose.mixX = base.mixX + x * alpha;
            pose.mixY = base.mixY + y * alpha;
        }
        else {
            pose.mixRotate = base.mixRotate + (rotate - base.mixRotate) * alpha;
            pose.mixX = base.mixX + (x - base.mixX) * alpha;
            pose.mixY = base.mixY + (y - base.mixY) * alpha;
        }
    }
}
/** The base class for most {@link PhysicsConstraint} timelines. */
export class PhysicsConstraintTimeline extends ConstraintTimeline1 {
    /** @param constraintIndex -1 for all physics constraints in the skeleton. */
    constructor(frameCount, bezierCount, constraintIndex, property) {
        super(frameCount, bezierCount, constraintIndex, property);
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        if (add && !this.additive)
            add = false;
        if (this.constraintIndex === -1) {
            const value = time >= this.frames[0] ? this.getCurveValue(time) : 0;
            const constraints = skeleton.physics;
            for (const constraint of constraints) {
                if (constraint.active && this.global(constraint.data)) {
                    const pose = appliedPose ? constraint.appliedPose : constraint.pose;
                    this.set(pose, this.getAbsoluteValue(time, alpha, from, add, this.get(pose), this.get(constraint.data.setupPose), value));
                }
            }
        }
        else {
            const constraint = skeleton.constraints[this.constraintIndex];
            if (constraint.active) {
                const pose = appliedPose ? constraint.appliedPose : constraint.pose;
                this.set(pose, this.getAbsoluteValue(time, alpha, from, add, this.get(pose), this.get(constraint.data.setupPose)));
            }
        }
    }
}
/** Changes {@link PhysicsConstraintPose.inertia}. */
export class PhysicsConstraintInertiaTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintInertia);
    }
    get(pose) {
        return pose.inertia;
    }
    set(pose, value) {
        pose.inertia = value;
    }
    global(constraint) {
        return constraint.inertiaGlobal;
    }
}
/** Changes {@link PhysicsConstraintPose.strength}. */
export class PhysicsConstraintStrengthTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintStrength);
    }
    get(pose) {
        return pose.strength;
    }
    set(pose, value) {
        pose.strength = value;
    }
    global(constraint) {
        return constraint.strengthGlobal;
    }
}
/** Changes {@link PhysicsConstraintPose.damping}. */
export class PhysicsConstraintDampingTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintDamping);
    }
    get(pose) {
        return pose.damping;
    }
    set(pose, value) {
        pose.damping = value;
    }
    global(constraint) {
        return constraint.dampingGlobal;
    }
}
/** Changes {@link PhysicsConstraintPose.massInverse}. The timeline values are not inverted. */
export class PhysicsConstraintMassTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintMass);
    }
    get(pose) {
        return 1 / pose.massInverse;
    }
    set(pose, value) {
        pose.massInverse = 1 / value;
    }
    global(constraint) {
        return constraint.massGlobal;
    }
}
/** Changes {@link PhysicsConstraintPose.wind}. */
export class PhysicsConstraintWindTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintWind);
        this.additive = true;
    }
    get(pose) {
        return pose.wind;
    }
    set(pose, value) {
        pose.wind = value;
    }
    global(constraint) {
        return constraint.windGlobal;
    }
}
/** Changes {@link PhysicsConstraintPose.gravity}. */
export class PhysicsConstraintGravityTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintGravity);
        this.additive = true;
    }
    get(pose) {
        return pose.gravity;
    }
    set(pose, value) {
        pose.gravity = value;
    }
    global(constraint) {
        return constraint.gravityGlobal;
    }
}
/** Changes {@link PhysicsConstraintPose.mix}. */
export class PhysicsConstraintMixTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.physicsConstraintMix);
    }
    get(pose) {
        return pose.mix;
    }
    set(pose, value) {
        pose.mix = value;
    }
    global(constraint) {
        return constraint.mixGlobal;
    }
}
/** Resets a physics constraint when specific animation times are reached. */
export class PhysicsConstraintResetTimeline extends Timeline {
    static propertyIds = [Property.physicsConstraintReset.toString()];
    /** The index of the physics constraint in {@link Skeleton.contraints} that will be reset when this timeline is
    * applied, or -1 if all physics constraints in the skeleton will be reset. */
    constraintIndex;
    /** @param constraintIndex -1 for all physics constraints in the skeleton. */
    constructor(frameCount, constraintIndex) {
        super(frameCount, ...PhysicsConstraintResetTimeline.propertyIds);
        this.constraintIndex = constraintIndex;
        this.instant = true;
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive. */
    setFrame(frame, time) {
        this.frames[frame] = time;
    }
    /** Resets the physics constraint when frames > `lastTime` and <= `time`. */
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        let constraint;
        if (this.constraintIndex !== -1) {
            constraint = skeleton.constraints[this.constraintIndex];
            if (!constraint.active)
                return;
        }
        const frames = this.frames;
        if (lastTime > time) { // Apply after lastTime for looped animations.
            // Reference runtime passes null for MixFrom here. This timeline doesn't use it, but TS keeps the type non-null.
            this.apply(skeleton, lastTime, Number.MAX_VALUE, [], alpha, from, false, false, false);
            lastTime = -1;
        }
        else if (lastTime >= frames[frames.length - 1]) // Last time is after last frame.
            return;
        if (time < frames[0])
            return;
        if (lastTime < frames[0] || time >= frames[Timeline.search(frames, lastTime) + 1]) {
            if (constraint != null)
                constraint.reset(skeleton);
            else {
                for (const constraint of skeleton.physics) {
                    if (constraint.active)
                        constraint.reset(skeleton);
                }
            }
        }
    }
}
/** Changes {@link SliderPose.time}. */
export class SliderTimeline extends ConstraintTimeline1 {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.sliderTime);
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (constraint.active) {
            const pose = appliedPose ? constraint.appliedPose : constraint.pose;
            pose.time = this.getAbsoluteValue(time, alpha, from, add, pose.time, constraint.data.setupPose.time);
        }
    }
}
/** Changes {@link SliderPose.mix}. */
export class SliderMixTimeline extends ConstraintTimeline1 {
    constructor(frameCount, bezierCount, constraintIndex) {
        super(frameCount, bezierCount, constraintIndex, Property.sliderMix);
        this.additive = true;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, from, add, out, appliedPose) {
        const constraint = skeleton.constraints[this.constraintIndex];
        if (constraint.active) {
            const pose = appliedPose ? constraint.appliedPose : constraint.pose;
            pose.mix = this.getAbsoluteValue(time, alpha, from, add, pose.mix, constraint.data.setupPose.mix);
        }
    }
}
