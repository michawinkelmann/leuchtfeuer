// Spielwerte nach Regeln v0.5 mit den Entscheidungen vom 12.11.2026 (Stand 8.11.2026 über VARIANTS_V05_8_11, v0.4 über
// VARIANTS_V04). Texte der Karten stehen in texte.js (aus dem Generator erzeugt).

export const RES = ["holz", "stein", "erz", "korn", "pferde"];
export const RES_NAME = { holz: "Holz", stein: "Stein", erz: "Erz", korn: "Korn", pferde: "Pferde" };
export const TERRAIN_RES = { wald: "holz", huegel: "stein", gebirge: "erz", feld: "korn", weide: "pferde" };
export const TERRAIN_NAME = {
  wald: "Wald", feld: "Acker", weide: "Weide", huegel: "Hügel", gebirge: "Gebirge", wasser: "Wasser", ruine: "Ruine",
  hauptstadt: "Hauptstadt", tor: "Nord-Tor", turm_tor: "Turm-Tor", feuerberg: "Feuerberg-Tor",
};
export const DIE_FACES = ["wald", "feld", "weide", "huegel", "gebirge", "auge"];

export const COLORS = {
  rot: { name: "Rot", hex: "#c8312b" },
  blau: { name: "Blau", hex: "#1f5fa8" },
  gelb: { name: "Gelb", hex: "#f5b800" },
  weiss: { name: "Weiß", hex: "#edede6" },
  indigo: { name: "Indigo", hex: "#482960" },      // fünfte Farbe der veröffentlichten Fassung (12.11.2026)
  lavendel: { name: "Lavendel", hex: "#ae96d4" },  // fünfte Farbe des Geschenks; bleibt wählbar
  lila: { name: "Lila", hex: "#7b4fa0" },          // nur für alte Spielstände (bis 6.11.2026)
};
// Standardsitze; zur Wahl stehen COLOR_CHOICES (Indigo und Lavendel: Blau und Lavendel sind bei Rot-Grün-Schwäche
// kaum zu unterscheiden, darum ist Indigo seit 12.11.2026 der Standard)
export const COLOR_ORDER = ["rot", "blau", "gelb", "weiss", "indigo"];
export const COLOR_CHOICES = ["rot", "blau", "gelb", "weiss", "indigo", "lavendel"];

export const COSTS = {
  gehoeft: { holz: 1, korn: 1 },
  burg: { stein: 2, erz: 1 },
  festung: { stein: 1, erz: 2, pferde: 1 },
  leuchtfeuer: { holz: 1, stein: 1, erz: 1 },
  flamme: { holz: 1 },
};
export const LEVEL_NAME = { 1: "Gehöft", 2: "Burg", 3: "Festung" };
export const PIECES = { gehoeft: 6, burg: 4, festung: 2 };

// Reise-Leiste: [Kosten, Ruhm, Gefahr] je Feld 1..10
export const JOURNEYS = {
  v03: [
    [["pferde"], 1, false], [["korn"], 1, false], [["stein"], 1, false],
    [["korn", "erz"], 2, true], [["korn", "holz", "pferde"], 2, false], [["korn", "stein", "pferde"], 2, false],
    [["korn", "erz", "holz"], 2, false], [["korn", "erz", "pferde"], 3, true], [["korn", "korn", "erz"], 3, false],
    [["korn", "korn", "erz", "pferde"], 4, false],
  ],
  v02: [
    [["korn", "holz"], 1, false], [["korn", "pferde"], 1, false], [["korn", "stein"], 1, false],
    [["korn", "erz"], 2, true], [["korn", "holz", "pferde"], 2, false], [["korn", "stein", "pferde"], 2, false],
    [["korn", "erz", "holz"], 2, false], [["korn", "erz", "pferde"], 3, true], [["korn", "korn", "erz"], 3, false],
    [["korn", "korn", "erz", "pferde"], 4, false],
  ],
};

export const TILES_BIG = { wald: 5, feld: 5, weide: 4, huegel: 4, gebirge: 4, wasser: 2, ruine: 1 };
export const TILES_SMALL = { wald: 3, feld: 3, weide: 3, huegel: 3, gebirge: 3, wasser: 1, ruine: 1 };
export const TREASURE_KINDS = ["wald", "feld", "weide", "huegel"];

// Völker mit ihrer Fähigkeit (wie REGELN.md, „Völker“; englisch wie REGELN_KURZ_EN.md). „keins“: ohne Volk (erste Partie).
export const PEOPLES = {
  menschen: { name: "Menschen", en: "Humans", short: "Reiter: Bei Überfällen bringt jedes deiner Pferde 2 Abwehr (Ruhm weiter 1 je Pferd).",
    short_en: "Riders: in raids each of your horses gives 2 defense (still 1 fame per horse)." },
  elben: { name: "Elben", en: "Elves", short: "Weitsicht: Beim Nehmen jeden Würfel für 1 Korn auf ein Gelände drehen (mit der Planerin je Würfel).",
    short_en: "Foresight: when taking dice, turn each to any terrain for 1 grain (with the Planner: per die)." },
  zwerge: { name: "Zwerge", en: "Dwarves", short: "Steinmetze: Leuchtfeuer kosten dich 1 Stein weniger.",
    short_en: "Stonemasons: beacons cost you 1 stone less." },
  halblinge: { name: "Halblinge", en: "Halflings", short: "Schleichen: Ziehst du die Gefährten auf ein Gefahrenfeld, wächst der Turm nicht.",
    short_en: "Sneaking: when you move the Companions onto a danger space, the tower does not grow." },
  kuestenvolk: { name: "Küstenvolk", en: "Coastfolk", short: "Hafen: Legt beim Aufbau 1 Wasser ins Heimatland; mit einem Gebäude am Wasser handelst du 2 : 1.",
    short_en: "Harbor: places 1 water tile in the homeland at setup; with a building at a water hex you trade 2 : 1." },
  keins: { name: "ohne Volk", en: "no people", short: "Keine Fähigkeit (erste Partie: ohne Völker).",
    short_en: "No ability (first game: without peoples)." },
};
export const PEOPLE_ORDER = ["menschen", "elben", "zwerge", "halblinge", "kuestenvolk"];   // ohne „keins“ (zufällige Völker)
export const PEOPLE_NONE = "keins";

export const HERO_IDS = ["karten", "zauberin", "tueftler", "planerin", "hueterin", "gelehrter", "wegweiserin", "chronist"];
export const FATE_IDS = ["eilbote", "ernte", "bann", "wachfeuer", "handel", "verstaerkung"];

// Regelvarianten: Standard = Regeln v0.5 (8.11.2026: weniger Regeln) mit den Entscheidungen vom 12.11.2026. Die alten
// Werte stehen in VARIANTS_V05_8_11 und VARIANTS_V04. Neue Schalter sind so benannt, dass „fehlt“ das alte Verhalten
// bedeutet: Gespeicherte Spiele (ihre variants stammen von damals) spielen also nach den Regeln weiter, mit denen sie begonnen wurden.
export const DEFAULT_VARIANTS = {
  startSegments: 5,       // Turm zu Beginn (v0.4: 2); v0.5 abgestimmt: 4–5 Spieler 5 …
  startSegmentsSmall: 4,  // … 2–3 Spieler 4 (Simulation 8.11.2026: Turm gewinnt 14 / 18 / 23 / 21 %)
  towerMax: 8,            // vollendet: alle verlieren
  hordeStrength: 2,
  hordeStrengthHigh: 3,
  strongFrom: 99,         // ab dieser Turmhöhe Stärke 3; v0.5: nie (v0.4: 6, v0.3: 5)
  hordes: 8,              // Horden im Vorrat (v0.5: Figuren)
  beacons: 6,
  rufCount: 3,            // so viele brennende Leuchtfeuer lösen den Ruf aus (0 = aus; v0.3: 4)
  rufCountSmall: 3,       // ... bei 2–3 Spielern (Ausgleich dafür, dass Leuchtfeuer nur auf Ecken mit 3 Kacheln stehen)
  randplaetze: false,     // Gebäude am Kartenrand und Leuchtfeuer an Ecken mit weniger als 3 Kacheln (bis 5.11.2026 erlaubt)
  journey: "v03",         // Reisekosten: v03 (Felder 1–3 je 1 Rohstoff) oder v02
  journeyStart: 0,        // Startfeld der Gefährten
  defenseTie: "v03",      // Gleichstand bei der Abwehr: v03 (der Erste 2 Ruhm + Karte, die anderen 1) oder alle
  payOrder: "v03",        // v03: reihum, nie mehr als nötig; frei: beliebig viel
  hordeTie: "start",      // gleich kurze Wege: start (Startspieler wählt; v0.5) oder gebaeude (meiste Gebäude, v0.4)
  hordeTieRandom: false,  // true: stehen auf keinem der gleich weiten Felder Gebäude, zufällig statt Rückfrage; seit 7.11.2026 wie am Tisch: der Startspieler wählt
  handLimit: 3,
  supply: 20,             // Rohstoffe je Sorte (12.11.2026; bis dahin 15)
  diceTwoPlayers: 4,
  dangerTower: 1,
  siegeTower: 1,          // verlorener Kampf an der Hauptstadt: Turm + (v0.4: 2)
  bankRate: 3,
  capitalRate: 2,
  // neu in v0.4
  minDice: 5,             // mindestens so viele Runenwürfel (2–4 Spieler 5, 5 Spieler 6)
  capitalDefense: 0,      // Grundabwehr der Hauptstadt (v0.4: 1)
  dangerCap: true,        // ein Gefahrenfeld vollendet den Turm nie
  catchupStart: true,     // Startspieler wird, wer am wenigsten Ruhm hat
  zwergeOn: ["leuchtfeuer"],              // Zwerge sparen den Stein nur hier (v0.4: Festung und Leuchtfeuer)
  elbenCost: 1,           // Elben drehen für 1 Korn
  tueftlerCost: { stein: 1, erz: 1 },     // Tüftler: Burg für 1 Stein + 1 Erz
  zauberinFame: 2,        // Spürzauberin bringt 2 Ruhm
  teamSegment: 1,         // Teamspiel: Turm startet mit 1 Segment mehr
  // neu in v0.5 (fehlt der Schalter, gilt v0.4)
  questClock: true,       // Reise-Uhr: ist niemand gereist, ziehen die Gefährten am Rundenende 1 Feld von selbst
  ownPlus: 1,             // eigener Würfel: bringt er etwas, 1 Rohstoff mehr (nicht bei der gemeinsamen Ernte)
  rings: 6,               // Hordenringe: Stapel = 1 Figur + Ringe; fehlt das Teil, Turm +1 (v0.4: nur „hordes“ Horden insgesamt)
  payFame: 1,             // Ruhm je gezahltem Rohstoff bei Überfällen
  noFightReward: true,    // keine Belohnung für Abwehr (v0.4: Meiste Zahlung 2 Ruhm + Karte, Burgen reichen: je 1 Ruhm)
  noAusfall: true,        // kein Ausfall
  beaconsNeverOut: true,  // Leuchtfeuer brennen immer (kein Erlöschen, kein Neu-Entzünden)
  rufNoKill: true,        // Ruf: nur Turm −1 und 3 Ruhm (v0.4: auch Horden an brennenden Leuchtfeuern in den Vorrat)
  fateExplore: true,      // Schicksalskarte fürs Erkunden (v0.4: für Siege in Kämpfen und die Ruine)
  noTreasure: true,       // keine Schatz-Plättchen
  noRuinReward: true,     // die Ruine bringt nichts (v0.4: 1 Ruhm und 1 Karte)
  wachfeuerBau: true,     // Wachfeuer: Leuchtfeuer ohne Holz bauen (v0.4: alle erloschenen entzünden)
  heroTurnOnly: true,     // Hüterin und Chronist nur im eigenen Zug (v0.4: auch vor einem Kampf)
  planerinTurn: true,     // Planerin: im eigenen Zug 2 Würfel statt 1 (v0.4: vor dem Zug des Startspielers)
  startRuhm: true,        // Startgehöfte bringen Ruhm wie jedes Gehöft
  halblinge: "A",         // A: Gefahrenfeld ohne Turmwachstum (v0.5, Siegquote 1,01), B: Überfälle verschonen Gehöfte (1,10–1,17); v0.4: beides
  noKuesteErnte: true,    // Küstenvolk ohne den Ernte-Bonus von v0.4 (+1 je erntendem Gebäude am Wasser)
  hueterinFame: 1,        // Hüterin der Natur: +1 Ruhm (v0.4: 2)
  // neu am 12.11.2026 (PRUEFUNG_2026-11-11.md, Abschnitt 5; fehlt der Schalter, gilt der Stand vom 8.11.2026)
  rufFame: 1,             // Ruf: der Erbauer des dritten Leuchtfeuers bekommt 1 Ruhm zusätzlich (fehlt: 3)
  siegeAllPay: true,      // an der Hauptstadt dürfen immer alle zahlen (fehlt: nur Besitzer, bei Leuchtfeuer alle)
  capitalNoRings: true,   // in der Hauptstadt braucht es keine Hordenringe (fehlt: Ring-Regel auch dort)
  chronistDist: 3,        // Chronist: Horde höchstens so viele Felder (Weg der Horden) vor der Hauptstadt (fehlt: 1 = auf oder neben ihr)
  chronistFame: 1,        // Chronist: +1 Ruhm (fehlt: 2)
  kartenFame: 1,          // Meister der Karten: +1 Ruhm (fehlt: 0)
  leerTrost: true,        // Würfel ohne Ertrag: 1 beliebiger Rohstoff wie ohne Würfel (fehlt: nichts)
  missingNoTower: true,   // fehlt Figur oder Ring, entfällt die Horde ohne Turm +1 (fehlt: Turm +1)
  elbenPlanerin: true,    // Elben drehen mit der Planerin je Würfel für 1 Korn (Ergänzung vom 9.11.2026)
  raidTieChoice: true,    // gleich nahe Überfälle: der Startspieler wählt die Reihenfolge (fehlt: nach Feldschlüssel)
  bannAussen: true,       // Hüterin und Bannspruch nur auf Horden außerhalb des Turm-Tors; fehlt dort das Teil: Vorrat
  planerinZwei: true,     // Planerin nur, wenn noch 2 Würfel liegen
  tradeBothSides: true,   // Handel unter Spielern: nur Rohstoffe gegen Rohstoffe, beide geben mindestens einen
  heldDesWestens: true,   // Spielende: alle siegen gemeinsam, „Held des Westens“ hat den meisten Ruhm (nur der Text)
  firstMinus: 1,          // erste Partie (createGame({erstePartie: true})): Turm startet mit so viel weniger
};

// Stand v0.5 vom 8.11.2026 (vor den Entscheidungen vom 12.11.2026) zum gepaarten Vergleich:
// createGame({variants: VARIANTS_V05_8_11})
export const VARIANTS_V05_8_11 = {
  supply: 15, rufFame: 3, siegeAllPay: false, capitalNoRings: false, chronistDist: 1, chronistFame: 2, kartenFame: 0,
  leerTrost: false, missingNoTower: false, elbenPlanerin: false, raidTieChoice: false, bannAussen: false, planerinZwei: false,
  tradeBothSides: false, heldDesWestens: false,
};

// Regeln v0.4 (7.11.2026) zum gepaarten Vergleich: createGame({variants: VARIANTS_V04})
export const VARIANTS_V04 = {
  ...VARIANTS_V05_8_11,
  startSegments: 2, startSegmentsSmall: null, strongFrom: 6, hordeTie: "gebaeude", siegeTower: 2, capitalDefense: 1,
  questClock: false, ownPlus: 0, rings: null, payFame: 0, noFightReward: false, noAusfall: false, beaconsNeverOut: false,
  rufNoKill: false, fateExplore: false, noTreasure: false, noRuinReward: false, wachfeuerBau: false, heroTurnOnly: false,
  planerinTurn: false, startRuhm: false, halblinge: null, noKuesteErnte: false, hueterinFame: 2, zwergeOn: ["festung", "leuchtfeuer"],
  kuesteFischer: false, noHafen: false, kuesteWasserPlus: 0,
};

// Weitere Prüfschalter (Simulation 8.11.2026): kuesteImmer (Küstenvolk handelt immer 2 : 1),
// kuesteStart (Rohstoffe für das Küstenvolk beim Aufbau, z. B. {holz: 1, korn: 1}), kuesteFischer (bei eigenem Würfel zählt
// Wasser wie das gewürfelte Gelände), noHafen (kein 2 : 1 am Wasser), kuesteWasserPlus (eigener Würfel: je Gebäude am Wasser +n),
// kuesteWasserEins / kuesteWasserImmer (eigener Würfel +1 mit Gebäude am Wasser), kuesteNurEigenes (nur das beim Aufbau gelegte Wasser).
// Küstenvolk-Siegquote 2/3/4/5 Spieler (8.11.2026, Küstenvolk in jeder Partie): Hafen 0,86/0,79/1,04/0,94 (Standard),
// Fischer 1,11/1,58/2,71/3,05, Fischer + Hafen 1,13/1,67/2,86/3,31, je Gebäude am Wasser +1 0,88/1,15/1,96/2,18.

export const VARIANT_INFO = {
  startSegments: ["Turmsegmente zu Beginn", "zahl", 0, 7],
  ownPlus: ["Eigener Würfel: Rohstoffe mehr", "zahl", 0, 2],
  towerMax: ["Turm vollendet bei", "zahl", 3, 12],
  hordeStrength: ["Hordenstärke", "zahl", 1, 5],
  hordeStrengthHigh: ["Hordenstärke ab Turmhöhe …", "zahl", 1, 6],
  strongFrom: ["… ab Turmhöhe", "zahl", 1, 12],
  hordes: ["Horden im Vorrat", "zahl", 1, 12],
  rufCount: ["Ruf der Leuchtfeuer ab (0 = aus)", "zahl", 0, 6],
  rufCountSmall: ["… bei 2–3 Spielern ab", "zahl", 0, 6],
  randplaetze: ["Bauen am Kartenrand erlaubt (alte Regel; die Teile würden kippen)", "bool"],
  journey: ["Reisekosten", "wahl", { v03: "v0.3: Felder 1–3 je 1 Rohstoff", v02: "v0.2: Felder 1–3 je 2 Rohstoffe" }],
  journeyStart: ["Startfeld der Gefährten", "zahl", 0, 5],
  questClock: ["Gefährten ziehen von selbst, wenn niemand zahlt", "bool"],
  defenseTie: ["Gleichstand bei der Abwehr", "wahl", { v03: "Erster in der Reihe 2 Ruhm + Karte, andere 1 Ruhm", alle: "alle 2 Ruhm + Karte (v0.2)" }],
  payOrder: ["Zahlen bei Überfällen", "wahl", { v03: "reihum, nie mehr als nötig", frei: "jeder beliebig viel (v0.2)" }],
  hordeTie: ["Horden bei gleich kurzen Wegen", "wahl", { gebaeude: "zu den meisten Gebäuden", start: "Startspieler wählt" }],
  hordeTieRandom: ["Gleich kurze Wege ohne Gebäude: zufällig (keine Rückfrage)", "bool"],
  handLimit: ["Schicksalskarten auf der Hand", "zahl", 1, 6],
  supply: ["Rohstoffe je Sorte im Vorrat", "zahl", 5, 40],
  diceTwoPlayers: ["Würfel zu zweit", "zahl", 3, 6],
  dangerTower: ["Turm-Wachstum je Gefahrenfeld", "zahl", 0, 3],
  siegeTower: ["Turm-Wachstum bei verlorenem Überfall an der Hauptstadt", "zahl", 0, 4],
  siegeAllPay: ["An der Hauptstadt dürfen immer alle zahlen", "bool"],
  rufFame: ["Ruf: Ruhm zusätzlich für den Erbauer", "zahl", 0, 5],
  chronistDist: ["Chronist: Horde höchstens so viele Felder vor der Hauptstadt", "zahl", 1, 5],
  leerTrost: ["Würfel ohne Ertrag: 1 beliebiger Rohstoff", "bool"],
  missingNoTower: ["Fehlt Figur oder Ring: Horde entfällt ohne Turm +1", "bool"],
  bankRate: ["Handel mit dem Vorrat (n : 1)", "zahl", 2, 5],
  capitalRate: ["Handel mit Gebäude an der Hauptstadt (n : 1)", "zahl", 1, 4],
};
