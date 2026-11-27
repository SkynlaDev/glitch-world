import { input } from '../game/input';
import { G, hooks } from '../game/state';
import { $, togglePause } from './screens';

/* Manette standard (mapping « standard » de l'API Gamepad : Xbox, PlayStation, Switch Pro…).
   En jeu : stick gauche ou croix pour bouger, Start/Select pour la pause.
   Dans les menus : stick ou croix pour déplacer le focus, A pour valider, B pour reprendre. */
const BTN = { A: 0, B: 1, X: 2, Y: 3, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;
const DEAD = 0.2;
const REPEAT_FIRST = 0.35, REPEAT_NEXT = 0.14;

let padIndex: number | null = null;
let prev: boolean[] = [];
let navDir = '', navT = 0;
let focused: HTMLElement | null = null;
/** Vrai dès qu'on touche la manette, faux quand la souris bouge : le surlignage ne s'affiche qu'en jouant à la manette. */
let padActive = false;

const readPad = (): Gamepad | null => {
  const pads = navigator.getGamepads?.() ?? [];
  if (padIndex !== null && pads[padIndex]) return pads[padIndex];
  for (const p of pads) if (p?.connected) { padIndex = p.index; return p }
  return null;
};

/** Zone morte radiale, puis remise à l'échelle 0–1 pour garder les petites inclinaisons utilisables. */
function stick(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y);
  if (l < DEAD) return [0, 0];
  const k = Math.min(1, (l - DEAD) / (1 - DEAD)) / l;
  return [x * k, y * k];
}

/* ---------- Navigation dans les écrans (menu, cartes, pause, fin) ---------- */
const menuOpen = () => !$('ov').classList.contains('hide');
const targets = () => [...$('ov').querySelectorAll<HTMLElement>('button')].filter((b) => b.offsetParent !== null);

function setFocus(el: HTMLElement | null) {
  focused?.classList.remove('gp-focus');
  focused = el;
  if (el) { el.classList.add('gp-focus'); el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }) }
}
/** Focus par défaut : première carte, sinon le bouton principal, sinon le premier bouton. */
function ensureFocus() {
  const list = targets();
  if (focused && list.includes(focused)) return;
  setFocus($('cards').querySelector<HTMLElement>('.card') ?? $('ov').querySelector<HTMLElement>('.btn.p') ?? list[0] ?? null);
}
/** Navigation spatiale : l'élément le plus proche dans la direction voulue. */
function move(dir: string) {
  ensureFocus();
  if (!focused) return;
  const a = focused.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  const [dx, dy] = ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as Record<string, number[]>)[dir];
  let best: HTMLElement | null = null, bs = Infinity;
  for (const el of targets()) {
    if (el === focused) continue;
    const b = el.getBoundingClientRect(), vx = b.x + b.width / 2 - ax, vy = b.y + b.height / 2 - ay;
    const along = vx * dx + vy * dy, across = Math.abs(vx * dy - vy * dx);
    if (along <= 4) continue;
    const score = along + across * 2.5;
    if (score < bs) { bs = score; best = el }
  }
  if (best) setFocus(best);
}

function vibrate(pad: Gamepad | null, ms: number, strong: number, weak: number) {
  const act = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null)?.vibrationActuator;
  act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch(() => {});
}

function toast(txt: string) {
  let t = document.getElementById('pad');
  if (!t) { t = document.createElement('div'); t.id = 'pad'; document.body.append(t) }
  t.textContent = txt;
  t.style.opacity = '1';
  clearTimeout((t as HTMLElement & { _h?: number })._h);
  (t as HTMLElement & { _h?: number })._h = window.setTimeout(() => (t!.style.opacity = '0'), 2200);
}

export function bindGamepad() {
  addEventListener('gamepadconnected', (e) => { padIndex = e.gamepad.index; toast('Manette connectée') });
  addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index !== padIndex) return;
    padIndex = null; input.pad = [0, 0];
    toast('Manette déconnectée');
    if (G?.state === 'play') togglePause();
  });
  // La souris reprend la main : on retire le surlignage manette.
  addEventListener('pointermove', () => { padActive = false; setFocus(null) });
  hooks.hurt = (d) => vibrate(readPad(), 120, Math.min(1, d / 20), 0.4);
}

/** À appeler à chaque image, avant update(). */
export function pollGamepad(dt: number) {
  const pad = readPad();
  if (!pad) return;
  const b = pad.buttons.map((x) => x.pressed);
  const old = prev;
  const pressed = (i: number) => b[i] && !old[i];
  prev = b;
  if (b.some((v, i) => v && i !== BTN.START && i !== BTN.SELECT) || Math.hypot(pad.axes[0] ?? 0, pad.axes[1] ?? 0) > 0.5) padActive = true;

  // Direction : croix prioritaire, sinon stick gauche.
  let [x, y] = stick(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
  const dx = (b[BTN.RIGHT] ? 1 : 0) - (b[BTN.LEFT] ? 1 : 0), dy = (b[BTN.DOWN] ? 1 : 0) - (b[BTN.UP] ? 1 : 0);
  if (dx || dy) { const l = Math.hypot(dx, dy); x = dx / l; y = dy / l }

  if (pressed(BTN.START) || pressed(BTN.SELECT)) {
    if (G?.state === 'play' || G?.state === 'pause') togglePause();
  }

  if (!menuOpen()) { input.pad = [x, y]; setFocus(null); return }
  input.pad = [0, 0];
  if (!padActive) return;
  ensureFocus();

  // Répétition façon menu de console : un pas, une pause, puis défilement.
  const dir = Math.abs(x) < 0.5 && Math.abs(y) < 0.5 ? '' : Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
  if (dir !== navDir) { navDir = dir; navT = REPEAT_FIRST; if (dir) move(dir) }
  else if (dir && (navT -= dt) <= 0) { navT = REPEAT_NEXT; move(dir) }

  if (pressed(BTN.A) && focused) { const el = focused; setFocus(null); el.click(); vibrate(pad, 40, 0, 0.3) }
  if (pressed(BTN.B) && G?.state === 'pause') togglePause();
}
