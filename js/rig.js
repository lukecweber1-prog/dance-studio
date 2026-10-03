// Procedural, articulated 3D dancer built from primitives.
// Poses are described in friendly degrees and applied with forward kinematics;
// the body is automatically planted on the floor every frame.
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
  rFoot: 0
});

const VEC_KEYS = ['pelvis', 'spine', 'chest', 'head', 'lArm', 'rArm', 'lLeg', 'rLeg'];
const NUM_KEYS = ['squat', 'spin', 'lFoot', 'rFoot'];

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

export const HAIR_STYLES = { short: 'Short hair', long: 'Long hair', bun: 'Bun' };
export const defaultHair = (outfit) => (outfit === 'dress' ? 'long' : 'short');

const lathe = (pts, seg = 22) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const taper = (r1, r2, len) => new THREE.CylinderGeometry(r1, r2, len, 16);
const ball = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);

export class Dancer {
  constructor({ name = 'Dancer', color = '#e85d75', outfit = 'pants', skin = SKIN_TONES[1], hair } = {}) {
    this.root = new THREE.Group();
    this._build(color, outfit, skin, hair || defaultHair(outfit));
    this.setLabel(name, color);
    this.setPose(P());
  }

  _mat(color, rough = 0.65, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02, ...extra });
  }

  _mesh(geo, mat, parent, pos = [0, 0, 0], scale) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  _build(color, outfit, skinColor, hairStyle) {
    const suit = outfit === 'suit';
    const dress = outfit === 'dress';
    const casual = !suit && !dress;
    const cloth = this._mat(color, suit ? 0.5 : 0.8);
    const lapelMat = this._mat(new THREE.Color(color).multiplyScalar(0.75), 0.45);
    const trousers = suit ? cloth : this._mat(new THREE.Color(color).multiplyScalar(0.35).lerp(new THREE.Color('#2f3b55'), 0.55), 0.85);
    const skin = this._mat(skinColor, 0.62);
    const shirt = this._mat('#f3f1ec', 0.6);
    const hair = this._mat('#2a1a12', 0.75);
    const dark = this._mat('#17141a', 0.5);
    const shoe = suit ? this._mat('#111013', 0.28) : dress ? this._mat('#c49a6c', 0.6) : this._mat('#ecebe7', 0.7);
    const twoSided = (m) => Object.assign(m.clone(), { side: THREE.DoubleSide });
    this.materials = { top: cloth, skin, hair };

    const G = () => new THREE.Group();
    const legMat = dress ? skin : trousers;
    const hipMat = dress ? cloth : trousers;

    // ---- pelvis / torso ----
    const pelvis = (this.pelvis = G());
    this.root.add(pelvis);
    this._mesh(lathe([[0, -0.1], [0.1, -0.1], [0.145, -0.04], [0.14, 0.02], [0.128, 0.08], [0, 0.08]]), hipMat, pelvis, [0, 0, 0], [1.05, 1, 0.72]);

    const spine = (this.spine = G());
    spine.position.y = 0.06;
    pelvis.add(spine);
    this._mesh(lathe([[0, -0.02], [0.13, -0.02], [0.117, 0.08], [0.12, 0.16], [0.128, 0.23], [0, 0.23]]), cloth, spine, [0, 0, 0], [1.05, 1, 0.7]);

    const chest = (this.chest = G());
    chest.position.y = 0.2;
    spine.add(chest);
    const shoulderW = dress ? 0.97 : 1.08;
    this._mesh(
      lathe([[0, 0], [0.126, 0], [0.142, 0.1], [0.158, 0.18], [0.165, 0.24], [0.15, 0.29], [0.11, 0.32], [0.05, 0.335], [0, 0.335]]),
      cloth,
      chest,
      [0, 0, 0],
      [shoulderW, 1, 0.68]
    );
    if (dress) {
      // bare shoulders/neckline above a sleeveless bodice
      this._mesh(lathe([[0, 0.27], [0.15, 0.27], [0.11, 0.32], [0.05, 0.338], [0, 0.338]]), skin, chest, [0, 0.004, 0], [shoulderW * 1.01, 1, 0.7]);
    }

    // ---- neck & head ----
    const neck = (this.neck = G());
    neck.position.y = 0.33;
    chest.add(neck);
    this._mesh(taper(0.043, 0.05, 0.1), skin, neck, [0, 0.03, 0]);
    const head = (this.head = G());
    head.position.y = 0.07;
    neck.add(head);
    this._mesh(ball(0.1, 24, 18), skin, head, [0, 0.105, 0], [0.86, 1.08, 0.96]);
    this._mesh(ball(0.07, 18, 12), skin, head, [0, 0.055, 0.025], [1, 0.95, 1]); // jaw
    for (const s of [1, -1]) {
      this._mesh(ball(0.022, 10, 8), skin, head, [0.087 * s, 0.1, -0.005], [0.45, 1, 0.75]); // ears
      this._mesh(ball(0.011, 8, 6), dark, head, [0.032 * s, 0.118, 0.084]); // eyes
      this._mesh(new THREE.BoxGeometry(0.03, 0.006, 0.01), hair, head, [0.032 * s, 0.137, 0.086]).rotation.z = -0.12 * s; // brows
    }
    const nose = this._mesh(new THREE.ConeGeometry(0.014, 0.04, 8), skin, head, [0, 0.093, 0.1]);
    nose.rotation.x = Math.PI / 2.4;

    // hair
    this._mesh(new THREE.SphereGeometry(0.108, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, head, [0, 0.122, -0.008], [0.9, 0.95, 1.02]);
    this._mesh(ball(0.103, 20, 14), hair, head, [0, 0.105, -0.028], [0.9, 0.98, 0.9]);
    if (hairStyle === 'long') {
      const fall = new THREE.CylinderGeometry(0.098, 0.13, 0.46, 20, 1, true, Math.PI * 0.5, Math.PI);
      this._mesh(fall, twoSided(hair), head, [0, -0.115, -0.018], [1, 1, 0.75]);
      for (const s of [1, -1]) this._mesh(new THREE.BoxGeometry(0.025, 0.3, 0.07), hair, head, [0.083 * s, -0.04, 0.005]).rotation.z = 0.08 * s;
    } else if (hairStyle === 'bun') {
      this._mesh(ball(0.052, 14, 10), hair, head, [0, 0.175, -0.085]);
    }

    // ---- suit / casual details ----
    if (suit) {
      const v = new THREE.Shape();
      v.moveTo(-0.045, 0);
      v.lineTo(0.045, 0);
      v.lineTo(0, -0.15);
      v.closePath();
      const shirtV = this._mesh(new THREE.ShapeGeometry(v), shirt, chest, [0, 0.318, 0.104]);
      shirtV.rotation.x = -0.3;
      this._mesh(new THREE.BoxGeometry(0.022, 0.15, 0.008), this._mat('#5f6672', 0.5), chest, [0, 0.235, 0.118]).rotation.x = -0.18; // tie
      for (const s of [1, -1]) this._mesh(new THREE.BoxGeometry(0.03, 0.17, 0.012), lapelMat, chest, [0.04 * s, 0.24, 0.112], undefined).rotation.set(-0.2, 0, 0.32 * s); // lapels
      this._mesh(new THREE.CylinderGeometry(0.133, 0.155, 0.2, 24, 1, true), twoSided(cloth), pelvis, [0, -0.045, 0], [1.05, 1, 0.74]); // jacket hem
      this._mesh(ball(0.008, 8, 6), dark, spine, [0, 0.07, 0.093]); // button
    }

    // ---- arms ----
    this.arms = {};
    const upperMat = dress ? skin : cloth;
    const foreMat = suit ? cloth : skin;
    for (const side of [1, -1]) {
      const sh = G();
      sh.position.set(0.18 * side * shoulderW, 0.255, 0);
      chest.add(sh);
      this._mesh(ball(0.057), upperMat, sh);
      if (casual) {
        this._mesh(taper(0.046, 0.039, UPPER_ARM), skin, sh, [0, -UPPER_ARM / 2, 0]);
        this._mesh(taper(0.06, 0.054, 0.13), cloth, sh, [0, -0.06, 0]); // tee sleeve
      } else this._mesh(taper(dress ? 0.042 : 0.052, dress ? 0.035 : 0.044, UPPER_ARM), upperMat, sh, [0, -UPPER_ARM / 2, 0]);
      const el = G();
      el.position.y = -UPPER_ARM;
      sh.add(el);
      this._mesh(ball(suit ? 0.044 : 0.038), foreMat, el);
      this._mesh(taper(suit ? 0.044 : 0.037, suit ? 0.038 : 0.028, FOREARM), foreMat, el, [0, -FOREARM / 2, 0]);
      if (suit) this._mesh(taper(0.031, 0.031, 0.02), shirt, el, [0, -FOREARM + 0.005, 0]); // cuff
      // hand: palm faces the body when hanging, thumb to the front
      this._mesh(new THREE.BoxGeometry(0.026, 0.085, 0.07), skin, el, [0, -FOREARM - 0.045, 0.004]);
      this._mesh(new THREE.CapsuleGeometry(0.011, 0.035, 3, 8), skin, el, [-0.008 * side, -FOREARM - 0.03, 0.042]).rotation.x = 0.5;
      this.arms[side] = { sh, el };
    }

    // ---- legs ----
    this.legs = {};
    for (const side of [1, -1]) {
      const hip = G();
      hip.position.set(0.088 * side, -0.04, 0);
      pelvis.add(hip);
      this._mesh(taper(dress ? 0.07 : 0.078, dress ? 0.05 : 0.058, THIGH), legMat, hip, [0, -THIGH / 2, 0]);
      const knee = G();
      knee.position.y = -THIGH;
      hip.add(knee);
      this._mesh(ball(dress ? 0.05 : 0.057), legMat, knee);
      this._mesh(taper(dress ? 0.05 : 0.056, dress ? 0.033 : 0.045, SHIN), legMat, knee, [0, -SHIN / 2, 0]);
      const ankle = G();
      ankle.position.y = -SHIN;
      knee.add(ankle);
      const footGeo = new THREE.CapsuleGeometry(dress ? 0.034 : 0.043, dress ? 0.15 : 0.16, 4, 12).rotateX(Math.PI / 2);
      if (dress) {
        this._mesh(footGeo, skin, ankle, [0, -0.05, 0.045], [0.95, 0.7, 1]);
        this._mesh(new THREE.BoxGeometry(0.075, 0.012, 0.24), shoe, ankle, [0, -0.07, 0.045]); // sandal sole
        this._mesh(new THREE.BoxGeometry(0.078, 0.012, 0.02), shoe, ankle, [0, -0.047, 0.09]); // strap
      } else {
        this._mesh(footGeo, shoe, ankle, [0, -0.048, 0.045], [1, 0.72, 1]);
      }
      const heel = new THREE.Object3D();
      heel.position.set(0, -ANKLE_TO_SOLE, -0.06);
      const toe = new THREE.Object3D();
      toe.position.set(0, -ANKLE_TO_SOLE, 0.16);
      ankle.add(heel, toe);
      this.legs[side] = { hip, knee, ankle, heel, toe };
    }

    if (dress) {
      // knee-length shift skirt
      this.skirt = this._mesh(new THREE.CylinderGeometry(0.148, 0.235, 0.5, 30, 3, true), twoSided(cloth), pelvis, [0, -0.23, 0], [1.04, 1, 0.82]);
    }
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
    this.pelvis.position.y += -minY + (p.root.lift || 0);
    this.pelvis.updateMatrixWorld(true);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }
}
