// SPDX-License-Identifier: Apache-2.0
import { EgretError } from '@egret/runtime';
import { createAudioMixer } from '@egret/engine/audio';
const LIMITER = { threshold: -6, knee: 4, ratio: 12, attack: 0.003, release: 0.16 };
/** Shorter than a click can be heard, long enough that a step in volume makes none. */
const SMOOTH = 0.005;
/** Bound caller-owned strips separately from decoded/streamed voices. */
const MAX_INPUTS = 64;
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const gestures = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
const passive = Object.freeze({ capture: true, passive: true });
const at = (line, time) => time >= line.end
    ? line.to
    : time <= line.start
        ? line.from
        : line.from + ((line.to - line.from) * (time - line.start)) / (line.end - line.start);
/**
 * A Web Audio backend for a mixer the page makes itself with `createAudioMixer`:
 *
 *     const backend = createWebAudioBackend();
 *     const mixer = createAudioMixer({ backend, locked: backend.locked });
 *     backend.attach(mixer);
 *
 * `createBrowserAudio` does these three steps in one call.
 */
export function createWebAudioBackend(options = {}) {
    if (options === null || typeof options !== 'object' || Array.isArray(options))
        throw new EgretError('AUDIO_OPTIONS_INVALID');
    const { context: given, unlockTarget, pauseWhenHidden = true, onError, limiter: limit } = options;
    const Live = globalThis.AudioContext, page = globalThis.document;
    if ((given !== undefined && (given === null || typeof given !== 'object')) ||
        typeof pauseWhenHidden !== 'boolean' ||
        (onError !== undefined && typeof onError !== 'function') ||
        (unlockTarget !== undefined && (unlockTarget === null || typeof unlockTarget.addEventListener !== 'function')) ||
        (limit !== undefined && typeof limit !== 'boolean' && (limit === null || typeof limit !== 'object')))
        throw new EgretError('AUDIO_OPTIONS_INVALID');
    if (given === undefined && typeof Live !== 'function')
        throw new EgretError('AUDIO_HOST_UNAVAILABLE');
    const context = given ?? new Live();
    /** Only an output that runs in real time can be suspended, resumed and locked. */
    const live = typeof Live === 'function' && context instanceof Live ? context : undefined;
    const buffers = new WeakMap();
    // The limiter sits between the master volume and the speakers.
    let limiter;
    if (limit) {
        const settings = { ...LIMITER, ...(limit === true ? {} : limit) };
        for (const value of Object.values(settings))
            if (!Number.isFinite(value))
                throw new EgretError('AUDIO_OPTIONS_INVALID');
        limiter = context.createDynamicsCompressor();
        limiter.threshold.value = settings.threshold;
        limiter.knee.value = settings.knee;
        limiter.ratio.value = settings.ratio;
        limiter.attack.value = settings.attack;
        limiter.release.value = settings.release;
        limiter.connect(context.destination);
    }
    const nodes = new WeakMap();
    const namedInputs = new Map();
    const inputs = new Set();
    const streams = new WeakMap();
    /** The media elements that should be heard now. */
    const sounding = new Set();
    const pairs = [];
    const armed = [];
    let mixer;
    let closed = false, desired = true, output, silent;
    function report(cause) {
        if (onError !== undefined)
            onError(cause);
        else if (typeof globalThis.reportError === 'function')
            globalThis.reportError(cause);
    }
    function ramp(parameter, line, value, seconds) {
        const time = context.currentTime;
        // The first value of a gain is where it starts, not a movement.
        if (line === undefined) {
            parameter.value = value;
            return { from: value, to: value, start: time, end: time };
        }
        const from = at(line, time), end = time + Math.max(seconds, SMOOTH);
        parameter.cancelScheduledValues(time);
        parameter.setValueAtTime(from, time);
        parameter.linearRampToValueAtTime(value, end);
        return { from, to: value, start: time, end };
    }
    /** Continuous parameter automation for a strip, even when a new glide interrupts the old one. */
    function parameterControl(parameter, initial, valid, active) {
        parameter.value = initial;
        const time = context.currentTime;
        let line = { from: initial, to: initial, start: time, end: time };
        return (value, options) => {
            if (!valid(value) ||
                (options !== undefined && (options === null || typeof options !== 'object' || Array.isArray(options))))
                throw new EgretError('AUDIO_OPTIONS_INVALID');
            const constant = options?.timeConstant;
            if (constant !== undefined && !inRange(constant, Number.MIN_VALUE, 60))
                throw new EgretError('AUDIO_OPTIONS_INVALID');
            if (!active())
                return;
            const now = context.currentTime;
            const from = 'timeConstant' in line
                ? line.to + (line.from - line.to) * Math.exp(-Math.max(0, now - line.start) / line.timeConstant)
                : at(line, now);
            parameter.cancelScheduledValues(now);
            parameter.setValueAtTime(from, now);
            if (constant === undefined) {
                const end = now + SMOOTH;
                parameter.linearRampToValueAtTime(value, end);
                line = { from, to: value, start: now, end };
            }
            else {
                parameter.setTargetAtTime(value, now, constant);
                line = { from, to: value, start: now, timeConstant: constant };
            }
        };
    }
    function disconnectAll(stages) {
        const failures = [];
        for (const stage of stages)
            try {
                stage.disconnect();
            }
            catch (cause) {
                failures.push(cause);
            }
        return failures;
    }
    function createInput(name, inputOptions = {}) {
        if (closed)
            throw new EgretError('AUDIO_CLOSED');
        if (mixer === undefined)
            throw new EgretError('AUDIO_OPTIONS_INVALID');
        const bus = namedInputs.get(name);
        if (bus === undefined)
            throw new EgretError('AUDIO_BUS_UNKNOWN');
        if (inputOptions === null || typeof inputOptions !== 'object' || Array.isArray(inputOptions))
            throw new EgretError('AUDIO_OPTIONS_INVALID');
        const { volume = 1, duck = 1, pan, lowpass } = inputOptions;
        const isLevel = (value) => inRange(value, 0, 1);
        const isPan = (value) => inRange(value, -1, 1);
        const isCutoff = (value) => inRange(value, Number.MIN_VALUE, context.sampleRate / 2);
        if (!isLevel(volume) ||
            !isLevel(duck) ||
            (pan !== undefined && !isPan(pan)) ||
            (lowpass !== undefined && !isCutoff(lowpass)))
            throw new EgretError('AUDIO_OPTIONS_INVALID');
        if (inputs.size >= MAX_INPUTS)
            throw new EgretError('AUDIO_BUDGET');
        const stages = [];
        let disposed = false;
        const active = () => !disposed;
        const stage = (node) => {
            stages.push(node);
            return node;
        };
        try {
            const input = stage(context.createGain());
            const filter = lowpass === undefined ? undefined : stage(context.createBiquadFilter());
            if (filter !== undefined)
                filter.type = 'lowpass';
            const setLowpass = filter === undefined ? undefined : parameterControl(filter.frequency, lowpass, isCutoff, active);
            const gain = stage(context.createGain());
            const setVolume = parameterControl(gain.gain, volume, isLevel, active);
            // An older host can still render the input in the middle, precisely as a game without a panner does.
            const panner = pan === undefined || typeof context.createStereoPanner !== 'function'
                ? undefined
                : stage(context.createStereoPanner());
            const setPan = panner === undefined ? undefined : parameterControl(panner.pan, pan, isPan, active);
            const attenuation = stage(context.createGain());
            const setDuck = parameterControl(attenuation.gain, duck, isLevel, active);
            for (let i = 0; i < stages.length; i++)
                stages[i].connect(stages[i + 1] ?? bus.node);
            const face = Object.freeze({
                input,
                get disposed() {
                    return disposed;
                },
                setVolume,
                setDuck,
                ...(setPan === undefined ? {} : { setPan }),
                ...(setLowpass === undefined ? {} : { setLowpass }),
                dispose() {
                    if (disposed)
                        return;
                    disposed = true;
                    inputs.delete(face);
                    bus.inputs.delete(face);
                    const failed = disconnectAll(stages);
                    if (failed.length)
                        throw new EgretError('AUDIO_CLEANUP_FAILED', { cause: failed[0], cleanupErrors: failed.slice(1) });
                }
            });
            inputs.add(face);
            bus.inputs.add(face);
            return face;
        }
        catch (cause) {
            const failed = disconnectAll(stages);
            throw new EgretError('AUDIO_BACKEND_FAILED', { cause, cleanupErrors: failed });
        }
    }
    function listen(list, target, type, listener) {
        target.addEventListener(type, listener, passive);
        list.push({ target, type, listener });
    }
    function unlisten(list) {
        for (const pair of list.splice(0).reverse())
            try {
                pair.target.removeEventListener(pair.type, pair.listener, passive);
            }
            catch (cause) {
                report(cause);
            }
    }
    /** After the output or what is wanted of it changed: the lock of the mixer follows the output. */
    function settle() {
        if (closed || live === undefined)
            return;
        try {
            follow();
            if (live.state === 'running') {
                unlisten(armed);
                mixer?.setLocked(false);
                if (!desired)
                    live.suspend().catch(report);
            }
            else if (desired) {
                arm();
                mixer?.setLocked(true);
            }
        }
        catch (cause) {
            report(cause);
        }
    }
    /** An output that refused to start is waited for as a locked one is: the next touch asks again. */
    function refused(cause) {
        report(cause);
        settle();
    }
    /** A touch or a key is what lets a page sound. A silent sample started inside it is what some phones ask for. */
    const unlock = () => {
        if (closed || live === undefined)
            return;
        try {
            silent ??= live.createBuffer(1, 1, live.sampleRate);
            const source = live.createBufferSource();
            source.buffer = silent;
            source.connect(live.destination);
            source.start(0);
            // A media element is let play by the touch it is started in.
            if (desired)
                for (const element of sounding)
                    if (element.paused)
                        element.play().catch(held);
            live.resume().then(settle, refused);
        }
        catch (cause) {
            report(cause);
        }
    };
    function arm() {
        const target = unlockTarget ?? page;
        if (armed.length > 0 || target === undefined)
            return;
        for (const type of gestures)
            listen(armed, target, type, unlock);
    }
    /** The way of one voice from what makes its sound to its bus: its gain, and its two sides once it leaves the middle. */
    function makeStrip(input, bus, request) {
        const gain = context.createGain(), time = context.currentTime;
        let sides, line;
        if (request.fadeIn > 0) {
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(request.gain, time + request.fadeIn);
            line = { from: 0, to: request.gain, start: time, end: time + request.fadeIn };
        }
        else
            line = ramp(gain.gain, undefined, request.gain, 0);
        /**
         * A pan is a balance: towards one side the other side falls in a straight line, and the middle is the sound as it is.
         * A voice in the middle needs no nodes for it. They are put in the first time it leaves the middle.
         */
        function place(pan) {
            if (sides === undefined) {
                if (pan === 0)
                    return;
                const splitter = context.createChannelSplitter(2), merger = context.createChannelMerger(2), left = context.createGain(), right = context.createGain();
                // One channel is heard on both sides before the sides are told apart.
                gain.channelCount = 2;
                gain.channelCountMode = 'explicit';
                gain.channelInterpretation = 'speakers';
                gain.disconnect();
                gain.connect(splitter);
                splitter.connect(left, 0);
                splitter.connect(right, 1);
                left.connect(merger, 0, 0);
                right.connect(merger, 0, 1);
                merger.connect(bus);
                sides = { left, right, nodes: [splitter, left, right, merger] };
            }
            sides.left.gain.value = 1 - Math.max(0, pan);
            sides.right.gain.value = 1 + Math.min(0, pan);
        }
        input.connect(gain);
        gain.connect(bus);
        place(request.pan);
        return {
            gain,
            setGain(value, seconds) {
                line = ramp(gain.gain, line, value, seconds);
            },
            setPan: place,
            release() {
                for (const node of [gain, ...(sides?.nodes ?? [])])
                    node.disconnect();
            }
        };
    }
    /** What a media element was refused: without a touch it waits for one; a pause that overtook it is nothing. */
    function held(cause) {
        const name = cause?.name;
        if (name === 'NotAllowedError')
            arm();
        else if (name !== 'AbortError')
            report(cause);
    }
    /** A media element keeps its own time. It is made to play while the output runs and to wait while it does not. */
    function follow() {
        const run = desired && (live === undefined || live.state === 'running');
        for (const element of sounding) {
            if (run && element.paused)
                element.play().catch(held);
            else if (!run && !element.paused)
                element.pause();
        }
    }
    function startStream(stream, bus, request, ended) {
        const { element, node } = stream, strip = makeStrip(node, bus, request);
        let over = false, timer;
        function finish() {
            if (over)
                return;
            over = true;
            sounding.delete(element);
            try {
                element.removeEventListener('ended', finish);
                element.pause();
                if (timer !== undefined) {
                    timer.onended = null;
                    timer.stop();
                    timer.disconnect();
                }
                node.disconnect(strip.gain);
                strip.release();
            }
            catch (cause) {
                report(cause);
            }
            ended();
        }
        element.loop = request.loop;
        element.playbackRate = request.rate;
        // A rate is speed and pitch together, as it is for a decoded sound.
        if ('preservesPitch' in element)
            element.preservesPitch = false;
        if (element.currentTime !== request.offset)
            element.currentTime = request.offset;
        element.addEventListener('ended', finish);
        sounding.add(element);
        follow();
        return {
            setGain: strip.setGain,
            setRate(value) {
                element.playbackRate = value;
            },
            setPan: strip.setPan,
            stop(seconds) {
                if (over)
                    return;
                if (seconds <= 0) {
                    finish();
                    return;
                }
                // The end of a fade is a time on the clock of the output: a silent source that stops then tells it.
                silent ??= context.createBuffer(1, 1, context.sampleRate);
                timer = context.createBufferSource();
                timer.buffer = silent;
                timer.loop = true;
                timer.connect(context.destination);
                timer.onended = finish;
                timer.start(0);
                timer.stop(context.currentTime + seconds);
            },
            position: () => element.currentTime
        };
    }
    const backend = {
        context,
        get output() {
            return output;
        },
        get locked() {
            return live !== undefined && live.state !== 'running';
        },
        attach(made) {
            if (mixer !== undefined || made === null || typeof made !== 'object')
                throw new EgretError('AUDIO_OPTIONS_INVALID');
            mixer = made;
            if (live === undefined)
                return;
            listen(pairs, live, 'statechange', settle);
            if (pauseWhenHidden && page !== undefined) {
                const visibility = () => {
                    try {
                        if (page.visibilityState === 'hidden')
                            made.suspend('hidden');
                        else
                            made.resume('hidden');
                    }
                    catch (cause) {
                        report(cause);
                    }
                };
                listen(pairs, page, 'visibilitychange', visibility);
                if (page.visibilityState === 'hidden')
                    made.suspend('hidden');
            }
            if (live.state !== 'running')
                arm();
        },
        createInput,
        get time() {
            return context.currentTime;
        },
        async decode(bytes) {
            // Decoding takes the buffer it is given away from its owner: it is given a copy.
            const copy = bytes.slice().buffer;
            const buffer = await new Promise((resolve, reject) => {
                const result = context.decodeAudioData(copy, resolve, reject);
                if (result !== undefined && typeof result.then === 'function')
                    result.then(resolve, reject);
            });
            const sound = {
                duration: buffer.duration,
                channels: buffer.numberOfChannels,
                sampleRate: buffer.sampleRate,
                release() {
                    buffers.delete(sound);
                }
            };
            buffers.set(sound, buffer);
            return sound;
        },
        async openStream(url) {
            const Element = globalThis.Audio;
            if (typeof Element !== 'function' || live === undefined)
                throw new EgretError('AUDIO_HOST_UNAVAILABLE');
            const element = new Element();
            element.preload = 'auto';
            // A file of another origin is asked for in the way that lets its samples into the graph, or not at all.
            element.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                const done = () => {
                    element.removeEventListener('loadedmetadata', loaded);
                    element.removeEventListener('error', failed);
                };
                const loaded = () => {
                    done();
                    resolve();
                };
                const failed = () => {
                    done();
                    reject(element.error ?? new EgretError('AUDIO_STREAM_FAILED'));
                };
                element.addEventListener('loadedmetadata', loaded);
                element.addEventListener('error', failed);
                element.src = url;
            });
            const node = live.createMediaElementSource(element);
            const sound = {
                duration: element.duration,
                channels: node.channelCount,
                sampleRate: live.sampleRate,
                streamed: true,
                release() {
                    streams.delete(sound);
                    sounding.delete(element);
                    element.pause();
                    element.removeAttribute('src');
                    element.load();
                    node.disconnect();
                }
            };
            streams.set(sound, { element, node });
            return sound;
        },
        createBus(parent, name) {
            if (name !== undefined && namedInputs.has(name))
                throw new EgretError('AUDIO_OPTIONS_INVALID');
            const node = context.createGain(), target = parent === undefined ? (limiter ?? context.destination) : nodes.get(parent);
            if (target === undefined)
                throw new EgretError('AUDIO_BACKEND_FAILED');
            node.connect(target);
            output ??= node;
            let line;
            const bus = {
                setGain(value, seconds) {
                    line = ramp(node.gain, line, value, seconds);
                },
                release() {
                    nodes.delete(bus);
                    const failures = [];
                    if (name !== undefined) {
                        const entry = namedInputs.get(name);
                        if (entry?.node === node) {
                            namedInputs.delete(name);
                            for (const input of [...entry.inputs])
                                try {
                                    input.dispose();
                                }
                                catch (cause) {
                                    failures.push(cause);
                                }
                        }
                    }
                    failures.push(...disconnectAll([node]));
                    if (failures.length)
                        throw new EgretError('AUDIO_CLEANUP_FAILED', { cause: failures[0], cleanupErrors: failures.slice(1) });
                }
            };
            nodes.set(bus, node);
            if (name !== undefined)
                namedInputs.set(name, { node, inputs: new Set() });
            return bus;
        },
        start(request, ended) {
            const bus = nodes.get(request.bus), stream = streams.get(request.sound);
            if (bus === undefined)
                throw new EgretError('AUDIO_BACKEND_FAILED');
            if (stream !== undefined)
                return startStream(stream, bus, request, ended);
            const buffer = buffers.get(request.sound);
            if (buffer === undefined)
                throw new EgretError('AUDIO_BACKEND_FAILED');
            const source = context.createBufferSource(), strip = makeStrip(source, bus, request);
            let over = false;
            source.buffer = buffer;
            source.loop = request.loop;
            source.playbackRate.value = request.rate;
            source.onended = () => {
                if (over)
                    return;
                over = true;
                source.onended = null;
                try {
                    source.disconnect();
                    strip.release();
                }
                catch (cause) {
                    report(cause);
                }
                ended();
            };
            source.start(0, request.offset);
            return {
                setGain: strip.setGain,
                setRate(value) {
                    source.playbackRate.value = value;
                },
                setPan: strip.setPan,
                stop(seconds) {
                    if (over)
                        return;
                    source.stop(seconds > 0 ? context.currentTime + seconds : 0);
                }
            };
        },
        suspend() {
            desired = false;
            follow();
            if (live !== undefined && live.state === 'running')
                live.suspend().catch(report);
        },
        resume() {
            desired = true;
            follow();
            // Asked even of an output that still runs: a suspension on its way would otherwise be the last word.
            if (live !== undefined)
                live.resume().then(settle, refused);
        },
        close() {
            if (closed)
                return;
            closed = true;
            // The standalone backend can be closed too, not only through the mixer that owns its buses.
            for (const input of [...inputs])
                try {
                    input.dispose();
                }
                catch (cause) {
                    report(cause);
                }
            namedInputs.clear();
            unlisten(armed);
            unlisten(pairs);
            limiter?.disconnect();
            if (live !== undefined && given === undefined)
                live.close().catch(report);
        }
    };
    return backend;
}
/**
 * Sound for a page on Web Audio. A page may not sound before the person has touched it: until
 * then the mixer is locked, music asked for waits, and the first touch or key lets it start.
 */
export function createBrowserAudio(options = {}) {
    if (options === null || typeof options !== 'object' || Array.isArray(options))
        throw new EgretError('AUDIO_OPTIONS_INVALID');
    const { context: _context, unlockTarget: _target, pauseWhenHidden: _hidden, onError: _error, limiter: _limiter, ...configuration } = options;
    // The backend reads its own options and no others.
    const backend = createWebAudioBackend(options);
    let mixer;
    try {
        mixer = createAudioMixer({ ...configuration, backend, locked: backend.locked });
    }
    catch (cause) {
        backend.close();
        throw cause;
    }
    try {
        backend.attach(mixer);
    }
    catch (cause) {
        try {
            mixer.dispose();
        }
        catch {
            /* the first failure is the one told */
        }
        throw cause;
    }
    return Object.freeze({
        mixer,
        context: backend.context,
        output: backend.output,
        createInput: backend.createInput,
        dispose() {
            mixer.dispose();
        }
    });
}
