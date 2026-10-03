// Procedural 3D dancer: a skeleton driven by friendly pose angles (forward kinematics),
// wrapped in smooth skinned meshes for the body and clothes, with a face, hair, hands and a
// cloth-like skirt. The body is automatically planted on the floor every frame.
import * as THREE from 'three';

const D2R = Math.PI / 180;
const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();

// Lengths in metres
const THIGH = 0.43;
const SHIN = 0.42;
const ANKLE_TO_SOLE = 0.075;
const HIP_H = 0.04 + THIGH + SHIN + ANKLE_TO_SOLE;
const UPPER_ARM = 0.28;
const FOREARM = 0.25;

/** The rest pose. Every pose in the move library is a partial override of this. */
export const NEUTRAL = Object.freeze({
  root: { x: 0, z: 0, rot: 0, lift: 0 },
  spin: 0, // couple rotation (partner moves only)
  squat: 0, // plié depth in degrees of knee bend
  pelvis: [0, 0, 0], // [lean fwd, twist, tilt]
  spine: [0, 0, 0],
  chest: [0, 0, 0],
  head: [0, 0, 0], // [nod, turn, tilt]
  // limbs: [raise, direction, twist, bend]
  //   raise 0 = hanging down, 90 = horizontal, 180 = straight up
  //   direction 0 = out to the side, 90 = forward, -90 = backward, 150 = across the body
  lArm: [12, 0, 0, 12],
  rArm: [12, 0, 0, 12],
  lLeg: [3, 0, 0, 3],
  rLeg: [3, 0, 0, 3],
  lFoot: 0, // pointe (degrees)
  rFoot: 0,
  air: 0 // 0 = feet planted on the floor, 1 = body held in the air (lifts): pelvis at standing height + root.lift
});

const VEC_KEYS = ['pelvis', 'spine', 'chest', 'head', 'lArm', 'rArm', 'lLeg', 'rLeg'];
const NUM_KEYS = ['squat', 'spin', 'lFoot', 'rFoot', 'air'];

export function clonePose(p) {
  const o = { root: { ...p.root } };
  for (const k of VEC_KEYS) o[k] = p[k].slice();
  for (const k of NUM_KEYS) o[k] = p[k];
  return o;
}

/** Build a full pose from a partial override. */
export function P(over = {}) {
  const o = clonePose(NEUTRAL);
  for (const k in over) {
    if (k === 'root') Object.assign(o.root, over.root);
    else if (Array.isArray(over[k])) o[k] = over[k].slice();
    else o[k] = over[k];
  }
  return o;
}

/** Mirror a pose left <-> right. */
export function mirrorPose(p) {
  const o = clonePose(p);
  o.lArm = p.rArm.slice();
  o.rArm = p.lArm.slice();
  o.lLeg = p.rLeg.slice();
  o.rLeg = p.lLeg.slice();
  o.lFoot = p.rFoot;
  o.rFoot = p.lFoot;
  for (const k of ['pelvis', 'spine', 'chest', 'head']) o[k] = [p[k][0], -p[k][1], -p[k][2]];
  o.root.x = -p.root.x;
  o.root.rot = -p.root.rot;
  o.spin = -p.spin;
  return o;
}

const lerp = (a, b, t) => a + (b - a) * t;

export function lerpPose(a, b, t, out = clonePose(a)) {
  for (const k of VEC_KEYS) {
    const av = a[k], bv = b[k], ov = out[k];
    for (let i = 0; i < av.length; i++) ov[i] = lerp(av[i], bv[i], t);
  }
  for (const k of NUM_KEYS) out[k] = lerp(a[k], b[k], t);
  out.root.x = lerp(a.root.x, b.root.x, t);
  out.root.z = lerp(a.root.z, b.root.z, t);
  out.root.rot = lerp(a.root.rot, b.root.rot, t);
  out.root.lift = lerp(a.root.lift, b.root.lift, t);
  return out;
}

function limbQuat(out, raise, dir, twist, side) {
  const r = Math.min(Math.max(raise, 0), 178) * D2R;
  const d = dir * D2R;
  _v.set(Math.sin(r) * Math.cos(d), -Math.cos(r), Math.sin(r) * Math.sin(d));
  out.setFromUnitVectors(DOWN, _v.normalize());
  _q.setFromAxisAngle(UP, twist * D2R);
  out.multiply(_q);
  if (side < 0) {
    out.y = -out.y;
    out.z = -out.z;
  }
  return out;
}

function setTorso(obj, [lean, twist, tilt]) {
  obj.rotation.set(lean * D2R, twist * D2R, -tilt * D2R, 'YXZ');
}

const SKIN_TONES = ['#f1c7a5', '#d9a07a', '#b97a56', '#8d5a3b', '#5e3a24'];
export { SKIN_TONES };

function labelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = '600 30px Inter, system-ui, sans-serif';
  const w = Math.min(240, g.measureText(text).width + 36);
  g.fillStyle = 'rgba(15,12,30,0.78)';
  const x = (256 - w) / 2;
  g.beginPath();
  g.roundRect(x, 8, w, 48, 24);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(x + 20, 32, 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.textBaseline = 'middle';
  g.fillText(text, x + 32, 33, w - 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.8, 0.2, 1);
  s.renderOrder = 10;
  return s;
}

// ---------------------------------------------------------------------------
// Body building: smooth skinned meshes lofted along the skeleton in its bind
// pose (limbs hanging straight down), so joints bend like skin instead of
// showing as separate balls and capsules.
// ---------------------------------------------------------------------------
export const HAIR_STYLES = { short: 'Short hair', updo: 'Updo', ponytail: 'Ponytail' };
export const defaultHair = (outfit) => (outfit === 'dress' ? 'updo' : 'short');

const HAIR_COLORS = ['#2b1d14', '#5a3a22', '#141010', '#8a5a32', '#3b2618', '#b48a5a'];

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x) => Math.exp(-x * x);

/** Catmull-Rom through table rows [y, ...values] (sorted by y), returning the values at y. */
function profileAt(table, y) {
  const n = table.length;
  if (y <= table[0][0]) return table[0].slice(1);
  if (y >= table[n - 1][0]) return table[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && y > table[i + 1][0]) i++;
  const p0 = table[Math.max(0, i - 1)], p1 = table[i], p2 = table[i + 1], p3 = table[Math.min(n - 1, i + 2)];
  const t = (y - p1[0]) / (p2[0] - p1[0]);
  const t2 = t * t, t3 = t2 * t;
  const out = [];
  for (let k = 1; k < p1.length; k++) {
    const v = 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    out.push(Math.max(0, v));
  }
  return out;
}

/** Blend between the bone above and the bone below a joint at yJ (half-width h). */
function two(y, yJ, h, upper, lower) {
  const s = smoothstep(yJ + h, yJ - h, y);
  if (s <= 0) return [[upper, 1]];
  if (s >= 1) return [[lower, 1]];
  return [
    [upper, 1 - s],
    [lower, s]
  ];
}

/**
 * Loft a closed tube around a vertical axis at (cx, cz) from yTop down to yBot.
 * prof(y) -> [rx, rzFront, rzBack, czOffset]; region(y, phi, side) -> material key, where
 * phi is the angle from the front (0 = facing forward, PI = back) and side is the sign of x.
 */
function loft({ yTop, yBot, rings, radial, cx = 0, cz = 0, prof, bump, region, weights, keys }) {
  const pos = [];
  const sIdx = [];
  const sW = [];
  const groups = keys.map(() => []);
  const keyIndex = Object.fromEntries(keys.map((k, i) => [k, i]));
  const vert = (x, y, z) => {
    pos.push(x, y, z);
    const w = weights(y, x - cx, z - cz);
    for (let k = 0; k < 4; k++) {
      sIdx.push(w[k] ? w[k][0] : 0);
      sW.push(w[k] ? w[k][1] : 0);
    }
    return pos.length / 3 - 1;
  };
  const ring = [];
  const ys = [];
  for (let r = 0; r <= rings; r++) {
    const y = yTop + ((yBot - yTop) * r) / rings;
    ys.push(y);
    const [rx, rzF, rzB, oz] = prof(y);
    const row = [];
    for (let j = 0; j < radial; j++) {
      const th = (2 * Math.PI * j) / radial;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const b = bump ? bump(th, y) : 0;
      row.push(vert(cx + (rx + b) * c, y, cz + oz + ((s > 0 ? rzF : rzB) + b) * s));
    }
    ring.push(row);
  }
  const phiOf = (th) => Math.abs(Math.atan2(Math.cos(th), Math.sin(th)));
  const sideOf = (th) => Math.sign(Math.cos(th)) || 1;
  const add = (key, a, b, c) => groups[keyIndex[key] ?? 0].push(a, b, c);
  for (let r = 0; r < rings; r++) {
    const ym = (ys[r] + ys[r + 1]) / 2;
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const th = (2 * Math.PI * (j + 0.5)) / radial;
      const key = region(ym, phiOf(th), sideOf(th));
      const a = ring[r][j], b = ring[r][j2], c = ring[r + 1][j], d = ring[r + 1][j2];
      add(key, a, b, c);
      add(key, b, d, c);
    }
  }
  // caps
  const top = vert(cx, yTop, cz + prof(yTop)[3]);
  const bot = vert(cx, yBot, cz + prof(yBot)[3]);
  for (let j = 0; j < radial; j++) {
    const j2 = (j + 1) % radial;
    add(region(yTop, 0, 1), top, ring[0][j2], ring[0][j]);
    add(region(yBot, 0, 1), bot, ring[rings][j], ring[rings][j2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
  const index = [];
  groups.forEach((g, i) => {
    if (!g.length) return;
    geo.addGroup(index.length, g.length, i);
    index.push(...g);
  });
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// Torso cross-sections in pelvis space: [y, rx, rzFront, rzBack, zOffset]
const TORSO = {
  m: [
    [-0.125, 0.02, 0.02, 0.02, 0],
    [-0.1, 0.11, 0.08, 0.09, 0],
    [-0.055, 0.158, 0.1, 0.115, -0.005],
    [0.0, 0.163, 0.1, 0.118, -0.005],
    [0.08, 0.148, 0.095, 0.1, 0],
    [0.16, 0.14, 0.095, 0.09, 0.005],
    [0.26, 0.152, 0.11, 0.095, 0.01],
    [0.36, 0.166, 0.122, 0.1, 0.015],
    [0.45, 0.186, 0.114, 0.102, 0.01],
    [0.51, 0.19, 0.097, 0.092, 0],
    [0.545, 0.155, 0.08, 0.08, -0.005],
    [0.57, 0.118, 0.07, 0.07, -0.006],
    [0.6, 0.065, 0.06, 0.06, 0],
    [0.66, 0.058, 0.055, 0.055, 0.005],
    [0.73, 0.045, 0.045, 0.045, 0.01],
    [0.75, 0.01, 0.01, 0.01, 0.01]
  ],
  f: [
    [-0.125, 0.02, 0.02, 0.02, 0],
    [-0.1, 0.12, 0.085, 0.1, 0],
    [-0.05, 0.172, 0.104, 0.125, -0.008],
    [0.02, 0.166, 0.098, 0.118, -0.006],
    [0.1, 0.134, 0.085, 0.09, 0],
    [0.16, 0.117, 0.08, 0.08, 0.004],
    [0.26, 0.128, 0.088, 0.084, 0.008],
    [0.35, 0.14, 0.096, 0.088, 0.01],
    [0.44, 0.155, 0.094, 0.085, 0.008],
    [0.51, 0.168, 0.085, 0.08, 0],
    [0.545, 0.143, 0.074, 0.074, -0.005],
    [0.57, 0.105, 0.064, 0.064, -0.006],
    [0.6, 0.055, 0.051, 0.051, 0],
    [0.66, 0.049, 0.047, 0.047, 0.005],
    [0.73, 0.04, 0.04, 0.04, 0.01],
    [0.75, 0.01, 0.01, 0.01, 0.01]
  ]
};
function torsoBump(fem, th, yl) {
  const phi = Math.abs(Math.atan2(Math.cos(th), Math.sin(th)));
  let b = 0;
  if (fem) b += 0.034 * gauss((yl - 0.35) / 0.05) * gauss((phi - 0.5) / 0.32);
  else b += 0.01 * gauss((yl - 0.4) / 0.06) * gauss((phi - 0.45) / 0.4); // pecs
  b += 0.012 * gauss((yl + 0.03) / 0.05) * gauss((phi - Math.PI + 0.45) / 0.35); // glutes
  return b;
}

/** Point on the torso surface (pelvis space) at angle th (PI/2 = front), lifted by `out`. */
function torsoPoint(fem, loose, th, yl, out) {
  const [rx, rzF, rzB, oz] = profileAt(TORSO[fem ? 'f' : 'm'], yl);
  const b = torsoBump(fem, th, yl) + loose + out;
  const s = Math.sin(th);
  return [(rx + b) * Math.cos(th), yl, oz + ((s > 0 ? rzF : rzB) + b) * s];
}

/** A panel lying on the torso between angles thA(y)..thB(y), for y in [y0, y1]. */
function torsoPanel(fem, loose, y0, y1, thA, thB, out) {
  const U = 14;
  const V = 40;
  const pos = [];
  for (let v = 0; v <= V; v++) {
    const yl = y0 + ((y1 - y0) * v) / V;
    for (let u = 0; u <= U; u++) pos.push(...torsoPoint(fem, loose, thA(yl) + ((thB(yl) - thA(yl)) * u) / U, yl, out));
  }
  const idx = [];
  for (let v = 0; v < V; v++)
    for (let u = 0; u < U; u++) {
      const a = v * (U + 1) + u, b = a + 1, c = a + U + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Limb radii by distance below the joint: [d, r]
const ARM = [
  [-0.065, 0.014],
  [-0.045, 0.049],
  [-0.01, 0.063],
  [0.05, 0.057],
  [0.12, 0.05],
  [0.2, 0.046],
  [0.26, 0.039],
  [0.3, 0.042],
  [0.35, 0.045],
  [0.43, 0.036],
  [0.5, 0.029],
  [0.53, 0.027],
  [0.548, 0.012]
];
const LEG = [
  [-0.085, 0.02],
  [-0.06, 0.08],
  [0.0, 0.1],
  [0.1, 0.093],
  [0.25, 0.077],
  [0.38, 0.056],
  [0.43, 0.052],
  [0.47, 0.055],
  [0.55, 0.067],
  [0.64, 0.055],
  [0.76, 0.038],
  [0.84, 0.033],
  [0.875, 0.012]
];
const limbProf = (table, d) => profileAt(table.map(([dd, r]) => [dd, r]), d)[0];

/** Unit-sphere -> head shape (taller than wide, narrow jaw, rounder back of skull). */
function headShape(x, y, z, fem) {
  let sx = 0.86;
  const sy = 1.17;
  let sz = z < 0 ? 1.05 : 0.98;
  if (y < 0) {
    const j = Math.pow(-y, 1.4);
    sx *= 1 - (fem ? 0.36 : 0.3) * j;
    sz *= 1 - 0.14 * j * (z < 0 ? 1.8 : 0.25);
  }
  if (z > 0.6 && y > -0.2 && y < 0.25) sx *= 1 + 0.03 * (1 - Math.abs(y) * 4); // cheekbones
  return [x * sx, y * sy, z * sz];
}

function headGeometry(R, fem) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = headShape(p.getX(i), p.getY(i), p.getZ(i), fem);
    p.setXYZ(i, x * R, y * R, z * R);
  }
  g.computeVertexNormals();
  return g;
}

/** Hair shell: rows run from the hairline (exact, so the edge is smooth) up to the crown. */
function hairGeometry(R, fem, scale, line) {
  const A = 72;
  const Tn = 26;
  const pos = [];
  for (let t = 0; t <= Tn; t++) {
    const u = t / Tn;
    for (let a = 0; a < A; a++) {
      const al = (2 * Math.PI * a) / A;
      const dx = Math.sin(al);
      const dz = Math.cos(al);
      const c = line(dx, dz);
      const uy = t === 0 ? c - 0.04 : c + (1 - c) * Math.pow(u, 0.9);
      const h = Math.sqrt(Math.max(0, 1 - uy * uy));
      const k = t === 0 ? 0.995 : 1 + (scale - 1) * smoothstep(0, 0.25, u);
      const [x, y, z] = headShape(dx * h, uy, dz * h, fem);
      const top = 1 + (k - 1) * 1.6 * Math.max(0, uy);
      pos.push(x * R * k, y * R * k * top, z * R * k * top);
    }
  }
  pos.push(0, R * 1.17 * scale * (1 + (scale - 1) * 1.6), 0);
  const idx = [];
  for (let t = 0; t < Tn; t++)
    for (let a = 0; a < A; a++) {
      const a2 = (a + 1) % A;
      const p0 = t * A + a, p1 = t * A + a2, p2 = (t + 1) * A + a, p3 = (t + 1) * A + a2;
      idx.push(p0, p1, p2, p1, p3, p2);
    }
  const apex = pos.length / 3 - 1;
  for (let a = 0; a < A; a++) idx.push(Tn * A + a, Tn * A + ((a + 1) % A), apex);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Mannequin look: tan body with drawing-guide grid lines, joint bands and a toon outline
// ---------------------------------------------------------------------------
const MANNEQUIN = { tan: '#c98e4e', line: '#f0dcc2', outline: '#16110c' };

/**
 * Tan material that draws latitude rings, longitude lines around (cx, cz) and wider bands at the given
 * heights, all in bind-pose space so the lines stay painted on the body as it moves.
 */
function gridMaterial({ cx = 0, cz = 0, bands = [], grid = true } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: MANNEQUIN.tan, roughness: 0.6, metalness: 0 });
  const b = [...bands, -99, -99, -99, -99].slice(0, 4);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCenter = { value: new THREE.Vector2(cx, cz) };
    sh.uniforms.uBands = { value: new THREE.Vector4(...b) };
    sh.uniforms.uGrid = { value: grid ? 1 : 0 };
    sh.uniforms.uLine = { value: new THREE.Color(MANNEQUIN.line) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;\nuniform vec2 uCenter;\nuniform vec4 uBands;\nuniform float uGrid;\nuniform vec3 uLine;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float ry = vBind.y * 7.0;
          float lat = 1.0 - smoothstep(0.035, 0.035 + fwidth(ry), abs(fract(ry + 0.5) - 0.5));
          float a = atan(vBind.z - uCenter.y, vBind.x - uCenter.x) * 0.9549297; // 6 lines around
          float lon = 1.0 - smoothstep(0.03, 0.03 + min(fwidth(a), 0.2), abs(fract(a + 0.5) - 0.5));
          float band = 0.0;
          for (int i = 0; i < 4; i++) band = max(band, 1.0 - smoothstep(0.006, 0.006 + fwidth(vBind.y), abs(vBind.y - uBands[i])));
          float l = max(max(lat, lon) * 0.6 * uGrid, band * 0.9);
          diffuseColor.rgb = mix(diffuseColor.rgb, uLine, l);
        }`
      );
  };
  mat.customProgramCacheKey = () => 'mannequin-grid';
  return mat;
}

/** Inverted-hull outline: back faces pushed out along the (skinned) normal, drawn dark. */
function outlineMaterial() {
  const mat = new THREE.MeshBasicMaterial({ color: MANNEQUIN.outline, side: THREE.BackSide });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      #ifdef USE_SKINNING
        vec3 oN = objectNormal;
      #else
        vec3 oN = normal;
      #endif
      mvPosition.xyz += normalize(normalMatrix * oN) * 0.006;
      gl_Position = projectionMatrix * mvPosition;`
    );
  };
  mat.customProgramCacheKey = () => 'mannequin-outline';
  return mat;
}

function mixColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export class Dancer {
  /**
   * outfit: 'pants' | 'suit' | 'dress'. variant picks hair & build for casual dancers.
   */
  constructor({ name = 'Dancer', color = '#e85d75', outfit = 'pants', skin = SKIN_TONES[1], variant = 0, look = 'outfit', hair } = {}) {
    this.root = new THREE.Group();
    this.outfit = outfit;
    this.mannequin = look === 'mannequin';
    this.fem = outfit === 'dress' || (outfit === 'pants' && variant % 2 === 1);
    this.hairStyle = HAIR_STYLES[hair] ? hair : outfit === 'pants' && this.fem ? 'ponytail' : defaultHair(outfit);
    this.hairColor = outfit === 'suit' ? '#5a3a22' : outfit === 'dress' ? '#2a1a12' : HAIR_COLORS[(variant * 3 + 1) % HAIR_COLORS.length];
    this._build(color, this.mannequin ? 'none' : outfit, skin);
    this.root.scale.setScalar(this.fem ? 0.94 : 0.98);
    this.blink = { next: performance.now() / 1000 + 1 + Math.random() * 3, until: 0 };
    this.setLabel(name, color);
    this.setPose(P());
  }

  _materials(color, outfit, skinColor) {
    const phys = (o) => new THREE.MeshPhysicalMaterial({ metalness: 0, ...o });
    const std = (o) => new THREE.MeshStandardMaterial({ metalness: 0, ...o });
    const skin = phys({ color: skinColor, roughness: 0.52, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ff9f8a') });
    const fabric = new THREE.Color(color);
    const m = {
      skin,
      hair: phys({ color: this.hairColor, roughness: 0.5, sheen: 0.6, sheenRoughness: 0.4, sheenColor: mixColor(this.hairColor, '#ffffff', 0.35) }),
      lip: phys({ color: mixColor(skinColor, this.fem ? '#b5485c' : '#a65a5a', this.fem ? 0.55 : 0.3), roughness: 0.4, sheen: 0.3 }),
      eyeWhite: std({ color: '#f3efe9', roughness: 0.25 }),
      iris: std({ color: this.fem ? '#3d2a1c' : '#4a6178', roughness: 0.3 }),
      pupil: std({ color: '#0b0b0b', roughness: 0.2 }),
      brow: std({ color: mixColor(this.hairColor, '#000000', 0.2), roughness: 0.9 }),
      shoe: std({ color: outfit === 'dress' ? '#efe6d6' : outfit === 'suit' ? '#5b3520' : '#1d1a24', roughness: 0.35, metalness: 0.05 })
    };
    if (outfit === 'suit') {
      m.jacket = phys({ color: fabric, roughness: 0.62, sheen: 0.6, sheenRoughness: 0.5, sheenColor: mixColor(fabric, '#ffffff', 0.4) });
      m.lapel = phys({ color: mixColor(fabric, '#000000', 0.12), roughness: 0.4, sheen: 0.8, sheenColor: mixColor(fabric, '#ffffff', 0.5), clearcoat: 0.3, clearcoatRoughness: 0.4 });
      m.shirt = std({ color: '#f7f5f0', roughness: 0.6 });
      m.pants = m.jacket;
      m.tie = phys({ color: '#7d8aa3', roughness: 0.4, sheen: 0.8, sheenColor: new THREE.Color('#dfe6f5') });
      m.top = m.jacket;
    } else if (outfit === 'dress') {
      m.dress = phys({ color: fabric, roughness: 0.5, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
      m.top = m.dress;
    } else {
      m.top = phys({ color: fabric, roughness: 0.7, sheen: 0.4, sheenColor: mixColor(fabric, '#ffffff', 0.4) });
      m.bottom = phys({ color: mixColor(fabric, '#1b2133', 0.78), roughness: 0.8, sheen: 0.25, sheenColor: new THREE.Color('#6d7590') });
    }
    return m;
  }

  _build(color, outfit, skinColor) {
    const B = () => new THREE.Bone();
    const fem = this.fem;
    const m = (this.materials = this._materials(color, outfit, skinColor));
    if (this.mannequin) {
      m.skin = gridMaterial({ grid: false });
      m.shoe = m.skin;
      m.top = m.skin;
      this.outlineMat = outlineMaterial();
    }

    // ----- skeleton (same joint layout the poses were authored for) -----
    const pelvis = (this.pelvis = B());
    this.root.add(pelvis);
    const spine = (this.spine = B());
    spine.position.y = 0.06;
    pelvis.add(spine);
    const chest = (this.chest = B());
    chest.position.y = 0.2;
    spine.add(chest);
    const neck = (this.neck = B());
    neck.position.y = 0.33;
    chest.add(neck);
    const head = (this.head = B());
    head.position.y = 0.07;
    neck.add(head);
    this.arms = {};
    this.legs = {};
    for (const side of [1, -1]) {
      const sh = B();
      sh.position.set(0.19 * side, 0.25, 0);
      chest.add(sh);
      const el = B();
      el.position.y = -UPPER_ARM;
      sh.add(el);
      this.arms[side] = { sh, el };
      const hip = B();
      hip.position.set(0.09 * side, -0.04, 0);
      pelvis.add(hip);
      const knee = B();
      knee.position.y = -THIGH;
      hip.add(knee);
      const ankle = B();
      ankle.position.y = -SHIN;
      knee.add(ankle);
      const heel = new THREE.Object3D();
      heel.position.set(0, -ANKLE_TO_SOLE, -0.06);
      const toe = new THREE.Object3D();
      toe.position.set(0, -ANKLE_TO_SOLE, 0.16);
      ankle.add(heel, toe);
      this.legs[side] = { hip, knee, ankle, heel, toe };
    }
    const bones = [pelvis, spine, chest, neck, head, this.arms[1].sh, this.arms[1].el, this.arms[-1].sh, this.arms[-1].el];
    for (const side of [1, -1]) bones.push(this.legs[side].hip, this.legs[side].knee, this.legs[side].ankle);
    const BI = new Map(bones.map((b, i) => [b, i]));
    pelvis.position.y = HIP_H;
    this.root.updateMatrixWorld(true);
    const skeleton = (this.skeleton = new THREE.Skeleton(bones));
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());

    const skinned = (geo, keys, guide = {}) => {
      const mesh = new THREE.SkinnedMesh(geo, this.mannequin ? gridMaterial(guide) : keys.map((k) => m[k]));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      mesh.bind(skeleton);
      if (this.mannequin) {
        const line = new THREE.SkinnedMesh(geo, this.outlineMat);
        line.frustumCulled = false;
        this.root.add(line);
        line.bind(skeleton);
      }
      return mesh;
    };

    // ----- torso -----
    const T = TORSO[fem ? 'f' : 'm'];
    const looseTop = outfit === 'suit' ? 0.012 : outfit === 'pants' ? 0.006 : outfit === 'dress' ? 0.004 : 0;
    const torsoKeys = outfit === 'suit' ? ['jacket', 'shirt', 'skin'] : outfit === 'dress' ? ['dress', 'skin'] : ['top', 'bottom', 'skin'];
    const torsoRegion = (yl, phi) => {
      if (outfit === 'suit') {
        if (yl > 0.635) return 'skin';
        if (yl > 0.57) return 'shirt';
        return 'jacket';
      }
      if (outfit === 'dress') return yl > 0.56 ? 'skin' : 'dress';
      if (yl > 0.565) return 'skin';
      return yl < 0.03 ? 'bottom' : 'top';
    };
    const SH = { 1: BI.get(this.arms[1].sh), [-1]: BI.get(this.arms[-1].sh) };
    const torsoGeo = loft({
      yTop: HIP_H + 0.75,
      yBot: HIP_H - 0.125,
      rings: 110,
      radial: 64,
      keys: torsoKeys,
      prof: (y) => {
        const yl = y - HIP_H;
        const [rx, rzF, rzB, oz] = profileAt(T, yl);
        const cloth = yl < 0.56 ? looseTop : 0;
        return [rx + cloth, rzF + cloth, rzB + cloth, oz];
      },
      bump: (th, y) => torsoBump(fem, th, y - HIP_H),
      region: (y, phi) => torsoRegion(y - HIP_H, phi),
      weights: (y, x) => {
        const yl = y - HIP_H;
        let w;
        if (yl < 0.06) w = two(yl, 0.03, 0.03, 1, 0);
        else if (yl < 0.4) w = two(yl, 0.25, 0.05, 2, 1);
        else if (yl < 0.64) w = two(yl, 0.6, 0.03, 3, 2);
        else w = two(yl, 0.68, 0.03, 4, 3);
        // let the shoulder edge follow the arm a little (deltoid / armpit)
        const ws = 0.45 * smoothstep(0.11, 0.19, Math.abs(x)) * gauss((yl - 0.5) / 0.07);
        if (ws > 0.01) {
          w = w.map(([b, v]) => [b, v * (1 - ws)]);
          w.push([SH[Math.sign(x) || 1], ws]);
        }
        return w;
      }
    });
    skinned(torsoGeo, torsoKeys, { bands: [HIP_H + 0.07, HIP_H + 0.6] });

    // ----- arms -----
    for (const side of [1, -1]) {
      const S = wp(this.arms[side].sh);
      const shI = BI.get(this.arms[side].sh);
      const elI = BI.get(this.arms[side].el);
      const k = fem ? 0.86 : 1;
      const keys = outfit === 'suit' ? ['jacket', 'shirt', 'skin'] : outfit === 'dress' ? ['dress', 'skin'] : ['top', 'skin'];
      const sleeve = outfit === 'suit' ? 0.505 : outfit === 'dress' ? 0.13 : 0.12;
      const geo = loft({
        yTop: S.y + 0.065,
        yBot: S.y - 0.548,
        rings: 70,
        radial: 28,
        cx: S.x,
        cz: S.z,
        keys,
        prof: (y) => {
          const d = S.y - y;
          let r = limbProf(ARM, d) * k;
          if (outfit === 'suit' && d < 0.53 && d > -0.04) r = Math.max(r * 1.1 + 0.008, Math.min(r + 0.02, 0.044));
          else if (outfit === 'dress' && d < sleeve && d > -0.04) r += 0.02 * Math.sin(Math.min(1, (d + 0.04) / (sleeve + 0.04)) * Math.PI * 0.9) + 0.004;
          else if (outfit === 'pants' && d < sleeve && d > -0.04) r += 0.008;
          return [r, r * 0.92, r * 0.92, 0];
        },
        region: (y) => {
          const d = S.y - y;
          if (outfit === 'suit') return d > 0.53 ? 'skin' : d > 0.49 ? 'shirt' : 'jacket';
          return d < sleeve ? keys[0] : 'skin';
        },
        weights: (y) => two(y, S.y - UPPER_ARM, 0.035, shI, elI)
      });
      skinned(geo, keys, { cx: S.x, cz: S.z, bands: [S.y - UPPER_ARM, S.y - 0.525] });
      this._hand(side, m.skin);
    }

    // ----- legs -----
    for (const side of [1, -1]) {
      const H = wp(this.legs[side].hip);
      const hipI = BI.get(this.legs[side].hip);
      const kneeI = BI.get(this.legs[side].knee);
      const ankI = BI.get(this.legs[side].ankle);
      const key = outfit === 'suit' ? 'pants' : outfit === 'pants' ? 'bottom' : 'skin';
      const k = fem ? 0.9 : 1;
      const geo = loft({
        yTop: H.y + 0.085,
        yBot: H.y - 0.875,
        rings: 90,
        radial: 30,
        cx: H.x,
        cz: H.z,
        keys: [key],
        prof: (y) => {
          const d = H.y - y;
          let r = limbProf(LEG, d) * k;
          if (outfit === 'suit' && d > -0.05 && d < 0.86) r = Math.max(r + 0.008, 0.064 - 0.006 * d);
          else if (outfit === 'pants' && d > -0.05 && d < 0.86) r = Math.max(r + 0.004, 0.052);
          return [r, r * 0.95, r * 0.95, 0];
        },
        region: () => key,
        weights: (y) => {
          const d = H.y - y;
          return d > 0.64 ? two(-d, -0.845, 0.02, kneeI, ankI) : two(-d, -THIGH, 0.04, hipI, kneeI);
        }
      });
      skinned(geo, [key], { cx: H.x, cz: H.z, bands: [H.y - THIGH, H.y - 0.835] });
      this._shoe(side, m.shoe);
    }

    this._buildHead(m);
    if (this.mannequin) return;
    if (outfit === 'suit') this._suitDetails(m);
    if (outfit === 'dress') this._buildSkirt(m.dress);
  }

  _rigid(geo, mat, parent, pos = [0, 0, 0], scale, rot) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    if (scale) mesh.scale.set(...scale);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (this.mannequin) {
      const line = new THREE.Mesh(geo, this.outlineMat);
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      line.scale.copy(mesh.scale);
      parent.add(line);
    }
    return mesh;
  }

  _hand(side, skin) {
    // palm faces the body (-x on the left arm), fingers hang down, thumb forward;
    // each finger has two segments with a relaxed curl towards the palm
    const g = new THREE.Group();
    g.position.y = -FOREARM + 0.004;
    this.arms[side].el.add(g);
    const sph = new THREE.SphereGeometry(1, 20, 14);
    const k = this.fem ? 0.9 : 1;
    this._rigid(sph, skin, g, [0, -0.048 * k, 0.002], [0.016 * k, 0.05 * k, 0.041 * k]);
    const seg = (len, r) => new THREE.CapsuleGeometry(r * k, len * k, 4, 8);
    const finger = (z, len, spread, curl) => {
      const base = new THREE.Group();
      base.position.set(0, -0.092 * k, z * k);
      base.rotation.set(-spread, 0, -side * curl);
      g.add(base);
      this._rigid(seg(len * 0.55, 0.0082), skin, base, [0, -len * 0.3 * k, 0]);
      const tip = new THREE.Group();
      tip.position.y = -len * 0.6 * k;
      tip.rotation.z = -side * curl * 1.2;
      base.add(tip);
      this._rigid(seg(len * 0.45, 0.0074), skin, tip, [0, -len * 0.26 * k, 0]);
    };
    finger(0.027, 0.046, 0.16, 0.22);
    finger(0.009, 0.052, 0.05, 0.25);
    finger(-0.009, 0.049, -0.05, 0.28);
    finger(-0.026, 0.04, -0.18, 0.32);
    const thumb = new THREE.Group();
    thumb.position.set(-side * 0.006, -0.03 * k, 0.036 * k);
    thumb.rotation.set(0.75, 0, -side * 0.35);
    g.add(thumb);
    this._rigid(seg(0.034, 0.009), skin, thumb, [0, -0.022 * k, 0]);
  }

  _shoe(side, mat) {
    const g = new THREE.SphereGeometry(1, 24, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i);
      if (y < -0.55) y = -0.55; // flat sole
      const z = p.getZ(i);
      p.setY(i, y * (z > 0.3 ? 0.75 : 1)); // lower toe box
    }
    g.computeVertexNormals();
    // bare mannequin feet are slimmer and lower than shoes
    const k = (this.fem ? 0.88 : 1) * (this.mannequin ? 0.88 : 1);
    const h = this.mannequin ? 0.048 : 0.055;
    this._rigid(g, mat, this.legs[side].ankle, [0, -ANKLE_TO_SOLE + h * 0.55, 0.045], [0.047 * k, h, 0.13 * k]);
  }

  _buildHead(m) {
    const fem = this.fem;
    const R = fem ? 0.094 : 0.098;
    const g = new THREE.Group();
    g.position.set(0, 0.082, 0.008);
    this.head.add(g);
    this._rigid(headGeometry(R, fem), this.mannequin ? gridMaterial({ bands: [-R * 0.75] }) : m.skin, g);
    const surf = (ux, uy) => {
      const uz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
      const [x, y, z] = headShape(ux, uy, uz, fem);
      return new THREE.Vector3(x * R, y * R, z * R);
    };
    const sph = new THREE.SphereGeometry(1, 20, 14);
    // eyes
    this.eyes = [];
    for (const s of [1, -1]) {
      // ear
      const e = surf(0.985 * s, 0.02);
      this._rigid(sph, m.skin, g, [e.x + 0.003 * s, e.y, e.z - 0.006], [0.008, 0.026, 0.017], [0, -0.35 * s, 0]);
      if (this.mannequin) continue; // the mannequin is faceless apart from ears and nose
      const c = surf(0.35 * s, 0.09);
      c.z -= 0.0095;
      const eye = new THREE.Group();
      eye.position.copy(c);
      g.add(eye);
      const er = 0.0122;
      this._rigid(sph, m.eyeWhite, eye, [0, 0, 0], [er, er, er]);
      this._rigid(new THREE.CircleGeometry(0.0068, 24), m.iris, eye, [0, -0.0004, er + 0.0003]);
      this._rigid(new THREE.CircleGeometry(0.0031, 16), m.pupil, eye, [0, -0.0004, er + 0.0005]);
      this._rigid(new THREE.CircleGeometry(0.0011, 8), m.eyeWhite, eye, [0.0018, 0.0014, er + 0.0007]);
      // eyelids (upper one darker along the lash line)
      this._rigid(new THREE.SphereGeometry(er * 1.1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), m.skin, eye, [0, 0, 0], null, [0.12, 0, 0]);
      this._rigid(new THREE.TorusGeometry(er * 0.9, 0.0011, 6, 24, Math.PI * 0.8), m.brow, eye, [0, 0.0012, 0.0052], [1, 0.7, 1], [0, 0, Math.PI * 0.1]);
      this._rigid(new THREE.SphereGeometry(er * 1.08, 24, 10, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), m.skin, eye, [0, 0, 0], null, [-0.2, 0, 0]);
      this.eyes.push(eye);
      // brow
      const b = surf(0.37 * s, 0.31);
      this._rigid(new THREE.CapsuleGeometry(fem ? 0.0024 : 0.0034, 0.024, 4, 8), m.brow, g, [b.x, b.y, b.z + 0.001], null, [0, 0, Math.PI / 2 + s * (fem ? 0.2 : 0.1)]);
    }
    // nose
    const nb = surf(0, -0.04);
    this._rigid(sph, m.skin, g, [nb.x, nb.y, nb.z - 0.004], [0.0105, 0.027, 0.016], [-0.25, 0, 0]);
    const nt = surf(0, -0.2);
    this._rigid(sph, m.skin, g, [nt.x, nt.y, nt.z + 0.008], [0.0115, 0.0105, 0.011]);
    if (this.mannequin) return;
    for (const s of [1, -1]) this._rigid(sph, m.skin, g, [0.011 * s, nt.y - 0.002, nt.z + 0.001], [0.0078, 0.0068, 0.0075]);
    // lips
    const ul = surf(0, -0.43);
    this._rigid(sph, m.lip, g, [ul.x, ul.y, ul.z + 0.0005], [fem ? 0.018 : 0.019, fem ? 0.0058 : 0.0048, 0.008]);
    const ll = surf(0, -0.53);
    this._rigid(sph, m.lip, g, [ll.x, ll.y, ll.z + 0.001], [fem ? 0.016 : 0.0165, fem ? 0.007 : 0.006, 0.0085]);

    // hair: a shell over the skull, bounded by a hairline that is high at the forehead and low at the nape
    const line = (front, side, back) => (ux, uz) => {
      const c = uz / (Math.hypot(ux, uz) || 1);
      return c > 0 ? side + (front - side) * c * c : side + (back - side) * c * c;
    };
    if (this.hairStyle === 'short') {
      this._rigid(hairGeometry(R, fem, 1.075, line(0.4, 0.05, -0.5)), m.hair, g);
      // a soft side-swept fringe
      this._rigid(sph, m.hair, g, [0.02, R * 1.0, R * 0.5], [R * 0.62, R * 0.24, R * 0.42], [0.45, 0.3, -0.2]);
    } else {
      this._rigid(hairGeometry(R, fem, 1.04, line(0.42, 0.02, -0.25)), m.hair, g);
      if (this.hairStyle === 'updo') {
        this._rigid(sph, m.hair, g, [0, R * 0.42, -R * 1.02], [0.048, 0.04, 0.038]);
        this._rigid(sph, m.hair, g, [0.025, R * 0.62, -R * 0.95], [0.03, 0.026, 0.026]);
        const flower = new THREE.MeshStandardMaterial({ color: '#f5f1ea', roughness: 0.5 });
        [
          [0.05, 0.6, -0.85],
          [0.065, 0.48, -0.82],
          [0.045, 0.42, -0.95]
        ].forEach(([x, y, z]) => this._rigid(sph, flower, g, [x, R * y, R * z], [0.011, 0.011, 0.008]));
      } else {
        this._rigid(sph, m.hair, g, [0, R * 0.45, -R * 1.0], [0.03, 0.03, 0.03]);
        this._rigid(new THREE.CapsuleGeometry(0.022, 0.13, 6, 12), m.hair, g, [0, -0.03, -R * 1.12], null, [0.25, 0, 0]);
      }
    }
  }

  _suitDetails(m) {
    // bow tie, buttons and a boutonniere, fixed to the chest (chest space = pelvis space - 0.26)
    const sph = new THREE.SphereGeometry(1, 16, 12);
    const T = TORSO.m;
    const front = (yl, x = 0) => {
      const [rx, rzF, , oz] = profileAt(T, yl);
      return oz + (rzF + 0.012) * Math.sqrt(Math.max(0, 1 - (x / (rx + 0.012)) ** 2));
    };
    const tie = new THREE.Group();
    tie.position.set(0, 0.32, front(0.58) + 0.006);
    this.chest.add(tie);
    this._rigid(sph, m.tie, tie, [0.02, 0, 0], [0.02, 0.013, 0.008], [0, 0, 0.15]);
    this._rigid(sph, m.tie, tie, [-0.02, 0, 0], [0.02, 0.013, 0.008], [0, 0, -0.15]);
    this._rigid(sph, m.tie, tie, [0, 0, 0.003], [0.008, 0.009, 0.007]);
    // white shirt in the jacket's V-neck, framed by satin lapels (chest space = pelvis space - 0.26)
    const vw = (yl) => 0.42 * smoothstep(0.33, 0.57, yl) + 0.004;
    const F = Math.PI / 2;
    const panel = (geo, mat) => this._rigid(geo, mat, this.chest, [0, -0.26, 0]);
    panel(torsoPanel(false, 0.012, 0.335, 0.575, (y) => F - vw(y), (y) => F + vw(y), 0.0015), m.shirt);
    for (const sd of [1, -1]) {
      const a = (y) => F - sd * vw(y);
      const b = (y) => F - sd * (vw(y) + 0.11 + 0.08 * smoothstep(0.4, 0.5, y) * smoothstep(0.58, 0.5, y));
      panel(torsoPanel(false, 0.012, 0.35, 0.575, sd > 0 ? b : a, sd > 0 ? a : b, 0.003), m.lapel);
    }
    const button = new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.3 });
    for (const yl of [0.27, 0.19]) this._rigid(sph, button, this.chest, [0, yl - 0.26, front(yl)], [0.007, 0.007, 0.004]);
    const leaf = new THREE.MeshStandardMaterial({ color: '#6f8f6a', roughness: 0.6 });
    const bloom = new THREE.MeshStandardMaterial({ color: '#eef0ea', roughness: 0.6 });
    this._rigid(sph, leaf, this.chest, [0.095, 0.155, front(0.415, 0.095) + 0.002], [0.012, 0.02, 0.006], [0, 0, -0.4]);
    this._rigid(sph, bloom, this.chest, [0.1, 0.17, front(0.43, 0.1) + 0.005], [0.011, 0.011, 0.008]);
  }

  // ----- the gown's skirt: a cloth-like mesh re-shaped every frame around the legs -----
  _buildSkirt(mat) {
    const N = 28;
    const M = 56;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * M * 3), 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++)
      for (let j = 0; j < M; j++) {
        const a = i * M + j, b = i * M + ((j + 1) % M), c = (i + 1) * M + j, d = (i + 1) * M + ((j + 1) % M);
        idx.push(a, b, c, b, d, c);
      }
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    this.skirt = { mesh, geo, N, M, r: new Float32Array(M), prev: new Float32Array(M), hem: new THREE.Vector3(), init: false, flare: 0, lastRot: 0, lastT: 0 };
  }

  _updateSkirt() {
    const S = this.skirt;
    const now = performance.now() / 1000;
    const dt = S.init ? Math.min(0.1, Math.max(0.001, now - S.lastT)) : 1 / 60;
    S.lastT = now;
    const rot = this.root.rotation.y;
    const omega = S.init ? Math.min(20, Math.abs(rot - S.lastRot) / dt) : 0;
    S.lastRot = rot;
    S.flare += (Math.min(0.32, omega * 0.03) - S.flare) * (1 - Math.exp(-dt * 4));

    const inv = _m1.copy(this.root.matrixWorld).invert();
    const Mp = _m2.multiplyMatrices(inv, this.pelvis.matrixWorld);
    const local = (o) => o.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
    // leg samples (root space)
    const samples = [];
    for (const side of [1, -1]) {
      const L = this.legs[side];
      const pts = [local(L.hip), local(L.knee), local(L.ankle), local(L.toe)];
      for (let s = 0; s < 3; s++) for (let t = 0; t < 1; t += 0.2) samples.push(pts[s].clone().lerp(pts[s + 1], t));
      samples.push(pts[3]);
    }
    const hipC = new THREE.Vector3(0, -0.05, 0).applyMatrix4(Mp);
    const ankMid = local(this.legs[1].ankle).add(local(this.legs[-1].ankle)).multiplyScalar(0.5);
    const hemTarget = hipC.clone().lerp(ankMid, 0.55);
    if (!S.init) S.hem.copy(hemTarget);
    else S.hem.lerp(hemTarget, 1 - Math.exp(-dt * 9));
    S.init = true;

    const { N, M, r, prev } = S;
    const pos = S.geo.attributes.position.array;
    const topRings = 4;
    const hipR = S.hipR || (S.hipR = new Float32Array(M));
    const v = new THREE.Vector3();
    const hemY = Math.max(0.018 + S.flare * 0.35, hipC.y - 0.9 + S.flare * 0.2); // a fixed length of fabric, so it lifts with her
    for (let i = 0; i < N; i++) {
      if (i < topRings) {
        // fitted bodice-to-hip section follows the pelvis
        const yl = 0.13 - (0.18 * i) / (topRings - 1);
        for (let j = 0; j < M; j++) {
          const [px, py, pz] = torsoPoint(true, 0.004, (2 * Math.PI * j) / M, yl, 0.006 + 0.012 * (i / (topRings - 1)) ** 2);
          v.set(px, py, pz).applyMatrix4(Mp);
          pos.set([v.x, v.y, v.z], (i * M + j) * 3);
          if (i === topRings - 1) hipR[j] = Math.hypot(px, pz - 0.0);
        }
        continue;
      }
      const s = (i - topRings + 1) / (N - topRings);
      const y = hipC.y + (hemY - hipC.y) * s;
      const cx = hipC.x + (S.hem.x - hipC.x) * s;
      const cz = hipC.z + (S.hem.z - hipC.z) * s;
      const grow = Math.pow(s, 1.15);
      const flare = 1 + S.flare * 2.2 * Math.pow(s, 1.4);
      for (let j = 0; j < M; j++) {
        const th = (2 * Math.PI * j) / M;
        const dx = Math.cos(th);
        const dz = Math.sin(th);
        let rr = (hipR[j] + 0.004 + (0.3 - hipR[j]) * grow) * flare;
        for (const q of samples) {
          if (Math.abs(q.y - y) > 0.08) continue;
          const ox = q.x - cx;
          const oz = q.z - cz;
          const along = ox * dx + oz * dz;
          const perp = Math.abs(ox * dz - oz * dx);
          const lim = 0.12;
          if (along > 0 && perp < lim) {
            const need = Math.min(0.5, along + 0.075);
            if (need > rr) rr += (need - rr) * (1 - perp / lim);
          }
        }
        if (i > topRings) rr = Math.max(rr, rr + (prev[j] - rr) * 0.85); // fabric drapes down from whatever pushed it out
        r[j] = rr;
      }
      // smooth around the hem so the fabric never kinks
      for (let j = 0; j < M; j++) prev[j] = (r[(j + M - 1) % M] + 2 * r[j] + r[(j + 1) % M]) / 4;
      // blend the first loose rings from the pelvis frame into the hanging (gravity) frame
      const w = smoothstep(0, 1, (i - topRings + 1) / 6);
      for (let j = 0; j < M; j++) {
        const th = (2 * Math.PI * j) / M;
        const gx = cx + prev[j] * Math.cos(th);
        const gz = cz + prev[j] * Math.sin(th);
        let px = gx, py = y, pz = gz;
        if (w < 1) {
          v.set(prev[j] * Math.cos(th), -0.05 - (hipC.y - y), prev[j] * Math.sin(th)).applyMatrix4(Mp);
          px = v.x + (gx - v.x) * w;
          py = v.y + (y - v.y) * w;
          pz = v.z + (gz - v.z) * w;
        }
        pos.set([px, Math.max(0.012, py), pz], (i * M + j) * 3); // never through the floor
      }
    }
    S.geo.attributes.position.needsUpdate = true;
    S.geo.computeVertexNormals();
  }

  _updateBlink() {
    const now = performance.now() / 1000;
    const b = this.blink;
    if (now > b.next) {
      b.until = now + 0.12;
      b.next = now + 2.5 + Math.random() * 3.5;
    }
    const sy = now < b.until ? 0.15 : 1;
    for (const e of this.eyes) e.scale.y = sy;
  }

  setLabel(name, color) {
    if (this.label) {
      this.root.remove(this.label);
      this.label.material.map.dispose();
    }
    this.label = labelSprite(name, color);
    this.label.position.y = 2.02;
    this.root.add(this.label);
  }

  setHighlight(on) {
    for (const m of [this.materials.top]) m.emissive.set(on ? 0x221122 : 0x000000);
  }

  /** Apply a full pose. Position/rotation of the root group is handled by the caller. */
  setPose(p) {
    const k = p.squat || 0;
    this.pelvis.position.set(0, HIP_H, 0);
    setTorso(this.pelvis, [p.pelvis[0] - k * 0.5, p.pelvis[1], p.pelvis[2]]);
    setTorso(this.spine, [p.spine[0] + k * 0.5, p.spine[1], p.spine[2]]);
    setTorso(this.chest, p.chest);
    setTorso(this.head, p.head);

    for (const side of [1, -1]) {
      const a = side > 0 ? p.lArm : p.rArm;
      const arm = this.arms[side];
      limbQuat(arm.sh.quaternion, a[0], a[1], a[2], side);
      arm.el.rotation.set(-a[3] * D2R, 0, 0);

      const l = side > 0 ? p.lLeg : p.rLeg;
      const leg = this.legs[side];
      limbQuat(leg.hip.quaternion, l[0], l[1], l[2], side);
      leg.knee.rotation.set((l[3] + k) * D2R, 0, 0);
    }

    // Keep the feet level with the floor (plus optional pointe), following leg turn-out.
    this.root.updateMatrixWorld(true);
    this.root.getWorldQuaternion(_q2);
    for (const side of [1, -1]) {
      const l = side > 0 ? p.lLeg : p.rLeg;
      const pointe = side > 0 ? p.lFoot : p.rFoot;
      const leg = this.legs[side];
      leg.knee.getWorldQuaternion(_q3).invert();
      _q.setFromAxisAngle(UP, l[2] * 0.6 * D2R * side);
      const target = _q2.clone().multiply(_q).multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, pointe * D2R));
      leg.ankle.quaternion.copy(_q3.multiply(target));
    }
    this.root.updateMatrixWorld(true);

    // Plant the lowest point of either foot on the floor.
    let minY = Infinity;
    for (const side of [1, -1]) {
      for (const pt of [this.legs[side].heel, this.legs[side].toe]) {
        pt.getWorldPosition(_v);
        this.root.worldToLocal(_v);
        if (_v.y < minY) minY = _v.y;
      }
    }
    // Lifts blend from "standing on the floor" to "held in the air" so the follow can leave the ground.
    const air = Math.min(1, Math.max(0, p.air || 0));
    this.pelvis.position.y += -minY * (1 - air) + (p.root.lift || 0);
    this.pelvis.updateMatrixWorld(true);
    if (this.skirt) this._updateSkirt();
    this._updateBlink();
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const mat of mats) {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
    });
  }
}

const _m1 = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
