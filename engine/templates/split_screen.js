// SHOT splitScreen — two or four rounded cards on a background. Speaker cards show live footage; other cards are
// filled by elements placed with "in": "<this shot id>" (product shots, chat mocks, text cards) or a solid colour.
// params: bg [r,g,b] (style.colors.splitBg), cards [{rect:[x,y,w,h], radius, content:'speaker'|'color', color, zoom, eye}],
//         open {scale,tau}, gap animation: cards slide in from below (enter 0.35 s, staggered 0.08 s)
registerTemplate('splitScreen', {
  kind: 'shot',
  build(inst, s) {
    inst.media = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px`);
    const p = s.params || {};
    inst.colorCards = (p.cards || []).map((c, i) => c.content === 'color' ? el('div', 'abs', inst.root,
      `left:${c.rect[0]}px;top:${c.rect[1]}px;width:${c.rect[2]}px;height:${c.rect[3]}px;border-radius:${c.radius || S('split.radius', 36)}px;background:${c.color || S('colors.card', '#222')}`) : null);
  },
  render(inst, t, st) {
    const p = inst.spec.params || {}, t0 = inst.spec.t0;
    st.bg = {type: 'solid', color: p.bg || S('colors.splitBg', [18, 18, 20])};
    (p.cards || []).forEach((c, i) => {
      const e = outCubic((t - t0 - i * 0.08) / 0.35), dy = (1 - e) * 80;
      const R = [c.rect[0], c.rect[1] + dy, c.rect[2], c.rect[3]];
      if (c.content === 'speaker') {
        const eye = c.eye || [R[0] + R[2] / 2, R[1] + R[3] * 0.36];
        const crop = cropFor(st.seg, st.frame - segById(st.seg).first, R, 1, eye[0], eye[1] - dy, null, c.pxPerSrc || (R[3] / (SRCH() / (c.zoom || 1.6))));
        pushMedia(st, R, crop, {radius: c.radius || S('split.radius', 36), opacity: e});
      } else if (inst.colorCards[i]) { inst.colorCards[i].style.transform = `translateY(${dy.toFixed(2)}px)`; inst.colorCards[i].style.opacity = e.toFixed(3); }
    });
    const o = p.origin || [W / 2, H / 2];
    st.cam = {s: camScale(t, t0, Object.assign({open: {scale: 1.06, tau: 0.25}}, p)), ox: o[0], oy: o[1]};
  }
});
