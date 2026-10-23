// SHOT routeMap — dark map, puck drives a route past numbered markers (one per spoken step) and arrives at a reward
// badge. Follow camera (gaussian-smoothed position + partial heading follow), drifting light dashes, 180-degree smear.
// params: markers [{num:'01', label:'aspects', at:t}], reward {at, icon:'chart'|'check'|'star'|'trophy', label:[[w,t],...]},
//         route [[x,y],...] (optional; procedural otherwise), d [..] marker distances (optional), shiftX 160 (camera eases
//         right before arrival to make room for the label), colors from style.map
registerTemplate('routeMap', {
  kind: 'shot',
  build(inst, s) {
    const p = s.params || {}, M = inst.M = {}, n = (p.markers || []).length;
    if (p.route) M.routeRaw = p.route;
    else { const r = seeded(7 + n); M.routeRaw = [[0, 0]]; let y = 0, x = 0;
      for (let i = 0; i < 4 + 3 * n; i++) { y -= 200 + r() * 140; x = (i % 2 ? 1 : -1) * (40 + r() * 70); M.routeRaw.push([x, y]); } }
    let r = M.routeRaw; for (let it = 0; it < 3; it++) { const o = [r[0]]; for (let i = 0; i < r.length - 1; i++) { const a = r[i], b = r[i + 1];
      o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } o.push(r[r.length - 1]); r = o; }
    M.route = r; M.cum = [0];
    for (let i = 1; i < r.length; i++) M.cum.push(M.cum[i - 1] + Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]));
    M.len = M.cum[M.cum.length - 1];
    const rnd = seeded(7); M.roads = [];
    for (let i = 1; i < M.routeRaw.length - 1; i++) { const q = M.routeRaw[i], dir = i % 2 ? 1 : -1;
      M.roads.push([[q[0], q[1]], [q[0] + dir * (220 + rnd() * 160), q[1] + (rnd() - 0.5) * 140], [q[0] + dir * (520 + rnd() * 200), q[1] - 60 + (rnd() - 0.5) * 200]]);
      if (i % 3 === 0) M.roads.push([[q[0], q[1]], [q[0] - dir * (260 + rnd() * 120), q[1] - 90], [q[0] - dir * 600, q[1] - 260]]); }
    const R1 = M.routeRaw[1] || [0, -260], RL = M.routeRaw[M.routeRaw.length - 1];
    M.roads.push([[-600, -120], [-200, -160], R1]); M.roads.push([R1, [380, -330], [700, -300]]);
    M.roads.push([RL, [RL[0], RL[1] - 400]]); M.roads.push([[0, 0], [0, 400]]);
    const pr = seeded(99); M.parts = [];
    for (let i = 0; i < 64; i++) { const q = {x: pr() * W, y: pr() * H, a: pr() * Math.PI}; q.w = pr(); q.h = pr(); q.z = 0.4 + pr() * 0.9; q.al = 0.55 + pr() * 0.4; q.sp = (pr() - 0.5) * 0.8; M.parts.push(q); }
    const t0 = s.t0, rw = p.reward || {};
    const span = M.len - 470;
    M.markers = (p.markers || []).map((m, i) => ({txt: m.num || String(i + 1).padStart(2, '0'), label: m.label || '', lt: m.at,
      d: p.d ? p.d[i] : (n > 1 ? 40 + i * span / (n - 1 + 0.6) : 40)}));
    // puck schedule: hold at marker 1, run into each next marker (arrive just after it is spoken), final run to the reward
    const P = [[t0, M.markers[0] ? M.markers[0].d : 40]];
    if (M.markers[0]) P.push([Math.max(t0 + 0.3, M.markers[0].lt + 0.35), M.markers[0].d]);
    for (let i = 1; i < M.markers.length; i++) { P.push([M.markers[i].lt - 0.65, M.markers[i - 1].d]); P.push([M.markers[i].lt + 0.10, M.markers[i].d]); }
    if (rw.at != null) { const last = P[P.length - 1][1]; P.push([rw.at - 1.07, last]); P.push([rw.at - 0.07, Math.min(M.len - 20, last + 450)]); }
    M.P = p.puck || P;
    M.cv = el('canvas', 'abs', inst.root); M.cv.width = W; M.cv.height = H; M.g = M.cv.getContext('2d');
    // reward badge (DOM so text stays crisp)
    if (rw.at != null) {
      const b = M.badge = el('div', 'abs trk', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
      const ax = (p.anchor || [540, 1060])[0] + (p.shiftX != null ? p.shiftX : 160), ay = (p.anchor || [540, 1060])[1];
      M.bc = [ax, ay - 205];
      b.icon = el('div', 'abs', b, `left:${ax - 175}px;top:${ay - 380}px;width:350px;height:350px;border-radius:84px;transform-origin:50% 100%;` +
        `background:${S('map.badgeFill', 'linear-gradient(145deg,#FFF3B8 0%,#F4D36A 28%,#D9A22E 55%,#9C6614 80%,#E9C25A 100%)')};box-shadow:0 30px 70px rgba(0,0,0,.6), 0 0 60px ${S('map.badgeGlow', 'rgba(250,220,90,.35)')}, inset 0 3px 0 rgba(255,255,255,.7), inset 0 -8px 18px rgba(80,40,0,.45)`);
      const ink = S('map.badgeInk', ['#7a4b0c', '#4e2e05']);
      const glyph = {chart: '<rect x="62" y="70" width="176" height="160" rx="22" fill="none" stroke="url(#gd)" stroke-width="12"/><rect x="92" y="160" width="22" height="44" rx="6" fill="url(#gd)"/><rect x="128" y="132" width="22" height="72" rx="6" fill="url(#gd)"/><rect x="164" y="110" width="22" height="94" rx="6" fill="url(#gd)"/><circle cx="210" cy="96" r="10" fill="url(#gd)"/>',
        check: '<path d="M80 155 L130 205 L225 100" fill="none" stroke="url(#gd)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>',
        star: '<path d="M150 62 L176 122 L240 128 L192 170 L206 234 L150 200 L94 234 L108 170 L60 128 L124 122 Z" fill="url(#gd)"/>',
        trophy: '<path d="M100 70 h100 v40 a50 50 0 0 1 -100 0 Z M150 160 v40 M110 220 h80" fill="none" stroke="url(#gd)" stroke-width="16" stroke-linecap="round"/><path d="M100 85 h-30 a25 25 0 0 0 30 40 M200 85 h30 a25 25 0 0 1 -30 40" fill="none" stroke="url(#gd)" stroke-width="12"/>'}[rw.icon || 'chart'];
      b.icon.innerHTML = `<svg viewBox="0 0 300 300" width="350" height="350"><defs><linearGradient id="gd${s.id || ''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink[0]}"/><stop offset="1" stop-color="${ink[1]}"/></linearGradient></defs>${glyph.replace(/url\(#gd\)/g, `url(#gd${s.id || ''})`)}</svg>`;
      b.label = makeGroup({x: 44, y: ay - 248, t0: rw.at + 0.16, t1: s.t1, lines: [{font: S('fonts.caption', '400 70px Heros'), size: 70, stroke: 1.8, words: rw.label || []}]}, b);
      b.label.style.textShadow = '0 0 16px rgba(255,255,255,.35)';
      b.rays = svgEl('svg', {width: W, height: H}, b); b.rays.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
      b.rayEls = []; for (let i = 0; i < 14; i++) b.rayEls.push(svgEl('line', {stroke: S('map.ray', '#FFE68A'), 'stroke-width': 6, 'stroke-linecap': 'round'}, b.rays));
    }
  },
  _routeAt(M, d) { d = clamp(d, 0, M.len); let i = 1; while (i < M.cum.length - 1 && M.cum[i] < d) i++;
    const a = M.route[i - 1], b = M.route[i], p = (d - M.cum[i - 1]) / (M.cum[i] - M.cum[i - 1]);
    return [lerp(a[0], b[0], p), lerp(a[1], b[1], p), Math.atan2(b[0] - a[0], -(b[1] - a[1]))]; },
  _puckD(M, t) { const P = M.P; if (t <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (t < P[i][0]) { const [a, d0] = P[i - 1], [b, d1] = P[i]; return lerp(d0, d1, inOutCubic((t - a) / Math.max(1e-6, b - a))); }
    return P[P.length - 1][1]; },
  _cam(inst, t) {
    const M = inst.M, s = inst.spec, p = s.params || {}, self = TPL.routeMap, rw = p.reward || {};
    const gs = (sigma, fn) => { let acc = null, ws = 0; const h = sigma / 6;
      for (let k = -18; k <= 18; k++) { const w = Math.exp(-0.5 * Math.pow(k * h / sigma, 2)), v = fn(clamp(t + k * h, s.t0, s.t1));
        if (!acc) acc = v.map(x => x * w); else v.forEach((x, i) => acc[i] += x * w); ws += w; } return acc.map(x => x / ws); };
    const [px, py] = gs(0.10, tt => self._routeAt(M, self._puckD(M, tt)).slice(0, 2));
    const hd = gs(0.22, tt => { const h = self._routeAt(M, self._puckD(M, tt))[2]; return [Math.sin(h), Math.cos(h)]; });
    const zIn = 1 + 0.9 * Math.exp(-Math.max(0, t - s.t0) / 0.42);
    const anchor = p.anchor || [540, 1060], shift = rw.at != null ? (p.shiftX != null ? p.shiftX : 160) * inOutCubic((t - (rw.at - 0.72)) / 0.8) : 0;
    return {px, py, rot: -Math.atan2(hd[0], hd[1]) * 0.55, z: zIn * (rw.at != null ? 1 + 0.14 * settle2(t - rw.at, 0.08) : 1), sx: anchor[0] + shift, sy: anchor[1]};
  },
  probe(inst, t) { const c = TPL.routeMap._cam(inst, t), w = (x, y) => w2s(c, x, y); return [w(0, 0), w(0, -500), w(300, -900), w(-300, -1500)]; },
  render(inst, t, st) {
    const M = inst.M, s = inst.spec, p = s.params || {}, rw = p.reward || {}, self = TPL.routeMap, g = M.g, c = self._cam(inst, t);
    const col = (k, d) => S('map.' + k, d);
    st.bg = {type: 'solid', color: col('bgRGB', [8, 8, 5])};
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = col('bg', '#080805'); g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W / 2, H * 0.52, 50, W / 2, H * 0.52, 1100); rg.addColorStop(0, col('glow', 'rgba(40,20,10,.35)')); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const path = pts => { g.beginPath(); pts.forEach((q, i) => { const a = w2s(c, q[0], q[1]); i ? g.lineTo(a[0], a[1]) : g.moveTo(a[0], a[1]); }); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = col('road', '#444444'); g.lineWidth = 40 * c.z; M.roads.forEach(r => { path(r); g.stroke(); }); path(M.route); g.stroke();
    const d = self._puckD(M, t), pts = []; for (let x = 0; x <= d; x += 12) pts.push(self._routeAt(M, x).slice(0, 2)); pts.push(self._routeAt(M, d).slice(0, 2));
    if (t >= s.t0 + 0.14 && pts.length > 1) { g.strokeStyle = '#151515'; g.lineWidth = 26 * c.z; path(pts); g.stroke();
      g.strokeStyle = col('route', '#FAFF18'); g.lineWidth = 16 * c.z; g.shadowColor = col('routeGlow', 'rgba(250,255,24,.45)'); g.shadowBlur = 10; path(pts); g.stroke(); g.shadowBlur = 0; }
    const fadeAt = rw.at != null ? rw.at - 0.62 : 1e9;
    for (const m of M.markers) { const [x, y] = self._routeAt(M, m.d), q = w2s(c, x, y + 232), ap = spring(t - s.t0 - 0.04 - m.d / 2200, 2.2, 0.6); if (ap <= 0) continue;
      const r = 70 * c.z * ap; g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; g.fillStyle = '#fff'; g.beginPath(); g.arc(q[0], q[1], r, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#1d1d1d'; g.font = `400 ${Math.round(62 * c.z * ap)}px Heros`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m.txt, q[0], q[1] + 2 * c.z);
      if (t >= m.lt && t < fadeAt + 0.3) { const lp = outCubic((t - m.lt) / 0.2); g.globalAlpha = (0.45 + 0.55 * lp) * (1 - clamp((t - fadeAt) / 0.3)); g.fillStyle = '#fff';
        g.font = `400 ${Math.round(58 * c.z)}px Heros`; g.textAlign = 'left'; g.shadowColor = 'rgba(255,255,255,.35)'; g.shadowBlur = 12;
        g.fillText(m.label, q[0] + 96 * c.z, q[1] + (1 - lp) * 18); g.shadowBlur = 0; g.globalAlpha = 1; } }
    const [ux, uy, hd] = self._routeAt(M, d), ps = w2s(c, ux, uy), pop = spring(t - s.t0 - 0.08, 3.0, 0.62);
    if (rw.at == null || t < rw.at) {
      const R = 98 * c.z * Math.max(0.0001, pop);
      if (pop > 0.02) { g.save(); g.shadowColor = col('puckGlow', 'rgba(244,114,26,.55)'); g.shadowBlur = 30; g.fillStyle = col('puck', '#F4721A'); g.beginPath(); g.arc(ps[0], ps[1], R, 0, 7); g.fill(); g.restore();
        g.strokeStyle = '#fff'; g.lineWidth = 10 * c.z; const prog = clamp((t - s.t0 - 0.19) / 1.0); g.beginPath();
        g.arc(ps[0], ps[1], R + 6 * c.z, -Math.PI / 2 + 0.35, -Math.PI / 2 + 0.35 + (Math.PI * 2 - 0.7) * outCubic(prog)); g.stroke(); }
      g.save(); g.translate(ps[0], ps[1]); g.rotate(hd + c.rot); const a = 50 * c.z * (pop > 0.02 ? 1 : 1.2); g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(0, -a); g.lineTo(a * 0.72, a * 0.75); g.lineTo(0, a * 0.36); g.lineTo(-a * 0.72, a * 0.75); g.closePath(); g.fill(); g.restore();
    }
    if (!M.sprite) { const sp = document.createElement('canvas'); sp.width = 64; sp.height = 112; const q = sp.getContext('2d');
      q.filter = 'blur(2px)'; q.shadowColor = 'rgba(255,255,255,.75)'; q.shadowBlur = 10; q.fillStyle = '#fff'; q.beginPath(); q.roundRect(14, 14, 36, 84, 18); q.fill(); M.sprite = sp; }
    const ox = w2s(c, 0, 0);
    for (const q of M.parts) { const x = ((q.x + ox[0] * q.z * 0.35) % W + W) % W, y = ((q.y + ox[1] * q.z * 0.35 + t * 40 * q.z) % H + H) % H;
      const sc = q.z * 0.62, an = q.a + t * q.sp; g.setTransform(sc * Math.cos(an), sc * Math.sin(an), -sc * Math.sin(an), sc * Math.cos(an), x, y);
      g.globalAlpha = q.al; g.drawImage(M.sprite, -32, -56); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    if (M.badge) { show(M.badge, t >= rw.at - 0.12);
      if (t >= rw.at - 0.12) { const b = M.badge, q = spring(t - rw.at, 2.4, 0.5), sc = Math.max(0.0001, 0.55 + 0.45 * q);
        b.icon.style.transform = `scale(${sc.toFixed(4)}) rotate(${(-8 * (1 - q)).toFixed(3)}deg)`; b.icon.style.opacity = clamp((t - rw.at) / 0.06).toFixed(3);
        const rp = clamp((t - rw.at) / 0.45);
        b.rayEls.forEach((l, i) => { const a = i / 14 * Math.PI * 2 + 0.2, r0 = 170 + 150 * outCubic(rp), r1 = r0 + 70 * (1 - rp);
          l.setAttribute('x1', M.bc[0] + Math.cos(a) * r0); l.setAttribute('y1', M.bc[1] + Math.sin(a) * r0); l.setAttribute('x2', M.bc[0] + Math.cos(a) * r1); l.setAttribute('y2', M.bc[1] + Math.sin(a) * r1);
          l.setAttribute('opacity', (1 - rp).toFixed(3)); });
        runGroup(b.label, t); } }
  }
});
function w2s(c, x, y) { const dx = (x - c.px) * c.z, dy = (y - c.py) * c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot); return [c.sx + dx * cs - dy * sn, c.sy + dx * sn + dy * cs]; }
