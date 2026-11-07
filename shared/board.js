// Geometrie des Spielbretts (wie generator/leuchtfeuer/karte.py).
// Spalten 0..6 von West nach Ost, Zeilen 0..4 von Nord nach Süd; ungerade Spalten halb nach Süden versetzt.
// Einheit: Eckradius r = 1 (eine Kachel ist 64 mm von Kante zu Kante, also r = 64/√3 mm).

export const CAPITAL = [1, 2];
export const HOME = [[0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 3], [1, 4], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]];
export const FOG = [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [5, 1], [5, 2], [5, 3]];
export const SHADOW = [[6, 1], [6, 2], [6, 3]];
export const ONLY_BIG = new Set(["1,0", "1,4", "2,0", "2,4", "3,0", "3,4", "4,0", "4,4"]);   // nur bei 4–5 Spielern
// Tore in der Reihenfolge, in der sich das Auge im Uhrzeigersinn dreht: Nord, Süd (Feuerberg), West (Turm-Tor)
export const GATES = ["6,1", "6,3", "6,2"];
export const GATE_NAMES = { "6,1": "Nord-Tor", "6,3": "Feuerberg-Tor", "6,2": "Turm-Tor" };
export const TOWER_GATE = "6,2";
export const CAPITAL_KEY = "1,2";

const S3 = Math.sqrt(3);

export function posKey(c, r) {
  return `${c},${r}`;
}

export function center(c, r) {
  return [1.5 * c, -S3 * (r + 0.5 * (c % 2))];
}

function k3(v) {
  const s = (Math.round(v * 1000) / 1000).toFixed(3);
  return s === "-0.000" ? "0.000" : s;
}

function ptKey(prefix, x, y) {
  return `${prefix}${k3(x)}|${k3(y)}`;
}

/** Baut das Brett für eine Spielerzahl. -> {pos, edges, corners}
 *  pos[key] = {key, c, r, type, x, y, nb: [keys], edges: [6 keys], corners: [6 keys]}
 *  edges[key] = {key, x, y, ang, fields: [posKeys]}   (Kante k einer Kachel: Mitte bei 30 + 60k Grad)
 *  corners[key] = {key, x, y, fields: [posKeys]}      (Ecke k: bei 60k Grad) */
export function makeBoard(nPlayers) {
  const big = nPlayers >= 4;
  const pos = {};
  const add = (list, type) => {
    for (const [c, r] of list) {
      const key = posKey(c, r);
      if (!big && ONLY_BIG.has(key)) continue;
      const [x, y] = center(c, r);
      pos[key] = { key, c, r, type, x, y, nb: [], edges: [], corners: [] };
    }
  };
  add([CAPITAL], "capital");
  add(HOME, "home");
  add(FOG, "fog");
  add(SHADOW, "shadow");
  const byPt = {};
  for (const p of Object.values(pos)) byPt[ptKey("", p.x, p.y)] = p.key;
  const edges = {};
  const corners = {};
  for (const p of Object.values(pos)) {
    for (let k = 0; k < 6; k++) {
      const a = ((30 + 60 * k) * Math.PI) / 180;
      const nx = p.x + S3 * Math.cos(a);
      const ny = p.y + S3 * Math.sin(a);
      const nbKey = byPt[ptKey("", nx, ny)];
      if (nbKey) p.nb.push(nbKey);
      const ex = p.x + (S3 / 2) * Math.cos(a);
      const ey = p.y + (S3 / 2) * Math.sin(a);
      const ek = ptKey("e", ex, ey);
      if (!edges[ek]) edges[ek] = { key: ek, x: ex, y: ey, ang: 30 + 60 * k, fields: [] };
      edges[ek].fields.push(p.key);
      p.edges.push(ek);
      const b = ((60 * k) * Math.PI) / 180;
      const cx = p.x + Math.cos(b);
      const cy = p.y + Math.sin(b);
      const ck = ptKey("c", cx, cy);
      if (!corners[ck]) corners[ck] = { key: ck, x: cx, y: cy, fields: [] };
      corners[ck].fields.push(p.key);
      p.corners.push(ck);
    }
  }
  return { pos, edges, corners, nPlayers };
}

/** Kürzeste Entfernung (in Feldern) jedes Platzes zur Hauptstadt. */
export function distances(board, target = CAPITAL_KEY) {
  const d = { [target]: 0 };
  const q = [target];
  while (q.length) {
    const a = q.shift();
    for (const b of board.pos[a].nb) {
      if (d[b] === undefined) {
        d[b] = d[a] + 1;
        q.push(b);
      }
    }
  }
  return d;
}

/** Nachbarfelder einer Kachel und sie selbst (für „an diesem oder einem Nachbarfeld“). */
export function withNeighbors(board, key) {
  return [key, ...board.pos[key].nb];
}
