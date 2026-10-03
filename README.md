# StepStudio 3D — Dance Choreography Creator

A browser app that choreographs a dance to your song and teaches it with animated 3D dancers, count by count.

## Features

- **Made for couples**: every routine is a duet for a lead and a follow (name, outfit, skin tone and colour for each; swap who leads with one click). The partners stay together in a hold and only separate for spin-outs and tricks.
- **Five duet styles**: Classic Romantic (sways, waltz box, turns, reveal, lifts), **Country Swing** (the slow-slow-quick-quick basic, inside turn, spin-out, cuddle, lap sit, hip lift, slide-through, cradle carry, aerial flip, death-drop finale), Jazz, Lyrical and Hip-Hop.
- **Difficulty bar**: five ticks from Beginner to Showstopper. Each move has a level; the routine uses moves up to the chosen level, keeps a basic at the start of each phrase and saves the biggest move (lifts and tricks at higher levels) for the end of it.
- **Music from anywhere**
  - Paste a **SoundCloud**, **YouTube Music**, YouTube / youtu.be or direct `.mp3` link (played through the official embed players).
  - **Upload** a song file (MP3, WAV, M4A, OGG, even video files). The tempo and first beat are **detected automatically**.
  - **Record** your own music with the microphone, or practise with **no music** using a metronome and a "5, 6, 7, 8" count-in.
  - **TAP** tempo (or press `T`) syncs streamed tracks; you can also enter BPM / start time by hand.
- **3D teaching stage**: front, follow-along (behind), side and top cameras, a mirror toggle, a **Mannequin** view (tan drawing-guide bodies with grid lines and an outline, so every step is visible even under the gown), 0.5× and 0.75× practice speeds and looping of any 8-count.
- **Live cues**: a big count display, the current count's instruction, the full 8-count breakdown and what's next.
- **Timeline editor**: swap any 8-count for a different move (even from another style); hand-picked moves are pinned 📌 and kept when you **Remix**.
- **First dance planner**: trim the routine to 1:30–3:00, choose the grand finale, couple names, a rehearsal checklist and safety tips.
- **Save and share**: autosaves in the browser; export / import a project as JSON and print a cue sheet.

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
| `js/rig.js`     | Procedural human dancer: skeleton + smooth skinned body and clothes, face, hair, hands, a cloth-like skirt; pose format, forward kinematics, automatic foot planting |
| `js/moves.js`   | Duet move library (lead/follow keyframe tracks, difficulty levels, lifts), solo-to-duet converter, styles, routine generator |
| `js/model.js`   | Loads the rigged groom/bride glTF models and retargets the driver skeleton's pose onto their bones (with their own foot planting) |
| `js/engine.js`  | Turns song beat + project into per-dancer poses: easing per style, groove layer, formations, canon, couples, blending between moves |
| `js/audio.js`   | Music sources (YouTube, SoundCloud, file, Web Audio fallback, clock), microphone recorder, tempo and downbeat detection |
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

Every move provides `lead` and `follow` tracks plus a `level` (1–5). Solo material can be partnered with `duet(solo, { hold })`, which mirrors it for the follow. Set `air: 1` and `root.lift` on a pose to lift a dancer off the floor.

## 3D characters

The **Real** look uses two rigged models from `models/` (the Stylized and Mannequin looks are built in code):

- **Groom**: “Man dressed in suit”, made with [MakeHuman](https://www.makehumancommunity.org/) (CC0). Converted from Collada to glTF.
- **Bride**: “[Casual Woman in Brown Dress Rigged Idle](https://sketchfab.com/3d-models/casual-woman-in-brown-dress-rigged-idle-b38456c89bf94323aa3c079f27e435ce)” by [florah](https://sketchfab.com/florah), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Optimised for the web (simplified mesh, WebP textures, quantised); the brown dress is recoloured ivory in the texture and a floor-length satin skirt is added in code (`js/model.js`).

Models are stored as glTF JSON (`.json`, buffers embedded) with `.webp` textures so they can be served from any static host. Any humanoid glTF with a Mixamo or MakeHuman skeleton can be swapped in: add it to `MODELS` in `js/model.js` (and its bone names to `BONES` if they differ).

## Notes

- Some tracks are blocked from embedding by their owners (YouTube error 101/150). The app suggests uploading the file instead.
- Inside sandboxed previews the YouTube/SoundCloud players may be blocked entirely; the app says so after a few seconds. Uploaded songs still play (through Web Audio if the page can't use an `<audio>` element).
- Tempo can't be auto-detected for streamed tracks because browsers don't give pages access to that audio. Use TAP for those.
- SoundCloud's widget doesn't support playback speed, so the speed control only works with YouTube, uploads and the metronome.
