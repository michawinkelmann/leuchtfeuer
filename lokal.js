// Leuchtfeuer im Browser ohne Server (GitHub Pages): ein Spielraum im Speicher, der dieselben Nachrichten
// versteht wie server/index.js (join, setBot, botDelay, schritt, weiter, act, hint). Alle Menschen-Plätze spielen an
// diesem Gerät. „Schritt für Schritt“ (schritt): Bots ziehen erst, wenn jemand „Weiter“ schickt.
import * as E from "./shared/engine.js";
import { botAction, runBots, ersatzZug } from "./shared/bot.js";

const SPEICHER = "leuchtfeuer-lokal";

export function gespeichert() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER) || "null");
    return d && d.state && !d.state.over ? d : null;
  } catch {
    return null;
  }
}

export function vergessen() {
  try {
    localStorage.removeItem(SPEICHER);
  } catch { /* kein Speicher */ }
}

/** opt.team: Teamspiel (2–4 Farben, seats[i].persons); opt.erste: erste Partie (ohne Völker, Turm 1 Segment niedriger) */
export function neuesSpiel(seats, startSeat = 0, opt = {}) {
  return E.createGame({ seats, startSeat, personal: false, team: !!opt.team, erstePartie: !!opt.erste, ohneVoelker: !!opt.erste });
}

// -> Objekt mit socket(): ein Ersatz für den WebSocket in game.js
export function lokalerRaum(state, botDelay = 700, schritt = false) {
  const room = { state, botDelay, schritt: !!schritt, hoerer: new Set(), pumping: false, lastPending: null, botTries: 0 };

  const plaetze = () => room.state.seats.map((x, i) => (x.bot ? null : i)).filter((i) => i !== null);
  const claims = () => Object.fromEntries(plaetze().map((i) => [i, "lokal"]));

  function speichern() {
    try {
      if (room.state.over) localStorage.removeItem(SPEICHER);
      else localStorage.setItem(SPEICHER, JSON.stringify({ state: room.state, botDelay: room.botDelay, schritt: room.schritt, saved: Date.now() }));
    } catch { /* voll oder gesperrt: dann eben ohne Fortsetzen */ }
  }

  const botAmZug = (s) => !s.over && s.pending && s.seats[s.pending.seat].bot;

  function senden() {
    speichern();
    const seats = plaetze();
    const msg = { type: "state", game: "lokal", title: "Leuchtfeuer", seats, claims: claims(), botDelay: room.botDelay,
                  schritt: room.schritt, wartet: room.schritt && !!botAmZug(room.state), state: E.view(room.state, seats) };
    for (const h of room.hoerer) h(msg);
  }

  function botEinmal(s) {
    // Ersatzzug wie im Server, falls der Bot einen ungültigen Zug vorschlägt
    const before = s.pending;
    runBots(s, (i) => s.seats[i].bot && s.pending === before, 1);
    if (s.pending === before && before.type === "turn") E.act(s, before.seat, ersatzZug(s, before));
  }

  // Eine Aktion des Bots, der gerade dran ist (mit Ersatzzug). -> false bei einem Fehler, den auch der Ersatz nicht löst
  function einZug(s) {
    const seat = s.pending.seat;
    room.botTries = room.lastPending === s.pending ? room.botTries + 1 : 0;
    room.lastPending = s.pending;
    try {
      E.act(s, seat, botAction(s, seat, room.botTries));
    } catch (e) {
      try {
        botEinmal(s);
      } catch {
        s.log.push({ r: s.round, seat, msg: `Bot-Fehler: ${e.message}` });
        return false;
      }
    }
    return true;
  }

  // „Weiter“: Bots ziehen, bis etwas Sichtbares passiert ist (neuer Eintrag im Verlauf), ein Mensch dran ist oder das
  // Spiel endet. So kostet ein stilles „Passen“ (Held nicht rufen, nichts zahlen ohne Eintrag) keinen eigenen Klick.
  function weiter() {
    const s = room.state;
    const vorher = s.log.at(-1);
    for (let k = 0; k < 200 && botAmZug(s); k++) {
      if (!einZug(s) || s.log.at(-1) !== vorher) break;
    }
  }

  // Bots ziehen lassen, mit Verzögerung, damit man zusehen kann (nicht bei „Schritt für Schritt“: dort wartet der Bot)
  function pump() {
    if (room.pumping || room.schritt) return;
    const s = room.state;
    if (!botAmZug(s)) return;
    room.pumping = true;
    const step = () => {
      room.pumping = false;
      if (room.schritt || !botAmZug(s)) return;
      if (!room.botDelay) {
        try {
          runBots(s);
        } catch (e) {
          s.log.push({ r: s.round, seat: null, msg: `Bot-Fehler: ${e.message}` });
        }
        senden();
        return;
      }
      if (!einZug(s)) {
        senden();
        return;
      }
      senden();
      room.pumping = true;
      const zug = s.pending?.type === "turn" && s.pending?.dieTaken;
      setTimeout(step, zug ? room.botDelay : Math.max(150, room.botDelay / 2));
    };
    setTimeout(step, room.botDelay ? Math.max(150, room.botDelay / 2) : 0);
  }

  function handle(m, antwort) {
    const s = room.state;
    if (m.type === "join") {
      senden();
      pump();
      return;
    }
    if (m.type === "setBot") {
      const seat = Number(m.seat);
      s.seats[seat].bot = !!m.bot;
      s.log.push({ r: s.round, seat, msg: `${s.seats[seat].name} wird ${m.bot ? "von einem Bot" : "von einem Menschen"} gespielt.` });
    } else if (m.type === "botDelay") {
      room.botDelay = Math.max(0, Math.min(5000, Number(m.ms) || 0));
    } else if (m.type === "schritt") {
      room.schritt = !!m.on;
    } else if (m.type === "weiter") {
      if (room.schritt) weiter();
    } else if (m.type === "act") {
      const seat = Number(m.seat);
      if (s.seats[seat]?.bot) throw new Error("Diesen Platz spielt ein Bot");
      E.act(s, seat, m.action);
    } else if (m.type === "hint") {
      antwort({ type: "hint", seat: Number(m.seat), action: botAction(s, Number(m.seat), 0) });
      return;
    } else return;
    senden();
    pump();
  }

  return {
    socket() {
      const sock = { readyState: 1, onopen: null, onmessage: null, onclose: null };
      const zustellen = (msg) => sock.onmessage?.({ data: JSON.stringify(msg) });
      sock.send = (raw) => {
        try {
          handle(JSON.parse(raw), zustellen);
        } catch (e) {
          zustellen({ type: "error", message: e.message });
        }
      };
      room.hoerer.add(zustellen);
      setTimeout(() => sock.onopen?.(), 0);
      return sock;
    },
  };
}
