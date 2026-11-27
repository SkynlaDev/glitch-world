import { dirIndex } from '../game/update';
import { STEVEN_PX_U } from './steven';
import { ctx, view } from './view';

/** Hackintosh, le PNJ hacker (PixelLab, 48 px, 8 vues fixes dans l'ordre S, SE, E, NE, N, NO, O, SO). */
const img = new Image();
img.src = 'art/hackintosh/rotations.png';
const CELL = 48, BASE = 46;

export const hackintoshReady = () => img.complete && img.naturalWidth > 0;

/** Dessine Hackintosh les pieds en (x, y), tourné vers le point (dx, dy) (en unités de monde, depuis lui). */
export function drawHackintosh(x: number, y: number, dx: number, dy: number) {
  const px = STEVEN_PX_U * view.S, w = CELL * px, d = dirIndex(dx, dy);
  ctx.drawImage(img, d * CELL, 0, CELL, CELL, Math.round(x - w / 2), Math.round(y - BASE * px), Math.round(w), Math.round(w));
}
