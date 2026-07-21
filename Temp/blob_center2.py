"""Refine blob bbox: central hero region only, per-row histogram."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Output.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)

mx = arr.max(axis=2)
mn = arr.min(axis=2)
sat = mx - mn
mask = (sat > 40) & (mx > 60)

# Hero region only, away from title (y>600) and above dist bar (y<2350)
sub = mask[600:2350]
rows = sub.sum(axis=1)
ys = np.where(rows > 200)[0]  # wide colorful rows = blob body
y0, y1 = ys.min() + 600, ys.max() + 600
band = mask[y0 : y1 + 1]
cols = band.sum(axis=0)
xs = np.where(cols > 20)[0]
x0, x1 = xs.min(), xs.max()
print(f"blob core: x {x0}-{x1} (w={x1-x0+1})  y {y0}-{y1} (h={y1-y0+1})")
print(f"center: ({(x0+x1)/2:.0f}, {(y0+y1)/2:.0f})")
