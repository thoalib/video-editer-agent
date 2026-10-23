# Violet Tutorial

Reference: `study/reference.mp4` (kept unedited). Contact sheets: `study/windows/`, full-res stills: `study/frames/`.
Look: purple-lit talking head; tutorial "N steps" breakdowns that cut to full-screen step screens.

## Measured (1080×1920; reference was 720×1280 ×1.5)
| Thing | Value |
|---|---|
| Key-phrase caption | Great Vibes script ~104 px + Inter 400 ~46 px + Inter 700 ~60 px on one line; line 2 indented right (cascade); group left edge ~150, first baseline ~y 1070 (chest, left of the mic) |
| Word reveal | per word, 0.28 s, opacity 0→1 through a ~10 px blur, rise 0.12 em |
| Between key phrases | one word / short phrase at a time, Inter 700 ~62 px, centred x 540, y ~1080 |
| Step badges | rotated rounded square, gradient #B47CFF→#7B2FF2→#4F12B8, lavender rim #E3D2FF, purple glow; row y ~1440 at x 310/540/770, ~150 px; spring pop staggered 0.2 s; the active one flies beside the caption |
| Step screen | bg #090D26 → #121140 → #46127F (bottom glow); badge 190 px at (248,446); title Montserrat 600 ~42 px typed; card [153,582,423,753] r 27, rim #C9A2FF 4 px + glow; card zooms up from ~32 % (spring); ✦ bullets Montserrat 500 ~28 px at x ~634 typing ~40 cps; footer Montserrat 500 ~31 px centred at y ~1435; camera drifts in ~6 % over the shot |
| Card row (hook) | 270×480 cards, 57 px gap, white-lavender rim + glow, y 232, scroll left ~60 px/s, behind the head |
| Video card | glass 726×234 at (177,1326), r 22, thumbnail + 2-line title Inter 600 + channel + description; footage blurred under it |
| Leader labels | 2 px white line drawn 0.3 s, Montserrat 500 ~22 px label typing on |
| Cuts | hard cuts between speaker and step screens (no flash); speaker shots open ~1.08× and settle |

## Placement
Pixel values above are what the reference measured. In edits, overlays on the speaker are placed by
`style.json` → `anchors` (relative to the face: chin / eyes / face edges, distance as a share of the free room),
so they adapt to the new speaker's framing. Full-screen layouts keep fixed positions.

## Modes (pick by what is said)
| Speaker says | Use |
|---|---|
| Hook / key claim | `mixCaption` (script word + sans + bold) — optionally `cardRow` behind the head when showing examples |
| Ordinary words between key phrases | `wordFlash` |
| "There are N steps / things" | `mixCaption` + `diamondBadges` (fly the first one beside the next caption) |
| "First / second… is X" | `diamondBadge` beside a `mixCaption` |
| Explaining one step in detail | `stepCard` shot (num, title, media image/b-roll/speaker, bullets, footer) |
| Pointing at details of a result | `stepCard` with `header:false` + `leaderLabel`s |
| "Watch the full video / link below" | `videoCard` |
Templates: `skills/motion-templates`. Worked example: `jobs/_style-test/work/plan_violet.json`.
