// chatMock — self-made b-roll: a filmed-looking chat screen. Place it inside a phone shot ("in": "<phone shot id>")
// or a split-screen card. variant 'text' types a plain answer; variant 'widget' shows an interactive card
// (bars recalculating while a slider moves, a button press). serif label top-right, caption bottom-left.
// params: variant, label ('Free'), badge ('Free'), header ('AI Chat'), prompt, lines [...] (text variant),
//         widget {intro, title, sub:'₹10,00,000 · {v} years', bars:[{label, values:[...] }], slider:{label, keys:[[t,v],...], min, max},
//                 format:'₹', press:t}, captions [{t0, t1, small:[[w,t]], big:[[w,t]]}], size [701,1245]
registerTemplate('chatMock', {
  kind: 'element',
  build(inst, s, ctx) {
    const p = s.params, host = s.in ? ctx.containers[s.in] : null, sz = p.size || (host && host.R ? [host.R[2], host.R[3]] : [701, 1245]);
    const M = S('chatMock', {}), acc = S('colors.highlight', '#F5FF95');
    const b = inst.clip = el('div', 'abs', inst.root, `left:0;top:0;width:${sz[0]}px;height:${sz[1]}px;border-radius:33px;overflow:hidden;background:${M.bg || '#0c0d09'}`);
    const scene = el('div', 'abs', b, `left:0;top:0;width:${sz[0]}px;height:${sz[1]}px;perspective:1600px`);
    el('div', 'abs', scene, `left:-250px;top:-200px;width:1200px;height:1600px;background:radial-gradient(ellipse 45% 38% at 58% 38%,${M.glow || 'rgba(170,150,80,.38)'},rgba(0,0,0,0) 72%)`);
    const sw = sz[0] - 44, sh = Math.round(sz[1] * 0.8);
    const scr = inst.scr = el('div', 'abs', scene, `left:22px;top:96px;width:${sw}px;height:${sh}px;border-radius:30px;background:linear-gradient(180deg,#1a1b17,#121310);box-shadow:0 40px 90px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.07);overflow:hidden;transform-origin:50% 40%`);
    const hdr = el('div', 'abs', scr, `left:0;top:0;width:${sw}px;height:96px;border-bottom:1px solid rgba(255,255,255,.08);font:700 32px Heros;color:#ecebe4;display:flex;align-items:center;padding-left:34px;box-sizing:border-box;letter-spacing:-0.01em`);
    const hi = p.variant === 'widget';
    hdr.innerHTML = `${p.header || 'AI Chat'}${p.badge ? ` <span style="margin-left:14px;font:700 21px Heros;color:${hi ? '#141513' : '#d8d7cf'};background:${hi ? acc : 'rgba(255,255,255,.12)'};padding:7px 14px;border-radius:16px">${p.badge}</span>` : ''}`;
    if (p.prompt) el('div', 'abs', scr, `right:30px;top:126px;width:${Math.round(sw * 0.65)}px;padding:20px 24px;border-radius:24px 24px 6px 24px;background:#2c2d29;font:400 29px Heros;color:#f2f1ea;line-height:1.28;letter-spacing:-0.01em`).textContent = p.prompt;
    const reply = el('div', 'abs', scr, `left:30px;top:300px;width:${sw - 60}px`);
    inst.lines = []; inst.w = null;
    if (!hi) inst.lines = (p.lines || []).map(tx => { const d = el('div', '', reply, 'font:400 29px Heros;color:#d2d1c9;line-height:1.5;height:44px;white-space:nowrap;overflow:hidden;letter-spacing:-0.01em'); d.textContent = tx; return d; });
    else {
      const wd = p.widget || {}; el('div', '', reply, 'font:400 28px Heros;color:#d2d1c9;line-height:1.4;margin-bottom:16px').textContent = wd.intro || 'Here is an interactive view:';
      const w = inst.w = el('div', '', reply, `width:${sw - 60}px;border-radius:24px;background:#20221d;box-shadow:0 0 0 1.5px ${acc}38;padding:26px 28px;box-sizing:border-box`);
      el('div', '', w, 'font:700 31px Heros;color:#f4f3ec;letter-spacing:-0.01em').textContent = wd.title || 'Comparison';
      inst.sub = el('div', '', w, 'font:400 23px Heros;color:#a3a29a;margin-top:6px');
      const bars = el('div', '', w, 'margin-top:18px;height:250px;display:flex;align-items:flex-end;gap:36px;padding:0 18px;border-bottom:1px solid rgba(255,255,255,.14)');
      inst.bars = (wd.bars || []).map((q, i) => { const col = el('div', '', bars, 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:250px');
        const v = el('div', '', col, 'font:700 24px Heros;color:#f4f3ec;margin-bottom:8px;white-space:nowrap');
        const bar = el('div', '', col, `width:100%;border-radius:12px 12px 4px 4px;background:${i === 0 ? `linear-gradient(${acc},${acc}cc)` : 'linear-gradient(#73756b,#4c4e47)'}`);
        el('div', '', col, 'position:relative;top:36px;font:400 22px Heros;color:#a3a29a').textContent = q.label; return {v, bar, q}; });
      if (wd.slider) { el('div', '', w, 'margin-top:58px;font:400 23px Heros;color:#cfcec6').textContent = wd.slider.label || '';
        const tr = el('div', '', w, 'position:relative;margin-top:16px;height:9px;border-radius:5px;background:#3c3e37');
        inst.fill = el('div', '', tr, `position:absolute;left:0;top:0;height:9px;border-radius:5px;background:${acc}`);
        inst.knob = el('div', '', tr, 'position:absolute;top:-13px;width:35px;height:35px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.5)'); }
      const btns = el('div', '', w, 'margin-top:30px;display:flex;gap:16px');
      inst.btn = el('div', '', btns, `padding:15px 26px;border-radius:18px;background:${acc};color:#141513;font:700 25px Heros`); inst.btn.textContent = wd.button || 'Recalculate';
      if (wd.button2 !== false) el('div', '', btns, 'padding:15px 26px;border-radius:18px;background:rgba(255,255,255,.09);color:#ecebe4;font:400 25px Heros').textContent = wd.button2 || 'Compare';
    }
    el('div', 'abs', b, `left:0;top:0;width:${sz[0]}px;height:${sz[1]}px;background:radial-gradient(ellipse 80% 70% at 50% 42%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%),linear-gradient(180deg,rgba(0,0,0,0) 62%,rgba(0,0,0,.82) 86%,rgba(0,0,0,.9) 100%)`);
    if (p.label) { inst.serif = el('div', 'abs trk nowrap', b, `left:auto;right:40px;top:36px;font:600 88px SSerif;color:#ECEBE2;text-shadow:0 0 22px rgba(255,255,240,.45),0 4px 18px rgba(0,0,0,.7)`); inst.serif.textContent = p.label; }
    inst.caps = (p.captions || []).map(c => makeGroup({x: 40, y: sz[1] - 147, t0: c.t0, t1: c.t1, lines: [{size: 34, words: c.small || [], stroke: 1.35}, {size: 64, mt: -2, stroke: 1.6, words: c.big || []}]}, b));
  },
  render(inst, t) {
    const s = inst.spec, p = s.params, t0 = s.t0, dt = t - t0;
    inst.scr.style.transform = `rotateY(${(-5 + dt * 0.6).toFixed(3)}deg) rotateX(${(4 - dt * 0.3).toFixed(3)}deg) scale(${(1.0 + dt * 0.010).toFixed(4)}) translateY(${(-dt * 5).toFixed(2)}px)`;
    if (inst.serif) wordStyle(inst.serif, t - (t0 + 0.26), 1, 76);
    inst.lines.forEach((d, i) => { const q = clamp((t - (t0 + 0.35 + i * 0.17)) / 0.17); d.style.width = (q * 600).toFixed(1) + 'px'; d.style.opacity = q > 0 ? 1 : 0; });
    if (inst.w) {
      const wd = p.widget, sl = wd.slider || {keys: [[t0, 0]]}, keys = sl.keys || [[t0, 0]];
      let v = keys[0][1]; for (let i = 1; i < keys.length; i++) v = lerp(v, keys[i][1], inOutSine((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
      if (inst.sub) inst.sub.textContent = (wd.sub || '').replace('{v}', v.toFixed(1));
      const emi = (P, r, y) => { r = r / 1200; const n = y * 12; return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); };
      const vals = inst.bars.map(o => o.q.emi ? emi(o.q.emi[0], o.q.emi[1], v) : (o.q.values ? lerp(o.q.values[0], o.q.values[1], (v - (sl.min || 0)) / ((sl.max || 1) - (sl.min || 0))) : o.q.value || 1));
      const mx = Math.max(...inst.bars.map(o => o.q.max || Math.max(...(o.q.values || [o.q.value || 1]))));
      inst.bars.forEach((o, i) => { const gp = outCubic((t - (t0 + 0.45 + i * 0.08)) / 0.4); o.bar.style.height = (gp * 200 * vals[i] / mx).toFixed(1) + 'px';
        o.v.textContent = (wd.format || '') + Math.round(vals[i]).toLocaleString('en-IN'); o.v.style.opacity = gp; });
      if (inst.fill) { const kp = ((v - (sl.min || 0)) / ((sl.max || 1) - (sl.min || 0))); inst.fill.style.width = (kp * 100).toFixed(2) + '%'; inst.knob.style.left = `calc(${(kp * 100).toFixed(2)}% - 16px)`; }
      if (wd.press != null) inst.btn.style.transform = `scale(${(1 - 0.06 * Math.exp(-Math.pow((t - wd.press) / 0.09, 2))).toFixed(4)})`;
      inst.w.style.opacity = outCubic((t - (t0 + 0.3)) / 0.3);
    }
    inst.caps.forEach(g => runGroup(g, t));
  }
});
