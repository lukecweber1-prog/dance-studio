import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Dancer, SKIN_TONES } from './rig.js';
import { STYLES, STYLE_ORDER, MOVES, generateChoreo } from './moves.js';
import { evaluate, FORMATIONS } from './engine.js';
import { parseMusicLink, audioContext, FileSource, BufferSource, YouTubeSource, SoundCloudSource, ClockSource, Recorder, analyzeTempo } from './audio.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const D2R = Math.PI / 180;
const PALETTE = ['#e24d7a', '#8a5cf6', '#38bdf8', '#f59e0b', '#22c55e', '#f472b6', '#14b8a6', '#ef4444'];
const WEDDING_COLORS = { lead: '#1f3b8a', follow: '#f6efe3' };
const STORE_KEY = 'stepstudio.project.v1';
const HERO_KEY = 'stepstudio.heroHidden';
const MAX_DANCERS = 8;
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (s) => {
  s = Math.max(0, s || 0);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const WEDDING_CHECKLIST = [
  'Choose your song & decide where to fade it',
  'Learn the Slow Sway and Box Step',
  'Practise the Underarm Spin 10× in a row',
  'Rehearse the finale on a soft surface',
  'Full run-through in your wedding shoes',
  'Tell the DJ/band your start and fade cue',
  'Final rehearsal — breathe, look at each other, smile'
];

// ---------------------------------------------------------------------------
// Project state
// ---------------------------------------------------------------------------
function weddingDancers(names = ['Partner A', 'Partner B']) {
  return [
    { id: uid(), name: names[0], color: WEDDING_COLORS.lead, role: 'lead', outfit: 'suit', skin: 1 },
    { id: uid(), name: names[1], color: WEDDING_COLORS.follow, role: 'follow', outfit: 'dress', skin: 0 }
  ];
}

function defaultProject() {
  return {
    title: 'Our First Dance',
    style: 'wedding',
    bpm: STYLES.wedding.defaultBpm,
    offset: 0,
    duration: 150,
    seed: 20261002,
    dancers: weddingDancers(),
    formation: 'line',
    canon: 0,
    mirrorAlt: false,
    energy: 1,
    music: { kind: 'none' },
    wedding: { trim: 150, finale: 'dip', checklist: {} },
    counts: []
  };
}

function loadProject() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {}
  return defaultProject();
}

function sanitize(p) {
  const d = defaultProject();
  const out = { ...d, ...p, wedding: { ...d.wedding, ...(p.wedding || {}) }, music: p.music || d.music };
  if (!STYLES[out.style]) out.style = d.style;
  if (!Array.isArray(out.dancers) || !out.dancers.length) out.dancers = d.dancers;
  out.dancers = out.dancers.slice(0, MAX_DANCERS).map((x, i) => ({
    id: x.id || uid(),
    name: String(x.name || `Dancer ${i + 1}`).slice(0, 18),
    color: /^#[0-9a-f]{6}$/i.test(x.color) ? x.color : PALETTE[i % PALETTE.length],
    role: x.role === 'follow' ? 'follow' : 'lead',
    outfit: ['pants', 'suit', 'dress'].includes(x.outfit) ? x.outfit : 'pants',
    skin: Math.max(0, Math.min(SKIN_TONES.length - 1, x.skin | 0))
  }));
  out.counts = Array.isArray(out.counts) ? out.counts.filter((c) => c && MOVES[c.move]) : [];
  out.bpm = Math.max(40, Math.min(220, +out.bpm || d.bpm));
  out.offset = Math.max(0, +out.offset || 0);
  out.duration = Math.max(20, +out.duration || d.duration);
  if (!FORMATIONS[out.formation]) out.formation = 'line';
  return out;
}

let project = loadProject();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(project));
    } catch {}
  }, 300);
}

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------------------------------------------------------------------------
// Choreography (8-counts)
// ---------------------------------------------------------------------------
const beatLen = () => 60 / project.bpm;
const eightStart = (i) => project.offset + i * 8 * beatLen();

function eightCount() {
  let end = project.duration || 150;
  if (project.style === 'wedding' && +project.wedding.trim) end = Math.min(end, project.offset + +project.wedding.trim);
  const n = Math.floor(((end - project.offset) / beatLen()) / 8);
  return Math.max(2, Math.min(120, n));
}

function rebuildCounts({ keepLocked = true, reseed = false } = {}) {
  if (reseed) project.seed = Math.floor(Math.random() * 1e9);
  const n = eightCount();
  const gen = generateChoreo(project.style, n, {
    seed: project.seed,
    finaleId: project.style === 'wedding' ? project.wedding.finale : undefined,
    solo: project.dancers.length < 2
  });
  const old = project.counts;
  project.counts = gen.map((g, i) => (keepLocked && old[i] && old[i].locked && MOVES[old[i].move] ? old[i] : g));
  if (loopIdx !== null && loopIdx >= n) setLoop(false);
  renderTimeline();
  save();
}

// ---------------------------------------------------------------------------
// 3D stage
// ---------------------------------------------------------------------------
const stageEl = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stageEl.prepend(renderer.domElement);
$('#stageLoading').remove();

const scene = new THREE.Scene();
// soft studio reflections so skin, satin and wool read as real materials
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const bg = new THREE.Color('#0d0a16');
scene.background = bg;
scene.fog = new THREE.Fog(bg, 11, 26);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 1.7, 6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.95, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 1.8;
controls.maxDistance = 20;
controls.enablePan = false;

const hemi = new THREE.HemisphereLight('#c9c0ff', '#2a1d33', 0.45);
scene.add(hemi);
const key = new THREE.DirectionalLight('#fff1e0', 2.2);
key.position.set(3, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
key.shadow.bias = -0.0005;
scene.add(key);
const rim = new THREE.DirectionalLight('#e24d7a', 1.4);
rim.position.set(-4, 4, -6);
scene.add(rim);
const fill = new THREE.PointLight('#8a5cf6', 18, 14);
fill.position.set(-4, 2.5, 3);
scene.add(fill);

const floorMat = new THREE.MeshStandardMaterial({ color: '#1c1628', roughness: 0.38, metalness: 0.1, envMapIntensity: 0.25 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 96), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.PolarGridHelper(7, 16, 7, 72, '#3a3354', '#2a2440');
grid.material.transparent = true;
grid.material.opacity = 0.5;
grid.position.y = 0.002;
scene.add(grid);
const glowMat = new THREE.MeshBasicMaterial({ color: '#e24d7a', transparent: true, opacity: 0.12, side: THREE.DoubleSide });
const glow = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.25, 96), glowMat);
glow.rotation.x = -Math.PI / 2;
glow.position.y = 0.004;
scene.add(glow);

// floating sparkles / petals
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SPARKS = 260;
const sparkGeo = new THREE.BufferGeometry();
const sparkPos = new Float32Array(SPARKS * 3);
for (let i = 0; i < SPARKS; i++) {
  sparkPos[i * 3] = (Math.random() - 0.5) * 18;
  sparkPos[i * 3 + 1] = Math.random() * 7;
  sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparkMat = new THREE.PointsMaterial({ size: 0.08, map: dotTexture(), transparent: true, depthWrite: false, color: '#a99fff', opacity: 0.55, blending: THREE.AdditiveBlending });
const sparks = new THREE.Points(sparkGeo, sparkMat);
scene.add(sparks);

const stageGroup = new THREE.Group();
scene.add(stageGroup);

function applyTheme() {
  const wed = project.style === 'wedding';
  document.body.classList.toggle('theme-wedding', wed);
  floorMat.color.set(wed ? '#2a1e22' : '#1c1628');
  glowMat.color.set(wed ? '#e8c47a' : '#e24d7a');
  sparkMat.color.set(wed ? '#ffd9a0' : '#a99fff');
  sparkMat.size = wed ? 0.11 : 0.08;
  rim.color.set(wed ? '#ffb38a' : '#e24d7a');
  fill.color.set(wed ? '#ff9ec0' : '#8a5cf6');
  key.color.set(wed ? '#ffe8cc' : '#fff1e0');
}

const resize = () => {
  const w = stageEl.clientWidth;
  const h = stageEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(stageEl);
resize();

// camera presets with a small tween
let view = 'front';
let camTween = null;
function viewDistance() {
  const n = project.dancers.length;
  const aspect = Math.max(0.6, camera.aspect || 1.5);
  return (4.8 + Math.max(0, n - 2) * 0.75) * Math.max(1, 1.3 / aspect);
}
function setView(v, instant = false) {
  view = v;
  $$('.vbtn[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  const d = viewDistance();
  const to = {
    front: new THREE.Vector3(0, 1.75, d),
    back: new THREE.Vector3(0, 1.75, -d),
    side: new THREE.Vector3(d, 1.6, 0.4),
    top: new THREE.Vector3(0, d * 1.25, 0.6)
  }[v];
  if (instant) {
    camera.position.copy(to);
    return;
  }
  camTween = { from: camera.position.clone(), to, t0: performance.now(), dur: 650 };
}
$$('.vbtn[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#btnMirror').addEventListener('click', (e) => {
  stageGroup.scale.x *= -1;
  e.currentTarget.classList.toggle('active', stageGroup.scale.x < 0);
  toast(stageGroup.scale.x < 0 ? 'Mirror on — move the same side as the dancer you face' : 'Mirror off');
});

// dancers in the scene
let rigs = [];
function syncRigs() {
  project.dancers.forEach((d, i) => {
    const k = [d.color, d.outfit, d.skin, i].join('|');
    let r = rigs[i];
    if (!r || r.key !== k) {
      if (r) {
        stageGroup.remove(r.dancer.root);
        r.dancer.dispose();
      }
      r = rigs[i] = { key: k, name: d.name, dancer: new Dancer({ name: d.name, color: d.color, outfit: d.outfit, skin: SKIN_TONES[d.skin], variant: i }) };
      stageGroup.add(r.dancer.root);
    } else if (r.name !== d.name) {
      r.dancer.setLabel(d.name, d.color);
      r.name = d.name;
    }
  });
  while (rigs.length > project.dancers.length) {
    const r = rigs.pop();
    stageGroup.remove(r.dancer.root);
    r.dancer.dispose();
  }
}

// ---------------------------------------------------------------------------
// Music source
// ---------------------------------------------------------------------------
let source = null;
let speed = 1;
let metronome = false;
let loopIdx = null;

function setStatus(msg, kind = '') {
  const s = $('#musicStatus');
  s.textContent = msg;
  s.className = 'status ' + kind;
}

function setSource(src) {
  if (source) source.destroy();
  source = src;
  src.on('state', (playing) => updatePlayBtn(playing));
  src.on('error', (msg) => setStatus(msg, 'err'));
  src.on('ready', () => {
    if (src.duration && isFinite(src.duration)) {
      project.duration = src.duration;
      rebuildCounts();
    }
  });
  if (speed !== 1 && src.canSetRate) src.setRate(speed);
  updatePlayBtn(false);
}

function clearPlayerHost() {
  $('#playerHost').innerHTML = '';
}

async function loadFile(file, label = file.name) {
  audioContext(); // unlock audio while we're still inside the user's click/drop
  clearPlayerHost();
  const bytes = await file.arrayBuffer();
  const url = URL.createObjectURL(file);
  let src = new FileSource(url, $('#playerHost'), label);
  setSource(src);
  // If this page isn't allowed to stream the file into an <audio> element, play it through Web Audio instead.
  src.on('error', () => {
    if (source !== src) return;
    clearPlayerHost();
    src = new BufferSource(bytes.slice(0), label);
    setSource(src);
    setStatus(`🎵 “${label}” is ready — press ▶ to dance.`, 'ok');
  });
  project.music = { kind: 'file', name: label };
  setMetronome(false);
  save();
  setStatus(`Analysing “${label}” for tempo…`);
  try {
    const r = await analyzeTempo(bytes.slice(0), (m) => setStatus(m));
    if (!(source instanceof FileSource || source instanceof BufferSource) || source.label !== label) return;
    project.bpm = r.bpm;
    project.offset = r.offset;
    project.duration = r.duration;
    reflectTempo();
    rebuildCounts();
    setStatus(`🎵 “${label}” · detected ${r.bpm} BPM, first beat at ${r.offset.toFixed(2)}s. Press ▶ to dance. Not quite right? Try ½× / 2× or TAP along.`, 'ok');
    toast(`Choreographed ${project.counts.length} eight-counts to your song!`);
  } catch (e) {
    console.warn(e);
    setStatus(`Loaded “${label}”. We couldn’t detect the tempo automatically — press play and tap TAP on each beat.`, 'err');
  }
}

const STREAM_BLOCKED =
  'This link couldn’t load here. Streaming players (YouTube / SoundCloud) can be blocked when the app runs inside a preview or private page — upload the song file instead (📁 Upload), or open the app from its own web address.';

function loadLink(raw, { quiet = false } = {}) {
  const info = parseMusicLink(raw);
  if (!info) {
    setStatus('That link isn’t recognised. Paste a SoundCloud, YouTube Music / YouTube, or direct .mp3 link.', 'err');
    return;
  }
  clearPlayerHost();
  const host = $('#playerHost');
  setMetronome(false);
  const watchdog = (src, ms = 10000) => {
    src.on('error', () => source === src && setStatus(STREAM_BLOCKED, 'err'));
    setTimeout(() => {
      if (source === src && !src.ready) setStatus(STREAM_BLOCKED, 'err');
    }, ms);
    return src;
  };
  if (info.type === 'youtube') {
    setSource(watchdog(new YouTubeSource(info.id, host), 16000));
    setStatus(`${info.music ? 'YouTube Music' : 'YouTube'} track loaded. Press ▶, then tap TAP on every beat starting on a “1” to sync the dancers.`, 'ok');
  } else if (info.type === 'soundcloud') {
    setSource(watchdog(new SoundCloudSource(info.url, host)));
    setStatus('SoundCloud track loaded. Press ▶, then tap TAP on every beat starting on a “1” to sync the dancers.', 'ok');
  } else {
    const src = watchdog(new FileSource(info.url, host, 'Audio link'));
    setSource(src);
    setStatus('Audio link loaded — trying to detect tempo…');
    fetch(info.url)
      .then((r) => r.arrayBuffer())
      .then((b) => analyzeTempo(b))
      .then((r) => {
        if (source !== src) return;
        Object.assign(project, { bpm: r.bpm, offset: r.offset, duration: r.duration });
        reflectTempo();
        rebuildCounts();
        setStatus(`🎵 Detected ${r.bpm} BPM.`, 'ok');
      })
      .catch(() => setStatus('Audio link loaded. Tap TAP along with the beat to sync (the site hosting it blocks tempo analysis).', 'ok'));
  }
  project.music = { kind: 'link', url: raw.trim() };
  $('#linkInput').value = raw.trim();
  save();
  if (!quiet) toast('Music loaded — press ▶ and tap the beat');
}

function useClock() {
  clearPlayerHost();
  const len = +$('#clockLen').value;
  project.duration = len;
  project.offset = +(4 * beatLen()).toFixed(3); // 4-beat count-in: "5, 6, 7, 8"
  setSource(new ClockSource(len));
  project.music = { kind: 'none' };
  setMetronome(true);
  reflectTempo();
  rebuildCounts();
  setStatus(`Practice clock: ${fmt(len)} at ${project.bpm} BPM with a “5-6-7-8” count-in. Change the tempo any time.`, 'ok');
}

function ensureSource() {
  if (!source) {
    const len = project.duration || 150;
    if (project.offset === 0) project.offset = +(4 * beatLen()).toFixed(3);
    setSource(new ClockSource(len));
    setMetronome(true);
    reflectTempo();
    setStatus(`No song yet — practising to a metronome at ${project.bpm} BPM. Add music any time.`, 'ok');
  }
}

// metronome click
function click(accent) {
  try {
    const actx = audioContext();
    if (!actx || actx.state !== 'running') return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.frequency.value = accent ? 1660 : 1100;
    g.gain.setValueAtTime(accent ? 0.35 : 0.2, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.06);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + 0.07);
  } catch {}
}
function setMetronome(on) {
  metronome = on;
  $('#btnMetro').classList.toggle('on', on);
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
function updatePlayBtn(playing) {
  const b = $('#btnPlay');
  b.textContent = playing ? '❚❚' : '▶';
  b.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function togglePlay() {
  audioContext(); // browsers only allow sound to start from a click/tap/key press
  ensureSource();
  if (source.playing) source.pause();
  else source.play();
}
const curTime = () => (source ? source.time() : 0);
const curEight = () => Math.max(0, Math.min(project.counts.length - 1, Math.floor(((curTime() - project.offset) / beatLen()) / 8)));
function seek(t) {
  ensureSource();
  source.seek(Math.max(0, t));
}
function seekEight(i) {
  i = Math.max(0, Math.min(project.counts.length - 1, i));
  // land a hair early so the dancers start cleanly on count 1
  seek(eightStart(i) - 0.02);
  if (loopIdx !== null) setLoop(true, i);
}
function setLoop(on, idx = curEight()) {
  loopIdx = on ? idx : null;
  $('#btnLoop').classList.toggle('on', on);
  $$('.eight').forEach((el, i) => el.classList.toggle('looping', i === loopIdx));
}

$('#btnPlay').addEventListener('click', togglePlay);
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => audioContext(), { passive: true }));
$('#btnRestart').addEventListener('click', () => seek(0));
$('#btnPrev').addEventListener('click', () => seekEight(curEight() - (((curTime() - eightStart(curEight())) < 1) ? 1 : 0)));
$('#btnNext').addEventListener('click', () => seekEight(curEight() + 1));
$('#btnLoop').addEventListener('click', () => {
  setLoop(loopIdx === null);
  if (loopIdx !== null) toast(`Looping 8-count #${loopIdx + 1} — ${MOVES[project.counts[loopIdx].move].name}`);
});
$('#btnMetro').addEventListener('click', () => setMetronome(!metronome));
$('#speed').addEventListener('change', (e) => {
  speed = +e.target.value;
  if (source && source.canSetRate) source.setRate(speed);
  else if (source && speed !== 1) toast('Speed control isn’t available for SoundCloud — try a YouTube link or uploaded file.');
});
let scrubbing = false;
const scrub = $('#scrub');
scrub.addEventListener('input', () => {
  scrubbing = true;
  const d = source?.duration || project.duration;
  seek((scrub.value / 1000) * d);
});
scrub.addEventListener('change', () => (scrubbing = false));

// tap tempo
let taps = [];
function tap() {
  const usingSong = source && source.playing && !(source instanceof ClockSource);
  const now = usingSong ? source.time() : performance.now() / 1000;
  if (taps.length && (now - taps[taps.length - 1] > 2.2 || now < taps[taps.length - 1])) taps = [];
  taps.push(now);
  const b = $('#btnTap');
  b.classList.add('flash');
  setTimeout(() => b.classList.remove('flash'), 90);
  if (taps.length >= 4) {
    // least-squares fit: tap i happens at offset + i * period
    const n = taps.length;
    const mx = (n - 1) / 2;
    const my = taps.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    taps.forEach((t, i) => {
      num += (i - mx) * (t - my);
      den += (i - mx) ** 2;
    });
    const period = num / den;
    const bpm = Math.round((60 / period) * 10) / 10;
    if (bpm >= 40 && bpm <= 220) {
      project.bpm = bpm;
      if (usingSong) project.offset = Math.max(0, +(my - mx * period).toFixed(3));
      reflectTempo();
      debouncedRebuild();
      b.textContent = `${Math.round(bpm)}`;
      clearTimeout(tap._t);
      tap._t = setTimeout(() => (b.textContent = 'TAP'), 1500);
    }
  } else {
    b.textContent = `${taps.length}…`;
  }
}
$('#btnTap').addEventListener('click', tap);

// ---------------------------------------------------------------------------
// Tempo inputs
// ---------------------------------------------------------------------------
function reflectTempo() {
  $('#bpm').value = project.bpm;
  $('#offset').value = project.offset;
}
let rebuildTimer;
function debouncedRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => rebuildCounts(), 250);
}
$('#bpm').addEventListener('change', (e) => {
  project.bpm = Math.max(40, Math.min(220, +e.target.value || project.bpm));
  reflectTempo();
  debouncedRebuild();
});
$('#offset').addEventListener('change', (e) => {
  project.offset = Math.max(0, +e.target.value || 0);
  reflectTempo();
  debouncedRebuild();
});
$('#bpmHalf').addEventListener('click', () => {
  project.bpm = Math.max(40, Math.round((project.bpm / 2) * 10) / 10);
  reflectTempo();
  debouncedRebuild();
});
$('#bpmDouble').addEventListener('click', () => {
  project.bpm = Math.min(220, Math.round(project.bpm * 2 * 10) / 10);
  reflectTempo();
  debouncedRebuild();
});
const nudge = (d) => {
  project.offset = Math.max(0, +(project.offset + d).toFixed(3));
  reflectTempo();
  save();
};
$('#offMinus').addEventListener('click', () => nudge(-0.05));
$('#offPlus').addEventListener('click', () => nudge(0.05));
$('#btnSetOne').addEventListener('click', () => {
  if (!source) return toast('Load music and press play first');
  project.offset = +curTime().toFixed(3);
  reflectTempo();
  debouncedRebuild();
  toast(`Count “1” set at ${fmt(project.offset)}`);
});

// ---------------------------------------------------------------------------
// Music UI
// ---------------------------------------------------------------------------
$$('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.tab-body').forEach((b) => (b.hidden = b.dataset.body !== t.dataset.tab));
  })
);
const showTab = (name) => $(`.tab[data-tab="${name}"]`).click();
$('#linkForm').addEventListener('submit', (e) => {
  e.preventDefault();
  loadLink($('#linkInput').value);
});
$('#fileInput').addEventListener('change', (e) => e.target.files[0] && loadFile(e.target.files[0]));
const dz = $('#dropzone');
['dragenter', 'dragover'].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    dz.classList.add('over');
  })
);
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('over')));
dz.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});
$('#btnClock').addEventListener('click', useClock);

let recorder = null;
let recTimer;
$('#btnRecord').addEventListener('click', async () => {
  const btn = $('#btnRecord');
  if (!recorder) {
    try {
      recorder = new Recorder();
      await recorder.start();
    } catch (e) {
      recorder = null;
      setStatus('Microphone access was blocked. Allow the mic in your browser to record.', 'err');
      return;
    }
    btn.classList.add('recording');
    $('#recLabel').textContent = 'Stop recording';
    recTimer = setInterval(() => ($('#recTime').textContent = fmt((performance.now() - recorder.started) / 1000)), 250);
  } else {
    clearInterval(recTimer);
    const blob = await recorder.stop();
    recorder = null;
    btn.classList.remove('recording');
    $('#recLabel').textContent = 'Record again';
    const file = new File([blob], 'My recording', { type: blob.type });
    loadFile(file, 'My recording');
  }
});

// ---------------------------------------------------------------------------
// Style picker
// ---------------------------------------------------------------------------
function renderStyles() {
  $('#styleGrid').innerHTML = STYLE_ORDER.map((id) => {
    const s = STYLES[id];
    return `<button class="style-card ${s.featured ? 'featured' : ''} ${project.style === id ? 'active' : ''}" data-style="${id}">
      ${s.featured ? '<span class="ribbon">Featured</span>' : ''}
      <span class="s-icon">${s.icon}</span><span class="s-name">${s.name}</span><span class="s-blurb">${s.blurb}</span></button>`;
  }).join('');
  $$('.style-card').forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.style)));
}

function setStyle(id, { announce = true } = {}) {
  const prev = project.style;
  project.style = id;
  const st = STYLES[id];
  if (id === 'wedding' && project.dancers.length < 2) {
    project.dancers = weddingDancers([$('#nameLead').value || 'Partner A', $('#nameFollow').value || 'Partner B']);
    if (announce) toast('Added a partner for your first dance 💕');
  }
  if (project.music.kind === 'none' && prev !== id) {
    project.bpm = st.defaultBpm;
    if (source instanceof ClockSource) project.offset = +(4 * beatLen()).toFixed(3);
    reflectTempo();
  }
  rebuildCounts({ keepLocked: false });
  renderStyles();
  renderDancers();
  renderSidePanels();
  applyTheme();
  syncRigs();
  setView(view);
}

function startWeddingMode() {
  const names = [$('#nameLead').value || 'Partner A', $('#nameFollow').value || 'Partner B'];
  project.dancers = weddingDancers(names);
  project.formation = 'line';
  project.canon = 0;
  project.mirrorAlt = false;
  if (project.title === 'My Choreography' || !project.title) project.title = 'Our First Dance';
  $('#projectTitle').value = project.title;
  setStyle('wedding', { announce: false });
  reflectGroupOpts();
  showTab('upload');
  setView('front');
  $('#musicCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('💍 Wedding mode! Now upload or link your first-dance song.', 3500);
}
$('#btnWeddingHero').addEventListener('click', startWeddingMode);
$('#btnWeddingTop').addEventListener('click', () => {
  $('#weddingHero').hidden = false;
  try {
    localStorage.removeItem(HERO_KEY);
  } catch {}
  startWeddingMode();
});
$('#btnHideHero').addEventListener('click', () => {
  $('#weddingHero').hidden = true;
  try {
    localStorage.setItem(HERO_KEY, '1');
  } catch {}
  $('#styleCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------------------------------------------------------------------------
// Dancers
// ---------------------------------------------------------------------------
function renderDancers() {
  const partner = STYLES[project.style].partner;
  $('#dancerCount').textContent = `${project.dancers.length} / ${MAX_DANCERS}`;
  $('#dancerList').innerHTML = project.dancers
    .map(
      (d, i) => `<li class="dancer" data-i="${i}">
      <input type="color" value="${d.color}" data-k="color" aria-label="Colour for ${esc(d.name)}" />
      <input class="d-name" type="text" value="${esc(d.name)}" maxlength="18" data-k="name" aria-label="Dancer name" />
      <button class="remove" data-act="remove" title="Remove dancer" ${project.dancers.length < 2 ? 'disabled' : ''}>✕</button>
      <div class="d-opts">
        <select data-k="role" title="Partner role" ${partner ? '' : 'disabled'}><option value="lead" ${d.role === 'lead' ? 'selected' : ''}>Lead</option><option value="follow" ${d.role === 'follow' ? 'selected' : ''}>Follow</option></select>
        <select data-k="outfit" title="Outfit"><option value="pants" ${d.outfit === 'pants' ? 'selected' : ''}>Casual</option><option value="suit" ${d.outfit === 'suit' ? 'selected' : ''}>Suit</option><option value="dress" ${d.outfit === 'dress' ? 'selected' : ''}>Dress</option></select>
        <select data-k="skin" title="Skin tone">${SKIN_TONES.map((_, s) => `<option value="${s}" ${d.skin === s ? 'selected' : ''}>Tone ${s + 1}</option>`).join('')}</select>
      </div></li>`
    )
    .join('');
  $('#btnAddDancer').disabled = project.dancers.length >= MAX_DANCERS;
}
$('#dancerList').addEventListener('input', (e) => {
  const li = e.target.closest('.dancer');
  const k = e.target.dataset.k;
  if (!li || !k) return;
  const d = project.dancers[+li.dataset.i];
  d[k] = k === 'skin' ? +e.target.value : e.target.value;
  if (k === 'name') syncCoupleNames();
  syncRigs();
  save();
});
$('#dancerList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act="remove"]');
  if (!btn || project.dancers.length < 2) return;
  project.dancers.splice(+btn.closest('.dancer').dataset.i, 1);
  afterDancerChange();
});
$('#btnAddDancer').addEventListener('click', () => {
  if (project.dancers.length >= MAX_DANCERS) return;
  const leads = project.dancers.filter((d) => d.role === 'lead').length;
  const n = project.dancers.length;
  const role = leads > n - leads ? 'follow' : 'lead';
  const wed = project.style === 'wedding';
  project.dancers.push({
    id: uid(),
    name: `Dancer ${n + 1}`,
    color: wed ? (role === 'lead' ? WEDDING_COLORS.lead : PALETTE[(n * 3) % PALETTE.length]) : PALETTE[n % PALETTE.length],
    role,
    outfit: wed ? (role === 'lead' ? 'suit' : 'dress') : 'pants',
    skin: (n * 2) % SKIN_TONES.length
  });
  afterDancerChange();
  toast(STYLES[project.style].partner ? `Added a ${role} — partner moves pair leads with follows` : 'Dancer added');
});
function afterDancerChange() {
  renderDancers();
  syncRigs();
  if (project.dancers.length < 2 !== (rebuildCounts.lastSolo ?? false)) {
    rebuildCounts.lastSolo = project.dancers.length < 2;
    rebuildCounts();
  }
  setView(view);
  save();
}

function reflectGroupOpts() {
  $('#formation').value = project.formation;
  $('#canon').value = String(project.canon);
  $('#mirrorAlt').checked = project.mirrorAlt;
  $('#energy').value = project.energy;
}
$('#formation').innerHTML = Object.entries(FORMATIONS)
  .map(([k, v]) => `<option value="${k}">${v}</option>`)
  .join('');
$('#formation').addEventListener('change', (e) => {
  project.formation = e.target.value;
  save();
});
$('#canon').addEventListener('change', (e) => {
  project.canon = +e.target.value;
  save();
});
$('#mirrorAlt').addEventListener('change', (e) => {
  project.mirrorAlt = e.target.checked;
  save();
});
$('#energy').addEventListener('input', (e) => {
  project.energy = +e.target.value;
  save();
});

// ---------------------------------------------------------------------------
// Right-hand panels: tips + wedding planner
// ---------------------------------------------------------------------------
function syncCoupleNames() {
  const lead = project.dancers.find((d) => d.role === 'lead');
  const follow = project.dancers.find((d) => d.role === 'follow');
  if (lead) $('#nameLead').value = lead.name;
  if (follow) $('#nameFollow').value = follow.name;
}
function renderSidePanels() {
  const st = STYLES[project.style];
  $('#tipsTitle').textContent = `${st.icon} ${st.short} tips`;
  $('#tips').innerHTML = st.tips.map((t) => `<li>${esc(t)}</li>`).join('');
  const wed = project.style === 'wedding';
  $('#weddingPlanner').hidden = !wed;
  if (wed) {
    syncCoupleNames();
    $('#trim').value = String(project.wedding.trim);
    $('#finale').value = project.wedding.finale;
    $('#checklist').innerHTML = WEDDING_CHECKLIST.map(
      (c, i) => `<li><label><input type="checkbox" data-i="${i}" ${project.wedding.checklist[i] ? 'checked' : ''}/><span>${esc(c)}</span></label></li>`
    ).join('');
  }
}
['#nameLead', '#nameFollow'].forEach((sel) =>
  $(sel).addEventListener('input', (e) => {
    const role = sel === '#nameLead' ? 'lead' : 'follow';
    const d = project.dancers.find((x) => x.role === role);
    if (d) {
      d.name = e.target.value || (role === 'lead' ? 'Partner A' : 'Partner B');
      renderDancers();
      syncRigs();
      save();
    }
  })
);
$('#trim').addEventListener('change', (e) => {
  project.wedding.trim = +e.target.value;
  rebuildCounts();
  toast(+e.target.value ? `Routine trimmed to ${fmt(+e.target.value)} — fade the music there` : 'Choreographing the whole song');
});
$('#finale').addEventListener('change', (e) => {
  project.wedding.finale = e.target.value;
  const last = project.counts.length - 1;
  if (last >= 0) project.counts[last] = { move: e.target.value, section: 'Finale' };
  renderTimeline();
  save();
});
$('#checklist').addEventListener('change', (e) => {
  project.wedding.checklist[e.target.dataset.i] = e.target.checked;
  save();
});

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
function renderTimeline() {
  const tl = $('#timeline');
  tl.innerHTML = project.counts
    .map((c, i) => {
      const m = MOVES[c.move];
      return `<div class="eight ${m.finale ? 'finale' : ''} ${i === loopIdx ? 'looping' : ''}" data-i="${i}" role="button" tabindex="0">
        <div class="e-top"><span>#${i + 1}</span><span>${fmt(eightStart(i))}</span></div>
        <div class="e-sec">${esc(c.section || '')}</div>
        <div class="e-name">${c.locked ? '📌 ' : ''}${esc(m.name)}</div>
        <button class="btn small e-change" data-act="change">Change</button>
        <div class="e-progress"></div></div>`;
    })
    .join('');
  const total = project.counts.length;
  $('#timelineMeta').textContent = `· ${total} eight-counts · ${fmt(total * 8 * beatLen())} · ${project.bpm} BPM`;
  lastEight = -1;
}
$('#timeline').addEventListener('click', (e) => {
  const card = e.target.closest('.eight');
  if (!card) return;
  const i = +card.dataset.i;
  if (e.target.closest('[data-act="change"]')) openPicker(i);
  else seekEight(i);
});
$('#timeline').addEventListener('keydown', (e) => {
  const card = e.target.closest('.eight');
  if (card && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    seekEight(+card.dataset.i);
  }
});
$('#btnShuffle').addEventListener('click', () => {
  rebuildCounts({ reseed: true });
  toast('🎲 Fresh routine! (📌 hand-picked moves were kept)');
});
$('#btnReset').addEventListener('click', () => {
  if (!confirm('Regenerate the whole routine, including moves you picked by hand?')) return;
  rebuildCounts({ reseed: true, keepLocked: false });
});

// move picker dialog
let pickerIdx = 0;
function openPicker(i) {
  pickerIdx = i;
  $('#pickerTitle').textContent = `8-count #${i + 1} · ${fmt(eightStart(i))}`;
  renderPicker();
  $('#movePicker').showModal();
}
function renderPicker() {
  const all = $('#pickerAll').checked;
  const ids = all ? STYLE_ORDER : [project.style];
  const cur = project.counts[pickerIdx]?.move;
  const solo = project.dancers.length < 2;
  $('#moveGrid').innerHTML = ids
    .map((sid) => {
      const st = STYLES[sid];
      const opts = st.moves
        .map(
          (m) => `<button type="button" class="move-opt ${m.id === cur ? 'current' : ''}" data-move="${m.id}">
          <b>${esc(m.name)}</b>
          <span class="m-tags"><span class="badge ${m.level}">${m.level}</span>${m.partner ? `<span class="badge">Partner${solo ? ' (solo: lead part)' : ''}</span>` : ''}${m.finale ? '<span class="badge">Finale</span>' : ''}</span>
          <small>${esc(m.desc)}</small></button>`
        )
        .join('');
      return `${all ? `<div class="move-group-title">${st.icon} ${st.name}</div>` : ''}${opts}`;
    })
    .join('');
}
$('#pickerAll').addEventListener('change', renderPicker);
$('#moveGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-move]');
  if (!b) return;
  const c = project.counts[pickerIdx];
  project.counts[pickerIdx] = { move: b.dataset.move, section: c?.section || '', locked: true };
  $('#movePicker').close();
  renderTimeline();
  save();
  seekEight(pickerIdx);
  toast(`📌 ${MOVES[b.dataset.move].name} placed on 8-count #${pickerIdx + 1}`);
});

// ---------------------------------------------------------------------------
// HUD + per-frame UI
// ---------------------------------------------------------------------------
const dots = $('#countDots');
dots.innerHTML = '<i></i>'.repeat(8);
const dotEls = [...dots.children];
let lastEight = -1;
let lastCount = null;
let lastMoveId = null;

function updateHud(beat, t) {
  const n = project.counts.length;
  const countNum = $('#countNum');
  let label;
  let countIdx = -1;
  if (beat < -4) label = '…';
  else if (beat < 0) {
    label = String(9 + Math.floor(beat)); // 5,6,7,8 count-in
  } else {
    const local = beat % 8;
    countIdx = Math.floor(local);
    label = local - countIdx >= 0.5 ? '&' : String(countIdx + 1);
  }
  if (beat >= n * 8) label = '♥';
  if (label !== lastCount) {
    countNum.textContent = label;
    countNum.classList.toggle('and', label === '&');
    if (label !== '&') {
      countNum.classList.add('beat');
      setTimeout(() => countNum.classList.remove('beat'), 90);
    }
    lastCount = label;
    dotEls.forEach((d, i) => d.classList.toggle('on', i === countIdx));
  }

  const idx = Math.max(0, Math.min(n - 1, Math.floor(beat / 8)));
  const entry = project.counts[idx];
  if (!entry) return;
  const move = MOVES[entry.move];
  const next = project.counts[idx + 1] ? MOVES[project.counts[idx + 1].move] : null;

  if (idx !== lastEight) {
    $$('.eight.current').forEach((el) => {
      el.classList.remove('current');
      el.querySelector('.e-progress').style.width = '0';
    });
    const card = $(`.eight[data-i="${idx}"]`);
    if (card) {
      card.classList.add('current');
      if (source?.playing) {
        const tl = $('#timeline');
        tl.scrollTo({ left: card.offsetLeft - tl.clientWidth / 2 + card.clientWidth / 2 });
      }
    }
    $('#hudEight').textContent = `8-count ${idx + 1} / ${n}${entry.section ? ' · ' + entry.section : ''}`;
    $('#upNext').textContent = next ? next.name : 'The end ♥';
    $('#cueNext').innerHTML = next ? `Next: <b>${esc(next.name)}</b>` : '';
    lastEight = idx;
  }
  if (move.id !== lastMoveId) {
    $('#nowName').textContent = move.name;
    const lv = $('#nowLevel');
    lv.textContent = move.level;
    lv.className = 'badge ' + move.level;
    $('#nowDesc').textContent = move.desc;
    $('#cueList').innerHTML = move.cues.map((c) => `<li>${esc(c)}</li>`).join('');
    $('#cueMove').textContent = move.name;
    lastMoveId = move.id;
    renderCue.last = null;
  }
  renderCue(beat < 0 ? -1 : countIdx, move, beat);
  const card = $('.eight.current .e-progress');
  if (card) card.style.width = `${Math.max(0, Math.min(1, (beat - idx * 8) / 8)) * 100}%`;

  const d = source?.duration || project.duration;
  if (!scrubbing) scrub.value = d ? (t / d) * 1000 : 0;
  const tl = `${fmt(t)} / ${fmt(d)}`;
  if (tl !== updateHud.lastTl) $('#timeLabel').textContent = updateHud.lastTl = tl;
}
function renderCue(ci, move, beat) {
  const k = ci + ':' + move.id;
  if (renderCue.last === k) return;
  renderCue.last = k;
  $$('#cueList li').forEach((li, i) => li.classList.toggle('on', i === ci));
  if (ci < 0) $('#cueText').textContent = beat < -4 || !source?.playing ? 'Get into your starting position…' : 'Ready… 5, 6, 7, 8!';
  else $('#cueText').textContent = `${ci + 1} — ${move.cues[ci]}`;
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
let lastBeatInt = null;
let lastFrame = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  let t = curTime();
  const bl = beatLen();

  if (loopIdx !== null && source?.playing) {
    const s = eightStart(loopIdx);
    const e = s + 8 * bl;
    if (t >= e || t < s - 2) {
      source.seek(s);
      t = s;
    }
  }
  const beat = (t - project.offset) / bl;
  const bi = Math.floor(beat);
  if (metronome && source?.playing && bi !== lastBeatInt && beat >= -4) click(((bi % 8) + 8) % 8 === 0);
  lastBeatInt = bi;

  const res = evaluate(project, beat);
  for (let i = 0; i < res.length; i++) {
    const r = res[i];
    const dancer = rigs[i]?.dancer;
    if (!dancer || !r) continue;
    dancer.root.position.set(r.x, 0, r.z);
    dancer.root.rotation.y = r.rot * D2R;
    dancer.setPose(r.pose);
  }
  updateHud(beat, t);

  // sparkles drift
  const pos = sparkGeo.attributes.position;
  const fall = project.style === 'wedding' ? 0.18 : 0.06;
  for (let i = 0; i < SPARKS; i++) {
    let y = pos.array[i * 3 + 1] - dt * fall * (0.5 + (i % 7) / 7);
    if (y < 0) y = 7;
    pos.array[i * 3 + 1] = y;
    pos.array[i * 3] += Math.sin(now * 0.0004 + i) * dt * 0.05;
  }
  pos.needsUpdate = true;
  glow.material.opacity = 0.1 + 0.08 * Math.max(0, Math.cos(2 * Math.PI * (beat - Math.floor(beat)))) * (source?.playing ? 1 : 0);

  if (camTween) {
    const k = Math.min(1, (now - camTween.t0) / camTween.dur);
    const e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(camTween.from, camTween.to, e);
    if (k >= 1) camTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Project title, export / import / print, keyboard
// ---------------------------------------------------------------------------
$('#projectTitle').addEventListener('input', (e) => {
  project.title = e.target.value;
  save();
});

$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(project.title || 'choreography').replace(/[^\w-]+/g, '_')}.stepstudio.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('#importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    project = sanitize(JSON.parse(await f.text()));
    boot();
    toast(`Opened “${project.title}”`);
  } catch {
    toast('That file isn’t a StepStudio project');
  }
  e.target.value = '';
});

$('#btnPrint').addEventListener('click', () => {
  const st = STYLES[project.style];
  const rows = project.counts
    .map((c, i) => {
      const m = MOVES[c.move];
      return `<tr><td>${i + 1}</td><td>${fmt(eightStart(i))}</td><td>${esc(c.section || '')}</td><td><b>${esc(m.name)}</b><br><small>${m.level}</small></td><td>${m.cues.map((q, j) => `<b>${j + 1}</b> ${esc(q)}`).join(' · ')}</td></tr>`;
    })
    .join('');
  const dancers = project.dancers.map((d) => `${esc(d.name)}${st.partner ? ` (${d.role})` : ''}`).join(', ');
  $('#printSheet').innerHTML = `<h1>${esc(project.title)}</h1>
    <p>${st.icon} ${esc(st.name)} · ${project.bpm} BPM · starts at ${fmt(project.offset)} · ${project.counts.length} eight-counts${project.music.name ? ' · ' + esc(project.music.name) : ''}<br>Dancers: ${dancers}</p>
    <table><thead><tr><th>#</th><th>Time</th><th>Section</th><th>Move</th><th>Counts</th></tr></thead><tbody>${rows}</tbody></table>
    <h3>Tips</h3><ul>${st.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <p><small>Made with StepStudio 3D</small></p>`;
  window.print();
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'ArrowRight') seekEight(curEight() + 1);
  else if (e.key === 'ArrowLeft') seekEight(curEight() - 1);
  else if (e.key === 't' || e.key === 'T') tap();
  else if (e.key === 'l' || e.key === 'L') $('#btnLoop').click();
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  $('#projectTitle').value = project.title;
  if (source) {
    source.destroy();
    source = null;
  }
  clearPlayerHost();
  setLoop(false);
  reflectTempo();
  reflectGroupOpts();
  renderStyles();
  renderDancers();
  renderSidePanels();
  applyTheme();
  syncRigs();
  rebuildCounts.lastSolo = project.dancers.length < 2;
  if (!project.counts.length) rebuildCounts();
  else {
    // adapt a saved routine to the current length, keeping everything
    project.counts = project.counts.map((c) => ({ ...c, locked: c.locked }));
    renderTimeline();
  }
  setView('front', true);
  if (project.music.kind === 'link' && project.music.url) loadLink(project.music.url, { quiet: true });
  else if (project.music.kind === 'file') setStatus(`Last time you used “${project.music.name}”. Upload it again to dance along (files stay on your device).`);
}

try {
  if (localStorage.getItem(HERO_KEY)) $('#weddingHero').hidden = true;
} catch {}
boot();
requestAnimationFrame(tick);

// Handy for debugging from the console: stepstudio.seekBeat(12)
window.stepstudio = {
  get project() {
    return project;
  },
  setStyle,
  seekBeat: (b) => seek(project.offset + b * beatLen()),
  camera,
  controls,
  setView
};
