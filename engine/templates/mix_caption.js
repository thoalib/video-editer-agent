// ELEMENT templates for the "mixed type" caption family (violet-tutorial, teal-tech, editorial-blue):
// words in different faces on one line — a flowing script / serif word next to plain and bold sans words —
// lines cascading to the right, each word revealed through a soft blur as it is spoken.
// Faces come from style tokens mix.<kind> = {font, size, color, dy, ls, shadow}; kinds: script, sans, bold, serif, thin, heavy.

function mixWordCss(kind) {
  const K = S('mix.' + kind, null); if (!K) return '';
  return `font:${K.font};${K.size ? `font-size:${K.size}px;` : ''}${K.color ? `color:${K.color};` : ''}${K.ls != null ? `letter-spacing:${K.ls};` : ''}` +
    `${K.dy ? `position:relative;top:${K.dy}px;` : ''}${K.shadow ? `text-shadow:${K.shadow};` : ''}${K.upper ? 'text-transform:uppercase;' : ''}`;
}
function mixSize(kind) { const K = S('mix.' + kind, {}); return K.size || parseFloat((K.font || '0 60px').split(' ').find(x => x.endsWith('px'))) || 60; }

// mixCaption — params: x, y, align 'left'|'center'|'right' (left = cascade), lines [{kind:'sans', indent:0, mt:0, words:[[w, t, kind?]]}],
//   bubble true (frosted pill behind the text, editorial "Where it takes me?"), underline {at, line} (hand-drawn stroke under a line)
registerTemplate('mixCaption', {
  kind: 'element',
  build(inst, s, ctx) {
    const p = s.params, base = S('mix.base', {});
    const lines = p.lines.map(L => {
      const kind = L.kind || 'sans';
      return {font: S(`mix.${kind}.font`, '500 44px Inter'), size: mixSize(kind), color: S(`mix.${kind}.color`, S('colors.text', '#fff')), stroke: 0,
        lh: L.lh || base.lh || 0.92, mt: L.mt != null ? L.mt : (base.mt || 0), indent: L.indent, ls: S(`mix.${kind}.ls`, '-0.01em'),
        style: `text-shadow:${S(`mix.${kind}.shadow`, base.shadow || '0 2px 10px rgba(0,0,0,.35)')}`,
        words: L.words.map(([w, t, k]) => [w, t, k && k !== kind ? {css: mixWordCss(k), size: mixSize(k)} : undefined])};
    });
    inst.g = makeGroup({x: p.x != null ? p.x : 150, y: p.y != null ? p.y : 1000, align: p.align || 'left', t0: s.t0, t1: s.t1, lines}, inst.root);
    if (p.bubble) {
      const B = S('mix.bubble', {});
      inst.bub = el('div', 'abs', inst.g.box, `left:-${B.padX || 46}px;top:-${B.padY || 26}px;right:-${B.padX || 46}px;bottom:-${B.padY || 30}px;border-radius:999px;` +
        `background:${B.fill || 'radial-gradient(ellipse at 35% 30%,rgba(255,255,255,.26),rgba(255,255,255,.08) 70%)'};border:1.5px solid ${B.edge || 'rgba(255,255,255,.45)'};` +
        `box-shadow:inset 0 2px 10px rgba(255,255,255,.25),0 10px 30px rgba(0,0,0,.18);z-index:-1`);
      inst.g.box.style.zIndex = 0; inst.bubT = p.bubbleAt != null ? p.bubbleAt : s.t0;
    }
    if (p.underline) {
      const U = S('mix.underline', {});
      inst.u = svgEl('svg', {viewBox: '0 0 100 10', preserveAspectRatio: 'none', class: 'trk'}, inst.g.box);
      inst.u.style.cssText = `position:absolute;overflow:visible;height:${U.h || 18}px`;
      inst.uPath = svgEl('path', {d: 'M1,6 C25,3.5 60,2.8 99,4.5', fill: 'none', stroke: U.color || '#fff', 'stroke-width': U.w || 1.6, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke'}, inst.u);
      ctx.layoutHooks.push(() => { const m = lineMetrics(inst.g, p.underline.line || 0);
        Object.assign(inst.u.style, {left: (m.left - 6) + 'px', top: (m.base + m.em * 0.12) + 'px', width: (m.width + 12) + 'px'}); inst.uLen = 120; });
    }
  },
  render(inst, t, st) {
    const p = inst.spec.params; runGroup(inst.g, t, 0.18);
    if (inst.bub) { const a = spring(t - inst.bubT, 1.8, 0.7); inst.bub.style.opacity = clamp(a * 1.4).toFixed(3); inst.bub.style.transform = `scale(${(0.86 + 0.14 * a).toFixed(4)})`;
      if (t >= inst.bubT) frostBehind(st, inst.bub, S('mix.bubble.blur', 10), clamp(a * 1.4)); }
    if (inst.u) { const d = outCubic((t - p.underline.at) / 0.45); inst.uPath.setAttribute('stroke-dasharray', '120 120'); inst.uPath.setAttribute('stroke-dashoffset', (120 * (1 - d)).toFixed(2)); inst.u.style.opacity = t < p.underline.at ? 0 : 1; }
  }
});

// wordFlash — the "between key phrases" caption: one word (or 2–3) at a time at chest height, replaced as each is spoken.
// params: words [[text, t]] (each shows until the next one, max hold 1.4 s), x 540, y (style flash.y), kind ('flash')
registerTemplate('wordFlash', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, F = S('flash', {}), list = p.words || [];
    inst.gs = list.map(([w, t], i) => {
      const nx = i + 1 < list.length ? list[i + 1][1] : s.t1;
      return makeGroup({x: p.x != null ? p.x : W / 2, y: p.y != null ? p.y : (F.y || 1080), align: 'center', t0: t, t1: Math.min(nx, t + (p.hold || F.hold || 1.4)),
        lines: [{font: F.font || '700 64px Inter', size: F.size || 64, color: F.color || '#fff', ls: F.ls || '-0.015em', style: `text-shadow:${F.shadow || '0 2px 12px rgba(0,0,0,.35)'}`, words: [[w, t]]}]}, inst.root);
    });
  },
  render(inst, t) { inst.gs.forEach(g => runGroup(g, t, 0.06)); }
});
