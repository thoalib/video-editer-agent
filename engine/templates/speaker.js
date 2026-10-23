// SHOT speaker — full-frame speaker footage, face-tracked.
// params: zoom (1.15), eye [x,y] where the eyes land (540,680), lockFace (frame index in the segment: freeze framing),
//         open {scale,tau} | false (settle at the cut), pushes [{at, amount, tau, ease}], origin [x,y],
//         band {y, h, feather:[top,bottom]} (wide source in a tall frame: footage in a horizontal band, edges fade to black),
//         dots, dotsLift, fx [{at, dur, dim, blur, tint, dots, dotsLift}] (darken/blur/tint the footage behind graphics),
//         lowBlur {y, ramp, sigma, dark:[y0,y1,amt]} | false (progressive blur of the lower frame; default style speaker.lowBlur),
//         grade {band:[h0,h1], shift, sat, bandSat, bandVal} | false (hue-band colour grade; default style speaker.grade)
registerTemplate('speaker', {
  kind: 'shot',
  build(inst) {},
  render(inst, t, st) {
    const p = inst.spec.params || {}, b = p.band, rect = b ? [0, b.y, W, b.h] : [0, 0, W, H];
    const fixed = p.lockFace != null ? face(st.seg, p.lockFace) : null;
    const eye = p.eye || [W / 2, H * 0.354];
    const crop = cropFor(st.seg, st.frame - segById(st.seg).first, rect, p.zoom || 1.15, eye[0], eye[1], fixed, b ? b.h / SRCH() * (p.zoom || 1) : undefined);
    const fx = fxAt(t, {dim: 1, blur: 0, tint: [0, 0, 0, 0], dots: p.dots != null ? p.dots : S('dots.speaker', 0), dotsLift: p.dotsLift || 0}, p.fx);
    const extra = b && b.feather ? {feather: b.feather} : {}; if (fx.dim < 0.999) extra.dim = fx.dim; if (fx.blur > 0.01) extra.blur = fx.blur; if (fx.tint[3] > 0.001) extra.tint = fx.tint;
    const lb = p.lowBlur === false ? null : (p.lowBlur || S('speaker.lowBlur', null)), gr = p.grade === false ? null : (p.grade || S('speaker.grade', null));
    if (lb) extra.lowblur = lb; if (gr) extra.grade = gr;
    pushMedia(st, rect, crop, extra);
    const o = p.origin || [W / 2, H * 0.396];
    st.cam = {s: camScale(t, inst.spec.t0, p), ox: o[0], oy: o[1]};
    st.dots = fx.dots; st.dotsLift = fx.dotsLift;
  }
});
