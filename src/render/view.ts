import { tile } from './sprites';

export const cv = document.getElementById('c') as HTMLCanvasElement;
export const ctx = cv.getContext('2d')!;
/** W, H en pixels CSS ; S = pixels par unité de monde (l'écran montre ~20 u sur son plus petit côté). */
export const view = { W: 0, H: 0, S: 32 };

function resize() {
  const d = Math.min(2, window.devicePixelRatio || 1);
  view.W = cv.clientWidth; view.H = cv.clientHeight;
  cv.width = Math.round(view.W * d); cv.height = Math.round(view.H * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.imageSmoothingEnabled = false;
  view.S = Math.min(view.W, view.H) / 20;
}
new ResizeObserver(resize).observe(cv);
resize();

export const pat = ctx.createPattern(tile, 'repeat')!;
