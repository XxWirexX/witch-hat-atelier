// Grimoire : sceaux canoniques de Witch Hat Atelier, recomposés à partir des
// planches du manga, des pages bonus des volumes 1 et 12, de l'anime et des
// relevés (« redraws ») du wiki indépendant Witch Hat Atelier.
//
// Les compositions sont fidèles dans l'esprit (sigils, signes, orientation,
// nombre) mais certaines proportions sont simplifiées. Les symboles encore
// non identifiés par la communauté sont omis et signalés dans `notes`.

import { makeSeal, sigil, at, ringOf } from './seal.js';

const G = (angle, width = 14) => ({ angle, width });

function spell(def) {
  return { official: true, forbidden: false, users: [], ...def };
}

export const SPELLS = [
  spell({
    id: 'pyreball', fr: 'Sceau de Boule de feu', en: 'Pyreball Seal', jp: '焚火球', romaji: 'Takibidama',
    type: 'feu', chapter: 1, episode: 1, users: ['Qifrey', 'Coco', 'Nolnoa', 'Olruggio'],
    effect: 'Une boule de flammes flotte au-dessus du sceau — feu de camp, réchaud, premier sort des apprentis.',
    notes: 'Le manuel du volume 1 insiste : « l\'équilibre compte, tant pour la taille du sigil que pour la longueur des flèches ». Parfois dessiné avec des Colonnes, ce qui enflamme aussi le support.',
    seal: makeSeal([sigil('fire', { size: 0.5 }), ...ringOf('levitation', 4, { start: 45, dist: 0.72, size: 0.34 })], { gap: G(205) }),
  }),
  spell({
    id: 'watershot', fr: 'Sceau de Jet d\'eau', en: 'Watershot Seal', official: false,
    type: 'eau', chapter: 3, episode: 2, users: ['Coco'],
    effect: 'Un jet d\'eau puissant jaillit droit du sceau, tel un tuyau d\'arrosage.',
    notes: 'Premier sort appris par Coco à l\'atelier. Une Colonne plus longue que les autres a fait partir le jet de côté — en plein visage d\'Agott.',
    seal: makeSeal([sigil('water', { size: 0.5 }), ...ringOf('columns', 4, { dist: 0.74, size: 0.3 })], { gap: G(195) }),
  }),
  spell({
    id: 'watershot_unbalanced', fr: 'Jet d\'eau déséquilibré (Coco, ch. 3)', en: 'Unbalanced Watershot', official: false,
    type: 'eau', chapter: 3, episode: 2, users: ['Coco'],
    effect: 'Le jet part vers la Colonne la plus longue au lieu de monter droit.',
    notes: 'Démonstration de la leçon d\'Agott : la longueur d\'un signe directionnel est une poussée.',
    seal: makeSeal([sigil('water', { size: 0.5 }), ...ringOf('columns', 4, { dist: 0.74, sizes: [0.3, 0.5, 0.3, 0.3] })]),
  }),
  spell({
    id: 'skysoaring', fr: 'Sceau de Vol céleste', en: 'Skysoaring Seal', jp: '空すっ飛び', romaji: 'Sorasuttobi',
    type: 'vent', chapter: 4, episode: 3, users: ['Coco'], creator: 'Coco',
    effect: 'Une poussée dans la direction du signe : dessiné sur une voile, le sort fait décoller un deltaplane de fortune.',
    notes: 'Inventé par Coco lors du Consentement de la Couronne, en retournant la leçon du jet d\'eau raté.',
    seal: makeSeal([sigil('wind', { x: 0, y: 0.45, size: 0.45 }), at('levitation', 0, 0.28, 0.9, { rot: 0 })]),
  }),
  spell({
    id: 'sylph_shoes', fr: 'Sceau des Souliers de Sylphe', en: 'Sylph Shoes Seal', jp: '飛靴', romaji: 'Tobigutsu',
    type: 'vent', chapter: 1, episode: 1, users: ['Sorcières'],
    effect: 'Permet de voler. Le sceau est coupé en deux, une moitié sous chaque semelle : il s\'active quand les chaussures se touchent.',
    notes: 'Sigil de Vent sous les pieds entouré de Convergence et de Lévitation en alternance. Certaines versions remplacent la Lévitation par des Colonnes.',
    seal: makeSeal([
      sigil('wind_underfoot', { size: 0.5 }),
      ...ringOf('convergence', 4, { start: 45, dist: 0.72, size: 0.24 }),
      ...ringOf('levitation', 4, { start: 0, dist: 0.74, size: 0.28 }),
    ]),
  }),
  spell({
    id: 'wall_breaker', fr: 'Sceau Brise-mur', en: 'Wall Breaker Seal', jp: '壁崩し', romaji: 'Kabekuzushi',
    type: 'terre', chapter: 6, episode: 4, users: ['Richeh', 'Coco', 'Tetia'],
    effect: 'Réduit en poussière le mur ou la roche sur lesquels il est tracé.',
    notes: 'Le sort le plus retouché de la série (trois révisions). Base des sorts de sable de Tetia et de l\'Intégration.',
    seal: makeSeal([
      sigil('earth', { size: 0.5 }),
      ...ringOf('columns', 2, { start: 90, dist: 0.74, size: 0.34 }),
      ...ringOf('crushing', 2, { start: 0, dist: 0.64, size: 0.42 }),
    ], { gap: G(160) }),
  }),
  spell({
    id: 'integration', fr: 'Intégration', en: 'Integration', official: false,
    type: 'terre', chapter: 17, episode: 10, users: ['Tartah'], creator: 'Coco et Tartah',
    effect: 'Rassemble une poudre pour lui rendre temporairement la forme de l\'objet d\'origine — utile pour identifier des herbes broyées.',
    notes: 'Brise-mur dont les signes de Broyage sont inversés : l\'exemple canonique de l\'inversion.',
    seal: makeSeal([sigil('earth', { size: 0.42 }), ...ringOf('crushing', 6, { dist: 0.7, size: 0.32, inverted: true })]),
  }),
  spell({
    id: 'rainbringer', fr: 'Sceau Porte-pluie', en: 'Rainbringer Seal', jp: '雨生み', romaji: 'Ameumi',
    type: 'eau', chapter: 28, episode: 12, users: ['Agott', 'Euini'],
    effect: 'Fait tomber l\'eau du ciel : chute brutale chez Agott, pluie fine chez Euini.',
    notes: 'Sort du manuel de base. La qualité du cercle joue un rôle notable.',
    seal: makeSeal([at('rain', 0, 0, 1.3), sigil('water', { size: 0.44 })], { gap: G(215) }),
  }),
  spell({
    id: 'rainwarding', fr: 'Pare-pluie', en: 'Rainwarding', official: false,
    type: 'eau', chapter: 82, users: ['Qifrey'],
    effect: 'Zone où l\'eau ne peut exister : parapluie invisible pour pique-niquer sous l\'averse.',
    notes: 'Porte-pluie dont le signe de Pluie est retourné, traits vers l\'intérieur.',
    seal: makeSeal([at('rain', 0, 0, 1.5, { inverted: true }), sigil('water', { size: 0.3 })]),
  }),
  spell({
    id: 'grasping_wind', fr: 'Vent agrippeur', en: 'Grasping Wind', jp: '風寄せの手', romaji: 'Kazeyose no Te',
    type: 'vent', chapter: 14, episode: 9, users: ['Coco', 'Agott'],
    effect: 'Un courant d\'air aspire vers le sceau, assez fort pour attirer des objets légers.',
    notes: 'Trop grand, Coco déracine un pommier entier. Incliner les signes d\'Attraction crée un tourbillon qui cueille les pommes.',
    seal: makeSeal([sigil('wind', { size: 0.48 }), ...ringOf('pulling', 4, { start: 45, dist: 0.72, size: 0.34 })]),
  }),
  spell({
    id: 'grasping_wind_twist', fr: 'Vent agrippeur vrillé (Tetia)', en: 'Grasping Wind (tilted)', official: false,
    type: 'vent', chapter: 14, episode: 9, users: ['Agott'],
    effect: 'Le vent tourne en vrille et cueille délicatement, sans arracher.',
    notes: 'Mêmes signes, inclinés : plus d\'inclinaison, plus de rotation mais moins de portée.',
    seal: makeSeal([sigil('wind', { size: 0.48 }), ...ringOf('pulling', 4, { start: 45, dist: 0.72, size: 0.34, tilt: 30 })]),
  }),
  spell({
    id: 'light_beam', fr: 'Faisceau de lumière', en: 'Light Beam',
    type: 'lumière', chapter: 9, episode: 6, users: ['Agott', 'Olruggio'],
    effect: 'Un rayon de lumière monte droit du sceau.',
    notes: 'Agott s\'en sert pour s\'entraîner à tracer sans regarder.',
    seal: makeSeal([sigil('light', { size: 0.42 }), ...ringOf('columns', 4, { dist: 0.78, size: 0.3 })], { gap: G(180, 10) }),
  }),
  spell({
    id: 'floatglow_lamp', fr: 'Lampe-lueur flottante (ch. 28)', en: 'Floatglow Lamp (ch. 28)', jp: 'ランプの浮き灯り', romaji: 'Ranpu no Ukiakari',
    type: 'lumière', chapter: 28, users: ['Sorcières'],
    effect: 'Lumière flottante (d\'après les signes : un faisceau tenu en équilibre au-dessus du sceau).',
    notes: 'Version étiquetée au chapitre 28, effet jamais montré. Peut-être remplacée par la version murale.',
    seal: makeSeal([sigil('light', { size: 0.34 }), ...ringOf('columns', 4, { dist: 0.72, size: 0.26 }), ...ringOf('stability', 4, { start: 45, dist: 0.7, size: 0.3 })]),
  }),
  spell({
    id: 'wall_anchored_floatglow', fr: 'Lampe-lueur murale', en: 'Wall-Anchored Floatglow Lamp',
    type: 'lumière', chapter: 28, episode: 2, users: ['Euini', 'Coco'],
    effect: 'Une petite boule de lumière flotte — la lampe de tous les ateliers.',
    notes: 'Page bonus du volume 12 : Convergence aux diagonales, Lévitation aux quatre points cardinaux.',
    seal: makeSeal([sigil('light', { size: 0.42 }), ...ringOf('convergence', 4, { start: 45, dist: 0.7, size: 0.24 }), ...ringOf('levitation', 4, { dist: 0.76, size: 0.28 })], { gap: G(200, 10) }),
  }),
  spell({
    id: 'rising_platform', fr: 'Plateau d\'eau ascendant', en: 'Rising Platform of Water', jp: '水の昇り台', romaji: 'Mizu no Noboridai',
    type: 'eau', chapter: 25, users: ['Maître de Richeh'],
    effect: 'Une colonne d\'eau soulève l\'objet porteur droit vers le ciel.',
    notes: 'Utilisé pour gravir les montagnes flottantes du massif de Dadah.',
    seal: makeSeal([
      sigil('water', { size: 0.44 }),
      ...ringOf('levitation', 4, { start: 45, dist: 0.62, size: 0.3, inverted: true }),
      ...[-24, 24, 156, 204].map((a) => at('columns', a, 0.84, 0.18)),
    ], { gap: G(190) }),
  }),
  spell({
    id: 'water_orb', fr: 'Orbe d\'eau', en: 'Water Orb', official: false,
    type: 'eau', chapter: 53, users: ['Qifrey'], creator: 'Qifrey',
    effect: 'Une sphère invisible au-dessus du sceau retient l\'eau qu\'on y verse.',
    notes: 'Qifrey le trace pour parler à Agott lors du Soir d\'argent.',
    seal: makeSeal([sigil('water', { size: 0.42 }), ...ringOf('columns', 2, { start: 90, dist: 0.72, size: 0.3 }), ...ringOf('orb', 4, { start: 45, dist: 0.7, size: 0.28 })]),
  }),
  spell({
    id: 'bubble_carriage', fr: 'Sceau du Carrosse-bulle', en: 'Bubble Carriage Seal',
    type: 'vent', chapter: 30, users: ['Sorcières'],
    effect: 'L\'air créé prend la forme d\'une bulle qui persiste sous l\'eau.',
    notes: 'Sigil des Gaz, vingt-quatre Colonnes et vingt-quatre Régions tournées vers le cercle.',
    seal: makeSeal([
      sigil('aeriforms', { size: 0.52 }),
      ...ringOf('columns', 24, { dist: 0.76, size: 0.13 }),
      ...ringOf('regions', 24, { start: 7.5, dist: 0.9, size: 0.1, inverted: true }),
    ]),
  }),
  spell({
    id: 'water_bolt', fr: 'Trait d\'eau', en: 'Water Bolt',
    type: 'eau', chapter: 24, users: ['Qifrey'],
    effect: 'Des traits d\'eau fusent en diagonale vers le sol.',
    notes: 'Tracé avec la Baguette d\'eau contre les Anciens de Romonon. Les Régions, toutes du même côté, fixent la direction ; les Perforations, le nombre de traits.',
    seal: makeSeal([
      sigil('water', { size: 0.4 }),
      at('piercing', 0, 0.62, 0.55, { rot: 90 }), at('piercing', 180, 0.62, 0.55, { rot: 90 }),
      at('regions', 90, 0.5, 0.42, { rot: 90 }), at('regions', 60, 0.62, 0.3, { rot: 90 }), at('regions', 120, 0.62, 0.3, { rot: 90 }),
      at('regions', 270, 0.6, 0.28, { rot: 90 }), at('strengthening', 315, 0.55, 0.2, { rot: 90 }), at('strengthening', 225, 0.55, 0.2, { rot: 90 }),
    ]),
  }),
  spell({
    id: 'wind_wall', fr: 'Mur de vent', en: 'Wind Wall',
    type: 'vent', chapter: 28, users: ['Agott'],
    effect: 'Un mur d\'air dressé devant le lanceur.',
    notes: 'Colonnes vers le haut, Convergence rassemblée en bas : le vent se manifeste en une surface.',
    seal: makeSeal([
      sigil('wind', { y: -0.12, size: 0.4 }),
      ...[-36, -18, 0, 18, 36].map((a) => at('columns', a, 0.8, 0.2)),
      ...[135, 155, 175, 185, 205, 225].map((a) => at('convergence', a, 0.62, 0.18)),
      ...[120, 240].map((a) => at('convergence', a, 0.82, 0.16)),
      at('solidification', 90, 0.78, 0.22, { rot: 90 }), at('solidification', 270, 0.78, 0.22, { rot: 90 }),
    ]),
  }),
  spell({
    id: 'crystal_shard', fr: 'Éclat de cristal', en: 'Crystal Shard', official: false,
    type: 'cristal', chapter: 18, episode: 11, users: ['Richeh'],
    effect: 'De grands éclats de cristal jaillissent du sceau.',
    notes: 'Colonnes inversées : la matière est projetée vers l\'extérieur.',
    seal: makeSeal([sigil('crystalize', { size: 0.44 }), ...ringOf('columns', 4, { dist: 0.7, size: 0.3, inverted: true })]),
  }),
  spell({
    id: 'snugstone', fr: 'Sort de la Pierre-chaude', en: 'Snugstone Spell', jp: 'ほっか石', romaji: 'Hokkaishi',
    type: 'feu', chapter: 18, episode: 11, users: ['Olruggio'], creator: 'Olruggio',
    effect: 'Rayonne une douce chaleur sans flamme ; calibré pour ne jamais brûler.',
    notes: 'Amplifié par la Lentille arcanique des Anciens de Romonon, l\'équilibre se rompt et la chaleur fait fondre l\'or. Deux symboles en coupe restent non identifiés.',
    seal: makeSeal([sigil('fire', { size: 0.46 }), ...ringOf('columns', 4, { start: 45, dist: 0.7, size: 0.28, inverted: true })], { gap: G(215) }),
  }),
  spell({
    id: 'smoke_cloud', fr: 'Nuage de fumée', en: 'Smoke Cloud', official: false,
    type: 'fumée', chapter: 91, users: ['Olruggio'],
    effect: 'Un vaste nuage de fumée se répand autour du sceau.',
    notes: 'Utilisé avec le Faisceau de lumière pour intimider un troupeau de lions-chèvres.',
    seal: makeSeal([sigil('smoke', { size: 0.46 }), ...ringOf('columns', 8, { dist: 0.72, size: 0.24, inverted: true })]),
  }),
  spell({
    id: 'boulder_stretch', fr: 'Corde de roche étirée', en: 'Boulder Stretch Rope',
    type: 'terre', chapter: 11, episode: 7, users: ['Richeh'],
    effect: 'La pierre touchée devient un long ruban souple.',
    notes: 'Le signe d\'Étirement entoure le sigil de Terre.',
    seal: makeSeal([sigil('earth', { size: 0.44 }), at('stretch', 0, 0, 1.2)], { gap: G(215) }),
  }),
  spell({
    id: 'light_tracer', fr: 'Traceur de lumière', en: 'Light Tracer',
    type: 'lumière', chapter: 46, users: ['Richeh'], creator: 'Richeh',
    effect: 'Un fil de lumière relie un fragment à tous les autres fragments du même objet (Bracelets d\'éclats de cristal).',
    notes: 'Corde de roche étirée où la Lumière remplace la Terre, plus un signe de Lien.',
    seal: makeSeal([sigil('light', { size: 0.4 }), at('stretch', 0, 0, 1.2), at('link', 0, 0.78, 0.22)]),
  }),
  spell({
    id: 'borrowshade', fr: 'Ombre empruntée', en: 'Borrowshade',
    type: 'ombre', chapter: 21, episode: 12, users: ['Euini'],
    effect: 'Drape la cible d\'ombre pour la fondre dans l\'obscurité.',
    notes: 'Signe de Dissimulation au centre, quatre Enveloppements. Superposé au Sort-miroir pour la Cape-miroir.',
    seal: makeSeal([at('concealment', 0, 0, 0.5), ...ringOf('envelopment', 4, { start: 45, dist: 0.7, size: 0.32 })]),
  }),
  spell({
    id: 'flying_puppet', fr: 'Marionnette volante de diversion', en: 'Flying Puppet of Diversion',
    type: 'vent', chapter: 6, episode: 4, users: ['Tetia'],
    effect: 'Les objets proches s\'envolent et zigzaguent dans le ciel.',
    notes: 'Sigil de Vent au cœur du signe des Marionnettes dansantes.',
    seal: makeSeal([at('dancing_puppets', 0, 0, 1.3), sigil('wind', { size: 0.36 })]),
  }),
  spell({
    id: 'billow_cluster', fr: 'Amas nuageux', en: 'Billow Cluster',
    type: 'nuée', chapter: 7, episode: 5, users: ['Tetia'],
    effect: 'Transforme en nuage moelleux toute matière qu\'on y dirige.',
    notes: 'Le signe de Nuée tient lieu de sigil ; les Cueillettes ouvrent vers le centre.',
    seal: makeSeal([at('billow', 0, 0, 0.5), ...ringOf('collection', 4, { dist: 0.68, size: 0.32 })]),
  }),
  spell({
    id: 'ring_of_fire', fr: 'Anneau de feu', en: 'Ring of Fire', official: false,
    type: 'feu', chapter: 9, users: ['Olruggio'],
    effect: 'Le feu déborde en anneau autour du sceau.',
    notes: 'Trois Dispersions ; leur décalage semble sans conséquence.',
    seal: makeSeal([sigil('fire', { size: 0.46 }), ...ringOf('dispersion', 3, { dist: 0.72, size: 0.32 })], { gap: G(200, 10) }),
  }),
  spell({
    id: 'expansion', fr: 'Sceau d\'Expansion et de Lévitation', en: 'Seal of Expansion and Levitation',
    type: 'temps', chapter: 37, users: ['Qifrey', 'Lagrah', 'Richeh'],
    effect: 'L\'objet porteur grandit et flotte — le carnet volant de Qifrey.',
    notes: 'Sélection au centre, Expansion aux angles ouverts vers l\'extérieur, Plans horizontaux dans les creux, huit Colonnes.',
    seal: makeSeal([
      at('selection', 0, 0, 0.26), ...ringOf('expansion', 4, { start: 45, dist: 0.46, size: 0.3 }),
      ...ringOf('stability', 4, { dist: 0.6, size: 0.2 }),
      ...ringOf('columns', 8, { start: 22.5, dist: 0.82, size: 0.18 }),
    ]),
  }),
  spell({
    id: 'reduction', fr: 'Sort de Réduction', en: 'Spell of Reduction',
    type: 'temps', chapter: 45.5, users: ['Qifrey', 'Grande Salle', 'Luluci'],
    effect: 'Rétrécit ce qui se trouve dans sa zone d\'effet ; rompre le sceau rend la taille d\'origine.',
    notes: 'Expansion inversée (angles vers l\'intérieur) et quatre Losanges ; le sigil, coupé en deux par le fermoir, semble être la Répétition.',
    seal: makeSeal([
      sigil('repetition', { size: 0.26 }), ...ringOf('expansion', 4, { start: 45, dist: 0.5, size: 0.3, inverted: true }),
      ...ringOf('diamond', 4, { dist: 0.68, size: 0.26 }),
    ]),
  }),
  spell({
    id: 'repetition_seal', fr: 'Sceau de Répétition (Lit de sable)', en: 'Repetition Seal', jp: 'くり返し', romaji: 'Kurikaeshi',
    type: 'temps', chapter: 7, episode: 5, users: ['Agott', 'Coco', 'Tetia', 'Richeh'],
    effect: 'Ramène sans cesse ce qu\'il enferme à son état d\'origine.',
    notes: 'Anneau extérieur du Lit de sable du dragon : sigils de Répétition et motifs Colonne-Convergence-Colonne autour d\'un sceau intérieur.',
    seal: makeSeal([
      ...ringOf('repetition', 4, { dist: 0.8, size: 0.2 }),
      ...ringOf('convergence', 4, { start: 45, dist: 0.8, size: 0.13 }),
      ...ringOf('columns', 8, { start: 29, dist: 0.8, size: 0.14 }).filter((_, i) => i % 2 === 0),
      ...ringOf('columns', 8, { start: 61, dist: 0.8, size: 0.14 }).filter((_, i) => i % 2 === 0),
    ], { children: [{ seal: makeSeal([]), x: 0, y: 0, scale: 0.6 }] }),
  }),
  spell({
    id: 'magic_cookpot', fr: 'Marmite magique', en: 'Magic Cookpot',
    type: 'temps', chapter: 4, users: ['Qifrey'],
    effect: 'Le plat reste aussi frais qu\'au jour de sa cuisson — un ragoût de deux ans.',
    notes: 'Six Répétitions, une couronne de Convergences ; l\'étoile centrale n\'est pas identifiée.',
    seal: makeSeal([
      ...ringOf('repetition', 6, { dist: 0.52, size: 0.2, tilt: 20 }),
      ...ringOf('convergence', 16, { dist: 0.84, size: 0.14 }),
    ], { gap: G(210, 8) }),
  }),
  spell({
    id: 'washbarrel', fr: 'Sceau des Tonneaux-lavoirs (ch. 83)', en: 'Washbarrel Seal',
    type: 'temps', chapter: 83, users: ['Grande Salle'],
    effect: 'Rend aux vêtements leur état d\'origine — sans tache, sans accroc, sans broderie.',
    notes: 'Six Colonnes inclinées font tourner le linge comme dans une machine à laver. Deux grands X restent non identifiés.',
    seal: makeSeal([
      sigil('repetition', { size: 0.44 }),
      ...[-40, 0, 40].map((a) => at('columns', a, 0.72, 0.22, { tilt: -30 })),
      ...[140, 180, 220].map((a) => at('columns', a, 0.72, 0.22, { tilt: -30 })),
    ]),
  }),
  spell({
    id: 'sand_cage', fr: 'Cage de sable', en: 'Sand Cage', official: false,
    type: 'terre', chapter: 33, users: ['Tetia'],
    effect: 'La roche broyée en sable remonte en panneaux spiralés puis durcit en cage.',
    notes: 'Un Brise-mur (Broyage inversé) complété de Liages ; quatre symboles composites restent non identifiés.',
    seal: makeSeal([
      sigil('earth', { size: 0.46 }),
      ...ringOf('columns', 2, { start: 90, dist: 0.72, size: 0.3 }),
      ...ringOf('crushing', 2, { dist: 0.6, size: 0.34, inverted: true }),
      ...ringOf('binding', 2, { dist: 0.86, size: 0.18 }),
    ], { gap: G(200) }),
  }),
  spell({
    id: 'flame_shot', fr: 'Tir de flamme', en: 'Flame Shot Seal', official: false,
    type: 'feu', chapter: 63, users: ['Coco'], creator: 'Coco',
    effect: 'Une flamme directionnelle, entre faisceau et boule de feu, part vers l\'avant.',
    notes: 'Colonne unique tendue du sigil au bord opposé ; deux colonnes de cinq Régions confinent la magie vers l\'avant.',
    seal: makeSeal([
      sigil('fire', { y: 0.52, size: 0.38 }),
      at('columns', 0, 0.2, 1.3),
      ...[-0.3, 0.3].flatMap((x) => [-0.72, -0.54, -0.36, -0.18, 0].map((y) => ({ glyph: 'regions', x, y, size: 0.13, rot: 0, inverted: false, tilt: 0 }))),
    ], { gap: G(180) }),
  }),
  spell({
    id: 'floating_drops', fr: 'Gouttes flottantes', en: 'Floating Drops',
    type: 'mixte', chapter: 16, users: ['Qifrey'],
    effect: 'Des gouttelettes flottent en l\'air le long du cercle — pour rafraîchir Coco fiévreuse.',
    notes: 'Sigil de Vent central, deux sigils d\'Eau ; des paires de Colonnes opposées (une normale, une inversée) confinent l\'effet sur l\'anneau.',
    seal: makeSeal([
      sigil('wind', { size: 0.36 }),
      sigil('water', { x: -0.42, size: 0.26 }), sigil('water', { x: 0.42, size: 0.26 }),
      ...ringOf('columns', 6, { start: 30, dist: 0.9, size: 0.14 }),
      ...ringOf('columns', 6, { start: 30, dist: 0.7, size: 0.14, inverted: true }),
    ], { gap: G(200, 10) }),
  }),
  spell({
    id: 'rainflinger', fr: 'Chasse-pluie', en: 'Rainflinger', jp: '雨飛ばし', romaji: 'Ametobashi',
    type: 'mixte', chapter: 9, episode: 6, users: ['Olruggio', 'Coco'],
    effect: 'Un vent chaud sèche tout ce qui est dans son rayon (Anneaux de lien d\'Olruggio).',
    notes: 'Vent central, deux petits sigils de Feu à deux dents, deux Réticules qui visent l\'air avec la chaleur.',
    seal: makeSeal([
      sigil('wind', { size: 0.4 }),
      sigil('fire', { x: -0.5, size: 0.26, rot: 180 }), sigil('fire', { x: 0.5, size: 0.26, rot: 180 }),
      at('crosshair', 0, 0.66, 0.3, { rot: 0 }), at('crosshair', 180, 0.66, 0.3, { rot: 0 }),
    ]),
  }),
  spell({
    id: 'waterflinger', fr: 'Chasse-eau', en: 'Waterflinger',
    type: 'mixte', chapter: 62, users: ['Sorcières'],
    effect: 'Effet non montré ; probablement évapore l\'eau visée.',
    notes: 'Jumeau du Chasse-pluie : Eau au centre, Feu en haut et en bas, Réticules sur les côtés.',
    seal: makeSeal([
      sigil('water', { size: 0.4 }),
      sigil('fire', { y: -0.52, size: 0.26 }), sigil('fire', { y: 0.52, size: 0.26 }),
      at('crosshair', 90, 0.66, 0.3, { rot: 90 }), at('crosshair', 270, 0.66, 0.3, { rot: 90 }),
    ]),
  }),
  spell({
    id: 'purify', fr: 'Purification (Coco)', en: 'Purify', official: false,
    type: 'eau', chapter: 61, users: ['Coco'],
    effect: 'Purifie les eaux usées — miniature du sceau de la grille d\'égout.',
    notes: 'Deux Cueillettes de part et d\'autre, deux signes de Purification en haut et en bas.',
    seal: makeSeal([
      sigil('water', { size: 0.4 }),
      ...ringOf('collection', 2, { start: 90, dist: 0.62, size: 0.3 }),
      ...ringOf('purification_sign', 2, { dist: 0.66, size: 0.26 }),
    ]),
  }),
  spell({
    id: 'bird_of_light', fr: 'Balise de l\'oiseau de lumière', en: 'Bird of Light Beacon', jp: '光の鳥狼煙', romaji: 'Hikari no Tori Noroshi',
    type: 'lumière', chapter: 11, episode: 7, users: ['Agott'],
    effect: 'Un oiseau de lumière s\'envole et tournoie — signal, diversion ou spectacle.',
    notes: 'Dispersion d\'un côté, Jaillissement de l\'autre, deux sigils d\'Oiseau — qui ne créent pourtant qu\'un seul oiseau.',
    seal: makeSeal([
      sigil('light', { size: 0.4 }),
      at('dispersion', 180, 0.7, 0.3), at('launch', 0, 0.7, 0.3, { inverted: true }),
      at('deco_bird', 90, 0.6, 0.3, { rot: 0 }), at('deco_bird', 270, 0.6, 0.3, { rot: 0 }),
    ]),
  }),
  spell({
    id: 'icy_road', fr: 'Route de glace', en: 'Icy Road', official: false,
    type: 'cristal', chapter: 26, episode: 13, users: ['Agott', 'Alaira'],
    effect: 'Gèle l\'air au loin pour y poser les pieds.',
    notes: 'Cristallisation entourée de Colonnes inversées qui portent l\'effet hors du cercle ; les petits carrés restent non identifiés.',
    seal: makeSeal([sigil('crystalize', { size: 0.4 }), ...ringOf('columns', 8, { dist: 0.74, size: 0.22, inverted: true })]),
  }),
  spell({
    id: 'vapor_bubble', fr: 'Bulle de vapeur', en: 'Vapor Bubble Spell',
    type: 'eau', chapter: 30, users: ['Sorcières'],
    effect: 'Extrait l\'eau d\'une préparation (concentre le sang-de-bois en encre).',
    notes: 'Anneau intérieur d\'Eau ; anneau extérieur avec deux Vents, six Colonnes, quatre Refroidissements et deux Collectes.',
    seal: makeSeal([
      sigil('wind', { x: -0.66, size: 0.26 }), sigil('wind', { x: 0.66, size: 0.26 }),
      ...ringOf('columns', 6, { dist: 0.88, size: 0.16 }),
      ...ringOf('cooling', 4, { start: 45, dist: 0.76, size: 0.2 }),
      at('gathering', 0, 0.5, 0.28), at('gathering', 180, 0.5, 0.28),
    ], { children: [{ seal: makeSeal([sigil('water', { size: 0.7 })]), x: 0, y: 0, scale: 0.4 }] }),
  }),
  spell({
    id: 'glowstone_path', fr: 'Sentier de pierres luisantes', en: 'Glowstone Path Seal',
    type: 'lumière', chapter: 83, episode: 6, users: ['Olruggio'], creator: 'Olruggio',
    effect: 'La pierre s\'illumine quand on marche dessus : le poids réunit les deux moitiés du cercle.',
    notes: 'Lumière au centre, Dispersions latérales, une Lévitation au-dessus ; un grand X et des Détections complètent un sceau encore mal compris.',
    seal: makeSeal([
      sigil('light', { size: 0.36 }),
      ...ringOf('dispersion', 2, { start: 90, dist: 0.72, size: 0.28 }),
      at('levitation', 0, 0.62, 0.24),
      at('detection', 225, 0.66, 0.2), at('detection', 135, 0.66, 0.2),
    ], { gap: G(180, 8) }),
  }),
  spell({
    id: 'spiraling_flame', fr: 'Flamme spiralée', en: 'Spiraling Flame', official: false,
    type: 'feu', chapter: 72, users: ['Agott'],
    effect: 'Une colonne de flammes tournoyante, dirigée par la pensée.',
    notes: 'Feu, Colonne, signe du Vent tourbillonnant et Visée.',
    seal: makeSeal([sigil('fire', { size: 0.44 }), at('columns', 0, 0.7, 0.3), at('wind_sign', 90, 0.66, 0.3), at('sights_set', 180, 0.7, 0.36)]),
  }),
  spell({
    id: 'capture_pennant', fr: 'Sort de la Bannière de capture', en: 'Capture Pennant Spell', jp: '拘束旗', romaji: 'Kōsokuki',
    type: 'temps', chapter: 11, users: ['Chevaliers Moralis'],
    effect: 'La bannière d\'argent vise, s\'enroule autour de sa cible et résiste à tout.',
    notes: 'Répétition au cœur d\'un double anneau, Visées et Enlacements à cheval sur les deux cercles, Renforcements à leurs extrémités.',
    seal: makeSeal([
      ...ringOf('sights_set', 4, { dist: 0.66, size: 0.4 }),
      ...ringOf('entwining', 4, { start: 45, dist: 0.7, size: 0.28 }),
      ...ringOf('strengthening', 4, { start: 45, dist: 0.9, size: 0.14 }),
    ], { children: [{ seal: makeSeal([sigil('repetition', { size: 0.8 })]), x: 0, y: 0, scale: 0.36 }] }),
  }),
  spell({
    id: 'sand_bridge', fr: 'Pont de sable', en: 'Sand Bridge',
    type: 'terre', chapter: 12, episode: 8, users: ['Olruggio', 'Agott'],
    effect: 'Le sable se dresse en pont à arches, durcit et porte le passage — le temps de rebâtir.',
    notes: 'Sable au centre d\'un double anneau ; Immobilité entre deux Solidifications, Renforcements, Partitions, Colonnes, Liages et sigils de Pont.',
    seal: makeSeal([
      ...ringOf('immobility', 2, { dist: 0.82, size: 0.2 }),
      ...[-22, 22, 158, 202].map((a) => at('solidification', a, 0.82, 0.18)),
      ...[-45, 45, 135, 225].map((a) => at('strengthening', a, 0.8, 0.18)),
      ...[-62, 62, 118, 242].map((a) => at('partition', a, 0.86, 0.12, { inverted: true })),
      ...ringOf('columns', 2, { start: 90, dist: 0.9, size: 0.14 }),
      ...ringOf('binding', 2, { start: 90, dist: 0.7, size: 0.18 }),
      at('bridging', 90, 0.8, 0.22), at('bridging', 270, 0.8, 0.22),
    ], { children: [{ seal: makeSeal([sigil('sand', { size: 0.8 })]), x: 0, y: 0, scale: 0.46 }], gap: G(200, 8) }),
  }),
  spell({
    id: 'water_horse', fr: 'Cheval d\'eau', en: 'Water Horse', official: false,
    type: 'eau', chapter: 46, users: ['Sorcières'],
    effect: 'Un cheval d\'eau tire la calèche.',
    notes: 'Sigil décoratif du Cheval au-dessus de l\'Eau, Mimétisme sur les côtés, Régions en bas.',
    seal: makeSeal([
      sigil('water', { y: 0.1, size: 0.36 }),
      at('deco_horse', 0, 0.52, 0.42, { rot: 0 }),
      at('mimicry', 90, 0.66, 0.34), at('mimicry', 270, 0.66, 0.34),
      ...[160, 180, 200].map((a) => at('regions', a, 0.72, 0.16)),
    ]),
  }),
  spell({
    id: 'water_dragon', fr: 'Dragon d\'eau de Qifrey', en: 'Qifrey\'s Water Dragon',
    type: 'eau', chapter: 58, users: ['Qifrey'],
    effect: 'Un dragon d\'eau géant, qui retombe en nénuphar quand il se dissipe.',
    notes: 'Dragon au centre, sigils d\'Eau et Convergences qui condensent les nuages, Expansion pour la taille, Colonnes pour la direction. Composition simplifiée.',
    seal: makeSeal([
      sigil('deco_dragon', { size: 0.5 }),
      sigil('water', { x: -0.56, size: 0.2 }), sigil('water', { x: 0.56, size: 0.2 }),
      ...ringOf('convergence', 4, { start: 45, dist: 0.74, size: 0.2 }),
      ...ringOf('columns', 4, { dist: 0.86, size: 0.16 }),
    ]),
  }),
  spell({
    id: 'pouch_of_calling', fr: 'Bourse d\'appel', en: 'Pouch of Calling',
    type: 'son', chapter: 34, users: ['Agott'], creator: 'Agott',
    effect: 'Répète un message en écho et sautille vers son destinataire pour l\'attirer.',
    notes: 'Sceau du son enregistré : sigil d\'Appel et Convergences aux angles. Le sceau de poursuite extérieur n\'est pas modélisé.',
    seal: makeSeal([sigil('calling', { size: 0.6 }), ...ringOf('convergence', 4, { start: 45, dist: 0.72, size: 0.22 })]),
  }),
  spell({
    id: 'mirror_spell', fr: 'Sort-miroir', en: 'Mirror Spell', official: false,
    type: 'illusion', chapter: 21, episode: 12, users: ['Euini'],
    effect: 'Projette l\'image réfléchie dans les écailles de la cape (Cape-miroir d\'Ombre empruntée).',
    notes: 'Quatre Réflexions dans le cercle, quatre Projections, et quatre sceaux satellites portant chacun une Réflexion.',
    seal: makeSeal([
      ...ringOf('reflection', 4, { dist: 0.5, size: 0.3 }),
      ...ringOf('projection', 4, { start: 45, dist: 0.62, size: 0.26 }),
    ], { children: [45, 135, 225, 315].map((a) => ({ seal: makeSeal([sigil('reflection', { size: 0.7 })]), x: Math.sin((a * Math.PI) / 180) * 1.02, y: -Math.cos((a * Math.PI) / 180) * 1.02, scale: 0.16 })) }),
  }),
  spell({
    id: 'forbidden_glow', fr: 'Lueur interdite', en: 'Forbidden Glow',
    type: 'lumière', chapter: 1, episode: 1, users: ['Coco'],
    effect: 'Une explosion de lueurs colorées, comme un petit feu d\'artifice.',
    notes: 'Sigil de Lumière scintillante mal tracé par Coco enfant, cerné de Colonnes.',
    seal: makeSeal([sigil('flickering_light', { size: 0.4 }), ...ringOf('columns', 8, { dist: 0.72, size: 0.24 })]),
  }),
  spell({
    id: 'memory_erasure', fr: 'Effacement de mémoire', en: 'Memory Erasure', forbidden: true,
    type: 'esprit', chapter: 12, episode: 8, users: ['Chevaliers Moralis', 'Qifrey', 'Easthies'],
    effect: 'Efface la magie de l\'esprit — totalement, sur une période ou sur un sujet précis.',
    notes: 'Tracé en blanc sur noir. Cercles concentriques de l\'Oubli, Griffes qui dépassent du cercle, points le long du bord. Seul sort sur le corps toléré par le Pacte.',
    seal: makeSeal([
      sigil('obliviation', { size: 0.5 }),
      ...[150, 180, 210].map((a) => at('glaives', a, 1.02, 0.4)),
    ]),
  }),
  spell({
    id: 'everflow', fr: 'Poche de glace à flot continu (Olruggio)', en: 'Ever-Flowing Icepack', official: false,
    type: 'eau', chapter: 62.5, users: ['Coco', 'Olruggio'],
    effect: 'Un mince disque d\'eau circule sans fin au-dessus du sceau.',
    notes: 'Une seule petite Colonne face au sigil : « garde-la petite, au centre, et ajuste-la pour régler le flux ».',
    seal: makeSeal([sigil('water', { y: -0.08, size: 0.44 }), at('columns', 180, 0.58, 0.2)]),
  }),
  spell({
    id: 'earth_lift', fr: 'Élévation de terre (ch. 96)', en: 'Earth Lift', official: false,
    type: 'terre', chapter: 36, users: ['Qifrey'],
    effect: 'Soulève une plaque de sol en plate-forme stable.',
    notes: 'Terre au centre, Plans horizontaux aux diagonales, Colonnes en haut et en bas.',
    seal: makeSeal([
      sigil('earth', { size: 0.42 }),
      ...ringOf('stability', 4, { start: 45, dist: 0.62, size: 0.24 }),
      at('columns', 0, 0.8, 0.24), at('columns', 145, 0.84, 0.2), at('columns', 215, 0.84, 0.2),
    ]),
  }),
  spell({
    id: 'windowway', fr: 'Fenêtre-passage', en: 'Windowway Spell',
    type: 'espace', chapter: 29, episode: 3, users: ['Richeh', 'Sorcières'],
    effect: 'Relie deux fenêtres éloignées ; fonctionne par paire, chaque paire étant unique.',
    notes: 'Anneau hachuré des Fenêtres, anneau intérieur de chevrons tournés vers l\'extérieur ; le sigil de Portes désigne la destination.',
    seal: makeSeal([at('windows', 0, 0, 1.95), ...ringOf('regions', 10, { dist: 0.26, size: 0.1, inverted: true })]),
  }),
  spell({
    id: 'serpents_bed', fr: 'Lit de sable du dragon', en: 'Serpent\'s Bed of Sand', jp: '竜の砂床', romaji: 'Ryū no Sunadoko',
    type: 'terre', chapter: 7, episode: 5, users: ['Tetia', 'Agott', 'Coco', 'Richeh'], creator: 'Les quatre apprenties',
    effect: 'Un nuage de sable moelleux, assez solide pour porter un dragon, qui reprend toujours sa forme.',
    notes: 'Amas nuageux au centre, Brise-murs satellites qui fournissent le sable, le tout enfermé dans un Sceau de Répétition.',
    seal: makeSeal([
      ...ringOf('repetition', 4, { dist: 0.86, size: 0.16 }),
      ...ringOf('convergence', 4, { start: 45, dist: 0.86, size: 0.11 }),
      ...ringOf('columns', 8, { start: 35, dist: 0.86, size: 0.12 }).filter((_, i) => i % 2 === 0),
      ...ringOf('columns', 8, { start: 55, dist: 0.86, size: 0.12 }).filter((_, i) => i % 2 === 0),
    ], {
      children: [
        { seal: makeSeal([at('billow', 0, 0, 0.5), ...ringOf('collection', 4, { dist: 0.66, size: 0.32 })]), x: 0, y: 0, scale: 0.3 },
        ...[45, 135, 225, 315].map((a) => ({
          seal: makeSeal([sigil('earth', { size: 0.5 }), ...ringOf('columns', 2, { start: 90, dist: 0.74, size: 0.34 }), ...ringOf('crushing', 2, { dist: 0.64, size: 0.42 })]),
          x: Math.sin((a * Math.PI) / 180) * 0.52, y: -Math.cos((a * Math.PI) / 180) * 0.52, scale: 0.2,
        })),
      ],
    }),
  }),
  spell({
    id: 'pegasus_carriage', fr: 'Sceau du Carrosse de Pégase', en: 'Pegasus Carriage Spell', jp: '羽根馬車の陣', romaji: 'Hanebasha no Jin',
    type: 'vent', chapter: 1, episode: 1, users: ['Sorcières'],
    effect: 'Le carrosse vole et reste d\'aplomb — le sceau que Coco voit Qifrey réparer, et qui lui révèle que la magie se dessine.',
    notes: 'Stabilité au centre, quatre Colonnes vers l\'intérieur, quatre sous-sceaux (Vent sous les pieds + Lévitation + Gaz définis ; Vent tourbillonnant + Colonnes), couronne de Colonnes horaires et anneau de signes du Vent. Simplifié.',
    seal: makeSeal([
      at('stability', 0, 0, 0.26),
      ...ringOf('columns', 4, { dist: 0.3, size: 0.18 }),
      ...ringOf('columns', 16, { dist: 0.78, size: 0.11, tilt: 90 }),
      ...ringOf('wind_sign', 12, { dist: 0.93, size: 0.1 }),
    ], {
      children: [
        ...[0, 180].map((a) => ({ seal: makeSeal([sigil('wind_underfoot', { size: 0.5 }), ...ringOf('levitation', 2, { start: 90, dist: 0.72, size: 0.3 }), ...ringOf('aeriforms_defined', 2, { dist: 0.7, size: 0.3 })]), x: Math.sin((a * Math.PI) / 180) * 0.56, y: -Math.cos((a * Math.PI) / 180) * 0.56, scale: 0.2 })),
        ...[90, 270].map((a) => ({ seal: makeSeal([sigil('whorling_wind', { size: 0.5 }), ...ringOf('columns', 4, { start: 45, dist: 0.72, size: 0.3 })]), x: Math.sin((a * Math.PI) / 180) * 0.56, y: -Math.cos((a * Math.PI) / 180) * 0.56, scale: 0.2 })),
      ],
    }),
  }),
  spell({
    id: 'ring_only', fr: 'Cercle nu', en: 'Bare ring', official: false,
    type: 'aucun', chapter: 46, users: ['Sorcières'],
    effect: 'Sans sigil ni signe, le cercle libère une décharge d\'énergie brute : une explosion.',
    notes: 'Le minimum vital d\'un sort (chapitre 46).',
    seal: makeSeal([]),
  }),
];

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

// Index inverse : glyphe → sorts qui l'utilisent.
export function spellsUsing(glyphId) {
  const out = [];
  for (const s of SPELLS) {
    const found = collectGlyphs(s.seal);
    if (found.has(glyphId)) out.push(s);
  }
  return out;
}

export function collectGlyphs(seal, acc = new Set()) {
  for (const el of seal.elements) acc.add(el.glyph);
  for (const c of seal.children || []) collectGlyphs(c.seal, acc);
  return acc;
}

export const TYPE_LABEL = {
  feu: 'Feu', eau: 'Eau', terre: 'Terre', vent: 'Vent', lumière: 'Lumière', temps: 'Temps', cristal: 'Cristal', fumée: 'Fumée',
  ombre: 'Ombre', nuée: 'Nuée', mixte: 'Mixte', son: 'Son', illusion: 'Illusion', esprit: 'Esprit (interdit)', espace: 'Espace', aucun: 'Sans sigil',
};
