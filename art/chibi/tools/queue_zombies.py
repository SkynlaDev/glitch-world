#!/usr/bin/env python3
"""File d'attente PixelLab pour les variantes de zombie (relance tant que les 8 emplacements de jobs sont pris)."""
import json, os, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import px  # noqa: E402
mcp = px.mcp
BASE = '00ab6d11-e754-4a02-8b71-7463ba9291cd'
VARIANTS = [
    ('zombie-rescape', 'Rescape', 'big bushy messy beard, torn red plaid flannel shirt in rags, dirty bandage wrapped around one arm, worn survivor look, still a zombie with grey-green skin'),
    ('zombie-casquette', 'Casquette', 'baseball cap worn backwards, open grey hoodie over the torn t-shirt, one earphone hanging from the ear, still a zombie with grey-green skin'),
]

def call(name, args):
    return px.text(mcp.rpc('tools/call', {'name': name, 'arguments': args}))

def retry(name, args, what):
    while True:
        t = call(name, args)
        if 'rate limit' in t or 'job slots' in t:
            print(f'{what} : emplacements pleins, nouvel essai dans 30 s', flush=True); time.sleep(30); continue
        print(f'{what} :', t.splitlines()[0] if t else '?', flush=True)
        return t

ids = {}
for folder, state, desc in VARIANTS:
    t = retry('create_character_state', {'character_id': BASE, 'edit_description': desc, 'state_name': state}, f'variante {state}')
    m = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', t)
    if not m: print('échec', t[:300]); sys.exit(1)
    ids[folder] = m.group(1)
json.dump(ids, open(os.path.join(HERE, '..', 'zombie-variants.json'), 'w'), indent=1)
px.wait(list(ids.values()))
for folder, cid in ids.items():
    retry('animate_character', {'character_id': cid, 'template_animation_id': 'walking-8-frames', 'animation_name': 'walk'}, f'marche {folder}')
px.wait([BASE] + list(ids.values()))
px.fetch(BASE, 'zombie')
for folder, cid in ids.items():
    px.fetch(cid, folder)
print('TOUT EST PRÊT')
