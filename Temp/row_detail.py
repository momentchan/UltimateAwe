"""Detail: y-bands per column cluster in row1; low-threshold scan for count column."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Output.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)
lum = arr.max(axis=2)

y0, y1 = 2711, 2882

# Low threshold full scan
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
print("row1 clusters (thr=25):")
for a, b in clusters:
    print(f"  x {a+180:4d}-{b+180:4d}  w={b-a+1}")

# For key clusters, find y bands
for label, xa, xb in [("rank", 234, 347), ("pct", 450, 690), ("zh", 811, 1021), ("en", 1061, 1318), ("trend", 1837, 1912)]:
    sub = lum[y0 : y1 + 1, xa:xb + 1] > 25
    rows = sub.sum(axis=1)
    ys = np.where(rows > 1)[0]
    bands = []
    s = p = ys[0]
    for y in ys[1:]:
        if y - p > 8:
            bands.append((s, p))
            s = y
        p = y
    bands.append((s, p))
    desc = ", ".join(f"y {y0+a}-{y0+b} (h={b-a+1})" for a, b in bands)
    print(f"{label}: {desc}")
