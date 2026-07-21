"""Column clusters inside ranking row 1 and 3 of the align map."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Output.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)
lum = arr.max(axis=2)

for label, y0, y1 in [("row1", 2711, 2882), ("row3", 2907, 3079)]:
    # Inset to skip the row border stroke
    band = lum[y0 + 14 : y1 - 14, 180:1990] > 60
    cols = band.sum(axis=0)
    xs = np.where(cols > 2)[0]
    # Cluster columns with gaps > 30px
    clusters = []
    start = xs[0]
    prev = xs[0]
    for x in xs[1:]:
        if x - prev > 30:
            clusters.append((start, prev))
            start = x
        prev = x
    clusters.append((start, prev))
    print(f"{label}: clusters (absolute x, +180):")
    for a, b in clusters:
        print(f"  x {a+180:4d}-{b+180:4d}  w={b-a+1}")
