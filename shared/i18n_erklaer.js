// Erklärmodus: macht aus den strukturierten Erklärungen der Engine Sätze auf Deutsch oder Englisch.
// Die Engine legt sie als {r, seat, v, erkl: {k, …}} in den Verlauf (siehe engine.js, „Erklärungen“); seat ist, wer
// handelt (oder null), die Zahlen stehen in erkl. Gelände wird als Art gespeichert (null = Nebel ohne Kachel), damit
// alte Zeilen auch dann stimmen, wenn das Feld später erkundet wird.
// Rein, ohne Browser: läuft auch in Node (Prüfskript). Sprache am Tisch wie REGELN_KURZ.md, englische Begriffe nach
// GLOSSAR_EN.md (Kartenfeld = hex, Feld der Reise-Leiste = space, Nebel = mist). Der Dateiname beginnt mit „i18n“,
// damit pages_bauen.mjs ihn in die Browser-Fassung kopiert.
import * as D from "./data.js";
import { TERRAIN_EN, GATE_EN, resEn } from "./log_en.js";

const TURM_TOR = "6,2";
const gross = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

// ---------------------------------------------------------------- Deutsch: Wörter
const TER_DE = { ...D.TERRAIN_NAME, feuerberg: "Süd-Tor" };       // Tore wie auf den Regeltafeln: Nord-, Turm-, Süd-Tor
const TOR_DE = { "6,1": "Nord-Tor", "6,3": "Süd-Tor", "6,2": "Turm-Tor" };
const GENUS = { wald: "m", feld: "m", weide: "f", huegel: "m", gebirge: "n", wasser: "n", ruine: "f", hauptstadt: "f",
  tor: "n", turm_tor: "n", feuerberg: "n", nebel: "n" };
const ARTIKEL = { nom: { m: "der", f: "die", n: "das" }, akk: { m: "den", f: "die", n: "das" }, dat: { m: "dem", f: "der", n: "dem" } };
const EIN_NOM = { wald: "ein Wald", feld: "ein Acker", weide: "eine Weide", huegel: "ein Hügel", gebirge: "ein Gebirge",
  wasser: "Wasser", ruine: "die Ruine" };
const RI_DE = ["Osten", "Nordosten", "Norden", "Nordwesten", "Westen", "Südwesten", "Süden", "Südosten"];
// Verlust einer Stufe: Artikel und „zum/zur“ der nächsten Stufe
const STUFE_DE = { 1: "das Gehöft", 2: "die Burg", 3: "die Festung" };
const ZU_DE = { 1: "zum Gehöft", 2: "zur Burg" };
const EIN_AKK = { wald: "einen Wald", feld: "einen Acker", weide: "eine Weide", huegel: "einen Hügel", gebirge: "ein Gebirge" };

// Helden: Akkusativ und was die Karte kann (wie auf den Heldenkarten, v0.5)
const HELD_DE = {
  karten: ["den Meister der Karten", "zieht 3 Schicksalskarten und behält 2, +1 Ruhm"],
  zauberin: ["die Spürzauberin", "dreht sofort nach dem Runenwurf bis zu 2 Würfel frei, +2 Ruhm"],
  tueftler: ["den Tüftler", "baut eine Burg auf ein eigenes Gehöft für 1 Stein und 1 Erz"],
  planerin: ["die Planerin", "nimmt im eigenen Zug 2 Würfel statt 1 und erntet beide (nur, wenn noch 2 liegen)"],
  hueterin: ["die Hüterin der Natur", "schickt eine Horde (Figur oder Ring) zurück aufs Turm-Tor, +1 Ruhm"],
  gelehrter: ["den Gelehrten", "„Pax vobiscum“: Die Augen eines Runenwurfs zählen nicht, +2 Ruhm"],
  wegweiserin: ["die Wegweiserin", "führt die Gefährten als Reise der Runde 1 Feld weiter, ohne Kosten und ohne Turm +1, mit Ruhm, nicht auf Feld 10"],
  chronist: ["den Chronisten", "schickt eine Horde, die höchstens 3 Felder vor der Hauptstadt steht, in den Vorrat, +1 Ruhm"],
};
const heldDe = (id) => (HELD_DE[id] ? `${HELD_DE[id][0]} (${HELD_DE[id][1]})` : id);
// Kacheln gezählt: „2 Äcker“
const KACHEL_DE = { wald: ["Wald", "Wälder"], feld: ["Acker", "Äcker"], weide: ["Weide", "Weiden"], huegel: ["Hügel", "Hügel"],
  gebirge: ["Gebirge", "Gebirge"], wasser: ["Wasser", "Wasser"], ruine: ["Ruine", "Ruinen"] };
const ARTEN_REIHE = ["wald", "feld", "weide", "huegel", "gebirge", "wasser", "ruine"];

function listeDe(a) {
  a = a.filter((x) => x !== "" && x != null);
  return a.length <= 1 ? a[0] ?? "" : `${a.slice(0, -1).join(", ")} und ${a.at(-1)}`;
}
const resDe = (r, n) => (r === "pferde" && Number(n) === 1 ? "Pferd" : D.RES_NAME[r] ?? "");

function hilfenDe(s) {
  const h = {
    name: (i) => s.seats?.[i]?.name ?? "?",
    liste: listeDe,
    ter: (k) => (k ? TER_DE[k] ?? k : "Nebel"),
    feld: (k) => (k ? TER_DE[k] ?? k : "Nebel-Feld"),
    tor: (g) => TOR_DE[g] ?? g,
    wuerfel: (f) => (f === "auge" ? "Auge" : TER_DE[f] ?? f),
    lvl: (n) => D.LEVEL_NAME[n] ?? "",
    res: resDe,
    kosten: (o) => listeDe(Object.entries(o || {}).filter(([, n]) => n > 0).map(([r, n]) => `${n} ${resDe(r, n)}`)),
    // Feld mit Artikel: art(k, "dat") → „dem Wald“, „der Weide“, „dem Nebel-Feld“
    art: (k, kasus) => `${ARTIKEL[kasus][GENUS[k || "nebel"]] ?? "dem"} ${h.feld(k)}`,
    aufDat: (k) => `auf ${h.art(k, "dat")}`,
    aufAkk: (k) => (k ? `auf ${h.art(k, "akk")}` : "auf ein Nebel-Feld"),
    von: (k) => { const a = h.art(k, "dat"); return a.startsWith("dem ") ? `vom ${a.slice(4)}` : `von ${a}`; },
    // Ort einer Kante: „zwischen Wald und Acker“
    ort: (fs) => (fs.length >= 2 ? `zwischen ${h.ter(fs[0])} und ${h.ter(fs[1])}` : `am Kartenrand ${h.aufDat(fs[0])}`),
    ecke: (fs) => `an der Ecke von ${listeDe(fs.map(h.ter))}`,
    brennt: (n) => (n === 0 ? "brennt kein Leuchtfeuer" : n === 1 ? "brennt 1 Leuchtfeuer" : `brennen ${n} Leuchtfeuer`),
    horden: (n) => (n === 1 ? "1 Horde" : `${n} Horden`),
    // Einsatz im Kampf als Satzteil: „zahlt 2 Erz und spielt die Verstärkung (+3)“
    einsatz: (e) => {
      const t = [];
      if (e.erz) t.push(`${e.erz} Erz`);
      if (e.pferde) t.push(`${e.pferde} ${resDe("pferde", e.pferde)}${e.hv === 2 ? " (als Menschen bringt jedes Pferd 2 Abwehr)" : ""}`);
      const z = listeDe(t);
      return z && e.verst ? `zahlt ${z} und spielt die Verstärkung (+3)` : z ? `zahlt ${z}` : e.verst ? "spielt die Verstärkung (+3)" : "zahlt nichts";
    },
    gebaeude: (n, art) => (art === 2 ? (n === 1 ? "1 Burg (1)" : `${n} Burgen (je 1)`) : n === 1 ? "1 Festung (2)" : `${n} Festungen (je 2)`),
    ruf: (e) => (e.ruf && e.brennen < e.ruf ? ` Brennen ${e.ruf} zugleich, erklingt einmal im Spiel der Ruf der Leuchtfeuer.` : ""),
    hat: (volk) => (s.seats || []).some((x) => x.people === volk),
  };
  return h;
}

// ---------------------------------------------------------------- Deutsch: Erklärungen je Art
const DE = {
  aufbau(e, A, c) {
    const zu = { 2: "zu zweit", 3: "zu dritt", 4: "zu viert", 5: "zu fünft" }[e.n] || `mit ${e.n} Plätzen`;
    const held = { zwei: "Jeder zieht 2 Helden und behält 1, der andere kommt aus dem Spiel", eins: "Zu fünft zieht jeder nur 1 Helden",
      team: "Im Teamspiel zieht jede Person 1 Helden, beide gehören der Farbe", fest: "Jeder spielt mit seinem festen Helden" }[e.helden]
      || "Jeder bekommt einen Helden";
    let turm = `Gegner ist der Turm des Schattens: Er beginnt mit ${e.turm} Segmenten, bei ${e.max} ist er vollendet und alle verlieren. `
      + `Er steht also von Anfang an halb fertig da, als sichtbare Drohung: Bis zum Ende fehlen nur ${e.max - e.turm}. `
      + (e.entfaellt ? "Er wächst, wenn ein Überfall verloren geht "
        : "Er wächst, wenn ein Überfall verloren geht, wenn für ein Auge die nötige Horde oder der Ring nicht mehr im Vorrat ist ")
      + "und wenn die Gefährten ein Feld mit Auge der Reise-Leiste betreten; einmal im Spiel nimmt ihm der Ruf der Leuchtfeuer 1 Segment. ";
    if (e.klein != null && e.gross != null && e.klein !== e.gross) {
      turm += `Zu zweit und zu dritt beginnt er mit ${e.klein}, zu viert und zu fünft mit ${e.gross}: Mit mehr Spielern kommen mehr Rohstoffe `
        + "gegen die Horden zusammen, so bleibt es ähnlich knapp. ";
    }
    if (e.teamPlus) turm += `Im Teamspiel kommt ${e.teamPlus === 1 ? "1 Segment" : `${e.teamPlus} Segmente`} dazu (jede Farbe zählt als ein Spieler). `;
    if (e.ersteMinus) turm += `In der ersten Partie beginnt er mit ${e.ersteMinus === 1 ? "1 Segment" : `${e.ersteMinus} Segmenten`} weniger. `;
    const neu = (e.team ? `Neues Teamspiel mit ${e.n} Farben, je zwei Personen spielen zusammen` : `Neues Spiel ${zu}`)
      + (e.ersteMinus ? " (erste Partie)" : "");
    const ziel = e.sieg ? "dann siegen alle gemeinsam, und Held des Westens wird, wer am meisten Ruhm hat" : "dann gewinnt, wer am meisten Ruhm hat";
    return `${neu}. Ziel: Die Gefährten ziehen über die Reise-Leiste bis Feld 10 zum Feuerberg; ${ziel}. `
      + (e.uhr ? "Reist in einer Runde niemand, ziehen sie am Rundenende von selbst ein Feld weiter. " : "")
      + turm
      + (e.ohneVoelker ? "Gespielt wird ohne Völker (erste Partie): Niemand hat eine Volksfähigkeit. " : "")
      + `${held}. Die Helden liegen offen vor ihrem Besitzer, jeder wirkt einmal im Spiel. `
      + `Dann setzt jeder reihum ein Start-Gehöft und rückwärts ein zweites${e.startRuhm ? ", jedes bringt 1 Ruhm" : ""}. `
      + (e.start !== undefined && e.start !== null ? `${c.name(e.start)} beginnt (am Tisch der Jüngste) und bekommt die Fahne des Startspielers.` : "");
  },
  heldWahl(e, A) {
    const k = "Die Heldenkarte liegt offen vor dem Besitzer und wirkt einmal im Spiel; danach wird sie quer gelegt.";
    switch (e.art) {
      case "zwei": return `${A} hat 2 Helden gezogen und behält ${heldDe(e.ids[0])}. Der andere kommt aus dem Spiel. ${k}`;
      case "eins": return `Zu fünft zieht jeder nur 1 Helden: ${A} bekommt ${heldDe(e.ids[0])}. ${k}`;
      case "team": return `Im Teamspiel zieht jede Person 1 Helden, beide gehören der Farbe: ${A} hat ${listeDe(e.ids.map(heldDe))}. `
        + "Die Heldenkarten liegen offen, jede wirkt einmal im Spiel (egal, wer von beiden am Zug ist); danach wird sie quer gelegt.";
      default: return `${A} spielt mit ${e.ids.length === 1 ? "dem festen Helden" : "den festen Helden"}: ${listeDe(e.ids.map(heldDe))}. ${k}`;
    }
  },
  heimatland(e) {
    const n = ARTEN_REIHE.reduce((a, k) => a + (e.gezogen[k] || 0), 0) + e.wasser;
    const liste = ARTEN_REIHE.map((k) => {
      const z = (e.gezogen[k] || 0) + (k === "wasser" ? e.wasser : 0);
      return z ? `${z} ${KACHEL_DE[k][z === 1 ? 0 : 1]}` : "";
    });
    const dose = e.gross
      ? `Zu viert und zu fünft werden alle ${e.dose} Nebel-Plättchen (Geländesymbol auf der Unterseite) verdeckt auf dem Tisch gemischt, `
        + "und alle Plätze werden belegt, auch die nur für 4–5 Spieler. "
      : `Zu zweit und zu dritt werden nur ${e.dose} der ${e.alle} Nebel-Plättchen verdeckt auf dem Tisch gemischt (je 3 Wald, Acker, Weide, Hügel `
        + "und Gebirge, 1 Wasser und die Ruine); die übrigen Kacheln und Plättchen bleiben in der Schachtel, die Plätze nur für 4–5 Spieler bleiben leer. ";
    const ruine = e.ruine
      ? `Die Ruine darf nicht ins Heimatland: Sie wurde ${e.ruine === 1 ? "einmal" : `${e.ruine}-mal`} umgedreht, kam verdeckt zurück unter die übrigen, und ein anderes Plättchen wurde umgedreht. `
      : "Nur die Ruine dürfte nicht ins Heimatland (verdeckt zurück unter die übrigen, ein anderes umdrehen); sie kam diesmal nicht. ";
    return "Die Karte wird ausgelegt (Aufbau 1 bis 6 auf den Tafeln). Die Hauptstadt liegt in der Mitte des Heimatlands im Westen, "
      + "ganz im Osten das Schattenland mit Nord-Tor, Turm-Tor und Süd-Tor samt Feuerberg, dazwischen der Nebel. "
      + dose
      + (e.wasser ? "Das Wasser des Küstenvolks liegt schon, sein Plättchen ist aus dem Spiel. " : "")
      + `Für jeden freien Heimatland-Platz (${e.plaetze - e.wasser}) wird ein Plättchen umgedreht: Darauf ist das Gelände abgebildet, `
      + "die passende Kachel kommt auf den Platz, das Plättchen ist danach aus dem Spiel. Das ist reiner Zufall; wer umdreht, ist egal. "
      + ruine
      + (e.schatz ? `Ebenso kamen ${e.schatz === 1 ? "1 Schatz-Plättchen" : `${e.schatz} Schatz-Plättchen`} zurück. ` : "")
      + `Jetzt liegen ${n} Heimatland-Kacheln: ${listeDe(liste)}. `
      + `Die übrigen ${e.rest} Plättchen werden verdeckt gemischt und je eins auf jeden der ${e.nebel} Nebel-Plätze gelegt. `
      + "Welches Gelände darunter liegt, weiß niemand, bis dort jemand ein Gehöft baut (Erkunden). "
      + `Zuletzt kommt der Turm mit ${e.turm} Segmenten aufs Turm-Tor, die Turmspitze mit dem Auge blickt zum Nord-Tor, `
      + "die Gefährten stehen auf dem Start der Reise-Leiste und die Schicksalskarten werden gemischt.";
  },
  zugEnde(e, A, c) {
    const w = e.dice.map(c.wuerfel);
    if (e.next === null) {
      const ernte = w.length ? `${w.length === 1 ? "Der übrige Würfel" : `Die ${w.length} übrigen Würfel`} (${listeDe(w)}) ${w.length === 1 ? "erntet" : "ernten"} alle`
        : "Kein Würfel ist übrig, die gemeinsame Ernte entfällt";
      return `${A} beendet den Zug. Damit waren alle am Zug, jetzt folgt das Rundenende: ${ernte}; dann ziehen die Horden, `
        + "es folgen die Überfälle, die Reise-Uhr und die Wahl des neuen Startspielers."
        + (e.ende ? " Die Gefährten haben den Feuerberg erreicht: Nach diesem Rundenende ist das Spiel vorbei." : "");
    }
    const B = c.name(e.next);
    const darf = `${B} darf beliebig oft bauen, handeln, reisen, Schicksalskarten spielen und den Helden nutzen, in beliebiger Reihenfolge.`;
    if (e.planerin) return `${A} beendet den Zug. Jetzt ist ${B} dran, hat die Würfel dieser Runde aber schon mit der Planerin genommen und erntet nicht noch einmal. ${darf}`;
    if (!w.length) return `${A} beendet den Zug. Jetzt ist ${B} dran. Es ist kein Würfel mehr übrig, darum nimmt ${B} stattdessen 1 beliebigen Rohstoff aus dem Vorrat. Danach ${darf.replace(`${B} darf`, `darf ${B}`)}`;
    return `${A} beendet den Zug. Jetzt ist ${B} dran: ${B} nimmt ${w.length === 1 ? `den letzten Würfel (${w[0]})` : `1 der ${w.length} übrigen Würfel (${listeDe(w)})`} `
      + `und erntet. Danach ${darf.replace(`${B} darf`, `darf ${B}`)}`;
  },

  wasser: (e, A, c) => `${A} spielt das Küstenvolk und legt beim Aufbau 1 Wasser auf einen freien Heimatland-Platz. `
    + (e.ernte !== false ? "Gebäude des Küstenvolks am Wasser bringen bei der eigenen Ernte je 1 mehr, und mit einem Gebäude am Wasser tauscht es 2 : 1 mit dem Vorrat."
      : [e.fischer ? "Fischer: Bei seinem eigenen Würfel zählt Wasser für seine Gebäude wie das gewürfelte Gelände (Gehöft 1, Burg 2, Festung 3)." : "",
        e.wasserPlus ? `Bei seinem eigenen Würfel bringt jedes seiner Gebäude am Wasser ${e.wasserPlus} Rohstoff der gewürfelten Sorte.` : "",
        e.hafen !== false ? "Hafen: Mit einem Gebäude am Wasser tauscht es 2 : 1 mit dem Vorrat." : ""].filter(Boolean).join(" "))
    + (c.kosten(e.start) ? ` Dazu bekommt es ${c.kosten(e.start)}.` : ""),
  startGehoeft(e, A, c) {
    if (!e.zweites) {
      return `${A} setzt das erste Start-Gehöft ${c.ort(e.fs)}. Start-Gehöfte stehen auf Kanten zwischen zwei Heimatland-Kacheln `
        + `(die Hauptstadt zählt mit) und bringen ${e.ruhm ? `wie jedes Gehöft 1 Ruhm (Ruhm-Leiste jetzt ${e.leiste})` : "keinen Ruhm"}.`;
    }
    return `${A} setzt das zweite Start-Gehöft ${c.ort(e.fs)}; die zweite Runde läuft rückwärts. Dafür gibt es je 1 Rohstoff pro `
      + `Geländefeld daran: ${c.kosten(e.ertrag) || "hier keinen, Hauptstadt und Wasser bringen nichts"}.${e.ruhm ? ` +1 Ruhm (Ruhm-Leiste jetzt ${e.leiste}).` : ""}`;
  },
  wurf(e, A, c, l) {
    // wie auf der Regeltafel (v0.5): 5 Würfel, zu fünft 6; sonst (Varianten) die Rechnung
    let formel = "5 Würfel, zu fünft 6";
    if (e.n !== (e.sp >= 5 ? 6 : 5)) {
      const b = e.n === Math.min(6, Math.max(e.min, e.sp + 1)) ? e.sp + 1 : e.basis;
      formel = b === e.sp + 1 ? `Spielerzahl ${e.sp} + 1 = ${b}` : `zu zweit ${b}`;
      if (e.min > b) formel += `, aber mindestens ${e.min}`;
      if (e.n < Math.max(e.min, b)) formel += `, höchstens ${e.n}`;
    }
    const augen = e.augen === 0 ? "Kein Auge: Diese Runde erscheint keine neue Horde."
      : e.augen === 1 ? "1 Auge: Gleich dreht sich die Turmspitze zum nächsten Tor, dort erscheint eine Horde."
        : `${e.augen} Augen: Gleich dreht sich die Turmspitze ${e.augen}-mal zum nächsten Tor, jedes Mal erscheint dort eine Horde.`;
    return `Runde ${l.r}: ${A} ist Startspieler und würfelt ${e.n} Runenwürfel (${formel}). Ergebnis: ${e.faces.map(c.wuerfel).join(", ")}. `
      + `${augen} Danach nimmt reihum ab ${A} jeder 1 Würfel und erntet${e.plus ? ` (mit ${e.plus} Rohstoff mehr, wenn er etwas bringt)` : ""}; `
      + (e.trost ? "bringt er nichts oder liegt keiner mehr, gibt es 1 beliebigen Rohstoff aus dem Vorrat; " : "")
      + "die übrigen Würfel ernten am Rundenende alle.";
  },
  zauberin(e, A, c) {
    const n = e.aend.length;
    const was = n ? `dreht ${n === 1 ? "1 Würfel" : `${n} Würfel`}: ${e.aend.map(([a, b]) => `${c.wuerfel(a)} → ${c.wuerfel(b)}`).join(", ")}` : "dreht keinen Würfel";
    return `${A} ruft die Spürzauberin (einmal im Spiel, sofort nach dem Runenwurf) und ${was}.${e.ruhm ? ` +${e.ruhm} Ruhm.` : ""}`;
  },
  gelehrter: (e, A) => `${A} ruft den Gelehrten (einmal im Spiel): „Pax vobiscum!“ `
    + `${e.n === 1 ? "Das Auge dieses Wurfs zählt" : `Die ${e.n} Augen dieses Wurfs zählen`} nicht: Die Turmspitze bleibt stehen, `
    + `es erscheint keine Horde. +${e.ruhm} Ruhm.`,
  auge(e, A, c) {
    const pre = e.i ? (e.n > 1 ? `Auge ${e.i} von ${e.n}: ` : "Das Auge: ") : "";
    const dreh = `Die Turmspitze dreht sich im Uhrzeigersinn vom ${c.tor(e.von)} zum ${c.tor(e.nach)}${e.nach === TURM_TOR ? " (Blick nach Westen über das Land)" : ""}`;
    const folge = e.entfaellt ? "Die Horde entfällt, ohne weitere Folge (der Turm wächst nicht)." : "Stattdessen wächst der Turm um 1.";
    if (e.leer && e.teil === "ring") return `${pre}${dreh}. Dort steht schon eine Horde, eine weitere käme als Ring unter die Figur, aber alle ${e.max} Ringe sind verbraucht: ${folge}`;
    if (e.leer && e.teil === "figur") return `${pre}${dreh}. Das Tor ist frei, aber alle ${e.max} Hordenfiguren stehen schon auf dem Brett: ${folge}`;
    if (e.leer) return `${pre}${dreh}. Alle ${e.max} Horden stehen schon auf dem Brett; ist keine mehr im Vorrat, wächst stattdessen der Turm um 1.`;
    if (e.teil) {
      const was = e.teil === "ring" ? `Dort steht schon eine Horde: Eine weitere kommt dazu, als Ring unter der Figur (jetzt ${c.horden(e.dort)}, sie zählen zusammen).`
        : "Das Tor ist frei: Dort erscheint eine Horde (eine Figur).";
      return `${pre}${dreh}. ${was} Im Vorrat ${e.figuren === 1 ? "ist noch 1 Figur" : `sind noch ${e.figuren} Figuren`} und ${e.ringe === 1 ? "1 Ring" : `${e.ringe} Ringe`}; `
        + (e.entfaellt ? "fehlt das nötige Teil, entfällt die Horde." : "fehlt das nötige Teil, wächst stattdessen der Turm.");
    }
    const dort = e.dort > 1 ? ` Dort stehen jetzt ${e.dort} Horden, sie zählen zusammen (eine Figur, je weitere ein Ring darunter).` : "";
    const vorrat = e.vorrat === 0
      ? " Damit ist keine Horde mehr im Vorrat: Solange keine zurückkommt, lässt jedes weitere Auge stattdessen den Turm wachsen."
      : ` Im Vorrat ${e.vorrat === 1 ? "ist noch 1 Horde" : `sind noch ${e.vorrat} Horden`} von ${e.max}.`;
    return `${pre}${dreh}. Dort erscheint eine Horde.${dort}${vorrat}`;
  },
  planerin(e, A, c) {
    const w = e.faces.map(c.wuerfel);
    if (e.imZug) {
      return `${A} nutzt die Planerin (einmal im Spiel): In diesem Zug nimmt ${A} `
        + `${w.length === 1 ? `den letzten Würfel (${w[0]}) und erntet ihn` : `2 Würfel statt 1 (${listeDe(w)}) und erntet beide, jeden wie einen eigenen Würfel`}.`;
    }
    return `${A} nutzt die Planerin (einmal im Spiel): Noch vor dem Zug des Startspielers nimmt ${A} `
      + `${w.length === 1 ? `den Würfel ${w[0]} und erntet ihn` : `2 Würfel (${listeDe(w)}) und erntet beide`}. Im eigenen Zug nimmt ${A} dafür keinen Würfel.`;
  },
  zugOhneWuerfel: (e, A) => `${A} ist am Zug, hat die Würfel dieser Runde aber schon mit der Planerin genommen: kein Würfel, gleich weiter mit Bauen, Handeln oder Reisen.`,
  elben: (e, A, c) => `${A} spielt die Elben: Sie dürfen ${e.planerin ? "mit der Planerin jeden der beiden Würfel" : "den genommenen Würfel"} `
    + `für ${e.kosten} Korn auf ein beliebiges Gelände drehen, hier ${c.wuerfel(e.von)} → ${c.wuerfel(e.nach)}.`,
  ernte(e, A, c) {
    const T = c.ter(e.face);
    const R = c.res(e.res, 2);
    const intro = { wuerfel: `${A} nimmt den Würfel ${T} und erntet.`, planerin: `${A} erntet den Würfel ${T} (Planerin).`,
      karte: `${A} spielt Reiche Ernte und erntet den Würfel ${T} ein zweites Mal.` }[e.quelle] || `${A} erntet den Würfel ${T}.`;
    const regel = `${T} bringt ${R}: Jedes Gebäude bringt je angrenzendes Feld dieses Geländes Gehöft 1, Burg 2, Festung 3`
      + `${e.fischer ? " (als Küstenvolk zählt Wasser dabei wie dieses Gelände, Fischer)" : ""}`
      + `${e.plus ? `; bringt der eigene Würfel etwas, gibt es ${e.plus} mehr` : ""}.`;
    const trost = " Bringt der eigene Würfel nichts, gibt es dafür 1 beliebigen Rohstoff aus dem Vorrat (wie ohne Würfel): "
      + `${A} wählt ihn gleich.`;
    if (!e.soll) {
      const warum = e.geb ? `Kein Gebäude von ${A} grenzt an ${EIN_AKK[e.face] || T}${e.fischer ? " oder an Wasser" : ""}` : `${A} hat kein Gebäude auf dem Brett`;
      return `${intro} ${regel} ${warum}, darum gibt es nichts.${e.trost ? trost : e.quelle === "karte" ? " (Die Reiche Ernte wiederholt nur den Würfelertrag.)" : ""}`;
    }
    const teile = e.teile.map((t) => {
      let x = `${c.lvl(t.lvl)} ${c.ort(t.fs)} bringt ${t.basis}${t.wasser ? ` (davon ${t.wasser} fürs Wasser)` : ""}`;
      if (t.haupt) x += ` + ${t.haupt} (Hauptstadt)`;
      if (t.kueste) x += ` + ${t.kueste} (Küstenvolk am Wasser)`;
      return x;
    });
    const plus = e.plus ? `, dazu ${e.plus} für den eigenen Würfel` : "";
    let out = `${intro} ${regel} Bei ${A}: ${listeDe(teile)}${plus}, zusammen ${e.soll} ${c.res(e.res, e.soll)}.`;
    if (e.ist < e.soll) {
      out += e.ist ? ` Im Vorrat ${e.ist === 1 ? "lag" : "lagen"} aber nur noch ${e.ist}; was nicht im Vorrat ist, gibt es nicht.`
        : ` Der Vorrat an ${R} ist aber leer; was nicht im Vorrat ist, gibt es nicht.${e.trost ? trost : ""}`;
    }
    return out;
  },
  rohstoffWahl: (e, A, c) => (e.grund === "ertrag"
    ? `Der Würfel hat ${A} nichts gebracht: Dafür gibt es 1 beliebigen Rohstoff aus dem Vorrat (nur Sorten, die noch da sind). `
    : "Alle Würfel sind vergeben: Wer keinen mehr bekommt, nimmt stattdessen 1 beliebigen Rohstoff aus dem Vorrat. ")
    + `${A} wählt 1 ${c.res(e.res, 1)}${e.ist ? "" : ", aber davon ist nichts mehr im Vorrat"}.`,
  gemeinsam(e, A, c) {
    if (!e.dice.length) return "Rundenende: Alle Würfel wurden genommen, darum gibt es keine gemeinsame Ernte.";
    const teile = e.dice.map((f, i) => {
      const r = D.TERRAIN_RES[f];
      const xs = e.teile.filter((t) => t[0] === i)
        .map(([, seat, soll, ist]) => `${c.name(seat)} ${ist} ${c.res(r, ist)}${ist < soll ? ` (statt ${soll}, Vorrat leer)` : ""}`);
      return `${c.wuerfel(f)}: ${xs.length ? listeDe(xs) : "niemand, kein Gebäude grenzt daran"}`;
    });
    const kueste = (e.kuesteBonus ?? c.hat("kuestenvolk")) ? " Der Küstenvolk-Bonus gilt dabei nicht, nur beim eigenen Würfel." : "";
    return `Rundenende, gemeinsame Ernte: Die übrigen Würfel ernten alle, reihum ab dem Startspieler, `
      + `${e.plus ? "jeder wie bei einem eigenen Würfel, nur ohne den Bonus für den eigenen Würfel" : "jeder wie bei einem eigenen Würfel"}.${kueste} ${teile.join(". ")}.`;
  },
  gehoeft(e, A, c) {
    const wo = e.neu ? `${A} hatte kein Gebäude mehr auf dem Brett, darum durfte es wieder zwischen zwei Heimatland-Kacheln stehen.`
      : "Neue Gehöfte kommen an freie Kanten der Felder, an denen schon eigene Gebäude stehen (das eigene Reich), nie ans Schattenland.";
    const rest = e.rest === 0 ? `Damit sind alle ${D.PIECES.gehoeft} Gehöfte verbaut.` : `${A} hat noch ${e.rest === 1 ? "1 Gehöft" : `${e.rest} Gehöfte`} übrig.`;
    return `${A} baut ein Gehöft ${c.ort(e.fs)} für ${c.kosten(e.kosten)}: +1 Ruhm, die Ruhm-Leiste steht jetzt auf ${e.leiste}. ${wo} ${rest}`;
  },
  erkunden(e, A) {
    let out = `${A} baut an einer Kante am Nebel: Erst wird bezahlt, dann das Nebel-Plättchen umgedreht, darunter liegt ${EIN_NOM[e.kind] || TER_DE[e.kind]}`
      + `${e.schatz ? " mit Schatz" : ""}. Die Kachel kommt an diese Stelle${e.horde ? " (unter die Horde, die dort steht)" : ""}, das Plättchen ist aus dem Spiel. `
      + "Erkunden ist verbindlich: Das Gehöft bleibt an dieser Kante, auch wenn die Kachel nichts bringt.";
    if (e.kind === "ruine" && e.ruinLohn !== false) out += ` Wer die Ruine findet, bekommt 1 Ruhm${e.karte ? " und 1 Schicksalskarte" : " (Schicksalskarten sind keine mehr da)"}.`;
    if (e.kind === "ruine" && e.ruinLohn === false) out += " Die Ruine bringt keinen Rohstoff, wie das Wasser.";
    if (e.fuersErkunden) out += e.karte ? ` Wer erkundet, zieht 1 Schicksalskarte: ${A} bekommt eine (verdeckt, höchstens 3 auf der Hand).` : " Wer erkundet, zieht 1 Schicksalskarte, aber der Stapel ist leer.";
    if (e.schatz) out += ` Schatz: ${A} wählt gleich 1 beliebigen Rohstoff.`;
    return out;
  },
  schatz: (e, A, c) => `Schatz: ${A} nimmt 1 beliebigen Rohstoff aus dem Vorrat und wählt 1 ${c.res(e.res, 1)}${e.ist ? "" : ", aber davon ist nichts mehr im Vorrat"}.`,
  ausbau(e, A, c) {
    const burg = e.to === 2;
    const rab = e.rabatt ? `, als Zwerge ${e.rabatt} Stein weniger` : "";
    return `${A} setzt ${burg ? "eine Burg auf das eigene Gehöft" : "eine Festung auf die eigene Burg"} ${c.ort(e.fs)} (${c.kosten(e.kosten)}${rab}): `
      + `+1 Ruhm, die Ruhm-Leiste steht jetzt auf ${e.leiste}. `
      + (burg ? "Eine Burg erntet 2 je passendes Feld und wehrt bei Überfällen dort 1 ab." : "Eine Festung erntet 3 je passendes Feld und wehrt bei Überfällen dort 2 ab.");
  },
  leuchtfeuer(e, A, c) {
    const rab = e.rabatt ? `, als Zwerge ${e.rabatt} Stein weniger` : "";
    if (e.immer) {
      const wie = e.karte ? `spielt Wachfeuer und baut ein Leuchtfeuer ohne Holz ${c.ecke(e.fs)} (${c.kosten(e.kosten)}${rab})`
        : `baut ein Leuchtfeuer ${c.ecke(e.fs)} (${c.kosten(e.kosten)}${rab})`;
      return `${A} ${wie}: +2 Ruhm, die Ruhm-Leiste steht jetzt auf ${e.leiste}. Leuchtfeuer stehen an Ecken mit drei Kacheln an einem Gebirge oder `
        + "Hügel des eigenen Reichs (je Gebirge und Hügel höchstens eins), brennen immer und gehören niemandem: Bei Überfällen an ihren drei Feldern "
        + `und deren Nachbarn dürfen alle zahlen, nicht nur die Besitzer der Gebäude dort. Jetzt ${e.gebaut === 1 ? "steht 1 Leuchtfeuer" : `stehen ${e.gebaut} Leuchtfeuer`}.`
        + (e.ruf && e.gebaut < e.ruf ? ` Wer das ${e.ruf === 3 ? "dritte" : `${e.ruf}.`} baut, löst einmal im Spiel den Ruf der Leuchtfeuer aus.` : "");
    }
    return `${A} baut ein Leuchtfeuer ${c.ecke(e.fs)} (${c.kosten(e.kosten)}${rab}): +2 Ruhm, die Ruhm-Leiste steht jetzt auf ${e.leiste}. `
      + "Leuchtfeuer stehen an Ecken mit drei Kacheln an einem Gebirge oder Hügel des eigenen Reichs (je Gebirge und Hügel höchstens eins) "
      + "und gehören niemandem: Solange eins brennt, dürfen bei Überfällen an seinen drei Feldern und deren Nachbarn alle zahlen, "
      + `nicht nur die Besitzer der Gebäude dort. Jetzt ${c.brennt(e.brennen)}.${c.ruf(e)}`;
  },
  entzuenden: (e, A, c) => `${A} entzündet das erloschene Leuchtfeuer ${c.ecke(e.fs)} für 1 Holz neu; das darf jeder im eigenen Zug. `
    + `Jetzt ${c.brennt(e.brennen)}.${c.ruf(e)}`,
  ruf: (e, A) => (e.weg === null ? `Ruf der Leuchtfeuer! Das ${e.n === 3 ? "dritte" : `${e.n}.`} Leuchtfeuer steht, das gibt es nur `
    + `einmal im Spiel: Die Verbündeten eilen herbei, der Turm verliert ${e.minus === 1 ? "1 Segment" : `${e.minus} Segmente`} (jetzt ${e.turm}), und ${A} bekommt als Erbauer `
    + (e.zusaetzlich ? `${e.ruhm} Ruhm zusätzlich (zu den 2 für das Leuchtfeuer).` : `${e.ruhm} Ruhm.`)
    : `Ruf der Leuchtfeuer! ${e.n} Leuchtfeuer brennen zugleich, das geschieht nur einmal im Spiel. Alle Horden auf Feldern an `
    + `brennenden Leuchtfeuern kommen in den Vorrat (${e.weg ? (e.weg === 1 ? "1 Horde" : `${e.weg} Horden`) : "dort stand keine"}), `
    + `und der Turm verliert ${e.minus === 1 ? "1 Segment" : `${e.minus} Segmente`} (jetzt ${e.turm}). ${A} hat das letzte gebaut oder entzündet und bekommt ${e.ruhm} Ruhm.`),
  reise(e, A, c) {
    let out;
    if (e.wie === "wegweiserin") {
      out = `${A} nutzt die Wegweiserin (einmal im Spiel): Die Gefährten ziehen ohne Kosten auf Feld ${e.feld} der Reise-Leiste, mit Ruhm `
        + `(+${e.ruhm}, Ruhm-Leiste jetzt ${e.leiste}) und ohne Gefahr. Das ist die Reise dieser Runde.`;
    } else if (e.wie === "eilbote") {
      out = `Mit dem Eilboten ziehen die Gefährten sofort auf Feld ${e.feld}: ${A} zahlt ${c.kosten(e.kosten)} und bekommt +${e.ruhm} Ruhm `
        + `(Ruhm-Leiste jetzt ${e.leiste}). Der Eilbote zählt nicht als Reise der Runde.`;
    } else {
      out = `${A} zahlt ${c.kosten(e.kosten)} und führt die Gefährten auf Feld ${e.feld} der Reise-Leiste: +${e.ruhm} Ruhm (Ruhm-Leiste jetzt ${e.leiste}). `
        + "Höchstens 1 Feld pro Runde: Bis zum Rundenende reist niemand mehr (nur der Eilbote zählt nicht mit).";
    }
    if (e.gefahr) {
      out += " " + ({
        turm: `Feld ${e.feld} ist ein Gefahrenfeld (rot): Der Turm wächst um ${e.plus}.`,
        halblinge: `Feld ${e.feld} ist ein Gefahrenfeld, aber die Halblinge schleichen vorbei: Der Turm wächst nicht.`,
        deckel: `Feld ${e.feld} ist ein Gefahrenfeld, aber der Turm hat schon ${e.turm} von ${e.max} Segmenten: Ein Gefahrenfeld vollendet ihn nie, er wächst nicht.`,
        weg: `Feld ${e.feld} ist ein Gefahrenfeld, aber mit der Wegweiserin droht keine Gefahr.`,
        horde: `Feld ${e.feld} ist ein Gefahrenfeld: Das Auge dreht sich weiter.`,
      }[e.folge] || `Feld ${e.feld} ist ein Gefahrenfeld.`);
    }
    if (e.ziel) {
      out += " Die Gefährten erreichen den Feuerberg! Die Runde wird samt Rundenende zu Ende gespielt; "
        + (e.held ? "wird der Turm dabei nicht vollendet, siegen alle, und wer am meisten Ruhm hat, ist Held des Westens." : "dann gewinnt, wer am meisten Ruhm hat.");
    }
    return out;
  },
  reiseUhr(e) {
    let out = "Rundenende, Reise-Uhr: In dieser Runde ist niemand gereist (der Eilbote zählt nicht). Darum ziehen die Gefährten von selbst "
      + `auf Feld ${e.feld}, ohne Kosten und ohne Ruhm.`;
    if (e.gefahr) out += e.deckel ? ` Feld ${e.feld} ist ein Gefahrenfeld, aber der Turm hat schon ${e.turm} von ${e.max} Segmenten: Ein Gefahrenfeld vollendet ihn nie.`
      : ` Feld ${e.feld} ist ein Gefahrenfeld: Der Turm wächst um ${e.plus}.`;
    if (e.ziel) out += " Damit sind sie am Feuerberg: Nach dieser Runde ist das Spiel aus.";
    return out;
  },
  tausch(e, A, c) {
    let grund;
    if (e.kurs >= e.basis) grund = `Das ist der normale Kurs ${e.basis} : 1 (${e.basis} gleiche gegen 1).`;
    else {
      const wer = e.haupt && e.kueste ? `${A} ein Gebäude an der Hauptstadt und als Küstenvolk eins am Wasser hat`
        : e.haupt ? `${A} ein Gebäude an der Hauptstadt hat` : e.kueste ? `${A} als Küstenvolk ein Gebäude am Wasser hat` : "";
      grund = `Der Kurs ist ${e.kurs} : 1 statt ${e.basis} : 1${wer ? `, weil ${wer}` : ""}.`;
    }
    return `${A} tauscht mit dem Vorrat ${e.kurs} ${c.res(e.gib, e.kurs)} gegen 1 ${c.res(e.nimm, 1)}. ${grund}`;
  },
  handel(e, A, c) {
    const B = c.name(e.von);
    const gib = c.kosten(e.gib) || "nichts";
    const nimm = c.kosten(e.nimm) || "nichts";
    return e.ja ? `Handel unter Spielern ist frei (Rohstoffe gegen Rohstoffe), aber nur mit dem Spieler am Zug: ${B} gibt ${A} ${gib} und bekommt dafür ${nimm}.`
      : `${A} lehnt das Angebot von ${B} ab (${gib} gegen ${nimm}): Es wird nicht getauscht.`;
  },
  karte(e, A, c) {
    if (e.id === "bann") {
      return e.vorrat ? `${A} spielt den Bannspruch gegen die Horde ${c.aufDat(e.von)}: Am Turm-Tor fehlt für sie die Figur oder ein Ring, darum kommt sie in den Vorrat (der Turm wächst nicht).`
        : `${A} spielt den Bannspruch: Die Horde ${c.aufDat(e.von)} muss zurück aufs Turm-Tor und beginnt ihren Weg zur Hauptstadt von vorn.`;
    }
    if (e.id === "wachfeuer") {
      return `${A} spielt Wachfeuer: ${e.n === 1 ? "Das erloschene Leuchtfeuer brennt" : `Alle ${e.n} erloschenen Leuchtfeuer brennen`} wieder, ohne Kosten. `
        + `Jetzt ${c.brennt(e.brennen)}.${c.ruf(e)}`;
    }
    if (e.id === "handel") {
      return `${A} spielt den Handelszug: bis zu 3-mal 1 : 1 mit dem Vorrat tauschen, hier ${listeDe(e.swaps.map(([g, t]) => `${c.res(g, 1)} → ${c.res(t, 1)}`))}.`;
    }
    return "";
  },
  held(e, A, c) {
    const vorKampf = e.kampf ? ` Das geschieht noch vor ${e.kampf === "siege" ? "dem Überfall auf die Hauptstadt" : "dem Überfall"}`
      + `${e.rest ? `; dort ${e.rest === 1 ? "steht noch 1 Horde" : `stehen noch ${e.rest} Horden`}, gegen die gekämpft wird` : ""}.` : "";
    switch (e.id) {
      case "karten":
        return `${A} nutzt den Meister der Karten (einmal im Spiel): 3 Schicksalskarten ziehen, 2 behalten, die übrige kommt unter den Stapel. `
          + (e.n === 0 ? "Der Stapel ist leer, es gibt keine Karte." : e.n < 3 ? `Im Stapel ${e.n === 1 ? "lag nur 1 Karte" : `lagen nur ${e.n} Karten`}; ${A} behält ${e.n === 1 ? "sie" : "alle"}.` : "Welche, bleibt verdeckt.")
          + (e.ruhm ? ` +${e.ruhm} Ruhm.` : "");
      case "tueftler":
        return `${A} nutzt den Tüftler (einmal im Spiel): eine Burg auf das eigene Gehöft ${c.ort(e.fs)} für ${c.kosten(e.kosten) || "nichts"} `
          + `statt ${c.kosten(D.COSTS.burg)}. +1 Ruhm, die Ruhm-Leiste steht jetzt auf ${e.leiste}.`;
      case "hueterin":
        if (e.vorrat) {
          return `${A} ruft die Hüterin der Natur (einmal im Spiel) für die Horde ${c.aufDat(e.von)}: Am Turm-Tor fehlt für sie die Figur oder ein Ring, `
            + `darum kommt sie in den Vorrat (der Turm wächst nicht). +${e.ruhm ?? 2} Ruhm.${vorKampf}`;
        }
        return `${A} ruft die Hüterin der Natur (einmal im Spiel): Die Horde ${c.aufDat(e.von)} kehrt aufs Turm-Tor zurück`
          + `${e.neu ? " (Horden, die schon dort stehen, kann sie nicht wählen)" : ""}. +${e.ruhm ?? 2} Ruhm.${vorKampf}`;
      case "chronist": {
        const weit = e.weit ?? 1;
        const wo = weit <= 1 ? "Eine Horde auf oder neben der Hauptstadt"
          : `Eine Horde, die höchstens ${weit} Felder vor der Hauptstadt steht (Weg der Horden; das Nachbarfeld der Hauptstadt zählt als 1 Feld)`;
        const dist = e.dist === 0 ? " (in der Hauptstadt)" : e.dist ? ` (${e.dist === 1 ? "1 Feld" : `${e.dist} Felder`} vor der Hauptstadt)` : "";
        return `${A} ruft den Chronisten (einmal im Spiel): ${wo}, hier ${c.aufDat(e.von)}${dist}, kommt in den Vorrat. `
          + `+${e.ruhm ?? 2} Ruhm.${vorKampf}`;
      }
      default:
        return "";
    }
  },
  ablegen: (e, A) => `${A} hat mehr als ${e.max} Schicksalskarten und legt ${e.n === 1 ? "1 Karte" : `${e.n} Karten`} verdeckt unter den Stapel.`,
  ausfall(e, A, c) {
    const stark = e.stark ? ` (ab Turm ${e.ab} hat jede Horde Stärke ${e.je})` : "";
    const fehl = e.need ? `also ${e.need === 1 ? "fehlte 1" : `fehlten ${e.need}`}. ${A} ${c.einsatz(e)}, zusammen ${e.wert}.` : "also fehlte nichts.";
    return `${A} wagt einen Ausfall gegen ${e.horden === 1 ? "die Horde" : `die ${e.horden} Horden`} ${c.aufDat(e.f)}: ${c.horden(e.horden)} × Stärke ${e.je} = ${e.staerke}${stark}. `
      + `Die eigenen Burgen und Festungen dort wehren ${e.basis} ab, ${fehl} Das reicht: ${e.horden === 1 ? "Die Horde kommt" : "Die Horden kommen"} in den Vorrat, `
      + `${A} bekommt 2 Ruhm und 1 Schicksalskarte.`;
  },
  hordenStart: (e) => "Rundenende, die Horden ziehen: Jede Horde zieht 1 Feld auf dem kürzesten Weg zur Hauptstadt; alle Horden auf einem Feld ziehen gemeinsam. "
    + (e.tie === "start" ? "Sind zwei Wege gleich kurz, wählt der Startspieler."
      : "Sind zwei Wege gleich kurz, geht es zum Feld mit den meisten Gebäuden (Gehöft, Burg und Festung zählen je 1), bei Gleichstand wählt der Startspieler.")
    + (e.ringe ? " Treffen Horden auf einem Feld zusammen, zählen sie zusammen: Die Figur der dazukommenden geht zurück in den Vorrat, dafür kommt ein Ring unter die Figur."
      + (e.turm === false ? " Fehlt dieser Ring, entfällt die dazukommende Horde (zurück in den Vorrat, ohne weitere Folge)."
        : " Fehlt dieser Ring, geht die dazukommende Horde ganz zurück in den Vorrat und der Turm wächst um 1.")
      + (e.haupt ? " In der Hauptstadt braucht es keine Ringe: Die Horden dort werden gezählt, überfallen und kommen in den Vorrat." : "") : ""),
  hordenzug(e, A, c) {
    const wer = e.n > 1 ? `Die ${e.n} Horden ziehen gemeinsam` : "Die Horde zieht";
    const ri = RI_DE[e.ri] ? ` nach ${RI_DE[e.ri]}` : "";
    let out = `${wer} ${c.von(e.von)}${ri} ${c.aufAkk(e.nach)}`;
    out += e.ziel ? ". Gleich folgt der Überfall auf die Hauptstadt." : `, noch ${e.dist === 1 ? "1 Feld" : `${e.dist} Felder`} bis zur Hauptstadt.`;
    if (e.opts && e.grund !== "einzig") {
      const opts = listeDe(e.opts.map(([k, n, r]) => `${c.feld(k)}${RI_DE[r] ? ` im ${RI_DE[r]}` : ""} (${n} Gebäude)`));
      const top = Math.max(...e.opts.map((o) => o[1]));
      const gleich = e.opts.every((o) => o[1] === top);
      const ohneZahl = listeDe(e.opts.map(([k, , r]) => `${c.feld(k)}${RI_DE[r] ? ` im ${RI_DE[r]}` : ""}`));
      if (e.grund === "gebaeude") out += ` Gleich kurz wären ${opts}; ${e.n > 1 ? "sie ziehen" : "sie zieht"} dorthin, wo die meisten Gebäude stehen.`;
      else if (e.grund === "wahl" && e.tie === "start") out += ` Gleich kurz sind ${ohneZahl}: Der Startspieler ${A} hat gewählt.`;
      else if (e.grund === "wahl") {
        out += gleich ? ` Gleich kurz sind ${opts}, mit gleich vielen Gebäuden: Der Startspieler ${A} hat gewählt.`
          : ` Gleich kurz sind ${opts}; am meisten Gebäude haben mehrere Felder gleich, darum hat der Startspieler ${A} gewählt.`;
      } else if (e.grund === "zufall") out += ` Gleich kurz sind ${opts}, ohne Gebäude: Das Ziel wurde ausgelost.`;
    }
    if (e.ringe && e.dazu) out += ` Dort ${e.dazu === 1 ? "steht schon 1 Horde" : `stehen schon ${e.dazu} Horden`}: Sie bilden einen Stapel, `
      + `die Figur der dazukommenden geht zurück in den Vorrat, dafür ${e.n > 1 ? `kommen ${e.n} Ringe` : "kommt ein Ring"} unter die Figur.`;
    return out;
  },
  ringFehlt: (e, A, c) => `${gross(c.aufDat(e.f))} kommt eine weitere Horde zum Stapel, aber alle ${e.max} Ringe sind verbraucht: `
    + `Die dazukommende Horde geht zurück in den Vorrat (dort ${e.dort === 1 ? "bleibt 1 Horde" : `bleiben ${e.dort} Horden`})`
    + (e.turm === false ? "; sie entfällt ohne weitere Folge, der Turm wächst nicht." : ", dafür wächst der Turm um 1."),
  ueberfaelle(e, A, c) {
    const ohne = e.ohne.length ? ` Horden auf Feldern ohne Gebäude überfallen niemand: ${listeDe(e.ohne.map(([k, n]) => `${c.feld(k)} (${c.horden(n)})`))}.` : "";
    if (!e.mit.length) return `Überfälle: Keine Horde steht an einem Feld mit Gebäuden, diese Runde gibt es keinen Überfall.${ohne}`;
    if (e.auto) {
      return `Überfälle: Horden greifen jedes Feld mit Gebäuden an (die Hauptstadt immer, sie war schon dran), diese Runde ${listeDe(e.mit.map(c.feld))}.${ohne}`
        + `${e.mit.length > 1 ? ` Der Reihe nach, die Felder nah an der Hauptstadt zuerst${e.wahl ? "; bei gleich nahen Feldern wählt der Startspieler die Reihenfolge" : ""}.` : ""}`;
    }
    return `Überfälle: Horden greifen jedes Feld an, an dem Gebäude stehen, diese Runde ${listeDe(e.mit.map(c.feld))}.${ohne}`
      + `${e.mit.length > 1 ? " Die Reihenfolge wählt der Startspieler." : ""}`;
  },
  ueberfallWahl: (e, A, c) => `Gleich nah an der Hauptstadt (${e.dist === 1 ? "1 Feld" : `${e.dist} Felder`}) werden ${listeDe(e.opts.map(c.feld))} überfallen: `
    + `Der Startspieler ${A} wählt die Reihenfolge, zuerst ${c.feld(e.f)}.`,
  kampf(e, A, c) {
    // v0.5 (lohn === false): eine Regel für alle Überfälle, auch an der Hauptstadt
    const titel = e.art === "siege" ? (e.lohn === false ? "Überfall auf die Hauptstadt" : "Belagerung der Hauptstadt") : `Überfall ${c.aufAkk(e.f)}`;
    const st = `${c.horden(e.horden)} × Stärke ${e.je} = ${e.staerke}${e.stark ? ` (ab Turm ${e.ab} hat jede Horde Stärke ${e.je})` : ""}`;
    const teile = [];
    if (e.burgen) teile.push(c.gebaeude(e.burgen, 2));
    if (e.festungen) teile.push(c.gebaeude(e.festungen, 3));
    if (e.haupt) teile.push(`die Hauptstadt selbst (${e.haupt})`);
    const abw = teile.length ? `Von selbst wehren ab: ${listeDe(teile)}, zusammen ${e.basis}${e.burgen || e.festungen ? " (egal, wem die Gebäude gehören)" : ""}.`
      : "Keine Burg oder Festung wehrt hier von selbst ab.";
    if (e.warum === "reicht") return `${titel}: ${st}. ${abw} Das reicht schon, niemand muss zahlen.`;
    const fehlt = e.staerke - e.basis;
    let wer;
    if (!e.zahler.length) {
      wer = e.art === "siege" ? `An der Hauptstadt steht kein Gebäude und kein ${e.lohn === false ? "" : "brennendes "}Leuchtfeuer ist in der Nähe: `
        + `Niemand darf zahlen, ${e.lohn === false ? "der Überfall" : "die Belagerung"} ist verloren.`
        : "Niemand darf zahlen, der Überfall ist verloren.";
    } else if (e.lohn === false) {
      const namen = listeDe(e.zahler.map(c.name));
      wer = (e.warum === "alle" ? `An der Hauptstadt dürfen immer alle zahlen, auch ohne Gebäude dort und ohne Leuchtfeuer: ${namen}.`
        : e.warum === "leuchtfeuer" ? `Ein Leuchtfeuer steht an diesem Feld oder einem Nachbarfeld, darum dürfen alle zahlen: ${namen}.`
          : `Zahlen dürfen die Besitzer der Gebäude hier: ${namen}.`)
        + (e.zahler.length > 1 ? " Reihum ab dem Startspieler sagt jeder einmal an, zusammen nie mehr als nötig." : "")
        + ` Jedes Erz und jedes Pferd zählt 1 (Pferde der Menschen 2, die Verstärkung 3) und bringt ${e.payFame || 1} Ruhm, die Verstärkung keinen. Gezahltes ist immer weg.`
        + ` Reicht es nicht: Turm +${e.turmPlus ?? 1}, jedes Gebäude hier verliert eine Stufe.`;
    } else {
      const namen = listeDe(e.zahler.map(c.name));
      wer = ({ besitzer: `Zahlen dürfen die Besitzer der Gebäude hier: ${namen}.`,
        leuchtfeuer: `Ein brennendes Leuchtfeuer steht an diesem Feld oder einem Nachbarfeld, darum dürfen alle zahlen: ${namen}.`,
        alle: `Bei der Belagerung dürfen alle zahlen: ${namen}.` }[e.warum] || `Zahlen dürfen: ${namen}.`)
        + (e.zahler.length > 1 ? " Reihum ab dem Startspieler sagt jeder einmal an, zusammen nie mehr als nötig." : "")
        + " Jedes Erz und jedes Pferd zählt 1 (Pferde der Menschen 2, Verstärkung 3). Gezahltes ist immer weg.";
    }
    return `${titel}: ${st}. ${abw} Es ${fehlt === 1 ? "fehlt 1" : `fehlen ${fehlt}`}. ${wer}`;
  },
  zahlung(e, A, c) {
    if (!e.wert) return e.fehlte > 0 ? `${A} zahlt nichts (es ${e.fehlte === 1 ? "fehlt" : "fehlen"} noch ${e.fehlte}).` : `${A} muss nichts mehr zahlen, die Abwehr reicht schon.`;
    return `${A} ${c.einsatz(e)}: ${e.wert} Abwehr (es ${e.fehlte === 1 ? "fehlte" : "fehlten"} noch ${e.fehlte}).`
      + `${e.ruhm ? ` Jeder gezahlte Rohstoff bringt Ruhm: +${e.ruhm}, die Ruhm-Leiste steht jetzt auf ${e.leiste}.` : ""}`;
  },
  kampfEnde(e, A, c) {
    const titel = e.art === "siege" ? (e.lohn === false ? "Überfall auf die Hauptstadt" : "Belagerung") : `Überfall ${c.aufAkk(e.f)}`;
    const gez = listeDe(e.gezahlt.map(([s, n]) => `${c.name(s)} ${n}`));
    if (e.sieg) {
      let out = `${titel} abgewehrt: ${e.summe} Abwehr gegen Stärke ${e.staerke}${gez ? ` (${e.basis} von selbst, gezahlt: ${gez})` : ""}. `
        + `${e.horden === 1 ? "Die Horde kommt" : "Die Horden kommen"} in den Vorrat.`;
      if (e.lohn === false) return out + (e.gezahlt.length ? " Den Ruhm gab es schon beim Zahlen, sonst bringt der Sieg nichts." : "");
      if (!e.gezahlt.length) {
        if (e.ruhm1?.length) out += ` Ohne Zahlung bekommt jeder mit Burg oder Festung hier 1 Ruhm: ${listeDe(e.ruhm1.map(c.name))}.`;
      } else {
        out += ` Am meisten gezahlt hat ${listeDe(e.sieger.map(c.name))} (${e.top}): 2 Ruhm und 1 Schicksalskarte.`;
        if (e.gleich?.length) {
          const ein = e.gleich.length === 1;
          out += ` ${listeDe(e.gleich.map(c.name))} ${ein ? "zahlte" : "zahlten"} genauso viel, ${ein ? "kam" : "kamen"} aber später in der Reihe: 1 Ruhm.`;
        }
      }
      return out;
    }
    let out = `${titel}: Abwehr gescheitert, ${e.summe} gegen Stärke ${e.staerke}.${gez ? ` Das Gezahlte (${gez}) ist trotzdem weg${e.lohn === false ? ", der Ruhm dafür bleibt" : ""}.` : ""}`;
    const v = e.verluste || [];
    const verlust = (x) => `${STUFE_DE[x.von]} von ${c.name(x.seat)} `
      + (x.geschont ? "bleibt stehen (Halblinge)" : `${x.nach ? `wird ${ZU_DE[x.nach]}` : "wird zerstört"}${x.null0 ? " (Ruhm schon bei 0)" : ""}`);
    if (v.length) out += ` Jedes Gebäude am Feld verliert eine Stufe, jede Stufe kostet 1 Ruhm: ${gross(listeDe(v.map(verlust)))}.`;
    else if (e.art === "siege") out += " An der Hauptstadt steht kein Gebäude, das eine Stufe verlieren könnte.";
    const h = e.horden === 1;
    out += e.art === "siege" ? ` Der Turm wächst um ${e.turmPlus}, ${h ? "die Horde kommt" : "die Horden kommen"} danach in den Vorrat.`
      : ` Der Turm wächst um ${e.turmPlus}, ${h ? "die Horde bleibt" : "die Horden bleiben"} stehen.`;
    return out;
  },
  kampfFaelltAus: (e, A, c) => `${gross(c.aufDat(e.f))} steht keine Horde mehr: ${e.art === "siege" ? "Der Überfall auf die Hauptstadt" : "Der Überfall"} fällt aus.`,
  erlischt: (e, A, c) => `Am Rundenende steht eine Horde ${listeDe(e.an.map(c.aufDat))}: Das Leuchtfeuer ${c.ecke(e.fs)} erlischt. `
    + `Jeder kann es im eigenen Zug für 1 Holz neu entzünden. Jetzt ${c.brennt(e.brennen)}.`,
  turm(e) {
    const rest = e.max - e.t;
    let out = `Der Turm des Schattens hat jetzt ${e.t} von ${e.max} Segmenten.`;
    out += rest <= 0 ? " Er ist vollendet." : ` Noch ${rest === 1 ? "1 Segment" : `${rest} Segmente`}, dann ist er vollendet und alle verlieren.`;
    if (e.stark && rest > 0) out += ` Ab jetzt hat jede Horde Stärke ${e.je}.`;
    return out;
  },
  startspieler(e, A, c, l) {
    if (e.regel !== "ruhm") return `Die Startspieler-Fahne wandert reihum weiter: ${A} ist in der nächsten Runde Startspieler.`;
    const gleich = e.ruhm.map((x, i) => [i, x]).filter(([, x]) => x === e.lo).map(([i]) => i);
    let out = `Neuer Startspieler wird, wer am wenigsten Ruhm hat: ${A} mit ${e.lo} Ruhm (Ruhm-Leiste: ${e.ruhm.map((x, i) => `${c.name(i)} ${x}`).join(", ")}).`;
    const andere = gleich.filter((i) => i !== l.seat);
    if (gleich.length > 1) out += ` Gleichstand mit ${listeDe(andere.map(c.name))}: Dann wird es der erste Gleichstehende links vom bisherigen Startspieler ${c.name(e.alt)} (der bisherige selbst kommt als Letzter in Frage).`;
    return `${out} ${A} bekommt die Fahne und würfelt als Nächstes.`;
  },
  ende(e, A, c) {
    const rang = e.ranking.map(([s, p]) => `${c.name(s)} ${p}`).join(", ");
    if (e.grund === "turm") return `Der Turm des Schattens hat ${e.turm} von ${e.max} Segmenten und ist vollendet: Der Schatten siegt, alle verlieren, egal wie viel Ruhm sie haben (${rang}).`;
    const head = e.grund === "abbruch" ? `Nach ${e.r} Runden wird abgebrochen und gewertet wie am Ende der Reise.`
      : "Die Gefährten haben den Feuerberg erreicht, und die Runde ist zu Ende gespielt.";
    let out = e.held
      ? `${head} Der Turm ist nicht vollendet: Alle haben gemeinsam den Schatten besiegt. Held des Westens wird, wer am meisten Ruhm auf der Leiste hat `
        + `(Gleichstand: mehr Rohstoffe, sonst teilen sie sich den Titel): ${rang}.`
      : `${head} Es gewinnt, wer am meisten Ruhm auf der Leiste hat (Gleichstand: mehr Rohstoffe, sonst gemeinsam): ${rang}.`;
    const top = e.ranking[0];
    const gleich = e.ranking.filter((x) => x[1] === top[1]);
    if (gleich.length > 1) out += ` Gleich viel Ruhm haben ${listeDe(gleich.map((x) => c.name(x[0])))}, darum zählen die Rohstoffe: ${gleich.map((x) => `${c.name(x[0])} ${x[2]}`).join(", ")}.`;
    if (e.held) out += e.winners.length > 1 ? ` Helden des Westens sind ${listeDe(e.winners.map(c.name))}.` : e.winners.length ? ` Held des Westens ist ${c.name(e.winners[0])}.` : "";
    else out += e.winners.length > 1 ? ` Es gewinnen ${listeDe(e.winners.map(c.name))} gemeinsam.` : e.winners.length ? ` Es gewinnt ${c.name(e.winners[0])}.` : "";
    return out;
  },
};

// ---------------------------------------------------------------- Englisch: Wörter
const TER_EN = { ...TERRAIN_EN };
const EIN_EN = { wald: "a forest", feld: "fields", weide: "a pasture", huegel: "hills", gebirge: "mountains", wasser: "water", ruine: "the ruin" };
const LEVEL = { 1: "farm", 2: "castle", 3: "fortress" };
const RI_EN = ["east", "northeast", "north", "northwest", "west", "southwest", "south", "southeast"];

function listeEn(a) {
  a = a.filter((x) => x !== "" && x != null);
  return a.length <= 1 ? a[0] ?? "" : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`;
}
const plEn = (n, eins, mehr) => (Number(n) === 1 ? eins : mehr);

const HELD_EN = {
  karten: ["the Master of Cards", "draw 3 fate cards and keep 2, +1 fame"],
  zauberin: ["the Diviner", "right after the rune roll, turn up to 2 dice to any side, +2 fame"],
  tueftler: ["the Tinkerer", "build a castle on your own farm for 1 stone and 1 ore"],
  planerin: ["the Planner", "on their turn, take 2 dice instead of 1 and harvest both (only while 2 dice are left)"],
  hueterin: ["the Warden of Nature", "send one horde (figure or ring) back to the Tower Gate, +1 fame"],
  gelehrter: ["the Scholar", "“Pax vobiscum”: the Eyes of one rune roll do not count, +2 fame"],
  wegweiserin: ["the Pathfinder", "as the journey of the round, move the Companions 1 space, free, with fame, no tower +1, not onto space 10"],
  chronist: ["the Chronicler", "a horde within 3 hexes of the capital goes back to the supply, +1 fame"],
};
const heldEn = (id) => (HELD_EN[id] ? `${HELD_EN[id][0]} (${HELD_EN[id][1]})` : id);
const KACHEL_EN = { wald: ["forest", "forests"], feld: ["fields", "fields"], weide: ["pasture", "pastures"], huegel: ["hills", "hills"],
  gebirge: ["mountains", "mountains"], wasser: ["water", "water"], ruine: ["ruin", "ruins"] };

function hilfenEn(s) {
  const h = {
    name: (i) => s.seats?.[i]?.name ?? "?",
    liste: listeEn,
    ter: (k) => (k ? TER_EN[k] ?? k : "mist"),
    feld: (k) => (k ? TER_EN[k] ?? k : "mist"),
    the: (k) => `the ${k ? TER_EN[k] ?? k : "mist"}`,
    tor: (g) => GATE_EN[g] ?? g,
    wuerfel: (f) => (f === "auge" ? "Eye" : TER_EN[f] ?? f),
    lvl: (n) => LEVEL[n] ?? "",
    res: (r, n) => resEn(r, n) ?? "",
    kosten: (o) => listeEn(Object.entries(o || {}).filter(([, n]) => n > 0).map(([r, n]) => `${n} ${resEn(r, n)}`)),
    on: (k) => `on ${h.the(k)}`,
    ort: (fs) => (fs.length >= 2 ? `between ${h.ortName(fs[0])} and ${h.ortName(fs[1])}` : `at the map edge ${h.on(fs[0])}`),
    ortName: (k) => (k === "hauptstadt" ? "the capital" : h.ter(k)),
    ecke: (fs) => `at the corner of ${listeEn(fs.map(h.ortName))}`,
    brennt: (n) => (n === 0 ? "no beacon is burning" : n === 1 ? "1 beacon is burning" : `${n} beacons are burning`),
    horden: (n) => (n === 1 ? "1 horde" : `${n} hordes`),
    einsatz: (e) => {
      const t = [];
      if (e.erz) t.push(`${e.erz} ore`);
      if (e.pferde) t.push(`${e.pferde} ${resEn("pferde", e.pferde)}${e.hv === 2 ? " (as Humans, each horse gives 2 defense)" : ""}`);
      const z = listeEn(t);
      return z && e.verst ? `pays ${z} and plays Allies (+3)` : z ? `pays ${z}` : e.verst ? "plays Allies (+3)" : "pays nothing";
    },
    ruf: (e) => (e.ruf && e.brennen < e.ruf ? ` When ${e.ruf} burn at once, the Call of the Beacons sounds (once per game).` : ""),
    hat: (volk) => (s.seats || []).some((x) => x.people === volk),
  };
  return h;
}

// ---------------------------------------------------------------- Englisch: Erklärungen je Art
const EN = {
  aufbau(e, A, c) {
    const held = { zwei: "Each player draws 2 heroes and keeps 1, the other leaves the game", eins: "With 5 players, each draws just 1 hero",
      team: "In the team game, each person draws 1 hero, both belong to the color", fest: "Everyone plays their fixed hero" }[e.helden]
      || "Everyone gets a hero";
    let turm = `The enemy is the Tower of Shadow: it starts with ${e.turm} segments, and at ${e.max} it is complete and everyone loses. `
      + `So it stands half built from the start, a visible threat: only ${e.max - e.turm} are missing. `
      + (e.entfaellt ? "It grows when a raid is lost " : "It grows when a raid is lost, when an Eye needs a horde or ring that is no longer in the supply, ")
      + "and when the Companions enter a space with an Eye on the journey track; once per game the Call of the Beacons takes 1 segment away. ";
    if (e.klein != null && e.gross != null && e.klein !== e.gross) {
      turm += `With 2 or 3 players it starts with ${e.klein}, with 4 or 5 with ${e.gross}: more players bring more resources against the hordes, `
        + "so it stays about as tight. ";
    }
    if (e.teamPlus) turm += `In the team game it gets ${e.teamPlus === 1 ? "1 more segment" : `${e.teamPlus} more segments`} (each color counts as one player). `;
    if (e.ersteMinus) turm += `In the first game it starts ${e.ersteMinus === 1 ? "1 segment" : `${e.ersteMinus} segments`} lower. `;
    const neu = (e.team ? `New team game with ${e.n} colors, two people playing together on each` : `New game with ${e.n} players`)
      + (e.ersteMinus ? " (first game)" : "");
    const ziel = e.sieg ? "then everyone wins together, and whoever has the most fame becomes Hero of the West" : "then whoever has the most fame wins";
    return `${neu}. Goal: the Companions travel along the journey track to space 10 at the Fire Mountain; ${ziel}. `
      + (e.uhr ? "If nobody travels in a round, they move on 1 space by themselves at the end of the round. " : "")
      + turm
      + (e.ohneVoelker ? "This game is played without peoples (first game): nobody has a people's ability. " : "")
      + `${held}. Heroes lie face up in front of their owner; each works once per game. `
      + `Then everyone places a starting farm in turn order, and a second one in reverse order${e.startRuhm ? "; each gives 1 fame" : ""}. `
      + (e.start !== undefined && e.start !== null ? `${c.name(e.start)} starts (at the table: the youngest) and takes the first-player flag.` : "");
  },
  heldWahl(e, A) {
    const k = "The hero card lies face up in front of its owner and works once per game; then it is turned sideways.";
    switch (e.art) {
      case "zwei": return `${A} drew 2 heroes and keeps ${heldEn(e.ids[0])}. The other one leaves the game. ${k}`;
      case "eins": return `With 5 players, each draws just 1 hero: ${A} gets ${heldEn(e.ids[0])}. ${k}`;
      case "team": return `In the team game, each person draws 1 hero, both belong to the color: ${A} has ${listeEn(e.ids.map(heldEn))}. `
        + "The hero cards lie face up; each works once per game (whichever of the two is taking the turn); then it is turned sideways.";
      default: return `${A} plays with ${plEn(e.ids.length, "the fixed hero", "the fixed heroes")}: ${listeEn(e.ids.map(heldEn))}. ${k}`;
    }
  },
  heimatland(e) {
    const n = ARTEN_REIHE.reduce((a, k) => a + (e.gezogen[k] || 0), 0) + e.wasser;
    const liste = ARTEN_REIHE.map((k) => {
      const z = (e.gezogen[k] || 0) + (k === "wasser" ? e.wasser : 0);
      return z ? `${z} ${KACHEL_EN[k][z === 1 ? 0 : 1]}` : "";
    });
    const dose = e.gross
      ? `With 4 or 5 players, all ${e.dose} mist tokens (terrain symbol on the underside) are shuffled face down on the table, `
        + "and every space is used, including those for 4–5 players only. "
      : `With 2 or 3 players, only ${e.dose} of the ${e.alle} mist tokens are shuffled face down on the table (3 each of forest, fields, pasture, hills `
        + "and mountains, 1 water and the ruin); the other tiles and tokens stay in the box, the spaces for 4–5 players only stay empty. ";
    const ruine = e.ruine
      ? `The ruin may not go into the homeland: it was flipped ${e.ruine === 1 ? "once" : `${e.ruine} times`}, went back face down under the others, and another token was flipped. `
      : "Only the ruin may not go into the homeland (back face down under the others, flip another); it did not come up this time. ";
    return "The map is laid out (setup 1 to 6 on the boards). The capital lies in the middle of the homeland in the west, "
      + "in the far east the Shadowland with North Gate, Tower Gate and South Gate with the Fire Mountain, the mist in between. "
      + dose
      + (e.wasser ? "The Coastfolk's water is already there, its token removed from the game. " : "")
      + `For each free homeland space (${e.plaetze - e.wasser}) one token is flipped: it shows the terrain, `
      + "the matching tile goes on the space, then the token is removed from the game. This is pure chance; it doesn't matter who flips. "
      + ruine
      + (e.schatz ? `Likewise ${plEn(e.schatz, "1 treasure token went", `${e.schatz} treasure tokens went`)} back. ` : "")
      + `Now ${n} homeland tiles lie there: ${listeEn(liste)}. `
      + `The remaining ${e.rest} tokens are shuffled face down, one on each of the ${e.nebel} mist spaces. `
      + "Nobody knows which terrain lies beneath until someone builds a farm there (exploring). "
      + `Finally the tower with ${e.turm} segments goes on the Tower Gate, the tower spire with the Eye faces the North Gate, `
      + "the Companions stand on START of the journey track, and the fate cards are shuffled.";
  },
  zugEnde(e, A, c) {
    const w = e.dice.map(c.wuerfel);
    if (e.next === null) {
      const ernte = w.length ? `${plEn(w.length, "the remaining die", `the ${w.length} remaining dice`)} (${listeEn(w)}) ${plEn(w.length, "harvests", "harvest")} for everyone`
        : "no die is left, so there is no shared harvest";
      return `${A} ends the turn. Everyone has had a turn, now comes the end of the round: ${ernte}; then the hordes move, `
        + "followed by the raids, the journey clock and choosing the new first player."
        + (e.ende ? " The Companions have reached the Fire Mountain: after this end of round the game is over." : "");
    }
    const B = c.name(e.next);
    const darf = `${B} may then build, trade, travel, play fate cards and use their hero as often as they like, in any order.`;
    if (e.planerin) return `${A} ends the turn. Now it's ${B}'s turn, but ${B} already took dice with the Planner this round and does not harvest again. ${darf.replace(" then", "")}`;
    if (!w.length) return `${A} ends the turn. Now it's ${B}'s turn. No die is left, so ${B} takes 1 resource of their choice from the supply instead. ${darf}`;
    return `${A} ends the turn. Now it's ${B}'s turn: ${B} takes ${w.length === 1 ? `the last die (${w[0]})` : `1 of the ${w.length} remaining dice (${listeEn(w)})`} `
      + `and harvests. ${darf}`;
  },

  wasser: (e, A, c) => `${A} plays the Coastfolk and places 1 water tile on a free homeland space during setup. `
    + (e.ernte !== false ? "Coastfolk buildings at the water yield 1 more with their own die, and with a building at the water they trade 2 : 1 with the supply."
      : [e.fischer ? "Fishers: with their own die, water counts for their buildings as the rolled terrain (farm 1, castle 2, fortress 3)." : "",
        e.wasserPlus ? `With their own die, each of their buildings at the water yields ${e.wasserPlus} resource of the rolled kind.` : "",
        e.hafen !== false ? "Harbor: with a building at the water, they trade 2 : 1 with the supply." : ""].filter(Boolean).join(" "))
    + (c.kosten(e.start) ? ` They also get ${c.kosten(e.start)}.` : ""),
  startGehoeft(e, A, c) {
    if (!e.zweites) {
      return `${A} places their first starting farm ${c.ort(e.fs)}. Starting farms stand on edges between two homeland tiles (the capital counts) and `
        + `${e.ruhm ? `give 1 fame like every farm (fame track now at ${e.leiste})` : "give no fame"}.`;
    }
    return `${A} places their second starting farm ${c.ort(e.fs)}; the second round runs in reverse order. It yields 1 resource per terrain hex it touches: `
      + `${c.kosten(e.ertrag) || "none here, the capital and water yield nothing"}.${e.ruhm ? ` +1 fame (fame track now at ${e.leiste}).` : ""}`;
  },
  wurf(e, A, c, l) {
    let formel = "5 dice, 6 with 5 players";
    if (e.n !== (e.sp >= 5 ? 6 : 5)) {
      const b = e.n === Math.min(6, Math.max(e.min, e.sp + 1)) ? e.sp + 1 : e.basis;
      formel = b === e.sp + 1 ? `number of players ${e.sp} + 1 = ${b}` : `with 2 players ${b}`;
      if (e.min > b) formel += `, but at least ${e.min}`;
      if (e.n < Math.max(e.min, b)) formel += `, at most ${e.n}`;
    }
    const augen = e.augen === 0 ? "No Eye: no new horde appears this round."
      : e.augen === 1 ? "1 Eye: the tower spire is about to turn to the next gate, and a horde appears there."
        : `${e.augen} Eyes: the spire is about to turn ${e.augen} times to the next gate, and each time a horde appears there.`;
    return `Round ${l.r}: ${A} is first player and rolls ${e.n} rune dice (${formel}). Result: ${e.faces.map(c.wuerfel).join(", ")}. `
      + `${augen} Then, in turn order from ${A}, everyone takes 1 die and harvests${e.plus ? ` (${e.plus} resource more if it yields anything)` : ""}; `
      + (e.trost ? "if it yields nothing or no die is left, take any 1 resource from the supply; " : "")
      + "at the end of the round everyone harvests the remaining dice.";
  },
  zauberin(e, A, c) {
    const n = e.aend.length;
    const was = n ? `turns ${n === 1 ? "1 die" : `${n} dice`}: ${e.aend.map(([a, b]) => `${c.wuerfel(a)} → ${c.wuerfel(b)}`).join(", ")}` : "turns no die";
    return `${A} calls the Diviner (once per game, right after the rune roll) and ${was}.${e.ruhm ? ` +${e.ruhm} fame.` : ""}`;
  },
  gelehrter: (e, A) => `${A} calls the Scholar (once per game): “Pax vobiscum!” ${e.n === 1 ? "The Eye of this roll does" : `The ${e.n} Eyes of this roll do`} `
    + `not count: the spire stays put and no horde appears. +${e.ruhm} fame.`,
  auge(e, A, c) {
    const pre = e.i ? (e.n > 1 ? `Eye ${e.i} of ${e.n}: ` : "The Eye: ") : "";
    const dreh = `the tower spire turns clockwise from the ${c.tor(e.von)} to the ${c.tor(e.nach)}${e.nach === TURM_TOR ? " (looking west over the land)" : ""}`;
    const satz = pre ? `${pre}${dreh}` : gross(dreh);
    const folge = e.entfaellt ? "that horde is lost, with no further effect (the tower does not grow)." : "the tower grows by 1 instead.";
    if (e.leer && e.teil === "ring") return `${satz}. A horde already stands there, so another would go under it as a ring, but all ${e.max} rings are in use: ${folge}`;
    if (e.leer && e.teil === "figur") return `${satz}. The gate is free, but all ${e.max} horde figures are already on the board: ${folge}`;
    if (e.leer) return `${satz}. All ${e.max} hordes are already on the board; with none left in the supply, the tower grows by 1 instead.`;
    if (e.teil) {
      const was = e.teil === "ring" ? `A horde already stands there: another one joins it as a ring under the figure (now ${c.horden(e.dort)}, they add up).`
        : "The gate is free: a horde appears there (one figure).";
      return `${satz}. ${was} The supply still has ${e.figuren} ${plEn(e.figuren, "figure", "figures")} and ${e.ringe} ${plEn(e.ringe, "ring", "rings")}; `
        + (e.entfaellt ? "if the piece needed is missing, that horde is lost." : "if the piece needed is missing, the tower grows instead.");
    }
    const dort = e.dort > 1 ? ` There are now ${e.dort} hordes there; they add up (one figure, a ring under it for each extra one).` : "";
    const vorrat = e.vorrat === 0 ? " Now no horde is left in the supply: as long as none comes back, each further Eye makes the tower grow instead."
      : ` ${e.vorrat} of ${e.max} hordes ${e.vorrat === 1 ? "is" : "are"} left in the supply.`;
    return `${satz}. A horde appears there.${dort}${vorrat}`;
  },
  planerin(e, A, c) {
    const w = e.faces.map(c.wuerfel);
    if (e.imZug) {
      return `${A} uses the Planner (once per game): this turn, ${A} takes `
        + `${w.length === 1 ? `the last die (${w[0]}) and harvests it` : `2 dice instead of 1 (${listeEn(w)}) and harvests both, each like their own die`}.`;
    }
    return `${A} uses the Planner (once per game): before the first player's turn, ${A} takes `
      + `${w.length === 1 ? `the ${w[0]} die and harvests it` : `2 dice (${listeEn(w)}) and harvests both`}. In their own turn, ${A} takes no die.`;
  },
  zugOhneWuerfel: (e, A) => `It's ${A}'s turn, but ${A} already took dice with the Planner this round: no die, straight on to building, trading or traveling.`,
  elben: (e, A, c) => `${A} plays the Elves: they may turn ${e.planerin ? "each of the two dice taken with the Planner" : "the die they took"} `
    + `to any terrain for ${e.kosten} grain, here ${c.wuerfel(e.von)} → ${c.wuerfel(e.nach)}.`,
  ernte(e, A, c) {
    const T = c.ter(e.face);
    const R = c.res(e.res, 2);
    const intro = { wuerfel: `${A} takes the ${T} die and harvests.`, planerin: `${A} harvests the ${T} die (Planner).`,
      karte: `${A} plays Rich Harvest and harvests the ${T} die a second time.` }[e.quelle] || `${A} harvests the ${T} die.`;
    const regel = `The ${T} die yields ${R}: each building yields per adjacent hex of that terrain farm 1, castle 2, fortress 3`
      + `${e.fischer ? " (for the Coastfolk, water counts as that terrain: Fishers)" : ""}`
      + `${e.plus ? `; if your own die yields anything, you get ${e.plus} more` : ""}.`;
    const trost = ` If your own die yields nothing, you take any 1 resource from the supply instead (as with no die left): ${A} picks it right away.`;
    if (!e.soll) {
      const warum = e.geb ? `None of ${A}'s buildings is next to a ${T} hex${e.fischer ? " or water" : ""}` : `${A} has no building on the board`;
      return `${intro} ${regel} ${warum}, so there is nothing.${e.trost ? trost : e.quelle === "karte" ? " (Rich Harvest only repeats what the die yields.)" : ""}`;
    }
    const teile = e.teile.map((t) => {
      let x = `the ${c.lvl(t.lvl)} ${c.ort(t.fs)} yields ${t.basis}${t.wasser ? ` (${t.wasser} of it for the water)` : ""}`;
      if (t.haupt) x += ` + ${t.haupt} (capital)`;
      if (t.kueste) x += ` + ${t.kueste} (Coastfolk at the water)`;
      return x;
    });
    const plus = e.plus ? `, plus ${e.plus} because it is their own die` : "";
    let out = `${intro} ${regel} For ${A}, ${listeEn(teile)}${plus}: ${e.soll} ${c.res(e.res, e.soll)} in total.`;
    if (e.ist < e.soll) {
      out += e.ist ? ` But only ${e.ist} ${plEn(e.ist, "was", "were")} left in the supply; what's not in the supply doesn't exist.`
        : ` But the supply of ${R} is empty; what's not in the supply doesn't exist.${e.trost ? trost : ""}`;
    }
    return out;
  },
  rohstoffWahl: (e, A, c) => (e.grund === "ertrag"
    ? `The die yielded nothing for ${A}: instead, take any 1 resource from the supply (only kinds that are still there). `
    : "All dice are taken: whoever gets none takes any 1 resource from the supply instead. ")
    + `${A} chooses 1 ${c.res(e.res, 1)}${e.ist ? "" : ", but there is none left in the supply"}.`,
  gemeinsam(e, A, c) {
    if (!e.dice.length) return "End of round: all dice were taken, so there is no shared harvest.";
    const teile = e.dice.map((f, i) => {
      const r = D.TERRAIN_RES[f];
      const xs = e.teile.filter((t) => t[0] === i)
        .map(([, seat, soll, ist]) => `${c.name(seat)} ${ist} ${c.res(r, ist)}${ist < soll ? ` (instead of ${soll}, supply empty)` : ""}`);
      return `${gross(c.wuerfel(f))}: ${xs.length ? listeEn(xs) : "nobody, no building is next to it"}`;
    });
    const kueste = (e.kuesteBonus ?? c.hat("kuestenvolk")) ? " The Coastfolk bonus does not apply here, only with their own die." : "";
    return `End of round, shared harvest: everyone harvests the remaining dice in turn order from the first player, `
      + `${e.plus ? "just like with their own die, but without the bonus for an own die" : "just like with their own die"}.${kueste} ${teile.join(". ")}.`;
  },
  gehoeft(e, A, c) {
    const wo = e.neu ? `${A} had no building left on the board, so it could go between two homeland tiles again.`
      : "New farms go on free edges of hexes where you already have buildings (your realm), never at the Shadowland.";
    const rest = e.rest === 0 ? `That uses up all ${D.PIECES.gehoeft} farms.` : `${A} has ${e.rest} ${plEn(e.rest, "farm", "farms")} left.`;
    return `${A} builds a farm ${c.ort(e.fs)} for ${c.kosten(e.kosten)}: +1 fame, the fame track is now at ${e.leiste}. ${wo} ${rest}`;
  },
  erkunden(e, A) {
    let out = `${A} builds at an edge next to the mist: first they pay, then the mist token is flipped, and it shows ${EIN_EN[e.kind] || TER_EN[e.kind]}`
      + `${e.schatz ? " with a treasure" : ""}. That tile is placed there${e.horde ? " (under the horde standing there)" : ""}, and the token is removed from the game. `
      + "Exploring is binding: the farm stays on this edge, even if the tile yields nothing.";
    if (e.kind === "ruine" && e.ruinLohn !== false) out += ` Whoever finds the ruin gets 1 fame${e.karte ? " and 1 fate card" : " (no fate cards are left)"}.`;
    if (e.kind === "ruine" && e.ruinLohn === false) out += " The ruin yields no resource, like water.";
    if (e.fuersErkunden) out += e.karte ? ` Whoever explores draws 1 fate card: ${A} gets one (face down, at most 3 in hand).` : " Whoever explores draws 1 fate card, but the deck is empty.";
    if (e.schatz) out += ` Treasure: ${A} will choose any 1 resource.`;
    return out;
  },
  schatz: (e, A, c) => `Treasure: ${A} takes any 1 resource from the supply and picks 1 ${c.res(e.res, 1)}${e.ist ? "" : ", but there is none left in the supply"}.`,
  ausbau(e, A, c) {
    const burg = e.to === 2;
    const rab = e.rabatt ? `, as Dwarves ${e.rabatt} stone less` : "";
    return `${A} puts ${burg ? "a castle on their own farm" : "a fortress on their own castle"} ${c.ort(e.fs)} (${c.kosten(e.kosten)}${rab}): `
      + `+1 fame, the fame track is now at ${e.leiste}. `
      + (burg ? "A castle harvests 2 per matching hex and defends 1 in raids there." : "A fortress harvests 3 per matching hex and defends 2 in raids there.");
  },
  leuchtfeuer(e, A, c) {
    const rab = e.rabatt ? `, as Dwarves ${e.rabatt} stone less` : "";
    if (e.immer) {
      const wie = e.karte ? `plays Watchfire and builds a beacon without wood ${c.ecke(e.fs)} (${c.kosten(e.kosten)}${rab})`
        : `builds a beacon ${c.ecke(e.fs)} (${c.kosten(e.kosten)}${rab})`;
      return `${A} ${wie}: +2 fame, the fame track is now at ${e.leiste}. Beacons stand on corners of three tiles at a mountain or hill hex of your realm `
        + "(at most one per mountain or hill), always burn and belong to nobody: in raids at their three hexes and their neighbors everyone may pay, "
        + `not just the owners of buildings there. Now ${e.gebaut === 1 ? "1 beacon stands" : `${e.gebaut} beacons stand`}.`
        + (e.ruf && e.gebaut < e.ruf ? ` Whoever builds the ${e.ruf === 3 ? "third" : `${e.ruf}th`} one sounds the Call of the Beacons (once per game).` : "");
    }
    return `${A} builds a beacon ${c.ecke(e.fs)} (${c.kosten(e.kosten)}${rab}): +2 fame, the fame track is now at ${e.leiste}. `
      + "Beacons stand on corners of three tiles at a mountain or hill hex of your realm (at most one per mountain or hill) and belong to nobody: "
      + "while one burns, everyone may pay in raids at its three hexes and their neighbors, not just the owners of buildings there. "
      + `Now ${c.brennt(e.brennen)}.${c.ruf(e)}`;
  },
  entzuenden: (e, A, c) => `${A} relights the beacon ${c.ecke(e.fs)} for 1 wood; anyone may do that on their turn. Now ${c.brennt(e.brennen)}.${c.ruf(e)}`,
  ruf: (e, A) => (e.weg === null ? `Call of the Beacons! The ${e.n === 3 ? "third" : `${e.n}th`} beacon stands, which happens only once per game: `
    + `the allies come to help, the tower loses ${e.minus} ${plEn(e.minus, "segment", "segments")} (now ${e.turm}), and ${A}, who built it, gains `
    + (e.zusaetzlich ? `${e.ruhm} extra fame (on top of the 2 for the beacon).` : `${e.ruhm} fame.`)
    : `Call of the Beacons! ${e.n} beacons burn at once; this happens only once per game. All hordes on hexes at burning beacons go back to the supply `
    + `(${e.weg ? (e.weg === 1 ? "1 horde" : `${e.weg} hordes`) : "there were none"}), and the tower loses ${e.minus} ${plEn(e.minus, "segment", "segments")} `
    + `(now ${e.turm}). ${A} built or lit the last one and gains ${e.ruhm} fame.`),
  reise(e, A, c) {
    let out;
    if (e.wie === "wegweiserin") {
      out = `${A} uses the Pathfinder (once per game): the Companions move to space ${e.feld} of the journey track at no cost, with fame `
        + `(+${e.ruhm}, fame track now at ${e.leiste}) and without danger. This is the journey of this round.`;
    } else if (e.wie === "eilbote") {
      out = `With the Messenger, the Companions move to space ${e.feld} at once: ${A} pays ${c.kosten(e.kosten)} and gains +${e.ruhm} fame `
        + `(fame track now at ${e.leiste}). The Messenger does not count as the journey of the round.`;
    } else {
      out = `${A} pays ${c.kosten(e.kosten)} and moves the Companions to space ${e.feld} of the journey track: +${e.ruhm} fame (fame track now at ${e.leiste}). `
        + "At most 1 space per round: nobody else travels until the end of the round (only the Messenger doesn't count).";
    }
    if (e.gefahr) {
      out += " " + ({
        turm: `Space ${e.feld} is a danger space (red): the tower grows by ${e.plus}.`,
        halblinge: `Space ${e.feld} is a danger space, but the Halflings sneak past: the tower does not grow.`,
        deckel: `Space ${e.feld} is a danger space, but the tower already has ${e.turm} of ${e.max} segments: a danger space never completes it, so it does not grow.`,
        weg: `Space ${e.feld} is a danger space, but with the Pathfinder there is no danger.`,
        horde: `Space ${e.feld} is a danger space: the Eye turns on.`,
      }[e.folge] || `Space ${e.feld} is a danger space.`);
    }
    if (e.ziel) {
      out += " The Companions reach the Fire Mountain! The round is played to the end, including the end of the round; "
        + (e.held ? "if the tower is not completed, everyone wins, and whoever has the most fame is Hero of the West." : "then whoever has the most fame wins.");
    }
    return out;
  },
  reiseUhr(e) {
    let out = "End of round, journey clock: nobody travelled this round (the Messenger doesn't count). So the Companions move on by themselves "
      + `to space ${e.feld}, at no cost and without fame.`;
    if (e.gefahr) out += e.deckel ? ` Space ${e.feld} is a danger space, but the tower already has ${e.turm} of ${e.max} segments: a danger space never completes it.`
      : ` Space ${e.feld} is a danger space: the tower grows by ${e.plus}.`;
    if (e.ziel) out += " With that they reach the Fire Mountain: the game ends after this round.";
    return out;
  },
  tausch(e, A, c) {
    let grund;
    if (e.kurs >= e.basis) grund = `That is the normal rate of ${e.basis} : 1 (${e.basis} of a kind for 1).`;
    else {
      const wer = e.haupt && e.kueste ? `${A} has a building at the capital and, as Coastfolk, one at the water`
        : e.haupt ? `${A} has a building at the capital` : e.kueste ? `${A}, as Coastfolk, has a building at the water` : "";
      grund = `The rate is ${e.kurs} : 1 instead of ${e.basis} : 1${wer ? ` because ${wer}` : ""}.`;
    }
    return `${A} trades ${e.kurs} ${c.res(e.gib, e.kurs)} for 1 ${c.res(e.nimm, 1)} with the supply. ${grund}`;
  },
  handel(e, A, c) {
    const B = c.name(e.von);
    const gib = c.kosten(e.gib) || "nothing";
    const nimm = c.kosten(e.nimm) || "nothing";
    return e.ja ? `Trading between players is free (resources for resources), but only with the player whose turn it is: ${B} gives ${A} ${gib} and gets ${nimm} in return.`
      : `${A} declines ${B}'s offer (${gib} for ${nimm}): no trade.`;
  },
  karte(e, A, c) {
    if (e.id === "bann") {
      return e.vorrat ? `${A} plays Banishment on the horde ${c.on(e.von)}: the figure or ring it needs at the Tower Gate is missing, so it goes back to the supply (the tower does not grow).`
        : `${A} plays Banishment: the horde ${c.on(e.von)} must go back to the Tower Gate and start its way to the capital again.`;
    }
    if (e.id === "wachfeuer") {
      return `${A} plays Watchfire: ${e.n === 1 ? "the beacon that was out burns" : `all ${e.n} beacons that were out burn`} again, at no cost. `
        + `Now ${c.brennt(e.brennen)}.${c.ruf(e)}`;
    }
    if (e.id === "handel") return `${A} plays Caravan: trade 1 for 1 with the supply up to 3 times, here ${listeEn(e.swaps.map(([g, t]) => `${c.res(g, 1)} → ${c.res(t, 1)}`))}.`;
    return "";
  },
  held(e, A, c) {
    const vorKampf = e.kampf ? ` This happens before the ${e.kampf === "siege" ? "raid on the capital" : "raid"}`
      + `${e.rest ? `; ${e.rest === 1 ? "1 horde is" : `${e.rest} hordes are`} still there and will be fought` : ""}.` : "";
    switch (e.id) {
      case "karten":
        return `${A} uses the Master of Cards (once per game): draw 3 fate cards, keep 2, the other one goes under the deck. `
          + (e.n === 0 ? "The deck is empty, so there is no card." : e.n < 3 ? `Only ${e.n} ${plEn(e.n, "card was", "cards were")} left in the deck; ${A} keeps ${plEn(e.n, "it", "them")}.` : "Which ones stays hidden.")
          + (e.ruhm ? ` +${e.ruhm} fame.` : "");
      case "tueftler":
        return `${A} uses the Tinkerer (once per game): a castle on their own farm ${c.ort(e.fs)} for ${c.kosten(e.kosten) || "nothing"} `
          + `instead of ${c.kosten(D.COSTS.burg)}. +1 fame, the fame track is now at ${e.leiste}.`;
      case "hueterin":
        if (e.vorrat) {
          return `${A} calls the Warden of Nature (once per game) for the horde ${c.on(e.von)}: the figure or ring it needs at the Tower Gate is missing, `
            + `so it goes back to the supply (the tower does not grow). +${e.ruhm ?? 2} fame.${vorKampf}`;
        }
        return `${A} calls the Warden of Nature (once per game): the horde ${c.on(e.von)} returns to the Tower Gate`
          + `${e.neu ? " (hordes already standing there cannot be chosen)" : ""}. +${e.ruhm ?? 2} fame.${vorKampf}`;
      case "chronist": {
        const weit = e.weit ?? 1;
        const wo = weit <= 1 ? "a horde on or next to the capital"
          : `a horde within ${weit} hexes of the capital (along the hordes' path; the hex next to the capital counts as 1)`;
        const dist = e.dist === 0 ? " (in the capital)" : e.dist ? ` (${e.dist} ${plEn(e.dist, "hex", "hexes")} from the capital)` : "";
        return `${A} calls the Chronicler (once per game): ${wo}, here ${c.on(e.von)}${dist}, goes back to the supply. +${e.ruhm ?? 2} fame.${vorKampf}`;
      }
      default:
        return "";
    }
  },
  ablegen: (e, A) => `${A} has more than ${e.max} fate cards and puts ${e.n === 1 ? "1 card" : `${e.n} cards`} face down under the deck.`,
  ausfall(e, A, c) {
    const stark = e.stark ? ` (from tower ${e.ab}, each horde has strength ${e.je})` : "";
    const fehl = e.need ? `so ${e.need} ${plEn(e.need, "was", "were")} missing. ${A} ${c.einsatz(e)}, ${e.wert} in total.` : "so nothing was missing.";
    return `${A} makes a sally against ${e.horden === 1 ? "the horde" : `the ${e.horden} hordes`} ${c.on(e.f)}: ${c.horden(e.horden)} × strength ${e.je} = ${e.staerke}${stark}. `
      + `${A}'s own castles and fortresses there defend ${e.basis}, ${fehl} That's enough: ${e.horden === 1 ? "the horde goes" : "the hordes go"} back to the supply, `
      + `and ${A} gains 2 fame and 1 fate card.`;
  },
  hordenStart: (e) => "End of round, the hordes move: each horde moves 1 hex along the shortest path toward the capital; all hordes on one hex move together. "
    + (e.tie === "start" ? "If two paths are equally short, the first player chooses."
      : "If two paths are equally short, they go to the hex with the most buildings (farm, castle and fortress count 1 each); if that is tied too, the first player chooses.")
    + (e.ringe ? " When hordes meet on a hex, they add up: the figure of the one joining goes back to the supply, and a ring goes under the figure instead."
      + (e.turm === false ? " If that ring is missing, the joining horde is lost (back to the supply, no further effect)."
        : " If that ring is missing, the joining horde goes back to the supply entirely and the tower grows by 1.")
      + (e.haupt ? " In the capital no rings are needed: the hordes there are counted, raid, and go back to the supply." : "") : ""),
  hordenzug(e, A, c) {
    const wer = e.n > 1 ? `The ${e.n} hordes move together` : "The horde moves";
    const ri = RI_EN[e.ri] ? ` ${RI_EN[e.ri]}` : "";
    let out = `${wer}${ri} from ${c.the(e.von)} to ${c.the(e.nach)}`;
    out += e.ziel ? ". The raid on the capital follows right away." : `, ${e.dist} ${plEn(e.dist, "hex", "hexes")} left to the capital.`;
    if (e.opts && e.grund !== "einzig") {
      const opts = listeEn(e.opts.map(([k, n, r]) => `${c.feld(k)}${RI_EN[r] ? ` to the ${RI_EN[r]}` : ""} (${n} ${plEn(n, "building", "buildings")})`));
      const top = Math.max(...e.opts.map((o) => o[1]));
      const gleich = e.opts.every((o) => o[1] === top);
      const ohneZahl = listeEn(e.opts.map(([k, , r]) => `${c.feld(k)}${RI_EN[r] ? ` to the ${RI_EN[r]}` : ""}`));
      if (e.grund === "gebaeude") out += ` Equally short would be ${opts}; ${e.n > 1 ? "they go" : "it goes"} where the most buildings are.`;
      else if (e.grund === "wahl" && e.tie === "start") out += ` Equally short are ${ohneZahl}: first player ${A} chose.`;
      else if (e.grund === "wahl") {
        out += gleich ? ` Equally short are ${opts}, with the same number of buildings: first player ${A} chose.`
          : ` Equally short are ${opts}; several hexes tie for the most buildings, so first player ${A} chose.`;
      } else if (e.grund === "zufall") out += ` Equally short are ${opts}, without buildings: the destination was drawn at random.`;
    }
    if (e.ringe && e.dazu) out += ` ${e.dazu === 1 ? "1 horde already stands" : `${e.dazu} hordes already stand`} there: they form a stack, `
      + `the figure of the joining horde goes back to the supply, and ${e.n > 1 ? `${e.n} rings go` : "a ring goes"} under the figure instead.`;
    return out;
  },
  ringFehlt: (e, A, c) => `Another horde joins the stack ${c.on(e.f)}, but all ${e.max} rings are in use: the joining horde goes back to the supply `
    + `(${e.dort === 1 ? "1 horde stays" : `${e.dort} hordes stay`} there)`
    + (e.turm === false ? "; it is lost with no further effect, the tower does not grow." : ", and the tower grows by 1 instead."),
  ueberfaelle(e, A, c) {
    const ohne = e.ohne.length ? ` Hordes on hexes without buildings raid nobody: ${listeEn(e.ohne.map(([k, n]) => `${c.feld(k)} (${c.horden(n)})`))}.` : "";
    if (!e.mit.length) return `Raids: no horde stands at a hex with buildings, so there is no raid this round.${ohne}`;
    if (e.auto) {
      return `Raids: hordes attack every hex with buildings (the capital always, it came first), this round ${listeEn(e.mit.map(c.the))}.${ohne}`
        + `${e.mit.length > 1 ? ` One after another, the hexes nearest the capital first${e.wahl ? "; for equally near hexes the first player chooses the order" : ""}.` : ""}`;
    }
    return `Raids: hordes attack every hex with buildings, this round ${listeEn(e.mit.map(c.the))}.${ohne}${e.mit.length > 1 ? " The first player chooses the order." : ""}`;
  },
  ueberfallWahl: (e, A, c) => `${gross(listeEn(e.opts.map(c.the)))} are equally near the capital (${e.dist} ${plEn(e.dist, "hex", "hexes")}): `
    + `first player ${A} chooses the order, ${c.the(e.f)} first.`,
  kampf(e, A, c) {
    const titel = e.art === "siege" ? (e.lohn === false ? "Raid on the capital" : "Siege of the capital") : `Raid on ${c.the(e.f)}`;
    const st = `${c.horden(e.horden)} × strength ${e.je} = ${e.staerke}${e.stark ? ` (from tower ${e.ab}, each horde has strength ${e.je})` : ""}`;
    const teile = [];
    if (e.burgen) teile.push(e.burgen === 1 ? "1 castle (1)" : `${e.burgen} castles (1 each)`);
    if (e.festungen) teile.push(e.festungen === 1 ? "1 fortress (2)" : `${e.festungen} fortresses (2 each)`);
    if (e.haupt) teile.push(`the capital itself (${e.haupt})`);
    const abw = teile.length ? `Defending by themselves: ${listeEn(teile)}, total ${e.basis}${e.burgen || e.festungen ? " (no matter whose buildings they are)" : ""}.`
      : "No castle or fortress defends here by itself.";
    if (e.warum === "reicht") return `${titel}: ${st}. ${abw} That's already enough: nobody has to pay.`;
    const fehlt = e.staerke - e.basis;
    let wer;
    if (!e.zahler.length) {
      wer = e.art === "siege" ? `There is no building at the capital and no ${e.lohn === false ? "" : "burning "}beacon nearby: nobody may pay, `
        + `the ${e.lohn === false ? "raid" : "siege"} is lost.`
        : "Nobody may pay, the raid is lost.";
    } else if (e.lohn === false) {
      const namen = listeEn(e.zahler.map(c.name));
      wer = (e.warum === "alle" ? `At the capital everyone may always pay, even without a building or beacon there: ${namen}.`
        : e.warum === "leuchtfeuer" ? `A beacon stands at this hex or a neighboring one, so everyone may pay: ${namen}.`
          : `The owners of the buildings here may pay: ${namen}.`)
        + (e.zahler.length > 1 ? " In turn order from the first player, each names an amount once, together never more than needed." : "")
        + ` Each ore and each horse counts 1 (Human horses 2, Allies 3) and gives ${e.payFame || 1} fame; Allies give none. Payment is always lost.`
        + ` If it's not enough: tower +${e.turmPlus ?? 1}, and each building here loses a level.`;
    } else {
      const namen = listeEn(e.zahler.map(c.name));
      wer = ({ besitzer: `The owners of the buildings here may pay: ${namen}.`,
        leuchtfeuer: `A burning beacon stands at this hex or a neighboring one, so everyone may pay: ${namen}.`,
        alle: `In a siege everyone may pay: ${namen}.` }[e.warum] || `May pay: ${namen}.`)
        + (e.zahler.length > 1 ? " In turn order from the first player, each names an amount once, together never more than needed." : "")
        + " Each ore and each horse counts 1 (Human horses 2, Allies 3). Payment is always lost.";
    }
    return `${titel}: ${st}. ${abw} ${fehlt} ${plEn(fehlt, "is", "are")} missing. ${wer}`;
  },
  zahlung(e, A, c) {
    if (!e.wert) return e.fehlte > 0 ? `${A} pays nothing (${e.fehlte} still missing).` : `${A} doesn't need to pay anything, the defense is already enough.`;
    return `${A} ${c.einsatz(e)}: ${e.wert} defense (${e.fehlte} ${plEn(e.fehlte, "was", "were")} still missing).`
      + `${e.ruhm ? ` Each resource paid gives fame: +${e.ruhm}, the fame track is now at ${e.leiste}.` : ""}`;
  },
  kampfEnde(e, A, c) {
    const titel = e.art === "siege" ? (e.lohn === false ? "Raid on the capital" : "Siege") : `Raid on ${c.the(e.f)}`;
    const gez = listeEn(e.gezahlt.map(([s, n]) => `${c.name(s)} ${n}`));
    if (e.sieg) {
      let out = `${titel} repelled: ${e.summe} defense against strength ${e.staerke}${gez ? ` (${e.basis} by themselves, paid: ${gez})` : ""}. `
        + `${e.horden === 1 ? "The horde goes" : "The hordes go"} back to the supply.`;
      if (e.lohn === false) return out + (e.gezahlt.length ? " The fame was already given for paying; the victory itself brings nothing." : "");
      if (!e.gezahlt.length) {
        if (e.ruhm1?.length) out += ` With no payment, everyone with a castle or fortress here gains 1 fame: ${listeEn(e.ruhm1.map(c.name))}.`;
      } else {
        out += ` ${listeEn(e.sieger.map(c.name))} paid the most (${e.top}): 2 fame and 1 fate card.`;
        if (e.gleich?.length) out += ` ${listeEn(e.gleich.map(c.name))} paid just as much but came later in turn order: 1 fame.`;
      }
      return out;
    }
    let out = `${titel}: defense failed, ${e.summe} against strength ${e.staerke}.${gez ? ` What was paid (${gez}) is lost anyway${e.lohn === false ? ", but the fame for it stays" : ""}.` : ""}`;
    const v = e.verluste || [];
    const verlust = (x) => `${c.name(x.seat)}'s ${c.lvl(x.von)} `
      + (x.geschont ? "stays (Halflings)" : `${x.nach ? `becomes a ${c.lvl(x.nach)}` : "is destroyed"}${x.null0 ? " (fame already at 0)" : ""}`);
    if (v.length) out += ` Each building at the hex loses a level, and each level costs 1 fame: ${listeEn(v.map(verlust))}.`;
    else if (e.art === "siege") out += " There is no building at the capital that could lose a level.";
    const h = e.horden === 1;
    out += e.art === "siege" ? ` The tower grows by ${e.turmPlus}; then ${h ? "the horde goes" : "the hordes go"} back to the supply.`
      : ` The tower grows by ${e.turmPlus}, and ${h ? "the horde stays" : "the hordes stay"}.`;
    return out;
  },
  kampfFaelltAus: (e, A, c) => `No horde is left ${c.on(e.f)}: the ${e.art === "siege" ? "raid on the capital" : "raid"} is called off.`,
  erlischt: (e, A, c) => `At the end of the round, a horde stands ${listeEn(e.an.map(c.on))}: the beacon ${c.ecke(e.fs)} goes out. `
    + `Anyone may relight it on their turn for 1 wood. Now ${c.brennt(e.brennen)}.`,
  turm(e) {
    const rest = e.max - e.t;
    let out = `The Tower of Shadow now has ${e.t} of ${e.max} segments.`;
    out += rest <= 0 ? " It is complete." : ` ${rest} more ${plEn(rest, "segment", "segments")} and it is complete; then everyone loses.`;
    if (e.stark && rest > 0) out += ` From now on, each horde has strength ${e.je}.`;
    return out;
  },
  startspieler(e, A, c, l) {
    if (e.regel !== "ruhm") return `The first-player flag moves on: ${A} is first player next round.`;
    const gleich = e.ruhm.map((x, i) => [i, x]).filter(([, x]) => x === e.lo).map(([i]) => i);
    let out = `The new first player is whoever has the least fame: ${A} with ${e.lo} (fame track: ${e.ruhm.map((x, i) => `${c.name(i)} ${x}`).join(", ")}).`;
    const andere = gleich.filter((i) => i !== l.seat);
    if (gleich.length > 1) out += ` Tied with ${listeEn(andere.map(c.name))}: then it goes to the first tied player to the left of the previous first player, ${c.name(e.alt)} (who comes last).`;
    return `${out} ${A} gets the flag and rolls next.`;
  },
  ende(e, A, c) {
    const rang = e.ranking.map(([s, p]) => `${c.name(s)} ${p}`).join(", ");
    if (e.grund === "turm") return `The Tower of Shadow has ${e.turm} of ${e.max} segments and is complete: the Shadow wins and everyone loses, no matter how much fame they have (${rang}).`;
    const head = e.grund === "abbruch" ? `The game is stopped after ${e.r} rounds and scored as at the end of the journey.`
      : "The Companions have reached the Fire Mountain, and the round has been played to the end.";
    let out = e.held
      ? `${head} The tower is not complete: together, everyone has defeated the Shadow. Whoever has the most fame on the track becomes Hero of the West `
        + `(tie: more resources, otherwise they share the title): ${rang}.`
      : `${head} Whoever has the most fame on the track wins (tie: more resources, otherwise shared): ${rang}.`;
    const top = e.ranking[0];
    const gleich = e.ranking.filter((x) => x[1] === top[1]);
    if (gleich.length > 1) out += ` ${listeEn(gleich.map((x) => c.name(x[0])))} have the same fame, so resources count: ${gleich.map((x) => `${c.name(x[0])} ${x[2]}`).join(", ")}.`;
    if (e.held) out += e.winners.length > 1 ? ` ${listeEn(e.winners.map(c.name))} share the title Hero of the West.` : e.winners.length ? ` ${c.name(e.winners[0])} is Hero of the West.` : "";
    else out += e.winners.length > 1 ? ` ${listeEn(e.winners.map(c.name))} share the win.` : e.winners.length ? ` ${c.name(e.winners[0])} wins.` : "";
    return out;
  },
};

// ---------------------------------------------------------------- Schnittstelle
/** Hat dieser Eintrag des Verlaufs eine Erklärung? */
export const istErklaerung = (l) => !!l?.erkl?.k;

/** Erklärung eines Verlaufseintrags ({r, seat, erkl}) als Text. s: Spielstand oder Sicht (für Namen und Völker).
 *  lang: "de" | "en". Unbekannte Arten ergeben "". opt.streng: Fehler weiterwerfen (Prüfskript), sonst "". */
export function erklaerText(l, s, lang = "de", opt = {}) {
  const e = l?.erkl;
  if (!e?.k) return "";
  const en = lang === "en";
  const f = (en ? EN : DE)[e.k];
  if (!f) return "";
  try {
    const c = en ? hilfenEn(s) : hilfenDe(s);
    const A = l.seat !== null && l.seat !== undefined ? c.name(l.seat) : "";
    return f(e, A, c, l) || "";
  } catch (err) {
    if (opt.streng) throw err;
    return "";
  }
}

/** Alle Arten, die es gibt (für das Prüfskript) */
export const ARTEN = Object.keys(DE);
