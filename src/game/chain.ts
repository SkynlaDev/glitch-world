import { TAU, hyp } from '../core/util';
import type { FragId } from '../data/fragments';
import { G, hooks, shake, type Weapon } from './state';
import { fxp, hit, near } from './world';

/** Ce que produit la lecture d'une chaîne de fragments, de gauche à droite à partir de `from`. */
export interface WaveSpec {
  /** Multiplicateur de dégâts (Surcharge). */
  mult: number;
  /** Nombre de répétitions 0,4 s plus tard (Écho), plafonné à 4. */
  echo: number;
  /** Niveaux de division en 3 (Scission), plafonné à 2 : 1 → 3 ondes, 2 → 9 ondes. */
  split: number;
  /** Aspire au lieu de repousser (Inversion). */
  pull: boolean;
  /** Index du premier fragment après « Sur kill → » (−1 = pas de déclencheur). */
  payload: number;
  /** Nombre d'ondes déclenchées par zombie tué (Boucle devant « Sur kill → »). */
  trig: number;
}

export function compile(slots: readonly (FragId | null)[], from = 0): WaveSpec {
  const s: WaveSpec = { mult: 1, echo: 0, split: 0, pull: false, payload: -1, trig: 1 };
  let rep = 1;
  for (let i = from; i < slots.length; i++) {
    const f = slots[i];
    if (!f) continue;
    if (f === 'boucle') { rep *= 2; continue }
    if (f === 'surkill') { s.payload = i + 1; s.trig = Math.min(rep, 4); break }
    for (let k = 0; k < rep; k++) {
      if (f === 'echo') s.echo++;
      else if (f === 'scission') s.split++;
      else if (f === 'inversion') s.pull = true;
      else if (f === 'surcharge') s.mult *= 1.6;
    }
    rep = 1;
  }
  s.echo = Math.min(s.echo, 4);
  s.split = Math.min(s.split, 2);
  return s;
}

/** Profondeur maximale des réactions en chaîne (un kill qui déclenche une onde qui tue…). */
export const MAX_DEPTH = 3;
const ECHO_DT = 0.4;

interface Pulse { x: number; y: number; r: number }

/** Centres et rayons des ondes après Scission : chaque niveau remplace une onde par 3 plus petites autour d'elle. */
function splitPulses(x: number, y: number, r: number, levels: number): Pulse[] {
  let ps: Pulse[] = [{ x, y, r }];
  for (let l = 0; l < levels; l++) {
    const a0 = G.t * 2.3 + l;
    ps = ps.flatMap((p) => [0, 1, 2].map((k) => {
      const a = a0 + (k * TAU) / 3;
      return { x: p.x + Math.cos(a) * p.r * 0.8, y: p.y + Math.sin(a) * p.r * 0.8, r: p.r * 0.55 };
    }));
  }
  return ps;
}

/**
 * Lance l'attaque de l'arme à partir du fragment `from`.
 * main = onde d'origine de l'haltère (gonflette, fissure, gros son) ; sinon onde secondaire (écho, scission, déclenchée).
 */
export function castChain(w: Weapon, x: number, y: number, from: number, depth: number, R0: number, dmg: number, main: boolean) {
  const s = compile(G.slots, from);
  const pulses = splitPulses(x, y, R0, s.split);
  const dm = dmg * s.mult * 0.8 ** s.split;
  const onKill = (kx: number, ky: number) => {
    if (s.payload < 0 || depth >= MAX_DEPTH || G.chainBudget < 1) return;
    G.chainBudget--;
    for (let k = 0; k < s.trig; k++)
      G.later.push({ t: 0.08 + 0.12 * k, fn: () => castChain(w, kx, ky, s.payload, depth + 1, Math.max(1.1, R0 * 0.5), dmg * 0.6, false) });
  };
  const fire = (echo: number) => {
    let n = 0;
    for (const p of pulses) n += pulse(w, p, dm, s.pull, onKill, depth > 0 ? '#ff2e88' : echo ? '#9ff8ff' : '#29f0ff');
    if (main && echo === 0) slamFeel(x, y, R0, n);
    else hooks.sfx('glitch', n);
  };
  fire(0);
  for (let e = 1; e <= s.echo; e++) G.later.push({ t: ECHO_DT * e, fn: () => fire(e) });
}

/** Une onde : touche les ennemis du disque, les repousse ou les aspire, signale chaque kill. Rend le nombre de touchés. */
function pulse(w: Weapon, p: Pulse, dm: number, pull: boolean, onKill: (x: number, y: number) => void, col: string): number {
  let n = 0;
  near(p.x, p.y, p.r + 1.5, (e) => {
    const dx = e.x - p.x, dy = e.y - p.y, d = hyp(dx, dy) || 1;
    if (d >= p.r + e.r) return;
    hit(e, dm); n++;
    if (e.dead) { onKill(e.x, e.y); return }
    if (e.d.noKnock) return;
    if (pull) { const f = Math.min(9, d * 4); e.kx -= (dx / d) * f; e.ky -= (dy / d) * f }
    else if (w.sp.knock) { e.kx += (dx / d) * 7; e.ky += (dy / d) * 7 }
  });
  fxp('ring', p.x, p.y, col, p.r);
  return n;
}

/** Ressenti de l'onde principale : son et tremblement selon le nombre d'ennemis écrasés, fissure, micro-gel à 8+. */
function slamFeel(x: number, y: number, r: number, n: number) {
  const pl = G.p;
  pl.st = Math.min(25, pl.st + n);
  if (n) pl.lastHit = 0;
  hooks.sfx('slam', n);
  const k = Math.min(n, 12);
  shake(0.1 + 0.012 * k, 2 + 0.5 * k);
  if (n >= 8) G.hitstop = Math.max(G.hitstop, 0.05);
  G.decals.push({ x, y, r, t: 0, seed: G.nid++ });
  if (G.decals.length > 6) G.decals.shift();
}

/** Résumé en français de ce que fait la chaîne (atelier du hacker, pause). */
export function describeChain(slots: readonly (FragId | null)[]): string[] {
  const out: string[] = [];
  let from = 0, label = 'Onde';
  for (let depth = 0; depth <= MAX_DEPTH; depth++) {
    const s = compile(slots, from), bits: string[] = [];
    if (s.mult !== 1) bits.push(`dégâts ×${String(Math.round(s.mult * 100) / 100).replace('.', ',')}`);
    if (s.split) bits.push(s.split === 1 ? 'divisée en 3' : 'divisée en 9');
    if (s.pull) bits.push('aspire les zombies');
    if (s.echo) bits.push(`répétée ${s.echo} fois`);
    out.push(`${label} : ${bits.length ? bits.join(', ') : 'normale'}.`);
    if (s.payload < 0) break;
    label = `Sur kill → ${s.trig > 1 ? `${s.trig} petites ondes` : 'petite onde'}`;
    from = s.payload;
  }
  return out;
}

/** Position d'un fragment dans l'atelier : emplacement de l'arme ou réserve. */
export type FragPos = { z: 'slot' | 'bag'; i: number };
export const fragAt = (p: FragPos): FragId | null => (p.z === 'slot' ? G.slots[p.i] : G.bag[p.i] ?? null);

/** Échange deux positions (atelier du hacker). Poser sur la case vide de la réserve y range le fragment. */
export function swapFrag(a: FragPos, b: FragPos) {
  if ((a.z === 'slot' && a.i >= G.open) || (b.z === 'slot' && b.i >= G.open)) return;
  const fa = fragAt(a), fb = fragAt(b), bag: (FragId | null)[] = [...G.bag];
  const put = (p: FragPos, f: FragId | null) => { if (p.z === 'slot') G.slots[p.i] = f; else bag[p.i] = f };
  put(a, fb); put(b, fa);
  G.bag = bag.filter((f): f is FragId => !!f);
  G.dirty = 1;
}
