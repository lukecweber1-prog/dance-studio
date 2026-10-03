// Imported, rigged 3D characters (glTF). An invisible procedural skeleton (rig.js, driverOnly) is posed
// with the usual choreography and its joint rotations are retargeted onto the model's own bones, so every
// move, hold and lift works with real characters too.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Dancer, labelSprite, P } from './rig.js';

const HIP_H = 0.04 + 0.43 + 0.42 + 0.075; // the driver skeleton's standing hip height (rig.js)

export const MODELS = {
  groom: {
    url: 'models/groom.json',
    height: 1.8,
    credit: 'Groom: “Man dressed in suit”, made with MakeHuman (CC0)'
  },
  bride: {
    url: 'models/bride.json',
    height: 1.68,
    gown: { hem: 0.41 }, // her dress ends at 41% of her height; a floor-length satin skirt continues below it
    credit: 'Bride: “Casual Woman in Brown Dress Rigged Idle” by florah (sketchfab.com/florah), CC BY 4.0'
  }
};

// Driver joint -> candidate bone names (Mixamo and MakeHuman "game engine" skeletons), after normalising.
const BONES = {
  pelvis: ['hips'],
  spine: ['spine'],
  chest: ['spine1', 'chest'],
  neck: ['neck'],
  head: ['head'],
  shL: ['leftarm', 'upper_arm_l'],
  elL: ['leftforearm', 'forearm_l'],
  handL: ['lefthand', 'hand_l'],
  shR: ['rightarm', 'upper_arm_r'],
  elR: ['rightforearm', 'forearm_r'],
  handR: ['righthand', 'hand_r'],
  hipL: ['leftupleg', 'thigh_l'],
  kneeL: ['leftleg', 'shin_l'],
  ankleL: ['leftfoot', 'foot_l'],
  toeL: ['lefttoebase', 'toe_l'],
  hipR: ['rightupleg', 'thigh_r'],
  kneeR: ['rightleg', 'shin_r'],
  ankleR: ['rightfoot', 'foot_r'],
  toeR: ['righttoebase', 'toe_r']
};
const norm = (n) => n.replace(/^mixamorig:?/i, '').replace(/_\d+$/, '').toLowerCase();

const cache = {};
/** Load (once) and return the glTF for a model key. */
export function loadModel(key) {
  return (cache[key] ||= new GLTFLoader().loadAsync(MODELS[key].url));
}

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export class ModelDancer {
  constructor({ gltf, kind, name = 'Dancer', color = '#e85d75', outfit = 'suit' }) {
    this.root = new THREE.Group();
    this.kind = kind;
    this.driver = new Dancer({ outfit, driverOnly: true });
    const model = (this.model = SkeletonUtils.clone(gltf.scene));
    this.root.add(model);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });

    // find the bones we drive
    const byName = {};
    model.traverse((o) => {
      if (o.isBone) byName[norm(o.name)] ||= o;
    });
    this.bones = {};
    for (const [k, names] of Object.entries(BONES)) this.bones[k] = names.map((n) => byName[n]).find(Boolean);
    const B = this.bones;

    // stand the model on the floor at a believable height, facing +z with its left side on +x
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    const s = MODELS[kind].height / (box.max.y - box.min.y);
    model.scale.multiplyScalar(s);
    this.root.updateMatrixWorld(true);
    if (this._rel(B.hipL).x < this._rel(B.pelvis).x) model.rotation.y += Math.PI;
    this.root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model, true);
    this.baseY = model.position.y - box2.min.y;
    model.position.y = this.baseY;
    this.root.updateMatrixWorld(true);

    // rest-pose measurements (container space)
    this.k = this._rel(B.pelvis).y / HIP_H;
    this.footH = { L: this._rel(B.ankleL).y, R: this._rel(B.ankleR).y };
    this.toeH = { L: B.toeL ? this._rel(B.toeL).y : 0, R: B.toeR ? this._rel(B.toeR).y : 0 };

    // driver joints and the direction each segment points in the driver's rest pose
    const d = this.driver;
    const L = d.arms[1], R = d.arms[-1], LL = d.legs[1], RL = d.legs[-1];
    const toeDir = new THREE.Vector3(0, -0.075, 0.16).normalize();
    // [model bone, driver bone, model child used for its direction, driver rest direction]
    const plan = [
      ['pelvis', d.pelvis, 'spine', UP],
      ['spine', d.spine, 'chest', UP],
      ['chest', d.chest, 'neck', UP],
      ['neck', d.neck, 'head', UP],
      ['head', d.head, null, null],
      ['shL', L.sh, 'elL', DOWN],
      ['elL', L.el, 'handL', DOWN],
      ['shR', R.sh, 'elR', DOWN],
      ['elR', R.el, 'handR', DOWN],
      ['hipL', LL.hip, 'kneeL', DOWN],
      ['kneeL', LL.knee, 'ankleL', DOWN],
      ['ankleL', LL.ankle, 'toeL', toeDir],
      ['hipR', RL.hip, 'kneeR', DOWN],
      ['kneeR', RL.knee, 'ankleR', DOWN],
      ['ankleR', RL.ankle, 'toeR', toeDir]
    ];
    // Correction C so that  modelBoneWorld = driverBoneWorld * C  reproduces the driver's pose:
    // in the driver's rest pose (all identity) each model segment is swung onto the driver's direction.
    this.links = [];
    for (const [key, drv, childKey, restDir] of plan) {
      const bone = B[key];
      if (!bone) continue;
      const restQ = this._relQ(bone, new THREE.Quaternion());
      let C = restQ.clone();
      const child = childKey && B[childKey];
      if (child && restDir) {
        const dir = this._rel(child).sub(this._rel(bone)).normalize();
        C = new THREE.Quaternion().setFromUnitVectors(dir, restDir).multiply(restQ);
      }
      this.links.push({ bone, drv, C, depth: depthOf(bone) });
    }
    this.links.sort((a, b) => a.depth - b.depth);
    if (MODELS[kind].gown) this._buildGown(MODELS[kind].gown);
    this.setLabel(name, color);
    this.setPose(P());
  }

  /** Position of an object relative to this.root (cancels any mirroring of the stage). */
  _rel(o) {
    _m.copy(this.root.matrixWorld).invert().multiply(o.matrixWorld);
    return new THREE.Vector3().setFromMatrixPosition(_m);
  }
  _relQ(o, out) {
    _m.copy(this.root.matrixWorld).invert().multiply(o.matrixWorld);
    _m.decompose(_v, out, _s);
    return out;
  }

  setLabel(name, color) {
    if (this.label) {
      this.root.remove(this.label);
      this.label.material.map.dispose();
    }
    this.label = labelSprite(name, color);
    this.label.position.y = MODELS[this.kind].height + 0.2;
    this.root.add(this.label);
  }

  setHighlight() {}

  // ----- floor-length overskirt: rings hang from just above her dress hem, pushed out by her legs -----
  _buildGown({ hem }) {
    const N = 22;
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
    const mat = new THREE.MeshPhysicalMaterial({ color: '#f6f1e8', roughness: 0.5, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    const hipsY = this._rel(this.bones.pelvis).y;
    const top = hem * MODELS[this.kind].height + 0.06; // tuck under the dress
    this.gown = { mesh, geo, N, M, drop: hipsY - top, r: new Float32Array(M), prev: new Float32Array(M), hem: null, flare: 0, lastRot: 0, lastT: 0 };
    this.restHipsQ = this._relQ(this.bones.pelvis, new THREE.Quaternion());
  }

  _updateGown() {
    const G = this.gown;
    const B = this.bones;
    const now = performance.now() / 1000;
    const dt = G.lastT ? Math.min(0.1, Math.max(0.001, now - G.lastT)) : 1 / 60;
    G.lastT = now;
    const rot = this.root.rotation.y;
    const omega = G.hem ? Math.min(20, Math.abs(rot - G.lastRot) / dt) : 0;
    G.lastRot = rot;
    G.flare += (Math.min(0.32, omega * 0.03) - G.flare) * (1 - Math.exp(-dt * 4));

    // the top ring hangs from the hips (follows their tilt); lower rings fall straight down
    const hips = this._rel(B.pelvis);
    const hq = this._relQ(B.pelvis, new THREE.Quaternion()).multiply(_q.copy(this.restHipsQ).invert());
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(hq);
    const topC = hips.clone().addScaledVector(down, G.drop);
    const samples = [];
    for (const side of ['L', 'R']) {
      const pts = [B['hip' + side], B['knee' + side], B['ankle' + side], B['toe' + side]].filter(Boolean).map((b) => this._rel(b));
      for (let k = 0; k < pts.length - 1; k++) for (let t = 0; t < 1; t += 0.2) samples.push(pts[k].clone().lerp(pts[k + 1], t));
      samples.push(pts[pts.length - 1]);
    }
    const ank = this._rel(B.ankleL).add(this._rel(B.ankleR)).multiplyScalar(0.5);
    const target = topC.clone().lerp(ank, 0.55);
    if (!G.hem) G.hem = target.clone();
    else G.hem.lerp(target, 1 - Math.exp(-dt * 9));
    const length = MODELS[this.kind].gown.hem * MODELS[this.kind].height + 0.06;
    const hemY = Math.max(0.015 + G.flare * 0.35, topC.y - length + G.flare * 0.2);
    const { N, M, r, prev } = G;
    const pos = G.geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const y = topC.y + (hemY - topC.y) * s;
      const cx = topC.x + (G.hem.x - topC.x) * s;
      const cz = topC.z + (G.hem.z - topC.z) * s;
      const flare = 1 + G.flare * 2.2 * Math.pow(s, 1.4);
      for (let j = 0; j < M; j++) {
        const th = (2 * Math.PI * j) / M;
        const dx = Math.cos(th);
        const dz = Math.sin(th);
        let rr = (0.15 + 0.17 * Math.pow(s, 1.1)) * (dz > 0 ? 0.92 : 0.96) * flare;
        for (const q of samples) {
          if (Math.abs(q.y - y) > 0.08) continue;
          const ox = q.x - cx;
          const oz = q.z - cz;
          const along = ox * dx + oz * dz;
          const perp = Math.abs(ox * dz - oz * dx);
          if (along > 0 && perp < 0.12) {
            const need = Math.min(0.5, along + 0.075);
            if (need > rr) rr += (need - rr) * (1 - perp / 0.12);
          }
        }
        if (i > 0) rr = Math.max(rr, rr + (prev[j] - rr) * 0.85);
        r[j] = rr;
      }
      for (let j = 0; j < M; j++) prev[j] = (r[(j + M - 1) % M] + 2 * r[j] + r[(j + 1) % M]) / 4;
      for (let j = 0; j < M; j++) {
        const th = (2 * Math.PI * j) / M;
        let px = cx + prev[j] * Math.cos(th);
        let py = y;
        let pz = cz + prev[j] * Math.sin(th);
        if (i < 4) {
          // blend the first rings from the hips' frame so the waist of the skirt tilts with her
          const w = i / 4;
          _v.set(prev[j] * Math.cos(th), 0, prev[j] * Math.sin(th)).applyQuaternion(hq).add(topC).addScaledVector(down, (topC.y - y) / Math.max(0.2, -down.y));
          px = _v.x + (px - _v.x) * w;
          py = _v.y + (py - _v.y) * w;
          pz = _v.z + (pz - _v.z) * w;
        }
        pos.set([px, Math.max(0.012, py), pz], (i * M + j) * 3);
      }
    }
    G.geo.attributes.position.needsUpdate = true;
    G.geo.computeVertexNormals();
  }

  setPose(p) {
    const d = this.driver;
    d.setPose(p);
    d.root.updateMatrixWorld(true);
    this.model.position.y = this.baseY;
    this.root.updateMatrixWorld(true);

    // hips follow the driver's pelvis (scaled to the model's leg length)
    const hips = this.bones.pelvis;
    const target = d.pelvis.position.clone().multiplyScalar(this.k);
    _m2.copy(this.root.matrixWorld).invert().multiply(hips.parent.matrixWorld).invert();
    hips.position.copy(target.applyMatrix4(_m2));

    // rotations, parents first
    for (const { bone, drv, C } of this.links) {
      bone.parent.updateMatrixWorld(true);
      drv.getWorldQuaternion(_q); // driver root sits at the origin, unrotated
      _q.multiply(C);
      this._relQ(bone.parent, _q2).invert();
      bone.quaternion.copy(_q2.multiply(_q));
      bone.updateMatrixWorld(true);
    }

    // plant the model's own feet (its legs aren't the driver's length), unless it's held in the air
    const air = Math.min(1, Math.max(0, p.air || 0));
    if (air < 1) {
      const B = this.bones;
      let min = Infinity;
      for (const side of ['L', 'R']) {
        min = Math.min(min, this._rel(B['ankle' + side]).y - this.footH[side]);
        if (B['toe' + side]) min = Math.min(min, this._rel(B['toe' + side]).y - this.toeH[side]);
      }
      this.model.position.y = this.baseY + (-min + (p.root.lift || 0) * this.k) * (1 - air);
      this.root.updateMatrixWorld(true);
    }
    if (this.gown) this._updateGown();
  }

  dispose() {
    if (this.label) this.label.material.map.dispose();
    if (this.gown) {
      this.gown.geo.dispose();
      this.gown.mesh.material.dispose();
    }
    // geometry and textures are shared with the cached glTF, so they stay loaded for the next clone
  }
}

function depthOf(o) {
  let n = 0;
  for (let p = o.parent; p; p = p.parent) n++;
  return n;
}
