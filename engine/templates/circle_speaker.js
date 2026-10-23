// SHOT circleSpeaker — speaker inside a circle on a soft gradient; whole composition opens big and settles.
// params: circle [cx,cy,r] (40,910,330), pxPerSrc (1.23 = face size), eye [x,y] inside the frame (190,845),
//         open {scale:2.0, tau:0.725, origin:[x,y]}, rim (0.22), dots, dotsLift, bg (gradient stops, else style.circleBg)
registerTemplate('circleSpeaker', {
  kind: 'shot',
  build(inst) {},
  render(inst, t, st) {
    const p = inst.spec.params || {};
    const c = p.circle || [40, 910, 330], rect = [c[0] - c[2], c[1] - c[2], 2 * c[2], 2 * c[2]];
    const eye = p.eye || [190, 845];
    st.bg = {type: 'vgrad', stops: p.bg || S('circleBg', [[0, [36, 35, 28]], [0.5, [44, 43, 43]], [1, [31, 31, 31]]])};
    const crop = cropFor(st.seg, st.frame - segById(st.seg).first, rect, 1, eye[0], eye[1], null, p.pxPerSrc || 1.23);
    pushMedia(st, rect, crop, {shape: 'circle', circle: c, rim: p.rim != null ? p.rim : 1});
    const o = Object.assign({scale: 2.0, tau: 0.725, origin: [eye[0], eye[1] + 15]}, p.open || {});
    st.cam = {s: camScale(t, inst.spec.t0, {open: {scale: o.scale, tau: o.tau}, pushes: p.pushes}), ox: o.origin[0], oy: o.origin[1]};
    st.dots = p.dots != null ? p.dots : 0.22; st.dotsLift = p.dotsLift != null ? p.dotsLift : 5;
  }
});
