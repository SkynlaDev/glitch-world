"""Prépare les sprites PixelLab des zombies chibi pour le jeu.

Entrée : art/chibi/zombie/ (normal), art/chibi/zombie-rescape/, art/chibi/zombie-casquette/
         chacun avec walk.png + sheets.json (art/chibi/tools/px.py fetch) ; à défaut de marche, les rotations.
Sortie : public/art/zombie/<variante>/walk.png et src/data/zombie-sheets.json
         (taille de case, lignes, images, ligne des pieds). Une variante absente est simplement omise.
Usage : python3 tools/art/prepare_zombies.py   (depuis la racine du projet, nécessite Pillow)
"""
import json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCES = {'normal': 'zombie', 'rescape': 'zombie-rescape', 'casquette': 'zombie-casquette'}
meta = {}
for variant, folder in SOURCES.items():
    src = ROOT / 'art/chibi' / folder
    if not (src / 'sheets.json').exists():
        continue
    m = json.loads((src / 'sheets.json').read_text())
    key = 'walk' if 'walk' in m else 'rotations'
    info = m[key]
    im = Image.open(src / f'{key}.png').convert('RGBA')
    if key == 'rotations':  # 8 vues sur une ligne → une ligne par direction, 1 image
        c = info['cell']
        rows = Image.new('RGBA', (c, c * len(info['rows'])))
        for i in range(len(info['rows'])):
            rows.paste(im.crop((i * c, 0, (i + 1) * c, c)), (0, i * c))
        im, frames = rows, 1
    else:
        frames = info['frames']
    cell, nrows = info['cell'], len(info['rows'])
    base = max((im.crop((0, r * cell, cell, (r + 1) * cell)).getbbox() or (0, 0, 0, 0))[3] for r in range(nrows))
    out = ROOT / 'public/art/zombie' / variant
    out.mkdir(parents=True, exist_ok=True)
    im.save(out / 'walk.png')
    meta[variant] = {'cell': cell, 'rows': nrows, 'frames': frames, 'base': base}
(ROOT / 'src/data/zombie-sheets.json').write_text(json.dumps(meta, indent=1) + '\n')
print(json.dumps(meta))
