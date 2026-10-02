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

/** One shared AudioContext for playback and the metronome; call from a click/tap so it is allowed to start. */
let sharedCtx = null;
export function audioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!sharedCtx && AC) sharedCtx = new AC();
  if (sharedCtx && sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

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

/**
 * Plays decoded audio through Web Audio. Used when the page isn't allowed to stream a local file
 * into an <audio> element (some embedded/sandboxed hosts block that), and it keeps tight beat sync.
 */
export class BufferSource extends BaseSource {
  constructor(arrayBuffer, label) {
    super();
    this.label = label;
    this.rate = 1;
    this.offset = 0;
    this._playing = false;
    this.ctx = audioContext();
    this.ctx
      .decodeAudioData(arrayBuffer)
      .then((buf) => {
        this.buffer = buf;
        this.duration = buf.duration;
        this.ready = true;
        this.emit('ready');
      })
      .catch(() => this.emit('error', 'This audio file could not be decoded by your browser. Try an MP3 or WAV.'));
  }
  get canSetRate() {
    return true;
  }
  _start() {
    const node = this.ctx.createBufferSource();
    node.buffer = this.buffer;
    node.playbackRate.value = this.rate;
    node.connect(this.ctx.destination);
    node.onended = () => {
      if (this.node === node && this._playing) {
        this._playing = false;
        this.offset = this.duration;
        this.emit('state', false);
      }
    };
    node.start(0, Math.min(this.offset, Math.max(0, this.duration - 0.01)));
    this.node = node;
    this.startedAt = this.ctx.currentTime;
  }
  _stop() {
    if (!this.node) return;
    const n = this.node;
    this.node = null;
    try {
      n.stop();
    } catch {}
  }
  play() {
    if (!this.buffer || this._playing) return;
    if (this.offset >= this.duration - 0.05) this.offset = 0;
    audioContext();
    this._start();
    this._playing = true;
    this.emit('state', true);
  }
  pause() {
    if (!this._playing) return;
    this.offset = this.time();
    this._playing = false;
    this._stop();
    this.emit('state', false);
  }
  get playing() {
    return this._playing;
  }
  time() {
    if (!this._playing) return this.offset;
    return Math.min(this.duration, this.offset + (this.ctx.currentTime - this.startedAt) * this.rate);
  }
  seek(t) {
    const was = this._playing;
    if (was) this._stop();
    this.offset = Math.max(0, Math.min(this.duration || 0, t));
    if (was) this._start();
  }
  setRate(r) {
    if (this._playing) {
      this.offset = this.time();
      this._stop();
      this.rate = r;
      this._start();
    } else this.rate = r;
  }
  destroy() {
    this._playing = false;
    this._stop();
  }
}

const YT_ERRORS = {
  2: 'That YouTube link has an invalid video ID.',
  5: 'YouTube couldn’t play this video in the embedded player.',
  100: 'That YouTube video was removed or is private.',
  101: 'The owner of this track doesn’t allow it to be embedded. Try uploading the song file instead.',
  150: 'The owner of this track doesn’t allow it to be embedded. Try uploading the song file instead.'
};
const YT_PLAYING = 1;

/**
 * YouTube & YouTube Music.
 * Normally driven by the official IFrame Player API (youtube.com/iframe_api). Some hosts — e.g. sandboxed
 * previews — block that script, so if it can't load we embed the player iframe directly and drive it with
 * the same postMessage protocol the API uses under the hood (enablejsapi=1).
 */
export class YouTubeSource extends BaseSource {
  constructor(videoId, host) {
    super();
    this.label = 'YouTube';
    this.videoId = videoId;
    const div = document.createElement('div');
    div.className = 'embed-frame';
    host.appendChild(div);
    this.el = div;
    this._playing = false;
    this.pos = 0;
    this.stamp = performance.now();
    this.rate = 1;
    if (window.YT && window.YT.Player) this._bootApi();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev && prev();
        if (!this.raw && !this.dead) this._bootApi();
      };
      loadScript('https://www.youtube.com/iframe_api').catch(() => !this.dead && this._bootRaw());
      // a script that never answers (blocked silently) also falls back
      this._apiTimer = setTimeout(() => !this.player && !this.raw && !this.dead && this._bootRaw(), 6000);
    }
  }

  _bootApi() {
    clearTimeout(this._apiTimer);
    const inner = document.createElement('div');
    this.el.appendChild(inner);
    this.player = new window.YT.Player(inner, {
      videoId: this.videoId,
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          this.duration = this.player.getDuration();
          this._ready();
        },
        onStateChange: (e) => this._state(e.data),
        onError: (e) => this.emit('error', YT_ERRORS[e.data] || 'YouTube could not play this video.')
      }
    });
  }

  _bootRaw() {
    this.raw = true;
    const iframe = document.createElement('iframe');
    const origin = location.origin && location.origin !== 'null' ? `&origin=${encodeURIComponent(location.origin)}` : '';
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(this.videoId)}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1${origin}`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.title = 'YouTube player';
    iframe.style.cssText = 'width:100%;height:100%;border:0';
    this.el.appendChild(iframe);
    this.iframe = iframe;
    this._onMsg = (e) => {
      if (e.source !== iframe.contentWindow) return;
      let d;
      try {
        d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!d || !d.event) return;
      if (d.event === 'onReady') this._ready();
      else if (d.event === 'onStateChange') this._state(d.info);
      else if (d.event === 'onError') this.emit('error', YT_ERRORS[d.info] || 'YouTube could not play this video.');
      else if (d.event === 'infoDelivery' && d.info) {
        const i = d.info;
        if (typeof i.duration === 'number' && i.duration > 0 && !this.duration) {
          this.duration = i.duration;
          if (this.ready) this.emit('ready');
        }
        if (typeof i.currentTime === 'number') {
          this.pos = i.currentTime;
          this.stamp = performance.now();
        }
        if (typeof i.playerState === 'number') this._state(i.playerState);
        if (!this.ready && (i.duration || i.playerState !== undefined)) this._ready();
      }
    };
    window.addEventListener('message', this._onMsg);
    // keep saying hello until the player starts talking back
    const hello = () => {
      this._post({ event: 'listening', id: 'stepstudio', channel: 'widget' });
      for (const ev of ['onReady', 'onStateChange', 'onError']) this._cmd('addEventListener', [ev]);
    };
    iframe.addEventListener('load', hello);
    this._hello = setInterval(() => (this.ready ? clearInterval(this._hello) : hello()), 500);
  }

  _post(msg) {
    try {
      this.iframe?.contentWindow?.postMessage(JSON.stringify(msg), 'https://www.youtube.com');
    } catch {}
  }
  _cmd(func, args = []) {
    this._post({ event: 'command', func, args, id: 'stepstudio', channel: 'widget' });
  }
  _ready() {
    if (this.ready) return;
    this.ready = true;
    clearInterval(this._hello);
    this.emit('ready');
  }
  _state(code) {
    const playing = code === YT_PLAYING;
    if (this.player && playing && !this.duration) this.duration = this.player.getDuration();
    if (playing === this._playing) return;
    if (this.raw) {
      this.pos = this.time();
      this.stamp = performance.now();
    }
    this._playing = playing;
    this.emit('state', playing);
  }

  get canSetRate() {
    return true;
  }
  play() {
    if (this.raw) this._cmd('playVideo');
    else this.player?.playVideo?.();
  }
  pause() {
    if (this.raw) this._cmd('pauseVideo');
    else this.player?.pauseVideo?.();
  }
  get playing() {
    return this._playing;
  }
  time() {
    if (!this.raw) return this.player?.getCurrentTime ? this.player.getCurrentTime() : 0;
    // the iframe reports its position a few times a second; interpolate in between for smooth dancing
    return this._playing ? this.pos + ((performance.now() - this.stamp) / 1000) * this.rate : this.pos;
  }
  seek(t) {
    t = Math.max(0, t);
    if (this.raw) {
      this.pos = t;
      this.stamp = performance.now();
      this._cmd('seekTo', [t, true]);
    } else this.player?.seekTo?.(t, true);
  }
  setRate(r) {
    if (this.raw) {
      this.pos = this.time();
      this.stamp = performance.now();
      this.rate = r;
      this._cmd('setPlaybackRate', [r]);
    } else this.player?.setPlaybackRate?.(r);
  }
  destroy() {
    this.dead = true;
    clearTimeout(this._apiTimer);
    clearInterval(this._hello);
    if (this._onMsg) window.removeEventListener('message', this._onMsg);
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
