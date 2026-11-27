import type { Sfx } from '../game/state';

/* Sons synthétisés avec la Web Audio API : aucun fichier audio.
   Le navigateur n'autorise le son qu'après une action du joueur : unlock() est appelé au premier clic,
   à la première touche ou au premier bouton de manette. */

const KEY = 'gw.sound', VOLUME = 0.45;
export const audio = { on: localStorage.getItem(KEY) !== '0' };
let ac: AudioContext | null = null, master: GainNode | null = null, noiseBuf: AudioBuffer | null = null;

export function unlock() {
  if (ac) { if (ac.state === 'suspended') void ac.resume(); return }
  ac = new AudioContext();
  master = ac.createGain();
  master.gain.value = audio.on ? VOLUME : 0;
  // Compresseur léger : 30 zombies qui meurent ensemble ne saturent pas.
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setSound(on: boolean) {
  audio.on = on;
  localStorage.setItem(KEY, on ? '1' : '0');
  if (master) master.gain.value = on ? VOLUME : 0;
}

/** Note simple avec glissement de fréquence et enveloppe percussive. */
function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  if (!ac || !master) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

/** Bruit filtré (souffle, impact, poussière). */
function noise(dur: number, vol: number, type: BiquadFilterType, freq: number, delay = 0) {
  if (!ac || !master || !noiseBuf) return;
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf;
  f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t); s.stop(t + dur + 0.02);
}

/** Intervalle minimal entre deux sons du même nom (s) : évite la bouillie quand 40 zombies meurent en même temps. */
const GAP: Partial<Record<Sfx, number>> = { hit: 0.03, kill: 0.035, pickup: 0.04, swing: 0.05, arrow: 0.05, glitch: 0.05 };
const last: Partial<Record<Sfx, number>> = {};
let combo = 0, comboT = 0;

export function play(name: Sfx, k = 0) {
  if (!ac || !audio.on) return;
  const now = ac.currentTime;
  if (now - (last[name] ?? -1) < (GAP[name] ?? 0)) return;
  last[name] = now;
  switch (name) {
    case 'slam': {
      // Coup sourd ; plus d'ennemis écrasés = plus grave et plus fort.
      const n = Math.min(k, 12);
      tone('sine', 150, 38, 0.28, 0.55 + 0.03 * n);
      noise(0.16, 0.25 + 0.03 * n, 'lowpass', 500);
      if (n >= 8) tone('square', 70, 30, 0.2, 0.12);
      break;
    }
    case 'hit': tone('square', 520 + Math.random() * 120, 300, 0.04, 0.05); break;
    case 'kill': tone('triangle', 380 + Math.random() * 80, 900, 0.07, 0.09); noise(0.05, 0.06, 'highpass', 2500); break;
    case 'pickup': {
      // La note monte quand on enchaîne les gemmes, et retombe après une pause.
      combo = now - comboT < 0.5 ? Math.min(combo + 1, 14) : 0;
      comboT = now;
      const f = 700 * 2 ** (combo / 12);
      tone('sine', f, f * 1.02, 0.07, 0.08);
      break;
    }
    case 'level': [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.12, 0.08, i * 0.08)); break;
    case 'hurt': tone('sawtooth', 220, 70, 0.22, 0.18); noise(0.12, 0.15, 'bandpass', 800); break;
    case 'swing': noise(0.12, 0.12, 'highpass', 1800); break;
    case 'arrow': tone('triangle', 900, 1400, 0.05, 0.06); break;
    case 'boom': tone('sine', 110, 30, 0.4, 0.4); noise(0.3, 0.25, 'lowpass', 700); break;
    // Onde secondaire (écho, scission, déclenchée) : petit coup numérique, sec et granuleux.
    case 'glitch': tone('square', 240 + Math.random() * 160, 60, 0.07, 0.07 + 0.01 * Math.min(k, 6)); noise(0.05, 0.08, 'bandpass', 3000); break;
    // Fragment ramassé : arpège qui « saute » comme un bug.
    case 'frag': [880, 1320, 990, 1760].forEach((f, i) => tone('square', f, f, 0.06, 0.07, i * 0.05)); break;
    // Atelier du hacker : balayage de modem.
    case 'hack': tone('sawtooth', 300, 1800, 0.35, 0.08); tone('square', 1200, 400, 0.3, 0.05, 0.15); break;
    case 'chest': [659, 784, 988, 1319].forEach((f, i) => tone('triangle', f, f, 0.18, 0.1, i * 0.06)); break;
  }
}
