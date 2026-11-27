/* Pixel art en texte : chaque caractère = une couleur de PAL, '.' = transparent. */
const PAL: Record<string, string> = {
  k: '#1a1022', e: '#1a1022', s: '#e8b48a', S: '#c48a62', h: '#5a3a22', c: '#29f0ff', C: '#1488a8', p: '#ff2e88', P: '#c41f66', n: '#2c2c54', w: '#f4ecff',
  g: '#9a96b0', G: '#6b6780', N: '#3b3550', o: '#ff8a1f', O: '#c25f00', b: '#c88a4a', B: '#8a5a2a', r: '#d0344f', R: '#8a1f33', m: '#2a2140',
  d: '#22222e', D: '#3a3a52', y: '#ffe14d', Y: '#c27a00', v: '#a23cf0', V: '#6e1fb0', K: '#0b0712', a: '#7d8296', A: '#d6dae6', t: '#b88a64', T: '#8f6446',
};

const MAPS: Record<string, string[]> = {
  steven: ['....kkkkkkkk....', '...khhhhhhhhk...', '...kcccccccck...', '...kssssssssk...', '...ksesssessk...', '...ksswwwwssk...', '....kSSSSSSk....', '..kkkkSSSSkkkk..', '.ksskppppppkssk.', '.ksskppppppkssk.', '.kSSkPppppPkSSk.', '.ksskppppppkssk.', '..kkknnnnnnkkk..', '...knnnnnnnnk...', '...knnnkknnnk...', '...kssk..kssk...', '...kssk..kssk...', '..kwwwk..kwwwk..', '..kkkkk..kkkkk..'],
  stevenB: ['....kkkkkkkk....', '...khhhhhhhhk...', '...kcccccccck...', '...kssssssssk...', '...ksesssessk...', '...ksswwwwssk...', '....kSSSSSSk....', '..kkkkSSSSkkkk..', '.ksskppppppkssk.', '.ksskppppppkssk.', '.kSSkPppppPkSSk.', '.ksskppppppkssk.', '..kkknnnnnnkkk..', '...knnnnnnnnk...', '...knnnkknnnk...', '....ksskkssk....', '....ksskkssk....', '...kwwwkkwwwk...', '...kkkkkkkkkk...'],
  dumb: ['kkkk......kkkk', 'kaak......kaak', 'kaakkkkkkkkaak', 'kaakAAAAAAkaak', 'kaakkkkkkkkaak', 'kaak......kaak', 'kkkk......kkkk'],
  zombie: ['...kkkkkk...', '..khhhhhhk..', '..kssssssk..', '..ksesseSk..', '..kssssssk..', '...kSSSSk...', 'kkkkggggkkkk', 'ksggggggggsk', 'kkkkggggkkkk', '...kggggk...', '...kGGGGk...', '...kNNNNk...', '...kNkkNk...', '...kNkkNk...', '..kkk..kkk..'],
  livreur: ['...kkkkkk...', '..kooooooOk.', '..kOOOOOOk..', '..ksessesk..', '...kssssk...', '..koooooobbk', '..koooooobbk', '..kssoooobbk', '..kOOOOOObBk', '..knnnnnnkkk', '..knnkknnk..', '..knnk.knnk.', '..kkkk.kkkk.'],
  casseur: ['....kkkk....', '...krrrrk...', '..krrrrrrk..', '..krwmmwrk..', '..krmmmmrk..', '...kRRRRk...', '.kkrrrrrrkk.', 'krrkrrrrkrrk', 'krrkrrrrkrrk', 'ksskRRRRkssk', '.kkknnnnkkk.', '...knkknk...', '...knkknk...', '..kkk..kkk..'],
  videur: ['....kkkkkkkk....', '...kttttttttk...', '...kttttttttk...', '...kkkkkkkkkk...', '...kttttttttk...', '...ktttTTtttk...', '....kttttttk....', '.kkkkddwwddkkkk.', 'kddddddwwddddddk', 'kdDdddkwwkdddDdk', 'kdDddddwwddddDdk', 'kdDddddkkddddDdk', 'kttddddddddddttk', '.kkddddddddddkk.', '...kddddddddk...', '...kdddkkdddk...', '...kdddkkdddk...', '..kkkkkkkkkkkk..'],
  fetard: ['.....ky.....', '....kyyk....', '...kyyyyk...', '..kssssssk.k', '..ksesseskks', '..kswwwwskvk', '...kSSSSkkvk', '..kvvvvvvvvk', '.ksvvvvvvvk.', '.ksVvvvvvVk.', '..kvvvvvvk..', '..kNNNNNNk..', '..kNNkkNNk..', '..kkk..kkk..'],
  boss: ['....kkkkkkkk....', '...khhhhhhhhk...', '..kcccccccccck..', '.kccksssssskcck.', '.kcckkkkkkkkcck.', '.kcckswwwwskcck.', '..kkkkSSSSkkkk..', '.kppppppppppppk.', 'ksppppppppppppsk', 'kkkkkkkkkkkkkkkk', 'kmmmmmmmmmmmmmmk', 'kmKKKmmccmmKKKmk', 'kmKyKmmppmmKyKmk', 'kmKKKmmccmmKKKmk', 'kmmmmmmmmmmmmmmk', 'kkkkkkkkkkkkkkkk'],
  chest: ['.kkkkkkkk.', 'kyyyyyyyyk', 'kYYYYYYYYk', 'kkkkwwkkkk', 'kyyykkyyyk', 'kyyyyyyyyk', 'kYYYYYYYYk', '.kkkkkkkk.'],
  // XP : cubes de pixel (face claire en haut à gauche, face sombre en bas à droite), jamais en croix.
  gem: ['.kkkkk', 'kwwwck', 'kwccCk', 'kwccCk', 'kcCCCk', 'kkkkk.'],
  gemM: ['.kkkkk', 'kwwwpk', 'kwppPk', 'kwppPk', 'kpPPPk', 'kkkkk.'],
  gemY: ['.kkkkk', 'kwwwyk', 'kwyyYk', 'kwyyYk', 'kyYYYk', 'kkkkk.'],
};

function mk(rows: string[], col?: string): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.' || ch === ' ') continue;
      x.fillStyle = col || PAL[ch] || '#f0f';
      x.fillRect(i, j, 1, 1);
    }
  });
  return c;
}
function flip(c: HTMLCanvasElement): HTMLCanvasElement {
  const f = document.createElement('canvas');
  f.width = c.width; f.height = c.height;
  const x = f.getContext('2d')!;
  x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0);
  return f;
}

/** c = normal, f = miroir, wh = silhouette blanche (flash de coup). */
export interface Sprite { c: HTMLCanvasElement; f: HTMLCanvasElement; wh: HTMLCanvasElement; w: number; h: number }
export const SPR: Record<string, Sprite> = {};
for (const k in MAPS) { const c = mk(MAPS[k]); SPR[k] = { c, f: flip(c), wh: mk(MAPS[k], '#ffffff'), w: c.width, h: c.height } }

/** Silhouette violette, pour les héros verrouillés. */
export const sil = (k: string) => mk(MAPS[k], '#3a2d58').toDataURL();

/** Tuile de rue 32×32 px source (= 2 u). */
export const tile = document.createElement('canvas');
tile.width = tile.height = 32;
{
  const x = tile.getContext('2d')!;
  x.fillStyle = '#17112a'; x.fillRect(0, 0, 32, 32);
  let sd = 7;
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40; i++) { x.fillStyle = rnd() < 0.5 ? '#1d1636' : '#130e22'; x.fillRect((rnd() * 32) | 0, (rnd() * 32) | 0, 1, 1) }
  x.fillStyle = '#231b3c'; x.fillRect(0, 0, 32, 1); x.fillRect(0, 0, 1, 32);
  x.fillStyle = '#2b1d47'; x.fillRect(16, 0, 1, 32);
}
