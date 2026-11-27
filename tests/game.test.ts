import { beforeEach, describe, expect, it } from 'vitest';
import { BOSSD, HAMMER, MODE, ZOMBIE_VARIANTS, need } from '../src/data/game-data';
import { bCard, chestCards, makeCards, rollR } from '../src/game/cards';
import { G, hooks, newGame, wDelay, wDmg, wZone } from '../src/game/state';
import { dirIndex, update } from '../src/game/update';
import { addXP, buildGrid, hit, spawn, takeFrag } from '../src/game/world';
import { castChain, compile, describeChain, swapFrag } from '../src/game/chain';
import { SLOTS } from '../src/data/fragments';

let ended: boolean | null, offered: number;
beforeEach(() => {
  newGame();
  ended = null; offered = 0;
  hooks.end = (w) => { ended = w; G.state = 'end' };
  hooks.sfx = () => {};
  hooks.hack = () => {};
  // Simule un joueur qui prend toujours la première carte.
  hooks.cards = (list) => { offered++; list[0].apply(); G.state = 'play' };
});

describe('formules', () => {
  it("courbe d'XP", () => {
    expect(need(1)).toBe(6);
    expect(need(2)).toBe(12);
    expect(need(10)).toBe(66);
  });
  it('stats de base de l’haltère', () => {
    expect(wDmg(G.main)).toBe(18);
    expect(wDelay(G.main)).toBe(1.6);
    expect(wZone(G.main)).toBe(2.5);
  });
  it('cadence plancher 0,3 s et zone plafonnée', () => {
    G.main.spd = 100; G.main.zone = 100;
    expect(wDelay(G.main)).toBe(0.3);
    expect(wZone(G.main)).toBe(8);
  });
  it('protéine : +5 % de dégâts par point', () => {
    G.bab.prot = 2;
    expect(wDmg(G.main)).toBeCloseTo(18 * 1.1);
  });
});

describe('cartes', () => {
  it("le premier niveau propose les 3 armes secondaires (MODE.secondary)", () => {
    MODE.secondary = true;
    try {
      const c = makeCards();
      expect(c.map((x) => x.title)).toEqual(['Épée', 'Arc', 'Météorite']);
      c[1].apply();
      expect(G.sec?.id).toBe('arc');
    } finally { MODE.secondary = false }
  });
  it('armes secondaires désactivées : jamais proposées, seule l’haltère évolue', () => {
    for (let i = 0; i < 100; i++) {
      const c = makeCards();
      expect(c.some((x) => ['Épée', 'Arc', 'Météorite'].includes(x.title))).toBe(false);
      c[0].apply();
    }
    expect(G.sec).toBeNull();
  });
  it('ensuite, 3 cartes sans doublon', () => {
    makeCards()[0].apply();
    for (let i = 0; i < 200; i++) {
      const keys = makeCards().map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it('rollR(min) respecte la rareté minimale', () => {
    for (let i = 0; i < 500; i++) expect(rollR(2)).toBeGreaterThanOrEqual(2);
    expect(chestCards().every((c) => c.r >= 2)).toBe(true);
  });
  it('la gourde augmente les PV max et actuels', () => {
    const used = new Set(['prot', 'perche', 'cafe', 'pans', 'casque', 'chaus', 'aimant', 'manuel', 'f5']);
    bCard(0, used).apply();
    expect(G.p.maxhp).toBe(130);
    expect(G.p.hp).toBe(130);
  });
  it('une stat binaire déjà prise devient un débordement', () => {
    G.main.sp.knock = 1; G.main.sp.double = 1; G.main.spd = 100; G.main.zone = 100;
    for (let i = 0; i < 50; i++) {
      const c = makeCards().find((x) => x.key?.startsWith('main') && !x.key.endsWith('dmg'));
      if (c) expect(c.tag).toBe('Arme · débordement');
    }
  });
});

describe('simulation', () => {
  it("l'XP déclenche les montées de niveau", () => {
    addXP(6 + 12);
    expect(G.lvl).toBe(3);
    expect(G.pendingLv).toBe(2);
  });
  it('chaque ennemi tué lâche un cube, visible un instant avant d’être aspiré', () => {
    const { x, y } = G.p;
    const es = Array.from({ length: 12 }, (_, i) => spawn('zombie', false, x + 0.5 + (i % 4) * 0.3, y + Math.floor(i / 4) * 0.3));
    for (const e of es) hit(e, 1e6);
    expect(G.kills).toBe(12);
    expect(G.orbs.length).toBe(12);
    const xp0 = G.xp, lv0 = G.lvl;
    for (let i = 0; i < 12; i++) update(1 / 60); // 0,2 s : encore en train de sauter
    expect(G.orbs.length).toBe(12);
    for (let i = 0; i < 120; i++) update(1 / 60);
    expect(G.orbs.filter((o) => o.t < 1).length).toBe(0); // tous les cubes lâchés ont été ramassés
    expect(G.lvl > lv0 || G.xp > xp0).toBe(true);
  });
  it('une minute de jeu tourne sans erreur et tue des ennemis', () => {
    for (let i = 0; i < 60 * 60 && G.state === 'play'; i++) update(1 / 60);
    expect(G.t).toBeGreaterThan(30);
    expect(G.kills).toBeGreaterThan(0);
    expect(G.en.length).toBeLessThanOrEqual(260);
  });
  it('le boss apparaît à 10:00 et sa mort termine la run en victoire (MODE.boss)', () => {
    MODE.boss = true;
    G.p.hp = G.p.maxhp = 1e9;
    G.t = 599.9; G.bossDone = false;
    update(0.2);
    expect(G.boss?.d).toBe(BOSSD);
    G.boss!.hp = 1;
    G.main.t = 0;
    G.boss!.x = G.p.x; G.boss!.y = G.p.y + 1;
    update(1 / 60);
    expect(ended).toBe(true);
    expect(G.bossDone).toBe(true);
    MODE.boss = false;
  });
  it('sans boss, tenir jusqu’à 10:00 est une victoire', () => {
    G.p.hp = G.p.maxhp = 1e9;
    G.t = 599.9;
    update(0.2);
    expect(ended).toBe(true);
    expect(G.boss).toBeNull();
  });
  it('mode itération : uniquement des zombies, avec les trois variantes', () => {
    G.p.hp = G.p.maxhp = 1e9;
    const seen = new Set<number>(), types = new Set<string>();
    for (let i = 0; i < 60 * 300 && G.state === 'play'; i++) {
      update(1 / 60);
      for (const e of G.en) { types.add(e.type); seen.add(e.variant) }
    }
    expect([...types]).toEqual(['zombie']);
    expect(seen.size).toBe(ZOMBIE_VARIANTS.length);
  });
  it('mourir termine la run en défaite', () => {
    G.p.hp = 1;
    const e = spawn('casseur', false, G.p.x + 0.3, G.p.y);
    e.hp = 1e9;
    update(1 / 60);
    expect(ended).toBe(false);
  });
});

describe('animation de Steven', () => {
  it('directions sur 8 axes, ordre des planches', () => {
    expect([[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]].map(([x, y]) => dirIndex(x, y))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it("l'image d'impact du marteau coïncide avec l'onde", () => {
    G.p.hp = G.p.maxhp = 1e9;
    const dt = 1 / 120;
    for (let i = 0; i < 120 * 8; i++) {
      const before = G.fx.filter((f) => f.k === 'ring').length;
      update(dt);
      if (G.fx.filter((f) => f.k === 'ring').length > before) {
        expect(G.p.atkT).toBeGreaterThanOrEqual(0);
        const frame = Math.floor((G.p.atkT / G.p.atkD) * HAMMER.frames);
        expect(Math.abs(frame - HAMMER.hit)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('ressenti des coups', () => {
  it("l'onde de l'haltère : son avec le nombre de touchés, fissure, tremblement et micro-gel à 8+", () => {
    const sounds: [string, number | undefined][] = [];
    hooks.sfx = (n, k) => { sounds.push([n, k]) };
    G.p.hp = G.p.maxhp = 1e9;
    for (let i = 0; i < 10; i++) spawn('zombie', false, G.p.x + Math.cos(i) * 1.2, G.p.y + Math.sin(i) * 1.2).hp = 1e6;
    G.main.t = 0;
    update(1 / 60);
    const slam = sounds.find(([n]) => n === 'slam');
    expect(slam?.[1]).toBe(10);
    expect(G.decals.length).toBe(1);
    expect(G.shake).toBeGreaterThan(0);
    expect(G.hitstop).toBeGreaterThan(0);
    // Pendant le micro-gel, le temps de jeu ne s'écoule pas.
    const t = G.t;
    update(1 / 60);
    expect(G.t).toBe(t);
  });
});

describe('fragments de code', () => {
  it('5 emplacements, 3 ouverts ; le 4e au niveau 10, le 5e au niveau 20', () => {
    expect(G.slots.length).toBe(SLOTS.total);
    expect(G.open).toBe(3);
    while (G.lvl < 10) addXP(G.need);
    expect(G.open).toBe(4);
    while (G.lvl < 20) addXP(G.need);
    expect(G.open).toBe(5);
  });
  it("l'ordre compte : la même main ne donne pas la même chaîne", () => {
    const a = compile(['scission', 'surkill', 'echo', null, null]);
    expect(a).toMatchObject({ split: 1, echo: 0, payload: 2 });
    expect(compile(['scission', 'surkill', 'echo', null, null], a.payload)).toMatchObject({ split: 0, echo: 1, payload: -1 });
    const b = compile(['surkill', 'scission', 'echo', null, null]);
    expect(b).toMatchObject({ split: 0, echo: 0, payload: 1 });
    expect(compile(['surkill', 'scission', 'echo', null, null], 1)).toMatchObject({ split: 1, echo: 1 });
  });
  it('Boucle double le fragment suivant, y compris un déclencheur', () => {
    expect(compile(['boucle', 'echo', 'echo']).echo).toBe(3);
    expect(compile(['boucle', 'surkill']).trig).toBe(2);
  });
  it('Surcharge : +60 % de dégâts, cadence ralentie de 25 %', () => {
    const d0 = wDelay(G.main);
    G.slots[0] = 'surcharge';
    expect(compile(G.slots).mult).toBeCloseTo(1.6);
    expect(wDelay(G.main)).toBeCloseTo(d0 * 1.25);
  });
  it('Écho programme la répétition ; Sur kill → lance une onde là où un zombie meurt', () => {
    G.en.length = 0; G.later.length = 0;
    G.slots[0] = 'echo';
    castChain(G.main, 0, 0, 0, 0, 2.5, 10, true);
    expect(G.later.length).toBe(1);
    G.later.length = 0;
    G.slots[0] = 'surkill';
    spawn('zombie', false, 1, 0);
    buildGrid();
    castChain(G.main, 0, 0, 0, 0, 2.5, 1e6, true);
    expect(G.kills).toBe(1);
    expect(G.later.length).toBe(1);
  });
  it('résumé lisible de la chaîne', () => {
    expect(describeChain(['surcharge', 'surkill', 'scission', null, null])).toEqual([
      'Onde : dégâts ×1,6.', 'Sur kill → petite onde : divisée en 3.',
    ]);
  });
  it('un porteur lâche un fragment ; il va dans un emplacement libre, puis en réserve', () => {
    G.t = 30;
    update(1 / 60);
    const c = G.en.find((e) => e.carry)!;
    expect(c).toBeTruthy();
    hit(c, 1e9);
    expect(G.gfr.length).toBe(1);
    G.gfr[0].x = G.p.x; G.gfr[0].y = G.p.y; G.gfr[0].t = 1;
    update(1 / 60);
    expect(G.slots.filter(Boolean).length).toBe(1);
    takeFrag('echo'); takeFrag('echo');
    expect(G.slots.filter(Boolean).length).toBe(3);
    takeFrag('boucle');
    expect(G.bag).toEqual(['boucle']);
  });
  it("atelier : échanger, ranger en réserve ; un emplacement verrouillé reste fermé", () => {
    G.slots = ['echo', 'scission', null, null, null]; G.bag = ['boucle'];
    swapFrag({ z: 'slot', i: 0 }, { z: 'slot', i: 1 });
    expect(G.slots.slice(0, 2)).toEqual(['scission', 'echo']);
    swapFrag({ z: 'bag', i: 0 }, { z: 'slot', i: 2 });
    expect(G.slots[2]).toBe('boucle'); expect(G.bag).toEqual([]);
    swapFrag({ z: 'slot', i: 0 }, { z: 'bag', i: 0 });
    expect(G.slots[0]).toBeNull(); expect(G.bag).toEqual(['scission']);
    swapFrag({ z: 'bag', i: 0 }, { z: 'slot', i: 4 });
    expect(G.slots[4]).toBeNull();
  });
  it('le hacker arrive ; rester 3 s dans sa zone ouvre l’atelier', () => {
    let opened = 0;
    hooks.hack = () => { opened++; G.state = 'hack' };
    G.p.hp = G.p.maxhp = 1e9;
    G.t = 90; G.nextCarrier = 1e9;
    update(1 / 60);
    const hk = G.hacker!;
    expect(hk).toBeTruthy();
    for (let i = 0; i < 60 * 4 && G.state === 'play'; i++) { G.p.x = hk.x; G.p.y = hk.y; update(1 / 60) }
    expect(opened).toBe(1);
    expect(G.hacker).toBeNull();
  });
});
