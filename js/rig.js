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

export class Dancer {
  constructor({ name = 'Dancer', color = '#e85d75', outfit = 'pants', skin = SKIN_TONES[1] } = {}) {
    this.root = new THREE.Group();
    this._build(color, outfit, skin);
    this.setLabel(name, color);
    this.setPose(P());
  }

  _mat(color, rough = 0.65) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
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

  _build(color, outfit, skinColor) {
    const top = this._mat(color);
    const bottomColor = new THREE.Color(color).multiplyScalar(outfit === 'suit' ? 1 : 0.45);
    const bottom = this._mat(bottomColor);
    const skin = this._mat(skinColor, 0.8);
    const shoe = this._mat('#1d1a24', 0.4);
    const hair = this._mat('#2b1d14', 0.9);
    this.materials = { top, bottom, skin, shoe, hair };

    const G = () => new THREE.Group();
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 12);

    const pelvis = (this.pelvis = G());
    this.root.add(pelvis);
    this._mesh(new THREE.SphereGeometry(1, 16, 12), bottom, pelvis, [0, 0, 0], [0.16, 0.11, 0.11]);

    const spine = (this.spine = G());
    spine.position.y = 0.06;
    pelvis.add(spine);
    this._mesh(cap(0.115, 0.12), top, spine, [0, 0.09, 0], [1.05, 1, 0.82]);

    const chest = (this.chest = G());
    chest.position.y = 0.2;
    spine.add(chest);
    this._mesh(cap(0.14, 0.13), top, chest, [0, 0.13, 0], [1.18, 1, 0.8]);

    const neck = (this.neck = G());
    neck.position.y = 0.33;
    chest.add(neck);
    this._mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 10), skin, neck, [0, 0.03, 0]);
    const head = (this.head = G());
    head.position.y = 0.07;
    neck.add(head);
    this._mesh(new THREE.SphereGeometry(0.105, 20, 16), skin, head, [0, 0.1, 0.005], [0.92, 1.05, 1]);
    // hair cap + nose so facing direction is readable
    this._mesh(
      new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hair,
      head,
      [0, 0.115, -0.012],
      [0.95, 1.02, 1.02]
    );
    this._mesh(new THREE.ConeGeometry(0.016, 0.035, 8), skin, head, [0, 0.09, 0.105]).rotation.x = Math.PI / 2;

    this.arms = {};
    for (const side of [1, -1]) {
      const sh = G();
      sh.position.set(0.19 * side, 0.25, 0);
      chest.add(sh);
      this._mesh(new THREE.SphereGeometry(0.06, 12, 10), top, sh);
      this._mesh(cap(0.047, UPPER_ARM - 0.06), top, sh, [0, -UPPER_ARM / 2, 0]);
      const el = G();
      el.position.y = -UPPER_ARM;
      sh.add(el);
      this._mesh(cap(0.04, FOREARM - 0.06), skin, el, [0, -FOREARM / 2, 0]);
      this._mesh(new THREE.SphereGeometry(0.045, 12, 10), skin, el, [0, -FOREARM - 0.035, 0], [0.8, 1.15, 0.6]);
      this.arms[side] = { sh, el };
    }

    this.legs = {};
    for (const side of [1, -1]) {
      const hip = G();
      hip.position.set(0.09 * side, -0.04, 0);
      pelvis.add(hip);
      this._mesh(cap(0.07, THIGH - 0.1), bottom, hip, [0, -THIGH / 2, 0]);
      const knee = G();
      knee.position.y = -THIGH;
      hip.add(knee);
      this._mesh(cap(0.055, SHIN - 0.08), bottom, knee, [0, -SHIN / 2, 0]);
      const ankle = G();
      ankle.position.y = -SHIN;
      knee.add(ankle);
      this._mesh(new THREE.BoxGeometry(0.085, 0.06, 0.23), shoe, ankle, [0, -0.045, 0.045]);
      const heel = new THREE.Object3D();
      heel.position.set(0, -ANKLE_TO_SOLE, -0.06);
      const toe = new THREE.Object3D();
      toe.position.set(0, -ANKLE_TO_SOLE, 0.16);
      ankle.add(heel, toe);
      this.legs[side] = { hip, knee, ankle, heel, toe };
    }

    if (outfit === 'dress') {
      const dressMat = top.clone();
      dressMat.side = THREE.DoubleSide;
      const skirt = this._mesh(new THREE.CylinderGeometry(0.15, 0.46, 0.72, 28, 1, true), dressMat, pelvis, [0, -0.33, 0]);
      skirt.castShadow = true;
      this.skirt = skirt;
      // bodice in same colour; hide legs a little by making trousers skin-toned below the skirt
      for (const side of [1, -1]) this.legs[side].knee.children[0].material = skin;
    }
    if (outfit === 'suit') {
      // white shirt + tie hint on the chest
      const shirt = this._mat('#f4f1ea', 0.6);
      this._mesh(new THREE.BoxGeometry(0.08, 0.2, 0.02), shirt, chest, [0, 0.15, 0.112]);
      this._mesh(new THREE.BoxGeometry(0.025, 0.16, 0.012), this._mat('#1a1a1a'), chest, [0, 0.14, 0.125]);
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
