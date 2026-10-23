# Styles

A style is a folder:
```
styles/<name>/
  style.json     look tokens: fonts, colours, caption faces (mix.*), motion feel, per-template values,
                 signature_templates, modes
  STYLE.md       what was measured from the reference + "speaker says X -> use template Y" modes
  preview.jpg    4-frame strip shown to the user when choosing a style
  study/         reference.mp4 (the reference, kept unedited), windows/ contact sheets, frames/ stills, cuts, palette, camera
```
Plans pick one with `"style": "<folder>"` and can override tokens with `style_overrides`.
A style gives the LOOK; the graphics in an edit are chosen from what the speaker says (STYLE.md "Modes").
Only when the user says "recreate it exactly" do we copy the reference's timeline (skills/style-from-reference).

| Style | Look | From |
|---|---|---|
| violet-tutorial | Great Vibes script + Inter captions, one-word flashes, purple diamond step badges, full-screen glowing step cards with typed sparkle bullets, card row behind head, glass video card | reference (2026-10-20) |
| teal-tech | same caption system; cyan HUD over one continuous speaker shot: count-up ring, ▶ rows, frosted glass list panel, product card, star rating, "Comment: KEYWORD" CTA | reference (2026-10-20) |
| editorial-blue | Inter light italic + Tinos bold italic, punch-in cuts, cream grid-paper frame with stars + typed label, film-grain b-roll cards, selection box, icons/heavy word behind head, desk text, arc text, emoji pop | reference (2026-10-20) |
| azure-paper | Lower frame melts into blur under small Inter + Instrument Serif captions, azure diamond principle lines, dark frosted glass cards with pills + cursor, off-white grid-paper scenes (diamond route, navy heavy headline, price card, bubble map around a speaker circle, growth curve), cool teal grade | reference (2026-10-22) |
| bold-terracotta | Anton heavy caps, terracotta #B4562E, warm | preset |

New style from a reference ("add this as a new style"): `skills/style-from-reference` (§ New style).
List styles: `python run.py styles`.
