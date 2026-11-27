import { mmss } from '../core/util';
import { BAB } from '../data/game-data';
import { ICON } from '../data/icons';
import { G } from '../game/state';
import { $ } from './screens';

function slots() {
  const ws = $('wslots');
  ws.innerHTML = '';
  for (const w of [G.main, G.sec]) {
    const d = document.createElement('div');
    d.className = 'slot w';
    d.innerHTML = w ? `${ICON[w.id]}<b>${w.lv}</b>` : '';
    ws.append(d);
  }
  const bs = $('babs');
  bs.innerHTML = '';
  for (const b of BAB) if (G.babN[b.id]) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.innerHTML = `${ICON[b.id]}<b>${G.babN[b.id]}</b>`;
    bs.append(d);
  }
}

export function hud(fps: number) {
  if (G.dirty) { G.dirty = 0; slots() }
  $('ht').textContent = mmss(G.t);
  $('hl').textContent = `NIV ${G.lvl}`;
  $('hx').style.width = `${Math.min(100, (G.xp / G.need) * 100)}%`;
  $('hk').innerHTML = `<span class="sk">${ICON.skull}</span>${G.kills}`;
  $('hf').textContent = `${Math.round(fps)} i/s · ${G.en.length} ennemis`;
  const b = G.boss;
  $('bb').classList.toggle('hide', !b);
  if (b) $('bbi').style.width = `${Math.max(0, (b.hp / b.max) * 100)}%`;
}
