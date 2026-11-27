import { HAMMER } from '../data/game-data';
import SHEETS from '../data/steven-sheets.json';
import { G } from '../game/state';
import { ctx, view } from './view';

/** Planches PixelLab de Steven chibi (48 px, 8 directions ; frappe en 4 directions). Voir tools/art/prepare_steven.py. */
type SheetName = keyof typeof SHEETS;
const img: Record<SheetName, HTMLImageElement> = { walk: new Image(), idle: new Image(), hammer: new Image() };
for (const k of Object.keys(img) as SheetName[]) img[k].src = `art/steven/${k}.png`;

/** Taille d'un pixel de sprite en unités de monde : une case de 48 px ≈ 1,6 u, soit ~1,5 u de personnage visible, la taille de l'ancien Steven et des ennemis. */
export const STEVEN_PX_U = 1.6 / 48;
const WALK_FPS = 11, IDLE_FPS = 5;
/** Lignes de la frappe : S, E, N, O. Les diagonales prennent le côté horizontal. */
const ATK_ROW = [0, 1, 1, 1, 2, 3, 3, 3];
/** Image d'impact de chaque ligne de frappe (S, E, N, O) : PixelLab ne la place pas au même endroit. */
const ATK_HIT = [3, 4, 5, 4];

export const stevenReady = () => Object.values(img).every((i) => i.complete && i.naturalWidth > 0);

/** Dessine Steven, les pieds en (x, y). scale = grossissement de la Gonflette. */
export function drawSteven(x: number, y: number, scale: number) {
  const p = G.p, px = STEVEN_PX_U * view.S * scale;
  let name: SheetName, row: number, frame: number;
  if (p.atkT >= 0) {
    name = 'hammer'; row = ATK_ROW[p.dir];
    // Avant l'impact on joue les images 0…hit de la ligne, après on joue le reste : l'impact tombe pile sur l'onde.
    const n = SHEETS.hammer.frames, hit = ATK_HIT[row], u = p.atkT / p.atkD, uHit = HAMMER.hit / HAMMER.frames;
    frame = u < uHit ? Math.floor((u / uHit) * hit) : hit + Math.floor(((u - uHit) / (1 - uHit)) * (n - hit));
    frame = Math.min(n - 1, frame);
  } else if (p.mv) {
    name = 'walk'; row = p.dir; frame = Math.floor(G.t * WALK_FPS) % SHEETS.walk.frames;
  } else {
    name = 'idle'; row = p.dir; frame = Math.floor(G.t * IDLE_FPS) % SHEETS.idle.frames;
  }
  const s = SHEETS[name], w = s.cell * px;
  ctx.drawImage(img[name], frame * s.cell, row * s.cell, s.cell, s.cell, Math.round(x - w / 2), Math.round(y - s.base * px), Math.round(w), Math.round(w));
}
