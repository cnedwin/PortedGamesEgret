# 画地形图块：levels/terrain.png，8 列 4 行，每格 32 像素。
# Paints the terrain tileset, levels/terrain.png: 8 columns by 4 rows of 32-pixel tiles, in the order of
# src/levels/tiles.mjs. Every stroke is drawn here; nothing is copied from elsewhere. Each tile is painted at
# four times its size and scaled down, so its edges are soft.
#
#   python3 tools/paint-tiles.py
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

TILE, COLUMNS, ROWS, K = 32, 8, 4, 4
S = TILE * K
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'levels' / 'terrain.png'

STONE = (86, 92, 88)
STONE_DARK = (58, 63, 62)
STONE_LIGHT = (126, 132, 120)
MOSS = (92, 120, 74)
MOSS_LIGHT = (140, 168, 98)
WOOD = (118, 78, 46)
WOOD_DARK = (78, 50, 30)
WOOD_LIGHT = (160, 112, 64)
BRONZE = (64, 118, 108)
BRONZE_DARK = (36, 74, 70)
BRONZE_LIGHT = (128, 176, 150)
PLASTER = (30, 38, 52)
PLASTER_DARK = (22, 28, 40)
TIMBER = (60, 34, 26)
RED = (168, 44, 36)
GOLD = (222, 176, 92)


def tile():
    return Image.new('RGBA', (S, S), (0, 0, 0, 0))


def speckle(draw, rng, colour, count, size, box=(0, 0, S, S)):
    for _ in range(count):
        x = rng.uniform(box[0], box[2])
        y = rng.uniform(box[1], box[3])
        r = rng.uniform(size * 0.4, size)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=colour)


def stone(seed, top=False, left=False, right=False, dark=False):
    """Dressed stone in courses, the joints a little uneven; moss along an open top."""
    rng = random.Random(seed)
    img = tile()
    d = ImageDraw.Draw(img)
    base = STONE_DARK if dark else STONE
    d.rectangle([0, 0, S, S], fill=base)
    speckle(d, rng, tuple(c + 10 for c in base), 40, 7)
    speckle(d, rng, tuple(c - 12 for c in base), 30, 6)
    # Two courses, the joint of the second offset.
    joint = (34, 38, 38)
    d.line([0, S // 2, S, S // 2], fill=joint, width=5)
    off = rng.randint(S // 4, S * 3 // 4)
    d.line([off, 0, off, S // 2], fill=joint, width=5)
    d.line([(off + S // 2) % S, S // 2, (off + S // 2) % S, S], fill=joint, width=5)
    # A light edge on each stone, where the moon catches it.
    d.line([0, S // 2 + 4, S, S // 2 + 4], fill=tuple(c + 18 for c in base), width=2)
    if top:
        d.rectangle([0, 0, S, 14], fill=STONE_LIGHT)
        for x in range(0, S, 6):
            h = rng.randint(10, 26)
            d.ellipse([x - 7, -h * 0.6, x + 9, h], fill=MOSS)
        for x in range(0, S, 11):
            d.ellipse([x - 4, 0, x + 6, rng.randint(6, 14)], fill=MOSS_LIGHT)
    if left:
        d.rectangle([0, 0, 10, S], fill=tuple(c - 14 for c in base))
        d.line([10, 0, 10, S], fill=STONE_LIGHT, width=3)
    if right:
        d.rectangle([S - 10, 0, S, S], fill=tuple(c - 20 for c in base))
    return img


def beam(top):
    """A squared beam of pine, its grain running along it, pegged at both ends."""
    rng = random.Random(7 if top else 8)
    img = tile()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, S, S], fill=WOOD)
    for y in range(4, S, 9):
        d.line([0, y + rng.randint(-2, 2), S, y + rng.randint(-2, 2)], fill=WOOD_DARK if rng.random() < 0.5 else WOOD_LIGHT, width=2)
    d.rectangle([0, 0, S, 6], fill=WOOD_LIGHT if top else WOOD_DARK)
    d.rectangle([0, S - 6, S, S], fill=WOOD_DARK)
    for x in (16, S - 20):
        d.ellipse([x - 7, S // 2 - 7, x + 7, S // 2 + 7], fill=WOOD_DARK)
        d.ellipse([x - 4, S // 2 - 4, x + 3, S // 2 + 3], fill=GOLD)
    return img


def bronze():
    """Cast bronze, green with age, a band of cloud scrolls across it."""
    img = tile()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, S, S], fill=BRONZE)
    d.rectangle([6, 6, S - 6, S - 6], outline=BRONZE_DARK, width=6)
    for i in range(3):
        cx = 22 + i * 42
        d.arc([cx - 16, 44, cx + 16, 84], 180, 360, fill=BRONZE_LIGHT, width=5)
        d.arc([cx - 8, 56, cx + 8, 72], 0, 180, fill=BRONZE_LIGHT, width=4)
    return img


def wall(dark=False, window=False):
    """The wall of a hall: plaster between posts and a rail, seen far back in the dark."""
    img = tile()
    d = ImageDraw.Draw(img)
    rng = random.Random(31 if dark else 32)
    d.rectangle([0, 0, S, S], fill=PLASTER)
    speckle(d, rng, PLASTER_DARK, 18, 9)
    # A post at the left of the bay where `dark` asks for one, and the rail across every bay.
    if dark:
        d.rectangle([0, 0, 14, S], fill=TIMBER)
        d.line([14, 0, 14, S], fill=(84, 52, 38), width=2)
    d.rectangle([0, S - 18, S, S - 10], fill=TIMBER)
    if window:
        d.rectangle([24, 18, S - 14, S - 34], fill=(70, 58, 34))
        # A lattice of squares, warm light behind it.
        for i in range(1, 5):
            x = 24 + i * (S - 38) / 5
            d.line([x, 18, x, S - 34], fill=TIMBER, width=4)
            y = 18 + i * (S - 52) / 5
            d.line([24, y, S - 14, y], fill=TIMBER, width=4)
        d.rectangle([24, 18, S - 14, S - 34], outline=TIMBER, width=6)
    return img


def lantern():
    """A paper lantern hung from the wall: red, warm in the middle, gold at its ends."""
    img = wall()
    d = ImageDraw.Draw(img)
    d.line([S // 2, 0, S // 2, 24], fill=(30, 20, 16), width=4)
    d.rectangle([S // 2 - 22, 22, S // 2 + 22, 30], fill=GOLD)
    d.ellipse([S // 2 - 34, 26, S // 2 + 34, 104], fill=RED)
    d.ellipse([S // 2 - 18, 40, S // 2 + 18, 92], fill=(236, 120, 70))
    for x in (-20, 0, 20):
        d.line([S // 2 + x, 30, S // 2 + x * 0.7, 100], fill=(120, 30, 24), width=3)
    d.rectangle([S // 2 - 22, 100, S // 2 + 22, 108], fill=GOLD)
    d.line([S // 2, 108, S // 2, 124], fill=GOLD, width=4)
    return img


def banner(top):
    """A long red banner in two tiles, a gold border and a mark of the city: the square and the compass."""
    img = wall(dark=True)
    d = ImageDraw.Draw(img)
    d.rectangle([28, 0 if not top else 14, S - 28, S], fill=RED)
    d.line([34, 0 if not top else 20, 34, S], fill=GOLD, width=3)
    d.line([S - 34, 0 if not top else 20, S - 34, S], fill=GOLD, width=3)
    if top:
        d.rectangle([20, 6, S - 20, 16], fill=TIMBER)
        # A carpenter's square and a compass: the tools of the craft, in gold.
        d.line([46, 44, 46, 96, 92, 96], fill=GOLD, width=6)
        d.arc([52, 34, 92, 74], 200, 340, fill=GOLD, width=5)
        d.line([72, 36, 60, 80], fill=GOLD, width=4)
        d.line([72, 36, 84, 80], fill=GOLD, width=4)
    else:
        for i, x in enumerate(range(36, S - 30, 14)):
            d.polygon([(x, S - 24), (x + 7, S - 4), (x + 14, S - 24)], fill=RED if i % 2 else (140, 32, 28))
        d.rectangle([28, S - 30, S - 28, S - 24], fill=GOLD)
    return img


def gear():
    """A bronze wheel set into the wall, with eight teeth."""
    img = wall()
    d = ImageDraw.Draw(img)
    c, r = S / 2, 46
    for i in range(8):
        a = i * math.pi / 4
        d.polygon([(c + math.cos(a - 0.18) * r, c + math.sin(a - 0.18) * r), (c + math.cos(a - 0.12) * (r + 12), c + math.sin(a - 0.12) * (r + 12)), (c + math.cos(a + 0.12) * (r + 12), c + math.sin(a + 0.12) * (r + 12)), (c + math.cos(a + 0.18) * r, c + math.sin(a + 0.18) * r)], fill=BRONZE)
    d.ellipse([c - r, c - r, c + r, c + r], fill=BRONZE)
    d.ellipse([c - r + 10, c - r + 10, c + r - 10, c + r - 10], fill=BRONZE_DARK)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        d.line([c, c, c + math.cos(a) * (r - 10), c + math.sin(a) * (r - 10)], fill=BRONZE, width=8)
    d.ellipse([c - 10, c - 10, c + 10, c + 10], fill=BRONZE_LIGHT)
    return img


ORDER = [
    stone(1, top=True), stone(2), stone(3, dark=True), stone(4, top=True, left=True), stone(5, top=True, right=True),
    beam(True), beam(False), bronze(),
    wall(), wall(dark=True), wall(window=True), lantern(), banner(True), banner(False), gear(),
]

sheet = Image.new('RGBA', (COLUMNS * TILE, ROWS * TILE), (0, 0, 0, 0))
for index, art in enumerate(ORDER):
    small = art.filter(ImageFilter.GaussianBlur(0.6)).resize((TILE, TILE), Image.LANCZOS)
    sheet.paste(small, ((index % COLUMNS) * TILE, (index // COLUMNS) * TILE))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT, optimize=True)
print('wrote', OUT.relative_to(HERE.parent), sheet.size)
