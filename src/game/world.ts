import { R, TAU, hyp } from '../core/util';
import { BOSSD, ET, ZOMBIE_VARIANTS, need, type EnemyType } from '../data/game-data';
import { G, bv, hooks, settings, shake, taken, type Enemy, type Fx } from './state';

/* ---------- Grille spatiale (cellules de 2 u) ---------- */
const grid = new Map<number, Enemy[]>(), CS = 2;
const gk = (i: number, j: number) => (i + 50000) * 100003 + (j + 50000);
export function buildGrid() {
  grid.clear();
  for (const e of G.en) {
    if (e.dead) continue;
    const k = gk(Math.floor(e.x / CS), Math.floor(e.y / CS));
    let a = grid.get(k);
    if (!a) grid.set(k, (a = []));
    a.push(e);
  }
}
/** Appelle cb pour chaque ennemi vivant des cellules qui recouvrent le carré (x±r, y±r). */
export function near(x: number, y: number, r: number, cb: (e: Enemy) => void) {
  const x0 = Math.floor((x - r) / CS), x1 = Math.floor((x + r) / CS), y0 = Math.floor((y - r) / CS), y1 = Math.floor((y + r) / CS);
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
    const a = grid.get(gk(i, j));
    if (a) for (const e of a) if (!e.dead) cb(e);
  }
}

/* ---------- Entités ---------- */
function pickVariant(): number {
  let x = R() * ZOMBIE_VARIANTS.reduce((a, v) => a + v.w, 0);
  for (let i = 0; i < ZOMBIE_VARIANTS.length; i++) if ((x -= ZOMBIE_VARIANTS[i].w) <= 0) return i;
  return 0;
}
/** Fait apparaître un ennemi (par défaut sur un cercle de 24 u autour du joueur). PV × (1 + 12 %/min). */
export function spawn(type: EnemyType, elite = false, x?: number, y?: number): Enemy {
  const d = ET[type], sc = 1 + (0.12 * G.t) / 60;
  if (x === undefined || y === undefined) { const a = R() * TAU; x = G.p.x + Math.cos(a) * 24; y = G.p.y + Math.sin(a) * 24 }
  const hp = d.hp * sc * (elite ? 8 : 1);
  const e: Enemy = { type, d, x, y, hp, max: hp, r: d.r * (elite ? 1.3 : 1), elite, hitT: 9, cd: 1 + R() * 2, kx: 0, ky: 0, id: G.nid++, vx: 0, vy: 0, variant: pickVariant() };
  if (type === 'livreur') { const a = Math.atan2(G.p.y - y, G.p.x - x); e.vx = Math.cos(a); e.vy = Math.sin(a) }
  G.en.push(e);
  return e;
}
export function spawnBoss() {
  const b = spawn('zombie', false, G.p.x, G.p.y - 11);
  Object.assign(b, { boss: true, d: BOSSD, hp: BOSSD.hp, max: BOSSD.hp, r: BOSSD.r, atk: 2.5 });
  G.boss = b;
  G.banner = { t: 3, txt: 'DJ OVERFLOW ENTRE EN SCÈNE' };
}

export function hurt(d: number) {
  const p = G.p;
  if (p.inv > 0 || G.state !== 'play') return;
  p.hp -= d * taken(); p.inv = 0.5; shake(0.18, 6);
  hooks.hurt(d); hooks.sfx('hurt');
  if (p.hp <= 0) { p.hp = 0; hooks.end(false) }
}
export function hit(e: Enemy, dmg: number) {
  if (e.dead) return;
  e.hp -= dmg; e.hitT = 0;
  hooks.sfx('hit');
  if (settings.showNums && G.nums.length < 60) G.nums.push({ x: e.x + (R() - 0.5) * 0.5, y: e.y - e.r * 2, v: Math.round(dmg), t: 0 });
  if (e.hp <= 0) kill(e);
}
export function kill(e: Enemy) {
  e.dead = true; G.kills++;
  hooks.sfx('kill');
  if (e.boss) { G.boss = null; G.bossDone = true; fxp('boom', e.x, e.y, '#ff2e88', 4); hooks.end(true); return }
  addOrb(e.x, e.y, e.elite ? 10 : 1);
  if (e.elite) G.chests.push({ x: e.x, y: e.y });
  fxp('pop', e.x, e.y - 0.4, e.d.col);
}
export const fxp = (k: Fx['k'], x: number, y: number, c: string, r = 1, dir = 1) => {
  if (G.fx.length < 90) G.fx.push({ k, x, y, c, r, dir, t: 0 });
};
/** Au-delà de 300 cubes, la valeur est fusionnée dans le cube le plus proche. */
export function addOrb(x: number, y: number, v: number) {
  if (G.orbs.length >= 300) {
    let b = G.orbs[0], bd = 1e9;
    for (const o of G.orbs) { const d = hyp(o.x - x, o.y - y); if (d < bd) { bd = d; b = o } }
    b.v += v; return;
  }
  // Chaque ennemi lâche un cube qui saute un peu hors du corps : on le voit tomber avant qu'il soit aspiré.
  const a = Math.random() * TAU, sp = 1.5 + Math.random();
  G.orbs.push({ x, y, v, mag: 0, t: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
}
export function addXP(v: number) {
  G.xp += v * (1 + 0.05 * bv('manuel'));
  while (G.xp >= G.need) { G.xp -= G.need; G.lvl++; G.need = need(G.lvl); G.pendingLv++; G.lvTimes.push(G.t); hooks.sfx('level') }
}
