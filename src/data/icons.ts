import type { FragId } from './fragments';
/** Icônes SVG pixel art des armes et babioles (chaînes pures, sans DOM). */
const sv = (b: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="square" shape-rendering="crispEdges">${b}</svg>`;

export const ICON = {
  // Haltère Ego : sprite PixelLab 32 px (art/icons/raw), affiché en pixels nets.
  main: '<img class="px" src="art/icons/haltere.png" alt="Haltère Ego" draggable="false">',
  epee: sv('<path d="M6 18 L19 5" stroke="#d6dae6" stroke-width="3"/><path d="M4 14 L10 20" stroke="#ffe14d" stroke-width="3"/><path d="M3 21 L6 18" stroke="#c88a4a" stroke-width="3"/>'),
  arc: sv('<path d="M8 3 Q21 12 8 21" stroke="#c88a4a" stroke-width="3"/><path d="M8 3 V21" stroke="#f4ecff"/><path d="M3 12 H18" stroke="#d6dae6" stroke-width="2"/><path d="M15 9 L18 12 L15 15" stroke="#d6dae6" stroke-width="2"/>'),
  meteo: sv('<path d="M3 21 L11 13" stroke="#ffe14d" stroke-width="3"/><circle cx="15" cy="9" r="6" fill="#ff8a1f" stroke="#1a1022"/><rect x="13" y="6" width="3" height="3" fill="#ffe14d"/>'),
  prot: sv('<rect x="7" y="7" width="10" height="15" rx="2" fill="#29f0ff" stroke="#1a1022"/><rect x="8" y="3" width="8" height="4" fill="#f4ecff" stroke="#1a1022"/><rect x="9" y="12" width="6" height="4" fill="#f4ecff"/>'),
  perche: sv('<path d="M4 22 L14 9" stroke="#d6dae6" stroke-width="2"/><rect x="12" y="2" width="9" height="12" rx="1" fill="#1a1022" stroke="#29f0ff" stroke-width="2"/>'),
  cafe: sv('<rect x="4" y="9" width="12" height="12" fill="#f4ecff" stroke="#1a1022"/><path d="M16 12 H20 V17 H16" stroke="#f4ecff" stroke-width="2"/><path d="M8 3 V6 M12 3 V6" stroke="#b88a64" stroke-width="2"/><rect x="6" y="11" width="8" height="2" fill="#8a5a2a"/>'),
  gourde: sv('<rect x="6" y="7" width="12" height="15" rx="3" fill="#3d9bff" stroke="#1a1022"/><rect x="9" y="2" width="6" height="5" fill="#f4ecff" stroke="#1a1022"/><rect x="8" y="12" width="8" height="3" fill="#9fd0ff"/>'),
  pans: sv('<g transform="rotate(-35 12 12)"><rect x="2" y="8" width="20" height="8" rx="4" fill="#e8b48a" stroke="#1a1022"/><rect x="9" y="9" width="6" height="6" fill="#f4ecff"/></g>'),
  casque: sv('<path d="M3 16 Q3 5 12 5 Q21 5 21 16 Z" fill="#ff2e88" stroke="#1a1022"/><rect x="2" y="16" width="20" height="3" fill="#1a1022"/><rect x="10" y="7" width="4" height="7" fill="#ff8fc0"/>'),
  chaus: sv('<path d="M8 2 H15 V13 L20 17 V22 H10 L7 18 Z" fill="#f4ecff" stroke="#1a1022"/><rect x="8" y="2" width="7" height="3" fill="#ff2e88"/>'),
  aimant: sv('<path d="M6 3 V13 A6 6 0 0 0 18 13 V3" stroke="#d0344f" stroke-width="5"/><path d="M6 3 V6 M18 3 V6" stroke="#f4ecff" stroke-width="5"/>'),
  manuel: sv('<rect x="4" y="3" width="16" height="18" fill="#a23cf0" stroke="#1a1022"/><rect x="4" y="3" width="3" height="18" fill="#6e1fb0"/><rect x="9" y="7" width="8" height="2" fill="#f4ecff"/><rect x="9" y="11" width="6" height="2" fill="#f4ecff"/>'),
  f5: sv('<rect x="2" y="4" width="20" height="16" rx="2" fill="#2a2140" stroke="#29f0ff" stroke-width="2"/><path d="M6 8 H10 M6 8 V16 M6 12 H9 M17 8 H13 V12 H16 V16 H13" stroke="#29f0ff" stroke-width="2"/>'),
  skull: sv('<rect x="5" y="3" width="14" height="13" rx="4" fill="#f4ecff" stroke="#1a1022"/><rect x="8" y="16" width="8" height="5" fill="#f4ecff" stroke="#1a1022"/><rect x="8" y="8" width="3" height="3" fill="#1a1022"/><rect x="13" y="8" width="3" height="3" fill="#1a1022"/>'),
};

/** Icônes des fragments de code. */
export const FICON: Record<FragId, string> = {
  echo: sv('<path d="M5 6 Q11 12 5 18" stroke="#29f0ff" stroke-width="3"/><path d="M11 4 Q19 12 11 20" stroke="#29f0ff" stroke-width="2" opacity=".6"/><path d="M17 3 Q26 12 17 21" stroke="#29f0ff" stroke-width="2" opacity=".3"/>'),
  scission: sv('<rect x="9" y="2" width="6" height="6" fill="#29f0ff" stroke="#1a1022"/><rect x="2" y="15" width="6" height="6" fill="#29f0ff" stroke="#1a1022"/><rect x="16" y="15" width="6" height="6" fill="#29f0ff" stroke="#1a1022"/><path d="M12 9 V12 M12 12 L6 15 M12 12 L18 15" stroke="#f4ecff" stroke-width="2"/>'),
  inversion: sv('<path d="M2 12 H9 M6 8 L10 12 L6 16" stroke="#29f0ff" stroke-width="3"/><path d="M22 12 H15 M18 8 L14 12 L18 16" stroke="#29f0ff" stroke-width="3"/><rect x="11" y="10" width="2" height="4" fill="#f4ecff"/>'),
  surcharge: sv('<path d="M14 1 L5 13 H11 L9 23 L19 9 H13 Z" fill="#ffe14d" stroke="#1a1022"/>'),
  surkill: sv('<rect x="2" y="5" width="11" height="10" rx="3" fill="#f4ecff" stroke="#1a1022"/><rect x="4" y="15" width="7" height="4" fill="#f4ecff" stroke="#1a1022"/><rect x="4" y="9" width="2" height="3" fill="#1a1022"/><rect x="9" y="9" width="2" height="3" fill="#1a1022"/><path d="M14 12 H21 M18 8 L22 12 L18 16" stroke="#ff2e88" stroke-width="3"/>'),
  boucle: sv('<path d="M7 8 H16 A5 5 0 0 1 16 18 H8 A5 5 0 0 1 6 9" stroke="#a23cf0" stroke-width="3"/><path d="M13 4 L17 8 L13 12" stroke="#a23cf0" stroke-width="3"/>'),
};
