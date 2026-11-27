import { R, TAU, hyp } from '../core/util';
import { input } from '../game/input';
import { G, settings, type Enemy } from '../game/state';
import { SPR, type Sprite } from './sprites';
import { drawSteven, stevenReady } from './steven';
import { drawZombie } from './zombies';
import { ctx, pat, view } from './view';

const FONT_T = 'Silkscreen,monospace', FONT_B = 'VT323,monospace';
const BOSS_MOVES = { drop: 'DROP !', sample: 'SAMPLE !', chenille: 'CHENILLE !', raye: 'DISQUE RAYÉ !' };

/** Dessine un sprite ancré en bas au centre (x, y), px = taille d'un pixel source. */
function dS(sp: Sprite, x: number, y: number, px: number, flipX: boolean, white: boolean) {
  px *= 1.25;
  const w = sp.w * px, h = sp.h * px;
  ctx.drawImage(white ? sp.wh : flipX ? sp.f : sp.c, Math.round(x - w / 2), Math.round(y - h + px), Math.round(w), Math.round(h));
}
function shadow(x: number, y: number, w: number) {
  ctx.fillStyle = '#0008';
  ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.35, 0, 0, TAU); ctx.fill();
}

/** Fond défilant de l'écran titre. */
export function drawMenuBg(now: number) {
  pat.setTransform(new DOMMatrix().translateSelf(-now * 0.02, 0).scaleSelf(view.S / 16));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, view.W, view.H);
}

export function draw() {
  const { W, H, S } = view, p = G.p, sh = G.shake > 0 ? (R() - 0.5) * 2 * G.shakeAmp : 0;
  const ox = W / 2 - p.x * S + sh, oy = H / 2 - p.y * S + sh, X = (x: number) => ox + x * S, Y = (y: number) => oy + y * S;
  const vis = (x: number, y: number, m = 2) => Math.abs(x - p.x) * S < W / 2 + m * S && Math.abs(y - p.y) * S < H / 2 + m * S;

  pat.setTransform(new DOMMatrix().translateSelf(ox, oy).scaleSelf(S / 16));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);

  // Flaques du Fêtard (ralentissent).
  for (const u of G.pud) {
    ctx.fillStyle = `rgba(162,60,240,${Math.min(0.5, u.life * 0.3)})`;
    ctx.beginPath(); ctx.ellipse(X(u.x), Y(u.y), 0.9 * S, 0.55 * S, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,225,77,${Math.min(0.6, u.life * 0.3)})`;
    ctx.fillRect(X(u.x) - 0.3 * S, Y(u.y) - 0.1 * S, 0.12 * S, 0.12 * S);
    ctx.fillRect(X(u.x) + 0.2 * S, Y(u.y) + 0.1 * S, 0.12 * S, 0.12 * S);
  }
  // Fissures laissées par l'haltère : rayons brisés qui s'effacent en 1,2 s.
  for (const d of G.decals) {
    const a = Math.max(0, 1 - d.t / 1.2);
    let sd = d.seed * 9301 + 49297;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    ctx.lineCap = 'square';
    for (let i = 0; i < 7; i++) {
      let ang = (i / 7) * TAU + rnd() * 0.6, x = X(d.x), y = Y(d.y);
      const len = d.r * S * (0.35 + rnd() * 0.35), steps = 3;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < steps; k++) {
        ang += (rnd() - 0.5) * 0.7;
        x += Math.cos(ang) * len / steps; y += Math.sin(ang) * len / steps * 0.6;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(11,7,18,${0.85 * a})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = `rgba(41,240,255,${0.25 * a})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // Cibles des météorites.
  for (const m of G.met) {
    ctx.strokeStyle = '#ff8a1f'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), m.z * S, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (G.tele && G.tele.k === 'sample') {
    ctx.fillStyle = '#ff2e8833'; ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(X(G.tele.x), Y(G.tele.y), 2.5 * S, 0, TAU); ctx.fill(); ctx.stroke();
  }
  const gp = (S / 16) * 1.6;
  for (const o of G.orbs) {
    if (!vis(o.x, o.y)) continue;
    // Paliers : 1 = cube cyan, 5+ = magenta plus gros, 25+ = jaune qui « bugue » par à-coups.
    const big = o.v >= 25, sp = big ? SPR.gemY : o.v >= 5 ? SPR.gemM : SPR.gem;
    const x = X(o.x), y = Y(o.y) + Math.sin(G.t * 5 + o.x) * 2, k = gp * (big ? 1.45 : o.v >= 5 ? 1.2 : 1);
    if (big && (G.t * 3 + o.x) % 1 < 0.12) {
      // Glitch : décalage RGB bref, deux fantômes cyan et magenta de part et d'autre.
      const j = k * 3;
      ctx.globalAlpha = 0.55; dS(SPR.gem, x - j, y, k, false, false); dS(SPR.gemM, x + j, y, k, false, false); ctx.globalAlpha = 1;
      dS(sp, x + (Math.random() < 0.5 ? -1 : 1) * k, y, k, false, false);
    } else dS(sp, x, y, k, false, false);
  }
  for (const c of G.chests) { shadow(X(c.x), Y(c.y), 0.4 * S); dS(SPR.chest, X(c.x), Y(c.y), (S / 16) * 1.4, false, false) }

  // Tri en profondeur : ennemis visibles + joueur.
  const list: (Enemy | { me: true; y: number })[] = G.en.filter((e) => vis(e.x, e.y, 3));
  list.push({ me: true, y: p.y });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    if ('me' in e) { drawPlayer(sh); continue }
    drawEnemy(e, X(e.x), Y(e.y));
  }

  for (const q of G.pr) {
    ctx.strokeStyle = '#f4ecff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(q.x), Y(q.y)); ctx.lineTo(X(q.x - q.vx * 0.04), Y(q.y - q.vy * 0.04)); ctx.stroke();
  }
  // Pavés du Casseur.
  for (const q of G.ep) {
    const s = 0.36 * S, x = X(q.x), y = Y(q.y);
    ctx.fillStyle = '#000'; ctx.fillRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4);
    ctx.fillStyle = '#b34bd6'; ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.fillStyle = '#111'; ctx.fillRect(x - s / 2, y - s / 2, s / 2, s / 2); ctx.fillRect(x, y, s / 2, s / 2);
  }
  // Anneaux du drop, avec leurs trous.
  for (const r of G.rings) {
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 0.45 * S;
    let a0 = 0;
    const gs = r.gaps.slice().sort((a, b) => a - b);
    for (const g2 of gs) { ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), r.r * S, a0, g2 - 0.35); ctx.stroke(); a0 = g2 + 0.35 }
    ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), r.r * S, a0, gs[0] + TAU - 0.35); ctx.stroke();
  }
  for (const f of G.fx) {
    const a = 1 - f.t / 0.4;
    ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = ctx.fillStyle = f.c;
    if (f.k === 'ring') {
      const rr = f.r * S * (0.5 + 0.5 * (1 - a));
      ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(X(f.x), Y(f.y), rr, rr * 0.6, 0, 0, TAU); ctx.stroke();
    } else if (f.k === 'arc') {
      ctx.lineWidth = 6; ctx.beginPath();
      ctx.arc(X(f.x), Y(f.y), f.r * S, f.dir > 0 ? -Math.PI / 2 : Math.PI / 2, f.dir > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
    } else if (f.k === 'boom') {
      ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), f.r * S * (0.6 + 0.4 * (1 - a)), 0, TAU); ctx.fill();
    } else for (let i = 0; i < 6; i++) {
      const an = i * 1.05 + f.x, d = f.t * 6 * S;
      ctx.fillRect(X(f.x) + Math.cos(an) * d - 3, Y(f.y) + Math.sin(an) * d - 3, 6, 6);
    }
  }
  ctx.globalAlpha = 1;

  if (settings.showNums) {
    ctx.font = `700 ${Math.max(12, S * 0.38)}px ${FONT_T}`;
    for (const n of G.nums) {
      const y = Y(n.y) - n.t * 30;
      ctx.fillStyle = '#000'; ctx.fillText(String(n.v), X(n.x) + 2, y + 2);
      ctx.fillStyle = '#fff'; ctx.fillText(String(n.v), X(n.x), y);
    }
  }

  // Flèches en bord d'écran vers les coffres et le boss hors champ.
  const marks: [{ x: number; y: number }, string][] = G.chests.map((c) => [c, '#ffb52e']);
  if (G.boss) marks.push([G.boss, '#ff2e88']);
  for (const [c, col] of marks) {
    const dx = (c.x - p.x) * S, dy = (c.y - p.y) * S;
    if (Math.abs(dx) < W / 2 - 20 && Math.abs(dy) < H / 2 - 20) continue;
    const a = Math.atan2(dy, dx);
    const k = Math.min((W / 2 - 28) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 28) / Math.abs(Math.sin(a) || 1e-6));
    ctx.save(); ctx.translate(W / 2 + Math.cos(a) * k, H / 2 + Math.sin(a) * k); ctx.rotate(a);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-10, -13); ctx.lineTo(-10, 13); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-7, -9); ctx.lineTo(-7, 9); ctx.fill();
    ctx.restore();
  }

  if (G.tele && G.boss) {
    const nm = BOSS_MOVES[G.tele.k];
    ctx.font = `700 ${Math.max(16, S * 0.6)}px ${FONT_T}`;
    const tw = ctx.measureText(nm).width, ty = Y(G.boss.y) - S * 3.4;
    ctx.fillStyle = '#000'; ctx.fillText(nm, X(G.boss.x) - tw / 2 + 2, ty + 2);
    ctx.fillStyle = '#ffe14d'; ctx.fillText(nm, X(G.boss.x) - tw / 2, ty);
  }
  if (G.banner) {
    ctx.font = `700 ${Math.max(18, S * 0.7)}px ${FONT_T}`;
    const t = G.banner.txt, tw = ctx.measureText(t).width, x = W / 2 - tw / 2, y = H * 0.32;
    ctx.fillStyle = '#29f0ff'; ctx.fillText(t, x - 3, y);
    ctx.fillStyle = '#ff2e88'; ctx.fillText(t, x + 3, y);
    ctx.fillStyle = '#fff'; ctx.fillText(t, x, y);
  }
  // Joystick flottant.
  const js = input.js;
  if (js) {
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(js.ox, js.oy, 44, 0, TAU); ctx.stroke();
    const dx = js.x - js.ox, dy = js.y - js.oy, l = Math.min(44, hyp(dx, dy)), a = Math.atan2(dy, dx);
    ctx.fillStyle = '#ffffff88';
    ctx.beginPath(); ctx.arc(js.ox + Math.cos(a) * l, js.oy + Math.sin(a) * l, 18, 0, TAU); ctx.fill();
  }
}

function drawPlayer(sh: number) {
  const { W, H, S } = view, p = G.p;
  // Gonflette : Steven grossit à 10 et 20 cumuls.
  const ps = 1 + (p.st >= 10 ? 0.1 : 0) + (p.st >= 20 ? 0.1 : 0), px = (S / 16) * ps, x = W / 2 + sh, y = H / 2 + sh;
  shadow(x, y, 0.55 * S * ps);
  if (!(p.inv > 0 && Math.floor(G.t * 20) % 2)) {
    if (stevenReady()) drawSteven(x, y, ps);
    else {
      // Repli tant que les planches PixelLab chargent : l'ancien sprite 16 px.
      const bob = p.mv ? Math.abs(Math.sin(G.t * 12)) * px : 0;
      dS(p.mv && Math.floor(G.t * 8) % 2 ? SPR.stevenB : SPR.steven, x, y - bob, px, p.face < 0, false);
      dS(SPR.dumb, x, y - SPR.steven.h * px * 1.25 - bob + px * 2, px * 1.1, false, false);
    }
  }
  const hw = 1.1 * S;
  ctx.fillStyle = '#000'; ctx.fillRect(x - hw / 2 - 1, y + 5, hw + 2, 7);
  ctx.fillStyle = '#d0344f'; ctx.fillRect(x - hw / 2, y + 6, hw, 5);
  ctx.fillStyle = '#4be37a'; ctx.fillRect(x - hw / 2, y + 6, (hw * p.hp) / p.maxhp, 5);
  if (p.st) {
    const fs = Math.max(11, S * 0.32);
    ctx.font = `700 ${fs}px ${FONT_T}`; ctx.fillStyle = '#ffe14d';
    const t = `GONFLETTE ×${p.st}`, tw = ctx.measureText(t).width;
    ctx.fillText(t, x - tw / 2, y + 12 + fs);
  }
}

function drawEnemy(e: Enemy, x: number, y: number) {
  const S = view.S, tp = e.boss ? 'boss' : e.type, sp = SPR[tp], sc = e.d.sc * (e.elite ? 1.3 : 1), px = (S / 16) * sc;
  const bob = Math.abs(Math.sin(G.t * 9 + e.id)) * px * 0.8, fl = e.type === 'livreur' ? e.vx > 0 : e.x > G.p.x, white = e.hitT < 0.07;
  // Le Videur montre sa hitbox XXL, comme un bug de debug laissé en prod.
  if (e.type === 'videur' && !e.boss) {
    const hb = e.d.hb!;
    ctx.strokeStyle = '#3cff8f'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(x - hb * S, y - 0.4 * S - hb * S, hb * 2 * S, hb * 2 * S); ctx.setLineDash([]);
  }
  if (e.type === 'zombie' && !e.boss) {
    shadow(x, y, 0.32 * S * (e.elite ? 1.3 : 1));
    const h = drawZombie(e, x, y, e.elite ? 1.3 : 1, white);
    if (h) {
      if (e.hitT < 2) {
        const w = e.r * 2 * S, top = y - h - 4;
        ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, top - 1, w + 2, 6);
        ctx.fillStyle = '#ff2e88'; ctx.fillRect(x - w / 2, top, w * Math.max(0, e.hp / e.max), 4);
      }
      return;
    }
  }
  shadow(x, y, sp.w * px * 0.4);
  if (e.elite) {
    // Élite : double image décalée, façon aberration chromatique.
    ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter';
    dS(sp, x - 3, y - bob, px, fl, false); dS(sp, x + 3, y - bob, px, fl, false);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  dS(sp, x, y - bob, px, fl, white);
  if (e.hitT < 2 && !e.boss) {
    const w = e.r * 2 * S, top = y - sp.h * px * 1.25 - 4;
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, top - 1, w + 2, 6);
    ctx.fillStyle = '#ff2e88'; ctx.fillRect(x - w / 2, top, w * Math.max(0, e.hp / e.max), 4);
  }
}

