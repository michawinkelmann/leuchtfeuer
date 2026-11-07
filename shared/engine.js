// Spiellogik „Leuchtfeuer“ nach REGELN.md v0.3. Läuft auf dem Server (maßgeblich), in den Bots und in der Simulation;
// die Oberfläche nutzt die Hilfsfunktionen (legale Kanten usw.) für die Anzeige.
//
// Aufbau: Der Zustand ist ein reines JSON-Objekt. Ablaufschritte stehen in state.queue; braucht ein Schritt eine
// Entscheidung, setzt er state.pending = {type, seat, ...} und wartet. act(state, seat, action) löst sie auf.
// Zwischenentscheidungen (Schatz, Karten abwerfen, Handelsangebot) unterbrechen die laufende über state.stack.

import { makeBoard, distances, withNeighbors, GATES, GATE_NAMES, TOWER_GATE, CAPITAL_KEY, HOME } from "./board.js";
import * as D from "./data.js";

export const ENGINE_VERSION = 1;

// ------------------------------------------------------------------ Zufall (reproduzierbar)
function rnd(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rint(s, n) {
  return Math.floor(rnd(s) * n);
}
function shuffle(s, a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(s, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------------ Brett (aus der Spielerzahl, zwischengespeichert)
const BOARDS = {};
export function board(s) {
  const n = s.nSeats;
  if (!BOARDS[n]) {
    const b = makeBoard(n);
    b.dist = distances(b);
    BOARDS[n] = b;
  }
  return BOARDS[n];
}

// Nur für die Modellnamen der Kacheln („Feld 1“ wie in public/models/models.json und den GLB-Dateien), nie für Texte:
// Die Geländeart heißt in Verlauf und Oberfläche „Acker“ (D.TERRAIN_NAME), „Feld“ meint ein Kartensechseck.
const TILE_LABEL = { wald: "Wald", feld: "Feld", weide: "Weide", huegel: "Hügel", gebirge: "Gebirge", wasser: "Wasser", ruine: "Ruine" };

// ------------------------------------------------------------------ Anlegen
/** settings: {seed, seats: [{name, color, people?, bot?, hero?, persons?: [name, name]}], variants, personal, team,
 *  startSeat?, heroMode: "ziehen"|"fest"} */
export function createGame(settings) {
  const v = { ...D.DEFAULT_VARIANTS, ...(settings.variants || {}) };
  const seed = settings.seed ?? Math.floor(Math.random() * 2 ** 31);
  const n = settings.seats.length;
  if (n < 2 || n > 5) throw new Error("2 bis 5 Plätze");
  const s = {
    engine: ENGINE_VERSION,
    seed,
    rng: seed | 0,
    variants: v,
    personal: !!settings.personal,
    team: !!settings.team,
    nSeats: n,
    seats: [],
    tiles: {},
    bag: [],
    buildings: {},
    beacons: {},
    hordes: [],
    nextHorde: 1,
    tower: (n <= 3 && v.startSegmentsSmall !== undefined ? v.startSegmentsSmall : v.startSegments)
      + (settings.team ? v.teamSegment || 0 : 0),           // v0.4: im Teamspiel 1 Segment mehr
    eye: 0,
    ruf: false,
    journey: v.journeyStart,
    journeyMoved: false,
    deck: [],
    supply: Object.fromEntries(D.RES.map((r) => [r, v.supply])),
    round: 0,
    start: 0,
    dice: [],
    rolled: [],
    taken: {},
    queue: [],
    pending: null,
    stack: [],
    log: [],
    stats: { rounds: [], spawned: 0, overfallsWon: 0, overfallsLost: 0, siegesWon: 0, siegesLost: 0, ausfaelle: 0,
             eyes: 0, cancelledEyes: 0, ruf: null, heroUse: {}, fateUse: {} },
    over: null,
    endAfterRound: false,
    rev: 0,
  };
  // Völker: vorgegeben oder zufällig verschieden
  const free = shuffle(s, D.PEOPLE_ORDER.filter((p) => !settings.seats.some((x) => x.people === p)));
  settings.seats.forEach((x, i) => {
    s.seats.push({
      name: x.name || D.COLORS[x.color]?.name || `Spieler ${i + 1}`,
      color: x.color || D.COLOR_ORDER[i],
      people: x.people || free.pop() || D.PEOPLE_ORDER[i % 5],
      bot: !!x.bot,
      persons: x.persons || null,
      heroes: [],
      heroOffer: null,
      wantHero: x.hero || null,
      res: Object.fromEntries(D.RES.map((r) => [r, 0])),
      fame: 0,
      fameBy: {},
      hand: [],
    });
  });
  s.start = settings.startSeat ?? 0;
  // Kacheln: Hauptstadt und Schattenland fest
  s.tiles[CAPITAL_KEY] = { kind: "hauptstadt", model: "Hauptstadt 1" };
  s.tiles["6,1"] = { kind: "tor", model: "Schattenland-Tor 1" };
  s.tiles["6,2"] = { kind: "turm_tor", model: "Turm-Tor 1" };
  s.tiles["6,3"] = { kind: "feuerberg", model: "Feuerberg 1" };
  const counts = n >= 4 ? D.TILES_BIG : D.TILES_SMALL;
  for (const [kind, k] of Object.entries(counts)) {
    for (let i = 0; i < k; i++) {
      s.bag.push({ kind, model: `${TILE_LABEL[kind]} ${i + 1}`, treasure: i === 0 && D.TREASURE_KINDS.includes(kind) });
    }
  }
  shuffle(s, s.bag);
  for (const id of D.FATE_IDS) s.deck.push(id, id);
  shuffle(s, s.deck);
  log(s, `Neues Spiel mit ${n} Plätzen (Startwert ${seed}).`);
  s.queue.push({ t: "heroes" }, { t: "water" }, { t: "homeTiles" }, { t: "startPlacement" }, { t: "roundStart" });
  run(s);
  return s;
}

// ------------------------------------------------------------------ Hilfen
function log(s, msg, seat = null) {
  s.log.push({ r: s.round, seat, msg });
  if (s.log.length > 4000) s.log.splice(0, s.log.length - 4000);
}
export function seatName(s, i) {
  return s.seats[i]?.name ?? "?";
}
function order(s, from = s.start) {
  return Array.from({ length: s.nSeats }, (_, k) => (from + k) % s.nSeats);
}
function addFame(s, seat, n, why) {
  s.seats[seat].fame += n;
  s.seats[seat].fameBy[why] = (s.seats[seat].fameBy[why] || 0) + n;
}
function gain(s, seat, res, n) {
  const k = Math.max(0, Math.min(n, s.supply[res]));
  s.supply[res] -= k;
  s.seats[seat].res[res] += k;
  return k;
}
function payRes(s, seat, cost) {
  for (const [r, k] of Object.entries(cost)) {
    s.seats[seat].res[r] -= k;
    s.supply[r] += k;
  }
}
export function canAfford(s, seat, cost) {
  return Object.entries(cost).every(([r, k]) => s.seats[seat].res[r] >= k);
}
export function costFor(s, seat, what) {
  const c = { ...D.COSTS[what] };
  if (s.seats[seat].people === "zwerge" && (s.variants.zwergeOn || ["burg", "festung", "leuchtfeuer"]).includes(what) && c.stein) {
    c.stein -= 1;
    if (!c.stein) delete c.stein;
  }
  return c;
}
export function costList(list) {
  const c = {};
  for (const r of list) c[r] = (c[r] || 0) + 1;
  return c;
}
function hasHero(s, seat, id) {
  return s.seats[seat].heroes.some((h) => h.id === id && !h.used);
}
function useHero(s, seat, id) {
  const h = s.seats[seat].heroes.find((x) => x.id === id && !x.used);
  h.used = true;
  s.stats.heroUse[id] = (s.stats.heroUse[id] || 0) + 1;
}
function takeCard(s, seat, id) {
  const i = s.seats[seat].hand.indexOf(id);
  if (i < 0) return false;
  s.seats[seat].hand.splice(i, 1);
  s.deck.push(id);                 // unter den Stapel
  s.stats.fateUse[id] = (s.stats.fateUse[id] || 0) + 1;
  return true;
}
function drawFate(s, seat, n = 1) {
  const got = [];
  for (let k = 0; k < n && s.deck.length; k++) got.push(s.deck.shift());
  return got;
}
function giveFate(s, seat) {
  const [c] = drawFate(s, seat, 1);
  if (!c) return;
  s.seats[seat].hand.push(c);
  checkHand(s, seat);
}
function checkHand(s, seat) {
  const over = s.seats[seat].hand.length - s.variants.handLimit;
  if (over > 0) interrupt(s, { type: "discard", seat, n: over });
}
function interrupt(s, p) {
  if (s.pending) s.stack.push(s.pending);
  s.pending = p;
}
function resume(s) {
  s.pending = s.stack.pop() || null;
  if (!s.pending) run(s);
}
function finishPending(s, st) {
  // eine Entscheidung eines Ablaufschritts ist gefallen: Schritt fortsetzen
  s.pending = null;
  if (st) s.queue.unshift(st);
  if (s.stack.length) {
    s.pending = s.stack.pop();
    return;
  }
  run(s);
}

// ------------------------------------------------------------------ Brett-Abfragen
export function buildingsAt(s, field) {
  const b = board(s);
  return b.pos[field].edges.filter((e) => s.buildings[e]).map((e) => ({ edge: e, ...s.buildings[e] }));
}
export function seatFields(s, seat) {
  const b = board(s);
  const out = new Set();
  for (const [e, bl] of Object.entries(s.buildings)) {
    if (bl.seat !== seat) continue;
    for (const f of b.edges[e].fields) if (s.tiles[f]) out.add(f);
  }
  return out;
}
function isShadow(s, f) {
  return board(s).pos[f].type === "shadow";
}
function emptyFog(s, f) {
  return board(s).pos[f].type === "fog" && !s.tiles[f];
}
export function pieceUse(s, seat) {
  const u = { gehoeft: 0, burg: 0, festung: 0 };
  for (const bl of Object.values(s.buildings)) {
    if (bl.seat !== seat) continue;
    u.gehoeft++;
    if (bl.level >= 2) u.burg++;
    if (bl.level >= 3) u.festung++;
  }
  return u;
}
export function legalGehoeftEdges(s, seat, start = false) {
  const b = board(s);
  const out = [];
  if (start) {
    for (const e of Object.values(b.edges)) {
      if (s.buildings[e.key]) continue;
      if (e.fields.length < 2 && !s.variants.randplaetze) continue;      // nur zwischen zwei Kacheln
      if (e.fields.every((f) => ["home", "capital"].includes(b.pos[f].type))) out.push(e.key);
    }
    return out;
  }
  const mine = seatFields(s, seat);
  if (!mine.size) {                 // alle Gebäude verloren: neu im Heimatland
    return legalGehoeftEdges(s, seat, true);
  }
  const seen = new Set();
  for (const f of mine) {
    if (isShadow(s, f)) continue;
    for (const e of b.pos[f].edges) {
      if (seen.has(e) || s.buildings[e]) continue;
      seen.add(e);
      if (b.edges[e].fields.some((g) => isShadow(s, g))) continue;
      if (b.edges[e].fields.length < 2 && !s.variants.randplaetze) continue;   // am Kartenrand fiele es herunter
      out.push(e);
    }
  }
  return out;
}
export function legalUpgrades(s, seat) {
  const use = pieceUse(s, seat);
  return Object.entries(s.buildings)
    .filter(([, bl]) => bl.seat === seat && bl.level < 3 && (bl.level === 1 ? use.burg < D.PIECES.burg : use.festung < D.PIECES.festung))
    .map(([e, bl]) => ({ edge: e, to: bl.level + 1 }));
}
function beaconAtField(s, f) {
  return board(s).pos[f].corners.some((c) => s.beacons[c]);
}
export function legalBeaconCorners(s, seat) {
  const b = board(s);
  if (Object.keys(s.beacons).length >= s.variants.beacons) return [];
  const mine = seatFields(s, seat);
  const out = new Set();
  for (const f of mine) {
    const kind = s.tiles[f]?.kind;
    if (kind !== "gebirge" && kind !== "huegel") continue;
    for (const c of b.pos[f].corners) {
      if (s.beacons[c]) continue;
      const fs = b.corners[c].fields;
      if (fs.some((g) => isShadow(s, g))) continue;
      if (!s.variants.randplaetze && (fs.length < 3 || fs.some((g) => !s.tiles[g]))) continue;   // nur Ecken mit 3 Kacheln
      const hills = fs.filter((g) => ["gebirge", "huegel"].includes(s.tiles[g]?.kind));
      if (hills.some((g) => beaconAtField(s, g))) continue;
      out.add(c);
    }
  }
  return [...out];
}
export function litBeaconNear(s, field) {
  const near = new Set(withNeighbors(board(s), field));
  const b = board(s);
  return Object.entries(s.beacons).some(([c, bc]) => bc.lit && b.corners[c].fields.some((f) => near.has(f)));
}
export function hordesAt(s, field) {
  return s.hordes.filter((h) => h.pos === field);
}
export function hordeStrength(s) {
  return s.tower >= s.variants.strongFrom ? s.variants.hordeStrengthHigh : s.variants.hordeStrength;
}
export function baseDefense(s, field, onlySeat = null) {
  let d = 0;
  for (const bl of buildingsAt(s, field)) {
    if (onlySeat !== null && bl.seat !== onlySeat) continue;
    if (bl.level === 2) d += 1;
    if (bl.level === 3) d += 2;
  }
  return d;
}
export function payers(s, field) {
  const owners = new Set(buildingsAt(s, field).map((x) => x.seat));
  const all = litBeaconNear(s, field);
  return order(s).filter((i) => all || owners.has(i));
}
export function horseValue(s, seat) {
  return s.seats[seat].people === "menschen" ? 2 : 1;
}
export function bankRate(s, seat) {
  const b = board(s);
  let rate = s.variants.bankRate;
  for (const [e, bl] of Object.entries(s.buildings)) {
    if (bl.seat !== seat) continue;
    const fs = b.edges[e].fields;
    if (fs.includes(CAPITAL_KEY)) rate = Math.min(rate, s.variants.capitalRate);
    if (s.seats[seat].people === "kuestenvolk" && fs.some((f) => s.tiles[f]?.kind === "wasser")) rate = Math.min(rate, 2);
  }
  return rate;
}
export function journeyStep(s) {
  const j = D.JOURNEYS[s.variants.journey] || D.JOURNEYS.v03;
  if (s.journey >= 10) return null;
  const [cost, fame, danger] = j[s.journey];
  return { field: s.journey + 1, cost: costList(cost), fame, danger };
}
export function ausfallTargets(s, seat) {
  const out = [];
  const fields = new Set(s.hordes.map((h) => h.pos));
  for (const f of fields) {
    if (!buildingsAt(s, f).some((x) => x.seat === seat)) continue;
    const need = hordeStrength(s) * hordesAt(s, f).length - baseDefense(s, f, seat);
    out.push({ field: f, need: Math.max(0, need) });
  }
  return out;
}
export function harvestYield(s, seat, face, own) {
  const res = D.TERRAIN_RES[face];
  if (!res) return { res: null, n: 0 };
  const b = board(s);
  let n = 0;
  for (const [e, bl] of Object.entries(s.buildings)) {
    if (bl.seat !== seat) continue;
    let y = 0;
    for (const f of b.edges[e].fields) if (s.tiles[f]?.kind === face) y += bl.level;
    if (y > 0 && s.variants.capitalDouble && b.edges[e].fields.includes(CAPITAL_KEY)) y += bl.level;
    if (y > 0 && own && s.variants.capitalPlus && b.edges[e].fields.includes(CAPITAL_KEY)) y += 1;    // Hauptstadt: eigene Ernte +1   // Hauptstadt zählt wie das Nachbarfeld
    if (y > 0 && (own || s.variants.kuesteShared) && s.seats[seat].people === "kuestenvolk" && b.edges[e].fields.some((f) => s.tiles[f]?.kind === "wasser")) y += 1;
    n += y;
  }
  return { res, n };
}
function harvest(s, seat, face, own) {
  const { res, n } = harvestYield(s, seat, face, own);
  if (!res || !n) return 0;
  const k = gain(s, seat, res, n);
  if (k) log(s, `${seatName(s, seat)} erntet ${k} ${D.RES_NAME[res]}${k < n ? " (Vorrat reicht nicht)" : ""}.`, seat);
  return k;
}
export const START_GEHOEFTE = 2;   // je Platz, sie bringen keinen Ruhm (REGELN.md, Aufbau 7)
/** Ruhm eines Platzes.
 *  leiste: Stand der Ruhm-Leiste wie am Tisch (v0.4): Gebäude-Ruhm kommt sofort dazu (Gehöft 1, jeder Ausbau 1 mehr),
 *          die Startgehöfte bringen keinen, jede verlorene Stufe kostet 1, aber nie unter 0 (was die 0 abfängt,
 *          zählt seat.leisteAusgleich). Danach gehen Sieg und Startspieler.
 *  fame: Ruhm ohne Gebäude (Reise, Kämpfe, Leuchtfeuer, Helden, Ruine), bauRuhm: Anteil der Gebäude an der Leiste,
 *  bau: alle Gebäudestufen, total = fame + bau (alte Zählung mit den Startgehöften, nur noch für die Bots). */
export function score(s, seat) {
  const x = s.seats[seat];
  let bau = 0;
  for (const bl of Object.values(s.buildings)) if (bl.seat === seat) bau += bl.level;
  const leiste = Math.max(0, x.fame + bau - START_GEHOEFTE + (x.leisteAusgleich || 0));
  return { fame: x.fame, bau, bauRuhm: leiste - x.fame, leiste, total: x.fame + bau, res: D.RES.reduce((a, r) => a + x.res[r], 0) };
}

// ------------------------------------------------------------------ Turm, Horden, Leuchtfeuer
function towerGrow(s, n, why) {
  if (n <= 0) return;
  s.tower += n;
  s.stats.grow = s.stats.grow || {};
  s.stats.grow[why] = (s.stats.grow[why] || 0) + n;
  s.stats.lastGrow = why;
  log(s, `Der Turm wächst um ${n} auf ${s.tower} (${why}).`);
  if (s.tower >= s.variants.towerMax) endGame(s, true, "Der Turm des Schattens ist vollendet.");
}
function spawnHorde(s) {
  s.eye = (s.eye + 1) % GATES.length;
  const gate = GATES[s.eye];
  if (s.hordes.length >= s.variants.hordes) {
    log(s, `Das Auge blickt zum ${GATE_NAMES[gate]}, aber keine Horde ist mehr im Vorrat.`);
    towerGrow(s, 1, "keine Horde mehr im Vorrat");
    return;
  }
  if (s.variants.hordeStack && s.hordes.some((h) => h.pos === gate)) {   // Prüfvariante: höchstens 1 Horde je Feld
    s.stats.stackBlocked = (s.stats.stackBlocked || 0) + 1;
    towerGrow(s, 1, "Tor besetzt");
    return;
  }
  s.hordes.push({ id: s.nextHorde++, pos: gate });
  s.stats.spawned++;
  log(s, `Das Auge blickt zum ${GATE_NAMES[gate]}: Dort erscheint eine Ork-Horde.`);
}
function removeHordes(s, ids) {
  s.hordes = s.hordes.filter((h) => !ids.includes(h.id));
}
function checkRuf(s, seat) {
  const need = s.nSeats <= 3 && s.variants.rufCountSmall !== undefined ? s.variants.rufCountSmall : s.variants.rufCount;
  if (s.ruf || !need) return;
  const lit = Object.entries(s.beacons).filter(([, b]) => b.lit);
  if (lit.length < need) return;
  s.ruf = true;
  if (s.variants.rufSave) {             // Ruf wird aufgehoben und kommt in der dunkelsten Stunde (siehe rufFire)
    s.rufReady = true;
    addFame(s, seat, 3, "leuchtfeuer");
    s.stats.ruf = s.round;
    return;
  }
  const b = board(s);
  const fields = new Set(lit.flatMap(([c]) => b.corners[c].fields));
  const gone = s.hordes.filter((h) => fields.has(h.pos)).map((h) => h.id);
  removeHordes(s, gone);
  s.tower = Math.max(0, s.tower - (s.variants.rufTower || 1));
  addFame(s, seat, 3, "leuchtfeuer");
  s.stats.ruf = s.round;
  log(s, `Ruf der Leuchtfeuer! ${gone.length} Horden vernichtet, der Turm verliert ein Segment (${s.tower}). ${seatName(s, seat)} erhält 3 Ruhm.`, seat);
}
function knockDown(s, field) {
  for (const bl of buildingsAt(s, field)) {
    const seat = bl.seat;
    if (bl.level === 1 && s.seats[seat].people === "halblinge") continue;
    // Die Stufe kostet 1 Ruhm, aber die Leiste geht nie unter 0
    if (score(s, seat).leiste === 0) s.seats[seat].leisteAusgleich = (s.seats[seat].leisteAusgleich || 0) + 1;
    if (bl.level === 1) {
      delete s.buildings[bl.edge];
      log(s, `Ein Gehöft von ${seatName(s, seat)} wird zerstört.`, seat);
    } else {
      s.buildings[bl.edge].level -= 1;
      log(s, `${D.LEVEL_NAME[bl.level]} von ${seatName(s, seat)} wird zu ${D.LEVEL_NAME[bl.level - 1]}.`, seat);
    }
  }
}

// ------------------------------------------------------------------ Spielende
function endGame(s, lost, reason) {
  if (s.over) return;
  // Wer am meisten Ruhm auf der Leiste hat, bei Gleichstand mehr Rohstoffe; ist auch das gleich,
  // teilen sie sich den Sieg (winners: alle Sieger, ranking[0] ist nur der erste von ihnen)
  const ranking = order(s, 0).map((i) => ({ seat: i, ...score(s, i) }))
    .sort((a, b) => b.leiste - a.leiste || b.res - a.res);
  const top = ranking[0];
  const winners = lost ? [] : ranking.filter((r) => r.leiste === top.leiste && r.res === top.res).map((r) => r.seat);
  s.over = { lost, reason, ranking, winners, round: s.round, tower: s.tower, journey: s.journey };
  s.pending = null;
  s.queue = [];
  s.stack = [];
  const namen = winners.map((w) => seatName(s, w));
  if (lost) log(s, `${reason} Alle haben verloren.`);
  else if (namen.length > 1) log(s, `${reason} Es gewinnen ${namen.slice(0, -1).join(", ")} und ${namen.at(-1)} gemeinsam mit ${top.leiste} Ruhm.`);
  else log(s, `${reason} Es gewinnt ${namen[0]} mit ${top.leiste} Ruhm.`);
}

// ------------------------------------------------------------------ Ablaufschritte
const STEPS = {
  heroes(s, st) {
    // feste Helden (Familienrunde) oder ziehen: je Person 1 (Team), zu fünft 1, sonst 2 ziehen, 1 behalten
    if (st.i === undefined) {
      const fixed = s.seats.flatMap((x) => (x.wantHero ? [].concat(x.wantHero) : []));
      st.pool = shuffle(s, D.HERO_IDS.filter((h) => !fixed.includes(h)));
      for (const seat of s.seats) {
        if (seat.wantHero) {
          const wants = Array.isArray(seat.wantHero) ? seat.wantHero : [seat.wantHero];
          seat.heroes = wants.map((id) => ({ id, used: false }));
        }
      }
      st.i = 0;
    }
    while (st.i < s.nSeats) {
      const seat = s.seats[st.i];
      if (seat.heroes.length) {
        st.i++;
        continue;
      }
      if (s.team) {
        const k = seat.persons ? seat.persons.length : 2;
        seat.heroes = st.pool.splice(0, k).map((id) => ({ id, used: false }));
        st.i++;
        continue;
      }
      if (s.nSeats >= 5 || st.pool.length < 2) {
        seat.heroes = st.pool.splice(0, 1).map((id) => ({ id, used: false }));
        st.i++;
        continue;
      }
      seat.heroOffer = st.pool.splice(0, 2);
      s.pending = { type: "chooseHero", seat: st.i, offer: seat.heroOffer, step: st };
      return;
    }
  },
  water(s, st) {
    const k = s.seats.findIndex((x) => x.people === "kuestenvolk");
    if (k < 0 || st.done) return;
    s.pending = { type: "placeWater", seat: k, step: st };
  },
  homeTiles(s) {
    const b = board(s);
    for (const [c, r] of HOME) {
      const key = `${c},${r}`;
      if (!b.pos[key] || s.tiles[key]) continue;
      let t = s.bag.shift();
      let guard = 0;
      // Ruine oder Schatz-Plättchen zurück in die Dose, dann neu ziehen (REGELN.md, Aufbau 3)
      while ((t.kind === "ruine" || t.treasure) && guard++ < 50) {
        s.bag.splice(1 + rint(s, s.bag.length), 0, t);
        t = s.bag.shift();
      }
      s.tiles[key] = { kind: t.kind, model: t.model };
    }
    log(s, "Das Heimatland ist ausgelegt, der Nebel liegt noch über dem Osten.");
  },
  startPlacement(s, st) {
    if (!st.order) {
      const o = order(s);
      st.order = [...o, ...o.slice().reverse()];
      st.i = 0;
    }
    if (st.i >= st.order.length) return;
    const seat = st.order[st.i];
    s.pending = { type: "placeStart", seat, second: st.i >= s.nSeats, step: st };
  },
  roundStart(s) {
    s.round += 1;
    s.journeyMoved = false;
    s.taken = {};
    s.planerinTook = {};
    const n = Math.max(s.variants.minDice || 0, s.nSeats === 2 ? s.variants.diceTwoPlayers : s.nSeats + 1);
    s.rolled = Array.from({ length: Math.min(6, n) }, () => D.DIE_FACES[rint(s, 6)]);
    s.dice = s.rolled.slice();
    if (s.variants.catchupRes && s.round > 1) {
      const sc = s.seats.map((_, i) => (s.variants.catchupStart === "leiste" ? score(s, i).fame : score(s, i).leiste));
      const hi = Math.max(...sc), lo = Math.min(...sc);
      if (hi - lo >= s.variants.catchupRes) for (let i = 0; i < s.nSeats; i++) if (sc[i] === lo) {
        const r = D.RES.reduce((a, x) => (s.seats[i].res[x] < s.seats[i].res[a] ? x : a), "holz");
        gain(s, i, r, 1); s.stats.catchup = (s.stats.catchup || 0) + 1;
      }
    }
    s.roundStats = { eyes: s.dice.filter((d) => d === "auge").length, overfallsWon: 0, overfallsLost: 0, sieges: 0 };
    log(s, `Runde ${s.round}: ${seatName(s, s.start)} würfelt ${s.dice.map((d) => (d === "auge" ? "Auge" : D.TERRAIN_NAME[d])).join(", ")}.`);
    s.queue.unshift({ t: "reactRoll" }, { t: "eyes" }, { t: "planerin" }, { t: "turns" }, { t: "roundEnd" });
  },
  reactRoll(s, st) {
    if (!st.order) {
      st.order = order(s);
      st.i = 0;
    }
    while (st.i < st.order.length) {
      const seat = st.order[st.i];
      const can = { zauberin: hasHero(s, seat, "zauberin"), gelehrter: hasHero(s, seat, "gelehrter") && s.dice.includes("auge") };
      if (can.zauberin || can.gelehrter) {
        s.pending = { type: "reactRoll", seat, can, step: st };
        return;
      }
      st.i++;
    }
  },
  eyes(s) {
    const eyes = s.dice.filter((d) => d === "auge").length;
    s.dice = s.dice.filter((d) => d !== "auge");
    s.stats.eyes += eyes;
    for (let k = 0; k < eyes && !s.over; k++) spawnHorde(s);
  },
  planerin(s, st) {
    if (!st.order) {
      st.order = order(s);
      st.i = 0;
    }
    while (st.i < st.order.length) {
      const seat = st.order[st.i];
      if (hasHero(s, seat, "planerin") && s.dice.length >= 1) {
        s.pending = { type: "planerin", seat, step: st };
        return;
      }
      st.i++;
    }
  },
  turns(s, st) {
    if (st.i === undefined) st.i = 0;
    if (st.i >= s.nSeats) return;
    const seat = (s.start + st.i) % s.nSeats;
    st.i++;
    s.queue.unshift(st);
    s.pending = { type: "turn", seat, dieTaken: !!s.planerinTook?.[seat] };
  },
  roundEnd(s) {
    // 1. gemeinsame Ernte
    for (const face of s.dice) {
      for (const seat of order(s)) harvest(s, seat, face, false);
    }
    if (s.dice.length) log(s, `Gemeinsame Ernte: ${s.dice.map((d) => D.TERRAIN_NAME[d]).join(", ")}.`);
    s.dice = [];
    s.queue.unshift({ t: "moveHordes" }, { t: "siege" }, { t: "overfalls" }, { t: "extinguish" }, { t: "quest" }, { t: "closeRound" });
  },
  moveHordes(s, st) {
    const b = board(s);
    if (!st.ids) {
      st.ids = s.hordes.map((h) => h.id);
      if (s.variants.hordeStack === "warten") st.ids.sort((a, c) => b.dist[s.hordes.find((x) => x.id === a).pos] - b.dist[s.hordes.find((x) => x.id === c).pos]);
      st.i = 0;
    }
    const busy = (f, me) => s.hordes.some((x) => x.id !== me && x.pos === f);
    const arrive = (h) => {            // verschmelzen: trifft die Horde auf eine andere, geht sie zurück, Turm +1
      if (s.variants.hordeStack === "verschmelzen" && busy(h.pos, h.id)) {
        s.stats.stackBlocked = (s.stats.stackBlocked || 0) + 1;
        removeHordes(s, [h.id]);
        towerGrow(s, 1, "Horden vereint");
      }
    };
    while (st.i < st.ids.length) {
      const h = s.hordes.find((x) => x.id === st.ids[st.i]);
      if (!h || h.pos === CAPITAL_KEY) {
        st.i++;
        continue;
      }
      if (st.choice) {
        h.pos = st.choice;
        st.choice = null;
        st.i++;
        arrive(h);
        if (s.over) return;
        continue;
      }
      const d = b.dist[h.pos];
      let opts = b.pos[h.pos].nb.filter((f) => b.dist[f] === d - 1);
      if (s.variants.hordeStack === "warten") {
        opts = opts.filter((f) => !busy(f, h.id));
        if (!opts.length) { s.stats.stackWait = (s.stats.stackWait || 0) + 1; st.i++; continue; }
      }
      if (opts.length > 1 && s.variants.hordeTie === "gebaeude") {
        const cnt = (f) => buildingsAt(s, f).length;
        const m = Math.max(...opts.map(cnt));
        opts = opts.filter((f) => cnt(f) === m);
      }
      if (opts.length > 1 && s.variants.hordeTieRandom && opts.every((f) => !buildingsAt(s, f).length)) {
        opts = [opts[rint(s, opts.length)]];        // ohne Gebäude ist es egal: Zufall statt Rückfrage
      }
      if (opts.length > 1) {
        s.pending = { type: "hordeTie", seat: s.start, horde: h.id, from: h.pos, options: opts, step: st };
        return;
      }
      h.pos = opts[0];
      st.i++;
      arrive(h);
      if (s.over) return;
    }
  },
  siege(s) {
    if (s.rufReady && s.hordes.length && s.tower >= s.variants.towerMax - 2) {
      // Verbündete kommen: alle Horden im Heimatland und an der Hauptstadt vernichtet, Turm −1
      const home = new Set(["capital", "home"]);
      const gone = s.hordes.filter((h) => home.has(board(s).pos[h.pos].type)).map((h) => h.id);
      if (gone.length) {
        removeHordes(s, gone);
        s.tower = Math.max(0, s.tower - (s.variants.rufTower || 1));
        s.rufReady = false;
        s.stats.rufFired = s.round;
        log(s, `Die Verbündeten kommen: ${gone.length} Horden vernichtet, Turm ${s.tower}.`);
      }
    }
    const at = hordesAt(s, CAPITAL_KEY);
    if (at.length) s.queue.unshift({ t: "fight", field: CAPITAL_KEY, kind: "siege" });
  },
  overfalls(s) {
    const seen = [];
    for (const h of s.hordes) {
      if (h.pos === CAPITAL_KEY || seen.includes(h.pos)) continue;
      if (buildingsAt(s, h.pos).length) seen.push(h.pos);
    }
    s.queue.unshift(...seen.map((f) => ({ t: "fight", field: f, kind: "overfall" })));
  },
  fight(s, st) {
    const f = st.field;
    if (!st.stage) {
      st.stage = "intervene";
      st.order = order(s);
      st.i = 0;
      st.paid = {};
    }
    const near = withNeighbors(board(s), CAPITAL_KEY);
    if (st.stage === "intervene") {
      while (st.i < st.order.length) {
        if (!hordesAt(s, f).length) break;
        const seat = st.order[st.i];
        const can = { hueterin: hasHero(s, seat, "hueterin"), chronist: hasHero(s, seat, "chronist") && near.includes(f) };
        if (can.hueterin || can.chronist) {
          s.pending = { type: "intervene", seat, field: f, kind: st.kind, hordes: hordesAt(s, f).map((h) => h.id), can, step: st };
          return;
        }
        st.i++;
      }
      if (!hordesAt(s, f).length) return;           // alle Horden abgezogen
      st.stage = "pay";
      st.i = 0;
      st.strength = hordeStrength(s) * hordesAt(s, f).length;
      st.base = baseDefense(s, f) + (st.kind === "siege" ? (s.variants.capitalDefense || 0) : 0);
      st.payers = st.base >= st.strength ? [] : (st.kind === "siege" && s.variants.siegeAllPay ? order(s) : payers(s, f));
      if (st.kind === "siege") {
        s.stats.siegeTotal = (s.stats.siegeTotal || 0) + 1;
        if (!buildingsAt(s, f).length) s.stats.siegeNoBuild = (s.stats.siegeNoBuild || 0) + 1;
        if (st.base < st.strength && !st.payers.length) s.stats.siegeNoPayers = (s.stats.siegeNoPayers || 0) + 1;
      }
      st.strength0 = st.strength;
    }
    if (st.stage === "pay") {
      const paid = () => Object.values(st.paid).reduce((a, x) => a + x, 0);
      while (st.i < st.payers.length) {
        const need = st.strength - st.base - paid();
        if (need <= 0 && s.variants.payOrder === "v03") break;
        const seat = st.payers[st.i];
        const me = s.seats[seat];
        if (me.res.erz + me.res.pferde > 0 || me.hand.includes("verstaerkung")) {
          s.pending = { type: "pay", seat, field: f, kind: st.kind, need: Math.max(0, need), strength: st.strength,
                        base: st.base, paidSoFar: paid(), step: st };
          return;
        }
        st.i++;
      }
      st.stage = "resolve";
    }
    // Auflösen
    const hs = hordesAt(s, f).map((h) => h.id);
    const total = st.base + Object.values(st.paid).reduce((a, x) => a + x, 0);
    const fname = D.TERRAIN_NAME[s.tiles[f]?.kind] || "Nebel";
    const where = st.kind === "siege" ? `Belagerung der Hauptstadt (${hs.length} Horde${hs.length > 1 ? "n" : ""})`
      : `Überfall auf ${fname} (${hs.length} Horde${hs.length > 1 ? "n" : ""})`;
    if (total >= st.strength) {
      removeHordes(s, hs);
      const paidSeats = Object.entries(st.paid).filter(([, x]) => x > 0).map(([k, x]) => [Number(k), x]);
      if (!paidSeats.length) {
        const owners = [...new Set(buildingsAt(s, f).filter((x) => x.level >= 2).map((x) => x.seat))];
        for (const o of owners) addFame(s, o, 1, "abwehr");
        log(s, `${where} abgewehrt: Burgen und Festungen reichen${owners.length ? `, je 1 Ruhm für ${owners.map((o) => seatName(s, o)).join(", ")}` : ""}.`);
      } else {
        const top = Math.max(...paidSeats.map(([, x]) => x));
        const best = st.order.filter((k) => st.paid[k] === top);
        const winners = s.variants.defenseTie === "alle" ? best : best.slice(0, 1);
        for (const w of winners) {
          addFame(s, w, 2, "horden");
          giveFate(s, w);
        }
        for (const o of best.filter((k) => !winners.includes(k))) addFame(s, o, 1, "horden");
        log(s, `${where} abgewehrt (${total} gegen ${st.strength}). ${winners.map((w) => seatName(s, w)).join(", ")}: 2 Ruhm und eine Schicksalskarte.`);
      }
      if (st.kind === "siege") s.stats.siegesWon++;
      else s.stats.overfallsWon++;
      s.roundStats.overfallsWon++;
    } else {
      log(s, `${where}: Abwehr gescheitert (${total} gegen ${st.strength}).`);
      knockDown(s, f);
      if (st.kind === "siege") {
        removeHordes(s, hs);
        s.stats.siegesLost++;
        towerGrow(s, s.variants.siegeTower, "Belagerung verloren");
      } else {
        s.stats.overfallsLost++;
        towerGrow(s, 1, "Überfall verloren");
      }
      s.roundStats.overfallsLost++;
    }
    if (st.kind === "siege") s.roundStats.sieges++;
  },
  extinguish(s) {
    const b = board(s);
    for (const [c, bc] of Object.entries(s.beacons)) {
      if (bc.lit && b.corners[c].fields.some((f) => hordesAt(s, f).length)) {
        bc.lit = false;
        log(s, "Ein Leuchtfeuer erlischt.");
      }
    }
  },
  quest(s) {
    if (s.journeyMoved) s.idleRounds = 0; else s.idleRounds = (s.idleRounds || 0) + 1;
    if (!s.variants.questClock || s.journeyMoved || s.journey >= 10) return;
    if (s.variants.questEvery && s.idleRounds < s.variants.questEvery) return;
    if (s.variants.questFrom && s.round < s.variants.questFrom) return;
    s.idleRounds = 0;
    s.stats.questAuto = (s.stats.questAuto || 0) + 1;
    const step = journeyStep(s);
    s.journey = step.field;
    log(s, `Niemand hat die Gefährten unterstützt: Sie ziehen allein auf Feld ${s.journey}.`);
    if (step.danger) { if (s.variants.dangerHorde) spawnHorde(s); else towerGrow(s, s.variants.dangerTower, "Gefahrenfeld"); }
    if (s.journey >= 10) s.endAfterRound = true;
  },
  closeRound(s) {
    s.stats.rounds.push({
      round: s.round, tower: s.tower, journey: s.journey, eyes: s.roundStats.eyes, hordes: s.hordes.length,
      overfallsWon: s.roundStats.overfallsWon, overfallsLost: s.roundStats.overfallsLost, sieges: s.roundStats.sieges,
      beaconsLit: Object.values(s.beacons).filter((b) => b.lit).length,
      fame: s.seats.map((_, i) => score(s, i).leiste),
    });
    if (s.endAfterRound || s.journey >= 10) {
      endGame(s, false, "Die Gefährten haben den Feuerberg erreicht.");
      return;
    }
    if (s.round >= 60) {
      endGame(s, false, "Abbruch nach 60 Runden.");
      return;
    }
    s.start = (s.start + 1) % s.nSeats;
    if (s.variants.catchupStart) {
      // Startspieler wird, wer am wenigsten Ruhm hat (bei Gleichstand der Nächste in der Reihe).
      // Prüfvariante "leiste": nur Ruhm ohne Gebäude (so stand die Leiste bis v0.3)
      const sc = s.seats.map((_, i) => (s.variants.catchupStart === "leiste" ? score(s, i).fame : score(s, i).leiste));
      const lo = Math.min(...sc);
      for (let k = 0; k < s.nSeats; k++) { const i = (s.start + k) % s.nSeats; if (sc[i] === lo) { s.start = i; break; } }
    }
    s.queue.unshift({ t: "roundStart" });
  },
};

function run(s) {
  let guard = 0;
  while (!s.over && !s.pending && s.queue.length) {
    if (guard++ > 100000) throw new Error("Endlosschleife im Ablauf");
    const st = s.queue.shift();
    STEPS[st.t](s, st);
  }
}

// ------------------------------------------------------------------ Bauen, Reisen, Kämpfen (im eigenen Zug)
function explore(s, seat, edge) {
  const b = board(s);
  for (const f of b.edges[edge].fields) {
    if (!emptyFog(s, f)) continue;
    const t = s.bag.shift();
    if (!t) continue;
    s.tiles[f] = { kind: t.kind, model: t.model };
    log(s, `${seatName(s, seat)} erkundet den Nebel: ${D.TERRAIN_NAME[t.kind]}${t.treasure ? " mit Schatz" : ""}.`, seat);
    if (t.kind === "ruine") {
      addFame(s, seat, 1, "ruine");
      giveFate(s, seat);
    }
    if (t.treasure) interrupt(s, { type: "treasure", seat });
  }
}
function placeGehoeft(s, seat, edge) {
  s.buildings[edge] = { seat, level: 1 };
}

function doJourney(s, seat, how) {
  const step = journeyStep(s);
  if (!step) throw new Error("Die Gefährten sind schon am Feuerberg");
  if (how !== "weg") payRes(s, seat, step.cost);
  s.journey = step.field;
  addFame(s, seat, step.fame, "reise");
  log(s, `${seatName(s, seat)} führt die Gefährten auf Feld ${s.journey} (+${step.fame} Ruhm).`, seat);
  if (step.danger && how !== "weg") {
    if (s.seats[seat].people === "halblinge") log(s, "Die Halblinge schleichen vorbei: Der Turm wächst nicht.", seat);
    else if (s.variants.dangerHorde) spawnHorde(s);
    else if (s.variants.dangerCap && s.tower + s.variants.dangerTower >= s.variants.towerMax) log(s, "Gefahrenfeld: Der Turm wächst nicht über die letzte Stufe.");
    else towerGrow(s, s.variants.dangerTower, "Gefahrenfeld");
  }
  if (s.journey >= 10) {
    s.endAfterRound = true;
    log(s, "Die Gefährten erreichen den Feuerberg! Die Runde wird zu Ende gespielt.");
  }
}

function fightPower(s, seat, pay) {
  const erz = pay.erz | 0;
  const pferde = pay.pferde | 0;
  const me = s.seats[seat];
  if (erz < 0 || pferde < 0 || erz > me.res.erz || pferde > me.res.pferde) throw new Error("So viel hast du nicht");
  if (pay.verstaerkung && !me.hand.includes("verstaerkung")) throw new Error("Keine Verstärkung auf der Hand");
  return erz + pferde * horseValue(s, seat) + (pay.verstaerkung ? 3 : 0);
}
function spendFight(s, seat, pay) {
  payRes(s, seat, { erz: pay.erz | 0, pferde: pay.pferde | 0 });
  if (pay.verstaerkung) takeCard(s, seat, "verstaerkung");
}

const TURN_ACTIONS = {
  takeDie(s, seat, a, p) {
    if (p.dieTaken) throw new Error("Du hast schon einen Würfel");
    const i = a.index | 0;
    if (i < 0 || i >= s.dice.length) throw new Error("Diesen Würfel gibt es nicht");
    let face = s.dice[i];
    if (a.face && a.face !== face) {
      if (s.seats[seat].people !== "elben") throw new Error("Nur Elben dürfen den Würfel drehen");
      if (!D.TERRAIN_RES[a.face]) throw new Error("Nur auf ein Gelände drehen");
      const ek = s.variants.elbenCost ?? 2;
      if (s.seats[seat].res.korn < ek) throw new Error(`Drehen kostet ${ek} Korn`);
      if (ek) payRes(s, seat, { korn: ek });
      log(s, `${seatName(s, seat)} dreht den Würfel für ${ek} Korn auf ${D.TERRAIN_NAME[a.face]}.`, seat);
      face = a.face;
    }
    s.dice.splice(i, 1);
    s.taken[seat] = [...(s.taken[seat] || []), face];
    p.dieTaken = true;
    log(s, `${seatName(s, seat)} nimmt ${D.TERRAIN_NAME[face]}.`, seat);
    harvest(s, seat, face, true);
  },
  takeResource(s, seat, a, p) {
    if (p.dieTaken) throw new Error("Du hast schon geerntet");
    if (s.dice.length) throw new Error("Es liegen noch Würfel");
    if (!D.RES.includes(a.res)) throw new Error("Unbekannter Rohstoff");
    p.dieTaken = true;
    gain(s, seat, a.res, 1);
    log(s, `${seatName(s, seat)} nimmt 1 ${D.RES_NAME[a.res]} aus dem Vorrat.`, seat);
  },
  build(s, seat, a) {
    if (pieceUse(s, seat).gehoeft >= D.PIECES.gehoeft) throw new Error("Keine Gehöfte mehr");
    if (!legalGehoeftEdges(s, seat).includes(a.edge)) throw new Error("Hier darfst du nicht bauen");
    const c = costFor(s, seat, "gehoeft");
    if (!canAfford(s, seat, c)) throw new Error("Zu wenig Rohstoffe");
    payRes(s, seat, c);
    explore(s, seat, a.edge);
    placeGehoeft(s, seat, a.edge);
    log(s, `${seatName(s, seat)} baut ein Gehöft.`, seat);
  },
  upgrade(s, seat, a) {
    const up = legalUpgrades(s, seat).find((x) => x.edge === a.edge);
    if (!up) throw new Error("Hier geht kein Ausbau");
    const what = up.to === 2 ? "burg" : "festung";
    const c = costFor(s, seat, what);
    if (!canAfford(s, seat, c)) throw new Error("Zu wenig Rohstoffe");
    payRes(s, seat, c);
    s.buildings[a.edge].level = up.to;
    log(s, `${seatName(s, seat)} baut eine ${D.LEVEL_NAME[up.to]}.`, seat);
  },
  beacon(s, seat, a) {
    if (!legalBeaconCorners(s, seat).includes(a.corner)) throw new Error("Hier darf kein Leuchtfeuer stehen");
    const c = costFor(s, seat, "leuchtfeuer");
    if (!canAfford(s, seat, c)) throw new Error("Zu wenig Rohstoffe");
    payRes(s, seat, c);
    s.beacons[a.corner] = { lit: true };
    addFame(s, seat, 2, "leuchtfeuer");
    log(s, `${seatName(s, seat)} baut ein Leuchtfeuer (+2 Ruhm).`, seat);
    checkRuf(s, seat);
  },
  relight(s, seat, a) {
    const bc = s.beacons[a.corner];
    if (!bc || bc.lit) throw new Error("Dieses Leuchtfeuer brennt schon");
    if (!canAfford(s, seat, D.COSTS.flamme)) throw new Error("Es fehlt Holz");
    payRes(s, seat, D.COSTS.flamme);
    bc.lit = true;
    log(s, `${seatName(s, seat)} entzündet ein Leuchtfeuer neu.`, seat);
    checkRuf(s, seat);
  },
  reise(s, seat) {
    if (s.journeyMoved) throw new Error("Die Gefährten sind diese Runde schon gezogen");
    const step = journeyStep(s);
    if (!step) throw new Error("Die Reise ist zu Ende");
    if (!canAfford(s, seat, step.cost)) throw new Error("Zu wenig Rohstoffe");
    s.journeyMoved = true;
    doJourney(s, seat, "zahlen");
  },
  ausfall(s, seat, a) {
    const t = ausfallTargets(s, seat).find((x) => x.field === a.field);
    if (!t) throw new Error("Hier ist keine Horde an deinen Gebäuden");
    const power = fightPower(s, seat, a);
    if (power < t.need) throw new Error(`Zu wenig Abwehr (${power} von ${t.need})`);
    spendFight(s, seat, a);
    removeHordes(s, hordesAt(s, a.field).map((h) => h.id));
    addFame(s, seat, 2, "horden");
    s.stats.ausfaelle++;
    log(s, `${seatName(s, seat)} wagt einen Ausfall und vernichtet die Horde (+2 Ruhm).`, seat);
    giveFate(s, seat);
  },
  bank(s, seat, a) {
    const rate = bankRate(s, seat);
    if (!D.RES.includes(a.give) || !D.RES.includes(a.get) || a.give === a.get) throw new Error("Ungültiger Tausch");
    if (s.seats[seat].res[a.give] < rate) throw new Error(`Du brauchst ${rate} ${D.RES_NAME[a.give]}`);
    if (s.supply[a.get] < 1) throw new Error("Der Vorrat ist leer");
    payRes(s, seat, { [a.give]: rate });
    gain(s, seat, a.get, 1);
    log(s, `${seatName(s, seat)} tauscht ${rate} ${D.RES_NAME[a.give]} gegen 1 ${D.RES_NAME[a.get]}.`, seat);
  },
  offer(s, seat, a) {
    const to = a.to | 0;
    if (to === seat || to < 0 || to >= s.nSeats) throw new Error("Ungültiger Handelspartner");
    const give = clean(a.give);
    const get = clean(a.get);
    if (!Object.keys(give).length && !Object.keys(get).length) throw new Error("Leeres Angebot");
    if (!canAfford(s, seat, give)) throw new Error("Das hast du nicht");
    interrupt(s, { type: "tradeOffer", seat: to, from: seat, give, get });
  },
  fate(s, seat, a) {
    const me = s.seats[seat];
    if (!me.hand.includes(a.card)) throw new Error("Diese Karte hast du nicht");
    switch (a.card) {
      case "eilbote": {
        const step = journeyStep(s);
        if (!step) throw new Error("Die Reise ist zu Ende");
        if (!canAfford(s, seat, step.cost)) throw new Error("Zu wenig Rohstoffe");
        takeCard(s, seat, "eilbote");
        log(s, `${seatName(s, seat)} spielt den Eilboten.`, seat);
        doJourney(s, seat, "zahlen");
        break;
      }
      case "ernte": {
        const faces = s.taken[seat] || [];
        const face = a.face && faces.includes(a.face) ? a.face : faces[0];
        if (!face) throw new Error("Du hast diese Runde keinen Würfel genommen");
        takeCard(s, seat, "ernte");
        log(s, `${seatName(s, seat)} spielt Reiche Ernte.`, seat);
        harvest(s, seat, face, true);
        break;
      }
      case "bann": {
        const h = s.hordes.find((x) => x.id === a.horde);
        if (!h) throw new Error("Diese Horde gibt es nicht");
        takeCard(s, seat, "bann");
        h.pos = TOWER_GATE;
        log(s, `${seatName(s, seat)} spielt den Bannspruch: Eine Horde muss zurück aufs Turm-Tor.`, seat);
        break;
      }
      case "wachfeuer": {
        const dark = Object.values(s.beacons).filter((b) => !b.lit);
        if (!dark.length) throw new Error("Kein Leuchtfeuer ist erloschen");
        takeCard(s, seat, "wachfeuer");
        for (const b of dark) b.lit = true;
        log(s, `${seatName(s, seat)} spielt Wachfeuer: ${dark.length} Leuchtfeuer brennen wieder.`, seat);
        checkRuf(s, seat);
        break;
      }
      case "handel": {
        const swaps = (a.swaps || []).slice(0, 3);
        if (!swaps.length) throw new Error("Kein Tausch angegeben");
        const need = {};
        for (const [g, t] of swaps) {
          if (!D.RES.includes(g) || !D.RES.includes(t)) throw new Error("Ungültiger Tausch");
          need[g] = (need[g] || 0) + 1;
        }
        if (!canAfford(s, seat, need)) throw new Error("Das hast du nicht");
        // Vorrat prüfen, bevor etwas genommen wird (vorher ging bei leerem Vorrat der Rohstoff verloren)
        const want = {};
        for (const [, t] of swaps) want[t] = (want[t] || 0) + 1;
        for (const [t, n] of Object.entries(want)) if (s.supply[t] < n) throw new Error(`Im Vorrat ist nicht genug ${D.RES_NAME[t]}`);
        takeCard(s, seat, "handel");
        for (const [g, t] of swaps) {
          payRes(s, seat, { [g]: 1 });
          gain(s, seat, t, 1);
        }
        log(s, `${seatName(s, seat)} spielt den Handelszug (${swaps.length}-mal 1 : 1).`, seat);
        break;
      }
      default:
        throw new Error("Diese Karte wirkt nur bei einem Kampf");
    }
  },
  hero(s, seat, a) {
    if (!hasHero(s, seat, a.hero)) throw new Error("Diesen Helden hast du nicht (mehr)");
    switch (a.hero) {
      case "karten": {
        const got = drawFate(s, seat, 3);
        useHero(s, seat, "karten");
        log(s, `${seatName(s, seat)} nutzt den Meister der Karten.`, seat);
        if (got.length <= 2) {
          s.seats[seat].hand.push(...got);
          checkHand(s, seat);
        } else interrupt(s, { type: "keepCards", seat, cards: got });
        break;
      }
      case "tueftler": {
        const up = legalUpgrades(s, seat).find((x) => x.edge === a.edge && x.to === 2);
        if (!up) throw new Error("Wähle ein eigenes Gehöft");
        if (s.variants.tueftlerCost) { if (!canAfford(s, seat, s.variants.tueftlerCost)) throw new Error("Zu wenig"); payRes(s, seat, s.variants.tueftlerCost); }
        useHero(s, seat, "tueftler");
        s.buildings[a.edge].level = 2;
        const tk = s.variants.tueftlerCost;
        const tkText = tk ? "für " + Object.entries(tk).map(([r, n]) => `${n} ${D.RES_NAME[r]}`).join(" und ") : "ohne Kosten";
        log(s, `${seatName(s, seat)} baut mit dem Tüftler eine Burg ${tkText}.`, seat);
        break;
      }
      case "wegweiserin": {
        const step = journeyStep(s);
        if (s.journeyMoved) throw new Error("Die Gefährten sind diese Runde schon gezogen");
        if (!step || step.field >= 10) throw new Error("Nicht auf Feld 10");
        useHero(s, seat, "wegweiserin");
        s.journeyMoved = true;
        log(s, `${seatName(s, seat)} nutzt die Wegweiserin.`, seat);
        doJourney(s, seat, "weg");
        break;
      }
      case "hueterin":
      case "chronist":
        heroHorde(s, seat, a.hero, a.horde);
        break;
      default:
        throw new Error("Dieser Held wirkt zu einem anderen Zeitpunkt");
    }
  },
  endTurn(s, seat, a, p) {
    if (!p.dieTaken) throw new Error("Nimm zuerst einen Würfel (oder einen Rohstoff)");
    log(s, `${seatName(s, seat)} beendet den Zug.`, seat);
    finishPending(s, null);
  },
};

function heroHorde(s, seat, hero, hordeId) {
  const h = s.hordes.find((x) => x.id === hordeId);
  if (!h) throw new Error("Diese Horde gibt es nicht");
  if (hero === "chronist" && !withNeighbors(board(s), CAPITAL_KEY).includes(h.pos)) throw new Error("Nur auf oder neben der Hauptstadt");
  useHero(s, seat, hero);
  addFame(s, seat, 2, "held");
  if (hero === "hueterin") {
    h.pos = TOWER_GATE;
    log(s, `${seatName(s, seat)} ruft die Hüterin der Natur: Eine Horde kehrt ohne Kampf aufs Turm-Tor zurück (+2 Ruhm).`, seat);
  } else {
    removeHordes(s, [h.id]);
    log(s, `${seatName(s, seat)} ruft den Chronisten: Eine Horde zieht ab (+2 Ruhm).`, seat);
  }
}

function clean(o) {
  const out = {};
  for (const r of D.RES) if ((o?.[r] | 0) > 0) out[r] = o[r] | 0;
  return out;
}

// ------------------------------------------------------------------ Entscheidungen auflösen
const DECISIONS = {
  chooseHero(s, p, a) {
    if (!p.offer.includes(a.hero)) throw new Error("Wähle einen der beiden Helden");
    s.seats[p.seat].heroes = [{ id: a.hero, used: false }];
    s.seats[p.seat].heroOffer = null;
    p.step.i++;
    finishPending(s, p.step);
  },
  placeWater(s, p, a) {
    const b = board(s);
    if (!b.pos[a.pos] || b.pos[a.pos].type !== "home" || s.tiles[a.pos]) throw new Error("Wähle einen freien Heimatland-Platz");
    const i = s.bag.findIndex((t) => t.kind === "wasser");
    const t = s.bag.splice(i, 1)[0];
    s.tiles[a.pos] = { kind: "wasser", model: t.model };
    log(s, `Das Küstenvolk (${seatName(s, p.seat)}) legt sein Wasser ins Heimatland.`, p.seat);
    p.step.done = true;
    finishPending(s, p.step);
  },
  placeStart(s, p, a) {
    if (!legalGehoeftEdges(s, p.seat, true).includes(a.edge)) throw new Error("Nur auf freie Kanten im Heimatland");
    placeGehoeft(s, p.seat, a.edge);
    log(s, `${seatName(s, p.seat)} setzt ein Start-Gehöft.`, p.seat);
    if (p.second) {
      const b = board(s);
      for (const f of b.edges[a.edge].fields) {
        const r = D.TERRAIN_RES[s.tiles[f]?.kind];
        if (r) gain(s, p.seat, r, 1);
      }
    }
    p.step.i++;
    finishPending(s, p.step);
  },
  reactRoll(s, p, a) {
    if (a.type === "zauberin") {
      if (!p.can.zauberin) throw new Error("Nicht möglich");
      const ch = (a.changes || []).slice(0, 2);
      for (const c of ch) {
        if (c.i < 0 || c.i >= s.dice.length || !D.DIE_FACES.includes(c.face)) throw new Error("Ungültiger Würfel");
      }
      useHero(s, p.seat, "zauberin");
      if (s.variants.zauberinFame) addFame(s, p.seat, s.variants.zauberinFame, "held");
      for (const c of ch) s.dice[c.i] = c.face;
      log(s, `${seatName(s, p.seat)} ruft die Spürzauberin und dreht ${ch.length} Würfel.`, p.seat);
      // gleicher Spieler darf danach nicht noch einmal gefragt werden; Gelehrter ist eine andere Karte
    } else if (a.type === "gelehrter") {
      if (!p.can.gelehrter) throw new Error("Nicht möglich");
      useHero(s, p.seat, "gelehrter");
      const n = s.dice.filter((d) => d === "auge").length;
      s.dice = s.dice.filter((d) => d !== "auge");
      s.stats.cancelledEyes += n;
      addFame(s, p.seat, 2, "held");
      log(s, `${seatName(s, p.seat)}: Pax vobiscum! ${n} Augen zählen nicht (+2 Ruhm).`, p.seat);
    } else if (a.type !== "pass") throw new Error("Unbekannte Antwort");
    p.step.i++;
    finishPending(s, p.step);
  },
  planerin(s, p, a) {
    if (a.type === "planerin") {
      const idx = [...new Set((a.dice || []).map((x) => x | 0))].filter((i) => i >= 0 && i < s.dice.length).slice(0, 2);
      if (!idx.length) throw new Error("Wähle Würfel");
      useHero(s, p.seat, "planerin");
      const faces = idx.map((i) => s.dice[i]);
      s.dice = s.dice.filter((_, i) => !idx.includes(i));
      s.taken[p.seat] = faces;
      s.planerinTook[p.seat] = true;
      log(s, `${seatName(s, p.seat)} nutzt die Planerin und nimmt ${faces.map((f) => D.TERRAIN_NAME[f]).join(" und ")}.`, p.seat);
      for (const f of faces) harvest(s, p.seat, f, true);
    } else if (a.type !== "pass") throw new Error("Unbekannte Antwort");
    p.step.i++;
    finishPending(s, p.step);
  },
  hordeTie(s, p, a) {
    if (!p.options.includes(a.pos)) throw new Error("Wähle eines der markierten Felder");
    p.step.choice = a.pos;
    finishPending(s, p.step);
  },
  intervene(s, p, a) {
    if (a.type === "hueterin" || a.type === "chronist") {
      if (!p.can[a.type]) throw new Error("Nicht möglich");
      heroHorde(s, p.seat, a.type, a.horde ?? p.hordes[0]);
    } else if (a.type !== "pass") throw new Error("Unbekannte Antwort");
    p.step.i++;
    finishPending(s, p.step);
  },
  pay(s, p, a) {
    const power = fightPower(s, p.seat, a);
    if (s.variants.payOrder === "v03" && power > p.need) {
      // nie mehr als nötig: keine Einheit darf übrig sein
      const units = [];
      if (a.erz | 0) units.push(1);
      if (a.pferde | 0) units.push(horseValue(s, p.seat));
      if (a.verstaerkung) units.push(3);
      if (units.some((u) => power - u >= p.need)) throw new Error(`Höchstens ${p.need} Abwehr nötig`);
    }
    spendFight(s, p.seat, a);
    p.step.paid[p.seat] = (p.step.paid[p.seat] || 0) + power;
    if (power) log(s, `${seatName(s, p.seat)} zahlt ${power} Abwehr.`, p.seat);
    p.step.i++;
    finishPending(s, p.step);
  },
  treasure(s, p, a) {
    if (!D.RES.includes(a.res)) throw new Error("Wähle einen Rohstoff");
    gain(s, p.seat, a.res, 1);
    log(s, `${seatName(s, p.seat)} hebt den Schatz: 1 ${D.RES_NAME[a.res]}.`, p.seat);
    resume(s);
  },
  discard(s, p, a) {
    const cards = a.cards || [];
    if (cards.length !== p.n) throw new Error(`Lege ${p.n} Karte(n) ab`);
    const hand = s.seats[p.seat].hand.slice();
    for (const c of cards) {
      const i = hand.indexOf(c);
      if (i < 0) throw new Error("Diese Karte hast du nicht");
      hand.splice(i, 1);
    }
    for (const c of cards) {
      s.seats[p.seat].hand.splice(s.seats[p.seat].hand.indexOf(c), 1);
      s.deck.push(c);
    }
    resume(s);
  },
  keepCards(s, p, a) {
    const keep = a.keep || [];
    if (keep.length !== Math.min(2, p.cards.length)) throw new Error("Behalte 2 Karten");
    const rest = p.cards.slice();
    for (const c of keep) {
      const i = rest.indexOf(c);
      if (i < 0) throw new Error("Ungültige Karte");
      rest.splice(i, 1);
    }
    s.seats[p.seat].hand.push(...keep);
    s.deck.push(...rest);
    s.pending = s.stack.pop() || null;
    checkHand(s, p.seat);
    if (!s.pending) run(s);
  },
  tradeOffer(s, p, a) {
    if (a.accept) {
      if (!canAfford(s, p.seat, p.get)) throw new Error("Dafür fehlen dir Rohstoffe");
      if (!canAfford(s, p.from, p.give)) throw new Error("Das Angebot ist nicht mehr gedeckt");
      for (const [r, k] of Object.entries(p.give)) {
        s.seats[p.from].res[r] -= k;
        s.seats[p.seat].res[r] += k;
      }
      for (const [r, k] of Object.entries(p.get)) {
        s.seats[p.seat].res[r] -= k;
        s.seats[p.from].res[r] += k;
      }
      log(s, `${seatName(s, p.seat)} nimmt das Handelsangebot von ${seatName(s, p.from)} an.`, p.seat);
    } else log(s, `${seatName(s, p.seat)} lehnt das Angebot von ${seatName(s, p.from)} ab.`, p.seat);
    resume(s);
  },
};

/** Aktion eines Platzes ausführen. -> wirft Error mit deutscher Meldung, wenn sie nicht erlaubt ist. */
export function act(s, seat, a) {
  if (s.over) throw new Error("Das Spiel ist vorbei");
  const p = s.pending;
  if (!p) throw new Error("Gerade ist nichts zu entscheiden");
  if (p.seat !== seat) throw new Error(`${seatName(s, p.seat)} ist dran`);
  if (p.type === "turn") {
    const fn = TURN_ACTIONS[a.type];
    if (!fn) throw new Error("Unbekannte Aktion");
    if (!p.dieTaken && !["takeDie", "takeResource"].includes(a.type)) throw new Error("Nimm zuerst einen Würfel (oder einen Rohstoff)");
    fn(s, seat, a, p);
  } else {
    const fn = DECISIONS[p.type];
    if (!fn) throw new Error("Unbekannte Entscheidung");
    fn(s, p, a);
  }
  s.rev++;
  return s;
}

// ------------------------------------------------------------------ Sicht eines Spielers (versteckte Infos entfernt)
export function view(s, seats = []) {
  const mine = new Set(seats);
  const v = JSON.parse(JSON.stringify(s));
  delete v.rng;
  delete v.queue;
  v.bag = s.bag.length;
  v.deck = s.deck.length;
  v.stack = s.stack.length;
  v.seats.forEach((x, i) => {
    delete v.seats[i].wantHero;
    if (!mine.has(i) && !s.over) {
      v.seats[i].hand = x.hand.length;
      v.seats[i].heroes = x.heroes.map((h) => (h.used ? h : { id: null, used: false }));
      v.seats[i].heroOffer = x.heroOffer ? x.heroOffer.length : null;
    }
  });
  if (v.pending && !mine.has(v.pending.seat)) {
    delete v.pending.cards;
    delete v.pending.offer;
  }
  if (v.pending) delete v.pending.step;
  return v;
}
