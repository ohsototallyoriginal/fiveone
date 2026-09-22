# Five-One

A private sandbox for nights with **Angela “Ang” Abraham**. Workshop-first. One character. Same-size or giantess. Digestion is a night module, not her whole personality.

This repo is the v1 shell: gate, workshop, play loop, meters, local saves. Gemini and live stills are stubbed on purpose.

## What works now

- Device key (PIN) so the page is not an open door
- Front door: locked → continue a night if one exists, else workshop
- Player plates: Anonymous, Conor, or Custom
- Night tags: size, awareness, intent, tone, sleep, gut
- Say / Do composer and the action dock
- Depth + digest + bowel meters (giantess nights)
- Local save / resume on this browser

## What is waiting

- Supabase (cross-device chats) — walkthrough when we get there
- Gemini actor (Cloud Run or Edge Function on your Google Cloud project)
- Real stills and shot-picking — stage is a placeholder

## Run it locally

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

GitHub Pages: put this folder at the repo root (or `/docs`) and enable Pages.

## Config

Edit `config.js` when you have cloud pieces:

- `supabaseUrl` / `supabaseAnon`
- `actorUrl` (Gemini proxy)
- `invitePin` optional shared PIN if you want a fixed key instead of “set one on first visit”

## Character rule

Nights can change scale and mood. They cannot change who Ang is.
See `guide.js`.
