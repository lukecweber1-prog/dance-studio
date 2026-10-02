// Move library. Every move lasts one 8-count and is a list of [beat, pose] keyframes.
// Partner moves have separate `lead` and `follow` tracks positioned around a shared couple centre.
import { P, mirrorPose } from './rig.js';

// ---------- arm & leg presets: [raise, direction, twist, bend] ----------
const A = {
  down: [12, 0, 0, 12],
  lowV: [40, 10, 0, 8],
  jazz: [45, 25, 0, 6],
  side: [88, 0, 0, 5],
  highV: [148, 8, 0, 4],
  up: [172, 0, 0, 4],
  fwd: [88, 88, 0, 5],
  fwdLow: [50, 85, 0, 15],
  first: [68, 80, -90, 55],
  second: [78, 12, 0, 18],
  fifth: [160, 25, 90, 45],
  hip: [35, -10, -90, 110],
  goal: [88, 0, 90, 90],
  fist: [55, 55, -70, 115],
  pumpUp: [95, 70, 0, 100],
  pumpDown: [30, 60, 0, 95],
  point: [150, 25, 0, 0],
  back: [35, -80, 0, 10],
  // partner holds
  frameHand: [28, -15, 0, 112], // joined hands held between the partners at chest height
  frameBack: [55, 105, -30, 25], // lead's right hand on follow's back
  onShoulder: [55, 85, 0, 75], // follow's left hand on lead's shoulder
  lowHold: [42, 55, 0, 22],
  turnHand: [150, 40, 0, 25]
};
const L = {
  stand: [3, 0, 0, 3],
  side: [17, 0, 0, 0],
  wide: [14, 0, 0, 0],
  cross: [20, 150, 0, 8],
  back: [16, -90, 0, 4],
  fwd: [18, 90, 0, 2],
  tapFwd: [24, 90, 0, 0],
  tapSide: [26, 0, 0, 0],
  kick: [85, 90, 0, 0],
  kickBack: [45, -90, 0, 15],
  passe: [62, 50, 25, 115],
  kneeUp: [80, 88, 0, 100],
  arabesque: [72, -90, 0, 0],
  attitude: [60, -80, 0, 70],
  lunge: [48, 90, 0, 48],
  lungeBack: [34, -90, 0, 0],
  heelTwistIn: [6, 0, -25, 10],
  heelTwistOut: [6, 0, 25, 10]
};

const k = (b, o) => [b, P(o)];
const km = (b, o) => [b, mirrorPose(P(o))];

// =====================================================================
// JAZZ
// =====================================================================
const jazz = [
  {
    id: 'jazz-square',
    name: 'Jazz Square',
    level: 'Beginner',
    desc: 'The classic box pattern with jazz hands and a little attitude in the shoulders.',
    cues: ['Cross R over L', 'Step back L', 'Step R to side', 'L together', 'Cross R over L', 'Step back L', 'Step R to side', 'Together — jazz hands!'],
    keys: (() => {
      const base = { lArm: A.jazz, rArm: A.jazz, squat: 8 };
      const seq = (b) => [
        k(b + 0, { ...base }),
        k(b + 1, { ...base, rLeg: L.cross, spine: [4, -12, 0], lArm: [70, 40, 0, 10], rArm: [30, 20, 0, 10], root: { x: 0, z: 0.06 } }),
        k(b + 2, { ...base, lLeg: L.back, spine: [-2, 0, 0], root: { x: -0.02, z: -0.08 } }),
        k(b + 3, { ...base, rLeg: L.side, spine: [0, 10, 4], lArm: [30, 20, 0, 10], rArm: [70, 40, 0, 10], root: { x: -0.1, z: -0.06 } }),
        k(b + 4, { ...base, squat: 12, chest: [0, 0, -5], root: { x: -0.06, z: 0 } })
      ];
      return [...seq(0), ...seq(4).slice(1), k(8, { lArm: A.highV, rArm: A.highV, squat: 10, chest: [-6, 0, 0] })];
    })()
  },
  {
    id: 'kick-ball-change',
    name: 'Kick Ball Change',
    level: 'Beginner',
    desc: 'Snappy front kick, quick ball-change and a jazz-hands hit — then the other side.',
    cues: ['Kick R forward', '"and" ball-change', 'Jazz hands HIT', 'Hold & shoulder shimmy', 'Kick L forward', '"and" ball-change', 'Jazz hands HIT', 'Hold & reset'],
    keys: [
      k(0, { squat: 12, lArm: A.jazz, rArm: A.jazz }),
      k(1, { rLeg: L.kick, rFoot: 55, lArm: A.side, rArm: A.side, spine: [-6, 0, 0] }),
      k(1.5, { rLeg: L.back, squat: 14, rFoot: 30, lArm: A.lowV, rArm: A.lowV }),
      k(2, { squat: 18, lArm: A.highV, rArm: A.highV, chest: [-8, 0, 0], head: [-10, 0, 0] }),
      k(3, { squat: 14, lArm: [140, 10, 0, 4], rArm: [155, 0, 0, 4], chest: [-6, 0, 6] }),
      k(3.6, { squat: 12, lArm: A.jazz, rArm: A.jazz }),
      km(5, { lLeg: L.stand, rLeg: L.kick, rFoot: 55, lArm: A.side, rArm: A.side, spine: [-6, 0, 0] }),
      km(5.5, { rLeg: L.back, squat: 14, rFoot: 30, lArm: A.lowV, rArm: A.lowV }),
      k(6, { squat: 18, lArm: A.highV, rArm: A.highV, chest: [-8, 0, 0], head: [-10, 0, 0] }),
      k(7, { squat: 14, lArm: [155, 0, 0, 4], rArm: [140, 10, 0, 4], chest: [-6, 0, -6] }),
      k(8, { squat: 12, lArm: A.jazz, rArm: A.jazz })
    ]
  },
  {
    id: 'pas-de-bourree-turn',
    name: 'Pas de Bourrée & Pirouette',
    level: 'Intermediate',
    desc: 'Three quick travelling steps, plié prep and a clean single pirouette to a sassy finish.',
    cues: ['Step back R', 'Step side L', 'Step front R', 'Plié prep (4th)', 'Relevé — passé', 'Turn!', 'Land in 4th', 'Hip pop, arms high'],
    keys: [
      k(0, { lArm: A.second, rArm: A.second }),
      k(1, { rLeg: L.back, lArm: A.second, rArm: A.second, squat: 6, root: { x: 0.04 } }),
      k(2, { lLeg: L.side, lArm: A.second, rArm: A.second, root: { x: 0.12 } }),
      k(3, { rLeg: L.fwd, lArm: A.second, rArm: A.first, squat: 10, root: { x: 0.08 } }),
      k(4, { rLeg: [16, 90, 0, 30], lLeg: [16, -90, 0, 10], lArm: A.second, rArm: A.first, squat: 28, root: { x: 0.08 } }),
      k(4.6, { lLeg: [0, 0, 0, 0], rLeg: L.passe, rFoot: 40, lFoot: 40, lArm: A.first, rArm: A.first, root: { x: 0.08, rot: -60, lift: 0.04 } }),
      k(5.8, { lLeg: [0, 0, 0, 0], rLeg: L.passe, rFoot: 40, lFoot: 40, lArm: A.first, rArm: A.first, root: { x: 0.08, rot: -330, lift: 0.04 } }),
      k(6.5, { rLeg: [16, -90, 0, 6], lLeg: [16, 90, 0, 20], squat: 18, lArm: A.second, rArm: A.second, root: { x: 0.08, rot: -360 } }),
      k(7.2, { pelvis: [0, 0, 8], lLeg: [10, 0, 0, 0], rLeg: [5, 0, 0, 20], lArm: A.highV, rArm: A.hip, head: [-8, -20, 0], root: { x: 0.04, rot: -360 } }),
      k(8, { root: { x: 0, rot: -360 } })
    ]
  },
  {
    id: 'fan-kick',
    name: 'Fan Kicks',
    level: 'Intermediate',
    desc: 'A sweeping leg that draws a rainbow across the body — right side then left.',
    cues: ['Prep, arms out', 'Sweep R across', 'Fan it up and over', 'Land, plié', 'Prep other side', 'Sweep L across', 'Fan up and over', 'Land with a hip pop'],
    keys: [
      k(0, { lArm: A.side, rArm: A.side, squat: 6 }),
      k(1, { rLeg: [55, 150, 0, 0], rFoot: 50, lArm: A.side, rArm: A.side, spine: [-4, -8, 0] }),
      k(2, { rLeg: [92, 80, 0, 0], rFoot: 50, lArm: A.highV, rArm: A.highV, spine: [-8, 0, 0] }),
      k(3, { rLeg: [50, 0, 0, 0], rFoot: 40, lArm: A.side, rArm: A.side, spine: [-4, 8, 0] }),
      k(4, { squat: 16, lArm: A.jazz, rArm: A.jazz }),
      km(5, { rLeg: [55, 150, 0, 0], rFoot: 50, lArm: A.side, rArm: A.side, spine: [-4, -8, 0] }),
      km(6, { rLeg: [92, 80, 0, 0], rFoot: 50, lArm: A.highV, rArm: A.highV, spine: [-8, 0, 0] }),
      km(7, { rLeg: [50, 0, 0, 0], rFoot: 40, lArm: A.side, rArm: A.side, spine: [-4, 8, 0] }),
      k(7.5, { squat: 14, pelvis: [0, 0, -8], lArm: A.hip, rArm: A.hip }),
      k(8, { lArm: A.side, rArm: A.side, squat: 6 })
    ]
  },
  {
    id: 'chasse-leap',
    name: 'Chassé & Grand Jeté',
    level: 'Advanced',
    desc: 'Gallop to the right and soar into a split leap, then travel home.',
    cues: ['Chassé R', '"and" together', 'Chassé R', 'LEAP!', 'Land in plié', 'Chassé L', 'Step together', 'Finish with arms in 2nd'],
    keys: [
      k(0, { lArm: A.second, rArm: A.second }),
      k(1, { rLeg: L.side, squat: 14, lArm: A.second, rArm: A.second, root: { x: -0.2 } }),
      k(1.5, { lLeg: [8, 0, 0, 10], rLeg: [8, 0, 0, 10], lFoot: 30, rFoot: 30, root: { x: -0.32, lift: 0.08 } }),
      k(2, { rLeg: L.side, squat: 16, lArm: A.second, rArm: A.second, root: { x: -0.48 } }),
      k(2.8, { rLeg: [16, 90, 0, 30], squat: 24, lArm: A.first, rArm: A.first, root: { x: -0.6, rot: -60 } }),
      k(3.5, { rLeg: [85, 90, 0, 0], lLeg: [70, -90, 0, 6], rFoot: 50, lFoot: 50, lArm: A.fwd, rArm: A.side, spine: [8, 0, 0], head: [-10, 0, 0], root: { x: -0.85, rot: -80, lift: 0.42 } }),
      k(4.2, { rLeg: [16, 90, 0, 40], lLeg: L.back, squat: 30, lArm: A.second, rArm: A.second, root: { x: -1.0, rot: -60 } }),
      k(5, { lLeg: L.side, squat: 10, lArm: A.second, rArm: A.second, root: { x: -0.7, rot: 0 } }),
      k(6, { lLeg: L.side, squat: 12, lArm: A.second, rArm: A.second, root: { x: -0.35 } }),
      k(7, { squat: 4, lArm: A.highV, rArm: A.highV, chest: [-6, 0, 0], root: { x: -0.05 } }),
      k(8, { lArm: A.second, rArm: A.second })
    ]
  },
  {
    id: 'jazz-walk',
    name: 'Jazz Walk & Hip Pop',
    level: 'Beginner',
    desc: 'Strut forward with hip isolations, then a shoulder roll and jazz hands finish.',
    cues: ['Walk R (hip out)', 'Walk L (hip out)', 'Walk R', 'Hip pop + point', 'Walk back L', 'Walk back R', 'Shoulder roll', 'Jazz hands!'],
    keys: [
      k(0, { lArm: A.down, rArm: A.down }),
      k(1, { rLeg: L.fwd, pelvis: [0, 0, 8], chest: [0, 0, -6], lArm: [25, -40, 0, 30], rArm: [25, 70, 0, 30], root: { z: 0.12 } }),
      k(2, { lLeg: L.fwd, pelvis: [0, 0, -8], chest: [0, 0, 6], lArm: [25, 70, 0, 30], rArm: [25, -40, 0, 30], root: { z: 0.24 } }),
      k(3, { rLeg: L.fwd, pelvis: [0, 0, 8], chest: [0, 0, -6], lArm: [25, -40, 0, 30], rArm: [25, 70, 0, 30], root: { z: 0.36 } }),
      k(4, { lLeg: L.tapSide, lFoot: 40, pelvis: [0, 0, -12], lArm: A.hip, rArm: A.point, head: [-8, -25, 0], root: { z: 0.4 } }),
      k(5, { lLeg: L.back, pelvis: [0, 0, -6], lArm: A.down, rArm: A.down, root: { z: 0.28 } }),
      k(6, { rLeg: L.back, pelvis: [0, 0, 6], root: { z: 0.14 } }),
      k(7, { chest: [-8, 15, 0], lArm: [30, -30, 0, 40], rArm: [30, 30, 0, 40], squat: 10, root: { z: 0.04 } }),
      k(7.5, { lArm: A.jazz, rArm: A.jazz, squat: 16, chest: [-4, 0, 0] }),
      k(8, { lArm: A.down, rArm: A.down })
    ]
  },
  {
    id: 'jazz-finale',
    name: 'Showstopper Pose',
    level: 'Beginner',
    desc: 'Ball change into a big, held finishing pose. Smile!',
    finale: true,
    cues: ['Step R', 'Step L', 'Ball change', 'Arms sweep', 'Hit the pose!', 'Hold…', 'Hold…', 'Hold — smile!'],
    keys: [
      k(0, {}),
      k(1, { rLeg: L.side, lArm: A.lowV, rArm: A.lowV, root: { x: -0.08 } }),
      k(2, { lLeg: L.side, lArm: A.lowV, rArm: A.lowV, root: { x: 0 } }),
      k(3, { squat: 20, lArm: A.first, rArm: A.first }),
      k(4, { lArm: A.side, rArm: A.side, squat: 10 }),
      k(5, { rLeg: [22, 30, 0, 0], rFoot: 40, pelvis: [0, 0, 6], lArm: A.highV, rArm: A.jazz, chest: [-10, 0, -4], head: [-12, 15, 0] }),
      k(8, { rLeg: [22, 30, 0, 0], rFoot: 40, pelvis: [0, 0, 6], lArm: A.highV, rArm: A.jazz, chest: [-10, 0, -4], head: [-12, 15, 0] })
    ]
  }
];

// =====================================================================
// LYRICAL
// =====================================================================
const lyrical = [
  {
    id: 'reach-contract',
    name: 'Reach & Contract',
    level: 'Beginner',
    desc: 'Rise and reach for the sky, then curl the spine inward like a breath out.',
    cues: ['Rise, arms float up', 'Reach higher…', 'Contract — round the spine', 'Pull arms in', 'Open to the side', 'Arch & look up', 'Melt down', 'Breathe, reset'],
    keys: [
      k(0, { lArm: A.down, rArm: A.down }),
      k(1, { lArm: A.second, rArm: A.second, lFoot: 25, rFoot: 25, root: { lift: 0.04 } }),
      k(2, { lArm: A.fifth, rArm: A.fifth, lFoot: 30, rFoot: 30, chest: [-8, 0, 0], head: [-15, 0, 0], root: { lift: 0.05 } }),
      k(3, { lArm: A.first, rArm: A.first, spine: [25, 0, 0], chest: [25, 0, 0], head: [25, 0, 0], squat: 25 }),
      k(4, { lArm: [40, 80, -90, 110], rArm: [40, 80, -90, 110], spine: [30, 0, 0], chest: [28, 0, 0], head: [30, 0, 0], squat: 30 }),
      k(5, { lArm: A.side, rArm: A.side, spine: [0, 0, 0], squat: 10 }),
      k(6, { lArm: [120, -10, 0, 10], rArm: [120, -10, 0, 10], spine: [-10, 0, 0], chest: [-15, 0, 0], head: [-25, 0, 0] }),
      k(7, { lArm: A.lowV, rArm: A.lowV, squat: 22, spine: [10, 0, 6], head: [10, 0, 10] }),
      k(8, { lArm: A.down, rArm: A.down })
    ]
  },
  {
    id: 'developpe',
    name: 'Développé Unfold',
    level: 'Intermediate',
    desc: 'Draw the foot up the leg and slowly unfold it forward — controlled and lifted.',
    cues: ['Passé R', 'Unfold forward', 'Hold — extend', 'Lower & close', 'Passé L', 'Unfold forward', 'Hold — extend', 'Lower & close'],
    keys: [
      k(0, { lArm: A.second, rArm: A.second }),
      k(1, { rLeg: L.passe, rFoot: 45, lArm: A.first, rArm: A.first }),
      k(2, { rLeg: [80, 90, 0, 20], rFoot: 50, lArm: A.second, rArm: A.fifth, chest: [-6, 0, 0] }),
      k(3, { rLeg: [85, 90, 0, 0], rFoot: 55, lArm: A.second, rArm: A.fifth, chest: [-8, 0, 0], head: [-10, 15, 0] }),
      k(4, { rLeg: L.tapFwd, rFoot: 45, lArm: A.second, rArm: A.second }),
      km(5, { rLeg: L.passe, rFoot: 45, lArm: A.first, rArm: A.first }),
      km(6, { rLeg: [80, 90, 0, 20], rFoot: 50, lArm: A.second, rArm: A.fifth, chest: [-6, 0, 0] }),
      km(7, { rLeg: [85, 90, 0, 0], rFoot: 55, lArm: A.second, rArm: A.fifth, chest: [-8, 0, 0], head: [-10, 15, 0] }),
      k(8, { lArm: A.second, rArm: A.second })
    ]
  },
  {
    id: 'lyrical-pirouette',
    name: 'Floating Pirouette',
    level: 'Intermediate',
    desc: 'Plié in fourth, turn with soft arms, and fall out of the turn into a reach.',
    cues: ['Step back to 4th', 'Plié, arms open', 'Relevé passé', 'Turn…', 'Turn…', 'Fall out side', 'Reach long', 'Gather back in'],
    keys: [
      k(0, { lArm: A.down, rArm: A.down }),
      k(1, { rLeg: [16, -90, 0, 6], lLeg: [14, 90, 0, 20], lArm: A.second, rArm: A.first, squat: 14 }),
      k(2, { rLeg: [16, -90, 0, 6], lLeg: [14, 90, 0, 30], lArm: A.second, rArm: A.first, squat: 28 }),
      k(3, { lLeg: [0, 0, 0, 0], rLeg: L.passe, rFoot: 40, lFoot: 40, lArm: A.first, rArm: A.first, root: { rot: -90, lift: 0.04 } }),
      k(4.5, { lLeg: [0, 0, 0, 0], rLeg: L.passe, rFoot: 40, lFoot: 40, lArm: A.fifth, rArm: A.fifth, root: { rot: -330, lift: 0.04 } }),
      k(5, { rLeg: [30, 0, 0, 10], lLeg: [6, 0, 0, 25], squat: 15, spine: [5, 0, -18], lArm: A.side, rArm: A.highV, root: { x: -0.12, rot: -360 } }),
      k(6, { rLeg: [32, 0, 0, 0], rFoot: 40, spine: [0, 0, 22], lArm: [140, 0, 0, 5], rArm: A.side, head: [-10, 0, 15], root: { x: -0.1, rot: -360 } }),
      k(7, { lArm: A.first, rArm: A.first, squat: 12, root: { x: -0.04, rot: -360 } }),
      k(8, { lArm: A.down, rArm: A.down, root: { rot: -360 } })
    ]
  },
  {
    id: 'arabesque-lunge',
    name: 'Lunge to Arabesque',
    level: 'Intermediate',
    desc: 'A long lunge with arms reaching away, transferring into a lifted arabesque.',
    cues: ['Lunge forward R', 'Reach both arms', 'Shift weight up', 'Arabesque', 'Hold & breathe', 'Lower the leg', 'Step together', 'Port de bras'],
    keys: [
      k(0, { lArm: A.down, rArm: A.down }),
      k(1, { rLeg: L.lunge, lLeg: L.lungeBack, lArm: A.fwd, rArm: A.back, spine: [10, -10, 0], root: { z: 0.18 } }),
      k(2, { rLeg: L.lunge, lLeg: L.lungeBack, lArm: [120, 80, 0, 5], rArm: [60, -70, 0, 5], spine: [15, -15, 0], head: [-15, 0, 0], root: { z: 0.2 } }),
      k(3, { lLeg: [35, -90, 0, 10], rLeg: [2, 0, 0, 0], lArm: A.fwd, rArm: A.side, root: { z: 0.24 } }),
      k(4, { lLeg: L.arabesque, lFoot: 50, rLeg: [0, 0, 0, 0], spine: [22, 0, 0], chest: [-8, 0, 0], head: [-18, 0, 0], lArm: [100, 85, 0, 5], rArm: [80, -20, 0, 5], root: { z: 0.24 } }),
      k(5, { lLeg: L.arabesque, lFoot: 55, rLeg: [0, 0, 0, 0], spine: [24, 0, 0], chest: [-8, 0, 0], head: [-18, 0, 0], lArm: [110, 85, 0, 5], rArm: [85, -25, 0, 5], root: { z: 0.24 } }),
      k(6, { lLeg: [20, -90, 0, 10], lFoot: 30, lArm: A.second, rArm: A.second, root: { z: 0.16 } }),
      k(7, { lArm: A.fifth, rArm: A.fifth, spine: [0, 0, 12], root: { z: 0.06 } }),
      k(8, { lArm: A.down, rArm: A.down })
    ]
  },
  {
    id: 'port-de-bras-sway',
    name: 'Port de Bras Sway',
    level: 'Beginner',
    desc: 'Flowing side-to-side sway with arms painting big circles in the air.',
    cues: ['Sway R, arm sweeps', 'Arm overhead', 'Sway L, other arm', 'Arm overhead', 'Big circle R', 'Through 5th', 'Big circle L', 'Settle'],
    keys: [
      k(0, { lArm: A.lowV, rArm: A.lowV }),
      k(1, { rLeg: L.wide, lLeg: [8, 0, 0, 10], spine: [0, 0, -10], rArm: A.side, lArm: A.lowV, root: { x: -0.08 } }),
      k(2, { rLeg: L.wide, lLeg: [8, 0, 0, 10], spine: [0, 0, 18], rArm: [160, 10, 90, 40], lArm: A.lowV, head: [0, 0, 12], root: { x: -0.08 } }),
      k(3, { lLeg: L.wide, rLeg: [8, 0, 0, 10], spine: [0, 0, 10], lArm: A.side, rArm: A.lowV, root: { x: 0.08 } }),
      k(4, { lLeg: L.wide, rLeg: [8, 0, 0, 10], spine: [0, 0, -18], lArm: [160, 10, 90, 40], rArm: A.lowV, head: [0, 0, -12], root: { x: 0.08 } }),
      k(5, { spine: [12, 20, 0], lArm: A.fwd, rArm: A.side, squat: 15 }),
      k(6, { spine: [-8, 0, 0], chest: [-10, 0, 0], lArm: A.fifth, rArm: A.fifth, lFoot: 25, rFoot: 25, root: { lift: 0.04 } }),
      k(7, { spine: [12, -20, 0], lArm: A.side, rArm: A.fwd, squat: 15 }),
      k(8, { lArm: A.lowV, rArm: A.lowV })
    ]
  },
  {
    id: 'chaine-turns',
    name: 'Chaîné Turns',
    level: 'Advanced',
    desc: 'A chain of quick half-turns travelling across the floor, spotting the audience.',
    cues: ['Step R, arms open', 'Turn', 'Turn', 'Turn', 'Turn', 'Open out', 'Reach', 'Return home'],
    keys: [
      k(0, { lArm: A.second, rArm: A.second }),
      k(1, { rLeg: L.side, rFoot: 30, lFoot: 30, lArm: A.second, rArm: A.second, root: { x: -0.15, lift: 0.04 } }),
      k(2, { lArm: A.first, rArm: A.first, lFoot: 35, rFoot: 35, root: { x: -0.35, rot: -180, lift: 0.05 } }),
      k(3, { lArm: A.first, rArm: A.first, lFoot: 35, rFoot: 35, root: { x: -0.55, rot: -360, lift: 0.05 } }),
      k(4, { lArm: A.first, rArm: A.first, lFoot: 35, rFoot: 35, root: { x: -0.75, rot: -540, lift: 0.05 } }),
      k(5, { lArm: A.second, rArm: A.second, lFoot: 20, rFoot: 20, squat: 10, root: { x: -0.85, rot: -720 } }),
      k(6, { lLeg: [30, 0, 0, 0], lFoot: 45, spine: [0, 0, -15], lArm: A.highV, rArm: A.side, root: { x: -0.82, rot: -720 } }),
      k(7, { lArm: A.lowV, rArm: A.lowV, squat: 10, root: { x: -0.4, rot: -720 } }),
      k(8, { lArm: A.second, rArm: A.second, root: { x: 0, rot: -720 } })
    ]
  },
  {
    id: 'lyrical-finale',
    name: 'Kneeling Reach',
    level: 'Beginner',
    desc: 'Sink low and reach one hand toward the light as the music fades.',
    finale: true,
    cues: ['Step back', 'Sink down', 'Lower lower', 'Bow the head', 'Lift the gaze', 'Reach…', 'Reach…', 'Hold the moment'],
    keys: [
      k(0, { lArm: A.down, rArm: A.down }),
      k(1, { lLeg: [30, -90, 0, 30], rLeg: [20, 90, 0, 30], squat: 20, lArm: A.lowV, rArm: A.lowV }),
      k(3, { lLeg: [30, -90, 0, 70], rLeg: [40, 90, 0, 40], squat: 50, spine: [20, 0, 0], lArm: A.first, rArm: A.first }),
      k(4, { lLeg: [30, -90, 0, 70], rLeg: [40, 90, 0, 40], squat: 55, spine: [30, 0, 0], head: [30, 0, 0], lArm: [30, 70, -90, 100], rArm: [30, 70, -90, 100] }),
      k(6, { lLeg: [30, -90, 0, 70], rLeg: [40, 90, 0, 40], squat: 50, spine: [-5, 10, 0], head: [-25, 15, 0], rArm: [140, 60, 0, 5], lArm: A.back }),
      k(8, { lLeg: [30, -90, 0, 70], rLeg: [40, 90, 0, 40], squat: 50, spine: [-8, 12, 0], head: [-28, 15, 0], rArm: [150, 60, 0, 0], lArm: A.back })
    ]
  }
];

// =====================================================================
// HIP-HOP
// =====================================================================
const hiphop = [
  {
    id: 'two-step',
    name: 'Two-Step Groove',
    level: 'Beginner',
    desc: 'The foundation: step out, step together, side to side with loose bouncy arms.',
    cues: ['Step R', 'L together', 'Step L', 'R together', 'Step R', 'Together + clap', 'Step L', 'Together + clap'],
    keys: (() => {
      const R = (b, extra = {}) => k(b, { rLeg: L.side, lArm: [30, 70, -60, 80], rArm: [40, 20, 0, 70], spine: [8, 10, 0], root: { x: -0.18 }, ...extra });
      const T = (b, x, extra = {}) => k(b, { lArm: [25, 60, -60, 80], rArm: [25, 60, -60, 80], spine: [10, 0, 0], root: { x }, ...extra });
      const Lf = (b, extra = {}) => km(b, { rLeg: L.side, lArm: [30, 70, -60, 80], rArm: [40, 20, 0, 70], spine: [8, 10, 0], root: { x: -0.18 }, ...extra });
      const clap = { lArm: [60, 85, -80, 100], rArm: [60, 85, -80, 100] };
      return [T(0, 0), R(1), T(2, -0.12), Lf(3), T(4, 0), R(5), T(6, -0.12, clap), Lf(7), T(7.5, 0.05, clap), T(8, 0)];
    })()
  },
  {
    id: 'running-man',
    name: 'Running Man',
    level: 'Intermediate',
    desc: 'Knee drives up while the standing foot slides back — running in place.',
    cues: ['R knee up', 'Slide back', 'L knee up', 'Slide back', 'R knee up', 'Slide back', 'L knee up', 'Slide & hit'],
    keys: (() => {
      const up = (b, m) => (m ? km : k)(b, { rLeg: L.kneeUp, lLeg: [6, -90, 0, 10], lArm: A.pumpUp, rArm: A.pumpDown, spine: [8, 0, 0] });
      const down = (b) => k(b, { lLeg: [20, -90, 0, 10], rLeg: [8, 90, 0, 20], lArm: A.fist, rArm: A.fist, squat: 18, spine: [10, 0, 0] });
      const downL = (b) => km(b, { lLeg: [20, -90, 0, 10], rLeg: [8, 90, 0, 20], lArm: A.fist, rArm: A.fist, squat: 18, spine: [10, 0, 0] });
      return [k(0, { squat: 12, lArm: A.fist, rArm: A.fist }), up(0.5), down(1), up(1.5, true), downL(2), up(2.5), down(3), up(3.5, true), downL(4), up(4.5), down(5), up(5.5, true), downL(6), up(6.5), down(7), k(8, { squat: 12, lArm: A.fist, rArm: A.fist })];
    })()
  },
  {
    id: 'body-roll',
    name: 'Body Roll',
    level: 'Beginner',
    desc: 'Ripple from chest to hips — slow it down, then hit it twice on the beat.',
    cues: ['Chest forward', 'Ribs back', 'Hips through', 'Knees bend', 'Chest forward', 'Ribs', 'Hips', 'Snap up!'],
    keys: (() => {
      const roll = (b) => [
        k(b + 0, { lArm: A.down, rArm: A.down, squat: 6 }),
        k(b + 1, { chest: [-18, 0, 0], spine: [-6, 0, 0], head: [-10, 0, 0], lArm: [20, -40, 0, 20], rArm: [20, -40, 0, 20] }),
        k(b + 2, { chest: [20, 0, 0], spine: [10, 0, 0], pelvis: [-10, 0, 0], head: [10, 0, 0], squat: 10 }),
        k(b + 3, { chest: [10, 0, 0], spine: [-10, 0, 0], pelvis: [14, 0, 0], squat: 20, lArm: [30, 60, -60, 60], rArm: [30, 60, -60, 60] })
      ];
      return [...roll(0), ...roll(4), k(8, { lArm: A.down, rArm: A.down, squat: 6 })];
    })()
  },
  {
    id: 'cabbage-patch',
    name: 'Cabbage Patch',
    level: 'Beginner',
    desc: 'Fists together, stir the pot in circles while your hips groove the other way.',
    cues: ['Stir out', 'Stir in', 'Stir out', 'Stir in', 'Switch!', 'Stir', 'Stir', 'Hit'],
    keys: (() => {
      const st = (b, s) => k(b, { lArm: [60 + 10 * s, 60 - 10 * s, -70, 110], rArm: [60 - 10 * s, 60 + 10 * s, -70, 110], chest: [6, 18 * s, 0], pelvis: [0, -10 * s, 0], spine: [10, 0, 0], squat: 18 - 4 * s, root: { x: 0.05 * s } });
      return [st(0, 1), st(1, -1), st(2, 1), st(3, -1), st(4, 1), st(5, -1), st(6, 1), k(7, { lArm: [100, 60, -80, 120], rArm: [100, 60, -80, 120], squat: 25, spine: [20, 0, 0] }), st(8, 1)];
    })()
  },
  {
    id: 'arm-wave-hit',
    name: 'Arm Wave & Hits',
    level: 'Intermediate',
    desc: 'Robotic arm wave travels shoulder to shoulder, then two sharp hits.',
    cues: ['L arm out', 'Wave to chest', 'Wave across', 'R arm out', 'HIT — point', 'HIT — cross', 'Lean back', 'Reset'],
    keys: [
      k(0, { lArm: A.down, rArm: A.down, squat: 8 }),
      k(1, { lArm: A.side, rArm: [70, 30, 90, 110], chest: [0, 0, -10] }),
      k(2, { lArm: [90, 0, 90, 60], rArm: [90, 0, 90, 60], chest: [0, 0, 0], head: [0, 0, 8] }),
      k(3, { lArm: [70, 30, 90, 110], rArm: A.side, chest: [0, 0, 10] }),
      k(4, { lArm: A.down, rArm: A.side, squat: 15, spine: [10, -15, 0] }),
      k(5, { lArm: A.hip, rArm: A.point, rLeg: L.side, squat: 20, head: [-10, -25, 0], root: { x: -0.06 } }),
      k(6, { lArm: [60, 120, -90, 120], rArm: [60, 120, -90, 120], squat: 26, spine: [15, 0, 0] }),
      k(7, { lArm: A.lowV, rArm: A.lowV, spine: [-12, 0, 0], chest: [-10, 0, 0], squat: 10, root: { x: 0 } }),
      k(8, { lArm: A.down, rArm: A.down, squat: 8 })
    ]
  },
  {
    id: 'shoulder-bounce',
    name: 'Shoulder Lean Bounce',
    level: 'Beginner',
    desc: 'Lean shoulder to shoulder with a relaxed knee bounce — pure swagger.',
    cues: ['Lean R', 'Bounce', 'Lean L', 'Bounce', 'Lean R', 'Lean L', 'Lean R', 'Lean L & pose'],
    keys: (() => {
      const lean = (b, s) => k(b, { spine: [8, 8 * s, -14 * s], chest: [0, 0, -8 * s], head: [0, 0, 10 * s], lArm: s > 0 ? [10, 0, 0, 30] : [30, 30, 0, 50], rArm: s > 0 ? [30, 30, 0, 50] : [10, 0, 0, 30], squat: 18, pelvis: [0, 0, 8 * s] });
      return [k(0, { squat: 10, lArm: A.down, rArm: A.down }), lean(1, 1), lean(2, 1), lean(3, -1), lean(4, -1), lean(5, 1), lean(6, -1), lean(7, 1), lean(7.6, -1), k(8, { squat: 10, lArm: A.down, rArm: A.down })];
    })()
  },
  {
    id: 'freeze',
    name: 'Hit & Freeze',
    level: 'Beginner',
    desc: 'Four sharp hits to a dead-still freeze — the classic ending.',
    finale: true,
    cues: ['HIT', 'HIT', 'HIT', 'HIT', 'Freeze', 'Freeze', 'Freeze', 'Freeze'],
    keys: [
      k(0, { squat: 10 }),
      k(1, { lArm: A.goal, rArm: A.goal, squat: 20, rLeg: L.side }),
      k(2, { lArm: A.hip, rArm: A.point, squat: 15, head: [-10, -20, 0] }),
      k(3, { lArm: [60, 120, -90, 120], rArm: [60, 120, -90, 120], squat: 30, spine: [15, 0, 0] }),
      k(4, { lArm: A.fist, rArm: [120, 30, 0, 100], squat: 32, spine: [10, -20, 0], rLeg: [20, 30, 0, 20], head: [5, -30, 0] }),
      k(8, { lArm: A.fist, rArm: [120, 30, 0, 100], squat: 32, spine: [10, -20, 0], rLeg: [20, 30, 0, 20], head: [5, -30, 0] })
    ]
  }
];

// =====================================================================
// SWING
// =====================================================================
const swingSolo = [
  {
    id: 'charleston',
    name: 'Charleston',
    level: 'Beginner',
    desc: 'Kick forward, step back, kick back — with swinging arms and twisting heels.',
    cues: ['Step L', 'Kick R forward', 'Step R back', 'Tap L back', 'Step L', 'Kick R forward', 'Step R back', 'Tap L back'],
    keys: (() => {
      const seq = (b) => [
        k(b + 0, { lArm: A.lowV, rArm: A.lowV, squat: 10, pelvis: [0, 10, 0] }),
        k(b + 1, { rLeg: [55, 90, 0, 0], rFoot: 30, lArm: [60, -40, 0, 20], rArm: [60, 80, 0, 20], squat: 6, pelvis: [0, -10, 0] }),
        k(b + 2, { rLeg: [8, -90, 0, 10], squat: 14, lArm: A.lowV, rArm: A.lowV, pelvis: [0, 10, 0] }),
        k(b + 3, { lLeg: [45, -90, 0, 20], lFoot: 30, lArm: [60, 80, 0, 20], rArm: [60, -40, 0, 20], spine: [12, 0, 0], squat: 8, pelvis: [0, -10, 0] })
      ];
      return [...seq(0), ...seq(4), k(8, { lArm: A.lowV, rArm: A.lowV, squat: 10, pelvis: [0, 10, 0] })];
    })()
  },
  {
    id: 'triple-step',
    name: 'Triple Step & Rock Step',
    level: 'Beginner',
    desc: 'The swing basic: triple-step L, triple-step R, rock step back — bouncy and relaxed.',
    cues: ['Triple L (1&2)', '…', 'Triple R (3&4)', '…', 'Rock back (5)', 'Replace (6)', 'Triple L (7&8)', '…'],
    keys: (() => {
      const tri = (b, m) => [
        (m ? km : k)(b, { rLeg: L.side, squat: 14, lArm: A.fwdLow, rArm: A.fwdLow, root: { x: -0.1 } }),
        (m ? km : k)(b + 0.5, { lLeg: [6, 0, 0, 10], squat: 10, lArm: A.fwdLow, rArm: A.fwdLow, root: { x: -0.12 } }),
        (m ? km : k)(b + 1, { rLeg: L.side, squat: 14, lArm: A.fwdLow, rArm: A.fwdLow, root: { x: -0.16 } })
      ];
      return [
        k(0, { squat: 10, lArm: A.fwdLow, rArm: A.fwdLow }),
        ...tri(0.5, true),
        ...tri(2.5, false),
        k(4.5, { lLeg: L.back, squat: 12, spine: [-6, 0, 0], lArm: A.lowV, rArm: A.lowV, root: { z: -0.12 } }),
        k(5.5, { squat: 10, lArm: A.fwdLow, rArm: A.fwdLow, root: { z: 0 } }),
        ...tri(6.2, true),
        k(8, { squat: 10, lArm: A.fwdLow, rArm: A.fwdLow })
      ];
    })()
  },
  {
    id: 'shorty-george',
    name: 'Shorty George',
    level: 'Intermediate',
    desc: 'Low, knees-together walk with hips swinging and arms pushing down — pure 1930s.',
    cues: ['Sink low, step R', 'Step L', 'Step R', 'Step L', 'Swing it R', 'Swing it L', 'Rise up', 'Point & smile'],
    keys: (() => {
      const w = (b, s, z) => k(b, { squat: 45, spine: [18, 0, 0], pelvis: [0, 18 * s, 0], lLeg: [12, 120, -15, 0], rLeg: [12, 120, -15, 0], lArm: [30, 70 + 20 * s, -60, 30], rArm: [30, 70 - 20 * s, -60, 30], root: { x: -0.08 * s, z } });
      return [k(0, { squat: 10, lArm: A.lowV, rArm: A.lowV }), w(1, 1, 0.05), w(2, -1, 0.1), w(3, 1, 0.15), w(4, -1, 0.2), w(5, 1, 0.2), w(6, -1, 0.2), k(7, { squat: 10, lArm: A.side, rArm: A.side, root: { z: 0.1 } }), k(7.6, { lArm: A.hip, rArm: A.point, rLeg: [20, 30, 0, 0], rFoot: 30, root: { z: 0.04 } }), k(8, { squat: 10, lArm: A.lowV, rArm: A.lowV })];
    })()
  },
  {
    id: 'suzie-q',
    name: 'Suzie Q',
    level: 'Intermediate',
    desc: 'Travel sideways with heel twists and crossed "finger-wag" arms.',
    cues: ['Twist heels in', 'Step R', 'Twist', 'Step R', 'Twist', 'Step L back', 'Twist', 'Step L back'],
    keys: (() => {
      const arms = { lArm: [70, 110, -90, 120], rArm: [55, 60, -90, 60] };
      const tw = (b, s, x) => k(b, { ...arms, lLeg: s > 0 ? L.heelTwistIn : L.heelTwistOut, rLeg: s > 0 ? L.heelTwistOut : L.heelTwistIn, pelvis: [0, 15 * s, 0], spine: [10, -10 * s, 0], squat: 18, root: { x } });
      return [tw(0, 1, 0), tw(1, -1, -0.1), tw(2, 1, -0.2), tw(3, -1, -0.3), tw(4, 1, -0.4), tw(5, -1, -0.3), tw(6, 1, -0.2), tw(7, -1, -0.1), tw(8, 1, 0)];
    })()
  },
  {
    id: 'swing-finale',
    name: 'Swing Out Pose',
    level: 'Beginner',
    desc: 'Big jazz hands and a kicked-back heel to end the number.',
    finale: true,
    cues: ['Step', 'Step', 'Triple', 'Prep', 'Kick back', 'Jazz hands!', 'Hold', 'Hold'],
    keys: [
      k(0, { squat: 10 }),
      k(1, { rLeg: L.side, squat: 12, root: { x: -0.08 } }),
      k(2, { lLeg: L.side, squat: 12, root: { x: 0 } }),
      k(3, { squat: 20, lArm: A.first, rArm: A.first }),
      k(4, { lLeg: [50, -90, 0, 80], lFoot: 30, lArm: A.highV, rArm: A.highV, chest: [-10, 0, 0] }),
      k(8, { lLeg: [50, -90, 0, 80], lFoot: 30, lArm: A.highV, rArm: A.highV, chest: [-10, 0, 0], head: [-10, 0, 0] })
    ]
  }
];

// ---------- partner helpers ----------
// Lead's base spot: x = -0.38 facing +x.  Follow: x = +0.38 facing -x.
// root.x / root.z on partner moves are offsets in couple space.
const closed = {
  lead: { lArm: A.frameHand, rArm: A.frameBack },
  follow: { lArm: A.onShoulder, rArm: A.frameHand }
};

const swingPartner = [
  {
    id: 'swing-out',
    name: 'Lindy Swing-Out',
    level: 'Intermediate',
    partner: true,
    desc: 'Rock step apart, then the couple whips around each other in a full circle.',
    cues: ['Lead: rock back · Follow: rock back', 'Replace', 'Triple in (3&4)', '…', 'Rotate together', 'Keep circling', 'Triple out (7&8)', 'Open position'],
    lead: [
      k(0, { lArm: A.lowHold, rArm: A.down, squat: 10, root: { x: -0.1 } }),
      k(1, { rLeg: L.back, lArm: [40, 60, 0, 5], squat: 12, spine: [-8, 0, 0], root: { x: -0.2 } }),
      k(2, { squat: 10, lArm: A.lowHold, root: { x: -0.1 } }),
      k(3, { ...closed.lead, squat: 14, root: { x: 0.05 }, spin: -60 }),
      k(5, { ...closed.lead, squat: 14, spine: [-8, 0, 0], root: { x: 0.05 }, spin: -200 }),
      k(6, { ...closed.lead, squat: 14, spine: [-6, 0, 0], root: { x: 0 }, spin: -280 }),
      k(7, { lArm: [40, 60, 0, 5], rArm: A.down, squat: 14, root: { x: -0.1 }, spin: -340 }),
      k(8, { lArm: A.lowHold, rArm: A.down, squat: 10, root: { x: -0.1 }, spin: -360 })
    ],
    follow: [
      k(0, { rArm: A.lowHold, lArm: A.down, squat: 10, root: { x: 0.1 } }),
      k(1, { lLeg: L.back, rArm: [40, 60, 0, 5], squat: 12, spine: [-8, 0, 0], root: { x: 0.2 } }),
      k(2, { squat: 10, rArm: A.lowHold, root: { x: 0.1 } }),
      k(3, { ...closed.follow, squat: 14, root: { x: -0.05 }, spin: -60 }),
      k(5, { ...closed.follow, squat: 14, spine: [-8, 0, 0], root: { x: -0.05 }, spin: -200 }),
      k(6, { ...closed.follow, squat: 14, spine: [-6, 0, 0], root: { x: 0 }, spin: -280 }),
      k(7, { rArm: [40, 60, 0, 5], lArm: A.down, squat: 14, root: { x: 0.1 }, spin: -340 }),
      k(8, { rArm: A.lowHold, lArm: A.down, squat: 10, root: { x: 0.1 }, spin: -360 })
    ]
  },
  {
    id: 'tuck-turn',
    name: 'Tuck Turn',
    level: 'Intermediate',
    partner: true,
    desc: 'Lead tucks the follow in, then sends them spinning under the arm.',
    cues: ['Rock step', 'Replace', 'Tuck in', 'Lead lifts the hand', 'Follow turns R', 'Turn…', 'Triple step', 'Back to open'],
    lead: [
      k(0, { lArm: A.lowHold, squat: 10, root: { x: -0.1 } }),
      k(1, { rLeg: L.back, lArm: [40, 60, 0, 5], squat: 12, root: { x: -0.18 } }),
      k(2, { lArm: A.lowHold, squat: 10, root: { x: -0.1 } }),
      k(3, { lArm: [60, 80, -60, 70], squat: 16, spine: [0, 20, 0], root: { x: -0.05 } }),
      k(4, { lArm: A.turnHand, squat: 10, root: { x: -0.08 } }),
      k(6, { lArm: A.turnHand, squat: 12, root: { x: -0.1 } }),
      k(7, { lArm: A.lowHold, squat: 14, root: { x: -0.1 } }),
      k(8, { lArm: A.lowHold, squat: 10, root: { x: -0.1 } })
    ],
    follow: [
      k(0, { rArm: A.lowHold, squat: 10, root: { x: 0.1 } }),
      k(1, { lLeg: L.back, rArm: [40, 60, 0, 5], squat: 12, root: { x: 0.18 } }),
      k(2, { rArm: A.lowHold, squat: 10, root: { x: 0.1 } }),
      k(3, { rArm: [55, 70, 0, 60], squat: 16, spine: [0, -20, 0], root: { x: 0.02, rot: 30 } }),
      k(4, { rArm: A.turnHand, lArm: A.lowV, lFoot: 30, rFoot: 30, root: { x: 0.04, rot: 0, lift: 0.03 } }),
      k(6, { rArm: A.turnHand, lArm: A.lowV, lFoot: 30, rFoot: 30, root: { x: 0.1, rot: -360, lift: 0.03 } }),
      k(7, { rArm: A.lowHold, squat: 14, root: { x: 0.1, rot: -360 } }),
      k(8, { rArm: A.lowHold, squat: 10, root: { x: 0.1, rot: -360 } })
    ]
  }
];

// =====================================================================
// WEDDING (all partner moves — beginner friendly, romantic)
// =====================================================================
const wedding = [
  {
    id: 'slow-sway',
    name: 'Slow Sway',
    level: 'Beginner',
    partner: true,
    desc: 'Closed position, gentle side-to-side sway while slowly rotating. The heart of every first dance.',
    cues: ['Sway to Lead’s left', 'Hold the sway', 'Sway to Lead’s right', 'Hold', 'Sway left (turn a little)', 'Hold', 'Sway right', 'Hold — eye contact ♥'],
    lead: [
      k(0, { ...closed.lead, spin: 0 }),
      k(1.5, { ...closed.lead, root: { z: -0.07 }, spine: [0, 0, 5], head: [0, 0, 6], lLeg: [10, 0, 0, 0], rLeg: [2, 0, 0, 8], spin: 8 }),
      k(3.5, { ...closed.lead, root: { z: 0.07 }, spine: [0, 0, -5], head: [0, 0, -6], rLeg: [10, 0, 0, 0], lLeg: [2, 0, 0, 8], spin: 16 }),
      k(5.5, { ...closed.lead, root: { z: -0.07 }, spine: [0, 0, 5], head: [0, 0, 6], lLeg: [10, 0, 0, 0], rLeg: [2, 0, 0, 8], spin: 8 }),
      k(7.5, { ...closed.lead, root: { z: 0.04 }, spine: [0, 0, -3], spin: 0 }),
      k(8, { ...closed.lead, spin: 0 })
    ],
    follow: [
      k(0, { ...closed.follow, spin: 0 }),
      k(1.5, { ...closed.follow, root: { z: -0.07 }, spine: [0, 0, -5], head: [-4, 0, -8], rLeg: [10, 0, 0, 0], lLeg: [2, 0, 0, 8], spin: 8 }),
      k(3.5, { ...closed.follow, root: { z: 0.07 }, spine: [0, 0, 5], head: [-4, 0, 8], lLeg: [10, 0, 0, 0], rLeg: [2, 0, 0, 8], spin: 16 }),
      k(5.5, { ...closed.follow, root: { z: -0.07 }, spine: [0, 0, -5], head: [-4, 0, -8], rLeg: [10, 0, 0, 0], lLeg: [2, 0, 0, 8], spin: 8 }),
      k(7.5, { ...closed.follow, root: { z: 0.04 }, spine: [0, 0, 3], spin: 0 }),
      k(8, { ...closed.follow, spin: 0 })
    ]
  },
  {
    id: 'box-step',
    name: 'Waltz Box Step',
    level: 'Beginner',
    partner: true,
    desc: 'Forward–side–together, back–side–together. Lead travels forward while the follow mirrors backward.',
    cues: ['Lead: L forward · Follow: R back', 'Lead: R side · Follow: L side', 'Feet together', 'Hold', 'Lead: R back · Follow: L forward', 'Lead: L side · Follow: R side', 'Feet together', 'Hold & smile'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...closed.lead, lLeg: [18, 90, 0, 4], rLeg: [12, -90, 0, 0], root: { x: 0.12 } }),
      k(2, { ...closed.lead, rLeg: [14, 0, 0, 0], root: { x: 0.18, z: 0.1 } }),
      k(3, { ...closed.lead, squat: 6, root: { x: 0.18, z: 0.14 } }),
      k(4, { ...closed.lead, root: { x: 0.18, z: 0.14 }, lFoot: 15, rFoot: 15 }),
      k(5, { ...closed.lead, rLeg: [18, -90, 0, 4], lLeg: [12, 90, 0, 0], root: { x: 0.06, z: 0.14 } }),
      k(6, { ...closed.lead, lLeg: [14, 0, 0, 0], root: { x: 0, z: 0.04 } }),
      k(7, { ...closed.lead, squat: 6, root: { x: 0, z: 0 } }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...closed.follow, rLeg: [18, -90, 0, 4], lLeg: [12, 90, 0, 0], root: { x: 0.12 } }),
      k(2, { ...closed.follow, lLeg: [14, 0, 0, 0], root: { x: 0.18, z: 0.1 } }),
      k(3, { ...closed.follow, squat: 6, root: { x: 0.18, z: 0.14 } }),
      k(4, { ...closed.follow, root: { x: 0.18, z: 0.14 }, lFoot: 15, rFoot: 15 }),
      k(5, { ...closed.follow, lLeg: [18, 90, 0, 4], rLeg: [12, -90, 0, 0], root: { x: 0.06, z: 0.14 } }),
      k(6, { ...closed.follow, rLeg: [14, 0, 0, 0], root: { x: 0, z: 0.04 } }),
      k(7, { ...closed.follow, squat: 6, root: { x: 0, z: 0 } }),
      k(8, { ...closed.follow })
    ]
  },
  {
    id: 'underarm-turn',
    name: 'Underarm Spin',
    level: 'Beginner',
    partner: true,
    desc: 'Lead raises the joined hands and the follow twirls underneath — guests love it.',
    cues: ['Lead lifts joined hands', 'Follow steps forward', 'Follow turns R…', '…keep turning', '…and face partner', 'Lead lowers the hand', 'Back into frame', 'Sway'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: A.turnHand, rArm: [30, 40, 0, 20], root: { x: -0.05 } }),
      k(5, { lArm: A.turnHand, rArm: [30, 40, 0, 20], root: { x: -0.05 }, spine: [0, 0, 4] }),
      k(6, { lArm: [90, 40, 0, 50], rArm: [30, 40, 0, 20] }),
      k(7, { ...closed.lead }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: A.turnHand, lArm: A.lowV, root: { x: 0.05 } }),
      k(2, { rArm: A.turnHand, lArm: A.lowV, lFoot: 25, rFoot: 25, root: { x: 0.08, z: 0.04, rot: -90, lift: 0.02 } }),
      k(4, { rArm: A.turnHand, lArm: A.side, lFoot: 25, rFoot: 25, root: { x: 0.08, z: 0.02, rot: -300, lift: 0.02 } }),
      k(5, { rArm: A.turnHand, lArm: A.lowV, root: { x: 0.05, rot: -360 } }),
      k(6, { rArm: [90, 40, 0, 50], lArm: A.lowV, root: { rot: -360 } }),
      k(7, { ...closed.follow, root: { rot: -360 } }),
      k(8, { ...closed.follow, root: { rot: -360 } })
    ]
  },
  {
    id: 'open-reveal',
    name: 'Open-Out Reveal',
    level: 'Beginner',
    partner: true,
    desc: 'Follow rolls out to arm’s length, both turn to the guests with a free-arm “ta-da”, then roll back in.',
    cues: ['Lead opens the frame', 'Follow travels out', 'Turn to the guests', 'Ta-da! Free arms up', 'Hold & smile', 'Roll back in', 'Into frame', 'Sway'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: [60, 30, 0, 40], rArm: A.down }),
      k(2, { lArm: [75, 20, 0, 10], rArm: A.down, root: { rot: -45 } }),
      k(3, { lArm: [80, 10, 0, 5], rArm: [140, 10, 0, 5], root: { x: 0.05, rot: -90 } }),
      k(5, { lArm: [80, 10, 0, 5], rArm: [145, 10, 0, 5], chest: [-4, 0, 0], root: { x: 0.05, rot: -90 } }),
      k(6, { lArm: [60, 30, 0, 40], rArm: A.down, root: { rot: -30 } }),
      k(7, { ...closed.lead }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: [60, 30, 0, 40], lArm: A.down, root: { x: 0.15 } }),
      k(2, { rArm: [75, 20, 0, 10], lArm: A.lowV, root: { x: 0.35, rot: 45 } }),
      k(3, { rArm: [80, 10, 0, 5], lArm: [140, 10, 0, 5], rLeg: [20, 30, 0, 0], rFoot: 30, root: { x: 0.45, rot: 90 } }),
      k(5, { rArm: [80, 10, 0, 5], lArm: [145, 10, 0, 5], rLeg: [20, 30, 0, 0], rFoot: 30, chest: [-6, 0, 0], head: [-6, 10, 0], root: { x: 0.45, rot: 90 } }),
      k(6, { rArm: [60, 30, 0, 40], lArm: A.lowV, lFoot: 20, rFoot: 20, root: { x: 0.25, rot: -180 } }),
      k(7, { ...closed.follow, root: { x: 0, rot: -270 } }),
      k(8, { ...closed.follow, root: { rot: -270 } })
    ]
  },
  {
    id: 'cuddle-wrap',
    name: 'Cuddle Wrap',
    level: 'Beginner',
    partner: true,
    desc: 'Follow turns into the lead’s arms; sway together facing the guests, then unwrap.',
    cues: ['Lead guides the turn', 'Follow rolls in', 'Wrapped — face guests', 'Sway left', 'Sway right', 'Lead unwraps', 'Follow rolls out', 'Back into frame'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: [80, 60, 0, 40], rArm: [50, 60, 0, 40], root: { rot: -30 } }),
      k(2, { lArm: [75, 75, -90, 70], rArm: [75, 75, -90, 70], root: { x: 0.2, z: -0.18, rot: -90 } }),
      k(3, { lArm: [75, 75, -90, 70], rArm: [75, 75, -90, 70], head: [10, 0, 10], root: { x: 0.12, z: -0.2, rot: -90 } }),
      k(4, { lArm: [75, 75, -90, 70], rArm: [75, 75, -90, 70], spine: [0, 0, -6], head: [10, 0, 10], root: { x: 0.28, z: -0.2, rot: -90 } }),
      k(5, { lArm: [75, 75, -90, 70], rArm: [75, 75, -90, 70], spine: [0, 0, 6], head: [10, 0, 10], root: { x: 0.12, z: -0.2, rot: -90 } }),
      k(6, { lArm: [80, 60, 0, 40], rArm: A.down, root: { x: 0.1, z: -0.1, rot: -60 } }),
      k(7, { ...closed.lead, root: { rot: 0 } }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: [80, 60, 0, 40], lArm: A.lowV, root: { x: -0.1, rot: 40 } }),
      k(2, { lArm: [55, 80, -90, 85], rArm: [55, 80, -90, 85], root: { x: -0.18, z: 0.12, rot: 90 } }),
      k(3, { lArm: [55, 80, -90, 85], rArm: [55, 80, -90, 85], head: [-5, 20, -8], root: { x: -0.26, z: 0.12, rot: 90 } }),
      k(4, { lArm: [55, 80, -90, 85], rArm: [55, 80, -90, 85], spine: [0, 0, -6], head: [-5, 20, -8], root: { x: -0.1, z: 0.12, rot: 90 } }),
      k(5, { lArm: [55, 80, -90, 85], rArm: [55, 80, -90, 85], spine: [0, 0, 6], head: [-5, 20, -8], root: { x: -0.26, z: 0.12, rot: 90 } }),
      k(6, { rArm: [80, 60, 0, 40], lArm: A.lowV, root: { x: -0.05, z: 0.06, rot: 0 } }),
      k(7, { ...closed.follow, root: { rot: -40 } }),
      k(8, { ...closed.follow })
    ]
  },
  {
    id: 'promenade',
    name: 'Side-by-Side Promenade',
    level: 'Beginner',
    partner: true,
    desc: 'Hand in hand, stroll four steps toward your guests and four steps back.',
    cues: ['Turn to the guests', 'Walk L', 'Walk R', 'Walk L — look at each other', 'Touch & pause', 'Walk back R', 'Walk back L', 'Turn back in'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: [30, 10, 0, 10], rArm: A.down, root: { x: 0.1, rot: -90 } }),
      k(2, { lArm: [30, 10, 0, 10], lLeg: L.fwd, rLeg: [10, -90, 0, 0], root: { x: 0.1, z: 0.15, rot: -90 } }),
      k(3, { lArm: [30, 10, 0, 10], rLeg: L.fwd, lLeg: [10, -90, 0, 0], root: { x: 0.1, z: 0.3, rot: -90 } }),
      k(4, { lArm: [30, 10, 0, 10], head: [0, 30, 0], root: { x: 0.1, z: 0.42, rot: -90 } }),
      k(5, { lArm: [30, 10, 0, 10], rLeg: L.tapFwd, rFoot: 20, head: [0, 30, 0], root: { x: 0.1, z: 0.42, rot: -90 } }),
      k(6, { lArm: [30, 10, 0, 10], rLeg: [10, -90, 0, 0], root: { x: 0.1, z: 0.28, rot: -90 } }),
      k(7, { lArm: [30, 10, 0, 10], lLeg: [10, -90, 0, 0], root: { x: 0.1, z: 0.12, rot: -90 } }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: [30, 10, 0, 10], lArm: A.down, root: { x: -0.1, rot: 90 } }),
      k(2, { rArm: [30, 10, 0, 10], rLeg: L.fwd, lLeg: [10, -90, 0, 0], root: { x: -0.1, z: 0.15, rot: 90 } }),
      k(3, { rArm: [30, 10, 0, 10], lLeg: L.fwd, rLeg: [10, -90, 0, 0], root: { x: -0.1, z: 0.3, rot: 90 } }),
      k(4, { rArm: [30, 10, 0, 10], head: [0, -30, 0], root: { x: -0.1, z: 0.42, rot: 90 } }),
      k(5, { rArm: [30, 10, 0, 10], lLeg: L.tapFwd, lFoot: 20, head: [0, -30, 0], root: { x: -0.1, z: 0.42, rot: 90 } }),
      k(6, { rArm: [30, 10, 0, 10], lLeg: [10, -90, 0, 0], root: { x: -0.1, z: 0.28, rot: 90 } }),
      k(7, { rArm: [30, 10, 0, 10], rLeg: [10, -90, 0, 0], root: { x: -0.1, z: 0.12, rot: 90 } }),
      k(8, { ...closed.follow })
    ]
  },
  {
    id: 'dip',
    name: 'Dramatic Dip',
    level: 'Beginner',
    partner: true,
    finale: true,
    desc: 'The show-stopping finish. Lead lunges and supports the upper back; follow arches back and pops a leg.',
    cues: ['Sway, prepare', 'Lead: firm frame on the back', 'Lead lunges forward on R', 'Follow arches back', 'DIP! — leg pop', 'Hold…', 'Hold… (cue the kiss)', 'Hold the moment ♥'],
    lead: [
      k(0, { ...closed.lead }),
      k(2, { ...closed.lead, root: { z: -0.05 }, spine: [0, 0, 4] }),
      k(3, { ...closed.lead, rArm: [55, 75, -90, 60], squat: 10 }),
      k(4.5, { lArm: [95, 30, 0, 20], rArm: [55, 80, -90, 55], rLeg: L.lunge, lLeg: L.lungeBack, spine: [20, 0, 0], head: [15, 0, 0], root: { x: -0.08, z: 0.06 } }),
      k(8, { lArm: [100, 30, 0, 15], rArm: [55, 80, -90, 55], rLeg: L.lunge, lLeg: L.lungeBack, spine: [22, 0, 0], head: [18, 0, 0], root: { x: -0.08, z: 0.06 } })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(2, { ...closed.follow, root: { z: -0.05 }, spine: [0, 0, -4] }),
      k(3, { ...closed.follow, squat: 10 }),
      k(4.5, { lArm: [80, 70, 0, 30], rArm: [100, 30, 0, 10], spine: [-30, 0, 0], chest: [-18, 0, 0], head: [-25, 0, 0], lLeg: [55, 90, 0, 60], lFoot: 50, squat: 25, root: { x: 0.02 } }),
      k(8, { lArm: [80, 70, 0, 30], rArm: [110, 30, 0, 5], spine: [-34, 0, 0], chest: [-20, 0, 0], head: [-28, 0, 0], lLeg: [60, 90, 0, 60], lFoot: 55, squat: 28, root: { x: 0.02 } })
    ]
  },
  {
    id: 'spin-kiss',
    name: 'Twirl & Kiss',
    level: 'Beginner',
    partner: true,
    finale: true,
    desc: 'A gentler finale: one last twirl, then lean in for the kiss.',
    cues: ['Lift joined hands', 'Twirl…', '…twirl', 'Face each other', 'Step close', 'Lean in', 'Kiss ♥', 'Hold'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: A.turnHand, rArm: A.down }),
      k(3, { lArm: A.turnHand, rArm: A.down }),
      k(4, { lArm: [60, 40, 0, 40], rArm: [50, 70, -90, 70] }),
      k(5, { lArm: [60, 70, -90, 80], rArm: [60, 70, -90, 80], root: { x: 0.06 } }),
      k(6, { lArm: [60, 70, -90, 80], rArm: [60, 70, -90, 80], spine: [8, 0, 0], head: [10, 0, 8], root: { x: 0.1 } }),
      k(8, { lArm: [60, 70, -90, 80], rArm: [60, 70, -90, 80], spine: [8, 0, 0], head: [12, 0, 8], root: { x: 0.1 } })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: A.turnHand, lArm: A.lowV, lFoot: 20, rFoot: 20, root: { lift: 0.02 } }),
      k(3, { rArm: A.turnHand, lArm: A.side, lFoot: 20, rFoot: 20, root: { rot: -360, lift: 0.02 } }),
      k(4, { rArm: [60, 40, 0, 40], lArm: A.lowV, root: { rot: -360 } }),
      k(5, { lArm: [95, 70, 0, 40], rArm: [95, 70, 0, 40], root: { x: -0.06, rot: -360 } }),
      k(6, { lArm: [100, 70, 0, 40], rArm: [100, 70, 0, 40], lFoot: 25, rFoot: 25, rLeg: [30, -90, 0, 70], head: [-10, 0, -8], root: { x: -0.1, rot: -360, lift: 0.02 } }),
      k(8, { lArm: [100, 70, 0, 40], rArm: [100, 70, 0, 40], lFoot: 25, rFoot: 25, rLeg: [35, -90, 0, 80], head: [-12, 0, -8], root: { x: -0.1, rot: -360, lift: 0.02 } })
    ]
  }
];

// =====================================================================
// STYLES
// =====================================================================
export const STYLES = {
  wedding: {
    id: 'wedding',
    name: 'Wedding First Dance',
    short: 'Wedding',
    icon: '💍',
    featured: true,
    feel: 'smooth',
    groove: 'sway',
    partner: true,
    defaultBpm: 76,
    blurb: 'Romantic, beginner-friendly partner choreography — sways, spins, a reveal for your guests and a dramatic dip finale.',
    tips: [
      'Most couples dance 2–2½ minutes. Fade the song early — guests will join you!',
      'Rehearse in the shoes you’ll wear on the day (and with a sheet as a mock train).',
      'Lead: keep a firm frame — your partner feels direction through your back hand.',
      'For the dip, the lead bends their own knees; never pull the partner down by the arm.',
      'Eye contact and smiles matter more than perfect footwork.'
    ],
    moves: wedding
  },
  jazz: {
    id: 'jazz',
    name: 'Jazz',
    short: 'Jazz',
    icon: '🎷',
    feel: 'snap',
    groove: 'jazz',
    defaultBpm: 118,
    blurb: 'Sharp, sassy and showy: isolations, kicks, turns and plenty of jazz hands.',
    tips: ['Sell it with your face — jazz is performance!', 'Keep your core lifted on kicks so your standing leg stays strong.', 'Spot a point on the wall during turns so you don’t get dizzy.'],
    moves: jazz
  },
  lyrical: {
    id: 'lyrical',
    name: 'Lyrical',
    short: 'Lyrical',
    icon: '🕊️',
    feel: 'flow',
    groove: 'breath',
    defaultBpm: 72,
    blurb: 'Fluid, emotional movement that tells the story of the lyrics.',
    tips: ['Move through the music — don’t hit every beat, let movements breathe.', 'Reach past your fingertips to make lines look longer.', 'Let the lyrics inspire your facial expression.'],
    moves: lyrical
  },
  hiphop: {
    id: 'hiphop',
    name: 'Hip-Hop',
    short: 'Hip-Hop',
    icon: '🎧',
    feel: 'hit',
    groove: 'bounce',
    defaultBpm: 96,
    blurb: 'Grounded grooves, bounces and hard-hitting accents on the beat.',
    tips: ['Stay low with soft knees — the bounce lives in your legs.', 'Hit = fast then freeze. Contrast makes it pop.', 'Swagger counts: relax your shoulders and own it.'],
    moves: hiphop
  },
  swing: {
    id: 'swing',
    name: 'Swing',
    short: 'Swing',
    icon: '🎺',
    feel: 'swing',
    groove: 'pulse',
    partner: true,
    defaultBpm: 140,
    blurb: 'Joyful Lindy-hop and Charleston vibes — bouncy solo jazz steps and partner swing-outs.',
    tips: ['Keep a constant down-pulse in your knees.', 'Triple steps are “1-and-2” — small and light.', 'With a partner, connection comes from gentle tension in the arms.'],
    moves: [...swingSolo, ...swingPartner]
  }
};

export const STYLE_ORDER = ['wedding', 'jazz', 'lyrical', 'hiphop', 'swing'];

export const MOVES = {};
for (const s of Object.values(STYLES)) for (const m of s.moves) MOVES[m.id] = { ...m, style: s.id };

// ---------- choreography generator ----------
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const SECTION_FLOW = ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'];

/** Build a list of { move, section } for `count` eight-counts. */
export function generateChoreo(styleId, count, { seed = Date.now(), finaleId, solo = false } = {}) {
  const style = STYLES[styleId];
  const rand = rng(seed);
  let pool = style.moves.filter((m) => !m.finale);
  if (solo && styleId !== 'wedding') pool = pool.filter((m) => !m.partner);
  if (!pool.length) pool = style.moves.filter((m) => !m.finale);
  const finales = style.moves.filter((m) => m.finale);
  const finale = (finaleId && style.moves.find((m) => m.id === finaleId)) || finales[0];

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const out = [];
  if (styleId === 'wedding') {
    // A tried-and-true first-dance structure
    const opener = ['slow-sway', 'slow-sway', 'box-step', 'underarm-turn'];
    const middle = shuffle(['box-step', 'underarm-turn', 'open-reveal', 'cuddle-wrap', 'promenade', 'slow-sway']);
    const sections = ['Opening', 'Opening', 'Opening', 'Opening'];
    for (let i = 0; i < count; i++) {
      let id;
      let section;
      if (i < opener.length) {
        id = opener[i];
        section = sections[i];
      } else {
        const j = i - opener.length;
        id = j % 4 === 3 ? 'slow-sway' : middle[j % middle.length];
        section = ['Story', 'Show-off', 'Romance', 'Build'][Math.floor(j / 4) % 4];
      }
      out.push({ move: id, section });
    }
  } else {
    const shuffled = shuffle(pool);
    const phraseA = [0, 1, 2, 3].map((i) => shuffled[i % shuffled.length].id);
    const phraseB = [0, 1, 2, 3].map((i) => shuffled[(i + 4) % shuffled.length].id);
    if (phraseB.join() === phraseA.join()) phraseB.reverse();
    for (let i = 0; i < count; i++) {
      const sec = SECTION_FLOW[Math.floor(i / 4) % SECTION_FLOW.length];
      let id;
      if (sec === 'Chorus') id = phraseB[i % 4];
      else if (sec === 'Bridge') id = shuffled[Math.floor(rand() * shuffled.length)].id;
      else id = phraseA[i % 4];
      out.push({ move: id, section: sec });
    }
  }
  if (finale && count > 1) out[count - 1] = { move: finale.id, section: 'Finale' };
  return out;
}
