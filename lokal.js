// Leuchtfeuer im Browser ohne Server (GitHub Pages): ein Spielraum im Speicher, der dieselben Nachrichten
// versteht wie server/index.js (join, setBot, botDelay, act, hint). Alle Menschen-Plätze spielen an diesem Gerät.
import * as E from "./shared/engine.js";
import { botAction, runBots } from "./shared/bot.js";

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

export function neuesSpiel(seats, startSeat = 0) {
  return E.createGame({ seats, startSeat, personal: false, team: false });
}

// -> Objekt mit socket(): ein Ersatz für den WebSocket in game.js
export function lokalerRaum(state, botDelay = 700) {
  const room = { state, botDelay, hoerer: new Set(), pumping: false, lastPending: null, botTries: 0 };

  const plaetze = () => room.state.seats.map((x, i) => (x.bot ? null : i)).filter((i) => i !== null);
  const claims = () => Object.fromEntries(plaetze().map((i) => [i, "lokal"]));

  function speichern() {
    try {
      if (room.state.over) localStorage.removeItem(SPEICHER);
      else localStorage.setItem(SPEICHER, JSON.stringify({ state: room.state, botDelay: room.botDelay, saved: Date.now() }));
    } catch { /* voll oder gesperrt: dann eben ohne Fortsetzen */ }
  }

  function senden() {
    speichern();
    const seats = plaetze();
    const msg = { type: "state", game: "lokal", title: "Leuchtfeuer", seats, claims: claims(), botDelay: room.botDelay,
                  state: E.view(room.state, seats) };
    for (const h of room.hoerer) h(msg);
  }

  function botEinmal(s) {
    // Ersatzzug wie im Server, falls der Bot einen ungültigen Zug vorschlägt
    const before = s.pending;
    runBots(s, (i) => s.seats[i].bot && s.pending === before, 1);
    if (s.pending === before && before.type === "turn") E.act(s, before.seat, before.dieTaken ? { type: "endTurn" } : { type: "takeResource", res: "holz" });
  }

  // Bots ziehen lassen, mit Verzögerung, damit man zusehen kann
  function pump() {
    if (room.pumping) return;
    const s = room.state;
    if (s.over || !s.pending || !s.seats[s.pending.seat].bot) return;
    room.pumping = true;
    const step = () => {
      room.pumping = false;
      if (s.over || !s.pending || !s.seats[s.pending.seat].bot) return;
      if (!room.botDelay) {
        try {
          runBots(s);
        } catch (e) {
          s.log.push({ r: s.round, seat: null, msg: `Bot-Fehler: ${e.message}` });
        }
        senden();
        return;
      }
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
          senden();
          return;
        }
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
