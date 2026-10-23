---
name: motion-templates
description: Catalog of the engine's shot and graphic templates, how to choose them for content, their parameters, and how to write a new one. Use while designing plan.json.
---

# Motion templates

Templates live in `engine/templates/*.js`. Each reads its look from the job's style
(`styles/<name>/style.json` tokens via `S('path')`), so the same plan restyles by changing `style`.
Plan format: `docs/plan-schema.md`. Words are `[text, t]` (timeline seconds).

## Choose by content

| What is said | Treatment | Templates |
|---|---|---|
| Hook / headline / key claim | Small line + big key words near the chest, underline on the key word | `chestCaption` |
| Speaker first appears | Name + role pill | `nameTag` |
| Short aside, emphasis beside the face | Triangle pointer + line by the mouth | `pointerCaption` |
| Two or three punchy words | Big words on the wall, optionally behind the head | `wallWords` (+ masks) |
| List / features / "3 things" | Card writes each row as it is spoken; footage dims behind | `listCard` (layer screen) + `speaker` `fx` dim |
| Growth / result / number going up | Line chart draws on | `neonChart` |
| Conditions / steps in a sentence | Speaker in a circle + stacked pointer lines | `circleSpeaker` + `pointerLines` |
| Contrast "X or Y, the big picture" | Mixed-size stacked words | `stackedCaption` |
| Before/after, free vs paid, app demo | Phone frame swiping through self-made screens | `phone` + `chatMock` (in) |
| Side-by-side comparison | Rounded cards, speaker + content | `splitScreen` (+ elements in cards) |
| Process / journey / steps to a result | Map with markers per step, reward badge | `routeMap` |
| Short labels / benefits | Pills added one by one | `pillChips`, `tagRow` |
| Confirmation / one rule | Icon + line | `checkLine`, `calloutLine` |
| B-roll mood | Colour gradient from the bottom | `accentGradient` |
| Full spoken captions | One phrase at a time, active word | `subtitles` |
| Key phrase in mixed type (script/serif word + sans + bold, cascading) | Blur reveal per word | `mixCaption` |
| Ordinary words between key phrases | One word / short phrase at a time at chest | `wordFlash` |
| "N steps / things" | Diamond badges pop in a row, one flies beside the next caption | `diamondBadges`, `diamondBadge` |
| Explaining one step in depth | Full-screen step screen: badge + title, glowing card, typed sparkle bullets, footer | `stepCard` (shot) |
| Pointing at parts of a result | Line + small typed label | `leaderLabel` |
| Hook showing examples / past work | Glowing image cards scrolling behind the head | `cardRow` |
| "Watch the full video" | Glass YouTube-style card | `videoCard` |
| A number / percentage | Count-up glowing ring, slides aside for reasons | `ringStat` + `bulletList` (arrow) |
| Reasons / items beside the speaker | ▶ or ✦ rows typing on | `bulletList` |
| A named set of items | Frosted glass panel with title + bar + rows | `glassPanel` |
| A course / product / tool | Glass product card (+ list) | `productCard` |
| Quality / level | Star rating | `ratingStars` |
| "Comment KEYWORD" | Logo tile + Comment: + keyword | `commentCta` |
| A fact with a number ("6 years") | Speaker framed on grid paper, stars, typed label box | `paperFrame` (shot) |
| A list of activities shown | Film-grain b-roll cards with serif labels (bloom in) | `filmCards` (shot) + `broll` |
| Design / editing topic word | Selection box + cursor over the word | `selectBox` (`target`) |
| Tools / apps named | App icons pop behind the head | `iconPop` |
| Job title / big claim | Heavy italic word behind the head | `wallWords` kind `heavy` |
| Question / feeling | Frosted bubble behind the caption | `mixCaption` `bubble` |
| CTA follow / DM | Desk perspective text, text along a light, emoji pop | `floorText`, `arcText`, `emojiPop` |

Each style's `STYLE.md` lists its own modes (what it was measured doing); prefer those for that style, but any
template works in any style (its look comes from tokens; missing tokens fall back to defaults).

Pacing: change shot every 4–10 s; one main graphic idea at a time; leave 0.3–0.6 s of clean
footage around big moves. A graphic appears on the word that names it and leaves before the next idea.

## Shots (exactly one active)
- `speaker` — full-frame, face-tracked. `zoom` 1.15, `eye` [540,680] (where eyes land), `open`
  {scale,tau} | false, `pushes` [{at, amount 0.06–0.1, tau 0.13}] on key words, `origin`, `dots`
  (grain), `fx` [{at, dur, dim, blur, tint}] to dim/blur behind cards, `lockFace` (freeze framing).
- `circleSpeaker` — circle on a gradient. `circle` [cx,cy,r], `pxPerSrc` (face size), `eye`, `open`.
- `splitScreen` — `cards` [{rect, radius, content:'speaker'|'color', zoom, eye}]; elements go `in` it.
- `phone` — `rect`, `footage` {zoom, eye}, `clips` [element ids], `swipes` [t], `exitAt`, `title`, `time`.
  Enter: speaker full-frame settles into the phone. Pair with `chatMock` elements (`in`: phone id).
- `routeMap` — `markers` [{num:'01', label, at}], `reward` {at, icon chart|check|star|trophy, label [[w,t]]},
  optional `route`, `shiftX`. Puck schedule is automatic from marker times.

## Elements
- `chestCaption` — `line1` [[w,t]], `big` [[w,t]], `underline` t|null, `x` 540, `y` 1080, `align`.
- `nameTag` — `name`, `role`, `avatar` 'auto' (work/avatar.jpg), `x`, `y`.
- `pointerCaption` — `words`, `anchor` 'mouth'|[x,y], `dx`, `dy`.
- `wallWords` — `items` [{text, t, x, y, kind small|serif|bold, size}], `behindHead`, `occlude` rect.
- `stackedCaption` — `x`, `y`, `lines` [{size, words, indent, mt, stroke}]; `ride:true` into a phone.
- `pointerLines` — `x`, `rows` [{y, words}], `sparkles` true|list.
- `subtitles` — `phrases` [{t0, t1, words}], `y`.
- `listCard` (layer screen) — `rect`, `title`, `rows` [[[w,t],...]], `tilt`, `defocusAt`.
- `neonChart` (layer screen) — `points`, `drawAt`, `dur`, `caption` {x, y, lines}.
- `chatMock` — `variant` text|widget, `label`, `badge`, `prompt`, `lines` | `widget`{...}, `captions`.
- `pillChips` — `x`, `y`, `align`, `chips` [{text, t, icon}]. `checkLine`, `tagRow`, `calloutLine`, `accentGradient`.
Icons: check, star, bang, leaf, plus, minus, arrow, none.

## Placement relative to the speaker (anchors) — the default
Do not hard-code x/y for overlays on speaker shots. Positions are relationships to the speaker's face, measured per
frame, so the same plan and style fit any framing (close-up, wide, off-centre). Full-screen layouts without the
speaker (stepCard, paperFrame, filmCards) keep fixed layouts.
- Element: `"anchor": {"@": "chin", "fy": 0.2, "dx": -0.1, "pin": "top-center"}` — the element's bounding box is moved so
  its `pin` point (top-center | center | top-left | top-right | left-center | right-center | bottom-*) lands there.
- Points `@`: `eyes`, `mouth`, `chin`, `chest`, `top` (forehead), `above`, `left` / `right` (face edge, dx outward),
  `side` (side of the face with more room), `#<element id>` (beside another element; `at` = its point).
- Distances: `fx` / `fy` = fraction of the free room from the point to the safe-area edge (use for "how far from the
  face": works for every shot size); `dx` / `dy` = face heights (small offsets next to the face).
- Any point inside params can be an anchor too: `"move": {"to": {"@": "chin", "dx": -0.46, "fy": 0.39}}`; an item with
  `@` and other keys (iconPop icons, wallWords items) gets its x/y from it.
- Style defaults: `style.anchors.<template>` — used when the element gives no position and no anchor. The three
  2026-10-20 styles carry anchors measured from their references.
- Safety: anchored elements are kept inside `style.safe` ([60,200,1020,1650]) and pushed off the face
  (`"avoidFace": false` to allow overlap; behind-head elements are exempt).
- `"follow": 0..1` — share of the speaker's later movement the element follows (default 0 = locked at its t0).
- Explicit `x`/`y`/`rect` still win when you truly need an exact spot.

## New element templates (2026-10-20 styles)
- `mixCaption` — `x`, `y`, `align` left(cascade)|center|right, `lines` [{kind, indent, mt, words:[[w,t,kind?]]}]; kinds
  script|sans|bold|serif|thin|heavy from style `mix.*`; `bubble` true (+`bubbleAt`), `underline` {at, line}.
- `wordFlash` — `words` [[text,t]] (each until the next, max `hold`), `x`, `y` (style `flash.y`).
- `diamondBadges` — `y`, `xs`|`x`+`gap`, `size`, `items` [{num,t}], `fly` {index, at, to:[x,y], size}, `hideOthersAt`. `diamondBadge` — `num`, `x`, `y`, `size`.
- `cardRow` — `images` [asset], `y`, `w`, `h`, `gap`, `speed`, `behindHead` (needs masks).
- `videoCard` — `x`, `y`, `w`, `thumb`, `title`, `channel`, `avatar`, `desc`.
- `leaderLabel` — `from` [x,y], `to` [x,y], `text`, `at`, `align`, `width`.
- `bulletList` — `x`, `y`, `rows` [{text,t}], `icon` sparkle|arrow, `width`, `size`, `gap`.
- `ringStat` — `x`, `y`, `r`, `value`, `from`, `at`, `dur`, `label`, `suffix`, `move` {at, to, r}.
- `glassPanel` — `rect`, `title`, `titleAt`, `rows`. `productCard` — `rect`, `image`|`heading`, `title`, `desc`.
- `ratingStars` — `x`, `y`, `label`, `count`, `lit` [{n,t}]. `commentCta` — `tile` [x,y,size], `logo`|`logoText`, `head`, `keyword`, `at`, `line`, `lineAt`.
- `selectBox` — `target` (caption element id) + `line`, or `rect`; `at`, `dur`, `cursor`.
- `iconPop` — `icons` [{text|image, x, y, size, t, bg, fg, rot, blur}], `behindHead`.
- `floorText` — `lines`, `x`, `y`, `t`, `tilt`, `size`. `arcText` — `cx`, `cy`, `r`, `start`, `text`, `t`, `size`.
- `emojiPop` — `x`, `y`, `size`, `icon` send|heart|play|bell|check|star, `t`.
Shots: `stepCard` — `num`, `title`, `media` {image}|{broll, focus}|'speaker', `card` rect, `bullets`, `footer` {text,t}, `header`, `drift`.
`paperFrame` — `rect`, `label` {text,t,x,y}, `stars`, `zoom`, `eye`. `filmCards` — `clips` [{broll, t, label (string|lines), focus}], `rect`, `labelY`.
Helpers in core.js: `typeSetup/typeOn` (typewriter), `asset()`, `pushBroll()`, `frostBehind()`, `sparkle()`, `STAR4`;
`motion.reveal.blur` adds a blur to every word reveal. Regression job for these: `jobs/_style-test` (plans
`work/plan_violet.json`, `plan_teal.json`, `plan_editorial.json`; copy one to `plan.json` and run `run.py preview`).

## Azure paper templates (2026-10-22, `engine/templates/azure.js`, tokens `style.az.*`)
- Shot `paperScene` — off-white grid paper + vignette + turning sparkles. `stars` [{x,y,size,t,blur,rot}], `speaker` {circle:[cx,cy,r], pxPerSrc, at} (speaker in a white-rimmed circle), `drift`.
- `paperTitle` — stacked paper headline: `x`, `y`, `align`, `lines` [{kind kicker|small|sans|bold|heavy|serif|price, words, indent, mt}].
- `diamondRoute` — zig-zag numbered diamonds + drawing connector + typed labels: `x`, `y`, `dx`, `dy`, `size`, `width`, `items` [{num,label,t}].
- `bubbleMap` — rings then glowing bubbles around a centre: `center`, `ringsAt`, `items` [{text,t,x,y,r,size}].
- `curveChart` — growth curve draws with fill + tip dot: `rect`, `drawAt`, `dur`, `power`, `start` {text,t}, `tag` {text,t}.
- `priceCard` — old price struck, offer counts down: `x`, `y`, `kicker`, `was` {label,value,t,strikeAt}, `now` {label,value,t,countDur}, `save` {text,t}, `currency`.
- `badgeLine` — diamond + kicker + title over the speaker: `num`, `kicker`, `words`, `words2`, `size` (anchor default in style).
- `squareBadges` — small numbered azure squares: `x`, `y`, `size`, `gap`, `items` [{num,t}].
- `glassCard` — dark frosted card: `rect` [x,y,w], `title`, `strike` {text,at}, `big` {text | from,to,at,dur,prefix, unit}, `pills` [{text,t,primary}], `cursor` {at,pill,clickAt}.
- Speaker params `lowBlur` {y, ramp, sigma, dark:[y0,y1,amt]} and `grade` {band:[h0,h1], shift, sat, bandSat, bandVal} (compositor; defaults `style.speaker.*`).

## Reusing the regression job
`jobs/intelligent-ui-reel/work/plan.json` uses almost every template with real timings. Copy
blocks from it rather than writing params from scratch.

## Writing a template
```js
registerTemplate('myThing', {
  kind: 'element',                       // or 'shot'
  build(inst, spec, ctx) {               // create DOM once under inst.root; read style via S('myThing.x', default)
    inst.g = makeGroup({x: 540, y: 900, t0: spec.t0, t1: spec.t1, lines: [{font: S('fonts.caption'), size: 60, words: spec.params.words}]}, inst.root);
  },
  render(inst, t, st, ctx) {             // pure function of t: set transforms/opacity only
    runGroup(inst.g, t);
  },
  probe(inst, t) { return [[x, y]]; }    // optional: points the motion-blur sampler watches
});
```
Shots push media into `st.media` with `pushMedia(st, rect, cropFor(seg, k, rect, zoom, ex, ey))` and
set `st.cam`. Use `spring`, `settle`, `settle2`, `outCubic` for motion; never `Math.random()` (use `seeded`).
Add the script tag to `engine/overlay.html`, put look values in every `styles/*/style.json` (or defaults),
preview with `run.py preview`, then document it here.
