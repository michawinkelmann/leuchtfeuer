// Spielwerte nach REGELN.md v0.4 (6.11.2026). Texte der Karten stehen in texte.js (aus dem Generator erzeugt).

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
  lavendel: { name: "Lavendel", hex: "#ae96d4" },
  lila: { name: "Lila", hex: "#7b4fa0" },          // nur für alte Spielstände (bis 6.11.2026)
};
export const COLOR_ORDER = ["rot", "blau", "gelb", "weiss", "lavendel"];

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

export const PEOPLES = {
  menschen: { name: "Menschen", short: "Reiter: Pferde zählen bei Horden doppelt." },
  elben: { name: "Elben", short: "Weitsicht: für 1 Korn den genommenen Würfel auf ein beliebiges Gelände drehen." },
  zwerge: { name: "Zwerge", short: "Steinmetze: Festung und Leuchtfeuer kosten 1 Stein weniger." },
  halblinge: { name: "Halblinge", short: "Unauffällig: Überfälle verschonen deine Gehöfte. Schleichen: ziehst du die Gefährten aufs Gefahrenfeld, wächst der Turm nicht." },
  kuestenvolk: { name: "Küstenvolk", short: "Legt beim Aufbau 1 Wasser ins Heimatland. Gebäude am Wasser: eigene Ernte +1, Handel 2 : 1." },
};
export const PEOPLE_ORDER = ["menschen", "elben", "zwerge", "halblinge", "kuestenvolk"];

export const HERO_IDS = ["karten", "zauberin", "tueftler", "planerin", "hueterin", "gelehrter", "wegweiserin", "chronist"];
export const FATE_IDS = ["eilbote", "ernte", "bann", "wachfeuer", "handel", "verstaerkung"];

// Regelvarianten: Standard = Regeln v0.4 (6.11.2026, Gesamtprüfung)
export const DEFAULT_VARIANTS = {
  startSegments: 2,       // Turm zu Beginn
  towerMax: 8,            // vollendet: alle verlieren
  hordeStrength: 2,
  hordeStrengthHigh: 3,
  strongFrom: 6,          // ab dieser Turmhöhe Stärke 3 (v0.3: 5)
  hordes: 8,              // Horden im Vorrat
  beacons: 6,
  rufCount: 3,            // so viele brennende Leuchtfeuer lösen den Ruf aus (0 = aus; v0.3: 4)
  rufCountSmall: 3,       // ... bei 2–3 Spielern (Ausgleich dafür, dass Leuchtfeuer nur auf Ecken mit 3 Kacheln stehen)
  randplaetze: false,     // Gebäude am Kartenrand und Leuchtfeuer an Ecken mit weniger als 3 Kacheln (bis 5.11.2026 erlaubt)
  journey: "v03",         // Reisekosten: v03 (Felder 1–3 je 1 Rohstoff) oder v02
  journeyStart: 0,        // Startfeld der Gefährten
  questClock: false,      // Gefährten ziehen von selbst, wenn niemand zahlt
  defenseTie: "v03",      // Gleichstand bei der Abwehr: v03 (der Erste 2 Ruhm + Karte, die anderen 1) oder alle
  payOrder: "v03",        // v03: reihum, nie mehr als nötig; frei: beliebig viel
  hordeTie: "gebaeude",   // gleich kurze Wege: gebaeude (meiste Gebäude) oder start (Startspieler wählt)
  hordeTieRandom: false,  // true: stehen auf keinem der gleich weiten Felder Gebäude, zufällig statt Rückfrage; seit 7.11.2026 wie am Tisch: der Startspieler wählt
  handLimit: 3,
  supply: 15,
  diceTwoPlayers: 4,
  dangerTower: 1,
  siegeTower: 2,
  bankRate: 3,
  capitalRate: 2,
  // neu in v0.4
  minDice: 5,             // mindestens so viele Runenwürfel (2–4 Spieler 5, 5 Spieler 6)
  capitalDefense: 1,      // die Hauptstadt wehrt bei einer Belagerung 1 selbst ab
  dangerCap: true,        // ein Gefahrenfeld vollendet den Turm nie
  catchupStart: true,     // Startspieler wird, wer am wenigsten Ruhm hat
  zwergeOn: ["festung", "leuchtfeuer"],   // Zwerge sparen den Stein nur hier
  elbenCost: 1,           // Elben drehen für 1 Korn
  tueftlerCost: { stein: 1, erz: 1 },     // Tüftler: Burg für 1 Stein + 1 Erz
  zauberinFame: 2,        // Spürzauberin bringt 2 Ruhm
  teamSegment: 1,         // Teamspiel: Turm startet mit 1 Segment mehr
};

export const VARIANT_INFO = {
  startSegments: ["Turmsegmente zu Beginn", "zahl", 0, 7],
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
  siegeTower: ["Turm-Wachstum bei verlorener Belagerung", "zahl", 0, 4],
  bankRate: ["Handel mit dem Vorrat (n : 1)", "zahl", 2, 5],
  capitalRate: ["Handel mit Gebäude an der Hauptstadt (n : 1)", "zahl", 1, 4],
};
