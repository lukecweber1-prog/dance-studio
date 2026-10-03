// Move library for a couple's first dance. Every move lasts one 8-count and has separate `lead` and
// `follow` tracks of [beat, pose] keyframes, positioned around a shared couple centre
// (lead at x < 0 facing +x, follow at x > 0 facing -x; root.x / root.z are offsets in couple space).
// Moves carry a difficulty `level` from 1 (Beginner) to 5 (Showstopper).
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
  twoHand: [15, 100, 0, 45], // both hands joined low between the partners (lead)
  twoHandF: [15, 95, 0, 50], // …and the follow's
  oneHand: [35, 100, 0, 5], // lead's left hand joined with the follow's right, open position
  oneHandF: [40, 100, 0, 5],
  waist: [35, 100, 0, 10], // lead's hands on the follow's waist
  shoulders: [55, 95, 0, 75], // follow's hands on the lead's shoulders
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
// JAZZ (solo source material — turned into partner duets below)
// =====================================================================
const jazzSolo = [
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
// LYRICAL (solo source material — turned into partner duets below)
// =====================================================================
const lyricalSolo = [
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
// HIP-HOP (solo source material — turned into partner duets below)
// =====================================================================
const hiphopSolo = [
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


const closed = {
  lead: { lArm: A.frameHand, rArm: A.frameBack },
  follow: { lArm: A.onShoulder, rArm: A.frameHand }
};

// =====================================================================
// CLASSIC ROMANTIC (the original wedding first-dance moves)
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

// Difficulty levels (1–5) shown as ticks on the difficulty bar.
export const LEVELS = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Showstopper'];

const setLevels = (moves, levels) => moves.forEach((m) => Object.assign(m, levels[m.id] || {}));
setLevels(wedding, {
  'slow-sway': { level: 1, basic: true },
  'box-step': { level: 1, basic: true },
  'underarm-turn': { level: 1 },
  'open-reveal': { level: 2 },
  'cuddle-wrap': { level: 2 },
  dip: { level: 2 },
  'spin-kiss': { level: 1 }
});

// =====================================================================
// DUETS
// The couple faces each other in a hold; the follow mirrors the lead the way partner dances do
// (lead's left foot forward = follow's right foot back) and both travel together.
// Solo keyframes are authored facing the audience: root.x = the dancer's left, root.z = forward.
// =====================================================================
const HOLDS = {
  closed: { sep: 0, lead: closed.lead, follow: closed.follow },
  two: { sep: 0.1, lead: { lArm: A.twoHand, rArm: A.twoHand }, follow: { lArm: A.twoHandF, rArm: A.twoHandF } },
  one: { sep: 0.14, lead: { lArm: A.oneHand }, follow: { rArm: A.oneHandF } },
  free: { sep: 0.12, lead: {}, follow: {} }
};

/** Mirror for a facing partner: swap left/right and turn forward steps into backward ones. */
function partnerMirror(p) {
  const m = mirrorPose(p);
  m.lLeg[1] = -m.lLeg[1];
  m.rLeg[1] = -m.rLeg[1];
  return m;
}

function toCouple(p, src, dx, arms, legFix) {
  const o = P(p);
  Object.assign(o, JSON.parse(JSON.stringify(arms)));
  if (legFix) for (const leg of ['lLeg', 'rLeg']) o[leg] = legFix(o[leg]);
  o.root = { x: src.root.z + dx, z: -src.root.x, rot: p.root.rot, lift: src.root.lift };
  o.spin = src.spin;
  return o;
}

/**
 * Turn a solo routine into a partnered one.
 * opts: hold ('closed' | 'two' | 'one' | 'free'), sep (extra distance each), legFix (adjust a leg so kicks
 * don't hit the partner), extra fields for the move object.
 */
function duet(solo, { hold = 'one', sep, legFix, ...extra }) {
  const H = HOLDS[hold];
  const d = sep ?? H.sep;
  return {
    ...solo,
    keys: undefined,
    partner: true,
    hold,
    desc: solo.desc + (hold === 'free' ? ' Face each other and mirror your partner.' : ' Danced together in a hold — the follow mirrors the lead.'),
    lead: solo.keys.map(([b, p]) => [b, toCouple(p, p, -d, H.lead, legFix)]),
    follow: solo.keys.map(([b, p]) => [b, toCouple(partnerMirror(p), p, d, H.follow, legFix)]),
    ...extra
  };
}
const solo = (list, id) => list.find((m) => m.id === id);
// kicks and leg extensions go out to the open side instead of straight at the partner
const diagonal = (l) => (l[0] > 35 && l[1] > 50 && l[1] < 130 ? [l[0], 35, l[2], l[3]] : l);

// ---------- shared partner building blocks ----------
const W = { lArm: A.waist, rArm: A.waist }; // lead's hands on the follow's waist
const SHO = { lArm: A.shoulders, rArm: A.shoulders }; // follow's hands on the lead's shoulders

/** Lead lifts the follow by the waist and turns once around; folPose shapes her in the air. */
function waistLift(id, name, level, desc, folPose, cues) {
  return {
    id,
    name,
    level,
    partner: true,
    lift: true,
    desc,
    cues: cues || ['Prep: plié together', 'LIFT — lead straightens the legs', 'Turn…', 'Turn…', 'Turn…', 'Turn…', 'Lower gently', 'Back into frame'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...W, squat: 26, root: { x: 0.04 } }),
      k(2, { lArm: [70, 95, 0, 35], rArm: [70, 95, 0, 35], squat: 6, spine: [-6, 0, 0], root: { x: 0.04 }, spin: -30 }),
      k(6, { lArm: [70, 95, 0, 35], rArm: [70, 95, 0, 35], squat: 8, spine: [-6, 0, 0], root: { x: 0.04 }, spin: -360 }),
      k(6.8, { ...W, squat: 22, root: { x: 0.04 }, spin: -360 }),
      k(7.5, { ...closed.lead, spin: -360 }),
      k(8, { ...closed.lead, spin: -360 })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...SHO, squat: 26, root: { x: -0.02 } }),
      k(2, { ...folPose, air: 1, root: { x: -0.06, lift: 0.42 }, spin: -30 }),
      k(6, { ...folPose, air: 1, root: { x: -0.06, lift: 0.42 }, spin: -360 }),
      k(6.8, { ...SHO, air: 0.4, squat: 20, root: { x: -0.02, lift: 0.04 }, spin: -360 }),
      k(7.5, { ...closed.follow, spin: -360 }),
      k(8, { ...closed.follow, spin: -360 })
    ]
  };
}

/** Lead spins the follow out to arm's length and back in; mid sets what happens while apart. */
function spinOut(id, name, level, desc, cues, mid = {}) {
  const lo = mid.lead || {};
  const fo = mid.follow || {};
  return {
    id,
    name,
    level,
    partner: true,
    desc,
    cues,
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: [60, 60, 0, 30], rArm: A.down, squat: 10, root: { x: -0.04 } }),
      k(2, { lArm: [80, 50, 0, 10], rArm: A.lowV, root: { x: -0.08 } }),
      k(4, { lArm: [75, 60, 0, 5], rArm: [40, 0, 0, 20], squat: 12, root: { x: -0.1 }, ...lo }),
      k(5, { lArm: [75, 60, 0, 5], rArm: [40, 0, 0, 20], rLeg: L.back, squat: 12, spine: [-6, 0, 0], root: { x: -0.16 }, ...lo }),
      k(6, { lArm: A.turnHand, rArm: A.down, squat: 8, root: { x: -0.08 } }),
      k(7, { ...closed.lead }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: [60, 60, 0, 30], lArm: A.lowV, lFoot: 25, rFoot: 25, root: { x: 0.1, rot: -120, lift: 0.02 } }),
      k(2, { rArm: [80, 50, 0, 10], lArm: A.side, lFoot: 25, rFoot: 25, root: { x: 0.34, rot: -300, lift: 0.02 } }),
      k(3, { rArm: [75, 60, 0, 5], lArm: [130, 10, 0, 5], squat: 10, root: { x: 0.44, rot: -360 } }),
      k(4, { rArm: [75, 60, 0, 5], lArm: [120, 10, 0, 5], squat: 12, root: { x: 0.46, rot: -360 }, ...fo }),
      k(5, { rArm: [75, 60, 0, 5], lArm: [40, 0, 0, 20], lLeg: L.back, squat: 12, spine: [-6, 0, 0], root: { x: 0.5, rot: -360 }, ...fo }),
      k(6, { rArm: A.turnHand, lArm: A.lowV, lFoot: 25, rFoot: 25, root: { x: 0.26, rot: -560, lift: 0.02 } }),
      k(7, { ...closed.follow, root: { x: 0.02, rot: -720 } }),
      k(8, { ...closed.follow, root: { rot: -720 } })
    ]
  };
}

// =====================================================================
// CLASSIC ROMANTIC — extra moves
// =====================================================================
const box = wedding.find((m) => m.id === 'box-step');
const turning = (keys) => keys.map(([b, p]) => [b, P({ ...p, spin: -45 * b })]);
const classicMore = [
  {
    ...box,
    id: 'waltz-turn',
    name: 'Waltz Box Turn',
    level: 2,
    basic: false,
    desc: 'The box step, turning a little on every step so the couple makes a full slow rotation.',
    cues: ['Lead: L forward, turning left', 'R side', 'Together', 'Hold', 'R back, keep turning', 'L side', 'Together', 'Hold — full circle'],
    lead: turning(box.lead),
    follow: turning(box.follow)
  },
  {
    id: 'picture-lunge',
    name: 'Picture Lunge',
    level: 3,
    partner: true,
    desc: 'A held lunge in frame: the follow leans back and turns her head out — the photographers’ favourite.',
    cues: ['Sway, prepare', 'Lead: step forward on L', 'Lunge — bend the front knee', 'Follow: arch back, look out', 'Hold the picture', 'Hold…', 'Recover', 'Back to the sway'],
    lead: [
      k(0, { ...closed.lead }),
      k(2, { ...closed.lead, squat: 10 }),
      k(3.5, { ...closed.lead, lLeg: L.lunge, rLeg: L.lungeBack, spine: [10, -12, 0], head: [-4, -30, 0], root: { x: 0.14 } }),
      k(6, { ...closed.lead, lLeg: L.lunge, rLeg: L.lungeBack, spine: [12, -12, 0], head: [-4, -32, 0], root: { x: 0.15 } }),
      k(7, { ...closed.lead, squat: 8, root: { x: 0.04 } }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(2, { ...closed.follow, squat: 10 }),
      k(3.5, { ...closed.follow, rLeg: [34, -90, 0, 0], lLeg: [18, 90, 0, 45], spine: [-22, 18, 0], chest: [-10, 0, 0], head: [-22, 45, 0], root: { x: 0.14 } }),
      k(6, { ...closed.follow, rLeg: [34, -90, 0, 0], lLeg: [18, 90, 0, 45], spine: [-25, 20, 0], chest: [-12, 0, 0], head: [-24, 48, 0], root: { x: 0.15 } }),
      k(7, { ...closed.follow, squat: 8, root: { x: 0.04 } }),
      k(8, { ...closed.follow })
    ]
  },
  waistLift('twirl-lift', 'Twirling Waist Lift', 4, 'The lead lifts the follow by the waist and turns a full circle while her legs float behind her.', {
    lArm: [110, 5, 0, 10],
    rArm: [110, 5, 0, 10],
    lLeg: [40, -90, 0, 85],
    rLeg: [28, -90, 0, 60],
    lFoot: 45,
    rFoot: 45,
    spine: [-8, 0, 0],
    head: [-15, 0, 0]
  }),
  {
    id: 'swan-lift',
    name: 'Swan Overhead Lift',
    level: 5,
    partner: true,
    lift: true,
    desc: 'The big one: the follow is pressed overhead and arches like a swan while the lead turns. Practise with a spotter on a soft floor.',
    cues: ['Face each other, deep plié', 'Follow jumps — lead catches the hips', 'PRESS overhead', 'Follow arches, arms wide', 'Lead turns slowly', 'Hold…', 'Lower down the front', 'Land softly, into frame'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...W, squat: 30, root: { x: 0.04 } }),
      k(2, { lArm: [100, 90, 0, 60], rArm: [100, 90, 0, 60], squat: 22, root: { x: 0.04 } }),
      k(3, { lArm: [168, 80, 0, 5], rArm: [168, 80, 0, 5], spine: [-6, 0, 0], head: [-25, 0, 0], root: { x: 0.04 } }),
      k(6, { lArm: [168, 80, 0, 5], rArm: [168, 80, 0, 5], spine: [-6, 0, 0], head: [-25, 0, 0], root: { x: 0.04 }, spin: -180 }),
      k(6.8, { lArm: [100, 90, 0, 60], rArm: [100, 90, 0, 60], squat: 24, root: { x: 0.04 }, spin: -180 }),
      k(7.6, { ...closed.lead, spin: -180 }),
      k(8, { ...closed.lead, spin: -180 })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...SHO, squat: 30, root: { x: -0.02 } }),
      k(2, { ...SHO, air: 1, lLeg: [30, -90, 0, 40], rLeg: [30, -90, 0, 40], root: { x: -0.12, lift: 0.45 } }),
      k(3, { air: 1, pelvis: [72, 0, 0], spine: [-28, 0, 0], chest: [-14, 0, 0], head: [-35, 0, 0], lArm: [115, 15, 0, 5], rArm: [115, 15, 0, 5], lLeg: [8, -90, 0, 0], rLeg: [45, -90, 0, 85], lFoot: 50, rFoot: 50, root: { x: -0.36, lift: 1.08 } }),
      k(6, { air: 1, pelvis: [72, 0, 0], spine: [-30, 0, 0], chest: [-14, 0, 0], head: [-35, 0, 0], lArm: [120, 15, 0, 5], rArm: [120, 15, 0, 5], lLeg: [8, -90, 0, 0], rLeg: [45, -90, 0, 85], lFoot: 50, rFoot: 50, root: { x: -0.36, lift: 1.08 }, spin: -180 }),
      k(6.8, { ...SHO, air: 1, pelvis: [10, 0, 0], lLeg: [20, -90, 0, 30], rLeg: [20, -90, 0, 30], root: { x: -0.12, lift: 0.35 }, spin: -180 }),
      k(7.6, { ...closed.follow, squat: 12, spin: -180 }),
      k(8, { ...closed.follow, spin: -180 })
    ]
  }
];

// =====================================================================
// COUNTRY SWING — partner swing with a basic step pattern, turns, lifts and tricks
// =====================================================================
const csBasicSolo = {
  id: 'cs-basic',
  name: 'Country Swing Basic',
  level: 1,
  basic: true,
  desc: 'The foundation: slow, slow, quick-quick — two walking steps and a rock step, turning as a couple.',
  cues: ['Slow — walk L', '(hold)', 'Slow — walk R', '(hold)', 'Quick — rock back L', 'Quick — replace R', 'Slow — walk L', '(turning together)'],
  keys: [
    k(0, { squat: 8 }),
    k(1, { lLeg: L.fwd, rLeg: [10, -90, 0, 8], squat: 12, root: { z: 0.1 }, spin: -45 }),
    k(2, { squat: 8, root: { z: 0.12 }, spin: -90 }),
    k(3, { rLeg: L.fwd, lLeg: [10, -90, 0, 8], squat: 12, root: { z: 0.18 }, spin: -135 }),
    k(4, { squat: 8, root: { z: 0.18 }, spin: -180 }),
    k(5, { lLeg: L.back, spine: [-6, 0, 0], squat: 12, root: { z: 0.08 }, spin: -225 }),
    k(6, { squat: 10, root: { z: 0.1 }, spin: -270 }),
    k(7, { lLeg: L.fwd, rLeg: [10, -90, 0, 8], squat: 12, root: { z: 0.06 }, spin: -315 }),
    k(8, { squat: 8, root: { z: 0 }, spin: -360 })
  ]
};

const country = [
  duet(csBasicSolo, { hold: 'closed' }),
  {
    id: 'cs-inside-turn',
    name: 'Inside Turn',
    level: 1,
    partner: true,
    desc: 'Lead raises the joined hands and the follow spins under on the quicks, then back into the basic.',
    cues: ['Slow — lead lifts the hand', 'Follow steps through', 'Slow — follow turns', '…around', 'Quick — rock', 'Quick — replace', 'Slow — back in frame', '…'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: A.turnHand, rArm: A.down, squat: 10, lLeg: L.fwd }),
      k(3, { lArm: A.turnHand, rArm: A.down, squat: 10, rLeg: L.fwd }),
      k(5, { lArm: [80, 50, 0, 20], rArm: A.down, lLeg: L.back, squat: 12, root: { x: -0.06 } }),
      k(6, { lArm: [70, 50, 0, 30], squat: 10 }),
      k(7, { ...closed.lead }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { rArm: A.turnHand, lArm: A.lowV, squat: 8, root: { x: 0.04 } }),
      k(2, { rArm: A.turnHand, lArm: A.lowV, lFoot: 25, rFoot: 25, root: { x: 0.06, rot: -150, lift: 0.02 } }),
      k(3.5, { rArm: A.turnHand, lArm: A.side, lFoot: 25, rFoot: 25, root: { x: 0.08, rot: -330, lift: 0.02 } }),
      k(4, { rArm: [100, 50, 0, 30], lArm: A.lowV, root: { x: 0.08, rot: -360 } }),
      k(5, { rArm: [80, 50, 0, 20], lArm: A.lowV, rLeg: L.back, squat: 12, root: { x: 0.12, rot: -360 } }),
      k(6, { rArm: [70, 50, 0, 30], squat: 10, root: { x: 0.04, rot: -360 } }),
      k(7, { ...closed.follow, root: { rot: -360 } }),
      k(8, { ...closed.follow, root: { rot: -360 } })
    ]
  },
  spinOut('cs-spin-out', 'Spin Out & Back', 2, 'Lead sends the follow spinning out to arm’s length, a rock step apart, then reels her back in with another spin.', [
    'Lead opens the frame',
    'Follow spins out',
    'Land at arm’s length',
    'Smile at each other',
    'Quick — rock back',
    'Lead reels her in…',
    '…spinning back',
    'Into frame'
  ]),
  { ...wedding.find((m) => m.id === 'cuddle-wrap'), id: 'cs-cuddle', name: 'Cuddle & Unwrap', level: 2, desc: 'Lead wraps the follow into the cuddle — both face the guests and rock — then rolls her back out.' },
  {
    id: 'cs-lap-sit',
    name: 'Lap Sit',
    level: 3,
    partner: true,
    lift: true,
    desc: 'Lead drops into a lunge and the follow sits on his knee, leaning back with an arm out for a picture pose.',
    cues: ['Basic — slow', 'Lead steps in, bends the right knee', 'Follow turns and sits', 'Lean back — arm out!', 'Hold the pose', 'Hold…', 'Lead lifts her up', 'Back to the basic'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...closed.lead, squat: 12 }),
      k(2.5, { rLeg: [72, 70, 0, 100], lLeg: [30, -90, 0, 95], spine: [10, 20, 0], head: [10, 25, 0], rArm: [55, 30, 0, 55], lArm: [80, 40, 0, 15], root: { x: -0.04 } }),
      k(6, { rLeg: [72, 70, 0, 100], lLeg: [30, -90, 0, 95], spine: [10, 20, 0], head: [10, 25, 0], rArm: [55, 30, 0, 55], lArm: [85, 40, 0, 10], root: { x: -0.04 } }),
      k(7, { ...closed.lead, squat: 16 }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...closed.follow, squat: 12, root: { rot: 40 } }),
      k(2.5, { air: 1, lLeg: [85, 90, 0, 80], rLeg: [80, 90, 0, 90], spine: [-14, 0, 0], head: [-10, -20, 0], rArm: [105, 35, 0, 60], lArm: [125, 10, 0, 5], root: { x: -0.22, z: 0.16, rot: 90, lift: -0.36 } }),
      k(6, { air: 1, lLeg: [88, 90, 0, 75], rLeg: [80, 90, 0, 90], spine: [-18, 0, 0], head: [-14, -25, 0], rArm: [105, 35, 0, 60], lArm: [135, 10, 0, 5], root: { x: -0.22, z: 0.16, rot: 90, lift: -0.36 } }),
      k(7, { ...closed.follow, squat: 16, root: { x: -0.04, rot: 30 } }),
      k(8, { ...closed.follow })
    ]
  },
  {
    id: 'cs-hip-lift',
    name: 'Hip Lift Spin',
    level: 3,
    partner: true,
    lift: true,
    desc: 'The follow hops onto the lead’s right hip, legs tucked, and he spins the two of you around.',
    cues: ['Basic — slow', 'Both plié', 'Follow hops up — lead catches', 'Spin!', 'Spin…', 'Spin…', 'Follow slides down', 'Back to the basic'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...W, squat: 22 }),
      k(2, { rArm: [62, 15, -40, 75], lArm: [55, 140, 0, 55], squat: 12, spine: [0, -20, 0], head: [0, -35, 0] }),
      k(6, { rArm: [55, 75, -40, 80], lArm: [50, 90, 0, 70], squat: 12, spine: [0, 25, 0], head: [0, 30, 0], spin: -360 }),
      k(6.8, { ...W, squat: 20, spin: -360 }),
      k(7.5, { ...closed.lead, spin: -360 }),
      k(8, { ...closed.lead, spin: -360 })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...SHO, squat: 22 }),
      k(2, { air: 1, lLeg: [80, 90, 0, 95], rLeg: [70, 90, 0, 100], spine: [-6, 0, 0], lArm: [95, 70, 0, 80], rArm: [115, 10, 0, 5], head: [-10, 15, 0], root: { x: -0.36, z: 0.24, rot: 180, lift: 0.42 } }),
      k(6, { air: 1, lLeg: [80, 90, 0, 95], rLeg: [70, 90, 0, 100], spine: [-6, 0, 0], lArm: [95, 70, 0, 80], rArm: [125, 10, 0, 5], head: [-10, 15, 0], root: { x: -0.36, z: 0.24, rot: 180, lift: 0.42 }, spin: -360 }),
      k(6.8, { ...SHO, air: 0.4, squat: 20, root: { x: -0.06, z: 0.06, rot: 330, lift: 0.04 }, spin: -360 }),
      k(7.5, { ...closed.follow, root: { rot: 360 }, spin: -360 }),
      k(8, { ...closed.follow, root: { rot: 360 }, spin: -360 })
    ]
  },
  {
    id: 'cs-slide-through',
    name: 'Slide-Through',
    level: 4,
    partner: true,
    desc: 'Lead opens his stance and the follow slides feet-first between his legs, pops up behind him and walks back around to the front.',
    cues: ['Lead: wide stance, hold both hands', 'Follow sits back', 'SLIDE through!', '…and out behind', 'Follow pops up', 'Walk around his right side', 'Back in front', 'Into frame'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { lArm: A.twoHand, rArm: A.twoHand, lLeg: [26, 0, 0, 10], rLeg: [26, 0, 0, 10], squat: 18, root: { x: -0.04 } }),
      k(2, { lArm: [40, 95, 0, 10], rArm: [40, 95, 0, 10], lLeg: [26, 0, 0, 10], rLeg: [26, 0, 0, 10], squat: 24, spine: [20, 0, 0] }),
      k(3, { lArm: [20, 30, 0, 20], rArm: [20, 30, 0, 20], lLeg: [26, 0, 0, 10], rLeg: [26, 0, 0, 10], squat: 24, spine: [14, 0, 0], head: [20, 0, 0] }),
      k(4, { lArm: [30, -40, 0, 20], rArm: [30, -40, 0, 20], lLeg: [26, 0, 0, 10], rLeg: [26, 0, 0, 10], squat: 18, spine: [6, 0, 0], head: [0, 40, 0] }),
      k(5, { lArm: A.down, rArm: [40, -60, 0, 20], squat: 8, spine: [0, 30, 0], head: [0, 60, 0] }),
      k(6, { lArm: A.down, rArm: [45, 0, 0, 20], squat: 8, spine: [0, 25, 0], head: [0, 50, 0] }),
      k(7, { lArm: A.oneHand, rArm: A.down, squat: 8 }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { lArm: A.twoHandF, rArm: A.twoHandF, squat: 22, root: { x: 0.04 } }),
      k(2, { air: 0.8, pelvis: [-45, 0, 0], lLeg: [70, 90, 0, 20], rLeg: [70, 90, 0, 20], lArm: [60, 90, 0, 10], rArm: [60, 90, 0, 10], head: [20, 0, 0], root: { x: -0.08, lift: -0.45 } }),
      k(3, { air: 1, pelvis: [-75, 0, 0], spine: [10, 0, 0], head: [25, 0, 0], lLeg: [10, 90, 0, 0], rLeg: [10, 90, 0, 0], lFoot: 50, rFoot: 50, lArm: [150, 90, 0, 10], rArm: [150, 90, 0, 10], root: { x: -0.5, lift: -0.74 } }),
      k(4, { air: 1, pelvis: [-60, 0, 0], spine: [20, 0, 0], head: [25, 0, 0], lLeg: [20, 90, 0, 40], rLeg: [20, 90, 0, 40], lArm: [100, 60, 0, 10], rArm: [100, 60, 0, 10], root: { x: -0.86, lift: -0.62 } }),
      k(5, { air: 0.3, squat: 30, lArm: A.lowV, rArm: [60, 30, 0, 20], root: { x: -0.88, z: 0.1, rot: 0, lift: -0.1 } }),
      k(6, { lArm: A.lowV, rArm: [50, 60, 0, 20], lLeg: L.fwd, root: { x: -0.5, z: 0.5, rot: 60 } }),
      k(7, { rArm: A.oneHandF, lArm: A.lowV, rLeg: L.fwd, root: { x: -0.08, z: 0.22, rot: 20 } }),
      k(8, { ...closed.follow })
    ]
  },
  // ----- the pretzel (from a country swing tutorial): two linked 8-counts -----
  // Couple space: facing the audience means root.rot -90 for the lead and +90 for the follow.
  {
    id: 'cs-pretzel',
    name: 'Pretzel — Wrap',
    level: 3,
    partner: true,
    then: 'cs-pretzel-out',
    desc: 'From a two-hand hold the lead turns under his own arm and tucks his right hand behind his back, ending side by side with the follow on his left, both facing out.',
    cues: ['Two hands — rock back', 'Replace', 'Lead lifts his left hand', 'Lead turns under…', '…right hand goes behind his back', 'Side by side — step', 'Step', 'Quick-quick'],
    lead: [
      k(0, { lArm: A.twoHand, rArm: A.twoHand, squat: 8, root: { x: -0.1 } }),
      k(1, { lArm: A.twoHand, rArm: A.twoHand, lLeg: L.back, squat: 12, spine: [-6, 0, 0], root: { x: -0.16 } }),
      k(2, { lArm: A.twoHand, rArm: A.twoHand, squat: 8, root: { x: -0.1 } }),
      k(3, { lArm: A.turnHand, rArm: [35, -30, -60, 100], lLeg: L.fwd, squat: 6, root: { x: -0.02, rot: -150 } }),
      k(4, { lArm: A.turnHand, rArm: [35, -70, -90, 110], squat: 6, root: { x: 0.04, rot: -330 } }),
      k(5, { lArm: [30, 60, 0, 60], rArm: [35, -70, -90, 110], squat: 10, head: [0, 20, 0], root: { x: 0.08, rot: -450 } }),
      k(6, { lArm: [30, 60, 0, 60], rArm: [35, -70, -90, 110], rLeg: L.side, squat: 12, head: [0, 25, 0], root: { x: 0.06, rot: -450 } }),
      k(7, { lArm: [30, 60, 0, 60], rArm: [35, -70, -90, 110], lLeg: L.back, squat: 12, head: [0, 25, 0], root: { x: 0.08, rot: -450 } }),
      k(8, { lArm: [30, 60, 0, 60], rArm: [35, -70, -90, 110], squat: 10, head: [0, 20, 0], root: { x: 0.08, rot: -450 } })
    ],
    follow: [
      k(0, { lArm: A.twoHandF, rArm: A.twoHandF, squat: 8, root: { x: 0.1 } }),
      k(1, { lArm: A.twoHandF, rArm: A.twoHandF, rLeg: L.back, squat: 12, spine: [-6, 0, 0], root: { x: 0.16 } }),
      k(2, { lArm: A.twoHandF, rArm: A.twoHandF, squat: 8, root: { x: 0.1 } }),
      k(3, { rArm: [110, 40, 0, 40], lArm: A.lowV, squat: 6, root: { x: 0.04, rot: 20 } }),
      k(4, { rArm: [70, 30, 0, 40], lArm: A.hip, squat: 6, root: { x: -0.02, rot: 60 } }),
      k(5, { rArm: [25, 25, 0, 35], lArm: A.hip, squat: 10, head: [0, -20, 0], root: { x: -0.08, rot: 90 } }),
      k(6, { rArm: [25, 25, 0, 35], lArm: A.hip, lLeg: L.side, squat: 12, head: [0, -25, 0], root: { x: -0.06, rot: 90 } }),
      k(7, { rArm: [25, 25, 0, 35], lArm: A.hip, rLeg: L.back, squat: 12, head: [0, -25, 0], root: { x: -0.08, rot: 90 } }),
      k(8, { rArm: [25, 25, 0, 35], lArm: A.hip, squat: 10, head: [0, -20, 0], root: { x: -0.08, rot: 90 } })
    ]
  },
  {
    id: 'cs-pretzel-out',
    name: 'Pretzel — Unwind & Spin Out',
    level: 3,
    partner: true,
    chained: true, // only ever follows the wrap
    desc: 'The follow turns under so both face away in the pretzel knot, they turn back to the front with the lead’s arm over his head, then he spins her out to an open hold.',
    cues: ['Lead lifts the joined hands', 'Follow turns under…', 'Pretzel! Both face away', 'Hold the wrap', 'Turn back to the front', 'Arm over his head — unwind', 'Spin her out!', 'Open hold'],
    lead: [
      k(0, { lArm: [30, 60, 0, 60], rArm: [35, -70, -90, 110], squat: 10, root: { x: 0.08, rot: -450 } }),
      k(1, { lArm: A.turnHand, rArm: [35, -70, -90, 110], squat: 8, root: { x: 0.06, rot: -470 } }),
      k(2, { lArm: [100, 70, 0, 70], rArm: [35, -70, -90, 110], squat: 8, root: { x: 0.05, rot: -630 } }),
      k(3.5, { lArm: [95, 75, 0, 75], rArm: [35, -70, -90, 110], squat: 10, head: [0, -20, 0], root: { x: 0.05, rot: -630 } }),
      k(5, { lArm: [165, 20, 0, 95], rArm: [35, -70, -90, 110], squat: 8, root: { x: 0.04, rot: -810 } }),
      k(6, { lArm: A.turnHand, rArm: A.down, squat: 8, root: { x: 0, rot: -790 } }),
      k(7, { lArm: A.oneHand, rArm: A.down, squat: 10, root: { x: -0.12, rot: -720 } }),
      k(8, { lArm: A.oneHand, rArm: A.down, squat: 8, root: { x: -0.14, rot: -720 } })
    ],
    follow: [
      k(0, { rArm: [25, 25, 0, 35], lArm: A.hip, squat: 10, root: { x: -0.08, rot: 90 } }),
      k(1, { rArm: A.turnHand, lArm: A.hip, lFoot: 20, rFoot: 20, root: { x: -0.06, rot: 150, lift: 0.02 } }),
      k(2, { rArm: [60, 40, 0, 60], lArm: [40, -60, -90, 110], squat: 6, root: { x: -0.05, rot: 270 } }),
      k(3.5, { rArm: [60, 40, 0, 60], lArm: [40, -60, -90, 110], squat: 10, head: [0, 20, 0], root: { x: -0.05, rot: 270 } }),
      k(5, { rArm: [120, 30, 0, 60], lArm: A.hip, squat: 8, root: { x: -0.04, rot: 450 } }),
      k(6, { rArm: A.turnHand, lArm: A.side, lFoot: 25, rFoot: 25, root: { x: 0.18, rot: 650, lift: 0.02 } }),
      k(7, { rArm: A.oneHandF, lArm: [120, 10, 0, 10], root: { x: 0.32, rot: 720 } }),
      k(8, { rArm: A.oneHandF, lArm: A.lowV, squat: 8, root: { x: 0.3, rot: 720 } })
    ]
  },
  waistLift('cs-cradle', 'Cradle Carry Spin', 4, 'Lead scoops the follow up into his arms — the bridal carry — and spins. Swing her legs out wide for the guests.', {
    air: 1,
    pelvis: [-80, 90, 0],
    spine: [18, 0, 0],
    head: [18, 0, 0],
    lLeg: [45, 90, 0, 90],
    rLeg: [55, 90, 0, 80],
    lArm: [140, 60, 0, 70],
    rArm: [130, 20, 0, 10]
  }, ['Basic — slow', 'Lead bends, arm behind her back', 'SCOOP — follow swings her legs up', 'Spin!', 'Spin…', 'Spin…', 'Lower her feet', 'Back to the basic']),
  {
    id: 'cs-flip',
    name: 'Aerial Flip',
    level: 5,
    partner: true,
    lift: true,
    desc: 'The showstopper trick: the follow jumps and the lead throws her into a sideways flip over his arms, landing back in front of him. Learn it with a coach and a crash mat first!',
    cues: ['Basic — slow', 'Both deep plié, hands on hips', 'JUMP — lead pushes up', 'Over she goes…', '…upside down…', 'Land!', 'Recover together', 'Back to the basic'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...W, squat: 30, root: { x: 0.04 } }),
      k(2, { lArm: [120, 80, 0, 25], rArm: [120, 80, 0, 25], squat: 4, root: { x: 0.04 } }),
      k(3, { lArm: [145, 70, 0, 10], rArm: [145, 70, 0, 10], spine: [-6, 0, 0], root: { x: 0.04 } }),
      k(4, { lArm: [120, 80, 0, 25], rArm: [120, 80, 0, 25], squat: 10, root: { x: 0.04 } }),
      k(5, { ...W, squat: 26, root: { x: 0.04 } }),
      k(6.5, { ...closed.lead, squat: 10 }),
      k(8, { ...closed.lead })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...SHO, squat: 30, root: { x: -0.02 } }),
      k(2, { air: 0.8, lArm: [160, 10, 0, 10], rArm: [160, 10, 0, 10], lFoot: 50, rFoot: 50, root: { x: -0.06, lift: 0.35 } }),
      k(3, { air: 1, pelvis: [0, 0, -120], lArm: [170, 10, 0, 10], rArm: [170, 10, 0, 10], lLeg: [8, 0, 0, 0], rLeg: [8, 0, 0, 0], lFoot: 50, rFoot: 50, root: { x: -0.08, lift: 0.75 } }),
      k(4, { air: 1, pelvis: [0, 0, -240], lArm: [170, 10, 0, 10], rArm: [170, 10, 0, 10], lLeg: [30, 0, 0, 30], rLeg: [30, 0, 0, 30], root: { x: -0.06, lift: 0.6 } }),
      k(5, { air: 0.5, pelvis: [0, 0, -360], squat: 30, lArm: A.side, rArm: A.side, root: { x: -0.02, lift: 0.05 } }),
      // -360° is the same as 0°: switch over invisibly so the next move starts upright
      k(5.01, { air: 0.5, pelvis: [0, 0, 0], squat: 30, lArm: A.side, rArm: A.side, root: { x: -0.02, lift: 0.05 } }),
      k(6.5, { ...closed.follow, squat: 10, lArm: [140, 10, 0, 10] }),
      k(8, { ...closed.follow })
    ]
  },
  {
    id: 'cs-death-drop',
    name: 'Death Drop',
    level: 3,
    partner: true,
    finale: true,
    desc: 'The country swing finale: the follow drops back, almost to the floor, with one leg kicked up, while the lead lunges and holds her.',
    cues: ['Basic — slow', 'Lead: arm low behind her back', 'Follow: lean back…', 'DROP!', 'Leg up, arm out', 'Hold…', 'Hold…', 'Hold the moment ♥'],
    lead: [
      k(0, { ...closed.lead }),
      k(2, { ...closed.lead, squat: 10 }),
      k(3, { lArm: [80, 40, 0, 20], rArm: [45, 80, -90, 60], squat: 14 }),
      k(4, { lArm: [100, 25, 0, 10], rArm: [38, 85, -90, 40], rLeg: L.lunge, lLeg: L.lungeBack, spine: [28, 0, 0], head: [20, 0, 0], root: { x: 0.08 } }),
      k(8, { lArm: [105, 25, 0, 5], rArm: [38, 85, -90, 40], rLeg: L.lunge, lLeg: L.lungeBack, spine: [30, 0, 0], head: [22, 0, 0], root: { x: 0.08 } })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(2, { ...closed.follow, squat: 10 }),
      k(3, { ...closed.follow, squat: 18, spine: [-15, 0, 0] }),
      k(4, { air: 0.7, pelvis: [-55, 0, 0], spine: [-20, 0, 0], chest: [-10, 0, 0], head: [-25, 0, 0], lLeg: [80, 90, 0, 10], rLeg: [30, 90, 0, 60], lFoot: 50, lArm: [150, 20, 0, 10], rArm: [80, 70, 0, 40], root: { x: 0.04, lift: -0.42 } }),
      k(8, { air: 0.7, pelvis: [-60, 0, 0], spine: [-22, 0, 0], chest: [-12, 0, 0], head: [-28, 0, 0], lLeg: [85, 90, 0, 5], rLeg: [30, 90, 0, 60], lFoot: 55, lArm: [160, 20, 0, 5], rArm: [80, 70, 0, 40], root: { x: 0.04, lift: -0.45 } })
    ]
  }
];

// =====================================================================
// JAZZ, LYRICAL, HIP-HOP — partnered versions
// =====================================================================
const jazz = [
  duet(solo(jazzSolo, 'jazz-square'), { hold: 'one', level: 1, basic: true }),
  duet(solo(jazzSolo, 'jazz-walk'), { hold: 'one', level: 1, basic: true }),
  duet(solo(jazzSolo, 'kick-ball-change'), { hold: 'one', level: 2, legFix: diagonal }),
  spinOut('jazz-spin-out', 'Jazz Spin-Out & Hit', 2, 'Spin out to arm’s length, hit a jazz-hands pose together, and spin back in.', ['Lead opens', 'Follow spins out', 'Land', 'HIT — jazz hands!', 'Hold the pose', 'Reel in…', '…spin', 'Into frame'], {
    lead: { rArm: A.jazz, chest: [-8, 0, 6] },
    follow: { lArm: A.highV, chest: [-8, 0, -6] }
  }),
  duet(solo(jazzSolo, 'fan-kick'), { hold: 'free', sep: 0.3, level: 3 }),
  duet(solo(jazzSolo, 'pas-de-bourree-turn'), { hold: 'free', level: 3 }),
  {
    id: 'assisted-pirouette',
    name: 'Assisted Pirouette',
    level: 3,
    partner: true,
    desc: 'Lead’s hands frame the follow’s waist while she spins a triple pirouette, then she finishes in arabesque.',
    cues: ['Lead: hands on her waist', 'Follow: plié in fourth', 'Relevé — turn!', 'Turn…', 'Turn…', 'Land in fourth', 'Arabesque', 'Back into frame'],
    lead: [k(0, { ...closed.lead }), k(1, { ...W, squat: 10 }), k(5, { ...W, squat: 8 }), k(6, { ...W, squat: 12 }), k(7, { ...closed.lead }), k(8, { ...closed.lead })],
    follow: [
      k(0, { ...closed.follow }),
      k(1.5, { rLeg: [16, -90, 0, 6], lLeg: [14, 90, 0, 30], squat: 25, lArm: A.second, rArm: A.first }),
      k(2, { lLeg: [0, 0, 0, 0], rLeg: L.passe, lFoot: 40, rFoot: 40, lArm: A.first, rArm: A.first, root: { rot: -120, lift: 0.04 } }),
      k(4.6, { lLeg: [0, 0, 0, 0], rLeg: L.passe, lFoot: 40, rFoot: 40, lArm: A.first, rArm: A.first, root: { rot: -1080, lift: 0.04 } }),
      k(5, { rLeg: [16, -90, 0, 6], lLeg: [16, 90, 0, 20], squat: 15, lArm: A.second, rArm: A.second, root: { rot: -1080 } }),
      k(6, { lLeg: L.arabesque, lFoot: 50, rLeg: [0, 0, 0, 0], spine: [18, 0, 0], head: [-15, 0, 0], lArm: [100, 85, 0, 5], rArm: [80, -20, 0, 5], root: { rot: -1080 } }),
      k(7, { ...closed.follow, root: { rot: -1080 } }),
      k(8, { ...closed.follow, root: { rot: -1080 } })
    ]
  },
  waistLift('jazz-layout-lift', 'Layout Lift', 4, 'Lead lifts the follow by the waist; she lays back in a long arched line with jazz hands while he turns.', {
    lArm: [150, 15, 0, 5],
    rArm: [150, 15, 0, 5],
    lLeg: [12, -90, 0, 0],
    rLeg: [12, -90, 0, 0],
    lFoot: 60,
    rFoot: 60,
    pelvis: [-20, 0, 0],
    spine: [-22, 0, 0],
    chest: [-12, 0, 0],
    head: [-25, 0, 0]
  }),
  duet(solo(jazzSolo, 'chasse-leap'), { hold: 'one', level: 5, name: 'Partnered Grand Jeté', desc: 'Chassé together hand in hand and both soar into a split leap.' }),
  duet(solo(jazzSolo, 'jazz-finale'), { hold: 'one', level: 1 })
];

const lyrical = [
  duet(solo(lyricalSolo, 'reach-contract'), { hold: 'free', sep: 0.08, level: 1, basic: true }),
  duet(solo(lyricalSolo, 'port-de-bras-sway'), { hold: 'one', level: 1, basic: true }),
  duet(solo(lyricalSolo, 'arabesque-lunge'), { hold: 'one', level: 2 }),
  duet(solo(lyricalSolo, 'developpe'), { hold: 'one', sep: 0.2, level: 2, legFix: diagonal }),
  { ...wedding.find((m) => m.id === 'open-reveal'), id: 'lyr-reveal', name: 'Unfold & Return', level: 2 },
  duet(solo(lyricalSolo, 'lyrical-pirouette'), { hold: 'free', level: 3 }),
  duet(solo(lyricalSolo, 'chaine-turns'), { hold: 'free', sep: 0.16, level: 3 }),
  waistLift('lyr-float-lift', 'Floating Lift', 4, 'Lead lifts the follow and turns slowly; she floats in attitude with her arms in fifth.', {
    lArm: A.fifth,
    rArm: A.fifth,
    lLeg: [60, -80, 0, 70],
    rLeg: [10, -90, 0, 10],
    lFoot: 50,
    rFoot: 50,
    spine: [-12, 0, 0],
    head: [-20, 0, 0]
  }),
  duet(solo(lyricalSolo, 'lyrical-finale'), { hold: 'free', sep: 0.16, level: 1 })
];

const hiphop = [
  duet(solo(hiphopSolo, 'two-step'), { hold: 'free', sep: 0.1, level: 1, basic: true }),
  duet(solo(hiphopSolo, 'shoulder-bounce'), { hold: 'one', level: 1, basic: true }),
  duet(solo(hiphopSolo, 'cabbage-patch'), { hold: 'free', sep: 0.1, level: 1 }),
  duet(solo(hiphopSolo, 'body-roll'), { hold: 'two', level: 2 }),
  duet(solo(hiphopSolo, 'arm-wave-hit'), { hold: 'free', sep: 0.12, level: 2 }),
  duet(solo(hiphopSolo, 'running-man'), { hold: 'free', sep: 0.14, level: 3 }),
  spinOut('hh-spin-freeze', 'Spin Out & Freeze', 3, 'Spin out, both hit a freeze on the beat, then spin back in.', ['Lead opens', 'Follow spins out', 'Land', 'FREEZE!', 'Hold it…', 'Reel in…', '…spin', 'Into frame'], {
    lead: { rArm: A.point, squat: 24, head: [5, -30, 0] },
    follow: { lArm: A.fist, squat: 24, spine: [10, 20, 0] }
  }),
  {
    id: 'hh-jump-catch',
    name: 'Jump Catch Spin',
    level: 4,
    partner: true,
    lift: true,
    desc: 'The follow jumps up and wraps her legs around the lead’s waist; he catches and spins.',
    cues: ['Bounce, bounce', 'Follow: hands on his shoulders', 'JUMP — lead catches', 'Spin!', 'Spin…', 'Spin…', 'Follow slides down', 'Hit!'],
    lead: [
      k(0, { ...closed.lead }),
      k(1, { ...W, squat: 22 }),
      k(2, { lArm: [45, 90, 0, 95], rArm: [45, 90, 0, 95], squat: 14, spine: [-8, 0, 0] }),
      k(6, { lArm: [45, 90, 0, 95], rArm: [45, 90, 0, 95], squat: 14, spine: [-8, 0, 0], spin: -360 }),
      k(6.8, { ...W, squat: 22, spin: -360 }),
      k(7.5, { lArm: A.goal, rArm: A.goal, squat: 20, spin: -360 }),
      k(8, { ...closed.lead, spin: -360 })
    ],
    follow: [
      k(0, { ...closed.follow }),
      k(1, { ...SHO, squat: 22 }),
      k(2, { ...SHO, air: 1, lLeg: [75, 40, 0, 105], rLeg: [75, 40, 0, 105], spine: [-6, 0, 0], head: [-8, 0, 0], root: { x: -0.08, lift: 0.36 } }),
      k(6, { ...SHO, air: 1, lLeg: [75, 40, 0, 105], rLeg: [75, 40, 0, 105], spine: [-6, 0, 0], head: [-8, 0, 0], root: { x: -0.08, lift: 0.36 }, spin: -360 }),
      k(6.8, { ...SHO, air: 0.4, squat: 22, root: { x: -0.02, lift: 0.04 }, spin: -360 }),
      k(7.5, { lArm: A.hip, rArm: A.point, squat: 20, spin: -360 }),
      k(8, { ...closed.follow, spin: -360 })
    ]
  },
  duet(solo(hiphopSolo, 'freeze'), { hold: 'free', sep: 0.1, level: 1 })
];

// =====================================================================
// STYLES
// =====================================================================
const finaleIds = (moves) => moves.filter((m) => m.finale).map((m) => m.id);
const dip = wedding.find((m) => m.id === 'dip');
const spinKiss = wedding.find((m) => m.id === 'spin-kiss');

export const STYLES = {
  wedding: {
    id: 'wedding',
    name: 'Classic Romantic',
    short: 'Classic',
    icon: '💍',
    featured: true,
    feel: 'smooth',
    groove: 'sway',
    partner: true,
    defaultBpm: 76,
    blurb: 'Timeless first dance — sways, waltz box, turns, a reveal for your guests and a dramatic dip.',
    tips: [
      'Most couples dance 2–2½ minutes. Fade the song early — guests will join you!',
      'Rehearse in the shoes you’ll wear on the day (and with a sheet as a mock train).',
      'Lead: keep a firm frame — your partner feels direction through your back hand.',
      'For the dip, the lead bends their own knees; never pull the partner down by the arm.',
      'Eye contact and smiles matter more than perfect footwork.'
    ],
    moves: [...wedding, ...classicMore]
  },
  country: {
    id: 'country',
    name: 'Country Swing',
    short: 'Country',
    icon: '🤠',
    feel: 'swing',
    groove: 'pulse',
    partner: true,
    defaultBpm: 104,
    blurb: 'Partner country swing — the slow-slow-quick-quick basic, spins, cuddles, lifts and flips.',
    tips: [
      'The basic is “slow, slow, quick-quick” — walk, walk, rock-step — and the couple keeps turning.',
      'Stay connected: a little tension in the arms tells the follow where to go.',
      'Every lift starts with a plié together — power comes from the legs, not the arms.',
      'Learn lifts and flips on a soft floor with a spotter before trying them in wedding clothes.',
      'Between tricks, always come home to the basic.'
    ],
    moves: [...country, spinKiss, dip]
  },
  jazz: {
    id: 'jazz',
    name: 'Jazz Duet',
    short: 'Jazz',
    icon: '🎷',
    feel: 'snap',
    groove: 'jazz',
    partner: true,
    defaultBpm: 118,
    blurb: 'Showy and fun — hand-in-hand jazz squares, kicks, partnered pirouettes and a layout lift.',
    tips: ['Sell it with your faces — jazz is performance!', 'Keep the joined hands soft so you can move together.', 'Spot your partner during turns so you don’t get dizzy.'],
    moves: [...jazz, dip]
  },
  lyrical: {
    id: 'lyrical',
    name: 'Lyrical Duet',
    short: 'Lyrical',
    icon: '🕊️',
    feel: 'flow',
    groove: 'breath',
    partner: true,
    defaultBpm: 72,
    blurb: 'Fluid, emotional partnering that tells your love story — reaches, turns and floating lifts.',
    tips: ['Move through the music — let movements breathe.', 'Reach past your fingertips — and towards each other.', 'Let the lyrics inspire your expressions.'],
    moves: [...lyrical, spinKiss, dip]
  },
  hiphop: {
    id: 'hiphop',
    name: 'Hip-Hop Duet',
    short: 'Hip-Hop',
    icon: '🎧',
    feel: 'hit',
    groove: 'bounce',
    partner: true,
    defaultBpm: 96,
    blurb: 'A surprise for the guests — grooves face to face, hits, freezes and a jump-catch spin.',
    tips: ['Stay low with soft knees — the bounce lives in your legs.', 'Hit = fast then freeze. Contrast makes it pop.', 'Face each other and feed off your partner’s energy.'],
    moves: [...hiphop, dip]
  }
};
for (const s of Object.values(STYLES)) s.finales = finaleIds(s.moves);

export const STYLE_ORDER = ['wedding', 'country', 'jazz', 'lyrical', 'hiphop'];

export const MOVES = {};
for (const id of STYLE_ORDER) for (const m of STYLES[id].moves) if (!MOVES[m.id]) MOVES[m.id] = { ...m, style: id };

// ---------- choreography generator ----------
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const SECTIONS = ['Story', 'Show-off', 'Romance', 'Build'];

/** The most exciting finale of a style that fits the chosen difficulty. */
export function defaultFinale(styleId, difficulty = 2) {
  const fins = STYLES[styleId].finales.map((id) => MOVES[id]);
  const fit = fins.filter((m) => m.level <= difficulty).sort((a, b) => b.level - a.level);
  return (fit[0] || fins.sort((a, b) => a.level - b.level)[0]).id;
}

/**
 * Build a list of { move, section } for `count` eight-counts.
 * difficulty (1–5) caps the moves used and leans the routine towards that level: every phrase of four
 * eight-counts starts with a basic and ends on its most impressive move (lifts and tricks at higher levels).
 */
export function generateChoreo(styleId, count, { seed = Date.now(), finaleId, difficulty = 2 } = {}) {
  const style = STYLES[styleId];
  const rand = rng(seed);
  const regular = style.moves.filter((m) => !m.finale);
  let avail = regular.filter((m) => m.level <= difficulty && !m.chained);
  if (!avail.length) avail = regular.filter((m) => m.level === Math.min(...regular.map((x) => x.level)));
  const basics = avail.filter((m) => m.basic).length ? avail.filter((m) => m.basic) : avail;
  const finale = (style.finales.includes(finaleId) && MOVES[finaleId]) || MOVES[defaultFinale(styleId, difficulty)];
  const top = Math.max(...avail.map((m) => m.level));
  const recent = [];

  let noChain = false; // near the end there's no room for a two-part move's second half
  const pick = (pool, weight) => {
    if (noChain && pool.some((m) => !m.then)) pool = pool.filter((m) => !m.then);
    // long two-part moves are special: not again within the last eight 8-counts
    const spaced = pool.filter((m) => !m.then || !out.slice(-8).some((c) => c.move === m.id));
    if (spaced.length) pool = spaced;
    const fresh = pool.filter((m) => !recent.includes(m.id));
    const list = fresh.length ? fresh : pool;
    const total = list.reduce((a, m) => a + weight(m), 0);
    let r = rand() * total;
    for (const m of list) if ((r -= weight(m)) <= 0) return m;
    return list[list.length - 1];
  };
  const near = (m) => (m.level === difficulty ? 4 : m.level === difficulty - 1 ? 2.5 : 1);

  const out = [];
  for (let i = 0; i < count; i++) {
    const pos = i % 4;
    const section = i < 4 ? 'Opening' : SECTIONS[Math.floor(i / 4 - 1) % SECTIONS.length];
    let m;
    noChain = i >= count - 2;
    const prev = out.length ? MOVES[out[out.length - 1].move] : null;
    if (prev && prev.then && MOVES[prev.then]) m = MOVES[prev.then]; // two-part moves stay together
    else if (i < 2 || pos === 0) m = pick(basics, () => 1);
    else if (pos === 3) m = pick(avail.filter((x) => x.level >= Math.max(1, top - 1)), (x) => (x.level === top ? 3 : 1));
    else {
      // between the peaks keep to partnering the couple can recover with — no back-to-back lifts
      const calm = avail.filter((x) => !x.lift && x.level <= Math.max(3, difficulty - 1));
      m = pick(calm.length ? calm : avail, near);
    }
    recent.push(m.id);
    if (recent.length > 3) recent.shift();
    out.push({ move: m.id, section });
  }
  if (finale && count > 1) out[count - 1] = { move: finale.id, section: 'Finale' };
  return out;
}
