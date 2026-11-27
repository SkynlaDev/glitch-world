"""Prépare les sprites PixelLab de Steven (version chibi) pour le jeu.

Entrée : art/chibi/steven/{walk,idle,slam-pixminimax}.png + sheets.json (produits par art/chibi/tools/px.py fetch)
Sortie : public/art/steven/{walk,idle,hammer}.png + portrait.png, et src/data/steven-sheets.json
- garde, pour chaque planche, la taille de case, le nombre d'images et la ligne des pieds (base) ;
- les lignes suivent l'ordre S, SE, E, NE, N, NW, W, SW (frappe : S, E, N, W).
Usage : python3 tools/art/prepare_steven.py   (depuis la racine du projet, nécessite Pillow)
"""
import json, pathlib, shutil
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'art/chibi/steven'
OUT = ROOT / 'public/art/steven'
OUT.mkdir(parents=True, exist_ok=True)
src_meta = json.loads((SRC / 'sheets.json').read_text())


def baseline(im: Image.Image, cell: int, rows: int) -> int:
    """Plus basse ligne opaque de la première image, toutes directions confondues (≈ les pieds)."""
    best = 0
    for r in range(rows):
        bb = im.crop((0, r * cell, cell, (r + 1) * cell)).getbbox()
        if bb:
            best = max(best, bb[3])
    return best


meta = {}
# Nom dans le jeu → planche source. La frappe vient du slam pixminimax (l'haltère reste un haltère).
SOURCES = {'walk': 'walk', 'idle': 'idle', 'hammer': 'slam-pixminimax'}
for name, src in SOURCES.items():
    m = src_meta[src]
    im = Image.open(SRC / f'{src}.png').convert('RGBA')
    im.save(OUT / f'{name}.png')
    meta[name] = {'cell': m['cell'], 'rows': len(m['rows']), 'frames': m['frames'], 'base': baseline(im, m['cell'], len(m['rows']))}

shutil.copy(SRC / 'portrait.png', OUT / 'portrait.png')
(ROOT / 'src/data/steven-sheets.json').write_text(json.dumps(meta, indent=1) + '\n')
print(json.dumps(meta))
