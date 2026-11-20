"""Build the silent opening film from the game's paintings, using Pillow and FFmpeg."""

import argparse
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 960, 540
FPS, DURATION = 24, 22
GAME = Path(__file__).resolve().parents[1]
MEDIA = GAME / "media"

SANS_FONTS = (
    "C:/Windows/Fonts/msyh.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/PingFang.ttc",
)
SERIF_FONTS = (
    "C:/Windows/Fonts/NotoSerifSC-VF.ttf",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "C:/Windows/Fonts/simsun.ttc",
)


@dataclass(frozen=True)
class Shot:
    at: float
    painting: str
    first: tuple[float, float, float]
    last: tuple[float, float, float]
    dissolve: float = 0.7


GATE = "art/illustrations/gate.webp"
HEART = "art/illustrations/heart.webp"
WATERWORKS = "art/scenery/waterworks.jpg"

# Each camera pose gives the zoom and horizontal/vertical positions within the crop travel.
SHOTS = (
    Shot(0.0, GATE, (1.02, 0.22, 0.44), (1.18, 0.84, 0.54)),
    Shot(4.58, HEART, (1.13, 0.52, 0.45), (1.34, 0.54, 0.48)),
    Shot(7.93, WATERWORKS, (1.15, 0.43, 0.90), (1.12, 0.66, 0.82), 0.6),
    Shot(9.70, HEART, (1.46, 0.06, 0.58), (1.62, 0.02, 0.60)),
    Shot(14.15, GATE, (1.68, 0.91, 0.72), (1.48, 0.90, 0.66)),
    Shot(18.28, GATE, (1.08, 0.23, 0.51), (1.05, 0.31, 0.45), 0.8),
)


def ease(value):
    value = min(1.0, max(0.0, value))
    return value * value * (3 - 2 * value)


def find_font(option, choices):
    if option:
        if option.is_file():
            return option
        raise SystemExit(f"Font file does not exist: {option}")
    for path in map(Path, choices):
        if path.is_file():
            return path
    raise SystemExit("Install a CJK font or pass its location with --sans and --serif.")


def load_lines():
    story = (GAME / "src/story.mjs").read_text(encoding="utf-8")
    table = story.split("export const INTRO_LINES = [", 1)[1].split("];", 1)[0]
    lines = [(float(start), caption) for start, caption in re.findall(r"\[\s*([\d.]+),\s*'([^']+)'\s*\]", table)]
    if len(lines) != 5:
        raise SystemExit("Expected four captions and a closing title in INTRO_LINES.")
    return lines


def caption_layer(text, font):
    layer = Image.new("RGBA", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(layer)
    for y in range(412, HEIGHT):
        alpha = round(186 * ease((y - 412) / 66))
        draw.line((0, y, WIDTH, y), fill=(13, 21, 22, alpha))
    draw.text((WIDTH // 2, 478), text, font=font, anchor="mm", fill="#ffedc9",
              stroke_width=1, stroke_fill="#172122")
    return layer


def title_layer(text, serif, sans):
    title, subtitle = text.split(" · ", 1)
    layer = Image.new("RGBA", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(layer)
    # The left side of the painting is mist and leaves the character and city visible.
    draw.text((56, 192), title, font=serif, anchor="lt", fill="#f9dfaa",
              stroke_fill="#273035", stroke_width=1)
    draw.line((61, 286, 123, 286), fill="#c36b50", width=2)
    draw.text((61, 307), subtitle.upper(), font=sans, anchor="lt", fill="#eadcbb")
    return layer


def composite(image, layer, opacity):
    result = image.convert("RGBA")
    if opacity < 1:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda value: round(value * opacity)))
    return Image.alpha_composite(result, layer).convert("RGB")


def camera(painting, shot, end, at):
    travel = ease((at - shot.at) / (end - shot.at))
    zoom, across, down = [first + (last - first) * travel for first, last in zip(shot.first, shot.last)]
    scale = min(painting.width / WIDTH, painting.height / HEIGHT) / zoom
    x = (painting.width - WIDTH * scale) * across
    y = (painting.height - HEIGHT * scale) * down
    return painting.transform((WIDTH, HEIGHT), Image.Transform.AFFINE, (scale, 0, x, 0, scale, y), Image.Resampling.BICUBIC)


def render_film(sans_path, serif_path):
    paintings = {}
    for painting in {shot.painting for shot in SHOTS}:
        with Image.open(GAME / painting) as image:
            paintings[painting] = image.convert("RGB")
    lines = load_lines()
    sans = ImageFont.truetype(str(sans_path), 25)
    serif = ImageFont.truetype(str(serif_path), 75)
    if serif_path.name.endswith("-VF.ttf"):
        serif.set_variation_by_name("Bold")
    captions = [(start, end, caption_layer(text, sans)) for (start, text), end in zip(lines[:-1], (4.6, 9.6, 14.1, 18.2))]
    title_at, title = lines[-1]
    last_title = title_layer(title, serif, ImageFont.truetype(str(sans_path), 21))
    black = Image.new("RGB", (WIDTH, HEIGHT))

    def render(at):
        index = max(i for i, shot in enumerate(SHOTS) if shot.at <= at)
        shot = SHOTS[index]
        next_shot = SHOTS[index + 1] if index + 1 < len(SHOTS) else None
        end = next_shot.at + next_shot.dissolve if next_shot else DURATION
        image = camera(paintings[shot.painting], shot, end, at)
        if index and at - shot.at < shot.dissolve:
            previous = SHOTS[index - 1]
            outgoing = camera(paintings[previous.painting], previous, shot.at + shot.dissolve, at)
            image = Image.blend(outgoing, image, ease((at - shot.at) / shot.dissolve))
        for start, finish, layer in captions:
            if start <= at < finish:
                image = composite(image, layer, min(ease((at - start) / 0.42), ease((finish - at) / 0.35)))
        if at >= title_at:
            image = composite(image, last_title, ease((at - title_at) / 0.85))
        return Image.blend(black, image, min(ease(at / 0.8), ease((DURATION - at) / 0.8)))

    return render


def encode(ffmpeg, render, output):
    common = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error"]
    h264 = ["-c:v", "libx264", "-profile:v", "baseline", "-level:v", "3.1", "-crf", "25", "-maxrate", "675k",
            "-bufsize", "940k", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"]
    vp9 = ["-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-b:v", "620k", "-maxrate", "710k", "-bufsize", "1050k",
           "-crf", "34", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-an"]
    raw = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-video_size", f"{WIDTH}x{HEIGHT}", "-framerate", str(FPS), "-i", "-"]
    command = common + raw + h264 + [str(output / "intro.mp4")] + vp9 + [str(output / "intro.webm")]
    with subprocess.Popen(command, stdin=subprocess.PIPE) as process:
        for number in range(FPS * DURATION):
            process.stdin.write(render(number / FPS).tobytes())
        process.stdin.close()
        if process.wait():
            raise SystemExit("FFmpeg could not encode the opening film.")
    render(19.8).save(output / "intro-poster.jpg", quality=88, optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default="ffmpeg", help="FFmpeg executable or its name on PATH")
    parser.add_argument("--sans", type=Path, help="CJK subtitle font")
    parser.add_argument("--serif", type=Path, help="CJK title font")
    options = parser.parse_args()
    ffmpeg = shutil.which(options.ffmpeg)
    if not ffmpeg:
        raise SystemExit("FFmpeg is required. Install it on PATH or pass --ffmpeg.")
    render = render_film(find_font(options.sans, SANS_FONTS), find_font(options.serif, SERIF_FONTS))
    MEDIA.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=MEDIA) as temporary:
        output = Path(temporary)
        encode(ffmpeg, render, output)
        for name in ("intro.mp4", "intro.webm", "intro-poster.jpg"):
            destination = MEDIA / name
            (output / name).replace(destination)
            print(f"{name}: {destination.stat().st_size // 1024} KiB")


if __name__ == "__main__":
    main()
