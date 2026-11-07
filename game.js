// Spielansicht: Verbindung zum Server, Seitenleiste mit Entscheidungen und Aktionen, 3D-Brett.
import { createScene } from "./szene.js";
import * as E from "./shared/engine.js";
import * as D from "./shared/data.js";
import { GATES, CAPITAL_KEY, withNeighbors } from "./shared/board.js";
import { h, icon, resIcons, esc, modal, closeModal, clientId, toast } from "./ui.js";
import { t, volkName } from "./sprache.js";
import { EN, gelaende, gelaendeSatz, wuerfelName, rohstoff, rohstoffSatz, torName, ruhmGrund, logText } from "./i18n_spiel.js";

// Kartentexte: aus dem Generator (texte.js), sonst dieser Stand vom 5.11.2026
const FALLBACK_HELDEN = {
  karten: ["Meister der Karten", "Ziehe 3 Schicksalskarten und behalte 2."],
  zauberin: ["Die Spürzauberin", "Sofort nach dem Runenwurf: Drehe bis zu 2 Würfel beliebig."],
  tueftler: ["Der Tüftler", "Baue eine Burg für 1 Stein und 1 Erz."],
  planerin: ["Die Planerin", "Nimm in einer Runde als Erste 2 Würfel statt 1."],
  hueterin: ["Die Hüterin der Natur", "Schicke eine Horde ohne Kampf zurück aufs Turm-Tor. +2 Ruhm."],
  gelehrter: ["Der Gelehrte", "Pax vobiscum: Die Augen eines Runenwurfs zählen nicht. +2 Ruhm."],
  wegweiserin: ["Die Wegweiserin", "Die Gefährten ziehen 1 Feld, ohne Kosten und Gefahr, mit Ruhm. Nicht auf 10."],
  chronist: ["Der Chronist", "Eine Horde an der Hauptstadt zieht ab, der Turm wächst nicht. +2 Ruhm."],
};
const FALLBACK_SCHICKSAL = {
  eilbote: ["Eilbote", "Die Gefährten ziehen sofort 1 Feld, auch zusätzlich. Du zahlst und erhältst den Ruhm."],
  ernte: ["Reiche Ernte", "Ernte deinen Würfel ein zweites Mal."],
  bann: ["Bannspruch", "Schicke eine Horde zurück aufs Turm-Tor."],
  wachfeuer: ["Wachfeuer", "Entzünde alle erloschenen Leuchtfeuer ohne Kosten."],
  handel: ["Handelszug", "Tausche bis zu 3-mal 1 : 1 mit dem Vorrat."],
  verstaerkung: ["Verstärkung", "+3 Abwehr bei einem Überfall oder Ausfall, als hättest du gezahlt."],
};
const TXT = { helden: { ...FALLBACK_HELDEN }, schicksal: { ...FALLBACK_SCHICKSAL } };
const NOUNS = new Set(["schicksalskarten", "schicksalskarte", "karten", "karte", "runenwurf", "runenwurfs", "würfel", "burg", "kosten",
  "runde", "reise", "erste", "horde", "horden", "kampf", "turm-tor", "ruhm", "augen", "auge", "gefährten", "feld", "felder", "gefahr", "hauptstadt",
  "turm", "vorrat", "abwehr", "überfall", "ausfall", "leuchtfeuer", "rohstoff", "rohstoffe", "ruine", "zug", "hand", "spiel", "held", "pferde",
  "erz", "korn", "holz", "stein"]);
// Kartentitel in Versalien → „Die Hüterin der Natur“ / „Warden of Nature“: jedes Wort groß außer Artikeln und kleinen Wörtern
function titel(v) {
  if (!v || typeof v !== "string" || v !== v.toUpperCase()) return v;
  const klein = new Set(["der", "die", "das", "des", "von", "und", "im", "am", "of", "the", "and"]);
  return v.toLowerCase().split(" ").map((w, i) => (i && klein.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}
function cap(v) {
  if (!v || typeof v !== "string") return v;
  if (v !== v.toUpperCase()) return v;
  // Versalien der Karten in normale Schreibung: Satzanfänge und Substantive groß
  let start = true;
  return v.toLowerCase().split(/(\s+)/).map((tok) => {
    if (/^\s+$/.test(tok)) return tok;
    const core = tok.replace(/^[^\p{L}]+|[^\p{L}-]+$/gu, "");
    let out = tok;
    if (core && (start || NOUNS.has(core))) {
      const i = tok.indexOf(core[0]);
      out = tok.slice(0, i) + tok[i].toUpperCase() + tok.slice(i + 1);
    }
    if (core) start = /[.:!?]$/.test(tok);
    return out;
  }).join("");
}
// Englische Versalien in Satz-Schreibung: nur Satzanfänge (nach . ! ?) und Eigennamen groß
const EIGENNAMEN_EN = [[/\bcompanions\b/g, "Companions"], [/\btower gate\b/g, "Tower Gate"], [/\bnorth gate\b/g, "North Gate"],
  [/\bsouth gate\b/g, "South Gate"], [/\bfire mountain\b/g, "Fire Mountain"], [/\btower of shadow\b/g, "Tower of Shadow"],
  [/\bshadowland\b/g, "Shadowland"], [/\bcall of the beacons\b/g, "Call of the Beacons"], [/\beyes\b/g, "Eyes"], [/\beye\b/g, "Eye"]];
function satzEn(v) {
  if (!v || typeof v !== "string" || v !== v.toUpperCase()) return v;
  let s = v.toLowerCase();
  for (const [re, w] of EIGENNAMEN_EN) s = s.replace(re, w);
  let start = true;
  return s.split(/(\s+)/).map((tok) => {
    const i = tok.search(/[\p{L}\d]/u);
    if (i < 0) return tok;
    const out = start && /\p{L}/u.test(tok[i]) ? tok.slice(0, i) + tok[i].toUpperCase() + tok.slice(i + 1) : tok;
    start = /[.!?]$/.test(tok);
    return out;
  }).join("");
}

// erst hier: cap() braucht NOUNS (vorher lief der Import in einen Fehler und es galten die alten Texte)
try {
  const T = await import("./shared/texte.js");
  for (const x of T.HELDEN || []) TXT.helden[x.id] = [titel(x.titel_neutral || x.titel || x.name || TXT.helden[x.id]?.[0]), cap(x.text)];
  for (const x of T.SCHICKSAL || []) TXT.schicksal[x.id] = [titel(x.name || x.titel), cap(x.text)];
  // Englisch: dieselben ids, Versalien wie gedruckt (fehlen sie, bleiben die deutschen Texte)
  if (EN) {
    for (const x of T.HELDEN_EN || []) TXT.helden[x.id] = [titel(x.titel || x.datei || x.name), satzEn(x.text)];
    for (const x of T.SCHICKSAL_EN || []) TXT.schicksal[x.id] = [titel(x.name || x.titel), satzEn(x.text)];
  }
} catch { /* noch nicht erzeugt */ }

// Ohne Server (GitHub Pages) setzt die Startseite globalThis.LF_LOKAL: ein Spielraum im Browser (pages/lokal.js)
const LOKAL = globalThis.LF_LOKAL || null;

export async function startGame(root, gameId) {
  const cfg = LOKAL ? {} : await fetch("/api/config").then((r) => r.json()).catch(() => ({}));
  root.innerHTML = `
    <div class="game">
      <div class="board" id="board"><div class="loading" id="loading">${t("g.laden")}</div></div>
      <aside class="side" id="side"></aside>
    </div>`;
  const side = root.querySelector("#side");
  const st = { view: null, seats: [], claims: {}, mode: null, sel: [], seatTab: null, botDelay: 700, title: "" };
  let ws = null;
  let scene = null;

  const sendMsg = (m) => ws?.readyState === 1 && ws.send(JSON.stringify(m));
  const act = (seat, action) => sendMsg({ type: "act", seat, action });

  // ---------------------------------------------------------------- Namen (persönliche Fassung)
  function personal() {
    return st.view?.personal && cfg.personal ? cfg.personal : null;
  }
  function heroTitle(id, seat) {
    const p = personal();
    const name = p?.helden?.[id];
    const tt = TXT.helden[id]?.[0] || id;
    return name ? `${name} – ${tt}` : tt;
  }
  function capitalName() {
    return personal()?.hauptstadt || t("g.hauptstadt");
  }
  function dirName(s, from, to) {
    const b = E.board(s);
    const a = (Math.atan2(b.pos[to].y - b.pos[from].y, b.pos[to].x - b.pos[from].x) * 180) / Math.PI;
    const names = t("g.richtungen");
    return t("g.nach") + names[((Math.round(a / 45) % 8) + 8) % 8];
  }
  // Feld für Knöpfe und Titel: „Wald“ / „Forest“
  function fieldName(s, key) {
    if (key === CAPITAL_KEY) return capitalName();
    const tile = s.tiles[key];
    return tile ? gelaende(tile.kind) : t("g.nebel");
  }
  // Feld im Satz: deutsch wie fieldName, englisch mit Artikel („the forest“, „the North Gate“)
  function fieldIn(s, key) {
    if (!EN) return fieldName(s, key);
    if (key === CAPITAL_KEY && personal()?.hauptstadt) return personal().hauptstadt;
    const tile = s.tiles[key];
    return "the " + (key === CAPITAL_KEY ? "capital" : tile ? gelaendeSatz(tile.kind) : "mist");
  }

  // ---------------------------------------------------------------- 3D
  createScene(root.querySelector("#board"), {
    onPick: (kind, key) => pick(kind, key),
    onProgress: (n, k) => {
      const l = root.querySelector("#loading");
      if (l) l.textContent = `${t("g.laden")} ${n}/${k}`;
    },
  }).then((sc) => {
    scene = sc;
    root.querySelector("#loading")?.remove();
    if (sc.missing) toast(t("g.keineModelle"));
    if (st.view) {
      scene.update(st.view);
      applyMode();
    }
  });

  // ---------------------------------------------------------------- Verbindung
  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = LOKAL ? LOKAL.socket() : new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => sendMsg({ type: "join", game: gameId, clientId: clientId() });
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === "state") {
        const prevPending = st.view?.pending;
        st.view = m.state;
        st.seats = m.seats;
        st.claims = m.claims;
        st.botDelay = m.botDelay;
        st.title = m.title;
        if (!st.autoClaimed && new URLSearchParams(location.search).has("alle")) {
          // nach dem Anlegen: alle Menschen-Plätze an diesem Gerät spielen (Hot-Seat)
          st.autoClaimed = true;
          history.replaceState(null, "", location.pathname);
          st.view.seats.forEach((x, i) => !x.bot && !m.claims[i] && sendMsg({ type: "claim", seat: i }));
        }
        if (JSON.stringify(prevPending) !== JSON.stringify(st.view.pending)) {
          st.mode = null;
          st.sel = [];
        }
        render();
        scene?.update(st.view);
        applyMode();
      } else if (m.type === "error") toast(logText(m.message), true);
      else if (m.type === "hint") showHint(m);
      else if (m.type === "deleted") location.href = "/";
    };
    ws.onclose = () => {
      side.querySelector(".conn")?.classList.add("off");
      setTimeout(connect, 1500);
    };
  }
  connect();

  // ---------------------------------------------------------------- Auswahl auf dem Brett
  function setMode(mode) {
    st.mode = mode;
    applyMode();
    render();
  }
  function applyMode() {
    if (!scene) return;
    const m = st.mode;
    if (!m) {
      // Entscheidungen, die auf dem Brett getroffen werden, gleich anzeigen
      const p = st.view?.pending;
      if (p && st.seats.includes(p.seat)) {
        if (p.type === "placeStart") return scene.setTargets("edge", E.legalGehoeftEdges(st.view, p.seat, true));
        if (p.type === "placeWater") {
          const b = E.board(st.view);
          return scene.setTargets("field", Object.values(b.pos).filter((x) => x.type === "home" && !st.view.tiles[x.key]).map((x) => x.key));
        }
        if (p.type === "hordeTie") return scene.setTargets("field", p.options, true);
      }
      return scene.clearTargets();
    }
    scene.setTargets(m.kind, m.keys, m.alt);
  }
  function pick(kind, key) {
    const s = st.view;
    const p = s.pending;
    if (!p) return;
    if (!st.mode) {
      if (p.type === "placeStart" && kind === "edge") act(p.seat, { type: "placeStart", edge: key });
      if (p.type === "placeWater" && kind === "field") act(p.seat, { type: "placeWater", pos: key });
      if (p.type === "hordeTie" && kind === "field") act(p.seat, { type: "hordeTie", pos: key });
      return;
    }
    const m = st.mode;
    st.mode = null;
    applyMode();
    m.done(key);
  }

  // ---------------------------------------------------------------- Darstellung
  function me(s, i) {
    return s.seats[i];
  }
  function colorChip(c) {
    return `<span class="chip" style="background:${D.COLORS[c].hex}"></span>`;
  }
  function render() {
    const s = st.view;
    if (!s) return;
    const p = s.pending;
    const gate = GATES[s.eye];
    const strength = E.hordeStrength(s);
    const step = E.journeyStep(s);
    side.innerHTML = `
      <div class="top">
        <a href="${LOKAL ? "./" : "/"}" class="back" title="${LOKAL ? t("g.zurStart") : t("g.zurUebersicht")}">◀</a>
        <div class="title">${esc(LOKAL && st.title === "Leuchtfeuer" ? t("titel") : st.title)}</div>
        <span class="conn" title="${t("g.verbindung")}"></span>
      </div>
      <div class="status">
        <div><b>${t("g.runde")} ${s.round}</b> · ${t("g.start")}: ${colorChip(s.seats[s.start].color)} ${esc(s.seats[s.start].name)}</div>
        <div class="bars">
          <div title="${t("g.turmTitel")}">${icon("auge")} ${t("g.turm")} <b>${s.tower}</b>/${s.variants.towerMax} · ${t("g.staerke")} ${strength}</div>
          <div title="${t("g.reiseTitel")}">🧭 ${t("g.reise")} <b>${s.journey}</b>/10${step ? ` · ${t("g.naechstesFeld")}: ${resIcons(step.cost)} +${step.fame}${step.danger ? " ⚠" : ""}` : ""}</div>
          <div>${t("g.augeBlickt")} <b>${torName(gate)}</b> · ${t("g.horden")} ${s.hordes.length}/${s.variants.hordes} · ${t("g.leuchtfeuer")} ${Object.values(s.beacons).filter((b) => b.lit).length}/${Object.keys(s.beacons).length}${s.ruf ? ` · ${t("g.rufErklungen")}` : ""}</div>
        </div>
        ${s.dice.length || s.rolled.length ? `<div class="dicebar">${t("g.wuerfel")}: ${s.dice.map((d, i) => `<button class="die ${st.sel.includes(i) ? "sel" : ""}" data-die="${i}" title="${wuerfelName(d)}">${icon(d)}</button>`).join("") || `<i>${t("g.alleGenommen")}</i>`}</div>` : ""}
      </div>
      ${s.over ? renderOver(s) : renderPending(s)}
      <div class="section"><h3>${t("g.spieler")}</h3>${s.seats.map((x, i) => renderSeat(s, i)).join("")}</div>
      <div class="section tools">
        <label>${t("g.botTempo")} <input type="range" min="0" max="2500" step="100" value="${st.botDelay}" id="botDelay"> <span>${st.botDelay ? (st.botDelay / 1000).toFixed(1) + " s" : t("g.sofort")}</span></label>
        <div class="row">
          <button data-cmd="resetView">${t("g.ansicht")}</button>
          ${LOKAL ? `<a class="btn" href="./${t("g.regelnDatei")}" target="_blank">${t("g.regeln")}</a>` : `<a class="btn" href="/api/games/${gameId}/protokoll.csv">${t("g.protokollCsv")}</a>
          <a class="btn" href="/api/games/${gameId}/spiel.json">${t("g.spielstand")}</a>`}
        </div>
      </div>
      <div class="section log"><h3>${t("g.verlauf")}</h3><div class="loglines">${s.log.slice(-60).map((l) => `<div class="${l.seat !== null && l.seat !== undefined ? "c-" + s.seats[l.seat]?.color : ""}"><span>R${l.r}</span> ${esc(logText(l.msg))}</div>`).join("")}</div></div>`;
    const ll = side.querySelector(".loglines");
    if (ll) ll.scrollTop = ll.scrollHeight;
    wire();
  }

  function renderSeat(s, i) {
    const x = s.seats[i];
    const sc = E.score(s, i);
    const claim = st.claims[i];
    const mine = st.seats.includes(i);
    const use = E.pieceUse(s, i);
    let who;
    if (x.bot) who = `<span class="tag bot">${t("g.bot")}</span>`;
    else if (mine) who = `<span class="tag you">${LOKAL ? t("g.mensch") : t("g.du")}</span>`;
    else if (claim) who = `<span class="tag other">${t("g.anderesGeraet")}</span>`;
    else who = `<span class="tag free">${t("g.frei")}</span>`;
    const heroes = x.heroes.map((hh) => {
      if (!hh.id) return `<span class="hero hidden">${t("g.heldVerdeckt")}</span>`;
      const [, txt] = TXT.helden[hh.id] || [hh.id, ""];
      return `<span class="hero ${hh.used ? "used" : ""}" title="${esc(txt)}">${esc(heroTitle(hh.id, i))}${hh.used ? ` (${t("g.genutzt")})` : ""}</span>`;
    }).join(" ");
    const hand = Array.isArray(x.hand)
      ? x.hand.map((c) => `<span class="card" title="${esc(TXT.schicksal[c]?.[1] || "")}">${esc(TXT.schicksal[c]?.[0] || c)}</span>`).join(" ")
      : t("g.karten", x.hand);
    const active = s.pending?.seat === i;
    return `
      <div class="seat ${active ? "active" : ""}" style="--c:${D.COLORS[x.color].hex}">
        <div class="seathead">${colorChip(x.color)} <b>${esc(x.name)}</b>${x.persons && x.persons.join(" & ") !== x.name ? ` <small>(${x.persons.map(esc).join(" & ")})</small>` : ""} · ${volkName(x.people)} ${who}
          <span class="fame" title="${t("g.ruhmTitel", sc.fame, sc.bauRuhm)}">★ ${sc.leiste}</span></div>
        <div class="res">${D.RES.map((r) => `<span title="${rohstoff(r)}">${icon(r)}${x.res[r]}</span>`).join("")}
          <span class="pieces" title="${t("g.gebaeudeVorrat")}">${t("g.figuren", D.PIECES.gehoeft - use.gehoeft, D.PIECES.burg - use.burg, D.PIECES.festung - use.festung)}</span></div>
        <div class="cards">${heroes} ${hand}</div>
        <div class="seatbtns">
          ${!LOKAL && !x.bot && !mine ? `<button data-claim="${i}">${claim ? t("g.uebernehmen") : t("g.spielen")}</button>` : ""}
          ${!LOKAL && mine ? `<button data-release="${i}">${t("g.abgeben")}</button>` : ""}
          <button data-bot="${i}" data-on="${x.bot ? 0 : 1}">${x.bot ? t("g.mensch") : t("g.bot")}</button>
        </div>
      </div>`;
  }

  function renderOver(s) {
    const o = s.over;
    // Gleicher Ruhm und gleich viele Rohstoffe: gleicher Platz (alte Spielstände ohne winners: nur der Erste)
    const winners = o.winners || (o.lost ? [] : [o.ranking[0].seat]);
    const pts = (r) => r.leiste ?? r.total;
    let platz = 0;
    const rows = o.ranking.map((r, k) => {
      const x = s.seats[r.seat];
      const vor = o.ranking[k - 1];
      if (!vor || pts(vor) !== pts(r) || vor.res !== r.res) platz = k + 1;
      const by = Object.entries(x.fameBy).map(([key, v]) => `${ruhmGrund(key)} ${v}`).join(", ");
      return `<tr><td>${platz}.</td><td>${colorChip(x.color)} ${esc(x.name)}</td><td>${volkName(x.people)}</td><td><b>${r.leiste ?? r.total}</b></td><td>${t("g.gebaeude")} ${r.bauRuhm ?? r.bau}${by ? ", " + esc(by) : ""}</td></tr>`;
    }).join("");
    return `<div class="section prompt over ${o.lost ? "lost" : "won"}">
      <h2>${o.lost ? t("g.schattenSiegt") : t("g.gefaehrtenAmZiel")}</h2>
      <p>${esc(logText(o.reason))} ${t("g.endeZahlen", o.round, o.tower, o.journey)}</p>
      ${o.lost ? `<p>${t("g.alleVerloren")}</p>` : ""}
      ${winners.length > 1 ? `<p>${t("g.gemeinsamerSieg", winners.map((w) => esc(s.seats[w].name)))}</p>` : ""}
      <table class="rank">${rows}</table>
      <p>${LOKAL ? `<a class="btn" href="./">${t("g.neuesSpiel")}</a>` : `<a class="btn" href="/api/games/${gameId}/protokoll.csv">${t("g.protokollAlsCsv")}</a> <a class="btn" href="/">${t("g.zurUebersicht")}</a>`}</p>
    </div>`;
  }

  function renderPending(s) {
    const p = s.pending;
    if (!p) return `<div class="section prompt"><i>…</i></div>`;
    const who = s.seats[p.seat];
    const mine = st.seats.includes(p.seat);
    const head = `<div class="who">${colorChip(who.color)} <b>${esc(who.name)}</b> ${t("g.wartet")[p.type] || p.type}</div>`;
    if (!mine) {
      return `<div class="section prompt wait">${head}${who.bot ? `<small>${t("g.botDenkt")}</small>` : !st.claims[p.seat] ? `<button data-claim="${p.seat}">${t("g.platzSpielen")}</button>` : ""}</div>`;
    }
    const body = PROMPTS[p.type]?.(s, p) ?? `<p>${p.type}</p>`;
    return `<div class="section prompt mine">${head}${body}</div>`;
  }

  // ---------------------------------------------------------------- Entscheidungen
  const PROMPTS = {
    chooseHero: (s, p) => (p.offer || []).map((id) => `<div class="herochoice"><b>${esc(heroTitle(id, p.seat))}</b><p>${esc(TXT.helden[id]?.[1] || "")}</p><button data-a='${JSON.stringify({ type: "chooseHero", hero: id })}'>${t("g.heldNehmen")}</button></div>`).join(""),
    placeWater: () => `<p>${t("g.wasserLegen")}</p>`,
    placeStart: (s, p) => `<p>${t("g.startKante")}${p.second ? " " + t("g.zweitesGehoeft") : ""}</p>`,
    reactRoll: (s, p) => `
      <p>${t("g.gewuerfelt")}: ${s.dice.map((d) => icon(d)).join(" ")}</p>
      ${p.can.zauberin ? `<button data-cmd="zauberin">${t("g.zauberinKnopf")}</button>` : ""}
      ${p.can.gelehrter ? `<button data-a='{"type":"gelehrter"}'>${t("g.gelehrterKnopf")}</button>` : ""}
      <button data-a='{"type":"pass"}'>${t("g.weiter")}</button>`,
    planerin: () => `<p>${t("g.planerinText")}</p>
      <button data-cmd="planerin">${t("g.planerinNehmen")}</button> <button data-a='{"type":"pass"}'>${t("g.nichtDieseRunde")}</button>`,
    turn: (s, p) => renderTurn(s, p),
    hordeTie: (s, p) => `<p>${t("g.hordeTie", esc(fieldIn(s, p.from)))}</p>
      ${p.options.map((f) => `<button data-a='${JSON.stringify({ type: "hordeTie", pos: f })}'>${esc(fieldName(s, f))} (${dirName(s, p.from, f)}, ${t("g.nGebaeude", E.buildingsAt(s, f).length)})</button>`).join(" ")}`,
    intervene: (s, p) => `<p>${p.kind === "siege" ? t("g.belagerungHauptstadt") : t("g.ueberfallAuf", esc(fieldIn(s, p.field)))}: ${t("g.nHorden", p.hordes.length)}. ${t("g.heldRufen")}</p>
      ${p.can.hueterin ? `<button data-a='${JSON.stringify({ type: "hueterin", horde: p.hordes[0] })}'>${t("g.hueterinKnopf")}</button>` : ""}
      ${p.can.chronist ? `<button data-a='${JSON.stringify({ type: "chronist", horde: p.hordes[0] })}'>${t("g.chronistKnopf")}</button>` : ""}
      <button data-a='{"type":"pass"}'>${t("g.keinHeld")}</button>`,
    pay: (s, p) => {
      const x = s.seats[p.seat];
      const hv = E.horseValue(s, p.seat);
      const mineHere = E.buildingsAt(s, p.field).filter((b) => b.seat === p.seat).length;
      return `<p>${p.kind === "siege" ? t("g.belagerung") : t("g.ueberfallAuf", esc(fieldIn(s, p.field)))}: ${t("g.zahlenLage", p.strength, p.base, p.paidSoFar, p.need)}
        ${mineHere ? t("g.duHastHier", mineHere) : ""}</p>
        <div class="pay">
          <label>${icon("erz")} ${rohstoff("erz")} <input type="number" min="0" max="${x.res.erz}" value="0" id="payErz"></label>
          <label>${icon("pferde")} ${rohstoff("pferde")}${hv === 2 ? ` (${t("g.zaehlenDoppelt")})` : ""} <input type="number" min="0" max="${x.res.pferde}" value="0" id="payPf"></label>
          ${Array.isArray(x.hand) && x.hand.includes("verstaerkung") ? `<label><input type="checkbox" id="payV"> ${t("g.verstaerkung")}</label>` : ""}
        </div>
        <button data-cmd="pay">${t("g.zahlen")}</button> <button data-cmd="payMin">${t("g.restZahlen")}</button> <button data-a='{"type":"pay","erz":0,"pferde":0}'>${t("g.nichtsZahlen")}</button>`;
    },
    treasure: () => `<p>${t("g.schatz")}</p>${D.RES.map((r) => `<button data-a='${JSON.stringify({ type: "treasure", res: r })}'>${icon(r)} ${rohstoff(r)}</button>`).join(" ")}`,
    discard: (s, p) => `<p>${t("g.zuVieleKarten", p.n)}</p>${cardPicker(s.seats[p.seat].hand)}<button data-cmd="discard" data-n="${p.n}">${t("g.ablegen")}</button>`,
    keepCards: (s, p) => `<p>${t("g.kartenBehalten")}</p>${cardPicker(p.cards || [])}<button data-cmd="keep">${t("g.behalten")}</button>`,
    tradeOffer: (s, p) => `<p>${t("g.angebot", esc(s.seats[p.from].name), resIcons(p.give) || t("g.nichts"), resIcons(p.get) || t("g.nichts"))}</p>
      <button data-a='{"type":"tradeAnswer","accept":true}'>${t("g.annehmen")}</button> <button data-a='{"type":"tradeAnswer","accept":false}'>${t("g.ablehnen")}</button>`,
  };
  function cardPicker(cards) {
    return `<div class="cardpick">${cards.map((c, i) => `<label><input type="checkbox" data-card="${c}" data-i="${i}"> <b>${esc(TXT.schicksal[c]?.[0] || c)}</b> <small>${esc(TXT.schicksal[c]?.[1] || "")}</small></label>`).join("")}</div>`;
  }

  function renderTurn(s, p) {
    const seat = p.seat;
    const x = s.seats[seat];
    if (!p.dieTaken) {
      if (s.dice.length) {
        const ek = s.variants.elbenCost ?? 2;
        const elben = x.people === "elben" && x.res.korn >= ek;
        return `<p>${t("g.wuerfelNehmen")}${elben ? " " + t("g.elbenDrehen", ek) : ""}</p>
          ${elben ? `<select id="elbenFace"><option value="">${t("g.nichtDrehen")}</option>${["wald", "feld", "weide", "huegel", "gebirge"].map((f) => `<option value="${f}">${gelaende(f)}</option>`).join("")}</select>` : ""}
          <div class="preview">${s.dice.map((d, i) => { const y = E.harvestYield(s, seat, d, true); return `<button data-take="${i}">${icon(d)} ${y.res ? `+${y.n} ${rohstoffSatz(y.res, y.n)}` : ""}</button>`; }).join(" ")}</div>
          <button data-cmd="hint">${t("g.tipp")}</button>`;
      }
      return `<p>${t("g.keineWuerfel")}</p>${D.RES.map((r) => `<button data-a='${JSON.stringify({ type: "takeResource", res: r })}'>${icon(r)} ${rohstoff(r)}</button>`).join(" ")}`;
    }
    const btn = (cmd, label, ok, title = "") => `<button data-cmd="${cmd}" ${ok ? "" : "disabled"} title="${esc(title)}">${label}</button>`;
    const use = E.pieceUse(s, seat);
    const gEdges = E.legalGehoeftEdges(s, seat);
    const ups = E.legalUpgrades(s, seat);
    const canBurg = ups.some((u) => u.to === 2) && E.canAfford(s, seat, E.costFor(s, seat, "burg"));
    const canFest = ups.some((u) => u.to === 3) && E.canAfford(s, seat, E.costFor(s, seat, "festung"));
    const corners = E.legalBeaconCorners(s, seat);
    const dark = Object.entries(s.beacons).filter(([, b]) => !b.lit).map(([c]) => c);
    const step = E.journeyStep(s);
    const aus = E.ausfallTargets(s, seat);
    const heroBtns = x.heroes.filter((hh) => hh.id && !hh.used && ["karten", "tueftler", "wegweiserin", "hueterin", "chronist"].includes(hh.id))
      .map((hh) => `<button data-hero="${hh.id}" title="${esc(TXT.helden[hh.id]?.[1] || "")}">${t("g.held")}: ${esc(heroTitle(hh.id, seat))}</button>`).join("");
    const fateBtns = (Array.isArray(x.hand) ? x.hand : []).filter((c, i, a) => a.indexOf(c) === i && c !== "verstaerkung")
      .map((c) => `<button data-fate="${c}" title="${esc(TXT.schicksal[c]?.[1] || "")}">${t("g.karte")}: ${esc(TXT.schicksal[c]?.[0] || c)}</button>`).join("");
    const modeInfo = st.mode ? `<p class="modeinfo">${esc(st.mode.label)} – ${t("g.klickeBrett")} <button data-cmd="cancelMode">${t("g.abbrechen")}</button></p>` : "";
    return `${modeInfo}
      <div class="actions">
        ${btn("gehoeft", `${t("g.gehoeft")} ${resIcons(E.costFor(s, seat, "gehoeft"))}`, gEdges.length && use.gehoeft < D.PIECES.gehoeft && E.canAfford(s, seat, E.costFor(s, seat, "gehoeft")))}
        ${btn("burg", `${t("g.burg")} ${resIcons(E.costFor(s, seat, "burg"))}`, canBurg)}
        ${btn("festung", `${t("g.festung")} ${resIcons(E.costFor(s, seat, "festung"))}`, canFest)}
        ${btn("beacon", `${t("g.leuchtfeuerBau")} ${resIcons(E.costFor(s, seat, "leuchtfeuer"))}`, corners.length && E.canAfford(s, seat, E.costFor(s, seat, "leuchtfeuer")))}
        ${btn("relight", `${t("g.entzuenden")} ${resIcons(D.COSTS.flamme)}`, dark.length && x.res.holz >= 1)}
        ${btn("reise", step ? `${t("g.reise")} → ${t("g.feld")} ${step.field} ${resIcons(step.cost)} +${step.fame}${step.danger ? " ⚠" : ""}` : t("g.reiseBeendet"), step && !s.journeyMoved && E.canAfford(s, seat, step.cost), s.journeyMoved ? t("g.schonGezogen") : "")}
        ${btn("ausfall", `${t("g.ausfall")}${aus.length ? ` (${aus.length})` : ""}`, aus.length)}
        ${btn("bank", `${t("g.tauschen")} ${E.bankRate(s, seat)} : 1`, true)}
        ${btn("trade", t("g.handelSpieler"), true)}
      </div>
      ${heroBtns || fateBtns ? `<div class="actions">${heroBtns}${fateBtns}</div>` : ""}
      <div class="actions end"><button data-cmd="hint">${t("g.tipp")}</button><button class="primary" data-a='{"type":"endTurn"}'>${t("g.zugBeenden")}</button></div>`;
  }

  // ---------------------------------------------------------------- Bedienung
  function wire() {
    const s = st.view;
    const p = s.pending;
    side.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => p && act(p.seat, JSON.parse(b.dataset.a))));
    side.querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => sendMsg({ type: "claim", seat: Number(b.dataset.claim), force: true })));
    side.querySelectorAll("[data-release]").forEach((b) => (b.onclick = () => sendMsg({ type: "release", seat: Number(b.dataset.release) })));
    side.querySelectorAll("[data-bot]").forEach((b) => (b.onclick = () => {
      const on = b.dataset.on === "1";
      if (on && !confirm(t("g.anBot", s.seats[b.dataset.bot].name))) return;
      sendMsg({ type: "setBot", seat: Number(b.dataset.bot), bot: on });
    }));
    const bd = side.querySelector("#botDelay");
    if (bd) bd.onchange = () => sendMsg({ type: "botDelay", ms: Number(bd.value) });
    side.querySelectorAll("[data-take]").forEach((b) => (b.onclick = () => {
      const face = side.querySelector("#elbenFace")?.value;
      act(p.seat, face ? { type: "takeDie", index: Number(b.dataset.take), face } : { type: "takeDie", index: Number(b.dataset.take) });
    }));
    side.querySelectorAll("[data-die]").forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.die);
      if (p?.type === "turn" && !p.dieTaken && st.seats.includes(p.seat)) {
        const face = side.querySelector("#elbenFace")?.value;
        return act(p.seat, face ? { type: "takeDie", index: i, face } : { type: "takeDie", index: i });
      }
      if (p?.type === "planerin") {
        st.sel = st.sel.includes(i) ? st.sel.filter((k) => k !== i) : [...st.sel, i].slice(-2);
        render();
      }
    }));
    side.querySelectorAll("[data-hero]").forEach((b) => (b.onclick = () => heroAction(b.dataset.hero)));
    side.querySelectorAll("[data-fate]").forEach((b) => (b.onclick = () => fateAction(b.dataset.fate)));
    side.querySelectorAll("[data-cmd]").forEach((b) => (b.onclick = () => command(b.dataset.cmd, b)));
  }

  function boardMode(kind, keys, label, done, alt = false) {
    if (!keys.length) return toast(t("g.keinPlatz"));
    setMode({ kind, keys, label, done, alt });
  }

  function command(cmd, el) {
    const s = st.view;
    const p = s.pending;
    const seat = p?.seat;
    switch (cmd) {
      case "resetView": return scene?.resetView();
      case "cancelMode": return setMode(null);
      case "hint": return sendMsg({ type: "hint", seat });
      case "gehoeft":
        return boardMode("edge", E.legalGehoeftEdges(s, seat), t("g.lblGehoeft"), (k) => act(seat, { type: "build", edge: k }));
      case "burg":
        return boardMode("edge", E.legalUpgrades(s, seat).filter((u) => u.to === 2).map((u) => u.edge), t("g.lblBurg"), (k) => act(seat, { type: "upgrade", edge: k }));
      case "festung":
        return boardMode("edge", E.legalUpgrades(s, seat).filter((u) => u.to === 3).map((u) => u.edge), t("g.lblFestung"), (k) => act(seat, { type: "upgrade", edge: k }));
      case "beacon":
        return boardMode("corner", E.legalBeaconCorners(s, seat), t("g.lblLeuchtfeuer"), (k) => act(seat, { type: "beacon", corner: k }));
      case "relight":
        return boardMode("corner", Object.entries(s.beacons).filter(([, b]) => !b.lit).map(([c]) => c), t("g.lblEntzuenden"), (k) => act(seat, { type: "relight", corner: k }), true);
      case "reise": return act(seat, { type: "reise" });
      case "ausfall": {
        const ziele = E.ausfallTargets(s, seat);
        return boardMode("field", ziele.map((x) => x.field), t("g.lblAusfall"), (k) => payDialog(seat, ziele.find((x) => x.field === k)), true);
      }
      case "bank": return bankDialog(seat);
      case "trade": return tradeDialog(seat);
      case "zauberin": return zauberinDialog(seat);
      case "planerin":
        if (st.sel.length < 1) return toast(t("g.planerinWaehle"));
        return act(seat, { type: "planerin", dice: st.sel });
      case "pay": case "payMin": {
        let erz = Number(side.querySelector("#payErz")?.value || 0);
        let pferde = Number(side.querySelector("#payPf")?.value || 0);
        const verstaerkung = !!side.querySelector("#payV")?.checked;
        if (cmd === "payMin") {
          const x = s.seats[seat];
          const hv = E.horseValue(s, seat);
          let rest = p.need;
          erz = 0; pferde = 0;
          while (rest > 0 && erz < x.res.erz) { erz++; rest--; }
          while (rest > 0 && pferde < x.res.pferde) { pferde++; rest -= hv; }
          if (rest > 0) toast(t("g.reichtNicht"));
        }
        return act(seat, { type: "pay", erz, pferde, verstaerkung });
      }
      case "discard": case "keep": {
        const picked = [...side.querySelectorAll("[data-card]:checked")].map((c) => c.dataset.card);
        return act(seat, cmd === "discard" ? { type: "discard", cards: picked } : { type: "keepCards", keep: picked });
      }
    }
  }

  function heroAction(hero) {
    const s = st.view;
    const seat = s.pending.seat;
    if (hero === "tueftler") {
      const tk = s.variants.tueftlerCost;
      if (tk && !E.canAfford(s, seat, tk)) return toast(t("g.zuWenig"));
      const kosten = tk ? Object.entries(tk).map(([r, n]) => `${n} ${rohstoffSatz(r, n)}`).join(t("g.und")) : "";
      return boardMode("edge", E.legalUpgrades(s, seat).filter((u) => u.to === 2).map((u) => u.edge), t("g.lblTueftler", kosten), (k) => act(seat, { type: "hero", hero, edge: k }));
    }
    if (hero === "hueterin" || hero === "chronist") {
      let ids = s.hordes.map((x) => x.id);
      if (hero === "chronist") {
        const near = withNeighbors(E.board(s), CAPITAL_KEY);
        ids = s.hordes.filter((x) => near.includes(x.pos)).map((x) => x.id);
      }
      return boardMode("horde", ids, hero === "hueterin" ? t("g.lblHueterin") : t("g.lblChronist"), (k) => act(seat, { type: "hero", hero, horde: Number(k) }), true);
    }
    act(seat, { type: "hero", hero });
  }
  function fateAction(card) {
    const s = st.view;
    const seat = s.pending.seat;
    if (card === "bann") return boardMode("horde", s.hordes.map((x) => x.id), t("g.lblBann"), (k) => act(seat, { type: "fate", card, horde: Number(k) }), true);
    if (card === "handel") return handelDialog(seat);
    act(seat, { type: "fate", card });
  }

  // ---------------------------------------------------------------- Dialoge
  function resSelect(id, val = "holz") {
    return `<select id="${id}">${D.RES.map((r) => `<option value="${r}" ${r === val ? "selected" : ""}>${rohstoff(r)}</option>`).join("")}</select>`;
  }
  function bankDialog(seat) {
    const s = st.view;
    const rate = E.bankRate(s, seat);
    const box = modal(`<h3>${t("g.bankTitel", rate)}</h3>
      <p>${t("g.bankText", rate, resSelect("bg", D.RES.reduce((a, r) => (s.seats[seat].res[r] > s.seats[seat].res[a] ? r : a), "holz")), resSelect("bt", "erz"))}</p>
      <button id="ok">${t("g.tauschen")}</button> <button id="cancel">${t("g.abbrechen")}</button>`);
    box.querySelector("#ok").onclick = () => {
      act(seat, { type: "bank", give: box.querySelector("#bg").value, get: box.querySelector("#bt").value });
      closeModal();
    };
    box.querySelector("#cancel").onclick = closeModal;
  }
  function resInputs(prefix) {
    return D.RES.map((r) => `<label>${icon(r)} <input type="number" min="0" value="0" id="${prefix}${r}" style="width:3.5em"></label>`).join(" ");
  }
  function readRes(box, prefix) {
    const o = {};
    for (const r of D.RES) {
      const v = Number(box.querySelector(`#${prefix}${r}`).value || 0);
      if (v > 0) o[r] = v;
    }
    return o;
  }
  function tradeDialog(seat) {
    const s = st.view;
    const others = s.seats.map((x, i) => ({ x, i })).filter(({ i }) => i !== seat);
    const box = modal(`<h3>${t("g.handelSpieler")}</h3>
      <p>${t("g.an")}: <select id="to">${others.map(({ x, i }) => `<option value="${i}">${esc(x.name)}${x.bot ? ` (${t("g.bot")})` : ""}</option>`).join("")}</select></p>
      <p>${t("g.duGibst")}: ${resInputs("g")}</p><p>${t("g.duBekommst")}: ${resInputs("t")}</p>
      <button id="ok">${t("g.angebotMachen")}</button> <button id="cancel">${t("g.abbrechen")}</button>`);
    box.querySelector("#ok").onclick = () => {
      act(seat, { type: "offer", to: Number(box.querySelector("#to").value), give: readRes(box, "g"), get: readRes(box, "t") });
      closeModal();
    };
    box.querySelector("#cancel").onclick = closeModal;
  }
  function handelDialog(seat) {
    const row = (k) => `<p>${k + 1}. ${t("g.gib1")} ${resSelect("hg" + k)} → ${t("g.nimm1")} ${resSelect("ht" + k, "erz")} <label><input type="checkbox" id="hu${k}" ${k === 0 ? "checked" : ""}> ${t("g.ja")}</label></p>`;
    const box = modal(`<h3>${t("g.handelszugTitel")}</h3>${[0, 1, 2].map(row).join("")}<button id="ok">${t("g.tauschen")}</button> <button id="cancel">${t("g.abbrechen")}</button>`);
    box.querySelector("#ok").onclick = () => {
      const swaps = [0, 1, 2].filter((k) => box.querySelector(`#hu${k}`).checked).map((k) => [box.querySelector(`#hg${k}`).value, box.querySelector(`#ht${k}`).value]);
      act(seat, { type: "fate", card: "handel", swaps });
      closeModal();
    };
    box.querySelector("#cancel").onclick = closeModal;
  }
  function payDialog(seat, target) {
    const s = st.view;
    const x = s.seats[seat];
    const hv = E.horseValue(s, seat);
    const box = modal(`<h3>${t("g.ausfallAuf", esc(fieldIn(s, target.field)))}</h3>
      <p>${t("g.noetig", target.need)}</p>
      <p><label>${icon("erz")} ${rohstoff("erz")} <input type="number" id="ae" min="0" max="${x.res.erz}" value="${Math.min(x.res.erz, target.need)}"></label>
      <label>${icon("pferde")} ${rohstoff("pferde")}${hv === 2 ? ` (${t("g.doppelt")})` : ""} <input type="number" id="ap" min="0" max="${x.res.pferde}" value="${Math.max(0, Math.ceil((target.need - Math.min(x.res.erz, target.need)) / hv))}"></label>
      ${Array.isArray(x.hand) && x.hand.includes("verstaerkung") ? `<label><input type="checkbox" id="av"> ${t("g.verstaerkung")}</label>` : ""}</p>
      <button id="ok">${t("g.angreifen")}</button> <button id="cancel">${t("g.abbrechen")}</button>`);
    box.querySelector("#ok").onclick = () => {
      act(seat, { type: "ausfall", field: target.field, erz: Number(box.querySelector("#ae").value), pferde: Number(box.querySelector("#ap").value), verstaerkung: !!box.querySelector("#av")?.checked });
      closeModal();
    };
    box.querySelector("#cancel").onclick = closeModal;
  }
  function zauberinDialog(seat) {
    const s = st.view;
    const faces = D.DIE_FACES;
    const box = modal(`<h3>${t("g.zauberinKnopf")}</h3>
      ${s.dice.map((d, i) => `<p>${icon(d)} → <select data-i="${i}"><option value="">${t("g.soLassen")}</option>${faces.map((f) => `<option value="${f}">${wuerfelName(f)}</option>`).join("")}</select></p>`).join("")}
      <button id="ok">${t("g.drehen")}</button> <button id="cancel">${t("g.abbrechen")}</button>`);
    box.querySelector("#ok").onclick = () => {
      const changes = [...box.querySelectorAll("select")].filter((x) => x.value).map((x) => ({ i: Number(x.dataset.i), face: x.value }));
      if (changes.length > 2) return toast(t("g.hoechstens2"), true);
      act(seat, { type: "zauberin", changes });
      closeModal();
    };
    box.querySelector("#cancel").onclick = closeModal;
  }
  function showHint(m) {
    const a = m.action;
    if (!a) return toast(t("g.keinVorschlag"));
    const s = st.view;
    const W = t("g.tipps");
    const words = {
      takeDie: () => W.takeDie(gelaendeSatz(s.dice[a.index]) || "", a.face && gelaendeSatz(a.face)),
      takeResource: () => W.takeResource(rohstoffSatz(a.res, 1)), build: () => W.build, upgrade: () => W.upgrade,
      beacon: () => W.beacon, relight: () => W.relight, reise: () => W.reise,
      ausfall: () => W.ausfall(fieldIn(s, a.field)), bank: () => W.bank(rohstoffSatz(a.give), rohstoffSatz(a.get)),
      fate: () => W.fate(TXT.schicksal[a.card]?.[0] || a.card), hero: () => W.hero(TXT.helden[a.hero]?.[0] || a.hero),
      endTurn: () => W.endTurn,
    };
    toast(t("g.botWuerde", (words[a.type] || (() => a.type))()));
    if (a.edge) scene?.setTargets("edge", [a.edge], true);
    if (a.corner) scene?.setTargets("corner", [a.corner], true);
  }
}
