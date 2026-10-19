// QA for CityMETER: Yolk · โหมดสำนักงานพลังงานจังหวัด (Chainat energy demo)
//
//   npm run check                                      # data/model/contract/static checks
//   npm run qa                                         # starts an isolated loopback server + browser checks
//   BASE_URL=https://montri-th.github.io/chainat-energy/ npm run qa -- --label live
//
// Options: --write <file.json> saves the results · --shots <dir> saves screenshots · --static-only skips the browser.
// --layout-only runs the bounded map-workspace geometry checks without the other browser fixtures.
// Playwright is resolved from PLAYWRIGHT_MODULE (path to playwright/index.mjs) or the "playwright" package.
// A pass here is evidence for the listed checks only. It is not an accessibility, LDS or data-truth certificate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4173/').replace(/\/?$/, '/');
const LABEL = opt('--label') || (BASE.includes('127.0.0.1') || BASE.includes('localhost') ? 'local' : 'live');
const results = [];
const check = (group, name, ok, detail = '') => { results.push({ group, name, ok: !!ok, detail: String(detail).slice(0, 400) }); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const json = f => JSON.parse(read(f));
const exists = f => fs.existsSync(path.join(ROOT, f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');

/* ---------------- static checks (repository files that are published) ---------------- */
const REQUIRED = ['index.html', 'styles.css', 'js/core.js', 'js/map.js', 'js/views.js', 'js/app.js',
  'data/meta.json', 'data/areas.json', 'data/supply.json', 'data/plan.json', 'data/vehicles.json', 'data/cars.json',
  'data/geo/province.geojson', 'data/geo/district.geojson', 'data/geo/tambon.geojson', 'data/geo/lao.geojson', 'data/buildings/index.json',
  'vendor/maplibre-gl/4.7.1/maplibre-gl.js', 'vendor/maplibre-gl/4.7.1/LICENSE.txt',
  'assets/lds/build-kit/lds-0.9.7.css', 'assets/lds/machine/color-srgb-10.production.css',
  'assets/lds/build-kit/motif/landometer-motifs.js', 'assets/lds/build-kit/motif/landometer-motifs.css',
  'assets/lds/build-kit/motif/svg/logo-quiet.svg', 'js/hero-logo.js'];
const missing = REQUIRED.filter(f => !exists(f));
check('files', 'required files present', !missing.length, missing.join(', '));

const meta = json('data/meta.json'), areas = json('data/areas.json'), supply = json('data/supply.json'), plan = json('data/plan.json'), vehicles = json('data/vehicles.json'), cars = json('data/cars.json');
check('data', '8 districts · 53 tambons · 59 LAOs', areas.district.length === 8 && areas.tambon.length === 53 && areas.lao.length === 59, `${areas.district.length}/${areas.tambon.length}/${areas.lao.length}`);
const bindex = json('data/buildings/index.json');
const laoFiles = fs.readdirSync(path.join(ROOT, 'data/buildings')).filter(f => /^\d{8}\.json$/.test(f));
let bTotal = 0; for (const f of laoFiles) bTotal += json(`data/buildings/${f}`).n;
check('data', 'one building file per LAO and totals match meta', laoFiles.length === 59 && bTotal === meta.layers.buildings.count, `${laoFiles.length} files · ${bTotal} vs meta ${meta.layers.buildings.count}`);
check('data', 'building index covers every LAO', Object.keys(bindex.laoTambons || {}).length === 59);

const planElec = plan.plan.situation.electricity2566.rows.reduce((a, r) => a + r.value, 0);
const modelElec = areas.tambon.reduce((a, u) => a + Object.values(u.elec || {}).reduce((x, y) => x + (y || 0), 0), 0);
check('data', 'modelled electricity sums back to the plan total (±0.01%)', Math.abs(modelElec - planElec) / planElec < 1e-4, `model ${Math.round(modelElec)} · plan ${planElec}`);
check('data', 'supply registers: 203 fuel · 18 controlled · 69 projects', supply.fuel.length === 203 && supply.controlled.length === 18 && supply.projects.length === 69, `${supply.fuel.length}/${supply.controlled.length}/${supply.projects.length}`);

const pumps = supply.projects.filter(p => p.technology === 'ระบบสูบน้ำพลังงานแสงอาทิตย์');
const pumpKw = pumps.reduce((a, p) => a + (p.capacityKw || 0), 0), pumpSystems = pumps.reduce((a, p) => a + (p.systems || 0), 0);
check('data', 'solar pumping: 58 rows · 103 systems · 360.04 kW parsed from W, kW and system counts', pumps.length === 58 && pumpSystems === 103 && Math.abs(pumpKw - 360.04) < 0.01 && pumps.every(p => p.capacityKw != null), `${pumps.length} rows · ${pumpSystems} systems · ${pumpKw.toFixed(2)} kW`);
const tambonKw = areas.tambon.reduce((a, u) => a + (u.supply.solarPumpKw || 0), 0);
check('data', 'tambon pump capacity sums to the project total', Math.abs(tambonKw - pumpKw) < 0.01, `${tambonKw.toFixed(2)} vs ${pumpKw.toFixed(2)}`);
const vehObs = vehicles.rows.reduce((a, r) => a + r[2], 0);
const vehSum = lvl => areas[lvl].reduce((a, u) => a + Object.values(u.vehicles).reduce((x, y) => x + y, 0), 0);
check('data', 'modelled vehicles are whole numbers and sum to the DLT total at tambon, LAO and district level', vehSum('tambon') === vehObs && vehSum('lao') === vehObs && vehSum('district') === vehObs && ['tambon', 'lao', 'district'].every(l => areas[l].every(u => Object.values(u.vehicles).every(Number.isInteger))), `${vehSum('tambon')} · ${vehSum('lao')} · ${vehSum('district')} vs ${vehObs}`);
const distBad = [];
for (const d of areas.district) {
  const ts = areas.tambon.filter(t => t.districtCode === d.code);
  for (const g of ['elec', 'fuel', 'vehicles', 'supply']) for (const k of Object.keys(d[g])) {
    const s = ts.reduce((a, t) => a + (t[g][k] || 0), 0);
    if (d[g][k] == null ? ts.every(t => t[g][k] != null) : Math.abs(d[g][k] - s) > 1e-6) distBad.push(`${d.code} ${g}.${k} ${d[g][k]} vs ${s}`);
  }
}
check('data', 'district values equal the sum of their tambons', !distBad.length, distBad.slice(0, 4).join(' | '));
// CityMETER: Cars (registrations per month, province level)
const E = cars.engines;
const rowsOk = Object.values(cars.monthly).every(rows => rows.length === cars.months.length && rows.every(r => r.length === E.length && r.every(v => Number.isInteger(v) && v >= 0)));
check('cars', 'monthly registrations: one row of five engine counts per month for every vehicle type', rowsOk && E.join() === 'ELECTRIC,GASOLINE-PHEV,GASOLINE-HYBRID,GASOLINE,DIESEL', `${cars.months.length} months ${cars.months[0]}–${cars.months[cars.months.length - 1]} · ${Object.keys(cars.monthly).join(',')}`);
const jun26 = cars.monthly['1'][cars.months.indexOf('2026-06')].reduce((a, b) => a + b, 0);
check('cars', 'June 2026 passenger cars (รย.1) total 78, as shown on the CityMETER: Cars page', jun26 === 78, jun26);
const win = [cars.months.indexOf(cars.window12m[0]), cars.months.indexOf(cars.window12m[1])];
const benchBad = [];
for (const [t, b] of Object.entries(cars.benchmark.types)) {
  let ev = 0, tot = 0; for (let i = win[0]; i <= win[1]; i++) { const r = cars.monthly[t][i]; ev += r[0]; tot += r.reduce((a, c) => a + c, 0); }
  const me = b.rows.findIndex(r => r[0] === cars.province.name);
  const sorted = [...b.rows].sort((x, y) => y[1] / y[2] - x[1] / x[2] || x[0].localeCompare(y[0]));
  const shares = b.rows.map(r => r[1] / r[2]).sort((x, y) => x - y); const n = shares.length;
  const median = n % 2 ? shares[(n - 1) / 2] : (shares[n / 2 - 1] + shares[n / 2]) / 2;
  if (b.rows[me][1] !== ev || b.rows[me][2] !== tot) benchBad.push(`type ${t} window ${ev}/${tot} vs ${b.rows[me][1]}/${b.rows[me][2]}`);
  if (sorted[b.rank - 1][0] !== cars.province.name || b.rank !== me + 1) benchBad.push(`type ${t} rank ${b.rank}`);
  if (b.of !== 77 || Math.abs(median - b.median) > 5e-5) benchBad.push(`type ${t} of ${b.of} median ${median} vs ${b.median}`);
}
check('cars', 'benchmark: 77 provinces, rank and median recompute from the rows, Chainat window equals its monthly sums', !benchBad.length, benchBad.join(' | '));
const lc = cars.benchmark.lowCount, lowExpected = cars.benchmark.types['12'].rows.filter(r => r[2] < 1000).map(r => r[0]).sort();
const sensBad = [];
for (const [t, b] of Object.entries(cars.benchmark.types)) {
  const kept = b.rows.filter(r => !lc.provinces.includes(r[0]));
  const rank = [...kept].sort((x, y) => y[1] / y[2] - x[1] / x[2] || x[0].localeCompare(y[0])).findIndex(r => r[0] === cars.province.name) + 1;
  if (rank !== b.withoutLowCount.rank || kept.length !== b.withoutLowCount.of) sensBad.push(`type ${t}: ${rank}/${kept.length} vs ${b.withoutLowCount.rank}/${b.withoutLowCount.of}`);
}
check('cars', 'low-count provinces follow the stated rule and the rank without them recomputes', JSON.stringify([...lc.provinces].sort()) === JSON.stringify(lowExpected) && !sensBad.length, `${lc.provinces.join(',')} ${sensBad.join(' | ')}`);
const moto = cars.quality.stockCheck.find(s => s.type === '12' && s.engine === 'ELECTRIC');
check('cars', 'e-motorcycles registered Jan 2020–Feb 2026 equal the DLT stock at 28 Feb 2026 (monthly values are new registrations)', moto && moto.registered === moto.stock && moto.stock === vehicles.rows.filter(r => r[0] === '12' && r[1] === 'ไฟฟ้า').reduce((a, r) => a + r[2], 0), JSON.stringify(moto));
const photos = supply.projects.flatMap(p => p.photos || []);
const missingPhotos = photos.filter(ph => !exists(`assets/photos/${ph.file}`) || sha(`assets/photos/${ph.file}`) !== ph.sha256);
check('data', 'every project photo exists and matches its SHA-256', photos.length === 64 && !missingPhotos.length, `${photos.length} photos · ${missingPhotos.length} missing/mismatched`);

// privacy and publication boundary
const ID_KEYS = /(^|\.)(id|code|tambonId|districtId|sha256|juristicRegNo|tsicId|tambonCode|districtCode|laoCode)$/;
const PHONE = /(?<![\d.])0\d{1,2}[- ]?\d{3}[- ]?\d{3,4}(?!\d)/;
const ID13 = /(?<![\d.])\d{13}(?!\d)/;
const COORD_KEYS = /^(lat|lon|lng|latitude|longitude|coordinates|coord|geometry|x|y)$/i;
const hits = { phone: [], id13: [], coord: [] };
const walk = (o, p) => {
  if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
  if (o && typeof o === 'object') return Object.entries(o).forEach(([k, v]) => { if (COORD_KEYS.test(k)) hits.coord.push(`${p}.${k}`); walk(v, `${p}.${k}`); });
  if (typeof o !== 'string') return;
  const key = p.replace(/\[\d+\]/g, '');
  if (ID_KEYS.test(key)) return;
  if (PHONE.test(o)) hits.phone.push(`${p}: ${o.slice(0, 40)}`);
  if (ID13.test(o)) hits.id13.push(`${p}: ${o.slice(0, 40)}`);
};
walk(supply, 'supply'); walk(cars, 'cars');
check('privacy', 'no phone numbers in published supply or cars data', !hits.phone.length, hits.phone.slice(0, 5).join(' | '));
check('privacy', 'no 13-digit numbers outside juristic registration fields', !hits.id13.length, hits.id13.slice(0, 5).join(' | '));
check('privacy', 'no per-site coordinates in supply or cars data', !hits.coord.length, hits.coord.slice(0, 5).join(' | '));
const individualsWithReg = supply.fuel.filter(f => f.ownerKind === 'บุคคลธรรมดา' && f.juristicRegNo);
check('privacy', 'individual operators carry no registration number', !individualsWithReg.length, individualsWithReg.length);
const publicText = ['index.html', 'js/core.js', 'js/views.js', 'js/app.js', 'js/map.js', 'data/meta.json', 'data/plan.json', 'data/supply.json', 'README.md'].filter(exists).map(f => [f, read(f)]);
const commercial = publicText.filter(([, t]) => /ใบเสนอราคา|ค่าบริการ|ราคาบริการ|อัตราค่าบริการ/i.test(t)).map(([f]) => f);
check('privacy', 'no price or quotation text in published files', !commercial.length, commercial.join(', '));
const secrets = publicText.filter(([, t]) => /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}/i.test(t)).map(([f]) => f);
check('privacy', 'no credentials or tokens in published files', !secrets.length, secrets.join(', '));

// colour governance in our own files (LDS files are checked by the LDS package itself)
const own = ['styles.css', 'js/core.js', 'js/map.js', 'js/views.js', 'js/app.js'];
const hexInJs = own.filter(f => f.endsWith('.js')).flatMap(f => (read(f).match(/#[0-9A-Fa-f]{6}\b/g) || []).map(h => `${f} ${h}`));
check('colour', 'no literal hex colours in scripts (all colours resolve from LDS tokens)', !hexInJs.length, hexInJs.join(', '));
const fnColours = own.flatMap(f => (read(f).match(/\b(rgba?|hsla?|color-mix|oklch|lab|lch)\(/g) || []).map(m => `${f} ${m}`));
check('colour', 'no ungoverned colour functions in our CSS/JS', !fnColours.length, fnColours.join(', '));
const cssHex = (read('styles.css').match(/#[0-9A-Fa-f]{6}\b/g) || []).map(h => h.toUpperCase());
check('colour', 'only on-deep identity inks are literal in CSS (#FFFFFF #F1F4EF #182327)', cssHex.every(h => ['#FFFFFF', '#F1F4EF', '#182327'].includes(h)), [...new Set(cssHex)].join(' '));
const tokens = read('assets/lds/machine/color-srgb-10.production.css');
const lutOf = (fam, mode) => Array.from({ length: 41 }, (_, i) => (tokens.match(new RegExp(`--ldm-scale-${fam}-${mode}-lut-${String(i).padStart(2, '0')}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1]);
const FAMILIES = ['activity', 'count', 'density-household'];
check('colour', 'LUT41 light and dark tokens are identical for every family used', FAMILIES.every(f => { const a = lutOf(f, 'light'), b = lutOf(f, 'dark'); return a.every(Boolean) && a.join() === b.join(); }));
const css = read('styles.css');
const catOk = ['01', '02', '03', '04', '05'].every(s => css.includes(`--cat-${s}: var(--ldm-series-${s}-fill-light)`) && (css.match(new RegExp(`--cat-${s}: var\\(--ldm-series-${s}-fill-dark\\)`, 'g')) || []).length === 2 && new RegExp(`--ldm-series-${s}-fill-(light|dark):`).test(tokens));
check('colour', 'engine categories use landometer-series-10-v8 soft fills, light and dark (DATAVIZ-05)', catOk);

// documentation of the release
const html = read('index.html');
check('page', 'noindex, color-scheme and two theme-color metas', /noindex/.test(html) && /name="color-scheme"/.test(html) && (html.match(/name="theme-color"/g) || []).length === 2);
const identity = exists('docs/identity-manifest.json') ? json('docs/identity-manifest.json') : { assets: [], iconSet: {}, share: {} };
const identityBad = (identity.assets || []).filter(a => !exists(a.path) || sha(a.path) !== a.sha256 || fs.statSync(path.join(ROOT, a.path)).size !== a.bytes || a.publicationPermission !== true || !a.approvalScope);
check('identity', 'identity assets have exact bytes, hashes and artifact-scoped permission', identity.assets.length >= 10 && !identityBad.length && identity.iconSet.canonicalProductTileClaimed === false, identityBad.map(a => a.path).join(', '));
const iconRows = identity.assets.filter(a => /^assets\/identity\/icon-portfolio-\d+\.png$/.test(a.path));
const iconSizes = [16, 32, 48, 180, 192, 512];
check('identity', 'all six exact approved portfolio icons are linked and retain actual PNG dimensions', iconSizes.every(size => {
  const a = iconRows.find(row => row.width === size && row.height === size); if (!a || !exists(a.path)) return false;
  const b = fs.readFileSync(path.join(ROOT, a.path));
  return b.subarray(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === size && b.readUInt32BE(20) === size && new RegExp(`sizes="${size}x${size}"[^>]+${path.basename(a.path).replaceAll('.', '\\.')}`).test(html);
}));
const webManifest = exists('site.webmanifest') ? json('site.webmanifest') : {};
check('identity', 'web manifest binds the scoped 192 and 512 maskable icons with relative app URLs', /rel="manifest"/.test(html) && webManifest.scope === './' && webManifest.start_url === './' && ['192x192', '512x512'].every(size => webManifest.icons?.some(i => i.sizes === size && iconRows.some(a => i.src.split('?')[0].replace(/^\.\//, '') === a.path) && (size !== '512x512' || i.purpose === 'maskable'))));
const share = identity.share;
check('identity', 'social preview metadata binds the truthful Chainat 1200×630 asset', share.width === 1200 && share.height === 630 && identity.assets.some(a => a.role === 'social_preview' && a.path === share.path) && html.includes(`content="https://montri-th.github.io/chainat-energy/${share.path}"`) && html.includes(`property="og:image:type" content="${share.mime}"`) && /property="og:image:width" content="1200"/.test(html) && /property="og:image:height" content="630"/.test(html) && /name="twitter:card" content="summary_large_image"/.test(html));
check('page', 'owner-selected quiet logo is finite-once with an exact visible source fallback and no pause control',
  /data-asset-id="landometer\.logo\.quiet"/.test(html) && /data-motion-mode="finite_once"/.test(html) &&
  /<lm-motif\b[^>]*kind="logo"[^>]*\bquiet\b[^>]*autoplay="false"/.test(html) &&
  /<img\b[^>]*class="hero-logo-fallback"[^>]*src="\.\/assets\/lds\/build-kit\/motif\/svg\/logo-quiet\.svg"/.test(html) &&
  !/<button\b[^>]*class="[^"]*lds-motion-pause/.test(html));
check('page', 'exact motif runtime loads with the artifact finite-once controller; repeating wrappers are not loaded',
  html.includes('landometer-motifs.js') && html.includes('js/hero-logo.js') &&
  !/\b(?:src|href)="[^"]*(?:motion-controller\.js|motif-frame\.(?:js|css))/.test(html) &&
  !/<lm-motif\b[^>]*\b(?:loop|replay)=/.test(html));
const quietAssets = [
  ['assets/lds/build-kit/motif/landometer-motifs.js', '3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2'],
  ['assets/lds/build-kit/motif/landometer-motifs.css', '7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e'],
  ['assets/lds/build-kit/motif/svg/logo-quiet.svg', '5b6798cdb6c3ada246286e6ce3386644f383c4f987a267e5c5db392809403e14']
];
const sourceFiles = ['index.html', 'styles.css', 'js/map.js', 'js/basemaps.js', 'js/hero-logo.js', ...quietAssets.map(([file]) => file), 'scripts/qa.mjs'];
const sourceFingerprint = { algorithm: 'sha256', files: Object.fromEntries(sourceFiles.map(file => [file, exists(file) ? sha(file) : null])) };
check('motif', 'quiet logo runtime, CSS and final SVG retain the exact approved release 1.2.1 bytes',
  quietAssets.every(([file, hash]) => exists(file) && sha(file) === hash));

/* ---------------- browser checks ---------------- */
let shotsDir = opt('--shots');
// Synthetic 256px raster fixture for bounded provider-adapter tests. Never prefetch real tiles.
function syntheticTile() {
  const crc = data => { let c = -1; for (const byte of data) { c ^= byte; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ -1) >>> 0; };
  const chunk = (name, data) => { const tag = Buffer.from(name), size = Buffer.alloc(4), sum = Buffer.alloc(4); size.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([tag, data]))); return Buffer.concat([size, tag, data, sum]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(256, 0); ihdr.writeUInt32BE(256, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.alloc((256 * 4 + 1) * 256))), chunk('IEND', Buffer.alloc(0))]);
}

// This artifact deliberately uses the owner's finite-once/no-button selection.
// These checks attest that selection, not LDS's different repeating gallery contract.
async function heroLogoChecks(browser) {
  const host = '.hero-motif[data-asset-id="landometer.logo.quiet"]';
  const state = page => page.evaluate(selector => {
    const node = document.querySelector(selector), runtime = node?.querySelector('lm-motif'), fallback = node?.querySelector('img.hero-logo-fallback');
    const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && !el.hidden; };
    const box = node?.getBoundingClientRect();
    const animations = runtime?.getAnimations({ subtree: true }) || [];
    return { count: document.querySelectorAll(selector).length, runtimeCount: node?.querySelectorAll('lm-motif').length || 0,
      svgCount: runtime?.querySelectorAll('svg').length || 0, fallbackCount: node?.querySelectorAll('img.hero-logo-fallback').length || 0,
      phase: node?.dataset.logoMotion, runtimeVisible: visible(runtime), fallbackVisible: visible(fallback),
      fallbackLoaded: !!(fallback?.complete && fallback.naturalWidth),
      kind: runtime?.getAttribute('kind'), quiet: runtime?.hasAttribute('quiet'), autoplay: runtime?.getAttribute('autoplay'),
      running: animations.filter(a => a.playState === 'running').length,
      bounded: animations.every(a => a.effect?.getComputedTiming().iterations === 1 && a.effect.getComputedTiming().endTime <= 3400),
      width: box?.width || 0, height: box?.height || 0, overflow: document.documentElement.scrollWidth - innerWidth,
      pauses: document.querySelectorAll('.lds-motion-pause').length, started: window.__heroLogoQaStarts || 0 };
  }, host);
  const watch = ctx => ctx.addInitScript(() => {
    window.__heroLogoQaStarts = 0;
    new MutationObserver(records => {
      for (const r of records) if (r.target.matches?.('.hero-motif[data-asset-id="landometer.logo.quiet"]') && r.target.dataset.logoMotion === 'playing') window.__heroLogoQaStarts++;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-logo-motion'] });
  });
  const awaitPhase = (page, phase) => page.waitForFunction(({ selector, phase }) => document.querySelector(selector)?.dataset.logoMotion === phase, { selector: host, phase }, { timeout: 7000 });
  const matrix = [1440, 320, 360, 390].flatMap(width => ['light', 'dark'].map(scheme => ({ width, scheme })));
  for (const { width, scheme } of matrix) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, colorScheme: scheme });
    await watch(ctx);
    const page = await ctx.newPage(), tag = `${scheme} ${width}`;
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.locator(host).scrollIntoViewIfNeeded();
      await awaitPhase(page, 'playing');
      const moving = await state(page);
      check('motif', `${tag}: exact quiet logo performs one real, bounded authored animation`, moving.count === 1 && moving.runtimeCount === 1 && moving.svgCount === 1 && moving.kind === 'logo' && moving.quiet && moving.autoplay === 'false' && moving.runtimeVisible && moving.running > 0 && moving.bounded && moving.pauses === 0, JSON.stringify(moving));
      await awaitPhase(page, 'final');
      const settled = await state(page);
      check('motif', `${tag}: complete fallback settles with stable, contained geometry`, settled.fallbackCount === 1 && settled.fallbackVisible && settled.fallbackLoaded && !settled.runtimeVisible && settled.running === 0 && settled.overflow <= 0 && Math.abs(settled.width - moving.width) < 1 && Math.abs(settled.height - moving.height) < 1, JSON.stringify(settled));
      if (width === 1440 && scheme === 'light') {
        // Cross the former six-second replay boundary, then exit and re-enter the hero.
        await page.waitForTimeout(3300);
        await page.locator('#cars').scrollIntoViewIfNeeded();
        await page.locator(host).scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const stable = await state(page);
        check('motif', 'finite-once logo never replays after a full former-cycle dwell or viewport re-entry', stable.phase === 'final' && stable.started === 1 && stable.running === 0 && stable.fallbackVisible, JSON.stringify(stable));
      }
    } catch (e) { check('motif', `${tag}: quiet-logo lifecycle completed`, false, e.message); }
    finally { await ctx.close(); }
  }

  // Fail-open fixtures: source fallback must remain usable without JS, runtime or observer.
  for (const mode of ['no-javascript', 'runtime-blocked', 'stylesheet-blocked', 'observer-unavailable', 'reduced-motion']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', javaScriptEnabled: mode !== 'no-javascript', reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference' });
    await watch(ctx);
    if (mode === 'runtime-blocked') await ctx.route('**/landometer-motifs.js*', route => route.abort('failed'));
    if (mode === 'stylesheet-blocked') await ctx.route('**/landometer-motifs.css*', route => route.abort('failed'));
    if (mode === 'observer-unavailable') await ctx.addInitScript(() => { delete window.IntersectionObserver; });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.locator(host).scrollIntoViewIfNeeded();
      await page.waitForFunction(selector => { const img = document.querySelector(selector)?.querySelector('img.hero-logo-fallback'); return img?.complete && img.naturalWidth > 0; }, host);
      const fallback = await state(page);
      check('motif', `${mode}: complete source SVG stays visible and no animation starts`, fallback.count === 1 && fallback.fallbackCount === 1 && fallback.fallbackLoaded && fallback.fallbackVisible && !fallback.runtimeVisible && fallback.running === 0 && fallback.started === 0 && fallback.overflow <= 0, JSON.stringify(fallback));
    } catch (e) { check('motif', `${mode}: complete fallback available`, false, e.message); }
    finally { await ctx.close(); }
  }

  // Fresh contexts have no warmed asset cache. Hold one dependency until the source fallback
  // has been inspected, then release it and require a genuine authored play.
  for (const dependency of ['landometer-motifs.js', 'landometer-motifs.css']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await watch(ctx);
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await ctx.route(`**/${dependency}*`, async route => { await held; await route.continue(); });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'commit' });
      if (dependency.endsWith('.css')) {
        // A pending stylesheet can prevent the browser from painting or completing images.
        // Inspect source DOM here; do not pretend a pre-paint DOM check is a visual pass.
        await page.waitForFunction(selector => !!document.querySelector(selector)?.querySelector('img.hero-logo-fallback'), host, { timeout: 7000 });
        const cold = await page.evaluate(selector => {
          const node = document.querySelector(selector), img = node?.querySelector('img.hero-logo-fallback');
          return { phase: node?.dataset.logoMotion, src: img?.getAttribute('src'), hidden: img?.hidden, started: window.__heroLogoQaStarts || 0,
            stylesheetReady: !!document.querySelector('link[href="./assets/lds/build-kit/motif/landometer-motifs.css"]')?.sheet };
        }, host);
        check('motif', 'cold stylesheet: exact source-fallback DOM remains declared while stylesheet is pending (pre-paint check)', cold.phase === 'final' && cold.src === './assets/lds/build-kit/motif/svg/logo-quiet.svg' && cold.hidden === false && cold.started === 0 && !cold.stylesheetReady, JSON.stringify(cold));
      } else {
        await page.waitForFunction(selector => { const img = document.querySelector(selector)?.querySelector('img.hero-logo-fallback'); return img?.complete && img.naturalWidth > 0; }, host, { timeout: 7000 });
        const cold = await state(page);
        check('motif', `cold ${dependency}: source fallback stays complete before the dependency becomes ready`, cold.count === 1 && cold.phase === 'final' && cold.fallbackCount === 1 && cold.fallbackLoaded && cold.fallbackVisible && !cold.runtimeVisible && cold.started === 0, JSON.stringify(cold));
      }
      release();
      await page.locator(host).scrollIntoViewIfNeeded();
      await awaitPhase(page, 'playing');
      const ready = await state(page);
      check('motif', `cold ${dependency}: enhancement starts only after exact runtime and stylesheet readiness`, ready.fallbackLoaded && ready.runtimeVisible && ready.svgCount === 1 && ready.running > 0 && ready.bounded && ready.started === 1, JSON.stringify(ready));
    } catch (e) { check('motif', `cold ${dependency}: progressive enhancement completed`, false, e.message); }
    finally { release(); await ctx.close(); }
  }

  // rem-based text enlargement exercises real Thai content while the 2:1 logo stage stays
  // fixed by its authored aspect ratio. This is scoped to the changed hero placement.
  for (const width of [1440, 390]) for (const scale of [1.3, 2]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      const detail = await page.evaluate(async ({ selector, scale }) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
        await document.fonts.ready;
        const hero = document.querySelector('.hero'), logo = document.querySelector(selector), text = hero?.firstElementChild;
        const h = hero.getBoundingClientRect(), l = logo.getBoundingClientRect(), t = text.getBoundingClientRect();
        const overlap = Math.min(l.right, t.right) > Math.max(l.left, t.left) + 1 && Math.min(l.bottom, t.bottom) > Math.max(l.top, t.top) + 1;
        return { width: l.width, height: l.height, rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
          logoContained: l.left >= h.left && l.right <= h.right + 1 && l.top >= h.top && l.bottom <= h.bottom + 1,
          heroOverflow: hero.scrollWidth - hero.clientWidth, overlap, fallback: getComputedStyle(logo.querySelector('.hero-logo-fallback')).visibility };
      }, { selector: host, scale });
      check('motif', `${width} at ${Math.round(scale * 100)}% text: quiet logo stays proportional and clear of the real Thai hero content`, detail.logoContained && !detail.overlap && detail.heroOverflow <= 1 && Math.abs(detail.width / detail.height - 2) < 0.01 && Math.abs(detail.rootFontPx - 16 * scale) < .1 && detail.fallback === 'visible', JSON.stringify(detail));
    } catch (e) { check('motif', `${width} at ${Math.round(scale * 100)}% text: hero placement remains usable`, false, e.message); }
    finally { await ctx.close(); }
  }

  // Interrupt a real play, then restore eligibility. An interrupted opening is consumed.
  for (const mode of ['offscreen', 'hidden-document', 'pagehide', 'reduced-motion-change', 'print']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await watch(ctx);
    const page = await ctx.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.locator(host).scrollIntoViewIfNeeded();
      await awaitPhase(page, 'playing');
      if (mode === 'offscreen') await page.locator('#cars').scrollIntoViewIfNeeded();
      if (mode === 'hidden-document') await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      if (mode === 'pagehide') await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
      if (mode === 'reduced-motion-change') await page.emulateMedia({ reducedMotion: 'reduce' });
      if (mode === 'print') { await page.emulateMedia({ media: 'print' }); await page.evaluate(() => dispatchEvent(new Event('beforeprint'))); }
      await awaitPhase(page, 'final');
      if (mode === 'hidden-document') await page.evaluate(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      if (mode === 'pagehide') await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      if (mode === 'reduced-motion-change') await page.emulateMedia({ reducedMotion: 'no-preference' });
      if (mode === 'print') { await page.emulateMedia({ media: 'screen' }); await page.evaluate(() => dispatchEvent(new Event('afterprint'))); }
      await page.locator(host).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const interrupted = await state(page);
      check('motif', `${mode}: interruption settles the complete logo and eligibility restoration does not replay`, interrupted.phase === 'final' && interrupted.fallbackVisible && interrupted.fallbackLoaded && !interrupted.runtimeVisible && interrupted.running === 0 && interrupted.started === 1, JSON.stringify(interrupted));
    } catch (e) { check('motif', `${mode}: interrupted opening settles`, false, e.message); }
    finally { await ctx.close(); }
  }
}

// The workspace budget is tested against the real Thai headings, controls and provider
// credits. The map renderer must follow its container after the compact layout settles.
async function mapLayoutChecks(browser) {
  const matrix = [
    { width: 1440, height: 900, scheme: 'light' },
    { width: 1728, height: 920, scheme: 'dark' },
    { width: 768, height: 1024, scheme: 'light' },
    { width: 390, height: 844, scheme: 'dark' }
  ];
  const geometry = page => page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector), r = el?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null;
    };
    const workspace = rect('#view-map'), card = rect('.map-card'), map = rect('#map'), canvas = rect('#map canvas'), panel = rect('#panel'), notes = rect('.map-notes'), credit = rect('#basemap-attrib'), tools = rect('.map-tools'), legend = rect('#map-legend');
    const visibleCredit = document.querySelector('#basemap-attrib');
    return { workspace, card, map, canvas, panel, notes, credit, tools, legend,
      creditVisible: !!visibleCredit && getComputedStyle(visibleCredit).visibility !== 'hidden' && getComputedStyle(visibleCredit).display !== 'none',
      creditText: visibleCredit?.textContent || '', overflow: document.documentElement.scrollWidth - innerWidth,
      width: innerWidth, height: innerHeight };
  });
  const ready = async page => {
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 45000 });
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    await page.waitForFunction(() => {
      const map = document.getElementById('map'), canvas = map?.querySelector('canvas');
      return canvas && Math.abs(canvas.clientWidth - map.clientWidth) <= 1 && Math.abs(canvas.clientHeight - map.clientHeight) <= 1;
    }, null, { timeout: 5000 });
  };
  const problems = (g, { compact = false } = {}) => {
    const bad = [], desktop = g.width >= 1100;
    const sameSize = g.map && g.canvas && Math.abs(g.map.width - g.canvas.width) <= 1 && Math.abs(g.map.height - g.canvas.height) <= 1;
    if (!sameSize) bad.push('renderer/container size');
    if (g.overflow > 0) bad.push(`horizontal overflow +${g.overflow}`);
    if (!g.map || g.map.height < (desktop && !compact ? .7 * g.workspace.height : 340)) bad.push(`map height ${Math.round(g.map?.height || 0)}`);
    if (desktop && (g.map.bottom > g.height + 1 || g.map.y < 63 || g.panel.bottom > g.height + 1 || g.panel.x < g.map.right - 1)) bad.push('desktop viewport/panel containment');
    if (!desktop && g.panel.y < g.card.bottom - 1) bad.push('stacked panel overlap');
    if (g.notes && g.map && g.notes.y < g.map.bottom - 1) bad.push('notes overlap map');
    if (!g.creditVisible || !g.creditText.trim() || !g.notes || g.credit.x < g.notes.x - 1 || g.credit.right > g.notes.right + 1) bad.push('provider credit visibility/containment');
    if (g.width < 600 && (g.legend.y < g.map.bottom - 1 || g.tools.right > g.map.right + 1 || g.tools.bottom > g.map.bottom + 1)) bad.push('phone legend/tools overlap');
    return bad;
  };
  for (const view of matrix) {
    const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, colorScheme: view.scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage(), bad = [], sizes = [];
    try {
      for (const route of ['demand', 'supply', 'opportunity']) {
        await page.goto(`${BASE}?v=${route}`, { waitUntil: 'networkidle' });
        await ready(page);
        const g = await geometry(page);
        bad.push(...problems(g).map(p => `${route}: ${p}`));
        sizes.push(`${route} ${Math.round(g.map.width)}×${Math.round(g.map.height)} @${Math.round(g.map.y)}`);
      }
      check('layout', `${view.width}×${view.height}: all three map views use the viewport with a matched canvas, readable credits and clear controls`, !bad.length, [...bad, ...sizes].join(' | '));
    } catch (e) { check('layout', `${view.width}×${view.height}: map workspace geometry completed`, false, e.message); }
    finally { await ctx.close(); }
  }

  // Exercise the crowded desktop breakpoint and short laptop with a long building
  // breadcrumb and full satellite attribution, using synthetic tiles rather than imagery.
  const crowdedBad = [], crowdedSizes = [];
  for (const viewport of [{ width: 1366, height: 768 }, { width: 900, height: 900 }]) {
    const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await ctx.route(/^https:\/\/(?:tile\.openstreetmap\.org|wmts\.terrascope\.be)\//, route => route.fulfill({ status: 200, contentType: 'image/png', body: syntheticTile() }));
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}?v=demand&lvl=lao&a=04180102&b=04180102-00001`, { waitUntil: 'networkidle' });
      await ready(page);
      await page.selectOption('#basemap-select', 'satellite');
      await page.waitForFunction(() => document.querySelector('#basemap-attrib')?.textContent.includes('ESA WorldCover'), null, { timeout: 5000 });
      await ready(page);
      const g = await geometry(page);
      crowdedBad.push(...problems(g, { compact: true }).map(p => `${viewport.width}: ${p}`));
      if (!g.creditText.includes('2021') || !g.creditText.includes('10 ม.')) crowdedBad.push(`${viewport.width}: satellite date/resolution missing`);
      crowdedSizes.push(`${viewport.width} ${Math.round(g.map.width)}×${Math.round(g.map.height)} @${Math.round(g.map.y)}`);
    } catch (e) { crowdedBad.push(`${viewport.width}: ${e.message}`); }
    finally { await ctx.close(); }
  }
  check('layout', 'short laptop and 900px breakpoint retain a usable map with long breadcrumbs and full satellite credit', !crowdedBad.length, [...crowdedBad, ...crowdedSizes].join(' | '));
}

async function browserChecks() {
  let pw;
  try { pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'); } catch (e) { check('browser', 'playwright available', false, e.message); return; }
  const { chromium } = pw;
  // Use Playwright's version-matched full Chromium in headless mode; no machine-specific path.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath(), headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  if (args.includes('--layout-only')) { await mapLayoutChecks(browser); await browser.close(); return; }
  const assetContext = await browser.newContext();
  const deliveryBad = [];
  for (const asset of identity.assets) {
    const response = await assetContext.request.get(new URL(asset.path, BASE).href);
    const bytes = await response.body(), mime = (response.headers()['content-type'] || '').split(';')[0];
    const acceptedMime = asset.mime === 'text/javascript' ? ['text/javascript', 'application/javascript'] : [asset.mime];
    if (!response.ok() || bytes.length !== asset.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== asset.sha256 || !acceptedMime.includes(mime)) deliveryBad.push(`${asset.path}: HTTP ${response.status()}, ${mime}, ${bytes.length} bytes`);
  }
  check('identity', 'served identity assets match the reviewed bytes and MIME (first-party only)', !deliveryBad.length, deliveryBad.slice(0, 4).join(' | '));
  const quietDeliveryBad = [];
  for (const [file, hash] of quietAssets) {
    const response = await assetContext.request.get(new URL(file, BASE).href), bytes = await response.body();
    const mime = (response.headers()['content-type'] || '').split(';')[0];
    const expected = file.endsWith('.svg') ? ['image/svg+xml'] : file.endsWith('.css') ? ['text/css'] : ['text/javascript', 'application/javascript'];
    if (!response.ok() || crypto.createHash('sha256').update(bytes).digest('hex') !== hash || !expected.includes(mime)) quietDeliveryBad.push(`${file}: ${response.status()} ${mime}`);
  }
  check('motif', 'served quiet-logo runtime, CSS and fallback retain the exact hashes and MIME', !quietDeliveryBad.length, quietDeliveryBad.join(' | '));
  await assetContext.close();
  await heroLogoChecks(browser);
  if (args.includes('--motif-only')) { await browser.close(); return; }
  await mapLayoutChecks(browser);
  const ROUTES = ['', '?v=demand', '?v=demand&m=tier', '?v=demand&a=180101', '?v=demand&lvl=lao&a=04180102&b=04180102-00001', '?v=supply', '?v=supply&a=180606', '?v=supply&lvl=lao&a=04180102', '?v=demand&lvl=lao&a=04180102&m=tier', '?v=opportunity', '?v=shortlist', '?v=requests', '?v=sources', '?v=unknown&a=zzz&b=1'];
  const MATRIX = [{ scheme: 'light', w: 1440, h: 900 }, { scheme: 'dark', w: 1440, h: 900 }, { scheme: 'light', w: 390, h: 844 }, { scheme: 'dark', w: 768, h: 1024 }];
  for (const m of MATRIX) {
    const ctx = await browser.newContext({ viewport: { width: m.w, height: m.h }, colorScheme: m.scheme });
    const page = await ctx.newPage();
    const errs = []; page.on('console', c => { if (c.type() === 'error') errs.push(c.text()); }); page.on('pageerror', e => errs.push(e.message));
    const tag = `${m.scheme} ${m.w}`;
    const bad = { overflow: [], small: [], ready: [], h1: [] };
    for (const r of ROUTES) {
      await page.goto(BASE + r, { waitUntil: 'networkidle' });
      const ok = await page.waitForFunction(() => document.documentElement.dataset.ready, null, { timeout: 45000 }).then(() => true).catch(() => false);
      if (!ok) { bad.ready.push(r || 'overview'); continue; }
      await page.waitForTimeout(r.includes('b=') ? 2500 : 1200);
      const info = await page.evaluate(() => {
        const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
        const small = [];
        for (const el of document.querySelectorAll('button, select, a.btn, a.chip, .rail a, .flow a, summary, .drill button')) {
          if (!vis(el)) continue; const b = el.getBoundingClientRect(); if (b.width < 43.5 || b.height < 43.5) small.push(`${el.tagName}:${(el.textContent || '').trim().slice(0, 16)} ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
        return { ready: document.documentElement.dataset.ready, overflow: document.documentElement.scrollWidth - innerWidth, small, h1: !!document.querySelector('main .view:not([hidden]) h1') };
      });
      if (info.ready !== 'true') bad.ready.push(`${r || 'overview'}=${info.ready}`);
      if (info.overflow > 0) bad.overflow.push(`${r || 'overview'} +${info.overflow}px`);
      if (info.small.length) bad.small.push(`${r || 'overview'}: ${info.small.slice(0, 3).join('; ')}`);
      if (!info.h1) bad.h1.push(r || 'overview');
      if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, `${LABEL}-${m.scheme}-${m.w}-${(r || 'overview').replace(/[^a-z0-9]+/gi, '_')}.png`) }); }
    }
    check('browser', `${tag}: every route reaches ready=true`, !bad.ready.length, bad.ready.join(', '));
    check('browser', `${tag}: no horizontal overflow`, !bad.overflow.length, bad.overflow.join(', '));
    check('browser', `${tag}: direct targets ≥ 44×44 CSS px`, !bad.small.length, bad.small.join(' | '));
    check('browser', `${tag}: every view has an h1`, !bad.h1.length, bad.h1.join(', '));
    check('browser', `${tag}: no console errors`, !errs.length, errs.slice(0, 4).join(' | '));
    await ctx.close();
  }

  // deeper checks on one desktop context
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(BASE + '?v=demand', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 45000 });
  const lutResult = await page.evaluate(async () => {
    const core = await import(new URL('js/core.js', document.baseURI).href);
    const out = { metrics: 0, problems: [], spans: [] };
    for (const metric of core.METRICS) for (const level of metric.grains) {
      const entries = core.valueEntries(metric, level); const ranks = core.percentileLut(entries); const L = core.lut(metric.family);
      const measured = entries.filter(e => e.state === 'measured' || e.state === 'measured_zero');
      const sorted = measured.map(e => e.value).sort((a, b) => a - b);
      const used = new Set();
      for (const e of entries) {
        const r = ranks.get(e.key);
        if (e.state === 'no_data') { if (r.idx !== null) out.problems.push(`${metric.id}@${level} ${e.key} no_data has a colour`); continue; }
        const lo = sorted.indexOf(e.value), hi = sorted.lastIndexOf(e.value);
        const p = sorted.length > 1 ? ((lo + hi) / 2) / (sorted.length - 1) : 0.5;
        const want = e.state === 'measured_zero' ? 0 : Math.round(40 * p);
        if (r.idx !== want) out.problems.push(`${metric.id}@${level} ${e.key} idx ${r.idx} want ${want}`);
        if (!/^#[0-9A-F]{6}$/.test(L[r.idx])) out.problems.push(`${metric.id} LUT[${r.idx}] invalid`);
        if (e.state === 'measured') used.add(r.idx);
      }
      const max = sorted[sorted.length - 1], uniqueMax = sorted.length > 1 && sorted[sorted.length - 2] !== max;
      out.metrics++; out.spans.push({ id: `${metric.id}@${level}`, lo: Math.min(...used), hi: Math.max(...used), uniqueMax });
    }
    return out;
  });
  check('choropleth', `every metric maps to LUT41 by mid-rank percentile (${lutResult.metrics} metric×grain)`, !lutResult.problems.length, lutResult.problems.slice(0, 5).join(' | '));
  const topMiss = lutResult.spans.filter(s => s.uniqueMax && s.hi !== 40);
  check('choropleth', 'a unique maximum always reaches the top LUT sample (index 40); tied maxima share their mid-rank', !topMiss.length, topMiss.map(s => `${s.id}:${s.lo}–${s.hi}`).join(', '));

  const themeResult = await page.evaluate(async () => {
    const core = await import(new URL('js/core.js', document.baseURI).href);
    const bg = () => getComputedStyle(document.body).backgroundColor;
    const lutLight = core.lut('activity').join();
    const sel = document.querySelector('#theme-select');
    sel.value = 'dark'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const dark = { attr: document.documentElement.dataset.theme, bg: bg(), lut: getComputedStyle(document.documentElement).getPropertyValue('--ldm-scale-activity-dark-lut-40').trim() };
    sel.value = 'light'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const light = { attr: document.documentElement.dataset.theme, bg: bg() };
    sel.value = 'auto'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { dark, light, lutLight40: lutLight.split(',')[40] };
  });
  check('theme', 'Dark switches body to LDS canvas dark (#11191D)', themeResult.dark.attr === 'dark' && themeResult.dark.bg === 'rgb(17, 25, 29)', JSON.stringify(themeResult.dark));
  check('theme', 'Light switches body to LDS canvas light (#F6F7F3)', themeResult.light.attr === 'light' && themeResult.light.bg === 'rgb(246, 247, 243)', JSON.stringify(themeResult.light));
  check('theme', 'analytical LUT HEX identical in both themes', themeResult.dark.lut.toUpperCase() === themeResult.lutLight40, `${themeResult.dark.lut} vs ${themeResult.lutLight40}`);

  // evidence stamps, non-map alternative, permalink and states
  await page.goto(BASE, { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const stamps = await page.$$eval('.kpi', ks => ks.map(k => { const t = k.querySelector('.evidence')?.textContent || ''; return ['ชุดข้อมูล', 'แหล่ง', 'วันที่', 'ขอบเขต'].every(w => t.includes(w)); }));
  check('evidence', 'every overview number carries dataset · source · date · boundary', stamps.length === 6 && stamps.every(Boolean), `${stamps.filter(Boolean).length}/${stamps.length}`);
  const carsInfo = await page.evaluate(() => { const s = document.querySelector('#cars .evidence')?.textContent || ''; return { stamp: ['ชุดข้อมูล', 'แหล่ง', 'วันที่', 'ขอบเขต'].every(w => s.includes(w)), cues: document.querySelectorAll('#cars .cue-legend svg').length, rows: document.querySelectorAll('#cars .stackbars li').length, table: document.querySelectorAll('#cars table')[0]?.querySelectorAll('tbody tr').length, labels: [...document.querySelectorAll('#cars table td')].every(td => td.dataset.label), claims: document.querySelectorAll('#cars .claim').length }; });
  check('evidence', 'new-registration section: four-part stamp, five shape cues, table alternative with labelled cells, labelled claims', carsInfo.stamp && carsInfo.cues === 5 && carsInfo.rows === 7 && carsInfo.table === 7 && carsInfo.labels && carsInfo.claims >= 6, JSON.stringify(carsInfo));
  const motif = await page.evaluate(() => { const f = document.querySelector('.hero-motif[data-asset-id="landometer.logo.quiet"]'); return { count: document.querySelectorAll('.hero-motif[data-asset-id="landometer.logo.quiet"]').length, state: f?.dataset.logoMotion, surface: f?.dataset.hostSurface, mode: f?.dataset.motionMode }; });
  check('motif', 'hero quiet logo uses the declared allowed atmosphere carrier and finite-once owner selection', motif.count === 1 && ['playing', 'final'].includes(motif.state) && motif.surface === 'atmosphere.measure.deep' && motif.mode === 'finite_once', JSON.stringify(motif));
  const firstTab = await page.evaluate(() => { document.activeElement.blur(); return null; }).then(() => page.keyboard.press('Tab')).then(() => page.evaluate(() => ({ cls: document.activeElement.className, outline: getComputedStyle(document.activeElement).outlineStyle, visible: document.activeElement.getBoundingClientRect().height > 0 })));
  check('keyboard', 'first Tab reaches a visible skip link with a focus outline', /skip-link/.test(firstTab.cls) && firstTab.outline !== 'none' && firstTab.visible, JSON.stringify(firstTab));
  await page.click('#cars [data-cars-group="12"]'); await page.waitForTimeout(300);
  const grp = await page.evaluate(() => ({ pressed: document.querySelector('#cars [data-cars-group="12"]')?.getAttribute('aria-pressed'), focus: document.activeElement?.dataset?.carsGroup, title: document.querySelector('#cars .cars-title')?.textContent || '' }));
  check('keyboard', 'vehicle group buttons switch the chart and keep focus on the pressed button', grp.pressed === 'true' && grp.focus === '12' && grp.title.startsWith('จักรยานยนต์'), JSON.stringify(grp));
  await page.click('#cars [data-cars-group="all"]'); await page.waitForTimeout(200);
  const allTxt = await page.evaluate(() => document.querySelector('#cars-body')?.textContent || '');
  await page.click('#cars [data-cars-group="3"]'); await page.waitForTimeout(200);
  const truckTxt = await page.evaluate(() => document.querySelector('#cars-body')?.textContent || '');
  check('evidence', 'no-benchmark notes are true per group (all types: compare by type · trucks: no BEV registered)', allTxt.includes('แยกรายประเภท') && !allTxt.includes('ไม่มีรถไฟฟ้าล้วนประเภทนี้') && truckTxt.includes('ไม่มีรถไฟฟ้าล้วนประเภทนี้'), '');
  await page.click('#cars [data-cars-group="1"]');

  await page.goto(BASE + '?v=demand', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const listCount = await page.$$eval('.area-list button[data-area]', b => b.length);
  check('map', 'non-map alternative lists all 53 tambons', listCount === 53, listCount);
  await page.goto(BASE + '?v=demand&lvl=lao&a=04180102&b=04180102-00001', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true'); await page.waitForTimeout(2000);
  const perm = await page.evaluate(() => ({ card: document.querySelector('#panel')?.textContent.includes('04180102-00001'), crumbs: document.querySelectorAll('#drill button').length, url: location.search }));
  check('map', 'building permalink opens the building card with breadcrumbs', perm.card && perm.crumbs >= 4 && perm.url.includes('b=04180102-00001'), JSON.stringify(perm));
  await page.goto(BASE + '?v=supply&m=sup_projects', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const zero = await page.evaluate(() => ({ legend: !!document.querySelector('#map-legend [data-state="measured_zero"]'), zeroLabel: [...document.querySelectorAll('.area-list .num')].some(n => n.textContent.trim() === '0') }));
  check('states', 'measured zero has its own legend row and is shown as 0 (not blank)', zero.legend && zero.zeroLabel, JSON.stringify(zero));
  await page.goto(BASE + '?v=sources', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const gallery = await page.$$eval('#gallery img', imgs => imgs.length);
  check('supply', 'source photo gallery shows all 64 project photos', gallery === 64, gallery);
  await page.goto(BASE + '?v=requests', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const veh = await page.$$eval('#veh-table td[data-state]', tds => tds.map(td => ({ s: td.dataset.state, v: td.dataset.value, w: td.scrollWidth <= td.clientWidth + 1 })));
  check('states', 'vehicle table cells declare value state and are not clipped', veh.length > 0 && veh.every(c => c.s && c.v !== undefined && c.w), `${veh.length} cells`);
  // ratio metrics aggregate as a ratio, not a sum
  await page.goto(BASE + '?v=demand&m=elec_hh', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const hh = await page.textContent('#map-sub');
  check('evidence', 'per-household electricity shows the province ratio (~152), not a sum', /ทั้งพื้นที่ 15\d kWh/.test(hh) && !hh.includes('รวม'), hh);
  // Yolk eligibility: every queued tambon passes Demand; notes follow the number of active conditions
  const elig = await page.evaluate(async () => {
    const core = await import(new URL('js/core.js', document.baseURI).href);
    const tiers = core.computeTiers(core.DEFAULT_CRITERIA);
    const rows = core.computeQueue(core.DEFAULT_LENSES, tiers);
    const two = core.tierNotes([{ metric: 'elec_total', p: 60, on: true }, { metric: 'fuel_diesel', p: 60, on: true }, { metric: 'veh_total', p: 50, on: false }]);
    return { all: rows.every(r => r.tier), n: rows.length, demand: [...tiers.res.values()].filter(v => v.tier).length, two };
  });
  check('yolk', 'only Demand members enter the opportunity queue', elig.all && elig.n === elig.demand, JSON.stringify({ n: elig.n, demand: elig.demand }));
  check('yolk', 'tier notes follow the active conditions (2 on → 2 tiers)', elig.two[1] && elig.two[2] && !elig.two[3], JSON.stringify(elig.two));
  // Back restores defaults for parameters that the previous URL did not carry
  await page.goto(BASE + '?v=demand', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.selectOption('#metric-select', 'pop'); await page.waitForTimeout(400);
  await page.click('.area-list button[data-area="180101"]'); await page.waitForTimeout(1500);
  await page.goBack(); await page.waitForTimeout(1500);
  const back = await page.evaluate(() => ({ url: location.search, title: document.querySelector('#map-title')?.textContent }));
  check('history', 'Back restores the previous view and its metric', back.url === '?v=demand&m=pop' && back.title === 'ประชากร', JSON.stringify(back));
  // focus stays on the control after the panel re-renders
  await page.goto(BASE + '?v=demand', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.focus('#metric-select'); await page.selectOption('#metric-select', 'fuel_diesel'); await page.waitForTimeout(800);
  const keep = await page.evaluate(() => document.activeElement?.id);
  check('keyboard', 'focus stays on the metric select after the panel re-renders', keep === 'metric-select', keep);
  await page.goto(BASE + '?v=demand&a=180101', { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true'); await page.waitForTimeout(1500);
  const firstB = await page.$('#panel [data-building]');
  if (firstB) { await firstB.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(2000); }
  const bcard = await page.evaluate(() => ({ url: location.search, card: !!document.querySelector('#h-bld') }));
  check('keyboard', 'a building card opens from the non-map building list with the keyboard', !!firstB && bcard.card && /b=\d{8}-\d{5}/.test(bcard.url), JSON.stringify(bcard));

  // Basemap adapters use synthetic responses here, so CI never bulk-requests OSM/ESA imagery.
  let providerFailure = false, providerRequests = 0;
  const tile = syntheticTile();
  await page.route(/^https:\/\/(?:tile\.openstreetmap\.org|wmts\.terrascope\.be)\//, async route => {
    providerRequests++;
    if (providerFailure) return route.abort('failed');
    return route.fulfill({ status: 200, contentType: 'image/png', body: tile });
  });
  await page.goto(BASE + '?v=demand&m=pop', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.waitForTimeout(1200);
  async function mapSnapshot() {
    return page.evaluate(async () => {
      const core = await import(new URL('js/core.js', document.baseURI).href), mapModule = await import(new URL('js/map.js', document.baseURI).href), m = await mapModule.mapReady();
      const tiers = core.computeTiers(core.S.criteria);
      if (!window.__chainatQaMap) window.__chainatQaMap = m;
      const raster = m.getStyle().layers.filter(layer => /^context-(roads|satellite)-/.test(layer.id)).map(layer => layer.id), roads = raster.find(id => id.startsWith('context-roads-'));
      return { sameMap: window.__chainatQaMap === m, camera: [m.getCenter().lng, m.getCenter().lat, m.getZoom(), m.getPitch(), m.getBearing()], state: JSON.stringify(core.S), url: location.search, tiers: JSON.stringify([...tiers.res].map(([id, row]) => [id, row.tier])), fills: JSON.stringify(m.getStyle().sources.units.data.features.map(f => [f.properties.code, f.properties.fill])), paint: JSON.stringify(m.getPaintProperty('units-fill', 'fill-color')), visibility: m.getLayoutProperty('units-fill', 'visibility'), raster, roadBrightness: roads ? m.getPaintProperty(roads, 'raster-brightness-max') : null, themeChoice: core.getThemeChoice(), themeAttribute: document.documentElement.dataset.theme || null, mediaDark: matchMedia('(prefers-color-scheme: dark)').matches, effectiveTheme: core.effectiveTheme(), list: document.querySelectorAll('.area-list button[data-area]').length, status: document.querySelector('#basemap-status').textContent };
    });
  }
  const beforeDisplay = await mapSnapshot(), basemapProblems = [];
  check('basemap', 'analysis is the default and makes no provider tile requests', !beforeDisplay.raster.length && providerRequests === 0 && await page.inputValue('#basemap-select') === 'analysis', `${providerRequests} synthetic requests`);
  for (const mode of ['simplified', 'detailed', 'satellite', 'analysis']) {
    await page.selectOption('#basemap-select', mode); await page.waitForTimeout(350);
    const after = await mapSnapshot();
    for (const field of ['camera', 'state', 'url', 'tiers', 'fills', 'paint']) if (JSON.stringify(after[field]) !== JSON.stringify(beforeDisplay[field])) basemapProblems.push(`${mode}: ${field} changed`);
    if (!after.sameMap || after.raster.length !== (mode === 'analysis' ? 0 : mode === 'satellite' ? 2 : 1)) basemapProblems.push(`${mode}: instance/raster sources`);
  }
  check('basemap', 'all four styles preserve the map, camera, criteria, URL, membership and exact analytical paints', !basemapProblems.length, basemapProblems.join(' | '));
  await page.selectOption('#basemap-select', 'detailed');
  const staleProvider = (await mapSnapshot()).raster[0];
  await page.selectOption('#basemap-select', 'simplified');
  await page.evaluate(async sourceId => { const module = await import(new URL('js/map.js', document.baseURI).href); const m = await module.mapReady(); m.fire('error', { sourceId, error: new Error('Synthetic stale provider failure') }); }, staleProvider);
  const freshProvider = await mapSnapshot();
  check('basemap', 'late errors from a removed provider generation cannot replace the current style', freshProvider.raster.length === 1 && !freshProvider.raster.includes(staleProvider) && !freshProvider.status.includes('ไม่สำเร็จ') && await page.isHidden('#basemap-retry'));
  await page.uncheck('#map-area-colours');
  const hidden = await mapSnapshot();
  await page.check('#map-area-colours');
  const shown = await mapSnapshot();
  check('basemap', 'colour toggle changes visibility only, restoring identical data HEX and list access', hidden.visibility === 'none' && shown.visibility === 'visible' && hidden.fills === beforeDisplay.fills && shown.fills === beforeDisplay.fills && shown.paint === beforeDisplay.paint && hidden.list === 53 && shown.list === 53);
  await page.evaluate(() => { const s = document.getElementById('theme-select'); s.value = 'dark'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(300);
  const darkDisplay = await mapSnapshot();
  check('basemap', 'theme changes retain exact analytical source colors and Demand members', darkDisplay.fills === beforeDisplay.fills && darkDisplay.tiers === beforeDisplay.tiers && darkDisplay.state === beforeDisplay.state);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => { const s = document.getElementById('theme-select'); s.value = 'auto'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  // Playwright's poller requires a synchronous Boolean: an async predicate is a truthy Promise.
  const waitForAuto = expected => page.waitForFunction(expectedState => {
    const m = window.__chainatQaMap;
    const roads = m.getStyle().layers.find(layer => layer.id.startsWith('context-roads-'));
    return !document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches === expectedState.dark && !!roads && m.getPaintProperty(roads.id, 'raster-brightness-max') === expectedState.brightness;
  }, expected, { timeout: 5000 }).then(() => true).catch(() => false);
  const autoDarkSettled = await waitForAuto({ dark: true, brightness: .72 });
  const autoDark = await mapSnapshot();
  await page.emulateMedia({ colorScheme: 'light' });
  const autoLightSettled = await waitForAuto({ dark: false, brightness: 1 });
  const autoLight = await mapSnapshot();
  const autoDetail = snapshot => ({ choice: snapshot.themeChoice, attr: snapshot.themeAttribute, mediaDark: snapshot.mediaDark, effective: snapshot.effectiveTheme, roadBrightness: snapshot.roadBrightness });
  check('basemap', 'Auto follows OS appearance for provider styling while exact analytical colors stay fixed', autoDarkSettled && autoLightSettled && autoDark.roadBrightness === .72 && autoLight.roadBrightness === 1 && autoDark.fills === autoLight.fills && autoLight.tiers === beforeDisplay.tiers, JSON.stringify({ darkSettled: autoDarkSettled, lightSettled: autoLightSettled, dark: autoDetail(autoDark), light: autoDetail(autoLight), fillsUnchanged: autoDark.fills === autoLight.fills, tiersUnchanged: autoLight.tiers === beforeDisplay.tiers }));
  providerFailure = true;
  await page.selectOption('#basemap-select', 'detailed');
  await page.waitForFunction(() => !document.getElementById('basemap-retry').hidden, null, { timeout: 15000 });
  const fallback = await mapSnapshot();
  check('basemap', 'provider failure keeps the same analytical map/list and exposes retry', fallback.sameMap && !fallback.raster.length && fallback.list === 53 && fallback.fills === beforeDisplay.fills && fallback.status.includes('ใช้พื้นวิเคราะห์ชั่วคราว'));
  providerFailure = false;
  await page.click('#basemap-retry'); await page.waitForTimeout(500);
  const retried = await mapSnapshot();
  check('basemap', 'manual retry restores the selected provider with camera, criteria and data intact', retried.raster.length === 1 && retried.sameMap && JSON.stringify(retried.camera) === JSON.stringify(beforeDisplay.camera) && retried.state === beforeDisplay.state && retried.fills === beforeDisplay.fills && await page.isHidden('#basemap-retry'));
  await ctx.close();
  await browser.close();
}

if (!args.includes('--static-only')) await browserChecks();
check('release', 'runtime and QA source bytes remain unchanged throughout this verification run', sourceFiles.every(file => sourceFingerprint.files[file] && exists(file) && sha(file) === sourceFingerprint.files[file]));
const failed = results.filter(r => !r.ok);
const summary = { label: LABEL, base: BASE, ranAt: new Date().toISOString(), sourceFingerprint, passed: results.length - failed.length, failed: failed.length, results };
const out = opt('--write'); if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(path.resolve(out), JSON.stringify(summary, null, 2) + '\n'); }
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.group}] ${r.name}${r.ok || !r.detail ? '' : `  — ${r.detail}`}`);
console.log(`\n${summary.passed} passed · ${summary.failed} failed · ${LABEL} ${BASE}`);
process.exit(failed.length ? 1 : 0);
