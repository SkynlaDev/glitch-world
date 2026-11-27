import { input, keys } from '../game/input';
import { G } from '../game/state';
import { cv } from '../render/view';
import { $, togglePause } from './screens';

export function bindControls() {
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === 'escape' || k === 'p') togglePause();
    if (G?.state === 'cards' && '123'.includes(k)) {
      const b = $('cards').children[+k - 1] as HTMLElement | undefined;
      b?.click();
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); input.js = null });

  // Joystick flottant : il naît là où le pouce se pose.
  cv.addEventListener('pointerdown', (e) => {
    input.js = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    const js = input.js;
    if (js && e.pointerId === js.id) { js.x = e.clientX; js.y = e.clientY }
  });
  const endJs = (e: PointerEvent) => { if (input.js && e.pointerId === input.js.id) input.js = null };
  cv.addEventListener('pointerup', endJs);
  cv.addEventListener('pointercancel', endJs);
  $('pb').onclick = () => { if (G) togglePause() };
}
