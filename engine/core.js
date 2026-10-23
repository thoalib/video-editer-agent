// =====================================================================================
// Motion engine core. Deterministic: render(t, fi) draws every overlay for timeline time t
// (fi = timeline frame whose single source frame is on screen) and returns the base-layer
// state that pipeline/render.py composites (footage crops, masks, camera, fx).
// Everything is driven by jobs/<job>/work/plan.json + styles/<style>/style.json.
// Templates register themselves with registerTemplate(name, {kind, build, render, probe?}).
// =====================================================================================
'use strict';
const Q = new URLSearchParams(location.search);
const JOB = Q.get('job');                         // e.g. "jobs/my-video"
let PLAN, STYLE, FACES, W = 1080, H = 1920, FPS = 25, SEGS = [];
const world = document.getElementById('world'), screenEl = document.getElementById('screen');
const TPL = {};
function registerTemplate(name, def) { TPL[name] = def; }

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const settle = (dt, tau) => dt <= 0 ? 0 : 1 - Math.exp(-dt / tau);                       // expo ease-out (starts moving at once)
const settle2 = (dt, tau) => dt <= 0 ? 0 : 1 - (1 + dt / tau) * Math.exp(-dt / tau);     // critically damped from rest
const outCubic = p => 1 - Math.pow(1 - clamp(p), 3);
const inCubic = p => Math.pow(clamp(p), 3);
const inOutCubic = p => { p = clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const inOutSine = p => -(Math.cos(Math.PI * clamp(p)) - 1) / 2;
function spring(dt, freq = 2.0, zeta = 0.62) {   // 0 -> 1 with a slight (~5%) overshoot, then holds
  if (dt <= 0) return 0;
  const w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * dt) * (Math.cos(wd * dt) + zeta * w / wd * Math.sin(wd * dt));
}
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------- DOM helpers ----------
function el(tag, cls, parent, style) {
  const e = document.createElement(tag); if (cls) e.className = cls;
  if (style) e.style.cssText = style; (parent || world).appendChild(e); return e;
}
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e;
}
function show(e, on) { if (e) e.style.display = on ? '' : 'none'; }
function frameRoot(parent) { return el('div', 'abs', parent, `left:0;top:0;width:${W}px;height:${H}px`); }
function S(path, dflt) { // style token lookup: S('colors.accent')
  let o = STYLE; for (const k of path.split('.')) { if (o == null) return dflt; o = o[k]; } return o == null ? dflt : o;
}

// ---------- timeline / footage ----------
function segAt(fi) {
  for (const s of SEGS) if (fi >= s.f0 && fi < s.f0 + s.n) return [s, fi - s.f0];
  const s = SEGS[SEGS.length - 1]; return [s, s.n - 1];
}
function segById(id) { return SEGS.find(s => s.id === id); }
function face(segId, k, r = 12) {   // heavily smoothed face: [ex, ey, mx, my, top, chin, left, right] (source px)
  const P = FACES[segId].pts, n = P.length; const o = [0, 0, 0, 0, 0, 0, 0, 0]; let c = 0;
  k = clamp(k, 0, n - 1);
  for (let j = Math.max(0, k - r); j <= Math.min(n - 1, k + r); j++) { for (let i = 0; i < 8; i++) o[i] += P[j][i]; c++; }
  return o.map(v => v / c);
}
// Safe area in output pixels. style.safe is measured at 1080x1920; other sizes (16:9, 1:1, 4:5) scale it by share.
const SAFE = () => { const s = S('safe', [60, 200, 1020, 1650]); return [s[0] * W / 1080, s[1] * H / 1920, s[2] * W / 1080, s[3] * H / 1920]; };
const SRCW = () => PLAN.source_size ? PLAN.source_size[0] : 1920, SRCH = () => PLAN.source_size ? PLAN.source_size[1] : 1080;
// crop so the eye lands at (ox, oy) inside rect; zoom 1 = full source height fills a full-height frame
function cropFor(segId, k, rect, zoom, ox, oy, fixedFace, pxPerSrc) {
  const f = fixedFace || face(segId, k);
  const kk = pxPerSrc || (H / (SRCH() / zoom));
  const ch = rect[3] / kk, cw = rect[2] / kk;
  let cx = f[0] - (ox - rect[0]) / kk, cy = f[1] - (oy - rect[1]) / kk;
  cx = clamp(cx, 0, Math.max(0, SRCW() - cw)); cy = clamp(cy, 0, Math.max(0, SRCH() - ch));
  return [cx, cy, ch];
}
function srcToOut(m, x, y) { const kk = m.rect[3] / m.crop[2]; return [m.rect[0] + (x - m.crop[0]) * kk, m.rect[1] + (y - m.crop[1]) * kk]; }

function pushMedia(st, rect, crop, extra) { const m = Object.assign({rect, crop, shape: 'rect', seg: st.seg, frame: st.frame}, extra || {}); st.media.push(m); return m; }
// fx keyframes: [{at, dur, dim, blur, tint:[r,g,b,amt], dots, dotsLift}] interpolated from base values
function fxAt(t, base, kfs) {
  const v = Object.assign({}, base);
  for (const k of kfs || []) { const p = outCubic((t - k.at) / (k.dur || 0.3)); if (p <= 0) continue;
    for (const key of ['dim', 'blur', 'dots', 'dotsLift']) if (k[key] != null) v[key] = lerp(v[key], k[key], p);
    if (k.tint) v.tint = v.tint.map((x, i) => i < 3 ? (v.tint[3] > 0 ? lerp(x, k.tint[i], p) : k.tint[i]) : lerp(x, k.tint[3], p)); }
  return v;
}
function camScale(t, t0, p) {   // open settle (expo, starts at the cut) x emphasis pushes (critically damped unless ease:'expo')
  let s = 1; const o = p.open === false ? null : Object.assign({scale: S('camera.openScale', 1.22), tau: S('camera.openTau', 0.204)}, p.open || {});
  if (o && o.scale !== 1) s *= 1 + (o.scale - 1) * Math.exp(-Math.max(0, t - t0) / o.tau);
  for (const q of p.pushes || []) s *= 1 + q.amount * (q.ease === 'expo' ? settle : settle2)(t - q.at, q.tau || 0.14);
  return s;
}

// ---------- word reveal (style tokens: motion.reveal) ----------
function wordStyle(e, dt, dir, em) {
  const R = S('motion.reveal', {dur: 0.2, startOpacity: 0.45, offsetEm: 0.4});
  if (dt < 0) { e.style.opacity = 0; e.style.transform = 'translateY(0px)'; return 0; }
  const p = outCubic(dt / R.dur);
  e.style.opacity = (R.startOpacity + (1 - R.startOpacity) * p).toFixed(3);
  e.style.transform = `translateY(${((1 - p) * R.offsetEm * em * dir).toFixed(2)}px)`;
  if (R.blur) e.style.filter = p < 1 ? `blur(${((1 - p) * R.blur).toFixed(2)}px)` : 'none';   // reveal through a soft blur
  return p;
}

// ---------- caption group (shared by many templates) ----------
// spec: {x, y, align:'center'|'left'|'right', t0, t1, lines:[{font, size, color, stroke, mt, indent, dir, style, words:[[text, t, opts]]}], exit}
// word opts: CSS string, or {css, box:'#hex', accent:true, thin:true, outline:true, size}
let GID = 0;
function makeGroup(spec, parent) {
  const g = el('div', 'abs', parent, `left:${spec.x}px;top:${spec.y}px;` +
    (spec.align === 'center' ? 'transform:translateX(-50%);text-align:center;' : spec.align === 'right' ? 'transform:translateX(-100%);text-align:right;' : 'text-align:left;'));
  const box = el('div', '', g, 'position:relative;display:inline-block'); g.box = box; g.spec = spec; g.words = []; g.gid = 'g' + (GID++);
  spec.lines.forEach(L => {
    const color = L.color || S('colors.text', '#fff');
    const line = el('div', 'nowrap', box, `font:${L.font || S('fonts.caption', "400 60px Heros")};font-size:${L.size}px;color:${color};line-height:${L.lh || 1};margin-top:${L.mt || 0}px;` +
      `letter-spacing:${L.ls != null ? L.ls : S('caption.tracking', '-0.01em')};${L.indent != null ? `padding-left:${L.indent}px;` : ''}${L.style || ''}`);
    const stroke = L.stroke != null ? L.stroke : S('caption.stroke', 0);
    if (stroke) line.style.webkitTextStroke = `${stroke}px ${color}`;
    if (L.upper) line.style.textTransform = 'uppercase';
    L.words.forEach(([txt, t, o], wi) => {
      const w = el('span', 'w trk', line); w.textContent = txt;
      if (typeof o === 'string') w.style.cssText += o;
      else if (o) {
        if (o.css) w.style.cssText += o.css;
        if (o.size) w.style.fontSize = o.size + 'px';
        if (o.accent) { w.style.color = S('colors.accent', '#B4562E'); if (stroke) w.style.webkitTextStroke = `${stroke}px ${S('colors.accent')}`; }
        if (o.box) { w.style.background = o.box === true ? S('colors.accent', '#B4562E') : o.box; w.style.padding = '0.02em 0.18em 0.06em'; w.style.borderRadius = S('caption.boxRadius', '0.12em'); }
        if (o.thin) { w.style.fontFamily = S('fonts.thinFamily', 'Inter'); w.style.fontWeight = 200; w.style.textTransform = 'none'; w.style.webkitTextStroke = '0'; }
        if (o.outline) { w.style.color = 'transparent'; w.style.webkitTextStroke = `${Math.max(2, stroke)}px ${color}`; }
      }
      g.words.push({e: w, t, dir: L.dir || 1, em: (o && o.size) || L.size});
      if (wi < L.words.length - 1) line.appendChild(document.createTextNode(L.gap || ' '));
    });
  });
  return g;
}
function runGroup(g, t, exitDur = 0.14) {
  const s = g.spec; const on = t >= s.t0 && t < s.t1; show(g, on); if (!on) return false;
  const ex = clamp((t - (s.t1 - exitDur)) / exitDur);
  g.style.opacity = (1 - inCubic(ex)).toFixed(3);
  g.box.style.transform = `translateY(${(-14 * inCubic(ex)).toFixed(2)}px)`;
  for (const w of g.words) wordStyle(w.e, t - w.t, w.dir, w.em);
  return true;
}
// baseline (px, relative to group box) of a line, for underlines/swooshes
function lineMetrics(g, li) {
  const line = g.box.children[li]; const sp = [...line.querySelectorAll('span.w')]; const b = g.box.getBoundingClientRect();
  const L = Math.min(...sp.map(e => e.getBoundingClientRect().left)), R = Math.max(...sp.map(e => e.getBoundingClientRect().right));
  const mk = document.createElement('span'); mk.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; line.appendChild(mk);
  const base = mk.getBoundingClientRect().top; line.removeChild(mk);
  return {left: L - b.left, right: R - b.left, width: R - L, base: base - b.top, em: parseFloat(getComputedStyle(line).fontSize)};
}

// ---------- typewriter (UI text types on letter by letter; style tokens: motion.type {cps}) ----------
// e gets its full text in build (so layout is fixed); typeOn shows the first n characters at time t.
function typeSetup(e, text) { e.textContent = ''; e.chars = [...text].map(c => { const s = document.createElement('span'); s.textContent = c; e.appendChild(s); return s; }); e.classList.add('trk'); return e; }
function typeOn(e, t, t0, cps) {
  const n = (t - t0) * (cps || S('motion.type.cps', 38)); e.style.visibility = t < t0 ? 'hidden' : '';
  e.chars.forEach((c, i) => { c.style.opacity = clamp(n - i).toFixed(3); });
}

// ---------- assets: images (DOM) and b-roll clips (composited footage) ----------
// asset('assets/thumb.jpg') -> path relative to the job folder. B-roll: plan.broll [{id, src, in, out}] is extracted by
// run.py frames into work/broll/<id>/ (plan fps, 1:1); shots push it with pushBroll (cover-cropped into rect).
const asset = p => /^(https?:|data:)/.test(p) ? p : '../' + JOB + '/' + p;
let BROLL = {};
function pushBroll(st, id, rect, t, t0, extra) {
  const b = BROLL[id]; if (!b) return null;
  const n = clamp(Math.floor((t - t0) * FPS), 0, b.n - 1), k = Math.max(rect[2] / b.w, rect[3] / b.h);
  const ch = rect[3] / k, cw = rect[2] / k, fx = (extra && extra.focus) || [0.5, 0.5];
  const crop = [clamp(b.w * fx[0] - cw / 2, 0, b.w - cw), clamp(b.h * fx[1] - ch / 2, 0, b.h - ch), ch];
  return pushMedia(st, rect, crop, Object.assign({broll: id, frame: n}, extra || {}));
}

// ---------- frosted glass: the compositor blurs the footage under a DOM element's box (screen px, after camera) ----------
function frostBehind(st, e, blur, opacity, radius) {
  const r = e.getBoundingClientRect(); if (r.width < 2) return;
  st.frost.push({rect: [r.left, r.top, r.width, r.height], radius: radius != null ? radius : parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, blur, opacity: opacity == null ? 1 : opacity});
}

// ---------- shared glyphs ----------
const STAR4 = 'M0,-50 C2.6,-9 9,-2.6 50,0 C9,2.6 2.6,9 0,50 C-2.6,9 -9,2.6 -50,0 C-9,-2.6 -2.6,-9 0,-50 Z';   // four-point sparkle
function sparkle(parent, size, color, glow) {
  const sv = svgEl('svg', {width: size, height: size, viewBox: '-55 -55 110 110', class: 'trk'}, parent);
  sv.style.cssText = `overflow:visible;flex:none;filter:drop-shadow(0 0 ${size * 0.12}px ${glow || color})`;
  svgEl('path', {d: STAR4, fill: color}, sv); return sv;
}

// ---------- context passed to templates ----------
const ctx = {els: {}, shots: [], containers: {}, contentRect: null, layoutHooks: []};
ctx.faceOut = (which = 'mouth', r = 25) => {   // output-space point of a face feature for the current main media
  const m = ctx.mainMedia; if (!m) return null; const f = face(m.seg, m.k, r);
  const pick = {eye: [f[0], f[1]], mouth: [f[2], f[3]], top: [f[0], f[4]], chin: [f[0], f[5]], right: [f[7], f[1]], left: [f[6], f[1]]}[which];
  return srcToOut(m, pick[0], pick[1]);
};

// ---------- speaker-relative placement (anchors) ----------
// Positions can be written relative to the speaker instead of fixed pixels. Units are FACE HEIGHTS (fh = forehead->chin
// in output px), so the same plan/style works for close-ups, wide shots and speakers sitting off-centre.
//   element "anchor": {"@": "chin", "fy": 0.2, "dx": -0.1, "pin": "top-center", "axis": "both"|"x"|"y", "follow": 0..1}
//     fx / fy = fraction of the free room from the point to the safe-area edge (works for close-ups AND wide shots: prefer
//     these for distance away from the face); dx / dy = face heights (use for small offsets next to the face).
//     -> after layout the element's bounding box is moved so its `pin` point lands on the anchor point.
//   any point inside params: {"@": "chest", "dx": 0.4} -> [x, y]; an object with "@" and other keys (an icon, a word item)
//     gets its x / y set instead.
//   style default: style.anchors.<template> applies when the element gives no position (x, y, rect, tile, xs) and no anchor.
// Points: eyes, mouth, chin, chest (chin + 0.6 fh), top (forehead), above (0.45 fh over the forehead), left / right
// (face edge, dx = outward), side (whichever side of the face has more room; default pin faces away from the face),
// "#<element id>" (next to another element's box: "at" = its point, default right-center; that element must come earlier).
// Anchored elements are then kept inside the safe area (style.safe [x0,y0,x1,y1]) and pushed off the face unless
// "avoidFace": false (behind-head elements are exempt). Geometry is taken at the element's t0 (locked) — "follow" adds
// that fraction of the speaker's later movement.
const POS_KEYS = ['x', 'y', 'rect', 'tile', 'xs', 'from'];   // any of these in params = the plan placed it explicitly
function geomFromMedia(m, cam) {
  const f = face(m.seg, m.frame - segById(m.seg).first, 25);
  const P = (x, y) => { let q = srcToOut(m, x, y); if (cam) q = [(q[0] - cam.ox) * cam.s + cam.ox, (q[1] - cam.oy) * cam.s + cam.oy]; return q; };
  const e = P(f[0], f[1]), mo = P(f[2], f[3]), top = P(f[0], f[4]), chin = P(f[0], f[5]), L = P(f[6], f[1]), R = P(f[7], f[1]);
  return {cx: (L[0] + R[0]) / 2, eyeY: e[1], mouthY: mo[1], top: top[1], chin: chin[1], L: L[0], R: R[0], fh: Math.max(40, chin[1] - top[1])};
}
function faceGeomAt(t, screen) {   // output-space face geometry at timeline time t; null when the shot shows no speaker
  const fi = Math.round(t * FPS), [seg, k] = segAt(fi), sh = ctx.shots.find(q => t >= q.spec.t0 && t < q.spec.t1); if (!sh) return null;
  const st = {t, seg: seg.id, frame: seg.first + k, media: [], bg: {type: 'solid', color: [0, 0, 0]}, cam: {s: 1, ox: W / 2, oy: H / 2}, dots: 0, dotsLift: 0, flash: 0, occlude: null, frost: []};
  TPL[sh.spec.template].render(sh, t, st, ctx);
  const m = st.media.find(q => !q.broll); return m ? geomFromMedia(m, screen ? st.cam : null) : null;
}
function anchorPoint(a, g) {
  const fh = g.fh, dx = (a.dx || 0) * fh, dy = (a.dy || 0) * fh;
  let side = a['@'] === 'side' ? (g.L > W - g.R ? 'left' : 'right') : a['@'];
  const pt = {eyes: [g.cx + dx, g.eyeY + dy], mouth: [g.cx + dx, g.mouthY + dy], chin: [g.cx + dx, g.chin + dy], chest: [g.cx + dx, g.chin + 0.6 * fh + dy],
    top: [g.cx + dx, g.top + dy], above: [g.cx + dx, g.top - 0.45 * fh + dy], left: [g.L - dx, g.eyeY + dy], right: [g.R + dx, g.eyeY + dy]}[side];
  if (!pt) { console.log('unknown anchor ' + a['@']); return {pt: [W / 2, H / 2], side}; }
  // fx / fy: fraction of the free room between that point and the safe-area edge (+ toward right/bottom, - toward left/top)
  const [sx0, sy0, sx1, sy1] = SAFE();
  if (a.fx) pt[0] += a.fx * (a.fx < 0 ? pt[0] - sx0 : sx1 - pt[0]);
  if (a.fy) pt[1] += a.fy * (a.fy < 0 ? pt[1] - sy0 : sy1 - pt[1]);
  return {pt, side};
}
function resolveAnchors(v, g) {
  if (Array.isArray(v)) return v.map(x => resolveAnchors(x, g));
  if (!v || typeof v !== 'object') return v;
  if (v['@'] && g) { const {pt} = anchorPoint(v, g);
    if (Object.keys(v).every(k => ['@', 'dx', 'dy', 'fx', 'fy'].includes(k))) return pt.map(x => Math.round(x));
    const o = {}; for (const k in v) if (!['@', 'dx', 'dy', 'fx', 'fy'].includes(k)) o[k] = resolveAnchors(v[k], g); o.x = Math.round(pt[0]); o.y = Math.round(pt[1]); return o; }
  if (v['@']) { const o = Object.assign({}, v); delete o['@']; return o; }   // no speaker in this shot: keep the template defaults
  const o = {}; for (const k in v) o[k] = resolveAnchors(v[k], g); return o;
}
function boxOf(root) {
  let r = null; const els = root.querySelectorAll('.trk'); (els.length ? els : root.children).forEach(e => { const b = e.getBoundingClientRect(); if (b.width < 1 && b.height < 1) return;
    r = r ? [Math.min(r[0], b.left), Math.min(r[1], b.top), Math.max(r[2], b.right), Math.max(r[3], b.bottom)] : [b.left, b.top, b.right, b.bottom]; });
  return r;
}
function pinPoint(b, pin) {
  const [h, v] = {'top-center': ['c', 't'], 'center': ['c', 'm'], 'top-left': ['l', 't'], 'top-right': ['r', 't'], 'left-center': ['l', 'm'], 'right-center': ['r', 'm'],
    'bottom-center': ['c', 'b'], 'bottom-left': ['l', 'b'], 'bottom-right': ['r', 'b']}[pin || 'top-center'] || ['c', 't'];
  return [h === 'l' ? b[0] : h === 'r' ? b[2] : (b[0] + b[2]) / 2, v === 't' ? b[1] : v === 'b' ? b[3] : (b[1] + b[3]) / 2];
}
function placeAnchored(inst) {
  const A = inst.anchor, root = inst.root; let b = boxOf(root); if (!b) return;
  if (A.ref) {   // next to another element: "@": "#id", "at": which point of its box (default right-center), dx/dy in face heights
    const T = ctx.els[A.ref], tb = T && boxOf(T.root); if (!tb) { console.log('anchor target missing: ' + A.ref); return; }
    const q = pinPoint(tb, A.at || 'right-center'); A.pt = [q[0] + (A.dx || 0) * A.g.fh, q[1] + (A.dy || 0) * A.g.fh];
    if (!A.pin) A.pin = {'right-center': 'left-center', 'left-center': 'right-center', 'bottom-center': 'top-center', 'top-center': 'bottom-center'}[A.at || 'right-center'] || 'center';
  }
  const shift = (dx, dy) => { root.style.left = (parseFloat(root.style.left) + dx) + 'px'; root.style.top = (parseFloat(root.style.top) + dy) + 'px'; b = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]; };
  const pin = A.pin || (A.side === 'left' ? 'right-center' : A.side === 'right' ? 'left-center' : 'top-center'), pp = pinPoint(b, pin);
  shift(A.axis === 'y' ? 0 : A.pt[0] - pp[0], A.axis === 'x' ? 0 : A.pt[1] - pp[1]);
  const [sx0, sy0, sx1, sy1] = SAFE(), g = A.g;
  const clampIn = () => shift((b[0] < sx0 ? sx0 - b[0] : 0) + (b[2] > sx1 ? Math.max(sx1 - b[2], sx0 - b[0]) : 0), (b[1] < sy0 ? sy0 - b[1] : 0) + (b[3] > sy1 ? Math.max(sy1 - b[3], sy0 - b[1]) : 0));
  if (A.axis !== 'y' && A.axis !== 'x') clampIn();
  const fx0 = g.L - 0.08 * g.fh, fy0 = g.top - 0.25 * g.fh, fx1 = g.R + 0.08 * g.fh, fy1 = g.chin;
  if (A.avoidFace && b[0] < fx1 && b[2] > fx0 && b[1] < fy1 && b[3] > fy0) {
    if (g.chin + 0.12 * g.fh + (b[3] - b[1]) <= sy1) shift(0, g.chin + 0.12 * g.fh - b[1]);
    else if (fx0 - sx0 > sx1 - fx1) shift(fx0 - b[2], 0); else shift(fx1 - b[0], 0);
    clampIn();
  }
  A.base = [parseFloat(root.style.left), parseFloat(root.style.top)];
}

// ---------- per-frame render ----------
function render(t, fi) {
  const [seg, k] = segAt(fi);
  const st = {t, seg: seg.id, frame: seg.first + k, media: [], bg: {type: 'solid', color: [0, 0, 0]},
              cam: {s: 1, ox: W / 2, oy: H / 2}, dots: 0, dotsLift: 0, flash: 0, occlude: null, frost: []};
  ctx.t = t; ctx.fi = fi; ctx.seg = seg; ctx.k = k; ctx.st = st; ctx.contentRect = null; ctx.mainMedia = null;
  world.style.opacity = 1; screenEl.style.opacity = 1;
  // shots: exactly one active
  let active = null;
  for (const s of ctx.shots) { const on = t >= s.spec.t0 && t < s.spec.t1; show(s.root, on); if (on) active = s; }
  if (active) {
    TPL[active.spec.template].render(active, t, st, ctx);
    if (st.media.length) { const m = st.media[0]; ctx.mainMedia = {rect: m.rect, crop: m.crop, seg: m.seg, k: m.frame - segById(m.seg).first}; }
  }
  // elements
  for (const id in ctx.els) {
    const e = ctx.els[id], s = e.spec, on = t >= s.t0 && t < s.t1;
    show(e.root, on); if (!on) continue;
    if (s.ride && ctx.contentRect) {
      const R = ctx.contentRect, sc = R[2] / W; e.root.style.transformOrigin = '0 0';
      e.root.style.transform = `translate(${R[0].toFixed(2)}px,${R[1].toFixed(2)}px) scale(${sc.toFixed(5)})`;
    } else if (s.ride) e.root.style.transform = 'none';
    else if (e.anchor && e.anchor.follow && ctx.mainMedia) {
      const m = ctx.mainMedia, g = geomFromMedia({rect: m.rect, crop: m.crop, seg: m.seg, frame: segById(m.seg).first + m.k}, s.layer === 'screen' ? st.cam : null), now = anchorPoint(e.anchor.spec, g).pt, k = e.anchor.follow;
      e.root.style.transform = `translate(${((now[0] - e.anchor.pt[0]) * k).toFixed(2)}px,${((now[1] - e.anchor.pt[1]) * k).toFixed(2)}px)`;
    }
    TPL[s.template].render(e, t, st, ctx);
  }
  // transitions
  for (const tr of PLAN.transitions || []) {
    if (tr.type === 'bloom') {
      const a = tr.in || 0.26, b = tr.out || 0.22;
      if (t >= tr.at - a && t < tr.at) st.flash = Math.max(st.flash, (tr.peak || 0.9) * Math.pow(clamp((t - (tr.at - a)) / a), 1.5));
      if (t >= tr.at && t < tr.at + b) st.flash = Math.max(st.flash, (tr.outPeak || 0.72) * Math.pow(1 - clamp((t - tr.at) / b), 1.3));
    }
  }
  const c = st.cam; world.style.transform = `translate(${c.ox + (c.tx || 0)}px,${c.oy + (c.ty || 0)}px) scale(${c.s}) translate(${-c.ox}px,${-c.oy}px)`;   // tx/ty: camera pan (screen px)
  return st;
}

// ---------- probes (shutter + QC) ----------
function probe() {
  const out = []; document.querySelectorAll('.trk').forEach(e => {
    const r = e.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return; out.push([r.left, r.top, r.right, r.bottom]); });
  return out;
}
function probeIds() {
  const out = {}; document.querySelectorAll('.trk').forEach((e, i) => { if (!e.dataset.pid) e.dataset.pid = 'p' + i;
    const r = e.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return;
    let op = 1, n = e; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.display === 'none') { op = 0; break; } op *= parseFloat(cs.opacity); n = n.parentElement; }
    if (op > 0.01) out[e.dataset.pid] = [(r.left + r.right) / 2, (r.top + r.bottom) / 2, r.width, r.height, op]; }); return out;
}
function shotProbe(t) { for (const s of ctx.shots) if (t >= s.spec.t0 && t < s.spec.t1 && TPL[s.spec.template].probe) return TPL[s.spec.template].probe(s, t); return []; }

// ---------- boot ----------
window.init = async () => {
  const base = '../' + JOB + '/work/';
  PLAN = await (await fetch(base + 'plan.json')).json();
  STYLE = await (await fetch('../styles/' + (PLAN.style || 'violet-tutorial') + '/style.json')).json();
  if (PLAN.style_overrides) STYLE = deepMerge(STYLE, PLAN.style_overrides);
  FACES = await (await fetch(base + 'faces.json')).json();
  if (PLAN.broll && PLAN.broll.length) BROLL = await (await fetch(base + 'broll/broll.json')).json();
  [W, H] = PLAN.size || [1080, 1920]; FPS = PLAN.fps || 25;
  for (const e of [world, screenEl]) { e.style.width = W + 'px'; e.style.height = H + 'px'; }
  document.body.style.width = W + 'px'; document.body.style.height = H + 'px';
  let tl = 0, f0 = 0;
  for (const s of PLAN.segments) { const first = Math.round(s.in * FPS), n = Math.round((s.out - s.in) * FPS);
    SEGS.push({id: s.id, first, n, f0, tl}); f0 += n; tl += n / FPS; }
  ctx.plan = PLAN; ctx.style = STYLE; ctx.base = base;
  for (const f of ['400 40px Heros', '700 40px Heros', 'italic 400 40px Heros', '400 40px Marcellus', '600 40px SSerif', '400 40px Anton',
                   '200 40px Inter', '400 40px Inter', '500 40px Inter', '600 40px Inter', '700 40px Inter', '800 40px Inter', '900 40px Inter',
                   'italic 300 40px Inter', 'italic 400 40px Inter', 'italic 700 40px Inter', 'italic 900 40px Inter', '400 40px Montserrat', '500 40px Montserrat',
                   '600 40px Montserrat', '700 40px Montserrat', '800 40px Montserrat', '400 40px GreatVibes', 'italic 700 40px Tinos', 'italic 400 40px InstrumentSerif', '400 40px InstrumentSerif']) await document.fonts.load(f);
  for (const s of PLAN.shots) { const root = frameRoot(world); const inst = {spec: s, root}; TPL[s.template].build(inst, s, ctx); ctx.shots.push(inst); if (s.id) ctx.containers[s.id] = inst; }
  (PLAN.elements || []).forEach((s, i) => {
    const id = s.id || ('e' + i); const host = s.in ? ctx.containers[s.in].media : (s.layer === 'screen' ? screenEl : world);
    s.params = s.params || {};
    let A = s.anchor; const hasPos = POS_KEYS.some(k => s.params[k] != null);
    if (A === undefined && !hasPos && !s.in) A = S('anchors.' + s.template, null);
    const g = s.in ? null : faceGeomAt(s.t0 + 0.02, s.layer === 'screen');
    s.params = resolveAnchors(s.params, g);
    const root = frameRoot(host); const inst = {spec: s, root, id};
    if (A && g && String(A['@']).startsWith('#')) inst.anchor = Object.assign({}, A, {spec: A, ref: A['@'].slice(1), g, avoidFace: false});
    else if (A && g) { const ap = anchorPoint(A, g); inst.anchor = Object.assign({}, A, {spec: A, pt: ap.pt, side: ap.side, g, avoidFace: s.avoidFace !== false && A.avoidFace !== false && !s.params.behindHead}); }
    TPL[s.template].build(inst, s, ctx); ctx.els[id] = inst; });
  if (PLAN.watermark !== false) { const wm = el('div', 'abs', screenEl, `left:0;top:${Math.round(H * 0.854)}px;width:${W}px;text-align:center;font:400 17px Heros;color:rgba(255,255,255,.55);letter-spacing:.02em`); wm.textContent = PLAN.watermark || S('watermark', ''); }
  // layout passes that need real font metrics (swooshes, underlines)
  world.style.transform = 'none';
  for (const id in ctx.els) { const e = ctx.els[id]; show(e.root, true); }
  for (const id in ctx.els) if (ctx.els[id].anchor) placeAnchored(ctx.els[id]);
  for (const h of ctx.layoutHooks) h();
  await Promise.all([...document.images].map(i => i.decode().catch(() => console.log('image failed: ' + i.src))));
  return true;
};
function deepMerge(a, b) { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) ? deepMerge(a[k], b[k]) : b[k]; return o; }
window.frame = (t, fi) => { const st = render(t, fi); st.probe = probe().concat(shotProbe(t).map(p => [p[0], p[1], p[0], p[1]])); return st; };
window.track = (t, fi) => { const st = render(t, fi); return {cam: st.cam, media: st.media.map(m => [m.rect, m.crop]), p: probeIds(), map: shotProbe(t)}; };
window.info = () => ({W, H, FPS, frames: SEGS.reduce((a, s) => a + s.n, 0), segments: SEGS,
  cuts: [...new Set([...PLAN.shots.map(s => s.t0), ...SEGS.map(s => s.tl)])].filter(x => x > 0).sort((a, b) => a - b),
  planned: PLAN.qc_planned_motion || []});
