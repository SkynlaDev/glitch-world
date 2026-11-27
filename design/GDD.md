# GlitchWorld — règles implémentées (v0.1)

Reconstitué depuis le code du prototype le 2026-11-27. Les chiffres font foi tant que le code ne change pas.

## Boucle
- Run de 10 min ; DJ Overflow apparaît à 10:00. Après la victoire : mode endless possible.
- 1 unité (u) = 1/20 du plus petit côté de l'écran.
- Orbes d'XP sur chaque mort (×10 pour une élite). XP pour passer le niveau L : `round(6 + 5(L−1) + 0,15 L²)`.
- Niveau 2 : choix de l'arme secondaire (Épée, Arc, Météorite), gardée toute la run.
- Ensuite chaque niveau : 3 cartes (1 arme, 1 babiole, puis l'une ou l'autre). Relances via la Touche F5.

## Raretés
| Rareté | Multiplicateur | Incrément |
| --- | --- | --- |
| Commun | ×1 | +1 |
| Peu commun | ×1,5 | +1 |
| Rare | ×2 | +2 |
| Épique | ×2,5 | +2 |
| Légendaire | ×3 | +3 |

Poids de tirage à la minute m : `[max(30, 60−3m), 25+m, 10+m, 4+0,6m, 1+0,4m]`.

## Formules d'arme
- Dégâts = base × (1 + bonus dégâts arme + débordement) × (1 + 5 % × Protéine)
- Délai = cd / ((1 + cadence) × (1 + 4 % × Café)), plancher 0,3 s
- Zone = base × (1 + bonus zone) × (1 + 5 % × Perche), plafond par arme
- Une stat au plafond, ou une spéciale déjà prise, devient une carte « débordement » : +15 % × multiplicateur de dégâts.

| Arme | Dégâts | Délai | Zone (plafond) | Spéciales |
| --- | --- | --- | --- | --- |
| Haltère Ego (Steven) | 18 | 1,6 s | rayon 2,5 (8) | Recul, Double onde |
| Épée | 14 | 1,2 s | portée 2 (8) | Frappe des deux côtés |
| Arc | 12 | 1 s | portée 8 (12) | +flèches (max 12) |
| Météorite | 35 | 3 s | zone 2 (8) | +météorites (max 8) |

## Babioles
Protéine (+5 % dégâts), Perche à selfie (+5 % zone), Café serré (+4 % cadence), Gourde (+10 PV max), Pansement (0,3 PV/s), Casque de vélo (−4 % dégâts subis, plancher 40 %), Chaussettes antidérapantes (+5 % vitesse), Aimant (+15 % ramassage), Manuel de triche (+5 % XP), Touche F5 (+1 relance). Valeurs × multiplicateur de rareté.

## Steven « Go Muscu »
120 PV, vitesse 0,9 (3,6 u/s). Passif Gonflette : +1 cumul par ennemi touché par l'onde (max 25) = +2 % de rayon et +1 % de dégâts par cumul ; perd 1 cumul toutes les 0,15 s après 3 s sans toucher. Grossit à 10 et 20 cumuls.

Héros verrouillés : Maya (survivre 5 min), Mister Bounce (tuer 300 ennemis), Markico (toucher 15 ennemis d'un coup). Pas encore jouables.

## Ennemis
PV × (1 + 12 % par minute). Élites toutes les 75 s dès 2:00 : PV ×8, taille ×1,3, dégâts ×1,5, lâchent un coffre (3 babioles rares ou mieux).

| Ennemi | Arrive à | PV | Vitesse | Dégâts | Comportement |
| --- | --- | --- | --- | --- | --- |
| Copié-Collé | 0:00 | 12 | 0,45 | 5 | Nappe de fond, 22 + 15/min (max 190) |
| Livreur Express | 1:00 | 8 | 1,6 | 8 | Convois en ligne droite, meurt au contact |
| Casseur | 2:00 | 20 | 0,8 | 5 | S'arrête à 6,5 u, lance un pavé (8) toutes les 3 s |
| Videur Hitbox XXL | 3:00 | 150 | 0,4 | 15 | Hitbox géante visible, insensible au recul, bloque les flèches |
| Fêtard en boucle | 4:00 | 30 | 0,5 | 5 | Flaque toutes les 2,5 s : −30 % de vitesse pendant 3 s |

## Boss : DJ Overflow
2 500 PV, insensible au recul. Une attaque télégraphiée 1 s, toutes les 3,6 s :
- **Drop** (deux fois plus probable) : anneau qui s'étend avec 3 trous ; 15 dégâts si on n'y passe pas.
- **Sample** : zone de 2,5 u sous le joueur, 20 dégâts.
- **Chenille** : cercle de 14 Copié-Collé autour du joueur.
- **Disque rayé** : tous les ennemis reculent pendant 3 s.

## Prévu (annoncé à l'écran titre)
Glitchs, hacker, marchand.

## Fragments de code (v0.2)
L'arme principale a 5 emplacements : 3 ouverts au départ, le 4e au niveau 10, le 5e au niveau 20. Armes secondaires désactivées (`MODE.secondary`).
La chaîne se lit de gauche à droite ; chaque fragment agit sur ce qui sort du précédent. L'ordre compte.

| Fragment | Code | Effet |
|---|---|---|
| Écho | `echo()` | L'onde se répète 0,4 s plus tard (4 max) |
| Scission | `split(3)` | L'onde devient 3 ondes (rayon ×0,55, dégâts ×0,8) ; 2 scissions = 9 ondes |
| Inversion | `invert()` | Aspire au lieu de repousser |
| Surcharge | `overclock()` | Dégâts ×1,6 ; cadence −25 % par Surcharge présente |
| Sur kill → | `onKill:` | Coupe la chaîne : la suite part en petite onde (rayon ×0,5, dégâts ×0,6) là où un zombie meurt. Profondeur max 3, 30 ondes déclenchées max (recharge 20/s) |
| Boucle | `loop(2)` | Le fragment suivant agit deux fois |

- **Obtention** : un zombie porteur (halo magenta, puce `</>` au-dessus de la tête, PV ×2) apparaît à 0:30 puis toutes les 40–60 s (2 max en même temps) et lâche un fragment. Ramassé, il va dans le premier emplacement ouvert libre, sinon en réserve.
- **Réarrangement** : seulement chez le **hacker**, qui apparaît à 1:30 puis toutes les 2 min, à 7 u, et reste 40 s (le temps ne s'écoule que hors de sa zone). Rester 3 s dans sa zone (rayon 1,6 u) remplit la jauge et ouvre l'atelier, en pause. Toucher un fragment puis un emplacement pour les échanger.
