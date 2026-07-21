"""Compare radar asset's internal label positions to align map, to derive offset."""
import numpy as np
from PIL import Image

# Radar asset (2x)
rp = r"c:\Users\MJ\Repository\UltimateAwe\public\textures\02 各項元件\RadarChart_2@.png"
rim = Image.open(rp).convert("RGBA")
ra = np.asarray(rim)
if (ra[:, :, 3] < 255).any():
    rmask = ra[:, :, 3] > 8
else:
    rmask = ra[:, :, :3].max(axis=2) > 24

rows = rmask.sum(axis=1)
ys = np.where(rows > 0)[0]
print(f"radar asset content rows: {ys.min()}-{ys.max()}")

# Top text band = first contiguous band
in_band, bands, start = False, [], 0
for y in range(rmask.shape[0]):
    has = rows[y] > 0
    if has and not in_band:
        in_band, start = True, y
    elif not has and in_band:
        in_band = False
        bands.append((start, y - 1))
if in_band:
    bands.append((start, rmask.shape[0] - 1))

for y0, y1 in bands[:6]:
    band = rmask[y0 : y1 + 1]
    xs = np.where(band.sum(axis=0) > 0)[0]
    print(f"asset band y {y0}-{y1}: x {xs.min()}-{xs.max()} center {(xs.min()+xs.max())/2:.0f} (2x)")
