# Azure Paper

Reference: `study/reference.mp4` (kept unedited, 720×1280 — measured on ×1.5 upscaled stills in `study/frames/`).
Contact sheets: `study/windows/`. Look: cool studio talking head (ad / explainer) whose lower frame melts into blur,
cutting to off-white grid-paper scenes with azure diamonds and navy headlines; dark frosted glass cards over the chest.

## Measured (1080×1920)
| Thing | Value |
|---|---|
| Framing | medium close-up: face (forehead→chin) ~340 px, eyes y ~470–520, centred; punch-ins to ~440 px face, eyes ~590 |
| Lower-frame blur | sharp above y ~1000, progressive blur to full (σ ~24) by y ~1300; darkens to near-black #080B0E from y ~1350 to 1760 (`speaker.lowBlur`) |
| Captions | centred on the blurred chest, first line ~y 1180–1240; Inter 500 ~44 px light grey connector words, Inter 600 ~54 px white key words, Instrument Serif italic ~66 px accent word; 1–2 lines, per-word reveal 0.3 s through a 9 px blur |
| Principle line | azure diamond ~150 px (#5DBDF0→#1D8EC4→#14699C, pale rim #E6F1F8) + letter-spaced kicker Inter 600 ~25 px (tracking .24em, 75 % white) + title Inter 600 ~56 px; exit: diamond turns 90° and shrinks, text blurs out |
| Glass card | rgba(52,56,66,.78)→rgba(30,33,40,.8), r 40, 1.5 px rim 12 % white, frosted (σ 18); title Inter 600 38 px, big number Inter 800 ~118 px + unit 600 54 px; pills r 999 — primary #9BD4FF on #0B2540, secondary rgba(18,58,104,.78) with #8CCBF0 text; cursor clicks a pill |
| Behind-head word | Inter 800 ~230 px white, half hidden by the head |
| Paper | #F2F0EC with 56 px grid at 5 % ink, white centre glow + warm edge vignette; light-blue #A6D6F5 four-point sparkles slowly turning |
| Paper type | kicker Inter 600 30 px #7A818C tracked; small Inter 500 46 px #1A1D24; heavy Inter 800 ~200 px navy #173A7A (-0.055em); serif Instrument Serif italic ~108 px #1F5FA8 |
| Diamond route | 140 px diamonds zig-zag (dx 330, dy 270), 2.5 px azure connector drawing as the next appears, labels Inter 500 54 px typing on |
| Bubble map | speaker in a white-rimmed circle; azure rings appear (spring, rotate), then fill with glowing azure bubbles + white Inter 600 labels; dashed spokes |
| Curve | azure 7 px line drawing up (power 1.8) with soft fill, white-ringed dot on the tip, pill tag at the end |
| Price card | struck grey old price (red #E0474C strike drawn 0.32 s), serif label, navy price counting to the offer, azure "save" pill |
| Cuts / transitions | hard cuts with a 0.22 s blur-out / 0.3 s blur-in on the footage; paper elements reveal through blur and leave blurred; ~one cut per 2–7 s |
| Colour | footage graded cool: green/teal band shifted toward teal, band sat ×0.62, val ×0.78 (`speaker.grade`) — keeps every speaker cohesive with azure |

## Placement
Overlays on the speaker use `style.json` → `anchors` (chin-relative, share of free room), so they adapt to the speaker's
framing. Paper scenes are full-screen, fixed layouts.

## Modes (pick by what is said)
| Speaker says | Use |
|---|---|
| Any phrase | `mixCaption` centred (grey sans + white bold key word + serif accent) |
| A numbered point / module / "you'll learn" | `badgeLine` |
| A number, plan, product, price or the CTA button | `glassCard` (count-up `big`, `pills`, `strike`, `cursor`) |
| "Do all three" / a short numbered set | `squareBadges` + `mixCaption` |
| One big word (name, NOW) | `wallWords` kind `heavy` + `behindHead` |
| Who it's for / 3 steps | `paperScene` + `paperTitle` + `diamondRoute` |
| The key claim | `paperScene` + `paperTitle` (small line / heavy navy word / serif line) + stars |
| Price / offer / value before–after | `paperScene` + `priceCard` |
| Things that connect / a hub (tools, skills) | `paperScene` with `speaker` circle + `bubbleMap` |
| Growth, levels, basics → advanced | `paperScene` + `curveChart` |
Worked example: `jobs/shabeeb-course-ad/work/make_plan.py`.
