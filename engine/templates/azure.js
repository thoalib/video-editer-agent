// Azure paper look (measured from styles/azure-paper/study): off-white paper scenes with a faint grid and soft
// light-blue sparkles, azure diamond badges (shared diamond() from glow_ui.js, tokens style.glow.*), navy heavy headlines
// with serif-italic words, a zig-zag diamond route, a bubble map around the speaker in a circle, a growth curve, a price
// card that strikes the old price and counts down to the offer; over the speaker: a diamond + kicker + title line, small
// numbered squares, and dark frosted glass cards (count-up number, pills, a cursor that clicks a button).
// Look tokens: style.az.*  (paperRGB, grid, ink, muted, navy, azure, azureLight, text.<kind>, glass.*)

function azText(kind) {   // font/colour of a paper text kind: kicker | small | sans | bold | heavy | serif | price
  const K = S('az.text.' + kind, {}), d = {kicker: '600 24px Inter', small: '500 34px Inter', sans: '500 46px Inter', bold: '700 60px Inter',
    heavy: '800 150px Inter', serif: 'italic 400 70px InstrumentSerif', price: '800 210px Inter'}[kind] || '500 40px Inter';
  return {font: K.font || d, size: K.size || parseFloat(d.split(' ').find(x => x.endsWith('px'))), color: K.color || S('az.ink', '#1A1D24'), ls: K.ls || '-0.01em', upper: K.upper};
}
function blurExit(e, t, t1, dur = 0.22) { const x = clamp((t - (t1 - dur)) / dur); if (x > 0) { e.style.filter = `blur(${(12 * x).toFixed(1)}px)`; } else e.style.filter = 'none'; return 1 - inCubic(x); }
const inr = v => Math.round(v).toLocaleString('en-IN');

// SHOT paperScene — off-white paper, faint grid, soft vignette, slowly turning light-blue sparkles, optional speaker
// inside a circle that pops in. params: speaker {circle:[cx,cy,r], pxPerSrc 0.6, at, ring true}, stars [{x,y,size,t,blur,rot}],
//   drift 0.04, grid true, focus [{t, at:[x,y], s, dur}] (camera glides to each point — pans across the page)
registerTemplate('paperScene', {
  kind: 'shot',
  build(inst, s) {
    const p = s.params || {}, g = S('az.grid', 'rgba(30,45,70,.05)'), step = S('az.gridStep', 56);
    if (p.grid !== false) el('div', 'abs', inst.root, `left:-600px;top:-600px;width:${W + 1200}px;height:${H + 1200}px;background-image:linear-gradient(${g} 1.5px,transparent 1.5px),linear-gradient(90deg,${g} 1.5px,transparent 1.5px);background-size:${step}px ${step}px;background-position:${(W / 2 + 600) % step}px ${(H / 2 + 600) % step}px`);
    el('div', 'abs', inst.root, `left:-600px;top:-600px;width:${W + 1200}px;height:${H + 1200}px;background:radial-gradient(ellipse 48% 40% at 50% 48%,rgba(255,255,255,.55),rgba(255,255,255,0) 60%,rgba(120,110,95,.10) 100%)`);
    inst.stars = (p.stars || []).map(q => { const sv = sparkle(inst.root, q.size || 120, S('az.azureLight', '#9CD1F4'), 'rgba(140,200,240,.0)');
      sv.style.position = 'absolute'; sv.style.left = (q.x - (q.size || 120) / 2) + 'px'; sv.style.top = (q.y - (q.size || 120) / 2) + 'px'; if (q.blur) sv.style.filter = `blur(${q.blur}px)`; sv.classList.remove('trk'); return {sv, q}; });
    if (p.speaker && p.speaker.ring !== false) { const c = p.speaker.circle;
      inst.ring = el('div', 'abs', inst.root, `left:${c[0] - c[2]}px;top:${c[1] - c[2]}px;width:${2 * c[2]}px;height:${2 * c[2]}px;border-radius:50%;box-sizing:border-box;` +
        `border:5px solid #fff;box-shadow:0 18px 40px rgba(20,40,70,.22),0 2px 6px rgba(20,40,70,.18)`); }
  },
  render(inst, t, st) {
    const p = inst.spec.params || {}, t0 = inst.spec.t0;
    st.bg = {type: 'solid', color: S('az.paperRGB', [242, 240, 236])};
    inst.stars.forEach(({sv, q}, i) => { const a = spring(t - (q.t != null ? q.t : t0 + 0.1 + i * 0.1), 1.5, 0.7);
      sv.style.opacity = clamp(a * 1.3).toFixed(3); sv.style.transform = `rotate(${((q.rot || 0) + (i % 2 ? 8 : -8) * (t - t0)).toFixed(2)}deg) scale(${Math.max(0.0001, a).toFixed(4)})`; });
    if (p.speaker) { const S0 = p.speaker, c = S0.circle, a = spring(t - (S0.at != null ? S0.at : t0), 1.6, 0.72), r = c[2] * Math.max(0.001, a);
      const rect = [c[0] - c[2], c[1] - c[2], 2 * c[2], 2 * c[2]], eye = [c[0], c[1] - c[2] * 0.12];
      pushMedia(st, rect, cropFor(st.seg, st.frame - segById(st.seg).first, rect, 1, eye[0], eye[1], null, S0.pxPerSrc || 0.6), {shape: 'circle', circle: [c[0], c[1], r], opacity: clamp(a * 2)});
      if (inst.ring) { inst.ring.style.transform = `scale(${Math.max(0.001, a).toFixed(4)})`; inst.ring.style.opacity = clamp(a * 2).toFixed(3); } }
    st.cam = {s: 1 + (p.drift != null ? p.drift : 0.04) * inOutSine((t - t0) / Math.max(1, inst.spec.t1 - t0)), ox: W / 2, oy: H * 0.45};
    if (p.focus && p.focus.length) {   // camera glides to each focus point [{t, at:[x,y], s}] (eased 0.7 s), centring it on screen
      const F = p.focus, mv = q => inOutCubic((t - q.t) / (q.dur || 0.7)); let x = F[0].at[0], y = F[0].at[1], sc = F[0].s || 1;
      for (const q of F.slice(1)) { const k = mv(q); x = lerp(x, q.at[0], k); y = lerp(y, q.at[1], k); sc = lerp(sc, q.s || 1, k); }
      st.cam = {s: sc, ox: W / 2, oy: H / 2, tx: -(x - W / 2) * sc, ty: -(y - H / 2) * sc}; }
  }
});

// paperTitle — stacked paper headline in mixed kinds ("the edits just aren't / GOOD / enough."). Each word reveals through a
// blur as it is spoken; exits blurred. params: x 540, y, align 'center'|'left'|'right', lines [{kind, words:[[w,t]], indent, mt}]
registerTemplate('paperTitle', {
  kind: 'element',
  build(inst, s) {
    const p = s.params;
    inst.g = makeGroup({x: p.x != null ? p.x : W / 2, y: p.y || 700, align: p.align || 'center', t0: s.t0, t1: s.t1,
      lines: p.lines.map(L => { const k = azText(L.kind || 'sans'); return {font: k.font, size: k.size, color: L.color || k.color, ls: k.ls, upper: k.upper, lh: L.lh || 1.02, mt: L.mt || 0, indent: L.indent,
        style: 'text-shadow:none', words: L.words}; })}, inst.root);
  },
  render(inst, t) { runGroup(inst.g, t, 0.2); inst.g.style.opacity = (parseFloat(inst.g.style.opacity || 1) * blurExit(inst.g, t, inst.spec.t1)).toFixed(3); }
});

// diamondRoute — numbered diamonds zig-zag down the page, a thin line drawing from one to the next, each label typing on
// beside its diamond as the item is spoken. params: x 300, y 760, dx 230, dy 250, size 120, items [{num, label, t}], width 380
registerTemplate('diamondRoute', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, size = p.size || 120, dx = p.dx != null ? p.dx : 230, dy = p.dy || 250, x0 = p.x || 300, y0 = p.y || 760;
    inst.sv = svgEl('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`}, inst.root); inst.sv.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    inst.pts = p.items.map((_, i) => [x0 + (i % 2) * dx, y0 + i * dy]);
    inst.lines = inst.pts.slice(1).map((q, i) => { const a = inst.pts[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]), u = [(q[0] - a[0]) / len, (q[1] - a[1]) / len], o = size * 0.48;
      const ln = svgEl('path', {d: `M${a[0] + u[0] * o},${a[1] + u[1] * o} L${q[0] - u[0] * o},${q[1] - u[1] * o}`, stroke: S('az.line', 'rgba(29,142,196,.55)'), 'stroke-width': 2.5, fill: 'none'}, inst.sv);
      return {ln, len: len - 2 * o}; });
    const k = azText('sans'), wd = p.width || 380;
    inst.items = p.items.map((it, i) => { const [x, y] = inst.pts[i], right = i % 2 === 0;
      const d = diamond(inst.root, x, y, size, it.num);
      const lab = typeSetup(el('div', 'abs', inst.root, `left:${right ? x + size * 0.62 : x - size * 0.62 - wd}px;top:${y - k.size * 0.62}px;width:${wd}px;text-align:${right ? 'left' : 'right'};` +
        `font:${k.font};font-size:${p.labelSize || k.size}px;color:${k.color};letter-spacing:${k.ls};line-height:1.15`), it.label);
      return {d, lab, t: it.t}; });
  },
  render(inst, t) {
    const s = inst.spec, op = clamp((t - s.t0) / 0.1) * (1 - inCubic(clamp((t - (s.t1 - 0.22)) / 0.22)));
    inst.root.style.opacity = op.toFixed(3); inst.root.style.filter = op < 0.98 && t > s.t0 + 0.2 ? `blur(${(10 * (1 - op)).toFixed(1)}px)` : 'none';
    inst.items.forEach((it, i) => { badgePop(it.d, t - it.t); typeOn(it.lab, t, it.t + 0.15, 42);
      if (i > 0) { const L = inst.lines[i - 1], d = outCubic((t - it.t + 0.35) / 0.35); L.ln.setAttribute('stroke-dasharray', `${L.len} ${L.len}`); L.ln.setAttribute('stroke-dashoffset', ((1 - d) * L.len).toFixed(2)); } });
  }
});

// bubbleMap — empty azure rings appear around the centre (the paperScene speaker circle), then each fills with a glowing
// azure bubble + white label as it is named; thin dashed spokes to the centre. params: center [x,y], items [{text, t, x, y, r}], ringsAt
registerTemplate('bubbleMap', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, c = p.center || [540, 1000], A = S('az.azure', '#1D8EC4');
    inst.sv = svgEl('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`}, inst.root); inst.sv.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    inst.items = p.items.map((it, i) => { const r = it.r || 105;
      const sp = svgEl('path', {d: `M${c[0]},${c[1]} L${it.x},${it.y}`, stroke: 'rgba(29,142,196,.45)', 'stroke-width': 2, 'stroke-dasharray': '3 9', fill: 'none'}, inst.sv);
      const ring = el('div', 'abs trk', inst.root, `left:${it.x - r}px;top:${it.y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;border:3.5px solid ${A};box-sizing:border-box`);
      const fill = el('div', 'abs', inst.root, `left:${it.x - r}px;top:${it.y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;` +
        `background:radial-gradient(circle at 35% 30%,#5CB9EC,${A} 55%,#136C9F);box-shadow:0 0 30px rgba(29,142,196,.55),0 0 70px rgba(29,142,196,.3),inset 0 4px 10px rgba(255,255,255,.3);` +
        `display:flex;align-items:center;justify-content:center;text-align:center;font:${S('az.bubbleFont', '600 34px Inter')};${it.size ? `font-size:${it.size}px;` : ''}color:#fff;line-height:1.1;letter-spacing:-0.01em;padding:18px;box-sizing:border-box`);
      fill.innerHTML = it.text; return {sp, ring, fill, t: it.t, ringT: (p.ringsAt != null ? p.ringsAt : s.t0 + 0.3) + i * 0.18}; });
  },
  render(inst, t) {
    const s = inst.spec, op = 1 - inCubic(clamp((t - (s.t1 - 0.22)) / 0.22));
    inst.root.style.opacity = op.toFixed(3); inst.root.style.filter = op < 0.98 ? `blur(${(10 * (1 - op)).toFixed(1)}px)` : 'none';
    inst.items.forEach(it => { const a = spring(t - it.ringT, 1.8, 0.62); it.ring.style.opacity = clamp(a * 2).toFixed(3); it.ring.style.transform = `scale(${Math.max(0.001, 0.4 + 0.6 * a).toFixed(4)}) rotate(${((1 - clamp(a)) * -120).toFixed(1)}deg)`;
      it.sp.style.opacity = (0.9 * clamp((t - it.ringT) / 0.3)).toFixed(3);
      const f = spring(t - it.t, 2.1, 0.58); it.fill.style.opacity = clamp((t - it.t) / 0.1).toFixed(3); it.fill.style.transform = `scale(${Math.max(0.001, f).toFixed(4)})`;
      it.fill.style.filter = t - it.t < 0.15 ? `blur(${(8 * (1 - clamp((t - it.t) / 0.15))).toFixed(1)}px)` : 'none'; });
  }
});

// curveChart — a light growth curve draws from bottom-left to top-right with a soft fill, a glowing dot rides the tip,
// labels at the start and a pill tag at the end. params: rect [x,y,w,h], drawAt, dur 1.4, start {text, t}, tag {text, t}, power 1.8
registerTemplate('curveChart', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, R = inst.R = p.rect || [110, 820, 860, 640], A = S('az.azure', '#1D8EC4');
    inst.sv = svgEl('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`}, inst.root); inst.sv.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    const defs = svgEl('defs', {}, inst.sv), lg = svgEl('linearGradient', {id: 'azfill', x1: 0, y1: 0, x2: 0, y2: 1}, defs);
    svgEl('stop', {offset: 0, 'stop-color': A, 'stop-opacity': 0.28}, lg); svgEl('stop', {offset: 1, 'stop-color': A, 'stop-opacity': 0.02}, lg);
    for (const f of [0.33, 0.66]) svgEl('path', {d: `M${R[0]},${R[1] + R[3] * f} L${R[0] + R[2]},${R[1] + R[3] * f}`, stroke: 'rgba(30,45,70,.12)', 'stroke-width': 2, 'stroke-dasharray': '8 10'}, inst.sv);
    svgEl('path', {d: `M${R[0]},${R[1] + R[3]} L${R[0] + R[2]},${R[1] + R[3]}`, stroke: 'rgba(30,45,70,.25)', 'stroke-width': 2}, inst.sv);
    inst.area = svgEl('path', {fill: 'url(#azfill)'}, inst.sv);
    inst.line = svgEl('path', {fill: 'none', stroke: A, 'stroke-width': 7, 'stroke-linecap': 'round'}, inst.sv);
    inst.dot = el('div', 'abs trk', inst.root, `left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:${A};border:7px solid #fff;box-sizing:border-box;box-shadow:0 0 0 6px rgba(29,142,196,.25),0 4px 14px rgba(20,60,100,.35)`);
    const k = azText('small');
    if (p.start) inst.start = typeSetup(el('div', 'abs nowrap', inst.root, `left:${R[0]}px;top:${R[1] + R[3] + 22}px;font:${k.font};color:${S('az.muted', '#6B7280')}`), p.start.text);
    if (p.tag) { inst.tag = el('div', 'abs trk nowrap', inst.root, `left:${R[0] + R[2]}px;top:${R[1] - 92}px;transform:translateX(-80%);padding:14px 28px;border-radius:999px;background:${A};color:#fff;` +
      `font:${S('az.tagFont', '700 40px Inter')};box-shadow:0 10px 26px rgba(29,142,196,.4)`); inst.tag.textContent = p.tag.text; }
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, R = inst.R, pw = p.power || 1.8, d = inOutCubic((t - (p.drawAt != null ? p.drawAt : s.t0 + 0.2)) / (p.dur || 1.4));
    const op = 1 - inCubic(clamp((t - (s.t1 - 0.22)) / 0.22)); inst.root.style.opacity = op.toFixed(3); inst.root.style.filter = op < 0.98 ? `blur(${(10 * (1 - op)).toFixed(1)}px)` : 'none';
    const pt = u => [R[0] + R[2] * u, R[1] + R[3] * (1 - 0.92 * Math.pow(u, pw)) - 6];
    let path = ''; const n = Math.max(2, Math.round(60 * d)); for (let i = 0; i <= n; i++) { const q = pt(d * i / n); path += (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }
    inst.line.setAttribute('d', path); const e = pt(d); inst.area.setAttribute('d', path + `L${e[0].toFixed(1)},${R[1] + R[3]} L${R[0]},${R[1] + R[3]} Z`);
    inst.line.style.opacity = inst.area.style.opacity = d > 0 ? 1 : 0;
    inst.dot.style.transform = `translate(${e[0].toFixed(1)}px,${e[1].toFixed(1)}px)`; inst.dot.style.opacity = d > 0 ? 1 : 0;
    if (inst.start) typeOn(inst.start, t, p.start.t, 40);
    if (inst.tag) { const a = spring(t - p.tag.t, 2.1, 0.6); inst.tag.style.opacity = clamp((t - p.tag.t) / 0.1).toFixed(3); inst.tag.style.transform = `translateX(-80%) translateY(${((1 - a) * 30).toFixed(1)}px) scale(${(0.6 + 0.4 * a).toFixed(4)})`; }
  }
});

// priceCard — the offer, on paper: kicker, the original price in grey that gets struck through, then the offer label and
// a big navy price counting down from the original to the offer, a "you save" pill. params: x 540, y 640, kicker,
//   was {label, value, t, strikeAt}, now {label, value, t, countDur 1.1}, save {text, t}, currency '₹'
registerTemplate('priceCard', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, cur = p.currency || '₹', x = p.x || W / 2, y = p.y || 640, navy = S('az.navy', '#173A7A'), A = S('az.azure', '#1D8EC4');
    const col = inst.col = el('div', 'abs', inst.root, `left:${x}px;top:${y}px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;text-align:center`);
    const kk = azText('kicker');
    if (p.kicker) { inst.kick = typeSetup(el('div', 'nowrap', col, `font:${kk.font};color:${S('az.muted', '#6B7280')};letter-spacing:.28em;text-transform:uppercase;margin-bottom:34px`), p.kicker); }
    const w = p.was; inst.wasBox = el('div', 'trk', col, 'display:flex;flex-direction:column;align-items:center');
    el('div', 'nowrap', inst.wasBox, `font:${azText('small').font};color:${S('az.muted', '#6B7280')}`).textContent = w.label;
    const wv = el('div', 'nowrap', inst.wasBox, `position:relative;font:700 104px Inter;color:#9AA1AB;letter-spacing:-0.03em;line-height:1.05`); wv.textContent = cur + inr(w.value);
    inst.strike = el('div', 'abs', wv, `left:-4%;top:52%;width:108%;height:9px;border-radius:5px;background:${S('az.strike', '#E0474C')};transform-origin:0 50%;transform:scaleX(0) rotate(-6deg)`);
    const n = p.now; inst.nowBox = el('div', 'trk', col, 'display:flex;flex-direction:column;align-items:center;margin-top:70px');
    el('div', 'nowrap', inst.nowBox, `font:${azText('serif').font};font-size:84px;color:${A};line-height:1`).textContent = n.label;
    const pk = azText('price'); inst.nowV = el('div', 'nowrap', inst.nowBox, `font:${pk.font};color:${navy};letter-spacing:-0.045em;line-height:1;margin-top:6px;font-variant-numeric:tabular-nums`);
    inst.cur = cur;
    if (p.save) { inst.save = el('div', 'trk nowrap', col, `margin-top:46px;padding:16px 34px;border-radius:999px;background:${A};color:#fff;font:700 40px Inter;box-shadow:0 12px 30px rgba(29,142,196,.38)`); inst.save.textContent = p.save.text; }
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, w = p.was, n = p.now;
    const op = blurExit(inst.col, t, s.t1); inst.col.style.opacity = op.toFixed(3);
    if (inst.kick) typeOn(inst.kick, t, s.t0 + 0.05, 45);
    const a = spring(t - w.t, 1.9, 0.7); inst.wasBox.style.opacity = clamp((t - w.t) / 0.15).toFixed(3); inst.wasBox.style.transform = `translateY(${((1 - a) * 40).toFixed(1)}px)`;
    const k = outCubic((t - w.strikeAt) / 0.32); inst.strike.style.transform = `scaleX(${k.toFixed(4)}) rotate(-6deg)`;
    const b = spring(t - n.t, 1.8, 0.66); inst.nowBox.style.opacity = clamp((t - n.t) / 0.15).toFixed(3); inst.nowBox.style.transform = `translateY(${((1 - b) * 50).toFixed(1)}px) scale(${(0.85 + 0.15 * b).toFixed(4)})`;
    const c = inOutCubic((t - n.t - 0.1) / (n.countDur || 1.1)); inst.nowV.textContent = inst.cur + inr(lerp(w.value, n.value, c));
    if (inst.save) { const q = spring(t - p.save.t, 2.2, 0.58); inst.save.style.opacity = clamp((t - p.save.t) / 0.1).toFixed(3); inst.save.style.transform = `scale(${Math.max(0.001, 0.5 + 0.5 * q).toFixed(4)})`; }
  }
});

// badgeLine — over the speaker: azure diamond with a number, a letter-spaced kicker typing on and a white title revealed
// word by word ("PRINCIPLE 1 / Impress with the edit"); exits with the diamond turning away and the text blurring out.
// params: x, y (left / top of the group; or an anchor), num, kicker, words [[w,t]], words2 (optional 2nd line), size 140
registerTemplate('badgeLine', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, size = p.size || 140, x = p.x != null ? p.x : 140, y = p.y != null ? p.y : 1180, T = S('az.line1', {});
    inst.d = diamond(inst.root, x + size / 2, y + size / 2, size, p.num);
    if (p.kicker) inst.kick = typeSetup(el('div', 'abs nowrap trk', inst.root, `left:${x + size + 26}px;top:${y + size * 0.5 - 62}px;font:${T.kicker || '600 25px Inter'};color:${T.kickerColor || 'rgba(225,230,238,.78)'};letter-spacing:.24em;text-transform:uppercase`), p.kicker);
    const L = w => ({font: T.font || '600 58px Inter', size: T.size || 58, color: '#fff', ls: '-0.02em', lh: 1.08, style: `text-shadow:${T.shadow || '0 2px 14px rgba(0,10,30,.45)'}`, words: w});
    inst.g = makeGroup({x: x + size + 24, y: y + size * 0.5 - 24, t0: s.t0, t1: s.t1, lines: [L(p.words)].concat(p.words2 ? [L(p.words2)] : [])}, inst.root);
  },
  render(inst, t) {
    const s = inst.spec, ex = clamp((t - (s.t1 - 0.3)) / 0.3);
    badgePop(inst.d, t - s.t0); if (ex > 0) inst.d.style.transform += ` rotate(${(90 * inCubic(ex)).toFixed(1)}deg) scale(${(1 - 0.6 * inCubic(ex)).toFixed(3)})`;
    inst.d.style.opacity = (parseFloat(inst.d.style.opacity) * (1 - inCubic(ex))).toFixed(3);
    if (inst.kick) { typeOn(inst.kick, t, s.t0 + 0.12, 40); inst.kick.style.opacity = (1 - inCubic(ex)).toFixed(3); }
    runGroup(inst.g, t, 0.3); inst.g.style.filter = ex > 0 ? `blur(${(10 * ex).toFixed(1)}px)` : 'none';
  }
});

// squareBadges — a row of small azure rounded squares with numbers popping in ("so do all 1 2 3"). params: x 540, y, size 70, gap 18, items [{num, t}]
registerTemplate('squareBadges', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, sz = p.size || 70, n = p.items.length, gap = p.gap || 18, x0 = (p.x != null ? p.x : W / 2) - (n * sz + (n - 1) * gap) / 2;
    inst.sq = p.items.map((it, i) => { const d = el('div', 'abs trk', inst.root, `left:${x0 + i * (sz + gap)}px;top:${p.y || 1150}px;width:${sz}px;height:${sz}px;border-radius:${sz * 0.22}px;` +
      `background:linear-gradient(160deg,#52B6EC,${S('az.azure', '#1D8EC4')} 60%,#1673AA);box-shadow:0 0 18px rgba(29,142,196,.6),inset 0 2px 4px rgba(255,255,255,.35);` +
      `display:flex;align-items:center;justify-content:center;font:600 ${Math.round(sz * 0.42)}px Inter;color:#fff`); d.textContent = it.num; d.t = it.t; return d; });
  },
  render(inst, t) { const s = inst.spec, ex = clamp((t - (s.t1 - 0.25)) / 0.25);
    inst.sq.forEach(d => { badgePop(d, t - d.t); d.style.opacity = (parseFloat(d.style.opacity) * (1 - inCubic(ex))).toFixed(3); }); }
});

// glassCard — compact dark frosted card over the blurred chest ("Total balance $3,000 USD" + pill buttons):
// header row (small logo + title), main row (big value + unit + inline struck old value | small status pills stacked on
// the right), optional full-width button row that a cursor clicks. Height follows the content (~230 px without a button).
// params: rect [x,y,w], logo (asset), title, big {text | from, to, prefix, at, dur, unit}, strike {text, at},
//   pills [{text, t, primary}] (right column), button {text, t}, cursor {at, clickAt}, enterBlur true
registerTemplate('glassCard', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, G = S('az.glass', {}), R = p.rect || [180, 1310, 720];
    const c = inst.c = el('div', 'abs trk', inst.root, `left:${R[0]}px;top:${R[1]}px;width:${R[2]}px;padding:30px 36px 32px;box-sizing:border-box;border-radius:${G.radius || 36}px;` +
      `display:flex;flex-direction:column;gap:${G.gap || 10}px;background:${G.fill || 'linear-gradient(180deg,rgba(52,56,66,.78),rgba(30,33,40,.80))'};` +
      `border:1.5px solid ${G.edge || 'rgba(255,255,255,.12)'};box-shadow:0 24px 60px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)`);
    if (p.title || p.logo) { const hd = el('div', '', c, 'display:flex;align-items:center;gap:14px');
      if (p.logo) el('img', '', hd, 'width:40px;height:40px;object-fit:contain;flex:none').src = asset(p.logo);
      if (p.title) el('div', 'nowrap', hd, `font:${G.title || '600 34px Inter'};color:#F2F4F7;letter-spacing:-0.01em`).textContent = p.title; }
    const main = el('div', '', c, 'display:flex;align-items:center;justify-content:space-between;gap:24px');
    const left = el('div', '', main, 'display:flex;align-items:baseline;gap:16px;min-width:0');
    if (p.big) { inst.big = el('div', 'nowrap', left, `font:${G.big || '800 108px Inter'};color:#fff;letter-spacing:-0.045em;line-height:1;font-variant-numeric:tabular-nums`);
      if (p.big.unit) el('div', 'nowrap', left, `font:${G.unit || '600 48px Inter'};color:rgba(235,240,246,.85);letter-spacing:-0.02em`).textContent = p.big.unit; }
    if (p.strike) { const sl = el('div', 'nowrap', left, `position:relative;font:600 44px Inter;color:rgba(230,235,242,.5);letter-spacing:-0.02em`); sl.textContent = p.strike.text;
      inst.sk = el('div', 'abs', sl, `left:-4%;top:52%;width:108%;height:5px;border-radius:3px;background:${S('az.strike', '#E0474C')};transform-origin:0 50%;transform:scaleX(0)`); }
    const pill = (q, parent, extra) => { const d = el('div', 'nowrap', parent, `padding:12px 24px;border-radius:999px;font:600 30px Inter;letter-spacing:-0.01em;text-align:center;${extra || ''}` +
      (q.primary ? `background:${G.primary || '#9BD4FF'};color:${G.primaryText || '#0B2540'}` : `background:${G.pill || 'rgba(18,58,104,.78)'};color:${G.pillText || '#8CCBF0'}`)); d.textContent = q.text; d.q = q; return d; };
    if (p.pills) { const col = el('div', '', main, 'display:flex;flex-direction:column;align-items:stretch;gap:10px;flex:none'); inst.pills = p.pills.map(q => pill(q, col)); }
    if (p.button) inst.btn = pill(Object.assign({primary: true}, p.button), c, 'margin-top:10px;padding:18px 24px;font-size:36px;font-weight:700;');
    if (p.cursor) { inst.cur = el('div', 'abs', inst.root, 'left:0;top:0;width:46px;height:56px');
      inst.cur.innerHTML = '<svg viewBox="0 0 24 30" width="46" height="56"><path d="M2 2 L2 24 L8 18.5 L12 27.5 L15.6 26 L11.7 17.2 L19.5 17.2 Z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>'; }
  },
  render(inst, t, st) {
    const p = inst.spec.params, s = inst.spec, a = spring(t - s.t0, 1.8, 0.78), ex = clamp((t - (s.t1 - 0.3)) / 0.3), op = clamp((t - s.t0) / 0.22) * (1 - inCubic(ex));
    inst.c.style.opacity = op.toFixed(3); inst.c.style.transform = `translateY(${((1 - a) * 70).toFixed(2)}px) scale(${(0.94 + 0.06 * a).toFixed(4)})`;
    const bl = Math.max(p.enterBlur === false ? 0 : 14 * (1 - clamp((t - s.t0) / 0.3)), 14 * ex); inst.c.style.filter = bl > 0.2 ? `blur(${bl.toFixed(1)}px)` : 'none';
    frostBehind(st, inst.c, S('az.glass.blur', 18), op);
    if (inst.sk) inst.sk.style.transform = `scaleX(${outCubic((t - p.strike.at) / 0.3).toFixed(4)})`;
    if (inst.big) { const B = p.big; if (B.text) inst.big.textContent = B.text;
      else { const k = inOutCubic((t - (B.at != null ? B.at : s.t0 + 0.2)) / (B.dur || 1.0)); inst.big.textContent = (B.prefix || '') + inr(lerp(B.from || 0, B.to, k)); } }
    const lit = d => { const q = d.q, on = q.t == null ? 1 : clamp((t - q.t) / 0.2); d.style.opacity = (0.35 + 0.65 * on).toFixed(3); };
    (inst.pills || []).forEach(lit);
    if (inst.btn) { lit(inst.btn); const ck = p.cursor ? (p.cursor.clickAt || p.cursor.at + 0.7) : -9; inst.btn.style.transform = `scale(${(1 - 0.05 * Math.max(0, 1 - Math.abs(t - ck) / 0.12)).toFixed(4)})`; }
    if (inst.cur) { const C = p.cursor, tg = inst.btn || inst.pills[C.pill || 0], c = inst.c, m = inOutCubic((t - C.at) / 0.6);   // root-local layout px
      const to = [c.offsetLeft + tg.offsetLeft + tg.offsetWidth * 0.55, c.offsetTop + tg.offsetTop + tg.offsetHeight * 0.55], from = [c.offsetLeft + c.offsetWidth + 40, c.offsetTop + c.offsetHeight + 140];
      inst.cur.style.opacity = (clamp((t - C.at + 0.1) / 0.15) * (1 - ex)).toFixed(3);
      inst.cur.style.transform = `translate(${lerp(from[0], to[0], m).toFixed(1)}px,${lerp(from[1], to[1], m).toFixed(1)}px)`; }
  }
});
