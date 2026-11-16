"""Original Lantern Shadows trio. Run with Python/NumPy and a working FFmpeg.
Run `python tools/compose-score.py OUTPUT_DIR --ffmpeg ffmpeg` to encode MP3s.
Use FFmpeg 7.1 and its libmp3lame encoder to reproduce the distributed files.
No samples, recordings, MIDI files, or external piece are used.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import subprocess
import wave

import numpy as np

SR = 44100
TAU = 2 * np.pi
PITCH = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(note):
    name, accidental, octave = re.fullmatch(r"([A-G])([#b]?)(-?\d+)", note).groups()
    return (int(octave) + 1) * 12 + PITCH[name] + (accidental == "#") - (accidental == "b")


def timeline(length):
    return np.arange(max(1, round(length * SR)), dtype=np.float64) / SR


def noise(size, seed):
    return np.random.default_rng(seed).normal(0, 1, size)


@lru_cache(maxsize=256)
def pluck(f, length, kind):
    if kind == "lute":
        strike, damp, sustain, stiff, profile = .22, .47, .41, .00013, (.11, .21, .26, .13)
    elif kind == "zither":
        strike, damp, sustain, stiff, profile = .31, .28, .66, .000055, (.06, .22, .29, .25)
    else:
        strike, damp, sustain, stiff, profile = .19, .36, .51, .000025, (.23, .20, .13, .08)
    t = timeline(length + 1.18)
    envelope = np.exp(-np.maximum(t - length, 0) / sustain) * (1 - np.exp(-t * 920))
    out = np.zeros_like(t)
    for harmonic in range(1, min(16, int(SR / (2.2 * f)))):
        resonance = 1 + .7 * np.exp(-((harmonic * f - 510) / 340) ** 2) + .42 * np.exp(-((harmonic * f - 2400) / 610) ** 2)
        amp = np.sin(np.pi * harmonic * strike) / harmonic ** (1.16 if kind == "zither" else 1.4)
        phase = TAU * f * harmonic * np.sqrt(1 + stiff * harmonic ** 2) * t
        decay = np.exp(-t * (damp * harmonic ** .88 + (1.25 if kind == "lute" else .87)))
        out += amp * resonance * decay * np.sin(phase + .18 * harmonic)
    for i, amp in enumerate(profile):
        out += amp * np.exp(-t * (55 + 29 * i)) * np.sin(TAU * (620 + i * 457) * t)
    raw = noise(t.size, round(f * 1000) + sum(map(ord, kind)))
    attack = (raw - np.roll(raw, 1)) * .022 * np.exp(-t * 182)
    return (out + attack) * envelope * np.clip((t[-1] - t) / .055, 0, 1)


def flute(f, length, slide, seed, style):
    t = timeline(length + .22)
    vibrato = np.minimum(t * 5, 1) * np.sin(TAU * (4.05 + seed % 5 / 10) * t)
    drift = .0019 * np.sin(t * 5.3 + seed) + .0026 * vibrato
    bend = 2 ** ((slide * np.exp(-t * 12) - .085 * np.exp(-t * 57)) / 12)
    phase = np.cumsum((f * bend * (1 + drift)) * (TAU / SR))
    amp = (1 - np.exp(-t / (.052 if style == "xiao" else .021))) * np.exp(-np.maximum(t - length, 0) / .042)
    amp *= .92 + .08 * np.sin(t * 6 + seed) + .06 * np.sin(t * 2)
    tone = sum(weight * np.sin(harmonic * phase + shift) for harmonic, weight, shift in
               ((1, .83, 0), (2, .19, -.8), (3, .30, .4), (4, .055, .9), (5, .085, .4),
                (6, .07 if style == "dizi" else .025, -.12), (7, .055 if style == "dizi" else .021, .5)))
    breath = noise(t.size, seed * 8731)
    breath = (breath - np.roll(breath, 4)) * (.021 if style == "xiao" else .032)
    breath += .047 * np.sin(phase * 8.01) * np.exp(-t / .035)
    return (tone + breath) * amp * np.clip((t[-1] - t) / .03, 0, 1)


def bowed(f, length, seed):
    t = timeline(length + .58)
    bend = 1 + np.sin(t * 24.3 + seed) * .0025 + np.sin(t * 4.1) * .002
    phase = np.cumsum(f * TAU / SR * bend)
    env = (1 - np.exp(-t / .22)) * np.exp(-np.maximum(t - length, 0) / .11)
    env *= np.clip((t[-1] - t) / .06, 0, 1) * (.83 + .15 * np.sin(t * 2 + seed))
    return sum(amp * np.sin(i * phase + i * .35) for i, amp in
               ((1, .64), (2, .18), (3, .12), (4, .093), (5, .06), (6, .02))) * env


def percussion(instrument, seed):
    length = {"drum": .86, "wood": .26, "bell": 2.4, "shaker": .25}[instrument]
    t = timeline(length)
    n = noise(t.size, seed)
    if instrument == "drum":
        bend = 63 * t + 19 * (1 - np.exp(-t * 24)) / 24
        y = .71 * np.sin(TAU * bend) * np.exp(-t * 8.8)
        y += .26 * np.sin(TAU * 104.5 * t) * np.exp(-t * 14)
        y += .19 * np.sin(TAU * 159.4 * t) * np.exp(-t * 19) + .11 * n * np.exp(-t * 110)
    elif instrument == "wood":
        y = .4 * np.sin(TAU * 779.2 * t) * np.exp(-t * 57) + .21 * np.sin(TAU * 1107.5 * t) * np.exp(-t * 85)
        y += .13 * (n - np.roll(n, 1)) * np.exp(-t * 188)
    elif instrument == "bell":
        y = .56 * np.sin(TAU * 665.4 * t) * np.exp(-t * 1.8) + .22 * np.sin(TAU * 1002.5 * t) * np.exp(-t * 3.3)
        y += .15 * np.sin(TAU * 1544.8 * t) * np.exp(-t * 4.8)
    else:
        y = (n - np.roll(n, 2)) * .16 * np.exp(-t * 31)
        y *= np.sin(np.pi * np.minimum(t * 24, 1)) ** .38 + np.exp(-t * 28) * .35
    return y * (1 - np.exp(-t * 1350)) * np.clip((t[-1] - t) / .023, 0, 1)



GATE = [
    "D4:0:.48 A4:.67:.34 G4:1.17:.48 F4:1.83:.56 D4:2.75:1.05",
    "F4:.10:.43 G4:.69:.36 A4:1.28:.67 C5:2.08:.44 A4:2.74:.73",
    "G4:0:.82 F4:1.10:.55 D4:1.81:.43 C4:2.45:.48 D4:3.16:.62",
    "A3:.25:.54 C4:.99:.44 D4:1.52:1.69",
    "D4:.12:.52 F4:.78:.50 G4:1.42:.52 A4:2.20:.44 D5:2.80:.76",
    "C5:.18:.73 A4:1.19:.47 G4:1.91:.38 A4:2.46:.52 F4:3.12:.48",
    "D4:0:.66 G4:.84:.59 C5:1.81:.83 A4:2.85:.70",
    "G4:.22:.45 F4:.92:.52 D4:1.60:1.64",
    "D5:.05:.84 C5:1.14:.50 A4:1.79:.68 G4:2.74:.70",
    "F4:.15:.42 G4:.77:.47 A4:1.49:.96 F4:2.84:.54",
    "G4:0:.59 C5:.74:.67 D5:1.63:.48 A4:2.32:1.26",
    "C5:.06:.48 G4:.79:.53 F4:1.53:.39 D4:2.24:1.17",
    "A4:.13:.54 D5:.85:.75 C5:1.82:.51 A4:2.49:.67",
    "G4:0:.64 F4:.87:.57 G4:1.60:.37 D4:2.16:1.15",
    "C4:.12:.64 D4:1.02:.51 G4:1.76:.45 F4:2.42:.70",
    "D4:.16:1.65 A3:2.47:.59 C4:3.17:.31",
]
ORCHARD = [
    "G5:.09:.37 A5:.62:.31 B5:1.03:.58 D6:1.97:.42 B5:2.59:.34 G5:3.11:.68",
    "A5:.13:.40 E5:.73:.44 G5:1.41:.57 D5:2.22:1.05",
    "E5:.13:.48 G5:.83:.38 D6:1.42:.66 E6:2.31:.37 D6:2.89:.43",
    "B5:.04:.44 A5:.67:.44 G5:1.34:1.52",
    "B5:.22:.37 D6:.78:.43 E6:1.44:.86 D6:2.70:.73",
    "G5:.14:.47 B5:.81:.42 A5:1.45:.54 G5:2.28:.38 E5:2.85:.46",
    "D5:.06:.51 G5:.78:.44 A5:1.40:.49 B5:2.07:.51 D6:2.81:.67",
    "B5:.18:.46 A5:.83:.49 G5:1.57:1.67",
    "E6:.12:.65 D6:1.03:.39 B5:1.59:.44 D6:2.27:.53 B5:3.01:.52",
    "A5:.11:.54 G5:.88:.44 E5:1.59:.75 G5:2.75:.63",
    "G5:.07:.44 B5:.72:.47 D6:1.37:.57 B5:2.16:.38 E6:2.83:.59",
    "D6:.21:.52 A5:.94:.56 G5:1.81:1.25",
    "E5:.14:.49 G5:.85:.37 A5:1.43:.40 B5:2.03:.69 D6:2.92:.59",
    "E6:0:.61 D6:.87:.52 G5:1.66:.63 A5:2.53:.77",
    "B5:.15:.38 D6:.67:.40 B5:1.26:.53 A5:2.14:.53 E5:2.87:.54",
    "G5:.18:1.93 D5:2.68:.58 E5:3.39:.29",
]
FURNACE = [
    "Eb4:.13:1.16 Bb3:1.64:.62 Db4:2.55:.75",
    "Gb4:.16:.71 Ab4:1.15:.68 Eb4:2.10:1.22",
    "Bb3:0:.66 Db4:.93:.49 Eb4:1.71:.74 Gb4:2.77:.65",
    "Eb4:.20:1.79 Db4:2.65:.54",
    "Ab4:.11:.77 Bb4:1.12:.46 Ab4:1.86:.53 Gb4:2.55:.76",
    "Db4:.13:.66 Gb4:1.10:1.21 Ab4:2.79:.61",
    "Eb4:0:.63 Db4:.85:.59 Bb3:1.72:.44 Gb3:2.45:.92",
    "Bb3:.10:.45 Db4:.76:.46 Eb4:1.51:1.75",
    "Eb5:.16:.61 Db5:1.03:.65 Bb4:2.02:1.01",
    "Ab4:.19:.70 Gb4:1.16:.45 Eb4:1.85:.63 Db4:2.72:.51",
    "Gb4:.14:.72 Bb4:1.08:.55 Db5:1.85:.66 Bb4:2.81:.62",
    "Ab4:.18:.54 Gb4:.95:.52 Bb3:1.83:1.69",
    "Db4:.10:.74 Eb4:1.07:.69 Gb4:2.03:.52 Eb4:2.78:.69",
    "Ab4:.15:.49 Gb4:.86:.82 Db4:1.99:1.15",
    "Bb3:.11:.62 Gb3:.96:.55 Db4:1.81:.72 Eb4:2.87:.65",
    "Eb4:.10:2.01 Gb3:2.62:.58 Bb3:3.42:.29",
]

@dataclass
class Note:
    instrument: str
    start: float
    pitch: int
    length: float
    gain: float
    pan: float
    bend: float = 0


class StageScore:
    def __init__(self, cue: str, bpm: float, seed: int, room: float, rms: float):
        self.cue = cue
        self.bpm = bpm
        self.seed = seed
        self.room = room
        self.rms = rms
        self.notes: list[Note] = []

    def add(self, part, bar, beat, pitch, length, gain, pan=0, bend=0):
        self.notes.append(Note(part, bar * 4 + beat, midi(pitch), length, gain, pan, bend))

    def phrase(self, part, bar, phrase, gain, pan, bend=0):
        for i, item in enumerate(phrase.split()):
            pitch, beat, dur = item.split(":")
            self.add(part, bar, float(beat), pitch, float(dur), gain * (1 if i % 3 == 0 else .85), pan, bend if i == 0 else 0)

    def strokes(self, bar, instrument, pattern, pan=0):
        for beat, gain in pattern:
            self.add(instrument, bar, beat, "C4", .18, gain, pan)

    def render(self, target):
        seconds = 60 / self.bpm
        n = round(64 * seconds * SR)
        mix = np.zeros((n, 2), dtype=np.float64)
        for index, e in enumerate(self.notes):
            length = e.length * seconds
            seed = self.seed + index * 13
            f = 440 * 2 ** ((e.pitch - 69) / 12)
            if e.instrument in ("lute", "zither", "bass"):
                voice = pluck(f, round(length, 3), e.instrument)
            elif e.instrument in ("dizi", "xiao"):
                voice = flute(f, length, e.bend, seed, e.instrument)
            elif e.instrument == "bow":
                voice = bowed(f, length, seed)
            elif e.instrument == "bronze":
                voice = bronze(f, seed)
            else:
                voice = percussion(e.instrument, seed)
            angle = math.pi * (e.pan + 1) / 4
            panned = voice[:, None] * e.gain * np.asarray([math.cos(angle), math.sin(angle)])
            # Fold voices and room tails over the loop edge. The two cycles share one phase-continuous mix.
            start = round(e.start * seconds * SR) % n
            size = min(len(panned), n - start)
            mix[start:start + size] += panned[:size]
            mix[:len(panned) - size] += panned[size:]
        mix -= mix.mean(axis=0)
        dry = mix.copy()
        for delay, ratio, flip in (
            (.027, .36, True), (.043, .25, False), (.074, .22, True),
            (.109, .16, False), (.158, .15, True), (.229, .11, False), (.358, .08, True), (.483, .06, True),
        ):
            mix += self.room * ratio * np.roll(dry[:, ::-1] if flip else dry, round(delay * SR), axis=0)
        mix = np.tanh(mix * 1.17)
        gain = min(.78 / float(np.max(np.abs(mix))), 10 ** (self.rms / 20) / float(np.sqrt(np.mean(mix ** 2))))
        mix *= gain
        with wave.open(str(target), "wb") as file:
            file.setnchannels(2)
            file.setsampwidth(2)
            file.setframerate(SR)
            file.writeframes((mix * 32767).astype("<i2").tobytes())
        return {"cue": self.cue, "beatsPerMinute": self.bpm, "durationSeconds": n / SR, "frames": n, "notes": len(self.notes)}


def bronze(f, seed):
    t = timeline(2.7)
    modes = ((1, .63, 1.8), (1.31, .34, 2.55), (1.71, .19, 3.3), (2.09, .16, 4.82), (2.67, .08, 5.1), (3.77, .09, 8.5))
    tone = sum(amp * np.exp(-decay * t) * np.sin(TAU * f * partial * t) for partial, amp, decay in modes)
    air = noise(t.size, seed)
    tone += (air - np.roll(air, 3)) * .056 * np.exp(-t * 78)
    return tone * (1 - np.exp(-t * 391)) * np.clip((t[-1] - t) / .06, 0, 1)


def gate():
    s = StageScore("act1-gate", 76, 6371, .20, -19.8)
    roots = ["D3", "D3", "G2", "D3", "D3", "F3", "C3", "D3", "G2", "D3", "C3", "D3", "F3", "G2", "C3", "D3"]
    fifths = ["A3", "A3", "D3", "A3", "A3", "C4", "G3", "A3", "D3", "A3", "G3", "A3", "C4", "D3", "G3", "A3"]
    for bar, motif in enumerate(GATE):
        s.phrase("lute", bar, motif, .28 if bar < 8 else .24, -.24)
        for beat, note, duration, volume in [(0, roots[bar], 1.2, .24), (1.72, fifths[bar], .70, .14), (2.76, roots[bar], .81, .18)]:
            s.add("bass", bar, beat, note, duration, volume, .12)
        if bar in (2, 3, 5, 8, 10, 13, 14):
            s.add("bow", bar, .18, fifths[bar] if bar in (8, 14) else roots[bar], 2.75, .090, .28)
        if bar in (7, 8, 9, 10, 11, 14):
            replies = {7:"A4:2.14:1.46",8:"F5:.66:.65 D5:1.47:.54 C5:2.34:1.2",9:"A4:1.0:.65 C5:2.12:1.15",10:"D5:.35:1.18 G4:2.00:1.42",11:"A4:.71:1.12 F4:2.62:.81",14:"G4:.57:.59 A4:1.31:1.77"}
            s.phrase("xiao", bar, replies[bar], .105, .22, -.23)
        s.strokes(bar, "drum", ((0, .22), (2.04, .148), (3.35, .085)) if bar % 4 != 3 else ((0, .22), (2.47, .09), (3.10, .16)), -.04)
        if bar % 2:
            s.strokes(bar, "wood", ((1.0, .062), (2.55, .068)), .33)
    for bar, beat, note in [(0, 0, "D3"), (7, 2.38, "A3"), (15, 0, "D3")]:
        s.add("bronze", bar, beat, note, 1.3, .068, .34)
    return s


def orchard():
    s = StageScore("act2-orchard", 94, 1487, .15, -20.3)
    roots = ["G3", "E3", "C3", "G3", "E3", "C3", "D3", "G3", "C3", "E3", "G3", "D3", "E3", "C3", "D3", "G3"]
    echoes = ["D4", "B3", "G3", "D4", "B3", "G3", "A3", "D4", "G3", "B3", "D4", "A3", "B3", "G3", "A3", "D4"]
    for bar, motif in enumerate(ORCHARD):
        s.phrase("dizi", bar, motif, .195 if bar < 8 else .174, .16, -.34)
        for beat, note, duration, volume in [
            (0, roots[bar], .81, .20), (.84, echoes[bar], .39, .124), (1.57, echoes[bar], .34, .12),
            (2.17, roots[bar], .62, .156), (3.16, echoes[bar], .50, .115),
        ]:
            s.add("zither", bar, beat, note, duration, volume, -.27)
        if bar in (3, 7, 11, 15):
            s.add("bass", bar, 1.33, roots[bar], 1.66, .11, -.06)
        if bar in (2, 6, 9, 10, 13, 14):
            s.add("lute", bar, 2.58, "G4" if bar % 2 else "D5", .47, .101, .38)
            s.add("lute", bar, 3.24, "B4", .43, .077, .38)
        s.strokes(bar, "wood", ((.48, .142), (1.69, .077), (2.75, .114), (3.54, .069)), -.13 if bar % 2 else .31)
        if bar % 4 != 3:
            s.strokes(bar, "shaker", ((1.17, .111), (3.24, .123)), .39)
        if bar in (0, 4, 8, 12):
            s.strokes(bar, "drum", ((0, .075),), 0)
    return s


def furnace():
    s = StageScore("act3-furnace", 70, 2903, .27, -19.4)
    roots = ["Eb2", "Gb2", "Db3", "Eb2", "Ab2", "Db3", "Gb2", "Eb2", "Eb2", "Ab2", "Gb2", "Bb2", "Eb2", "Db3", "Gb2", "Eb2"]
    upper = ["Bb3", "Db4", "Ab3", "Bb3", "Eb4", "Ab3", "Db4", "Bb3", "Bb3", "Eb4", "Db4", "Gb3", "Bb3", "Ab3", "Db4", "Bb3"]
    for bar, motif in enumerate(FURNACE):
        s.phrase("bow", bar, motif, .24 if bar < 8 else .27, -.20)
        s.add("bass", bar, .02, roots[bar], 1.42, .26, .08)
        s.add("bass", bar, 2.42 if bar % 2 else 2.12, roots[bar], .9, .19, .04)
        s.add("zither", bar, .76 if bar % 2 else .51, upper[bar], .69, .142, .31)
        s.add("zither", bar, 2.99, upper[bar], .58, .118, .35)
        if bar in (1, 3, 6, 7, 9, 11, 13, 15):
            s.add("bronze", bar, 2.06 if bar % 2 else 0, upper[bar], 1.0, .134 if bar in (3, 7, 11, 15) else .102, .27)
        if bar in (5, 8, 10, 12, 14):
            s.add("xiao", bar, 1.38, upper[bar], 1.90, .069, -.42, -.30)
        s.strokes(bar, "drum", ((0, .13), (1.78, .065), (3.11, .105)) if bar >= 8 and bar < 15 else ((0, .122), (2.73, .08)), -.06)
        if bar in (5, 7, 9, 11, 13):
            s.strokes(bar, "wood", ((1.6, .08), (3.48, .061)), .42)
    return s


def dbfs(v):
    return float(20 * np.log10(max(1e-12, v)))


def inspect(wave_path, mp3_path, ffmpeg, meta):
    with wave.open(str(wave_path), "rb") as source:
        assert (source.getnchannels(), source.getframerate()) == (2, SR)
        master = np.frombuffer(source.readframes(source.getnframes()), "<i2").reshape(-1, 2) / 32768
    if ffmpeg:
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wave_path),
                        "-codec:a", "libmp3lame", "-q:a", "4", "-write_xing", "1", str(mp3_path)], check=True)
        pcm = subprocess.check_output([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(mp3_path),
                                       "-f", "f32le", "-acodec", "pcm_f32le", "-"])
        track = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2)
        meta.update(encodedBytes=mp3_path.stat().st_size, hashSha256=hashlib.sha256(mp3_path.read_bytes()).hexdigest())
        assert track.shape == master.shape and mp3_path.stat().st_size < 850000
    else:
        track = master
    peak = float(np.max(np.abs(track)))
    jump = float(np.max(np.abs(track[0] - track[-1])))
    seam = np.concatenate((track[-4410:], track[:4410]))
    typical = float(np.quantile(np.abs(np.diff(seam, axis=0)), .99))
    assert peak < .81 and jump < max(.006, typical * 2.5)
    meta.update(decodedFrames=track.shape[0], peakDbFS=dbfs(peak), rmsDbFS=dbfs(float(np.sqrt(np.mean(track ** 2)))),
                seamSampleJump=jump, nearSeamP99=typical)
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--ffmpeg", help="FFmpeg executable for MP3 export. Omit to generate WAV masters only.")
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True, parents=True)
    masters = args.output / "master"
    masters.mkdir(exist_ok=True)
    report = []
    for score in (gate(), orchard(), furnace()):
        wav_path = masters / (score.cue + ".wav")
        mp3_path = args.output / (score.cue + ".mp3")
        report.append(inspect(wav_path, mp3_path, args.ffmpeg, score.render(wav_path)))
    (args.output / "receipt.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
