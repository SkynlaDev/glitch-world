/** État brut des entrées, lu par la logique. Les écouteurs DOM sont posés par ui/controls.ts. */
export const keys = new Set<string>();
export interface Joystick { id: number; ox: number; oy: number; x: number; y: number }
/** pad = stick gauche / croix de la manette, déjà filtré par la zone morte (longueur ≤ 1). */
export const input: { js: Joystick | null; pad: [number, number] } = { js: null, pad: [0, 0] };

/** Direction voulue, normalisée (longueur ≤ 1). ZQSD, WASD, flèches, ou joystick tactile flottant. */
export function moveVector(): [number, number] {
  let ix = 0, iy = 0;
  if (keys.has('q') || keys.has('a') || keys.has('arrowleft')) ix--;
  if (keys.has('d') || keys.has('arrowright')) ix++;
  if (keys.has('z') || keys.has('w') || keys.has('arrowup')) iy--;
  if (keys.has('s') || keys.has('arrowdown')) iy++;
  const js = input.js;
  if (js) {
    const dx = js.x - js.ox, dy = js.y - js.oy, l = Math.hypot(dx, dy);
    if (l > 6) { ix = dx / Math.max(l, 44); iy = dy / Math.max(l, 44) }
  }
  if (!ix && !iy) [ix, iy] = input.pad;
  const l = Math.hypot(ix, iy);
  if (l > 1) { ix /= l; iy /= l }
  return [ix, iy];
}
