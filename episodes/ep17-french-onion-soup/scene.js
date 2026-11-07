// EP17 法式洋葱汤 — art-deco-3d (lemo-opuscar)
// Warm lacquer black + gold banded metal + airbrush volumes; tip-lock butter/wine/broth;
// spatula tip ≥ foodTop hard push; HUD SAFE x≥70–1010 y150–1600. Pure fn of t.
import * as THREE from 'three';

const K = kit, E = TL.ev, W = 1080, H = 1920, TAU = Math.PI * 2;
const { clamp, lerp, seg, eio, eo, ei, ss, back, win } = K;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const STIR_HZ = 0.55;

K.setTheme({
  style: 'flat',
  ink: '#F5F0E6', paper: '#1A1410', a1: '#D4AF37', a2: '#8B1E3F', a3: '#0F6B4C', a4: '#C47A3A',
  brand: 'DECO KITCHEN', brandZh: '装饰艺术厨',
  fontEn: '"Josefin Sans", "Limelight", sans-serif',
  fontUi: '"Josefin Sans", "Noto Sans CJK SC", sans-serif',
  fontZh: '"Noto Sans CJK SC", "Josefin Sans", sans-serif',
  muted: 'rgba(245,240,230,.55)', outline: 0, shadow: 0
});
K.HUD_TOP = 190;

const POT = V(0.0, 0.05, 0.02);
const BOARD = V(-0.55, 0.02, 0.08);
const CROCK = V(0.52, 0.04, 0.05);
const WR = 0.22, WRIM = 0.195;
const FOOD_BASE = 0.04;
const DBG = { streams: {} };

const R3 = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.NeutralToneMapping; R3.toneMappingExposure = 1.05;
R3.outputColorSpace = THREE.SRGBColorSpace;
R3.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1A1410');
scene.fog = new THREE.Fog('#1A1410', 6.5, 14);
const cam = new THREE.PerspectiveCamera(38, W / H, 0.01, 30);
const out = document.getElementById('c'), ctx = out.getContext('2d');

const matCache = new Map();
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.roughness ?? 0.55, metalness: o.metalness ?? 0,
    flatShading: o.flat ?? false,
    transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1,
    side: o.side || THREE.FrontSide, emissive: o.emissive || '#000000', emissiveIntensity: o.ei || 0
  });
  matCache.set(key, m); return m;
}
function mesh(geo, mat, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m;
}
function goldMat(seed = 0) {
  return M('#D4AF37', { roughness: 0.28, metalness: 0.85, emissive: '#3A2A08', ei: 0.15 + (K.hash(seed) % 100) / 800 });
}
function jitterColor(hex, seed) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, (K.hash(seed) - 0.5) * 0.06); return c;
}
function surfY(r) { return FOOD_BASE + 0.012 * (1 - (r / WR) * (r / WR)); }

// ---------- Art Deco lighting ----------
scene.add(new THREE.AmbientLight('#3a3028', 0.35));
scene.add(new THREE.HemisphereLight('#F5F0E6', '#1A1410', 0.45));
const key = new THREE.DirectionalLight('#FFF4D2', 1.55);
key.position.set(2.2, 4.0, 1.6); key.castShadow = true;
key.shadow.mapSize.set(1536, 1536);
Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.2, far: 12 });
key.shadow.bias = -0.00035; key.shadow.normalBias = 0.025; key.shadow.radius = 2.2;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#8B1E3F', 0.22); fill.position.set(-2.0, 1.4, -1.2); scene.add(fill);
const goldRim = new THREE.DirectionalLight('#D4AF37', 0.45); goldRim.position.set(0.2, 2.8, -2.2); scene.add(goldRim);
const bulb1 = new THREE.PointLight('#FFF4D2', 0.55, 4.5); bulb1.position.set(-0.9, 1.1, 0.6); scene.add(bulb1);
const bulb2 = new THREE.PointLight('#FFF4D2', 0.45, 4.0); bulb2.position.set(0.95, 1.05, 0.5); scene.add(bulb2);

// ---------- Deco set: lacquer floor + sunburst + stepped arch ----------
const island = new THREE.Group(); scene.add(island);
// chevron / diamond lacquer floor
for (let ix = -5; ix <= 5; ix++) for (let iz = -4; iz <= 4; iz++) {
  if (Math.hypot(ix * 0.2, iz * 0.2) > 1.25) continue;
  const even = (ix + iz) % 2 === 0;
  const col = even ? '#1A1410' : '#241C16';
  const t = mesh(new THREE.BoxGeometry(0.19, 0.03, 0.19), M(jitterColor(col, ix * 13 + iz), { roughness: 0.55, metalness: 0.15 }));
  t.position.set(ix * 0.2, 0.015, iz * 0.2); island.add(t);
  if (even && Math.abs(ix) + Math.abs(iz) < 6) {
    const gline = mesh(new THREE.BoxGeometry(0.185, 0.004, 0.006), goldMat(ix + iz * 7), false, false);
    gline.position.set(ix * 0.2, 0.032, iz * 0.2); island.add(gline);
  }
}
// sunburst backdrop (hard-edged wedges)
const sunG = new THREE.Group(); sunG.position.set(0, 0.55, -1.05);
for (let i = 0; i < 16; i++) {
  const a0 = (i / 16) * TAU, a1 = ((i + 0.55) / 16) * TAU;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(Math.cos(a0) * 1.35, Math.sin(a0) * 1.35);
  shape.lineTo(Math.cos(a1) * 1.35, Math.sin(a1) * 1.35);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const col = i % 2 === 0 ? '#2A2018' : '#1F1812';
  const wedge = mesh(geo, M(col, { roughness: 0.7, side: THREE.DoubleSide }), false, false);
  sunG.add(wedge);
  const rim = mesh(new THREE.BoxGeometry(0.008, 1.2, 0.008), goldMat(i), false, false);
  rim.position.set(Math.cos((a0 + a1) / 2) * 0.65, Math.sin((a0 + a1) / 2) * 0.65, 0.01);
  rim.rotation.z = (a0 + a1) / 2 - Math.PI / 2;
  sunG.add(rim);
}
const sunCore = mesh(new THREE.CircleGeometry(0.18, 24), goldMat(99), false, false);
sunCore.position.z = 0.02; sunG.add(sunCore);
const sunCore2 = mesh(new THREE.CircleGeometry(0.1, 20), M('#FFF4D2', { roughness: 0.4, emissive: '#D4AF37', ei: 0.35 }), false, false);
sunCore2.position.z = 0.03; sunG.add(sunCore2);
island.add(sunG);

// stepped arch frame (left/right pillars + ziggurat top)
function steppedArch(xSign) {
  const g = new THREE.Group();
  const steps = [[0.08, 0.95, 0.12], [0.12, 0.75, 0.14], [0.16, 0.55, 0.16]];
  steps.forEach(([sx, sy, sz], i) => {
    const p = mesh(new THREE.BoxGeometry(sx, sy, sz), M('#1A1410', { roughness: 0.5, metalness: 0.2 }));
    p.position.set(xSign * (0.95 + i * 0.02), sy / 2, -0.55);
    g.add(p);
    const edge = mesh(new THREE.BoxGeometry(0.01, sy * 0.98, 0.01), goldMat(i + xSign * 10), false, false);
    edge.position.set(xSign * (0.95 + i * 0.02 + sx * 0.45 * xSign), sy / 2, -0.55 + sz / 2 + 0.005);
    g.add(edge);
  });
  return g;
}
island.add(steppedArch(-1), steppedArch(1));
// top stepped lintel
[[0.7, 0.08, 1.12], [0.55, 0.07, 1.18], [0.4, 0.06, 1.22]].forEach(([sx, sy, y], i) => {
  const bar = mesh(new THREE.BoxGeometry(sx * 2, sy, 0.12), M('#1A1410', { roughness: 0.5, metalness: 0.25 }));
  bar.position.set(0, y, -0.55); island.add(bar);
  const gbar = mesh(new THREE.BoxGeometry(sx * 2 + 0.02, 0.008, 0.01), goldMat(50 + i), false, false);
  gbar.position.set(0, y + sy / 2 + 0.004, -0.48); island.add(gbar);
});
// emerald jewel accents
[[-0.7, 0.35, -0.4], [0.7, 0.35, -0.4]].forEach(([x, y, z], i) => {
  const gem = mesh(new THREE.OctahedronGeometry(0.04, 0), M('#0F6B4C', { roughness: 0.25, metalness: 0.4, emissive: '#0F6B4C', ei: 0.15 }));
  gem.position.set(x, y, z); island.add(gem);
});

// ---------- Cutting board (side) ----------
const boardG = new THREE.Group(); scene.add(boardG);
boardG.position.copy(BOARD);
{
  const wood = mesh(new THREE.BoxGeometry(0.38, 0.03, 0.28), M('#5C3A22', { roughness: 0.75 }));
  wood.position.y = 0.015; boardG.add(wood);
  const trim = mesh(new THREE.BoxGeometry(0.39, 0.008, 0.01), goldMat(3), false, false);
  trim.position.set(0, 0.032, 0.14); boardG.add(trim);
  const trim2 = trim.clone(); trim2.position.z = -0.14; boardG.add(trim2);
}

// whole onion + slices on board
const onionsBoard = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.055, 14, 12), M(jitterColor('#C47A3A', i + 2), { roughness: 0.7 }));
  body.scale.set(1, 0.85, 1); g.add(body);
  const root = mesh(new THREE.ConeGeometry(0.012, 0.025, 6), M('#F5F0E6', { roughness: 0.8 }));
  root.position.y = 0.055; g.add(root);
  const skin = mesh(new THREE.SphereGeometry(0.057, 10, 8, 0, TAU * 0.4, 0, Math.PI), M('#A85A28', { roughness: 0.85, side: THREE.DoubleSide, opacity: 0.7 }));
  skin.rotation.y = i; g.add(skin);
  boardG.add(g); onionsBoard.push(g);
  g.position.set(-0.08 + i * 0.1, 0.055, -0.02 + (i % 2) * 0.04);
}

// onion slices (appear as cut)
const onionSlices = [];
for (let i = 0; i < 8; i++) {
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), M(jitterColor('#E8A86A', i), { roughness: 0.65 }));
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const flesh = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16), M('#F0C090', { roughness: 0.7 }));
  flesh.rotation.x = 0; g.add(flesh);
  const core = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.013, 8), M('#F5E6D0', { roughness: 0.6 }));
  g.add(core);
  boardG.add(g); g.visible = false; onionSlices.push(g);
}

// knife: blade plane = cut plane (vertical XY), edge down, thickness along Z
const knife = new THREE.Group();
{
  const blade = mesh(new THREE.BoxGeometry(0.15, 0.032, 0.0035), M('#E8E4DC', { roughness: 0.22, metalness: 0.75 }));
  blade.position.set(0.055, 0.01, 0); knife.add(blade);
  const edge = mesh(new THREE.BoxGeometry(0.152, 0.004, 0.0016), M('#1A1410', { roughness: 0.3, metalness: 0.55 }));
  edge.position.set(0.055, -0.007, 0); knife.add(edge);
  const goldEdge = mesh(new THREE.BoxGeometry(0.152, 0.0012, 0.0022), goldMat(8), false, false);
  goldEdge.position.set(0.055, -0.0055, 0.0012); knife.add(goldEdge);
  const handle = mesh(new THREE.BoxGeometry(0.085, 0.02, 0.018), M('#1A1410', { roughness: 0.55, metalness: 0.2 }));
  handle.position.set(-0.075, 0.012, 0); knife.add(handle);
  const bolster = mesh(new THREE.BoxGeometry(0.016, 0.028, 0.022), goldMat(7));
  bolster.position.set(-0.022, 0.01, 0); knife.add(bolster);
}
knife.visible = false; boardG.add(knife);
// cut-line groove on the board + vertical slit coinciding with blade
const cutGroove = mesh(new THREE.BoxGeometry(0.18, 0.0016, 0.004), M('#1A0C08', { roughness: 0.65 }));
cutGroove.position.set(0, 0.031, 0); cutGroove.visible = false; boardG.add(cutGroove);
const cutPlane = mesh(new THREE.BoxGeometry(0.14, 0.07, 0.0012), M('#3A1810', { roughness: 0.45, opacity: 0.85, side: THREE.DoubleSide }));
cutPlane.position.set(0, 0.06, 0); cutPlane.visible = false; boardG.add(cutPlane);

// ---------- Pot (centered hero) ----------
const potG = new THREE.Group(); scene.add(potG);
potG.position.copy(POT);
{
  // copper / lacquer casserole
  const outer = mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.16, 28, 1, true), M('#2A1C14', { roughness: 0.4, metalness: 0.55, side: THREE.DoubleSide }));
  outer.position.y = 0.08; potG.add(outer);
  const bottom = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 28), M('#1A1410', { roughness: 0.45, metalness: 0.5 }));
  bottom.position.y = 0.01; potG.add(bottom);
  const inner = mesh(new THREE.CylinderGeometry(0.21, 0.195, 0.14, 28, 1, true), M('#3A2818', { roughness: 0.55, side: THREE.BackSide }));
  inner.position.y = 0.085; potG.add(inner);
  const rim = mesh(new THREE.TorusGeometry(0.225, 0.012, 10, 32), goldMat(11));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.16; potG.add(rim);
  // handles
  [-1, 1].forEach((s, i) => {
    const h = mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16, Math.PI), goldMat(12 + i));
    h.rotation.set(0, 0, Math.PI / 2); h.position.set(s * 0.24, 0.12, 0); potG.add(h);
  });
  // gold band mid
  const band = mesh(new THREE.CylinderGeometry(0.242, 0.242, 0.012, 28, 1, true), goldMat(15), false, false);
  band.position.y = 0.1; potG.add(band);
}

// butter melt — thin oil film (not a thick pancake)
const butterPool = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.0024, 28), M('#F5E6A3', { roughness: 0.22, opacity: 0.72, metalness: 0.08 }));
butterPool.position.y = FOOD_BASE + 0.0022; butterPool.visible = false; potG.add(butterPool);
const butterSlicks = [];
for (let i = 0; i < 3; i++) {
  const slick = mesh(new THREE.SphereGeometry(0.055 + i * 0.012, 12, 8), M(jitterColor('#E8D080', i + 9), { roughness: 0.2, opacity: 0.55, metalness: 0.1 }));
  slick.scale.set(1.6, 0.08, 1.35);
  slick.position.set(Math.cos(i * 2.1) * 0.05, FOOD_BASE + 0.003, Math.sin(i * 2.1) * 0.04);
  slick.visible = false; potG.add(slick); butterSlicks.push(slick);
}

// caramelized onions in pot (chunks with undulation)
const onionsPot = [];
for (let i = 0; i < 18; i++) {
  const g = new THREE.Group();
  const col = i % 3 === 0 ? '#C47A3A' : (i % 3 === 1 ? '#A85A28' : '#8B4518');
  const bit = mesh(new THREE.BoxGeometry(0.04, 0.012, 0.03), M(jitterColor(col, i + 40), { roughness: 0.7 }));
  bit.rotation.y = K.hash(i) * TAU; g.add(bit);
  // slight curl
  const curl = mesh(new THREE.TorusGeometry(0.015, 0.006, 6, 10, Math.PI), M(jitterColor('#E8A86A', i), { roughness: 0.65 }));
  curl.rotation.x = 0.4; curl.position.set(0.01, 0.008, 0); g.add(curl);
  potG.add(g); g.visible = false;
  const ang = (i / 18) * TAU + K.hash(i) * 0.3;
  const rad = 0.04 + Math.sqrt(K.hash(i + 3)) * 0.12;
  onionsPot.push({ g, i, ang, rad, halfXZ: 0.022, s: 0.9 + K.hash(i + 5) * 0.25 });
}

// soup broth surface (undulating, not flat disc)
const brothG = new THREE.Group(); potG.add(brothG); brothG.visible = false;
const brothBody = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), M('#8B1E3F', { roughness: 0.45, opacity: 0.95 }));
brothBody.position.y = FOOD_BASE + 0.03; brothG.add(brothBody);
const brothSwells = [];
for (let i = 0; i < 5; i++) {
  const s = mesh(new THREE.SphereGeometry(0.05 + i * 0.01, 10, 8), M(jitterColor(i % 2 ? '#A02848' : '#6E1530', i + 70), { roughness: 0.4, opacity: 0.9 }));
  s.scale.set(1.4, 0.35, 1.2);
  s.position.set(Math.cos(i * 1.4) * 0.07, FOOD_BASE + 0.045, Math.sin(i * 1.4) * 0.07);
  brothG.add(s); brothSwells.push(s);
}

// salt/pepper bits
const salts = [];
for (let i = 0; i < 12; i++) {
  const p = mesh(new THREE.SphereGeometry(0.005, 5, 4), M(i % 2 ? '#F5F0E6' : '#2A2420', { roughness: 0.8 }));
  potG.add(p); p.visible = false; salts.push(p);
}

// ---------- Spatula / wooden spoon ----------
const spat = new THREE.Group();
{
  const wood = M('#8B5A2B', { roughness: 0.7 });
  const blade = mesh(new THREE.BoxGeometry(0.055, 0.006, 0.04), M('#F5F0E6', { roughness: 0.45, metalness: 0.15 }));
  blade.position.set(0, 0.003, 0); spat.add(blade);
  const bladeRim = mesh(new THREE.BoxGeometry(0.058, 0.002, 0.043), goldMat(21), false, false);
  bladeRim.position.set(0, 0.007, 0); spat.add(bladeRim);
  const tip = mesh(new THREE.BoxGeometry(0.042, 0.005, 0.014), M('#F5F0E6', { roughness: 0.45 }));
  tip.position.set(0, 0.0025, -0.024); spat.add(tip);
  const hg = new THREE.Group(); hg.position.set(0, 0.006, 0.01); hg.rotation.x = -70 * Math.PI / 180;
  const hd = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.12, 10), wood);
  hd.rotation.x = Math.PI / 2; hd.position.z = 0.055; hg.add(hd);
  const grip = mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.025, 8), goldMat(20));
  grip.rotation.x = Math.PI / 2; grip.position.z = 0.12; hg.add(grip);
  spat.add(hg); potG.add(spat); spat.visible = false;
  spat.userData.handleLen = 0.12;
  spat.userData.bladeHalfW = 0.028;
  spat.userData.bladeHalfD = 0.02;
}

// ---------- Rich bottles (pivot at mouth = tip-lock) ----------
function makeBottle(bodyCol, neckCol, label, opts = {}) {
  const g = new THREE.Group(); // origin = spout tip
  const h = opts.h || 0.2;
  // faceted / stepped body (richer than plain cylinder)
  const body = mesh(new THREE.CylinderGeometry(0.042, 0.05, h * 0.7, opts.sides || 8), M(bodyCol, { roughness: opts.rough ?? 0.35, metalness: opts.metal ?? 0.15, opacity: opts.opacity ?? 0.94 }));
  body.position.y = -h * 0.45; g.add(body);
  const shoulder = mesh(new THREE.CylinderGeometry(0.028, 0.042, h * 0.12, 10), M(bodyCol, { roughness: 0.35, metalness: opts.metal ?? 0.15, opacity: opts.opacity ?? 0.94 }));
  shoulder.position.y = -h * 0.12; g.add(shoulder);
  // gold collar band
  const collar = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 12), goldMat(30), false, false);
  collar.position.y = -h * 0.08; g.add(collar);
  const neck = mesh(new THREE.CylinderGeometry(0.011, 0.018, 0.045, 8), M(neckCol, { roughness: 0.4, metalness: 0.2 }));
  neck.position.y = -0.02; g.add(neck);
  const lip = mesh(new THREE.TorusGeometry(0.012, 0.0045, 6, 14), goldMat(31));
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.004; g.add(lip);
  // side ribs for geometry richness
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const rib = mesh(new THREE.BoxGeometry(0.006, h * 0.5, 0.008), M(neckCol, { roughness: 0.4, metalness: 0.25 }));
    rib.position.set(Math.cos(a) * 0.048, -h * 0.4, Math.sin(a) * 0.048);
    g.add(rib);
  }
  if (label) {
    const c = document.createElement('canvas'); c.width = 160; c.height = 72;
    const g2 = c.getContext('2d');
    g2.fillStyle = '#1A1410'; g2.fillRect(0, 0, 160, 72);
    g2.strokeStyle = '#D4AF37'; g2.lineWidth = 4; g2.strokeRect(4, 4, 152, 64);
    g2.fillStyle = '#D4AF37'; g2.font = '700 22px Josefin Sans'; g2.textAlign = 'center';
    g2.fillText(label, 80, 44);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const lab = mesh(new THREE.PlaneGeometry(0.07, 0.032), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    lab.position.set(0, -h * 0.42, 0.052); g.add(lab);
  }
  g.userData.spoutLen = 0.02;
  return g;
}
const butterBot = makeBottle('#F5E6A3', '#E8D080', 'BUTTER', { h: 0.16, sides: 10, opacity: 0.96 }); butterBot.visible = false; scene.add(butterBot);
const wineBot = makeBottle('#F5F0E6', '#D4AF37', 'WINE', { h: 0.22, sides: 8, opacity: 0.85, metal: 0.05 }); wineBot.visible = false; scene.add(wineBot);
const brothBot = makeBottle('#8B1E3F', '#5A1428', 'BROTH', { h: 0.2, sides: 6, opacity: 0.95, metal: 0.1 }); brothBot.visible = false; scene.add(brothBot);

function makeStream(color) {
  const g = new THREE.Group();
  const mat = M(color, { roughness: 0.3, opacity: 0.92 });
  const tube = mesh(new THREE.CylinderGeometry(0.007, 0.01, 1, 6), mat);
  tube.visible = false; g.add(tube); g.userData.tube = tube; scene.add(g); return g;
}
const butterStream = makeStream('#F5E6A3');
const wineStream = makeStream('#F5F0E6');
const brothStream = makeStream('#8B1E3F');

function setStream(stream, tip, land, active, thick = 1) {
  const tube = stream.userData.tube;
  if (!active) { tube.visible = false; return; }
  tube.visible = true;
  const dir = land.clone().sub(tip);
  const len = Math.max(0.02, dir.length());
  tube.scale.set(thick, len, thick);
  tube.position.copy(tip.clone().add(land).multiplyScalar(0.5));
  tube.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
}

function tipLockBottle(bottle, stream, cfg, landWorld, tipHover, t, name) {
  const { enter, pour, exit } = cfg;
  const [p0, p1] = pour;
  if (t < enter || t > exit + 0.3) { bottle.visible = false; setStream(stream, V(), V(), false); return 0; }
  bottle.visible = true;
  const tipTarget = landWorld.clone(); tipTarget.y += tipHover;
  const approach = eo(seg(t, enter, enter + 0.65));
  const retreat = 1 - eo(seg(t, exit - 0.45, exit));
  const show = Math.min(approach, retreat);
  // keep bottle body readable in-frame (approach from cam-right, tip above land)
  const side = tipTarget.clone(); side.x += 0.22; side.y += 0.12; side.z += 0.18;
  const tipPos = side.clone().lerp(tipTarget, 0.62 + 0.38 * show);
  bottle.position.copy(tipPos);
  const pourAmt = win(t, p0, p1, 0.15, 0.2);
  bottle.rotation.set(0.55 + pourAmt * 0.55, 0.55, -0.35 - pourAmt * 0.25);
  bottle.updateMatrixWorld(true);
  const tipW = bottle.localToWorld(V(0, 0, 0));
  const land = landWorld.clone();
  // ensure land inside pot rim
  const lx = land.x - POT.x, lz = land.z - POT.z;
  const lr = Math.hypot(lx, lz);
  if (lr > WRIM - 0.04) {
    land.x = POT.x + lx / lr * (WRIM - 0.04);
    land.z = POT.z + lz / lr * (WRIM - 0.04);
  }
  setStream(stream, tipW, land, pourAmt > 0.05, 0.7 + pourAmt * 0.55);
  DBG[name] = { tip: tipW.toArray().map(v => +v.toFixed(3)), land: land.toArray().map(v => +v.toFixed(3)), hover: tipHover, pour: +pourAmt.toFixed(3) };
  DBG.streams[name] = DBG[name];
  return pourAmt;
}

// ---------- Soup crock (plating) ----------
const crockG = new THREE.Group(); scene.add(crockG);
crockG.position.copy(CROCK);
{
  const bowl = mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.12, 24, 1, true), M('#1A1410', { roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
  bowl.position.y = 0.06; crockG.add(bowl);
  const bottom = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 24), M('#1A1410', { roughness: 0.5, metalness: 0.25 }));
  bottom.position.y = 0.008; crockG.add(bottom);
  const rim = mesh(new THREE.TorusGeometry(0.135, 0.01, 8, 28), goldMat(40));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.12; crockG.add(rim);
  const handles = [-1, 1].forEach((s, i) => {
    const h = mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), goldMat(41 + i));
    h.rotation.set(0, 0, Math.PI / 2); h.position.set(s * 0.14, 0.08, 0); crockG.add(h);
  });
}
const crockSoup = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 20), M('#8B1E3F', { roughness: 0.4, opacity: 0.95 }));
crockSoup.position.y = 0.05; crockSoup.visible = false; crockG.add(crockSoup);
const crockSwell = mesh(new THREE.SphereGeometry(0.06, 10, 8), M('#A02848', { roughness: 0.4, opacity: 0.9 }));
crockSwell.scale.set(1.3, 0.3, 1.2); crockSwell.position.y = 0.07; crockSwell.visible = false; crockG.add(crockSwell);

// baguette slices (readable size vs crock)
const baguettes = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group();
  const loaf = mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.09, 12), M(jitterColor('#E8C070', i), { roughness: 0.75 }));
  loaf.rotation.z = Math.PI / 2; g.add(loaf);
  const crust = mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 12), M('#C49040', { roughness: 0.8 }));
  crust.rotation.y = Math.PI / 2; g.add(crust);
  const crumb = mesh(new THREE.CircleGeometry(0.032, 12), M('#F5E6C8', { roughness: 0.85 }));
  crumb.position.x = 0.046; crumb.rotation.y = Math.PI / 2; g.add(crumb);
  crockG.add(g); g.visible = false; baguettes.push(g);
}

// cheese shreds / melt cap
const cheeses = [];
for (let i = 0; i < 10; i++) {
  const g = mesh(new THREE.BoxGeometry(0.025, 0.006, 0.018), M(jitterColor('#E8B84A', i + 90), { roughness: 0.55 }));
  crockG.add(g); g.visible = false; cheeses.push(g);
}
const cheeseMelt = mesh(new THREE.SphereGeometry(0.1, 18, 12), M('#E8B84A', { roughness: 0.35, opacity: 0.95, emissive: '#C49030', ei: 0.08 }));
cheeseMelt.scale.set(1.15, 0.35, 1.1); cheeseMelt.position.y = 0.1; cheeseMelt.visible = false; crockG.add(cheeseMelt);
// bubbling swell blobs (NOT cheese-pull strands)
const cheeseBubbles = [];
for (let i = 0; i < 6; i++) {
  const b = mesh(new THREE.SphereGeometry(0.018 + (i % 3) * 0.006, 10, 8), M(jitterColor('#F0C45A', i + 120), { roughness: 0.32, emissive: '#C49030', ei: 0.05 }));
  crockG.add(b); b.visible = false; cheeseBubbles.push(b);
}
// brown scorch spots on the melt cap
const cheeseSpots = [];
for (let i = 0; i < 8; i++) {
  const s = mesh(new THREE.SphereGeometry(0.018 + (i % 4) * 0.007, 8, 6), M(jitterColor(i % 2 ? '#4A2208' : '#6B3010', i + 130), { roughness: 0.7 }));
  s.scale.set(1.6, 0.22, 1.3);
  crockG.add(s); s.visible = false; cheeseSpots.push(s);
}

// thyme sprigs
const thymes = [];
for (let i = 0; i < 8; i++) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.04, 4), M('#0F6B4C', { roughness: 0.7 }));
  g.add(stem);
  for (let j = 0; j < 5; j++) {
    const leaf = mesh(new THREE.SphereGeometry(0.006, 5, 4), M(jitterColor('#2E8B57', i * 5 + j), { roughness: 0.65 }));
    leaf.scale.set(1.4, 0.4, 0.8);
    leaf.position.set((j % 2 ? 0.008 : -0.008), -0.015 + j * 0.008, 0);
    g.add(leaf);
  }
  crockG.add(g); g.visible = false; thymes.push(g);
}

// steam
const steamTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(245,240,230,.85)'); gr.addColorStop(1, 'rgba(245,240,230,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const steam = [];
for (let i = 0; i < 10; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
  scene.add(s); steam.push(s);
}

// ---------- Camera (high 3/4, never pure top-down) ----------
const KEYS = [
  [0.0,   [0.05, 0.18, 0.04], 38, 42, 2.7],
  [3.5,   [-0.35, 0.14, 0.08], 48, 40, 2.1],
  [18.0,  [0.0, 0.16, 0.02], 32, 44, 2.15],
  [32.0,  [0.0, 0.18, 0.02], 28, 46, 1.95],
  [55.0,  [0.05, 0.2, 0.02], 34, 44, 1.85],
  [78.0,  [0.35, 0.16, 0.05], 42, 42, 2.05],
  [91.0,  [0.45, 0.18, 0.05], 30, 46, 1.75],
  [100.0, [0.4, 0.2, 0.04], 26, 48, 1.6],
  [115.0, [0.15, 0.18, 0.03], 36, 44, 2.0],
];
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const p = eio(seg(t, a[0], b[0]));
  const tgt = V(lerp(a[1][0], b[1][0], p), lerp(a[1][1], b[1][1], p), lerp(a[1][2], b[1][2], p));
  const yaw = lerp(a[2], b[2], p) * Math.PI / 180;
  const pitch = lerp(a[3], b[3], p) * Math.PI / 180;
  const dist = lerp(a[4], b[4], p);
  const eye = V(
    tgt.x + Math.cos(pitch) * Math.sin(yaw) * dist,
    tgt.y + Math.sin(pitch) * dist,
    tgt.z + Math.cos(pitch) * Math.cos(yaw) * dist
  );
  eye.x += Math.sin(t * 0.85) * 0.005; eye.y += Math.cos(t * 0.65) * 0.003;
  cam.position.copy(eye); cam.lookAt(tgt);
  cam.setViewOffset(W, H, 0, 95, W, H);
  key.target.position.copy(tgt); key.position.set(tgt.x + 1.8, tgt.y + 3.2, tgt.z + 1.4);
}

function foodTopY(t) {
  let y = FOOD_BASE + 0.015;
  if (t >= E.butter.pour[0]) y = Math.max(y, FOOD_BASE + 0.025);
  if (t >= E.onion_drop.start) y = Math.max(y, FOOD_BASE + 0.045);
  if (t >= E.stir1[0]) y = Math.max(y, FOOD_BASE + 0.055);
  if (t >= E.wine.pour[0]) y = Math.max(y, FOOD_BASE + 0.06);
  if (t >= E.broth.pour[0]) y = Math.max(y, FOOD_BASE + 0.075);
  return y;
}

function placeSpat(t, a, b) {
  const v = win(t, a - 0.25, b + 0.15, 0.25, 0.25);
  spat.visible = v > 0.02;
  if (v <= 0.02) return;
  const ph = (t - a) * TAU * STIR_HZ;
  const halfW = spat.userData.bladeHalfW;
  const halfD = spat.userData.bladeHalfD;
  const rMax = WRIM - halfW - 0.05;
  let px = 0.05 * Math.cos(ph), pz = 0.04 * Math.sin(ph);
  let rTip = Math.hypot(px, pz) || 0.001;
  if (rTip > rMax) { px *= rMax / rTip; pz *= rMax / rTip; rTip = rMax; }
  const ft = foodTopY(t);
  const tipY = Math.max(surfY(rTip) + 0.04, ft + 0.038);
  spat.position.set(px, tipY + (1 - eo(v)) * 0.05, pz);
  const n = V(0, 1, 0);
  const h = V(px / rTip, 0, pz / rTip);
  const zA = h.clone();
  const xA = n.clone().cross(zA).normalize();
  const yA = zA.clone().cross(xA).normalize();
  spat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
  spat.rotateX(0);
  spat.updateMatrixWorld(true);
  // radial clamp samples
  const samples = [V(0, 0, 0), V(halfW, 0, 0), V(-halfW, 0, 0), V(0, 0, halfD), V(0, 0, -halfD), V(0, 0.1, 0.04)];
  let maxOff = 0;
  for (const lp of samples) {
    const w = spat.localToWorld(lp.clone());
    maxOff = Math.max(maxOff, Math.hypot(w.x - POT.x - spat.position.x, w.z - POT.z - spat.position.z));
  }
  let rNow = Math.hypot(spat.position.x, spat.position.z) || 0.001;
  const tipCap = Math.max(0.008, WRIM - halfW - 0.04 - maxOff * 0.3);
  if (rNow > tipCap) {
    spat.position.x *= tipCap / rNow;
    spat.position.z *= tipCap / rNow;
    rNow = tipCap;
  }
  spat.position.y = Math.max(spat.position.y, surfY(rNow) + 0.045, ft + 0.036);
  spat.updateMatrixWorld(true);
  spat.userData.foodTop = ft;
  spat.userData.bladeY = spat.position.y;
  const endW = spat.localToWorld(V(0, 0.02, spat.userData.handleLen));
  DBG.spatula = {
    tip: [+spat.position.x.toFixed(3), +spat.position.y.toFixed(3), +spat.position.z.toFixed(3)],
    foodTop: +ft.toFixed(3), endY: +endW.y.toFixed(3), r: +rNow.toFixed(3)
  };
}

function pushFromSpat(item, strength = 0.35) {
  if (!spat.visible) return;
  const sx = spat.position.x, sz = spat.position.z;
  const dx = item.g.position.x - sx, dz = item.g.position.z - sz;
  const d = Math.hypot(dx, dz);
  const rad = 0.055;
  if (d < rad && d > 1e-4) {
    item.g.position.x += (dx / d) * (rad - d) * strength;
    item.g.position.z += (dz / d) * (rad - d) * strength;
    const rr = Math.hypot(item.g.position.x, item.g.position.z);
    const maxR = WRIM - 0.04;
    if (rr > maxR) { item.g.position.x *= maxR / rr; item.g.position.z *= maxR / rr; }
  }
  // never let food Y enter blade
  const ft = spat.userData.foodTop || foodTopY(0);
  item.g.position.y = Math.min(item.g.position.y, spat.userData.bladeY - 0.02);
  item.g.position.y = Math.max(item.g.position.y, ft - 0.02);
}

function update(t) {
  // pot bounce-in (empty)
  const pi = back(seg(t, E.pot_in, E.pot_in + 0.7));
  potG.scale.setScalar(0.15 + 0.85 * pi);
  potG.visible = t >= E.pot_in - 0.05;

  // board in
  const bi = back(seg(t, E.board_in, E.board_in + 0.55));
  boardG.scale.setScalar(0.2 + 0.8 * bi);
  boardG.visible = t >= E.board_in - 0.05;

  // crock always present but small until plating
  const ci = t < E.ladle[0] ? 0.55 : back(seg(t, E.ladle[0], E.ladle[0] + 0.6));
  crockG.scale.setScalar(t < E.ladle[0] ? 0.7 : 0.7 + 0.3 * ci);

  // --- CUT ONIONS ---
  const oc = E.onion_cut;
  onionSlices.forEach((g, i) => {
    const tCut = oc.start + i * oc.gap;
    if (t < tCut) { g.visible = false; return; }
    g.visible = true;
    const fly = clamp((t - tCut) / 0.25);
    g.position.set(-0.12 + (i % 4) * 0.07, 0.04 + (1 - eo(fly)) * 0.02, 0.04 + Math.floor(i / 4) * 0.06);
    g.rotation.set(0.1, i * 0.4, 0.05);
    g.scale.setScalar(lerp(0.4, 1, eo(fly)));
  });
  // whole onions shrink as cut
  onionsBoard.forEach((g, i) => {
    const done = clamp((t - (oc.start + i * 2.5)) / 3);
    g.scale.setScalar(Math.max(0.15, 1 - done * 0.7));
    if (done > 0.95) g.visible = false;
    else g.visible = t < E.onion_drop.start + 1;
  });
  // knife stroke — blade plane = cut plane, edge down, visible cut line
  if (t >= oc.start && t <= oc.start + oc.count * oc.gap + 0.5) {
    knife.visible = true;
    let iStroke = Math.min(oc.count - 1, Math.floor((t - oc.start) / oc.gap));
    const localT = (t - oc.start - iStroke * oc.gap) / oc.stroke;
    const press = Math.sin(clamp(localT) * Math.PI);
    const kx = -0.1 + (iStroke % 4) * 0.07;
    const kz = 0.05 + Math.floor(iStroke / 4) * 0.05;
    knife.position.set(kx, 0.095 - press * 0.062, kz);
    knife.rotation.set(0.0, 0.12, 0.0); // vertical blade, slight yaw along cut
    cutGroove.visible = press > 0.08;
    cutGroove.position.set(kx + 0.04, 0.0312, kz);
    cutGroove.scale.set(0.45 + 0.7 * press, 1, 1.2);
    cutPlane.visible = press > 0.15;
    cutPlane.position.set(kx + 0.04, 0.055, kz);
    cutPlane.scale.set(0.7 + 0.4 * press, 0.5 + 0.6 * press, 1);
  } else {
    knife.visible = t >= oc.start - 0.3 && t < E.butter.enter;
    cutGroove.visible = false; cutPlane.visible = false;
    if (knife.visible) { knife.position.set(0.12, 0.06, 0.08); knife.rotation.set(0.15, 0.7, 0.35); }
  }

  const ft = foodTopY(t);

  // --- BUTTER pour tip-lock (BEFORE onions) ---
  const butterLand = potG.localToWorld(V(0.02, ft + 0.02, 0.01));
  const butterAmt = tipLockBottle(butterBot, butterStream, E.butter, butterLand, 0.13, t, 'butter') || 0;
  if (t >= E.butter.pour[0]) {
    const bp = eo(seg(t, E.butter.pour[0], E.butter.pour[1]));
    butterPool.visible = bp > 0.08;
    butterPool.scale.set(0.35 + 0.75 * bp, 1, 0.35 + 0.75 * bp); // spread XY, keep thin Y
    butterPool.position.y = FOOD_BASE + 0.0022;
    butterSlicks.forEach((s, i) => {
      s.visible = bp > 0.2;
      const k = clamp((bp - 0.15) / 0.85);
      s.scale.set(1.2 + 0.5 * k, 0.07, 1.1 + 0.35 * k);
      s.position.y = FOOD_BASE + 0.003;
      s.rotation.y = i + t * 0.05;
    });
  }

  // --- ONIONS drop into pot (AFTER butter) ---
  onionsPot.forEach((item, i) => {
    const cfg = E.onion_drop;
    const tIn = cfg.start + i * cfg.gap;
    const landT = tIn + cfg.fall;
    if (t < tIn) { item.g.visible = false; return; }
    item.g.visible = true;
    const fly = clamp((t - tIn) / cfg.fall);
    let y = lerp(ft + 0.35, ft + 0.01, eo(fly));
    let x = Math.cos(item.ang) * item.rad;
    let z = Math.sin(item.ang) * item.rad;
    // caramelize: tumble / flip while stirring (keep inside rim)
    if (t >= E.stir1[0]) {
      const ph = (t - E.stir1[0]) * TAU * STIR_HZ;
      const spin = 0.65 + 0.35 * ((i % 3) / 2);
      const a = item.ang + ph * spin;
      const wob = 0.018 * Math.sin(ph * 2.2 + i);
      let rr = clamp(item.rad * (0.35 + 0.65 * (0.5 + 0.5 * Math.cos(ph * 0.7 + i))) + wob, 0.018, WRIM - 0.05);
      x = Math.cos(a) * rr;
      z = Math.sin(a) * rr;
      y = ft + 0.01 + 0.016 * Math.abs(Math.sin(ph * 1.8 + i * 0.7)); // flip lift
      item.g.rotation.set(ph * 1.4 + i * 0.5, a, ph * 0.85 + 0.2);
    } else {
      item.g.rotation.set(0.2, item.ang, 0.1);
    }
    item.g.position.set(x, y, z);
    item.g.scale.setScalar(t < landT ? lerp(0.3, item.s, eo(fly)) : item.s);
    if (t >= E.stir1[0] && t <= E.stir1[1]) pushFromSpat(item, 0.4);
    // sink slightly when broth fills
    if (t >= E.broth.pour[0]) {
      const sink = eo(seg(t, E.broth.pour[0], E.broth.pour[1]));
      item.g.position.y = lerp(y, FOOD_BASE + 0.02, sink * 0.7);
      item.g.scale.setScalar(item.s * (1 - 0.3 * sink));
    }
  });

  // salt drop
  salts.forEach((p, i) => {
    const cfg = E.salt;
    const tIn = cfg.start + i * cfg.gap;
    if (t < tIn) { p.visible = false; return; }
    p.visible = true;
    const ang = K.hash(i + 20) * TAU;
    const rad = 0.03 + K.hash(i + 21) * 0.1;
    const fly = clamp((t - tIn) / cfg.fall);
    p.position.set(Math.cos(ang) * rad, lerp(ft + 0.3, ft + 0.015, eo(fly)), Math.sin(ang) * rad);
  });

  // spatula stir during caramelize
  if (t >= E.stir1[0] && t <= E.stir1[1] + 0.3) placeSpat(t, E.stir1[0], E.stir1[1]);
  else spat.visible = false;

  // --- WINE tip-lock ---
  const wineLand = potG.localToWorld(V(-0.04, ft + 0.02, 0.03));
  tipLockBottle(wineBot, wineStream, E.wine, wineLand, 0.14, t, 'wine');

  // --- BROTH tip-lock ---
  const brothLand = potG.localToWorld(V(0.03, ft + 0.022, -0.02));
  const brothAmt = tipLockBottle(brothBot, brothStream, E.broth, brothLand, 0.14, t, 'broth') || 0;
  if (t >= E.broth.pour[0]) {
    const bp = eo(seg(t, E.broth.pour[0], E.broth.pour[1]));
    brothG.visible = bp > 0.1;
    brothBody.scale.set(0.5 + 0.5 * bp, 0.6 + 0.4 * bp, 0.5 + 0.5 * bp);
    brothBody.position.y = FOOD_BASE + 0.02 + 0.025 * bp;
    brothSwells.forEach((s, i) => {
      s.position.y = FOOD_BASE + 0.04 + 0.02 * bp + 0.008 * Math.sin(t * 2 + i);
      s.scale.set(1.2 + 0.3 * bp, 0.3 + 0.15 * bp, 1.1 + 0.2 * bp);
    });
  } else {
    brothG.visible = false;
  }

  // hide pot contents somewhat when plating (ladle)
  if (t >= E.ladle[0]) {
    const fade = eo(seg(t, E.ladle[0], E.ladle[1]));
    crockSoup.visible = fade > 0.15;
    crockSoup.scale.set(0.5 + 0.5 * fade, 0.5 + 0.5 * fade, 0.5 + 0.5 * fade);
    crockSwell.visible = fade > 0.3;
  }

  // baguette onto crock
  baguettes.forEach((g, i) => {
    const cfg = E.baguette;
    const tIn = cfg.start + i * cfg.gap;
    if (t < tIn) { g.visible = false; return; }
    g.visible = true;
    const fly = clamp((t - tIn) / cfg.fall);
    const ang = (i / 4) * TAU * 0.7 - 0.4;
    const hx = Math.cos(ang) * 0.04, hz = Math.sin(ang) * 0.03;
    const hy = 0.085;
    g.position.set(hx, lerp(hy + 0.35, hy, eo(fly)), hz);
    g.rotation.set(0.15, ang, lerp(0.5, 0.1, eo(fly)));
    g.scale.setScalar(lerp(0.5, 1.15, eo(fly))); // readable vs crock
  });

  // cheese shreds then melt
  cheeses.forEach((g, i) => {
    const cfg = E.cheese;
    const tIn = cfg.start + i * cfg.gap;
    if (t < tIn || t >= E.broil[0] + 1.5) { g.visible = false; return; }
    g.visible = true;
    const fly = clamp((t - tIn) / cfg.fall);
    const ang = K.hash(i + 50) * TAU;
    const rad = K.hash(i + 51) * 0.07;
    g.position.set(Math.cos(ang) * rad, lerp(0.35, 0.1, eo(fly)), Math.sin(ang) * rad);
    g.rotation.set(K.hash(i), ang, 0.2);
  });
  if (t >= E.broil[0]) {
    const mu = eo(seg(t, E.broil[0], E.broil[1]));
    const bub = 0.035 * Math.sin(t * 7.5) * mu;
    cheeseMelt.visible = mu > 0.1;
    cheeseMelt.scale.set(0.65 + 0.55 * mu, 0.18 + 0.22 * mu + bub, 0.6 + 0.5 * mu);
    cheeseMelt.position.y = 0.092 + 0.012 * mu + bub * 0.4;
    cheeseMelt.material.emissiveIntensity = 0.06 + 0.22 * mu;
    cheeseBubbles.forEach((b, i) => {
      b.visible = mu > 0.25;
      const ang = i * 1.1 + t * 0.4;
      const rad = 0.03 + (i % 3) * 0.022;
      const lift = 0.02 * Math.abs(Math.sin(t * 5 + i * 1.3)) * mu;
      b.position.set(Math.cos(ang) * rad, 0.105 + 0.02 * mu + lift, Math.sin(ang) * rad);
      b.scale.setScalar(0.5 + 0.7 * mu + 0.15 * Math.sin(t * 6 + i));
    });
    cheeseSpots.forEach((s, i) => {
      s.visible = mu > 0.35;
      const ang = K.hash(i + 140) * TAU;
      const rad = 0.02 + K.hash(i + 141) * 0.07;
      s.position.set(Math.cos(ang) * rad, 0.11 + 0.018 * mu + 0.006 * Math.sin(t * 4 + i), Math.sin(ang) * rad);
      s.scale.set(1.1 + 0.4 * mu, 0.25 + 0.1 * mu, 1.0 + 0.3 * mu);
    });
  }

  // thyme garnish
  thymes.forEach((g, i) => {
    const cfg = E.thyme;
    const tIn = cfg.start + i * cfg.gap;
    if (t < tIn) { g.visible = false; return; }
    g.visible = true;
    const fly = clamp((t - tIn) / cfg.fall);
    const ang = K.hash(i + 80) * TAU;
    const rad = 0.03 + K.hash(i + 81) * 0.06;
    g.position.set(Math.cos(ang) * rad, lerp(0.4, 0.12, eo(fly)), Math.sin(ang) * rad);
    g.rotation.set(0.3, ang, 0.2);
    g.scale.setScalar(lerp(0.4, 1.2, eo(fly)));
  });

  // steam during stir / broil / hero
  const steamOn = (t > E.stir1[0] && t < E.stir1[1]) || (t > E.broth.pour[0] && t < E.ladle[1]) || (t > E.broil[0] && t < E.card);
  steam.forEach((s, i) => {
    if (!steamOn) { s.material.opacity = 0; return; }
    const base = t > E.ladle[0] ? CROCK : POT;
    const u = ((t * 0.35 + i * 0.17) % 1);
    s.position.set(base.x + Math.sin(i + t) * 0.08, base.y + 0.2 + u * 0.35, base.z + Math.cos(i * 1.3) * 0.06);
    s.scale.setScalar(0.08 + u * 0.12);
    s.material.opacity = steamOn ? (0.35 * (1 - u)) : 0;
  });

  // idle deco
  sunG.rotation.z = Math.sin(t * 0.08) * 0.02;
  island.rotation.y = Math.sin(t * 0.1) * 0.015;
  camAt(t);
}

function decoPanel(ctx, x, y, w, h, r) {
  ctx.fillStyle = 'rgba(26,20,16,.92)';
  K.rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 3;
  K.rr(ctx, x + 2, y + 2, w - 4, h - 4, r - 2); ctx.stroke();
  ctx.strokeStyle = '#6F5220'; ctx.lineWidth = 1.5;
  K.rr(ctx, x + 6, y + 6, w - 12, h - 12, r - 4); ctx.stroke();
}

function safeRecipeCard(t, t0) {
  const T = K.theme, a = eo(seg(t, t0, t0 + 0.8)); if (a <= 0) return;
  const R = TL.recipe;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,8,6,.55)'; ctx.fillRect(0, 0, W, H);
  const x = 80, w = W - 160, y = 160, h = 1400;
  decoPanel(ctx, x, y, w, h, 28);
  ctx.textAlign = 'center';
  ctx.fillStyle = T.a1; ctx.font = `700 26px ${T.fontEn}`;
  ctx.fillText('FULL RECIPE · 完整配方', W / 2, y + 52);
  K.title(ctx, TL.dish.zh, W / 2, y + 120, 72, T.a1, T.fontZh, { maxW: w - 80 });
  ctx.fillStyle = T.ink; K.fitText(ctx, TL.dish.en.toUpperCase(), W / 2, y + 168, 34, w - 80, T.fontEn, '700');
  ctx.fillStyle = T.ink; K.fitText(ctx, `${TL.dish.time} · ${TL.dish.servings} 人份 · ${TL.dish.cuisine}`, W / 2, y + 208, 22, w - 80, T.fontUi, '600');
  ctx.fillStyle = T.a1; K.fitText(ctx, '动画已浓缩，非实际烹饪时长', W / 2, y + 236, 20, w - 80, T.fontZh, '700');
  let yy = y + 270; ctx.textAlign = 'left';
  ctx.fillStyle = T.a3; ctx.font = `900 28px ${T.fontZh}`; ctx.fillText('食材  INGREDIENTS', x + 36, yy); yy += 10;
  R.ingredients.forEach((r, i) => {
    const ry = yy + 16 + i * 44;
    const ri = eo(seg(t, t0 + 0.35 + i * 0.04, t0 + 0.65 + i * 0.04));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = i % 2 ? 'rgba(212,175,55,.12)' : 'rgba(139,30,63,.12)';
    K.rr(ctx, x + 28, ry - 4, w - 56, 38, 10); ctx.fill();
    ctx.fillStyle = T.ink; ctx.font = `900 22px ${T.fontZh}`; ctx.fillText(r[0], x + 44, ry + 24);
    ctx.fillStyle = T.muted; K.fitText(ctx, r[1], x + 220, ry + 24, 18, 280, T.fontUi, '600');
    ctx.textAlign = 'right'; ctx.fillStyle = T.a1; K.fitText(ctx, r[2], x + w - 44, ry + 24, 20, 200, T.fontUi, '700');
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = a; yy += 16 + R.ingredients.length * 44 + 16;
  ctx.fillStyle = T.a3; ctx.font = `900 28px ${T.fontZh}`; ctx.fillText('步骤  STEPS', x + 36, yy); yy += 8;
  R.steps.forEach((s, i) => {
    const ry = yy + 12 + i * 70;
    const ri = eo(seg(t, t0 + 0.8 + i * 0.07, t0 + 1.1 + i * 0.07));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = T.a1; ctx.beginPath(); ctx.arc(x + 58, ry + 22, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = T.paper; ctx.font = `700 18px ${T.fontEn}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + 58, ry + 28);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, s[0], x + 92, ry + 18, 22, w - 140, T.fontZh, '700');
    ctx.fillStyle = T.muted; K.fitText(ctx, s[1], x + 92, ry + 44, 18, w - 140, T.fontUi, '500');
  });
  ctx.restore();
}

function overlay(t) {
  const T = K.theme;
  const ia = 1 - seg(t, 3.2, 3.9);
  if (ia > 0) {
    ctx.save(); ctx.globalAlpha = ia;
    const e = back(seg(t, 0.25, 1.0)), e2 = back(seg(t, 0.7, 1.4));
    decoPanel(ctx, 90, 260, W - 180, 430, 28);
    ctx.textAlign = 'center'; ctx.fillStyle = T.a1; ctx.font = `700 28px ${T.fontEn}`;
    ctx.fillText(`${T.brand} · EP ${String(TL.episode).padStart(2, '0')}`, W / 2, 318);
    ctx.save(); ctx.translate(W / 2, 430); ctx.scale(e, e);
    K.title(ctx, TL.dish.zh, 0, 0, 100, T.a1, T.fontZh, { maxW: 820 }); ctx.restore();
    ctx.save(); ctx.translate(W / 2, 510); ctx.scale(e2, e2);
    ctx.fillStyle = T.ink; K.fitText(ctx, TL.dish.en.toUpperCase(), 0, 0, 36, 820, T.fontEn, '700'); ctx.restore();
    ctx.globalAlpha = ia * seg(t, 1.5, 2.1);
    decoPanel(ctx, 140, 560, W - 280, 54, 20);
    ctx.fillStyle = T.a1; ctx.textAlign = 'center';
    K.fitText(ctx, '慢炒焦糖洋葱 + 焗芝士', W / 2, 596, 28, W - 320, T.fontZh, '800');
    decoPanel(ctx, 160, 630, W - 320, 44, 16);
    ctx.fillStyle = T.ink;
    K.fitText(ctx, `${TL.dish.time} · ${TL.dish.servings} 人份 · 动画已浓缩非实际时长`, W / 2, 660, 22, W - 360, T.fontUi, '700');
    ctx.restore();
  }
  // symmetric arch wipe between beats
  [[18, '#D4AF37'], [32, '#C47A3A'], [55, '#F5F0E6'], [78, '#8B1E3F'], [98, '#0F6B4C']].forEach(([tw, col]) => {
    const a = win(t, tw, tw + 0.45, 0.05, 0.12);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a * 0.4;
      const ww = (W / 2) * eio(seg(t, tw, tw + 0.4));
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, ww, H);
      ctx.fillRect(W - ww, 0, ww, H);
      ctx.restore();
    }
  });
  K.hud(ctx, t, W);
  const fa = win(t, E.done, E.card + 0.5, 0.45, 0.35);
  if (fa > 0) {
    ctx.save(); ctx.globalAlpha = fa;
    const e = back(seg(t, E.done + 0.08, E.done + 0.7));
    ctx.save(); ctx.translate(W / 2, 420); ctx.scale(e, e); ctx.rotate(-0.02);
    K.title(ctx, '完成！DONE!', 0, 0, 96, T.a1, T.fontZh, { maxW: 900 }); ctx.restore();
    ctx.globalAlpha = fa * seg(t, E.done + 0.5, E.done + 1.0);
    decoPanel(ctx, 140, 1480, W - 280, 80, 28);
    ctx.fillStyle = T.ink; ctx.textAlign = 'center';
    K.fitText(ctx, `${TL.dish.zh} · ${TL.dish.en}`, W / 2, 1532, 34, W - 340, T.fontZh, '900');
    ctx.restore();
  }
  safeRecipeCard(t, E.card);
  const f = Math.min(seg(t, 0, 0.35), 1 - seg(t, TL.duration - 0.5, TL.duration));
  if (f < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - f})`; ctx.fillRect(0, 0, W, H); }
}

window.render = function (t) {
  update(t);
  R3.render(scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.drawImage(R3.domElement, 0, 0, W, H);
  // art-deco grade: warm lacquer wash + gold soft-light
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // vignette
  const grd = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.18, W / 2, H * 0.42, H * 0.78);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(10,8,6,0.45)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  overlay(t);
  window.__dbg = JSON.parse(JSON.stringify(DBG));
};
(async () => { await K.loadFonts(); render(0); window.ready = true; })();
