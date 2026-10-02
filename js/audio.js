// Music sources (YouTube / YouTube Music, SoundCloud, uploaded file, microphone recording)
// behind one small interface, plus tempo detection for audio we can decode locally.

const loadScript = (() => {
  const cache = {};
  return (src) =>
    (cache[src] ||= new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    }));
})();

/** Figure out what kind of link the user pasted. */
export function parseMusicLink(raw) {
  const url = raw.trim();
  if (!url) return null;
  let u;
  try {
    u = new URL(url.startsWith('http') ? url : 'https://' + url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return { type: 'youtube', id: u.pathname.slice(1).split('/')[0], music: false };
  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    let id = u.searchParams.get('v');
    if (!id) {
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{6,})/);
      if (m) id = m[1];
    }
    if (id) return { type: 'youtube', id, music: host === 'music.youtube.com' };
  }
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com' || host === 'api.soundcloud.com' || host === 'snd.sc')
    return { type: 'soundcloud', url: u.href };
  if (/\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|$)/i.test(u.pathname)) return { type: 'audio-url', url: u.href };
  return null;
}

class BaseSource {
  constructor() {
    this.listeners = {};
    this.duration = 0;
    this.ready = false;
  }
  on(ev, fn) {
    (this.listeners[ev] ||= []).push(fn);
    return this;
  }
  emit(ev, ...a) {
    (this.listeners[ev] || []).forEach((f) => f(...a));
  }
  get canSetRate() {
    return false;
  }
  destroy() {}
}

/** Plays a local file / recording / direct audio URL through an <audio> element. */
export class FileSource extends BaseSource {
  constructor(src, host, label) {
    super();
    this.label = label;
    this.audio = new Audio();
    this.audio.src = src;
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.audio.preservesPitch = true;
    this.audio.controls = true;
    this.audio.className = 'native-audio';
    host.appendChild(this.audio);
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration;
      this.ready = true;
      this.emit('ready');
    });
    this.audio.addEventListener('play', () => this.emit('state', true));
    this.audio.addEventListener('pause', () => this.emit('state', false));
    this.audio.addEventListener('ended', () => this.emit('state', false));
    this.audio.addEventListener('error', () => this.emit('error', 'This audio file could not be played in your browser.'));
  }
  get canSetRate() {
    return true;
  }
  play() {
    return this.audio.play();
  }
  pause() {
    this.audio.pause();
  }
  get playing() {
    return !this.audio.paused && !this.audio.ended;
  }
  time() {
    return this.audio.currentTime;
  }
  seek(t) {
    this.audio.currentTime = Math.max(0, t);
  }
  setRate(r) {
    this.audio.playbackRate = r;
  }
  destroy() {
    this.audio.pause();
    this.audio.remove();
  }
}

/** YouTube & YouTube Music via the IFrame Player API. */
export class YouTubeSource extends BaseSource {
  constructor(videoId, host) {
    super();
    this.label = 'YouTube';
    const div = document.createElement('div');
    div.className = 'embed-frame';
    const inner = document.createElement('div');
    div.appendChild(inner);
    host.appendChild(div);
    this.el = div;
    this._playing = false;
    const boot = () => {
      this.player = new window.YT.Player(inner, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            this.duration = this.player.getDuration();
            this.ready = true;
            this.emit('ready');
          },
          onStateChange: (e) => {
            this._playing = e.data === 1;
            if (e.data === 1 && !this.duration) this.duration = this.player.getDuration();
            this.emit('state', this._playing);
          },
          onError: (e) => {
            const msg = e.data === 101 || e.data === 150 ? 'The owner of this track doesn’t allow it to be embedded. Try uploading the song file instead.' : 'YouTube could not play this video.';
            this.emit('error', msg);
          }
        }
      });
    };
    if (window.YT && window.YT.Player) boot();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev && prev();
        boot();
      };
      loadScript('https://www.youtube.com/iframe_api').catch((e) => this.emit('error', e.message));
    }
  }
  get canSetRate() {
    return true;
  }
  play() {
    this.player?.playVideo();
  }
  pause() {
    this.player?.pauseVideo();
  }
  get playing() {
    return this._playing;
  }
  time() {
    return this.player?.getCurrentTime ? this.player.getCurrentTime() : 0;
  }
  seek(t) {
    this.player?.seekTo(Math.max(0, t), true);
  }
  setRate(r) {
    this.player?.setPlaybackRate?.(r);
  }
  destroy() {
    try {
      this.player?.destroy();
    } catch {}
    this.el.remove();
  }
}

/** SoundCloud via the Widget API. Position updates are interpolated for smooth animation. */
export class SoundCloudSource extends BaseSource {
  constructor(url, host) {
    super();
    this.label = 'SoundCloud';
    const iframe = document.createElement('iframe');
    iframe.className = 'embed-frame sc';
    iframe.allow = 'autoplay';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false&color=%23e24d7a`;
    host.appendChild(iframe);
    this.el = iframe;
    this.pos = 0;
    this.stamp = performance.now();
    this._playing = false;
    loadScript('https://w.soundcloud.com/player/api.js')
      .then(() => {
        const W = window.SC.Widget;
        const w = (this.widget = W(iframe));
        w.bind(W.Events.READY, () => {
          w.getDuration((ms) => {
            this.duration = ms / 1000;
            this.ready = true;
            this.emit('ready');
          });
        });
        const upd = (e) => {
          if (e && typeof e.currentPosition === 'number') {
            this.pos = e.currentPosition / 1000;
            this.stamp = performance.now();
          }
        };
        w.bind(W.Events.PLAY_PROGRESS, upd);
        w.bind(W.Events.PLAY, (e) => {
          upd(e);
          this._playing = true;
          this.emit('state', true);
        });
        w.bind(W.Events.PAUSE, (e) => {
          upd(e);
          this._playing = false;
          this.emit('state', false);
        });
        w.bind(W.Events.FINISH, () => {
          this._playing = false;
          this.emit('state', false);
        });
        w.bind(W.Events.SEEK, upd);
        w.bind(W.Events.ERROR, () => this.emit('error', 'SoundCloud could not load this track (it may be private or region-locked).'));
      })
      .catch((e) => this.emit('error', e.message));
  }
  play() {
    this.widget?.play();
  }
  pause() {
    this.widget?.pause();
  }
  get playing() {
    return this._playing;
  }
  time() {
    return this._playing ? this.pos + (performance.now() - this.stamp) / 1000 : this.pos;
  }
  seek(t) {
    this.pos = Math.max(0, t);
    this.stamp = performance.now();
    this.widget?.seekTo(this.pos * 1000);
  }
  destroy() {
    this.el.remove();
  }
}

/** No music: an internal clock (with an optional metronome click handled by the app). */
export class ClockSource extends BaseSource {
  constructor(duration = 150) {
    super();
    this.label = 'Practice clock';
    this.duration = duration;
    this.t = 0;
    this.rate = 1;
    this._playing = false;
    this.ready = true;
    queueMicrotask(() => this.emit('ready'));
  }
  get canSetRate() {
    return true;
  }
  play() {
    this._playing = true;
    this.last = performance.now();
    this.emit('state', true);
  }
  pause() {
    this.time();
    this._playing = false;
    this.emit('state', false);
  }
  get playing() {
    return this._playing;
  }
  time() {
    if (this._playing) {
      const now = performance.now();
      this.t += ((now - this.last) / 1000) * this.rate;
      this.last = now;
      if (this.t >= this.duration) {
        this.t = this.duration;
        this._playing = false;
        this.emit('state', false);
      }
    }
    return this.t;
  }
  seek(t) {
    this.t = Math.max(0, Math.min(this.duration, t));
    this.last = performance.now();
  }
  setRate(r) {
    this.time();
    this.rate = r;
  }
}

// ---------------------------------------------------------------------------
// Microphone recording
// ---------------------------------------------------------------------------
export class Recorder {
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(250);
    this.started = performance.now();
  }
  stop() {
    return new Promise((resolve) => {
      this.rec.onstop = () => {
        this.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' }));
      };
      this.rec.stop();
    });
  }
}

// ---------------------------------------------------------------------------
// Tempo + downbeat detection (onset envelope → autocorrelation → comb-filter refinement)
// ---------------------------------------------------------------------------
export async function analyzeTempo(arrayBuffer, onProgress = () => {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
  ctx.close();
  onProgress('Listening for the beat…');

  const sr = 11025;
  const span = Math.min(buf.duration, 150);
  const off = new OfflineAudioContext(2, Math.ceil(span * sr), sr);
  const src = off.createBufferSource();
  src.buffer = buf;
  const lp = off.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 160;
  const hp = off.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  const merger = off.createChannelMerger(2);
  src.connect(lp).connect(merger, 0, 0);
  src.connect(hp).connect(merger, 0, 1);
  merger.connect(off.destination);
  src.start(0);
  const rendered = await off.startRendering();

  const hop = 0.005;
  const hopN = Math.round(sr * hop);
  const frames = Math.floor(rendered.length / hopN);
  const onset = new Float32Array(frames);
  for (let ch = 0; ch < 2; ch++) {
    const d = rendered.getChannelData(ch);
    const env = new Float32Array(frames);
    let max = 1e-9;
    for (let f = 0; f < frames; f++) {
      let s = 0;
      for (let j = f * hopN, e = j + hopN; j < e; j++) s += d[j] * d[j];
      env[f] = Math.log1p(1000 * Math.sqrt(s / hopN));
    }
    const diff = new Float32Array(frames);
    for (let f = 1; f < frames; f++) {
      diff[f] = Math.max(0, env[f] - env[f - 1]);
      if (diff[f] > max) max = diff[f];
    }
    for (let f = 0; f < frames; f++) onset[f] += diff[f] / max;
  }
  // light smoothing
  const sm = new Float32Array(frames);
  for (let f = 2; f < frames - 2; f++) sm[f] = (onset[f - 2] + 2 * onset[f - 1] + 3 * onset[f] + 2 * onset[f + 1] + onset[f + 2]) / 9;

  // 1) coarse autocorrelation, 55..200 bpm, weighted toward ~110 bpm
  let best = { score: -1, bpm: 120 };
  for (let bpm = 55; bpm <= 200; bpm += 0.5) {
    const lag = 60 / bpm / hop;
    const L0 = Math.floor(lag);
    const fr = lag - L0;
    let s = 0;
    for (let f = 0; f + L0 + 1 < frames; f += 2) s += sm[f] * (sm[f + L0] * (1 - fr) + sm[f + L0 + 1] * fr);
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 0.9, 2));
    s *= w;
    if (s > best.score) best = { score: s, bpm };
  }

  // 2) fine comb search for tempo + phase over the whole analysed span
  const at = (t) => {
    const x = t / hop;
    const i = Math.floor(x);
    if (i < 0 || i + 1 >= frames) return 0;
    return sm[i] * (1 - (x - i)) + sm[i + 1] * (x - i);
  };
  let fine = { score: -1, bpm: best.bpm, phase: 0 };
  for (let bpm = best.bpm - 1.5; bpm <= best.bpm + 1.5; bpm += 0.02) {
    const period = 60 / bpm;
    const nb = Math.floor((span - period) / period);
    for (let ph = 0; ph < period; ph += 0.01) {
      let s = 0;
      for (let b = 0; b < nb; b++) s += at(ph + b * period);
      if (s > fine.score) fine = { score: s, bpm, phase: ph };
    }
  }
  let bpm = fine.bpm;
  // produced music is almost always at a whole-number tempo; snapping avoids drift over a long song
  if (Math.abs(bpm - Math.round(bpm)) < 0.3) bpm = Math.round(bpm);
  const period = 60 / bpm;

  // 3) choose which of the 8 beats is "1": strongest low-end accent every 8 beats
  const low = rendered.getChannelData(0);
  const lowAt = (t) => {
    const i = Math.floor(t * sr);
    let s = 0;
    for (let j = i; j < i + hopN * 4 && j < low.length; j++) s += Math.abs(low[j]);
    return s;
  };
  let bestK = 0;
  let bestS = -1;
  for (let kk = 0; kk < 8; kk++) {
    let s = 0;
    for (let t = fine.phase + kk * period; t < span; t += period * 8) s += lowAt(t) + at(t) * 50;
    if (s > bestS) {
      bestS = s;
      bestK = kk;
    }
  }
  const offset = (fine.phase + (bestK % 4) * period) % (period * 8);
  return { bpm: Math.round(bpm * 10) / 10, offset: Math.round(offset * 1000) / 1000, duration: buf.duration };
}
