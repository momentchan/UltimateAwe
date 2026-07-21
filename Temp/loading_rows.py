"""Column clusters in Loading.png row 1."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Loading.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)
lum = arr.max(axis=2)

# Find row bands first
mask = lum > 24
rows = mask.sum(axis=1)
bands = []
in_band = False
start = 0
for y in range(arr.shape[0]):
    has = rows[y] > 3
    if has and not in_band:
        in_band, start = True, y
    elif not has and in_band:
        in_band = False
        bands.append((start, y - 1))
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 12:
        merged[-1] = (merged[-1][0], b[1])
    else:
        merged.append(list(b))
print("loading bands:")
for y0, y1 in merged:
    sub = mask[y0 : y1 + 1]
    xs = np.where(sub.sum(axis=0) > 0)[0]
    print(f"  y {y0}-{y1} h={y1-y0+1}  x {xs.min()}-{xs.max()}")

# Clusters in the first list row (find band starting after y=2600 with h>150)
target = next((b for b in merged if b[0] > 2600 and b[1] - b[0] > 150), None)
if target:
    y0, y1 = target
    band = lum[y0 + 14 : y1 - 14, 180:1990] > 25
    cols = band.sum(axis=0)
    xs = np.where(cols > 1)[0]
    clusters = []
    start = prev = xs[0]
    for x in xs[1:]:
        if x - prev > 25:
            clusters.append((start, prev))
            start = x
        prev = x
    clusters.append((start, prev))
    print(f"\nloading row (y {y0}-{y1}) clusters:")
    for a, b in clusters:
        print(f"  x {a+180:4d}-{b+180:4d}  w={b-a+1}")
