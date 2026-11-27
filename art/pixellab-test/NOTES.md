# Test PixelLab : Steven « Go Muscu »

Test de génération du premier personnage jouable de GlitchWorld (27/11/2026).

## Accès

- Serveur MCP PixelLab (`https://api.pixellab.ai/mcp`) appelé en JSON-RPC sur HTTP
  (`initialize`, puis `tools/list` et `tools/call`) par `tools/mcp.py`.
- Le jeton est lu dans `~/.claude.json` (projet `hot-drop`, `mcpServers.pixellab.headers`)
  au moment de l'appel. Il n'est jamais affiché, journalisé ni écrit sur le disque.
  Seul l'identifiant de session MCP est mis en cache dans `tools/.session`, un fichier
  supprimé en fin de test.
- Usage : `python3 tools/mcp.py list` ou `python3 tools/mcp.py call <outil> '<json>'`.

## Outils et paramètres utilisés

| # | Outil | Paramètres clés | Coût |
|---|-------|-----------------|------|
| 1 | `create_character` | `mode: v3`, `size: 64`, `view: low top-down`, `outline: single color black outline`, `detail: medium detail`, description (en anglais) : bodybuilder, cheveux bruns courts, bandeau cyan, débardeur magenta #ff2e88, short bleu marine, baskets blanches, haltère géant gris posé sur l'épaule | 2 |
| 2 | `animate_character` | `template_animation_id: walking-8-frames` (mode template), 8 directions | 8 |
| 3 | `animate_character` | `template_animation_id: breathing-idle` (mode template), 8 directions | 8 |
| 4 | `animate_character` | `mode: v3`, `frame_count: 8`, directions S/E/O/N, « raises the heavy dumbbell high above his head… slams it down… » → **slam v1** | 6 (S=2, E=1, O=1, N=2 : canevas 92 / 88 px) |
| 5 | `animate_character` | `mode: pixminimax`, `frame_count: 8`, S puis E/O/N ajoutés au groupe, « lifts the barbell straight overhead… violently smashes it down… returns to standing » → **slam v2** | 1 + 3 |
| 6 | `animate_character` | `mode: pixminimax`, `frame_count: 8`, S puis E/O/N, « grips the handle of the giant dumbbell with both hands like a sledgehammer, swings it high over his head, then smashes it down vertically into the ground… » → **hammer** (demande de l'utilisateur en cours de test) | 1 + 3 |

Outils gratuits utilisés : `get_balance`, `wait_for_jobs` (attente des jobs asynchrones, sans
sondage manuel), `get_character`, et l'export ZIP `/mcp/characters/{id}/download`.

- Personnage PixelLab : `ff096bef-aff5-41de-8065-8759dbbab2f4`, intitulé « Steven Go Muscu ».
- Groupes d'animation : walk `61ee8e58-…`, idle `23198cdc-…`, slam `23f2eb55-…`,
  slam2 `768293dd-…`, hammer `32416044-6ed4-4ebc-8d67-034b8d0cc7c4`. Pour ajouter des
  directions à un groupe, il faut repasser son `animation_group_id` et le même `mode`.

## Consommation

- **32 générations** au total (solde de 773 avant le test, 741 après, sur 2000 par mois ;
  renouvellement le 11/12/2026). Le budget fixé était de 60.
- Temps de génération : environ 100 s pour le personnage, 45 à 90 s par lot d'animations
  (8 jobs en parallèle au maximum : l'idle a été refusé tant que les 8 jobs de marche
  occupaient les créneaux, sans être facturé).

## Fichiers

- `raw/rotations/steven_rot_<dir>.png` : les 8 directions, 64×64.
- `raw/<anim>/steven_<anim>_<dir>_<n>.png` : frames brutes (`<dir>` sans tiret :
  `southeast`, `northwest`, etc.).
- `raw/steven_pixellab_export.zip` : export complet de PixelLab, avec `metadata.json`.
- `sheets/steven_<anim>.png` : une spritesheet par animation, avec une ligne par direction
  dans l'ordre S, SE, E, NE, N, NO, O, SO (seules les directions générées sont présentes)
  et une colonne par frame. Les cellules sont carrées (64, ou 92 pour les attaques) ; les
  frames de 88 px sont centrées dans des cellules de 92.
- `sheets/steven_sheets.json` : taille de cellule, ordre des lignes et nombre de frames par
  direction.
- `preview.html` : page autonome qui fonctionne en `file://`. Elle contient un bac à sable
  jouable (déplacement sur 8 directions, Espace pour le marteau, X pour le slam v2), les
  rotations et chaque animation en boucle, avec un réglage du zoom et des FPS.
- `tools/mcp.py`, `tools/build_sheets.py`, `tools/make_preview.py` et
  `tools/preview.template.html` servent à tout regénérer. Python 3 et Pillow suffisent ;
  aucune dépendance n'a été ajoutée au projet.

## Ce qui a marché, ce qui n'a pas marché

- **Personnage (v3, 64 px) : bon.** Le sprite est lisible et musclé, avec un contour sombre,
  et les 8 directions restent cohérentes. Le bandeau cyan et les baskets blanches sont
  respectés.
  - Le débardeur sort **framboise/bordeaux** (vers #b02050) au lieu du magenta néon
    #ff2e88. Le mode v3 ne prend pas de palette. Pour corriger : remplacer la teinte en
    post-traitement, ou passer par `mode: pro` avec `palette` (10 générations).
  - L'« haltère » est dessiné comme une **barre olympique courte** posée sur l'épaule
    (deux disques de chaque côté) plutôt que comme un haltère court.
  - Le personnage occupe environ 55×62 px dans la cellule de 64. L'haltère déborde sur le
    côté, donc le sprite n'est pas centré horizontalement.
- **Marche (template walking-8-frames, 8 frames, 8 directions) : bonne.** Le cycle est
  fluide et l'haltère reste sur l'épaule. Quelques frames en diagonale déforment un peu le
  bras ou l'haltère.
- **Idle (breathing-idle, 4 frames) : correct mais discret.** Le mouvement de respiration
  est léger.
- **Slam v1 (v3) : à jeter.** Le résultat ressemble à un soulevé de terre (la barre descend
  au sol puis y reste) et l'animation ne boucle pas.
- **Slam v2 (pixminimax) : utilisable au sud et au nord.** La barre monte au-dessus de la
  tête puis frappe le sol. La frame 4 du sud est un flou d'impact baveux et peu lisible ;
  on peut la garder comme « smear » ou la retirer. À l'est, un arc de mouvement est dessiné
  dans le sprite.
- **Hammer (pixminimax), retenu pour l'attaque.** L'haltère est empoigné à deux mains comme
  une masse, levé, puis abattu verticalement, avec des débris au sol sur les frames 4 à 7.
  - Le rendu est très bon au **sud**, bon à **l'est** et au **nord**, plus approximatif à
    **l'ouest** (l'haltère se retourne en cours de geste).
  - L'animation ne revient pas exactement en pose de départ : c'est un coup unique et non
    une boucle, ce qui convient à une attaque.
  - Les débris sont dessinés dans le sprite. Le jeu peut ajouter par-dessus son propre
    effet d'onde de choc néon au moment de l'impact.
- Les attaques n'existent qu'en 4 directions. Pour les diagonales, on prend la direction
  cardinale la plus proche (c'est ce que fait la preview).

## Recommandation pour l'intégration dans le jeu

- **Taille : garder les sprites PixelLab en 64 px et ne pas les réduire.** Une réduction à
  la taille du prototype (16×19) détruit le détail. Il vaut mieux revoir l'échelle du
  monde, pour un personnage d'environ 60 px de haut à l'échelle 1 ; le fichier source se
  prête aussi à un affichage ×2 ou ×3 en `image-rendering: pixelated`.
  - Si le jeu doit rester très petit, régénérer en `size: 32` (même coût), en sachant
    que le détail sera moindre.
- **Ancrage : placer le pivot aux pieds, et non au centre de la cellule.**
  - Cellule de 64 : pieds à y ≈ 62, centre horizontal du corps à x ≈ 28 (à cause de
    l'haltère).
  - Cellule de 92 des attaques : le sprite de 64 est placé avec un décalage de +14 px en
    x comme en y, donc les pieds sont à y ≈ 76.
  - Hitbox suggérée : environ 20×12 px aux pieds.
- **Frames et FPS :**

  | Animation | Frames | FPS | Durée | Directions |
  |-----------|--------|-----|-------|------------|
  | walk | 8 | 10 à 12 | 0,7 à 0,8 s par cycle, à caler sur la vitesse de déplacement | 8 |
  | idle | 4 | 4 à 6 | — | 8 |
  | hammer | 9 (frame 0 = pose de repos) | 12 à 14 | ≈ 0,7 s | 4 |

  - Pour le hammer, la frame d'impact est la 4 : c'est à ce moment qu'il faut déclencher
    l'onde de choc, le screen shake et le hit-stop. On peut sauter la frame 0 pour gagner
    en réactivité.
- **Directions :** 8 pour les déplacements (le jeu choisit la direction selon le vecteur de
  mouvement), 4 pour l'attaque (direction cardinale la plus proche).
- **Chargement :** une texture par animation (`sheets/*.png`) avec `steven_sheets.json`
  pour découper. Attention, les lignes des attaques suivent l'ordre S, E, N, O.
- **Pistes suivantes (peu coûteuses) :**
  1. Recolorer le débardeur en #ff2e88 par remplacement de teinte (0 génération).
  2. Régénérer le hammer à l'ouest seul (1 génération), ou le remplacer par un miroir de
     l'est avec l'outil `mirror_animation`.
  3. Ajouter un `taking-punch` (dégât, 8 générations) et un `falling-back-death`
     (8 générations) en mode template.
