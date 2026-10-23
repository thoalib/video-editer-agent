# Editorial Blue

Reference: `study/reference.mp4` (kept unedited). Contact sheets: `study/windows/`, stills: `study/frames/`.
Look: warm personal intro in front of a round blue light; magazine typography; punch-in cuts; paper and film-card inserts.

## Measured (1080×1920)
| Thing | Value |
|---|---|
| Captions | small Inter Light Italic ~46 px line + big Tinos Bold Italic ~100 px key words, centred, soft shadow; placed where the frame is empty: chest, beside the head ("I'm" left / name right), above the head |
| Between key phrases | Inter Light Italic ~48 px, centred, y ~1125 |
| Punch-in cuts | speaker shots alternate zoom (~1.15 ↔ 1.35) with a 1.08× open settle |
| Paper frame | cream #F1EEE8, speaker in [75,495,930,930], thin dark guide lines along the frame edges full-bleed, navy #0E2A8A 5-point stars (one sharp top-left, one big blurred bottom-right, slowly rotating), navy label box with white Tinos italic ~84 px typed with a caret |
| Film b-roll | white flash in (bloom), black bg, rounded card [22,160,1036,1630] r 26 with dark rough edge, grain, white Tinos italic label centred y ~950; a new clip + label every ~1.2 s |
| Selection box | dashed white box + navy square handles grows over the key word while a blue cursor drags |
| Icons behind head | rounded app-icon tiles pop (spring) on the wall, slightly blurred, occluded by the head |
| Heavy word | Inter Black Italic ~190 px uppercase behind the head ("VIDEO EDITOR") |
| Glass bubble | round frosted pill behind a bold-italic 2-line question |
| Desk text | heavy italic, ~45 % white, lying on the desk in perspective, letters revealed |
| Arc text | small text running along the round light |
| Emoji pop | white circle + blue glyph popping beside "DM me" |

## Placement
Pixel values above are what the reference measured. In edits, overlays on the speaker are placed by
`style.json` → `anchors` (relative to the face: chin / eyes / face edges, distance as a share of the free room),
so they adapt to the new speaker's framing. Full-screen layouts keep fixed positions.

## Modes
| Speaker says | Use |
|---|---|
| Name / intro | two `mixCaption`s split around the head (thin left, serif right) |
| A skill / title / key phrase | `mixCaption` thin + serif (+ `selectBox` with `target` for design/editing topics) |
| Ordinary words | `wordFlash` |
| A fact with a number ("6 years") | `paperFrame` shot with `label` |
| A list of activities / skills | `filmCards` shot (bloom in/out), one b-roll clip per item |
| Tools / apps named | `iconPop` behind the head |
| Job title / big claim | `wallWords` kind `heavy` + `behindHead` |
| A question / feeling | `mixCaption` with `bubble` |
| CTA (follow / DM / if you want to) | `floorText`, `arcText`, `mixCaption` + `emojiPop` |
Worked example: `jobs/_style-test/work/plan_editorial.json`.
