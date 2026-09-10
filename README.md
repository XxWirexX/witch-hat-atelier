# Grimoire — lecteur de sceaux de *Witch Hat Atelier*

> « La magie se dessine. » — Un projet de fan qui **lit**, **compose** et **explique** les sceaux magiques de *L'Atelier des Sorciers* (*Tongari Bōshi no Atelier*, Kamome Shirahama).

Donnez-lui un sceau — photo, scan, dessin à main levée ou composition — et il vous dit ce que ferait le sort : quel élément, quelle forme, dans quelle direction, s'il est équilibré, s'il est actif, et à quel sort connu il correspond.

Tout tourne dans le navigateur, sans serveur ni dépendance : `index.html` + modules ES.

## Ce que ça fait

| Onglet | Rôle |
| --- | --- |
| **Lire** | Charge une image (glisser-déposer, fichier, collage), **dessine** un sceau à la souris/au doigt, ou génère un exemple du grimoire — au choix net, d'une main hésitante ou franchement mal dessiné. Le lecteur repère le cercle et sa brèche, les cercles intérieurs, découpe les glyphes, les identifie, confronte le tout au grimoire et rédige la lecture. Chaque identification se corrige d'un clic. |
| **Composer** | Assemble un sceau : sigils (taille, position, rotation), couronnes de signes (nombre, distance, longueur, inclinaison, inversion, un signe plus long que les autres), brèche du cercle. Lecture en direct, export SVG/PNG, recette JSON, test de reconnaissance. |
| **Grimoire** | 58 sceaux canoniques recomposés (Boule de feu, Jet d'eau, Souliers de Sylphe, Brise-mur, Intégration, Porte-pluie, Vent agrippeur, Lit de sable du dragon, Bannière de capture, Effacement de mémoire…) avec effet, chapitre, lanceurs, notes et lecture. |
| **Dictionnaire** | 79 glyphes : 46 signes (矢), 22 sigils (紋) et 11 sigils décoratifs (装飾紋), avec noms français / anglais / japonais, catégorie (directionnel, semi-directionnel…), effet, effet inversé, rôle de la taille et du nombre, statut officiel, et les sorts qui les utilisent. |
| **Règles** | Le système de magie tel que la série l'expose, illustré par des sceaux rendus à la volée. |

## Lancer

Un serveur statique suffit (les modules ES ne se chargent pas en `file://`) :

```sh
npm start            # python3 -m http.server 8080
# puis http://localhost:8080
```

Ou n'importe quel hébergeur statique — GitHub Pages depuis la racine du dépôt fonctionne tel quel.

## Héberger sur son propre serveur

Rien à installer côté serveur : ni Node, ni base, ni build. Il suffit de servir `index.html`, `styles.css` et `src/`.

```sh
sudo sh deploy/deploy.sh          # clone main et installe dans /var/www/grimoire
```

Puis un vhost : `deploy/Caddyfile` (HTTPS automatique) ou `deploy/nginx.conf` (+ certbot). Les deux fixent le type MIME des modules ES — sans lui le navigateur refuse de les charger — et une CSP `default-src 'self'`, puisque la page ne contacte jamais rien.

Pour redéployer à chaque poussée sur `main`, `.github/workflows/deploy-vps.yml` envoie les fichiers en rsync par SSH ; les cinq secrets à renseigner sont listés en tête du fichier. Utilise une clé SSH créée pour ça, pas ta clé personnelle.

## Tester

```sh
npm test                          # node --test : dictionnaire, interpréteur, reconnaissance, hypothèses
npm run eval                      # relevé glyphe par glyphe sur tout le grimoire (rendu propre)
npm run sloppy                    # lecture de sceaux mal dessinés (8 tirages par sceau)
npm run sloppy -- 8 --severe      # au niveau de maladresse le plus élevé
node scripts/sloppy-eval.mjs 3 pyreball --png   # détail d'un sceau, images dans /tmp
```

### Chiffres

| Épreuve | Sorts identifiés | Glyphes relevés |
| --- | --- | --- |
| Rendu propre | 58/58 | 411/561 (73 %), 44 sceaux relevés glyphe pour glyphe |
| Tracé d'une main hésitante (8 tirages × 58 sceaux) | **452/464 (97 %)** | 3 973/4 488 (89 %) |
| Tracé franchement mal dessiné | **441/464 (95 %)** | 3 772/4 488 (84 %) |

« Identifié » signifie que le lecteur nomme le bon sort avec au moins 55 % de concordance — pas qu'il a relevé tous les glyphes.

Un tracé maladroit, ici, c'est : traits tremblés, épaisseur variable d'un trait à l'autre, ruptures au milieu des traits, cercle ovale et bosselé, glyphes de travers, plus gros ou plus petits, décalés de leur place, taches d'encre, et le tout tourné de n'importe quel angle (`src/sloppy.js`). La taille du dessin suit le nombre de glyphes : un sceau de 53 glyphes ne se trace pas à la main dans un cercle de 700 px.

Ce qui résiste encore, sur une main hésitante : le Pare-pluie surtout — son grand signe de Pluie inversé enferme un petit sigil d'Eau, et quand les deux se touchent le sceau devient un seul tracé, indiscernable du Porte-pluie ou de la Marionnette volante, bâtis pareil. Restent une poignée de cas isolés (Faisceau de lumière lu comme Éclat de cristal, Bourse d'appel, Carrosse de Pégase). Dans ces cas le lecteur nomme un sort proche en annonçant sa concordance, ou dit qu'il ne sait pas — il ne devine pas.

## Comment ça marche

```
src/
  geometry.js     primitives de tracé (polylignes, arcs, Bézier, spirales)
  glyphs.js       le dictionnaire : métadonnées + dessin vectoriel de chaque glyphe
  spells.js       le grimoire : compositions des sceaux canoniques
  seal.js         modèle de sceau, placement polaire, rendu SVG, rastérisation
  interpreter.js  analyse (sigils, signes, orientation, symétrie, poussées,
                  rotation, cercle, imbrication) + rédaction française + correspondance
  recognizer.js   image → sceau : seuillage d'Otsu, composantes connexes,
                  cercle de Kåsa, redressement d'ellipse, brèche, cercles intérieurs,
                  regroupement, appariement par distance de chanfrein
  hypothesis.js   lecture par hypothèses : confronte les candidats au grimoire,
                  ré-identifie les tracés ambigus, sonde l'encre là où un glyphe manque
  sloppy.js       rendu « mal dessiné » d'un sceau, pour éprouver la lecture
  ui/             les cinq onglets (vanilla JS, aucun framework)
```

**Convention des glyphes.** Chaque dessin vit dans une boîte 100 × 100 ; pour un signe, le haut de la boîte regarde le centre du sceau quand il est « à l'endroit ». Inverser un signe = le tourner de 180° (sauf la Pluie et l'Expansion, qui ont une forme inversée propre). Le modèle de sceau place les éléments en coordonnées polaires (angle depuis midi, distance en rayons de cercle, taille en rayons) — `ringOf('levitation', 4, { start: 45, dist: 0.72, size: 0.34 })`.

**Lecture.** L'interpréteur regroupe les signes par glyphe et orientation, mesure la symétrie (radiale d'ordre n, bilatérale, asymétrique), somme les poussées des signes directionnels (longueur × direction) pour trouver un déséquilibre, détecte l'inclinaison commune (rotation en vrille), lit les Régions (vers le centre / vers l'extérieur / même côté / paires opposées), le cercle (fermé, brèche, imbriqué) et compare la signature du sceau au grimoire.

**Lire un sceau mal dessiné.** Sur un tracé hésitant, le bon glyphe n'arrive pas toujours en tête des candidats — mais il y figure presque toujours. Plutôt que de figer une identification par tracé puis de chercher le sceau correspondant, le lecteur fait l'inverse : chaque sceau du grimoire « réclame » les tracés qu'il explique, et le mieux-disant l'emporte. Une paire tracé/emplacement ne compte que si le glyphe, la distance au centre, la taille et l'orientation concordent — et comme un sceau tourne d'un seul bloc, l'écart angulaire doit être le même partout, ce qui sépare des sorts de composition voisine. L'hypothèse retenue relit les tracés ambigus, puis va **sonder l'encre là où ses glyphes manquants devraient être** : s'il n'y a rien, rien n'est ajouté. Enfin, les tracés qu'aucun emplacement ne réclame sont écartés et signalés comme tels. Tout cela est dit dans la lecture : le sort nommé, le pourcentage de concordance, les tracés relus, ceux retrouvés, ceux écartés, et le sort rival quand deux explications se valent. Le découpage lui-même est essayé à trois échelles de regroupement (un sceau chargé fond ses signes, un sceau aéré disperse ses sigils) et l'interprétation la mieux étayée l'emporte.

**Reconnaissance.** Aucun réseau de neurones : le masque d'encre est découpé en composantes, le plus grand trait circulaire devient le cercle (ajustement algébrique de Kåsa, puis re-ajustement sur la seule bande circulaire pour détacher ce qui le touche), l'histogramme angulaire donne la brèche, les composantes restantes sont regroupées en glyphes (règles de proximité qui distinguent les sigils en plusieurs morceaux des signes conteneurs), puis chaque groupe est normalisé en 40 × 40 et comparé aux gabarits du dictionnaire par distance de chanfrein symétrique, dans les orientations plausibles (vers le centre ± 45°, inversé, absolues, affinage à 5°). Le résultat est un vrai sceau du modèle, que l'interpréteur lit comme n'importe quel autre.

## Ajouter un glyphe ou un sort

- Un glyphe : une entrée dans `SIGNS` ou `SIGILS` (`src/glyphs.js`) avec ses noms, sa catégorie, ses textes et un `shape` construit avec les helpers de `geometry.js`. Il est immédiatement rendu, lisible et reconnu.
- Un sort : une entrée dans `SPELLS` (`src/spells.js`) avec `makeSeal([...])`. Le test `interpreter.test.js` vérifie qu'il se reconnaît lui-même.

## Sources

- Kamome Shirahama, *Tongari Bōshi no Atelier* (Kōdansha ; éd. française Pika) — pages bonus du volume 1 (« Introduction aux sceaux ») et du volume 12 (« Contraptions et sceaux »).
- *Archives of Witch Hat Atelier — The First Official World Guide* (MAGs, 2026), p. 146-150.
- Anime *Witch Hat Atelier* (BUG FILMS, 2026) : manuels déchiffrés par la communauté (épisodes 1, 6, 11).
- Wiki indépendant Witch Hat Atelier (witchhatatelier.telepedia.net) — pages *Signs Explained*, *Sigils Explained*, *Magic* et fiches de sorts, sous licence CC BY-SA. Les relevés (« redraws ») de la communauté ont servi de référence pour vérifier l'orientation des signes.

Les dessins de glyphes de ce dépôt sont des reconstructions vectorielles originales, simplifiées pour les sigils décoratifs. Les symboles que la communauté n'a pas encore identifiés sont omis et signalés dans les notes des sorts.

Projet de fan, non officiel, sans lien avec l'autrice ni ses éditeurs. Code sous licence MIT.
