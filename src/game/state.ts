import { WD, need, type BaubleId, type EnemyDef, type EnemyType, type WeaponId } from '../data/game-data';
import { CARRIER, HACKER, SLOTS, type FragId } from '../data/fragments';

export interface Weapon { id: WeaponId; dmg: number; spd: number; zone: number; over: number; sp: Record<string, number>; t: number; side: number; lv: number }
export interface Player { x: number; y: number; hp: number; maxhp: number; face: number; inv: number; slow: number; st: number; dec: number; lastHit: number; mv: boolean;
  /** Direction 0–7 dans l'ordre des planches : S, SE, E, NE, N, NW, W, SW. */
  dir: number;
  /** Animation de frappe : temps écoulé (−1 = aucune) et durée totale. */
  atkT: number; atkD: number }
export interface Enemy {
  type: EnemyType; d: EnemyDef; x: number; y: number; hp: number; max: number; r: number; elite: boolean;
  hitT: number; cd: number; kx: number; ky: number; id: number; vx: number; vy: number; dead?: boolean; boss?: boolean; atk?: number;
  /** Index dans ZOMBIE_VARIANTS (apparence seulement). */
  variant: number;
  /** Porteur : il scintille et lâche un fragment de code en mourant. */
  carry?: boolean;
}
export interface Projectile { x: number; y: number; vx: number; vy: number; life: number; dm: number; pierce: number; hs: Set<Enemy> }
export interface EnemyShot { x: number; y: number; vx: number; vy: number; life: number }
export interface Fx { k: 'ring' | 'arc' | 'boom' | 'pop'; x: number; y: number; c: string; r: number; dir: number; t: number }
export interface DmgNum { x: number; y: number; v: number; t: number }
/** t = âge (s) ; vx, vy = petit saut à l'apparition, avant que l'aimant puisse l'attirer. */
export interface Orb { x: number; y: number; v: number; mag: number; t: number; vx: number; vy: number }
export interface Puddle { x: number; y: number; life: number }
export interface Chest { x: number; y: number; got?: boolean }
export interface Meteor { x: number; y: number; t: number; z: number; dm: number }
export interface Ring { x: number; y: number; r: number; gaps: number[]; done: number }
export interface Later { t: number; fn: () => void }
/** Fragment de code tombé au sol. */
export interface GroundFrag { x: number; y: number; id: FragId; t: number }
/** Le hacker : rester dans sa zone remplit la jauge (fill 0→1), puis l'interface s'ouvre. */
export interface Hacker { x: number; y: number; life: number; fill: number }
/** Fissure laissée au sol par l'haltère (seed = forme). */
export interface Decal { x: number; y: number; r: number; t: number; seed: number }
/** Sons joués par l'interface ; la logique ne fait que les nommer. */
export type Sfx = 'slam' | 'hit' | 'kill' | 'pickup' | 'level' | 'hurt' | 'swing' | 'arrow' | 'boom' | 'chest' | 'frag' | 'glitch' | 'hack';
export type BossMove = 'drop' | 'sample' | 'chenille' | 'raye';
export interface Telegraph { k: BossMove; t: number; x: number; y: number }
export type GameState = 'menu' | 'play' | 'cards' | 'pause' | 'end' | 'hack';

export interface Game {
  t: number; state: GameState; p: Player;
  en: Enemy[]; orbs: Orb[]; pr: Projectile[]; ep: EnemyShot[]; fx: Fx[]; nums: DmgNum[]; pud: Puddle[]; chests: Chest[]; met: Meteor[]; rings: Ring[]; later: Later[];
  lvl: number; xp: number; need: number; kills: number;
  bab: Partial<Record<BaubleId, number>>; babN: Partial<Record<BaubleId, number>>;
  main: Weapon; sec: Weapon | null; rerolls: number; pendingLv: number; lvTimes: number[];
  nx: Record<'livreur' | 'casseur' | 'videur' | 'fetard', number>; nextElite: number;
  boss: Enemy | null; bossDone: boolean; tele: Telegraph | null; rewind: number; shake: number; nid: number;
  /** Amplitude du tremblement en px ; hitstop = gel de l'image (s) après un très gros coup. */
  shakeAmp: number; hitstop: number; decals: Decal[];
  banner: { t: number; txt: string } | null; dirty: number;
  /** Fragments de code : emplacements de l'arme (null = vide), nombre ouverts, réserve, fragments au sol. */
  slots: (FragId | null)[]; open: number; bag: FragId[]; gfr: GroundFrag[];
  hacker: Hacker | null; nextHacker: number; nextCarrier: number;
  /** Ondes déclenchées encore autorisées (se recharge avec le temps) : borne les réactions en chaîne. */
  chainBudget: number;
}

export interface Card { r: number; icon: string; tag: string; title: string; desc: string; lv: string; key?: string; apply: () => void }

/** Partie en cours (liaison ES vivante : réassignée par newGame). */
export let G: Game;
export const settings = { showNums: true };

/** Points d'accroche vers l'interface, branchés par l'UI : la logique ne touche jamais au DOM. */
export const hooks = {
  end: (_win: boolean) => {},
  /** Le joueur vient de subir des dégâts (vibration de la manette). */
  hurt: (_dmg: number) => {},
  /** Un événement sonore ; k = intensité (ex. nombre d'ennemis touchés par l'onde). */
  sfx: (_name: Sfx, _k?: number) => {},
  cards: (_list: Card[], _title: string, _sub: string, _reroll: boolean) => {},
  /** Le joueur a rempli la jauge du hacker : ouvrir l'atelier des fragments. */
  hack: () => {},
};

export const newW = (id: WeaponId): Weapon => ({ id, dmg: 0, spd: 0, zone: 0, over: 0, sp: {}, t: 0.4, side: 1, lv: 1 });

export function newGame(): Game {
  G = {
    t: 0, state: 'play',
    p: { x: 0, y: 0, hp: 120, maxhp: 120, face: 1, inv: 0, slow: 0, st: 0, dec: 0, lastHit: 9, mv: false, dir: 0, atkT: -1, atkD: 0 },
    en: [], orbs: [], pr: [], ep: [], fx: [], nums: [], pud: [], chests: [], met: [], rings: [], later: [],
    lvl: 1, xp: 0, need: need(1), kills: 0, bab: {}, babN: {}, main: newW('main'), sec: null, rerolls: 0, pendingLv: 0, lvTimes: [],
    nx: { livreur: 60, casseur: 120, videur: 180, fetard: 240 }, nextElite: 120,
    boss: null, bossDone: false, tele: null, rewind: 0, shake: 0, shakeAmp: 0, hitstop: 0, decals: [], nid: 1, banner: null, dirty: 1,
    slots: Array(SLOTS.total).fill(null), open: SLOTS.start, bag: [], gfr: [],
    hacker: null, nextHacker: HACKER.first, nextCarrier: CARRIER.first, chainBudget: 30,
  };
  return G;
}

/** Tremblement d'écran : on garde le plus fort des deux. */
export function shake(t: number, amp: number) {
  G.shake = Math.max(G.shake, t);
  G.shakeAmp = Math.max(G.shake > 0 ? G.shakeAmp : 0, amp);
}

/* ---------- Statistiques dérivées ---------- */
export const bv = (id: BaubleId): number => G.bab[id] || 0;
export const bDmg = () => 0.05 * bv('prot');
export const bZone = () => 0.05 * bv('perche');
export const bSpd = () => 0.04 * bv('cafe');
export const pSpeed = () => 4 * 0.9 * (1 + 0.05 * bv('chaus')) * (G.p.slow > 0 ? 0.7 : 1);
export const pickR = () => 2.2 * (1 + 0.15 * bv('aimant'));
export const taken = () => Math.max(0.4, 1 - 0.04 * bv('casque'));
/** Dégâts = base × (1 + caractéristiques de l'arme + débordement) × (1 + babioles) */
export const wDmg = (w: Weapon) => WD[w.id].dmg * (1 + w.dmg + w.over) * (1 + bDmg());
/** Délai entre deux attaques, plancher 0,3 s. */
export const wDelay = (w: Weapon) => Math.max(0.3, WD[w.id].cd / ((1 + w.spd) * (1 + bSpd()))) * (w.id === 'main' ? 1.25 ** surcharges() : 1);
/** Nombre de Surcharge actives dans l'arme (chacune ralentit la cadence de 25 %). */
export const surcharges = () => G.slots.filter((f) => f === 'surcharge').length;
/** Rayon / portée / zone, plafonné par arme. */
export const wZone = (w: Weapon) => Math.min(WD[w.id].cap, WD[w.id].zone * (1 + w.zone) * (1 + bZone()));
