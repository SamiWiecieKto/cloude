"""Generate featured images for blog posts.

Primary method: OpenAI DALL-E 3 (if OPENAI_API_KEY is set).
Fallback:       Pillow — a stylish gradient card with the title.
"""

from __future__ import annotations

import os
import re
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_image(title: str, content_excerpt: str = "", output_path: str = "featured.png") -> str:
    """Generate a featured image and save it to *output_path*. Returns the path."""
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            return _generate_with_openai(title, content_excerpt, output_path, openai_key)
        except Exception as exc:
            # Graceful degradation to Pillow
            print(f"    [OpenAI image generation failed: {exc} — using built-in fallback]")

    return _generate_with_pillow(title, output_path)


# ---------------------------------------------------------------------------
# OpenAI DALL-E 3
# ---------------------------------------------------------------------------


def _generate_with_openai(
    title: str, content_excerpt: str, output_path: str, api_key: str
) -> str:
    import openai
    import requests as req_lib

    client = openai.OpenAI(api_key=api_key)

    # Build a prompt from the title + first ~200 chars of content
    excerpt_clean = re.sub(r"<[^>]+>", "", content_excerpt)[:200].strip()
    prompt = (
        f"Professional blog article featured image. Topic: '{title}'. "
        f"Context: {excerpt_clean}. "
        "Modern, clean, no text overlay, high-quality photography or illustration style."
    )

    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1792x1024",
        quality="standard",
        n=1,
    )

    image_url = response.data[0].url
    img_bytes = req_lib.get(image_url, timeout=60).content
    with open(output_path, "wb") as f:
        f.write(img_bytes)
    return output_path


# ---------------------------------------------------------------------------
# Pillow fallback
# ---------------------------------------------------------------------------

# A handful of pleasant gradient palettes (top-color, bottom-color, accent)
_PALETTES = [
    ((15, 32, 90), (60, 20, 100), (99, 102, 241)),    # indigo-purple
    ((10, 60, 50), (20, 100, 80), (52, 211, 153)),     # emerald
    ((80, 20, 10), (120, 50, 10), (251, 146, 60)),     # orange-warm
    ((10, 30, 70), (20, 60, 120), (56, 189, 248)),     # sky-blue
    ((50, 10, 50), (90, 20, 80), (232, 121, 249)),     # fuchsia
]


def _pick_palette(title: str):
    """Deterministically pick a palette based on title content."""
    idx = sum(ord(c) for c in title) % len(_PALETTES)
    return _PALETTES[idx]


def _load_best_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _generate_with_pillow(title: str, output_path: str) -> str:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    top_col, bot_col, accent = _pick_palette(title)

    # Vertical gradient background
    for y in range(H):
        t = y / H
        r = int(top_col[0] + (bot_col[0] - top_col[0]) * t)
        g = int(top_col[1] + (bot_col[1] - top_col[1]) * t)
        b = int(top_col[2] + (bot_col[2] - top_col[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Subtle diagonal decorative band
    band_color = tuple(min(255, c + 20) for c in bot_col)
    points = [(0, H * 0.55), (W, H * 0.40), (W, H * 0.55), (0, H * 0.70)]
    draw.polygon(points, fill=band_color)

    # Bottom accent bar
    draw.rectangle([0, H - 10, W, H], fill=accent)

    # Accent dot cluster (top-right)
    for i in range(3):
        cx = W - 80 - i * 30
        cy = 80 + i * 20
        r_size = 8 - i * 2
        draw.ellipse(
            [cx - r_size, cy - r_size, cx + r_size, cy + r_size],
            fill=accent,
        )

    # Title text
    font_title = _load_best_font(58)
    font_sub = _load_best_font(26)

    wrapped_lines = textwrap.wrap(title, width=26)
    line_height = 72
    total_h = len(wrapped_lines) * line_height
    start_y = (H - total_h) // 2 - 30

    for i, line in enumerate(wrapped_lines):
        bbox = draw.textbbox((0, 0), line, font=font_title)
        text_w = bbox[2] - bbox[0]
        x = (W - text_w) // 2
        y = start_y + i * line_height

        # Drop shadow
        draw.text((x + 3, y + 3), line, font=font_title, fill=(0, 0, 0, 120))
        # Main text
        draw.text((x, y), line, font=font_title, fill=(255, 255, 255))

    # Thin decorative line below title
    line_y = start_y + total_h + 16
    draw.rectangle([W // 2 - 60, line_y, W // 2 + 60, line_y + 3], fill=accent)

    # Subtle "BLOG" label top-left
    label = "BLOG POST"
    bbox = draw.textbbox((0, 0), label, font=font_sub)
    draw.text((40, 36), label, font=font_sub, fill=(*accent, 200))

    img.save(output_path, "PNG", optimize=True)
    return output_path
