import { beforeEach, describe, expect, it } from 'vitest';
import { BOSSD, HAMMER, MODE, ZOMBIE_VARIANTS, need } from '../src/data/game-data';
import { bCard, chestCards, makeCards, rollR } from '../src/game/cards';
import { G, hooks, newGame, wDelay, wDmg, wZone } from '../src/game/state';
import { dirIndex, update } from '../src/game/update';
import { addXP, hit, spawn } from '../src/game/world';

let ended: boolean | null, offered: number;
beforeEach(() => {
  newGame();
  ended = null; offered = 0;
  hooks.end = (w) => { ended = w; G.state = 'end' };
  hooks.sfx = () => {};
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
  it("le premier niveau propose les 3 armes secondaires", () => {
    const c = makeCards();
    expect(c.map((x) => x.title)).toEqual(['Épée', 'Arc', 'Météorite']);
    c[1].apply();
    expect(G.sec?.id).toBe('arc');
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
