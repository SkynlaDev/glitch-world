# GlitchWorld

Survivor-like en pixel art : une borne d'arcade buggée dans la rue des boîtes de nuit.
Survis 10 minutes, monte en niveau avec des cartes, bats DJ Overflow.

Porté le 2026-11-27 depuis l'artifact « GlitchWorld prototype » (un seul fichier HTML) vers Vite + TypeScript.

## Commandes

```sh
npm install
npm run dev      # serveur local (accessible sur le réseau, pour tester sur mobile)
npm test         # tests Vitest de la logique de jeu
npm run build    # vérification des types + build dans dist/
```

Contrôles : ZQSD / WASD / flèches, joystick tactile flottant, 1 2 3 pour les cartes, Échap ou P pour la pause.

## Structure

| Dossier | Rôle |
| --- | --- |
| `src/data/` | Données de design : raretés, babioles, armes, ennemis, boss, héros, icônes SVG |
| `src/game/` | Logique pure, sans DOM (testable) : état, cartes, monde, armes, boucle `update` |
| `src/render/` | Canvas : sprites pixel art en texte, caméra, dessin |
| `src/ui/` | Écrans (menu, cartes, pause, fin), HUD, contrôles |
| `tests/` | Tests Vitest |
| `design/GDD.md` | Règles du jeu telles qu'implémentées |
| `art/pixellab-test/` | Sprites bruts de Steven générés avec PixelLab (personnage `ff096bef-aff5-41de-8065-8759dbbab2f4`) |
| `tools/art/prepare_steven.py` | Recolore et assemble ces sprites vers `public/art/steven/` et `src/data/steven-sheets.json` (Python 3 + Pillow) |

La logique ne touche jamais au DOM : elle appelle `hooks.end` et `hooks.cards` (dans `src/game/state.ts`), branchés par `src/ui/screens.ts`.

Dans la console du navigateur : `__G()` donne l'état, `__step(n)` avance de n images, `__start()` relance une partie.
