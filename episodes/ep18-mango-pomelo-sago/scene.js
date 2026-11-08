// EP18 港式杨枝甘露 — impasto-3d (lemo-opuscar palette-knife)
// Thick-paint 3D kitchen; tip-lock kettle/coco/evap/pitcher; mango cheeks = thick yellow
// flesh only (complete flat pit stays in the centre); small sago; cook: stir → check
// hard cores → cover/simmer → rinse/drain; milk stream follows spout + short arc.
// HUD SAFE x 70–1010, y 150–1600. Pure function of t; no Math.random / Date / performance.now.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const K = kit, E = TL.ev, W = 1080, H = 1920, TAU = Math.PI * 2;
const { clamp, lerp, seg, eio, eo, ei, ss, back, win } = K;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DBG = { streams: {} };

K.setTheme({
  style: 'flat',
  ink: '#3D2B1F', paper: '#F7E8C8', a1: '#E8922A', a2: '#E07A6A', a3: '#2F6B4F', a4: '#F4B942',
  brand: 'IMPASTO KITCHEN', brandZh: '厚涂厨房',
  fontEn: '"Cormorant Garamond", "Libre Baskerville", serif',
  fontUi: '"Libre Baskerville", "Noto Sans CJK SC", serif',
  fontZh: '"ZCOOL XiaoWei", "Noto Sans CJK SC", serif',
  muted: 'rgba(61,43,31,.58)', outline: 0, shadow: 0
});
K.HUD_TOP = 190;

const BOARD = V(-0.42, 0.0, 0.06);
const POT = V(-0.02, 0.0, 0.02);
const GLASS = V(0.42, 0.0, 0.06);
const PITCHER_SPOUT = V(0.20, 0.205, 0.05);
const BOARD_TOP = 0.022;

const R3 = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.NeutralToneMapping; R3.toneMappingExposure = 1.08;
R3.outputColorSpace = THREE.SRGBColorSpace;
R3.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#CDB892');
scene.fog = new THREE.Fog('#C4B089', 7.0, 14);
const cam = new THREE.PerspectiveCamera(38, W / H, 0.01, 30);
const out = document.getElementById('c'), ctx = out.getContext('2d');

// ---------- palette-knife normal (elongated ridges, not Van Gogh swirl) ----------
function knifeNM() {
  const s = 256, d = new Uint8Array(s * s * 4), rnd = K.rng(9041);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * 4;
    const r1 = Math.sin(x * 0.19 + y * 0.04) * 0.55;
    const r2 = Math.sin(x * 0.06 - y * 0.17) * 0.32;
    const r3 = Math.sin((x * 0.85 + y * 0.12) * 0.28) * 0.22;
    const ridge = Math.pow(Math.abs(Math.sin(x * 0.12 + y * 0.028)), 10) * 0.65;
    const n = r1 + r2 + r3 + ridge + (rnd() - 0.5) * 0.12;
    d[i] = clamp(128 + n * 72, 0, 255) | 0;
    d[i + 1] = clamp(128 + (r2 - r1) * 48, 0, 255) | 0;
    d[i + 2] = clamp(196 + n * 44, 0, 255) | 0;
    d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, s, s);
  t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  return t;
}
const KNM = knifeNM();

function impasto(color, o = {}) {
  const ns = o.ns ?? 0.62;
  return new THREE.MeshStandardMaterial({
    color, roughness: o.roughness ?? 0.78, metalness: o.metalness ?? 0,
    normalMap: o.flat ? null : KNM,
    normalScale: new THREE.Vector2(ns, ns),
    transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1,
    side: o.side || THREE.FrontSide,
    emissive: o.emissive || '#000000', emissiveIntensity: o.ei || 0,
    flatShading: false
  });
}
function jitterColor(hex, seed, amt = 0.05) {
  const c = new THREE.Color(hex);
  c.offsetHSL((K.hash(seed) - 0.5) * 0.015, (K.hash(seed + 1) - 0.5) * 0.04, (K.hash(seed + 2) - 0.5) * amt);
  return c;
}
function mesh(geo, mat, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m;
}
function wavyCyl(rt, rb, h, seg, seed, amp = 0.01) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 3);
  const p = g.attributes.position;
  const top = h / 2 - 1e-5;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > top * 0.55) {
      const x = p.getX(i), z = p.getZ(i);
      const w = amp * Math.sin(x * 26 + seed) * Math.cos(z * 22 + seed * 0.7)
        + amp * 0.45 * Math.sin(x * 11 - z * 17 + seed);
      p.setY(i, y + w);
    }
  }
  g.computeVertexNormals();
  return g;
}
function labelTex(text, bg, fg, w = 256, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 42px "Libre Baskerville", serif';
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- raking warm key, cool shadow ----------
scene.add(new THREE.AmbientLight('#e8d9b8', 0.32));
scene.add(new THREE.HemisphereLight('#F7E8C8', '#4A5A6A', 0.48));
const key = new THREE.DirectionalLight('#FFE6B0', 1.72);
key.position.set(3.4, 2.35, 1.15); key.castShadow = true;
key.shadow.mapSize.set(1536, 1536);
Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.2, far: 12 });
key.shadow.bias = -0.00035; key.shadow.normalBias = 0.025; key.shadow.radius = 2.4;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#4A5A6A', 0.38); fill.position.set(-2.4, 1.3, -1.3); scene.add(fill);
const bounce = new THREE.DirectionalLight('#E8922A', 0.22); bounce.position.set(0.2, 0.35, 2.1); scene.add(bounce);
const rim = new THREE.DirectionalLight('#F7E8C8', 0.28); rim.position.set(-0.4, 2.2, -2.4); scene.add(rim);

// ---------- studio set: calm canvas planes + broken-colour table ----------
const island = new THREE.Group(); scene.add(island);
// table top — large calm wood planes (not busy tiles)
[[0, 0, 2.4, 0.05, 1.5, '#C4A066'], [0, 0.028, 2.35, 0.012, 1.44, '#D4B078']].forEach(([x, y, sx, sy, sz, col], i) => {
  const p = mesh(new THREE.BoxGeometry(sx, sy, sz), impasto(jitterColor(col, 10 + i, 0.04), { roughness: 0.88, ns: 0.4 }));
  p.position.set(x, y, 0); island.add(p);
});
// a few broad knife-stroke inlays (value planes, not noise)
[[-0.7, 0.036, 0.55, 0.22, '#B08A50'], [0.15, 0.036, 0.7, 0.18, '#C9A068'], [0.75, 0.036, 0.4, 0.2, '#A07840']].forEach(([x, z, sx, sz, col], i) => {
  const s = mesh(new THREE.BoxGeometry(sx, 0.006, sz), impasto(jitterColor(col, 20 + i, 0.03), { roughness: 0.9, ns: 0.35 }), false, true);
  s.position.set(x, 0.036, z); island.add(s);
});
// back wall — large calm canvas blocks
const wall = mesh(new THREE.BoxGeometry(3.2, 1.8, 0.06), impasto('#E8D9B8', { roughness: 0.92, ns: 0.28 }), false, true);
wall.position.set(0, 0.92, -1.05); island.add(wall);
const wallBand = mesh(new THREE.BoxGeometry(3.2, 0.38, 0.04), impasto('#D4C09A', { roughness: 0.9, ns: 0.25 }), false, true);
wallBand.position.set(0, 1.35, -1.02); island.add(wallBand);
const umberBlock = mesh(new THREE.BoxGeometry(0.9, 0.7, 0.03), impasto('#6A4A32', { roughness: 0.88, ns: 0.3 }), false, true);
umberBlock.position.set(-0.95, 0.72, -1.01); island.add(umberBlock);
const coolBlock = mesh(new THREE.BoxGeometry(0.55, 0.85, 0.03), impasto('#7A8890', { roughness: 0.86, ns: 0.28 }), false, true);
coolBlock.position.set(1.05, 0.78, -1.01); island.add(coolBlock);
// raking window light plane (left)
const winLight = mesh(new THREE.BoxGeometry(0.04, 1.1, 0.7), impasto('#F7E8C8', { roughness: 0.45, emissive: '#FFE6B0', ei: 0.35, ns: 0.15 }), false, false);
winLight.position.set(-1.45, 0.95, -0.15); island.add(winLight);
const winFrame = mesh(new THREE.BoxGeometry(0.06, 1.2, 0.8), impasto('#3D2B1F', { roughness: 0.8, ns: 0.3 }), false, false);
winFrame.position.set(-1.48, 0.95, -0.15); island.add(winFrame);
// leaf plant
{
  const pot = mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 10), impasto('#8A4A32', { roughness: 0.82, ns: 0.5 }));
  pot.position.set(1.05, 0.09, -0.55); island.add(pot);
  for (let i = 0; i < 8; i++) {
    const leaf = mesh(new THREE.SphereGeometry(0.055, 8, 6), impasto(jitterColor(i % 2 ? '#2F6B4F' : '#3D7A5C', 40 + i, 0.04), { roughness: 0.86, ns: 0.45 }));
    leaf.scale.set(0.35, 1.35, 0.18);
    const a = (i / 8) * TAU;
    leaf.position.set(1.05 + Math.cos(a) * 0.03, 0.22 + (i % 3) * 0.04, -0.55 + Math.sin(a) * 0.03);
    leaf.rotation.set(Math.sin(a) * 0.45, a, Math.cos(a) * 0.3);
    island.add(leaf);
  }
}
// palette knife set dressing
{
  const pk = new THREE.Group();
  const blade = mesh(new THREE.BoxGeometry(0.09, 0.003, 0.028), impasto('#C8C2B4', { roughness: 0.32, metalness: 0.55, ns: 0.2 }));
  blade.position.set(0.04, 0, 0); pk.add(blade);
  const hdl = mesh(new THREE.BoxGeometry(0.07, 0.012, 0.016), impasto('#5A3A22', { roughness: 0.78, ns: 0.4 }));
  hdl.position.set(-0.045, 0.002, 0); pk.add(hdl);
  pk.position.set(0.95, 0.05, 0.35); pk.rotation.set(0, 0.6, 0.15); island.add(pk);
}

// ---------- cutting board ----------
const boardG = new THREE.Group(); scene.add(boardG);
boardG.position.copy(BOARD);
{
  const wood = mesh(new RoundedBoxGeometry(0.42, 0.028, 0.30, 3, 0.012), impasto('#6B4224', { roughness: 0.84, ns: 0.48 }));
  wood.position.y = 0.014; boardG.add(wood);
  const stripe = mesh(new THREE.BoxGeometry(0.40, 0.004, 0.04), impasto('#8A5A30', { roughness: 0.8, ns: 0.35 }), false, true);
  stripe.position.set(0, 0.029, 0.08); boardG.add(stripe);
}

// ---------- pot (empty at start) ----------
const potG = new THREE.Group(); scene.add(potG);
potG.position.copy(POT);
{
  const outer = mesh(new THREE.CylinderGeometry(0.175, 0.155, 0.15, 24, 1, true), impasto('#4A3A2A', { roughness: 0.55, metalness: 0.18, ns: 0.4, side: THREE.DoubleSide }));
  outer.position.y = 0.085; potG.add(outer);
  const inner = mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.13, 24, 1, true), impasto('#3A2C22', { roughness: 0.7, ns: 0.25, side: THREE.BackSide }));
  inner.position.y = 0.085; potG.add(inner);
  const bot = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 24), impasto('#2E221A', { roughness: 0.75, ns: 0.3 }));
  bot.position.y = 0.012; potG.add(bot);
  const lip = mesh(new THREE.TorusGeometry(0.172, 0.012, 8, 28), impasto('#5A4A38', { roughness: 0.45, metalness: 0.25, ns: 0.25 }));
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.158; potG.add(lip);
  const handle = mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 16, Math.PI), impasto('#3D2B1F', { roughness: 0.5, metalness: 0.2, ns: 0.3 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(0.195, 0.1, 0); potG.add(handle);
}
const waterBody = mesh(wavyCyl(0.148, 0.135, 0.06, 22, 11, 0.008), impasto('#8BB3C4', { roughness: 0.42, opacity: 0.70, ns: 0.16, emissive: '#6A90A0', ei: 0.03 }));
waterBody.position.y = 0.045; waterBody.visible = false; potG.add(waterBody);

// pot lid (cover-simmer for hard white cores)
const potLid = new THREE.Group();
{
  const disk = mesh(new THREE.CylinderGeometry(0.168, 0.172, 0.014, 24), impasto('#5A4A38', { roughness: 0.5, metalness: 0.18, ns: 0.3 }));
  potLid.add(disk);
  const rim = mesh(new THREE.TorusGeometry(0.168, 0.008, 8, 24), impasto('#4A3A2A', { roughness: 0.45, metalness: 0.22, ns: 0.2 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.002; potLid.add(rim);
  const knob = mesh(new THREE.SphereGeometry(0.016, 10, 8), impasto('#D4AF37', { roughness: 0.35, metalness: 0.45, ns: 0.15 }));
  knob.position.y = 0.018; potLid.add(knob);
}
potLid.visible = false; scene.add(potLid);

// wooden spoon for stir + doneness check
const spoon = new THREE.Group();
{
  const bowl = mesh(new THREE.SphereGeometry(0.028, 12, 8), impasto('#C4A066', { roughness: 0.72, ns: 0.35 }));
  bowl.scale.set(1.0, 0.28, 1.15); spoon.add(bowl);
  const handle = mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.16, 8), impasto('#8A5A30', { roughness: 0.78, ns: 0.4 }));
  handle.rotation.x = Math.PI / 2.4; handle.position.set(0, 0.04, 0.08); spoon.add(handle);
}
spoon.visible = false; scene.add(spoon);

// steam puffs
const steam = [];
for (let i = 0; i < 6; i++) {
  const s = mesh(new THREE.SphereGeometry(0.025, 6, 5), impasto('#F5F0E6', { roughness: 1, opacity: 0, ns: 0.1 }), false, false);
  s.material.transparent = true; s.visible = true; scene.add(s); steam.push(s);
}

// ---------- serving glass (empty at start) ----------
const glassG = new THREE.Group(); scene.add(glassG);
glassG.position.copy(GLASS);
{
  const bowl = mesh(new THREE.CylinderGeometry(0.08, 0.055, 0.14, 22, 1, true), impasto('#E8E4D8', { roughness: 0.16, opacity: 0.30, metalness: 0.08, ns: 0.12, side: THREE.DoubleSide }));
  bowl.position.y = 0.155; glassG.add(bowl);
  const inner = mesh(new THREE.CylinderGeometry(0.074, 0.05, 0.128, 22, 1, true), impasto('#F5F0E6', { roughness: 0.22, opacity: 0.22, ns: 0.08, side: THREE.BackSide }));
  inner.position.y = 0.155; glassG.add(inner);
  const floor = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 20), impasto('#E8E0D0', { roughness: 0.3, opacity: 0.55, ns: 0.12 }));
  floor.position.y = 0.088; glassG.add(floor);
  const rim = mesh(new THREE.TorusGeometry(0.08, 0.006, 8, 24), impasto('#F7E8C8', { roughness: 0.2, opacity: 0.55, ns: 0.1 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.225; glassG.add(rim);
  const stem = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.07, 10), impasto('#E8E4D8', { roughness: 0.22, opacity: 0.5, ns: 0.1 }));
  stem.position.y = 0.048; glassG.add(stem);
  const foot = mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.014, 18), impasto('#E0D8C8', { roughness: 0.28, opacity: 0.6, ns: 0.15 }));
  foot.position.y = 0.01; glassG.add(foot);
}
const GLASS_FLOOR = 0.095;
const creamGlass = mesh(wavyCyl(0.068, 0.05, 0.05, 22, 77, 0.009), impasto('#F7E8C8', { roughness: 0.32, opacity: 0.88, ns: 0.22, emissive: '#F0D8A8', ei: 0.08 }));
creamGlass.position.y = GLASS_FLOOR + 0.02; creamGlass.visible = false; glassG.add(creamGlass);

// ---------- sago pearls (slightly smaller, less green, less foam-specular) ----------
const sagos = [];
const sagoG = new THREE.Group(); potG.add(sagoG);
for (let i = 0; i < 40; i++) {
  const g = new THREE.Group();
  const r = 0.0082 + K.hash(i) * 0.0028;
  const outer = mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshStandardMaterial({
    color: jitterColor('#F3EDE4', i + 3, 0.018), roughness: 0.52, metalness: 0,
    transparent: true, opacity: 0.86, emissive: '#E8E0D4', emissiveIntensity: 0.02
  }), false, true);
  const core = mesh(new THREE.SphereGeometry(r * 0.42, 6, 5), impasto('#FFFEFA', { roughness: 0.62, ns: 0.08 }), false, false);
  g.add(outer, core);
  g.userData = { outer, core, r, homeAng: (i / 40) * TAU + K.hash(i) * 0.4, homeRad: Math.sqrt(K.hash(i + 4)) * 0.12 };
  g.visible = false; sagoG.add(g); sagos.push(g);
}

// ---------- mango ----------
const skinCol = '#E8922A', fleshCol = '#F4B942', fleshDeep = '#E8A030', pitCol = '#6B3F18';
function makeMangoGeo() {
  const g = new THREE.SphereGeometry(0.062, 28, 22);
  g.scale(1.16, 0.88, 1.0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const tt = (z / 0.062 + 1) * 0.5;
    p.setXYZ(i, x * (1 - 0.08 * tt), y * (1 - 0.04 * tt), z);
  }
  g.computeVertexNormals(); return g;
}
const mangoWhole = mesh(makeMangoGeo(), impasto(skinCol, { roughness: 0.62, ns: 0.55, emissive: '#C46A18', ei: 0.08 }));
mangoWhole.visible = false; boardG.add(mangoWhole);
mangoWhole.position.set(0.04, BOARD_TOP + 0.048, 0.0);
const mangoWait = mesh(makeMangoGeo(), impasto(jitterColor('#E07A28', 9, 0.04), { roughness: 0.64, ns: 0.55, emissive: '#C46A18', ei: 0.06 }));
mangoWait.scale.setScalar(0.92); mangoWait.position.set(-0.13, BOARD_TOP + 0.044, -0.07);
mangoWait.rotation.set(0.1, 0.7, 0.15); mangoWait.visible = false; boardG.add(mangoWait);

function makeCheek(side) {
  // Solid hemisphere: dome = skin+flesh outward, flat cap = thick yellow cut face, no pit.
  const g = new THREE.Group();
  const fleshM = impasto(side > 0 ? fleshCol : fleshDeep, { roughness: 0.55, ns: 0.35, emissive: '#E8A028', ei: 0.22 });
  const flesh = mesh(new THREE.SphereGeometry(0.056, 24, 16, 0, TAU, 0, Math.PI * 0.52), fleshM);
  flesh.rotation.z = -side * Math.PI / 2;
  const skin = mesh(new THREE.SphereGeometry(0.059, 24, 16, 0, TAU, 0, Math.PI * 0.50), impasto(skinCol, { roughness: 0.72, ns: 0.5 }));
  skin.rotation.z = -side * Math.PI / 2;
  skin.position.x = side * 0.003;
  const face = mesh(new THREE.CircleGeometry(0.054, 28), impasto(fleshCol, { roughness: 0.48, ns: 0.2, emissive: '#F0B020', ei: 0.36, side: THREE.DoubleSide }));
  face.rotation.y = side * Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.050, 0.008, 8, 24), impasto(fleshDeep, { roughness: 0.5, ns: 0.2, emissive: '#E8A028', ei: 0.22 }));
  rim.rotation.y = side * Math.PI / 2;
  g.add(flesh, skin, face, rim);
  g.userData = { side, faceX: 0 };
  g.visible = false; boardG.add(g);
  return g;
}
const cheekL = makeCheek(-1), cheekR = makeCheek(1);
const pitSlab = new THREE.Group();
{
  // complete elongated mango seed (broad oval, not a sliced-through disc)
  const pit = mesh(new THREE.SphereGeometry(0.034, 16, 12), impasto(pitCol, { roughness: 0.7, ns: 0.28, emissive: '#4A2808', ei: 0.12 }));
  pit.scale.set(0.78, 0.30, 2.15);
  const fiber = mesh(new THREE.SphereGeometry(0.022, 10, 8), impasto('#8A5A30', { roughness: 0.75, ns: 0.2 }));
  fiber.scale.set(0.9, 0.22, 1.1);
  const cling = mesh(new THREE.SphereGeometry(0.016, 8, 6), impasto(fleshCol, { roughness: 0.55, ns: 0.2, emissive: '#E8A028', ei: 0.12 }));
  cling.scale.set(0.5, 0.35, 0.7); cling.position.set(0.018, 0.004, 0.02);
  pitSlab.add(pit, fiber, cling); pitSlab.visible = false; boardG.add(pitSlab);
}

// score marks on left cheek cut face (YZ of the flat cap — shallow, never through skin)
const scoreMarks = [];
for (let i = 0; i < 10; i++) {
  const alongZ = i < 5;
  const geo = alongZ ? new THREE.BoxGeometry(0.002, 0.004, 0.078) : new THREE.BoxGeometry(0.002, 0.074, 0.004);
  const m = mesh(geo, impasto('#C47A28', { roughness: 0.45, ns: 0.15, emissive: '#A06018', ei: 0.12 }), false, false);
  m.position.x = 0.002;
  if (alongZ) m.position.y = -0.028 + (i % 5) * 0.014;
  else m.position.z = -0.028 + (i % 5) * 0.014;
  m.visible = false; cheekL.add(m); scoreMarks.push(m);
}

// mango cubes — flesh thickness + one skin face
const cubes = [];
for (let i = 0; i < 14; i++) {
  const g = new THREE.Group();
  const fl = mesh(new RoundedBoxGeometry(0.034, 0.032, 0.034, 2, 0.005), impasto(i % 2 ? fleshCol : fleshDeep, { roughness: 0.52, ns: 0.28, emissive: '#E8A028', ei: 0.2 }));
  const sk = mesh(new THREE.BoxGeometry(0.006, 0.030, 0.032), impasto(skinCol, { roughness: 0.7, ns: 0.4 }));
  sk.position.x = -0.018;
  g.add(fl, sk);
  const col = i % 4, row = Math.floor(i / 4);
  g.userData.board = V(-0.02 + col * 0.038, BOARD_TOP + 0.02, -0.06 + row * 0.038);
  g.visible = false; boardG.add(g); cubes.push(g);
}

// knife — blade plane = cut plane (thin X), edge down
const knife = new THREE.Group();
{
  const blade = mesh(new THREE.BoxGeometry(0.004, 0.055, 0.13), impasto('#E8E4DC', { roughness: 0.22, metalness: 0.72, ns: 0.12 }));
  blade.position.set(0, 0.028, 0); knife.add(blade);
  const edge = mesh(new THREE.BoxGeometry(0.002, 0.006, 0.13), impasto('#B8B4AC', { roughness: 0.18, metalness: 0.8, ns: 0.08 }), false, false);
  edge.position.set(0, 0.001, 0); knife.add(edge);
  const hdl = mesh(new RoundedBoxGeometry(0.016, 0.022, 0.09, 2, 0.005), impasto('#5A3A22', { roughness: 0.75, ns: 0.4 }));
  hdl.position.set(0, 0.032, 0.105); knife.add(hdl);
  const bol = mesh(new THREE.BoxGeometry(0.012, 0.028, 0.014), impasto('#C8C2B4', { roughness: 0.35, metalness: 0.55, ns: 0.15 }));
  bol.position.set(0, 0.03, 0.058); knife.add(bol);
}
knife.visible = false; boardG.add(knife);

// ---------- pomelo ----------
const pomeloG = new THREE.Group(); boardG.add(pomeloG);
pomeloG.position.set(-0.14, BOARD_TOP + 0.048, 0.04);
pomeloG.visible = false;
{
  const rind = mesh(new THREE.SphereGeometry(0.07, 20, 16, 0, TAU, 0, Math.PI * 0.58), impasto('#D4C46A', { roughness: 0.78, ns: 0.55, side: THREE.DoubleSide }));
  rind.rotation.z = Math.PI; pomeloG.add(rind);
  const pith = mesh(new THREE.SphereGeometry(0.062, 18, 14, 0, TAU, 0, Math.PI * 0.55), impasto('#F5F0E6', { roughness: 0.82, ns: 0.3, side: THREE.DoubleSide }));
  pith.rotation.z = Math.PI; pith.scale.set(1, 0.95, 1); pomeloG.add(pith);
  const pink = mesh(new THREE.SphereGeometry(0.046, 16, 12, 0, TAU, 0, Math.PI * 0.5), impasto('#F2A3A0', { roughness: 0.65, ns: 0.35, emissive: '#E07A6A', ei: 0.12, side: THREE.DoubleSide }));
  pink.rotation.z = Math.PI; pomeloG.add(pink);
}
const pulps = [];
for (let i = 0; i < 10; i++) {
  const g = new THREE.Group();
  const col = i % 3 === 0 ? '#E07A6A' : (i % 3 === 1 ? '#F2A3A0' : '#F0B090');
  const sac = mesh(new THREE.SphereGeometry(0.018, 8, 7), impasto(jitterColor(col, 70 + i, 0.04), { roughness: 0.55, ns: 0.3, emissive: '#E07A6A', ei: 0.1 }));
  sac.scale.set(0.7, 1.55, 0.65);
  const sac2 = mesh(new THREE.SphereGeometry(0.012, 7, 6), impasto(jitterColor('#F4C4A0', 80 + i, 0.03), { roughness: 0.55, ns: 0.25 }));
  sac2.scale.set(0.6, 1.3, 0.55); sac2.position.set(0.008, 0.006, 0);
  g.add(sac, sac2);
  g.userData.board = V(-0.16 + (i % 5) * 0.038, BOARD_TOP + 0.018, 0.09 + Math.floor(i / 5) * 0.038);
  g.visible = false; boardG.add(g); pulps.push(g);
}

// ---------- ice + rock sugar ----------
const ices = [];
for (let i = 0; i < 3; i++) {
  const ice = mesh(new RoundedBoxGeometry(0.032, 0.028, 0.032, 2, 0.006), impasto('#D6EEF5', { roughness: 0.18, opacity: 0.58, ns: 0.15, emissive: '#C0E0EC', ei: 0.12 }));
  ice.visible = false; glassG.add(ice); ices.push(ice);
}
const sugars = [];
for (let i = 0; i < 8; i++) {
  const s = mesh(new THREE.OctahedronGeometry(0.016 + K.hash(i) * 0.008, 0), impasto(jitterColor('#F3E6B0', 90 + i, 0.04), { roughness: 0.35, opacity: 0.92, ns: 0.2, emissive: '#E8D890', ei: 0.16 }));
  s.visible = false; scene.add(s); sugars.push(s);
}

// ---------- vessels: origin = spout tip (tip-lock) ----------
function makeKettle() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.07, 16, 12), impasto('#C45A32', { roughness: 0.42, metalness: 0.12, ns: 0.45 }));
  body.scale.set(1.05, 0.85, 1.0); body.position.y = -0.145; g.add(body);
  const band = mesh(new THREE.TorusGeometry(0.068, 0.006, 6, 20), impasto('#D4AF37', { roughness: 0.35, metalness: 0.45, ns: 0.2 }));
  band.rotation.x = Math.PI / 2; band.position.y = -0.145; g.add(band);
  const lid = mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.016, 14), impasto('#B24E2C', { roughness: 0.48, ns: 0.4 }));
  lid.position.y = -0.078; g.add(lid);
  const knob = mesh(new THREE.SphereGeometry(0.012, 8, 6), impasto('#D4AF37', { roughness: 0.32, metalness: 0.5, ns: 0.15 }));
  knob.position.y = -0.064; g.add(knob);
  const spout = mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.09, 10), impasto('#C45A32', { roughness: 0.42, ns: 0.35 }));
  spout.position.y = -0.045; g.add(spout);
  const lip = mesh(new THREE.TorusGeometry(0.011, 0.004, 6, 12), impasto('#8A3A20', { roughness: 0.4, ns: 0.2 }));
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.002; g.add(lip);
  const hole = mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: '#1A0C08', side: THREE.DoubleSide }), false, false);
  hole.rotation.x = -Math.PI / 2; g.add(hole);
  const handle = mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16, Math.PI * 1.15), impasto('#3D2B1F', { roughness: 0.55, ns: 0.35 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(-0.09, -0.145, 0); g.add(handle);
  return g;
}
function makeBottle(bodyCol, neckCol, label, extra = {}) {
  const g = new THREE.Group();
  const br = extra.br ?? 0.048;
  const body = mesh(new THREE.CylinderGeometry(br * 0.88, br, 0.19, 14), impasto(bodyCol, { roughness: 0.38, opacity: 0.92, ns: 0.35 }));
  body.position.y = -0.14; g.add(body);
  const shoulder = mesh(new THREE.SphereGeometry(br * 0.95, 12, 8, 0, TAU, 0, Math.PI * 0.48), impasto(bodyCol, { roughness: 0.38, opacity: 0.92, ns: 0.3 }));
  shoulder.position.y = -0.052; g.add(shoulder);
  const ring = mesh(new THREE.TorusGeometry(br * 0.9, 0.005, 6, 16), impasto(neckCol, { roughness: 0.4, ns: 0.2 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.1; g.add(ring);
  const neck = mesh(new THREE.CylinderGeometry(0.013, 0.022, 0.045, 10), impasto(neckCol, { roughness: 0.42, ns: 0.25 }));
  neck.position.y = -0.018; g.add(neck);
  const cap = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.016, 10), impasto('#3D2B1F', { roughness: 0.5, ns: 0.25 }));
  cap.position.y = 0.012; g.add(cap);
  const lip = mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), impasto(neckCol, { roughness: 0.4, ns: 0.15 }));
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.003; g.add(lip);
  if (label) {
    const tex = labelTex(label, '#F7E8C8', '#3D2B1F');
    const lab = mesh(new THREE.PlaneGeometry(0.075, 0.036), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), false, false);
    lab.position.set(0, -0.135, br + 0.002); g.add(lab);
  }
  return g;
}
function makePitcher() {
  const g = new THREE.Group(); // origin = spout tip
  const cream = impasto('#F0E4D0', { roughness: 0.52, ns: 0.4 });
  const spout = mesh(new THREE.CylinderGeometry(0.011, 0.018, 0.09, 12), cream);
  spout.position.y = -0.045; g.add(spout);
  const collar = mesh(new THREE.TorusGeometry(0.013, 0.004, 6, 12), impasto('#E8D8C0', { roughness: 0.48, ns: 0.25 }));
  collar.rotation.x = Math.PI / 2; collar.position.y = -0.004; g.add(collar);
  const hole = mesh(new THREE.CircleGeometry(0.009, 14), new THREE.MeshBasicMaterial({ color: '#2A1C10', side: THREE.DoubleSide }), false, false);
  hole.rotation.x = -Math.PI / 2; g.add(hole);
  const body = mesh(new THREE.SphereGeometry(0.062, 16, 12), cream);
  body.scale.set(1.05, 0.92, 1.0); body.position.y = -0.155; g.add(body);
  const handle = mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 18), impasto('#E0D0B8', { roughness: 0.5, ns: 0.35 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(-0.072, -0.155, 0); g.add(handle);
  const band = mesh(new THREE.TorusGeometry(0.06, 0.005, 6, 18), impasto('#E07A6A', { roughness: 0.45, ns: 0.2 }));
  band.rotation.x = Math.PI / 2; band.position.y = -0.155; g.add(band);
  const base = mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.014, 14), cream);
  base.position.y = -0.215; g.add(base);
  return g;
}
const kettle = makeKettle(); kettle.visible = false; scene.add(kettle);
const cocoBot = makeBottle('#F7E8C8', '#E8D4B0', 'COCONUT', { br: 0.05 }); cocoBot.visible = false; scene.add(cocoBot);
const evapBot = makeBottle('#F4E6C8', '#D8C4A0', 'EVAP', { br: 0.042 }); evapBot.visible = false; scene.add(evapBot);
const pitcher = makePitcher(); pitcher.visible = false; scene.add(pitcher);
const creamPitcher = mesh(wavyCyl(0.048, 0.04, 0.055, 18, 33, 0.008), impasto('#F7E8C8', { roughness: 0.34, opacity: 0.9, ns: 0.22, emissive: '#F0D8A8', ei: 0.08 }));
creamPitcher.position.y = -0.155; creamPitcher.visible = false; pitcher.add(creamPitcher);
const syrupPitcher = mesh(wavyCyl(0.042, 0.034, 0.04, 16, 41, 0.006), impasto('#E8D090', { roughness: 0.38, opacity: 0.82, ns: 0.18, emissive: '#D4AF37', ei: 0.06 }));
syrupPitcher.position.y = -0.175; syrupPitcher.visible = false; pitcher.add(syrupPitcher);
const syrupMeniscus = mesh(new THREE.CircleGeometry(0.010, 14), impasto('#E8D090', { roughness: 0.32, opacity: 0.9, ns: 0.1, emissive: '#D4AF37', ei: 0.12, side: THREE.DoubleSide }));
syrupMeniscus.rotation.x = -Math.PI / 2; syrupMeniscus.position.y = -0.003; syrupMeniscus.visible = false; pitcher.add(syrupMeniscus);

function makeStream(color) {
  const g = new THREE.Group();
  const tube = mesh(new THREE.CylinderGeometry(0.007, 0.01, 1, 7), impasto(color, { roughness: 0.28, opacity: 0.9, ns: 0.08 }));
  tube.visible = false; g.add(tube); g.userData.tube = tube; scene.add(g); return g;
}
function makeArcStream(color, segs = 8) {
  const g = new THREE.Group();
  const parts = [];
  const mat = impasto(color, { roughness: 0.32, opacity: 0.9, ns: 0.08 });
  for (let i = 0; i < segs; i++) {
    const tube = mesh(new THREE.CylinderGeometry(0.006, 0.009, 1, 6), mat);
    tube.visible = false; g.add(tube); parts.push(tube);
  }
  g.userData.parts = parts; scene.add(g); return g;
}
const waterStream = makeStream('#8EC4D6');
const cocoStream = makeStream('#F7E8C8');
const evapStream = makeStream('#F0E0C0');
const milkStream = makeArcStream('#F7E8C8', 12);

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
function bezier3(a, b, c, u) {
  const omu = 1 - u;
  return a.clone().multiplyScalar(omu * omu).add(b.clone().multiplyScalar(2 * omu * u)).add(c.clone().multiplyScalar(u * u));
}
function setArcStream(stream, tip, land, spoutDir, active, thick = 1, grow = 1) {
  const parts = stream.userData.parts;
  if (!active || grow <= 0.02) { parts.forEach(p => { p.visible = false; }); return; }
  const dir = spoutDir.clone().normalize();
  const ctrl = tip.clone().add(dir.multiplyScalar(0.055)).add(V(0, -0.035, 0));
  const n = parts.length;
  const g = clamp(grow);
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * g, t1 = ((i + 1) / n) * g;
    const a = bezier3(tip, ctrl, land, t0);
    const b = bezier3(tip, ctrl, land, t1);
    const seg = b.clone().sub(a);
    const len = Math.max(0.008, seg.length());
    const tube = parts[i];
    tube.visible = true;
    const rad = thick * lerp(0.85, 1.15, i / n);
    tube.scale.set(rad, len, rad);
    tube.position.copy(a.clone().add(b).multiplyScalar(0.5));
    tube.quaternion.setFromUnitVectors(V(0, 1, 0), seg.normalize());
  }
}

function tipLock(bottle, stream, cfg, landWorld, tipHover, t, name, extraRot = 0) {
  const { enter, pour, exit } = cfg;
  const [p0, p1] = pour;
  if (t < enter || t > exit + 0.25) { bottle.visible = false; setStream(stream, V(), V(), false); return 0; }
  bottle.visible = true;
  const tipTarget = landWorld.clone(); tipTarget.y += tipHover;
  const approach = eo(seg(t, enter, enter + 0.6));
  const retreat = 1 - eo(seg(t, exit - 0.4, exit));
  const show = Math.min(approach, retreat);
  const side = tipTarget.clone(); side.x += 0.26; side.y += 0.20; side.z += 0.10;
  const tipPos = side.clone().lerp(tipTarget, 0.58 + 0.42 * show);
  bottle.position.copy(tipPos);
  const pourAmt = win(t, p0, p1, 0.15, 0.2);
  bottle.rotation.set(0.18 + pourAmt * 0.42 + extraRot, 0.55, -0.88 - pourAmt * 0.22);
  bottle.updateMatrixWorld(true);
  const tipW = bottle.localToWorld(V(0, 0, 0));
  setStream(stream, tipW, landWorld, pourAmt > 0.05, 0.75 + pourAmt * 0.5);
  DBG[name] = { tip: tipW.toArray(), land: landWorld.toArray(), pour: pourAmt };
  return pourAmt;
}

// ---------- camera: high three-quarter, never pure top-down ----------
const KEYS = [
  [0.0, [0.00, 0.15, 0.04], 30, 40, 2.95],
  [3.5, [0.00, 0.15, 0.04], 28, 41, 2.82],
  [6.5, [-0.02, 0.14, 0.02], 20, 44, 2.12],
  [13.8, [-0.02, 0.15, 0.02], 16, 46, 1.85],
  [18.6, [-0.02, 0.16, 0.02], 12, 42, 1.58],
  [20.5, [-0.02, 0.17, 0.02], 18, 40, 1.68],
  [22.4, [-0.02, 0.16, 0.02], 26, 44, 2.00],
  [24.8, [-0.42, 0.12, 0.06], 46, 40, 1.95],
  [33.6, [-0.42, 0.13, 0.06], 38, 36, 1.50],
  [40.0, [-0.40, 0.12, 0.06], 50, 42, 1.72],
  [46.8, [-0.38, 0.12, 0.07], 54, 40, 1.72],
  [58.2, [0.16, 0.16, 0.04], 28, 44, 2.00],
  [59.8, [0.20, 0.18, 0.05], 18, 38, 1.42],
  [64.6, [0.16, 0.16, 0.04], 26, 42, 1.88],
  [74.0, [0.42, 0.16, 0.06], 18, 42, 1.92],
  [88.0, [0.38, 0.18, 0.06], 22, 40, 1.72],
  [99.0, [0.42, 0.17, 0.06], 32, 46, 1.55],
  [105.0, [0.38, 0.16, 0.05], 36, 44, 1.88],
  [115.0, [0.16, 0.16, 0.04], 38, 42, 2.25]
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
  eye.x += Math.sin(t * 0.85) * 0.005; eye.y += Math.cos(t * 0.66) * 0.0035;
  cam.position.copy(eye); cam.lookAt(tgt);
  cam.setViewOffset(W, H, 0, 95, W, H);
  key.target.position.copy(tgt);
  key.position.set(tgt.x + 3.1, tgt.y + 2.2, tgt.z + 1.15);
}

function potFoodTop(t) {
  let y = 0.028;
  if (t >= E.water.pour[0]) y = 0.028 + eo(seg(t, E.water.pour[0], E.water.pour[1])) * 0.058;
  if (t >= E.sago.start) y = Math.max(y, 0.075);
  if (t >= E.rinse.pour[0]) y = Math.max(y, 0.092);
  return y;
}
function glassFoodTop(t) {
  let y = GLASS_FLOOR;
  if (t >= E.sago_to_glass.start) y = 0.118;
  if (t >= E.mango_to_glass.start) y = 0.148;
  if (t >= E.pomelo_to_glass.start) y = 0.158;
  if (t >= E.milk_pour.pour[0]) y = Math.max(y, 0.142 + eo(seg(t, E.milk_pour.pour[0], E.milk_pour.pour[1])) * 0.038);
  if (t >= E.topping.start) y = Math.max(y, 0.188);
  if (t >= E.ice.start) y = Math.max(y, 0.205);
  return y;
}

function knifeStroke(t, t0, dur, base, travel) {
  const u = seg(t, t0, t0 + dur);
  if (t < t0 - 0.02 || t > t0 + dur + 0.12) return false;
  knife.visible = true;
  let yOff, along;
  if (u < 0.28) { yOff = lerp(0.15, 0, eo(u / 0.28)); along = 0; }
  else if (u < 0.78) { yOff = 0; along = (u - 0.28) / 0.50; }
  else { yOff = lerp(0, 0.13, ei((u - 0.78) / 0.22)); along = 1; }
  knife.position.set(base.x + travel.x * along, base.y + yOff, base.z + travel.z * along);
  knife.rotation.set(0, 0, 0);
  return true;
}

function update(t) {
  // empty containers visible from the opening
  potG.scale.setScalar(1); potG.visible = true;
  glassG.scale.setScalar(1); glassG.visible = true;
  boardG.scale.setScalar(1); boardG.visible = true;

  // water in pot
  const wp = eo(seg(t, E.water.pour[0], E.water.pour[1]));
  if (t >= E.water.pour[0]) {
    waterBody.visible = wp > 0.06;
    let h = 0.35 + 0.75 * wp;
    if (t >= E.rinse.pour[0]) h += 0.10 * eo(seg(t, E.rinse.pour[0], E.rinse.pour[1]));
    if (t >= E.rinse.pour[1]) h *= 1 - 0.72 * eo(seg(t, E.rinse.pour[1], E.rinse.exit)); // drain
    waterBody.scale.set(1, Math.max(0.08, h), 1);
    waterBody.position.y = 0.03 + 0.03 * h;
    if (t >= E.rinse.exit && h < 0.12) waterBody.visible = false;
  } else waterBody.visible = false;

  const pft = potFoodTop(t);
  const waterLand = potG.localToWorld(V(0.01, pft + 0.012, 0.01));
  if (t < E.rinse.enter) tipLock(kettle, waterStream, E.water, waterLand, 0.24, t, 'water');
  else tipLock(kettle, waterStream, E.rinse, waterLand, 0.22, t, 'rinse');

  // sago into pot, then later fly to glass
  // cook doneness: stir → partial (hard cores) → cover → tiny soft dots, not a hard-core leftover
  const stirU = clamp(seg(t, E.stir.start, E.stir.end));
  const lidU = clamp(seg(t, E.lid.on, E.lid.off));
  let cookU = stirU * 0.42;
  if (t >= E.check.start) cookU = 0.45;
  if (t >= E.lid.on) cookU = lerp(0.45, 0.92, lidU);
  if (t >= E.lid.off) cookU = 0.92;
  sagos.forEach((g, i) => {
    const cfg = E.sago;
    const tIn = cfg.start + i * cfg.gap;
    if (t < tIn) { g.visible = false; return; }
    g.visible = true;
    const ang = g.userData.homeAng, rad = g.userData.homeRad;
    const hx = Math.cos(ang) * rad, hz = Math.sin(ang) * rad;
    const hy = 0.04 + (K.hash(i + 9) - 0.5) * 0.016;
    const fly = clamp((t - tIn) / cfg.fall);
    let x = hx, y = lerp(hy + 0.34, hy, eo(fly)), z = hz;
    if (t >= E.check.start && t < E.check.end && i < 3) {
      const u = clamp(seg(t, E.check.start, E.check.end));
      const lift = Math.sin(u * Math.PI);
      x = 0.04 + (i - 1) * 0.018;
      y = 0.12 + lift * 0.09;
      z = 0.02 + i * 0.01;
    }
    const cu = cookU;
    g.userData.outer.material.opacity = lerp(0.88, 0.58, cu);
    // after cover: tiny soft white dots remain on some pearls; not a hard core, not all judged raw
    const coreEnd = (i % 5 === 0) ? 0.16 : 0.06;
    g.userData.core.scale.setScalar(lerp(1, coreEnd, cu));
    g.userData.core.visible = g.userData.core.scale.x > 0.08;
    // transfer to glass
    const tg = E.sago_to_glass;
    const tFly = tg.start + i * tg.gap;
    if (t >= tFly) {
      const u = clamp((t - tFly) / tg.fly);
      const gang = (i / 40) * TAU + K.hash(i + 21) * 0.3;
      const grad = Math.sqrt(K.hash(i + 22)) * 0.05;
      const gx = Math.cos(gang) * grad, gz = Math.sin(gang) * grad;
      const gy = GLASS_FLOOR + 0.012 + (K.hash(i + 23)) * 0.016;
      const from = potG.localToWorld(V(x, y, z));
      const to = glassG.localToWorld(V(gx, gy, gz));
      const pw = from.clone().lerp(to, eo(u));
      // move into glass hierarchy visually by world pos (keep in pot group: convert back if still parented)
      // reparent trick: keep in potG until mid-flight then we just set world via parent inverse
      const parent = g.parent;
      parent.updateMatrixWorld(true);
      const loc = parent.worldToLocal(pw.clone());
      g.position.copy(loc);
      // after landing, place relative to glass by hijacking: if u>0.98 set as glass-local via world
      if (u > 0.98) {
        glassG.updateMatrixWorld(true);
        g.position.copy(potG.worldToLocal(glassG.localToWorld(V(gx, gy, gz))));
      }
      g.scale.setScalar(1);
    } else {
      g.position.set(x, y, z);
      g.scale.setScalar(t < tIn + cfg.fall ? lerp(0.35, 1, eo(fly)) : 1);
    }
    g.rotation.set(K.hash(i) * 0.6, ang, K.hash(i + 2) * 0.5);
  });

  // steam during cook; seeps at lid edge while covered
  const steamOn = t >= E.cook[0] && t <= E.lid.off + 0.6;
  const lidCover = t >= E.lid.on && t <= E.lid.off;
  steam.forEach((s, i) => {
    if (!steamOn) { s.material.opacity = 0; return; }
    const u = ((t * 0.32 + i * 0.16) % 1);
    const spread = lidCover ? 0.10 : 0.06;
    s.position.set(POT.x + Math.sin(i + t) * spread, POT.y + (lidCover ? 0.22 : 0.18) + u * (lidCover ? 0.12 : 0.28), POT.z + Math.cos(i * 1.2) * spread);
    s.scale.setScalar(0.06 + u * (lidCover ? 0.05 : 0.1));
    s.material.opacity = (lidCover ? 0.14 : 0.32) * (1 - u);
  });

  // lid cover / uncover
  if (t >= E.lid.on - 0.4 && t <= E.lid.off + 0.45) {
    potLid.visible = true;
    const down = eo(seg(t, E.lid.on - 0.35, E.lid.on + 0.12));
    const up = 1 - eo(seg(t, E.lid.off, E.lid.off + 0.32));
    const cover = Math.min(down, up);
    potLid.position.set(POT.x + (1 - cover) * 0.04, POT.y + 0.172 + (1 - cover) * 0.20, POT.z);
    potLid.rotation.set(0, 0.2, (1 - cover) * 0.35);
  } else potLid.visible = false;

  // spoon: stir then lift for doneness check
  if (t >= E.stir.start && t < E.check.end) {
    spoon.visible = true;
    if (t < E.stir.end) {
      const a = (t - E.stir.start) * 3.4;
      spoon.position.set(POT.x + Math.cos(a) * 0.06, POT.y + 0.11, POT.z + Math.sin(a) * 0.05);
      spoon.rotation.set(0.35, a * 0.15, 0.45);
    } else {
      const u = clamp(seg(t, E.check.start, E.check.end));
      const lift = Math.sin(u * Math.PI);
      spoon.position.set(POT.x + 0.04, POT.y + 0.12 + lift * 0.10, POT.z + 0.02);
      spoon.rotation.set(0.15 + lift * 0.4, 0.3, 0.55);
    }
  } else spoon.visible = false;

  // mango whole / cheeks / pit / dice
  const cut1 = E.cheek_cuts[0], cut2 = E.cheek_cuts[1];
  mangoWait.visible = t >= E.mango_in;
  mangoWhole.visible = t >= E.mango_in && t < cut1 + 0.55;
  if (mangoWhole.visible) {
    const drop = eo(seg(t, E.mango_in, E.mango_in + 0.45));
    mangoWhole.position.set(0.04, BOARD_TOP + 0.048 + (1 - drop) * 0.2, 0);
    mangoWhole.rotation.set(0, 0.08, (1 - drop) * 0.3);
  }
  function placeCheek(cheek, cutT, visFrom, hideAt) {
    const show = t >= visFrom;
    cheek.visible = show && t < hideAt;
    if (!show) return;
    const side = cheek.userData.side;
    const open = eo(seg(t, cutT, cutT + 0.65));
    cheek.position.set(0.04 + side * (0.028 + open * 0.10), BOARD_TOP + 0.042 + open * 0.012, 0.0);
    cheek.rotation.set(-open * 0.18, side * open * 0.42, side * open * 0.06);
  }
  placeCheek(cheekL, cut1 + 0.5, cut1 + 0.48, E.dice.start);
  placeCheek(cheekR, cut2 + 0.5, cut2 + 0.48, E.mango_to_glass.start + 2);
  pitSlab.visible = t >= cut2 + 0.35 && t < E.dice.start;
  if (pitSlab.visible) {
    const p = eo(seg(t, E.pit_reveal, E.pit_reveal + 0.45));
    pitSlab.position.set(0.04, BOARD_TOP + 0.016 + 0.006 * p, 0.0);
    pitSlab.rotation.set(0.12, 0.35, 0.08);
    pitSlab.scale.set(1, 1, 1);
  }
  scoreMarks.forEach((m, i) => {
    m.visible = t >= E.score.start + i * E.score.gap && t < E.dice.start;
  });

  // knife strokes
  knife.visible = false;
  let knifed = false;
  const PIT_HALF = 0.020;
  knifed = knifeStroke(t, cut1, 0.85, V(0.04 - PIT_HALF, BOARD_TOP + 0.012, -0.055), V(0, 0, 0.11)) || knifed;
  knifed = knifeStroke(t, cut2, 0.85, V(0.04 + PIT_HALF, BOARD_TOP + 0.012, -0.055), V(0, 0, 0.11)) || knifed;
  if (!knifed) {
    cheekL.updateMatrixWorld(true);
    for (let i = 0; i < E.score.count; i++) {
      const t0 = E.score.start + i * E.score.gap;
      const alongZ = i < 5;
      const local = alongZ
        ? V(0.002, -0.028 + (i % 5) * 0.014, -0.036)
        : V(0.002, -0.036, -0.028 + (i % 5) * 0.014);
      const travL = alongZ ? V(0, 0, 0.07) : V(0, 0.07, 0);
      const w0 = cheekL.localToWorld(local.clone());
      const w1 = cheekL.localToWorld(local.clone().add(travL));
      const b0 = boardG.worldToLocal(w0);
      const b1 = boardG.worldToLocal(w1);
      const base = V(b0.x, b0.y - 0.002, b0.z);
      const trav = V(b1.x - b0.x, b1.y - b0.y, b1.z - b0.z);
      if (knifeStroke(t, t0, 0.18, base, trav)) { knifed = true; break; }
    }
  }

  // cubes appear at dice and later some fly to glass / topping
  cubes.forEach((g, i) => {
    const tIn = E.dice.start + i * E.dice.gap;
    if (t < tIn) { g.visible = false; return; }
    g.visible = true;
    const home = g.userData.board;
    const pop = clamp((t - tIn) / 0.28);
    let x = home.x, y = home.y, z = home.z;
    g.scale.setScalar(lerp(0.4, 1, eo(pop)));
    g.rotation.set(0.08, K.hash(i) * 0.5, 0.05);
    // first 10 go to glass
    const toG = i < 10 && t >= E.mango_to_glass.start + i * E.mango_to_glass.gap;
    const topI = i - 10;
    const toTop = i >= 10 && t >= E.topping.start + topI * E.topping.gap;
    if (toG || toTop) {
      const t0 = toG ? E.mango_to_glass.start + i * E.mango_to_glass.gap : E.topping.start + topI * E.topping.gap;
      const dur = toG ? E.mango_to_glass.fly : E.topping.fly;
      const u = clamp((t - t0) / dur);
      const ang = (i / 14) * TAU;
      const rad = toTop ? 0.028 + K.hash(i) * 0.02 : 0.018 + K.hash(i) * 0.028;
      const gy = (toTop ? glassFoodTop(t) + 0.012 : GLASS_FLOOR + 0.032) + K.hash(i + 4) * 0.01;
      const dest = glassG.localToWorld(V(Math.cos(ang) * rad, gy, Math.sin(ang) * rad));
      const from = boardG.localToWorld(V(home.x, home.y, home.z));
      const pw = from.clone().lerp(dest, eo(u));
      g.position.copy(boardG.worldToLocal(pw));
    } else {
      g.position.set(x, y + (1 - eo(pop)) * 0.08, z);
    }
  });

  // pomelo
  pomeloG.visible = t >= E.pomelo_in;
  if (pomeloG.visible) {
    const a = eo(seg(t, E.pomelo_in, E.pomelo_in + 0.45));
    pomeloG.scale.setScalar(0.35 + 0.65 * a);
    pomeloG.rotation.set(-0.4, 0.3, 0.15);
  }
  pulps.forEach((g, i) => {
    const cfg = E.pomelo_pull;
    const tIn = cfg.start + i * cfg.gap;
    if (t < tIn) { g.visible = false; return; }
    g.visible = true;
    const home = g.userData.board;
    const pull = clamp((t - tIn) / cfg.fall);
    const from = V(-0.14, BOARD_TOP + 0.055, 0.04);
    let pos = from.clone().lerp(home, eo(pull));
    g.scale.setScalar(lerp(0.4, 1.15, eo(pull))); // readable sacs, not crumbs
    g.rotation.set(0.4, K.hash(i) * TAU, 0.3);
    const toG = i < 8 && t >= E.pomelo_to_glass.start + i * E.pomelo_to_glass.gap;
    const topI = i - 8;
    const toTop = i >= 8 && t >= E.topping.start + (2 + topI) * E.topping.gap;
    if (toG || toTop) {
      const t0 = toG ? E.pomelo_to_glass.start + i * E.pomelo_to_glass.gap : E.topping.start + (2 + topI) * E.topping.gap;
      const dur = toG ? E.pomelo_to_glass.fly : E.topping.fly;
      const u = clamp((t - t0) / dur);
      const ang = 0.4 + i * 0.7;
      const rad = toTop ? 0.038 : 0.032 + K.hash(i) * 0.02;
      const gy = (toTop ? glassFoodTop(t) + 0.01 : GLASS_FLOOR + 0.042);
      const dest = glassG.localToWorld(V(Math.cos(ang) * rad, gy, Math.sin(ang) * rad));
      const fromW = boardG.localToWorld(home.clone());
      pos = boardG.worldToLocal(fromW.lerp(dest, eo(u)));
    }
    g.position.copy(pos);
  });

  // pitcher + bottles (step 4 mix, step 5 pour)
  const cocoFill = clamp(seg(t, E.coco.pour[0], E.coco.pour[1]));
  const evapFill = clamp(seg(t, E.evap.pour[0], E.evap.pour[1]));
  const syrupFill = clamp(seg(t, E.sugar_dissolve[0], E.sugar_dissolve[1]));
  const coolU = clamp(seg(t, E.sugar_cool[0], E.sugar_cool[1]));
  const mixFill = syrupFill * 0.12 + cocoFill * 0.62 + evapFill * 0.26;
  const emptied = t >= E.milk_pour.pour[0] ? 1 - eo(seg(t, E.milk_pour.pour[0], E.milk_pour.pour[1])) * 0.85 : 1;

  if (t < E.pitcher_in || t > E.milk_pour.exit + 0.35) {
    pitcher.visible = false; setArcStream(milkStream, V(), V(), V(0, 1, 0), false);
  } else {
    pitcher.visible = true;
    if (t < E.milk_pour.enter) {
      const a = eo(seg(t, E.pitcher_in, E.pitcher_in + 0.55));
      pitcher.position.copy(PITCHER_SPOUT);
      pitcher.rotation.set(0.1, 0.45, 0.06);
      pitcher.scale.setScalar(0.25 + 0.75 * a);
      setArcStream(milkStream, V(), V(), V(0, 1, 0), false);
    } else {
      const gft = glassFoodTop(t);
      const land = glassG.localToWorld(V(-0.01, gft + 0.016, 0.01));
      const tipTarget = land.clone(); tipTarget.y += 0.16; tipTarget.x -= 0.04;
      const approach = eo(seg(t, E.milk_pour.enter, E.milk_pour.enter + 0.6));
      const retreat = 1 - eo(seg(t, E.milk_pour.exit - 0.4, E.milk_pour.exit));
      const show = Math.min(approach, retreat);
      const side = tipTarget.clone(); side.x -= 0.16; side.y += 0.10; side.z += 0.06;
      pitcher.position.copy(side.clone().lerp(tipTarget, 0.72 + 0.28 * show));
      const pourAmt = win(t, E.milk_pour.pour[0], E.milk_pour.pour[1], 0.28, 0.22);
      const toLand = land.clone().sub(pitcher.position).normalize();
      pitcher.quaternion.setFromUnitVectors(V(0, 1, 0), toLand);
      pitcher.rotateZ(0.18 + pourAmt * 0.12);
      pitcher.updateMatrixWorld(true);
      const tipW = pitcher.localToWorld(V(0, 0, 0));
      const spoutDir = pitcher.localToWorld(V(0, 0.10, 0)).sub(tipW);
      const grow = clamp((t - E.milk_pour.pour[0]) / 1.05);
      setArcStream(milkStream, tipW, land, spoutDir, pourAmt > 0.02, 0.85 + pourAmt * 0.4, grow);
      DBG.milk = { tip: tipW.toArray(), land: land.toArray(), pour: pourAmt, grow };
    }
    syrupPitcher.visible = syrupFill > 0.08 && t < E.coco.pour[0] + 0.4;
    syrupPitcher.scale.set(0.55 + 0.45 * syrupFill, 0.35 + 0.55 * syrupFill, 0.55 + 0.45 * syrupFill);
    syrupPitcher.position.y = -0.188 + 0.02 * syrupFill;
    syrupMeniscus.visible = syrupFill > 0.15 && t < E.coco.pour[0];
    syrupMeniscus.scale.setScalar(0.6 + 0.8 * syrupFill);
    creamPitcher.visible = mixFill > 0.10 && emptied > 0.12 && t >= E.coco.pour[0];
    creamPitcher.scale.set(0.7 + 0.4 * mixFill, 0.45 + 0.7 * mixFill * emptied, 0.7 + 0.4 * mixFill);
    creamPitcher.position.y = -0.175 + 0.02 * mixFill;
  }

  // bottles pour into pitcher mouth
  pitcher.updateMatrixWorld(true);
  const pitcherMouth = pitcher.visible ? pitcher.localToWorld(V(0.0, -0.05, 0.0)) : V(0.24, 0.16, 0.05);
  if (t < E.milk_pour.enter) {
    tipLock(cocoBot, cocoStream, E.coco, pitcherMouth, 0.20, t, 'coco');
    tipLock(evapBot, evapStream, E.evap, pitcherMouth, 0.20, t, 'evap');
  } else {
    cocoBot.visible = false; evapBot.visible = false;
    setStream(cocoStream, V(), V(), false); setStream(evapStream, V(), V(), false);
  }

  // sugar into pitcher — dissolve then cool before milk
  sugars.forEach((s, i) => {
    const tIn = E.sugar.start + i * E.sugar.gap;
    if (t < tIn || t > E.sugar_dissolve[1] + 0.15) { s.visible = false; return; }
    s.visible = true;
    const fly = clamp((t - tIn) / E.sugar.fall);
    const dest = pitcherMouth.clone(); dest.y += 0.01;
    const from = dest.clone(); from.y += 0.22; from.x += 0.08; from.z += 0.02;
    s.position.copy(from.lerp(dest, eo(fly)));
    s.rotation.set(fly * 2, i, fly);
    const melt = clamp(seg(t, E.sugar_dissolve[0] + i * 0.05, E.sugar_dissolve[1]));
    s.scale.setScalar(lerp(1, 0.12, eo(melt)));
    s.material.opacity = lerp(0.9, 0.05, eo(melt));
    s.material.transparent = true;
    if (melt > 0.97) s.visible = false;
  });
  // cooling steam after dissolve, before milk
  if (t >= E.sugar_dissolve[0] && t < E.coco.enter) {
    steam.forEach((s, i) => {
      if (t >= E.cook[0] && t <= E.lid.off + 0.6) return;
      const heat = 1 - coolU;
      if (heat < 0.08) { s.material.opacity = Math.min(s.material.opacity, 0); return; }
      const u = ((t * 0.4 + i * 0.14) % 1);
      const mouth = pitcherMouth;
      s.position.set(mouth.x + Math.sin(i + t) * 0.03, mouth.y + 0.04 + u * 0.16 * heat, mouth.z + Math.cos(i) * 0.03);
      s.scale.setScalar(0.05 + u * 0.07);
      s.material.opacity = 0.22 * heat * (1 - u);
    });
  }

  // cream in glass — wavy, not a flat pool
  if (t >= E.milk_pour.pour[0]) {
    const u = eo(seg(t, E.milk_pour.pour[0], E.milk_pour.pour[1]));
    creamGlass.visible = u > 0.08;
    creamGlass.scale.set(0.55 + 0.5 * u, 0.5 + 0.7 * u, 0.55 + 0.5 * u);
    creamGlass.position.y = GLASS_FLOOR + 0.018 + 0.028 * u;
  } else creamGlass.visible = false;

  // ice
  ices.forEach((ice, i) => {
    const tIn = E.ice.start + i * E.ice.gap;
    if (t < tIn) { ice.visible = false; return; }
    ice.visible = true;
    const fly = clamp((t - tIn) / E.ice.fall);
    const ang = i * 2.2;
    const dest = V(Math.cos(ang) * 0.025, glassFoodTop(t) + 0.01, Math.sin(ang) * 0.022);
    ice.position.set(dest.x, lerp(dest.y + 0.28, dest.y, eo(fly)), dest.z);
    ice.rotation.set(0.2, i, 0.15);
    ice.scale.setScalar(lerp(0.4, 1.05, eo(fly)));
  });

  island.rotation.y = Math.sin(t * 0.1) * 0.015;
  camAt(t);
}

function paintOver(t, t0, cols) {
  const a = win(t, t0, t0 + 0.42, 0.04, 0.12);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.5;
  const p = eio(seg(t, t0, t0 + 0.38));
  ctx.translate(W * (p - 0.15), 0);
  ctx.rotate(-0.16);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-220 + i * 78, -120, 42, H + 240);
  }
  ctx.restore();
}

function safeHud(t) {
  const T = K.theme, S = TL.steps, n = S.length, tEnd = S[n - 1].end;
  const TOP = 190;
  const hudA = win(t, 3.4, E.card, 0.6, 0.6); if (hudA <= 0) return;
  const x = 80, w = W - 160; // 80–1000
  ctx.save(); ctx.globalAlpha = hudA;
  K.panel(ctx, x, TOP, w, 176, 26, T.paper, T.ink);
  ctx.textAlign = 'left'; ctx.fillStyle = T.a1;
  ctx.font = `700 32px ${T.fontEn}`;
  ctx.fillText(T.brand, x + 28, TOP + 50);
  const bw = ctx.measureText(T.brand).width;
  ctx.fillStyle = T.ink;
  K.fitText(ctx, `${T.brandZh} · ${TL.dish.zh}`, x + 36 + bw, TOP + 50, 26, 360, T.fontZh, '700');
  const cur = K.currentStep(t);
  ctx.textAlign = 'right'; ctx.fillStyle = T.ink;
  ctx.font = `700 32px ${T.fontEn}`;
  ctx.fillText(cur ? `STEP ${cur.n}/${n}` : (t >= tEnd ? 'DONE!' : ''), x + w - 28, TOP + 50);
  const x0 = x + 28, x1 = x + w - 28, y = TOP + 78, gap = 10, sw = (x1 - x0 - gap * (n - 1)) / n;
  const cols = [T.a1, T.a2, T.a3, T.a4];
  for (let i = 0; i < n; i++) {
    const s = S[i], p = seg(t, s.start, s.end), sx = x0 + i * (sw + gap);
    ctx.fillStyle = 'rgba(61,43,31,.12)'; K.rr(ctx, sx, y, sw, 20, 10); ctx.fill();
    if (p > 0) { ctx.fillStyle = cols[i % 4]; K.rr(ctx, sx, y, Math.max(20, sw * p), 20, 10); ctx.fill(); }
  }
  const tot = clamp((t - S[0].start) / (tEnd - S[0].start));
  ctx.textAlign = 'left'; ctx.fillStyle = T.muted; ctx.font = `600 24px ${T.fontUi}`;
  ctx.fillText(`进度 PROGRESS  ${Math.round(tot * 100)}%`, x + 28, TOP + 152);
  if (cur) {
    ctx.textAlign = 'right';
    K.fitText(ctx, `${cur.zh} · ${cur.en}`, x + w - 28, TOP + 152, 24, 520, T.fontUi, '600');
    const a = win(t, cur.start, cur.end, 0.45, 0.35), e = back(seg(t, cur.start, cur.start + 0.55));
    ctx.save(); ctx.globalAlpha = hudA * a; ctx.translate(W / 2, TOP + 268); ctx.scale(0.65 + 0.35 * e, 0.65 + 0.35 * e);
    K.title(ctx, `${cur.n}. ${cur.zh}`, 0, 0, 84, T.ink, T.fontZh, { maxW: 900 });
    K.title(ctx, cur.en.toUpperCase(), 0, 62, 48, T.a1, T.fontEn, { maxW: 900, weight: '700' });
    ctx.restore();
  }
  ctx.restore();
  // callouts — x 80, English 36px
  for (const c of TL.callouts) {
    if (t < c.t0 - 0.05 || t > c.t1 + 0.05) continue;
    const p = seg(t, c.t0, c.t0 + 0.45), q = seg(t, c.t1 - 0.35, c.t1);
    const a = Math.min(eo(p), 1 - q); if (a <= 0) continue;
    const cx = 80, cy = TOP + 378, cw = W - 160, ch = 122;
    const col = c.kind === 'ing' ? (c.color || T.a2) : T.a3;
    ctx.save(); ctx.globalAlpha = a;
    const sc = 0.72 + 0.28 * back(p);
    ctx.translate(W / 2, cy + ch / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -(cy + ch / 2));
    K.panel(ctx, cx, cy, cw, ch, 24, T.paper, T.ink);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + 60, cy + ch / 2, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = T.ink; ctx.font = `700 40px ${T.fontEn}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.kind === 'ing' ? '+' : '▶', cx + 60, cy + ch / 2 + 2);
    ctx.textBaseline = 'alphabetic'; let amtW = 0;
    if (c.amt) {
      ctx.font = `700 32px ${T.fontUi}`; amtW = Math.min(360, ctx.measureText(c.amt).width + 44);
      const ax = cx + cw - 20 - amtW;
      ctx.fillStyle = col; K.rr(ctx, ax, cy + 28, amtW, 64, 28); ctx.fill();
      ctx.fillStyle = T.ink; ctx.textAlign = 'center';
      K.fitText(ctx, c.amt, ax + amtW / 2, cy + 72, 32, amtW - 24, T.fontUi, '700');
    }
    const tx = cx + 112, maxW = cw - 140 - amtW - (c.amt ? 20 : 0);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, c.zh, tx, cy + 54, 44, maxW, T.fontZh, '900');
    ctx.fillStyle = T.muted;
    K.fitText(ctx, c.en, tx, cy + 96, 36, maxW, T.fontUi, '600');
    ctx.restore();
  }
}

function safeRecipeCard(t, t0) {
  const T = K.theme, a = eo(seg(t, t0, t0 + 0.8)); if (a <= 0) return;
  const R = TL.recipe;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(61,43,31,.48)'; ctx.fillRect(0, 0, W, H);
  const x = 80, w = W - 160, y = 160, h = 1400; // bottom 1560 ≤ 1600
  K.panel(ctx, x, y, w, h, 32, T.paper, T.ink);
  ctx.textAlign = 'center';
  ctx.fillStyle = T.a1; ctx.font = `700 28px ${T.fontEn}`;
  ctx.fillText('FULL RECIPE · 完整配方', W / 2, y + 52);
  K.title(ctx, TL.dish.zh, W / 2, y + 122, 72, T.a1, T.fontZh, { maxW: w - 80 });
  ctx.fillStyle = T.ink;
  K.fitText(ctx, TL.dish.en.toUpperCase(), W / 2, y + 176, 38, w - 80, T.fontEn, '700');
  ctx.fillStyle = T.muted;
    K.fitText(ctx, `${TL.dish.servings} 人份 · ${TL.dish.cuisine}`, W / 2, y + 216, 24, w - 80, T.fontUi, '600');
  let yy = y + 258; ctx.textAlign = 'left';
  ctx.fillStyle = T.a3; ctx.font = `900 28px ${T.fontZh}`; ctx.fillText('食材  INGREDIENTS', x + 36, yy); yy += 12;
  R.ingredients.forEach((r, i) => {
    const ry = yy + 16 + i * 44;
    const ri = eo(seg(t, t0 + 0.35 + i * 0.04, t0 + 0.65 + i * 0.04));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = i % 2 ? 'rgba(232,146,42,.12)' : 'rgba(47,107,79,.10)';
    K.rr(ctx, x + 28, ry - 4, w - 56, 38, 10); ctx.fill();
    ctx.fillStyle = T.ink; ctx.font = `900 22px ${T.fontZh}`; ctx.fillText(r[0], x + 44, ry + 24);
    ctx.fillStyle = T.muted; K.fitText(ctx, r[1], x + 210, ry + 24, 20, 280, T.fontUi, '600');
    ctx.textAlign = 'right'; ctx.fillStyle = T.a1; K.fitText(ctx, r[2], x + w - 44, ry + 24, 22, 240, T.fontUi, '700');
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = a; yy += 16 + R.ingredients.length * 44 + 18;
  ctx.fillStyle = T.a3; ctx.font = `900 28px ${T.fontZh}`; ctx.fillText('步骤  STEPS', x + 36, yy); yy += 8;
  R.steps.forEach((s, i) => {
    const ry = yy + 12 + i * 72;
    const ri = eo(seg(t, t0 + 0.8 + i * 0.07, t0 + 1.1 + i * 0.07));
    ctx.globalAlpha = a * ri;
    ctx.fillStyle = [T.a1, T.a2, T.a3, T.a4][i % 4];
    ctx.beginPath(); ctx.arc(x + 58, ry + 28, 20, 0, TAU); ctx.fill();
    ctx.fillStyle = T.paper; ctx.font = `700 20px ${T.fontEn}`; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + 58, ry + 35);
    ctx.textAlign = 'left'; ctx.fillStyle = T.ink;
    K.fitText(ctx, s[0], x + 92, ry + 22, 22, w - 150, T.fontZh, '700');
    ctx.fillStyle = T.muted; K.fitText(ctx, s[1], x + 92, ry + 52, 20, w - 150, T.fontUi, '500');
  });
  ctx.restore();
}

function overlay(t) {
  const T = K.theme;
  const ia = 1 - seg(t, 3.2, 3.9);
  if (ia > 0) {
    ctx.save(); ctx.globalAlpha = ia;
    const e = back(seg(t, 0.25, 1.0)), e2 = back(seg(t, 0.7, 1.4));
    K.panel(ctx, 90, 300, W - 180, 330, 28, T.paper, T.ink);
    ctx.textAlign = 'center'; ctx.fillStyle = T.a1; ctx.font = `700 30px ${T.fontEn}`;
    ctx.fillText(`${T.brand} · EP ${String(TL.episode).padStart(2, '0')}`, W / 2, 360);
    ctx.save(); ctx.translate(W / 2, 470); ctx.scale(e, e);
    K.title(ctx, TL.dish.zh, 0, 0, 100, T.a1, T.fontZh, { maxW: 820 }); ctx.restore();
    ctx.save(); ctx.translate(W / 2, 548); ctx.scale(e2, e2);
    ctx.fillStyle = T.ink; K.fitText(ctx, TL.dish.en.toUpperCase(), 0, 0, 42, 820, T.fontEn, '700'); ctx.restore();
    ctx.globalAlpha = ia * seg(t, 1.5, 2.1);
    K.panel(ctx, 220, 650, W - 440, 58, 22, T.a4, T.ink);
    ctx.fillStyle = T.ink; ctx.textAlign = 'center';
    K.fitText(ctx, `${TL.dish.servings} 人份 · 动画已浓缩非实际时长`, W / 2, 688, 26, W - 500, T.fontUi, '700');
    ctx.restore();
  }
  [[24, ['#E8922A', '#E8D9B8', '#F4B942']], [46, ['#F2A3A0', '#E8D9B8', '#E07A6A']],
   [58, ['#F7E8C8', '#E8D9B8', '#F4B942']], [74, ['#2F6B4F', '#E8D9B8', '#F5F0E6']],
   [96, ['#E8922A', '#F2A3A0', '#F7E8C8']]].forEach(([tw, cols]) => paintOver(t, tw, cols));

  safeHud(t);

  // condensed cook process (no fixed 10–15 min cutoff)
  if (t >= E.cook[0] - 0.2 && t <= E.rinse.exit + 0.15) {
    const ta = win(t, E.cook[0], E.rinse.exit, 0.25, 0.25);
    ctx.save(); ctx.globalAlpha = ta;
    const phases = [
      { t0: E.stir.start, t1: E.stir.end, zh: '搅拌', en: 'STIR' },
      { t0: E.check.start, t1: E.check.end, zh: '查芯', en: 'CHECK' },
      { t0: E.lid.on, t1: E.lid.off, zh: '盖焖', en: 'COVER' },
      { t0: E.rinse.enter, t1: E.rinse.exit, zh: '过冷水', en: 'RINSE' }
    ];
    K.panel(ctx, 80, 1428, 920, 154, 20, T.paper, T.ink); // y+154=1582 ≤ 1600; x 80–1000
    ctx.fillStyle = T.ink; ctx.textAlign = 'left';
    K.fitText(ctx, '画面已浓缩 · 按包装煮 · 微小软白点≠未熟', 104, 1464, 26, 860, T.fontZh, '700');
    ctx.fillStyle = T.muted;
    K.fitText(ctx, 'TIME CONDENSED · follow package · tiny soft dots ≠ raw', 104, 1494, 20, 860, T.fontEn, '600');
    const x0 = 104, yb = 1520, gap = 10, sw = (880 - gap * 3) / 4;
    phases.forEach((ph, i) => {
      const p = seg(t, ph.t0, ph.t1);
      const sx = x0 + i * (sw + gap);
      const on = t >= ph.t0 && t <= ph.t1 + 0.05;
      ctx.fillStyle = on ? T.a1 : 'rgba(61,43,31,.12)';
      K.rr(ctx, sx, yb, sw, 44, 12); ctx.fill();
      if (p > 0 && p < 1) {
        ctx.fillStyle = T.a3;
        K.rr(ctx, sx, yb, Math.max(16, sw * p), 44, 12); ctx.fill();
      }
      ctx.fillStyle = T.ink; ctx.textAlign = 'center';
      K.fitText(ctx, `${ph.zh} ${ph.en}`, sx + sw / 2, yb + 30, 20, sw - 12, T.fontUi, '700');
      ctx.textAlign = 'left';
    });
    ctx.restore();
  }

  const fa = win(t, E.done, E.card + 0.5, 0.45, 0.35);
  if (fa > 0) {
    ctx.save(); ctx.globalAlpha = fa;
    const e = back(seg(t, E.done + 0.08, E.done + 0.7));
    ctx.save(); ctx.translate(W / 2, 430); ctx.scale(e, e); ctx.rotate(-0.02);
    K.title(ctx, '完成！DONE!', 0, 0, 96, T.a1, T.fontZh, { maxW: 900 }); ctx.restore();
    ctx.globalAlpha = fa * seg(t, E.done + 0.5, E.done + 1.0);
    K.panel(ctx, 140, 1480, W - 280, 80, 26, T.paper, T.ink);
    ctx.fillStyle = T.ink; ctx.textAlign = 'center';
    K.fitText(ctx, `${TL.dish.zh} · ${TL.dish.en}`, W / 2, 1532, 36, W - 340, T.fontZh, '900');
    ctx.restore();
  }
  safeRecipeCard(t, E.card);
  const f = Math.min(seg(t, 0, 0.35), 1 - seg(t, TL.duration - 0.5, TL.duration));
  if (f < 1) { ctx.fillStyle = `rgba(61,43,31,${1 - f})`; ctx.fillRect(0, 0, W, H); }
}

window.render = function (t) {
  update(t);
  R3.render(scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.drawImage(R3.domElement, 0, 0, W, H);
  // canvas wash — no film grain
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#E8D9B8';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const grd = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H * 0.42, H * 0.78);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(61,43,31,0.32)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  overlay(t);
  window.__dbg = JSON.parse(JSON.stringify(DBG));
};
(async () => {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    window.ready = true;
    try { render(0); } catch (e) { console.error(e); }
  };
  setTimeout(go, 6000);
  try { await Promise.race([K.loadFonts(), new Promise(r => setTimeout(r, 5000))]); } catch (e) { }
  go();
})();
