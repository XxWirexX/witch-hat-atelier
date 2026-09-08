# Grimoire — lecteur de sceaux de *Witch Hat Atelier*

> « La magie se dessine. » — Un projet de fan qui **lit**, **compose** et **explique** les sceaux magiques de *L'Atelier des Sorciers* (*Tongari Bōshi no Atelier*, Kamome Shirahama).

Donnez-lui un sceau — photo, scan, dessin à main levée ou composition — et il vous dit ce que ferait le sort : quel élément, quelle forme, dans quelle direction, s'il est équilibré, s'il est actif, et à quel sort connu il correspond.

Tout tourne dans le navigateur, sans serveur ni dépendance : `index.html` + modules ES.

## Ce que ça fait

| Onglet | Rôle |
| --- | --- |
| **Lire** | Charge une image (glisser-déposer, fichier, collage), **dessine** un sceau à la souris/au doigt, ou génère un exemple du grimoire (avec rotation aléatoire). Le lecteur repère le cercle et sa brèche, les cercles intérieurs, découpe les glyphes, les identifie et rédige la lecture. Chaque identification se corrige d'un clic. |
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

## Tester

```sh
npm test             # node --test : dictionnaire, interpréteur, reconnaissance
npm run eval         # reconnaissance sur tout le grimoire (rendu propre)
node scripts/evaluate.mjs pyreball   # détail d'un sceau
```

Sur un rendu propre, 47 des 58 sceaux du grimoire sont relevés glyphe pour glyphe (74 % des 561 glyphes) ; les échecs sont les sceaux très denses ou imbriqués (Carrosse de Pégase, Lit de sable complet). Sur les sceaux de base tournés, décalés, épaissis et bruités, 90 % sont identifiés exactement, le reste comme « très proche ».

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
                  cercle de Kåsa, brèche, cercles intérieurs, regroupement,
                  appariement par distance de chanfrein aux orientations plausibles
  ui/             les cinq onglets (vanilla JS, aucun framework)
```

**Convention des glyphes.** Chaque dessin vit dans une boîte 100 × 100 ; pour un signe, le haut de la boîte regarde le centre du sceau quand il est « à l'endroit ». Inverser un signe = le tourner de 180° (sauf la Pluie et l'Expansion, qui ont une forme inversée propre). Le modèle de sceau place les éléments en coordonnées polaires (angle depuis midi, distance en rayons de cercle, taille en rayons) — `ringOf('levitation', 4, { start: 45, dist: 0.72, size: 0.34 })`.

**Lecture.** L'interpréteur regroupe les signes par glyphe et orientation, mesure la symétrie (radiale d'ordre n, bilatérale, asymétrique), somme les poussées des signes directionnels (longueur × direction) pour trouver un déséquilibre, détecte l'inclinaison commune (rotation en vrille), lit les Régions (vers le centre / vers l'extérieur / même côté / paires opposées), le cercle (fermé, brèche, imbriqué) et compare la signature du sceau au grimoire.

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
