"""Bringt ein PNG auf exakte Pixelgröße, setzt 300 dpi und bettet ein sRGB-Profil ein."""
import io, sys
from PIL import Image, ImageCms

pfad, px = sys.argv[1], int(sys.argv[2])
pxH = int(sys.argv[3]) if len(sys.argv) > 3 else px
im = Image.open(pfad).convert('RGB')
if im.size != (px, pxH):
    im = im.resize((px, pxH), Image.LANCZOS)
srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
im.save(pfad, dpi=(300, 300), icc_profile=srgb, optimize=True)

# Optional zusätzlich als JPG (für Uploads, die nur JPG annehmen)
if len(sys.argv) > 4 and sys.argv[4] == 'jpg':
    im.save(pfad[:-4] + '.jpg', 'JPEG', quality=95, subsampling=0, dpi=(300, 300), icc_profile=srgb)
