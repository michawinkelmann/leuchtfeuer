// Einfache Computer-Gegner: Faustregeln, kein Vorausrechnen. Gedacht zum Testen, nicht als starke Gegner.
// botAction(state, seat) liefert die nächste Aktion für die Entscheidung, die gerade bei diesem Platz liegt.

import * as E from "./engine.js";
import * as D from "./data.js";
import { CAPITAL_KEY, GATES, TOWER_GATE } from "./board.js";

const BASE = { holz: 1, stein: 1, erz: 1.15, korn: 1, pferde: 0.9 };
const HERO_RANK = ["wegweiserin", "tueftler", "gelehrter", "karten", "planerin", "hueterin", "chronist", "zauberin"];

// Standard (Regeln v0.4, 6.11.2026): die bessere Spielweise aus der Gesamtprüfung (Bot+): tauscht klüger mit dem
// Vorrat, rechnet bei der Abwehr mit, besetzt die Hauptstadt, beendet die Reise, nutzt Hüterin und Chronist offensiv.
// kvKlug (12.11.2026, Vorlage Prüfung g_simulation): Das Küstenvolk sucht Wasser und die Hauptstadt nur, solange es
// noch nicht 2 : 1 handelt (vorher baute es an beidem und verschenkte Bauplätze).
export const BOT_STANDARD = { bank: 1, def: 1, cap: 1, finish: 1, heroes: 1, kvKlug: 1 };
export function C(s, seat) {
  return (s._cfg && s._cfg[seat]) || BOT_STANDARD;
}
function hopeless(s, seat) {
  const b = behindBy(s, seat);
  return (s.journey >= 8 && b >= 6) || (s.journey >= 6 && b >= 10);
}
function capitalEmpty(s) {
  return !E.buildingsAt(s, CAPITAL_KEY).length;
}
function me(s, seat) {
  return s.seats[seat];
}
function total(res) {
  return D.RES.reduce((a, r) => a + res[r], 0);
}
function leading(s, seat) {
  const mine = E.score(s, seat).total;
  return s.seats.every((_, i) => i === seat || E.score(s, i).total <= mine);
}
function behindBy(s, seat) {
  const mine = E.score(s, seat).total;
  return Math.max(...s.seats.map((_, i) => E.score(s, i).total)) - mine;
}

// Felder, über die Horden laufen (kürzeste Wege von den Toren)
function corridor(s) {
  if (s._corr) return s._corr;
  const b = E.board(s);
  const out = new Set();
  for (const g of GATES) {
    const stack = [g];
    while (stack.length) {
      const f = stack.pop();
      if (out.has(f)) continue;
      out.add(f);
      for (const n of b.pos[f].nb) if (b.dist[n] === b.dist[f] - 1) stack.push(n);
    }
  }
  Object.defineProperty(s, "_corr", { value: out, enumerable: false });
  return out;
}

// Wert eines Rohstoffs: was für das nächste Ziel fehlt, ist mehr wert
function goals(s, seat) {
  const out = [];
  const use = E.pieceUse(s, seat);
  if (E.legalUpgrades(s, seat).some((u) => u.to === 3)) out.push(E.costFor(s, seat, "festung"));
  if (E.legalUpgrades(s, seat).some((u) => u.to === 2)) out.push(E.costFor(s, seat, "burg"));
  if (use.gehoeft < D.PIECES.gehoeft) out.push(E.costFor(s, seat, "gehoeft"));
  const j = E.journeyStep(s);
  if (j) out.push(j.cost);
  return out;
}
/** Der Rohstoff, den der Platz am dringendsten braucht, unter denen, die noch im Vorrat sind („1 beliebiger Rohstoff“) */
export function bestRes(s, seat) {
  const vals = resValue(s, seat);
  const da = D.RES.filter((r) => s.supply[r] > 0);
  return (da.length ? da : D.RES).reduce((a, r) => (vals[r] > vals[a] ? r : a));
}
/** Wert eines eigenen Würfels: Ertrag (so viel der Vorrat hergibt) × Wert; bringt er nichts und gilt leerTrost,
 *  ist er 1 beliebigen Rohstoff wert (den dringendsten). */
function dieValue(s, seat, face, vals) {
  const y = E.harvestYield(s, seat, face, true);
  const k = y.res ? Math.min(y.n, s.supply[y.res]) : 0;
  if (k > 0) return k * vals[y.res];
  if (!s.variants.leerTrost || !D.RES.some((r) => s.supply[r] > 0)) return 0;
  return vals[bestRes(s, seat)] * 0.9;
}
function resValue(s, seat) {
  const v = { ...BASE };
  const have = me(s, seat).res;
  for (const g of goals(s, seat).slice(0, 3)) {
    for (const [r, k] of Object.entries(g)) if (have[r] < k) v[r] += 0.5;
  }
  for (const r of D.RES) if (have[r] >= 4) v[r] *= 0.6;
  return v;
}
function edgeValue(s, seat, edge) {
  const b = E.board(s);
  const corr = corridor(s);
  const have = new Set();
  for (const f of E.seatFields(s, seat)) {
    const r = D.TERRAIN_RES[s.tiles[f]?.kind];
    if (r) have.add(r);
  }
  let v = 0;
  for (const f of b.edges[edge].fields) {
    const kind = s.tiles[f]?.kind;
    const pos = b.pos[f];
    if (!kind && pos.type === "fog") v += s.variants.fateExplore ? 1.3 : 0.8;   // Erkunden: neues Land (v0.4 vielleicht Schatz, v0.5 eine Karte)
    else if (D.TERRAIN_RES[kind]) v += 1 + (have.has(D.TERRAIN_RES[kind]) ? 0 : 0.5);
    else if (kind === "hauptstadt") {
      // Gebäude an der Hauptstadt: Handel 2 : 1 und Abwehr (Burg, Festung) bei Überfällen an der Hauptstadt. Seit 12.11.2026
      // dürfen dort ohnehin alle zahlen; der Bonus bleibt (gepaart gemessen: ohne ihn kein klarer Unterschied beim Turm)
      const mineThere = E.buildingsAt(s, f).some((x) => x.seat === seat);
      // kvKlug: Ein Küstenvolk, das schon 2 : 1 handelt (Hafen), braucht die Hauptstadt nicht noch einmal für den Handel
      if (C(s, seat).kvKlug && me(s, seat).people === "kuestenvolk" && !mineThere && E.bankRate(s, seat) <= 2) v += 0.3;
      else v += mineThere ? 0.3 : 1.1;
      if (C(s, seat).cap && !E.buildingsAt(s, f).length) v += 1.5;   // niemand an der Hauptstadt: dort wehrt keine Burg ab
    }
    else if (kind === "wasser") {
      const kv = me(s, seat).people === "kuestenvolk";
      // Fischer: Wasser erntet bei jedem eigenen Würfel mit; Prüfvariante c: jedes Gebäude am Wasser bringt 1
      const zaehlt = !s.variants.kuesteNurEigenes || s.tiles[f]?.kueste;
      if (kv && zaehlt && (s.variants.kuesteFischer || s.variants.kuesteWasserPlus)) v += 1.8;
      else if (kv && (s.variants.kuesteWasserEins || s.variants.kuesteWasserImmer)) v += 1.2;
      else if (kv && C(s, seat).kvKlug) v += E.bankRate(s, seat) <= 2 ? 0.1 : 0.9;   // Wasser nur, solange noch kein 2 : 1 da ist
      else v += kv ? 0.9 : 0.1;              // (nur den Hafen höher bewerten machte es schlechter)
    }
    if (corr.has(f) && !(me(s, seat).people === "halblinge" && s.variants.halblinge !== "A")) v -= 0.25;
  }
  return v;
}

// Zahlen mit Erz und Pferden, so dass need erreicht und nicht überschritten wird
function payFor(s, seat, need, allowCard = true) {
  const m = me(s, seat);
  const hv = E.horseValue(s, seat);
  let erz = 0;
  let pferde = 0;
  let rest = need;
  if (hv === 2) {
    while (rest >= 2 && pferde < m.res.pferde) { pferde++; rest -= 2; }
    while (rest > 0 && erz < m.res.erz) { erz++; rest -= 1; }
    if (rest > 0 && pferde < m.res.pferde) { pferde++; rest -= 2; }
  } else {
    while (rest > 0 && erz < m.res.erz) { erz++; rest -= 1; }
    while (rest > 0 && pferde < m.res.pferde) { pferde++; rest -= 1; }
  }
  if (rest > 0 && allowCard && m.hand.includes("verstaerkung") && need >= 2) {
    // Karte statt Rohstoffe, wenn das reicht
    if (need <= 3) return { erz: 0, pferde: 0, verstaerkung: true, power: 3 };
    return null;
  }
  if (rest > 0) return null;
  return { erz, pferde, verstaerkung: false, power: need - rest };
}

// v0.5: Jeder gezahlte Rohstoff bringt Ruhm. Gesucht ist die Zahlung, die die Lücke am weitesten schließt und dabei die
// meisten Rohstoffe (= Ruhm) ausgibt; nie eine überzählige Einheit (Regel „nie mehr als nötig“, wie in der Engine geprüft).
// Die Verstärkung (+3, ohne Ruhm) nur, wenn sie mehr Lücke schließt.
function payGreedy(s, seat, need) {
  const m = me(s, seat);
  const hv = E.horseValue(s, seat);
  let best = null;
  for (const v of m.hand.includes("verstaerkung") ? [false, true] : [false]) {
    for (let e = 0; e <= Math.min(m.res.erz, need); e++) {
      for (let p = 0; p <= Math.min(m.res.pferde, Math.ceil(need / hv)); p++) {
        const power = e + p * hv + (v ? 3 : 0);
        if (power > need && ((e && power - 1 >= need) || (p && power - hv >= need) || (v && power - 3 >= need))) continue;
        const key = [Math.min(power, need), e + p, v ? 0 : 1];
        if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] > best.key[1] || (key[1] === best.key[1] && key[2] > best.key[2])))) {
          best = { key, e, p, v };
        }
      }
    }
  }
  return { type: "pay", erz: best.e, pferde: best.p, verstaerkung: best.v };
}

function bestDie(s, seat) {
  const vals = resValue(s, seat);
  let best = { i: 0, v: -1, face: null };
  let worst = { i: 0, v: Infinity };
  s.dice.forEach((face, i) => {
    const v = dieValue(s, seat, face, vals);
    if (v > best.v) best = { i, v, face: null };
    if (v < worst.v) worst = { i, v };
  });
  const ek = s.variants.elbenCost ?? 2;
  if (me(s, seat).people === "elben" && me(s, seat).res.korn >= ek + 1 && s.dice.length) {
    // gedreht wird der Würfel, der sonst am wenigsten bringt
    for (const face of ["wald", "feld", "weide", "huegel", "gebirge"]) {
      const v = dieValue(s, seat, face, vals) - ek * vals.korn;
      if (v > best.v + 1) best = { i: worst.i, v, face };
    }
  }
  return best;
}

// Horden an eigenen Gebäuden: Was fehlt, wenn sie am Rundenende angreifen? (v0.5, ohne Ausfall)
function threatsOf(s, seat) {
  if (!s.variants.noAusfall) return E.ausfallTargets(s, seat);
  const out = [];
  for (const f of new Set(s.hordes.map((h) => h.pos))) {
    if (f !== CAPITAL_KEY && !E.buildingsAt(s, f).some((x) => x.seat === seat)) continue;
    const need = E.hordeStrength(s) * E.hordesAt(s, f).length - E.baseDefense(s, f) - (f === CAPITAL_KEY ? s.variants.capitalDefense || 0 : 0);
    out.push({ field: f, need: Math.max(0, need) });
  }
  return out;
}

function towerDanger(s) {
  return s.variants.towerMax - s.tower;      // wie viele Segmente bis zur Niederlage
}

function turnAction(s, seat, p, tries) {
  const m = me(s, seat);
  // Würfel ohne Ertrag (leerTrost): erst den freien Rohstoff nehmen
  if (p.trost > 0) return { type: "takeResource", res: bestRes(s, seat) };
  if (!p.dieTaken) {
    // v0.5: Planerin im eigenen Zug, wenn die zwei besten Würfel zusammen genug bringen
    if (s.variants.planerinTurn && s.dice.length >= 2 && s.round >= 2 && m.heroes.some((h) => h.id === "planerin" && !h.used)) {
      const vals = resValue(s, seat);
      const scored = s.dice.map((f, i) => ({ i, v: dieValue(s, seat, f, vals), face: null })).sort((a, b) => b.v - a.v);
      const zwei = scored.slice(0, 2);
      if (s.variants.elbenPlanerin && m.people === "elben") {
        // Elben mit der Planerin (9.11.2026): je Würfel für 1 Korn drehen, wenn es mehr als 1 Wertpunkt bringt und Korn übrig bleibt
        const ek = s.variants.elbenCost ?? 2;
        let korn = m.res.korn;
        let bf = null, bv = -1;
        for (const face of ["wald", "feld", "weide", "huegel", "gebirge"]) {
          const v = dieValue(s, seat, face, vals);
          if (v > bv) { bv = v; bf = face; }
        }
        for (const d of zwei.slice().reverse()) {
          if (korn >= ek + 1 && bv - ek * vals.korn > d.v + 1) { d.v = bv - ek * vals.korn; d.face = bf; korn -= ek; }
        }
      }
      if (zwei[0].v + zwei[1].v >= 4) {
        const a = { type: "hero", hero: "planerin", dice: zwei.map((d) => d.i) };
        if (zwei.some((d) => d.face)) a.faces = zwei.map((d) => d.face);
        return a;
      }
    }
    if (s.dice.length) {
      const b = bestDie(s, seat);
      return b.face ? { type: "takeDie", index: b.i, face: b.face } : { type: "takeDie", index: b.i };
    }
    return { type: "takeResource", res: bestRes(s, seat) };
  }
  if (tries > 40) return { type: "endTurn" };

  // Karten und Helden
  if (m.hand.includes("ernte") && (s.taken[seat] || []).some((f) => E.harvestYield(s, seat, f, true).n >= 2)) {
    return { type: "fate", card: "ernte" };
  }
  if (!s.variants.wachfeuerBau && m.hand.includes("wachfeuer") && Object.values(s.beacons).filter((b) => !b.lit).length >= 2) return { type: "fate", card: "wachfeuer" };
  const threats = threatsOf(s, seat);
  const bannOk = new Set(E.bannZiele(s).map((h) => h.id));
  const bannT = threats.find((t) => t.need > 2 && E.hordesAt(s, t.field).some((h) => bannOk.has(h.id)));
  if (m.hand.includes("bann") && bannT) {
    const h = E.hordesAt(s, bannT.field).find((x) => bannOk.has(x.id));
    return { type: "fate", card: "bann", horde: h.id };
  }
  if (E.legalUpgrades(s, seat).some((u) => u.to === 2) && m.heroes.some((h) => h.id === "tueftler" && !h.used)
      && (!s.variants.tueftlerCost || E.canAfford(s, seat, s.variants.tueftlerCost))) {
    const up = E.legalUpgrades(s, seat).filter((u) => u.to === 2).sort((a, b) => edgeValue(s, seat, b.edge) - edgeValue(s, seat, a.edge))[0];
    return { type: "hero", hero: "tueftler", edge: up.edge };
  }
  if (m.heroes.some((h) => h.id === "karten" && !h.used) && s.round >= 2 && m.hand.length <= 1 && (Array.isArray(s.deck) ? s.deck.length : s.deck) >= 1) {
    return { type: "hero", hero: "karten" };
  }
  const step = E.journeyStep(s);
  if (step && !s.journeyMoved && step.field <= 9 && m.heroes.some((h) => h.id === "wegweiserin" && !h.used)
      && (step.danger || step.field >= 6)) {
    return { type: "hero", hero: "wegweiserin" };
  }
  for (const hero of ["hueterin", "chronist"]) {
    if (!m.heroes.some((h) => h.id === hero && !h.used)) continue;
    if (s.variants.heroTurnOnly) {
      // v0.5 nur im eigenen Zug: die Horde, die am meisten bedroht (Hauptstadt, eigene Gebäude, nah an der Hauptstadt);
      // gegen Ende jede (+2 Ruhm, bevor das Spiel vorbei ist)
      const b = E.board(s);
      const weit = hero === "chronist" ? E.chronistReichweite(s) : 1;
      // Wert einer Horde: Hauptstadt, nah an ihr, an eigenen Gebäuden, als Stapel; mit der größeren Reichweite des
      // Chronisten (12.11.2026) zählt auch, dass sie in Reichweite ist und der Hauptstadt näher kommt
      const wert = (h) => (h.pos === CAPITAL_KEY ? 3 : 0) + (b.dist[h.pos] <= 1 ? 1 : 0)
        + (weit > 1 && b.dist[h.pos] <= weit ? 0.5 : 0) + (E.hordesAt(s, h.pos).length >= 2 ? 0.5 : 0)
        + E.buildingsAt(s, h.pos).filter((x) => x.seat === seat).reduce((a, x) => a + x.level, 0);
      const ziele = (hero === "chronist" ? E.chronistZiele(s) : E.bannZiele(s))
        .sort((x, y) => wert(y) - wert(x) || b.dist[x.pos] - b.dist[y.pos]);
      // Chronist: jede Horde in Reichweite (sie bedroht bald die Hauptstadt); Hüterin: erst bei echter Bedrohung
      const schwelle = hero === "chronist" ? (weit > 1 ? 0.5 : 1) : 2;
      if (ziele.length && (wert(ziele[0]) >= schwelle || s.journey >= 8)) return { type: "hero", hero, horde: ziele[0].id };
      continue;
    }
    const t = threats.find((x) => x.need > total(m.res) / 2 && x.need >= 3);
    if (t) {
      const h = E.hordesAt(s, t.field)[0];
      if (hero === "hueterin" ? E.bannZiele(s).includes(h) : E.chronistZiele(s).includes(h)) return { type: "hero", hero, horde: h.id };
    }
  }

  // Niederlage aus Trotz: aussichtslos hinten -> Gefahrenfeld betreten, wenn das den Turm vollendet
  if (C(s, seat).trotz && hopeless(s, seat)) {
    if (step && !s.journeyMoved && step.danger && E.canAfford(s, seat, step.cost) && m.people !== "halblinge"
        && s.tower + s.variants.dangerTower >= s.variants.towerMax) { s._trotzKill = seat; return { type: "reise" }; }
  }
  // Ausfall, wenn er billig ist (v0.4)
  for (const t of s.variants.noAusfall ? [] : threats) {
    if (C(s, seat).trotz && hopeless(s, seat)) break;
    const pay = payFor(s, seat, t.need, true);
    if (pay && (t.need <= 3 || pay.verstaerkung || towerDanger(s) <= 2)) {
      return { type: "ausfall", field: t.field, erz: pay.erz, pferde: pay.pferde, verstaerkung: pay.verstaerkung };
    }
  }

  // Reise
  if (step && !s.journeyMoved && E.canAfford(s, seat, step.cost)) {
    const cost = Object.values(step.cost).reduce((a, x) => a + x, 0);
    let want = step.fame / cost >= 0.6 || s.round >= 18;
    if (C(s, seat).finish) {
      const mine = E.score(s, seat).total;
      const best = Math.max(...s.seats.map((_, i) => (i === seat ? -99 : E.score(s, i).total)));
      if (step.field >= 8 && step.field <= 9 && behindBy(s, seat) > 8 && s.round < 25) want = false;
      if (step.field === 10 && !(mine + step.fame > best + 1) && s.round < 30) want = false;
    } else if (!C(s, seat).eager) {
      if (step.field >= 8 && behindBy(s, seat) > 4 && s.round < 25) want = false;
      if (step.field === 10 && !leading(s, seat) && s.round < 30) want = false;
    }
    if (step.danger && m.people !== "halblinge" && !s.variants.dangerHorde && !s.variants.dangerCap && towerDanger(s) <= s.variants.dangerTower) want = false;   // nie selbst verlieren
    if (want) return { type: "reise" };
  }

  // Bauen: Festung, Burg, Leuchtfeuer, Gehöft
  const isFront = (e) => (E.board(s).edges[e].fields.some((f) => f === CAPITAL_KEY || corridor(s).has(f)) ? 1 : 0);
  const ups = E.legalUpgrades(s, seat).sort((a, b) => b.to - a.to || isFront(b.edge) - isFront(a.edge) || edgeValue(s, seat, b.edge) - edgeValue(s, seat, a.edge));
  for (const u of ups) {
    const c = E.costFor(s, seat, u.to === 2 ? "burg" : "festung");
    const front = E.board(s).edges[u.edge].fields.some((f) => f === CAPITAL_KEY || corridor(s).has(f));
    if (E.canAfford(s, seat, c) && (edgeValue(s, seat, u.edge) >= 1 || front)) return { type: "upgrade", edge: u.edge };
  }
  const corners = E.legalBeaconCorners(s, seat);
  const wachfeuer = s.variants.wachfeuerBau && m.hand.includes("wachfeuer") && E.canAfford(s, seat, E.wachfeuerCost(s, seat));
  if (corners.length && (wachfeuer || E.canAfford(s, seat, E.costFor(s, seat, "leuchtfeuer")))) {
    const corr = corridor(s);
    const b = E.board(s);
    const best = corners.sort((x, y) => b.corners[y].fields.filter((f) => corr.has(f)).length - b.corners[x].fields.filter((f) => corr.has(f)).length)[0];
    return wachfeuer ? { type: "fate", card: "wachfeuer", corner: best } : { type: "beacon", corner: best };
  }
  if (E.pieceUse(s, seat).gehoeft < D.PIECES.gehoeft && E.canAfford(s, seat, E.costFor(s, seat, "gehoeft"))) {
    const edges = E.legalGehoeftEdges(s, seat);
    if (edges.length) {
      const best = edges.reduce((a, e) => (edgeValue(s, seat, e) > edgeValue(s, seat, a) ? e : a), edges[0]);
      if (edgeValue(s, seat, best) > 0.3) return { type: "build", edge: best };
    }
  }
  // Leuchtfeuer neu entzünden, wenn Horden nahe sind oder der Ruf winkt
  const dark = Object.entries(s.beacons).filter(([, b]) => !b.lit).map(([c]) => c);
  const lit = Object.values(s.beacons).filter((b) => b.lit).length;
  const rufNeed = s.nSeats <= 3 && s.variants.rufCountSmall !== undefined ? s.variants.rufCountSmall : s.variants.rufCount;
  if (!s.variants.beaconsNeverOut && dark.length && m.res.holz >= 2 && (!s.ruf && lit === rufNeed - 1 || s.hordes.length >= 2)) {
    const b = E.board(s);
    const ok = dark.find((c) => !b.corners[c].fields.some((f) => E.hordesAt(s, f).length));
    if (ok) return { type: "relight", corner: ok };
  }
  // Tauschen (besser): einem Ziel fehlen höchstens 2 Rohstoffe, die sich aus Überschuss eintauschen lassen
  if (C(s, seat).bank) {
    const t = smartTrade(s, seat, step);
    if (t) return t;
  }
  // Tauschen: einem Ziel fehlt genau ein Rohstoff
  const rate = E.bankRate(s, seat);
  for (const g of goals(s, seat)) {
    const miss = Object.entries(g).filter(([r, k]) => m.res[r] < k);
    if (miss.length !== 1 || g[miss[0][0]] - m.res[miss[0][0]] !== 1) continue;
    const get = miss[0][0];
    const give = D.RES.filter((r) => r !== get && m.res[r] - (g[r] || 0) >= rate).sort((a, b) => m.res[b] - m.res[a])[0];
    if (give && s.supply[get] > 0) return { type: "bank", give, get };
  }
  if (m.hand.includes("handel")) {
    for (const g of goals(s, seat)) {
      const miss = Object.entries(g).filter(([r, k]) => m.res[r] < k);
      const short = miss.reduce((a, [r, k]) => a + k - m.res[r], 0);
      if (!short || short > 3) continue;
      const swaps = [];
      const spare = { ...m.res };
      for (const [r, k] of Object.entries(g)) spare[r] -= k;
      for (const [r, k] of miss) {
        for (let x = m.res[r]; x < k; x++) {
          const give = D.RES.find((q) => q !== r && spare[q] > 0);
          if (!give) break;
          spare[give]--;
          swaps.push([give, r]);
        }
      }
      const want = {};
      for (const [, r] of swaps) want[r] = (want[r] || 0) + 1;
      if (swaps.length === short && Object.entries(want).every(([r, k]) => s.supply[r] >= k)) return { type: "fate", card: "handel", swaps };
    }
  }
  if (m.hand.includes("eilbote") && step && leading(s, seat) && E.canAfford(s, seat, step.cost)
      && !(step.danger && towerDanger(s) <= 2)) {
    return { type: "fate", card: "eilbote" };
  }
  return { type: "endTurn" };
}

function smartTrade(s, seat, step) {
  const m = me(s, seat);
  const rate = E.bankRate(s, seat);
  const gl = [];
  if (step && !s.journeyMoved) gl.push(step.cost);
  const ups = E.legalUpgrades(s, seat);
  if (ups.some((u) => u.to === 3)) gl.push(E.costFor(s, seat, "festung"));
  if (ups.some((u) => u.to === 2)) gl.push(E.costFor(s, seat, "burg"));
  if (E.legalBeaconCorners(s, seat).length) gl.push(E.costFor(s, seat, "leuchtfeuer"));
  if (E.pieceUse(s, seat).gehoeft < D.PIECES.gehoeft && E.legalGehoeftEdges(s, seat).length) gl.push(E.costFor(s, seat, "gehoeft"));
  for (const g of gl) {
    const miss = D.RES.filter((r) => (g[r] || 0) > m.res[r]);
    const short = miss.reduce((a, r) => a + g[r] - m.res[r], 0);
    if (!short || short > 2) continue;
    const get = miss.find((r) => s.supply[r] > 0);
    if (!get) continue;
    const give = D.RES.filter((r) => !miss.includes(r) && m.res[r] - (g[r] || 0) >= rate).sort((a, b) => (m.res[b] - (g[b] || 0)) - (m.res[a] - (g[a] || 0)))[0];
    if (!give) continue;
    // nur, wenn danach noch genug Überschuss für den Rest da ist
    const spare = D.RES.filter((r) => !miss.includes(r)).reduce((a, r) => a + Math.floor(Math.max(0, m.res[r] - (g[r] || 0)) / rate), 0);
    if (spare < short) continue;
    return { type: "bank", give, get };
  }
  return null;
}

// Bessere Abwehr: rechnet mit, ob die anderen Zahlungsberechtigten den Rest decken können,
// und bewertet ein Turmsegment nach der Gefahr (je näher am Ende, desto teurer).
function capacity(s, seat) {
  const m = me(s, seat);
  return m.res.erz + m.res.pferde * E.horseValue(s, seat) + (m.hand.includes("verstaerkung") ? 3 : 0);
}
function smartPay(s, seat, p) {
  const m = me(s, seat);
  const loss = p.kind === "siege" ? s.variants.siegeTower : 1;
  const left = towerDanger(s) - loss;                 // Segmente Luft nach einem verlorenen Kampf
  const mineHere = E.buildingsAt(s, p.field).filter((x) => x.seat === seat);
  const atStake = mineHere.reduce((a, x) => a + (x.level === 1 && m.people === "halblinge" ? 0 : 1), 0);
  const cap = capacity(s, seat);
  // wer nach mir noch zahlen darf
  const order = E.payers(s, p.field);
  const after = order.slice(order.indexOf(seat) + 1);
  const othersCap = after.reduce((a, i) => a + capacity(s, i), 0);
  // Wert, den Kampf zu gewinnen (in Rohstoffen): Turmsegment(e) + eigene Gebäudestufen + 2 Ruhm/Karte, wenn ich die ganze Lücke zahle
  const segVal = left <= 0 ? 99 : left === 1 ? 6 : left === 2 ? 4 : left <= 3 ? 2.5 : 1.5;
  const val = segVal * loss + atStake * 2 + (cap >= p.need ? 3 : 0);
  let pay = 0;
  if (cap >= p.need && val >= p.need) pay = p.need;
  else if (cap + othersCap >= p.need && val >= p.need && left <= 2) pay = Math.min(cap, p.need);   // Teil zahlen, Rest kommt wohl
  if (left <= 0) pay = Math.min(cap, p.need);
  if (pay <= 0) return { type: "pay", erz: 0, pferde: 0 };
  const exact = payFor(s, seat, pay, true);
  if (exact) return { type: "pay", erz: exact.erz, pferde: exact.pferde, verstaerkung: exact.verstaerkung };
  const hv = E.horseValue(s, seat);
  const erz = Math.min(m.res.erz, pay);
  const pferde = Math.min(m.res.pferde, Math.ceil((pay - erz) / hv));
  if (erz + pferde * hv < p.need && m.hand.includes("verstaerkung") && pay >= 3) return { type: "pay", erz: 0, pferde: 0, verstaerkung: true };
  return { type: "pay", erz, pferde };
}

export function botAction(s, seat, tries = 0) {
  const p = s.pending;
  if (!p || p.seat !== seat) return null;
  const m = me(s, seat);
  switch (p.type) {
    case "chooseHero":
      return { type: "chooseHero", hero: p.offer.slice().sort((a, b) => HERO_RANK.indexOf(a) - HERO_RANK.indexOf(b))[0] };
    case "placeWater": {
      const b = E.board(s);
      const free = Object.values(b.pos).filter((x) => x.type === "home" && !s.tiles[x.key]);
      if (s.variants.noKuesteErnte && !s.variants.kuesteFischer && !s.variants.kuesteWasserPlus && !s.variants.kuesteWasserEins && !s.variants.kuesteWasserImmer) {
        // v0.5: Wasser bringt nur den Hafen (2 : 1). Nicht an die Hauptstadt (dort gibt es 2 : 1 ohnehin), sondern an den
        // Rand, wo es keinen guten Bauplatz kostet
        const rand = (x) => (x.nb.includes(CAPITAL_KEY) ? 10 : 0) + x.nb.length;
        return { type: "placeWater", pos: free.slice().sort((x, y) => rand(x) - rand(y))[0].key };
      }
      const best = free.find((x) => x.nb.includes(CAPITAL_KEY)) || free[0];
      return { type: "placeWater", pos: best.key };
    }
    case "placeStart": {
      let edges = E.legalGehoeftEdges(s, seat, true);
      const cf0 = C(s, seat);
      const atCap = (e) => E.board(s).edges[e].fields.includes(CAPITAL_KEY);
      if (cf0.capFirst && !p.second && edges.some(atCap)) edges = edges.filter(atCap);
      if (cf0.noCap) edges = edges.filter((e) => !atCap(e)).length ? edges.filter((e) => !atCap(e)) : edges;
      const best = edges.reduce((a, e) => (edgeValue(s, seat, e) > edgeValue(s, seat, a) ? e : a), edges[0]);
      return { type: "placeStart", edge: best };
    }
    case "reactRoll": {
      const eyes = s.dice.filter((d) => d === "auge").length;
      if (p.can.gelehrter && (eyes >= 2 || (eyes >= 1 && towerDanger(s) <= 3))) return { type: "gelehrter" };
      if (p.can.zauberin && eyes >= 1) {
        const best = ["wald", "feld", "weide", "huegel", "gebirge"].reduce((a, f) =>
          (E.harvestYield(s, seat, f, true).n > E.harvestYield(s, seat, a, true).n ? f : a), "wald");
        const changes = s.dice.map((d, i) => ({ d, i })).filter((x) => x.d === "auge").slice(0, 2).map((x) => ({ i: x.i, face: best }));
        return { type: "zauberin", changes };
      }
      return { type: "pass" };
    }
    case "planerin": {
      if (s.round < 2 || s.dice.length < 2) return { type: "pass" };
      const vals = resValue(s, seat);
      const scored = s.dice.map((f, i) => {
        const y = E.harvestYield(s, seat, f, true);
        return { i, v: y.res ? y.n * vals[y.res] : 0 };
      }).sort((a, b) => b.v - a.v);
      if (scored[0].v + scored[1].v < 3) return { type: "pass" };
      return { type: "planerin", dice: [scored[0].i, scored[1].i] };
    }
    case "turn":
      return turnAction(s, seat, p, tries);
    case "hordeTie": {
      const cnt = (f) => E.buildingsAt(s, f).filter((x) => x.seat === seat).length;
      return { type: "hordeTie", pos: p.options.reduce((a, f) => (cnt(f) < cnt(a) ? f : a), p.options[0]) };
    }
    case "raidOrder": {
      // gleich nahe Überfälle (12.11.2026): zuerst dort, wo eigene Gebäude stehen (dann reicht das eigene Erz sicher dafür)
      if (!s.variants.raidTieChoice) return { type: "pass" };          // alte Spielstände: die Engine wählt selbst
      const eigen = (f) => E.buildingsAt(s, f).filter((x) => x.seat === seat).reduce((a, x) => a + x.level, 0);
      return { type: "raidOrder", pos: p.options.reduce((a, f) => (eigen(f) > eigen(a) ? f : a), p.options[0]) };
    }
    case "intervene": {
      const mineHere = E.buildingsAt(s, p.field).some((x) => x.seat === seat);
      const strength = E.hordeStrength(s) * p.hordes.length;
      const gap = strength - E.baseDefense(s, p.field);
      const canPay = m.res.erz + m.res.pferde * E.horseValue(s, seat);
      let bad = (p.kind === "siege" && towerDanger(s) <= s.variants.siegeTower) || (mineHere && gap > canPay && gap >= 3);
      if (C(s, seat).heroes && gap > 0 && (p.kind === "siege" || mineHere || towerDanger(s) <= 3)) bad = true;   // +2 Ruhm, Horde weg: gleich nutzen
      if (bad && p.can.chronist) return { type: "chronist", horde: p.hordes[0] };
      if (bad && p.can.hueterin) return { type: "hueterin", horde: p.hordes[0] };
      return { type: "pass" };
    }
    case "pay": {
      if (p.need <= 0) return { type: "pay", erz: 0, pferde: 0 };
      if (s.variants.payFame) return payGreedy(s, seat, p.need);
      const cf = C(s, seat);
      const lossX = p.kind === "siege" ? s.variants.siegeTower : 1;
      if (cf.trotz && hopeless(s, seat)) return { type: "pay", erz: 0, pferde: 0 };
      if (cf.free && towerDanger(s) > lossX) return { type: "pay", erz: 0, pferde: 0 };   // Trittbrettfahrer: nur wenn sonst alle verlieren
      if (cf.def) {
        const r = smartPay(s, seat, p);
        if (r) return r;
      }
      const mineHere = E.buildingsAt(s, p.field).filter((x) => x.seat === seat);
      const atStake = mineHere.reduce((a, x) => a + x.level, 0);
      const loss = p.kind === "siege" ? s.variants.siegeTower : 1;
      const critical = towerDanger(s) <= loss;                    // sonst ist das Spiel für alle verloren
      const risky = towerDanger(s) <= loss + 2;
      let budget = 0;
      if (critical) budget = p.need;
      else if (risky) budget = Math.min(p.need, 4);
      else if (atStake >= 2 || p.kind === "siege") budget = Math.min(p.need, 3);
      else if (atStake === 1) budget = Math.min(p.need, 2);
      else if (p.need <= 2) budget = p.need;                     // billiger Ruhm
      if (budget <= 0) return { type: "pay", erz: 0, pferde: 0 };
      const pay = payFor(s, seat, Math.min(budget, p.need), critical || risky || p.need >= 3);
      if (!pay) {
        // so viel wie möglich (nur wenn es eng wird oder eigene Gebäude dort stehen)
        if (!(critical || risky || atStake)) return { type: "pay", erz: 0, pferde: 0 };
        const hv = E.horseValue(s, seat);
        let erz = Math.min(m.res.erz, p.need);
        let pferde = Math.min(m.res.pferde, Math.ceil((p.need - erz) / hv));
        return { type: "pay", erz, pferde };
      }
      return { type: "pay", erz: pay.erz, pferde: pay.pferde, verstaerkung: pay.verstaerkung };
    }
    case "treasure": {
      const vals = resValue(s, seat);
      return { type: "treasure", res: D.RES.reduce((a, r) => (vals[r] > vals[a] ? r : a), "holz") };
    }
    case "discard": {
      const pref = ["eilbote", "handel", "ernte", "wachfeuer", "bann", "verstaerkung"];
      const hand = m.hand.slice().sort((a, b) => pref.indexOf(a) - pref.indexOf(b));
      return { type: "discard", cards: hand.slice(0, p.n) };
    }
    case "keepCards": {
      const pref = ["verstaerkung", "bann", "ernte", "wachfeuer", "handel", "eilbote"];
      return { type: "keepCards", keep: p.cards.slice().sort((a, b) => pref.indexOf(a) - pref.indexOf(b)).slice(0, 2) };
    }
    case "tradeOffer": {
      const vals = resValue(s, seat);
      const val = (o) => Object.entries(o).reduce((a, [r, k]) => a + k * vals[r], 0);
      const ok = E.canAfford(s, seat, p.get) && val(p.give) >= val(p.get) + 0.2;
      return { type: "tradeAnswer", accept: ok };
    }
    default:
      return null;
  }
}

/** Sicherer Ersatzzug, wenn ein Bot (oder ein Bot-Vorschlag) abgelehnt wurde: Rohstoff nehmen, Würfel nehmen, Zug
 *  beenden, passen, nichts zahlen, ablehnen. -> Aktion oder null */
export function ersatzZug(s, p = s.pending) {
  if (!p) return null;
  if (p.type === "turn") {
    if (p.trost > 0) return { type: "takeResource", res: bestRes(s, p.seat) };
    if (p.dieTaken) return { type: "endTurn" };
    return s.dice.length ? { type: "takeDie", index: 0 } : { type: "takeResource", res: bestRes(s, p.seat) };
  }
  if (p.type === "raidOrder" || p.type === "hordeTie") return { type: p.type, pos: p.options[0] };
  return { reactRoll: { type: "pass" }, planerin: { type: "pass" }, intervene: { type: "pass" },
    pay: { type: "pay", erz: 0, pferde: 0 }, tradeOffer: { type: "tradeAnswer", accept: false } }[p.type] || null;
}

/** Lässt Bots ziehen, bis ein Mensch entscheiden muss oder das Spiel vorbei ist. -> Zahl der Bot-Aktionen */
export function runBots(s, isBot = (i) => s.seats[i].bot, maxSteps = 20000) {
  let n = 0;
  let tries = 0;
  let last = null;
  while (!s.over && s.pending && isBot(s.pending.seat) && n < maxSteps) {
    const before = s.pending;
    tries = before === last ? tries + 1 : 0;
    last = before;
    const a = botAction(s, s.pending.seat, tries);
    if (!a) break;
    try {
      E.act(s, s.pending.seat, a);
    } catch (err) {
      // Faustregel daneben: bei Zügen den Zug beenden, sonst passen bzw. nichts zahlen
      const fb = ersatzZug(s, before);
      if (!fb) throw new Error(`Bot hängt (${before.type}): ${err.message}`);
      try {
        E.act(s, before.seat, fb);
      } catch (e2) {
        throw new Error(`Bot hängt (${before.type}): ${err.message} / ${e2.message}`);
      }
    }
    n++;
  }
  return n;
}
