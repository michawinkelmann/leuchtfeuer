// Startseite der Browser-Fassung (GitHub Pages): Plätze wählen (Mensch oder Bot), dann spielt alles lokal.
import * as D from "./shared/data.js";
import { esc } from "./ui.js";
import { gespeichert, vergessen, neuesSpiel, lokalerRaum } from "./lokal.js";
import { SPRACHE, setzeSprache, t, farbName, volkName } from "./sprache.js";
import { SEITE } from "./seite.js";

const root = document.getElementById("app");
document.documentElement.lang = SPRACHE;
document.title = t("titel");

// „Züge erklären“ gilt für diesen Browser (dieselbe Einstellung wie der Schalter im Spiel, game.js)
const ERKLAER_SPEICHER = "lf_erklaeren";
function erklaerenGespeichert() {
  try {
    return localStorage.getItem(ERKLAER_SPEICHER) === "1";
  } catch {
    return false;
  }
}
function erklaerenSpeichern(an) {
  try {
    localStorage.setItem(ERKLAER_SPEICHER, an ? "1" : "0");
  } catch { /* ohne Speicher */ }
}

function zeigeStart() {
  const alt = gespeichert();
  root.innerHTML = `
    <div class="page">
      <header>
        <div class="sprachen">${["de", "en"].map((l) => `<button data-lang="${l}" class="${l === SPRACHE ? "primary" : ""}">${l === "de" ? "Deutsch" : "English"}</button>`).join(" ")}</div>
        <h1>${t("titel")}</h1>
        <p>${t("untertitel")}${SEITE.makerworld ? ` · <a href="${esc(SEITE.makerworld)}">${t("makerworld")}</a>` : ""}</p>
      </header>
      ${alt ? `<section class="card"><h2>${t("fortsetzen")}</h2>
        <p>${t("gespeichert", alt.state.round, new Date(alt.saved).toLocaleString(SPRACHE === "de" ? "de-DE" : "en-GB"))}:
          ${alt.state.seats.map((x) => `<span class="chip" style="background:${D.COLORS[x.color]?.hex}"></span>${esc(x.name)}${x.bot ? " 🤖" : ""}`).join(" ")}</p>
        <p><button class="primary" id="weiter">${t("weiterspielen")}</button> <button id="verwerfen">${t("verwerfen")}</button></p></section>` : ""}
      <section class="card"><h2>${t("neues")}</h2>
        <div class="presets">${t("vorlagen")}
          <button data-preset="solo">${t("solo")}</button>
          <button data-preset="hot">${t("hotseat")}</button>
          <button data-preset="bots">${t("zuschauen")}</button>
          <button data-preset="erklaeren">${t("erklaerVorlage")}</button>
        </div>
        <div class="grid2">
          <label>${t("plaetze")} <select id="n">${[2, 3, 4, 5].map((n) => `<option ${n === 4 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label>${t("tempo")} <select id="botDelay"><option value="0">${t("sofort")}</option><option value="400">${t("schnell")}</option><option value="900" selected>${t("normal")}</option><option value="1800">${t("langsam")}</option></select></label>
          <label class="haken" title="${t("erklaerenTitel")}"><input type="checkbox" id="erklaeren" ${erklaerenGespeichert() ? "checked" : ""}> ${t("erklaeren")}</label>
          <label class="haken" title="${t("schrittTitel")}"><input type="checkbox" id="schritt"> ${t("schritt")}</label>
        </div>
        <table class="seats" id="seats"></table>
        <p class="muted">${t("beginnt")}</p>
        <p><button class="primary" id="los">${t("starten")}</button></p>
      </section>
      <section class="card small"><h2>${t("sogehts")}</h2>
        <ul>${t("hilfe").map((x) => `<li>${x}</li>`).join("")}</ul>
      </section>
    </div>`;
  const $ = (s) => root.querySelector(s);
  root.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => setzeSprache(b.dataset.lang)));
  if (alt) {
    $("#weiter").onclick = () => spielen(alt.state, alt.botDelay ?? 900, !!alt.schritt);
    $("#verwerfen").onclick = () => {
      if (!confirm(t("wirklich"))) return;
      vergessen();
      zeigeStart();
    };
  }

  let seats = D.COLOR_ORDER.map((c, i) => ({ name: i === 0 ? t("ich") : farbName(c), color: c, people: "", bot: i > 0 }));
  function zeichne() {
    const n = Number($("#n").value);
    $("#seats").innerHTML = `<tr><th>${t("name")}</th><th>${t("farbe")}</th><th>${t("volk")}</th><th>${t("wer")}</th></tr>` + seats.slice(0, n).map((x, i) => `
      <tr>
        <td><input data-f="name" data-i="${i}" value="${esc(x.name)}" maxlength="24"></td>
        <td><select data-f="color" data-i="${i}">${D.COLOR_ORDER.map((c) => `<option value="${c}" ${c === x.color ? "selected" : ""}>${farbName(c)}</option>`).join("")}</select></td>
        <td><select data-f="people" data-i="${i}"><option value="">${t("zufaellig")}</option>${D.PEOPLE_ORDER.map((p) => `<option value="${p}" ${p === x.people ? "selected" : ""}>${volkName(p)}</option>`).join("")}</select></td>
        <td><select data-f="bot" data-i="${i}"><option value="0" ${x.bot ? "" : "selected"}>${t("mensch")}</option><option value="1" ${x.bot ? "selected" : ""}>${t("bot")}</option></select></td>
      </tr>`).join("");
    root.querySelectorAll("#seats [data-f]").forEach((el) => (el.onchange = () => {
      const x = seats[el.dataset.i];
      if (el.dataset.f === "bot") x.bot = el.value === "1";
      else x[el.dataset.f] = el.value;
    }));
  }
  $("#n").onchange = zeichne;
  zeichne();

  root.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => {
    const pr = b.dataset.preset;
    const zusehen = pr === "bots" || pr === "erklaeren";
    seats = D.COLOR_ORDER.map((c, i) => ({ name: farbName(c), color: c, people: "", bot: zusehen || (pr === "solo" && i > 0) }));
    if (pr === "solo") seats[0].name = t("ich");
    $("#n").value = pr === "bots" ? "5" : "4";
    // Bots zusehen und erklären lassen: Erklärungen an und Schritt für Schritt (die Bots warten auf „Weiter“)
    $("#schritt").checked = pr === "erklaeren";
    if (pr === "erklaeren") $("#erklaeren").checked = true;
    zeichne();
  }));

  $("#los").onclick = () => {
    const n = Number($("#n").value);
    const auswahl = seats.slice(0, n);
    const farben = auswahl.map((x) => x.color);
    if (new Set(farben).size !== farben.length) return alert(t("farbedoppelt"));
    const voelker = auswahl.map((x) => x.people).filter(Boolean);
    if (new Set(voelker).size !== voelker.length) return alert(t("volkdoppelt"));
    const state = neuesSpiel(auswahl.map((x, i) => ({ name: x.name.trim() || farbName(x.color) || `${t("spieler")} ${i + 1}`,
      color: x.color, people: x.people || null, bot: x.bot })), 0);
    erklaerenSpeichern($("#erklaeren").checked);
    spielen(state, Number($("#botDelay").value), $("#schritt").checked);
  };
}

async function spielen(state, botDelay, schritt = false) {
  globalThis.LF_LOKAL = lokalerRaum(state, botDelay, schritt);
  document.body.classList.add("ingame");
  const { startGame } = await import("./game.js");
  startGame(root, "lokal");
}

zeigeStart();
