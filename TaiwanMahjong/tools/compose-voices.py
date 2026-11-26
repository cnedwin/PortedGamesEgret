"""Render original Mahjong dialogue with the local PrimeTTS v2.1 model kit."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

import lameenc
import numpy as np
import onnxruntime as ort


RATE = 16_000
PUNCTUATION = str.maketrans({'，': ',', '。': '.', '！': '!', '？': '?'})
CALLS = {'chow': '吃！', 'pong': '碰！', 'kong': '槓！', 'win': '胡！', 'selfDraw': '自摸！'}
CHARACTERS = {
    # speaker, pace, expressiveness, opening, late-hand remark
    'steady': (1, 1.02, .47, '不急，慢慢打。', '這局可得慢慢看。'),
    'grand': (2, 1.06, .50, '來啦，先暖個手。', '嘿，這桌有意思。'),
    'eager': (0, .91, .59, '好啦，開打囉！', '欸，這局有夠熱鬧！'),
}
READINGS = {
    '吃': ['ㄔ1'], '碰': ['ㄆㄥ4'], '槓': ['ㄍㄤ4'], '胡': ['ㄏㄨ2'],
    '自摸': ['ㄗ4', 'ㄇㄛ1'], '欸': ['ㄟ1'], '囉': ['ㄌㄨㄛ5'],
    '啦': ['ㄌㄚ5'], '可得': ['ㄎㄜ3', 'ㄉㄟ3'], '暖個': ['ㄋㄨㄢ3', 'ㄍㄜ5'],
    '有意思': ['ㄧㄡ3', 'ㄧ4', 'ㄙ5'],
}


def read_json(file):
    return json.loads(file.read_text(encoding='utf-8'))


def tokens(text, lexicon, symbols):
    phones, tones, spoken = [], [], []
    at = 0
    while at < len(text):
        char = text[at]
        if char in ',.?!':
            phones.append(symbols[char])
            tones.append(0)
            at += 1
            continue
        for length in range(min(10, len(text) - at), 0, -1):
            word = text[at:at + length]
            syllables = READINGS.get(word) or lexicon['phrases'].get(word)
            if syllables and len(syllables) == length:
                break
        else:
            word, syllables = char, [lexicon['characters'][char]]
        for reading in syllables:
            match = re.fullmatch(r'([\u3105-\u312d]+)([1-5])', reading)
            if not match:
                raise ValueError(f'Unexpected pronunciation of {word!r}: {reading!r}')
            syllable, tone = match.groups()
            if len(syllable) == 1 and syllable in 'ㄓㄔㄕㄖㄗㄘㄙ':
                syllable += 'ㄭ'
            phones.extend(symbols[symbol] for symbol in syllable)
            tones.extend([int(tone)] * len(syllable))
        spoken.extend(syllables)
        at += len(word)
    return phones, tones, spoken


def gaps(content):
    sequence = np.zeros((1, len(content) * 2 + 1), dtype=np.int64)
    sequence[0, 1::2] = content
    return sequence


def speak(session, phones, tones, speaker, pace, energy, seed):
    ort.set_seed(seed)
    wave = session.run(None, {
        'x': gaps(phones), 'tone': gaps(tones), 'lang': gaps([0] * len(phones)),
        'x_lengths': np.array([len(phones) * 2 + 1], np.int64),
        'sid': np.array([speaker], np.int64),
        'noise_scale': np.array([energy], np.float32),
        'length_scale': np.array([pace], np.float32),
    })[0].reshape(-1)
    if not len(wave) or not np.isfinite(wave).all() or np.max(np.abs(wave)) < .035:
        raise ValueError('Missing or silent model audio')
    peak = np.max(np.abs(wave))
    speech = np.flatnonzero(np.abs(wave) > peak * .023)
    return wave[max(0, speech[0] - 224):min(len(wave), speech[-1] + 540)].copy()


def master(wave):
    wave -= np.mean(wave)
    rms = float(np.sqrt(np.mean(wave ** 2)))
    wave *= min(.86 / np.max(np.abs(wave)), .16 / rms)
    fade = min(80, len(wave) // 5)
    wave[:fade] *= np.linspace(0, 1, fade)
    wave[-fade:] *= np.linspace(1, 0, fade)
    pcm = np.rint(wave * 32767).astype('<i2')
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(48)
    encoder.set_in_sample_rate(RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return bytes(encoder.encode(pcm.tobytes()) + encoder.flush())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model_kit', type=Path)
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/audio/voices.json')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    lexicon = read_json(args.model_kit / 'lexicon.json')
    symbols = read_json(args.model_kit / 'symbol_table.json')['sym2id']
    symbols['ㄭ'] = len(symbols)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    engine = ort.InferenceSession(args.model_kit / 'primetts_v21_3voice.onnx', sess_options=options,
                                  providers=['CPUExecutionProvider'])

    encoded, report = {}, {}
    for name, (speaker, pace, energy, opening, aside) in CHARACTERS.items():
        encoded[name] = {}
        report[name] = {}
        for index, (cue, text) in enumerate({**CALLS, 'opening': opening, 'aside': aside}.items()):
            phones, tones, spoken = tokens(text.translate(PUNCTUATION), lexicon, symbols)
            chatter = cue in ('opening', 'aside')
            duration_limit = 1.85 if chatter else .66 if cue == 'selfDraw' else .49
            speed = pace if chatter else pace * .86
            seed = 97001 + 13 * speaker + index
            for _ in range(5):
                wave = speak(engine, phones, tones, speaker, speed, energy, seed)
                seconds = len(wave) / RATE
                if seconds <= duration_limit:
                    break
                speed *= .97 * duration_limit / seconds
            else:
                raise ValueError(f'{name}/{cue} exceeded selected duration')
            clip = master(wave)
            encoded[name][cue] = base64.b64encode(clip).decode('ascii')
            report[name][cue] = {'line': text, 'speaker': speaker, 'reading': spoken, 'seconds': round(seconds, 3),
                                 'lengthScale': round(speed, 3), 'bytes': len(clip), 'sha256': hashlib.sha256(clip).hexdigest()}
            print(name, cue, text, f'{seconds:.3f}s', len(clip), flush=True)
    args.out.parent.mkdir(exist_ok=True, parents=True)
    args.out.write_text(json.dumps(encoded, separators=(',', ':')) + '\n', encoding='utf-8')
    if args.report:
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
