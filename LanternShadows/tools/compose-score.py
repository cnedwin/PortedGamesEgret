"""Lantern Shadows' original three-act score, rendered without external samples.

Run python tools/compose-score.py OUTPUT_DIR --ffmpeg ffmpeg with NumPy and
FFmpeg 7.1/libmp3lame. Omit --ffmpeg to keep only the stereo WAV masters.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import wave

import numpy as np


SR = 44100
TAU = 2 * np.pi
PITCH = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)
# Voicings keep the body in the midrange so the arrangement also reads on a phone.
CHORD = {
    "Dm": "D3 A3 F4 A4", "Gm": "G2 D3 Bb3 G4", "Bb": "Bb2 F3 D4 Bb4",
    "F": "F3 C4 A4 C5", "C": "C3 G3 E4 G4", "Asus": "A2 E3 B3 D4",
    "Dopen": "D3 A3 D4 A4", "Eb": "Eb3 Bb3 G4 Bb4",
    "G": "G3 D4 B4 D5", "Em": "E3 B3 G4 B4", "Am": "A2 E3 C4 E4",
    "Dsus": "D3 A3 G4 E4", "C/G": "G2 C4 G4 E5",
}


def midi(note):
    letter, accidental, octave = re.fullmatch(r"([A-G])([#b]?)(-?\d+)", note).groups()
    return (int(octave) + 1) * 12 + PITCH[letter] + (accidental == "#") - (accidental == "b")


def timeline(seconds):
    return np.arange(round(seconds * SR), dtype=np.float64) / SR


def colored_noise(rng, size, width):
    return np.convolve(rng.normal(0, 1, size), np.ones(width) / math.sqrt(width), mode="same")


def finish(voice, t, decay=.06):
    return voice * np.clip((t[-1] - t) / decay, 0, 1)


def pluck(f, duration, rng, kind):
    """A plucked string observed through its fixed soundboard and finger noise."""
    t = timeline(duration + .55)
    bright = kind == "zither"
    low = kind == "bass"
    where = rng.uniform(.18, .26) if bright else rng.uniform(.23, .32)
    f *= 2 ** (rng.uniform(-.037, .048) / 12)
    phase = TAU * f * (t + .00025 * (1 - np.exp(-t * 36)))
    tail = np.exp(-np.maximum(t - duration, 0) / (.20 if bright else .15))
    tone = np.zeros_like(t)
    for h in range(1, min(16, math.floor(7600 / f))):
        hz = h * f
        stiffness = 1 + (.000027 if low else .00014 if bright else .00007) * h * h
        amp = np.sin(np.pi * h * where) / h ** (1.14 if bright else 1.36)
        body = 1 + .42 * np.exp(-((hz - 290) / 160) ** 2) + .27 * np.exp(-((hz - 770) / 430) ** 2)
        damping = (1.24 if bright else 1.84) + (h - 1) ** .84 * (.88 if bright else 1.01)
        tone += body * amp * np.sin(phase * h * stiffness + rng.uniform(-.42, .42)) * np.exp(-t * damping)
    if bright:
        # Neighbor strings sing lightly after the strike.
        tone += .075 * np.sin(phase * 1.997 + .8) * np.exp(-t * 1.62) * (1 - np.exp(-t * 19))
    elif low:
        tone += .13 * np.sin(phase * 2.002) * np.exp(-t * 2.97)
    for hz, amp, decay in ((214, .19, 38), (387, .10, 53), (713, .07, 77)):
        tone += amp * np.sin(TAU * hz * rng.uniform(.96, 1.04) * t) * np.exp(-t * decay)
    finger = colored_noise(rng, t.size, 13) * rng.uniform(.026, .044) * np.exp(-t * rng.uniform(58, 95))
    return finish((tone * tail + finger) * (1 - np.exp(-t * 510)), t)


def wind(f, duration, rng, kind, slide):
    """Low bamboo flutes with a breath envelope, restrained vibrato and pitch scoops."""
    t = timeline(duration + .28)
    xiao = kind == "xiao"
    breath = colored_noise(rng, t.size, 20)
    delayed_vibrato = (1 - np.exp(-np.maximum(0, t - .26) * 3.1))
    flutter = delayed_vibrato * np.sin(TAU * rng.uniform(4.15, 4.85) * t + rng.uniform(0, TAU))
    motion = .16 * np.sin(t * 2.5 + rng.uniform(0, TAU)) + .074 * np.sin(t * 12)
    pitch = slide * np.exp(-t * 13) + .072 * flutter + .032 * motion
    phase = np.cumsum((TAU * f / SR) * 2 ** (pitch / 12))
    release = np.exp(-np.maximum(t - duration, 0) / .059)
    onset = 1 - np.exp(-t / (.071 if xiao else .044))
    env = onset * release * (.83 + .12 * np.sin(np.pi * np.minimum(t / duration, 1)) + motion * .2)
    harmonics = ((1, .83, 0), (2, .26, .62), (3, .17, -.38), (4, .048, 1.2), (5, .041, .88))
    if not xiao:
        harmonics += ((6, .021, -.24), (7, .018, .56))
    wave = sum(gain * np.sin(h * phase + position + .045 * math.sqrt(h) * flutter) for h, gain, position in harmonics)
    air = (.040 if xiao else .029) * breath * (1 + .7 * np.exp(-t * 18))
    return finish((wave + air) * env, t)


def bow(f, duration, rng, slide):
    """A dark bowed string with independent pitch and bow-pressure variation."""
    t = timeline(duration + .36)
    pressure = .82 + .13 * np.sin(t * rng.uniform(2.0, 2.9) + rng.uniform(0, 2))
    vibrato = np.sin(TAU * rng.uniform(3.75, 4.6) * t) * (1 - np.exp(-t * 1.7))
    pitch = .073 * vibrato + slide * np.exp(-t * 9.1) + .019 * np.sin(t * 3.7)
    phase = np.cumsum((TAU * f / SR) * 2 ** (pitch / 12))
    harmonics = ((1, .56), (2, .27), (3, .14), (4, .081), (5, .042), (7, .025), (8, .013))
    tone = sum(gain * np.sin(h * phase + h * .31) for h, gain in harmonics)
    grains = colored_noise(rng, t.size, 24) * (.022 + .025 * np.exp(-t * 24))
    env = (1 - np.exp(-t / rng.uniform(.10, .16))) * np.exp(-np.maximum(t - duration, 0) / .097)
    return finish((tone + grains) * env * pressure, t)


def percussion(kind, rng):
    profiles = {
        "skin": (.68, ((77, .64, 10), (132, .29, 18), (219, .16, 30), (328, .07, 55)), .10, 15),
        "rim": (.23, ((442, .24, 43), (801, .38, 58), (1248, .18, 92), (1604, .08, 109)), .085, 12),
        "bronze": (2.44, ((223, .41, 2.5), (331, .24, 3.9), (498, .21, 4.8), (682, .11, 6), (889, .08, 8)), .05, 11),
    }
    duration, partials, contact, width = profiles[kind]
    t = timeline(duration)
    modes = np.zeros_like(t)
    for f, gain, damping in partials:
        phase = t * f * rng.uniform(.97, 1.03)
        if kind == "skin":
            phase += (1 - np.exp(-t * 30)) * (f * .12 / 30)
        modes += gain * np.sin(TAU * phase) * np.exp(-t * damping)
    touch = colored_noise(rng, t.size, width) * contact * np.exp(-t * (60 if kind == "skin" else 105))
    return finish((modes + touch) * (1 - np.exp(-t * 600)), t)


@dataclass(frozen=True)
class Note:
    voice: str
    start: float
    pitch: int
    beats: float
    gain: float
    pan: float
    slide: float


class StageScore:
    def __init__(self, cue, bpm, seed, bars, room):
        self.cue = cue
        self.bpm = bpm
        self.seed = seed
        self.bars = bars
        self.room = room
        self.notes: list[Note] = []

    def add(self, voice, bar, beat, pitch, length, gain, pan=0, slide=0):
        self.notes.append(Note(voice, bar * 4 + beat, midi(pitch), length, gain, pan, slide))

    def phrase(self, voice, bar, bars, gain, pan):
        for offset, phrase in enumerate(bars):
            for index, token in enumerate(phrase.split()):
                pitch, beat, length = token.split(":")
                slide = -.22 if index == 0 and voice in ("xiao", "dizi", "bow") else 0
                contour = 1 if index == 0 else .86 if index % 2 else .91
                self.add(voice, bar + offset, float(beat), pitch, float(length), gain * contour, pan, slide)

    def backing(self, start, chords, texture, gain):
        for offset, chord in enumerate(chords):
            bar = start + offset
            root, fifth, third, high = CHORD[chord].split()
            # Longer bass notes under open phrases, short pickups when the lead rests.
            bass_onset = (.07, .30, .04, .20)[offset % 4]
            self.add("bass", bar, bass_onset, root, 1.55, gain, -.04)
            if texture == "open":
                self.add("zither", bar, 1.32 + .32 * (offset % 2), fifth, 1.24, gain * .62, .34)
                if offset % 4 == 2:
                    self.add("bow", bar, .55, third, 3.22, gain * .43, -.28, -.13)
            elif texture == "weave":
                gestures = (
                    ((.34, fifth, .62), (1.22, third, .57), (2.76, high, .48)),
                    ((.83, third, .67), (2.07, fifth, .60)),
                    ((.32, fifth, .62), (1.60, high, .61), (2.48, third, .58)),
                    ((1.26, third, .72), (2.88, fifth, .77)),
                )
                for beat, pitch, length in gestures[offset % 4]:
                    self.add("zither", bar, beat, pitch, length, gain * .63, .28)
                if offset % 4 == 1:
                    self.add("lute", bar, 3.12, fifth, .48, gain * .46, -.19)
            elif texture == "march":
                self.add("lute", bar, 1.20 + .24 * (offset % 2), fifth, .65, gain * .69, -.25)
                self.add("lute", bar, 2.57, third, .78, gain * .62, -.25)
                if offset % 2 == 0:
                    self.add("skin", bar, 0, "C4", .5, gain * .70, .04)
                    self.add("skin", bar, 2.80, "C4", .5, gain * .35, .04)
                else:
                    self.add("rim", bar, 2.01, "C4", .5, gain * .45, .18)
                    if offset % 4 == 3:
                        self.add("skin", bar, 3.20, "C4", .5, gain * .47, .04)

    def render(self, target):
        beat = 60 / self.bpm
        n = round(self.bars * 4 * beat * SR)
        mix = np.zeros((n, 2), dtype=np.float32)
        rng = np.random.default_rng(self.seed)
        for e in sorted(self.notes, key=lambda note: note.start):
            duration = e.beats * beat
            frequency = 440 * 2 ** ((e.pitch - 69) / 12)
            if e.voice in ("zither", "lute", "bass"):
                data = pluck(frequency, duration, rng, e.voice)
            elif e.voice in ("xiao", "dizi"):
                data = wind(frequency, duration, rng, e.voice, e.slide)
            elif e.voice == "bow":
                data = bow(frequency, duration, rng, e.slide)
            else:
                data = percussion(e.voice, rng)
            pan = (e.pan + 1 + rng.uniform(-.025, .025)) * np.pi / 4
            gain = e.gain * rng.uniform(.91, 1.07)
            stereo = (data[:, None] * gain * np.array([np.cos(pan), np.sin(pan)])).astype(np.float32)
            # Human timing offsets and room tails wrap to the same phase at the loop edge.
            start = round((e.start * beat + rng.uniform(-.014, .018)) * SR) % n
            tail = min(n - start, len(stereo))
            mix[start:start + tail] += stereo[:tail]
            mix[:len(stereo) - tail] += stereo[tail:]

        mix -= mix.mean(axis=0)
        dry = mix.copy()
        for delay, amount, flip in ((.021, .31, False), (.033, .25, True), (.064, .20, False),
                                     (.091, .13, True), (.137, .11, False), (.204, .080, True),
                                     (.287, .054, True), (.389, .032, False)):
            room = dry[:, ::-1] if flip else dry
            samples = round(delay * SR)
            mix[samples:] += self.room * amount * room[:-samples]
            mix[:samples] += self.room * amount * room[-samples:]
        # Conservative level and unsquashed peaks preserve instrument dynamics.
        rms = float(np.sqrt(np.mean(mix ** 2)))
        mix *= min(.58 / float(np.max(np.abs(mix))), 10 ** (-25.5 / 20) / rms)

        with wave.open(str(target), "wb") as file:
            file.setparams((2, 2, SR, n, "NONE", "not compressed"))
            file.writeframes((mix * 32767).astype("<i2").tobytes())
        return {"cue": self.cue, "beatsPerMinute": self.bpm, "bars": self.bars,
                "durationSeconds": n / SR, "frames": n, "notes": len(self.notes)}


def gate():
    """Five sections: reed calls, lute answer, patrol, a softer procession, curtain."""
    s = StageScore("act1-gate", 78, 8061, 40, .22)
    sections = (
        ("Dm Dopen Bb Dm Gm F C Dm", "open", .155),
        ("F C Gm Dm Bb Gm C Dm", "weave", .165),
        ("Dm Bb F C Gm Dm Asus Dm", "march", .185),
        ("Bb F Gm Dm Bb C Asus Dopen", "weave", .14),
        ("Dm Bb Gm Dopen F Gm Asus Dopen", "open", .119),
    )
    for index, (chords, texture, gain) in enumerate(sections):
        s.backing(index * 8, chords.split(), texture, gain)
    s.phrase("xiao", 0, (
        "D4:.48:1.10 F4:1.78:.55 A4:2.54:1.11", "G4:.32:.76 F4:1.33:.60 D4:2.22:1.23",
        "", "A3:.72:.63 C4:1.58:.62 D4:2.46:1.12",
        "F4:.34:.80 G4:1.31:.58 Bb4:2.27:1.25", "A4:.47:1.34 F4:2.47:.84",
        "E4:.67:.82 G4:1.74:.67 F4:2.61:.76", "D4:.55:2.45",
    ), .20, .19)
    s.phrase("lute", 8, (
        "A4:.32:.45 C5:1.05:.66 A4:1.97:.58 F4:2.80:.84", "G4:.43:.66 E4:1.44:.45 G4:2.20:.88",
        "G4:.16:.68 Bb4:1.16:.51 A4:1.87:.53 G4:2.65:.62", "F4:.33:.68 A4:1.30:.65 D5:2.40:1.02",
        "Bb4:.28:.93 A4:1.54:.44 F4:2.27:.63", "G4:.35:.71 D4:1.36:.64 Bb3:2.36:1.02",
        "", "A3:.50:.55 D4:1.35:1.47",
    ), .27, -.18)
    s.phrase("xiao", 14, ("E4:.75:.64 G4:1.59:.72 E4:2.55:.40", "F4:.92:.42 D4:1.59:1.36"), .18, .20)
    s.phrase("lute", 16, (
        "D4:.33:.51 F4:1.04:.49 A4:1.86:.57 D5:2.73:.91", "Bb4:.39:.69 A4:1.46:.46 F4:2.18:.62",
        "C5:.31:.65 A4:1.27:.60 F4:2.39:.92", "G4:.12:.60 E4:1.18:.55 G4:2.10:.49 C5:2.94:.64",
        "Bb4:.23:.79 G4:1.49:.65 D4:2.47:.77", "F4:.35:.61 A4:1.35:.61 D5:2.35:.80",
        "E5:.32:.66 D5:1.46:.53 B4:2.29:.50", "A4:.44:.62 F4:1.42:.51 D4:2.19:1.31",
    ), .26, -.18)
    s.phrase("xiao", 24, (
        "D5:.71:.89 C5:1.99:.57 Bb4:2.83:.55", "A4:.41:2.12",
        "G4:.49:.87 Bb4:1.58:.57 A4:2.47:.69", "F4:.31:.69 D4:1.55:1.5",
        "", "G4:.32:.74 E4:1.39:.57 G4:2.22:.91",
        "A4:.62:1.62 E4:2.59:.60", "D4:.39:2.54",
    ), .19, .21)
    s.phrase("bow", 32, (
        "D4:.83:1.33 F4:2.48:1.07", "A4:.39:1.27 F4:2.09:1.04",
        "G4:.25:.90 D4:1.57:2.01", "", "A3:.69:.81 C4:1.94:1.29",
        "D4:.60:.82 G4:1.75:1.10", "E4:.59:1.42 A3:2.53:.81", "",
    ), .16, -.14)
    s.add("skin", 10, 3.26, "C4", .4, .065)
    s.add("bronze", 22, 3.20, "C4", 1.4, .082, .17)
    s.add("lute", 39, 2.35, "D4", 1.55, .14, -.20)
    return s


def orchard():
    """A garden walk in six sections with plucked and bamboo calls in G."""
    s = StageScore("act2-orchard", 92, 2738, 48, .27)
    sections = (
        ("G C/G Em G Am Em Dsus G", "open", .127),
        ("C/G G Em C/G Am Em Dsus G", "weave", .148),
        ("Em Am C/G G Em C/G Dsus G", "open", .128),
        ("G Dsus Em C/G Am G Dsus G", "march", .126),
        ("C/G Am Em G C/G Em Dsus G", "weave", .140),
        ("Em C/G G G Am C/G Dsus G", "open", .108),
    )
    for index, (chords, texture, gain) in enumerate(sections):
        s.backing(index * 8, chords.split(), texture, gain)
    s.phrase("zither", 0, (
        "G4:.37:.52 B4:1.24:.57 D5:2.12:1.02", "E5:.23:.77 D5:1.34:.59 B4:2.28:.82",
        "G4:.50:.64 E4:1.56:.75 G4:2.71:.72", "",
        "C5:.48:.64 E5:1.55:.60 D5:2.61:.83", "B4:.71:1.21 E4:2.43:.73",
        "A4:.47:.68 E4:1.43:.64 A4:2.49:.76", "G4:.44:2.06",
    ), .226, -.24)
    s.phrase("dizi", 8, (
        "E5:.26:.87 D5:1.43:.60 G4:2.29:.99", "B4:.55:.65 D5:1.55:.79 B4:2.68:.68",
        "G4:.51:.69 B4:1.51:.58 E5:2.38:.95", "D5:.52:1.1 C5:1.97:.57 G4:2.80:.72",
        "A4:.44:.68 C5:1.40:.55 E5:2.31:.97", "G5:.26:.65 E5:1.30:.54 B4:2.28:.99",
        "A4:.25:1.01 D5:1.70:.60 E5:2.59:.70", "D5:.30:.65 B4:1.30:.57 G4:2.26:1.09",
    ), .171, .23)
    s.phrase("lute", 16, (
        "E4:.55:.61 G4:1.53:.48 B4:2.31:.93", "C5:.31:.75 A4:1.39:.73 E4:2.60:.91",
        "G4:.33:.60 C5:1.26:.52 E5:2.13:.99", "",
        "B4:.39:.69 G4:1.52:.57 E4:2.55:.85", "G4:.42:.66 E4:1.38:.65 C4:2.36:.92",
        "D4:.31:.64 A4:1.23:.63 E4:2.22:1.15", "G4:1.20:1.98",
    ), .23, -.23)
    s.phrase("dizi", 19, ("D5:.56:.51 B4:1.38:.51 G4:2.27:1.25",), .145, .27)
    s.phrase("zither", 24, (
        "G4:.36:.46 B4:.98:.51 D5:1.82:.57 E5:2.80:.75", "D5:.19:.63 A4:1.37:.64 D5:2.42:.76",
        "B4:.51:.62 E5:1.38:.57 D5:2.22:.79", "C5:.22:.55 E5:1.18:.72 G5:2.47:.88",
        "E5:.47:.75 C5:1.59:.64 A4:2.64:.76", "B4:.35:.71 D5:1.44:.62 G4:2.52:.76",
        "E4:.35:.52 A4:1.21:.53 E5:2.17:.98", "D5:.22:.66 B4:1.25:.60 G4:2.37:1.16",
    ), .234, -.30)
    s.phrase("xiao", 32, (
        "E4:.61:1.76", "A4:.37:.87 C5:1.54:.58 E5:2.37:1.16",
        "B4:.64:1.01 G4:1.98:.75 E4:2.94:.58", "D4:.82:.78 G4:1.93:1.47",
        "", "E4:.38:.76 G4:1.57:.65 B4:2.55:.83",
        "A4:.41:.67 E4:1.51:.68 D4:2.61:.69", "G4:.44:2.24",
    ), .169, .22)
    s.phrase("zither", 40, (
        "B4:.63:.76 G4:1.78:.58 E4:2.61:.87", "G4:.41:.70 C5:1.40:.58 E5:2.32:.93",
        "D5:.45:.75 B4:1.58:.68 G4:2.66:.77", "",
        "A4:.47:.64 C5:1.38:.69 E4:2.47:.86", "G4:.43:.82 E4:1.58:1.15",
        "A4:.48:.81 D4:1.83:1.05", "G4:.57:2.38",
    ), .192, -.24)
    s.add("rim", 12, 3, "C4", .5, .042, .31)
    s.add("bronze", 30, .39, "C4", 1.4, .058, .25)
    return s


def furnace():
    """A low string lament opens out to brushed drum, then gives way to breath."""
    s = StageScore("act3-furnace", 70, 6359, 40, .32)
    sections = (
        ("Dopen Dm Gm Dm Eb Bb Gm Dopen", "open", .146),
        ("Gm Bb Eb Dm Gm Bb Asus Dm", "weave", .161),
        ("Dm Eb Bb Gm Dm Eb Asus Dopen", "march", .178),
        ("Bb Gm Eb Dm Bb Gm Asus Dm", "weave", .135),
        ("Dm Gm Eb Dopen Bb Gm Asus Dopen", "open", .113),
    )
    for index, (chords, texture, gain) in enumerate(sections):
        s.backing(index * 8, chords.split(), texture, gain)
    s.phrase("bow", 0, (
        "D4:.48:1.23 F4:1.98:.61 A4:2.84:.87", "G4:.25:.85 F4:1.42:.62 D4:2.29:1.30",
        "", "A3:.59:.91 C4:1.80:.51 D4:2.63:1.02",
        "Eb4:.43:1.17 G4:2.15:1.40", "F4:.40:.91 D4:1.70:1.77",
        "Bb3:.43:.62 D4:1.38:.68 G4:2.48:.87", "D4:.59:2.54",
    ), .225, -.21)
    s.phrase("xiao", 8, (
        "G4:.45:.73 Bb4:1.47:.58 D5:2.47:1.05", "A4:.39:.95 F4:1.75:.68 D4:2.80:.76",
        "Eb4:.32:1.22 G4:1.95:1.10", "F4:.55:.82 E4:1.82:.59 D4:2.72:.79",
        "G4:.59:.84 D4:1.86:1.18", "", "E4:.61:.71 B3:1.76:.59 A3:2.73:.73", "D4:.43:2.48",
    ), .163, .26)
    s.phrase("lute", 16, (
        "D4:.46:.61 F4:1.51:.56 A4:2.38:1.03", "G4:.38:.65 Bb4:1.44:.66 G4:2.57:.84",
        "F4:.15:.71 D4:1.26:.63 Bb3:2.39:.93", "G4:.53:.73 Bb4:1.64:.59 D5:2.60:.84",
        "A4:.45:.75 F4:1.58:.65 D4:2.62:.73", "Eb4:.31:.68 G4:1.36:.66 Bb4:2.52:.92",
        "E4:.65:.67 B4:1.70:.59 A4:2.67:.88", "D4:.54:2.19",
    ), .201, -.19)
    s.phrase("bow", 24, (
        "F4:.41:1.37 D4:2.16:1.38", "G4:.50:.67 Bb4:1.52:.65 G4:2.62:.84",
        "Eb4:.48:1.19 G4:2.12:1.31", "F4:.43:.69 E4:1.49:.53 D4:2.42:1.17",
        "", "D4:.44:.89 Bb3:1.81:1.11", "A3:.40:1.47 E4:2.36:1.03", "D4:.51:2.49",
    ), .196, -.19)
    s.phrase("xiao", 32, (
        "A3:.71:1.27 D4:2.32:1.15", "Bb3:.47:.85 D4:1.75:1.27",
        "Eb4:.59:.87 D4:1.94:.77", "", "F4:.41:1.64 D4:2.45:.79",
        "Bb3:.46:.98 G3:1.89:1.08", "A3:.61:.68 E4:1.58:.81", "D4:.53:2.41",
    ), .155, .18)
    for bar, beat, gain in ((5, 2.38, .065), (15, 3.15, .088), (22, .65, .102), (31, 2.95, .068)):
        s.add("bronze", bar, beat, "C4", 1.5, gain, .21)
    return s


def dbfs(value):
    return float(20 * np.log10(max(1e-12, value)))


def inspect(wave_path, mp3_path, ffmpeg, meta):
    if ffmpeg:
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wave_path),
                        "-codec:a", "libmp3lame", "-q:a", "5", "-write_xing", "1", str(mp3_path)], check=True)
        pcm = subprocess.check_output([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(mp3_path),
                                       "-f", "f32le", "-acodec", "pcm_f32le", "-"])
        track = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2)
        meta.update(encodedBytes=mp3_path.stat().st_size, hashSha256=hashlib.sha256(mp3_path.read_bytes()).hexdigest())
        assert mp3_path.stat().st_size < 2200000
    else:
        with wave.open(str(wave_path), "rb") as source:
            assert (source.getnchannels(), source.getframerate()) == (2, SR)
            track = np.frombuffer(source.readframes(source.getnframes()), "<i2").reshape(-1, 2) / 32768
    assert track.shape == (meta["frames"], 2)
    peak = float(np.max(np.abs(track)))
    jump = float(np.max(np.abs(track[0] - track[-1])))
    seam = np.concatenate((track[-4410:], track[:4410]))
    typical = float(np.quantile(np.abs(np.diff(seam, axis=0)), .99))
    assert peak < .708 and jump < max(.006, typical * 2.5)
    meta.update(decodedFrames=track.shape[0], peakDbFS=dbfs(peak),
                rmsDbFS=dbfs(float(np.sqrt(np.mean(track ** 2)))), seamSampleJump=jump, nearSeamP99=typical)
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--ffmpeg", help="FFmpeg executable for MP3 export. Omit for WAV masters only.")
    args = parser.parse_args()
    masters = args.output / "master"
    masters.mkdir(exist_ok=True, parents=True)
    report = []
    for score in (gate(), orchard(), furnace()):
        wav_path = masters / (score.cue + ".wav")
        mp3_path = args.output / (score.cue + ".mp3")
        report.append(inspect(wav_path, mp3_path, args.ffmpeg, score.render(wav_path)))
    (args.output / "receipt.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
