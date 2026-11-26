# 绘制地形图集：8 列 4 行，每格 32 像素，次序对应 src/levels/tiles.mjs。
# Paint the terrain atlas in the order of src/levels/tiles.mjs. Each tile is drawn at 4x and downsampled.
#
#   python3 tools/paint-tiles.py
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

TILE, COLUMNS, ROWS, K = 32, 8, 4, 4
S = TILE * K
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'levels' / 'terrain.png'

STONE = (76, 91, 85)
MORTAR = (36, 48, 47)
MOSS = (115, 132, 81)
CEDAR = (121, 76, 47)
TIMBER = (60, 42, 33)
LACQUER = (129, 54, 40)
BRONZE = (151, 110, 63)
PATINA = (63, 101, 88)
GOLD = (201, 152, 84)
PLASTER = (36, 46, 48)


def tint(color, shift):
    return tuple(max(0, min(255, channel + shift)) for channel in color)


def blend(first, second, amount):
    return tuple(round(a + (b - a) * amount) for a, b in zip(first, second))


def tile(top, bottom):
    image = Image.new('RGBA', (S, S))
    draw = ImageDraw.Draw(image)
    for y in range(S):
        draw.line((0, y, S - 1, y), fill=blend(top, bottom, y / (S - 1)))
    return image


def grain(draw, rng, color, count, box, *, length, variation):
    left, top, right, bottom = box
    for _ in range(count):
        x, y = rng.uniform(left, right), rng.uniform(top, bottom)
        shift = rng.choice((-variation, variation))
        draw.line((x, y, min(right, x + rng.uniform(1, length)), y + rng.randint(-2, 2)),
                  fill=tint(color, shift), width=rng.choice((1, 1, 2)))


def rivet(draw, x, y, r, color):
    draw.ellipse((x - r, y - r + 1, x + r + 1, y + r + 2), fill=tint(color, -45))
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color)
    draw.point((x - r / 2, y - r / 2), fill=tint(color, 50))


def stone(seed, top=False, left=False, right=False, dark=False):
    """Two aligned stone courses, with a picked edge and moss along the exposed cap."""
    rng = random.Random(seed)
    base = tint(STONE, -8 if dark else 0)
    image = tile(tint(base, 11), tint(base, -13))
    draw = ImageDraw.Draw(image)
    half = S // 2
    for y in (0, half):
        joint = rng.randrange(31, 98)
        skew = rng.randrange(-8, 9)
        face = tint(base, rng.randrange(-9, 12))
        draw.polygon(((0, y + 4), (joint - 2, y + 4), (joint + skew - 2, y + half - 3),
                      (0, y + half - 3)), fill=face)
        draw.line((joint, y + 1, joint + skew, y + half - 1), fill=MORTAR, width=4)
        draw.line((joint + 4, y + 2, joint + skew + 4, y + half - 2), fill=tint(base, 15), width=2)
        draw.line((0, y + 1, S, y + 1), fill=MORTAR, width=4)
        draw.line((0, y + 5, S, y + 5), fill=tint(base, 19), width=2)
        grain(draw, rng, base, 38, (0, y + 10, S, y + half - 5), length=18, variation=12)

    if left or right:
        edge = 3 if left else S - 4
        shade = 10 if left else -10
        draw.line((edge, 0, edge, S), fill=MORTAR, width=8)
        draw.line((edge + shade / 2, 0, edge + shade / 2, S), fill=tint(base, shade), width=4)
    if top:
        draw.rectangle((0, 0, S, 11), fill=tint(MOSS, 8))
        draw.line((0, 1, S, 1), fill=tint(MOSS, 43), width=3)
        draw.line((0, 11, S, 11), fill=tint(base, -26), width=3)
        for x in range(0, S, 8):
            depth = rng.randrange(7, 21)
            draw.polygon(((x - 5, 4), (x + 8, 3), (x + 4, depth), (x, depth - 2)),
                         fill=tint(MOSS, rng.choice((-15, -5, 6, 16))))
        grain(draw, rng, MOSS, 35, (0, 1, S, 16), length=10, variation=22)
    return image


def beam(top):
    """Cedar planks with a lit edge, dark joinery, and forged pegs."""
    rng = random.Random(7 if top else 8)
    image = tile(tint(CEDAR, 16 if top else 1), tint(CEDAR, -23))
    draw = ImageDraw.Draw(image)
    for y in range(9, S - 8, 7):
        for _ in range(3):
            x = rng.randint(-12, S - 20)
            end = min(S, x + rng.randint(15, 75))
            draw.line((x, y, (x + end) / 2, y + rng.randint(-4, 4), end, y),
                      fill=tint(CEDAR, rng.choice((-31, -14, 12, 23))), width=rng.randint(1, 3))
    draw.rectangle((0, 0, S, 6), fill=tint(CEDAR, 37 if top else -19))
    draw.rectangle((0, S - 7, S, S), fill=TIMBER)
    for x in (10, S - 11):
        draw.rectangle((x - 4, 7, x + 4, S - 7), fill=tint(CEDAR, -20))
        draw.line((x - 4, 7, x - 4, S - 7), fill=tint(CEDAR, 21), width=2)
        for y in (25, S - 26):
            rivet(draw, x, y, 4, tint(BRONZE, 12))
    return image


def bronze():
    """Brushed cast bronze with verdigris at the edges and a square thunder engraving."""
    rng = random.Random(19)
    image = tile(tint(BRONZE, 22), tint(BRONZE, -35))
    draw = ImageDraw.Draw(image)
    grain(draw, rng, BRONZE, 110, (1, 2, S - 1, S - 3), length=37, variation=15)
    draw.rectangle((4, 4, S - 5, S - 6), outline=tint(BRONZE, -61), width=5)
    draw.rectangle((9, 9, S - 10, S - 11), outline=PATINA, width=4)
    draw.line((12, 3, S - 12, 3), fill=tint(BRONZE, 38), width=3)
    for x in (19, S - 20):
        for y in (19, S - 20):
            rivet(draw, x, y, 5, GOLD)

    for x, y, direction in ((30, 45, 1), (S - 30, S - 45, -1)):
        design = [(0, 0), (40, 0), (40, 24), (13, 24), (13, 10), (30, 10), (30, 16)]
        line = [(x + direction * dx, y + direction * dy) for dx, dy in design]
        draw.line([(px + 1, py + 2) for px, py in line], fill=tint(GOLD, 9), width=3)
        draw.line(line, fill=tint(BRONZE, -48), width=4)
    return image


def wall(dark=False, window=False):
    """Low-contrast clay plaster with a cedar bay post or a recessed window."""
    rng = random.Random(31 if dark else 32)
    image = tile(tint(PLASTER, 3), tint(PLASTER, -6))
    draw = ImageDraw.Draw(image)
    grain(draw, rng, PLASTER, 68, (1, 1, S - 2, S - 3), length=27, variation=7)
    draw.rectangle((0, S - 17, S, S - 10), fill=tint(TIMBER, -5))
    draw.line((0, S - 17, S, S - 17), fill=tint(TIMBER, 13), width=2)
    if dark:
        draw.rectangle((0, 0, 15, S), fill=TIMBER)
        draw.line((14, 0, 14, S), fill=tint(TIMBER, 14), width=3)
    if window:
        draw.rectangle((19, 21, S - 19, S - 32), fill=tint(TIMBER, -16))
        draw.rectangle((26, 27, S - 26, S - 39), fill=(101, 73, 49))
        draw.line((23, S - 31, S - 22, S - 31), fill=tint(CEDAR, -8), width=3)
        for x in (44, 64, 84):
            draw.line((x, 26, x, S - 37), fill=tint(TIMBER, -4), width=4)
        for y in (46, 68):
            draw.line((25, y, S - 25, y), fill=tint(TIMBER, -4), width=4)
    return image


def lantern():
    """Ribbed cinnabar paper with a soft pool of warm light."""
    image = wall()
    draw = ImageDraw.Draw(image)
    draw.line((64, 0, 64, 23), fill=tint(TIMBER, -15), width=4)
    draw.ellipse((32, 21, 96, 101), fill=tint(LACQUER, -32))
    draw.rounded_rectangle((35, 25, 93, 96), radius=24, fill=LACQUER)
    draw.ellipse((47, 29, 81, 92), fill=(180, 80, 49))
    draw.ellipse((56, 37, 72, 83), fill=(198, 111, 63))
    for x in (46, 80):
        draw.line((64 + (x - 64) * 0.35, 28, x, 46, x, 75, 64 + (x - 64) * 0.45, 94),
                  fill=tint(LACQUER, -22), width=2)
    draw.rectangle((46, 20, 82, 26), fill=GOLD)
    draw.rectangle((48, 95, 80, 102), fill=tint(GOLD, -20))
    draw.line((64, 103, 64, 119), fill=GOLD, width=4)
    return image


def banner(top):
    """The city's carpenter-square and compass crest, on a two-cell cloth banner."""
    image = wall(dark=True)
    draw = ImageDraw.Draw(image)
    start = 15 if top else 0
    end = S if top else S - 22
    draw.rectangle((28, start, 100, end), fill=LACQUER)
    draw.rectangle((28, start, 37, end), fill=tint(LACQUER, -18))
    draw.rectangle((86, start, 100, end), fill=tint(LACQUER, -15))
    for x in (37, 91):
        draw.line((x, start, x, end - 4), fill=tint(GOLD, -17), width=3)
    if top:
        draw.rectangle((21, 10, 107, 18), fill=tint(BRONZE, -23))
        draw.line((46, 46, 46, 97, 83, 97), fill=GOLD, width=5)
        draw.line((60, 83, 72, 47, 86, 83), fill=GOLD, width=4)
        draw.arc((53, 51, 91, 90), 18, 161, fill=GOLD, width=3)
    else:
        draw.line((28, end - 4, 100, end - 4), fill=tint(GOLD, -17), width=3)
        for x in range(29, 98, 9):
            draw.polygon(((x, end), (x + 3, end + 14), (x + 6, end)), fill=tint(LACQUER, -12))
    return image


def gear():
    """A dark copper wheel recessed into the wall, with worn teeth and a warm hub."""
    image = wall()
    draw = ImageDraw.Draw(image)
    center, radius = S / 2, 43
    metal = tint(BRONZE, -31)
    for i in range(8):
        angle = i * math.pi / 4
        tooth = [(angle - 0.2, radius), (angle - 0.13, radius + 9),
                 (angle + 0.13, radius + 9), (angle + 0.2, radius)]
        draw.polygon([(center + math.cos(a) * r, center + math.sin(a) * r) for a, r in tooth], fill=metal)
    outer = (center - radius, center - radius, center + radius, center + radius)
    draw.ellipse(outer, outline=metal, width=9)
    draw.arc(outer, 180, 290, fill=tint(BRONZE, -4), width=2)
    for i in range(6):
        angle = i * math.tau / 6
        draw.line((center, center, center + math.cos(angle) * (radius - 4),
                   center + math.sin(angle) * (radius - 4)), fill=metal, width=7)
    rivet(draw, center, center, 10, tint(BRONZE, -14))
    return image


ORDER = [
    stone(1, top=True), stone(2), stone(3, dark=True), stone(4, top=True, left=True), stone(5, top=True, right=True),
    beam(True), beam(False), bronze(),
    wall(), wall(dark=True), wall(window=True), lantern(), banner(True), banner(False), gear(),
]

sheet = Image.new('RGBA', (COLUMNS * TILE, ROWS * TILE))
for index, art in enumerate(ORDER):
    small = art.resize((TILE, TILE), Image.Resampling.LANCZOS)
    sheet.paste(small, ((index % COLUMNS) * TILE, (index // COLUMNS) * TILE))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT, optimize=True)
print('wrote', OUT.relative_to(ROOT), sheet.size)
