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
    url: 'models/groom.glb',
    height: 1.8,
    credit: 'Groom: “Man dressed in suit”, made with MakeHuman (CC0)'
  },
  bride: {
    url: 'models/bride.glb',
    height: 1.68,
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
  }

  dispose() {
    if (this.label) this.label.material.map.dispose();
    // geometry and textures are shared with the cached glTF, so they stay loaded for the next clone
  }
}

function depthOf(o) {
  let n = 0;
  for (let p = o.parent; p; p = p.parent) n++;
  return n;
}
