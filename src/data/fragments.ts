/* Fragments de code : ils se collent dans les emplacements de l'arme et modifient son attaque.
   La chaîne se lit de gauche à droite ; chaque fragment agit sur ce qui sort du précédent.
   Un déclencheur coupe la chaîne : tout ce qui est à sa droite part ailleurs (là où un zombie meurt). */

export type FragId = 'echo' | 'scission' | 'inversion' | 'surcharge' | 'surkill' | 'boucle';
export type FragFam = 'mod' | 'trig' | 'mult';

export interface FragDef {
  id: FragId; n: string; code: string; fam: FragFam; d: string; col: string;
  /** Poids de tirage quand un porteur en lâche un. */
  w: number;
}

export const FRAG: Record<FragId, FragDef> = {
  echo: { id: 'echo', n: 'Écho', code: 'echo()', fam: 'mod', col: '#29f0ff', w: 22,
    d: "L'onde se répète 0,4 s plus tard au même endroit." },
  scission: { id: 'scission', n: 'Scission', code: 'split(3)', fam: 'mod', col: '#29f0ff', w: 22,
    d: "L'onde se divise en 3 ondes plus petites autour du point d'impact." },
  inversion: { id: 'inversion', n: 'Inversion', code: 'invert()', fam: 'mod', col: '#29f0ff', w: 18,
    d: "L'onde aspire les zombies vers son centre au lieu de les repousser." },
  surcharge: { id: 'surcharge', n: 'Surcharge', code: 'overclock()', fam: 'mod', col: '#ffe14d', w: 18,
    d: '+60 % de dégâts, mais l’arme frappe 25 % moins souvent.' },
  surkill: { id: 'surkill', n: 'Sur kill →', code: 'onKill:', fam: 'trig', col: '#ff2e88', w: 12,
    d: 'Coupe la chaîne : les fragments à sa droite partent en petite onde là où un zombie meurt.' },
  boucle: { id: 'boucle', n: 'Boucle', code: 'loop(2)', fam: 'mult', col: '#a23cf0', w: 8,
    d: 'Le fragment suivant agit deux fois.' },
};

export const FRAG_IDS = Object.keys(FRAG) as FragId[];

/** Emplacements de l'arme : 5, dont 3 ouverts au départ ; les suivants s'ouvrent à ces niveaux. */
export const SLOTS = { total: 5, start: 3, unlockAt: [10, 20] };

/** Zombies porteurs (ils brillent et lâchent un fragment) et passages du hacker, en secondes. */
export const CARRIER = { first: 30, every: 40, jitter: 20 };
export const HACKER = { first: 90, every: 120, life: 40, radius: 1.6, fill: 3, dist: 7 };
