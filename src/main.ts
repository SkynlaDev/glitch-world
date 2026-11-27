import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource/vt323/400.css';
import './style.css';
import { G } from './game/state';
import { update } from './game/update';
import { draw, drawMenuBg } from './render/draw';
import { bindControls } from './ui/controls';
import { bindGamepad, pollGamepad } from './ui/gamepad';
import { hud } from './ui/hud';
import { menu, start } from './ui/screens';

bindControls();
bindGamepad();

let last = performance.now(), hudT = 0, fps = 60;
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps = fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
  pollGamepad(dt);
  if (G) {
    if (G.state === 'play') update(dt);
    if (G.state === 'menu') drawMenuBg(now);
    else draw();
    if ((hudT -= dt) <= 0 && G.state !== 'menu') { hudT = 0.2; hud(fps) }
  }
  requestAnimationFrame(frame);
}
menu();
requestAnimationFrame(frame);

// Points d'entrée pour les tests dans le navigateur.
Object.assign(window, {
  __G: () => G,
  __step: (n: number, dt = 1 / 60) => { for (let i = 0; i < n && G.state === 'play'; i++) update(dt) },
  __start: start,
});
