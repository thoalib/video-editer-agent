// ELEMENT templates for spoken text. Every word carries its own reveal time (seconds on the final timeline).
// words: [[text, t, opts]] where opts = {accent, box, thin, outline, size, css}

// chestCaption — small line + big key words (+ underline) near the chest. Look comes from style.caption.
// params: x (540), y (1080), line1 [[w,t]], big [[w,t]], underline t (null = none), align
registerTemplate('chestCaption', {
  kind: 'element',
  build(inst, s, ctx) {
    const p = s.params, C = S('caption', {}), L1 = C.line1 || {}, B = C.big || {};
    const lines = [];
    if (p.line1 && p.line1.length) lines.push({font: L1.font, size: L1.size || 60, stroke: L1.stroke, color: L1.color, upper: L1.upper, ls: L1.ls, style: C.shadow ? `text-shadow:${C.shadow}` : '', words: p.line1});
    lines.push({font: B.font, size: B.size || 104, stroke: B.stroke, color: B.color, upper: B.upper, ls: B.ls, lh: B.lh || 0.86, mt: B.mt != null ? B.mt : 4,
                style: C.shadow ? `text-shadow:${C.shadow}` : '', words: p.big || []});
    inst.g = makeGroup({x: p.x != null ? p.x : W / 2, y: p.y != null ? p.y : Math.round(H * 0.5625), align: p.align || 'center', t0: s.t0, t1: s.t1, lines}, inst.root);
    const U = C.underline || {};
    if (p.underline != null && U.type) {
      const sv = svgEl('svg', {viewBox: '0 0 100 12', preserveAspectRatio: 'none', class: 'trk'}, inst.g.box);
      const colors = U.colors || ['#1BF2F8'], gid = 'ug' + inst.id;
      sv.style.cssText = `position:absolute;overflow:visible;filter:drop-shadow(0 0 5px ${U.glow || colors[0]}) drop-shadow(0 0 14px ${U.glow2 || 'rgba(27,242,248,.55)'})`;
      const defs = svgEl('defs', {}, sv), cp = svgEl('clipPath', {id: 'c' + gid}, defs);
      const lg = svgEl('linearGradient', {id: gid, x1: '0', y1: '0', x2: '1', y2: '0'}, defs);
      colors.forEach((c, i) => svgEl('stop', {offset: colors.length > 1 ? i / (colors.length - 1) : 0, 'stop-color': c}, lg));
      inst.uRect = svgEl('rect', {x: 0, y: -10, width: 0, height: 40}, cp);
      const d = U.type === 'bar' ? 'M0,3 L100,3 L100,9 L0,9 Z' : 'M0,11 C22,4.6 55,0.4 100,0.9 C62,4.9 30,9.0 0,11 Z';
      svgEl('path', {d, fill: `url(#${gid})`, 'clip-path': `url(#c${gid})`}, sv);
      inst.u = sv;
      const bigIdx = lines.length - 1;
      ctx.layoutHooks.push(() => { const m = lineMetrics(inst.g, bigIdx);
        const ww = m.width * (U.widthK || 1.24), x = m.left - m.width * (U.leftK != null ? U.leftK : 0.13), y = m.base + (U.dyEm != null ? U.dyEm : 0.18) * m.em;
        Object.assign(sv.style, {left: x + 'px', top: y + 'px', width: ww + 'px', height: (U.h || 36) + 'px'}); });
    }
  },
  render(inst, t) {
    runGroup(inst.g, t);
    if (inst.u) { const at = inst.spec.params.underline; inst.uRect.setAttribute('width', (outCubic((t - at) / 0.4) * 100).toFixed(2)); inst.u.style.opacity = t < at ? 0 : 1; }
  }
});

// nameTag — white pill with avatar + name + role when a speaker first appears. params: name, role, avatar ('auto'), x, y
registerTemplate('nameTag', {
  kind: 'element',
  build(inst, s, ctx) {
    const p = s.params, T = S('nameTag', {});
    const n = inst.n = el('div', 'abs trk', inst.root, `left:${p.x || 80}px;top:${p.y || 250}px;height:96px;border-radius:48px;background:${T.bg || '#fff'};display:flex;flex-direction:row;flex-wrap:nowrap;width:max-content;white-space:nowrap;align-items:center;padding:0 34px 0 12px;box-shadow:0 10px 30px rgba(0,0,0,.28)`);
    el('div', '', n, `width:72px;height:72px;border-radius:50%;background:url(${ctx.base}${p.avatar && p.avatar !== 'auto' ? p.avatar : 'avatar.jpg'}) center/cover;margin-right:18px;flex:none;${T.ring ? 'box-shadow:0 0 0 3px ' + T.ring : ''}`);
    const box = el('div', '', n, 'display:flex;flex-direction:column;justify-content:center');
    el('div', '', box, `font:${T.nameFont || '700 32px Heros'};color:${T.name || '#111'};letter-spacing:-0.02em;line-height:1.05`).textContent = p.name || '';
    if (p.role) el('div', '', box, `font:${T.roleFont || '400 24px Heros'};color:${T.role || '#6b6b6b'};letter-spacing:-0.01em;line-height:1.15`).textContent = p.role;
  },
  render(inst, t) {
    const s = inst.spec, i = spring(t - s.t0, 1.9, 0.62), o = clamp((t - (s.t1 - 0.22)) / 0.2);
    inst.n.style.opacity = (clamp(i * 1.6) * (1 - inCubic(o))).toFixed(3);
    inst.n.style.transform = `translateY(${((1 - i) * 34 - 14 * inCubic(o)).toFixed(2)}px)`;
  }
});

// pointerCaption — small triangle + line beside the mouth ("speech pointer"). params: words, anchor 'mouth'|[x,y], dx, dy
registerTemplate('pointerCaption', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, P = S('pointer', {}), first = p.words.length ? p.words[0][1] : s.t0;
    const tri = `color:transparent;font-size:1px;width:46px;height:40px;margin-right:16px;vertical-align:-2px;-webkit-text-stroke:0;background:${P.fill || 'linear-gradient(160deg,#9BEBFF,#41CFF8 45%,#1C8FD6)'};clip-path:polygon(0 50%,100% 0,100% 100%);filter:drop-shadow(3px 5px 6px rgba(0,0,0,.45))`;
    inst.g = makeGroup({x: 0, y: 0, t0: s.t0, t1: s.t1, lines: [{font: P.font || S('fonts.caption'), size: P.size || 54, stroke: P.stroke != null ? P.stroke : 1.6, color: P.color || '#EDEDED',
      style: `text-shadow:${P.shadow || '4px 6px 8px rgba(0,0,0,.45)'}`, words: [['▶', first - 0.04, tri], ...p.words]}]}, inst.root);
  },
  render(inst, t, st, ctx) {
    const p = inst.spec.params;
    let at = Array.isArray(p.anchor) ? p.anchor : null;
    if (!at) { const m = ctx.faceOut('mouth', 40); at = m || [W * 0.45, H * 0.47]; at = [at[0] + (p.dx != null ? p.dx : 150), at[1] + (p.dy != null ? p.dy : -28)]; }
    inst.g.style.left = at[0].toFixed(1) + 'px'; inst.g.style.top = at[1].toFixed(1) + 'px';
    runGroup(inst.g, t);
  }
});

// wallWords — big words "printed on the wall" around the head, strong drop shadow; behindHead hides them behind the
// person (needs person masks: run.py frames JOB --masks <segment ids>). params: items [{text, t, x, y, kind:'small'|'serif'|'bold'|'heavy', size}], behindHead
registerTemplate('wallWords', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, Wd = S('wallWords', {});
    inst.items = (p.items || []).map(it => {
      const k = it.kind || 'serif', base = {small: Wd.small || "400 54px Heros", serif: Wd.serif || "400 120px Marcellus", bold: Wd.bold || "700 84px Heros", heavy: Wd.heavy || 'italic 900 170px Inter'}[k];
      const color = it.color || {small: Wd.smallColor || '#ECECE4', serif: Wd.color || '#F5FF95', bold: Wd.boldColor || '#F9FFA2', heavy: Wd.heavyColor || '#FFFFFF'}[k];
      const stroke = Wd.strokes ? Wd.strokes[k] || 0 : {small: 1.4, serif: 3.8, bold: 0, heavy: 0}[k];
      const sh = (Wd.shadows || {})[k] || (k === 'small' ? '5px 8px 9px rgba(0,0,0,.55)' : '9px 15px 12px rgba(0,0,0,.6)');
      const e = el('div', 'abs trk nowrap', inst.root, `left:${it.x}px;top:${it.y}px;font:${base};${it.size ? `font-size:${it.size}px;` : ''}color:${color};letter-spacing:${k === 'serif' ? '0' : '-0.01em'};` +
        (stroke ? `-webkit-text-stroke:${it.stroke != null ? it.stroke : stroke}px ${color};` : '') + `text-shadow:${sh}`);
      if (it.align === 'center') ctx.layoutHooks.push(() => { e.style.left = (it.x - e.offsetWidth / 2) + 'px'; });
      e.textContent = it.text; e.t = it.t; return e;
    });
  },
  render(inst, t, st) {
    for (const e of inst.items) wordStyle(e, t - e.t, 1, parseFloat(getComputedStyle(e).fontSize));
    if (inst.spec.params.behindHead) {
      const r = inst.spec.params.occlude || (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const e of inst.items) { const b = e.getBoundingClientRect(), s = st.cam.s, o = [st.cam.ox, st.cam.oy];
          const a = [(b.left - o[0]) / s + o[0], (b.top - o[1]) / s + o[1], (b.right - o[0]) / s + o[0], (b.bottom - o[1]) / s + o[1]];
          x0 = Math.min(x0, a[0]); y0 = Math.min(y0, a[1]); x1 = Math.max(x1, a[2]); y1 = Math.max(y1, a[3]); }
        return [x0 - 30, y0 - 30, x1 - x0 + 60, Math.min(y1, H * 0.375) - y0 + 60]; })();
      st.occlude = {rect: r};
    }
  }
});

// stackedCaption — mixed-size stacked lines ("instead / Understanding / the / Big picture"). Set ride:true on the element
// so it travels into a phone frame with the footage. params: x, y, lines [{size, words, indent, mt, stroke}]
registerTemplate('stackedCaption', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, C = S('stacked', {});
    inst.g = makeGroup({x: p.x != null ? p.x : 125, y: p.y != null ? p.y : 1130, t0: s.t0, t1: s.t1, align: p.align,
      lines: p.lines.map(L => Object.assign({font: C.font || S('fonts.caption'), stroke: L.size > 80 ? (C.bigStroke || 2.3) : (C.stroke || 1.35), color: C.color, style: C.shadow ? `text-shadow:${C.shadow}` : ''}, L))}, inst.root);
  },
  render(inst, t) { runGroup(inst.g, t); }
});

// pointerLines — stacked lines, each led by a small triangle, beside a circle-framed speaker; optional sparkles.
// params: x (387), rows [{y, words}], sparkles true | [[x,y,scale,blur,rot,t],...]
registerTemplate('pointerLines', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, P = S('pointerLines', {});
    inst.gs = p.rows.map(r => makeGroup({x: p.x != null ? p.x : 387, y: r.y, t0: s.t0, t1: s.t1, lines: [{font: P.font || S('fonts.caption'), size: P.size || 40, stroke: 1.0, color: P.color || '#E6E6E4',
      style: 'text-shadow:0 2px 8px rgba(0,0,0,.35)', words: [['◀', r.words[0][1] - 0.06, `color:${P.tri || '#FEFFA2'};font-size:32px;-webkit-text-stroke:0;vertical-align:3px;margin-right:10px`], ...r.words]}]}, inst.root));
    inst.sp = [];
    if (p.sparkles) {
      const list = Array.isArray(p.sparkles) ? p.sparkles : [[690, 225, 1.8, 2.2, -8, 0.02], [858, 975, 1.05, 0, 14, 0.22], [397, 1492, 0.85, 0, -20, 0.12], [520, 1680, 0.6, 1.2, 30, 0.37]];
      const d = 'M0,-50 C2.6,-9 9,-2.6 50,0 C9,2.6 2.6,9 0,50 C-2.6,9 -9,2.6 -50,0 C-9,-2.6 -2.6,-9 0,-50 Z', c = S('colors.sparkle', '#FBF163');
      for (const [x, y, sc, b, rot, dt] of list) {
        const sv = svgEl('svg', {width: 240, height: 240, viewBox: '-120 -120 240 240', class: 'trk'}, inst.root);
        sv.style.cssText = `position:absolute;left:${x - 120}px;top:${y - 120}px;overflow:visible;filter:${b ? `blur(${b}px) ` : ''}drop-shadow(0 0 5px ${c}b3) drop-shadow(0 0 16px ${c}47)`;
        const g = svgEl('g', {}, sv); svgEl('path', {d, fill: c}, g); inst.sp.push({g, sc, rot, t: s.t0 + dt});
      }
    }
  },
  render(inst, t) {
    inst.gs.forEach(g => runGroup(g, t));
    inst.sp.forEach((q, i) => { const ap = spring(t - q.t, 1.6, 0.6), rot = q.rot + (i % 2 ? 1 : -1) * 9 * (t - inst.spec.t0), fl = Math.sin((t - inst.spec.t0) * 1.1 + i) * 6;
      q.g.setAttribute('transform', `translate(0 ${fl.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${(q.sc * Math.max(0.0001, ap)).toFixed(4)})`); });
  }
});

// subtitles — full spoken captions, one short phrase at a time, active word highlighted (captions-only / accessible edits).
// params: phrases [{t0, t1, words:[[w,t]]}], y (1360), maxWidth 900
registerTemplate('subtitles', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, T = S('subtitles', {});
    inst.gs = (p.phrases || []).map(ph => makeGroup({x: W / 2, y: p.y || Math.round(H * (H > W * 1.5 ? 0.71 : 0.85)), align: 'center', t0: ph.t0, t1: ph.t1,
      lines: [{font: T.font || '700 58px Inter', size: T.size || 58, stroke: T.stroke || 0, color: T.color || '#fff', upper: T.upper, style: `text-shadow:${T.shadow || '0 3px 12px rgba(0,0,0,.55)'}`, words: ph.words}]}, inst.root));
  },
  render(inst, t) {
    const hi = S('subtitles.active', null);
    inst.gs.forEach(g => { if (!runGroup(g, t, 0.08)) return;
      if (hi) g.words.forEach((w, i) => { const nx = g.words[i + 1]; w.e.style.color = (t >= w.t && (!nx || t < nx.t)) ? hi : ''; }); });
  }
});
