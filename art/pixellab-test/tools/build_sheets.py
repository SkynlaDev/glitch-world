#!/usr/bin/env python3
"""Range les PNG du ZIP PixelLab sous des noms clairs et assemble une spritesheet par animation.
Usage : build_sheets.py <dossier_zip_extrait> <dossier_sortie>
Spritesheet : une ligne par direction (ordre DIRS), une colonne par frame, cellules carrées
de la taille max de l'animation (frames plus petites centrées). Un JSON décrit la grille."""
import json, os, shutil, sys
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
meta = json.load(open(os.path.join(SRC, 'metadata.json')))['states'][0]['frames']
os.makedirs(os.path.join(OUT, 'raw', 'rotations'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'sheets'), exist_ok=True)
slug = lambda d: d.replace('-', '')  # south-east -> southeast

for d, p in meta['rotations'].items():
    shutil.copy(os.path.join(SRC, p), os.path.join(OUT, 'raw', 'rotations', f'steven_rot_{slug(d)}.png'))

manifest = {}
for anim, dirs in meta['animations'].items():
    rows = [d for d in DIRS if d in dirs]
    os.makedirs(os.path.join(OUT, 'raw', anim), exist_ok=True)
    frames = {d: [Image.open(os.path.join(SRC, p)).convert('RGBA') for p in dirs[d]] for d in rows}
    cell = max(max(max(im.size) for im in fr) for fr in frames.values())
    ncol = max(len(fr) for fr in frames.values())
    sheet = Image.new('RGBA', (cell * ncol, cell * len(rows)), (0, 0, 0, 0))
    for r, d in enumerate(rows):
        for c, im in enumerate(frames[d]):
            im.save(os.path.join(OUT, 'raw', anim, f'steven_{anim}_{slug(d)}_{c}.png'))
            sheet.alpha_composite(im, (c * cell + (cell - im.width) // 2, r * cell + (cell - im.height) // 2))
    sheet.save(os.path.join(OUT, 'sheets', f'steven_{anim}.png'))
    manifest[anim] = {'sheet': f'sheets/steven_{anim}.png', 'cell': cell, 'rows': rows,
                      'frames': {d: len(frames[d]) for d in rows}}
    print(anim, 'cell', cell, 'x', ncol, 'frames,', len(rows), 'directions')
json.dump(manifest, open(os.path.join(OUT, 'sheets', 'steven_sheets.json'), 'w'), indent=1)
