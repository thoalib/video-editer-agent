// HUD / glass UI over the speaker (measured from styles/teal-tech): count-up ring stat, bullet lists (sparkle or ▶),
// frosted glass list panel, product / course card, star rating, "Comment: KEYWORD" call to action.
// Look tokens: style.hud.*, style.list.* (bullets), style.cta.*

// bulletList — rows type on beside the speaker, each led by a sparkle or a ▶ arrow. params: x, y, rows [{text, t}], icon 'sparkle'|'arrow',
//   width 330, size (font px), gap
registerTemplate('bulletList', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, o = {iconKind: p.icon || 'sparkle'}; if (p.width) o.width = p.width; if (p.gap != null) o.gap = p.gap;
    if (p.size) o.font = S('list.font', '500 28px Montserrat').replace(/\d+px/, p.size + 'px');
    if (p.icon === 'arrow') Object.assign(o, S('list.arrow', {icon: 40, gap: 26}), p.gap != null ? {gap: p.gap} : {});
    inst.wrap = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
    inst.up = sparkleList(inst.wrap, p.x || 470, p.y || 1050, p.rows, o);
  },
  render(inst, t) { const s = inst.spec; inst.up(t); inst.wrap.style.opacity = (1 - inCubic(clamp((t - (s.t1 - 0.25)) / 0.25))).toFixed(3); }
});

// ringStat — glowing arc counts up to a percentage with a small caption under the number, then (optionally) shrinks
// and slides aside to make room for a list. params: x 540, y 1265, r 210, value 50, at, dur 1.6, label, move {at, to:[x,y], r}
registerTemplate('ringStat', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, Hd = S('hud', {}), r = p.r || 210, sw = Hd.ringWidth || 26;
    inst.g = el('div', 'abs trk', inst.root, `left:${(p.x || 540) - r - sw}px;top:${(p.y || 1265) - r - sw}px;width:${2 * (r + sw)}px;height:${2 * (r + sw)}px`);
    const sv = svgEl('svg', {width: 2 * (r + sw), height: 2 * (r + sw), viewBox: `${-r - sw} ${-r - sw} ${2 * (r + sw)} ${2 * (r + sw)}`}, inst.g); sv.style.overflow = 'visible';
    svgEl('circle', {r, fill: 'none', stroke: Hd.track || 'rgba(10,30,50,.55)', 'stroke-width': sw}, sv);
    inst.arc = svgEl('circle', {r, fill: 'none', stroke: Hd.ring || '#46E1EC', 'stroke-width': sw, 'stroke-linecap': 'round', transform: 'rotate(-90)'}, sv);
    sv.style.filter = `drop-shadow(0 0 8px ${Hd.ringGlow || 'rgba(70,225,236,.9)'}) drop-shadow(0 0 26px ${Hd.ringGlow2 || 'rgba(70,225,236,.45)'})`;
    inst.C = 2 * Math.PI * r;
    const mid = el('div', 'abs', inst.g, `left:0;top:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center`);
    inst.num = el('div', '', mid, `font:${Hd.numFont || '700 92px Montserrat'};font-size:${Math.round(r * 0.44)}px;color:#fff;letter-spacing:-0.02em;line-height:1`);
    if (p.label) inst.lab = typeSetup(el('div', '', mid, `font:${Hd.labelFont || '500 22px Montserrat'};font-size:${Math.round(r * 0.105)}px;color:#E8F6FA;text-align:center;width:${r * 1.2}px;line-height:1.15;margin-top:${r * 0.04}px`), p.label);
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, at = p.at != null ? p.at : s.t0, k = inOutCubic((t - at) / (p.dur || 1.6)), v = (p.from || 0) + ((p.value || 50) - (p.from || 0)) * k;
    inst.arc.setAttribute('stroke-dasharray', `${(inst.C * v / 100).toFixed(2)} ${inst.C}`); inst.arc.style.opacity = t < at ? 0 : 1;
    inst.num.textContent = Math.max(1, Math.round(v)) + (p.suffix != null ? p.suffix : '%');
    if (inst.lab) typeOn(inst.lab, t, at + (p.dur || 1.6) * 0.8, 50);
    const a = spring(t - s.t0, 2, 0.7), ex = clamp((t - (s.t1 - 0.3)) / 0.3);
    let tx = 0, ty = 0, sc = 0.7 + 0.3 * a;
    if (p.move) { const m = inOutCubic((t - p.move.at) / 0.6); tx = (p.move.to[0] - (p.x || 540)) * m; ty = (p.move.to[1] - (p.y || 1265)) * m; sc *= lerp(1, (p.move.r || 150) / (p.r || 210), m); }
    inst.g.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`;
    inst.g.style.opacity = (clamp((t - s.t0) / 0.15) * (1 - ex)).toFixed(3);
  }
});

// glassPanel — frosted blue panel rising from the chest: centred title, glowing bar, sparkle rows typing on.
// params: rect [312,975,456,520], title, rows [{text,t}], titleAt
registerTemplate('glassPanel', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, Hd = S('hud', {}), R = p.rect || [312, 975, 456, 520];
    const c = inst.c = el('div', 'abs trk', inst.root, `left:${R[0]}px;top:${R[1]}px;width:${R[2]}px;height:${R[3]}px;border-radius:${Hd.panelRadius || 18}px;transform-origin:50% 100%;` +
      `background:${Hd.panelFill || 'linear-gradient(180deg,rgba(40,125,200,.62),rgba(22,92,170,.42) 60%,rgba(22,92,170,.22))'};border:1.5px solid ${Hd.panelEdge || 'rgba(160,220,255,.28)'};` +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 20px 50px rgba(0,10,30,.25);overflow:hidden');
    inst.title = typeSetup(el('div', 'abs', c, `left:0;top:38px;width:100%;text-align:center;font:${Hd.panelTitle || '400 38px Montserrat'};color:#fff;line-height:1.1`), p.title || '');
    inst.bar = el('div', 'abs', c, `left:${R[2] * 0.12}px;top:${p.barY || 150}px;width:${R[2] * 0.76}px;height:5px;border-radius:3px;background:${Hd.bar || '#7DEFF5'};box-shadow:0 0 10px ${Hd.ring || '#46E1EC'},0 0 24px rgba(70,225,236,.6);transform-origin:50% 50%`);
    inst.list = sparkleList(c, R[2] * 0.07, (p.barY || 150) + 40, p.rows || [], Object.assign({width: R[2] * 0.7, gap: 26}, S('hud.panelList', {})));
  },
  render(inst, t, st) {
    const p = inst.spec.params, s = inst.spec, a = spring(t - s.t0, 1.7, 0.8), ex = clamp((t - (s.t1 - 0.3)) / 0.3), op = clamp((t - s.t0) / 0.15) * (1 - ex);
    inst.c.style.transform = `translateY(${((1 - a) * 120).toFixed(2)}px) scale(${(0.35 + 0.65 * a).toFixed(4)})`; inst.c.style.opacity = op.toFixed(3);
    typeOn(inst.title, t, p.titleAt != null ? p.titleAt : s.t0 + 0.25, 45);
    inst.bar.style.transform = `scaleX(${outCubic((t - (p.titleAt != null ? p.titleAt : s.t0 + 0.25) - 0.4) / 0.5).toFixed(4)})`;
    inst.list(t); frostBehind(st, inst.c, S('hud.blur', 16), op);
  }
});

// productCard — course / product card: dark inner screen with a cover image (asset) framed by a glowing rim,
// title + 2-line description under it, on a light-teal glass card. params: rect [138,1053,534,405], image, title, desc, logo
registerTemplate('productCard', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, Hd = S('hud', {}), R = p.rect || [138, 1053, 534, 405];
    const c = inst.c = el('div', 'abs trk', inst.root, `left:${R[0]}px;top:${R[1]}px;width:${R[2]}px;height:${R[3]}px;border-radius:22px;` +
      `background:${Hd.cardFill || 'linear-gradient(180deg,rgba(120,205,225,.75),rgba(60,150,190,.7))'};border:1.5px solid rgba(220,250,255,.5);box-shadow:0 22px 50px rgba(0,20,40,.35);transform-origin:50% 60%`);
    const sc = el('div', 'abs', c, `left:20px;top:20px;width:${R[2] - 40}px;height:${R[3] * 0.56}px;border-radius:16px;overflow:hidden;background:#0b1418;` +
      `border:3px solid ${Hd.cardRim || '#8FF3F0'};box-shadow:0 0 14px rgba(120,240,240,.7);box-sizing:border-box`);
    if (p.image) el('img', '', sc, 'width:100%;height:100%;object-fit:cover').src = asset(p.image);
    else if (p.heading) el('div', 'abs', sc, `left:0;top:28%;width:100%;text-align:center;font:700 44px Inter;color:#fff;letter-spacing:-0.02em`).textContent = p.heading;
    el('div', 'abs', c, `left:22px;top:${R[3] * 0.56 + 34}px;font:600 30px Inter;color:#fff;letter-spacing:-0.01em`).textContent = p.title || '';
    el('div', 'abs', c, `left:22px;top:${R[3] * 0.56 + 74}px;width:${R[2] - 44}px;font:400 22px Inter;line-height:1.25;color:rgba(255,255,255,.88)`).textContent = p.desc || '';
  },
  render(inst, t, st) {
    const s = inst.spec, a = spring(t - s.t0, 1.8, 0.72), ex = clamp((t - (s.t1 - 0.3)) / 0.3), op = clamp((t - s.t0) / 0.15) * (1 - ex);
    inst.c.style.transform = `scale(${(0.25 + 0.75 * a).toFixed(4)})`; inst.c.style.opacity = op.toFixed(3);
    frostBehind(st, inst.c, S('hud.blur', 16), op * 0.8);
  }
});

// ratingStars — small label + a row of stars, the first ones lighting up ("Your edits: 1 star").
// params: x 300, y 1240, label, count 5, lit [{n, t}] (stars 1..n light at t)
registerTemplate('ratingStars', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, Hd = S('hud', {}), n = p.count || 5;
    inst.box = el('div', 'abs trk', inst.root, `left:${p.x || 300}px;top:${p.y || 1240}px`);
    if (p.label) el('div', '', inst.box, `font:500 22px Montserrat;color:rgba(255,255,255,.85);margin:0 0 8px 6px`).textContent = p.label;
    const row = el('div', '', inst.box, 'display:flex;gap:10px');
    const d = 'M12 2.8 L14.7 9 L21.4 9.5 L16.3 13.9 L17.9 20.4 L12 16.9 L6.1 20.4 L7.7 13.9 L2.6 9.5 L9.3 9 Z';
    inst.stars = Array.from({length: n}, () => { const sv = svgEl('svg', {width: 62, height: 62, viewBox: '0 0 24 24'}, row); sv.style.overflow = 'visible';
      const o = svgEl('path', {d, fill: 'none', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1.1}, sv), f = svgEl('path', {d, fill: Hd.star || '#5FF0F0'}, sv);
      f.style.filter = `drop-shadow(0 0 4px ${Hd.star || '#5FF0F0'}) drop-shadow(0 0 10px ${Hd.star || '#5FF0F0'})`; return {sv, f}; });
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, ex = clamp((t - (s.t1 - 0.25)) / 0.25);
    inst.box.style.opacity = (clamp((t - s.t0) / 0.2) * (1 - ex)).toFixed(3);
    inst.stars.forEach((st, i) => { let on = 0; for (const l of p.lit || [{n: 1, t: s.t0 + 0.2}]) if (i < l.n) on = Math.max(on, spring(t - l.t - i * 0.08, 2.2, 0.6));
      st.f.style.opacity = clamp(on).toFixed(3); st.f.setAttribute('transform', `translate(12 12) scale(${Math.max(0.0001, on).toFixed(4)}) translate(-12 -12)`); });
  }
});

// commentCta — logo tile + "Comment:" + "KEYWORD" + a small line typing on (end-of-video call to action).
// params: tile [142,968,300] (x,y,size), logo (asset) | logoText, head 'Comment:', keyword, line, at (keyword), lineAt
registerTemplate('commentCta', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, C = S('cta', {}), [tx, ty, ts] = p.tile || [142, 968, 300];
    inst.tile = el('div', 'abs trk', inst.root, `left:${tx}px;top:${ty}px;width:${ts}px;height:${ts}px;border-radius:${ts * 0.1}px;overflow:hidden;` +
      `background:${C.tile || 'radial-gradient(ellipse at 50% 85%,#5B1E8C,#24102F 60%,#141018)'};box-shadow:0 18px 40px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center`);
    if (p.logo) el('img', '', inst.tile, 'width:100%;height:100%;object-fit:cover').src = asset(p.logo);
    else el('div', '', inst.tile, `font:900 ${ts * 0.3}px Inter;color:#fff;letter-spacing:-0.03em`).textContent = p.logoText || '';
    const x = tx + ts + 40, y = ty + ts * 0.12;
    inst.g = makeGroup({x, y, t0: s.t0, t1: s.t1, lines: [{font: C.head || '800 78px Inter', size: 78, color: '#fff', ls: '-0.02em', words: [[p.head || 'Comment:', s.t0 + 0.15]]},
      {font: C.key || '700 40px Inter', size: 40, color: '#fff', mt: 18, ls: '-0.01em', words: [['“' + (p.keyword || '') + '”', p.at != null ? p.at : s.t0 + 0.5]]}]}, inst.root);
    if (p.line) inst.line = typeSetup(el('div', 'abs', inst.root, `left:${x}px;top:${y + 168}px;width:${W - x - 50}px;font:${C.line || '500 32px Montserrat'};color:#fff;line-height:1.15`), p.line);
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, a = spring(t - s.t0, 2, 0.62);
    inst.tile.style.opacity = clamp((t - s.t0) / 0.12).toFixed(3); inst.tile.style.transform = `scale(${(0.4 + 0.6 * a).toFixed(4)})`;
    runGroup(inst.g, t); if (inst.line) typeOn(inst.line, t, p.lineAt != null ? p.lineAt : s.t0 + 1, 40);
  }
});
