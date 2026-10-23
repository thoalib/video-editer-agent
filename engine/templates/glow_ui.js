// Glowing tutorial UI (measured from styles/violet-tutorial): diamond number badges, full-screen step cards
// (badge + title, glowing portrait card, sparkle bullets that type on, footer line), a row of glowing image cards
// behind the head, a glass video card, leader-line labels. Look tokens: style.glow.*, style.list.*

// shared: sparkle bullet list that types on. rows [{text, t}] -> returns updater(t)
function sparkleList(parent, x, y, rows, o = {}) {   // o: font, color, gap, icon (px), iconKind 'sparkle'|'arrow', iconColor, glow, width, lh, cps
  const L = Object.assign({font: '500 28px Montserrat', color: '#F2F0FA', gap: 30, icon: 34, iconColor: '#FFFFFF', glow: 'rgba(255,255,255,.8)', width: 330, lh: 1.25, cps: 40}, S('list', {}), o);
  const box = el('div', 'abs', parent, `left:${x}px;top:${y}px;width:${L.width + L.icon + 22}px;display:flex;flex-direction:column;gap:${L.gap}px`);
  const items = rows.map(r => {
    const row = el('div', '', box, 'display:flex;align-items:flex-start;gap:20px');
    let ic;
    if (L.iconKind === 'arrow') { ic = el('div', 'trk', row, `width:${L.icon * 0.82}px;height:${L.icon}px;flex:none;background:${L.iconColor};clip-path:polygon(0 0,100% 50%,0 100%);filter:drop-shadow(0 0 6px ${L.glow})`); ic.style.marginTop = '2px'; }
    else { ic = sparkle(row, L.icon, L.iconColor, L.glow); ic.style.marginTop = (-L.icon * 0.08) + 'px'; }
    const tx = typeSetup(el('div', '', row, `font:${L.font};color:${L.color};line-height:${L.lh};width:${L.width}px;letter-spacing:-0.005em`), r.text);
    return {ic, tx, t: r.t};
  });
  return t => items.forEach(it => { const a = spring(t - it.t + 0.12, 2.2, 0.6); it.ic.style.opacity = clamp((t - it.t + 0.12) / 0.1).toFixed(3);
    it.ic.style.transform = `scale(${Math.max(0, a).toFixed(4)}) rotate(${((1 - a) * 45).toFixed(1)}deg)`; typeOn(it.tx, t, it.t, L.cps); });
}

// shared: diamond badge DOM (rotated rounded square, gradient, lavender rim, glow) with a number
function diamond(parent, cx, cy, size, num) {
  const G = S('glow', {}), d = el('div', 'abs trk', parent, `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px`);
  el('div', 'abs', d, `left:${size * 0.15}px;top:${size * 0.15}px;width:${size * 0.7}px;height:${size * 0.7}px;transform:rotate(45deg);border-radius:${size * 0.12}px;` +
    `background:${G.badgeFill || 'linear-gradient(135deg,#B47CFF 0%,#7B2FF2 45%,#4F12B8 100%)'};border:${Math.max(2, size * 0.022)}px solid ${G.badgeRim || '#E3D2FF'};` +
    `box-shadow:0 0 ${size * 0.14}px ${G.glowColor || 'rgba(160,90,255,.9)'},0 0 ${size * 0.4}px ${G.glowColor2 || 'rgba(140,60,255,.45)'},inset 0 ${size * 0.05}px ${size * 0.06}px rgba(255,255,255,.35),inset 0 -${size * 0.06}px ${size * 0.08}px rgba(40,0,90,.45)`);
  const n = el('div', 'abs', d, `left:0;top:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font:${G.badgeFont || '700 40px Montserrat'};font-size:${size * 0.32}px;color:#fff;text-shadow:0 2px 6px rgba(40,0,90,.5)`);
  n.textContent = num; return d;
}
function badgePop(e, dt, base = 1) { const a = spring(dt, 2.1, 0.55); e.style.opacity = clamp(dt / 0.12).toFixed(3); e.style.transform = `scale(${(base * Math.max(0, a)).toFixed(4)})`; }

// diamondBadges — numbers pop in a row ("three steps"), then one can fly to a spot (beside a caption / a raised hand).
// params: y 1440, xs [310,540,770] (or x + gap), size 150, items [{num:'1', t}], fly {index, at, to:[x,y], size}, hideOthersAt
registerTemplate('diamondBadges', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, n = p.items.length, gap = p.gap || 230, xs = p.xs || p.items.map((_, i) => (p.x || W / 2) + (i - (n - 1) / 2) * gap);
    inst.ds = p.items.map((it, i) => ({e: diamond(inst.root, xs[i], p.y || 1440, p.size || 150, it.num), t: it.t, x: xs[i]}));
  },
  render(inst, t) {
    const p = inst.spec.params, s = inst.spec, ex = clamp((t - (s.t1 - 0.16)) / 0.16);
    inst.ds.forEach((d, i) => {
      badgePop(d.e, t - d.t); let op = parseFloat(d.e.style.opacity) * (1 - inCubic(ex));
      if (p.fly && p.fly.index === i) { const f = spring(t - p.fly.at, 1.7, 0.7), to = p.fly.to, sz = (p.fly.size || p.size || 150) / (p.size || 150);
        d.e.style.transform += ` translate(${((to[0] - d.x) * f).toFixed(1)}px,${((to[1] - (p.y || 1440)) * f).toFixed(1)}px) scale(${lerp(1, sz, clamp(f)).toFixed(4)})`; }
      else if (p.fly && p.hideOthersAt != null) op *= 1 - outCubic((t - p.hideOthersAt) / 0.2);
      d.e.style.opacity = op.toFixed(3);
    });
  }
});

// diamondBadge — one badge popping at a spot (beside the step caption). params: num, x, y, size 120
registerTemplate('diamondBadge', {
  kind: 'element',
  build(inst, s) { const p = s.params; inst.d = diamond(inst.root, p.x || 250, p.y || 1110, p.size || 120, p.num); },
  render(inst, t) { const s = inst.spec; badgePop(inst.d, t - s.t0); inst.d.style.opacity = (parseFloat(inst.d.style.opacity) * (1 - inCubic(clamp((t - (s.t1 - 0.16)) / 0.16)))).toFixed(3); }
});

// SHOT stepCard — full-screen tutorial step: dark-navy -> violet background with soft light streaks, badge + title,
// a glowing portrait card (image asset | b-roll clip | speaker footage) that zooms up from small, sparkle bullets
// typing on, footer line. Camera drifts in slowly (measured 1.09x over ~4 s).
// params: num, title, titleAt, media {image | broll, focus} | 'speaker', card [x,y,w,h], bullets [{text,t}], footer {text, t},
//         header true, drift 0.06, bulletsX/Y
registerTemplate('stepCard', {
  kind: 'shot',
  build(inst, s) {
    const p = s.params || {}, G = S('glow', {}), C = inst.C = p.card || [153, 582, 423, 753], t0 = s.t0;
    inst.media = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
    inst.streaks = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px;opacity:.55;background:` +
      'radial-gradient(ellipse 18% 60% at 12% 35%,rgba(120,110,255,.10),transparent 70%),radial-gradient(ellipse 14% 70% at 78% 30%,rgba(140,120,255,.08),transparent 70%),' +
      'radial-gradient(ellipse 80% 30% at 50% 102%,rgba(150,40,230,.35),transparent 70%)');
    if (p.header !== false && (p.num || p.title)) {
      if (p.num) inst.badge = diamond(inst.root, C[0] + 95, C[1] - 136, 190, p.num);
      if (p.title) { inst.title = typeSetup(el('div', 'abs nowrap', inst.root, `left:${C[0] + 245}px;top:${C[1] - 160}px;font:${G.titleFont || '600 42px Montserrat'};color:${G.title || '#E9E6F5'};letter-spacing:-0.01em`), p.title); }
    }
    inst.frame = el('div', 'abs trk', inst.root, `left:${C[0]}px;top:${C[1]}px;width:${C[2]}px;height:${C[3]}px;border-radius:${G.radius || 27}px;` +
      `border:${G.rimW || 4}px solid ${G.rim || '#C9A2FF'};box-sizing:border-box;box-shadow:0 0 18px ${G.glowColor || 'rgba(160,90,255,.9)'},0 0 60px ${G.glowColor2 || 'rgba(140,60,255,.45)'},inset 0 0 22px rgba(190,140,255,.35);overflow:hidden`);
    const m = p.media || {};
    if (m.image) el('img', 'abs', inst.frame, `left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${m.pos || 'center'}`).src = asset(m.image);
    if (p.bullets) inst.list = sparkleList(inst.root, p.bulletsX || C[0] + C[2] + 50, p.bulletsY || C[1] + 40, p.bullets);
    if (p.footer) inst.foot = typeSetup(el('div', 'abs nowrap', inst.root, `left:0;top:${C[1] + C[3] + 75}px;width:${W}px;text-align:center;font:${G.footFont || '500 31px Montserrat'};color:${G.foot || '#D8D6E6'}`), p.footer.text);
    inst.t0 = t0;
  },
  render(inst, t, st) {
    const p = inst.spec.params || {}, G = S('glow', {}), C = inst.C, t0 = inst.spec.t0, m = p.media || {};
    st.bg = {type: 'gradient', stops: G.bg || [[0, [9, 13, 38]], [0.5, [18, 17, 64]], [0.8, [36, 15, 92]], [1, [70, 18, 128]]]};
    // card zooms up from ~35% (centre of the card), header fades/types in just after
    const z = spring(t - t0, 1.5, 0.78), sc = lerp(0.32, 1, z), cx = C[0] + C[2] / 2, cy = C[1] + C[3] / 2;
    const R = [cx - C[2] * sc / 2, cy - C[3] * sc / 2, C[2] * sc, C[3] * sc];
    inst.frame.style.transform = `translate(${(R[0] - C[0]).toFixed(2)}px,${(R[1] - C[1]).toFixed(2)}px) scale(${sc.toFixed(4)})`; inst.frame.style.transformOrigin = '0 0';
    inst.frame.style.opacity = clamp((t - t0) / 0.12).toFixed(3);
    if (m.broll) pushBroll(st, m.broll, R, t, m.at != null ? m.at : t0, {radius: (G.radius || 27) * sc, focus: m.focus, opacity: clamp((t - t0) / 0.12)});
    else if (m === 'speaker' || m.speaker) { const eye = [R[0] + R[2] / 2, R[1] + R[3] * 0.36];
      pushMedia(st, R, cropFor(st.seg, st.frame - segById(st.seg).first, R, 1, eye[0], eye[1], null, R[3] / (SRCH() / (m.zoom || 1.6))), {radius: (G.radius || 27) * sc}); }
    if (inst.badge) badgePop(inst.badge, t - t0 - 0.05);
    if (inst.title) { inst.title.style.opacity = clamp((t - t0 - 0.05) / 0.25).toFixed(3); typeOn(inst.title, t, t0 + 0.05, 55); }
    if (inst.list) inst.list(t);
    if (inst.foot) typeOn(inst.foot, t, p.footer.t, 45);
    st.cam = {s: 1 + (p.drift != null ? p.drift : 0.06) * inOutSine((t - t0) / Math.max(1, inst.spec.t1 - t0)), ox: W / 2, oy: H * 0.45};
  }
});

// cardRow — a row of glowing portrait image cards along the top, sliding left continuously (hook "these edits");
// behindHead hides them behind the person (needs masks). params: y 232, w 270, h 480, gap 57, images [...], speed 60 px/s, behindHead
registerTemplate('cardRow', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, G = S('glow', {}), w = p.w || 270, h = p.h || 480, gap = p.gap || 57;
    inst.row = el('div', 'abs', inst.root, `left:0;top:${p.y || 232}px;height:${h}px;display:flex;gap:${gap}px`);
    inst.cards = (p.images || []).map((im, i) => { const c = el('div', 'trk', inst.row, `width:${w}px;height:${h}px;flex:none;border-radius:${G.rowRadius || 14}px;overflow:hidden;` +
      `border:3px solid ${G.rowRim || 'rgba(245,235,255,.95)'};box-shadow:0 0 16px ${G.rowGlow || 'rgba(230,200,255,.85)'},0 0 44px rgba(170,110,255,.5);box-sizing:border-box;background:#d9d4cc`);
      el('img', '', c, 'width:100%;height:100%;object-fit:cover').src = asset(im); return c; });
    inst.w = (w + gap) * inst.cards.length;
  },
  render(inst, t, st) {
    const p = inst.spec.params, s = inst.spec, a = outCubic((t - s.t0) / 0.5), ex = clamp((t - (s.t1 - 0.3)) / 0.3);
    const x = (p.x != null ? p.x : -40) + (1 - a) * 420 - (p.speed || 60) * (t - s.t0);
    inst.row.style.transform = `translateX(${x.toFixed(2)}px)`; inst.row.style.opacity = (clamp((t - s.t0) / 0.25) * (1 - ex)).toFixed(3);
    inst.row.style.filter = ex > 0 ? `blur(${(10 * ex).toFixed(1)}px)` : 'none';
    if (p.behindHead) st.occlude = {rect: [0, (p.y || 232) - 20, W, (p.h || 480) + 40]};
  }
});

// videoCard — frosted glass "watch the full video" card: thumbnail, 2-line title, channel row, description.
// params: x 177, y 1326, w 726, thumb (asset), title, channel, avatar (asset, optional), desc
registerTemplate('videoCard', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, V = S('videoCard', {}), w = p.w || 726, h = p.h || 234;
    const c = inst.c = el('div', 'abs trk', inst.root, `left:${p.x != null ? p.x : 177}px;top:${p.y || 1326}px;width:${w}px;height:${h}px;border-radius:${V.radius || 22}px;` +
      `background:${V.fill || 'linear-gradient(180deg,rgba(255,255,255,.20),rgba(255,255,255,.10))'};border:1.5px solid ${V.edge || 'rgba(255,255,255,.28)'};box-shadow:0 18px 40px rgba(0,0,0,.25);display:flex;gap:18px;padding:22px;box-sizing:border-box`);
    const th = el('div', '', c, `width:${Math.round((h - 44) * 16 / 9)}px;height:${h - 44}px;border-radius:12px;overflow:hidden;flex:none;background:#222`);
    if (p.thumb) el('img', '', th, 'width:100%;height:100%;object-fit:cover').src = asset(p.thumb);
    const col = el('div', '', c, `display:flex;flex-direction:column;gap:10px;min-width:0;font-family:${V.family || 'Inter'};color:#fff`);
    el('div', '', col, `font:600 27px ${V.family || 'Inter'};line-height:1.2;letter-spacing:-0.01em`).textContent = p.title || '';
    const ch = el('div', '', col, `display:flex;align-items:center;gap:10px;font:400 19px ${V.family || 'Inter'};color:rgba(255,255,255,.85)`);
    const av = el('div', '', ch, 'width:30px;height:30px;border-radius:50%;background:#3aa0ff;overflow:hidden;flex:none');
    if (p.avatar) el('img', '', av, 'width:100%;height:100%;object-fit:cover').src = asset(p.avatar);
    el('span', '', ch).textContent = p.channel || '';
    el('div', '', col, `font:400 18px ${V.family || 'Inter'};line-height:1.3;color:rgba(255,255,255,.8)`).textContent = p.desc || '';
  },
  render(inst, t, st) {
    const s = inst.spec, a = spring(t - s.t0, 1.9, 0.75), ex = clamp((t - (s.t1 - 0.3)) / 0.3), op = clamp((t - s.t0) / 0.2) * (1 - inCubic(ex));
    inst.c.style.opacity = op.toFixed(3); inst.c.style.transform = `translateY(${((1 - a) * 40).toFixed(2)}px)`;
    inst.c.style.filter = (1 - op) > 0.02 ? `blur(${(8 * (1 - op)).toFixed(1)}px)` : 'none';
    frostBehind(st, inst.c, S('videoCard.blur', 14), op);
  }
});

// leaderLabel — thin line from a point on a card to a small label that types on ("Edges of the screen").
// params: from [x,y], to [x,y], text, at (default t0), align 'left'|'right'|'center', width 220
registerTemplate('leaderLabel', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, L = S('leader', {}), [x0, y0] = p.from, [x1, y1] = p.to;
    inst.sv = svgEl('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`}, inst.root); inst.sv.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    inst.ln = svgEl('path', {d: `M${x0},${y0} L${x1},${y1}`, stroke: L.color || '#fff', 'stroke-width': L.w || 2.2, fill: 'none'}, inst.sv); inst.len = Math.hypot(x1 - x0, y1 - y0);
    const wd = p.width || 220, al = p.align || (x1 >= x0 ? 'left' : 'right');
    const lx = al === 'left' ? x1 + 12 : al === 'right' ? x1 - 12 - wd : x1 - wd / 2, ly = al === 'center' ? (y1 > y0 ? y1 + 10 : y1 - 70) : y1 - 22;
    inst.tx = typeSetup(el('div', 'abs', inst.root, `left:${lx}px;top:${ly}px;width:${wd}px;text-align:${al === 'center' ? 'center' : al};font:${L.font || '500 22px Montserrat'};line-height:1.25;color:${L.text || '#EDEBF7'}`), p.text);
  },
  render(inst, t) {
    const p = inst.spec.params, at = p.at != null ? p.at : inst.spec.t0, d = outCubic((t - at) / 0.3);
    inst.ln.setAttribute('stroke-dasharray', `${inst.len} ${inst.len}`); inst.ln.setAttribute('stroke-dashoffset', ((1 - d) * inst.len).toFixed(2)); inst.ln.style.opacity = t < at ? 0 : 1;
    typeOn(inst.tx, t, at + 0.2, 40);
  }
});
