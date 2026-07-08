#!/usr/bin/env python3
"""Remove baked-in checkerboard/white backgrounds from VT Quest PNG assets.

AI-generated PNGs often ship as RGB with a fake transparency checkerboard painted
into the pixels. This script flood-fills from the image border and writes true
RGBA PNGs cropped to content.

Usage (from eyesight-admin/):
  python3 scripts/process-vt-assets.py
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'src' / 'assets' / 'vt-quest'
PLANETS = [
    ROOT / 'planets' / 'planet-gabor.png',
    ROOT / 'planets' / 'planet-vernier.png',
    ROOT / 'planets' / 'planet-crowding.png',
]
MASCOT = ROOT / 'mascot' / 'astronaut.png'


def flood_remove_bg(path: Path, *, tolerance: int = 32, max_side: int = 512) -> None:
    im = Image.open(path).convert('RGBA')
    arr = np.array(im, dtype=np.uint8)
    h, w = arr.shape[:2]
    rgb = arr[..., :3].astype(np.int16)
    alpha = arr[..., 3].copy()

    def is_border_seed(r: int, g: int, b: int) -> bool:
        c = (r, g, b)
        return max(c) - min(c) <= 20 and min(c) >= 200

    def dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
        return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))

    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b = rgb[y, x]
            if is_border_seed(r, g, b):
                visited[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if visited[y, x]:
                continue
            r, g, b = rgb[y, x]
            if is_border_seed(r, g, b):
                visited[y, x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        alpha[y, x] = 0
        base = tuple(int(v) for v in rgb[y, x])
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                nc = tuple(int(v) for v in rgb[ny, nx])
                if dist(base, nc) <= tolerance and max(nc) - min(nc) <= 35:
                    visited[ny, nx] = True
                    q.append((nx, ny))

    arr[..., 3] = alpha
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        raise RuntimeError(f'No opaque pixels left after background removal: {path}')

    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pad = 6
    cropped = arr[
        max(0, y0 - pad) : min(h, y1 + pad + 1),
        max(0, x0 - pad) : min(w, x1 + pad + 1),
    ]
    out = Image.fromarray(cropped)
    ms = max(out.size)
    if ms > max_side:
        scale = max_side / ms
        out = out.resize((int(out.width * scale), int(out.height * scale)), Image.LANCZOS)

    out.save(path, optimize=True)


def cleanup_planet_ring_gaps(path: Path) -> None:
    """Second pass: remove checkerboard residue inside planet ring gaps."""
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    sat = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    minc = np.minimum.reduce([r, g, b])
    mask = (sat <= 10) & (minc >= 238) & (a > 0)
    arr[mask, 3] = 0
    Image.fromarray(arr).save(path, optimize=True)


def main() -> None:
    for asset in PLANETS:
        if not asset.exists():
            raise FileNotFoundError(asset)
        flood_remove_bg(asset)
        cleanup_planet_ring_gaps(asset)
        print(f'✓ planet {asset.name}')

    if not MASCOT.exists():
        raise FileNotFoundError(MASCOT)
    flood_remove_bg(MASCOT, tolerance=28)
    print(f'✓ mascot {MASCOT.name}')

    print('Done — assets are RGBA with transparent backgrounds.')


if __name__ == '__main__':
    main()
