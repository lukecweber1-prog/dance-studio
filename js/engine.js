// Turns a project (song timing + dancers + list of 8-counts) into per-dancer poses at any beat.
import { P, clonePose, lerpPose, mirrorPose } from './rig.js';
import { MOVES, STYLES } from './moves.js';

const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const EASE = {
  smooth,
  flow: smoother,
  snap: (t) => 1 - Math.pow(1 - t, 3),
  hit: (t) => (t < 0.4 ? 1 - Math.pow(1 - t / 0.4, 3) : 1),
  swing: (t) => smooth(Math.pow(t, 0.85))
};

const _a = P();
const _b = P();

function sampleKeys(keys, beat, ease, out) {
  const n = keys.length;
  if (beat <= keys[0][0]) return copyInto(out, keys[0][1]);
  if (beat >= keys[n - 1][0]) return copyInto(out, keys[n - 1][1]);
  let i = 0;
  while (i < n - 2 && beat >= keys[i + 1][0]) i++;
  const [b0, p0] = keys[i];
  const [b1, p1] = keys[i + 1];
  const t = (beat - b0) / (b1 - b0 || 1);
  return lerpPose(p0, p1, ease(Math.min(1, Math.max(0, t))), out);
}

function copyInto(out, p) {
  return lerpPose(p, p, 0, out);
}

/** Small continuous "feel" layered on top of the choreography so dancers groove with the beat. */
function applyGroove(p, groove, beat, energy) {
  const f = beat - Math.floor(beat);
  const onBeat = 0.5 + 0.5 * Math.cos(2 * Math.PI * f); // 1 on the beat, 0 on the "and"
  const e = energy;
  switch (groove) {
    case 'bounce':
      p.squat += 14 * e * onBeat;
      p.chest[0] += 4 * e * onBeat;
      p.head[0] += 5 * e * onBeat;
      break;
    case 'pulse':
      p.squat += 9 * e * onBeat;
      p.head[2] += 3 * e * Math.sin(Math.PI * beat);
      break;
    case 'jazz':
      p.chest[2] += 3 * e * Math.sin(Math.PI * beat);
      p.squat += 4 * e * onBeat;
      break;
    case 'breath':
      p.chest[0] -= 3 * e * Math.sin((2 * Math.PI * beat) / 4);
      p.head[0] -= 2 * e * Math.sin((2 * Math.PI * beat) / 4);
      break;
    case 'sway':
      p.head[2] += 2 * e * Math.sin((Math.PI * beat) / 2);
      p.squat += 3 * e * onBeat;
      break;
  }
  return p;
}

// ---------- formations ----------
export const FORMATIONS = {
  line: 'Line',
  v: 'V-Shape',
  stagger: 'Staggered rows',
  circle: 'Circle',
  diagonal: 'Diagonal'
};

/** Returns [{x, z, rot}] slots (rot in degrees, 0 = facing the audience). */
export function formationSlots(kind, n, spacing) {
  const slots = [];
  for (let i = 0; i < n; i++) {
    const c = i - (n - 1) / 2;
    let x = c * spacing;
    let z = 0;
    let rot = 0;
    if (kind === 'v') z = -Math.abs(c) * spacing * 0.6 + ((n - 1) / 2) * spacing * 0.3;
    else if (kind === 'stagger') {
      x = c * spacing * 0.75;
      z = i % 2 ? -spacing * 0.55 : spacing * 0.35;
    } else if (kind === 'diagonal') {
      x = c * spacing * 0.8;
      z = -c * spacing * 0.55;
    } else if (kind === 'circle' && n > 2) {
      const r = Math.max(spacing * 0.9, (n * spacing) / (2 * Math.PI));
      const a = (i / n) * Math.PI * 2;
      x = Math.sin(a) * r;
      z = Math.cos(a) * r;
      rot = (Math.atan2(-x, -z) * 180) / Math.PI;
    }
    slots.push({ x, z, rot });
  }
  return slots;
}

const D2R = Math.PI / 180;
const angDiff = (a, b) => {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

function rotXZ(x, z, deg) {
  const r = deg * D2R;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [x * c + z * s, -x * s + z * c];
}

export const COUPLE_HALF_GAP = 0.22;

/**
 * Compute transforms + poses for all dancers when every dancer performs `moveId`
 * at `beat` (0..8 within that move). Returns [{pose, x, z, rot}].
 */
function layoutFor(project, moveId, beats, styleFeel, groove, energy) {
  const move = MOVES[moveId];
  const dancers = project.dancers;
  const ease = EASE[styleFeel] || smooth;
  const results = new Array(dancers.length);

  if (move && move.partner) {
    const leads = [];
    const follows = [];
    dancers.forEach((d, i) => (d.role === 'follow' ? follows : leads).push(i));
    const units = [];
    const nPairs = Math.min(leads.length, follows.length);
    for (let i = 0; i < nPairs; i++) units.push({ lead: leads[i], follow: follows[i] });
    for (let i = nPairs; i < leads.length; i++) units.push({ lead: leads[i] });
    for (let i = nPairs; i < follows.length; i++) units.push({ follow: follows[i] });
    const kind = project.formation === 'circle' ? 'line' : project.formation;
    const slots = formationSlots(kind, units.length, 2.1);
    units.forEach((u, ui) => {
      const slot = slots[ui];
      for (const role of ['lead', 'follow']) {
        const di = u[role];
        if (di === undefined) continue;
        const pose = sampleKeys(move[role], beats[di], ease, P());
        applyGroove(pose, groove, beats[di], energy);
        const solo = u.lead === undefined || u.follow === undefined;
        const baseX = solo ? 0 : role === 'lead' ? -COUPLE_HALF_GAP : COUPLE_HALF_GAP;
        const baseRot = solo ? 0 : role === 'lead' ? 90 : -90;
        const [ox, oz] = rotXZ(baseX + (solo ? 0 : pose.root.x), solo ? 0 : pose.root.z, pose.spin);
        results[di] = {
          pose,
          x: slot.x + ox,
          z: slot.z + oz,
          rot: baseRot + pose.spin + pose.root.rot
        };
      }
    });
    return results;
  }

  const slots = formationSlots(project.formation, dancers.length, 1.6);
  dancers.forEach((d, i) => {
    let pose = move ? sampleKeys(move.keys, beats[i], ease, P()) : P();
    if (project.mirrorAlt && i % 2 === 1) pose = mirrorPose(pose);
    applyGroove(pose, groove, beats[i], energy);
    const slot = slots[i];
    const [ox, oz] = rotXZ(pose.root.x, pose.root.z, slot.rot);
    results[i] = { pose, x: slot.x + ox, z: slot.z + oz, rot: slot.rot + pose.root.rot };
  });
  return results;
}

function blend(a, b, t) {
  return a.map((ra, i) => {
    const rb = b[i];
    return {
      pose: lerpPose(ra.pose, rb.pose, t),
      x: ra.x + (rb.x - ra.x) * t,
      z: ra.z + (rb.z - ra.z) * t,
      rot: ra.rot + angDiff(ra.rot, rb.rot) * t
    };
  });
}

/**
 * Main entry: full-song beat → dancer transforms.
 * Each dancer may be offset in time (canon) so we evaluate per-dancer and merge.
 */
export function evaluate(project, songBeat) {
  const style = STYLES[project.style];
  const counts = project.counts;
  const n = project.dancers.length;
  const energy = project.energy ?? 1;
  if (!counts.length || !n) return [];
  const total = counts.length * 8;

  // Group dancers by which eight/beat they're on (canon shifts each dancer).
  // Partner styles ripple couple-by-couple so partners stay together.
  const perDancer = [];
  for (let i = 0; i < n; i++) {
    const unit = style.partner ? Math.floor(i / 2) : i;
    perDancer.push(songBeat - unit * (project.canon || 0));
  }

  // Evaluate the layout for each distinct 8-count in play and pick each dancer's entry.
  const cache = new Map();
  const get = (idx, beatsArr) => {
    const key = idx + ':' + beatsArr.join(',');
    if (!cache.has(key)) {
      const moveId = counts[Math.max(0, Math.min(counts.length - 1, idx))].move;
      cache.set(key, layoutFor(project, moveId, beatsArr, style.feel, style.groove, energy));
    }
    return cache.get(key);
  };

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let b = perDancer[i];
    let idx;
    let local;
    let idle = false;
    if (b < 0) {
      idx = 0;
      local = 0;
      idle = true;
    } else if (b >= total) {
      idx = counts.length - 1;
      local = 8;
    } else {
      idx = Math.floor(b / 8);
      local = b - idx * 8;
    }
    // every dancer evaluated at their own local beat; others are irrelevant for solo moves but
    // partner moves need the same beat for both partners, so evaluate with a uniform array.
    const beatsArr = new Array(n).fill(local);
    const cur = get(idx, beatsArr)[i];
    let res = cur;
    const isLast = idx === counts.length - 1;
    if (!isLast && local > 7.5) {
      const t = smooth((local - 7.5) / 0.5);
      const next = get(idx + 1, new Array(n).fill(0))[i];
      res = blend([cur], [next], t)[0];
    }
    if (idle) {
      res = { ...res, pose: clonePose(res.pose) };
      res.pose.chest[0] -= 2 * Math.sin(songBeat * 0.8);
    }
    out[i] = { ...res, eight: idx, local, idle };
  }
  return out;
}

export function moveAt(project, songBeat) {
  if (!project.counts.length) return null;
  const idx = Math.max(0, Math.min(project.counts.length - 1, Math.floor(songBeat / 8)));
  return { idx, entry: project.counts[idx], move: MOVES[project.counts[idx].move] };
}
