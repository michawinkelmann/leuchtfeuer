// Kartentexte der neutralen Fassung (aus shared/texte.js, erzeugt von generator/digital_modelle.py)
export const HELDEN = [
 {
  "id": "karten",
  "datei": "Meister der Karten",
  "titel": "MEISTER DER KARTEN",
  "bild": "faecher",
  "text": "ZIEHE 3 SCHICKSALSKARTEN UND BEHALTE 2. +1 RUHM.",
  "persoenlich": null
 },
 {
  "id": "zauberin",
  "datei": "Spürzauberin",
  "titel": "DIE SPÜRZAUBERIN",
  "bild": "lupe",
  "text": "SOFORT NACH DEM RUNENWURF: BIS ZU 2 WÜRFEL FREI DREHEN. +2 RUHM.",
  "persoenlich": null
 },
 {
  "id": "tueftler",
  "datei": "Tüftler",
  "titel": "DER TÜFTLER",
  "bild": "zahnrad",
  "text": "BAUE EINE BURG AUF EIN EIGENES GEHÖFT FÜR 1 STEIN UND 1 ERZ.",
  "persoenlich": null
 },
 {
  "id": "planerin",
  "datei": "Planerin",
  "titel": "DIE PLANERIN",
  "bild": "klemmbrett",
  "text": "NIMM IN DEINEM ZUG 2 WÜRFEL STATT 1 UND ERNTE BEIDE (JE +1).",
  "persoenlich": null
 },
 {
  "id": "hueterin",
  "datei": "Hüterin der Natur",
  "titel": "DIE HÜTERIN DER NATUR",
  "bild": "blatt",
  "text": "SCHICKE EINE HORDE (FIGUR ODER RING) ZURÜCK AUFS TURM-TOR. +1 RUHM.",
  "persoenlich": null
 },
 {
  "id": "gelehrter",
  "datei": "Gelehrter",
  "titel": "DER GELEHRTE",
  "bild": "buch",
  "text": "PAX VOBISCUM: DIE AUGEN EINES RUNENWURFS ZÄHLEN NICHT. +2 RUHM.",
  "persoenlich": null
 },
 {
  "id": "wegweiserin",
  "datei": "Wegweiserin",
  "titel": "WEGWEISERIN",
  "bild": "wegweiser",
  "text": "ALS REISE DER RUNDE: 1 FELD GRATIS, MIT RUHM, OHNE TURM +1. NICHT AUF 10.",
  "persoenlich": null
 },
 {
  "id": "chronist",
  "datei": "Chronist",
  "titel": "DER CHRONIST",
  "bild": "stammbaum",
  "text": "EINE HORDE BIS 3 FELDER VOR DER HAUPTSTADT KOMMT IN DEN VORRAT. +1 RUHM.",
  "persoenlich": null
 }
];
export const HELDEN_EN = [
 {
  "id": "karten",
  "datei": "Master of Cards",
  "titel": "MASTER OF CARDS",
  "bild": "faecher",
  "text": "DRAW 3 FATE CARDS AND KEEP 2. +1 FAME."
 },
 {
  "id": "zauberin",
  "datei": "Diviner",
  "titel": "DIVINER",
  "bild": "lupe",
  "text": "RIGHT AFTER THE RUNE ROLL: TURN UP TO 2 DICE TO ANY SIDE. +2 FAME."
 },
 {
  "id": "tueftler",
  "datei": "Tinkerer",
  "titel": "TINKERER",
  "bild": "zahnrad",
  "text": "BUILD A CASTLE ON YOUR OWN FARM FOR 1 STONE AND 1 ORE."
 },
 {
  "id": "planerin",
  "datei": "Planner",
  "titel": "PLANNER",
  "bild": "klemmbrett",
  "text": "ON YOUR TURN, TAKE 2 DICE INSTEAD OF 1 AND HARVEST BOTH (+1 EACH)."
 },
 {
  "id": "hueterin",
  "datei": "Warden of Nature",
  "titel": "WARDEN OF NATURE",
  "bild": "blatt",
  "text": "SEND ONE HORDE (FIGURE OR RING) BACK TO THE TOWER GATE. +1 FAME."
 },
 {
  "id": "gelehrter",
  "datei": "Scholar",
  "titel": "SCHOLAR",
  "bild": "buch",
  "text": "PAX VOBISCUM: THE EYES OF ONE RUNE ROLL DO NOT COUNT. +2 FAME."
 },
 {
  "id": "wegweiserin",
  "datei": "Pathfinder",
  "titel": "PATHFINDER",
  "bild": "wegweiser",
  "text": "AS THE JOURNEY OF THE ROUND: 1 SPACE, FREE, WITH FAME, NO TOWER +1. NOT ONTO 10."
 },
 {
  "id": "chronist",
  "datei": "Chronicler",
  "titel": "CHRONICLER",
  "bild": "stammbaum",
  "text": "A HORDE WITHIN 3 HEXES OF THE CAPITAL GOES BACK TO THE SUPPLY. +1 FAME."
 }
];
export const HELD_RUECK = {
 "titel": "HELD",
 "absaetze": [
  "EINMAL IM SPIEL, IM EIGENEN ZUG ODER WIE AUF DER KARTE.",
  "DANN QUER LEGEN."
 ]
};
export const HELD_RUECK_EN = {
 "titel": "HERO",
 "absaetze": [
  "ONCE PER GAME, ON YOUR OWN TURN OR AS THE CARD SAYS.",
  "THEN TURN IT SIDEWAYS."
 ]
};
export const JOURNEY = [
 {
  "feld": 1,
  "kosten": [
   "pferde"
  ],
  "ruhm": 1,
  "gefahr": false
 },
 {
  "feld": 2,
  "kosten": [
   "korn"
  ],
  "ruhm": 1,
  "gefahr": false
 },
 {
  "feld": 3,
  "kosten": [
   "stein"
  ],
  "ruhm": 1,
  "gefahr": false
 },
 {
  "feld": 4,
  "kosten": [
   "korn",
   "erz"
  ],
  "ruhm": 2,
  "gefahr": true
 },
 {
  "feld": 5,
  "kosten": [
   "korn",
   "holz",
   "pferde"
  ],
  "ruhm": 2,
  "gefahr": false
 },
 {
  "feld": 6,
  "kosten": [
   "korn",
   "stein",
   "pferde"
  ],
  "ruhm": 2,
  "gefahr": false
 },
 {
  "feld": 7,
  "kosten": [
   "korn",
   "erz",
   "holz"
  ],
  "ruhm": 2,
  "gefahr": false
 },
 {
  "feld": 8,
  "kosten": [
   "korn",
   "erz",
   "pferde"
  ],
  "ruhm": 3,
  "gefahr": true
 },
 {
  "feld": 9,
  "kosten": [
   "korn",
   "korn",
   "erz"
  ],
  "ruhm": 3,
  "gefahr": false
 },
 {
  "feld": 10,
  "kosten": [
   "korn",
   "korn",
   "erz",
   "pferde"
  ],
  "ruhm": 4,
  "gefahr": false
 }
];
export const NEUTRAL = {
 "hauptstadt": "",
 "gefaehrten": "",
 "gefaehrten_lang": "",
 "widmung": "",
 "edition": "",
 "helden": {}
};
export const PERSOENLICH = null;
export const SCHICKSAL = [
 {
  "id": "eilbote",
  "name": "EILBOTE",
  "bild": "pfeil_fluegel",
  "text": "DIE GEFÄHRTEN ZIEHEN SOFORT 1 FELD, AUCH ZUSÄTZLICH. DU ZAHLST UND ERHÄLTST DEN RUHM."
 },
 {
  "id": "ernte",
  "name": "REICHE ERNTE",
  "bild": "garbe",
  "text": "ERNTE DEINEN WÜRFEL EIN ZWEITES MAL (MIT +1). HAST DU 2 WÜRFEL: EINEN DAVON."
 },
 {
  "id": "bann",
  "name": "BANNSPRUCH",
  "bild": "auge_bann",
  "text": "SCHICKE EINE HORDE (FIGUR ODER RING) ZURÜCK AUFS TURM-TOR."
 },
 {
  "id": "wachfeuer",
  "name": "WACHFEUER",
  "bild": "wachfeuer",
  "text": "BAUE EIN LEUCHTFEUER OHNE HOLZ."
 },
 {
  "id": "handel",
  "name": "HANDELSZUG",
  "bild": "pfeile",
  "text": "TAUSCHE BIS ZU 3-MAL 1 : 1 MIT DEM VORRAT."
 },
 {
  "id": "verstaerkung",
  "name": "VERSTÄRKUNG",
  "bild": "schild",
  "text": "+3 ABWEHR (OHNE RUHM) BEI EINEM ÜBERFALL, BEI DEM DU ZAHLEN DARFST."
 }
];
export const SCHICKSAL_ANZAHL = 2;
export const SCHICKSAL_EN = [
 {
  "id": "eilbote",
  "name": "MESSENGER",
  "bild": "pfeil_fluegel",
  "text": "COMPANIONS MOVE 1 EXTRA SPACE NOW. YOU PAY AND GET THE FAME."
 },
 {
  "id": "ernte",
  "name": "RICH HARVEST",
  "bild": "garbe",
  "text": "HARVEST YOUR DIE A SECOND TIME (WITH +1). WITH 2 DICE: ONE OF THEM."
 },
 {
  "id": "bann",
  "name": "BANISHMENT",
  "bild": "auge_bann",
  "text": "SEND ONE HORDE (FIGURE OR RING) BACK TO THE TOWER GATE."
 },
 {
  "id": "wachfeuer",
  "name": "WATCHFIRE",
  "bild": "wachfeuer",
  "text": "BUILD A BEACON WITHOUT WOOD."
 },
 {
  "id": "handel",
  "name": "CARAVAN",
  "bild": "pfeile",
  "text": "TRADE WITH THE SUPPLY 1 FOR 1, UP TO 3 TIMES."
 },
 {
  "id": "verstaerkung",
  "name": "ALLIES",
  "bild": "schild",
  "text": "+3 DEFENSE (NO FAME) IN A RAID WHERE YOU MAY PAY."
 }
];
export const SCHICKSAL_RUECK = {
 "titel": "SCHICKSAL",
 "absaetze": [
  "FÜRS ERKUNDEN: 1 KARTE.",
  "HÖCHSTENS 3. IM EIGENEN ZUG SPIELEN, DANN UNTER DEN STAPEL."
 ]
};
export const SCHICKSAL_RUECK_EN = {
 "titel": "FATE",
 "absaetze": [
  "EXPLORE: DRAW 1.",
  "AT MOST 3. PLAY ON YOUR OWN TURN, THEN TO THE BOTTOM OF THE DECK."
 ]
};
