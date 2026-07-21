"""Scan the gap between 'en' and trend columns at very low threshold."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Output.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)
lum = arr.max(axis=2)

for label, y0, y1 in [("row1", 2711, 2882)]:
    sub = lum[y0 + 14 : y1 - 14, 1320:1840]
    print(f"{label} gap region max lum: {sub.max()}, mean: {sub.mean():.1f}")
    mask = sub > 12
    cols = mask.sum(axis=0)
    xs = np.where(cols > 0)[0]
    if len(xs):
        print(f"  content x {xs.min()+1320}-{xs.max()+1320}")
        # y band
        rows = mask.sum(axis=1)
        ys = np.where(rows > 0)[0]
        print(f"  y {ys.min()+y0+14}-{ys.max()+y0+14}")
    else:
        print("  no content found")
