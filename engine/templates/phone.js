// SHOT phone — photo-viewer frame (white UI, header, filmstrip, icons). The shot opens on the speaker exactly
// full-frame (media rect scaled to fill the frame) and settles into the phone; then swipes through b-roll clips
// (elements with "in": "<this shot id>", e.g. chatMock); exits by squeezing the last clip into a blurred pill,
// fading to white, then grey (cut to the next shot).
// params: rect [189,336,701,1245], radius 33, enter {scale:1.54, tau:0.19}, footage {zoom, eye} (same framing as the
//         previous close-up so the hand-off is seamless), clips ['elementId', ...], swipes [t, ...] (one per clip),
//         swipeDur 0.22, exitAt (t), thumbs 5, title 'Today', time '20:30'
registerTemplate('phone', {
  kind: 'shot',
  build(inst, s) {
    const p = s.params || {}, R = p.rect || [189, 336, 701, 1245], blue = S('colors.ui', '#3780CD'), r = inst.root;
    inst.R = R;
    inst.chev = el('div', 'abs', r, `left:160px;top:176px;width:26px;height:26px;border-left:5px solid ${blue};border-bottom:5px solid ${blue};transform:rotate(45deg);border-radius:2px`);
    inst.title = el('div', 'abs', r, "left:440px;top:170px;width:200px;text-align:center;font:700 38px Heros;color:#111;letter-spacing:-0.02em;line-height:1");
    inst.title.innerHTML = `${p.title || 'Today'}<div style="font:400 20px Heros;color:#222;margin-top:2px">${p.time || '20:30'}</div>`;
    inst.dots = el('div', 'abs', r, `left:842px;top:196px;font:700 40px Heros;color:${blue};letter-spacing:2px;line-height:0`); inst.dots.textContent = '•••';
    inst.strip = el('div', 'abs trk', r, `left:${R[0]}px;top:${R[1] + R[3] + 21}px;height:76px;display:flex;gap:9px`);
    inst.thumbs = [];
    const tones = ['#151515', '#3a3a3a', '#2a2a2a', '#1f1f1f', '#4a4a4a', '#262626', '#101010', '#333', '#444', '#222', '#555', '#2e2e2e'];
    for (let i = 0; i < 12; i++) inst.thumbs.push(el('div', '', inst.strip, `width:51px;height:76px;border-radius:5px;background:${tones[i]};flex:none`));
    inst.icons = el('div', 'abs', r, `left:${R[0]}px;top:${R[1] + R[3] + 137}px;width:${R[2]}px;height:56px;display:flex;justify-content:space-between;align-items:center`);
    const st = `fill="none" stroke="${blue}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`;
    for (const d of ['M16 22 v20 h20 v-20 M26 8 v24 M19 15 l7-7 7 7', 'M26 41 C10 30 8 22 12 16 C16 10 23 12 26 18 C29 12 36 10 40 16 C44 22 42 30 26 41Z',
                     'CIRCLE', 'M12 15 h28 M21 15 v-4 h10 v4 M15 15 l2 26 h18 l2-26 M23 21 v14 M29 21 v14'])
      el('div', '', inst.icons, 'width:52px;height:52px').innerHTML = d === 'CIRCLE'
        ? `<svg viewBox="0 0 52 52" width="52" height="52"><circle ${st} cx="26" cy="26" r="15"/><path ${st} d="M26 23 v10 M26 18 v.5"/></svg>`
        : `<svg viewBox="0 0 52 52" width="52" height="52"><path ${st} d="${d}"/></svg>`;
    inst.media = el('div', 'abs', r, `left:${R[0]}px;top:${R[1]}px;width:${R[2]}px;height:${R[3]}px;overflow:visible`);
  },
  render(inst, t, st, ctx) {
    const p = inst.spec.params || {}, R = inst.R, t0 = inst.spec.t0, sd = p.swipeDur || 0.22, gap = R[2] + 59;
    st.bg = {type: 'solid', color: [255, 255, 255]};
    const en = Object.assign({scale: W / R[2], tau: 0.19}, p.enter || {});
    st.cam = {s: 1 + (en.scale - 1) * Math.exp(-(t - t0) / en.tau), ox: R[0] + R[2] / 2, oy: R[1] + R[3] / 2};
    const sw = (p.swipes || []).map(a => inOutCubic((t - a) / sd));
    // speaker footage inside the rect until the first swipe completes
    const x0 = -gap * (sw[0] || 0);
    if ((sw[0] || 0) < 1) {
      const f = p.footage || {}, eye = f.eye || [520, 700];
      const fc = cropFor(st.seg, st.frame - segById(st.seg).first, [0, 0, W, H], f.zoom || 1.62, eye[0], eye[1]);
      pushMedia(st, [R[0] + x0, R[1], R[2], R[3]], fc, {radius: p.radius || 33});
      ctx.contentRect = [R[0] + x0, R[1], R[2], R[2] * H / W];
    }
    // clips
    const clips = (p.clips || []).map(id => ctx.els[id]);
    clips.forEach((c, i) => { if (!c) return;
      const x = gap * (1 - sw[i]) - (i + 1 < sw.length ? gap * sw[i + 1] : 0);
      c.clip.style.transform = `translateX(${x.toFixed(2)}px)`; c.clip.style.filter = 'none'; c.clip.style.opacity = 1;
      c.clip.style.borderRadius = (p.radius || 33) + 'px'; c.clip.style.transformOrigin = '50% 50%'; });
    const nThumb = (p.thumbs || 5) + sw.filter((v, i) => t >= p.swipes[i] + 0.1).length;
    inst.thumbs.forEach((th, i) => { show(th, i < nThumb); th.style.opacity = i === nThumb - 1 ? 0.65 : 1; });
    // exit
    if (p.exitAt != null) {
      const ex = clamp((t - p.exitAt) / 0.32), wf = clamp((t - p.exitAt - 0.10) / 0.2), gr = clamp((t - p.exitAt - 0.32) / 0.12);
      const last = clips[clips.length - 1];
      if (last && t >= p.exitAt) { const s = lerp(1, 0.3, inOutCubic(ex));
        last.clip.style.transform = `scale(${s.toFixed(4)})`; last.clip.style.transformOrigin = '50% 48%';
        last.clip.style.borderRadius = `${lerp(33, 350, inOutCubic(ex)).toFixed(1)}px / ${lerp(33, 600, inOutCubic(ex)).toFixed(1)}px`;
        last.clip.style.filter = `blur(${(10 * inOutCubic(ex)).toFixed(2)}px)`;
        last.clip.style.opacity = (1 - inCubic(clamp((t - p.exitAt - 0.16) / 0.22))).toFixed(3); }
      [inst.chev, inst.title, inst.dots, inst.strip, inst.icons].forEach(e => e.style.opacity = (1 - wf).toFixed(3));
      const gv = Math.round(lerp(255, 88, outCubic(gr))); st.bg = {type: 'solid', color: [gv, gv, gv]};
      if (gr > 0) world.style.opacity = (1 - gr).toFixed(3);
    }
  }
});
