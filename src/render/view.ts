import { tile } from './sprites';

export const cv = document.getElementById('c') as HTMLCanvasElement;
export const ctx = cv.getContext('2d')!;
/** W, H en pixels CSS ; S = pixels par unité de monde.
 *  Le plus petit côté de l'écran montre 20 u sur ordinateur et seulement 11 u sur téléphone
 *  (sinon les personnages font 25 px de haut) ; entre les deux, on interpole. */
export const view = { W: 0, H: 0, S: 32 };

export function unitsOnShortSide(short: number): number {
  const MOBILE = 420, DESKTOP = 900;
  if (short <= MOBILE) return 11;
  if (short >= DESKTOP) return 20;
  return 11 + ((short - MOBILE) / (DESKTOP - MOBILE)) * 9;
}

function resize() {
  const d = Math.min(2, window.devicePixelRatio || 1);
  view.W = cv.clientWidth; view.H = cv.clientHeight;
  const short = Math.min(view.W, view.H);
  cv.width = Math.round(view.W * d); cv.height = Math.round(view.H * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.imageSmoothingEnabled = false;
  view.S = short / unitsOnShortSide(short);
}
new ResizeObserver(resize).observe(cv);
resize();

export const pat = ctx.createPattern(tile, 'repeat')!;
