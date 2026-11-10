// EP20 Butter Chicken v2 — stained-glass-3d. Jewel panes + lead cames.
// Blockers fixed: butter blocks melt; irregular chicken + cook-through + thermometer;
// continuous sauce; readable rice grains. Tip-lock pours (tomato/cream/sauce). Pure fn of t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const K = kit, E = TL.ev, W = 1080, H = 1920, TAU = Math.PI * 2;
const { clamp, lerp, seg, eio, eo, ei, ss, back, win } = K;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const COBALT = '#1B3A6B', RUBY = '#9B1B2E', CREAM = '#F3EBD8', GOLD = '#D4A017';
const GREEN = '#2F6B4F', MURREY = '#6B2D5C', STONE = '#C4B8A4', LEAD = '#1A1A1A';
const SAUCE = '#C45A28', INK = '#1A1A1A', FLESH = '#F0C8B4', RAW_CHICK = '#F2B0A0';
const COOK_CHICK = '#B85A32', BUTTER_SOLID = '#F0D878', BUTTER_MELT = '#E8C040';

K.setTheme({
  style: 'flat', ink: INK, paper: CREAM, a1: RUBY, a2: GOLD, a3: GREEN, a4: COBALT,
  brand: 'JEWEL HALL', brandZh: '彩窗厨坊',
  fontEn: '"Cinzel", "Libre Baskerville", "EB Garamond", serif',
  fontUi: '"Libre Baskerville", "Noto Sans CJK SC", serif',
  fontZh: '"Noto Serif CJK SC", "Noto Sans CJK SC", serif',
  muted: 'rgba(26,26,26,.58)', outline: 3, shadow: 0
});
K.HUD_TOP = 190;
const STIR_HZ = 0.9;
const A = V(-0.95, 0, 0), B = V(0.08, 0, 0), C = V(1.08, 0, 0);
const PAN_Y = 0.028;

const R3 = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.BasicShadowMap;
R3.localClippingEnabled = true;
R3.toneMapping = THREE.NoToneMapping;
R3.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0E1A30');
const cam = new THREE.PerspectiveCamera(46, W / H, .01, 20);
const out = document.getElementById('c'), ctx = out.getContext('2d');

function glass(color, o = {}) {
  const c = new THREE.Color(color);
  const trans = !o.opaque;
  return new THREE.MeshPhongMaterial({
    color: c,
    specular: new THREE.Color(o.spec || '#fff4dc'),
    shininess: o.shininess ?? (o.opaque ? 18 : 78),
    transparent: trans,
    opacity: o.opacity ?? (trans ? 0.82 : 1),
    emissive: c.clone().multiplyScalar(o.glow ?? (trans ? 0.28 : 0.07)),
    depthWrite: o.depthWrite ?? true,
    side: o.side || THREE.FrontSide
  });
}
function foodMat(color, o = {}) {
  // lower metal/toy specular for food solids while keeping jewel hall lighting
  return glass(color, {
    opaque: true,
    glow: o.glow ?? 0.04,
    shininess: o.shininess ?? 12,
    spec: o.spec || '#e8dcc0',
    ...o
  });
}
function leadMat() {
  return new THREE.MeshStandardMaterial({ color: LEAD, roughness: 0.55, metalness: 0.42 });
}
function stone(col = STONE) {
  return new THREE.MeshLambertMaterial({ color: col, flatShading: true });
}
function mesh(geo, mat, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m;
}
const lathe = (pts, n = 36) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);

function glassTex(hex, seed, grisaille = false) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = hex; g.fillRect(0, 0, 128, 128);
  const rng = K.rng(seed);
  g.strokeStyle = 'rgba(255,248,220,.14)'; g.lineWidth = 1.4;
  const ang = (rng() - 0.5) * 0.8;
  for (let i = 0; i < 10; i++) {
    const x = rng() * 128;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + ang * 80 + (rng() - 0.5) * 16, 128); g.stroke();
  }
  for (let i = 0; i < 16; i++) {
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.arc(rng() * 128, rng() * 128, 1 + rng() * 2.4, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(10,10,12,.28)'; g.lineWidth = 12; g.strokeRect(0, 0, 128, 128);
  if (grisaille) {
    g.strokeStyle = 'rgba(62,32,18,.45)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(18, 30); g.quadraticCurveTo(64, 20, 110, 40); g.stroke();
    g.beginPath(); g.moveTo(24, 90); g.quadraticCurveTo(70, 70, 108, 100); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function labelTex(lines, bg, fg, w = 512, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = LEAD; g.lineWidth = 14; g.strokeRect(8, 8, w - 16, h - 16);
  g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([s, sz, y, f]) => { g.font = `700 ${sz}px ${f || K.theme.fontZh}`; g.fillText(s, w / 2, y); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const texRuby = glassTex(RUBY, 11, true);
const texCobalt = glassTex(COBALT, 22, true);
const texGold = glassTex(GOLD, 33, false);
const texCream = glassTex(CREAM, 44, false);
const texGreen = glassTex(GREEN, 55, true);
const texMurrey = glassTex(MURREY, 66, false);

scene.add(new THREE.AmbientLight('#24365C', 0.38));
scene.add(new THREE.HemisphereLight('#5A7AB0', '#3A2A20', 0.32));
const key = new THREE.DirectionalLight('#FFF4D2', 1.05); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: .1, far: 6 });
key.shadow.bias = -.001; key.shadow.normalBias = .02;
key.position.set(-0.4, 2.5, 1.2); key.target.position.set(0.1, 0, 0); scene.add(key, key.target);
const sunFill = new THREE.DirectionalLight('#FFE6A0', 0.55); sunFill.position.set(0.2, 1.8, -1.6); scene.add(sunFill);
const rubySpill = new THREE.PointLight(RUBY, 0.45, 3.2); rubySpill.position.set(-0.6, 0.9, -0.2); scene.add(rubySpill);
const goldSpill = new THREE.PointLight(GOLD, 0.35, 2.8); goldSpill.position.set(0.8, 0.7, 0.4); scene.add(goldSpill);

const R = K.rng(20261110);
const inDisk = (f, rMin = 0) => { const r = rMin + Math.sqrt(R()) * Math.max(0, f - rMin), a = R() * TAU; return { r, a }; };

// ---- stained-glass window wall ----
const panes = [];
{
  const cols = 7, rows = 5, pw = 0.20, ph = 0.24, gap = 0.038;
  const colors = [COBALT, RUBY, CREAM, GOLD, GREEN, MURREY, COBALT];
  const texs = [texCobalt, texRuby, texCream, texGold, texGreen, texMurrey, texCobalt];
  const x0 = -((cols - 1) * (pw + gap)) / 2;
  const y0 = 0.16;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const ci = (i + j * 3) % colors.length;
      const mat = glass(colors[ci], { opacity: 0.9, glow: 0.55, depthWrite: false, side: THREE.DoubleSide });
      mat.map = texs[ci];
      const pane = mesh(new THREE.BoxGeometry(pw, ph, 0.014), mat, false, false);
      pane.position.set(x0 + i * (pw + gap) + (j % 2) * 0.03, y0 + j * (ph + gap), -0.74);
      pane.rotation.z = (R() - 0.5) * 0.035;
      pane.userData.baseEmi = mat.emissive.clone();
      scene.add(pane); panes.push(pane);
      const frame = mesh(new THREE.BoxGeometry(pw + 0.03, ph + 0.03, 0.008), leadMat(), false, false);
      frame.position.set(pane.position.x, pane.position.y, pane.position.z - 0.016);
      scene.add(frame);
    }
  }
  const mx = 0.0, my = 1.72, mz = -0.725;
  for (let i = 0; i < 8; i++) {
    const cols2 = [GOLD, RUBY, COBALT, CREAM][i % 4];
    const wdg = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 6, 1, false, i * TAU / 8, TAU / 8 - 0.04),
      glass(cols2, { opacity: 0.8, glow: 0.34, depthWrite: false }), false, false);
    wdg.rotation.x = Math.PI / 2; wdg.position.set(mx, my, mz);
    scene.add(wdg); panes.push(wdg);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 16), glass(GOLD, { opaque: true, glow: 0.4 }), false, false);
  hub.rotation.x = Math.PI / 2; hub.position.set(mx, my, mz + 0.004); scene.add(hub);
  const came = mesh(new THREE.TorusGeometry(0.175, 0.01, 6, 32), leadMat(), false, false);
  came.position.set(mx, my, mz + 0.002); scene.add(came);
  for (let k = 0; k < 3; k++) {
    const bar = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.85, 8), leadMat(), false, false);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.55 + k * 0.42, -0.71); scene.add(bar);
  }
}
{
  const left = mesh(new RoundedBoxGeometry(0.18, 2.4, 0.28, 1, 0.02), stone('#B7AA96'), false, true);
  left.position.set(-1.62, 0.85, -0.58); scene.add(left);
  const right = mesh(new RoundedBoxGeometry(0.18, 2.4, 0.28, 1, 0.02), stone('#B0A390'), false, true);
  right.position.set(1.62, 0.85, -0.58); scene.add(right);
  const lintel = mesh(new RoundedBoxGeometry(3.4, 0.16, 0.26, 1, 0.02), stone('#C4B8A4'), false, true);
  lintel.position.set(0, 2.05, -0.58); scene.add(lintel);
}
{
  const floor = mesh(new THREE.BoxGeometry(5.4, 0.04, 2.4), stone('#8A8070'));
  floor.position.set(0, -0.88, 0.15); scene.add(floor);
  for (let i = 0; i < 10; i++) {
    const sx = 0.42 + R() * 0.28, sz = 0.32 + R() * 0.22;
    const f = mesh(new THREE.BoxGeometry(sx, 0.016, sz), stone(i % 2 ? '#B6A992' : '#A89880'), false, true);
    f.position.set(-1.8 + (i % 5) * 0.9 + (R() - 0.5) * 0.08, -0.856, -0.15 + Math.floor(i / 5) * 0.7);
    scene.add(f);
  }
  const patchCols = [RUBY, COBALT, GOLD, GREEN, CREAM];
  for (let i = 0; i < 5; i++) {
    const p = mesh(new THREE.CircleGeometry(0.22 + R() * 0.08, 10),
      new THREE.MeshBasicMaterial({ color: patchCols[i], transparent: true, opacity: 0.16, depthWrite: false }), false, false);
    p.rotation.x = -Math.PI / 2;
    p.position.set(-0.9 + i * 0.48, -0.846, 0.15 + (i % 2) * 0.12);
    scene.add(p);
  }
}
const sunBand = mesh(new THREE.BoxGeometry(0.55, 2.4, 0.02),
  new THREE.MeshBasicMaterial({ color: '#FFF3C4', transparent: true, opacity: 0.42, depthWrite: false }), false, false);
sunBand.position.set(-0.4, 1.1, -0.78); scene.add(sunBand);
const shafts = [];
for (let i = 0; i < 4; i++) {
  const s = mesh(new THREE.BoxGeometry(0.08, 1.5, 0.7),
    new THREE.MeshBasicMaterial({ color: i % 2 ? '#F6D48A' : '#C45A6A', transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide }), false, false);
  s.position.set(-0.7 + i * 0.48, 0.55, -0.15);
  s.rotation.x = 0.35; scene.add(s); shafts.push(s);
}
{
  const counter = mesh(new RoundedBoxGeometry(5.0, 0.82, 1.52, 2, 0.02), stone('#B7AA94'));
  counter.position.set(0, -0.42, 0.06); scene.add(counter);
  const top = mesh(new RoundedBoxGeometry(4.9, 0.03, 1.4, 2, 0.01), stone('#D2C6B0'));
  top.position.set(0, 0.01, 0.06); scene.add(top);
  const lip = mesh(new THREE.BoxGeometry(4.92, 0.018, 0.018), leadMat(), false, false);
  lip.position.set(0, -0.01, 0.76); scene.add(lip);
  const goldLine = mesh(new THREE.BoxGeometry(4.7, 0.006, 0.006), glass(GOLD, { opaque: true, glow: 0.25 }), false, false);
  goldLine.position.set(0, -0.04, 0.762); scene.add(goldLine);
}
{
  const jar = (x, z, col, lid) => {
    const j = mesh(lathe([[0, 0], [.046, 0], [.05, .018], [.05, .13], [.038, .15], [0, .15]], 16), glass(col, { opacity: 0.8 }));
    j.position.set(x, 0, z); scene.add(j);
    const rim = mesh(new THREE.TorusGeometry(0.048, 0.006, 6, 16), leadMat(), false, false);
    rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.148, z); scene.add(rim);
    const l = mesh(new THREE.CylinderGeometry(.046, .046, .02, 14), leadMat());
    l.position.set(x, .168, z); scene.add(l);
    const knob = mesh(new THREE.SphereGeometry(0.012, 8, 6), glass(lid, { opaque: true, glow: 0.3 }));
    knob.position.set(x, .186, z); scene.add(knob);
  };
  jar(-1.72, -0.38, COBALT, GOLD); jar(-1.48, -0.42, RUBY, CREAM); jar(1.62, -0.4, GREEN, GOLD);
}

// ---- station A: board + mise-en-place ----
const BOARD_TOP = 0.028;
const board = mesh(new RoundedBoxGeometry(0.56, 0.03, 0.38, 2, 0.01), stone('#D8C8A8'));
board.position.set(A.x, 0.015, A.z); scene.add(board);
{ const rim = mesh(new THREE.BoxGeometry(0.58, 0.006, 0.4), leadMat(), false, false);
  rim.position.set(A.x, 0.002, A.z); scene.add(rim); }

const onionWhole = new THREE.Group();
{
  const bulb = mesh(new THREE.SphereGeometry(0.052, 14, 10), foodMat(MURREY, { glow: 0.06 }));
  bulb.scale.set(1.08, 0.92, 1.08);
  const root = mesh(new THREE.ConeGeometry(0.012, 0.02, 6), foodMat(GREEN), false, false);
  root.position.y = 0.055;
  onionWhole.add(bulb, root);
  onionWhole.position.set(A.x - 0.12, BOARD_TOP + 0.046, A.z + 0.04); scene.add(onionWhole);
}
const garlicBulb = new THREE.Group();
{
  for (let i = 0; i < 5; i++) {
    const cl = mesh(new THREE.SphereGeometry(0.016, 8, 6), foodMat('#F2E6D0', { glow: 0.03, shininess: 8 }));
    cl.scale.set(0.7, 1.15, 0.85);
    cl.position.set(Math.cos(i * TAU / 5) * 0.014, 0.012, Math.sin(i * TAU / 5) * 0.014);
    garlicBulb.add(cl);
  }
  garlicBulb.position.set(A.x + 0.02, BOARD_TOP, A.z - 0.08); scene.add(garlicBulb);
}
const gingerRoot = new THREE.Group();
{
  const a = mesh(new RoundedBoxGeometry(0.07, 0.028, 0.03, 1, 0.008), foodMat('#C4A050', { glow: 0.04 }));
  const b = mesh(new RoundedBoxGeometry(0.03, 0.024, 0.045, 1, 0.006), foodMat('#D4A017', { glow: 0.04 }));
  b.position.set(0.02, 0.004, 0.02); gingerRoot.add(a, b);
  gingerRoot.position.set(A.x + 0.14, BOARD_TOP + 0.016, A.z + 0.06); scene.add(gingerRoot);
}
const spiceBowls = [];
{
  const cols = [GOLD, RUBY, '#8B5A2B', GREEN];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const bowl = mesh(lathe([[0, 0], [.028, 0], [.032, .008], [.026, .02], [0, .018]], 12), foodMat(CREAM));
    const pile = mesh(new THREE.SphereGeometry(0.02, 8, 6), foodMat(cols[i], { glow: 0.08 }));
    pile.scale.set(1, 0.45, 1); pile.position.y = 0.02;
    g.add(bowl, pile); g.position.set(A.x - 0.16 + i * 0.1, BOARD_TOP, A.z - 0.12); scene.add(g);
    spiceBowls.push(g);
  }
}

// ---- station B: skillet ----
const PR = 0.29, PRIM = 0.248, PTY = 0.020, RIM_Y = 0.078;
const surfY = r => PTY + 0.014 * (r * r) / (PRIM * PRIM);
const panG = new THREE.Group(); scene.add(panG); panG.position.set(B.x, PAN_Y, B.z);
{
  const iron = foodMat('#3E3428', { glow: 0.03 });
  const innerCol = foodMat('#6A5844', { glow: 0.04 });
  const bottom = mesh(new THREE.CylinderGeometry(0.268, 0.255, 0.022, 40), iron);
  bottom.position.y = 0.011; panG.add(bottom);
  const wall = mesh(new THREE.CylinderGeometry(0.294, 0.268, 0.074, 40, 1, true), iron);
  wall.material.side = THREE.DoubleSide;
  wall.position.y = 0.048; panG.add(wall);
  const inner = mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.008, 40), innerCol);
  inner.position.y = PTY; panG.add(inner);
  const rim = mesh(new THREE.TorusGeometry(0.286, 0.011, 8, 40), leadMat());
  rim.rotation.x = Math.PI / 2; rim.position.y = RIM_Y; panG.add(rim);
  const fillet = mesh(new THREE.TorusGeometry(0.282, 0.0045, 6, 40), glass(GOLD, { opaque: true, glow: 0.22 }), false, false);
  fillet.rotation.x = Math.PI / 2; fillet.position.y = RIM_Y - 0.012; panG.add(fillet);
}
const stove = mesh(new RoundedBoxGeometry(0.56, 0.08, 0.56, 2, 0.012), leadMat());
stove.position.set(B.x, PAN_Y - 0.052, B.z); scene.add(stove);
const flames = [];
{
  const fm = new THREE.MeshBasicMaterial({ color: RUBY, transparent: true, opacity: 0.75, depthWrite: false });
  const fi = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.7, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    const o = mesh(new THREE.ConeGeometry(0.016, 0.046, 5), fm, false, false);
    o.position.set(B.x + Math.cos(a) * 0.13, PAN_Y - 0.032, B.z + Math.sin(a) * 0.13);
    const inn = mesh(new THREE.ConeGeometry(0.009, 0.028, 5), fi, false, false);
    inn.position.copy(o.position); inn.position.y += 0.005;
    scene.add(o, inn); flames.push(o, inn);
  }
}

// solid butter blocks (NOT poured liquid) → melt into continuous pool
const butterBlocks = [];
{
  const specs = [
    { sx: 0.058, sy: 0.030, sz: 0.040, ox: -0.04, oz: 0.02, rot: 0.25 },
    { sx: 0.046, sy: 0.026, sz: 0.034, ox: 0.038, oz: -0.018, rot: -0.4 },
    { sx: 0.040, sy: 0.024, sz: 0.030, ox: 0.0, oz: 0.048, rot: 0.7 }
  ];
  specs.forEach((sp, i) => {
    const g = new THREE.Group();
    const body = mesh(new RoundedBoxGeometry(sp.sx, sp.sy, sp.sz, 2, 0.008), foodMat(BUTTER_SOLID, { glow: 0.06, shininess: 8 }));
    const ridge = mesh(new RoundedBoxGeometry(sp.sx * 0.88, 0.005, sp.sz * 0.5, 1, 0.002), foodMat('#F6E4A0', { glow: 0.04 }));
    ridge.position.y = sp.sy * 0.38;
    g.add(body, ridge);
    g.visible = false; scene.add(g);
    butterBlocks.push({ g, body, ...sp, i, phase: R() * TAU });
  });
}
const butterPool = new THREE.Group();
{
  // continuous melted butter surface — low ripples, NOT flower/petal cluster
  const base = mesh(new THREE.CircleGeometry(0.13, 32), glass(BUTTER_MELT, { opacity: 0.9, glow: 0.12, shininess: 36 }));
  base.rotation.x = -Math.PI / 2;
  butterPool.add(base);
  // subtle edge meniscus ring
  const ring = mesh(new THREE.TorusGeometry(0.105, 0.008, 6, 28), glass('#F0D060', { opacity: 0.55, glow: 0.08 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.003; ring.scale.set(1, 1, 0.35);
  butterPool.add(ring);
  // very flat ripples (height ≤ 0.004) — readable as liquid, not petals
  for (let i = 0; i < 4; i++) {
    const bump = mesh(new THREE.SphereGeometry(0.035 + R() * 0.02, 10, 6), glass(i % 2 ? BUTTER_MELT : '#EAD060', { opacity: 0.45, glow: 0.06 }));
    bump.scale.set(1.6, 0.08, 1.4);
    bump.position.set(Math.cos(i * 1.5) * 0.035, 0.003, Math.sin(i * 1.5) * 0.03);
    butterPool.add(bump);
  }
  butterPool.visible = false; scene.add(butterPool);
}

const sauceBody = new THREE.Group();
const sauceBumps = [];
{
  // continuous sauce body — flat-ish liquid surface, low ripples (not metal petals)
  const base = mesh(new THREE.CircleGeometry(0.20, 32), glass(RUBY, { opacity: 0.92, glow: 0.1, shininess: 28 }));
  base.rotation.x = -Math.PI / 2; base.name = 'sauceBase';
  sauceBody.add(base);
  for (let i = 0; i < 6; i++) {
    const col = i % 2 ? RUBY : SAUCE;
    const bump = mesh(new THREE.SphereGeometry(0.045 + R() * 0.02, 10, 6), glass(col, { opacity: 0.55, glow: 0.06 }));
    bump.scale.set(1.5, 0.12, 1.3);
    bump.position.set(Math.cos(i * 1.05) * (0.05 + (i % 2) * 0.03), 0.005, Math.sin(i * 1.05) * (0.045 + (i % 2) * 0.025));
    sauceBody.add(bump); sauceBumps.push(bump);
  }
  sauceBody.visible = false; scene.add(sauceBody);
}
const creamSwirls = [];
for (let i = 0; i < 6; i++) {
  const s = mesh(new THREE.SphereGeometry(0.024, 8, 6), glass(CREAM, { opacity: 0.65, glow: 0.08 }));
  s.scale.set(1.4, 0.28, 1.1); s.visible = false; scene.add(s);
  creamSwirls.push({ m: s, a: R() * TAU, r: 0.05 + R() * 0.08 });
}

// aromatics — garlic as ivory petals, ginger as turmeric shreds
const onionDice = [];
for (let i = 0; i < 16; i++) {
  const { r, a } = inDisk(0.15, 0.03);
  const sx = 0.022 + R() * 0.01, sy = 0.016 + R() * 0.008, sz = 0.022 + R() * 0.01;
  const m = mesh(new RoundedBoxGeometry(sx, sy, sz, 1, 0.004), foodMat(i % 3 ? MURREY : '#8A3A70', { glow: 0.04 }));
  m.visible = false; scene.add(m);
  onionDice.push({ m, r, a, sx, sy, sz, phase: R() * TAU });
}
const garlicBits = [];
for (let i = 0; i < 6; i++) {
  const { r, a } = inDisk(0.12, 0.04);
  // ivory clove wedge — flattened petal, not metal sphere
  const g = new THREE.Group();
  const petal = mesh(new THREE.SphereGeometry(0.015, 8, 6), foodMat('#F4E8D4', { glow: 0.02, shininess: 6 }));
  petal.scale.set(0.55, 1.25, 0.85);
  const tip = mesh(new THREE.ConeGeometry(0.006, 0.012, 5), foodMat('#E8DCC4', { glow: 0.02 }));
  tip.position.y = 0.014;
  g.add(petal, tip); g.visible = false; scene.add(g);
  garlicBits.push({ m: g, r, a, sy: 0.018, phase: R() * TAU });
}
const gingerBits = [];
for (let i = 0; i < 5; i++) {
  const { r, a } = inDisk(0.12, 0.05);
  // turmeric shred — thin elongated stick
  const m = mesh(new RoundedBoxGeometry(0.028 + R() * 0.01, 0.006, 0.008, 1, 0.002), foodMat('#D4A017', { glow: 0.04, shininess: 8 }));
  m.visible = false; scene.add(m);
  gingerBits.push({ m, r, a, sy: 0.008, phase: R() * TAU });
}
const spiceBits = [];
const spiceCols = [GOLD, RUBY, '#8B5A2B', GREEN];
for (let i = 0; i < 18; i++) {
  const { r, a } = inDisk(0.16, 0.02);
  const m = mesh(new THREE.SphereGeometry(0.006 + R() * 0.003, 6, 5), foodMat(spiceCols[i % 4], { glow: 0.1 }));
  m.visible = false; scene.add(m);
  spiceBits.push({ m, r, a, sy: 0.007, phase: R() * TAU });
}

// irregular chicken chunks with readable cut faces (NOT right-angle cubes / smooth pebbles)
function makeChickenChunk(i, scale = 1) {
  const g = new THREE.Group();
  const sx = (0.032 + (i % 5) * 0.008 + R() * 0.012) * scale;
  const sy = (0.020 + (i % 3) * 0.006 + R() * 0.007) * scale;
  const sz = (0.026 + ((i + 2) % 4) * 0.007 + R() * 0.01) * scale;
  // blunt irregular body: elongated rounded box + lobes (not cube, not smooth egg)
  const body = mesh(new RoundedBoxGeometry(sx * 1.7, sy * 1.5, sz * 1.6, 3, Math.min(sx, sy, sz) * 0.42),
    foodMat(RAW_CHICK, { glow: 0.03, shininess: 9 }));
  const lobe = mesh(new THREE.SphereGeometry(0.5, 9, 7), foodMat(RAW_CHICK, { glow: 0.03, shininess: 9 }));
  lobe.scale.set(sx * 1.15, sy * 1.35, sz * 1.05);
  lobe.position.set(sx * 0.42, sy * 0.12, -sz * 0.28);
  const lobe2 = mesh(new THREE.SphereGeometry(0.5, 8, 6), foodMat(RAW_CHICK, { glow: 0.025, shininess: 9 }));
  lobe2.scale.set(sx * 0.85, sy * 0.95, sz * 0.9);
  lobe2.position.set(-sx * 0.25, -sy * 0.08, sz * 0.3);
  // large readable cut face (flesh) — angled up so camera always sees it
  const cutR = Math.min(sx, sz) * 1.05;
  const cut = mesh(new THREE.CircleGeometry(cutR, 14), foodMat(FLESH, { glow: 0.025, shininess: 5 }));
  cut.position.set(-sx * 0.72, sy * 0.05, 0);
  cut.rotation.y = Math.PI / 2;
  cut.rotation.z = -0.35;
  // fiber ridges on cut face
  for (let k = 0; k < 4; k++) {
    const fiber = mesh(new THREE.BoxGeometry(0.002, sy * 0.95, 0.005), foodMat(k % 2 ? '#E0B0A0' : '#C88878', { glow: 0.01 }));
    fiber.position.set(-sx * 0.735, (k - 1.5) * sy * 0.22, (k % 2 - 0.5) * 0.008);
    fiber.rotation.y = Math.PI / 2;
    g.add(fiber);
  }
  // sear tint band on cut (flat, NOT a metal torus ring)
  const sear = mesh(new THREE.CircleGeometry(cutR * 0.98, 14), foodMat('#C07058', { glow: 0.015, shininess: 6 }));
  sear.position.copy(cut.position); sear.rotation.copy(cut.rotation);
  sear.position.x -= 0.0015;
  g.add(body, lobe, lobe2, sear, cut);
  g.userData = { body, lobe, lobe2, cut, sx, sy, sz };
  return g;
}
const chickenChunks = [];
for (let i = 0; i < 12; i++) {
  const { r, a } = inDisk(0.155, 0.035);
  const g = makeChickenChunk(i, 1);
  g.visible = false; scene.add(g);
  chickenChunks.push({
    m: g, r, a, sy: g.userData.sy, sx: g.userData.sx, sz: g.userData.sz,
    phase: R() * TAU, spin: (R() - 0.5) * 0.4, thick: i === 0 // thickest for thermometer
  });
}
// ensure index 0 is thickest (largest)
{
  const thick = chickenChunks[0];
  thick.m.scale.setScalar(1.28);
  thick.sy *= 1.28; thick.sx *= 1.28; thick.sz *= 1.28;
  thick.r = 0.06; thick.a = 0.35;
}

// spatula
const spat = new THREE.Group();
{
  const blade = mesh(new RoundedBoxGeometry(0.062, 0.005, 0.038, 1, 0.002), foodMat(CREAM));
  blade.position.set(0, 0.0025, 0); spat.add(blade);
  const tip = mesh(new RoundedBoxGeometry(0.048, 0.004, 0.012, 1, 0.002), foodMat(CREAM));
  tip.position.set(0, 0.002, -0.02); spat.add(tip);
  const edge = mesh(new THREE.BoxGeometry(0.06, 0.002, 0.004), leadMat(), false, false);
  edge.position.set(0, 0.001, -0.026); spat.add(edge);
  const hg = new THREE.Group(); hg.position.set(0, 0.006, 0.01); hg.rotation.x = -62 * Math.PI / 180;
  const hd = mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.1, 8), foodMat('#5A3A22'));
  hd.rotation.x = Math.PI / 2; hd.position.z = 0.05; hg.add(hd);
  const grip = mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.022, 8), leadMat());
  grip.rotation.x = Math.PI / 2; grip.position.z = 0.104; hg.add(grip);
  spat.add(hg); panG.add(spat); spat.visible = false;
  spat.userData.handleLen = 0.11;
  spat.userData.bladeHalfW = 0.031;
  spat.userData.bladeHalfD = 0.019;
}

// thermometer probe — tip locked to thickest chicken center
const thermo = new THREE.Group();
{
  const shaft = mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.14, 8), foodMat('#C8C4BC', { glow: 0.02, shininess: 30 }));
  shaft.position.y = 0.07;
  const tip = mesh(new THREE.ConeGeometry(0.004, 0.018, 6), foodMat('#8A9098', { glow: 0.02 }));
  tip.position.y = -0.005;
  const dial = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), foodMat(CREAM, { glow: 0.05 }));
  dial.position.y = 0.145;
  const dialRim = mesh(new THREE.TorusGeometry(0.023, 0.003, 6, 16), leadMat(), false, false);
  dialRim.rotation.x = Math.PI / 2; dialRim.position.y = 0.145;
  const needle = mesh(new THREE.BoxGeometry(0.002, 0.016, 0.001), foodMat(RUBY));
  needle.position.set(0, 0.152, 0.006);
  thermo.add(shaft, tip, dial, dialRim, needle);
  thermo.visible = false; scene.add(thermo);
  thermo.userData.needle = needle;
  thermo.userData.tipLocal = V(0, 0, 0); // tip at group origin
}

// bottles — tip-lock (tomato / cream / sauce only; butter no longer poured)
function makeBottle(lathePts, bodyCol, labBg, labFg, labLines, spoutCol) {
  const g = new THREE.Group();
  const b = mesh(lathe(lathePts, 20), glass(bodyCol, { opacity: 0.8, glow: 0.16 }));
  const topY = lathePts.reduce((m, p) => Math.max(m, p[1]), 0);
  b.position.y = -topY;
  const came = mesh(new THREE.TorusGeometry(0.034, 0.004, 6, 16), leadMat(), false, false);
  came.rotation.x = Math.PI / 2; came.position.y = -topY + 0.09;
  const lab = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 20, 1, true),
    new THREE.MeshLambertMaterial({ map: labelTex(labLines, labBg, labFg) }));
  lab.position.y = -topY + 0.055;
  const spoutLen = 0.028;
  const spout = mesh(new THREE.CylinderGeometry(0.007, 0.011, spoutLen, 8), glass(spoutCol, { opaque: true }));
  spout.position.y = spoutLen * 0.5;
  const hole = mesh(new THREE.CircleGeometry(0.0055, 10), new THREE.MeshBasicMaterial({ color: '#120808' }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = spoutLen + 0.0005;
  const tip = new THREE.Object3D(); tip.position.set(0, spoutLen, 0);
  g.add(b, came, lab, spout, hole, tip);
  g.userData = { tip, spoutLen };
  scene.add(g); g.visible = false; return g;
}
const tomatoBottle = makeBottle(
  [[0, 0], [.034, 0], [.038, .008], [.036, .11], [.026, .135], [.013, .16], [.012, .168], [.012, .198], [.014, .2], [.008, .2], [0, .18]],
  RUBY, CREAM, RUBY, [['番茄', 96, 108], ['TOMATO', 38, 198, K.theme.fontEn]], RUBY
);
const creamPitcher = makeBottle(
  [[0, 0], [.042, 0], [.046, .01], [.044, .1], [.032, .13], [.016, .155], [.014, .165], [.014, .195], [.016, .197], [.009, .197], [0, .175]],
  CREAM, COBALT, CREAM, [['奶油', 96, 108], ['CREAM', 40, 198, K.theme.fontEn]], CREAM
);
const sauceBoat = makeBottle(
  [[0, 0], [.04, 0], [.044, .01], [.04, .085], [.028, .115], [.015, .145], [.013, .155], [.013, .185], [.015, .187], [.008, .187], [0, .165]],
  SAUCE, CREAM, RUBY, [['酱汁', 96, 108], ['SAUCE', 40, 198, K.theme.fontEn]], SAUCE
);

function makeStream(color, r) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), glass(color, { opacity: 0.88, glow: 0.2 }));
  m.castShadow = true; m.userData.r = r; scene.add(m); return m;
}
const tomatoStream = makeStream(RUBY, 0.0026);
const creamStream = makeStream(CREAM, 0.0025);
const sauceStream = makeStream(SAUCE, 0.0025);
function makePlug(col) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: col, depthTest: false, depthWrite: false }));
  p.renderOrder = 8; p.visible = false; scene.add(p); return p;
}
const tomatoPlug = makePlug(RUBY), creamPlug = makePlug(CREAM), saucePlug = makePlug(SAUCE);

class SubBez extends THREE.Curve {
  constructor(p0, p1, p2, a, b) { super(); Object.assign(this, { p0, p1, p2, a, b }); }
  getPoint(u, o = new THREE.Vector3()) {
    const s = lerp(this.a, this.b, u), q = 1 - s;
    return o.set(q * q * this.p0.x + 2 * q * s * this.p1.x + s * s * this.p2.x,
      q * q * this.p0.y + 2 * q * s * this.p1.y + s * s * this.p2.y,
      q * q * this.p0.z + 2 * q * s * this.p1.z + s * s * this.p2.z);
  }
}
const DBG = { streams: {}, thermo: null, butter: null };
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
  const spoutOff = bottle.userData.spoutLen || 0.028;
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

// ---- station C: plate + rice grains + continuous sauce + chicken ----
const plate = new THREE.Group();
{
  const p = mesh(lathe([[0, 0], [0.17, 0], [0.185, 0.012], [0.188, 0.024], [0.17, 0.03], [0, 0.026]], 28), foodMat(CREAM, { glow: 0.03 }));
  const rim = mesh(new THREE.TorusGeometry(0.18, 0.007, 6, 28), leadMat());
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.024;
  const goldR = mesh(new THREE.TorusGeometry(0.172, 0.003, 6, 28), glass(GOLD, { opaque: true, glow: 0.2 }), false, false);
  goldR.rotation.x = Math.PI / 2; goldR.position.y = 0.028;
  plate.add(p, rim, goldR); plate.position.set(C.x, 0, C.z); scene.add(plate);
}
const riceG = new THREE.Group();
{
  // NO smooth hemisphere — only elongated rice grains stacked into a mound
  for (let i = 0; i < 160; i++) {
    const gcol = i % 3 === 0 ? '#F6EED8' : (i % 3 === 1 ? '#E8D4A8' : '#F3E6C4');
    // long thin grain (aspect ~4:1) — Capsule stretched further
    const glen = 0.016 + R() * 0.008;
    const grain = mesh(new THREE.CapsuleGeometry(0.0026, glen, 3, 5), foodMat(gcol, { glow: 0.01, shininess: 4 }));
    const a = R() * TAU, rr = Math.sqrt(R()) * 0.095;
    const layer = Math.floor(i / 36);
    const hy = 0.028 + layer * 0.011 + Math.max(0, 0.055 - rr * 0.55);
    grain.position.set(Math.cos(a) * rr, hy, Math.sin(a) * rr * 0.92);
    // mostly horizontal grains with slight tilt — readable as rice
    grain.rotation.set((R() - 0.5) * 0.5, R() * TAU, Math.PI / 2 + (R() - 0.5) * 0.35);
    riceG.add(grain);
  }
  riceG.visible = false; riceG.position.set(C.x, 0.03, C.z); scene.add(riceG);
}
// continuous orange-red sauce coat — single organic blob, not petal cluster
const platedSauce = new THREE.Group();
{
  const pool = mesh(new THREE.SphereGeometry(0.07, 16, 12), glass(SAUCE, { opacity: 0.92, glow: 0.08, shininess: 24 }));
  pool.scale.set(1.55, 0.42, 1.25); pool.position.y = 0.112;
  platedSauce.add(pool);
  // continuous side coat wrapping downward onto rice
  const coat = mesh(new THREE.SphereGeometry(0.055, 12, 10), glass(RUBY, { opacity: 0.78, glow: 0.06 }));
  coat.scale.set(1.4, 0.55, 1.15); coat.position.set(0.01, 0.095, -0.01);
  platedSauce.add(coat);
  const drip = mesh(new THREE.SphereGeometry(0.03, 10, 8), glass(SAUCE, { opacity: 0.85, glow: 0.06 }));
  drip.scale.set(1.1, 0.7, 0.9); drip.position.set(-0.02, 0.08, 0.025);
  platedSauce.add(drip);
  platedSauce.visible = false; platedSauce.position.set(C.x + 0.02, 0, C.z - 0.01); scene.add(platedSauce);
}
const platedChicken = [];
for (let i = 0; i < 6; i++) {
  const g = makeChickenChunk(i + 20, 0.95);
  // plated pieces start cooked + sauce-tinted
  g.userData.body.material.color.set(COOK_CHICK);
  g.userData.lobe.material.color.set(COOK_CHICK);
  g.userData.cut.material.color.set('#D8A090');
  g.visible = false; scene.add(g);
  platedChicken.push({ m: g, a: -0.5 + i * 0.95 + R() * 0.15, r: 0.04 + R() * 0.035, sy: g.userData.sy });
}
const garnish = [];
for (let i = 0; i < 7; i++) {
  // flat leaf, not metal petal ball
  const leaf = mesh(new THREE.SphereGeometry(0.014, 6, 5), foodMat(GREEN, { glow: 0.05, shininess: 8 }));
  leaf.scale.set(1.8, 0.18, 0.9); leaf.visible = false; scene.add(leaf);
  garnish.push({ m: leaf, a: R() * TAU, r: 0.04 + R() * 0.03 });
}

const steam = [];
{
  const sm = new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0.3, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.SphereGeometry(0.028, 6, 5), sm, false, false);
    s.visible = false; scene.add(s); steam.push(s);
  }
}

function foodTopY(t) {
  let y = PTY + 0.006;
  if (t >= E.butter.drop[0]) y = Math.max(y, PTY + 0.014);
  if (t >= E.butter.melt[0] + 1.5) y = Math.max(y, PTY + 0.01);
  if (t >= E.onion_drop.start) y = Math.max(y, PTY + 0.026);
  if (t >= E.tomato.pour[0]) y = Math.max(y, PTY + 0.034);
  if (t >= E.cream.pour[0]) y = Math.max(y, PTY + 0.04);
  if (t >= E.chicken_drop.start) y = Math.max(y, PTY + 0.055);
  return y;
}

function placeSpat(t, a, b) {
  const v = win(t, a - 0.25, b + 0.15, 0.25, 0.25);
  spat.visible = v > 0.02;
  if (v <= 0.02) return;
  const ph = (t - a) * TAU * STIR_HZ;
  spat.userData.ph = ph;
  const halfW = spat.userData.bladeHalfW, halfD = spat.userData.bladeHalfD;
  const rMax = PRIM - halfW - 0.07;
  let px = 0.09 * Math.cos(ph), pz = 0.075 * Math.sin(ph);
  let rTip = Math.hypot(px, pz) || 0.001;
  if (rTip > rMax) { px *= rMax / rTip; pz *= rMax / rTip; rTip = rMax; }
  const foodTop = foodTopY(t);
  const tipY = Math.max(surfY(rTip) + 0.01, foodTop + 0.012);
  spat.position.set(px, tipY + (1 - eo(v)) * 0.045, pz);
  const n = V(0, 1, 0);
  const h = V(px / rTip, 0, pz / rTip);
  const zA = h.clone();
  const xA = n.clone().cross(zA).normalize();
  const yA = zA.clone().cross(xA).normalize();
  spat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
  spat.rotateX(-6 * Math.PI / 180);
  spat.updateMatrixWorld(true);
  const samples = [V(0, 0, 0), V(halfW, 0, 0), V(-halfW, 0, 0), V(0, 0, halfD), V(0, 0, -halfD), V(0, 0.09, 0.04), V(0, 0.11, 0.09)];
  let maxR = 0;
  for (const lp of samples) {
    const w = spat.localToWorld(lp.clone());
    maxR = Math.max(maxR, Math.hypot(w.x - B.x, w.z - B.z));
  }
  let rNow = Math.hypot(spat.position.x, spat.position.z) || 0.001;
  const tipCap = Math.max(0.02, PRIM - halfW - 0.055 - Math.max(0, maxR - PRIM) * 0.8);
  if (rNow > tipCap) {
    spat.position.x *= tipCap / rNow; spat.position.z *= tipCap / rNow; rNow = tipCap;
    spat.updateMatrixWorld(true);
  }
  spat.position.y = Math.max(spat.position.y, surfY(rNow) + 0.01, foodTop + 0.012);
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
  const half = 0.018;
  if (aabb && P.x + half > aabb.x0 && P.x - half < aabb.x1 && P.z + half > aabb.z0 && P.z - half < aabb.z1) {
    const cx = (aabb.x0 + aabb.x1) / 2, cz = (aabb.z0 + aabb.z1) / 2;
    dx = P.x - cx; dz = P.z - cz; d = Math.hypot(dx, dz) || 0.001;
    const out = Math.max(0.045, Math.hypot(aabb.x1 - aabb.x0, aabb.z1 - aabb.z0) * 0.55);
    P.x = cx + dx / d * out; P.z = cz + dz / d * out;
    d = out;
  }
  if (d < rad && d > 0.001) {
    const push = (rad - d) / rad * strength;
    P.x += (dx / d) * push; P.z += (dz / d) * push;
  }
  const lr = Math.hypot(P.x - B.x, P.z - B.z);
  if (lr > PRIM - 0.045) {
    P.x = B.x + (P.x - B.x) / lr * (PRIM - 0.045);
    P.z = B.z + (P.z - B.z) / lr * (PRIM - 0.045);
  }
}

function placeBits(arr, drop, t, stirring, yOff = 0) {
  arr.forEach((b, i) => {
    const dropT = drop.start + i * drop.gap;
    b.m.visible = false;
    if (t < dropT) return;
    b.m.visible = true;
    const fall = clamp((t - dropT) / (drop.fall || 0.26));
    let px = B.x + Math.cos(b.a + b.phase * 0.15) * b.r;
    let pz = B.z + Math.sin(b.a + b.phase * 0.15) * b.r;
    const sy = b.sy || 0.016;
    let py = PAN_Y + surfY(Math.hypot(px - B.x, pz - B.z)) + sy / 2 + yOff;
    if (fall < 1) py = (PAN_Y + 0.42) * (1 - eo(fall)) + py * eo(fall);
    if (stirring && fall >= 1) {
      const ph = spat.userData.ph || 0;
      px += 0.012 * Math.sin(ph + b.phase);
      pz += 0.01 * Math.cos(ph + b.phase * 1.2);
      const P = { x: px, z: pz };
      pushFromSpat(P, 0.065, 0.032);
      px = P.x; pz = P.z;
      const rr = Math.hypot(px - B.x, pz - B.z);
      py = Math.max(PAN_Y + surfY(rr) + sy / 2 + yOff, PAN_Y + (spat.userData.foodTop || foodTopY(t)) - sy * 0.15);
      if (spat.visible) py = Math.min(py, PAN_Y + spat.position.y - sy / 2 - 0.004);
    }
    b.m.position.set(px, py, pz);
    b.m.rotation.set(0.12 * Math.sin(b.phase), b.a, 0.1);
  });
}

const KEYS = [
  [0.0,   [0.08, 0.14, 0.0],  30, 28, 1.62],
  [3.5,   [0.08, 0.08, 0.0],  38, 32, 1.38],
  [10.5,  [0.08, 0.07, 0.0],  44, 34, 1.18],
  [19.0,  [0.08, 0.07, 0.0],  56, 36, 1.14],
  [34.0,  [0.08, 0.06, 0.0],  48, 35, 1.15],
  [49.0,  [0.08, 0.08, 0.0],  32, 33, 1.20],
  [65.0,  [0.08, 0.08, 0.0],  50, 34, 1.14],
  [75.0,  [0.08, 0.07, 0.0],  58, 36, 1.10],
  [86.0,  [0.08, 0.10, 0.0],  42, 38, 1.00],
  [93.5,  [0.08, 0.08, 0.0],  50, 35, 1.14],
  [95.5,  [1.08, 0.10, 0.0],  36, 34, 1.18],
  [102.0, [1.08, 0.13, 0.0],  24, 30, 1.06],
  [107.5, [1.08, 0.14, 0.02], 18, 28, 1.10],
  [111.0, [0.25, 0.12, 0.0],  28, 30, 1.48],
  [120.0, [0.25, 0.12, 0.0],  28, 30, 1.48],
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
  eye.x += 0.004 * Math.sin(t * 1.15); eye.y += 0.003 * Math.cos(t * 0.95);
  cam.position.copy(eye); cam.lookAt(tgt);
  cam.setViewOffset(W, H, 0, 90, W, H);
}

function setChickenCookColor(chunk, cook) {
  const raw = new THREE.Color(RAW_CHICK);
  const cooked = new THREE.Color(COOK_CHICK);
  const sauceTint = new THREE.Color(SAUCE);
  const c = raw.clone().lerp(cooked, clamp(cook)).lerp(sauceTint, clamp(cook - 0.55) * 0.55);
  const flesh = new THREE.Color(FLESH).lerp(new THREE.Color('#D8A090'), clamp(cook));
  const ud = chunk.m.userData;
  ud.body.material.color.copy(c);
  ud.lobe.material.color.copy(c);
  if (ud.lobe2) ud.lobe2.material.color.copy(c);
  ud.cut.material.color.copy(flesh);
}

function update(t) {
  const bandX = -1.05 + 2.1 * (0.5 + 0.5 * Math.sin(t * 0.07));
  sunBand.position.x = bandX;
  sunFill.position.x = bandX * 0.4;
  panes.forEach((p) => {
    const dx = Math.abs((p.position.x || 0) - bandX);
    const lit = clamp(1 - dx / 0.85);
    if (p.userData.baseEmi) p.material.emissive.copy(p.userData.baseEmi).multiplyScalar(0.45 + 1.1 * lit);
    if (p.material.transparent) p.material.opacity = 0.58 + 0.28 * lit;
  });
  shafts.forEach((s, i) => {
    s.position.x = bandX - 0.45 + i * 0.32;
    s.material.opacity = 0.04 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.4 + i));
  });

  const heatOn = t >= E.ignite && t < E.card;
  flames.forEach((f, i) => {
    f.visible = heatOn;
    if (!heatOn) return;
    const flick = 0.85 + 0.15 * Math.sin(t * 14 + i * 1.7);
    f.scale.setScalar(flick);
    f.material.opacity = 0.55 + 0.25 * Math.sin(t * 11 + i);
  });

  // ---- butter blocks drop → soften/shrink → melt into pool ----
  butterPool.visible = false;
  {
    const drop0 = E.butter.drop[0], drop1 = E.butter.drop[1];
    const melt0 = E.butter.melt[0], melt1 = E.butter.melt[1];
    const meltP = clamp((t - melt0) / Math.max(0.01, melt1 - melt0));
    butterBlocks.forEach((b, i) => {
      const enterT = drop0 + i * ((drop1 - drop0) / Math.max(1, butterBlocks.length - 1));
      b.g.visible = false;
      if (t < enterT) return;
      const fall = clamp((t - enterT) / 0.35);
      // hold solid shape briefly, then soften over melt window
      const soft = clamp((t - Math.max(enterT + 0.45, melt0 + 0.4)) / 3.6);
      // collapse: Y shrink, XZ spread — still readable as butter blocks while soft < 0.7
      const sy = lerp(1, 0.12, eo(soft));
      const sxz = lerp(1, 1.7, eo(soft));
      const fade = soft > 0.72 ? 1 - clamp((soft - 0.72) / 0.28) : 1;
      if (fade < 0.04) return;
      b.g.visible = true;
      b.g.scale.set(sxz * fade, sy * Math.max(fade, 0.3), sxz * fade);
      let px = B.x + b.ox * (1 - soft * 0.35), pz = B.z + b.oz * (1 - soft * 0.35);
      let py = PAN_Y + surfY(Math.hypot(px - B.x, pz - B.z)) + b.sy * sy * 0.5 + 0.002;
      if (fall < 1) py = (PAN_Y + 0.38) * (1 - eo(fall)) + py * eo(fall);
      b.g.position.set(px, py, pz);
      b.g.rotation.set(0.08 * (1 - soft), b.rot * (1 - soft * 0.5), 0.05 * (1 - soft));
      const col = new THREE.Color(BUTTER_SOLID).lerp(new THREE.Color(BUTTER_MELT), soft);
      b.body.material.color.copy(col);
    });
    // pool grows as blocks collapse — continuous liquid, not petals
    if (t >= melt0 + 1.4 && t < E.tomato.pour[0]) {
      butterPool.visible = true;
      const poolP = clamp((t - (melt0 + 1.4)) / 2.8);
      butterPool.position.set(B.x, PAN_Y + surfY(0) + 0.002, B.z);
      butterPool.scale.setScalar(0.2 + 0.8 * eo(poolP));
    }
    DBG.butter = { meltP: +meltP.toFixed(3), pool: butterPool.visible };
  }

  // tomato / cream pours
  {
    const land = V(B.x + 0.02, PAN_Y + surfY(0.04) + 0.008, B.z);
    const tipW = V(B.x - 0.06, PAN_Y + 0.44, B.z + 0.1);
    pourBottle(tomatoBottle, tomatoStream, tomatoPlug, E.tomato, tipW, land, t, 'tomato');
  }
  {
    const land = V(B.x - 0.03, PAN_Y + surfY(0.05) + 0.012, B.z + 0.02);
    const tipW = V(B.x + 0.05, PAN_Y + 0.43, B.z + 0.09);
    pourBottle(creamPitcher, creamStream, creamPlug, E.cream, tipW, land, t, 'cream');
  }

  sauceBody.visible = false;
  if (t >= E.tomato.pour[0]) {
    sauceBody.visible = true;
    const tp = clamp((t - E.tomato.pour[0]) / (E.tomato.pour[1] - E.tomato.pour[0]));
    const cp = t >= E.cream.pour[0] ? clamp((t - E.cream.pour[0]) / (E.cream.pour[1] - E.cream.pour[0])) : 0;
    const sc = 0.45 + 0.55 * Math.min(1, tp) + 0.08 * cp;
    sauceBody.position.set(B.x, PAN_Y + surfY(0) + 0.004 + 0.006 * cp, B.z);
    sauceBody.scale.set(sc, 1, sc);
    sauceBody.children.forEach((ch, i) => {
      if (!ch.material || !ch.material.color) return;
      const from = new THREE.Color(i % 2 ? RUBY : '#A82830');
      const to = new THREE.Color(i % 2 ? SAUCE : '#D4783A');
      ch.material.color.copy(from).lerp(to, cp);
    });
    sauceBumps.forEach((bp, i) => {
      bp.scale.y = 0.35 + 0.08 * Math.sin(t * 1.4 + i);
    });
  }
  creamSwirls.forEach((s, i) => {
    // hide once chicken enters — avoid wire/loop look over meat
    const on = t >= E.cream.pour[0] + i * 0.12 && t < E.chicken_drop.start;
    s.m.visible = on;
    if (!s.m.visible) return;
    const ph = t * 0.4 + s.a;
    s.m.position.set(B.x + Math.cos(ph) * s.r, PAN_Y + surfY(s.r) + 0.018, B.z + Math.sin(ph) * s.r * 0.85);
  });

  spat.visible = false;
  const stirring = (t >= E.stir1[0] - 0.2 && t <= E.stir1[1] + 0.12)
    || (t >= E.stir2[0] - 0.2 && t <= E.stir2[1] + 0.12)
    || (t >= E.stir3[0] - 0.2 && t <= E.stir3[1] + 0.12)
    || (t >= E.stir4[0] - 0.2 && t <= E.stir4[1] + 0.12);
  if (t >= E.stir1[0] - 0.2 && t <= E.stir1[1] + 0.12) placeSpat(t, E.stir1[0], E.stir1[1]);
  else if (t >= E.stir2[0] - 0.2 && t <= E.stir2[1] + 0.12) placeSpat(t, E.stir2[0], E.stir2[1]);
  else if (t >= E.stir3[0] - 0.2 && t <= E.stir3[1] + 0.12) placeSpat(t, E.stir3[0], E.stir3[1]);
  else if (t >= E.stir4[0] - 0.2 && t <= E.stir4[1] + 0.12) placeSpat(t, E.stir4[0], E.stir4[1]);

  const sauceLift = t >= E.tomato.pour[0] ? 0.01 : 0;
  placeBits(onionDice, E.onion_drop, t, stirring, sauceLift);
  placeBits(garlicBits, E.garlic_drop, t, stirring, sauceLift);
  placeBits(gingerBits, E.ginger_drop, t, stirring, sauceLift);
  placeBits(spiceBits, E.spices, t, stirring, sauceLift + 0.004);

  // chicken — irregular + raw→cooked; sauce wraps visually via color
  let thickCenter = null;
  chickenChunks.forEach((b, i) => {
    const dropT = E.chicken_drop.start + i * E.chicken_drop.gap;
    b.m.visible = false;
    if (t < dropT || t >= E.plating[0]) return;
    b.m.visible = true;
    const fall = clamp((t - dropT) / E.chicken_drop.fall);
    // cook progress over simmer window (visual only; safety via thermometer ≥74°C)
    const cook = clamp((t - E.simmer[0]) / (E.thermometer.read[1] - E.simmer[0]));
    setChickenCookColor(b, cook);
    let px = B.x + Math.cos(b.a + b.phase * 0.2) * b.r;
    let pz = B.z + Math.sin(b.a + b.phase * 0.2) * b.r;
    let py = PAN_Y + surfY(b.r) + b.sy / 2 + 0.02;
    if (fall < 1) py = (PAN_Y + 0.46) * (1 - eo(fall)) + py * eo(fall);
    if (stirring && fall >= 1) {
      const ph = spat.userData.ph || 0;
      px += 0.014 * Math.sin(ph + b.phase);
      pz += 0.012 * Math.cos(ph + b.phase * 1.25);
      const P = { x: px, z: pz };
      pushFromSpat(P, 0.08, 0.04);
      px = P.x; pz = P.z;
      const rr = Math.hypot(px - B.x, pz - B.z);
      py = Math.max(PAN_Y + surfY(rr) + b.sy / 2 + 0.018, PAN_Y + (spat.userData.foodTop || foodTopY(t)) - b.sy * 0.15);
      if (spat.visible) py = Math.min(py, PAN_Y + spat.position.y - b.sy / 2 - 0.005);
    }
    b.m.position.set(px, py, pz);
    // keep cut face biased toward camera (+Z-ish) so flesh plane stays readable
    b.m.rotation.set(0.25 + 0.1 * Math.sin(b.phase), b.a * 0.35 + 0.9 + t * b.spin * 0.05, 0.15 * Math.cos(b.phase));
    if (b.thick) thickCenter = V(px, py, pz);
  });

  // thermometer — tip locked into thickest chicken center (no float/clip through pan)
  thermo.visible = false;
  let thermoTemp = 0;
  {
    const Th = E.thermometer;
    if (t >= Th.enter && t <= Th.exit + 0.2 && thickCenter) {
      const inP = win(t, Th.enter, Th.exit, 0.45, 0.35);
      thermo.visible = inP > 0.05;
      const target = thickCenter.clone();
      // tip at meat center; shaft angled up-out so dial readable, no pan wall pierce
      const tipPos = target.clone();
      const dialDir = V(0.22, 0.32, 0.12).normalize();
      // group origin = tip
      thermo.position.copy(tipPos);
      thermo.quaternion.setFromUnitVectors(V(0, 1, 0), dialDir);
      // insert slightly into meat (tip below center by ~half thickness)
      thermo.position.addScaledVector(dialDir, -0.01);
      const readP = clamp((t - Th.read[0]) / (Th.read[1] - Th.read[0]));
      // climb toward 74°C; reach/hold ≥74 near end of read window
      thermoTemp = lerp(52, 76, eo(readP));
      const ang = (-50 + thermoTemp * 1.1) * Math.PI / 180;
      thermo.userData.needle.rotation.z = ang;
      DBG.thermo = {
        tip: tipPos.toArray().map(v => +v.toFixed(4)),
        tempC: +thermoTemp.toFixed(1),
        ok: thermoTemp >= 74
      };
    }
  }
  window.__thermoTemp = thermoTemp;

  onionWhole.visible = t < E.onion_drop.start;
  garlicBulb.visible = t < E.garlic_drop.start;
  gingerRoot.visible = t < E.ginger_drop.start;
  spiceBowls.forEach((g, i) => { g.visible = t < E.spices.start + i * 0.2; });

  // plating
  riceG.visible = t >= E.rice_plate;
  platedSauce.visible = t >= E.sauce_boat.pour[0];
  if (platedSauce.visible) {
    const p = clamp((t - E.sauce_boat.pour[0]) / 2.2);
    platedSauce.scale.setScalar(0.4 + 0.6 * p);
  }
  {
    const land = V(C.x + 0.02, 0.145, C.z - 0.01);
    const tipW = V(C.x - 0.07, 0.42, C.z + 0.09);
    pourBottle(sauceBoat, sauceStream, saucePlug, E.sauce_boat, tipW, land, t, 'sauce');
  }
  platedChicken.forEach((c, i) => {
    c.m.visible = t >= E.chicken_plate + i * 0.12;
    if (!c.m.visible) return;
    const hy = 0.055 + Math.sqrt(Math.max(0, 0.07 * 0.07 - Math.min(c.r, 0.065) ** 2)) * 0.5;
    c.m.position.set(C.x + Math.cos(c.a) * c.r + 0.015, hy + 0.04, C.z + Math.sin(c.a) * c.r * 0.85);
    c.m.rotation.y = c.a;
    // sauce coating look
    setChickenCookColor({ m: c.m }, 1.0);
  });
  garnish.forEach((g, i) => {
    g.m.visible = t >= E.garnish + i * 0.08;
    if (!g.m.visible) return;
    const hy = 0.07 + Math.sqrt(Math.max(0, 0.07 * 0.07 - Math.min(g.r, 0.065) ** 2)) * 0.4;
    g.m.position.set(C.x + Math.cos(g.a) * g.r, hy + 0.055, C.z + Math.sin(g.a) * g.r * 0.75);
    g.m.rotation.set(0.5, g.a, 0.15);
  });

  steam.forEach((s, i) => {
    const on = t >= E.butter.melt[0] && t < E.plating[0];
    s.visible = on;
    if (!on) return;
    const u = ((t * 0.32 + i * 0.17) % 1);
    s.position.set(B.x + Math.sin(i + t) * 0.08, 0.16 + u * 0.34, B.z + Math.cos(i * 1.3) * 0.08);
    s.scale.setScalar(0.55 + u * 1.15);
    s.material.opacity = 0.22 * (1 - u);
  });

  window.__dbg = DBG;
}

function parchment(ctx, x, y, w, h, r) {
  K.panel(ctx, x, y, w, h, r, CREAM, LEAD);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
  K.rr(ctx, x + 8, y + 8, w - 16, h - 16, Math.max(6, r - 6)); ctx.stroke();
}

function safeHud(t) {
  const T = K.theme, S = TL.steps, n = S.length, tEnd = S[n - 1].end;
  const TOP = 190;
  const hudA = win(t, 3.2, E.card, 0.6, 0.6); if (hudA <= 0) return;
  const x = 80, w = W - 160;
  ctx.save(); ctx.globalAlpha = hudA;
  parchment(ctx, x, TOP, w, 176, 18);
  ctx.textAlign = 'left'; ctx.fillStyle = T.a1;
  ctx.font = `700 28px ${T.fontEn}`;
  ctx.fillText(T.brand, x + 28, TOP + 52);
  const bw = ctx.measureText(T.brand).width;
  ctx.fillStyle = T.ink;
  K.fitText(ctx, `${T.brandZh} · ${TL.dish.zh}`, x + 36 + bw, TOP + 52, 24, 340, T.fontZh, '700');
  const cur = K.currentStep(t);
  ctx.textAlign = 'right'; ctx.fillStyle = T.ink;
  ctx.font = `700 28px ${T.fontEn}`;
  ctx.fillText(cur ? `STEP ${cur.n}/${n}` : (t >= tEnd ? 'DONE!' : ''), x + w - 28, TOP + 52);
  const x0 = x + 28, x1 = x + w - 28, y = TOP + 78, gap = 10, sw = (x1 - x0 - gap * (n - 1)) / n;
  const cols = [T.a1, T.a2, T.a3, T.a4];
  for (let i = 0; i < n; i++) {
    const s = S[i], p = seg(t, s.start, s.end), sx = x0 + i * (sw + gap);
    ctx.fillStyle = 'rgba(26,26,26,.12)'; K.rr(ctx, sx, y, sw, 20, 8); ctx.fill();
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
    K.title(ctx, `${cur.n}. ${cur.zh}`, 0, 0, 78, T.ink, T.fontZh, { maxW: 900 });
    K.title(ctx, cur.en.toUpperCase(), 0, 56, 40, T.a1, T.fontEn, { maxW: 900, weight: '700' });
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
    parchment(ctx, cx, cy, cw, ch, 16);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + 58, cy + ch / 2, 32, 0, TAU); ctx.fill();
    ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = CREAM; ctx.font = `700 34px ${T.fontEn}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.kind === 'ing' ? '+' : '▶', cx + 58, cy + ch / 2 + 2);
    ctx.textBaseline = 'alphabetic'; let amtW = 0;
    if (c.amt) {
      ctx.font = `700 28px ${T.fontUi}`; amtW = Math.min(340, ctx.measureText(c.amt).width + 40);
      const ax = cx + cw - 18 - amtW;
      ctx.fillStyle = col; K.rr(ctx, ax, cy + 28, amtW, 60, 22); ctx.fill();
      ctx.strokeStyle = T.ink; ctx.lineWidth = 3; K.rr(ctx, ax, cy + 28, amtW, 60, 22); ctx.stroke();
      ctx.fillStyle = T.ink; ctx.textAlign = 'center';
      K.fitText(ctx, c.amt, ax + amtW / 2, cy + 68, 28, amtW - 20, T.fontUi, '700');
    }
    const tx = cx + 108, maxW = cw - 130 - amtW - (c.amt ? 18 : 0);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, c.zh, tx, cy + 50, 40, maxW, T.fontZh, '900');
    ctx.fillStyle = T.muted;
    K.fitText(ctx, c.en, tx, cy + 92, 30, maxW, T.fontUi, '600');
    ctx.restore();
  }

  // thermometer readout HUD (phone-readable, SAFE zone)
  const Th = E.thermometer;
  if (t >= Th.read[0] - 0.2 && t <= Th.exit + 0.15) {
    const a = win(t, Th.read[0] - 0.2, Th.exit, 0.35, 0.3);
    const temp = window.__thermoTemp || 0;
    const ok = temp >= 74;
    ctx.save(); ctx.globalAlpha = a;
    const bx = 80, by = 1420, bw = W - 160, bh = 150;
    parchment(ctx, bx, by, bw, bh, 16);
    ctx.textAlign = 'center';
    ctx.fillStyle = ok ? GREEN : RUBY;
    ctx.font = `700 52px ${T.fontEn}`;
    ctx.fillText(`${temp.toFixed(0)}°C  /  ${(temp * 9 / 5 + 32).toFixed(0)}°F`, W / 2, by + 68);
    ctx.fillStyle = T.ink;
    K.fitText(ctx, ok ? '最厚鸡块中心已达安全温度 · Thickest center safe' : '继续小火煮至中心≥74°C/165°F · Keep simmering',
      W / 2, by + 118, 28, bw - 40, T.fontUi, '700');
    ctx.restore();
  }
}

function safeRecipeCard(t, t0) {
  const T = K.theme, a = eo(seg(t, t0, t0 + 0.8)); if (a <= 0) return;
  const Rec = TL.recipe;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(14,26,48,.55)'; ctx.fillRect(0, 0, W, H);
  const x = 80, w = W - 160, y = 160, h = 1380;
  parchment(ctx, x, y, w, h, 22);
  ctx.textAlign = 'center';
  ctx.fillStyle = T.a1; ctx.font = `700 24px ${T.fontEn}`;
  ctx.fillText('FULL RECIPE · 完整配方', W / 2, y + 50);
  K.title(ctx, TL.dish.zh, W / 2, y + 116, 64, T.a1, T.fontZh, { maxW: w - 80 });
  ctx.fillStyle = T.ink;
  K.fitText(ctx, TL.dish.en.toUpperCase(), W / 2, y + 166, 32, w - 80, T.fontEn, '700');
  ctx.fillStyle = T.muted;
  K.fitText(ctx, `${TL.dish.time} · ${TL.dish.servings} 人份 · ${TL.dish.cuisine} · 片中加速`, W / 2, y + 204, 22, w - 80, T.fontUi, '600');
  let yy = y + 242; ctx.textAlign = 'left';
  ctx.fillStyle = T.a3; ctx.font = `900 24px ${T.fontZh}`; ctx.fillText('食材  INGREDIENTS', x + 36, yy); yy += 8;
  Rec.ingredients.forEach((r, i) => {
    const ry = yy + 12 + i * 42;
    const ri = eo(seg(t, t0 + 0.35 + i * 0.04, t0 + 0.65 + i * 0.04));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = i % 2 ? 'rgba(155,27,46,.10)' : 'rgba(212,160,23,.14)';
    K.rr(ctx, x + 28, ry - 4, w - 56, 38, 10); ctx.fill();
    ctx.fillStyle = T.ink; ctx.font = `900 22px ${T.fontZh}`; ctx.fillText(r[0], x + 44, ry + 24);
    ctx.fillStyle = T.muted; K.fitText(ctx, r[1], x + 200, ry + 24, 18, 320, T.fontUi, '600');
    ctx.textAlign = 'right'; ctx.fillStyle = T.a1; K.fitText(ctx, r[2], x + w - 44, ry + 24, 20, 220, T.fontUi, '700');
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = a; yy += 12 + Rec.ingredients.length * 42 + 18;
  ctx.fillStyle = T.a3; ctx.font = `900 24px ${T.fontZh}`; ctx.fillText('步骤  STEPS', x + 36, yy); yy += 6;
  Rec.steps.forEach((s, i) => {
    const ry = yy + 10 + i * 78;
    const ri = eo(seg(t, t0 + 0.8 + i * 0.07, t0 + 1.1 + i * 0.07));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = [T.a1, T.a2, T.a3, T.a4][i % 4];
    ctx.beginPath(); ctx.arc(x + 58, ry + 26, 18, 0, TAU); ctx.fill();
    ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = T.paper; ctx.font = `700 18px ${T.fontEn}`; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + 58, ry + 32);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, s[0], x + 88, ry + 18, 20, w - 140, T.fontZh, '700');
    ctx.fillStyle = T.muted; K.fitText(ctx, s[1], x + 88, ry + 48, 16, w - 140, T.fontUi, '500');
  });
  ctx.restore();
}

function overlay(t) {
  const T = K.theme;
  const ia = 1 - seg(t, 2.8, 3.5);
  if (ia > 0) {
    ctx.save(); ctx.globalAlpha = ia;
    parchment(ctx, 90, 330, W - 180, 300, 20);
    K.title(ctx, TL.dish.zh, W / 2, 470, 76, T.a1, T.fontZh, { maxW: 860 });
    K.title(ctx, TL.dish.en.toUpperCase(), W / 2, 548, 38, T.ink, T.fontEn, { maxW: 860, weight: '700' });
    ctx.fillStyle = T.muted; ctx.textAlign = 'center';
    ctx.font = `600 24px ${T.fontUi}`;
    ctx.fillText(`${TL.dish.time} · ${TL.dish.servings} servings · ${TL.dish.cuisine}`, W / 2, 596);
    ctx.restore();
  }
  safeHud(t);
  if (t >= E.card) safeRecipeCard(t, E.card);
}

function render(t) {
  update(t);
  camAt(t);
  key.position.set(-0.5 + 0.08 * Math.sin(t * 0.15), 2.45, 1.3);
  R3.render(scene, cam);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(R3.domElement, 0, 0);
  overlay(t);
}
window.render = render;
(async () => { await K.loadFonts(); render(0); window.ready = true; })();
