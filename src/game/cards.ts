import { R, fmt, pick } from '../core/util';
import { BAB, MODE, RAR, SECONDARY, WD } from '../data/game-data';
import { ICON } from '../data/icons';
import { G, bv, newW, surcharges, wDelay, wZone, type Card, type Weapon } from './state';

/** Tire une rareté ; les poids montent avec le temps. min = rareté minimale (index). */
export function rollR(min = 0): number {
  const m = G.t / 60, w = [Math.max(30, 60 - 3 * m), 25 + m, 10 + m, 4 + 0.6 * m, 1 + 0.4 * m];
  for (let i = 0; i < min; i++) w[i] = 0;
  let x = R() * w.reduce((a, b) => a + b);
  for (let i = 0; i < 5; i++) { x -= w[i]; if (x <= 0) return i }
  return 4;
}

/** Carte d'amélioration d'arme. Une stat au plafond devient une carte « débordement » (+dégâts). */
export function wCard(w: Weapon, r: number): Card {
  const d = WD[w.id], m = RAR[r].m, ii = RAR[r].i, opts = ['dmg', 'spd', 'zone', ...d.sp.map((s) => s.k)], k = pick(opts);
  const base = { r, icon: ICON[w.id], lv: `Niv ${w.lv} → ${w.lv + 1}`, key: w.id + k };
  const mkc = (tag: string, title: string, desc: string, fn: () => void): Card =>
    ({ ...base, tag, title, desc, apply: () => { fn(); w.lv++; G.dirty = 1 } });
  const over = () => mkc('Arme · débordement', d.n, `Stat au seuil : +${fmt(15 * m)} % de dégâts`, () => (w.over += 0.15 * m));
  if (k === 'dmg') return mkc('Arme', `${d.n} : dégâts`, `+${fmt(10 * m)} % de dégâts de base`, () => (w.dmg += 0.1 * m));
  if (k === 'spd') return wDelay(w) <= 0.301 * (w.id === 'main' ? 1.25 ** surcharges() : 1) ? over() : mkc('Arme', `${d.n} : cadence`, `+${fmt(6 * m)} % de vitesse d'attaque`, () => (w.spd += 0.06 * m));
  if (k === 'zone') return wZone(w) >= d.cap - 0.01 ? over() : mkc('Arme', `${d.n} : ${d.zl}`, `+${fmt(10 * m)} % de ${d.zl}`, () => (w.zone += 0.1 * m));
  const s = d.sp.find((x) => x.k === k)!;
  if (s.bin) return w.sp[k] ? over() : mkc('Arme · carte spéciale', `${d.n} : ${s.n}`, 'Une fois, puis débordement', () => (w.sp[k] = 1));
  const cur = w.sp[k] || 1;
  if (cur >= s.max!) return over();
  const add = Math.min(ii, s.max! - cur);
  return mkc('Arme · carte spéciale', `${d.n} : +${add} ${s.n}${add > 1 ? 's' : ''}`, `${cur} → ${cur + add} ${s.n}s par attaque`, () => (w.sp[k] = cur + add));
}

/** Carte de babiole, en évitant celles déjà proposées dans le même tirage. */
export function bCard(r: number, used: Set<string>): Card {
  const pool = BAB.filter((b) => !used.has(b.id)), b = pick(pool), m = RAR[r].m, i = RAR[r].i, n = G.babN[b.id] || 0;
  return {
    r, icon: ICON[b.id], tag: `Babiole · ${b.fam}`, title: b.n, desc: b.d(m, i), lv: n ? `Niv ${n} → ${n + 1}` : 'Nouveau', key: b.id,
    apply: () => {
      if (b.id === 'f5') G.rerolls += i;
      G.bab[b.id] = bv(b.id) + (b.id === 'f5' ? i : m);
      G.babN[b.id] = n + 1;
      G.dirty = 1;
      if (b.id === 'gourde') { G.p.maxhp += 10 * m; G.p.hp += 10 * m }
    },
  };
}

/** Tirage de montée de niveau : 1er niveau = choix de l'arme secondaire, ensuite arme + babiole + l'un ou l'autre. */
export function makeCards(): Card[] {
  if (MODE.secondary && !G.sec)
    return SECONDARY.map((id) => ({
      r: -1, icon: ICON[id], lv: 'Nouveau', tag: 'Arme secondaire, gardée toute la run', title: WD[id].n, desc: WD[id].desc!,
      apply: () => { G.sec = newW(id); G.dirty = 1 },
    }));
  const used = new Set<string>(), ws = [G.main, G.sec].filter((w): w is Weapon => !!w);
  const W1 = (): Card | undefined => {
    for (let k = 0; k < 12; k++) { const c = wCard(pick(ws), rollR()); if (!used.has(c.key!)) { used.add(c.key!); return c } }
  };
  const B1 = (): Card => { const c = bCard(rollR(), used); used.add(c.key!); return c };
  return [W1(), B1(), R() < 0.5 ? W1() : B1()].filter((c): c is Card => !!c).sort(() => R() - 0.5);
}

/** Coffre d'élite : trois babioles, rare ou mieux. */
export function chestCards(): Card[] {
  const used = new Set<string>();
  return [0, 1, 2].map(() => { const c = bCard(rollR(2), used); used.add(c.key!); return c });
}
