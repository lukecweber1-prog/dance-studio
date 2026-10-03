# StepStudio 3D — Dance Choreography Creator

A browser app that choreographs a dance to your song and teaches it with animated 3D dancers, count by count.

## Features

- **Music from anywhere**
  - Paste a **SoundCloud**, **YouTube Music**, YouTube / youtu.be or direct `.mp3` link (played through the official embed players).
  - **Upload** a song file (MP3, WAV, M4A, OGG, even video files). The tempo and first beat are **detected automatically**.
  - **Record** your own music with the microphone.
  - Or practise with **no music** using a metronome and a "5, 6, 7, 8" count-in.
  - **TAP** tempo (or press `T`) syncs streamed tracks: tap on every beat starting on a "1". You can also enter BPM / start time by hand, halve or double it, nudge it, or click **Set "1" now**.
- **5 styles, 35 moves**: Jazz, Lyrical, Hip-Hop, Swing (solo and partner) and the featured **Wedding First Dance**.
- **3D teaching stage**: front, follow-along (behind), side and top cameras, plus a mirror toggle, practice speeds of 0.5× and 0.75×, and looping of any 8-count.
- **Live cues**: a big count display, the current count's instruction, the full 8-count breakdown and what's next.
- **Groups**: up to 8 dancers, each with their own name, colour, outfit (casual, suit with tie, or sleeveless dress with sandals), hair (short, long or bun), skin tone and lead/follow role. Choose a formation (line, V, staggered, circle, diagonal), add a canon/ripple, or mirror every other dancer. In partner styles, leads and follows pair up into couples automatically.
- **Timeline editor**: the routine follows the song's structure (intro, verse, chorus, bridge, finale). Swap any 8-count for a different move (even from another style). Moves you pick by hand are pinned 📌 and kept when you **Remix**.
- **Wedding mode** 💍: a couple in a charcoal suit and a knee-length dress dancing in a bright, warm studio, a beginner-friendly first-dance structure (sway, box step, underarm spin, open-out reveal, cuddle wrap, promenade), a choice of finale (dramatic dip or twirl and kiss), trimming the routine to 1:30–3:00, editable couple names, a rehearsal checklist and safety tips.
- **Save and share**: your work autosaves in the browser. You can also export or import a project as JSON and print a cue sheet.

## Running it

It is a static site with no build step. ES modules need to be served over HTTP:

```bash
cd dance-studio
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static host works, e.g. GitHub Pages or Netlify. Three.js is loaded from the jsDelivr CDN. The YouTube and SoundCloud players load from their official domains.

## Keyboard

| Key       | Action                   |
| --------- | ------------------------ |
| Space     | Play / pause             |
| ← / →     | Previous / next 8-count  |
| T         | Tap tempo                |
| L         | Loop the current 8-count |

## Code map

| File            | What it does                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `js/rig.js`     | Procedural articulated dancer, pose format, forward kinematics, automatic foot planting          |
| `js/moves.js`   | Move library (keyframed 8-counts, partner tracks), style definitions, routine generator          |
| `js/engine.js`  | Turns song beat + project into per-dancer poses: easing per style, groove layer, formations, canon, couples, blending between moves |
| `js/audio.js`   | Music sources (YouTube, SoundCloud, file, clock), microphone recorder, tempo and downbeat detection |
| `js/main.js`    | Three.js stage, UI, timeline, wedding planner, persistence                                       |

### Adding a move

Each move is a list of `[beat, pose]` keyframes across 8 beats. A pose only lists what differs from neutral.
Limbs are `[raise, direction, twist, bend]` in degrees:

- `raise`: 0 = hanging down, 90 = horizontal, 180 = overhead.
- `direction`: 0 = out to the side, 90 = forward, −90 = back.

```js
{ id: 'my-move', name: 'My Move', level: 'Beginner', desc: '…', cues: ['1…', '2…', /* 8 cues */],
  keys: [k(0, {}), k(2, { lArm: [150, 10, 0, 5], squat: 20 }), k(8, {})] }
```

Partner moves provide `lead` and `follow` tracks instead of `keys`.

## Notes

- Some tracks are blocked from embedding by their owners (YouTube error 101/150). The app suggests uploading the file instead.
- Tempo can't be auto-detected for streamed tracks because browsers don't give pages access to that audio. Use TAP for those.
- SoundCloud's widget doesn't support playback speed, so the speed control only works with YouTube, uploads and the metronome.
