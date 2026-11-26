"""Erzeugt verkleinerte Bilder (Base64) für die Web-Version. Aufruf: python3 -I tools/web_assets.py <ziel.json>"""
import base64, io, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')

def b64(im, fmt='PNG', q=82):
    buf = io.BytesIO()
    if fmt == 'JPEG':
        im.convert('RGB').save(buf, 'JPEG', quality=q, optimize=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def klein(pfad, px, fmt='PNG'):
    im = Image.open(pfad)
    im = im.convert('RGBA' if fmt == 'PNG' else 'RGB')
    im.thumbnail((px, px), Image.LANCZOS)
    return b64(im, fmt)

out = {}
# Spielbrett: Druck-PNG ohne 10 mm Beschnitt (3780 px = 320 mm)
brett = Image.open(os.path.join(ROOT, 'druck/00_meinspiel_Spielbrett_300x300mm.png'))
r = round(10 * 3780 / 320)
brett = brett.crop((r, r, 3780 - r, 3780 - r)).resize((1500, 1500), Image.LANCZOS)
out['brett'] = b64(brett, 'JPEG', 84)
out['figuren'] = {f[:-4]: klein(os.path.join(ROOT, 'figuren', f), 180, 'JPEG')
                  for f in os.listdir(os.path.join(ROOT, 'figuren')) if f.endswith('.jpg')}
out['orte'] = {f[:-4]: klein(os.path.join(A, 'orte', f), 220) for f in os.listdir(os.path.join(A, 'orte'))}
out['zutaten'] = {f[:-4]: klein(os.path.join(A, 'zutaten', f), 160) for f in os.listdir(os.path.join(A, 'zutaten'))}
out['karten'] = {f[:-4]: klein(os.path.join(A, 'karten', f), 200) for f in os.listdir(os.path.join(A, 'karten'))}
out['susi'] = klein(os.path.join(A, 'susi_mitte.jpg'), 420, 'JPEG')
json.dump(out, open(sys.argv[1], 'w'))
print('Bilder:', sum(len(v) if isinstance(v, dict) else 1 for v in out.values()), 'Größe:', round(os.path.getsize(sys.argv[1]) / 1e6, 2), 'MB')
