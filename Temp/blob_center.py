"""Locate the colorful blob in Output.png via saturation (labels are white/gray)."""
import numpy as np
from PIL import Image

path = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\01 對位用圖\Output.png"
im = Image.open(path).convert("RGB")
arr = np.asarray(im).astype(np.int32)

mx = arr.max(axis=2)
mn = arr.min(axis=2)
sat = mx - mn
mask = (sat > 40) & (mx > 60)

ys, xs = np.where(mask)
print(f"blob bbox: x {xs.min()}-{xs.max()} (w={xs.max()-xs.min()+1})  y {ys.min()}-{ys.max()} (h={ys.max()-ys.min()+1})")
print(f"blob center: ({(xs.min()+xs.max())/2:.0f}, {(ys.min()+ys.max())/2:.0f})")

# Restrict to hero area (exclude distribution bar / list icons below y=2300)
sel = ys < 2300
ys2, xs2 = ys[sel], xs[sel]
print(f"hero-only bbox: x {xs2.min()}-{xs2.max()} (w={xs2.max()-xs2.min()+1})  y {ys2.min()}-{ys2.max()} (h={ys2.max()-ys2.min()+1})")
print(f"hero-only center: ({(xs2.min()+xs2.max())/2:.0f}, {(ys2.min()+ys2.max())/2:.0f})")
