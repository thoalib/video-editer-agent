// Editorial / magazine look (measured from styles/editorial-blue): speaker framed on cream grid paper with stars and a
// highlighted label, full-screen b-roll montage in a grainy film card with a serif label, design-tool selection box,
// app icons popping behind the head, perspective text on the desk, text curving along a round light, emoji pops.
// Look tokens: style.paper.*, style.film.*, style.select.*, style.floor.*, style.arc.*

const STAR5 = 'M0,-50 L11.8,-16.2 47.6,-15.5 19.1,6.2 29.4,40.5 0,20 -29.4,40.5 -19.1,6.2 -47.6,-15.5 -11.8,-16.2 Z';

// SHOT paperFrame — cream paper with thin full-bleed guide lines along a framed speaker, navy stars, optional label box
// that types on ("+ 6 years"). params: rect [75,495,930,930], label {text, t, x, y}, stars [[x,y,size,rot,blur]], zoom 1.25, eye
registerTemplate('paperFrame', {
  kind: 'shot',
  build(inst, s) {
    const p = s.params || {}, P = S('paper', {}), R = inst.R = p.rect || [75, 495, 930, 930], ink = P.line || 'rgba(40,40,40,.55)';
    inst.media = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
    const lines = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
    for (const x of [R[0], R[0] + R[2]]) el('div', 'abs', lines, `left:${x - 1}px;top:0;width:2px;height:${H}px;background:${ink}`);
    for (const y of [R[1], R[1] + R[3]]) el('div', 'abs', lines, `left:0;top:${y - 1}px;width:${W}px;height:2px;background:${ink}`);
    inst.stars = (p.stars || [[R[0] - 10, R[1] + 40, 220, -12, 0], [R[0] + R[2] - 60, R[1] + R[3] + 300, 420, 18, 14]]).map(([x, y, sz, rot, bl]) => {
      const sv = svgEl('svg', {width: sz, height: sz, viewBox: '-55 -55 110 110'}, inst.root); sv.style.cssText = `position:absolute;left:${x - sz / 2}px;top:${y - sz / 2}px;overflow:visible;${bl ? `filter:blur(${bl}px)` : ''}`;
      const g = svgEl('g', {}, sv); svgEl('path', {d: STAR5, fill: P.star || '#0E2A8A', 'stroke-linejoin': 'round', stroke: P.star || '#0E2A8A', 'stroke-width': 6}, g); return {g, rot}; });
    if (p.label) { const L = p.label;
      inst.lab = el('div', 'abs trk nowrap', inst.root, `left:${L.x != null ? L.x : W / 2}px;top:${L.y || R[1] - 190}px;transform:translateX(-50%);padding:8px 26px 14px;border-radius:10px;` +
        `background:${P.labelBg || '#0E2A8A'};color:#fff;font:${P.labelFont || 'italic 700 84px Tinos'};line-height:1`);
      inst.labTx = typeSetup(el('span', '', inst.lab), L.text); inst.caret = el('span', '', inst.lab, 'display:inline-block;width:5px;height:0.9em;background:#fff;margin-left:6px;vertical-align:-0.05em'); }
  },
  render(inst, t, st) {
    const p = inst.spec.params || {}, R = inst.R, t0 = inst.spec.t0;
    st.bg = {type: 'solid', color: S('paper.bgRGB', [241, 238, 232])};
    const eye = p.eye || [R[0] + R[2] / 2, R[1] + R[3] * 0.34];
    pushMedia(st, R, cropFor(st.seg, st.frame - segById(st.seg).first, R, 1, eye[0], eye[1], null, R[3] / (SRCH() / (p.zoom || 1.25))));
    inst.stars.forEach((q, i) => { const a = spring(t - t0 - i * 0.08, 1.6, 0.7); q.g.setAttribute('transform', `rotate(${(q.rot + (i % 2 ? 6 : -6) * (t - t0)).toFixed(2)}) scale(${Math.max(0.0001, a).toFixed(4)})`); });
    if (inst.lab) { const L = p.label; inst.lab.style.visibility = t < L.t - 0.15 ? 'hidden' : ''; typeOn(inst.labTx, t, L.t, 14);
      const done = t > L.t + [...L.text].length / 14; inst.caret.style.opacity = (!done || Math.floor((t - L.t) * 2.2) % 2 === 0) ? 1 : 0; }
    st.cam = {s: camScale(t, t0, Object.assign({open: {scale: 1.04, tau: 0.25}}, p)), ox: W / 2, oy: H / 2};
  }
});

// SHOT filmCards — b-roll montage on black: each clip fills a rounded card with rough film edges, grain and a
// centred serif label; hard cuts between clips (bloom flash in with plan.transitions). params: clips [{broll, t, label, focus}],
//   rect [22,160,1036,1630], labelY 950
registerTemplate('filmCards', {
  kind: 'shot',
  build(inst, s) {
    const p = s.params, F = S('film', {}), R = inst.R = p.rect || [22, 160, 1036, 1630];
    inst.media = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
    inst.edge = el('div', 'abs', inst.root, `left:${R[0]}px;top:${R[1]}px;width:${R[2]}px;height:${R[3]}px;border-radius:${F.radius || 26}px;` +
      'box-shadow:inset 0 0 0 3px rgba(0,0,0,.85),inset 0 0 18px 6px rgba(0,0,0,.75),inset 0 0 90px rgba(0,0,0,.35)');
    inst.labels = (p.clips || []).map(c => { const g = makeGroup({x: W / 2, y: p.labelY || 950, align: 'center', t0: c.t, t1: 9e9,
      lines: (Array.isArray(c.label) ? c.label : [c.label || '']).map((ln, i) => ({font: F.label || 'italic 700 84px Tinos', size: F.labelSize || 84, color: '#fff', lh: 0.95, ls: '-0.005em',
        style: `text-shadow:${F.shadow || '0 4px 18px rgba(0,0,0,.6)'}`, words: [[ln, c.t + 0.04 + i * 0.06]]}))}, inst.root); return g; });
  },
  render(inst, t, st) {
    const p = inst.spec.params, R = inst.R, cl = p.clips || [];
    st.bg = {type: 'solid', color: [0, 0, 0]};
    let k = 0; for (let i = 0; i < cl.length; i++) if (t >= cl[i].t) k = i;
    const c = cl[k];
    if (c) pushBroll(st, c.broll, R, t, c.t, {radius: S('film.radius', 26), focus: c.focus, grain: S('film.grain', 0.07)});
    inst.labels.forEach((g, i) => { g.spec.t1 = i + 1 < cl.length ? cl[i + 1].t : inst.spec.t1; runGroup(g, t, 0.02); });
    st.cam = {s: 1 + 0.03 * clamp((t - (c ? c.t : 0)) / 1.5), ox: W / 2, oy: H / 2};
  }
});

// selectBox — design-tool selection: a dashed box with corner handles grows over a word while a cursor drags it.
// params: target (id of a caption element) + line (index, default last) — or rect [x,y,w,h] — , at (start), dur 0.6, cursor true
registerTemplate('selectBox', {
  kind: 'element',
  build(inst, s, ctx) {
    const p = s.params, Sx = S('select', {}), [x, y, w, h] = p.rect || [0, 0, 10, 10];
    if (p.target) ctx.layoutHooks.push(() => { const g = ctx.els[p.target] && (ctx.els[p.target].g || (ctx.els[p.target].gs || [])[0]); if (!g) return;
      const li = p.line != null ? p.line : g.box.children.length - 1, m = lineMetrics(g, li), b = g.box.getBoundingClientRect(), pad = p.pad || 14;
      p.rect = [b.left + m.left - pad, b.top + m.base - m.em * 0.78, m.width + 2 * pad, m.em * 0.98];
      Object.assign(inst.box.style, {left: p.rect[0] + 'px', top: p.rect[1] + 'px', width: p.rect[2] + 'px', height: p.rect[3] + 'px'}); });
    inst.box = el('div', 'abs', inst.root, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:2px dashed ${Sx.line || 'rgba(255,255,255,.9)'};box-sizing:border-box;transform-origin:0 50%`);
    inst.hs = [[0, 0], [1, 0], [0, 1], [1, 1], [0, .5], [1, .5]].map(([u, v]) => el('div', 'abs', inst.box, `left:${u * 100}%;top:${v * 100}%;width:14px;height:14px;margin:-7px 0 0 -7px;background:${Sx.handle || '#1F3A93'};border:2px solid #fff;box-sizing:border-box`));
    if (p.cursor !== false) { inst.cur = svgEl('svg', {width: 64, height: 64, viewBox: '0 0 24 24'}, inst.root); inst.cur.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))';
      svgEl('path', {d: 'M3 2 L21 10 L13 12.5 L10 21 Z', fill: Sx.cursor || '#4F7BFF', stroke: '#fff', 'stroke-width': 1.2, 'stroke-linejoin': 'round'}, inst.cur); }
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, at = p.at != null ? p.at : s.t0, d = inOutCubic((t - at) / (p.dur || 0.6)), [x, y, w, h] = p.rect;
    inst.box.style.opacity = t < at ? 0 : (1 - inCubic(clamp((t - (s.t1 - 0.2)) / 0.2))).toFixed(3); inst.box.style.transform = `scaleX(${Math.max(0.001, d).toFixed(4)})`;
    inst.hs.forEach(e => e.style.transform = `scaleX(${(1 / Math.max(0.05, d)).toFixed(3)})`);
    if (inst.cur) { const cx = x + w * d + 6, cy = y + h * 0.8 + 30 * (1 - d), out = clamp((t - (at + (p.dur || 0.6) + 0.5)) / 0.3);
      inst.cur.style.transform = `translate(${(cx + out * 160).toFixed(1)}px,${(cy + out * 120).toFixed(1)}px)`; inst.cur.style.opacity = (clamp((t - at + 0.25) / 0.15) * (1 - out)).toFixed(3); }
  }
});

// iconPop — app / brand icons popping in on the wall (behind the head with masks). params: icons [{text|image, x, y, size, t, bg, fg, rot, blur, plain (logo mark: no tile)}], behindHead
registerTemplate('iconPop', {
  kind: 'element',
  build(inst, s) {
    inst.ics = (s.params.icons || []).map(ic => { const sz = ic.size || 170;
      const e = el('div', 'abs trk', inst.root, `left:${ic.x - sz / 2}px;top:${ic.y - sz / 2}px;width:${sz}px;height:${sz}px;border-radius:${sz * 0.22}px;overflow:hidden;` +
        `background:${ic.bg || '#1B1B8F'};display:flex;align-items:center;justify-content:center;font:800 ${sz * 0.42}px Inter;color:${ic.fg || '#C9CCFF'};letter-spacing:-0.02em;` +
        (ic.plain ? `background:none;overflow:visible;filter:drop-shadow(0 10px 24px rgba(0,0,0,.3))${ic.blur ? ` blur(${ic.blur}px)` : ''}` : `box-shadow:0 12px 30px rgba(0,0,0,.35);${ic.blur ? `filter:blur(${ic.blur}px)` : ''}`));
      if (ic.image) el('img', '', e, `width:100%;height:100%;object-fit:${ic.plain ? 'contain' : 'cover'}`).src = asset(ic.image); else e.textContent = ic.text || '';
      return {e, ic}; });
  },
  render(inst, t, st) {
    const s = inst.spec, ex = clamp((t - (s.t1 - 0.2)) / 0.2);
    inst.ics.forEach(({e, ic}) => { const a = spring(t - (ic.t != null ? ic.t : s.t0), 2.0, 0.55);
      e.style.opacity = (clamp((t - (ic.t != null ? ic.t : s.t0)) / 0.1) * (1 - ex)).toFixed(3); e.style.transform = `scale(${Math.max(0, a).toFixed(4)}) rotate(${(ic.rot || 0) * a}deg)`; });
    if (s.params.behindHead) { let r = [1e9, 1e9, -1e9, -1e9]; inst.ics.forEach(({ic}) => { const h = (ic.size || 170) * 0.7; r = [Math.min(r[0], ic.x - h), Math.min(r[1], ic.y - h), Math.max(r[2], ic.x + h), Math.max(r[3], ic.y + h)]; });
      st.occlude = {rect: [r[0], r[1], r[2] - r[0], r[3] - r[1]]}; }
  }
});

// floorText — big heavy words lying on the desk in perspective, semi-transparent ("IF YOU WANT TO").
// params: lines ['IF YOU', 'WANT TO'], x 540, y 1700, t (letters reveal), tilt 58, size 120, opacity .45
registerTemplate('floorText', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, F = S('floor', {});
    const wrap = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px;perspective:900px;perspective-origin:${p.x || 540}px ${(p.y || 1700) - 500}px`);
    inst.box = el('div', 'abs', wrap, `left:${p.x || 540}px;top:${p.y || 1700}px;transform-origin:50% 50%;text-align:center;font:${F.font || 'italic 900 120px Inter'};font-size:${p.size || F.size || 120}px;` +
      `color:${F.color || 'rgba(235,240,255,.42)'};line-height:0.92;letter-spacing:-0.01em;white-space:nowrap`);
    inst.chars = []; (p.lines || []).forEach((ln, i) => { const d = el('div', '', inst.box); [...ln].forEach(c => { const sp = el('span', 'trk', d); sp.textContent = c; inst.chars.push(sp); }); });
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, t0 = p.t != null ? p.t : s.t0, ex = clamp((t - (s.t1 - 0.25)) / 0.25);
    inst.box.style.transform = `translate(-50%,-50%) rotateX(${p.tilt || 58}deg)`; inst.box.style.opacity = (1 - ex).toFixed(3);
    inst.chars.forEach((c, i) => { const q = clamp((t - t0 - i * 0.035) / 0.18); c.style.opacity = q.toFixed(3); c.style.filter = q < 1 ? `blur(${((1 - q) * 6).toFixed(1)}px)` : 'none'; });
  }
});

// arcText — small text running along a circle (the round light on the wall: "Follow me pls!"). params: cx, cy, r, start (deg), text, t, size 40
registerTemplate('arcText', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, A = S('arc', {}), id = 'arc' + inst.id, r = p.r || 300, a0 = (p.start != null ? p.start : -60) * Math.PI / 180;
    const sv = svgEl('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`}, inst.root); sv.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    const cx = p.cx || 800, cy = p.cy || 420;
    svgEl('path', {id, d: `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 1 1 ${cx + r * Math.cos(a0 - 0.01)},${cy + r * Math.sin(a0 - 0.01)}`, fill: 'none'}, sv);
    const tx = svgEl('text', {style: `font:${A.font || '600 40px Inter'};font-size:${p.size || 40}px;letter-spacing:0.06em;fill:${A.color || 'rgba(255,255,255,.55)'}`}, sv);
    const tp = svgEl('textPath', {href: '#' + id}, tx);
    inst.ts = [...(p.text || '')].map(c => { const sp = svgEl('tspan', {}, tp); sp.textContent = c; return sp; });
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, t0 = p.t != null ? p.t : s.t0, ex = clamp((t - (s.t1 - 0.25)) / 0.25);
    inst.ts.forEach((c, i) => c.setAttribute('opacity', (clamp((t - t0 - i * 0.04) / 0.15) * (1 - ex)).toFixed(3)));
  }
});

// emojiPop — a round white badge with a glyph popping beside a word ("just [send] DM me"). params: x, y, size 70, icon 'send'|'heart'|'play'|'bell'|'check'|'star', t
const GLYPHS = {send: 'M3 11.5 L21 3 L14.5 21 L11.5 13 Z', heart: 'M12 20 C5 15 3 11.5 3 8.5 C3 5.5 5.4 4 7.6 4 C9.6 4 11 5.4 12 7 C13 5.4 14.4 4 16.4 4 C18.6 4 21 5.5 21 8.5 C21 11.5 19 15 12 20 Z',
  play: 'M8 5 L19 12 L8 19 Z', bell: 'M12 3 C8.5 3 6.5 5.6 6.5 9 L6.5 14 L4.5 17 L19.5 17 L17.5 14 L17.5 9 C17.5 5.6 15.5 3 12 3 Z M10 19 C10.4 20.3 11.1 21 12 21 C12.9 21 13.6 20.3 14 19 Z',
  check: 'M5 12.5 L10 17.5 L19 7', star: 'M12 2.8 L14.7 9 L21.4 9.5 L16.3 13.9 L17.9 20.4 L12 16.9 L6.1 20.4 L7.7 13.9 L2.6 9.5 L9.3 9 Z'};
registerTemplate('emojiPop', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, sz = p.size || 70, c = p.color || S('colors.accent', '#2F7BF5');
    inst.e = el('div', 'abs trk', inst.root, `left:${p.x - sz / 2}px;top:${p.y - sz / 2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.3)`);
    const sv = svgEl('svg', {width: sz * 0.6, height: sz * 0.6, viewBox: '0 0 24 24'}, inst.e);
    svgEl('path', p.icon === 'check' ? {d: GLYPHS.check, fill: 'none', stroke: c, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'} : {d: GLYPHS[p.icon || 'send'], fill: c}, sv);
  },
  render(inst, t) { const s = inst.spec, at = s.params.t != null ? s.params.t : s.t0, a = spring(t - at, 2.3, 0.5);
    inst.e.style.opacity = (clamp((t - at) / 0.08) * (1 - inCubic(clamp((t - (s.t1 - 0.15)) / 0.15)))).toFixed(3); inst.e.style.transform = `scale(${Math.max(0, a).toFixed(4)}) rotate(${((1 - a) * -25).toFixed(1)}deg)`; }
});
