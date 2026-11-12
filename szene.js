// 3D-Spielbrett aus den Druckmodellen (GLB, erzeugt von generator/digital_modelle.py).
// Koordinaten: wie im Generator in mm (x Ost, y Nord, z oben); three.js: X = x, Y = z, Z = −y.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { makeBoard, GATES, TOWER_GATE } from "./shared/board.js";
import { COLORS } from "./shared/data.js";
import { score } from "./shared/engine.js";

const COLOR_LABEL = { rot: "Rot", blau: "Blau", gelb: "Gelb", weiss: "Weiß", indigo: "Indigo", lavendel: "Lavendel", lila: "Lila" };
const DEG = Math.PI / 180;

function W(x, y, z = 0) {
  return new THREE.Vector3(x, z, -y);
}

export async function createScene(el, { onPick, onProgress } = {}) {
  const meta = await fetch("./models/models.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const C = meta?._konstanten || {};
  const A = C.A ?? 32;
  const R = C.CORNER_R ?? A / Math.cos(30 * DEG);
  const SHELL_H = C.SHELL_H ?? 9;
  const RECESS_D = C.RECESS_D ?? 2;
  const INSERT_H = C.INSERT_H ?? 2;
  const PLATZ_D = C.PLATZ_D ?? 0.8;
  const LF_FLAME_Z = C.LF_FLAME_Z ?? 21.9;
  const Z_INSERT = SHELL_H - RECESS_D;
  const models = Object.fromEntries(Object.entries(meta || {}).filter(([k]) => !k.startsWith("_")));

  // ---------------------------------------------------------------- Grundszene
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2622);
  const camera = new THREE.PerspectiveCamera(38, 1, 5, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = 82 * DEG;
  controls.minDistance = 80;
  controls.maxDistance = 1600;
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3028, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-250, 600, 350);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, near: 10, far: 2000 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x6b4f37, roughness: 0.9 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.05;
  table.receiveShadow = true;
  scene.add(table);

  // ---------------------------------------------------------------- Modelle laden
  const draco = new DRACOLoader().setDecoderPath("./vendor/three/examples/jsm/libs/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const cache = new Map();
  const names = Object.keys(models);
  let loaded = 0;
  await Promise.all(names.map(async (name) => {
    try {
      const g = await loader.loadAsync(`./models/${models[name].file}`);
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      cache.set(name, g.scene);
    } catch (e) {
      console.warn("Modell fehlt:", name, e);
    }
    loaded++;
    onProgress?.(loaded, names.length);
  }));
  function inst(name) {
    const m = cache.get(name);
    return m ? m.clone(true) : null;
  }
  function fallbackBox(color, w = 8, h = 8) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color }));
    m.position.y = h / 2;
    const g = new THREE.Group();
    g.add(m);
    return g;
  }
  function place(obj, x, y, z, rotDeg = 0) {
    obj.position.copy(W(x, y, z));
    obj.rotation.y = rotDeg * DEG;
    return obj;
  }

  // ---------------------------------------------------------------- Gruppen
  const layers = { tiles: new THREE.Group(), pieces: new THREE.Group(), targets: new THREE.Group(), extra: new THREE.Group() };
  for (const g of Object.values(layers)) scene.add(g);
  let board = null;
  let tileKey = "";
  const hexShape = (r) => {
    const s = new THREE.Shape();
    for (let k = 0; k < 6; k++) {
      const a = 60 * k * DEG;
      if (k === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a));
      else s.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    s.closePath();
    return s;
  };
  const fogMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 1, transparent: true, opacity: 0.55 });
  const fogGeo = new THREE.ExtrudeGeometry(hexShape(R * 0.96), { depth: 3, bevelEnabled: false });
  fogGeo.rotateX(-Math.PI / 2);
  // Nebel-Plättchen (seit dem Tisch-Durchlauf 7.11.2026): auf jedem leeren Nebel-Platz verdeckt, Wirbel oben; Horden im
  // Nebel stehen darauf. Seit 12.11.2026 52 mm Schlüsselweite und 2,6 mm dick (vorher 32 × 3 mm), ohne Nebeldose.
  const CHIP_SW = C.NEBEL_SW ?? 52, CHIP_H = C.NEBEL_H ?? 2.6;      // aus dem Manifest, falls der Generator sie liefert
  const CHIP_R = CHIP_SW / 2 / Math.cos(30 * DEG);
  const chipGeo = new THREE.ExtrudeGeometry(hexShape(CHIP_R), { depth: CHIP_H, bevelEnabled: false });
  chipGeo.rotateX(-Math.PI / 2);
  const chipMats = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const k = 256 / (2 * CHIP_R);
    g.fillStyle = "#9b9ea0";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#f2f0ea";
    g.lineWidth = 1.6 * k;
    g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, a = t * 2.4 * 2 * Math.PI + 1.3, rr = (2.4 + t * 17) * k;      // Wirbel mit dem Plättchen mitgewachsen
      const px = 128 + rr * Math.cos(a), py = 128 + rr * Math.sin(a);
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / (2 * CHIP_R), 1 / (2 * CHIP_R));
    tex.offset.set(0.5, 0.5);
    return [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x9b9ea0, roughness: 0.9 })];
  })();
  const Z_CHIP = 3;
  const RING_H = 2.6;
  const ringGeo = new THREE.CylinderGeometry(6.8, 6.8, RING_H, 28);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xb5281c, roughness: 0.6 });

  function mm(p) {
    return [p.x * R, p.y * R];
  }
  const center = { x: 0, y: 0 };

  function buildTiles(s) {
    layers.tiles.clear();
    for (const p of Object.values(board.pos)) {
      const [x, y] = mm(p);
      const t = s.tiles[p.key];
      if (!t) {
        const m = new THREE.Mesh(fogGeo, fogMat);
        m.position.copy(W(x, y, 0));
        m.receiveShadow = true;
        layers.tiles.add(m);
        const chip = new THREE.Mesh(chipGeo, chipMats);
        chip.position.copy(W(x, y, Z_CHIP));
        chip.castShadow = chip.receiveShadow = true;
        layers.tiles.add(chip);
        continue;
      }
      const grey = ["hauptstadt", "tor", "turm_tor", "feuerberg"].includes(t.kind);
      const shell = inst(grey ? "Schale grau" : "Schale dunkelgrün");
      if (shell) layers.tiles.add(place(shell, x, y, 0, meta?.schale_drehung ?? 0));
      const ins = inst(t.model);
      if (ins) layers.tiles.add(place(ins, x, y, Z_INSERT));
      else layers.tiles.add(place(fallbackBox(0x557744, 50, 4), x, y, Z_INSERT));
    }
  }

  // ---------------------------------------------------------------- Zustand zeichnen
  const reiseAt = { x: 0, y: 0 };
  const ruhmAt = { x: 0, y: 0 };
  function layout() {
    const xs = Object.values(board.pos).map((p) => p.x * R);
    const ys = Object.values(board.pos).map((p) => p.y * R);
    center.x = (Math.min(...xs) + Math.max(...xs)) / 2;
    center.y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const bottom = Math.min(...ys) - R;
    reiseAt.x = center.x - 120;
    reiseAt.y = bottom - 70;
    ruhmAt.x = center.x + 175;
    ruhmAt.y = bottom - 90;
  }
  let first = true;

  function update(s) {
    if (!board || board.nPlayers !== s.nSeats) {
      board = makeBoard(s.nSeats);
      layout();
      tileKey = "";
    }
    const tk = JSON.stringify(s.tiles);
    if (tk !== tileKey) {
      buildTiles(s);
      tileKey = tk;
    }
    layers.pieces.clear();
    // Gebäude
    for (const [ek, bl] of Object.entries(s.buildings)) {
      const e = board.edges[ek];
      if (!e) continue;
      const [x, y] = mm(e);
      const col = s.seats[bl.seat].color;
      const nm = `${["", "Gehöft", "Burg", "Festung"][bl.level]} ${COLOR_LABEL[col]}`;
      const obj = inst(nm) || fallbackBox(COLORS[col].hex, 9, 6 + 3 * bl.level);
      obj.userData = { kind: "edge", key: ek };
      layers.pieces.add(place(obj, x, y, bl.level === 1 ? SHELL_H - PLATZ_D : SHELL_H, e.ang + 90));
    }
    // Leuchtfeuer
    for (const [ck, bc] of Object.entries(s.beacons)) {
      const c = board.corners[ck];
      const [x, y] = mm(c);
      const lf = inst("Leuchtfeuer") || fallbackBox(0x999999, 8, 20);
      layers.pieces.add(place(lf, x, y, SHELL_H - PLATZ_D));
      if (bc.lit) {
        const fl = inst("Flamme");
        if (fl) layers.pieces.add(place(fl, x, y, SHELL_H - PLATZ_D + LF_FLAME_Z));
        const light = new THREE.PointLight(0xff8a2a, 900, 120, 2);
        light.position.copy(W(x, y, SHELL_H + LF_FLAME_Z + 6));
        layers.pieces.add(light);
      }
    }
    // Horden
    const perField = {};
    for (const h of s.hordes) (perField[h.pos] ||= []).push(h);
    for (const [f, hs] of Object.entries(perField)) {
      const p = board.pos[f];
      const [x, y] = mm(p);
      const t = s.tiles[f];
      const spot = (t && models[t.model]?.spot) || [0, 0];
      // wie am Tisch: eine Figur, für jede weitere Horde ein roter Hordenring darunter (figuren.hordenring)
      const z = t ? Z_INSERT + INSERT_H + 0.4 : Z_CHIP + CHIP_H;       // im Nebel auf dem Plättchen
      for (let k = 0; k < hs.length - 1; k++) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(W(x + spot[0], y + spot[1], z + RING_H * (k + 0.5)));
        ring.castShadow = ring.receiveShadow = true;
        layers.pieces.add(ring);
      }
      const h = hs[0];
      const obj = inst(`Ork-Horde ${1 + (h.id % 3)}`) || inst("Ork-Horde 1") || fallbackBox(0x222222, 12, 10);
      obj.userData = { kind: "horde", key: h.id, n: hs.length };
      layers.pieces.add(place(obj, x + spot[0], y + spot[1], z + RING_H * (hs.length - 1), 15 * h.id));
    }
    // Turm mit Auge
    const tg = board.pos[TOWER_GATE];
    if (tg) {
      const [tx, ty0] = mm(tg);
      const ty = ty0 + 4.5;
      // Fuß des Sockels und Segmenthöhen aus dem Manifest (seit 12.11.2026: Aufnahme 6,5 mm tief, Sockel 16,4 mm hoch)
      const tv = meta?._versaetze || {};
      const z = Z_INSERT + (tv.turm_sockel?.z != null ? tv.turm_sockel.z - (tv.einsatz_z ?? Z_INSERT) : INSERT_H - 1.0);
      const z0 = tv.turm_segment_z0 ?? 16.4, zh = tv.turm_segment_h ?? 9.0;
      const sock = inst("Turm-Sockel");
      if (sock) layers.pieces.add(place(sock, tx, ty, z));
      for (let k = 0; k < s.tower; k++) {
        const seg = inst("Turm-Segment");
        if (seg) layers.pieces.add(place(seg, tx, ty, z + z0 + zh * k));
      }
      const gate = GATES[s.eye];
      const rot = { "6,1": 0, "6,3": 180, "6,2": 90 }[gate] ?? 0;      // Auge blickt im Modell nach Norden (+y)
      const sp = inst("Turm-Spitze");
      if (sp) layers.pieces.add(place(sp, tx, ty, z + z0 + zh * s.tower, rot));
    }
    // Reise-Leiste mit Gefährten
    const rl = inst(s.personal ? "Reise-Leiste persönlich" : "Reise-Leiste neutral") || inst("Reise-Leiste");
    if (rl) layers.pieces.add(place(rl, reiseAt.x, reiseAt.y, 0));
    const stepW = 19.5;
    const rw = 11 * stepW + 6;
    const gx = reiseAt.x - rw / 2 + 3 + stepW * (s.journey + 0.5);
    const gf = inst("Gefährten");
    if (gf) layers.pieces.add(place(gf, gx, reiseAt.y + 7.0, 3.2));
    // Ruhm-Leiste mit Markern: Stand wie am Tisch (Gebäude eingerechnet). Felder aus dem Manifest (seit 8.11.2026 0–49,
    // 10 × 5 Felder à 21,5 × 19,8 mm); fehlen sie, die alte Leiste 0–59. Bis 4 Marker 2 × 2 im Feld, weitere am unteren Rand.
    const ru = inst("Ruhm-Leiste");
    if (ru) layers.pieces.add(place(ru, ruhmAt.x, ruhmAt.y, 0));
    const felder = meta?._versaetze?.ruhm_leiste?.felder_xy
      || Array.from({ length: 60 }, (_, n) => [-111.5 + 4 + (n % 10 + 0.5) * 21.5, 53.5 - 4 - (Math.floor(n / 10) + 0.5) * 16.5]);
    const feldH = felder.length > 10 ? Math.abs(felder[0][1] - felder[10][1]) : 16.5;
    const occ = {};
    s.seats.forEach((seat, i) => {
      const n = score(s, i).leiste % felder.length;
      const k = (occ[n] = (occ[n] || 0) + 1) - 1;
      const d = Math.min(4.5, feldH / 2 - 4.2);           // Abstand der Markermitten von der Feldmitte
      const [dx, dy] = k < 4 ? [k % 2 ? d : -d, k < 2 ? d : -d] : [(k - 4) * 9 - 4.5, -feldH / 2];
      const x = ruhmAt.x + felder[n][0] + dx;
      const y = ruhmAt.y + felder[n][1] + dy;
      const mk = inst(`Ruhm-Marker ${COLOR_LABEL[seat.color]}`) || fallbackBox(COLORS[seat.color].hex, 6, 10);
      layers.pieces.add(place(mk, x, y, 3.2));
    });
    // Würfel der Runde
    // Würfel der Runde: die gewürfelte Seite nach oben (Quaternion aus dem Manifest), gedreht um die Würfelmitte
    const wf = meta?._wuerfel?.flaechen || {};
    const size = meta?._wuerfel?.groesse || 16;
    (s.dice || []).forEach((face, i) => {
      const d = inst("Runenwürfel");
      if (!d) return;
      d.position.y = -size / 2;
      const pivot = new THREE.Group();
      pivot.add(d);
      const q = wf[face]?.nach_oben_quat_gltf;
      if (q) pivot.quaternion.set(q[0], q[1], q[2], q[3]);
      const turn = new THREE.Group();
      turn.add(pivot);
      pivot.position.y = size / 2;
      turn.rotation.y = (i * 37 % 60) * DEG;
      turn.position.copy(W(center.x - 160 + i * 26, reiseAt.y + 62, 0));
      layers.pieces.add(turn);
    });
    if (first) {
      first = false;
      resetView();
    }
  }

  function resetView() {
    // Brett und beide Leisten ganz im Bild: Abstand aus Bildformat und Ausdehnung (ca. 560 × 500 mm)
    const target = W(center.x + 25, center.y - 85, 0);
    const vfov = (camera.fov * DEG) / 2;
    const hfov = Math.atan(Math.tan(vfov) * camera.aspect);
    const d = 0.95 * Math.max(300 / Math.tan(hfov), 230 / Math.tan(vfov));
    const elev = 58 * DEG;
    controls.target.copy(target);
    camera.position.copy(target.clone().add(new THREE.Vector3(0, d * Math.sin(elev), d * Math.cos(elev))));
    sun.target.position.copy(target);
    controls.update();
  }

  // ---------------------------------------------------------------- Klickziele
  let targetKind = null;
  const pickMat = new THREE.MeshStandardMaterial({ color: 0x55ff88, emissive: 0x22aa44, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 });
  const pickMatAlt = new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0xaa7700, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 });
  function setTargets(kind, keys, alt = false) {
    layers.targets.clear();
    targetKind = kind;
    if (!kind || !board) return;
    const mat = alt ? pickMatAlt : pickMat;
    for (const key of keys) {
      let m;
      if (kind === "edge") {
        const e = board.edges[key];
        if (!e) continue;
        const [x, y] = mm(e);
        m = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 7), mat);
        m.position.copy(W(x, y, SHELL_H + 2));
        m.rotation.y = (e.ang + 90) * DEG;
      } else if (kind === "corner") {
        const c = board.corners[key];
        if (!c) continue;
        const [x, y] = mm(c);
        m = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 4, 24), mat);
        m.position.copy(W(x, y, SHELL_H + 2));
      } else if (kind === "field") {
        const p = board.pos[key];
        if (!p) continue;
        const [x, y] = mm(p);
        m = new THREE.Mesh(new THREE.TorusGeometry(R * 0.55, 2.2, 8, 6), mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = 30 * DEG;
        m.position.copy(W(x, y, SHELL_H + 6));
      } else if (kind === "horde") {
        const obj = layers.pieces.children.find((o) => o.userData?.kind === "horde" && o.userData.key === key);
        if (!obj) continue;
        m = new THREE.Mesh(new THREE.TorusGeometry(10, 1.6, 8, 24), mat);
        m.rotation.x = -Math.PI / 2;
        m.position.copy(obj.position).add(new THREE.Vector3(0, 2, 0));
      }
      if (m) {
        m.userData = { kind, key };
        layers.targets.add(m);
      }
    }
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (ev) => {
    downAt = [ev.clientX, ev.clientY];
  });
  renderer.domElement.addEventListener("click", (ev) => {
    if (downAt && Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 6) return;   // war ein Ziehen
    downAt = null;
    if (!targetKind) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    controls.update();
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(layers.targets.children, false);
    if (hits.length) onPick?.(hits[0].object.userData.kind, hits[0].object.userData.key);
  });

  // ---------------------------------------------------------------- Schleife
  function resize() {
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el);
  resize();
  let t = 0;
  renderer.setAnimationLoop(() => {
    t += 0.05;
    const s = 1 + 0.08 * Math.sin(t * 2);
    for (const m of layers.targets.children) m.scale.set(s, 1, s);
    controls.update();
    renderer.render(scene, camera);
  });

  window.__lfScene = { camera, layers, renderer, THREE, controls, W, R };
  return { update, setTargets, clearTargets: () => setTargets(null, []), resetView, missing: names.length === 0 };
}
