# Teal Tech

Reference: `study/reference.mp4` (kept unedited). Contact sheets: `study/windows/`, stills: `study/frames/`.
Look: teal-blue backdrop, ONE continuous speaker shot (no cuts); all graphics are HUD/glass overlays on the speaker.
Captions use the same mixed-type system as Violet Tutorial.

## Measured (1080×1920)
| Thing | Value |
|---|---|
| Captions | same as Violet: Great Vibes + Inter 400/700 cascade, blur reveal 0.28 s; single words Inter 700 ~62 px at y ~1080 |
| Ring stat | arc #46E1EC 26 px + cyan glow on a dark track, r ~210 at (540,1265); counts 1→value over ~1.6 s (ease in-out); number Montserrat 700, 2-line label under it; then shrinks to r ~140 and slides to (~290,1120) |
| ▶ bullet rows | white triangles ~40 px with soft glow, Montserrat 500 ~30 px, start x ~470, rows ~90 px apart, typing on |
| Glass panel | [312,975,456,520] r 18, blue gradient glass, footage blurred under it; title Montserrat 400 ~38 px centred, glowing cyan bar, ✦ rows Montserrat ~27 px; rises/grows from the chest |
| Product card | [138,1053,534,405] light-teal glass, dark inner screen with cyan rim, title Inter 600 ~30 px, 2-line description; ✦ list to its right |
| Rating | "Your edits" label + 5 outline stars, first lights cyan with glow |
| Comment CTA | 300 px rounded logo tile at (142,968), "Comment:" Inter 800 ~78 px, “KEYWORD” Inter 700 ~40 px, small line Montserrat ~32 px typing |
| Camera | opens ~1.19× at the very start and settles ~0.7 s; otherwise static |

## Placement
Pixel values above are what the reference measured. In edits, overlays on the speaker are placed by
`style.json` → `anchors` (relative to the face: chin / eyes / face edges, distance as a share of the free room),
so they adapt to the new speaker's framing. Full-screen layouts keep fixed positions.

## Modes
| Speaker says | Use |
|---|---|
| Hook / key claim | `mixCaption` (+ `ratingStars` for "your edits / level") |
| Ordinary words | `wordFlash` |
| A number / percentage / statistic | `ringStat`, then `move` it aside and add `bulletList` (`icon:"arrow"`) for the reasons |
| A named set ("the fundamentals of…") | `glassPanel` |
| A course / product / tool | `productCard` + `bulletList` (sparkle) |
| "Comment X and I'll send it" | `commentCta` |
Worked example: `jobs/_style-test/work/plan_teal.json`.
