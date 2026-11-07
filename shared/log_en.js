// Englische Oberfläche: Verlauf, Fehlermeldungen und Spielende der Engine übersetzen.
// Die Engine schreibt weiter deutsch (sie ist auch Grundlage der Simulation); hier wird jede Zeile
// über eine Mustertabelle (Regex → englischer Satz) übersetzt. Nicht erkannte Zeilen bleiben deutsch.
// Spielernamen sind frei gewählt und bleiben, wie sie sind. Begriffe nach GLOSSAR_EN.md.
import * as D from "./data.js";
import { GATE_NAMES } from "./board.js";

// ---------------------------------------------------------------- Namen
export const TERRAIN_EN = {
  wald: "forest", feld: "fields", weide: "pasture", huegel: "hills", gebirge: "mountains", wasser: "water", ruine: "ruin",
  hauptstadt: "capital", tor: "North Gate", turm_tor: "Tower Gate", feuerberg: "South Gate",
};
export const GATE_EN = { "6,1": "North Gate", "6,3": "South Gate", "6,2": "Tower Gate" };
export const RES_EN = { holz: "wood", stein: "stone", erz: "ore", korn: "grain", pferde: "horses" };
export const LEVEL_EN = { 1: "farm", 2: "castle", 3: "fortress" };
// Schlüssel von seat.fameBy (Ruhm nach Herkunft, beim Spielende)
export const FAME_EN = { leuchtfeuer: "beacons", abwehr: "defense", horden: "hordes", ruine: "ruins", reise: "journey", held: "heroes" };

export function resEn(r, n) {
  if (r === "pferde" && Number(n) === 1) return "horse";
  return RES_EN[r] || r;
}
const pl = (n, eins, mehr) => (Number(n) === 1 ? eins : mehr);

// deutsche Anzeigenamen → Schlüssel
const umkehren = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const TER_DE = umkehren(D.TERRAIN_NAME);
const RES_DE = umkehren(D.RES_NAME);
const LVL_DE = umkehren(D.LEVEL_NAME);
const GATE_DE = umkehren(GATE_NAMES);

function ter(g) {                      // „Wald“ → „forest“, auch „Auge“ und „Nebel“
  if (g === "Auge") return "Eye";
  if (g === "Nebel") return "mist";
  return TER_DE[g] ? TERRAIN_EN[TER_DE[g]] : null;
}
const res = (g, n) => (RES_DE[g] ? resEn(RES_DE[g], n) : null);
const lvl = (g) => (LVL_DE[g] ? LEVEL_EN[LVL_DE[g]] : null);
const gate = (g) => (GATE_DE[g] ? GATE_EN[GATE_DE[g]] : null);
function liste(g, trenner) {           // „Wald, Acker, Auge“ → „forest, fields, Eye“
  const teile = g.split(trenner).map(ter);
  if (teile.some((x) => !x)) return null;
  return teile.length > 1 && trenner === " und " ? `${teile.slice(0, -1).join(", ")} and ${teile.at(-1)}` : teile.join(", ");
}
function kosten(g) {                  // „1 Stein und 1 Erz“ → „1 stone and 1 ore“
  const teile = g.split(" und ").map((x) => /^(\d+) (\S+)$/.exec(x)).map((m) => m && res(m[2], m[1]) && `${m[1]} ${res(m[2], m[1])}`);
  if (teile.some((x) => !x)) return null;
  return teile.length > 1 ? `${teile.slice(0, -1).join(", ")} and ${teile.at(-1)}` : teile[0];
}
function wo(g) {                       // Kampfort aus der Engine
  let m = /^Belagerung der Hauptstadt \((\d+) Horden?\)$/.exec(g);
  if (m) return `Siege of the capital (${m[1]} ${pl(m[1], "horde", "hordes")})`;
  m = /^Überfall auf (.+) \((\d+) Horden?\)$/.exec(g);
  if (m && ter(m[1])) return `Raid on the ${ter(m[1])} (${m[2]} ${pl(m[2], "horde", "hordes")})`;
  return null;
}
const GRUND = {                        // Turmwachstum
  "keine Horde mehr im Vorrat": "no horde left in the supply", "Tor besetzt": "gate occupied", "Horden vereint": "hordes merged",
  "Belagerung verloren": "siege lost", "Überfall verloren": "raid lost", "Gefahrenfeld": "danger space",
};
function ende(g) {                     // Grund für das Spielende (s.over.reason)
  if (g === "Der Turm des Schattens ist vollendet.") return "The Tower of Shadow is complete.";
  if (g === "Die Gefährten haben den Feuerberg erreicht.") return "The Companions have reached the Fire Mountain.";
  const m = /^Abbruch nach (\d+) Runden\.$/.exec(g);
  return m ? `Stopped after ${m[1]} rounds.` : null;
}

// ---------------------------------------------------------------- feste Texte (Fehler und Verlauf)
const FEST = {
  // Verlauf
  "Das Heimatland ist ausgelegt, der Nebel liegt noch über dem Osten.": "The homeland is laid out; mist still covers the east.",
  "Ein Leuchtfeuer erlischt.": "A beacon goes out.",
  "Die Halblinge schleichen vorbei: Der Turm wächst nicht.": "The Halflings sneak past: the tower does not grow.",
  "Gefahrenfeld: Der Turm wächst nicht über die letzte Stufe.": "Danger space: the tower does not grow past its last level.",
  "Die Gefährten erreichen den Feuerberg! Die Runde wird zu Ende gespielt.": "The Companions reach the Fire Mountain! The round is played to the end.",
  // Fehler der Engine
  "2 bis 5 Plätze": "2 to 5 seats",
  "Endlosschleife im Ablauf": "Endless loop in the game flow",
  "Die Gefährten sind schon am Feuerberg": "The Companions are already at the Fire Mountain",
  "So viel hast du nicht": "You don't have that much",
  "Keine Verstärkung auf der Hand": "No Allies card in your hand",
  "Du hast schon einen Würfel": "You already have a die",
  "Diesen Würfel gibt es nicht": "That die doesn't exist",
  "Nur Elben dürfen den Würfel drehen": "Only Elves may turn the die",
  "Nur auf ein Gelände drehen": "You can only turn it to a terrain",
  "Drehen kostet 2 Korn": "Turning costs 2 grain",
  "Du hast schon geerntet": "You have already harvested",
  "Es liegen noch Würfel": "There are still dice left",
  "Unbekannter Rohstoff": "Unknown resource",
  "Keine Gehöfte mehr": "No farms left",
  "Hier darfst du nicht bauen": "You can't build here",
  "Zu wenig Rohstoffe": "Not enough resources",
  "Hier geht kein Ausbau": "No upgrade possible here",
  "Hier darf kein Leuchtfeuer stehen": "No beacon allowed here",
  "Dieses Leuchtfeuer brennt schon": "This beacon is already lit",
  "Es fehlt Holz": "You need wood",
  "Die Gefährten sind diese Runde schon gezogen": "The Companions have already moved this round",
  "Die Reise ist zu Ende": "The journey is over",
  "Hier ist keine Horde an deinen Gebäuden": "There is no horde at your buildings here",
  "Ungültiger Tausch": "Invalid trade",
  "Jedes Volk gibt es nur einmal": "Each people can be chosen only once",
  "Der Vorrat ist leer": "The supply is empty",
  "Ungültiger Handelspartner": "Invalid trading partner",
  "Leeres Angebot": "Empty offer",
  "Das hast du nicht": "You don't have that",
  "Diese Karte hast du nicht": "You don't have this card",
  "Du hast diese Runde keinen Würfel genommen": "You haven't taken a die this round",
  "Diese Horde gibt es nicht": "That horde doesn't exist",
  "Kein Leuchtfeuer ist erloschen": "No beacon is out",
  "Kein Tausch angegeben": "No trade given",
  "Diese Karte wirkt nur bei einem Kampf": "This card only works in a fight",
  "Diesen Helden hast du nicht (mehr)": "You don't have this hero (anymore)",
  "Wähle ein eigenes Gehöft": "Choose one of your own farms",
  "Zu wenig": "Not enough",
  "Nicht auf Feld 10": "Not onto space 10",
  "Dieser Held wirkt zu einem anderen Zeitpunkt": "This hero is used at a different time",
  "Nimm zuerst einen Würfel (oder einen Rohstoff)": "Take a die (or a resource) first",
  "Nur auf oder neben der Hauptstadt": "Only on or next to the capital",
  "Wähle einen der beiden Helden": "Choose one of the two heroes",
  "Wähle einen freien Heimatland-Platz": "Choose a free homeland space",
  "Nur auf freie Kanten im Heimatland": "Only on free edges in the homeland",
  "Nicht möglich": "Not possible",
  "Ungültiger Würfel": "Invalid die",
  "Unbekannte Antwort": "Unknown answer",
  "Wähle Würfel": "Choose dice",
  "Wähle eines der markierten Felder": "Choose one of the marked hexes",
  "Wähle einen Rohstoff": "Choose a resource",
  "Behalte 2 Karten": "Keep 2 cards",
  "Ungültige Karte": "Invalid card",
  "Dafür fehlen dir Rohstoffe": "You don't have the resources for that",
  "Das Angebot ist nicht mehr gedeckt": "The offer can no longer be covered",
  "Das Spiel ist vorbei": "The game is over",
  "Gerade ist nichts zu entscheiden": "There is nothing to decide right now",
  "Unbekannte Aktion": "Unknown action",
  "Unbekannte Entscheidung": "Unknown decision",
  // Server (server/index.js) und Browser-Fassung (pages/lokal.js)
  "Spiel nicht gefunden": "Game not found",
  "Erst einem Spiel beitreten": "Join a game first",
  "Diesen Platz gibt es nicht": "That seat doesn't exist",
  "Dieser Platz gehört einem Bot": "This seat belongs to a bot",
  "Platz ist schon vergeben": "Seat is already taken",
  "Das ist nicht dein Platz": "That's not your seat",
  "Diesen Platz spielt ein Bot": "A bot plays this seat",
};

// ---------------------------------------------------------------- Muster: [Regex, (…Gruppen) => englisch | null]
// Gibt eine Funktion null zurück, passt die Zeile doch nicht (z. B. unbekanntes Gelände), und das nächste Muster ist dran.
// Reihenfolge: speziellere Muster vor allgemeinen („nimmt 1 Holz aus dem Vorrat“ vor „nimmt Wald“).
const N = "(.+?)";                     // Spielername (frei gewählt)
const re = (s) => new RegExp(`^${s}$`);
export const MUSTER = [
  // Spielbeginn und Runde
  [re(`Neues Spiel mit (\\d+) Plätzen \\(Startwert (.+)\\)\\.`), (n, seed) => `New game with ${n} seats (seed ${seed}).`],
  [re(`Runde (\\d+): ${N} würfelt (.+)\\.`), (r, a, l) => liste(l, ", ") && `Round ${r}: ${a} rolls ${liste(l, ", ")}.`],
  [re(`Gemeinsame Ernte: (.+)\\.`), (l) => liste(l, ", ") && `Shared harvest: ${liste(l, ", ")}.`],
  [re(`Das Küstenvolk \\((.+)\\) legt sein Wasser ins Heimatland\\.`), (a) => `The Coastfolk (${a}) place their water in the homeland.`],
  [re(`${N} setzt ein Start-Gehöft\\.`), (a) => `${a} places a starting farm.`],
  // Ernte und Würfel
  [re(`${N} erntet (\\d+) (\\S+)( \\(Vorrat reicht nicht\\))?\\.`),
    (a, k, r, x) => res(r, k) && `${a} harvests ${k} ${res(r, k)}${x ? " (not enough left in the supply)" : ""}.`],
  [re(`${N} dreht den Würfel für (\\d+) Korn auf (.+)\\.`), (a, n, f) => ter(f) && `${a} turns the die to ${ter(f)} for ${n} grain.`],
  [re(`${N} nimmt 1 (\\S+) aus dem Vorrat\\.`), (a, r) => res(r, 1) && `${a} takes 1 ${res(r, 1)} from the supply.`],
  [re(`${N} nimmt das Handelsangebot von (.+) an\\.`), (a, b) => `${a} accepts the trade offer from ${b}.`],
  [re(`${N} nutzt die Planerin und nimmt (.+)\\.`), (a, l) => liste(l, " und ") && `${a} uses the Planner and takes ${liste(l, " und ")}.`],
  [re(`${N} nimmt (.+)\\.`), (a, f) => ter(f) && `${a} takes the ${ter(f)} die.`],
  [re(`${N} ruft die Spürzauberin und dreht (\\d+) Würfel\\.`), (a, n) => `${a} calls the Diviner and turns ${n} ${pl(n, "die", "dice")}.`],
  [re(`${N}: Pax vobiscum! (\\d+) Augen zählen nicht \\(\\+(\\d+) Ruhm\\)\\.`),
    (a, n, f) => `${a}: Pax vobiscum! ${n} ${pl(n, "Eye does", "Eyes do")} not count (+${f} fame).`],
  // Turm, Auge, Horden
  [re(`Der Turm wächst um (\\d+) auf (\\d+) \\((.+)\\)\\.`), (n, t, w) => GRUND[w] && `The tower grows by ${n} to ${t} (${GRUND[w]}).`],
  [re(`Das Auge blickt zum (.+), aber keine Horde ist mehr im Vorrat\\.`), (g) => gate(g) && `The Eye turns to the ${gate(g)}, but no horde is left in the supply.`],
  [re(`Das Auge blickt zum (.+): Dort erscheint eine Ork-Horde\\.`), (g) => gate(g) && `The Eye turns to the ${gate(g)}: an orc horde appears there.`],
  [re(`Ruf der Leuchtfeuer! (\\d+) Horden vernichtet, der Turm verliert ein Segment \\((\\d+)\\)\\. (.+) erhält (\\d+) Ruhm\\.`),
    (n, t, a, f) => `Call of the Beacons! ${n} ${pl(n, "horde", "hordes")} destroyed, the tower loses a segment (${t}). ${a} gains ${f} fame.`],
  [re(`Die Verbündeten kommen: (\\d+) Horden vernichtet, Turm (\\d+)\\.`),
    (n, t) => `The allies arrive: ${n} ${pl(n, "horde", "hordes")} destroyed, tower ${t}.`],
  // Kämpfe
  [re(`${N} abgewehrt: Burgen und Festungen reichen(?:, je 1 Ruhm für (.+))?\\.`),
    (w, wer) => wo(w) && `${wo(w)} repelled: castles and fortresses are enough${wer ? `, 1 fame each for ${wer}` : ""}.`],
  [re(`${N} abgewehrt \\((\\d+) gegen (\\d+)\\)\\. (.+): 2 Ruhm und eine Schicksalskarte\\.`),
    (w, a, b, wer) => wo(w) && `${wo(w)} repelled (${a} vs. ${b}). ${wer}: 2 fame and a fate card.`],
  [re(`${N}: Abwehr gescheitert \\((\\d+) gegen (\\d+)\\)\\.`), (w, a, b) => wo(w) && `${wo(w)}: defense failed (${a} vs. ${b}).`],
  [re(`${N} gescheitert \\((\\d+) gegen (\\d+)\\)\\.`), (w, a, b) => wo(w) && `${wo(w)}: defense failed (${a} vs. ${b}).`],   // bis 7.11.2026
  [re(`Ein Gehöft von (.+) wird zerstört\\.`), (a) => `${a} loses a farm.`],
  [re(`(\\S+) von (.+) wird zu (\\S+)\\.`), (l1, a, l2) => lvl(l1) && lvl(l2) && `${a}'s ${lvl(l1)} is reduced to a ${lvl(l2)}.`],
  [re(`${N} zahlt (\\d+) Abwehr\\.`), (a, n) => `${a} pays ${n} defense.`],
  [re(`${N} wagt einen Ausfall und vernichtet die Horde \\(\\+(\\d+) Ruhm\\)\\.`), (a, f) => `${a} makes a sally and destroys the horde (+${f} fame).`],
  // Reise
  [re(`${N} führt die Gefährten auf Feld (\\d+) \\(\\+(\\d+) Ruhm\\)\\.`), (a, j, f) => `${a} leads the Companions to space ${j} (+${f} fame).`],
  [re(`Niemand hat die Gefährten unterstützt: Sie ziehen allein auf Feld (\\d+)\\.`), (j) => `Nobody supported the Companions: they move on alone to space ${j}.`],
  // Bauen, Erkunden, Handeln
  [re(`${N} erkundet den Nebel: (.+?)( mit Schatz)?\\.`), (a, f, x) => ter(f) && `${a} explores the mist: ${ter(f)}${x ? " with a treasure" : ""}.`],
  [re(`${N} baut ein Gehöft\\.`), (a) => `${a} builds a farm.`],
  [re(`${N} baut eine (\\S+)\\.`), (a, l) => lvl(l) && `${a} builds a ${lvl(l)}.`],
  [re(`${N} baut ein Leuchtfeuer \\(\\+(\\d+) Ruhm\\)\\.`), (a, f) => `${a} builds a beacon (+${f} fame).`],
  [re(`${N} entzündet ein Leuchtfeuer neu\\.`), (a) => `${a} relights a beacon.`],
  [re(`${N} tauscht (\\d+) (\\S+) gegen 1 (\\S+)\\.`), (a, n, g, b) => res(g, n) && res(b, 1) && `${a} trades ${n} ${res(g, n)} for 1 ${res(b, 1)}.`],
  [re(`${N} hebt den Schatz: 1 (\\S+)\\.`), (a, r) => res(r, 1) && `${a} digs up the treasure: 1 ${res(r, 1)}.`],
  [re(`${N} lehnt das Angebot von (.+) ab\\.`), (a, b) => `${a} declines the offer from ${b}.`],
  [re(`${N} beendet den Zug\\.`), (a) => `${a} ends the turn.`],
  // Schicksalskarten
  [re(`${N} spielt den Eilboten\\.`), (a) => `${a} plays Messenger.`],
  [re(`${N} spielt Reiche Ernte\\.`), (a) => `${a} plays Rich Harvest.`],
  [re(`${N} spielt den Bannspruch: Eine Horde muss zurück aufs Turm-Tor\\.`), (a) => `${a} plays Banishment: a horde must return to the Tower Gate.`],
  [re(`${N} spielt Wachfeuer: (\\d+) Leuchtfeuer brennen wieder\\.`), (a, n) => `${a} plays Watchfire: ${n} ${pl(n, "beacon is", "beacons are")} lit again.`],
  [re(`${N} spielt den Handelszug \\((\\d+)-mal 1 : 1\\)\\.`), (a, n) => `${a} plays Caravan (1 for 1, ${n} ${pl(n, "time", "times")}).`],
  // Helden
  [re(`${N} nutzt den Meister der Karten\\.`), (a) => `${a} uses the Master of Cards.`],
  [re(`${N} baut mit dem Tüftler eine Burg ohne Kosten\\.`), (a) => `${a} uses the Tinkerer to build a castle at no cost.`],
  [re(`${N} baut mit dem Tüftler eine Burg für (.+)\\.`), (a, k) => kosten(k) && `${a} uses the Tinkerer to build a castle for ${kosten(k)}.`],
  [re(`${N} nutzt die Wegweiserin\\.`), (a) => `${a} uses the Pathfinder.`],
  [re(`${N} ruft die Hüterin der Natur: Eine Horde kehrt ohne Kampf aufs Turm-Tor zurück \\(\\+(\\d+) Ruhm\\)\\.`),
    (a, f) => `${a} calls the Warden of Nature: a horde returns to the Tower Gate without a fight (+${f} fame).`],
  [re(`${N} ruft den Chronisten: Eine Horde zieht ab \\(\\+(\\d+) Ruhm\\)\\.`), (a, f) => `${a} calls the Chronicler: a horde withdraws (+${f} fame).`],
  // Spielende: Grund + Ergebnis
  [re(`(.+\\.) Alle haben verloren\\.`), (g) => ende(g) && `${ende(g)} Everyone loses.`],
  [re(`(.+\\.) Es gewinnt (.+) mit (\\d+) Ruhm\\.`), (g, a, n) => ende(g) && `${ende(g)} ${a} wins with ${n} fame.`],
  [re(`(.+\\.) Es gewinnen (.+) gemeinsam mit (\\d+) Ruhm\\.`),            // „A, B und C“ → „A, B and C“
    (g, a, n) => ende(g) && `${ende(g)} ${a.replace(/^(.*) und /, "$1 and ")} share the win with ${n} fame.`],
  [re(`(.+)`), (g) => ende(g)],
  // Plätze (Server und Browser-Fassung)
  [re(`(.+) wird von einem Bot gespielt\\.`), (a) => `${a} is now played by a bot.`],
  [re(`(.+) wird von einem Menschen gespielt\\.`), (a) => `${a} is now played by a human.`],
  // Fehler mit Werten
  [re(`Zu wenig Abwehr \\((\\d+) von (\\d+)\\)`), (a, b) => `Not enough defense (${a} of ${b})`],
  [re(`Du brauchst (\\d+) (\\S+)`), (n, r) => res(r, n) && `You need ${n} ${res(r, n)}`],
  [re(`Im Vorrat ist nicht genug (\\S+)`), (r) => res(r, 2) && `Not enough ${res(r, 2)} in the supply`],
  [re(`Höchstens (\\d+) Abwehr nötig`), (n) => `At most ${n} defense needed`],
  [re(`Lege (\\d+) Karte\\(n\\) ab`), (n) => `Discard ${n} ${pl(n, "card", "cards")}`],
  [re(`(.+) ist dran`), (a) => `It's ${a}'s turn`],
  [re(`Drehen kostet (\\d+) Korn`), (n) => `Turning costs ${n} grain`],
  [re(`Bot-Fehler: (.+)`), (e) => `Bot error: ${logEn(e)}`],
  [re(`Bot hängt \\((\\w+)\\): (.+)`), (typ, e) => `Bot stuck (${typ}): ${e.split(" / ").map(logEn).join(" / ")}`],
];

/** Deutsche Zeile der Engine (Verlauf, Fehler, Spielende) → englisch; Unbekanntes bleibt, wie es ist. */
export function logEn(msg) {
  if (typeof msg !== "string" || !msg) return msg;
  if (FEST[msg]) return FEST[msg];
  for (const [r, f] of MUSTER) {
    const m = r.exec(msg);
    if (!m) continue;
    const out = f(...m.slice(1));
    if (out) return out;
  }
  return msg;
}
