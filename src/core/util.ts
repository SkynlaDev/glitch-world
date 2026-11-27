export const R = Math.random;
export const hyp = Math.hypot;
export const TAU = Math.PI * 2;

/** Nombre à une décimale, virgule française : 1.5 → "1,5". */
export const fmt = (v: number): string => String(Math.round(v * 10) / 10).replace('.', ',');
/** Secondes → "m:ss". */
export const mmss = (t: number): string => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const pick = <T>(a: readonly T[]): T => a[(R() * a.length) | 0];
