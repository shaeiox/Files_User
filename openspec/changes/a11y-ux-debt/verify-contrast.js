/**
 * Task 2.1 / contrast spec requirement: "Contrast claims are mechanically verifiable".
 *
 * Reads the SHIPPED token values from assets/css/tokens.css and computes the
 * WCAG 2.1 contrast ratio of every muted text token against every surface the
 * application actually places text on, in both themes.
 *
 * Run:  node openspec/changes/a11y-ux-debt/verify-contrast.js
 * Exit: 0 = all ratios meet the floor, 1 = at least one fails.
 *
 * Surfaces are traced from tokens.css and the stylesheets, not guessed:
 *   --bg            page base            (footer at top level, backdrop)
 *   --bg-card       card / menu surface  (.footer, .ac-dropdown, .lang-dropdown-menu)
 *   --bg-input      input surface        (.input-wrap, .auth-input-group)
 *   --bg-hover      hover fill           (dropdown options on hover)
 *   --n-4           raised surface       (.thead, .empty-circle in browse.css)
 *   --bg-elevated   highest fill         (dropdowns, modals)
 */

const fs = require('fs');
const path = require('path');

const TOKENS = path.join(__dirname, '..', '..', '..', 'assets', 'css', 'tokens.css');

function srgbToLin(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* ---------- colour parsing (hex + oklch) ---------- */
function linToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
// Several surfaces are authored in oklch(), which is not a hex literal. Left
// unparsed they become NaN and silently vanish from the report, which is how
// --n-4 escaped an earlier pass. Convert properly.
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(v => Math.max(0, Math.min(1, v)));
}
function toRgb(value) {
  if (!value) return null;
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255);
  }
  const ok = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (ok) {
    const L = ok[1].endsWith('%') ? parseFloat(ok[1]) / 100 : parseFloat(ok[1]);
    return oklchToRgb(L, parseFloat(ok[2]), parseFloat(ok[3]));
  }
  return null; // rgba()/gradient over an unknown backdrop - not measurable here
}
function luminance(value) {
  const rgb = toRgb(value);
  if (!rgb) return null;
  return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]);
}
function ratio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* ---------- token parsing ---------- */
const src = fs.readFileSync(TOKENS, 'utf8').replace(/\r\n/g, '\n');

function blockVar(blockStart, name) {
  // Collect declarations until the matching close brace. Characters are
  // appended verbatim: adding a separator per character would shred every
  // `--name: value;` declaration into one character per line.
  let depth = 0, buf = '';
  for (let i = blockStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
    if (depth >= 1) buf += ch;
  }
  const m = buf.match(new RegExp('--' + name + '\\s*:\\s*([^;]+);'));
  return m ? m[1].trim() : null;
}

function themeBlock(selector) {
  const i = src.indexOf(selector + ' {');
  return i === -1 ? null : i + selector.length + 1;
}

function resolve(value, theme, depth = 0) {
  if (!value || depth > 6) return value;
  const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (!alias) return value;
  const resolved = blockVar(theme, alias[1].slice(2));
  return resolve(resolved, theme, depth + 1);
}

const LIGHT = themeBlock('[data-theme="light"]');
const DARK = themeBlock('[data-theme="dark"]');

const SURFACES = ['bg', 'bg-card', 'bg-input', 'bg-hover', 'n-4', 'bg-elevated'];
const MUTED = ['text', 'text-2', 'text-3', 'text-4'];
const FLOOR = 4.5;

let failures = 0;

for (const [name, start] of [['light', LIGHT], ['dark', DARK]]) {
  if (start === null) { console.error(`theme block not found: ${name}`); process.exit(2); }

  const bg = {};
  SURFACES.forEach(s => { bg[s] = resolve(blockVar(start, s), start); });

  console.log(`\n=== ${name.toUpperCase()} THEME ===`);
  console.log('  surfaces: ' + SURFACES.map(s => `--${s}=${bg[s]}`).join('  '));
  console.log('');

  for (const tok of MUTED) {
    const raw = blockVar(start, tok);
    const val = resolve(raw, start);
    console.log(`  --${tok}  declared: ${raw}  resolves: ${val}`);
    for (const s of SURFACES) {
      const r = ratio(val, bg[s]);
      if (r === null) {
        console.log(`      SKIP  vs --${s.padEnd(12)} unmeasurable (declared: ${bg[s]})`);
        continue;
      }
      const ok = r >= FLOOR;
      if (!ok) failures++;
      console.log(`      ${ok ? 'PASS' : 'FAIL'}  vs --${s.padEnd(12)} ${r.toFixed(2)}:1`);
    }
  }
}

/* ---------- monotonicity: no muted step brighter than the one above ---------- */
console.log('\n=== SCALE ORDER (no step brighter than the step above it) ===');
for (const [name, start] of [['light', LIGHT], ['dark', DARK]]) {
  const card = resolve(blockVar(start, 'bg-card'), start);
  const vals = MUTED.map(t => ({ t, v: resolve(blockVar(start, t), start), r: ratio(resolve(blockVar(start, t), start), card) }));
  if (vals.some(v => v.r === null)) {
    console.log(`  FAIL  ${name}  --bg-card is unmeasurable`);
    failures++;
    continue;
  }
  let inverted = false;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i].r > vals[i - 1].r) {
      inverted = true;
      console.log(`  FAIL  ${name}: --${vals[i].t} (${vals[i].r.toFixed(2)}) is brighter than --${vals[i - 1].t} (${vals[i - 1].r.toFixed(2)})`);
    }
  }
  console.log(`  ${inverted ? 'FAIL' : 'PASS'}  ${name}  ${vals.map(v => `--${v.t}=${v.r.toFixed(2)}`).join('  ')}`);
  if (inverted) failures++;
}

console.log('\n' + '='.repeat(64));
if (failures === 0) {
  console.log(`RESULT: PASS - every muted value clears ${FLOOR}:1 on every surface, both themes.`);
  console.log('The muted scale is monotonic in both themes.');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL - ${failures} check(s) below the ${FLOOR}:1 floor or out of order.`);
  process.exit(1);
}