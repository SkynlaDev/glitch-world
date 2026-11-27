/* Données du document de game design : raretés, babioles, armes, ennemis, boss, héros. */
import { fmt } from '../core/util';

export interface Rarity { n: string; c: string; m: number; i: number }
/** m = multiplicateur des bonus, i = incrément des cartes « compte » (flèches, météorites, relances). */
export const RAR: Rarity[] = [
  { n: 'Commun', c: '#b8b8c8', m: 1, i: 1 },
  { n: 'Peu commun', c: '#4be37a', m: 1.5, i: 1 },
  { n: 'Rare', c: '#3d9bff', m: 2, i: 2 },
  { n: 'Épique', c: '#b45cff', m: 2.5, i: 2 },
  { n: 'Légendaire', c: '#ffb52e', m: 3, i: 3 },
];

export type BaubleId = 'prot' | 'perche' | 'cafe' | 'gourde' | 'pans' | 'casque' | 'chaus' | 'aimant' | 'manuel' | 'f5';
export interface Bauble { id: BaubleId; n: string; fam: string; d: (m: number, i: number) => string }

export const BAB: Bauble[] = ([
  ['prot', 'Protéine', 'Attaque', (m) => `+${fmt(5 * m)} % de dégâts, toutes armes`],
  ['perche', 'Perche à selfie', 'Attaque', (m) => `+${fmt(5 * m)} % de portée et de zone`],
  ['cafe', 'Café serré', 'Attaque', (m) => `+${fmt(4 * m)} % de vitesse d'attaque`],
  ['gourde', 'Gourde', 'Défense', (m) => `+${fmt(10 * m)} PV max`],
  ['pans', 'Pansement', 'Défense', (m) => `Régénère ${fmt(0.3 * m)} PV/s`],
  ['casque', 'Casque de vélo', 'Défense', (m) => `−${fmt(4 * m)} % de dégâts subis`],
  ['chaus', 'Chaussettes antidérapantes', 'Mobilité', (m) => `+${fmt(5 * m)} % de vitesse`],
  ['aimant', 'Aimant', 'Économie', (m) => `+${fmt(15 * m)} % de portée de ramassage`],
  ['manuel', 'Manuel de triche', 'Économie', (m) => `+${fmt(5 * m)} % d'XP`],
  ['f5', 'Touche F5', 'Tirages', (_m, i) => `+${i} relance${i > 1 ? 's' : ''} des cartes de niveau`],
] as [BaubleId, string, string, Bauble['d']][]).map(([id, n, fam, d]) => ({ id, n, fam, d }));

export type WeaponId = 'main' | 'epee' | 'arc' | 'meteo';
export interface Special { k: string; n: string; bin?: 1; max?: number }
export interface WeaponDef { n: string; dmg: number; cd: number; zone: number; zl: string; cap: number; desc?: string; sp: Special[] }

export const WD: Record<WeaponId, WeaponDef> = {
  main: { n: 'Haltère Ego', dmg: 18, cd: 1.6, zone: 2.5, zl: 'rayon', cap: 8, sp: [{ k: 'knock', n: 'Recul des ennemis', bin: 1 }, { k: 'double', n: 'Double onde', bin: 1 }] },
  epee: { n: 'Épée', dmg: 14, cd: 1.2, zone: 2, zl: 'portée', cap: 8, desc: 'Coup large à 180°, alterné gauche et droite. 14 dégâts toutes les 1,2 s.', sp: [{ k: 'both', n: 'Frappe des deux côtés', bin: 1 }] },
  arc: { n: 'Arc', dmg: 12, cd: 1, zone: 8, zl: 'portée', cap: 12, desc: "Flèche sur l'ennemi le plus proche, traverse 1 ennemi. 12 dégâts toutes les 1 s.", sp: [{ k: 'count', n: 'flèche', max: 12 }] },
  meteo: { n: 'Météorite', dmg: 35, cd: 3, zone: 2, zl: 'zone', cap: 8, desc: 'Tombe sur le plus gros groupe. 35 dégâts en zone toutes les 3 s.', sp: [{ k: 'count', n: 'météorite', max: 8 }] },
};
export const SECONDARY: WeaponId[] = ['epee', 'arc', 'meteo'];

export type EnemyType = 'zombie' | 'livreur' | 'casseur' | 'videur' | 'fetard';
export interface EnemyDef { n: string; hp: number; sp: number; dmg: number; r: number; col: string; hb?: number; noKnock?: 1; sc: number }

export const ET: Record<EnemyType, EnemyDef> = {
  zombie: { n: 'Zombie', hp: 12, sp: 0.45, dmg: 5, r: 0.42, col: '#7d9a6a', sc: 1 },
  livreur: { n: 'Livreur Express', hp: 8, sp: 1.6, dmg: 8, r: 0.4, col: '#ff8a1f', sc: 1 },
  casseur: { n: 'Casseur', hp: 20, sp: 0.8, dmg: 5, r: 0.42, col: '#d0344f', sc: 1 },
  videur: { n: 'Videur Hitbox XXL', hp: 150, sp: 0.4, dmg: 15, r: 0.7, col: '#22222e', hb: 1.4, noKnock: 1, sc: 1.25 },
  fetard: { n: 'Fêtard en boucle', hp: 30, sp: 0.5, dmg: 5, r: 0.45, col: '#a23cf0', sc: 1 },
};
/** Secondes d'apparition de chaque type spécial. */
export const UNLOCK: Record<Exclude<EnemyType, 'zombie'>, number> = { livreur: 60, casseur: 120, videur: 180, fetard: 240 };
export const BOSSD: EnemyDef = { n: 'DJ Overflow', hp: 2500, sp: 0.55, dmg: 20, r: 1.2, col: '#ff2e88', noKnock: 1, sc: 3 };
export const BOSS_TIME = 600;

/** Itération en cours : un seul type d'ennemi (le zombie), sans boss. Tenir jusqu'à BOSS_TIME = victoire.
 *  Repasser à true pour réactiver les ennemis spéciaux (livreur, casseur, videur, fêtard) et DJ Overflow. */
export const MODE = { specials: false, boss: false };

/** Variantes visuelles du zombie (même comportement) : poids de tirage. */
export const ZOMBIE_VARIANTS = [
  { id: 'normal', w: 60 },
  { id: 'rescape', w: 20 },
  { id: 'casquette', w: 20 },
] as const;

export interface Hero {
  id: string; n: string; r: number; sprite: string; portrait?: string; on?: 1;
  hp?: number; spd?: string; arme?: string; pas?: string; lock?: string;
}
export const HEROES: Hero[] = [
  { id: 'steven', n: 'Steven « Go Muscu »', r: 0, on: 1, sprite: 'steven', portrait: 'art/steven/portrait.png', hp: 120, spd: '0,9',
    arme: 'Haltère Ego : onde de choc autour de lui. 18 dégâts, toutes les 1,6 s, rayon 2,5 u.',
    pas: "Gonflette : chaque ennemi touché donne +2 % de rayon et +1 % de dégâts, jusqu'à 25 cumuls. Ils retombent après 3 s sans toucher." },
  { id: 'maya', n: 'Maya', r: 3, sprite: 'fetard', lock: 'Survivre 5 min' },
  { id: 'bounce', n: 'Mister Bounce', r: 2, sprite: 'livreur', lock: 'Tuer 300 ennemis' },
  { id: 'markico', n: 'Markico', r: 4, sprite: 'videur', lock: 'Toucher 15 ennemis avec une seule attaque' },
];

/** Animation de frappe de Steven : 9 images, l'impact (onde) tombe sur l'image 3. Durée max 0,64 s (14 i/s). */
export const HAMMER = { frames: 9, hit: 3, dur: 0.64 };

/** XP nécessaire pour passer du niveau L au suivant. */
export const need = (L: number): number => Math.round(6 + 5 * (L - 1) + 0.15 * L * L);
