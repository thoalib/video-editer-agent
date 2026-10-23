// Small graphic systems: pill chips, check lines, tag rows, callout lines, accent gradient.
// Icons: 'check' | 'star' | 'bang' (!) | 'leaf' | 'plus' | 'minus' | 'arrow' | 'none'
const ICONS = {
  check: '<path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M12 3.5 L14.4 9 L20.3 9.4 L15.8 13.2 L17.2 19 L12 15.9 L6.8 19 L8.2 13.2 L3.7 9.4 L9.6 9 Z" fill="currentColor"/>',
  bang: '<path d="M12 6 V13.5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.7" fill="currentColor"/>',
  leaf: '<path d="M5 19 C5 10 11 5 19 5 C19 13 14 19 5 19 Z M5 19 L13 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  plus: '<path d="M12 6 V18 M6 12 H18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  minus: '<path d="M6 12 H18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  arrow: '<path d="M6 12 H17 M12.5 7.5 L17 12 L12.5 16.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'};
function iconSvg(name, size, color) { return name && name !== 'none' ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="color:${color};flex:none">${ICONS[name] || ''}</svg>` : ''; }
function popIn(e, dt, dy = 26) { const q = spring(dt, 2.4, 0.62); e.style.opacity = clamp(dt / 0.12).toFixed(3); e.style.transform = `translateY(${((1 - q) * dy).toFixed(2)}px) scale(${(0.92 + 0.08 * q).toFixed(4)})`; }

// pillChips — white pills with icons added one by one. params: x, y, align, chips [{text, t, icon, accent}], gap 18
registerTemplate('pillChips', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, C = S('chips', {});
    inst.row = el('div', 'abs', inst.root, `left:${p.x != null ? p.x : W / 2}px;top:${p.y || 1250}px;display:flex;gap:${p.gap || 18}px;flex-wrap:wrap;max-width:${W - 120}px;` +
      (p.align === 'left' ? '' : 'transform:translateX(-50%);justify-content:center;'));
    inst.chips = p.chips.map(c => { const d = el('div', 'trk', inst.row, `display:flex;align-items:center;gap:12px;padding:16px 28px;border-radius:999px;` +
      `background:${c.accent ? S('colors.accent', '#B4562E') : (C.bg || '#fff')};color:${c.accent ? '#fff' : (C.color || '#141414')};font:${C.font || '600 38px Inter'};white-space:nowrap;box-shadow:0 10px 26px rgba(0,0,0,.28)`);
      d.innerHTML = iconSvg(c.icon, 34, c.accent ? '#fff' : (C.icon || S('colors.accent', '#B4562E'))) + `<span>${c.text}</span>`; d.t = c.t; return d; });
  },
  render(inst, t) { const ex = clamp((t - (inst.spec.t1 - 0.14)) / 0.14); inst.row.style.opacity = (1 - inCubic(ex)).toFixed(3); inst.chips.forEach(c => popIn(c, t - c.t)); }
});

// checkLine — round icon + caption line ("It exists outside of wellness"). params: x, y, icon ('check'), words [[w,t]]
registerTemplate('checkLine', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, C = S('checkLine', {});
    inst.ic = el('div', 'abs trk', inst.root, `left:${p.x || 90}px;top:${p.y || 1240}px;width:76px;height:76px;border-radius:50%;background:${C.iconBg || S('colors.accent', '#B4562E')};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,.3)`);
    inst.ic.innerHTML = iconSvg(p.icon || 'check', 48, '#fff');
    inst.g = makeGroup({x: (p.x || 90) + 100, y: (p.y || 1240) + 8, t0: s.t0, t1: s.t1, lines: [{font: C.font || '700 54px Inter', size: C.size || 54, color: C.color || '#fff', style: 'text-shadow:0 3px 12px rgba(0,0,0,.5)', words: p.words}]}, inst.root);
  },
  render(inst, t) { const s = inst.spec, ex = clamp((t - (s.t1 - 0.14)) / 0.14); popIn(inst.ic, t - s.t0); inst.ic.style.opacity = (parseFloat(inst.ic.style.opacity) * (1 - inCubic(ex))).toFixed(3); runGroup(inst.g, t); }
});

// tagRow — star icon + title, then pills under it ("Simple / Effective / Straight from nature"). params: x, y, icon, title [[w,t]], tags [{text,t}]
registerTemplate('tagRow', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, x = p.x || 90, y = p.y || 1180, C = S('chips', {});
    inst.ic = el('div', 'abs trk', inst.root, `left:${x}px;top:${y}px;width:64px;height:64px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center`);
    inst.ic.innerHTML = iconSvg(p.icon || 'star', 38, S('colors.accent', '#B4562E'));
    inst.g = makeGroup({x: x + 84, y: y + 2, t0: s.t0, t1: s.t1, lines: [{font: S('caption.big.font', '400 60px Anton'), size: 62, upper: S('caption.big.upper', false), color: '#fff', ls: S('caption.big.ls', '0'), words: p.title}]}, inst.root);
    inst.row = el('div', 'abs', inst.root, `left:${x}px;top:${y + 96}px;display:flex;gap:16px;flex-wrap:wrap;max-width:${W - x - 60}px`);
    inst.tags = (p.tags || []).map(c => { const d = el('div', 'trk', inst.row, `padding:14px 26px;border-radius:999px;background:${C.bg || '#fff'};color:${C.color || '#141414'};font:${C.font || '600 36px Inter'};white-space:nowrap`); d.textContent = c.text; d.t = c.t; return d; });
  },
  render(inst, t) { const s = inst.spec, ex = clamp((t - (s.t1 - 0.14)) / 0.14);
    popIn(inst.ic, t - s.t0); runGroup(inst.g, t); inst.tags.forEach(c => popIn(c, t - c.t)); inst.row.style.opacity = (1 - inCubic(ex)).toFixed(3); inst.ic.style.opacity = (parseFloat(inst.ic.style.opacity) * (1 - inCubic(ex))).toFixed(3); }
});

// calloutLine — small round "!" icon + a line with one highlighted chip ("we're in a [precarious place]").
// params: x, y, icon ('bang'), words [[w,t]], chip {text, t}
registerTemplate('calloutLine', {
  kind: 'element',
  build(inst, s) {
    const p = s.params, x = p.x || 80, y = p.y || 1300;
    inst.ic = el('div', 'abs trk', inst.root, `left:${x}px;top:${y}px;width:58px;height:58px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center`);
    inst.ic.innerHTML = iconSvg(p.icon || 'bang', 36, S('colors.accent', '#B4562E'));
    const words = p.words.slice(); if (p.chip) words.push([p.chip.text, p.chip.t, {box: true, css: 'color:#fff'}]);
    inst.g = makeGroup({x: x + 78, y: y + 4, t0: s.t0, t1: s.t1, lines: [{font: '600 48px Inter', size: 48, color: '#fff', style: 'text-shadow:0 3px 12px rgba(0,0,0,.5)', words}]}, inst.root);
  },
  render(inst, t) { popIn(inst.ic, t - inst.spec.t0); runGroup(inst.g, t); }
});

// accentGradient — colour gradient rising from the bottom (b-roll treatment). params: color (style accent), height 0.55, at
registerTemplate('accentGradient', {
  kind: 'element',
  build(inst, s) { const p = s.params || {}, c = p.color || S('colors.accent', '#B4562E');
    inst.g = el('div', 'abs', inst.root, `left:0;top:0;width:${W}px;height:${H}px;background:linear-gradient(0deg,${c}f2 0%,${c}99 ${Math.round((p.height || 0.55) * 45)}%,${c}00 ${Math.round((p.height || 0.55) * 100)}%)`); },
  render(inst, t) { const s = inst.spec; inst.g.style.opacity = (outCubic((t - s.t0) / 0.35) * (1 - inCubic(clamp((t - (s.t1 - 0.2)) / 0.2)))).toFixed(3); }
});
