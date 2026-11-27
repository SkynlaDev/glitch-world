import { R, TAU, hyp, pick } from '../core/util';
import { BOSS_TIME, HAMMER, MODE, UNLOCK, type EnemyType } from '../data/game-data';
import { CARRIER, HACKER } from '../data/fragments';
import { chestCards, makeCards } from './cards';
import { moveVector } from './input';
import { G, bv, hooks, pSpeed, pickR, wDelay, type BossMove, type Enemy } from './state';
import { FIRE } from './weapons';
import { addXP, buildGrid, fxp, hurt, hit, near, spawn, spawnBoss, takeFrag } from './world';

const MAX_EN = 260;

/** Directeur d'apparitions : nappe de zombies + types spéciaux à cadence croissante + élites + boss à 10:00 (selon MODE). */
function director() {
  const m = G.t / 60, bossOn = !!G.boss;
  let nc = 0;
  for (const e of G.en) if (e.type === 'zombie' && !e.boss && !e.dead) nc++;
  const target = Math.min(190, 22 + 15 * m) * (bossOn ? 0.3 : 1);
  let k = 0;
  while (nc < target && k++ < 5 && G.en.length < MAX_EN) { spawn('zombie'); nc++ }
  if (!G.bossDone && !bossOn && G.t >= BOSS_TIME) {
    if (MODE.boss) { spawnBoss(); return }
    // Sans boss, tenir jusqu'à 10:00 suffit pour gagner (l'endless continue ensuite).
    G.bossDone = true; hooks.end(true); return;
  }
  if (bossOn) return;
  // Zombie porteur : il scintille et lâche un fragment de code. Jamais plus de 2 à la fois.
  if (G.t >= G.nextCarrier) {
    G.nextCarrier = G.t + CARRIER.every + R() * CARRIER.jitter;
    if (G.en.filter((e) => e.carry).length < 2) {
      const a = R() * TAU, e = spawn('zombie', false, G.p.x + Math.cos(a) * 13, G.p.y + Math.sin(a) * 13);
      e.carry = true; e.hp = e.max = e.max * 2;
    }
  }
  // Le hacker s'installe à quelques pas, le temps de passer réarranger ses fragments.
  if (!G.hacker && G.t >= G.nextHacker) {
    G.nextHacker = G.t + HACKER.every;
    const a = R() * TAU;
    G.hacker = { x: G.p.x + Math.cos(a) * HACKER.dist, y: G.p.y + Math.sin(a) * HACKER.dist, life: HACKER.life, fill: 0 };
    G.banner = { t: 3, txt: 'Hackintosh est là · reste dans sa zone' };
  }
  const ev = { livreur: Math.max(2.2, 6 - 0.3 * m), casseur: Math.max(3, 8 - 0.4 * m), videur: Math.max(8, 22 - m), fetard: Math.max(4, 10 - 0.5 * m) };
  for (const t of Object.keys(ev) as (keyof typeof ev)[]) {
    if (!MODE.specials) break;
    if (G.t < G.nx[t] || G.en.length >= MAX_EN) continue;
    G.nx[t] = G.t + ev[t];
    if (t === 'livreur') {
      // Les livreurs arrivent en petit convoi, tous du même côté.
      const a = R() * TAU, g = 1 + ((R() * Math.min(3, 1 + m / 3)) | 0);
      for (let i = 0; i < g; i++) spawn(t, false, G.p.x + Math.cos(a) * 24 + (R() - 0.5) * 2, G.p.y + Math.sin(a) * 24 + (R() - 0.5) * 2);
    } else spawn(t);
  }
  if (G.t >= G.nextElite) {
    G.nextElite += 75;
    const pool: EnemyType[] = (['zombie', 'casseur', 'videur', 'fetard'] as const).filter((t) => t === 'zombie' || (MODE.specials && G.t >= UNLOCK[t]));
    spawn(pick(pool), true);
  }
}

/** DJ Overflow : une attaque télégraphiée (1 s) toutes les 3,6 s. Renvoie le facteur de déplacement. */
function bossAI(b: Enemy, dt: number, dist: number): number {
  const p = G.p;
  b.atk! -= dt;
  if (G.tele) {
    G.tele.t -= dt;
    if (G.tele.t <= 0) {
      const k = G.tele.k;
      if (k === 'drop') G.rings.push({ x: b.x, y: b.y, r: 0, gaps: [0, 1, 2].map(() => R() * TAU), done: 0 });
      if (k === 'sample') { if (hyp(p.x - G.tele.x, p.y - G.tele.y) < 2.5) hurt(20); fxp('ring', G.tele.x, G.tele.y, '#ff2e88', 2.5) }
      if (k === 'chenille') for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; spawn('zombie', false, p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7) }
      if (k === 'raye') G.rewind = 3;
      G.tele = null;
    }
  } else if (b.atk! <= 0) {
    b.atk = 3.6;
    const k = pick<BossMove>(['drop', 'drop', 'sample', 'chenille', 'raye']);
    G.tele = { k, t: 1, x: p.x, y: p.y };
  }
  return dist < 5 ? 0 : 1;
}

/** Vecteur écran (y vers le bas) → direction 0–7 : S, SE, E, NE, N, NW, W, SW. */
/** Temps (s) pendant lequel un cube tout juste lâché reste visible avant de pouvoir être aspiré. */
const ORB_SETTLE = 0.35;

export function dirIndex(x: number, y: number): number {
  const k = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return (((2 - k) % 8) + 8) % 8;
}

export function update(dt: number) {
  const p = G.p;
  // Micro-gel après un très gros coup : tout s'arrête un instant (le temps de jeu aussi).
  if (G.hitstop > 0) { G.hitstop -= dt; return }
  G.t += dt;
  const [ix, iy] = moveVector(), l = hyp(ix, iy);
  if (Math.abs(ix) > 0.1) p.face = Math.sign(ix);
  p.mv = l > 0.05;
  if (p.mv) p.dir = dirIndex(ix, iy);
  const sp = pSpeed();
  p.x += ix * sp * dt; p.y += iy * sp * dt;
  p.inv -= dt; p.slow -= dt; p.lastHit += dt; G.rewind -= dt; G.shake -= dt;
  for (const d of G.decals) d.t += dt;
  G.decals = G.decals.filter((d) => d.t < 1.2);
  if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
  // Gonflette : les cumuls retombent un par un après 3 s sans toucher.
  if (p.lastHit > 3 && p.st > 0 && (p.dec -= dt) <= 0) { p.st--; p.dec = 0.15 }
  p.hp = Math.min(p.maxhp, p.hp + 0.3 * bv('pans') * dt);

  director();
  buildGrid();

  // Séparation douce entre ennemis.
  for (const e of G.en) {
    if (e.dead) continue;
    near(e.x, e.y, e.r + 0.8, (o) => {
      if (o === e) return;
      const dx = e.x - o.x, dy = e.y - o.y, d = hyp(dx, dy), mn = e.r + o.r;
      if (d < mn && d > 0) { const f = (mn - d) * 0.5; e.x += (dx / d) * f * 0.5; e.y += (dy / d) * f * 0.5 }
    });
  }

  for (const e of G.en) {
    if (e.dead) continue;
    e.hitT += dt;
    const dx = p.x - e.x, dy = p.y - e.y, dist = hyp(dx, dy) || 1;
    let ux = dx / dist, uy = dy / dist, mv = 1;
    if (e.boss) mv = bossAI(e, dt, dist);
    else if (e.type === 'livreur') { ux = e.vx; uy = e.vy }
    // Casseur : s'approche à 6,5 u puis reste planté et lance ses pavés. Il ne recule jamais.
    else if (e.type === 'casseur') {
      if (dist < 6.5) mv = 0;
      if ((e.cd -= dt) <= 0 && dist < 12) { e.cd = 3; G.ep.push({ x: e.x, y: e.y - 0.4, vx: ux * 7, vy: uy * 7, life: 1.8 }) }
    } else if (e.type === 'fetard' && (e.cd -= dt) <= 0) { e.cd = 2.5; G.pud.push({ x: e.x, y: e.y, life: 4 }) }
    // Disque rayé : tout le monde recule pendant 3 s.
    if (G.rewind > 0 && !e.boss && e.type !== 'livreur') { ux = -dx / dist; uy = -dy / dist; mv = 1.2 }
    const s = e.d.sp * 4 * (e.elite ? 0.9 : 1) * mv;
    e.x += (ux * s + e.kx) * dt; e.y += (uy * s + e.ky) * dt;
    e.kx *= 0.86; e.ky *= 0.86;
    // Trop loin : on le replace devant le joueur (les livreurs disparaissent).
    if (dist > 32 && !e.boss) {
      if (e.type === 'livreur') { e.dead = true; continue }
      const a = Math.atan2(iy || R() - 0.5, ix || R() - 0.5) + (R() - 0.5) * 1.6;
      e.x = p.x + Math.cos(a) * 24; e.y = p.y + Math.sin(a) * 24;
    }
    if (dist < e.r + 0.4) {
      hurt(e.d.dmg * (e.elite ? 1.5 : 1));
      if (e.type === 'livreur' && !e.elite) { e.dead = true; fxp('pop', e.x, e.y - 0.4, '#ffe14d') }
    }
  }

  // L'animation de frappe démarre en avance pour que son image d'impact coïncide avec l'onde.
  if (p.atkT >= 0 && (p.atkT += dt) >= p.atkD) p.atkT = -1;
  if (p.atkT < 0) {
    const D = Math.min(HAMMER.dur, wDelay(G.main) * 0.95);
    if (G.main.t - dt <= (D * HAMMER.hit) / HAMMER.frames) { p.atkT = 0; p.atkD = D }
  }
  for (const w of [G.main, G.sec]) {
    if (!w) continue;
    w.t -= dt;
    if (w.t <= 0) { w.t = wDelay(w); FIRE[w.id](w) }
  }
  for (const lt of G.later) if ((lt.t -= dt) <= 0) lt.fn();
  G.later = G.later.filter((lt) => lt.t > 0);

  for (const q of G.pr) {
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    near(q.x, q.y, 2, (e) => {
      if (q.life <= 0 || q.hs.has(e)) return;
      const rr = (e.d.hb || e.r) + 0.2, ey = e.y - 0.4;
      if (hyp(e.x - q.x, ey - q.y) < rr * 1.2) {
        q.hs.add(e); hit(e, q.dm);
        if (e.type === 'videur' || q.pierce-- <= 0) q.life = 0; // le Videur arrête toujours la flèche
      }
    });
  }
  G.pr = G.pr.filter((q) => q.life > 0);

  for (const m of G.met) if ((m.t -= dt) <= 0) {
    near(m.x, m.y, m.z + 1.5, (e) => { if (hyp(e.x - m.x, e.y - m.y) < m.z + e.r) hit(e, m.dm) });
    hooks.sfx('boom');
    fxp('boom', m.x, m.y, '#ff8a1f', m.z);
  }
  G.met = G.met.filter((m) => m.t > 0);

  for (const q of G.ep) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (hyp(q.x - p.x, q.y - (p.y - 0.4)) < 0.55) { hurt(8); q.life = 0 } }
  G.ep = G.ep.filter((q) => q.life > 0);
  for (const u of G.pud) { u.life -= dt; if (hyp(u.x - p.x, u.y - p.y) < 0.9) p.slow = 3 }
  G.pud = G.pud.filter((u) => u.life > 0);

  // Anneaux du « drop » : 3 trous par lesquels passer.
  for (const r of G.rings) {
    r.r += 7 * dt;
    const d = hyp(p.x - r.x, p.y - r.y);
    if (!r.done && Math.abs(d - r.r) < 0.45) {
      const a = (Math.atan2(p.y - r.y, p.x - r.x) + TAU) % TAU;
      if (!r.gaps.some((g) => Math.abs(((a - g + TAU * 1.5) % TAU) - Math.PI) < 0.35)) { hurt(15); r.done = 1 }
    }
  }
  G.rings = G.rings.filter((r) => r.r < 26);

  const pr = pickR();
  for (const o of G.orbs) {
    o.t += dt;
    if (o.t < ORB_SETTLE) { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.9; o.vy *= 0.9; continue }
    const dx = p.x - o.x, dy = p.y - o.y, d = hyp(dx, dy) || 1;
    if (d < pr) o.mag = 1;
    if (o.mag) { o.x += (dx / d) * 12 * dt; o.y += (dy / d) * 12 * dt }
    if (d < 0.5) { addXP(o.v); o.v = 0; hooks.sfx('pickup') }
  }
  G.orbs = G.orbs.filter((o) => o.v > 0);

  // Fragments au sol : petit saut à l'apparition, puis on les prend en passant dessus.
  for (const f of G.gfr) {
    f.t += dt;
    if (f.t > 0.4 && hyp(f.x - p.x, f.y - p.y) < 0.8) { takeFrag(f.id); f.t = -1 }
  }
  G.gfr = G.gfr.filter((f) => f.t >= 0);
  G.chainBudget = Math.min(30, G.chainBudget + 20 * dt);

  // Hacker : la jauge se remplit dans sa zone et retombe dehors ; pleine, elle ouvre l'atelier (le jeu se met en pause).
  const hk = G.hacker;
  if (hk) {
    const inside = hyp(hk.x - p.x, hk.y - p.y) < HACKER.radius;
    hk.fill = Math.max(0, hk.fill + (inside ? dt / HACKER.fill : -dt / HACKER.fill / 2));
    hk.life -= inside ? 0 : dt;
    if (hk.fill >= 1 && G.state === 'play') { G.hacker = null; hooks.sfx('hack'); hooks.hack() }
    else if (hk.life <= 0) { G.hacker = null; G.banner = { t: 2, txt: 'Le hacker est parti' } }
  }

  for (const c of G.chests) if (G.state === 'play' && hyp(c.x - p.x, c.y - p.y) < 0.9) {
    c.got = true;
    hooks.sfx('chest');
    hooks.cards(chestCards(), "Coffre d'élite", 'Une babiole, rare ou mieux.', false);
  }
  G.chests = G.chests.filter((c) => !c.got);

  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter((f) => f.t < 0.4);
  for (const n of G.nums) n.t += dt;
  G.nums = G.nums.filter((n) => n.t < 0.6);
  G.en = G.en.filter((e) => !e.dead);

  if (G.state === 'play' && G.pendingLv > 0) {
    G.pendingLv--;
    const sec = MODE.secondary && !G.sec;
    hooks.cards(
      makeCards(),
      sec ? 'Arme secondaire' : `Niveau ${G.lvl - G.pendingLv} !`,
      sec ? "Choisis ton arme secondaire. Elle reste jusqu'à la fin de la run." : 'Choisis une carte.',
      !sec,
    );
  }
}
