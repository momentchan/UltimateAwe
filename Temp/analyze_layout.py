"""Find content bands and bounding boxes in the alignment image Output.png."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Output.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)
h, w, _ = arr.shape
print(f"size: {w}x{h}")

# Brightness mask: anything clearly not black
lum = arr.max(axis=2)
mask = lum > 24

rows = mask.sum(axis=1)

# Detect contiguous row bands with content
bands = []
in_band = False
start = 0
for y in range(h):
    has = rows[y] > 3
    if has and not in_band:
        in_band, start = True, y
    elif not has and in_band:
        in_band = False
        bands.append((start, y - 1))
if in_band:
    bands.append((start, h - 1))

# Merge bands separated by < 12 px
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 12:
        merged[-1] = (merged[-1][0], b[1])
    else:
        merged.append(list(b))

print("\nrow bands (y0-y1, height, x0-x1):")
for y0, y1 in merged:
    sub = mask[y0 : y1 + 1]
    cols = sub.sum(axis=0)
    xs = np.where(cols > 0)[0]
    x0, x1 = int(xs.min()), int(xs.max())
    print(f"  y {y0:4d}-{y1:4d}  h={y1-y0+1:4d}  x {x0:4d}-{x1:4d}  w={x1-x0+1:4d}")
