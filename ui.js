// Kleine Helfer für die Oberfläche
import { bildName } from "./i18n_spiel.js";

const EMOJI = { holz: "🪵", stein: "🧱", erz: "⛏️", korn: "🌾", pferde: "🐎", wald: "🌲", feld: "🌾", weide: "🐑", huegel: "⛰️",
  gebirge: "🏔️", auge: "👁️", wasser: "🌊", ruine: "🏛️" };

export function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function icon(name) {
  const label = bildName(name);   // „Holz“ / „Wood“, in der gewählten Sprache
  return `<img class="ic" src="./icons/${name}.svg" alt="${esc(label)}" title="${esc(label)}" data-emoji="${EMOJI[name] || ""}">`;
}
// fehlt ein Icon, steht stattdessen ein Zeichen da
document.addEventListener("error", (e) => {
  const el = e.target;
  if (el?.classList?.contains("ic")) {
    const span = document.createElement("span");
    span.className = "ic-fb";
    span.textContent = el.dataset.emoji || el.alt;
    span.title = el.alt;
    el.replaceWith(span);
  }
}, true);
export function resIcons(cost) {
  return Object.entries(cost || {}).map(([r, k]) => Array.from({ length: k }, () => icon(r)).join("")).join("");
}
export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function modal(html) {
  closeModal();
  const bg = h(`<div class="modalbg"><div class="modal">${html}</div></div>`);
  document.body.appendChild(bg);
  bg.addEventListener("click", (e) => e.target === bg && closeModal());
  return bg.querySelector(".modal");
}
export function closeModal() {
  document.querySelectorAll(".modalbg").forEach((x) => x.remove());
}
export function toast(msg, err = false) {
  const el = h(`<div class="toast ${err ? "err" : ""}">${esc(msg)}</div>`);
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, err ? 4500 : 3500);
}
export function clientId() {
  let id = null;
  try {
    id = localStorage.getItem("lf_client");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
      localStorage.setItem("lf_client", id);
    }
  } catch {
    id = window.__lfid ||= String(Math.random()).slice(2);
  }
  return id;
}
