#!/usr/bin/env python3
"""Pipeline PixelLab des personnages chibi (réutilise le client MCP de art/pixellab-test).
  px.py wait <id> [<id>...]     attend que les personnages et leurs animations soient terminés
  px.py fetch <id> <nom>        télécharge l'export ZIP et assemble art/chibi/<nom>/ (rotations + planches)
Le jeton est lu dans ~/.claude.json par mcp.py, jamais affiché."""
import io, json, os, re, sys, time, urllib.request, zipfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../../pixellab-test/tools'))
import mcp  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..'))
DIRS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']

def text(r):
    return '\n'.join(c.get('text', '') for c in r.get('result', {}).get('content', []))

def status(cid):
    return text(mcp.rpc('tools/call', {'name': 'get_character', 'arguments': {'character_id': cid}}))

def wait(ids, limit=1800):
    t0 = time.time()
    while time.time() - t0 < limit:
        pending = []
        for cid in ids:
            s = status(cid)
            first = s.splitlines()[0] if s else '?'
            # Terminé = personnage « completed » et aucune animation encore en file ou en cours.
            busy = [l.strip() for l in s.splitlines() if not l.startswith(('available_animations', 'hint', 'description')) and re.search(r'\d+%|processing|queued|in progress|running', l, re.I)]
            if first != 'status: completed' or busy:
                pending.append(f'{cid[:8]} {first} {busy[:2]}')
        if not pending:
            print('terminé :', ', '.join(i[:8] for i in ids)); return True
        print(f'[{int(time.time() - t0)} s]', ' | '.join(pending), flush=True)
        time.sleep(20)
    print('délai dépassé'); return False

def fetch(cid, name):
    url = mcp.URL.rsplit('/mcp', 1)[0] + f'/mcp/characters/{cid}/download'
    req = urllib.request.Request(url, headers={k: v for k, v in mcp.HDR.items()})
    data = urllib.request.urlopen(req, timeout=300).read()
    out = os.path.join(ROOT, name)
    os.makedirs(os.path.join(out, 'raw'), exist_ok=True)
    open(os.path.join(out, 'raw', 'export.zip'), 'wb').write(data)
    z = zipfile.ZipFile(io.BytesIO(data))
    # Un export contient tout le groupe (base + variantes) : on prend l'état de CE personnage.
    states = json.loads(z.read('metadata.json'))['states']
    meta = next((st for st in states if st['character'].get('id') == cid), states[0])['frames']
    img = lambda p: Image.open(io.BytesIO(z.read(p))).convert('RGBA')
    manifest = {}
    rots = [d for d in DIRS if d in meta['rotations']]
    cell = max(max(img(meta['rotations'][d]).size) for d in rots)
    sheet = Image.new('RGBA', (cell * len(rots), cell))
    for i, d in enumerate(rots):
        im = img(meta['rotations'][d]); sheet.alpha_composite(im, (i * cell + (cell - im.width) // 2, (cell - im.height) // 2))
        if d == 'south': im.save(os.path.join(out, 'portrait.png'))
    sheet.save(os.path.join(out, 'rotations.png'))
    manifest['rotations'] = {'cell': cell, 'rows': rots, 'frames': 1}
    for anim, dirs in meta.get('animations', {}).items():
        rows = [d for d in DIRS if d in dirs]
        frames = {d: [img(p) for p in dirs[d]] for d in rows}
        c = max(max(max(im.size) for im in fr) for fr in frames.values())
        n = max(len(fr) for fr in frames.values())
        sh = Image.new('RGBA', (c * n, c * len(rows)))
        for r, d in enumerate(rows):
            for k, im in enumerate(frames[d]):
                sh.alpha_composite(im, (k * c + (c - im.width) // 2, r * c + (c - im.height) // 2))
        key = re.sub(r'[^a-z0-9]+', '-', anim.lower()).strip('-')
        sh.save(os.path.join(out, f'{key}.png'))
        manifest[key] = {'cell': c, 'rows': rows, 'frames': n, 'source': anim}
    json.dump(manifest, open(os.path.join(out, 'sheets.json'), 'w'), indent=1)
    print(name, json.dumps({k: (v['cell'], len(v['rows']), v['frames']) for k, v in manifest.items()}))

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'wait': sys.exit(0 if wait(sys.argv[2:]) else 1)
    if cmd == 'fetch': fetch(sys.argv[2], sys.argv[3])
