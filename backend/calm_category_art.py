"""Slice the approved new ceramic artwork and upload immutable WebP assets.

Run `python calm_category_art.py` to print a manifest. Originals stay untouched.
The same deterministic pipeline is used by restore_category_art after a fork.
"""
import hashlib
import io
import json
from pathlib import Path
from statistics import median

import requests
from dotenv import load_dotenv
from PIL import Image, ImageChops, ImageOps

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

from storage import put_object  # noqa: E402


def read_image(url: str) -> Image.Image:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return ImageOps.exif_transpose(Image.open(io.BytesIO(response.content))).convert("RGB")


def encode_icon(image: Image.Image) -> bytes:
    # Match the studio background to the app's constant artwork surface. This
    # removes JPEG background offsets, not the newly generated sculptural detail.
    corners = [image.getpixel((x, y)) for x in (2, image.width - 3) for y in (2, image.height - 3)]
    background = tuple(int(median(c[channel] for c in corners)) for channel in range(3))
    image = ImageChops.subtract(image, Image.new("RGB", image.size, background))
    image = ImageChops.add(image, Image.new("RGB", image.size, (5, 7, 12)))
    size = max(image.size)
    square = Image.new("RGB", (size, size), (5, 7, 12))
    square.paste(image, ((size - image.width) // 2, (size - image.height) // 2))
    square.thumbnail((384, 384), Image.Resampling.LANCZOS)
    encoded = io.BytesIO()
    square.save(encoded, "WEBP", quality=90, method=6)
    return encoded.getvalue()


def build_assets() -> tuple[str, dict[str, bytes]]:
    config = json.loads((ROOT / "category_art_sources_v3.json").read_text())
    sheet = read_image(config["sheet_url"])
    cols, rows = config["columns"], config["rows"]
    assets = {}
    for index, category_id in enumerate(config["order"]):
        col, row = index % cols, index // cols
        bounds = (round(col * sheet.width / cols), round(row * sheet.height / rows),
                  round((col + 1) * sheet.width / cols), round((row + 1) * sheet.height / rows))
        assets[category_id] = encode_icon(sheet.crop(bounds))
    assets["all"] = encode_icon(read_image(config["all_url"]))
    for category_id, url in config.get("overrides", {}).items():
        assets[category_id] = encode_icon(read_image(url))
    return config["version"], assets


def main():
    version, assets = build_assets()
    manifest = {"version": version, "artworks": {}}
    for category_id, data in assets.items():
        digest = hashlib.sha256(data).hexdigest()[:12]
        path = f"pause/category/{version}/{category_id}-{digest}.webp"
        result = put_object(path, data, "image/webp")
        manifest["artworks"][category_id] = result["path"]
        print(f"Uploaded {category_id}: {len(data)} bytes", flush=True)
    print(json.dumps(manifest, indent=2), flush=True)


if __name__ == "__main__":
    main()