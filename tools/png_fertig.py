"""Bringt ein PNG auf exakte Pixelgröße, setzt 300 dpi und bettet ein sRGB-Profil ein."""
import io, sys
from PIL import Image, ImageCms

pfad, px = sys.argv[1], int(sys.argv[2])
im = Image.open(pfad).convert('RGB')
if im.size != (px, px):
    im = im.resize((px, px), Image.LANCZOS)
srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
im.save(pfad, dpi=(300, 300), icc_profile=srgb, optimize=True)
