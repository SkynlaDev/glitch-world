import { audio, setSound } from '../audio/sfx';
import { fmt, mmss } from '../core/util';
import { BAB, HEROES, MODE, RAR, UNLOCK, WD } from '../data/game-data';
import { FICON, ICON } from '../data/icons';
import { FRAG, SLOTS } from '../data/fragments';
import { describeChain, fragAt as at, swapFrag, type FragPos as Pos, type FragPos } from '../game/chain';
import { makeCards } from '../game/cards';
import { G, bv, hooks, newGame, settings, wDelay, wDmg, wZone, type Card } from '../game/state';
import { SPR, sil } from '../render/sprites';

export const $ = (id: string) => document.getElementById(id)!;

type Btn = [label: string, fn: () => void, primary?: boolean];
function overlay(t: string, s: string, btns: Btn[], note = '') {
  $('ovt').textContent = t; $('ovs').textContent = s; $('ovn').textContent = note;
  const b = $('ovb');
  b.innerHTML = '';
  for (const [l, fn, p] of btns) {
    const e = document.createElement('button');
    e.className = p ? 'btn p' : 'btn'; e.textContent = l; e.onclick = fn;
    b.append(e);
  }
  $('ov').classList.remove('hide');
}
export const hideOv = () => { $('ov').classList.add('hide'); $('cards').innerHTML = ''; $('cards').classList.remove('menu') };
const resume = () => { hideOv(); G.state = 'play' };

export function showCards(list: Card[], t: string, s: string, reroll: boolean) {
  G.state = 'cards';
  const box = $('cards');
  box.innerHTML = '';
  box.classList.remove('menu');
  list.forEach((c, ix) => {
    const r = c.r >= 0 ? RAR[c.r] : null, b = document.createElement('button');
    b.className = 'card';
    b.style.setProperty('--rc', r ? r.c : '#29f0ff');
    b.innerHTML = `<span class="rib">${r ? r.n : 'Nouvelle arme'}</span><span class="key">${ix + 1}</span><span class="ic">${c.icon}</span><span class="tx"><span class="tag">${c.tag}</span><strong>${c.title}</strong><span class="lv">${c.lv}</span><span class="ds">${c.desc}</span></span>`;
    b.onclick = () => { c.apply(); resume() };
    box.append(b);
  });
  const btns: Btn[] = reroll && G.rerolls > 0 ? [[`Relancer (${G.rerolls})`, () => { G.rerolls--; showCards(makeCards(), t, s, true) }]] : [];
  overlay(t, s, btns);
}

/** Récapitulatif du build (pause et fin de run). */
function buildList() {
  const ul = document.createElement('ul');
  ul.className = 'build';
  const add = (ic: string, txt: string) => {
    const li = document.createElement('li');
    li.innerHTML = ic;
    const sp = document.createElement('span');
    sp.textContent = txt; li.append(sp); ul.append(li);
  };
  for (const w of [G.main, G.sec]) {
    if (!w) continue;
    const d = WD[w.id], sp = Object.entries(w.sp).map(([k, v]) => (k === 'count' ? `${v} ${d.sp[0].n}s` : d.sp.find((x) => x.k === k)!.n));
    add(ICON[w.id], `${d.n} niv ${w.lv} : ${fmt(wDmg(w))} dégâts toutes les ${fmt(wDelay(w))} s, ${d.zl} ${fmt(wZone(w))} u${sp.length ? ' · ' + sp.join(', ') : ''}${w.over ? ` · débordement +${fmt(w.over * 100)} %` : ''}`);
  }
  for (const f of G.slots) if (f) add(FICON[f], `Fragment ${FRAG[f].n} (${FRAG[f].code})`);
  if (G.slots.some(Boolean)) add(FICON.boucle, describeChain(G.slots).join(' '));
  for (const b of BAB) if (bv(b.id)) add(ICON[b.id], `${b.n} niv ${G.babN[b.id]} : ${b.d(bv(b.id), bv(b.id))}`);
  return ul;
}

export function pause() {
  if (!G || G.state !== 'play') return;
  G.state = 'pause';
  $('cards').innerHTML = '';
  $('cards').classList.remove('menu');
  $('cards').append(buildList());
  overlay('Pause', `${mmss(G.t)} · niveau ${G.lvl} · ${G.kills} ennemis tués`, [
    ['Reprendre', resume, true],
    ['Écran titre', menu],
    [`Son : ${audio.on ? 'oui' : 'non'}`, () => { setSound(!audio.on); G.state = 'play'; pause() }],
    [`Chiffres de dégâts : ${settings.showNums ? 'oui' : 'non'}`, () => { settings.showNums = !settings.showNums; G.state = 'play'; pause() }],
    ['Test : aller à 9:30', () => {
      G.t = Math.max(G.t, 570);
      for (const k of Object.keys(G.nx) as (keyof typeof UNLOCK)[]) G.nx[k] = Math.min(G.nx[k], 570);
      G.nextElite = Math.max(G.nextElite, 600);
      resume();
    }],
  ]);
}
/* ---------- Atelier du hacker ---------- */
let sel: FragPos | null = null;

export function showHack() {
  G.state = 'hack';
  const box = $('cards');
  box.innerHTML = '';
  box.classList.remove('menu');
  const wrap = document.createElement('div');
  wrap.className = 'hack';
  const mk = (p: Pos, locked = false) => {
    const f = locked ? null : at(p), b = document.createElement('button');
    b.className = 'fs' + (locked ? ' lock' : '') + (sel && sel.z === p.z && sel.i === p.i ? ' sel' : '') + (f ? ` f-${FRAG[f].fam}` : '');
    const lvl = SLOTS.unlockAt[p.i - SLOTS.start];
    b.innerHTML = locked ? `<span class="lk">🔒</span><span>Niv ${lvl}</span>` : f ? `${FICON[f]}<span>${FRAG[f].n}</span>` : '<span class="em">vide</span>';
    if (locked) { b.disabled = true; b.title = `S'ouvre au niveau ${lvl}` }
    b.onclick = () => {
      if (!sel) { if (f) sel = p }
      else if (sel.z === p.z && sel.i === p.i) sel = null;
      else { swapFrag(sel, p); sel = null }
      showHack();
    };
    return b;
  };
  const row = (label: string, items: HTMLElement[], cls: string) => {
    const r = document.createElement('div');
    r.className = 'frow ' + cls;
    const l = document.createElement('span'); l.className = 'fl'; l.textContent = label;
    r.append(l, ...items);
    return r;
  };
  wrap.append(row('Onde →', G.slots.map((_, i) => mk({ z: 'slot', i }, i >= G.open)), 'chain'));
  wrap.append(row('Réserve', [...G.bag.map((_, i) => mk({ z: 'bag', i })), mk({ z: 'bag', i: G.bag.length })], 'bag'));
  const info = document.createElement('div');
  info.className = 'finfo';
  const sf = sel ? at(sel) : null;
  info.innerHTML = sf
    ? `<strong></strong> <code></code><p></p><p class="hint">Touche un autre emplacement pour l'échanger.</p>`
    : '<p class="hint">Touche un fragment, puis l’emplacement où le mettre. L’ordre compte : la chaîne se lit de gauche à droite.</p>';
  if (sf) {
    info.querySelector('strong')!.textContent = FRAG[sf].n;
    info.querySelector('code')!.textContent = FRAG[sf].code;
    info.querySelector('p')!.textContent = FRAG[sf].d;
  }
  const res = document.createElement('ul');
  res.className = 'fres';
  for (const l of describeChain(G.slots)) { const li = document.createElement('li'); li.textContent = l; res.append(li) }
  wrap.append(info, res);
  box.append(wrap);
  overlay('Hacker', 'Réarrange tes fragments de code.', [['Terminer', () => { sel = null; resume() }, true]]);
}

export function togglePause() { if (G?.state === 'pause') resume(); else pause() }

export function endRun(win: boolean) {
  G.state = 'end';
  const lv = G.lvTimes.map(mmss).join(', ');
  $('cards').innerHTML = '';
  $('cards').classList.remove('menu');
  $('cards').append(buildList());
  const btns: Btn[] = [['Rejouer', start, true], ['Écran titre', menu]];
  if (win) btns.splice(1, 0, ['Continuer en endless', () => { resume(); G.bossDone = true; G.boss = null }]);
  overlay(win ? 'Victoire !' : 'Game over', `${win ? (MODE.boss ? 'DJ Overflow est tombé. ' : 'Tu as tenu 10 minutes. ') : ''}${mmss(G.t)} · niveau ${G.lvl} · ${G.kills} ennemis tués`, btns, lv ? `Niveaux gagnés à : ${lv}` : '');
}

let selHero = 'steven';
export function menu() {
  newGame();
  G.state = 'menu';
  $('hud').classList.add('hide'); $('bb').classList.add('hide');
  const box = $('cards');
  box.innerHTML = '';
  box.classList.add('menu');
  const img = (h: (typeof HEROES)[number]) => (h.on ? h.portrait ?? SPR[h.sprite].c.toDataURL() : sil(h.sprite));
  const roster = document.createElement('div');
  roster.className = 'roster';
  for (const h of HEROES) {
    const b = document.createElement('button');
    b.className = 'hero' + (h.id === selHero ? ' sel' : '');
    b.style.setProperty('--rc', RAR[h.r].c);
    b.innerHTML = `<img class="px" alt="" src="${img(h)}"><strong></strong><span></span>`;
    b.querySelector('strong')!.textContent = h.on ? h.n.split(' ')[0] : '???';
    b.querySelector('span')!.textContent = h.on ? RAR[h.r].n : 'Pas encore synchronisé';
    b.onclick = () => { selHero = h.id; menu() };
    roster.append(b);
  }
  box.append(roster);
  const h = HEROES.find((x) => x.id === selHero)!, f = document.createElement('div');
  f.className = 'fiche';
  f.innerHTML = `<img class="px" alt="" src="${img(h)}"><div><h3></h3><dl></dl></div>`;
  f.querySelector('h3')!.textContent = h.on ? h.n : `${h.n} · verrouillé`;
  const dl = f.querySelector('dl')!;
  const row = (a: string, b: string | number) => {
    const t = document.createElement('dt'); t.textContent = a;
    const d = document.createElement('dd'); d.textContent = String(b);
    dl.append(t, d);
  };
  row('Rareté', RAR[h.r].n);
  if (h.on) { row('PV', h.hp!); row('Vitesse', h.spd!); row('Arme', h.arme!); row('Passif', h.pas!) }
  else row('Déblocage', h.lock!);
  box.append(f);
  overlay('GlitchWorld', MODE.boss ? "Choisis ton avatar. La rue des boîtes de nuit t'attend : survis 10 minutes et bats DJ Overflow." : "Choisis ton avatar. La rue des boîtes de nuit grouille de zombies : tiens 10 minutes.", h.on ? [['Incarner', start, true]] : [],
    "Mobile : pose le pouce n'importe où et glisse. PC : ZQSD, WASD ou flèches, 1 2 3 pour les cartes, Échap pour la pause. Manette : stick ou croix pour bouger et choisir, A pour valider, B pour revenir, Start pour la pause. Glitchs, hacker et marchand arrivent dans une prochaine version.");
}

export function start() {
  newGame();
  hideOv();
  $('hud').classList.remove('hide');
  G.state = 'play';
}

hooks.end = endRun;
hooks.cards = showCards;
