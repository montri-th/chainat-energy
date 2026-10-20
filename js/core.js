/* CityMETER: Yolk · โหมดสำนักงานพลังงานจังหวัด — shared state, data, colour and rules.
   No network writes, no authentication. Every number carries dataset · source · date · boundary. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf0 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 });
export const n0 = v => v == null || Number.isNaN(v) ? '—' : nf0.format(v);
export const n1 = v => v == null || Number.isNaN(v) ? '—' : nf1.format(v);
export function big(v, unit = '') {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e6) return `${nf1.format(v / 1e6)} ล้าน${unit ? ' ' + unit : ''}`;
  return `${nf0.format(v)}${unit ? ' ' + unit : ''}`;
}
export const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* ---------- data ---------- */
export const D = { meta: null, areas: null, supply: null, plan: null, vehicles: null, cars: null, geo: {}, bindex: null, buildings: new Map() };
/* data files change with each release: the release id in the query keeps returning viewers on the current data */
export const DATA_RELEASE = 'cnt-energy-2026-10-20-r3';
async function getJSON(url) {
  const r = await fetch(`${url}?r=${DATA_RELEASE}`);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}
export async function loadCore() {
  const [meta, areas, supply, plan, vehicles, cars] = await Promise.all(['data/meta.json', 'data/areas.json', 'data/supply.json', 'data/plan.json', 'data/vehicles.json', 'data/cars.json'].map(getJSON));
  Object.assign(D, { meta, areas, supply, plan, vehicles, cars });
  D.tambonBy = new Map(areas.tambon.map(t => [t.code, t]));
  D.laoBy = new Map(areas.lao.map(t => [t.code, t]));
  D.districtBy = new Map(areas.district.map(t => [t.code, t]));
  return D;
}
export async function loadGeo() {
  if (D.geo.tambon) return D.geo;
  const [province, district, tambon, lao, bindex] = await Promise.all(['data/geo/province.geojson', 'data/geo/district.geojson', 'data/geo/tambon.geojson', 'data/geo/lao.geojson', 'data/buildings/index.json'].map(getJSON));
  Object.assign(D.geo, { province, district, tambon, lao });
  D.bindex = bindex;
  return D.geo;
}
export async function loadBuildings(laoCode) {
  if (D.buildings.has(laoCode)) return D.buildings.get(laoCode);
  const raw = await getJSON(`data/buildings/${laoCode}.json`);
  const [ox, oy] = raw.o; const tcodes = D.bindex.tambons;
  const list = raw.b.map((r, i) => {
    const [t, a, h10, f, k, e] = r; const pts = [];
    let x = r[6], y = r[7]; pts.push([ox + x * 1e-6, oy + y * 1e-6]);
    for (let j = 8; j < r.length; j += 2) { x += r[j]; y += r[j + 1]; pts.push([ox + x * 1e-6, oy + y * 1e-6]); }
    pts.push(pts[0]);
    return { id: `${laoCode}-${String(i + 1).padStart(5, '0')}`, lao: laoCode, tambon: tcodes[t], area: a, height: h10 / 10, floors: f, cat: k, kwh: e, ring: pts };
  });
  D.buildings.set(laoCode, list);
  return list;
}

/* ---------- colour: exact LDS LUTs (identical HEX in light and dark, DATAVIZ-03) ---------- */
const lutCache = new Map();
export function lut(family) {
  if (lutCache.has(family)) return lutCache.get(family);
  const cs = getComputedStyle(document.documentElement);
  const out = Array.from({ length: 41 }, (_, i) => cs.getPropertyValue(`--ldm-scale-${family}-light-lut-${String(i).padStart(2, '0')}`).trim().toUpperCase());
  if (out.some(v => !/^#[0-9A-F]{6}$/.test(v))) throw new Error(`LUT ${family} missing`);
  lutCache.set(family, out);
  return out;
}
export function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
/* Owner rule (18 ต.ค. 2569): every choropleth uses the 41-sample LUT mapped by percentile rank.
   p = (average rank − 1) / (n − 1); index = round(40 · p). Measured zero keeps index 0 and gets the zero outline.
   Exceptional states (no_data, out_of_scope, suppressed, not_yet) get no analytical colour. */
export function percentileLut(entries) {
  const measured = entries.filter(e => e.state === 'measured' || e.state === 'measured_zero');
  const sorted = [...measured].sort((a, b) => a.value - b.value);
  const ranks = new Map();
  for (let i = 0; i < sorted.length;) {
    let j = i; while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks.set(sorted[k].key, avg);
    i = j + 1;
  }
  const n = sorted.length; const out = new Map();
  for (const e of entries) {
    if (e.state !== 'measured' && e.state !== 'measured_zero') { out.set(e.key, { state: e.state, idx: null, p: null }); continue; }
    const p = n > 1 ? (ranks.get(e.key) - 1) / (n - 1) : 0.5;
    const idx = e.state === 'measured_zero' ? 0 : Math.round(40 * p);
    out.set(e.key, { state: e.state, idx, p });
  }
  return out;
}
export function quantileValue(values, p) {
  const v = values.filter(x => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

/* ---------- metrics (tambon grain unless noted) ---------- */
const sum = o => Object.values(o).reduce((a, b) => a + (b || 0), 0);
const biz = u => (u.elec.small || 0) + (u.elec.medium || 0) + (u.elec.large || 0) + (u.elec.specific || 0);
const PLAN = 'แผนปฏิบัติราชการด้านพลังงาน จ.ชัยนาท 2566–2570';
export const METRICS = [
  { id: 'elec_total', group: 'demand', label: 'ไฟฟ้าทุกประเภทผู้ใช้', unit: 'kWh ต่อปี', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: u => sum(u.elec), source: `ยอดจังหวัด 2566 จาก${PLAN} หน้า 25 กระจายตามอาคาร CityMETER` },
  { id: 'elec_res', group: 'demand', label: 'ไฟฟ้า บ้านอยู่อาศัย', unit: 'kWh ต่อปี', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: u => u.elec.residential, source: `ยอดจังหวัด 2566 จาก${PLAN} หน้า 25` },
  { id: 'elec_biz', group: 'demand', label: 'ไฟฟ้า กิจการทุกขนาด', unit: 'kWh ต่อปี', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: biz, source: `ยอดจังหวัด 2566 จาก${PLAN} หน้า 25` },
  { id: 'elec_agri', group: 'demand', label: 'ไฟฟ้า สูบน้ำเพื่อการเกษตร', unit: 'kWh ต่อปี', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: u => u.elec.agri, source: `ยอดจังหวัด 2566 จาก${PLAN} หน้า 25 กระจายตามพื้นที่ที่ไม่ใช่อาคาร` },
  { id: 'elec_hh', group: 'demand', label: 'ไฟฟ้าบ้านต่อครัวเรือน', unit: 'kWh ต่อครัวเรือนต่อเดือน', family: 'density-household', measure: 'modelled', grains: ['tambon', 'lao'], get: u => u.households ? u.elec.residential / u.households / 12 : null, ratio: { num: u => u.elec.residential / 12, den: u => u.households }, source: `ครัวเรือน 126,673 จาก${PLAN} หน้า 29 กระจายตามประชากร CityMETER` },
  { id: 'fuel_diesel', group: 'demand', label: 'น้ำมันดีเซล', unit: 'ลิตรต่อเดือน', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: u => u.fuel.diesel / 12, source: `พลังงานขั้นสุดท้าย 2566 จาก${PLAN} หน้า 7` },
  { id: 'fuel_gasohol', group: 'demand', label: 'แก๊สโซฮอล์ 95 และ 91', unit: 'ลิตรต่อเดือน', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: u => (u.fuel.g95 + u.fuel.g91) / 12, source: `พลังงานขั้นสุดท้าย 2566 จาก${PLAN} หน้า 7` },
  { id: 'lpg', group: 'demand', label: 'LPG ภาคครัวเรือน', unit: 'กก. ต่อเดือน', family: 'activity', measure: 'modelled', grains: ['tambon', 'lao'], get: u => u.fuel.lpgKg / 12, source: `ปี 2564 จาก${PLAN}` },
  { id: 'veh_total', group: 'demand', label: 'รถจดทะเบียนสะสม', unit: 'คัน', family: 'count', measure: 'modelled', grains: ['tambon', 'lao'], get: u => sum(u.vehicles), source: 'ยอดจังหวัดจากกรมการขนส่งทางบก ณ 28 ก.พ. 2569 กระจายตามประชากร' },
  { id: 'veh_ev', group: 'demand', label: 'รถไฟฟ้าและไฮบริด', unit: 'คัน', family: 'count', measure: 'modelled', grains: ['tambon', 'lao'], get: u => (u.vehicles.bev || 0) + (u.vehicles.hybrid || 0), source: 'ยอดจังหวัดจากกรมการขนส่งทางบก ณ 28 ก.พ. 2569 กระจายตามประชากร' },
  { id: 'pop', group: 'demand', label: 'ประชากร', unit: 'คน', family: 'count', measure: 'proxy', grains: ['tambon', 'lao'], get: u => u.pop, source: 'CityMETER building info V4 อ่าน 18 ต.ค. 2569 (endpoint ไม่ระบุรุ่นของชั้นประชากร)' },
  { id: 'buildings', group: 'demand', label: 'อาคาร', unit: 'หลัง', family: 'count', measure: 'observed', grains: ['tambon', 'lao'], get: u => u.buildings, source: 'CityMETER อาคาร V4 อ่าน 18 ต.ค. 2569' },
  { id: 'sup_fuel', group: 'supply', label: 'กิจการน้ำมันเชื้อเพลิงในทะเบียน', unit: 'ราย', family: 'count', measure: 'observed', grains: ['tambon'], get: u => u.supply.fuel, source: 'ไฟล์ผู้ประกอบการน้ำมันเชื้อเพลิงของ สพจ.ชัยนาท' },
  { id: 'sup_fuel_small', group: 'supply', label: 'ประเภท ค และตู้หยอดเหรียญ', unit: 'ราย', family: 'count', measure: 'observed', grains: ['tambon'], get: u => u.supply.fuel_c1 + u.supply.fuel_c2 + u.supply.fuel_d, source: 'ไฟล์ผู้ประกอบการน้ำมันเชื้อเพลิงของ สพจ.ชัยนาท' },
  { id: 'sup_projects', group: 'supply', label: 'โครงการพลังงานทดแทน', unit: 'รายการ', family: 'count', measure: 'observed', grains: ['tambon'], get: u => u.supply.projects, source: 'ไฟล์โครงการพลังงานในพื้นที่ของ สพจ.ชัยนาท' },
  { id: 'sup_solar_kw', group: 'supply', label: 'สูบน้ำโซลาร์ กำลังติดตั้งรวม', unit: 'กิโลวัตต์', family: 'count', measure: 'observed', grains: ['tambon'], get: u => u.supply.solarPumpKw, source: 'ไฟล์โครงการพลังงานในพื้นที่ของ สพจ.ชัยนาท ขนาดต่อระบบ × จำนวนระบบในช่องเทคโนโลยี' },
  { id: 'sup_controlled', group: 'supply', label: 'อาคารและโรงงานควบคุม', unit: 'แห่ง', family: 'count', measure: 'observed', grains: ['tambon'], get: u => u.supply.controlled, source: 'ไฟล์โรงงานและอาคารควบคุมของ สพจ.ชัยนาท' }
];
export const metricBy = id => METRICS.find(m => m.id === id) || METRICS[0];
export const MEASURE_TH = { modelled: 'แบบจำลอง', observed: 'ข้อมูลจากแหล่ง', proxy: 'ค่าตัวแทน', reported: 'ตามที่รายงาน' };
export function unitsFor(level) { return level === 'lao' ? D.areas.lao : D.areas.tambon; }
export function valueEntries(metric, level) {
  return unitsFor(level).map(u => {
    const v = metric.grains.includes(level) ? metric.get(u) : null;
    const state = v == null ? 'no_data' : (v === 0 ? 'measured_zero' : 'measured');
    return { key: u.code, value: v, state };
  });
}
export function stamp({ dataset, source, date, boundary, measure }) {
  return `<p class="evidence"><b>ชุดข้อมูล</b> ${esc(dataset)} · <b>แหล่ง</b> ${esc(source)} · <b>วันที่</b> ${esc(date)} · <b>ขอบเขต</b> ${esc(boundary)}${measure ? ` · <b>ชนิดค่า</b> ${esc(MEASURE_TH[measure] || measure)}` : ''}</p>`;
}

/* ---------- Demand criteria (Yolk: ≤3 conditions, tiers 1–3) ---------- */
export const THRESHOLDS = [40, 50, 60, 70, 80];
export const DEFAULT_CRITERIA = [
  { metric: 'elec_total', p: 60, on: true },
  { metric: 'fuel_diesel', p: 60, on: true },
  { metric: 'veh_total', p: 50, on: true }
];
export const TIER_TH = { 1: 'ไข่แดงเข้ม', 2: 'ไข่แดง', 3: 'ไข่ขาว' };
/* tier = conditions missed + 1, so the note depends on how many conditions are switched on */
export function tierNotes(criteria) {
  const n = criteria.filter(c => c.on).length;
  const out = {};
  for (const t of [1, 2, 3]) { const k = n - t + 1; if (k >= 1) out[t] = k === n ? (n === 1 ? 'ผ่านเงื่อนไขที่ใช้' : `ผ่านครบ ${n} เงื่อนไข`) : `ผ่าน ${k} จาก ${n} เงื่อนไข`; }
  return out;
}
export const TIER_NOTE = tierNotes(DEFAULT_CRITERIA);
export function criteriaRev(criteria) {
  const on = criteria.filter(c => c.on);
  const s = on.map(c => `${c.metric}>=P${c.p}`).join('|');
  let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const label = on.map(c => `${metricBy(c.metric).label} ≥ P${c.p}`).join(' · ');
  const rev = h.toString(16).padStart(8, '0').slice(0, 6);
  const isDefault = criteria === DEFAULT_CRITERIA || s === DEFAULT_CRITERIA.filter(c => c.on).map(c => `${c.metric}>=P${c.p}`).join('|');
  return { text: s, rev, label, name: isDefault ? 'ค่าเริ่มต้นของเดโม' : `ปรับเอง รหัส ${rev}` };
}
export function computeTiers(criteria) {
  const units = D.areas.tambon; const active = criteria.filter(c => c.on);
  const cuts = active.map(c => { const m = metricBy(c.metric); return { c, m, cut: quantileValue(units.map(m.get), c.p / 100) }; });
  const res = new Map();
  for (const u of units) {
    const passed = cuts.filter(x => { const v = x.m.get(u); return v != null && v >= x.cut && v > 0; });
    const k = passed.length; const need = active.length;
    let tier = null;
    if (need && k > 0) tier = need === 3 ? 4 - k : (need === 2 ? (k === 2 ? 1 : 2) : 1);
    res.set(u.code, { tier, passed: passed.map(x => x.c.metric), cuts });
  }
  return { res, cuts };
}
export function rankP(metric, u) {
  const vals = D.areas.tambon.map(metric.get).filter(v => v != null).sort((a, b) => a - b);
  const v = metric.get(u); if (v == null || !vals.length) return null;
  let lo = 0; while (lo < vals.length && vals[lo] < v) lo++;
  let hi = lo; while (hi + 1 < vals.length && vals[hi + 1] === v) hi++;
  return vals.length > 1 ? ((lo + hi) / 2) / (vals.length - 1) : 0.5;
}

/* ---------- CityMETER: Cars — registrations per month by vehicle type and engine (province level only) ---------- */
/* Stable categorical IDs (DATAVIZ-05): each engine keeps its landometer-series-10-v8 slot and shape cue everywhere. */
export const ENGINE_SERIES = { DIESEL: { slot: '01', cue: 'circle' }, GASOLINE: { slot: '02', cue: 'square' }, 'GASOLINE-HYBRID': { slot: '03', cue: 'triangle' }, 'GASOLINE-PHEV': { slot: '04', cue: 'diamond' }, ELECTRIC: { slot: '05', cue: 'cross' } };
export function ymTh(ym) { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y + 543}`; }
export function isoTh(iso) { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y + 543}`; }
export function carsTypes(groupId) { const g = D.cars?.groups.find(x => x.id === groupId); return g ? g.types : []; }
export function carsYearly(groupId) {
  const c = D.cars; if (!c) return [];
  const types = carsTypes(groupId); const years = new Map();
  c.months.forEach((ym, i) => {
    const y = +ym.slice(0, 4);
    if (!years.has(y)) years.set(y, { year: y, months: 0, counts: Object.fromEntries(c.engines.map(e => [e, 0])), first: ym, last: ym });
    const row = years.get(y); row.months++; row.last = ym;
    for (const t of types) c.monthly[t]?.[i].forEach((v, k) => { row.counts[c.engines[k]] += v; });
  });
  return [...years.values()].map(r => { const total = Object.values(r.counts).reduce((a, b) => a + b, 0); return { ...r, total, evShare: total ? r.counts.ELECTRIC / total : null }; });
}
export function carsWindow(groupId) {
  const c = D.cars; if (!c) return null;
  const types = carsTypes(groupId); const from = c.months.indexOf(c.window12m[0]), to = c.months.indexOf(c.window12m[1]);
  const counts = Object.fromEntries(c.engines.map(e => [e, 0]));
  for (let i = from; i <= to; i++) for (const t of types) c.monthly[t]?.[i].forEach((v, k) => { counts[c.engines[k]] += v; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total, evShare: total ? counts.ELECTRIC / total : null };
}
export function carsEvContext() {
  const c = D.cars; if (!c) return 'ข้อมูลรถจดทะเบียนรายเดือนยังโหลดไม่ได้';
  const car = carsWindow('1'), moto = carsWindow('12');
  return `ทั้งจังหวัดชัยนาท ${ymTh(c.window12m[0])}–${ymTh(c.window12m[1])}: รถยนต์นั่ง (รย.1) ไฟฟ้าล้วนจดทะเบียนใหม่ ${n0(car.counts.ELECTRIC)} คัน เท่ากับ ${n1(car.evShare * 100)}% ของรถยนต์นั่งที่จดทะเบียนใหม่ ${n0(car.total)} คัน · จักรยานยนต์ (รย.12) ไฟฟ้าล้วน ${n0(moto.counts.ELECTRIC)} คัน เท่ากับ ${n1(moto.evShare * 100)}% ของ ${n0(moto.total)} คัน (CityMETER: Cars ระดับจังหวัด ไม่ใช่ค่าของตำบลนี้)`;
}

/* ---------- government rooftop solar notified to the ERC (office file received 20 Oct 2569) ----------
   The file has no address, tambon or coordinates. An item belongs to a district only when the agency
   name says so (an inference recorded per item); two names say only the province. Never map or sum by tambon. */
export function govSolarIn(districtCode) {
  const g = D.supply?.govSolar; if (!g) return null;
  const list = districtCode ? g.items.filter(x => x.area.districtCode === districtCode) : g.items;
  return { list, kva: list.reduce((a, x) => a + x.kva, 0), unplaced: g.items.filter(x => !x.area.districtCode).length, asOf: isoTh(g.source.dataAsOf) };
}
export function govSolarCheck(u) {
  const r = govSolarIn(u.districtCode);
  if (!r) return 'รายชื่อโซลาร์รูฟท็อปของหน่วยงานรัฐ (ยังโหลดไม่ได้)';
  const g = D.supply.govSolar;
  const head = `เทียบกับ${g.dataset} (ไฟล์ของ สพจ.ชัยนาท ระบุสำนักงาน กกพ. ${g.source.ercOffice} · ข้อมูลจากแหล่ง · อำเภอเป็นข้อสรุปจากชื่อหน่วยงาน)`;
  const tail = `ไฟล์ไม่ระบุตำบล · ชื่อไม่บอกอำเภออีก ${n0(r.unplaced)} แห่ง · ข้อมูล ณ ${r.asOf}`;
  if (!r.list.length) return `${head}: ไม่มีชื่อที่ระบุ อ.${u.district} (${tail})`;
  return `${head}: ชื่อระบุ อ.${u.district} ${n0(r.list.length)} แห่ง รวม ${n1(r.kva)} kVA คือ ${r.list.map(x => x.name).join(' · ')} (${tail})`;
}
/* release stamp: the data release id and date, plus the date of the demand model, which r3 did not change */
export function releaseLabel() { const r = D.meta.release; return `รุ่นข้อมูล ${r.label || r.id} ออก ${r.dateThai}`; }

/* ---------- Opportunity lenses aligned with the plan 2566–2570 and the office mandate ---------- */
const P = (id, u) => rankP(metricBy(id), u) ?? 0;
const pct = p => `เปอร์เซ็นไทล์ที่ ${Math.round(p * 100)} เมื่อเทียบ 53 ตำบล`;
const BIOMASS_DISTRICTS = ['วัดสิงห์', 'เนินขาม'];
export const LENSES = [
  { id: 'rooftop', short: 'โซลาร์รูฟท็อปกิจการ', plan: 'แผนงานที่ 1', mandate: [4], title: 'โซลาร์รูฟท็อปสำหรับกิจการ',
    rule: 'ชวนสำรวจเมื่อไฟฟ้ากิจการ ≥ P70 และหลังคาอาคารตั้งแต่ 300 ตร.ม. ≥ P60 · ต้องเพิ่มหลักฐานเมื่อผ่านเฉพาะไฟฟ้ากิจการ',
    eval(u) {
      const pb = P('elec_biz', u), roofP = rankP({ get: x => x.roofLarge }, u) ?? 0;
      const reason = `ไฟฟ้ากิจการแบบจำลอง ${big(biz(u), 'kWh/ปี')} (${pct(pb)}) · หลังคาอาคารตั้งแต่ 300 ตร.ม. รวม ${n0(u.roofLarge)} ตร.ม.`;
      const gs = D.supply?.govSolar;
      const checks = ['รายชื่อผู้ใช้ไฟประเภทกิจการและการใช้ไฟจริงจาก กฟภ.', `ผู้ติดตั้งโซลาร์รูฟท็อปรายพื้นที่ (แผนระบุยอดจังหวัด 113 แห่ง${gs ? ` ซึ่งอาจนับคนละกลุ่มและคนละช่วงเวลากับรายชื่อที่ได้รับ จึงไม่นำมาเทียบ · รายชื่อที่ได้รับมีเฉพาะหน่วยงานรัฐ ${n0(gs.items.length)} แห่ง ข้อมูล ณ ${isoTh(gs.source.dataAsOf)} ยังไม่มีรายชื่อกิจการ` : ''})`];
      if (pb >= 0.7 && roofP >= 0.6) return { status: 'candidate', reason, checks, task: 'ขอรายชื่อผู้ใช้ไฟกิจการในตำบลจาก กฟภ. แล้วนัดสำรวจหลังคา 5 แห่งแรก', sort: pb };
      if (pb >= 0.7) return { status: 'evidence', reason, checks: ['ข้อมูลหลังคาและโครงสร้างอาคาร', ...checks], task: 'สำรวจหลังคาอาคารกิจการที่ใช้ไฟสูง', sort: pb };
      return { status: 'none', reason, checks, task: null, sort: pb };
    } },
  { id: 'pump', short: 'สูบน้ำโซลาร์เกษตร', plan: 'แผนงานที่ 1', mandate: [4], title: 'ระบบสูบน้ำพลังงานแสงอาทิตย์เพื่อการเกษตร',
    rule: 'ชวนสำรวจเมื่อไฟฟ้าสูบน้ำเกษตร ≥ P60 และมีระบบชำรุดหรือยังไม่มีระบบในไฟล์ · ต้องเพิ่มหลักฐานเมื่อ ≥ P60 และมีระบบใช้งานอยู่',
    eval(u) {
      const pa = P('elec_agri', u), s = u.supply;
      const reason = `ไฟฟ้าสูบน้ำเกษตรแบบจำลอง ${big(u.elec.agri, 'kWh/ปี')} (${pct(pa)}) · ระบบสูบน้ำโซลาร์ในไฟล์ ${n0(s.solarPump)} ระบบ${s.projectsBroken ? ` · ชำรุด ${n0(s.projectsBroken)} รายการ` : ''}`;
      const checks = ['สถานะการใช้งานปัจจุบันของระบบเดิม', 'กลุ่มผู้ใช้น้ำและแหล่งน้ำในพื้นที่'];
      if (pa >= 0.6 && s.projectsBroken > 0) return { status: 'candidate', reason, checks, task: `ตรวจและซ่อมระบบที่ชำรุด ${n0(s.projectsBroken)} รายการ`, sort: pa + 0.01 };
      if (pa >= 0.6 && s.solarPump === 0) return { status: 'candidate', reason, checks, task: 'สำรวจกลุ่มผู้ใช้น้ำที่ยังใช้ไฟฟ้าหรือดีเซลสูบน้ำ', sort: pa };
      if (pa >= 0.6) return { status: 'evidence', reason, checks, task: 'ยืนยันว่าระบบเดิมครอบคลุมกลุ่มผู้ใช้น้ำแล้ว', sort: pa };
      return { status: 'none', reason, checks, task: null, sort: pa };
    } },
  { id: 'biomass', short: 'ชีวมวลและก๊าซชีวภาพ', plan: 'แผนงานที่ 1', mandate: [4], title: 'ชีวมวลและก๊าซชีวภาพจากภาคเกษตร',
    rule: 'ชวนสำรวจเมื่อพื้นที่นอกอาคาร ≥ P60 มีอาคารหรือโรงงานควบคุมในไฟล์ และอำเภอยังไม่มีโรงไฟฟ้าชีวมวลตามแผน · ต้องเพิ่มหลักฐานเมื่อผ่านเฉพาะพื้นที่นอกอาคาร',
    eval(u) {
      const pl = rankP({ get: x => x.areaKm2 * 1e6 - x.footprint }, u) ?? 0, s = u.supply;
      const hasPlant = BIOMASS_DISTRICTS.includes(u.district);
      const reason = `พื้นที่นอกอาคาร ${n1((u.areaKm2 * 1e6 - u.footprint) / 1e6)} ตร.กม. (${pct(pl)}) · อาคารหรือโรงงานควบคุมในไฟล์ ${n0(s.controlled)} แห่ง${hasPlant ? ` · อ.${u.district} มีโรงไฟฟ้าชีวมวลตามแผนแล้ว` : ''}`;
      const checks = ['ปริมาณวัสดุเหลือใช้ทางการเกษตรรายตำบล', 'ความสนใจของโรงสีหรือกลุ่มเกษตรกร'];
      if (pl >= 0.6 && s.controlled > 0 && !hasPlant) return { status: 'candidate', reason, checks, task: 'นัดหารือโรงสีหรือโรงงานในตำบลเรื่องเชื้อเพลิงชีวมวล', sort: pl };
      if (pl >= 0.6) return { status: 'evidence', reason, checks, task: 'เก็บข้อมูลวัสดุเหลือใช้และผู้รับซื้อในพื้นที่', sort: pl };
      return { status: 'none', reason, checks, task: null, sort: pl };
    } },
  { id: 'safety', short: 'ตรวจความปลอดภัยน้ำมัน', plan: 'แผนงานที่ 2', mandate: [2, 3], title: 'ตรวจความปลอดภัยสถานประกอบการน้ำมัน',
    rule: 'ชวนสำรวจเมื่อจำนวนกิจการน้ำมัน หรือประเภท ค และตู้หยอดเหรียญ ≥ P60 · ต้องเพิ่มหลักฐานเมื่อมีกิจการแต่ต่ำกว่านั้น · ยังไม่พบสัญญาณเมื่อไม่มีกิจการในไฟล์',
    eval(u) {
      const s = u.supply, small = s.fuel_c1 + s.fuel_c2 + s.fuel_d;
      const pf = P('sup_fuel', u), ps = P('sup_fuel_small', u);
      const reason = `กิจการน้ำมันในทะเบียน ${n0(s.fuel)} ราย: ประเภท ก ${n0(s.fuel_a)} ราย · ค ลักษณะที่ 1 ${n0(s.fuel_c1)} ราย · ค ลักษณะที่ 2 ${n0(s.fuel_c2)} ราย · ตู้หยอดเหรียญ ${n0(s.fuel_d)} ราย · เป้าหมายแผน ปลอดภัยร้อยละ 100`;
      const checks = ['ผลตรวจล่าสุดรายแห่ง (ไฟล์ทะเบียนยังไม่มีช่องผลตรวจ)', 'พิกัดรายแห่งที่ยืนยันแล้ว'];
      if (s.fuel === 0) return { status: 'none', reason: 'ไม่มีกิจการน้ำมันในไฟล์ทะเบียนของตำบลนี้ (0 ราย)', checks: [], task: null, sort: 0 };
      if (pf >= 0.6 || ps >= 0.6) return { status: 'candidate', reason, checks, task: `จัดเส้นทางตรวจประเภท ค และตู้หยอดเหรียญ ${n0(small)} แห่งในรอบเดียว`, sort: Math.max(pf, ps) };
      return { status: 'evidence', reason, checks, task: 'ตรวจตามรอบปกติและบันทึกผลรายแห่ง', sort: Math.max(pf, ps) };
    } },
  { id: 'efficiency', short: 'อาคารควบคุมและภาครัฐ', plan: 'แผนงานที่ 3', mandate: [4, 7], title: 'อาคารควบคุมและหน่วยงานรัฐลดใช้พลังงาน',
    rule: 'ชวนสำรวจเมื่อมีอาคารหรือโรงงานควบคุมในไฟล์ · ต้องเพิ่มหลักฐานเมื่อไฟฟ้ากิจการขนาดกลางและใหญ่ ≥ P80',
    eval(u) {
      const s = u.supply, pm = rankP({ get: x => (x.elec.medium || 0) + (x.elec.large || 0) }, u) ?? 0;
      const ctl = D.supply.controlled.filter(c => c.tambonCode === u.code);
      const flags = ctl.flatMap(c => c.colourFlags || []);
      const reason = `อาคารและโรงงานควบคุมในไฟล์ ${n0(s.controlled)} แห่ง${flags.length ? ` (ทำเครื่องหมายช่องสี${flags.join(', ')} ไฟล์ไม่ระบุความหมายของสี)` : ''} · ไฟฟ้ากิจการขนาดกลางและใหญ่แบบจำลอง ${big((u.elec.medium || 0) + (u.elec.large || 0), 'kWh/ปี')}`;
      const checks = ['รายงานการจัดการพลังงานของอาคารควบคุม', 'รายชื่อหน่วยงานรัฐและค่าไฟรายเดือน', govSolarCheck(u)];
      if (s.controlled > 0) return { status: 'candidate', reason, checks, task: 'นัดตรวจรายงานการจัดการพลังงานของอาคารควบคุมในตำบล', sort: 0.5 + s.controlled / 10 };
      if (pm >= 0.8) return { status: 'evidence', reason, checks, task: 'ขอรายชื่อผู้ใช้ไฟรายใหญ่จาก กฟภ. เพื่อหาอาคารที่เข้าข่ายควบคุม', sort: pm };
      return { status: 'none', reason, checks, task: null, sort: pm };
    } },
  { id: 'ev', short: 'จุดอัดประจุรถไฟฟ้า', plan: 'สถานการณ์ในแผน หน้า 1', mandate: [1], title: 'จุดอัดประจุรถไฟฟ้า',
    rule: 'ชวนสำรวจเมื่อรถไฟฟ้าและไฮบริด ≥ P80 และไฟฟ้ากิจการ ≥ P60 · ต้องเพิ่มหลักฐานเมื่อรถไฟฟ้าและไฮบริด ≥ P60',
    eval(u) {
      const pe = P('veh_ev', u), pb = P('elec_biz', u);
      const reason = `รถไฟฟ้าและไฮบริดแบบจำลอง ${n0((u.vehicles.bev || 0) + (u.vehicles.hybrid || 0))} คัน (${pct(pe)}) · ไฟฟ้ากิจการ (${pct(pb)})`;
      const checks = ['ตำแหน่งสถานีอัดประจุเดิม 10 แห่ง (แผนระบุเฉพาะจำนวนตามผู้ให้บริการ)', `${carsEvContext()} · รายอำเภอและรายตำบลยังต้องขอจากกรมการขนส่งทางบก`];
      if (pe >= 0.8 && pb >= 0.6) return { status: 'candidate', reason, checks, task: 'นัดผู้ประกอบการสถานีบริการในตำบลเรื่องการติดตั้งเครื่องอัดประจุ', sort: pe };
      if (pe >= 0.6) return { status: 'evidence', reason, checks, task: 'ขอข้อมูลรถไฟฟ้ารายอำเภอและตำแหน่งสถานีเดิม', sort: pe };
      return { status: 'none', reason, checks, task: null, sort: pe };
    } },
  { id: 'outreach', short: 'ศูนย์ข้อมูลพลังงานเคลื่อนที่', plan: 'แผนงานที่ 3', mandate: [7], title: 'ศูนย์บริการข้อมูลพลังงานเคลื่อนที่',
    rule: 'ชวนสำรวจเมื่อไฟฟ้าบ้านต่อครัวเรือน ≥ P70 และยังไม่มีโครงการในไฟล์ · ต้องเพิ่มหลักฐานเมื่อ ≥ P70 และมีโครงการแล้ว',
    eval(u) {
      const ph = P('elec_hh', u), s = u.supply;
      const reason = `ไฟฟ้าบ้านแบบจำลอง ${n0(u.elec.residential / Math.max(u.households, 1) / 12)} kWh ต่อครัวเรือนต่อเดือน (${pct(ph)}) · โครงการพลังงานในไฟล์ ${n0(s.projects)} รายการ`;
      const checks = ['ค่าไฟจริงรายครัวเรือนแบบรวมระดับตำบลจาก กฟภ.', 'กลุ่มชุมชนหรือ อปท. ที่ร่วมจัดกิจกรรม'];
      if (ph >= 0.7 && s.projects === 0) return { status: 'candidate', reason, checks, task: 'จัดศูนย์ข้อมูลพลังงานเคลื่อนที่ร่วมกับ อปท. ในตำบล', sort: ph };
      if (ph >= 0.7) return { status: 'evidence', reason, checks, task: 'ทบทวนผลโครงการเดิมก่อนจัดกิจกรรมใหม่', sort: ph };
      return { status: 'none', reason, checks, task: null, sort: ph };
    } }
];
export const DEFAULT_LENSES = ['rooftop', 'safety', 'efficiency'];
export const QUEUE_TH = { candidate: 'ชวนสำรวจ', evidence: 'ต้องเพิ่มหลักฐาน', none: 'ยังไม่พบสัญญาณ' };
/* Yolk eligibility: only Demand members (tier 1–3) enter the queue; lenses never add or remove members */
export function computeQueue(lensIds, tiers) {
  const lenses = lensIds.map(id => LENSES.find(l => l.id === id)).filter(Boolean);
  const rows = D.areas.tambon.filter(u => tiers.res.get(u.code)?.tier).map(u => {
    const results = lenses.map(l => ({ lens: l, ...l.eval(u) }));
    const cands = results.filter(r => r.status === 'candidate');
    const status = cands.length ? 'candidate' : (results.some(r => r.status === 'evidence') ? 'evidence' : 'none');
    const tier = tiers.res.get(u.code)?.tier ?? null;
    const firstIdx = cands.length ? results.indexOf(cands[0]) : 99;
    const sortv = cands.length ? cands[0].sort : Math.max(0, ...results.map(r => r.sort || 0));
    return { u, results, cands, status, tier, firstIdx, sortv };
  });
  rows.sort((a, b) => b.cands.length - a.cands.length || (a.tier ?? 9) - (b.tier ?? 9) || a.firstIdx - b.firstIdx || b.sortv - a.sortv || a.u.code.localeCompare(b.u.code));
  return rows;
}

/* ---------- URL state (permalink + Back/Forward) ---------- */
export const VIEWS = ['overview', 'demand', 'supply', 'opportunity', 'shortlist', 'requests', 'sources'];
export const VIEW_TH = { overview: 'ภาพรวม', demand: 'ความต้องการพลังงาน', supply: 'กิจการพลังงาน', opportunity: 'โอกาสส่งเสริม', shortlist: 'พื้นที่ที่เล็งไว้', requests: 'ข้อมูลที่ต้องขอเชื่อมโยง', sources: 'ที่มาและวิธีคิด' };
export const S = { view: 'overview', level: 'tambon', district: null, area: null, building: null, metric: 'elec_total', supplyMetric: 'sup_fuel', lenses: [...DEFAULT_LENSES], queue: 'candidate', criteria: DEFAULT_CRITERIA.map(c => ({ ...c })), supplyFilter: 'all', carsGroup: '1' };
const S_DEFAULT = JSON.stringify(S);
export function readURL() {
  Object.assign(S, JSON.parse(S_DEFAULT));
  const q = new URLSearchParams(location.search);
  const v = q.get('v'); S.view = VIEWS.includes(v) ? v : 'overview';
  S.level = q.get('lvl') === 'lao' ? 'lao' : 'tambon';
  S.district = D.districtBy.has(q.get('d')) ? q.get('d') : null;
  const a = q.get('a'); S.area = (S.level === 'lao' ? D.laoBy : D.tambonBy).has(a) ? a : null;
  const b = q.get('b'); S.building = b && /^\d{8}-\d{5}$/.test(b) ? b : null;
  const m = q.get('m'); if (m === 'tier') S.metric = 'tier'; else if (m && METRICS.some(x => x.id === m)) { const mm = metricBy(m); if (mm.group === 'supply') S.supplyMetric = m; else S.metric = m; }
  const l = (q.get('lens') || '').split(',').filter(id => LENSES.some(x => x.id === id)).slice(0, 3); if (l.length) S.lenses = l;
  const qq = q.get('q'); if (['candidate', 'evidence', 'none'].includes(qq)) S.queue = qq;
  const c = q.get('c'); if (c) { const parsed = c.split('|').map(s => { const mm = /^([a-z_]+)>=P(\d+)$/.exec(s); return mm && METRICS.some(x => x.id === mm[1]) && THRESHOLDS.includes(+mm[2]) ? { metric: mm[1], p: +mm[2], on: true } : null; }).filter(Boolean).slice(0, 3); if (parsed.length) { while (parsed.length < 3) parsed.push({ metric: DEFAULT_CRITERIA[parsed.length].metric, p: 60, on: false }); S.criteria = parsed; } }
}
export function writeURL(push = false) {
  const q = new URLSearchParams();
  if (S.view !== 'overview') q.set('v', S.view);
  if (['demand', 'supply', 'opportunity'].includes(S.view)) {
    if (S.level === 'lao') q.set('lvl', 'lao');
    if (S.district) q.set('d', S.district);
    if (S.area) q.set('a', S.area);
    if (S.building) q.set('b', S.building);
    if (S.view === 'demand' && S.metric !== 'elec_total') q.set('m', S.metric);
    if (S.view === 'supply' && S.supplyMetric !== 'sup_fuel') q.set('m', S.supplyMetric);
    if (S.view === 'opportunity') { if (S.lenses.join(',') !== DEFAULT_LENSES.join(',')) q.set('lens', S.lenses.join(',')); if (S.queue !== 'candidate') q.set('q', S.queue); }
    const cr = criteriaRev(S.criteria).text; if (cr !== criteriaRev(DEFAULT_CRITERIA).text) q.set('c', cr);
  }
  const url = location.pathname + (q.toString() ? '?' + q : '');
  if (url === location.pathname + location.search) return;
  history[push ? 'pushState' : 'replaceState'](null, '', url);
}

/* ---------- theme (THEME-01: Auto/Light/Dark, persisted, no first-paint flash) ---------- */
const THEME_KEY = 'cm-yolk-theme';
export function getThemeChoice() { try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; } }
export function effectiveTheme() { const t = document.documentElement.dataset.theme; return t === 'light' || t === 'dark' ? t : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
export function setThemeChoice(choice) {
  if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice; else delete document.documentElement.dataset.theme;
  try { if (choice === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, choice); } catch {}
  document.dispatchEvent(new CustomEvent('themechange'));
}

/* ---------- shortlist (browser-local; Workspace would keep this per team) ---------- */
const SL_KEY = 'cm-yolk-shortlist-v1';
let slMemory = null; // used only when the browser blocks storage, so the list still works until the page closes
export function shortlist() {
  if (slMemory) return slMemory.map(x => ({ ...x }));
  try { const v = JSON.parse(localStorage.getItem(SL_KEY)); return Array.isArray(v) ? v.filter(x => x && typeof x.code === 'string') : []; } catch { return []; }
}
export function saveShortlist(list) {
  try { localStorage.setItem(SL_KEY, JSON.stringify(list)); slMemory = null; return true; } catch { slMemory = list.map(x => ({ ...x })); return false; }
}
export function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('visible'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('visible'), 3800); }
