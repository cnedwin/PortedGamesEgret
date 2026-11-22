"""Original White Dew scene scores. Python, NumPy and lameenc render all notes.
No sampled recordings or third-party compositions are used.
Run python compose.py OUTPUT_DIRECTORY --ffmpeg PATH. Keep WAV masters outside the web build.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import wave
import numpy as np

RATE = 44100
TAU = 2 * np.pi
PITCH = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)

def frequency(note):
    key, octave = note[:-1], int(note[-1])
    midi = (octave + 1) * 12 + PITCH[key[0]] + key.count("#") - key.count("b")
    return 440 * 2 ** ((midi - 69) / 12)

def voice(note, seconds, kind, rng):
    f = frequency(note)
    t = np.arange(round((seconds + (1.6 if kind == "pad" else 1.1)) * RATE)) / RATE
    out = np.zeros_like(t)
    if kind == "pad":
        attack = (1 - np.exp(-t / .65)) ** 2
        release = np.exp(-np.maximum(0, t - seconds) / .48)
        for ratio, level in ((1, .64), (2.001, .16), (3, .07)):
            out += level * np.sin(TAU * f * ratio * t + .009 * np.sin(t * 2.1))
        out *= attack * release * (.94 + .06 * np.sin(t * .9))
    else:
        bright = kind == "bell"
        nylon = kind == "nylon"
        for harmonic in range(1, min(13, int(10000 / f))):
            amplitude = harmonic ** (-1.55 if nylon else -1.75 if bright else -1.9)
            attack = .008 if nylon else .012
            decay = (1.7 if nylon else 1.3 if bright else 1.8) + harmonic * (.30 if nylon else .22)
            tuning = 1 + (.00007 if bright else .000012) * harmonic ** 2
            out += amplitude * np.sin(TAU * f * harmonic * tuning * t) * np.exp(-t * decay)
        out *= (1 - np.exp(-t / attack)) * np.exp(-np.maximum(0,t-seconds)/.19)
        out += rng.normal(0,.006,len(t)) * np.exp(-t * 110)
    out *= np.minimum(1, np.maximum(0,(t[-1]-t)/.03))
    return out

NIGHT_CHORDS = [
    "A2 E3 C4 B4", "F2 C3 A3 E4", "C3 G3 E4 D5", "G2 D3 B3 A4",
    "A2 E3 C4 E4", "D3 A3 F4 E5", "F2 C3 G3 A4", "E3 B3 G3 D4",
]
WARM_CHORDS = [
    "C3 G3 E4 A4", "G2 D3 B3 G4", "A2 E3 C4 E4", "F2 C3 A3 G4",
    "D3 A3 F4 A4", "G2 D3 B3 E4", "C3 G3 E4 D5", "G2 D3 A3 B4",
]
MYSTERY_CHORDS = [
    "D3 A3 F4 E5", "Bb2 F3 D4 A4", "G2 D3 Bb3 E4", "A2 E3 C4 G4",
    "D3 A3 E4 F4", "C3 G3 D4 E4", "Bb2 F3 A3 D5", "A2 E3 G3 B4",
]
MELODIES = {
    "bailu-zero-night": [
        "E4:0.3:1.5 B4:2.6:0.7", "A4:1.1:1.7", "G4:0.6:0.8 E4:2.4:1.0", "D4:1.3:1.6",
        "E4:0.4:1.0 C5:2.1:1.3", "A4:0.7:1.1 G4:2.8:0.7", "E4:1.0:1.9", "B3:0.6:1.0 E4:2.8:0.5",
    ],
    "bailu-zero-mystery": [
        "A4:0.25:0.5 E5:1.8:0.5 F5:3.1:0.4", "D5:1.0:0.8 A4:2.8:0.6",
        "Bb4:0.6:0.7 G4:2.2:0.8", "E5:1.2:0.6 C5:3.0:0.4",
        "D5:0.4:0.8 A4:2.1:0.7", "G4:0.8:0.6 E5:2.4:0.8",
        "F5:1.0:1.2 D5:2.8:0.5", "B4:0.7:0.5 A4:2.0:1.1",
    ],
    "bailu-zero-warm": [
        "E4:0.3:0.7 G4:1.4:0.8 A4:2.7:0.9", "G4:0.6:1.1 D4:2.7:0.6",
        "E4:0.2:0.8 C5:1.8:1.3", "A4:0.7:1.0 G4:2.3:1.2",
        "F4:0.5:0.8 A4:1.8:0.7 C5:3.0:0.6", "B4:0.8:1.2 G4:2.8:0.7",
        "E4:0.5:1.0 D4:2.1:0.7 C4:3.1:0.6", "D4:1.0:1.1 E4:2.8:0.6",
    ],
}

def score(name, bpm, chords, seed, output, ffmpeg):
    beat = 60 / bpm
    frames = round(24 * 4 * beat * RATE)
    mix = np.zeros((frames,2),dtype=np.float32)
    rng = np.random.default_rng(seed)
    events = []
    for bar in range(24):
        root, fifth, third, high = chords[bar % 8].split()
        section = bar // 8
        for offset,pitch,length,gain,kind,pan in (
            (.06,root,2.6,.26,"piano",-.07),
            (1.2,fifth,1.1,.15,"nylon" if name.endswith("warm") else "piano",-.27),
            (2.6,third,1.2,.125,"piano",.26),
        ):
            if section == 1 and bar % 2 and offset == 2.6:
                continue
            events.append((bar*4+offset,pitch,length,gain,kind,pan))
        if bar % 2 == 0:
            events.append((bar*4+.1,third,6.5,.058 if section != 1 else .043,"pad",.04))
        if section != 1 or bar % 4 in (2,3):
            for token in MELODIES[name][bar%8].split():
                pitch,offset,length=token.split(":")
                events.append((bar*4+float(offset)+rng.uniform(-.022,.022),pitch,float(length),
                               .15 if name.endswith("mystery") else .235,
                               "bell" if name.endswith("mystery") else "piano",.13))
        if section == 2 and bar % 2 == 0:
            events.append((bar*4+3.2,high,.65,.080,"nylon",-.31))
    for start,note,length,gain,kind,pan in events:
        data = voice(note,length*beat,kind,rng)
        angle=(pan+1)*np.pi/4
        stereo=(data*gain*rng.uniform(.93,1.04))[:,None]*np.array([np.cos(angle),np.sin(angle)])
        start=max(0,round(start*beat*RATE))
        count=min(len(stereo),frames-start)
        mix[start:start+count]+=stereo[:count]
        if len(stereo)>count:
            mix[:len(stereo)-count]+=stereo[count:]
    dry=mix.copy()
    for delay,gain,flip in ((.037,.15,False),(.083,.11,True),(.151,.075,True),(.263,.05,False),(.411,.035,True)):
        mix+=np.roll(dry[:,::-1] if flip else dry,round(delay*RATE),axis=0)*gain
    mix-=mix.mean(axis=0)
    rms=float(np.sqrt(np.mean(mix**2)))
    mix*=min(.63/float(np.max(np.abs(mix))),10**(-23/20)/rms)
    pcm=np.rint(mix*32767).astype("<i2")
    master=output/"masters"
    master.mkdir(exist_ok=True)
    with wave.open(str(master/f"{name}.wav"),"wb") as target:
        target.setparams((2,2,RATE,0,"NONE","not compressed"))
        target.writeframes(pcm.tobytes())
    encoded_path=output/f"{name}.mp3"
    subprocess.run([ffmpeg,"-hide_banner","-loglevel","error","-y","-i",str(master/f"{name}.wav"),
                    "-codec:a","libmp3lame","-b:a","128k","-write_xing","1",str(encoded_path)],check=True)
    encoded=encoded_path.read_bytes()
    decoded=subprocess.check_output([ffmpeg,"-hide_banner","-loglevel","error","-i",str(encoded_path),
                                     "-f","f32le","-acodec","pcm_f32le","-"])
    restored=np.frombuffer(decoded,"<f4").reshape(-1,2)
    if len(restored)!=frames or np.max(np.abs(restored))>.8:
        raise ValueError("Music roundtrip changed frame count or exceeded headroom")
    return {"id":name,"bpm":bpm,"seconds":frames/RATE,"bars":24,
            "notes":len(events),"bytes":len(encoded),"peak":float(np.max(np.abs(mix))),
            "rmsDbFS":20*np.log10(float(np.sqrt(np.mean(mix**2)))),
            "seamJump":float(np.max(np.abs(mix[0]-mix[-1]))),
            "decodedSeamJump":float(np.max(np.abs(restored[0]-restored[-1]))),
            "sha256":hashlib.sha256(encoded).hexdigest()}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output",type=Path)
    parser.add_argument("--ffmpeg",required=True)
    args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    report=[]
    for name,bpm,chords,seed in (
        ("bailu-zero-night",72,NIGHT_CHORDS,77261),
        ("bailu-zero-mystery",84,MYSTERY_CHORDS,77262),
        ("bailu-zero-warm",78,WARM_CHORDS,77263),
    ):
        row=score(name,bpm,chords,seed,args.output,args.ffmpeg)
        report.append(row)
        print(json.dumps(row),flush=True)
    (args.output/"manifest.json").write_text(json.dumps(report,indent=2)+"\n","utf-8")

if __name__=="__main__":
    main()
