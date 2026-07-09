# Sumaya Restro — Sales Demo Video

**Restaurant:** Spice Garden (`/r/spice-garden`)  
**Output:** `demo-video/output/SumayaRestro_SpiceGarden_Demo.mp4`

## What you get

An 18-scene end-to-end walkthrough with **real screen capture** (production: https://sumaya-web.onrender.com) and **AI voice narration** covering:

| # | Scene | Role |
|---|-------|------|
| 1 | Platform introduction | Public |
| 2 | Super admin dashboard | `admin@sumayaresto.com` |
| 3 | Branded restaurant landing | Public |
| 4 | Customer registration | New customer signup |
| 5 | Customer online ordering | Customer |
| 6 | Public table reservation | Guest (no login) |
| 7 | Guest waitlist | Guest (no login) |
| 8 | Waiter table floor | `waiter@spice-garden.com` |
| 9 | Waiter POS at table | Waiter |
| 10 | Kitchen KOT workflow | `kitchen@spice-garden.com` |
| 11 | Cashier billing | `cashier@spice-garden.com` |
| 12 | Staff reservations | Waiter |
| 13 | Staff waitlist | Waiter |
| 14 | Inventory management | `inventory@spice-garden.com` |
| 15 | Supplier management | Inventory |
| 16 | Owner dashboard, menu, staff, branches | `owner@spice-garden.com` |
| 17 | Notifications | Owner |
| 18 | Closing | Public |

**Password for all accounts:** `Sumaya@123`

## Do you need to contribute anything?

**No** — the video is generated automatically. Optional improvements if you want a *premium* sales version:

1. **Your own voice** — Re-record narration using `scenes.json` (each scene has a `narration` field). Tools: OBS + your mic, or replace MP3s in `output/audio/`.
2. **Logo intro/outro** — Add a 5-second branded bumper in any video editor before/after the MP4.
3. **Re-record after UI deploy** — Run `npm run build` again after pushing web changes so screens match latest UI.

## Regenerate the video

```powershell
cd demo-video
npm install
npx playwright install chromium
python generate-voice.py    # narration MP3s
node record.mjs             # screen recordings (~8 min)
powershell -File assemble.ps1 # merge into final MP4
```

Or one command: `npm run build`

## Customer registration fix

Customer self-registration was already built at `/r/:slug/customer/login`. A bug where register didn't sync login state (redirect loop to login) has been fixed in `AuthContext.tsx`.

## Files

- `scenes.json` — Full narration script + automation steps (edit to customize)
- `record.mjs` — Playwright screen recorder
- `generate-voice.py` — Edge TTS voice (en-IN-NeerjaNeural)
- `assemble.ps1` — ffmpeg merge

## Manual recording alternative

If you prefer recording yourself with OBS/Loom:

1. Open `scenes.json` — read each `narration` block aloud while performing the `path` + `actions`.
2. Use production URL: https://sumaya-web.onrender.com
3. Follow scene order for a logical story arc.
