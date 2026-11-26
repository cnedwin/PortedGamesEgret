#!/usr/bin/env python3
# 摆放预览：按 src/view/scenes.mjs 把背景、人物、物件合成一张图，并框出每件证物的点击区域，用来调整位置。
#   node -e "import('./src/view/scenes.mjs').then(m => console.log(JSON.stringify(m.SCENES)))" > /tmp/scenes.json
#   python3 tools/assets/preview.py /tmp/scenes.json c1 out.jpg
# Layout preview: composes the background, figures and things of one case as src/view/scenes.mjs places them, and
# outlines each piece of evidence's tap area, for adjusting positions.
import json
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'assets', 'art')
scenes = json.load(open(sys.argv[1]))
case = sys.argv[2]
out = sys.argv[3]
L = scenes[case]
index = json.load(open(os.path.join(ART, 'index.json')))
W, H = L['size']
canvas = Image.open(os.path.join(ART, L['bg'] + '.webp')).convert('RGBA').resize((W, H))
rects = {}
for it in sorted(L['items'], key=lambda i: i.get('z', i['y'])):
    info = index.get(it['art'])
    if not info:
        continue
    h = it['h']
    w = info['w'] / info['h'] * h
    im = Image.open(os.path.join(ART, it['art'] + '.webp')).convert('RGBA').resize((max(1, round(w)), max(1, round(h))))
    if it.get('flip'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if it.get('rot'):
        im = im.rotate(-it['rot'], expand=True)
    canvas.alpha_composite(im, (round(it['x'] - im.width / 2), round(it['y'] - im.height)))
    rects[it.get('spot', it['art'])] = (it['x'] - w / 2, it['y'] - h, w, h)
for k, r in L.get('spots', {}).items():
    rects[k] = tuple(r)
d = ImageDraw.Draw(canvas)
for k, (x, y, w, h) in rects.items():
    d.rectangle([x, y, x + w, y + h], outline=(200, 30, 30, 255), width=6)
    d.text((x + 10, y + 10), k, fill=(200, 30, 30, 255))
canvas = canvas.convert('RGB')
canvas.thumbnail((1600, 800))
canvas.save(out, quality=82)
print(out)
