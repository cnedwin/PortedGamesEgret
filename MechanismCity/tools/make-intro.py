# 开场短片：由代码一帧一帧画出来，再用 ffmpeg 编成 media/intro.mp4（H.264）和 media/intro.webm（VP9）。
# The opening film. Every frame is drawn here — mist over the hills, the walls of the city, its jammed
# wheels, the speaking tube, the crossbow and the title — and ffmpeg encodes the frames as media/intro.mp4
# (H.264, for every browser) and media/intro.webm (VP9, for browsers without H.264). The film is silent: the
# game's own mixer plays the music over it.
#
#   python3 tools/make-intro.py
import math
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, LENGTH = 960, 540, 24, 22.0
HERE = Path(__file__).resolve().parent
MEDIA = HERE.parent / 'media'
SERIF = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
SANS = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'

# The lines of src/story.mjs (INTRO_LINES), with the second each appears.
LINES = [
    (0.5, 4.6, '三十年前，墨家机关城闭城自守'),
    (5.0, 9.6, '城心「机枢」卡死，千门俱锁，山下的谷地断了水'),
    (10.0, 14.1, '守城的老钜子在城中留下传声铜管'),
    (14.5, 18.2, '等一个会用机关弩的人'),
]


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def sky():
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        k = y / H
        d.line([0, y, W, y], fill=(int(12 + 40 * k), int(24 + 50 * k), int(40 + 46 * k)))
    rng = random.Random(5)
    for i in range(90):
        x = rng.uniform(0, W)
        y = rng.uniform(0, H * 0.55)
        r = 1.6 if i % 9 == 0 else 0.8
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 244, 220))
    return img


def hills(seed, colour, base, rough):
    img = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(0, H)]
    for x in range(0, W * 2 + 40, 40):
        pts.append((x, base + math.sin(x / 170 + seed) * rough + math.sin(x / 61 + seed * 3) * rough * 0.3))
    pts.append((W * 2, H))
    d.polygon(pts, fill=colour)
    return img


def city():
    """The walls and halls of the city, a black cut-out against the sky."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = (10, 14, 22, 255)
    d.rectangle([0, 380, W, H], fill=ink)
    for i, (x, w, h, storeys) in enumerate([(60, 150, 90, 1), (250, 120, 150, 3), (420, 220, 120, 2), (690, 130, 160, 3), (850, 120, 80, 1)]):
        top = 380 - h
        d.rectangle([x, top, x + w, 380], fill=ink)
        for s in range(storeys):
            t = top - s * 44
            inset = s * 16
            d.polygon([(x - 22 + inset, t), (x + w / 2, t - 22), (x + w + 22 - inset, t), (x + w - 10 - inset, t - 30), (x + 10 + inset, t - 30)], fill=ink)
            if s + 1 < storeys:
                d.rectangle([x + 18 + inset, t - 44, x + w - 18 - inset, t - 30], fill=ink)
    # Battlements along the wall.
    for x in range(0, W, 26):
        d.rectangle([x, 366, x + 14, 380], fill=ink)
    return img


def gear(radius, teeth, colour, angle):
    size = int(radius * 2.6)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size / 2
    for i in range(teeth):
        a = angle + i * 2 * math.pi / teeth
        w = math.pi / teeth * 0.55
        d.polygon([(c + math.cos(a - w) * radius, c + math.sin(a - w) * radius), (c + math.cos(a - w * 0.6) * radius * 1.18, c + math.sin(a - w * 0.6) * radius * 1.18), (c + math.cos(a + w * 0.6) * radius * 1.18, c + math.sin(a + w * 0.6) * radius * 1.18), (c + math.cos(a + w) * radius, c + math.sin(a + w) * radius)], fill=colour)
    d.ellipse([c - radius, c - radius, c + radius, c + radius], fill=colour)
    dark = tuple(max(0, v - 40) for v in colour[:3]) + (255,)
    d.ellipse([c - radius * 0.72, c - radius * 0.72, c + radius * 0.72, c + radius * 0.72], fill=dark)
    for i in range(5):
        a = angle + i * 2 * math.pi / 5
        d.line([c, c, c + math.cos(a) * radius * 0.72, c + math.sin(a) * radius * 0.72], fill=colour, width=int(radius * 0.16))
    d.ellipse([c - radius * 0.2, c - radius * 0.2, c + radius * 0.2, c + radius * 0.2], fill=(222, 176, 92, 255))
    return img


def text_layer(line, alpha, size=30, y=H - 78):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if alpha <= 0:
        return img
    font = ImageFont.truetype(SANS, size)
    d = ImageDraw.Draw(img)
    width = d.textlength(line, font=font)
    x = (W - width) / 2
    d.rectangle([0, y - 16, W, y + size + 18], fill=(0, 0, 0, int(110 * alpha)))
    d.text((x, y), line, font=font, fill=(240, 228, 200, int(255 * alpha)))
    return img


SKY = sky()
FAR = hills(1.0, (28, 44, 62, 255), 300, 40)
NEAR = hills(2.5, (18, 30, 44, 255), 350, 26)
CITY = city()


def frame(t):
    # The camera drifts right over the hills; the far ones move less.
    img = SKY.copy().convert('RGBA')
    img.alpha_composite(FAR.crop((int(t * 6), 0, int(t * 6) + W, H)))
    img.alpha_composite(NEAR.crop((int(t * 14), 0, int(t * 14) + W, H)))
    # The moon, and the city rising out of the mist.
    mx, my = 700, 120 - t * 1.5
    light = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(light)
    for r, a in ((140, 18), (90, 30), (60, 50)):
        ld.ellipse([mx - r, my - r, mx + r, my + r], fill=(246, 230, 176, a))
    img.alpha_composite(light.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(img)
    d.ellipse([mx - 42, my - 42, mx + 42, my + 42], fill=(250, 244, 222, 255))
    rise = ease(t / 4.0)
    city_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    city_layer.alpha_composite(CITY, (0, int(60 * (1 - rise))))
    img.alpha_composite(city_layer)
    # Lanterns: lit at the start, dark once the heart jams.
    lit = 1.0 if t < 6.5 else max(0.0, 1 - (t - 6.5) / 1.2)
    if lit > 0:
        lamps = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        lg = ImageDraw.Draw(lamps)
        for x, y in ((130, 340), (310, 300), (520, 330), (750, 300)):
            lg.ellipse([x - 22, y - 22, x + 22, y + 22], fill=(255, 160, 80, int(60 * lit)))
            lg.ellipse([x - 7, y - 9, x + 7, y + 9], fill=(230, 90, 50, int(255 * lit)))
        img.alpha_composite(lamps)
    # Mist over everything low.
    mist = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mist)
    for i in range(6):
        y = 360 + i * 26 + math.sin(t * 0.6 + i) * 6
        md.ellipse([-200 + (t * 18 * (i + 1)) % 300 - 150, y - 30, W + 200, y + 30], fill=(170, 190, 200, 26))
    img.alpha_composite(mist.filter(ImageFilter.GaussianBlur(12)))

    # The jammed wheels: turning, slowing, stopping with a jolt.
    if 4.5 < t < 10.8:
        k = ease((t - 4.5) / 0.8) * (1 - ease((t - 10.0) / 0.8))
        stop = 7.4
        spin = (min(t, stop) - 4.5) * 1.4 - max(0, t - stop) * 0
        jolt = math.sin((t - stop) * 40) * 0.04 * math.exp(-(t - stop) * 4) if t > stop else 0
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dim = Image.new('RGBA', (W, H), (8, 10, 16, int(170 * k)))
        layer.alpha_composite(dim)
        for (x, y, r, teeth, sign) in ((330, 250, 110, 12, 1), (520, 200, 70, 8, -1), (610, 330, 90, 10, -1)):
            g = gear(r, teeth, (63, 122, 110, 255), sign * spin * (110 / r) + jolt)
            layer.alpha_composite(g, (int(x - g.width / 2), int(y - g.height / 2)))
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * k)))
        img.alpha_composite(layer)

    # The speaking tube: a bronze horn on a post, its mouth glowing with each word.
    if 9.8 < t < 15.0:
        k = ease((t - 9.8) / 0.6) * (1 - ease((t - 14.4) / 0.6))
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rectangle([0, 0, W, H], fill=(8, 10, 16, 150))
        ld.rectangle([462, 250, 478, 470], fill=(63, 122, 110, 255))
        ld.polygon([(470, 250), (540, 170), (560, 200), (478, 262)], fill=(86, 160, 140, 255))
        glow = 0.5 + 0.5 * math.sin(t * 9)
        ld.ellipse([520, 150, 590, 220], fill=(255, 210, 120, int(120 * glow)))
        for ring in range(3):
            r = 40 + ((t * 60 + ring * 30) % 90)
            ld.arc([555 - r, 185 - r, 555 + r, 185 + r], 300, 40, fill=(255, 220, 150, int(160 * (1 - r / 130))), width=3)
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * k)))
        img.alpha_composite(layer)

    # The crossbow, drawn, its string pulled back.
    if 14.2 < t < 19.0:
        k = ease((t - 14.2) / 0.6) * (1 - ease((t - 18.4) / 0.6))
        pull = ease((t - 14.8) / 2.2)
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rectangle([0, 0, W, H], fill=(8, 10, 16, 150))
        ld.rectangle([360, 262, 620, 286], fill=(140, 96, 56, 255))
        ld.rectangle([340, 254, 380, 294], fill=(43, 38, 34, 255))
        ld.arc([500, 150, 640, 400], 300, 60, fill=(168, 50, 42, 255), width=12)
        sx = 600 - pull * 110
        ld.line([(612, 168), (sx, 274), (612, 382)], fill=(240, 226, 192, 255), width=3)
        ld.ellipse([sx - 9, 265, sx + 9, 283], fill=(160, 170, 180, 255))
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * k)))
        img.alpha_composite(layer)

    # The title.
    if t > 18.6:
        k = ease((t - 18.6) / 1.0) * (1 - ease((t - 21.2) / 0.8))
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rectangle([0, 0, W, H], fill=(8, 10, 16, 160))
        big = ImageFont.truetype(SERIF, 92)
        small = ImageFont.truetype(SANS, 26)
        title = '千机巧匠'
        w = ld.textlength(title, font=big)
        ld.text(((W - w) / 2 + 3, 182 + 3), title, font=big, fill=(20, 12, 8, 255))
        ld.text(((W - w) / 2, 182), title, font=big, fill=(236, 196, 110, 255))
        sub = 'MECHANISM CITY'
        w = ld.textlength(sub, font=small)
        ld.text(((W - w) / 2, 300), sub, font=small, fill=(220, 210, 190, 255))
        ld.rectangle([W / 2 - 120, 340, W / 2 + 120, 342], fill=(168, 50, 42, 255))
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * k)))
        img.alpha_composite(layer)

    for start, end, line in LINES:
        alpha = ease((t - start) / 0.5) * (1 - ease((t - end + 0.5) / 0.5))
        if alpha > 0:
            img.alpha_composite(text_layer(line, alpha))
    # Fade in from black and out to black.
    fade = min(ease(t / 0.8), 1 - ease((t - LENGTH + 0.8) / 0.8))
    if fade < 1:
        img = Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 255)), img, fade)
    return img.convert('RGB')


def main():
    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg is needed to encode the film')
    MEDIA.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as work:
        count = int(LENGTH * FPS)
        for i in range(count):
            frame(i / FPS).save(f'{work}/f{i:04d}.png')
        common = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{work}/f%04d.png']
        subprocess.run(common + ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-an', str(MEDIA / 'intro.mp4')], check=True)
        subprocess.run(common + ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '40', '-row-mt', '1', '-an', str(MEDIA / 'intro.webm')], check=True)
        frame(19.8).save(MEDIA / 'intro-poster.jpg', quality=82)
    for name in ('intro.mp4', 'intro.webm'):
        print(name, (MEDIA / name).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
