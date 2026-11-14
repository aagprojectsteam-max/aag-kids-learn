# AAG Kids Learn ("בואו נלמד!")

A Hebrew, RTL learning app for a young child (built for a 4-year-old with Down syndrome):
colors, shapes, animals, letters, family and friends — plus optional food, vehicles, body parts and numbers.
It is a web port (PWA) of an earlier SwiftUI app that ran in Swift Playgrounds, with many additions.

## Principles

- Errorless learning: a wrong tap never produces a "wrong" sound; the wrong option dims and the right one is hinted.
- Big touch targets, everything is spoken, few choices at a time (2 by default).
- The parent area opens only with a 1.5 s long-press on the gear; a child lock hides it completely.
- All data (photos, voice recordings, settings, progress) stays on the device. There is no server and no account.

## Files

| File | Role |
|---|---|
| `index.html` | Shell page |
| `styles.css` | All styling |
| `data.js` | Content: categories, items, roles, shape drawings |
| `app.js` | Logic: screens, speech, recording, photos, settings, backup |
| `sw.js` | Offline cache (stale-while-revalidate). Bump `CACHE` when the file list changes |
| `manifest.webmanifest`, `icons/` | Home-screen install |

No build step and no dependencies.

## Run locally

```bash
python3 -m http.server 18431 --bind 127.0.0.1 -d /mnt/data/MyProjects/AAG-Kids-Learn
```

Then open `http://localhost:18431` (8765 is taken by AnkiConnect on the laptop). Recording and the offline cache need a secure context
(HTTPS, or `localhost`), so the iPad needs an HTTPS address to install the app and record voices.

## Storage

- `localStorage` key `kl:settings` — settings, people list, progress.
- IndexedDB `aag-kids-learn`, store `kv` — `photo:<id>` and `voice:<id>` as `{type, buf}`.
- Backup: parent area → "גיבוי" exports/imports one JSON file with everything (media as base64).

## Adding content

Add an item to the matching array in `data.js` (`thing(prefix, id, word, say, theSay, emoji, sound)`),
or a new entry in `CATS`. `say` is the pointed (niqqud) text used by the speech engine.
