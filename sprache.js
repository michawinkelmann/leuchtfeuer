// Sprache der Oberfläche: Deutsch oder Englisch.
// Wahl: ?lang=de|en in der Adresse, sonst die zuletzt gewählte, sonst die Sprache des Browsers (nur auf der
// öffentlichen Seite, die LF_BROWSER_SPRACHE setzt; der Server bleibt ohne Wahl deutsch).
import * as D from "./shared/data.js";

const SPRACHEN = ["de", "en"];

function ermitteln() {
  const q = new URLSearchParams(location.search).get("lang");
  if (SPRACHEN.includes(q)) {
    try {
      localStorage.setItem("lf_lang", q);
    } catch { /* ohne Speicher */ }
    return q;
  }
  try {
    const s = localStorage.getItem("lf_lang");
    if (SPRACHEN.includes(s)) return s;
  } catch { /* ohne Speicher */ }
  // Die Browser-Sprache zählt nur auf der öffentlichen Seite (pages/index.html); der eigene Server bleibt deutsch
  if (!globalThis.LF_BROWSER_SPRACHE) return "de";
  return (navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
}

export const SPRACHE = ermitteln();

export function setzeSprache(l) {
  const u = new URL(location.href);
  u.searchParams.set("lang", l);
  location.href = u.toString();
}

// ---------------------------------------------------------------- Namen aus data.js
const FARBEN_EN = { rot: "Red", blau: "Blue", gelb: "Yellow", weiss: "White", indigo: "Indigo", lavendel: "Lavender", lila: "Purple" };
const VOELKER_EN = { menschen: "Humans", elben: "Elves", zwerge: "Dwarves", halblinge: "Halflings", kuestenvolk: "Coastfolk", keins: "no people" };

export function farbName(c) {
  return SPRACHE === "en" ? FARBEN_EN[c] || c : D.COLORS[c]?.name || c;
}
export function volkName(p) {
  return SPRACHE === "en" ? VOELKER_EN[p] || D.PEOPLES[p]?.en || p : D.PEOPLES[p]?.name || p;
}
/** Fähigkeit eines Volks in einem Satz (data.PEOPLES), für die Spielerliste */
export function volkFaehigkeit(p) {
  return (SPRACHE === "en" ? D.PEOPLES[p]?.short_en : D.PEOPLES[p]?.short) || "";
}

// ---------------------------------------------------------------- Texte
const TEXTE = {
  de: {
    titel: "Leuchtfeuer",
    untertitel: "Das komplett gedruckte Brettspiel zum Ausprobieren im Browser",
    makerworld: "Druckdateien auf MakerWorld",
    fortsetzen: "Spiel fortsetzen",
    gespeichert: (r, wann) => `Runde ${r}, gespeichert ${wann}`,
    weiterspielen: "Weiterspielen",
    verwerfen: "Verwerfen",
    wirklich: "Das gespeicherte Spiel wirklich verwerfen?",
    neues: "Neues Spiel",
    vorlagen: "Schnell:",
    solo: "Allein gegen 3 Bots",
    hotseat: "4 Menschen an einem Gerät",
    zuschauen: "5 Bots zum Zuschauen",
    erklaerVorlage: "Bots zusehen und erklären lassen",
    erklaeren: "Züge erklären",
    erklaerenTitel: "Zu jedem Schritt steht im Spiel, was genau passiert und warum nach den Regeln.",
    schritt: "Schritt für Schritt",
    schrittTitel: "Bots ziehen erst nach einem Klick auf „Weiter“. Menschen spielen wie gewohnt.",
    plaetze: "Plätze",
    tempo: "Bot-Tempo",
    sofort: "sofort", schnell: "schnell", normal: "normal", langsam: "langsam",
    name: "Name", farbe: "Farbe", volk: "Volk", wer: "Spielt",
    zufaellig: "zufällig", mensch: "Mensch", bot: "Bot", ich: "Ich", spieler: "Spieler", ohneVolk: "ohne Volk",
    beginnt: "Der erste Platz beginnt. Helden werden gezogen wie im Spiel.",
    team: "Teamspiel (je 2 Personen pro Farbe, 2–4 Farben)",
    teamTitel: "Je zwei spielen zusammen eine Farbe, abwechselnd jede Runde; jede Person zieht 1 Helden, beide gehören der Farbe. Der Turm startet mit 1 Segment mehr.",
    erste: "Erste Partie (ohne Völker, Turm 1 Segment niedriger)",
    ersteTitel: "Für Einsteiger: ohne Völker, die Helden sind dabei, und der Turm startet mit 1 Segment weniger.",
    person2: "2. Person",
    teamZuGross: "Teamspiel geht mit 2 bis 4 Farben.",
    starten: "Spiel starten",
    farbedoppelt: "Jede Farbe nur einmal, bitte.",
    volkdoppelt: "Jedes Volk nur einmal, bitte (oder „zufällig“ oder „ohne Volk“).",
    sogehts: "So geht's",
    hilfe: [
      "Alle Menschen-Plätze spielen abwechselnd an diesem Gerät (Hot-Seat). Bots ziehen von selbst.",
      "Auf dem Brett: Ziehen dreht die Ansicht, Mausrad zoomt, rechte Maustaste verschiebt. Grün markierte Stellen sind anklickbar.",
      "Das Spiel wird im Browser gespeichert und lässt sich später fortsetzen.",
      "Neu im Spiel? „Bots zusehen und erklären lassen“: Vier Bots spielen, du klickst Schritt für Schritt weiter, und zu jedem Zug steht da, was passiert und warum.",
      "Die Regeln stehen auf den Regeltafeln im Deckel der Spielbox, hier zum Nachlesen: <a href=\"regeln.html\" target=\"_blank\">Kurzregeln</a>. Im Spiel hilft „Tipp vom Bot“.",
    ],
  },
  en: {
    titel: "Beacons",
    untertitel: "The fully 3D-printed board game – try it in your browser",
    makerworld: "Print files on MakerWorld",
    fortsetzen: "Continue game",
    gespeichert: (r, wann) => `Round ${r}, saved ${wann}`,
    weiterspielen: "Continue",
    verwerfen: "Discard",
    wirklich: "Really discard the saved game?",
    neues: "New game",
    vorlagen: "Quick start:",
    solo: "Me against 3 bots",
    hotseat: "4 people on one device",
    zuschauen: "Watch 5 bots",
    erklaerVorlage: "Watch bots with explanations",
    erklaeren: "Explain moves",
    erklaerenTitel: "For every step, the game says exactly what happens and why, according to the rules.",
    schritt: "Step by step",
    schrittTitel: "Bots only move after you click “Next”. Humans play as usual.",
    plaetze: "Seats",
    tempo: "Bot speed",
    sofort: "instant", schnell: "fast", normal: "normal", langsam: "slow",
    name: "Name", farbe: "Color", volk: "People", wer: "Played by",
    zufaellig: "random", mensch: "Human", bot: "Bot", ich: "Me", spieler: "Player", ohneVolk: "no people",
    beginnt: "The first seat starts. Heroes are drawn as in the board game.",
    team: "Team game (2 people per color, 2–4 colors)",
    teamTitel: "Two people share a color and take its turn alternately, every round the other one; each person draws 1 hero, both belong to the color. The tower starts 1 segment higher.",
    erste: "First game (no peoples, tower 1 segment lower)",
    ersteTitel: "For beginners: no peoples, heroes are in, and the tower starts 1 segment lower.",
    person2: "2nd person",
    teamZuGross: "The team game works with 2 to 4 colors.",
    starten: "Start game",
    farbedoppelt: "Each color only once, please.",
    volkdoppelt: "Each people only once, please (or “random” or “no people”).",
    sogehts: "How to play",
    hilfe: [
      "All human seats take turns on this device (hot seat). Bots move on their own.",
      "On the board: drag to rotate, scroll to zoom, right mouse button to pan. Spots marked in green can be clicked.",
      "The game is saved in your browser and can be continued later.",
      "New to the game? “Watch bots with explanations”: four bots play, you click through step by step, and every move comes with what happens and why.",
      "The rules are printed on the rule boards in the lid of the box; read them here: <a href=\"rules.html\" target=\"_blank\">quick rules</a>. In the game, “Hint from the bot” helps.",
    ],
  },
};

// t("schlüssel", ...werte): Text in der gewählten Sprache; fehlt er auf Englisch, der deutsche
export function t(key, ...args) {
  const v = TEXTE[SPRACHE][key] ?? TEXTE.de[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
}

// Weitere Texte (Spielansicht) hängen sich hier an: ergaenze({ de: {...}, en: {...} })
export function ergaenze(texte) {
  for (const l of SPRACHEN) Object.assign(TEXTE[l], texte[l] || {});
}
