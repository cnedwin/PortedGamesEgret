"""Original Nine Provinces score. Python + NumPy + FFmpeg; no sampled recordings.

Three long-form, loopable arrangements share a D-centred motif. All plucked
strings, breath instruments, skins and bronze are synthesized here. Rendering
is an authoring step: no music synthesis runs on the game's animation thread.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile
import wave
import numpy as np

RATE = 32000
TAU = 2 * np.pi

def hz(note):
    return 440 * 2 ** ((note - 69) / 12)

def timeline(seconds):
    return np.arange(max(1, round(seconds * RATE))) / RATE

def band_noise(n, seed, lo=500, hi=5500):
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n)
    size = 1 << (n - 1).bit_length()
    f = np.fft.rfftfreq(size, 1 / RATE)
    weights = np.clip((f-lo) / max(100, lo*.6), 0, 1) * np.clip((hi-f) / 1200, 0, 1)
    out = np.fft.irfft(np.fft.rfft(x, size) * weights, size)[:n]
    return out / max(float(np.std(out)), 1e-8)

def pluck(f, seconds, seed, kind='silk'):
    t = timeline(seconds)
    rng = np.random.default_rng(seed)
    position = .19 + rng.uniform(-.035, .035)
    y = np.zeros(len(t))
    for harmonic in range(1, 23 if kind != 'bass' else 15):
        brightness = 1 / (1 + (f * harmonic / (5100 if kind == 'pipa' else 3900)) ** 2)
        weight = math.sin(math.pi * harmonic * position) * brightness / harmonic ** 1.22
        decay = (.80 if kind == 'bass' else 1.35 if kind == 'pipa' else .95) + harmonic ** 1.16 * .16
        partial = f * harmonic * math.sqrt(1 + .000035 * harmonic * harmonic)
        y += weight * np.exp(-decay*t) * np.sin(TAU*partial*t + rng.uniform(-.08,.08))
    y += band_noise(len(t), seed+371, 900, 6500) * .016 * np.exp(-100*t)
    y *= np.minimum(1, t/.003)
    y *= np.minimum(1, (seconds-t)/.075)
    return y * .40

def flute(f, seconds, seed, airy=False):
    t = timeline(seconds)
    vibrato = .0025 * np.clip((t-.18)/.22, 0, 1) * np.sin(TAU*4.85*t+.7)
    approach = -.006 * np.exp(-t/.055)
    phase = TAU*np.cumsum(f*(1+vibrato+approach))/RATE
    envelope = np.sin(np.minimum(1,t/.08)*np.pi/2)**1.5
    envelope *= np.sin(np.clip((seconds-t)/.14,0,1)*np.pi/2)**1.7
    envelope *= .94+.035*np.sin(TAU*1.85*t+seed)
    y = np.sin(phase) + (.16 if airy else .22)*np.sin(2*phase+.04) + .065*np.sin(3*phase)
    y += (.07 if airy else .038)*band_noise(len(t),seed,800,5100)
    y += .018*band_noise(len(t),seed+41,1700,6500)*np.exp(-t/ .045)
    return y*envelope*.25

def drum(seed, deep=True):
    t = timeline(.95 if deep else .45)
    f = (57 if deep else 108) + (42 if deep else 56)*np.exp(-t/.028)
    phase = TAU*np.cumsum(f)/RATE
    skin = .09*band_noise(len(t),seed,90,3200)*np.exp(-t*42)
    body = np.sin(phase)*np.exp(-t*(6.0 if deep else 12))
    body += .19*np.sin(phase*1.63+.15)*np.exp(-t*15)
    body += .085*np.sin(phase*2.21)*np.exp(-t*24)
    return (body*.65+skin)*np.minimum(1,t/.0018)*np.minimum(1,(t[-1]-t)/.03)

def wood(seed):
    t = timeline(.16)
    return (.27*np.sin(TAU*690*t)+.13*np.sin(TAU*1088*t))*np.exp(-t*48)*np.minimum(1,t/.0015)

def bronze(seed, soft=False):
    t = timeline(2.5 if soft else 3.3)
    rng=np.random.default_rng(seed)
    y=np.zeros(len(t))
    for ratio,weight,decay in ((1,.50,1.9),(1.49,.25,2.1),(2.07,.17,2.8),(2.83,.10,3.3),(3.37,.07,4.5),(4.23,.035,5.0)):
        y += weight*np.sin(TAU*146.83*ratio*t+rng.uniform(-.03,.03))*np.exp(-t*decay)
    return y*np.minimum(1,t/.005)*(.52 if soft else .8)

# Offsets from D4, with deliberate rests and question/answer shapes. Notes are
# (pitch offset, beat in bar, duration in beats), not randomized note selection.
TITLE_A = [
 [(0,0,.75),(7,1,.50),(9,1.75,.70),(7,2.75,.72)],
 [(5,.25,.65),(2,1.25,.70),(0,2.40,1.10)],
 [(2,0,.55),(5,.75,.60),(7,1.75,1.05),(12,3.15,.50)],
 [(9,.15,.90),(7,1.50,.60),(5,2.40,.55),(2,3.25,.45)],
 [(0,0,1.15),(7,1.75,.55),(5,2.75,.72)],
 [(-3,.20,.70),(0,1.20,.55),(2,2.20,.55),(5,3,.60)],
 [(7,.10,.65),(9,1.10,.55),(12,2.10,.75),(9,3.20,.45)],
 [(7,.10,.70),(2,1.30,.65),(0,2.50,1.05)],
]
TITLE_B = [
 [(12,.15,.8),(9,1.25,.55),(7,2,.75)],
 [(5,0,.70),(7,1,.55),(9,1.90,.55),(7,2.90,.75)],
 [(2,.20,.7),(5,1.20,.65),(7,2.30,1.05)],
 [(9,0,.55),(12,.85,.60),(14,1.75,.75),(12,2.90,.70)],
 [(9,.20,1),(7,1.60,.60),(5,2.60,.75)],
 [(7,.10,.65),(5,1.10,.65),(2,2.10,1.05)],
 [(0,.15,.75),(2,1.25,.65),(7,2.30,.75)],
 [(5,.20,.65),(2,1.20,.65),(0,2.35,1.15)],
]
REALM = [
 [(0,.20,1.10),(7,1.70,.70),(5,2.90,.75)],
 [(3,.25,1),(0,1.65,.70),(-5,2.85,.70)],
 [(5,.10,.75),(7,1.25,.70),(10,2.45,.90)],
 [(7,.20,.90),(3,1.65,.75),(0,2.85,.70)],
 [(-5,.20,.85),(0,1.55,.65),(3,2.70,.90)],
 [(5,.10,1.25),(3,1.85,.75)],
 [(7,.20,.75),(10,1.35,.75),(12,2.65,.75)],
 [(7,.15,.70),(3,1.40,.65),(0,2.65,1)],
]
BATTLE = [
 [(0,0,.5),(0,.75,.35),(7,1.50,.65),(5,2.50,.45),(3,3.25,.50)],
 [(0,0,.70),(-5,1.25,.45),(0,2,.50),(3,2.85,.65)],
 [(5,0,.55),(7,.85,.50),(10,1.70,.65),(7,2.80,.70)],
 [(5,.15,.60),(3,1.15,.55),(0,2.25,1.15)],
 [(7,0,.50),(10,.80,.50),(12,1.65,.70),(10,2.80,.60)],
 [(7,0,.75),(5,1.20,.65),(3,2.30,.80)],
 [(0,.10,.55),(3,1,.50),(5,1.85,.60),(7,2.80,.75)],
 [(5,0,.70),(3,1.10,.65),(0,2.30,1.10)],
]

class Score:
    def __init__(self,name,bpm,bars,seed,target_rms):
        self.name,self.bpm,self.bars,self.seed,self.target_rms=name,bpm,bars,seed,target_rms
        self.events=[]
    def add(self,voice,bar,beat,pitch,length,gain,pan=0):
        self.events.append((voice,bar*4+beat,pitch,length,gain,pan))
    def phrase(self,voice,bar,notes,gain,pan=0,transpose=0):
        for i,(pitch,beat,length) in enumerate(notes):
            self.add(voice,bar,beat,62+pitch+transpose,length,gain*(1 if i%3==0 else .88),pan)
    def render(self,ffmpeg,target):
        beat=60/self.bpm;n=round(self.bars*4*beat*RATE)
        result=np.zeros((n,2),float)
        def put(voice,start,gain,pan):
            angle=(pan+1)*np.pi/4
            stereo=voice[:,None]*gain*np.array([math.cos(angle),math.sin(angle)])
            at=round(start*RATE)%n;count=min(len(stereo),n-at)
            result[at:at+count]+=stereo[:count]
            if count<len(stereo):result[:len(stereo)-count]+=stereo[count:]
        for i,(voice,start,pitch,length,gain,pan) in enumerate(self.events):
            seed=self.seed+i*31
            if voice in ('silk','pipa','bass'):sample=pluck(hz(pitch),length*beat+.60,seed,voice)
            elif voice in ('flute','xiao'):sample=flute(hz(pitch),length*beat,seed,voice=='xiao')
            elif voice in ('deep','skin'):sample=drum(seed,voice=='deep')
            elif voice=='wood':sample=wood(seed)
            else:sample=bronze(seed,voice=='soft-gong')
            put(sample,start*beat,gain,pan)
        dry=result.copy()
        for delay,level,flip in ((.019,.13,True),(.037,.11,False),(.067,.08,True),(.113,.065,False),(.179,.045,True),(.281,.027,True),(.431,.013,False)):
            result+=level*np.roll(dry[:,::-1] if flip else dry,round(delay*RATE),axis=0)
        result-=result.mean(axis=0)
        result=np.tanh(result*.92)
        gain=min(.68/max(float(abs(result).max()),1e-8),10**(self.target_rms/20)/max(float(np.sqrt(np.mean(result*result))),1e-8))
        result*=gain
        with tempfile.TemporaryDirectory(prefix='nine-score-') as scratch:
            wav=Path(scratch)/'score.wav'
            with wave.open(str(wav),'wb') as stream:
                stream.setnchannels(2);stream.setsampwidth(2);stream.setframerate(RATE)
                stream.writeframes(np.round(result*32767).astype('<i2').tobytes())
            subprocess.run([ffmpeg,'-v','error','-nostdin','-y','-i',str(wav),'-c:a','libmp3lame','-b:a','96k','-ar',str(RATE),'-write_xing','1',str(target)],check=True)
        # Split complete two-bar phrases, avoiding a spurious rounded tail bin.
        sections=[round(20*np.log10(max(float(np.sqrt(np.mean(part**2))),1e-12)),2) for part in np.array_split(result,self.bars//2)]
        return {'file':target.name,'title':{'title':'銅雀未曉 / Before the Banners Rise','realm':'山河有信 / Across the Living Realm','battle':'旌旗破陣 / Banners Through the Line'}[self.name],
          'bpm':self.bpm,'bars':self.bars,'seconds':n/RATE,'sampleRate':RATE,'channels':2,'events':len(self.events),
          'rmsDbfs':round(20*np.log10(float(np.sqrt(np.mean(result*result)))),2),'peakDbfs':round(20*np.log10(float(abs(result).max())),2),
          'twoBarRmsDbfs':sections,'loopSampleJump':float(np.max(abs(result[-1]-result[0]))),
          'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}

def title_score():
    s=Score('title',76,32,184,-24)
    roots=[38,43,45,38,47,43,45,38]
    for bar in range(32):
        part=bar//8;local=bar%8
        if bar%8!=7:s.add('bass',bar,.10,roots[local],2.3,.20,-.10)
        if part in (0,2):s.phrase('silk',bar,TITLE_A[local],.35 if part==0 else .40,-.27)
        else:s.phrase('xiao' if part==3 else 'flute',bar,TITLE_B[local],.42 if part==1 else .29,.08)
        for beat,pitch in ((.15,62),(2.05,69)):
            if (bar+part)%3!=1:s.add('silk',bar,beat,pitch+(12 if part==2 else 0),1.0,.095,.34)
        if part==2 and local in (0,2,4,6):s.add('skin',bar,0,0,.2,.12,-.12)
        if bar in (0,16):s.add('soft-gong',bar,0,0,1,.08,.15)
    return s

def realm_score():
    s=Score('realm',64,32,271,-25.5)
    roots=[38,41,43,38,36,41,43,38]
    for bar in range(32):
        part=bar//8;local=bar%8
        if local!=7:s.add('bass',bar,.2,roots[local],2.1,.18,-.1)
        if part in (1,3):s.phrase('xiao',bar,REALM[local],.32 if part==1 else .26,.08)
        else:s.phrase('silk',bar,REALM[local],.34 if part==0 else .29,-.24)
        if local in (0,2,4,6):s.add('silk',bar,2.2,roots[local]+24,1.1,.085,.32)
        if part==2 and local<6:s.add('wood',bar,1.9,0,.2,.055,.20)
        if bar in (8,24):s.add('soft-gong',bar,.05,0,1,.035,-.15)
    return s

def battle_score():
    s=Score('battle',108,48,392,-24.5)
    roots=[38,38,43,41,45,43,41,38]
    for bar in range(48):
        part=bar//8;local=bar%8
        strength=[.27,.35,.22,.35,.40,.24][part]
        pattern=[(0,1),(1.5,.45),(2,.72),(3.25,.42)] if local%2==0 else [(0,.8),(1,.42),(2.5,.70)]
        if local==7:pattern=[(0,.85),(1.5,.38)]
        for beat,gain in pattern:s.add('deep',bar,beat,0,.2,strength*gain,-.12)
        if part in (1,3,4) and local<7:
            for beat in (.75,2.75):s.add('skin',bar,beat,0,.2,.095,.20)
        if local!=7:s.add('bass',bar,.10,roots[local],1.4,.18,-.15)
        if part in (0,2,5):s.phrase('pipa',bar,BATTLE[local],.20 if part==2 else .27,-.28)
        else:
            s.phrase('pipa',bar,BATTLE[local],.29,-.30)
            for beat in (.50,1.25,2.50):s.add('pipa',bar,beat,roots[local]+24,.25,.10,.30)
        if part in (1,3,4) and local in (0,2,4,6):
            s.phrase('flute',bar,[(7,.1,.70),(10,1.25,.55),(12,2.30,.80)],.22,.10)
        if bar in (0,16,32):s.add('gong',bar,0,0,1,.11,.05)
    return s

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg',required=True)
    parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parents[2]/'assets/audio')
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    report={'authorship':'Original authored compositions and mathematical instrument synthesis. No recordings or third-party samples.',
      'generator':'src/audio/compose-score.py','tracks':[]}
    for score in (title_score(),realm_score(),battle_score()):
        row=score.render(args.ffmpeg,args.out/(score.name+'-score.mp3'))
        report['tracks'].append(row)
        (args.out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
        print(json.dumps(row,ensure_ascii=True),flush=True)

if __name__=='__main__':main()
