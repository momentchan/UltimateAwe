"""Content bounding boxes of part assets (non-black or non-transparent pixels)."""
import numpy as np
from PIL import Image

files = [
    "Title_2@.png",
    "RadarChart_2@.png",
    "BounzeeLv1_2@.png",
    "NormalFace_2@.png",
    "Distribution Bar_2@.png",
    "Data Bar_2@.png",
]

base = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\02 各項元件"

for f in files:
    im = Image.open(f"{base}\\{f}").convert("RGBA")
    arr = np.asarray(im)
    if (arr[:, :, 3] < 255).any():
        mask = arr[:, :, 3] > 8
    else:
        mask = arr[:, :, :3].max(axis=2) > 24
    ys, xs = np.where(mask)
    w, h = im.size
    print(
        f"{f}: canvas {w}x{h}  content x {xs.min()}-{xs.max()} (w={xs.max()-xs.min()+1})"
        f"  y {ys.min()}-{ys.max()} (h={ys.max()-ys.min()+1})"
    )
