// EP19 Mexican Street Tacos — silkscreen-poster-3d. Opaque flat-ink facets, stepped sky, cream paper, tip-lock pours, spatula ≥ foodTop + hard push, knife upright. Pure fn of t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const K = kit, E = TL.ev, W = 1080, H = 1920, TAU = Math.PI * 2;
const { clamp, lerp, seg, eio, eo, ei, ss, back, win } = K;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Travel-poster Mexican palette
const CREAM = '#F4E8D0', SKY = '#5BA3C9', ADOBE = '#C45C3A', CORN = '#E8B84A', LIME = '#7CB342', INK = '#1E2A32';
const SKY2 = '#3E7FA3', SKY3 = '#2A5A78', PAPER_GAP = '#FBF3E3';

K.setTheme({
  style: 'flat', ink: INK, paper: CREAM, a1: ADOBE, a2: CORN, a3: LIME, a4: SKY,
  brand: 'STREET POSTER', brandZh: '街头海报厨',
  fontEn: '"Impact", "Arial Narrow", "Poppins", sans-serif',
  fontUi: '"Poppins", "Noto Sans CJK SC", sans-serif',
  fontZh: '"Noto Sans SC", "Noto Sans CJK SC", sans-serif',
  muted: 'rgba(30,42,50,.62)', outline: 3, shadow: 0
});
K.HUD_TOP = 190;
const STIR_HZ = 1.0; // match audio.py
const A = V(-0.95, 0, 0), B = V(0.08, 0, 0), C = V(1.05, 0, 0); // board | comal | plate

const R3 = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.BasicShadowMap;
R3.localClippingEnabled = true;
R3.toneMapping = THREE.NoToneMapping;
R3.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(CREAM);
const cam = new THREE.PerspectiveCamera(46, W / H, .01, 20);
const out = document.getElementById('c'), ctx = out.getContext('2d');

// ---- silkscreen flat opaque inks (no gradients) ----
function ink(color, o = {}) {
  return new THREE.MeshLambertMaterial(Object.assign({
    color: new THREE.Color(color), flatShading: true, emissive: new THREE.Color(color).multiplyScalar(0.04)
  }, o));
}
function inkSoft(color, o = {}) {
  return new THREE.MeshLambertMaterial(Object.assign({
    color, flatShading: true, transparent: !!o.opacity, opacity: o.opacity ?? 1
  }, o));
}
function mesh(geo, mat, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m;
}
const lathe = (pts, n = 36) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);

function labelTex(lines, bg, fg, w = 512, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = INK; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([s, sz, y, f]) => { g.font = `800 ${sz}px ${f || K.theme.fontZh}`; g.fillText(s, w / 2, y); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function paperGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = CREAM; g.fillRect(0, 0, 128, 128);
  const R = K.rng(19);
  for (let i = 0; i < 80; i++) {
    g.fillStyle = i % 3 ? 'rgba(30,42,50,.035)' : 'rgba(196,92,58,.04)';
    g.fillRect(R() * 128, R() * 128, 1 + R() * 2, 1 + R() * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}

// lights — hard poster light, no soft gradient haze
scene.add(new THREE.AmbientLight('#FFF8EC', .62));
scene.add(new THREE.HemisphereLight('#B8D8EA', '#8A5A40', .38));
const key = new THREE.DirectionalLight('#FFFCF0', 1.35); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: .1, far: 6 });
key.shadow.bias = -.001; key.shadow.normalBias = .02; key.shadow.radius = 0;
key.position.set(-0.6, 2.4, 1.4); key.target.position.set(0.1, 0, 0); scene.add(key, key.target);
const fill = new THREE.DirectionalLight(SKY, .28); fill.position.set(1.8, 1.0, -1.0); scene.add(fill);

// ---- set: stepped sky bands + cream paper wall + adobe counter ----
{
  // stepped sky (far → near value), NO gradient
  const bands = [
    { y: 1.55, h: 0.55, col: SKY },
    { y: 1.15, h: 0.35, col: SKY2 },
    { y: 0.88, h: 0.22, col: SKY3 },
  ];
  bands.forEach((b, i) => {
    const p = mesh(new THREE.PlaneGeometry(9, b.h), ink(b.col), false, false);
    p.position.set(0, b.y, -0.72 - i * 0.002); scene.add(p);
    // slight misregister ghost
    const ghost = mesh(new THREE.PlaneGeometry(9, b.h), inkSoft(INK, { opacity: 0.06 }), false, false);
    ghost.position.set(0.012, b.y - 0.008, -0.719 - i * 0.002); scene.add(ghost);
  });
  // cream paper wall mid
  const wallMat = ink(CREAM); wallMat.map = paperGrain();
  const wall = mesh(new THREE.PlaneGeometry(9, 1.4), wallMat, false, true);
  wall.position.set(0, 0.15, -0.62); scene.add(wall);
  // dark info band under sky
  const band = mesh(new THREE.PlaneGeometry(9, 0.1), ink(INK), false, false);
  band.position.set(0, 0.72, -0.61); scene.add(band);
  // sun accent disc (rare accent)
  const sun = mesh(new THREE.CircleGeometry(0.18, 24), ink(CORN), false, false);
  sun.position.set(1.35, 1.55, -0.705); scene.add(sun);
  const sunGhost = mesh(new THREE.CircleGeometry(0.18, 24), inkSoft(ADOBE, { opacity: 0.35 }), false, false);
  sunGhost.position.set(1.362, 1.542, -0.704); scene.add(sunGhost);
}
{
  const counter = mesh(new RoundedBoxGeometry(5.0, 0.85, 1.55, 2, 0.01), ink(ADOBE));
  counter.position.set(0, -0.425, 0.05); scene.add(counter);
  // paper-white gap edge (registration slip)
  const edge = mesh(new RoundedBoxGeometry(5.02, 0.02, 1.57, 1, 0.004), ink(PAPER_GAP), false, false);
  edge.position.set(0.008, -0.01, 0.055); scene.add(edge);
  const top = mesh(new RoundedBoxGeometry(4.85, 0.03, 1.42, 2, 0.01), ink(CREAM));
  top.position.set(0, 0.012, 0.05); scene.add(top);
  // ink outline under counter front
  const lip = mesh(new THREE.BoxGeometry(4.9, 0.02, 0.02), ink(INK), false, false);
  lip.position.set(0, -0.02, 0.76); scene.add(lip);
}
// prop jars (poster flats)
{
  const jar = (x, z, col, lid) => {
    const j = mesh(lathe([[0, 0], [.048, 0], [.052, .02], [.052, .14], [.04, .16], [0, .16]]), ink(col));
    j.position.set(x, 0, z); scene.add(j);
    const l = mesh(new THREE.CylinderGeometry(.05, .05, .022, 16), ink(lid)); l.position.set(x, .172, z); scene.add(l);
  };
  jar(-1.7, -.4, CORN, INK); jar(-1.48, -.42, LIME, ADOBE); jar(1.6, -.4, SKY, INK);
}

const R = K.rng(20261109);
const inDisk = (f, rMin = 0) => { const r = rMin + Math.sqrt(R()) * Math.max(0, f - rMin), a = R() * TAU; return { r, a }; };

// ---- station A: board + onion / cilantro / lime ----
const BOARD_TOP = 0.028;
const board = mesh(new RoundedBoxGeometry(0.55, 0.028, 0.38, 2, 0.01), ink('#D9C4A0'));
board.position.set(A.x, 0.014, A.z); scene.add(board);
{ const rim = mesh(new THREE.BoxGeometry(0.57, 0.004, 0.4), ink(INK), false, false);
  rim.position.set(A.x + 0.006, 0.001, A.z - 0.004); scene.add(rim); }

// onion whole → diced
const onionWhole = mesh(new THREE.SphereGeometry(0.055, 14, 10), ink('#F0E6D4'));
onionWhole.scale.set(1.05, 0.9, 1.05); onionWhole.position.set(A.x - 0.08, BOARD_TOP + 0.048, A.z); scene.add(onionWhole);
const onionDice = [];
for (let i = 0; i < 18; i++) {
  const d = mesh(new RoundedBoxGeometry(0.018 + R() * 0.01, 0.016 + R() * 0.008, 0.018 + R() * 0.01, 1, 0.002), ink('#F2E8D6'));
  d.visible = false; scene.add(d); onionDice.push({ m: d, ang: R() * TAU, rad: 0.04 + R() * 0.12, ry: R() * TAU });
}
// cilantro bunch → bits
const cilantroBunch = new THREE.Group();
for (let i = 0; i < 8; i++) {
  const leaf = mesh(new THREE.SphereGeometry(0.012, 6, 5), ink(LIME));
  leaf.scale.set(1.6, 0.35, 1.1);
  leaf.position.set((R() - 0.5) * 0.05, 0.01 + R() * 0.02, (R() - 0.5) * 0.04);
  leaf.rotation.set(R() * 0.5, R() * TAU, R() * 0.4);
  cilantroBunch.add(leaf);
}
cilantroBunch.position.set(A.x + 0.12, BOARD_TOP, A.z + 0.05); scene.add(cilantroBunch);
const cilantroBits = [];
for (let i = 0; i < 16; i++) {
  const b = mesh(new THREE.SphereGeometry(0.006, 5, 4), ink(i % 2 ? LIME : '#5A9A32'));
  b.scale.set(1.4, 0.4, 1.0); b.visible = false; scene.add(b);
  cilantroBits.push({ m: b, ang: R() * TAU, rad: 0.03 + R() * 0.1, ry: R() * TAU });
}
// lime whole → halves with flesh
const limeWhole = mesh(new THREE.SphereGeometry(0.042, 12, 10), ink(LIME));
limeWhole.position.set(A.x + 0.02, BOARD_TOP + 0.042, A.z - 0.1); scene.add(limeWhole);
const limeHalves = [];
for (let s of [-1, 1]) {
  const g = new THREE.Group();
  // hemisphere peel
  const peel = mesh(new THREE.SphereGeometry(0.048, 14, 10, 0, TAU, 0, Math.PI / 2), ink(LIME));
  peel.rotation.x = s > 0 ? Math.PI / 2 : -Math.PI / 2;
  // cut face — pale flesh disc facing camera-ish
  const flesh = mesh(new THREE.CircleGeometry(0.045, 20), ink('#F2F8D0'));
  flesh.rotation.x = -Math.PI / 2;
  flesh.position.y = 0.001;
  g.add(peel, flesh);
  for (let k = 0; k < 8; k++) {
    const wedge = mesh(new THREE.CircleGeometry(0.038, 3, k * TAU / 8, TAU / 8 - 0.04), ink(k % 2 ? '#C8E070' : '#EAF6B8'));
    wedge.rotation.x = -Math.PI / 2;
    wedge.position.y = 0.0025;
    g.add(wedge);
  }
  // radial membranes
  for (let k = 0; k < 8; k++) {
    const mem = mesh(new THREE.BoxGeometry(0.002, 0.001, 0.04), ink('#F8FFF0'));
    mem.position.set(Math.cos(k * TAU / 8) * 0.02, 0.003, Math.sin(k * TAU / 8) * 0.02);
    mem.rotation.y = -k * TAU / 8;
    g.add(mem);
  }
  g.visible = false; scene.add(g); limeHalves.push(g);
}

// knife — blade plane = cut plane, edge down
const knife = new THREE.Group();
{
  const blade = mesh(new THREE.BoxGeometry(0.004, 0.055, 0.16), ink('#D8DEE4'));
  blade.position.set(0, 0.028, 0); knife.add(blade);
  const edge = mesh(new THREE.BoxGeometry(0.002, 0.01, 0.155), ink(INK));
  edge.position.set(0, 0.002, 0); knife.add(edge);
  const handle = mesh(new RoundedBoxGeometry(0.022, 0.028, 0.08, 1, 0.004), ink(ADOBE));
  handle.position.set(0, 0.03, 0.115); knife.add(handle);
  scene.add(knife); knife.visible = false;
}

// ---- station B: comal (flat cast-iron) ----
const CR = 0.30, CTH = 0.018, CRIM = 0.285, CTY = 0.032; // food top on thickened comal face
const comalG = new THREE.Group(); scene.add(comalG); comalG.position.copy(B);
{
  const disc = mesh(new THREE.CylinderGeometry(CR, CR * 0.98, CTH * 1.6, 40), ink('#1A2228'));
  disc.position.y = CTH * 0.8; comalG.add(disc);
  const face = mesh(new THREE.CylinderGeometry(CR - 0.012, CR - 0.012, 0.004, 40), ink('#2E363C'));
  face.position.y = CTH * 1.55; comalG.add(face);
  const rim = mesh(new THREE.TorusGeometry(CR - 0.008, 0.012, 8, 40), ink(INK));
  rim.rotation.x = Math.PI / 2; rim.position.y = CTH * 0.85; comalG.add(rim);
  // paper-gap misregister under
  const ghost = mesh(new THREE.CylinderGeometry(CR + 0.006, CR + 0.006, 0.004, 40), inkSoft(PAPER_GAP, { opacity: 0.9 }), false, false);
  ghost.position.set(0.01, 0.001, -0.006); comalG.add(ghost);
}
const stove = mesh(new RoundedBoxGeometry(0.55, 0.08, 0.55, 2, 0.01), ink(INK));
stove.position.set(B.x, -0.025, B.z); scene.add(stove);
const flames = [];
{
  const fm = new THREE.MeshBasicMaterial({ color: ADOBE, transparent: true, opacity: 0.8, depthWrite: false });
  const fi = new THREE.MeshBasicMaterial({ color: CORN, transparent: true, opacity: 0.7, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    const o = mesh(new THREE.ConeGeometry(0.018, 0.05, 5), fm, false, false);
    o.position.set(B.x + Math.cos(a) * 0.14, -0.01, B.z + Math.sin(a) * 0.14);
    const inn = mesh(new THREE.ConeGeometry(0.01, 0.03, 5), fi, false, false);
    inn.position.copy(o.position); inn.position.y += 0.005;
    scene.add(o, inn); flames.push(o, inn);
  }
}

// oil pool on comal
const oilPool = mesh(new THREE.CircleGeometry(0.12, 28), inkSoft(CORN, { opacity: 0.55 }));
oilPool.rotation.x = -Math.PI / 2; oilPool.position.set(B.x, CTY + 0.0015, B.z); oilPool.visible = false; scene.add(oilPool);

// beef strips — irregular elongated slabs with fiber + char (NOT rectangular cuboids)
function makeBeefStrip(rng, o = {}) {
  const len = o.len ?? (0.06 + rng() * 0.03);
  const halfW = o.halfW ?? (0.0064 + rng() * 0.003);
  const thick = o.thick ?? (0.008 + rng() * 0.004);
  const raw = new THREE.Color(o.rawCol || '#C44A38');
  const cooked = new THREE.Color(o.cookCol || '#4A2014');
  const charRaw = new THREE.Color('#6E2418');
  const charCook = new THREE.Color('#160A08');
  const fatRaw = new THREE.Color('#EBC0B0');
  const fatCook = new THREE.Color('#D2B080');
  const grainRaw = new THREE.Color('#8A2820');
  const grainCook = new THREE.Color('#2C120C');
  const searRaw = new THREE.Color('#A83828');
  const searCook = new THREE.Color('#32140C');
  const shape = new THREE.Shape();
  const n = 12, seedA = rng() * 9, seedB = rng() * 9, seedC = rng() * 6;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const cap = 0.62 + 0.38 * Math.sin(u * Math.PI);
    const x = (u - 0.5) * len;
    const y = halfW * cap * (0.84 + 0.22 * Math.sin(u * 7.6 + seedA) + 0.1 * Math.sin(u * 15.4 + seedB));
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    const cap = 0.62 + 0.38 * Math.sin(u * Math.PI);
    const x = (u - 0.5) * len;
    const y = -halfW * cap * (0.82 + 0.24 * Math.cos(u * 6.8 + seedB) + 0.08 * Math.sin(u * 13.2 + seedC));
    shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thick, bevelEnabled: true, bevelThickness: thick * 0.18,
    bevelSize: Math.min(halfW * 0.28, thick * 0.2), bevelSegments: 1, curveSegments: 5
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thick * 0.5, 0);
  const g = new THREE.Group();
  const body = mesh(geo, ink('#C44A38'));
  body.userData.role = 'body';
  g.add(body);
  const sear = mesh(new THREE.BoxGeometry(len * (0.42 + rng() * 0.18), 0.0016, halfW * 1.15), ink('#A83828'), false, false);
  sear.position.set((rng() - 0.5) * len * 0.12, thick + 0.0006, 0);
  sear.userData.role = 'sear';
  g.add(sear);
  const nFib = 3;
  for (let i = 0; i < nFib; i++) {
    const fat = i !== 1;
    const fl = len * (0.48 + rng() * 0.28);
    const fmesh = mesh(new THREE.BoxGeometry(fl, 0.002, 0.0022 + rng() * 0.001), ink(fat ? '#EBC0B0' : '#8A2820'), false, false);
    fmesh.position.set((rng() - 0.5) * len * 0.1, thick + 0.0014, (i - 1) * halfW * 0.38);
    fmesh.rotation.y = (rng() - 0.5) * 0.12;
    fmesh.userData.role = fat ? 'fat' : 'grain';
    g.add(fmesh);
  }
  const char = mesh(new THREE.BoxGeometry(len * 0.48, thick * 0.38, 0.002), ink('#6E2418'), false, false);
  char.position.set((rng() - 0.5) * 0.006, thick * 0.28, halfW * 0.38);
  char.userData.role = 'char';
  g.add(char);
  g.userData = {
    len, halfW, thick, sy: thick, raw, cooked, charRaw, charCook, fatRaw, fatCook, grainRaw, grainCook, searRaw, searCook,
    cookRate: o.cookRate ?? (0.78 + rng() * 0.28)
  };
  return g;
}
function cookBeefGroup(g, cook) {
  const u = g.userData;
  g.traverse(obj => {
    if (!obj.isMesh || !obj.material || !obj.material.color) return;
    const role = obj.userData.role;
    let a = u.raw, b = u.cooked, k = clamp(cook * (u.cookRate || 1), 0, 1);
    if (role === 'char') { a = u.charRaw; b = u.charCook; k = clamp(k * 1.15, 0, 1); }
    else if (role === 'fat') { a = u.fatRaw; b = u.fatCook; }
    else if (role === 'grain') { a = u.grainRaw; b = u.grainCook; }
    else if (role === 'sear') { a = u.searRaw; b = u.searCook; k = clamp(k * 1.35, 0, 1); }
    obj.material.color.copy(a).lerp(b, k);
    if (obj.material.emissive) obj.material.emissive.copy(obj.material.color).multiplyScalar(0.04);
  });
}

const beefCubes = [];
for (let i = 0; i < 28; i++) {
  const { r, a } = inDisk(0.16, 0.03);
  const g = makeBeefStrip(R);
  g.visible = false; scene.add(g);
  beefCubes.push({
    m: g, r, a, sx: g.userData.len, sy: g.userData.thick, sz: g.userData.halfW * 2,
    phase: R() * TAU, spin: (R() - 0.5) * 0.35, yaw0: a + (R() - 0.5) * 1.2
  });
}

// tortillas (corn discs)
const tortillas = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const disc = mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.014, 28), ink(CORN));
  const ghost = mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.004, 28), inkSoft(ADOBE, { opacity: 0.3 }), false, false);
  ghost.position.set(0.008, -0.003, -0.005);
  // slight surface faceting bumps (readable corn cake, not flat disc cheat — volume cylinder)
  for (let k = 0; k < 5; k++) {
    const bump = mesh(new THREE.SphereGeometry(0.012, 6, 4), inkSoft('#D4A840', { opacity: 0.55 }), false, false);
    bump.scale.set(1.4, 0.25, 1.2);
    bump.position.set(Math.cos(k * 1.3) * 0.05, 0.005, Math.sin(k * 1.3) * 0.05);
    g.add(bump);
  }
  g.add(disc, ghost); g.visible = false; scene.add(g);
  tortillas.push(g);
}

// spatula
const spat = new THREE.Group();
{
  const wood = ink('#C4A06A');
  const blade = mesh(new RoundedBoxGeometry(0.06, 0.005, 0.036, 1, 0.002), ink(CREAM));
  blade.position.set(0, 0.0025, 0); spat.add(blade);
  const tip = mesh(new RoundedBoxGeometry(0.046, 0.004, 0.012, 1, 0.002), ink(CREAM));
  tip.position.set(0, 0.002, -0.02); spat.add(tip);
  const hg = new THREE.Group(); hg.position.set(0, 0.005, 0.008); hg.rotation.x = -72 * Math.PI / 180;
  const hd = mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.09, 8), wood);
  hd.rotation.x = Math.PI / 2; hd.position.z = 0.045; hg.add(hd);
  const grip = mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.02, 8), ink(INK));
  grip.rotation.x = Math.PI / 2; grip.position.z = 0.095; hg.add(grip);
  spat.add(hg); comalG.add(spat); spat.visible = false;
  spat.userData.handleLen = 0.10;
  spat.userData.bladeHalfW = 0.03;
  spat.userData.bladeHalfD = 0.018;
}

// bottles — tip pivot at spout
function makeBottle(lathePts, bodyCol, labBg, labFg, labLines, spoutCol, jetCol) {
  const g = new THREE.Group();
  const b = mesh(lathe(lathePts, 20), ink(bodyCol));
  const topY = lathePts.reduce((m, p) => Math.max(m, p[1]), 0);
  b.position.y = -topY;
  const lab = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.048, 20, 1, true),
    new THREE.MeshLambertMaterial({ map: labelTex(labLines, labBg, labFg), flatShading: true }));
  lab.position.y = -topY + 0.055;
  const spoutLen = 0.026;
  const spout = mesh(new THREE.CylinderGeometry(0.0065, 0.01, spoutLen, 8), ink(spoutCol));
  spout.position.y = spoutLen * 0.5;
  const hole = mesh(new THREE.CircleGeometry(0.005, 10), new THREE.MeshBasicMaterial({ color: '#120a08' }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = spoutLen + 0.0005;
  const tip = new THREE.Object3D(); tip.position.set(0, spoutLen, 0);
  g.add(b, lab, spout, hole, tip);
  g.userData = { tip, spoutLen };
  scene.add(g); g.visible = false; return g;
}
const oilBottle = makeBottle(
  [[0, 0], [.03, 0], [.032, .005], [.032, .11], [.028, .13], [.012, .155], [.01, .162], [.01, .195], [.012, .197], [.012, .203], [.007, .203], [.007, .18], [0, .18]],
  CORN, CREAM, INK, [['油', 110, 110], ['OIL', 48, 200, K.theme.fontEn]], INK, CORN
);
const salsaBottle = makeBottle(
  [[0, 0], [.032, 0], [.034, .006], [.034, .1], [.028, .12], [.014, .145], [.012, .152], [.012, .185], [.014, .187], [.014, .193], [.008, .193], [.008, .17], [0, .17]],
  ADOBE, CREAM, ADOBE, [['酱', 100, 110], ['SALSA', 40, 200, K.theme.fontEn]], INK, '#B04028'
);

function makeStream(color, r) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), ink(color));
  m.castShadow = true; m.userData.r = r; scene.add(m); return m;
}
const oilStream = makeStream(CORN, 0.0022);
const salsaStream = makeStream('#B04028', 0.0024);
function makePlug(col) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: col, depthTest: false, depthWrite: false }));
  p.renderOrder = 8; p.visible = false; scene.add(p); return p;
}
const oilPlug = makePlug(CORN), salsaPlug = makePlug('#B04028');

class SubBez extends THREE.Curve {
  constructor(p0, p1, p2, a, b) { super(); Object.assign(this, { p0, p1, p2, a, b }); }
  getPoint(u, o = new THREE.Vector3()) {
    const s = lerp(this.a, this.b, u), q = 1 - s;
    return o.set(q * q * this.p0.x + 2 * q * s * this.p1.x + s * s * this.p2.x,
      q * q * this.p0.y + 2 * q * s * this.p1.y + s * s * this.p2.y,
      q * q * this.p0.z + 2 * q * s * this.p1.z + s * s * this.p2.z);
  }
}
const DBG = { streams: {} };
function setTipStream(m, plug, tipW, axis, land, p0, p1, t, name) {
  m.geometry.dispose(); m.geometry = new THREE.BufferGeometry();
  m.visible = false; plug.visible = false;
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
  if (t < p0 || t > p1 + 0.3) return;
  const fh = clamp((t - p0) / 0.18), ft = clamp((t - p1) / 0.28);
  if (fh - ft < 0.02) return;
  plug.position.copy(tipW); plug.visible = true;
  const M0 = tipW.clone();
  const P1 = tipW.clone().addScaledVector(axis, 0.07);
  const landSafe = land.clone();
  const along = landSafe.clone().sub(tipW).dot(axis);
  if (along < 0.08) landSafe.copy(tipW).addScaledVector(axis, Math.max(0.2, along + 0.12)).lerp(land, 0.4);
  const r = m.userData.r * (1 + 0.06 * Math.sin(t * 36));
  m.geometry = new THREE.TubeGeometry(new SubBez(M0, P1, landSafe, ft, fh), 40, r, 8);
  m.visible = true;
  DBG.streams[name] = { mouth: tipW.toArray().map(v => +v.toFixed(4)), land: landSafe.toArray().map(v => +v.toFixed(4)) };
}
function pourBottle(bottle, stream, plug, O, tipW, land, t, name) {
  bottle.visible = false; stream.visible = false; plug.visible = false;
  if (!(t > O.enter && t < O.exit + 0.12)) return 0;
  const tipAxis = land.clone().sub(tipW).normalize();
  bottle.visible = true;
  bottle.quaternion.setFromUnitVectors(V(0, 1, 0), tipAxis);
  const spoutOff = bottle.userData.spoutLen || 0.026;
  bottle.position.copy(tipW).addScaledVector(tipAxis, -spoutOff);
  bottle.updateMatrixWorld(true);
  const tipChk = new THREE.Vector3();
  bottle.userData.tip.getWorldPosition(tipChk);
  const pouring = t >= O.pour[0] && t <= O.pour[1];
  if (pouring) {
    plug.visible = true; plug.position.copy(tipChk);
    const streamStart = tipChk.clone().addScaledVector(tipAxis, 0.035);
    setTipStream(stream, plug, streamStart, tipAxis, land, O.pour[0], O.pour[1], t, name);
    if (DBG.streams[name]) DBG.streams[name].mouth = tipChk.toArray().map(v => +v.toFixed(4));
  }
  if (!pouring) stream.visible = false;
  return 1;
}

// salsa puddle with surface relief (not pure disc)
const salsaPool = new THREE.Group();
{
  const base = mesh(new THREE.CircleGeometry(0.045, 16), ink('#B04028'));
  base.rotation.x = -Math.PI / 2;
  salsaPool.add(base);
  for (let i = 0; i < 7; i++) {
    const bump = mesh(new THREE.SphereGeometry(0.012 + R() * 0.008, 6, 4), ink(i % 2 ? '#C45C3A' : '#8F3020'));
    bump.scale.set(1.2, 0.35 + R() * 0.2, 1.1);
    bump.position.set(Math.cos(i * 0.95) * 0.02, 0.006, Math.sin(i * 0.95) * 0.018);
    salsaPool.add(bump);
  }
  salsaPool.visible = false; scene.add(salsaPool);
}

// ---- station C: plate + assembled tacos (shallow U shell, not a flat disc) ----
function makeTacoShell() {
  const g = new THREE.Group();
  const r = 0.112, thk = 0.012, tilt = 0.58, segs = 18;
  const half = (sign) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -r);
    for (let i = 0; i <= segs; i++) {
      const a = -Math.PI / 2 + (i / segs) * Math.PI;
      sh.lineTo(sign * r * Math.cos(a), r * Math.sin(a));
    }
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: thk, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.003, bevelSegments: 1, curveSegments: 2
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, thk * 0.5, 0);
    return mesh(geo, ink(CORN));
  };
  const left = half(-1); left.rotation.z = -tilt; left.position.x = -0.014;
  const right = half(1); right.rotation.z = tilt; right.position.x = 0.014;
  const crease = mesh(new THREE.CylinderGeometry(thk * 0.55, thk * 0.55, r * 1.85, 10), ink('#E0B040'));
  crease.rotation.x = Math.PI / 2; crease.position.y = thk * 0.28;
  g.add(left, right, crease);
  const ghost = half(-1);
  ghost.material = inkSoft(ADOBE, { opacity: 0.2 });
  ghost.castShadow = false; ghost.receiveShadow = false;
  ghost.rotation.z = -tilt;
  ghost.position.set(0.006, -0.003, -0.004);
  g.add(ghost);
  g.userData.troughY = 0.016;
  return g;
}

const plate = new THREE.Group();
{
  const p = mesh(lathe([[0, 0], [0.16, 0], [0.17, 0.01], [0.175, 0.02], [0.16, 0.025], [0, 0.022]]), ink(CREAM));
  const rim = mesh(new THREE.TorusGeometry(0.168, 0.006, 6, 32), ink(INK));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.02;
  plate.add(p, rim); plate.position.set(C.x, 0, C.z); scene.add(plate);
}
const plated = [];
{
  const g = new THREE.Group();
  const shell = makeTacoShell();
  g.add(shell);
  const meats = [];
  for (let k = 0; k < 7; k++) {
    const mb = makeBeefStrip(R, { len: 0.052 + R() * 0.02, halfW: 0.0055 + R() * 0.0022, thick: 0.0075 + R() * 0.003, cookRate: 1 });
    cookBeefGroup(mb, 1);
    mb.position.set((R() - 0.5) * 0.012, 0.02 + (k % 3) * 0.006, (k - 3) * 0.016);
    mb.rotation.set(0.05, Math.PI / 2 + (R() - 0.5) * 0.2, (R() - 0.5) * 0.1);
    mb.visible = false; g.add(mb); meats.push(mb);
  }
  const onions = [];
  for (let k = 0; k < 6; k++) {
    const o = mesh(new RoundedBoxGeometry(0.012, 0.009, 0.011, 1, 0.002), ink('#F2E8D6'));
    o.position.set((k % 2 ? 0.018 : -0.016), 0.032, (k - 2.5) * 0.02); o.visible = false; g.add(o); onions.push(o);
  }
  const cils = [];
  for (let k = 0; k < 5; k++) {
    const c = mesh(new THREE.SphereGeometry(0.007, 5, 4), ink(LIME));
    c.scale.set(1.4, 0.4, 1.1); c.position.set((k % 2 ? 0.02 : -0.018), 0.038, (k - 2) * 0.022);
    c.visible = false; g.add(c); cils.push(c);
  }
  const salsa = new THREE.Group();
  const sb = mesh(new THREE.BoxGeometry(0.02, 0.008, 0.09), ink('#B04028'));
  sb.position.set(0.0, 0.042, 0); salsa.add(sb);
  for (let k = 0; k < 5; k++) {
    const bump = mesh(new THREE.SphereGeometry(0.011, 5, 4), ink('#C45C3A'));
    bump.scale.set(1.2, 0.38, 1.3); bump.position.set((k % 2 ? 0.007 : -0.006), 0.046, (k - 2) * 0.016);
    salsa.add(bump);
  }
  salsa.visible = false; g.add(salsa);
  g.visible = false; scene.add(g);
  plated.push({ g, meats, onions, cils, salsa, ang: 0 });
}

// squeeze lime prop
const squeezeLime = limeHalves[0];

// steam
const steam = [];
{
  const sm = new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0.35, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.SphereGeometry(0.03, 6, 5), sm, false, false);
    s.visible = false; scene.add(s); steam.push(s);
  }
}

function foodTopY() { return CTY + 0.02; } // beef-strip top approx

function placeSpat(t, a, b) {
  const v = win(t, a - 0.25, b + 0.15, 0.25, 0.25);
  spat.visible = v > 0.02;
  if (v <= 0.02) return;
  const ph = (t - a) * TAU * STIR_HZ;
  spat.userData.ph = ph;
  const halfW = spat.userData.bladeHalfW, halfD = spat.userData.bladeHalfD;
  const rMax = CRIM - halfW - 0.05;
  let px = 0.05 * Math.cos(ph), pz = 0.04 * Math.sin(ph);
  let rTip = Math.hypot(px, pz) || 0.001;
  if (rTip > rMax) { px *= rMax / rTip; pz *= rMax / rTip; rTip = rMax; }
  const foodTop = foodTopY();
  const tipY = Math.max(CTY + 0.01, foodTop + 0.012);
  spat.position.set(px, tipY + (1 - eo(v)) * 0.05, pz);
  const n = V(0, 1, 0);
  const h = V(px / rTip, 0, pz / rTip);
  const zA = h.clone();
  const xA = n.clone().cross(zA).normalize();
  const yA = zA.clone().cross(xA).normalize();
  spat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
  spat.rotateX(0);
  spat.updateMatrixWorld(true);
  // tip-lock: clamp samples inside rim
  const samples = [V(0, 0, 0), V(halfW, 0, 0), V(-halfW, 0, 0), V(0, 0, halfD), V(0, 0, -halfD), V(0, 0.08, 0.03)];
  let maxOff = 0;
  for (const lp of samples) {
    const w = spat.localToWorld(lp.clone());
    maxOff = Math.max(maxOff, Math.hypot(w.x - B.x - spat.position.x, w.z - B.z - spat.position.z));
  }
  let rNow = Math.hypot(spat.position.x, spat.position.z) || 0.001;
  const tipCap = Math.max(0.008, CRIM - halfW - 0.04 - maxOff * 0.3);
  if (rNow > tipCap) {
    spat.position.x *= tipCap / rNow; spat.position.z *= tipCap / rNow; rNow = tipCap;
    spat.updateMatrixWorld(true);
  }
  spat.position.y = Math.max(spat.position.y, CTY + 0.012, foodTop + 0.01);
  spat.updateMatrixWorld(true);
  const bladePts = [V(halfW, 0, halfD), V(-halfW, 0, halfD), V(halfW, 0, -halfD), V(-halfW, 0, -halfD)]
    .map(lp => spat.localToWorld(lp.clone()));
  let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
  for (const w of bladePts) {
    bx0 = Math.min(bx0, w.x); bx1 = Math.max(bx1, w.x);
    bz0 = Math.min(bz0, w.z); bz1 = Math.max(bz1, w.z);
  }
  spat.userData.bladeAABB = { x0: bx0, x1: bx1, z0: bz0, z1: bz1 };
  spat.userData.foodTop = foodTop;
}

function pushFromSpat(P, rad, strength) {
  if (!spat.visible) return;
  const sx = spat.position.x + B.x, sz = spat.position.z + B.z;
  let dx = P.x - sx, dz = P.z - sz;
  let d = Math.hypot(dx, dz);
  const aabb = spat.userData.bladeAABB;
  const half = 0.016;
  if (aabb && P.x + half > aabb.x0 && P.x - half < aabb.x1 && P.z + half > aabb.z0 && P.z - half < aabb.z1) {
    // hard sep: push out of blade AABB
    const cx = (aabb.x0 + aabb.x1) / 2, cz = (aabb.z0 + aabb.z1) / 2;
    dx = P.x - cx; dz = P.z - cz; d = Math.hypot(dx, dz) || 0.001;
    const out = Math.max(0.04, Math.hypot(aabb.x1 - aabb.x0, aabb.z1 - aabb.z0) * 0.55);
    P.x = cx + dx / d * out; P.z = cz + dz / d * out;
    d = out;
  }
  if (d < rad && d > 0.001) {
    const push = (rad - d) / rad * strength;
    P.x += (dx / d) * push; P.z += (dz / d) * push;
  }
  // keep inside comal
  const lr = Math.hypot(P.x - B.x, P.z - B.z);
  if (lr > CRIM - 0.04) {
    P.x = B.x + (P.x - B.x) / lr * (CRIM - 0.04);
    P.z = B.z + (P.z - B.z) / lr * (CRIM - 0.04);
  }
}

function knifeStroke(t, hits, base, travel = 0.1) {
  knife.visible = false;
  if (!hits || !hits.length) return -1;
  const t0 = hits[0] - 0.35, t1 = hits[hits.length - 1] + 0.4;
  if (t < t0 || t > t1) return -1;
  knife.visible = true;
  let idx = 0, local = 0;
  for (let i = 0; i < hits.length; i++) {
    if (t >= hits[i] - 0.28) { idx = i; local = t - (hits[i] - 0.28); }
  }
  const down = clamp(local / 0.14);
  const lift = local > 0.18 ? clamp((local - 0.18) / 0.12) : 0;
  const y = BOARD_TOP + 0.09 * (1 - eo(down)) + 0.07 * eo(lift);
  const z = base.z - travel * 0.5 + travel * (idx / Math.max(1, hits.length - 1));
  knife.position.set(base.x, y, z);
  knife.rotation.set(0, 0.08, 0); // blade upright (thin X), edge down
  return idx;
}

const KEYS = [
  [0.0,  [0.08, 0.12, 0.05],  28, 28, 1.55],
  [4.0,  [0.08, 0.05, 0.0],   35, 32, 1.35],
  [14.0, [0.08, 0.05, 0.0],   40, 34, 1.25],
  [26.0, [0.08, 0.06, 0.0],   55, 36, 1.15],
  [38.0, [0.08, 0.05, 0.0],   20, 50, 1.2],
  [52.0, [-0.95, 0.05, 0.0],  30, 40, 1.05],
  [64.0, [-0.95, 0.05, -0.05],25, 35, 0.95],
  [70.0, [1.05, 0.08, 0.0],   35, 38, 1.2],
  [82.0, [1.05, 0.1, 0.0],    45, 32, 1.05],
  [94.0, [1.05, 0.08, 0.0],    8, 34, 0.95],
  [99.2, [1.05, 0.072, 0.0],   4, 32, 0.82],
  [102.0,[1.05, 0.072, 0.0],   4, 32, 0.82],
  [110.0,[1.05, 0.072, 0.0],   4, 32, 0.82],
];
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], p = eio(seg(t, a[0], b[0]));
  const tgt = V(lerp(a[1][0], b[1][0], p), lerp(a[1][1], b[1][1], p), lerp(a[1][2], b[1][2], p));
  const yaw = lerp(a[2], b[2], p) * Math.PI / 180;
  const pitch = lerp(a[3], b[3], p) * Math.PI / 180;
  const dist = lerp(a[4], b[4], p);
  const eye = V(
    tgt.x + dist * Math.cos(pitch) * Math.sin(yaw),
    tgt.y + dist * Math.sin(pitch),
    tgt.z + dist * Math.cos(pitch) * Math.cos(yaw)
  );
  // tiny handheld
  eye.x += 0.004 * Math.sin(t * 1.3); eye.y += 0.003 * Math.cos(t * 1.1);
  cam.position.copy(eye); cam.lookAt(tgt);
  cam.setViewOffset(W, H, 0, 90, W, H);
}

function update(t) {
  // flames
  const heatOn = t >= E.ignite && t < E.card;
  flames.forEach((f, i) => {
    f.visible = heatOn;
    if (!heatOn) return;
    const flick = 0.85 + 0.15 * Math.sin(t * 14 + i * 1.7);
    f.scale.setScalar(flick);
    f.material.opacity = 0.55 + 0.25 * Math.sin(t * 11 + i);
  });

  // oil pour → pool
  oilPool.visible = false;
  {
    const land = V(B.x, CTY + 0.002, B.z);
    const tipW = V(B.x - 0.05, 0.42, B.z + 0.08);
    pourBottle(oilBottle, oilStream, oilPlug, E.oil, tipW, land, t, 'oil');
    const poured = clamp((t - E.oil.pour[0]) / (E.oil.pour[1] - E.oil.pour[0]));
    if (t >= E.oil.pour[0]) {
      oilPool.visible = true;
      oilPool.scale.setScalar(0.3 + 0.7 * Math.min(1, poured));
      oilPool.material.opacity = 0.35 + 0.25 * Math.min(1, poured);
    }
    if (t > E.stir1[1] + 2) oilPool.visible = t < E.tortilla_on;
  }

  // beef drop + stir
  spat.visible = false;
  const stirring = t >= E.stir1[0] - 0.2 && t <= E.stir1[1] + 0.15;
  if (stirring) placeSpat(t, E.stir1[0], E.stir1[1]);
  beefCubes.forEach((b, i) => {
    const dropT = E.beef_drop.start + i * E.beef_drop.gap;
    b.m.visible = false;
    if (t < dropT) return;
    // leave comal clear for tortillas; plated copies appear later
    if (t >= E.tortilla_on - 0.15) { b.m.visible = false; return; }
    b.m.visible = true;
    const fall = clamp((t - dropT) / E.beef_drop.fall);
    const cook = clamp((t - E.stir1[0]) / 6.2);
    cookBeefGroup(b.m, cook);
    let px = B.x + Math.cos(b.a + b.phase * 0.2) * b.r;
    let pz = B.z + Math.sin(b.a + b.phase * 0.2) * b.r;
    let py = CTY + b.sy / 2;
    if (fall < 1) py = 0.45 * (1 - eo(fall)) + (CTY + b.sy / 2) * eo(fall);
    if (stirring && fall >= 1) {
      const ph = spat.userData.ph || 0;
      px += 0.012 * Math.sin(ph + b.phase);
      pz += 0.01 * Math.cos(ph + b.phase * 1.3);
      const P = { x: px, z: pz };
      pushFromSpat(P, 0.085, 0.045);
      px = P.x; pz = P.z;
      py = CTY + b.sy / 2;
      if (spat.visible) py = Math.min(py, spat.position.y - b.sy / 2 - 0.006);
    }
    const maxR = CRIM - 0.055 - b.sx * 0.28;
    const lr = Math.hypot(px - B.x, pz - B.z) || 0.001;
    if (lr > maxR) { px = B.x + (px - B.x) / lr * maxR; pz = B.z + (pz - B.z) / lr * maxR; }
    b.m.position.set(px, py, pz);
    b.m.rotation.set(0.04 * Math.sin(b.phase), b.yaw0 + 0.12 * Math.sin((spat.userData.ph || 0) * 0.4 + b.phase), 0.03);
  });
  // width-based strip separation so meat does not fuse into a slab
  {
    const vis = beefCubes.filter(b => b.m.visible);
    for (let i = 0; i < vis.length; i++) {
      for (let j = i + 1; j < vis.length; j++) {
        const pA = vis[i].m.position, pB = vis[j].m.position;
        let dx = pB.x - pA.x, dz = pB.z - pA.z;
        let d = Math.hypot(dx, dz) || 0.001;
        const minD = vis[i].sz * 0.55 + vis[j].sz * 0.55 + 0.004;
        if (d < minD) {
          const push = (minD - d) * 0.5;
          dx /= d; dz /= d;
          pA.x -= dx * push; pA.z -= dz * push;
          pB.x += dx * push; pB.z += dz * push;
          if (Math.abs(pA.y - pB.y) < 0.006) pB.y = Math.max(pB.y, pA.y + vis[i].sy * 0.55);
        }
      }
    }
    vis.forEach(b => {
      const maxR = CRIM - 0.05;
      const lr = Math.hypot(b.m.position.x - B.x, b.m.position.z - B.z) || 0.001;
      if (lr > maxR) {
        b.m.position.x = B.x + (b.m.position.x - B.x) / lr * maxR;
        b.m.position.z = B.z + (b.m.position.z - B.z) / lr * maxR;
      }
    });
  }

  // tortillas on comal
  tortillas.forEach((g, i) => {
    g.visible = false;
    const on = E.tortilla_on + i * 3.2;
    if (t < on || t > E.plating[0] - 0.5) return;
    // hide after plating starts for that index
    if (t >= E.tortilla_plate + i * 0.8) return;
    g.visible = true;
    let flip = 0;
    for (const ft of E.tortilla_flip) {
      if (t >= ft + i * 0.15 && t < ft + i * 0.15 + 0.45) flip = seg(t, ft + i * 0.15, ft + i * 0.15 + 0.45);
    }
    const y = CTY + 0.01 + Math.sin(flip * Math.PI) * 0.12;
    const rx = flip * Math.PI;
    g.position.set(B.x + (i - 1) * 0.02, y, B.z);
    g.rotation.set(rx, 0.1 * i, 0);
    // spatula assist during flip — tip above food
    if (flip > 0.05 && flip < 0.95 && i === 0) {
      spat.visible = true;
      spat.position.set(0.02, CTY + 0.025 + Math.sin(flip * Math.PI) * 0.08, -0.02);
      spat.rotation.set(-0.3, 0.2, 0.1);
    }
  });

  // chopping
  onionWhole.visible = t < E.onion_chops[0];
  cilantroBunch.visible = t < E.cilantro_chops[0];
  limeWhole.visible = t < E.lime_chops[0];

  let chopIdx = -1;
  if (t >= E.onion_chops[0] - 0.3 && t <= E.onion_chops[E.onion_chops.length - 1] + 0.5)
    chopIdx = knifeStroke(t, E.onion_chops, V(A.x - 0.08, 0, A.z), 0.12);
  else if (t >= E.cilantro_chops[0] - 0.3 && t <= E.cilantro_chops[E.cilantro_chops.length - 1] + 0.5)
    chopIdx = knifeStroke(t, E.cilantro_chops, V(A.x + 0.12, 0, A.z + 0.05), 0.08);
  else if (t >= E.lime_chops[0] - 0.3 && t <= E.lime_chops[E.lime_chops.length - 1] + 0.6)
    chopIdx = knifeStroke(t, E.lime_chops, V(A.x + 0.02, 0, A.z - 0.1), 0.06);
  else knife.visible = false;

  onionDice.forEach((d, i) => {
    const show = t >= E.onion_chops[Math.min(i, E.onion_chops.length - 1)];
    d.m.visible = show && t < E.onion_plate + 0.8;
    if (!d.m.visible) return;
    d.m.position.set(A.x - 0.08 + Math.cos(d.ang) * d.rad * 0.5, BOARD_TOP + 0.01, A.z + Math.sin(d.ang) * d.rad * 0.4);
    d.m.rotation.y = d.ry;
  });
  cilantroBits.forEach((d, i) => {
    const show = t >= E.cilantro_chops[Math.min(i, E.cilantro_chops.length - 1)];
    d.m.visible = show && t < E.cilantro_plate + 0.8;
    if (!d.m.visible) return;
    d.m.position.set(A.x + 0.12 + Math.cos(d.ang) * d.rad * 0.4, BOARD_TOP + 0.006, A.z + 0.05 + Math.sin(d.ang) * d.rad * 0.35);
  });
  // lime halves split after cuts
  limeHalves.forEach((g, i) => {
    const cut = E.lime_chops[Math.min(i, E.lime_chops.length - 1)];
    g.visible = t >= cut && t < E.lime_squeeze[0] - 0.2;
    if (!g.visible) return;
    const side = i === 0 ? -1 : 1;
    const sep = eo(seg(t, cut, cut + 0.35));
    g.position.set(A.x + 0.02 + side * 0.05 * sep, BOARD_TOP + 0.04, A.z - 0.1);
    g.rotation.set(0, side * 0.4 * sep, side * 0.15 * sep);
  });

  // plating — single shallow-U taco stays in-frame through STEP6 hold
  plated.forEach((p) => {
    p.g.visible = t >= E.tortilla_plate;
    if (!p.g.visible) return;
    const hero = clamp((t - 94.0) / 0.8);
    p.g.scale.setScalar(lerp(1.05, 1.22, hero));
    p.g.position.set(C.x, 0.026, C.z);
    p.g.rotation.set(lerp(-0.08, -0.28, hero), lerp(0.12, 0.08, hero), 0);
    p.meats.forEach(m => { m.visible = t >= E.beef_plate; });
    p.onions.forEach(m => { m.visible = t >= E.onion_plate; });
    p.cils.forEach(m => { m.visible = t >= E.cilantro_plate; });
    p.salsa.visible = t >= E.salsa.pour[0];
  });

  // salsa pour onto plate tacos
  salsaPool.visible = false;
  {
    const land = V(C.x, 0.08, C.z);
    const tipW = V(C.x - 0.08, 0.4, C.z + 0.1);
    pourBottle(salsaBottle, salsaStream, salsaPlug, E.salsa, tipW, land, t, 'salsa');
  }

  // lime squeeze over plated
  if (t >= E.lime_squeeze[0] && t <= E.lime_squeeze[1] + 0.3) {
    squeezeLime.visible = true;
    const p = seg(t, E.lime_squeeze[0], E.lime_squeeze[1]);
    squeezeLime.position.set(C.x + 0.05, 0.22 - 0.06 * Math.sin(p * Math.PI), C.z + 0.05);
    squeezeLime.rotation.set(1.1 + 0.3 * Math.sin(p * TAU * 2), 0.4, 0.5);
  }

  // steam when cooking
  steam.forEach((s, i) => {
    const on = t >= E.oil.pour[0] && t < E.plating[0];
    s.visible = on;
    if (!on) return;
    const u = ((t * 0.35 + i * 0.17) % 1);
    s.position.set(B.x + Math.sin(i + t) * 0.08, 0.15 + u * 0.35, B.z + Math.cos(i * 1.3) * 0.08);
    s.scale.setScalar(0.6 + u * 1.2);
    s.material.opacity = 0.25 * (1 - u);
  });

  window.__dbg = DBG;
}

function safeHud(t) {
  const T = K.theme, S = TL.steps, n = S.length, tEnd = S[n - 1].end;
  const TOP = 190;
  const hudA = win(t, 3.4, E.card, 0.6, 0.6); if (hudA <= 0) return;
  const x = 80, w = W - 160; // SAFE x 80–1000
  ctx.save(); ctx.globalAlpha = hudA;
  K.panel(ctx, x, TOP, w, 176, 22, T.paper, T.ink);
  // misregister accent bar
  ctx.fillStyle = ADOBE; ctx.fillRect(x + 4, TOP + 4, w - 8, 6);
  ctx.textAlign = 'left'; ctx.fillStyle = T.a1;
  ctx.font = `700 30px ${T.fontEn}`;
  ctx.fillText(T.brand, x + 28, TOP + 52);
  const bw = ctx.measureText(T.brand).width;
  ctx.fillStyle = T.ink;
  K.fitText(ctx, `${T.brandZh} · ${TL.dish.zh}`, x + 36 + bw, TOP + 52, 24, 340, T.fontZh, '700');
  const cur = K.currentStep(t);
  ctx.textAlign = 'right'; ctx.fillStyle = T.ink;
  ctx.font = `700 30px ${T.fontEn}`;
  ctx.fillText(cur ? `STEP ${cur.n}/${n}` : (t >= tEnd ? 'DONE!' : ''), x + w - 28, TOP + 52);
  const x0 = x + 28, x1 = x + w - 28, y = TOP + 78, gap = 10, sw = (x1 - x0 - gap * (n - 1)) / n;
  const cols = [T.a1, T.a2, T.a3, T.a4];
  for (let i = 0; i < n; i++) {
    const s = S[i], p = seg(t, s.start, s.end), sx = x0 + i * (sw + gap);
    ctx.fillStyle = 'rgba(30,42,50,.12)'; K.rr(ctx, sx, y, sw, 20, 8); ctx.fill();
    if (p > 0) { ctx.fillStyle = cols[i % 4]; K.rr(ctx, sx, y, Math.max(18, sw * p), 20, 8); ctx.fill(); }
    ctx.strokeStyle = T.ink; ctx.lineWidth = 2; K.rr(ctx, sx, y, sw, 20, 8); ctx.stroke();
  }
  const tot = clamp((t - S[0].start) / (tEnd - S[0].start));
  ctx.textAlign = 'left'; ctx.fillStyle = T.muted; ctx.font = `600 22px ${T.fontUi}`;
  ctx.fillText(`进度 PROGRESS  ${Math.round(tot * 100)}%`, x + 28, TOP + 152);
  if (cur) {
    ctx.textAlign = 'right';
    K.fitText(ctx, `${cur.zh} · ${cur.en}`, x + w - 28, TOP + 152, 22, 500, T.fontUi, '600');
    const a = win(t, cur.start, cur.end, 0.45, 0.35), e = back(seg(t, cur.start, cur.start + 0.55));
    ctx.save(); ctx.globalAlpha = hudA * a; ctx.translate(W / 2, TOP + 268); ctx.scale(0.65 + 0.35 * e, 0.65 + 0.35 * e);
    K.title(ctx, `${cur.n}. ${cur.zh}`, 0, 0, 80, T.ink, T.fontZh, { maxW: 900 });
    K.title(ctx, cur.en.toUpperCase(), 0, 58, 42, T.a1, T.fontEn, { maxW: 900, weight: '700' });
    ctx.restore();
  }
  ctx.restore();
  for (const c of TL.callouts) {
    if (t < c.t0 - 0.05 || t > c.t1 + 0.05) continue;
    const p = seg(t, c.t0, c.t0 + 0.45), q = seg(t, c.t1 - 0.35, c.t1);
    const a = Math.min(eo(p), 1 - q); if (a <= 0) continue;
    const cx = 80, cy = TOP + 378, cw = W - 160, ch = 118;
    const col = c.kind === 'ing' ? (c.color || T.a2) : T.a4;
    ctx.save(); ctx.globalAlpha = a;
    const sc = 0.72 + 0.28 * back(p);
    ctx.translate(W / 2, cy + ch / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -(cy + ch / 2));
    K.panel(ctx, cx, cy, cw, ch, 20, T.paper, T.ink);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + 58, cy + ch / 2, 32, 0, TAU); ctx.fill();
    ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = T.ink; ctx.font = `700 36px ${T.fontEn}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.kind === 'ing' ? '+' : '▶', cx + 58, cy + ch / 2 + 2);
    ctx.textBaseline = 'alphabetic'; let amtW = 0;
    if (c.amt) {
      ctx.font = `700 30px ${T.fontUi}`; amtW = Math.min(340, ctx.measureText(c.amt).width + 40);
      const ax = cx + cw - 18 - amtW;
      ctx.fillStyle = col; K.rr(ctx, ax, cy + 28, amtW, 60, 24); ctx.fill();
      ctx.strokeStyle = T.ink; ctx.lineWidth = 3; K.rr(ctx, ax, cy + 28, amtW, 60, 24); ctx.stroke();
      ctx.fillStyle = T.ink; ctx.textAlign = 'center';
      K.fitText(ctx, c.amt, ax + amtW / 2, cy + 68, 30, amtW - 20, T.fontUi, '700');
    }
    const tx = cx + 108, maxW = cw - 130 - amtW - (c.amt ? 18 : 0);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, c.zh, tx, cy + 50, 40, maxW, T.fontZh, '900');
    ctx.fillStyle = T.muted;
    K.fitText(ctx, c.en, tx, cy + 92, 32, maxW, T.fontUi, '600');
    ctx.restore();
  }
}

function safeRecipeCard(t, t0) {
  const T = K.theme, a = eo(seg(t, t0, t0 + 0.8)); if (a <= 0) return;
  const R = TL.recipe;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(30,42,50,.5)'; ctx.fillRect(0, 0, W, H);
  const x = 80, w = W - 160, y = 160, h = 1380; // bottom ≤ 1600
  K.panel(ctx, x, y, w, h, 24, T.paper, T.ink);
  ctx.fillStyle = ADOBE; ctx.fillRect(x + 6, y + 6, w - 12, 8);
  ctx.textAlign = 'center';
  ctx.fillStyle = T.a1; ctx.font = `700 26px ${T.fontEn}`;
  ctx.fillText('FULL RECIPE · 完整配方', W / 2, y + 52);
  K.title(ctx, TL.dish.zh, W / 2, y + 120, 68, T.a1, T.fontZh, { maxW: w - 80 });
  ctx.fillStyle = T.ink;
  K.fitText(ctx, TL.dish.en.toUpperCase(), W / 2, y + 172, 34, w - 80, T.fontEn, '700');
  ctx.fillStyle = T.muted;
  K.fitText(ctx, `${TL.dish.time} · ${TL.dish.servings} 人份 · ${TL.dish.cuisine}`, W / 2, y + 210, 22, w - 80, T.fontUi, '600');
  let yy = y + 250; ctx.textAlign = 'left';
  ctx.fillStyle = T.a3; ctx.font = `900 26px ${T.fontZh}`; ctx.fillText('食材  INGREDIENTS', x + 36, yy); yy += 10;
  R.ingredients.forEach((r, i) => {
    const ry = yy + 14 + i * 48;
    const ri = eo(seg(t, t0 + 0.35 + i * 0.04, t0 + 0.65 + i * 0.04));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = i % 2 ? 'rgba(196,92,58,.12)' : 'rgba(232,184,74,.16)';
    K.rr(ctx, x + 28, ry - 4, w - 56, 42, 10); ctx.fill();
    ctx.fillStyle = T.ink; ctx.font = `900 24px ${T.fontZh}`; ctx.fillText(r[0], x + 44, ry + 26);
    ctx.fillStyle = T.muted; K.fitText(ctx, r[1], x + 200, ry + 26, 20, 300, T.fontUi, '600');
    ctx.textAlign = 'right'; ctx.fillStyle = T.a1; K.fitText(ctx, r[2], x + w - 44, ry + 26, 22, 220, T.fontUi, '700');
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = a; yy += 14 + R.ingredients.length * 48 + 20;
  ctx.fillStyle = T.a3; ctx.font = `900 26px ${T.fontZh}`; ctx.fillText('步骤  STEPS', x + 36, yy); yy += 8;
  R.steps.forEach((s, i) => {
    const ry = yy + 12 + i * 78;
    const ri = eo(seg(t, t0 + 0.8 + i * 0.07, t0 + 1.1 + i * 0.07));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = [T.a1, T.a2, T.a3, T.a4][i % 4];
    ctx.beginPath(); ctx.arc(x + 58, ry + 28, 20, 0, TAU); ctx.fill();
    ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = T.paper; ctx.font = `700 20px ${T.fontEn}`; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + 58, ry + 35);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, s[0], x + 92, ry + 22, 22, w - 150, T.fontZh, '700');
    ctx.fillStyle = T.muted; K.fitText(ctx, s[1], x + 92, ry + 52, 18, w - 150, T.fontUi, '500');
  });
  ctx.restore();
}

function overlay(t) {
  const T = K.theme;
  const ia = 1 - seg(t, 3.2, 3.9);
  if (ia > 0) {
    ctx.save(); ctx.globalAlpha = ia;
    K.panel(ctx, 90, 320, W - 180, 300, 22, T.paper, T.ink);
    ctx.fillStyle = ADOBE; ctx.fillRect(100, 330, W - 200, 10);
    K.title(ctx, TL.dish.zh, W / 2, 460, 78, T.a1, T.fontZh, { maxW: 860 });
    K.title(ctx, TL.dish.en.toUpperCase(), W / 2, 540, 40, T.ink, T.fontEn, { maxW: 860, weight: '700' });
    ctx.fillStyle = T.muted; ctx.textAlign = 'center';
    ctx.font = `600 26px ${T.fontUi}`;
    ctx.fillText(`${TL.dish.time} · ${TL.dish.servings} servings · ${TL.dish.cuisine}`, W / 2, 590);
    ctx.restore();
  }
  safeHud(t);
  if (t >= E.card) safeRecipeCard(t, E.card);
}

function render(t) {
  update(t);
  camAt(t);
  key.position.set(-0.55 + 0.05 * Math.sin(t * 0.2), 2.4, 1.35);
  R3.render(scene, cam);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(R3.domElement, 0, 0);
  overlay(t);
}
window.render = render;
(async () => { await K.loadFonts(); render(0); window.ready = true; })();
