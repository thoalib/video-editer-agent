// listCard — frosted 3D notebook card: title + numbered rows written word by word as they are spoken; slow 3D drift.
// Put it on layer:"screen" so the footage push happens behind it. params: rect [143,570,848,870], title [[w,t]],
// rows [[[w,t],...], ...], tilt {x:7, y:-15, z:-9.5}, tiltFrom, tiltTo, defocusAt (card blurs back when the next beat starts)
registerTemplate('listCard', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, R = p.rect || [143, 570, 848, 870], K = S('card', {});
    inst.wrap = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px;perspective:1500px;perspective-origin:${R[0] + R[2] / 2}px ${R[1] + R[3] / 2 + 65}px`);
    const c = inst.card = el('div', 'abs trk', inst.wrap, `left:${R[0]}px;top:${R[1]}px;width:${R[2]}px;height:${R[3]}px;border-radius:${K.radius || 27}px;transform-style:preserve-3d;` +
      `background:${K.fill || 'linear-gradient(162deg,rgba(86,86,84,.95) 0%,rgba(58,58,57,.95) 38%,rgba(44,44,44,.96) 100%)'};` +
      'box-shadow:0 40px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.08);overflow:hidden');
    el('div', 'abs', c, `left:0;top:0;width:${R[2]}px;height:${R[3]}px;background:radial-gradient(ellipse 70% 45% at 30% 18%,rgba(255,255,255,.10),rgba(255,255,255,0) 70%),radial-gradient(ellipse 60% 40% at 80% 85%,rgba(255,255,255,.05),rgba(255,255,255,0) 70%)`);
    inst.sheen = el('div', 'abs', c, 'left:-300px;top:-200px;width:500px;height:1400px;transform:rotate(28deg);background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.07) 45%,rgba(255,255,255,.11) 50%,rgba(255,255,255,.07) 55%,rgba(255,255,255,0))');
    const ink = K.line || '255,255,255', ys = [96, 196, 296, 400, 506, 614, 724, 834].map(y => Math.round(y * R[3] / 870));
    for (let i = 0; i < 8; i++) el('div', 'abs', c, `left:${i === 0 ? 40 : 30}px;top:${ys[i]}px;width:${R[2] - (i === 0 ? 78 : 58)}px;height:2px;background:linear-gradient(90deg,rgba(${ink},.15),rgba(${ink},.85) 18%,rgba(${ink},.75) 70%,rgba(${ink},.12));box-shadow:0 0 6px rgba(${ink},.25)`);
    inst.margin = el('div', 'abs', c, `left:128px;top:34px;width:2px;height:${R[3] - 100}px;background:linear-gradient(180deg,rgba(${ink},.75),rgba(${ink},.35));transform-origin:top;box-shadow:0 0 6px rgba(${ink},.3)`);
    inst.rows = [];
    const add = (num, y, size, words, stroke) => { const row = {words: []};
      if (num) { row.num = el('div', 'abs trk', c, `left:62px;top:${y + 8}px;font:italic 400 30px Heros;color:${K.num || '#d4d4d4'};letter-spacing:-0.02em`); row.num.textContent = num; row.numT = words[0][1] - 0.08; }
      const line = el('div', 'abs nowrap', c, `left:150px;top:${y}px;font:${K.font || '400 40px Heros'};font-size:${size}px;color:${K.text || '#fff'};letter-spacing:-0.01em;line-height:1;-webkit-text-stroke:${stroke}px ${K.text || '#fff'}`);
      words.forEach(([w, t], i) => { const sp = el('span', 'w trk', line); sp.textContent = w; row.words.push({e: sp, t, em: size}); if (i < words.length - 1) line.appendChild(document.createTextNode(' ')); });
      inst.rows.push(row); };
    if (p.title) add('', 44, K.titleSize || 44, p.title, 1.1);
    (p.rows || []).forEach((r, i) => add(String(i + 1).padStart(2, '0'), 146 + i * 100 + (i >= 3 ? 4 * (i - 2) : 0), K.rowSize || 38, r, 0.8));
  },
  render(inst, t) {
    const s = inst.spec, p = s.params, tl = Object.assign({x: 7, y: -15, z: -9.5}, p.tilt || {}), t0 = s.t0;
    const df = p.defocusAt != null ? outCubic((t - p.defocusAt) / 0.3) : 0;
    const a = clamp((t - t0) / 0.2), rp = df > 0 ? 1 : inOutSine((t - (p.tiltFrom != null ? p.tiltFrom : t0 + 0.56)) / ((p.tiltTo != null ? p.tiltTo : (p.defocusAt || s.t1) - 0.1) - (p.tiltFrom != null ? p.tiltFrom : t0 + 0.56)));
    const yIn = df > 0 ? 0 : 46 * (1 - settle(t - t0, 0.16)), sc = df > 0 ? 1 - 0.04 * df : 0.965 + 0.035 * settle(t - t0, 0.16);
    inst.card.style.opacity = (df > 0 ? lerp(1, 0.38, df) : a).toFixed(3);
    inst.card.style.filter = df > 0 ? `blur(${(12 * df).toFixed(2)}px)` : 'none';
    inst.card.style.transform = `translateY(${yIn.toFixed(2)}px) rotateX(${(tl.x * rp).toFixed(3)}deg) rotateY(${(tl.y * rp).toFixed(3)}deg) rotateZ(${(tl.z * rp).toFixed(3)}deg) scale(${sc.toFixed(4)})`;
    inst.margin.style.transform = `scaleY(${outCubic((t - t0 - 0.06) / 0.9).toFixed(4)})`;
    inst.sheen.style.transform = `translateX(${(-80 + 900 * inOutSine((t - t0 - 0.26) / 7.8)).toFixed(1)}px) rotate(28deg)`;
    inst.rows.forEach(r => { if (r.num) wordStyle(r.num, t - r.numT, -1, 30); r.words.forEach(w => wordStyle(w.e, t - w.t, -1, w.em)); });
  }
});

// neonChart — glowing line chart that draws on, with a caption in the same colour. params: points [[x,y],...],
// drawAt, dur 0.67, caption {x, y, lines:[[[w,t]...], ...]}, color (style.colors.chart)
registerTemplate('neonChart', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, col = S('chart', {}), pts = p.points || [[192, 1222], [300, 1002], [387, 1149], [430, 811], [540, 997], [630, 885], [745, 930], [820, 730]];
    const sv = inst.sv = svgEl('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`}, inst.root);
    sv.style.cssText = `position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(0 0 7px ${col.glow || 'rgba(120,255,100,.85)'}) drop-shadow(0 0 22px ${col.glow2 || 'rgba(110,255,90,.45)'})`;
    const gid = 'cg' + inst.id, a = pts[0], b = pts[pts.length - 1];
    const lg = svgEl('linearGradient', {id: gid, x1: a[0], y1: a[1], x2: b[0], y2: b[1], gradientUnits: 'userSpaceOnUse'}, svgEl('defs', {}, sv));
    (col.stops || [['0', '#D4FFCC'], ['0.35', '#8BFF81'], ['1', '#5CFF48']]).forEach(([o, c]) => svgEl('stop', {offset: o, 'stop-color': c}, lg));
    inst.path = svgEl('path', {d: 'M' + pts.map(q => q.join(',')).join(' L'), fill: 'none', stroke: `url(#${gid})`, 'stroke-width': 6.5, 'stroke-linejoin': 'miter', 'stroke-linecap': 'round', class: 'trk'}, sv);
    if (p.caption) inst.g = makeGroup({x: p.caption.x != null ? p.caption.x : 114, y: p.caption.y != null ? p.caption.y : 632, t0: s.t0 + 0.04, t1: s.t1,
      lines: p.caption.lines.map((ws, i) => ({size: col.capSize || 64, stroke: 2.4, color: col.text || '#8FFF85', mt: i ? -12 : 0, words: ws}))}, inst.root);
  },
  render(inst, t) {
    const p = inst.spec.params; if (!inst.len) inst.len = inst.path.getTotalLength();
    const dp = outCubic((t - p.drawAt) / (p.dur || 0.67));
    inst.path.setAttribute('stroke-dasharray', `${inst.len} ${inst.len}`); inst.path.setAttribute('stroke-dashoffset', ((1 - dp) * inst.len).toFixed(2));
    inst.path.style.opacity = t < p.drawAt ? 0 : 1;
    if (inst.g) runGroup(inst.g, t);
  }
});
