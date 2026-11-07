// 3D-Spielbrett aus den Druckmodellen (GLB, erzeugt von generator/digital_modelle.py).
// Koordinaten: wie im Generator in mm (x Ost, y Nord, z oben); three.js: X = x, Y = z, Z = −y.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { makeBoard, GATES, TOWER_GATE } from "./shared/board.js";
import { COLORS } from "./shared/data.js";

const COLOR_LABEL = { rot: "Rot", blau: "Blau", gelb: "Gelb", weiss: "Weiß", lavendel: "Lavendel", lila: "Lila" };
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
      hs.forEach((h, k) => {
        const dx = hs.length > 1 ? (k - (hs.length - 1) / 2) * 15 : 0;
        const obj = inst(`Ork-Horde ${1 + (h.id % 3)}`) || inst("Ork-Horde 1") || fallbackBox(0x222222, 12, 10);
        obj.userData = { kind: "horde", key: h.id };
        const z = t ? Z_INSERT + INSERT_H + 0.4 : 3;
        layers.pieces.add(place(obj, x + spot[0] + dx, y + spot[1], z, 15 * h.id));
      });
    }
    // Turm mit Auge
    const tg = board.pos[TOWER_GATE];
    if (tg) {
      const [tx, ty0] = mm(tg);
      const ty = ty0 + 4.5;
      let z = Z_INSERT + INSERT_H + 0.6;
      const sock = inst("Turm-Sockel");
      if (sock) layers.pieces.add(place(sock, tx, ty, z));
      for (let k = 0; k < s.tower; k++) {
        const seg = inst("Turm-Segment");
        if (seg) layers.pieces.add(place(seg, tx, ty, z + 12.4 + 9.0 * k));
      }
      const gate = GATES[s.eye];
      const rot = { "6,1": 0, "6,3": 180, "6,2": 90 }[gate] ?? 0;      // Auge blickt im Modell nach Norden (+y)
      const sp = inst("Turm-Spitze");
      if (sp) layers.pieces.add(place(sp, tx, ty, z + 12.4 + 9.0 * s.tower, rot));
    }
    // Reise-Leiste mit Gefährten
    const rl = inst(s.personal ? "Reise-Leiste persönlich" : "Reise-Leiste neutral") || inst("Reise-Leiste");
    if (rl) layers.pieces.add(place(rl, reiseAt.x, reiseAt.y, 0));
    const stepW = 19.5;
    const rw = 11 * stepW + 6;
    const gx = reiseAt.x - rw / 2 + 3 + stepW * (s.journey + 0.5);
    const gf = inst("Gefährten");
    if (gf) layers.pieces.add(place(gf, gx, reiseAt.y + 7.0, 3.2));
    // Ruhm-Leiste mit Markern
    const ru = inst("Ruhm-Leiste");
    if (ru) layers.pieces.add(place(ru, ruhmAt.x, ruhmAt.y, 0));
    const occ = {};
    s.seats.forEach((seat, i) => {
      const n = Math.max(0, seat.fame) % 60;
      const k = (occ[n] = (occ[n] || 0) + 1) - 1;
      const c = n % 10;
      const r = Math.floor(n / 10);
      const Wd = 10 * 21.5 + 8;
      const Hh = 6 * 16.5 + 8;
      const x = ruhmAt.x - Wd / 2 + 4 + (c + 0.5) * 21.5 + (k % 2 ? 5 : -5) * (k ? 1 : 0);
      const y = ruhmAt.y + Hh / 2 - 4 - (r + 0.5) * 16.5 + (k >= 2 ? 4 : 0);
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
