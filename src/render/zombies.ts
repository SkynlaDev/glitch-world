import { ZOMBIE_VARIANTS } from '../data/game-data';
import SHEETS from '../data/zombie-sheets.json';
import { G, type Enemy } from '../game/state';
import { dirIndex } from '../game/update';
import { STEVEN_PX_U } from './steven';
import { ctx, view } from './view';

/** Planches de marche PixelLab des zombies chibi (une par variante, 8 directions). Voir tools/art/prepare_zombies.py. */
interface Sheet { cell: number; rows: number; frames: number; base: number }
const META = SHEETS as Record<string, Sheet>;
interface Loaded { img: HTMLImageElement; white: HTMLCanvasElement | null; m: Sheet }
const loaded: Record<string, Loaded> = {};
for (const [id, m] of Object.entries(META)) {
  const img = new Image(), l: Loaded = { img, white: null, m };
  img.onload = () => {
    // Silhouette blanche pour le flash de coup.
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d')!;
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    l.white = c;
  };
  img.src = `art/zombie/${id}/walk.png`;
  loaded[id] = l;
}
const WALK_FPS = 8;
/** Les zombies sont dessinés à 80 % de l'échelle de Steven : le héros doit ressortir de la horde. */
export const ZOMBIE_SCALE = 0.8;

/** Planche de la variante, sinon celle du zombie normal, sinon null (repli sur l'ancien sprite). */
function sheetFor(e: Enemy): Loaded | null {
  for (const id of [ZOMBIE_VARIANTS[e.variant]?.id, 'normal']) {
    const l = id && loaded[id];
    if (l && l.white) return l;
  }
  return null;
}

/** Dessine un zombie chibi, pieds en (x, y). Renvoie la hauteur dessinée en px, ou 0 si aucune planche n'est prête. */
export function drawZombie(e: Enemy, x: number, y: number, scale: number, white: boolean): number {
  const l = sheetFor(e);
  if (!l) return 0;
  const { m } = l, px = STEVEN_PX_U * ZOMBIE_SCALE * view.S * scale, w = m.cell * px;
  const row = m.rows === 8 ? dirIndex(G.p.x - e.x, G.p.y - e.y) : 0;
  const frame = m.frames > 1 ? Math.floor(G.t * WALK_FPS + e.id * 0.37) % m.frames : 0;
  const src = white ? l.white! : l.img;
  const draw = (dx: number) =>
    ctx.drawImage(src, frame * m.cell, row * m.cell, m.cell, m.cell, Math.round(x - w / 2 + dx), Math.round(y - m.base * px), Math.round(w), Math.round(w));
  if (e.elite && !white) {
    // Élite : double image décalée, façon aberration chromatique.
    ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter';
    draw(-3); draw(3);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  draw(0);
  return m.base * px;
}
