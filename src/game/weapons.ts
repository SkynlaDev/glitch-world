import { R, hyp, pick } from '../core/util';
import type { WeaponId } from '../data/game-data';
import { castChain } from './chain';
import { G, hooks, wDmg, wZone, type Weapon } from './state';
import { fxp, hit, near } from './world';

/** Onde de l'haltère, passée dans la chaîne de fragments. Gonflette : +2 % de rayon et +1 % de dégâts par cumul (max 25). */
function fireMain(w: Weapon, x: number, y: number) {
  const p = G.p;
  castChain(w, x, y, 0, 0, wZone(w) * (1 + 0.02 * p.st), wDmg(w) * (1 + 0.01 * p.st), true);
}

export const FIRE: Record<WeaponId, (w: Weapon) => void> = {
  main: (w) => {
    const p = G.p;
    fireMain(w, p.x, p.y);
    if (w.sp.double) { const x = p.x, y = p.y; G.later.push({ t: 0.35, fn: () => fireMain(w, x, y) }) }
  },
  epee: (w) => {
    const p = G.p, rg = wZone(w), dm = wDmg(w), sides = w.sp.both ? [1, -1] : [(w.side = -w.side)];
    hooks.sfx('swing');
    for (const s of sides) {
      near(p.x, p.y, rg + 1.5, (e) => {
        const dx = e.x - p.x, dy = e.y - p.y;
        if (hyp(dx, dy) < rg + e.r && dx * s >= -e.r) hit(e, dm);
      });
      fxp('arc', p.x, p.y - 0.4, '#ffe14d', rg, s);
    }
  },
  arc: (w) => {
    const p = G.p, rg = wZone(w), n = w.sp.count || 1, c: [number, (typeof G.en)[number]][] = [];
    near(p.x, p.y, rg, (e) => { const d = hyp(e.x - p.x, e.y - p.y); if (d < rg) c.push([d, e]) });
    if (!c.length) return;
    c.sort((a, b) => a[0] - b[0]);
    hooks.sfx('arrow');
    for (let i = 0; i < n; i++) {
      const t = c[i % c.length][1], a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= c.length ? (R() - 0.5) * 0.5 : 0);
      G.pr.push({ x: p.x, y: p.y - 0.4, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, life: rg / 14, dm: wDmg(w), pierce: 1, hs: new Set() });
    }
  },
  meteo: (w) => {
    const p = G.p, n = w.sp.count || 1, z = wZone(w), dm = wDmg(w);
    const cand = G.en.filter((e) => !e.dead && !e.boss && Math.abs(e.x - p.x) < 14 && Math.abs(e.y - p.y) < 12);
    if (G.boss) cand.push(G.boss);
    if (!cand.length) return;
    const picks: { x: number; y: number }[] = [];
    for (let k = 0; k < n; k++) {
      let best = cand[0], bs = -1;
      for (let s = 0; s < 16; s++) {
        const e = pick(cand);
        let c = 0;
        near(e.x, e.y, z, (o) => { if (hyp(o.x - e.x, o.y - e.y) < z) c++ });
        if (picks.some((q) => hyp(q.x - e.x, q.y - e.y) < z)) c *= 0.3;
        if (c > bs) { bs = c; best = e }
      }
      picks.push({ x: best.x, y: best.y });
    }
    for (const q of picks) G.met.push({ x: q.x, y: q.y, t: 0.6, z, dm });
  },
};
