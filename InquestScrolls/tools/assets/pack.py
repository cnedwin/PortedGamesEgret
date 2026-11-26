#!/usr/bin/env python3
# 打包美术：把生成的原图裁掉透明边、按用途缩放，存成 WebP；背景另存一张半尺寸的低画质版。尺寸写进 assets/art/index.json，
# 画面按它摆放人物和物件。
#   python3 tools/assets/pack.py <folder of generated images, one sub-folder per id>
# Packs the art: generated images are trimmed of transparent margins, scaled for their use and saved as WebP;
# backgrounds also get a half-size copy for low quality. Sizes go into assets/art/index.json, which the view uses to
# place figures and things.
import glob
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(GAME, 'assets', 'art')
SOURCE = sys.argv[1] if len(sys.argv) > 1 else '.'
# Which generated folder each id comes from, when it is not its own name (the calibration images were kept).
ALIASES = {'bg-c1': 'test-bg', 'f-sunda': 'test-fig'}
LIMIT = {'bg': None, 'fig': 1000, 'prop': 900, 'chart': 1100}
# Backgrounds the generator framed: the part to keep (left, top, right, bottom as fractions), then cover 3840 x 1440.
CROPS = {'bg-c2': (0, 0, 1, 0.845), 'bg-title': (0.035, 0.125, 0.97, 0.8)}
ONLY = set(sys.argv[2:])

os.makedirs(OUT, exist_ok=True)
rows = [line.rstrip('\n').split('\t') for line in open(os.path.join(HERE, 'art.tsv'), encoding='utf-8') if line.strip() and not line.startswith('#')]
kinds = {r[0]: r[1] for r in rows}
kinds.update({'bg-c1': 'bg', 'f-sunda': 'fig'})
index = {}
if os.path.exists(os.path.join(OUT, 'index.json')):
    index = json.load(open(os.path.join(OUT, 'index.json'), encoding='utf-8'))
for ident, kind in sorted(kinds.items()):
    if ONLY and ident not in ONLY:
        continue
    found = glob.glob(os.path.join(SOURCE, 'out', ALIASES.get(ident, ident), '**', 'generated_image.*'), recursive=True)
    if not found:
        continue
    im = Image.open(found[0])
    if kind == 'bg':
        im = im.convert('RGB')
        if ident in CROPS:
            l, t, r, b = CROPS[ident]
            im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
            scale = max(3840 / im.width, 1440 / im.height)
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
            x0, y0 = (im.width - 3840) // 2, (im.height - 1440) // 2
            im = im.crop((x0, y0, x0 + 3840, y0 + 1440))
        im.save(os.path.join(OUT, ident + '.webp'), 'WEBP', quality=80, method=6)
        half = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
        half.save(os.path.join(OUT, ident + '-low.webp'), 'WEBP', quality=78, method=6)
    else:
        im = im.convert('RGBA')
        alpha = im.getchannel('A').point(lambda a: 255 if a > 12 else 0)
        box = alpha.getbbox()
        if box:
            pad = 6
            box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
            im = im.crop(box)
        limit = LIMIT[kind]
        scale = min(1.0, limit / max(im.width, im.height))
        if scale < 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        im.save(os.path.join(OUT, ident + '.webp'), 'WEBP', quality=86, method=6)
    index[ident] = {'w': im.width, 'h': im.height, 'kind': kind}
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), indent=1, sort_keys=True)
print(len(index), 'images')
