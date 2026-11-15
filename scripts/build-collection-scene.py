#!/usr/bin/env python3
"""Builds the /koleksiyon scene layers from images already in public/.

None of the inputs is a verified product photograph: the tin is an AI packaging
concept, the bottle and gift box are unverified brand visuals. The cutouts are
only re-framed (masked) — no pixels are invented. Usage:
  python3 scripts/build-collection-scene.py public/collection/scene
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
SRC="/home/user/Afrodisias-Karya/public"; OUT=sys.argv[1]
def poly_mask(size, pts, ss=4, blur=1.0):
    W,H=size; m=Image.new("L",(W*ss,H*ss),0)
    ImageDraw.Draw(m).polygon([(x*ss,y*ss) for x,y in pts],fill=255)
    return m.resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
def save(img, mask, box, name, width):
    img=img.copy(); img.putalpha(mask); c=img.crop(box)
    h=round(c.height*width/c.width); c=c.resize((width,h),Image.LANCZOS)
    c.save(f"{OUT}/{name}.webp","WEBP",quality=86,method=6,exact=False); print(name,c.size)

# 1) Glass bottle (Caria) — polygon traced on a grid overlay.
im=Image.open(f"{SRC}/altin-dal-bottle-collection.webp").convert("RGB")
b=[(660,47),(758,47),(762,52),(762,190),(760,196),(760,218),(775,232),(795,245),(810,260),(818,280),(821,300),(821,785),(817,796),(808,801),
   (606,801),(597,796),(593,785),(593,300),(596,280),(604,260),(620,245),(640,232),(659,218),(659,196),(657,190),(657,52)]
save(im, poly_mask(im.size,b), (585,40,829,806), "scene-bottle", 488)

# 2) Matte tin — dark object on a light wall: flood-fill the background from the edges.
im=Image.open(f"{SRC}/products/concepts/tin-3l.webp").convert("RGB")
a=np.asarray(im).astype(float); L=0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
light=Image.fromarray(np.where(L>150,255,0).astype("uint8")).copy()
for seed in [(5,5),(im.width-5,5),(5,700),(im.width-5,700),(im.width-5,im.height-5),(600,im.height-5),(100,im.height-5)]:
    if light.getpixel(seed)==255: ImageDraw.floodfill(light,seed,128)
bg=np.asarray(light)==128
obj=Image.fromarray(np.where(bg,0,255).astype("uint8"))
obj=obj.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))  # close small gaps (gold rim highlights)
obj=obj.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop specks
# The travertine plinth is light → background; keep only rows above it.
m=np.asarray(obj).copy(); m[1228:,:]=0
comp=Image.fromarray(m).copy(); ImageDraw.floodfill(comp,(560,700),128)  # keep only what touches the tin
m=np.where(np.asarray(comp)==128,255,0).astype("uint8"); obj=Image.fromarray(m).filter(ImageFilter.GaussianBlur(1.0))
save(im, obj, (0,130,905,1240), "scene-tin", 640)

# 3) Gift box — open base + standing lid; the lid's top edge is cut by the frame, so it fades out.
im=Image.open(f"{SRC}/altin-dal-gift-box.webp").convert("RGB")
p=[(628,0),(1350,0),(1340,110),(1305,392),(1300,402),(1293,985),(1230,1084),(458,1002),(450,885),(612,338),(618,200)]
m=np.asarray(poly_mask(im.size,p)).astype(float)
fade=np.clip(np.arange(im.height)/110.0,0,1)[:,None]; m=(m*fade).astype("uint8")
save(im, Image.fromarray(m), (445,0,1355,1086), "scene-giftbox", 820)

# 4) Travertine (from the tin concept's plinth) and a leaf-shadow "gobo" for the wall.
im=Image.open(f"{SRC}/products/concepts/tin-3l.webp").convert("RGB")
im.crop((300,1250,1122,1402)).save(f"{OUT}/travertine.webp","WEBP",quality=82,method=6); print("travertine")
g=np.asarray(im.crop((0,0,560,640)).convert("L")).astype(float)
shadow=np.clip((196-g)/70,0,1)  # wall is 196–222; only real leaf shadows (darker) remain, so no rectangle edge
yy,xx=np.mgrid[0:640,0:560]; r=np.hypot((xx-280)/280,(yy-320)/320)
shadow*=np.clip((1-r)/0.45,0,1)**1.5  # feather to zero before the crop edge, so the gobo has no rectangle
gobo=Image.new("L",(560,640),0); a=Image.fromarray((shadow*255).astype("uint8")).filter(ImageFilter.GaussianBlur(3))
rgba=Image.merge("RGBA",(gobo,gobo,gobo,a)); rgba.save(f"{OUT}/leaf-shadow.webp","WEBP",quality=80,method=6); print("leaf-shadow")
