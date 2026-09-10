// Dictionnaire des sigils (紋, mon) et des signes (矢, ya) de Witch Hat Atelier.
//
// Chaque glyphe est dessiné dans une boîte 100×100 (y vers le bas). Pour les
// signes, le HAUT de la boîte (-y) est la direction du CENTRE du sceau quand le
// signe est posé « à l'endroit » (normal). Un signe inversé est tourné de 180°.
//
// Sources : pages « Signs Explained » / « Sigils Explained » du wiki indépendant
// Witch Hat Atelier (witchhatatelier.telepedia.net), volumes 1 et 12 (pages bonus),
// Archives of Witch Hat Atelier (guide officiel, 2026), épisodes 1/6/11 de l'anime.

import { line, arc, circle, bezier, join, sCurve, drop, spiral, radial, rotateStrokes, mirrorX, mirrorY } from './geometry.js';

const S = (strokes, dots = []) => ({ strokes, dots });

// ───────────────────────────── SIGNES ─────────────────────────────

const SIGNS = {
  columns: {
    fr: 'Signe des Colonnes', en: 'Sign of Columns', jp: '柱の矢', romaji: 'Hashira no Ya', alt: ['Signe de Puissance (力の矢)'],
    dir: 'directional', official: true, descOfficial: true,
    effect: 'projette la magie en colonne dans la direction du signe',
    inverted: 'tourné vers l\'extérieur, il diffuse la magie horizontalement autour du sceau (comme la Dispersion)',
    size: 'plus le signe est long, plus la poussée est forte dans sa direction',
    count: 'le nombre de signes règle la portée ou la quantité de magie',
    hint: 'La barre se place côté cercle, la tige pointe vers le centre. Un signe plus long que les autres déséquilibre le sort, qui part de son côté.',
    shape: S([line(30, 80, 70, 80), line(50, 80, 50, 22)]),
  },
  dispersion: {
    fr: 'Signe de Dispersion', en: 'Sign of Dispersion', jp: '拡散の矢', romaji: 'Kakusan no Ya',
    dir: 'unknown', official: true, descOfficial: false,
    effect: 'fait déborder la magie tout autour du sceau, comme un seau qui déborde',
    inverted: 'variante inversée observée, différence d\'effet inconnue',
    size: null, count: null,
    hint: 'Une Colonne dont la barre porte une coupe : la magie fuit au lieu d\'être projetée.',
    shape: S([line(30, 70, 70, 70), line(50, 70, 50, 22), arc(50, 70, 14, 10, 170)]),
  },
  levitation: {
    fr: 'Signe de Lévitation', en: 'Sign of Levitation', jp: '浮遊の矢', romaji: 'Fuyū no Ya',
    dir: 'directional', official: true, descOfficial: true,
    effect: 'fait flotter la cible dans les airs ; équilibré, il la façonne en sphère',
    inverted: 'annule l\'effet d\'un signe de Lévitation normal (seul, effet inconnu)',
    size: 'la longueur fixe la hauteur atteignable, le poids portable ou la vitesse',
    count: 'plusieurs signes équilibrés donnent une boule stable au-dessus du sceau',
    hint: 'Flèche vers le centre, barre côté cercle. Parfois remplacé par des Colonnes (Souliers de Sylphe).',
    shape: S([line(32, 82, 68, 82), line(50, 82, 50, 18), line(36, 34, 50, 18, 64, 34)]),
  },
  convergence: {
    fr: 'Signe de Convergence', en: 'Sign of Convergence', jp: '収束の矢', romaji: 'Shūsoku no Ya',
    dir: 'semi', official: true, descOfficial: true,
    effect: 'fait converger la magie vers un point ; tasse les particules en un ensemble rigide',
    inverted: 'inversé, probablement l\'effet contraire (étalement) — non observé',
    size: null, count: null,
    hint: 'Une des pointes du triangle regarde le centre.',
    shape: S([line(22, 26, 78, 26, 50, 76, 22, 26)]),
  },
  dancing_puppets: {
    fr: 'Signe des Marionnettes dansantes', en: 'Sign of Dancing Puppets', jp: '踊る人形の矢', romaji: 'Odoru Ningyō no Ya',
    dir: 'semi', official: true, descOfficial: false, container: true,
    effect: 'permet de piloter mentalement le mouvement de la cible, même à distance',
    inverted: null, size: null, count: null,
    hint: 'Anneau à quatre nœuds entourant le sigil. Avec un sigil de Vent, la cible vole et se manœuvre dans les airs.',
    shape: S([
      circle(50, 50, 26),
      ...radial([circle(50, 24, 5), line(50, 19, 50, 12, 43, 8), line(50, 12, 57, 8), line(37, 30, 31, 22), line(63, 30, 69, 22)], 4),
    ]),
  },
  crushing: {
    fr: 'Signe de Broyage', en: 'Sign of Crushing', jp: '破砕の矢', romaji: 'Hasai no Ya',
    dir: 'semi', official: true, descOfficial: true,
    effect: 'réduit la cible en morceaux de plus en plus fins jusqu\'à l\'état de sable ou de poudre',
    inverted: 'inversé, il rassemble une matière broyée pour lui rendre temporairement sa forme d\'origine (Intégration)',
    size: 'plus le signe est grand, plus les morceaux obtenus sont petits',
    count: null,
    hint: 'Les pointes du zigzag regardent l\'extérieur (Brise-mur) ; retourné vers le centre, il recompose (Intégration).',
    shape: S([line(18, 32, 34, 70, 50, 32, 66, 70, 82, 32)]),
  },
  pulling: {
    fr: 'Signe d\'Attraction', en: 'Sign of Pulling', jp: '引き寄せの矢', romaji: 'Hikiyose no Ya',
    dir: 'directional', official: true, descOfficial: true,
    effect: 'attire la cible vers le sceau quand la flèche pointe vers le centre',
    inverted: 'inversé, il repousse probablement la cible',
    size: null,
    count: null,
    tilt: 'incliné, il attire en vrillant (tourbillon) ; à 90° il ne ferait que tordre',
    hint: 'Flèche double vers le centre, étrier côté cercle (Vent agrippeur).',
    shape: S([line(34, 86, 34, 78, 66, 78, 66, 86), line(50, 86, 50, 18), line(34, 34, 50, 18, 66, 34), line(34, 52, 50, 36, 66, 52)]),
  },
  stretch: {
    fr: 'Signe d\'Étirement', en: 'Sign of Stretch',
    dir: 'non', official: true, descOfficial: true, container: true,
    effect: 'transforme la matière solide touchée en longs rubans souples',
    inverted: null, size: null, count: null,
    hint: 'Grande arche ouverte qui entoure le sigil central (Corde de roche étirée).',
    shape: S([join(line(24, 84, 30, 72), arc(50, 46, 30, 132, 408), line(70, 72, 76, 84))]),
  },
  coil: {
    fr: 'Signe de Spire', en: 'Sign of Coil',
    dir: 'non', official: true, descOfficial: true,
    effect: 'fait se manifester la matière solide en ressort ou en spirale (sans effet sur liquides et gaz)',
    inverted: null, size: null, count: null,
    hint: 'Deux courbes croisées formant une lentille allongée.',
    shape: S([
      join(line(38, 12, 40, 20), bezier([40, 20], [70, 40], [70, 60], [40, 80]), line(40, 80, 38, 88)),
      join(line(62, 12, 60, 20), bezier([60, 20], [30, 40], [30, 60], [60, 80]), line(60, 80, 62, 88)),
    ]),
  },
  concealment: {
    fr: 'Signe de Dissimulation', en: 'Sign of Concealment', jp: '覆いの矢', romaji: 'Ōi no Ya',
    dir: 'non', official: true, descOfficial: false, container: true,
    effect: 'cache la cible, la drape d\'ombre',
    inverted: null, size: null, count: null,
    hint: 'Cercle traversé d\'un trait, œil au centre (Ombre empruntée, Cape de Sasaran).',
    shape: S([
      circle(50, 50, 30),
      join(bezier([26, 50], [38, 34], [62, 34], [74, 50]), bezier([74, 50], [62, 66], [38, 66], [26, 50])),
      line(8, 30, 26, 50), line(74, 50, 92, 70),
    ], [[50, 50, 4]]),
  },
  reflection: {
    fr: 'Signe de Réflexion', en: 'Sign of Reflection', jp: '反射の矢', romaji: 'Hansha no Ya',
    dir: 'non', official: true, descOfficial: false,
    effect: 'cible l\'image réfléchie sur l\'objet porteur du sceau',
    inverted: null, size: null, count: null,
    hint: 'Sablier vertical (Cape-miroir d\'Ombre empruntée).',
    shape: S([line(30, 22, 70, 22, 30, 78, 70, 78, 30, 22)]),
  },
  windows: {
    fr: 'Signe des Fenêtres', en: 'Sign of Windows', jp: '窓の矢', romaji: 'Mado no Ya',
    dir: 'non', official: true, descOfficial: false, container: true,
    effect: 'relie deux espaces éloignés (portail, Fenêtre-passage)',
    inverted: null, size: null, count: null,
    hint: 'Ne ressemble pas aux autres signes : un anneau hachuré qui double le cercle. Nombreuses variantes.',
    shape: S([circle(50, 50, 32), circle(50, 50, 20), ...radial([line(50, 18, 43, 31)], 18)]),
  },
  cooling: {
    fr: 'Signe de Refroidissement', en: 'Sign of Cooling', jp: '冷やす矢', romaji: 'Hiyasu Ya',
    dir: 'non', official: true, descOfficial: false,
    effect: 'refroidit ce que le sort produit',
    inverted: null, size: null, count: null,
    hint: 'Un trait vertical entre deux paires de points (Bulle de vapeur).',
    shape: S([line(50, 24, 50, 76)], [[34, 36, 3], [34, 64, 3], [66, 36, 3], [66, 64, 3]]),
  },
  gathering: {
    fr: 'Signe de Collecte', en: 'Sign of Gathering', jp: '集める矢', romaji: 'Atsumeru Ya',
    dir: 'semi', official: true, descOfficial: false,
    effect: 'attire activement la matière environnante pour la mettre au service du sort',
    inverted: null, size: null, count: null,
    hint: 'Double chevron vers le centre porté par une tige.',
    shape: S([line(24, 52, 50, 22, 76, 52), line(24, 76, 50, 46, 76, 76), line(50, 46, 50, 86)]),
  },
  stability: {
    fr: 'Signe de Stabilité / des Plans horizontaux', en: 'Sign of Stability / Level Planes', jp: '安定の矢・平行の矢', romaji: 'Antei no Ya / Heikō no Ya', alt: ['Signe d\'Équilibre'],
    dir: 'non', official: true, descOfficial: false,
    effect: 'maintient la cible en équilibre sur un plan horizontal, comme un objet qui flotte sur l\'eau',
    inverted: null, size: null, count: null,
    hint: 'Deux ondulations verticales (versions à 2 ou 3 traits sans différence connue).',
    shape: S([sCurve(40, 50, 52, 7), sCurve(60, 50, 52, 7)]),
  },
  wind_sign: {
    fr: 'Signe du Vent (Vent tourbillonnant)', en: 'Sign of Wind / Spiraling Wind', jp: '風の矢・風を巻く矢', romaji: 'Kaze no Ya',
    dir: 'asymmetric', official: true, descOfficial: false,
    effect: 'lié au vent ; fonction exacte incertaine (tourbillon)',
    inverted: null, size: null, count: null,
    hint: 'Petite boucle à queue recourbée. Sert de sigil dans les tout premiers chapitres (Carrosse de Pégase).',
    shape: S([join(spiral(52, 30, 2, 11, 90, 450, 20), bezier([63, 30], [64, 60], [52, 78], [36, 82]))]),
  },
  aeriforms_defined: {
    fr: 'Signe des Gaz définis', en: 'Sign of Aeriforms Defined', jp: '気体の示す矢', romaji: 'Kitai o Shimesu Ya', alt: ['Signe de l\'Air'],
    dir: 'semi', official: true, descOfficial: false,
    effect: 'module l\'air produit ou déplacé ; modifie le sigil de Vent sous les pieds',
    inverted: null, size: null, count: null,
    hint: 'Trois traits qui convergent, comme les éventails du sigil de Vent.',
    shape: S([line(30, 30, 42, 72), line(50, 22, 50, 72), line(70, 30, 58, 72)]),
  },
  regions: {
    fr: 'Signe des Régions', en: 'Sign of Regions', jp: '領域の矢', romaji: 'Ryōiki no Ya', alt: ['Signe de Domaine'],
    dir: 'directional', official: true, descOfficial: false,
    effect: 'délimite la zone où la magie se manifeste',
    inverted: 'des paires opposées qui se regardent confinent la magie sur le cercle lui-même (Gouttes flottantes)',
    size: null, count: null,
    hint: 'Simple chevron : seule sa direction compte. Tous vers le centre → dans le cercle ; tous vers l\'extérieur → hors du cercle ; tous du même côté → la magie part de ce côté.',
    shape: S([line(22, 70, 50, 28, 78, 70)]),
  },
  strengthening: {
    fr: 'Signe de Renforcement', en: 'Sign of Strengthening', jp: '強化の矢', romaji: 'Kyōka no Ya', alt: ['Signe de Puissance accrue'],
    dir: 'semi', official: true, descOfficial: false,
    effect: 'rend la cible plus solide, plus dure, plus durable',
    inverted: null, size: null, count: null,
    hint: 'Triangle posé sur deux lignes.',
    shape: S([line(50, 20, 74, 58, 26, 58, 50, 20), line(22, 68, 78, 68), line(22, 80, 78, 80)]),
  },
  sights_set: {
    fr: 'Signe de Visée', en: 'Sign of Sights Set', jp: '照準の矢', romaji: 'Shōjun no Ya', alt: ['Signe de Focalisation'],
    dir: 'directional', official: true, descOfficial: false,
    effect: 'laisse le lanceur viser mentalement une cible ou un point',
    inverted: null, size: null, count: null,
    hint: 'Flèche avec un losange sur la hampe (Bannière de capture, Flamme spiralée).',
    shape: S([line(50, 10, 50, 90), line(38, 24, 50, 10, 62, 24), line(50, 60, 60, 72, 50, 84, 40, 72, 50, 60)]),
  },
  entwining: {
    fr: 'Signe d\'Enlacement', en: 'Sign of Entwining', jp: '巻きつきの矢', romaji: 'Makitsuki no Ya',
    dir: 'semi', official: true, descOfficial: false,
    effect: 'fait s\'enrouler l\'objet porteur (ruban, bannière) autour d\'autres objets',
    inverted: null, size: null, count: null,
    hint: 'Barre à crochets en haut, tige, étrier en bas.',
    shape: S([line(30, 34, 30, 24, 70, 24, 70, 34), line(50, 24, 50, 76), line(30, 66, 30, 76, 70, 76, 70, 66)]),
  },
  detection: {
    fr: 'Signe de Détection', en: 'Sign of Detection', jp: '気配の矢', romaji: 'Keihai no Ya',
    dir: 'unknown', official: true, descOfficial: false,
    effect: 'fonction inconnue (perception d\'une présence ?)',
    inverted: null, size: null, count: null,
    hint: 'Trois traits verticaux de longueur croissante (Sentier de pierres luisantes).',
    shape: S([line(32, 40, 32, 60), line(50, 32, 50, 68), line(68, 22, 68, 78)]),
  },
  partition: {
    fr: 'Signe de Partition', en: 'Sign of Partition', jp: '境界の矢', romaji: 'Kyōkai no Ya',
    dir: 'directional', official: true, descOfficial: false,
    effect: 'trace les frontières de la zone d\'effet, vers l\'extérieur et vers le haut ; s\'allonge pour étirer la zone',
    inverted: null, size: 'allongé, il étire la zone délimitée', count: null,
    hint: 'Petite montagne sur une double ligne (Pont de sable, Vague déferlante).',
    shape: S([line(20, 62, 50, 32, 80, 62), line(20, 74, 50, 44, 80, 74), line(44, 32, 50, 22, 56, 32)]),
  },
  refuse: {
    fr: 'Signe des Déchets', en: 'Sign of Refuse', jp: 'クズ集めの矢', romaji: 'Kuzu Atsume no Ya',
    dir: 'directional', official: true, descOfficial: false,
    effect: 'rassemble les déchets et impuretés dans la direction pointée',
    inverted: null, size: null, count: null,
    hint: 'Losange traversé d\'une croix (Source-lavoir du village de Coco).',
    shape: S([line(50, 20, 76, 50, 50, 80, 24, 50, 50, 20), line(28, 28, 72, 72), line(72, 28, 28, 72)]),
  },
  solidification: {
    fr: 'Signe de Solidification', en: 'Sign of Solidification', jp: '凝固の矢', romaji: 'Gyōko no Ya',
    dir: 'non', official: true, descOfficial: false,
    effect: 'solidifie la magie qui y est dessinée ou reliée',
    inverted: null, size: null, count: null,
    hint: 'Deux cercles reliés par un trait droit — à ne pas confondre avec deux sceaux liés.',
    shape: S([circle(50, 22, 10), circle(50, 78, 10), line(50, 32, 50, 68)]),
  },
  binding: {
    fr: 'Signe de Liage', en: 'Sign of Binding', jp: '留める矢', romaji: 'Tomeru Ya',
    dir: 'semi', official: true, descOfficial: false,
    effect: 'immobilise la matière ciblée et la lie en un seul bloc',
    inverted: null, size: null, count: null,
    hint: 'Deux arcs concentriques (Pont de sable, Fend-la-pluie).',
    shape: S([arc(50, 72, 32, 195, 345), arc(50, 72, 18, 205, 335)]),
  },
  envelopment: {
    fr: 'Signe d\'Enveloppement', en: 'Sign of Envelopment', jp: '衣まといの矢', romaji: 'Koromo Matoi no Ya',
    dir: 'semi', official: true, descOfficial: false,
    effect: 'fait envelopper la cible par l\'effet magique',
    inverted: null, size: null, count: null,
    hint: 'Trait vertical à crochet (Ombre empruntée, Pétrification).',
    shape: S([line(48, 22, 56, 18, 56, 80, 40, 64)]),
  },
  immobility: {
    fr: 'Signe d\'Immobilité', en: 'Sign of Immobility', jp: '不動の矢', romaji: 'Fudō no Ya',
    dir: 'semi', official: true, descOfficial: false,
    effect: 'rend la cible inamovible',
    inverted: null, size: null, count: null,
    hint: 'Coupe traversée d\'un trait, posée sur une base (Pont de sable).',
    shape: S([arc(50, 42, 22, 0, 180), line(50, 14, 50, 74), line(22, 80, 78, 80)]),
  },
  holding: {
    fr: 'Signe de Contenance', en: 'Sign of Holding', jp: '袋の矢', romaji: 'Fukuro no Ya',
    dir: 'non', official: true, descOfficial: false,
    effect: 'maintient la cible dans la forme définie par le sceau tout en la laissant bouger',
    inverted: null, size: null, count: null,
    hint: 'Deux parenthèses ponctuées (Baguette d\'eau).',
    shape: S([bezier([38, 22], [26, 40], [26, 60], [38, 74]), bezier([62, 22], [74, 40], [74, 60], [62, 74])], [[30, 82, 3], [70, 82, 3]]),
  },
  pointing: {
    fr: 'Signe d\'Effilement', en: 'Sign of Pointing', jp: '尖りの矢', romaji: 'Togari no Ya',
    dir: 'non', official: true, descOfficial: false,
    effect: 'donne à la cible une forme conique, à diriger ensuite par des Colonnes',
    inverted: null, size: null, count: null,
    hint: 'Triangle flanqué de deux volutes (Calice-boucle, Baguette d\'eau).',
    shape: S([
      line(50, 36, 66, 66, 34, 66, 50, 36),
      join(arc(18, 52, 8, 90, 380), line(26, 52, 34, 66)),
      join(arc(82, 52, 8, 90, -200), line(74, 52, 66, 66)),
    ]),
  },
  piercing: {
    fr: 'Signe de Perforation', en: 'Sign of Piercing', jp: '槍の矢', romaji: 'Yari no Ya', alt: ['Signe de Trait / Bolt'],
    dir: 'non', official: true, descOfficial: true,
    effect: 'fait se manifester la cible en projectiles, en attaques offensives',
    inverted: null, size: null,
    count: 'le nombre de signes fixe le nombre de projectiles',
    hint: 'Trait long portant un losange (Trait d\'eau : cinq signes → cinq traits).',
    shape: S([line(50, 8, 50, 92), line(50, 38, 58, 50, 50, 62, 42, 50, 50, 38)]),
  },
  mimicry: {
    fr: 'Signe de Mimétisme', en: 'Sign of Mimicry', jp: '模倣の矢', romaji: 'Mohō no Ya',
    dir: 'non', official: true, descOfficial: true,
    effect: 'guide ou imite les mouvements de la créature représentée par le sigil décoratif',
    inverted: null, size: null, count: null,
    hint: 'Tige à anneaux et losange (Cheval d\'eau).',
    shape: S([line(50, 6, 50, 94), circle(50, 26, 7), circle(50, 48, 10), line(50, 62, 57, 72, 50, 82, 43, 72, 50, 62)]),
  },
  glaives: {
    fr: 'Griffes (Glaives)', en: 'Glaives', jp: '爪', romaji: 'Tsume',
    dir: 'semi', official: true, descOfficial: true,
    effect: 'fixent la profondeur à laquelle la magie s\'enfonce dans la chair (technique d\'avant le Pacte)',
    inverted: null, size: null, count: null,
    hint: 'Seuls symboles autorisés à dépasser du cercle, tant qu\'ils y restent reliés. Magie interdite (Effacement de mémoire, Pétrification).',
    shape: S([arc(50, 28, 14, 0, 180), line(36, 28, 36, 12), line(64, 28, 64, 12), line(50, 42, 50, 92)]),
  },
  // ─── Signes nommés par la communauté ───
  collection: {
    fr: 'Signe de Cueillette', en: 'Sign of Collection', unofficial: true,
    dir: 'semi', official: false, descOfficial: false,
    effect: 'récolte la matière située au-dessus et autour du sceau pour que le sort l\'utilise',
    inverted: null, size: null, count: null,
    hint: 'Croix fermée d\'un côté par une barre ; le côté ouvert regarde le centre (Amas nuageux).',
    shape: S([line(24, 78, 76, 78), line(24, 78, 76, 22), line(76, 78, 24, 22)]),
  },
  billow: {
    fr: 'Signe de Nuée', en: 'Sign of Billow', unofficial: true,
    dir: 'non', official: false, descOfficial: false, container: true,
    effect: 'transforme la matière disponible en un nuage moelleux',
    inverted: null, size: null, count: null,
    hint: 'Trèfle à quatre lobes ; peut tenir lieu de sigil (Lit de sable du dragon).',
    shape: S(radial([bezier([50, 50], [30, 12], [70, 12], [50, 50])], 4)),
  },
  diamond: {
    fr: 'Signe du Losange', en: 'Sign of Diamond', unofficial: true,
    dir: 'non', official: false, descOfficial: false,
    effect: 'restreint le sort aux objets voisins sans toucher son support (hypothèse)',
    inverted: null, size: null, count: null,
    hint: 'Losange étroit (Sort de Réduction).',
    shape: S([line(50, 18, 64, 50, 50, 82, 36, 50, 50, 18)]),
  },
  selection: {
    fr: 'Signe de Sélection', en: 'Sign of Selection', unofficial: true,
    dir: 'non', official: false, descOfficial: false,
    effect: 'restreint le sort à l\'objet sur lequel il est dessiné (hypothèse)',
    inverted: null, size: null, count: null,
    hint: 'Carré traversé d\'une croix (centre du Sceau d\'Expansion).',
    shape: S([line(34, 34, 66, 34, 66, 66, 34, 66, 34, 34), line(50, 18, 50, 82), line(18, 50, 82, 50)]),
  },
  expansion: {
    fr: 'Signe d\'Expansion', en: 'Sign of Expansion', unofficial: true,
    dir: 'semi', official: false, descOfficial: false,
    effect: 'agrandit la cible quand ses angles pointent vers l\'extérieur',
    inverted: 'angles vers l\'intérieur : rétrécit la cible (Sort de Réduction)',
    size: null, count: null,
    hint: 'Équerre double ; on en place quatre aux diagonales, angle vers le cercle pour agrandir, vers le centre pour rétrécir.',
    shape: S([line(22, 42, 50, 70, 78, 42), line(30, 30, 50, 50, 70, 30)]),
  },
  crosshair: {
    fr: 'Signe de Réticule', en: 'Sign of Crosshair', unofficial: true,
    dir: 'directional', official: false, descOfficial: false,
    effect: 'fait viser au sort ce que désignent ses bras courts',
    inverted: null, size: null, count: null,
    hint: 'Croix à bras inégaux (Chasse-pluie, Lance-eau).',
    shape: S([line(50, 12, 50, 88), line(36, 44, 64, 44)]),
  },
  rain: {
    fr: 'Signe de Pluie', en: 'Sign of Rain', unofficial: true,
    dir: 'semi', official: false, descOfficial: false, container: true,
    effect: 'fait apparaître la cible depuis le ciel (chute d\'eau brusque ou pluie fine selon le tracé)',
    inverted: 'retourné (traits vers l\'intérieur), il crée une zone où la cible ne peut exister ou est repoussée (Pare-pluie)',
    size: null, count: 'plus de traits par côté adoucit la chute (Euini)',
    hint: 'Coussin aux côtés concaves, trois traits par côté, sigil au centre.',
    shape: S([
      join(bezier([16, 16], [50, 27], [50, 27], [84, 16]), bezier([84, 16], [73, 50], [73, 50], [84, 84]), bezier([84, 84], [50, 73], [50, 73], [16, 84]), bezier([16, 84], [27, 50], [27, 50], [16, 16])),
      ...radial([line(40, 22, 40, 10), line(50, 23, 50, 11), line(60, 22, 60, 10)], 4),
    ]),
    invertedShape: S([
      join(bezier([16, 16], [50, 27], [50, 27], [84, 16]), bezier([84, 16], [73, 50], [73, 50], [84, 84]), bezier([84, 84], [50, 73], [50, 73], [16, 84]), bezier([16, 84], [27, 50], [27, 50], [16, 16])),
      ...radial([line(40, 25, 40, 35), line(50, 27, 50, 37), line(60, 25, 60, 35)], 4),
    ]),
  },
  orb: {
    fr: 'Signe de l\'Orbe', en: 'Sign of Orb', unofficial: true,
    dir: 'non', official: false, descOfficial: false,
    effect: 'crée au-dessus du sceau une sphère invisible qui se remplit de la matière qu\'on y verse',
    inverted: null, size: null, count: null,
    hint: 'Cercle barré verticalement (Orbe d\'eau de Qifrey).',
    shape: S([circle(50, 50, 22), line(50, 18, 50, 82)]),
  },
  purification_sign: {
    fr: 'Signe de Purification', en: 'Sign of Purification', unofficial: true,
    dir: 'asymmetric', official: false, descOfficial: false,
    effect: 'sépare les impuretés de l\'eau (version réduite du sigil de Purification)',
    inverted: null, size: null, count: null,
    hint: 'Petit crochet spiralé (Purification de Coco).',
    shape: S([join(line(46, 30, 46, 46), spiral(46, 58, 12, 4, 270, 630, 20))]),
  },
  link: {
    fr: 'Signe de Lien', en: 'Sign of Link', unofficial: true,
    dir: 'semi', official: false, descOfficial: false,
    effect: 'identifie et relie des objets issus d\'une même source (fragments)',
    inverted: null, size: null, count: null,
    hint: 'Chevrons emboîtés à traits croisés (Traceur de lumière).',
    shape: S([line(18, 36, 50, 60, 82, 36), line(30, 26, 50, 42, 70, 26), line(30, 62, 50, 78), line(70, 62, 50, 78)]),
  },
  stillness: {
    fr: 'Signe d\'Immobilisation', en: 'Sign of Stillness', unofficial: true,
    dir: 'unknown', official: false, descOfficial: false,
    effect: 'maintient un effet magique statique en un seul lieu (chaleur retenue sur une maison)',
    inverted: null, size: null, count: null,
    hint: 'Tige à barres avec une fourche (Pare-neige).',
    shape: S([line(50, 8, 50, 92), line(36, 26, 64, 26), line(30, 42, 70, 42), line(38, 58, 50, 70, 62, 58), line(38, 80, 50, 92, 62, 80)]),
  },
  projection: {
    fr: 'Signe de Projection', en: 'Sign of Projection', unofficial: true,
    dir: 'semi', official: false, descOfficial: false,
    effect: 'projette vers l\'extérieur l\'image définie par le sort',
    inverted: null, size: null, count: null,
    hint: 'Étrier ouvert (Sort-miroir).',
    shape: S([line(22, 64, 22, 40, 78, 40, 78, 64)]),
  },
  launch: {
    fr: 'Signe de Jaillissement', en: 'Sign of Launch', unofficial: true,
    dir: 'directional', official: false, descOfficial: false,
    effect: 'projette la cible dans sa direction en une bouffée puissante mais brève',
    inverted: null, size: null, count: null,
    hint: 'Chevron à queue (Oiseau de lumière, Balise antique).',
    shape: S([line(26, 58, 50, 26, 74, 58), bezier([50, 50], [50, 70], [56, 80], [62, 84])]),
  },
};

// ───────────────────────────── SIGILS ─────────────────────────────

const fireTree = (cx, cy, s) => [
  // Les deux flancs ne se rejoignent pas : le sommet reste ouvert.
  line(cx - 5 * s, cy - 30 * s, cx - 30 * s, cy + 20 * s),
  line(cx + 5 * s, cy - 30 * s, cx + 30 * s, cy + 20 * s),
  line(cx - 30 * s, cy + 20 * s, cx + 30 * s, cy + 20 * s),
  // Ailerons sortant des flancs, vers l'extérieur et vers le haut.
  line(cx - 19 * s, cy + 2 * s, cx - 38 * s, cy - 10 * s),
  line(cx + 19 * s, cy + 2 * s, cx + 38 * s, cy - 10 * s),
  // Tige courte sous la base.
  line(cx, cy + 20 * s, cx, cy + 36 * s),
];

const windFans = (cx, cy, s) => [
  line(cx - 16 * s, cy, cx - 36 * s, cy), line(cx - 16 * s, cy - 8 * s, cx - 32 * s, cy - 18 * s), line(cx - 16 * s, cy + 8 * s, cx - 32 * s, cy + 18 * s),
  line(cx + 16 * s, cy, cx + 36 * s, cy), line(cx + 16 * s, cy - 8 * s, cx + 32 * s, cy - 18 * s), line(cx + 16 * s, cy + 8 * s, cx + 32 * s, cy + 18 * s),
];

// S à volutes : spirale en haut à droite, corps en S, spirale en bas à gauche.
const windS = (cx, cy, s) => join(
  spiral(cx + 10 * s, cy - 22 * s, 1.5, 13 * s, 90, 495, 22),
  bezier([cx + 10 * s, cy - 9 * s], [cx - 16 * s, cy - 6 * s], [cx + 16 * s, cy + 6 * s], [cx - 10 * s, cy + 9 * s]),
  spiral(cx - 10 * s, cy + 22 * s, 13 * s, 1.5, 270, 675, 22),
);

// S de l'eau : hameçons aux extrémités.
const waterS = (cx, cy, s) => join(
  bezier([cx + 4 * s, cy - 36 * s], [cx + 16 * s, cy - 36 * s], [cx + 16 * s, cy - 22 * s], [cx + 8 * s, cy - 22 * s]),
  bezier([cx + 8 * s, cy - 22 * s], [cx - 22 * s, cy - 22 * s], [cx + 22 * s, cy + 22 * s], [cx - 8 * s, cy + 22 * s]),
  bezier([cx - 8 * s, cy + 22 * s], [cx - 16 * s, cy + 22 * s], [cx - 16 * s, cy + 36 * s], [cx - 4 * s, cy + 36 * s]),
);

const SIGILS = {
  fire: {
    fr: 'Sigil de Feu', en: 'Sigil of Fire', jp: '炎の紋', romaji: 'Honō no Mon', element: 'feu', tetrad: true,
    official: true, descOfficial: true,
    effect: 'crée et manipule les flammes ou la chaleur',
    hint: 'Dangereux s\'il n\'est pas équilibré à une taille convenable. La Lumière en est une variante.',
    shape: S(fireTree(50, 50, 1)),
  },
  light: {
    fr: 'Sigil de Lumière', en: 'Sigil of Light', jp: '光の紋', romaji: 'Hikari no Mon', element: 'lumière', variantOf: 'fire',
    official: true, descOfficial: true,
    effect: 'crée et manipule la lumière (qui s\'atténue avec le temps)',
    hint: 'Variante du Feu (dixit Olruggio), assez proche pour être tracée par erreur.',
    shape: S([line(30, 30, 70, 30, 70, 70, 30, 70, 30, 30), line(50, 30, 70, 50, 50, 70, 30, 50, 50, 30), line(50, 12, 50, 88), line(12, 50, 88, 50)]),
  },
  water: {
    fr: 'Sigil d\'Eau', en: 'Sigil of Water', jp: '水の紋', romaji: 'Mizu no Mon', element: 'eau', tetrad: true,
    official: true, descOfficial: true,
    effect: 'manipule, recueille et crée l\'eau',
    hint: 'Les sorts d\'eau durables recueillent l\'eau plutôt que de la créer (coût moindre).',
    shape: S([waterS(50, 50, 1), drop(20, 44, 12), drop(80, 56, 12)]),
  },
  earth: {
    fr: 'Sigil de Terre', en: 'Sigil of Earth', jp: '地の紋', romaji: 'Chi no Mon', alt: ['Sigil de Force', 'Sigil de Sol'], element: 'terre', tetrad: true,
    official: true, descOfficial: true,
    effect: 'manipule les matières solides : bois, pierre, sable, terre (sans jamais en créer)',
    hint: 'Barre, tige et pointe ouverte vers le bas, ponctuées de deux points.',
    shape: S([line(20, 24, 80, 24), line(50, 24, 50, 80), line(24, 42, 50, 80, 76, 42)], [[12, 44, 3.5], [88, 44, 3.5]]),
  },
  wind: {
    fr: 'Sigil de Vent', en: 'Sigil of Wind', jp: '風の紋', romaji: 'Kaze no Mon', alt: ['Sigil de Lévitation', 'Sigil d\'Air'], element: 'vent', tetrad: true,
    official: true, descOfficial: true,
    effect: 'déplace et manipule l\'air (sans en créer)',
    hint: 'S à volutes flanqué de deux éventails de trois traits.',
    shape: S([windS(50, 50, 1), ...windFans(50, 50, 1)]),
  },
  aeriforms: {
    fr: 'Sigil des Gaz', en: 'Sigil of Aeriforms', jp: '気体の紋', romaji: 'Kitai no Mon', element: 'vent', variantOf: 'wind',
    official: true, descOfficial: true,
    effect: 'crée et maintient l\'air (sans le déplacer) — brumes de la Grande Salle, Carrosse-bulle',
    hint: 'Comme le Vent, mais les éventails portent des pointes et des points.',
    shape: S([windS(50, 50, 1), ...windFans(50, 50, 1), line(30, 44, 22, 50, 30, 56), line(70, 44, 78, 50, 70, 56)], [[16, 28, 2.5], [84, 28, 2.5], [16, 72, 2.5], [84, 72, 2.5]]),
  },
  wind_underfoot: {
    fr: 'Sigil de Vent sous les pieds', en: 'Sigil of Wind Underfoot', jp: '足場のある風の紋', romaji: 'Ashiba no aru Kaze no Mon', element: 'vent', variantOf: 'wind',
    official: true, descOfficial: false,
    effect: 'soutient les objets solides suspendus dans l\'air, comme une plate-forme d\'air',
    hint: 'Nœud de volutes enfermé dans des arcs concentriques (Souliers de Sylphe).',
    shape: S([
      windS(50, 50, 0.62),
      circle(50, 50, 34), circle(50, 50, 27),
      spiral(50, 50, 6, 20, 200, 470, 26),
    ]),
  },
  whorling_wind: {
    fr: 'Sigil de Vent tourbillonnant', en: 'Sigil of Whorling Wind', jp: 'つむじ風の紋', romaji: 'Tsumujikaze no Mon', alt: ['Sigil de Vorticité'], element: 'vent', variantOf: 'wind',
    official: true, descOfficial: false,
    effect: 'manipule l\'air par rotation (tourbillon)',
    hint: 'Triangle à trois nœuds prolongés de volutes (Carrosse de Pégase, Tourbillon vagabond).',
    shape: S([
      line(50, 34, 64, 58, 36, 58, 50, 34), circle(50, 34, 4), circle(64, 58, 4), circle(36, 58, 4),
      spiral(50, 22, 2, 8, 270, 630, 16), spiral(74, 66, 2, 8, 30, 390, 16), spiral(26, 66, 2, 8, 150, 510, 16),
    ]),
  },
  repetition: {
    fr: 'Sigil de Répétition', en: 'Sigil of Repetition', jp: 'くり返しの紋', romaji: 'Kurikaeshi no Mon', element: 'temps',
    official: true, descOfficial: true,
    effect: 'ramène sans cesse la cible à l\'état (forme et température) qu\'elle avait quand le sort l\'a saisie — répare, conserve, rend élastique',
    hint: 'Œil dans un cercle, aux paupières prolongées en S. Tour à tour appelé signe, sceau puis sigil.',
    shape: S([
      circle(50, 50, 30),
      join(line(8, 38, 20, 50), bezier([20, 50], [32, 34], [68, 34], [80, 50]), line(80, 50, 92, 62)),
      bezier([20, 50], [32, 66], [68, 66], [80, 50]),
    ], [[50, 50, 4]]),
  },
  guidance: {
    fr: 'Sigil de Guidage', en: 'Sigil of Guidance', jp: '誘導の紋', romaji: 'Yūdō no Mon', element: 'guidage',
    official: true, descOfficial: false,
    effect: 'attire vers lui les objets correspondant aux autres symboles du sceau (poissons d\'eau, Bourses d\'appel)',
    hint: 'Spirale dans un cercle, surmontée d\'un T, flèche descendante au cœur.',
    shape: S([
      circle(50, 58, 30), line(36, 8, 64, 8), line(50, 8, 50, 28),
      join(line(50, 28, 50, 34), spiral(50, 58, 24, 4, 270, 900, 40)),
      line(42, 52, 50, 62, 58, 52), line(42, 62, 50, 72, 58, 62),
    ]),
  },
  calling: {
    fr: 'Sigil d\'Appel', en: 'Sigil of Calling', jp: '呼び声の紋', romaji: 'Yobigoe no Mon', alt: ['Sigil d\'Écho'], element: 'son',
    official: true, descOfficial: true,
    effect: 'répète en écho une phrase enregistrée',
    hint: 'Losange entre deux parenthèses et deux traits (Bourse d\'appel).',
    shape: S([
      line(50, 34, 66, 50, 50, 66, 34, 50, 50, 34),
      line(38, 14, 38, 86), line(62, 14, 62, 86),
      bezier([26, 12], [44, 40], [44, 60], [26, 88]), bezier([74, 12], [56, 40], [56, 60], [74, 88]),
      bezier([14, 14], [4, 40], [4, 60], [14, 86]), bezier([86, 14], [96, 40], [96, 60], [86, 86]),
    ]),
  },
  purification: {
    fr: 'Sigil de Purification', en: 'Sigil of Purification', jp: '浄水の紋', romaji: 'Jōsui no Mon', element: 'eau',
    official: true, descOfficial: true,
    effect: 'nettoie et purifie l\'eau',
    hint: 'Roue de huit volutes. Se scinde en un signe pour un usage réduit.',
    shape: S(radial([spiral(50, 50, 10, 44, 0, 150, 16)], 8)),
  },
  sword: {
    fr: 'Sigil d\'Épée', en: 'Sigil of Sword', jp: '剣の紋', romaji: 'Tsurugi no Mon', element: 'arme',
    official: true, descOfficial: false,
    effect: 'fonction inconnue (Fend-la-pluie)',
    hint: 'Un trait droit et un trait ondulé qui se croisent.',
    shape: S([line(44, 8, 44, 92), bezier([58, 8], [44, 40], [44, 60], [58, 92])]),
  },
  bridging: {
    fr: 'Sigil de Pont', en: 'Sigil of Bridging', jp: '橋の紋', romaji: 'Hashi no Mon', element: 'terre',
    official: true, descOfficial: true,
    effect: 'fait se manifester la cible en pont à tablier plat et arches',
    hint: 'Grande arche couvrant trois petites.',
    shape: S([arc(50, 82, 42, 180, 360), arc(28, 82, 10, 180, 360), arc(50, 82, 10, 180, 360), arc(72, 82, 10, 180, 360)]),
  },
  sand: {
    fr: 'Sigil de Sable', en: 'Sigil of Sand', jp: '砂の紋', romaji: 'Suna no Mon', element: 'terre',
    official: true, descOfficial: true,
    effect: 'manipule le sable (sans en produire)',
    hint: 'S barré d\'un trait vertical, entre deux chevrons pointés.',
    shape: S([line(50, 6, 50, 94), sCurve(50, 40, 40, 10), arc(50, 74, 14, 20, 200), line(18, 30, 30, 50, 18, 70), line(82, 30, 70, 50, 82, 70)], [[10, 50, 3], [90, 50, 3]]),
  },
  undulation: {
    fr: 'Sigil d\'Ondulation', en: 'Sigil of Undulation', jp: '波の紋', romaji: 'Nami no Mon', element: 'eau',
    official: true, descOfficial: true,
    effect: 'donne à la matière voisine une forme de vague (vu uniquement sur l\'eau)',
    hint: 'S entre des accolades bouclées et deux points (Vague déferlante).',
    shape: S([sCurve(50, 50, 48, 12), bezier([32, 30], [22, 40], [22, 60], [32, 70]), bezier([68, 30], [78, 40], [78, 60], [68, 70]), spiral(30, 26, 1, 5, 0, 360, 10), spiral(70, 74, 1, 5, 180, 540, 10)], [[10, 50, 3], [90, 50, 3]]),
  },
  obliviation: {
    fr: 'Sigil d\'Oubli', en: 'Sigil of Obliviation', jp: '忘却', romaji: 'Bōkyaku', element: 'esprit', unofficial: true,
    official: false, descOfficial: false, forbidden: true,
    effect: 'fonction précise inconnue ; cœur des sorts d\'Effacement de mémoire, toujours accompagné de Griffes',
    hint: 'Cercles concentriques autour d\'un point, tracés en blanc sur noir.',
    shape: S([circle(50, 50, 34), circle(50, 50, 22)], [[50, 50, 8]]),
  },
  crystalize: {
    fr: 'Sigil de Cristallisation', en: 'Sigil of Crystalize', element: 'cristal', unofficial: true,
    official: false, descOfficial: false,
    effect: 'cristallise l\'air ou l\'eau en cristal ou en glace',
    hint: 'Grille de trois traits croisés en losange (Éclat de cristal, Route de glace).',
    shape: S([line(20, 36, 64, 80), line(36, 20, 80, 64), line(28, 28, 72, 72), line(80, 36, 36, 80), line(64, 20, 20, 64), line(72, 28, 28, 72)]),
  },
  smoke: {
    fr: 'Sigil de Fumée', en: 'Sigil of Smoke', jp: '煙', romaji: 'Kemuri', element: 'fumée', unofficial: true,
    official: false, descOfficial: false,
    effect: 'crée de la fumée',
    hint: 'Nuage à volute (Nuage de fumée d\'Olruggio).',
    shape: S([
      join(arc(36, 54, 16, 100, 260), arc(44, 34, 14, 190, 330), arc(66, 36, 14, 200, 380), arc(74, 58, 12, 290, 440), arc(56, 66, 12, 20, 140)),
      spiral(48, 62, 1, 7, 0, 420, 14),
    ]),
  },
  flickering_light: {
    fr: 'Sigil de Lumière scintillante', en: 'Sigil of Flickering Light', element: 'lumière', unofficial: true,
    official: false, descOfficial: false,
    effect: 'fonction inconnue ; mal tracé, il explose en lueurs colorées (feu d\'artifice)',
    hint: 'Hexagramme (Lueur interdite).',
    shape: S([line(50, 14, 82, 68, 18, 68, 50, 14), line(50, 86, 18, 32, 82, 32, 50, 86)]),
  },
  lightning: {
    fr: 'Sigil de Foudre', en: 'Sigil of Lightning', element: 'foudre', unofficial: true,
    official: false, descOfficial: false,
    effect: 'crée et manipule probablement l\'électricité',
    hint: 'Éclair en zigzag (sorts d\'Iguin et d\'Engendale).',
    shape: S([line(72, 8, 28, 40, 62, 40, 24, 70, 58, 70, 22, 94)]),
  },
  unburning_flame: {
    fr: 'Sigil de Flamme sans brûlure', en: 'Sigil of Unburning Flames', element: 'feu', variantOf: 'fire', unofficial: true,
    official: false, descOfficial: false,
    effect: 'produit une flamme lumineuse mais froide, qu\'on peut toucher',
    hint: 'Variante du Feu à bras carrés (Boule de feu fantasmatique).',
    shape: S([line(50, 28, 70, 60, 30, 60, 50, 28), line(50, 60, 50, 80), line(42, 80, 58, 80, 58, 94, 42, 94, 42, 80), line(42, 44, 20, 26), line(58, 44, 80, 26), line(14, 20, 24, 20, 24, 30, 14, 30, 14, 20), line(76, 20, 86, 20, 86, 30, 76, 30, 76, 20)]),
  },
  // ─── Sigils décoratifs (装飾紋) ───
  deco_bird: {
    fr: 'Sigil décoratif : Oiseau', en: 'Bird', decorative: true, unofficial: true,
    official: false, descOfficial: false,
    effect: 'donne au sort la forme approximative d\'un oiseau',
    hint: 'Petit éventail d\'arcs et de rayons (Oiseau de lumière).',
    shape: S([arc(50, 70, 18, 200, 340), arc(38, 70, 8, 200, 340), arc(62, 70, 8, 200, 340), line(50, 48, 50, 36), line(40, 52, 34, 42), line(60, 52, 66, 42)]),
  },
  deco_dragon: {
    fr: 'Sigil décoratif : Dragon', en: 'Dragon', jp: '巨鱗竜', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en dragon (Dragon d\'eau de Qifrey)',
    hint: 'Silhouette serpentine à ailes rayées et queue en pointe.',
    shape: S([
      arc(20, 50, 14, 250, 470), line(18, 44, 62, 44, 86, 66), line(40, 44, 46, 30, 56, 44),
      line(46, 30, 44, 22), line(52, 36, 66, 30), line(54, 40, 68, 38), line(28, 40, 34, 34), line(30, 46, 36, 50),
      line(62, 44, 70, 56), line(76, 58, 82, 52), line(86, 66, 96, 60, 92, 72, 86, 66),
    ]),
  },
  deco_flower: {
    fr: 'Sigil décoratif : Fleur', en: 'Flower', decorative: true, unofficial: true,
    official: false, descOfficial: false,
    effect: 'façonne le sort en fleur ; cinq petits symboles autour fixent l\'espèce (et peut-être le nombre)',
    hint: 'Pentagone à cinq rayons (Rose d\'eau, Fleurs de lumière).',
    shape: S([
      line(50, 30, 69, 44, 62, 66, 38, 66, 31, 44, 50, 30),
      line(50, 30, 50, 8), line(69, 44, 90, 38), line(62, 66, 76, 86), line(38, 66, 24, 86), line(31, 44, 10, 38),
    ]),
  },
  deco_horse: {
    fr: 'Sigil décoratif : Cheval', en: 'Horse', jp: '馬の装飾紋', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en cheval (Cheval d\'eau)',
    hint: 'Silhouette anguleuse à deux arcs (jambes et encolure).',
    shape: S([line(22, 14, 40, 14), line(38, 14, 34, 40, 74, 40, 80, 72), line(34, 40, 30, 72), arc(46, 40, 12, 0, 180), arc(66, 40, 10, 0, 180), line(30, 72, 22, 84), line(80, 72, 88, 84)]),
  },
  deco_owlcat: {
    fr: 'Sigil décoratif : Chat-hibou', en: 'Owlcat', jp: '猫梟', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en chat-hibou (tête ronde au plumage d\'hiver)',
    hint: 'Cercle, V intérieur, deux antennes et pattes rayées.',
    shape: S([circle(50, 58, 24), line(36, 42, 50, 66, 64, 42), line(40, 24, 46, 40), line(60, 24, 54, 40), line(44, 68, 56, 68), line(14, 56, 26, 66), line(20, 50, 28, 60), line(86, 56, 74, 66), line(80, 50, 72, 60)]),
  },
  deco_scalewolf: {
    fr: 'Sigil décoratif : Loup-écailleux', en: 'Scalewolf', jp: '鱗狼', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en loup-écailleux',
    hint: 'Triangle renversé subdivisé, sommé d\'une fourche, entouré de losanges.',
    shape: S([
      line(36, 40, 64, 40, 50, 66, 36, 40), line(43, 53, 57, 53), line(50, 40, 43, 53), line(50, 40, 57, 53),
      line(42, 22, 58, 22, 50, 34, 42, 22), line(44, 10, 44, 20), line(56, 10, 56, 20),
      line(50, 72, 56, 82, 50, 92, 44, 82, 50, 72), line(26, 62, 32, 70, 26, 78, 20, 70, 26, 62), line(74, 62, 80, 70, 74, 78, 68, 70, 74, 62),
      line(14, 52, 20, 58), line(86, 52, 80, 58),
    ]),
  },
  deco_torchstag: {
    fr: 'Sigil décoratif : Cerf-torche', en: 'Torchstag', jp: '松明鹿', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en cerf-torche',
    hint: 'Bois en coupe, tête triangulaire, dos arqué, sabots doubles.',
    shape: S([arc(44, 22, 14, 10, 170), line(44, 36, 44, 48), line(24, 40, 36, 34, 36, 46, 24, 40), line(44, 48, 60, 40), bezier([60, 40], [76, 34], [84, 44], [84, 56]), line(84, 56, 76, 72), line(44, 48, 34, 72), line(28, 78, 40, 78), line(28, 84, 40, 84), line(70, 78, 82, 78), line(70, 84, 82, 84)]),
  },
  deco_liongoat: {
    fr: 'Sigil décoratif : Lion-chèvre', en: 'Liongoat', jp: '獅子山羊', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en lion-chèvre',
    hint: 'Crinière en arc, cornes croisées, museau en W.',
    shape: S([arc(50, 46, 24, 200, 340), line(22, 24, 50, 60, 78, 24), line(30, 30, 50, 46, 70, 30), line(18, 50, 82, 50), line(30, 58, 50, 78, 70, 58), arc(50, 88, 12, 200, 340), line(26, 88, 34, 88), line(66, 88, 74, 88)]),
  },
  deco_fish: {
    fr: 'Sigil décoratif : Poisson', en: 'Fish', decorative: true, unofficial: true,
    official: false, descOfficial: false,
    effect: 'façonne le sort en poisson (sculptures d\'eau volantes d\'Agott)',
    hint: 'Losange allongé à queue de trois traits (Guidage des poissons).',
    shape: S([line(8, 50, 34, 30, 60, 50, 34, 70, 8, 50), line(60, 50, 92, 50), line(66, 44, 76, 34, 92, 34), line(66, 56, 76, 66, 92, 66)]),
  },
  deco_valance_leech: {
    fr: 'Sigil décoratif : Sangsue-rideau', en: 'Valance Leech', jp: '帳蛭の装飾紋', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en sangsue-rideau',
    hint: 'Corps anguleux à appendices (Sangsue de lumière, Contre-horloge).',
    shape: S([line(10, 62, 24, 52, 52, 40, 74, 52, 90, 52), line(24, 52, 30, 76), line(52, 40, 56, 22), line(74, 52, 78, 70), line(20, 44, 28, 54), line(44, 56, 62, 64), line(14, 80, 36, 80)]),
  },
  deco_frillram: {
    fr: 'Sigil décoratif : Bélier à collerette', en: 'Frillram', jp: '襟巻羊の装飾紋', decorative: true,
    official: true, descOfficial: true,
    effect: 'façonne le sort en bélier à collerette',
    hint: 'Profil à collerette et sabot (manuel de l\'épisode 11).',
    shape: S([line(14, 14, 44, 14), line(30, 14, 30, 30), arc(30, 38, 8, 180, 360), line(22, 38, 22, 46), bezier([22, 46], [28, 62], [40, 70], [30, 82]), line(30, 82, 20, 86, 22, 92, 80, 92), line(44, 26, 60, 26, 60, 44, 68, 48, 68, 72, 76, 74), line(64, 10, 74, 10, 72, 74)]),
  },
};

// ──────────────────── Fidélité des tracés ────────────────────
//
// Les dessins de ce dépôt sont des reconstructions vectorielles. Le nom d'un
// glyphe peut être officiel sans que son tracé le soit : ce sont deux choses
// différentes, et seule celle-ci dit si l'on peut se fier au dessin.
//
//   conforme    — confronté à un relevé de la série, et conforme.
//   ecart       — confronté à un relevé, et différent : le dessin est à refaire.
//   reconstruit — dessiné d'après une description, jamais confronté à un relevé.
//   simplifie   — volontairement simplifié (les sigils décoratifs, très ornés).
//
// Un glyphe n'est proposé au tracé dans l'onglet Étudier que s'il est conforme :
// faire recopier une approximation n'apprend rien et sanctionne à tort.

export const FIDELITY_LABEL = {
  conforme: 'tracé conforme au relevé',
  ecart: 'tracé à revoir : il s\'écarte du relevé',
  reconstruit: 'tracé reconstruit, non vérifié',
  simplifie: 'tracé simplifié',
};

const SHAPE_CONFORME = [
  'fire', 'light', 'water', 'earth', 'wind', 'aeriforms', 'wind_underfoot', 'crystalize',
  'columns', 'dispersion', 'levitation', 'convergence', 'crushing', 'billow', 'rain',
  'diamond', 'crosshair', 'dancing_puppets', 'stretch', 'binding', 'regions', 'stability',
];
// Un relevé existe et mon dessin ne lui correspond pas encore : c'est dit, et le
// glyphe est écarté des exercices de tracé.
const SHAPE_ECART = [
  'expansion', 'windows', 'pulling', 'collection', 'lightning',
  'detection', 'concealment', 'repetition', 'projection', 'deco_bird', 'deco_horse',
  // Le relevé du Signe des Fenêtres est le dessin que porte aujourd'hui la
  // Sélection : les deux sont donc suspects tant que l'un des deux n'est pas
  // établi. Corriger la Lumière n'y a rien changé — elle reste à 0,26 de la
  // Sélection, c'est-à-dire presque confondue.
  'selection',
];

function fidelityOf(id, kind) {
  if (SHAPE_CONFORME.includes(id)) return 'conforme';
  if (SHAPE_ECART.includes(id)) return 'ecart';
  return kind === 'decorative' ? 'simplifie' : 'reconstruit';
}

// ───────────────────────────── Export ─────────────────────────────

export const GLYPHS = {};
for (const [id, g] of Object.entries(SIGNS)) GLYPHS[id] = { id, kind: 'sign', shapeRef: fidelityOf(id, 'sign'), ...g };
for (const [id, g] of Object.entries(SIGILS)) {
  const kind = g.decorative ? 'decorative' : 'sigil';
  GLYPHS[id] = { id, kind, shapeRef: fidelityOf(id, kind), ...g };
}

export const SIGN_IDS = Object.keys(SIGNS);
export const SIGIL_IDS = Object.keys(SIGILS).filter((id) => !SIGILS[id].decorative);
export const DECORATIVE_IDS = Object.keys(SIGILS).filter((id) => SIGILS[id].decorative);

export const DIR_LABEL = {
  directional: 'directionnel', semi: 'semi-directionnel', non: 'non directionnel', asymmetric: 'asymétrique', unknown: 'catégorie inconnue',
};

export const ELEMENT_LABEL = {
  feu: 'Feu', eau: 'Eau', terre: 'Terre', vent: 'Vent', lumière: 'Lumière', temps: 'Temps', son: 'Son', guidage: 'Guidage',
  arme: 'Arme', esprit: 'Esprit', cristal: 'Cristal', fumée: 'Fumée', foudre: 'Foudre',
};

export function glyphShape(id, inverted = false) {
  const g = GLYPHS[id];
  if (!g) throw new Error(`Glyphe inconnu : ${id}`);
  if (inverted && g.invertedShape) return g.invertedShape;
  return g.shape;
}

// Strokes of a glyph after applying the placement rotation (degrees, clockwise).
export function placedStrokes(id, rotation, inverted = false) {
  const shape = glyphShape(id, inverted);
  const rot = rotation + (inverted && !GLYPHS[id].invertedShape ? 180 : 0);
  const strokes = rotateStrokes(shape.strokes, rot);
  const dots = shape.dots.map(([x, y, r]) => {
    const a = (rot * Math.PI) / 180, dx = x - 50, dy = y - 50;
    return [50 + dx * Math.cos(a) - dy * Math.sin(a), 50 + dx * Math.sin(a) + dy * Math.cos(a), r];
  });
  return { strokes, dots };
}

export { mirrorX, mirrorY };
