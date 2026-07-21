import os
from PIL import Image

root = r"c:\Users\MJ\Repository\UltimateAwe\public\textures"
out = []
for dirpath, _, files in os.walk(root):
    for f in sorted(files):
        if f.lower().endswith(".png"):
            p = os.path.join(dirpath, f)
            im = Image.open(p)
            rel = os.path.relpath(p, root)
            out.append(f"{im.size[0]:5d}x{im.size[1]:5d}  {rel}")

out_path = r"c:\Users\MJ\Repository\UltimateAwe\Temp\tex-sizes.txt"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as fh:
    fh.write("\n".join(out))
print(f"wrote {len(out)} lines")
