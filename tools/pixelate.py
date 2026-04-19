#!/usr/bin/env python3
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont


def _load_font(size: int):
    for p in ("/System/Library/Fonts/Menlo.ttc",
              "/System/Library/Fonts/Helvetica.ttc",
              "/System/Library/Fonts/Supplemental/Arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def center_crop_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    s = min(w, h)
    return img.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    rgb = np.asarray(rgb, dtype=float) / 255.0
    lin = np.where(rgb > 0.04045, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = lambda t: np.where(t > 0.008856, np.cbrt(np.maximum(t, 1e-12)), 7.787 * t + 16 / 116)
    fx, fy, fz = f(xyz[..., 0]), f(xyz[..., 1]), f(xyz[..., 2])
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=-1)


def load_palette(path: str):
    """Returns (colors_array (N,3) uint8, ids list[int]).
    Accepts lines like '<id>  <#hex>  <name>' or just '<#hex>  <name>'.
    For the latter, ids are auto-numbered from 1.
    """
    colors, ids = [], []
    for line in Path(path).read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        parts = s.split()
        bead_id, hex_tok = None, None
        if parts[0].isdigit():
            bead_id = int(parts[0])
            if len(parts) > 1:
                hex_tok = parts[1].lstrip("#")
        else:
            hex_tok = parts[0].lstrip("#")
        if hex_tok and len(hex_tok) == 6 and all(c in "0123456789abcdefABCDEF" for c in hex_tok):
            colors.append([int(hex_tok[i:i + 2], 16) for i in (0, 2, 4)])
            ids.append(bead_id if bead_id is not None else len(ids) + 1)
    return np.array(colors, dtype=np.uint8), ids


def nearest_white_index(palette: np.ndarray) -> int:
    return int(np.argmin(((palette.astype(int) - 255) ** 2).sum(axis=1)))


def kmeans(x: np.ndarray, k: int, iters: int = 50):
    x = x.astype(float)
    if len(x) <= k:
        return x, np.arange(len(x))
    rng = np.random.default_rng(0)
    idx = [int(rng.integers(len(x)))]
    for _ in range(k - 1):
        d = np.min(((x[:, None] - x[idx][None]) ** 2).sum(-1), axis=1).astype(float)
        s = d.sum()
        idx.append(int(rng.choice(len(x), p=(d / s) if s > 0 else None)))
    centroids = x[idx].copy()
    for _ in range(iters):
        d = ((x[:, None] - centroids[None]) ** 2).sum(-1)
        labels = d.argmin(1)
        new = np.array([x[labels == i].mean(0) if np.any(labels == i) else centroids[i]
                        for i in range(k)])
        if np.allclose(new, centroids):
            break
        centroids = new
    return centroids, labels


def constrain_to_palette(cells_rgb, palette, max_colors, force_indices=None):
    force_indices = list(dict.fromkeys(force_indices or []))
    c_lab = rgb_to_lab(cells_rgb)
    p_lab = rgb_to_lab(palette)
    d = ((c_lab[:, None] - p_lab[None]) ** 2).sum(-1)
    idx = d.argmin(1)
    unique, counts = np.unique(idx, return_counts=True)
    need_cull = len(unique) > max_colors or any(f not in unique.tolist() for f in force_indices)
    if need_cull:
        kept = list(force_indices)
        for u in unique[np.argsort(-counts)]:
            if len(kept) >= max_colors:
                break
            if int(u) not in kept:
                kept.append(int(u))
        kept_arr = np.array(kept, dtype=int)
        sub_lab = rgb_to_lab(palette[kept_arr])
        d2 = ((c_lab[:, None] - sub_lab[None]) ** 2).sum(-1)
        idx = kept_arr[d2.argmin(1)]
    return palette[idx], np.unique(idx)


def load_foreground(src: str, remove_bg: bool) -> Image.Image:
    img = Image.open(src)
    if remove_bg:
        from rembg import remove
        return remove(img.convert("RGBA"))
    return img.convert("RGBA")


def pixelate(src, dst, palette_path, grid=12, colors=6, out_size=480,
             saturation=1.3, grid_lines=True, legend=True,
             remove_bg=True, alpha_threshold=0.5, use_palette=True):
    if use_palette:
        palette, palette_ids = load_palette(palette_path)
        white_idx = nearest_white_index(palette)
    else:
        palette, palette_ids, white_idx = None, None, None

    rgba = load_foreground(src, remove_bg)
    rgba = center_crop_square(rgba)
    rgba = ImageEnhance.Color(rgba).enhance(saturation)

    arr = np.array(rgba, dtype=float)
    rgb = arr[..., :3]
    alpha = arr[..., 3] / 255.0

    premul_img = Image.fromarray((rgb * alpha[..., None]).astype(np.uint8), "RGB")
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    premul_small = np.array(
        premul_img.resize((grid, grid), Image.Resampling.BOX), dtype=float)
    alpha_small = np.array(
        alpha_img.resize((grid, grid), Image.Resampling.BOX), dtype=float) / 255.0

    fg_mask = alpha_small > alpha_threshold
    safe_a = np.maximum(alpha_small, 1e-6)
    cells = np.clip(premul_small / safe_a[..., None], 0, 255).reshape(-1, 3)
    mask_flat = fg_mask.reshape(-1)

    quantized = np.full((grid * grid, 3), 255, dtype=np.uint8)
    used_colors = np.empty((0, 3), dtype=np.uint8)
    used_labels = []
    if mask_flat.any():
        fg_cells = cells[mask_flat]
        if use_palette:
            fg_quantized, used = constrain_to_palette(
                fg_cells, palette, colors, force_indices=[white_idx])
            quantized[mask_flat] = fg_quantized
            used_colors = palette[used]
            used_labels = [f"#{palette_ids[i]:02d}" for i in used]
        else:
            centroids, labels = kmeans(fg_cells, colors)
            free_palette = np.clip(centroids, 0, 255).astype(np.uint8)
            quantized[mask_flat] = free_palette[labels]
            used = np.unique(labels)
            used_colors = free_palette[used]
            used_labels = ["#{:02x}{:02x}{:02x}".format(*c) for c in used_colors]
    quantized = quantized.reshape(grid, grid, 3)

    out = Image.fromarray(quantized, "RGB").resize(
        (out_size, out_size), Image.Resampling.NEAREST)

    if grid_lines:
        d = ImageDraw.Draw(out)
        step = out_size / grid
        for i in range(1, grid):
            v = int(i * step)
            d.line([(v, 0), (v, out_size)], fill=(0, 0, 0), width=1)
            d.line([(0, v), (out_size, v)], fill=(0, 0, 0), width=1)

    if len(used_colors) > 0:
        order = np.argsort(used_colors.sum(axis=1))
        used_colors = used_colors[order]
        used_labels = [used_labels[i] for i in order]

    if legend and len(used_colors) > 0:
        font = _load_font(20)
        swatch, gap, text_h = 64, 10, 28
        legend_h = swatch + text_h + gap * 3
        strip = Image.new("RGB", (out_size, legend_h), (255, 255, 255))
        dd = ImageDraw.Draw(strip)
        for i, c in enumerate(used_colors):
            x0 = gap + i * (swatch + gap)
            dd.rectangle([x0, gap, x0 + swatch, gap + swatch],
                         fill=tuple(int(v) for v in c), outline=(0, 0, 0))
            label = used_labels[i]
            bbox = dd.textbbox((0, 0), label, font=font)
            tw = bbox[2] - bbox[0]
            dd.text((x0 + (swatch - tw) // 2, swatch + gap * 2),
                    label, fill=(0, 0, 0), font=font)
        final = Image.new("RGB", (out_size, out_size + legend_h), (255, 255, 255))
        final.paste(out, (0, 0))
        final.paste(strip, (0, out_size))
        final.save(dst)
    else:
        out.save(dst)

    for c, lbl in zip(used_colors, used_labels):
        print("{}  #{:02x}{:02x}{:02x}".format(lbl, *c))


if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="Pixelate an image to a bead grid (6 colors incl. white by default)."
    )
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--palette", default=str(Path(__file__).parent / "palette.txt"))
    p.add_argument("--grid", type=int, default=12)
    p.add_argument("--colors", type=int, default=6)
    p.add_argument("--size", type=int, default=480)
    p.add_argument("--saturation", type=float, default=1.3)
    p.add_argument("--alpha-threshold", type=float, default=0.5)
    p.add_argument("--no-remove-bg", dest="remove_bg", action="store_false")
    p.add_argument("--no-palette", dest="use_palette", action="store_false",
                   help="skip palette snap; pick colors freely via k-means")
    p.add_argument("--no-grid-lines", dest="grid_lines", action="store_false")
    p.add_argument("--no-legend", dest="legend", action="store_false")
    a = p.parse_args()
    pixelate(a.src, a.dst, a.palette, a.grid, a.colors, a.size,
             a.saturation, a.grid_lines, a.legend,
             a.remove_bg, a.alpha_threshold, a.use_palette)
