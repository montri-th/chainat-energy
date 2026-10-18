/* Views: overview, map panels (Demand · Supply · Opportunity), shortlist, data requests, sources. */
import { D, S, $, $$, esc, n0, n1, big, MONTHS, METRICS, metricBy, MEASURE_TH, lut, percentileLut, valueEntries, stamp, THRESHOLDS, TIER_TH, tierNotes, computeTiers, criteriaRev, LENSES, QUEUE_TH, computeQueue, shortlist, VIEW_TH, unitsFor, quantileValue, ENGINE_SERIES, ymTh, carsYearly, carsWindow } from './core.js';

const REL = () => `ข้อมูลรอบ ${D.meta.release.dateThai} · เครื่องคิด ${D.meta.release.engine} · เกณฑ์ ${criteriaRev(S.criteria).name}`;
const PLAN_SRC = 'แผนปฏิบัติราชการด้านพลังงาน จ.ชัยนาท 2566–2570';
const sumv = o => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);
const CAT_TH = ['บ้านอยู่อาศัย', 'กิจการขนาดเล็ก', 'กิจการขนาดกลาง', 'กิจการขนาดใหญ่', 'กิจการเฉพาะอย่าง'];
const CAT_SEASON = ['residential', 'business', 'business', 'large', 'business'];
export const TIER_IDX = { 1: 40, 2: 20, 3: 0 };

/* ---------------- overview ---------------- */
export function renderOverview() {
  const p = D.plan.plan, sit = p.situation, sup = D.supply, veh = D.vehicles;
  const elec = sit.electricity2566.rows.reduce((a, r) => a + r.value, 0);
  const vehTotal = veh.rows.reduce((a, r) => a + r[2], 0);
  const bev = veh.rows.filter(r => r[1] === 'ไฟฟ้า').reduce((a, r) => a + r[2], 0);
  const photos = sup.projects.reduce((a, x) => a + x.photos.length, 0);
  const individuals = sup.fuel.filter(f => f.ownerKind === 'บุคคลธรรมดา').length;
  const kp = [
    { v: n1(elec / 1e6), u: 'ล้าน kWh', h: 'ไฟฟ้าที่ใช้ในจังหวัด ปี 2566', s: { dataset: 'การใช้ไฟฟ้าแยกประเภทผู้ใช้', source: `${PLAN_SRC} หน้า 25`, date: 'ปี 2566', boundary: 'จังหวัดชัยนาท', measure: 'reported' } },
    { v: n0(vehTotal), u: 'คัน', h: `รถจดทะเบียนสะสม · รถไฟฟ้า ${n0(bev)} คัน`, s: { dataset: 'รถจดทะเบียนสะสมตามชนิดเชื้อเพลิง', source: 'กรมการขนส่งทางบก (MOT Data Catalog)', date: veh.asOfThai, boundary: 'จังหวัดชัยนาท', measure: 'observed' } },
    { v: n0(D.meta.layers.buildings.count), u: 'หลัง', h: 'อาคารที่เจาะดูรายหลังได้', s: { dataset: 'รูปอาคาร CityMETER V4', source: 'CityMETER (Landometer)', date: 'อ่าน 18 ต.ค. 2569', boundary: '59 อปท. ในจังหวัดชัยนาท', measure: 'observed' } },
    { v: n0(sup.fuel.length), u: 'ราย', h: `กิจการน้ำมันเชื้อเพลิงในทะเบียน · บุคคลธรรมดา ${n0(individuals)} ราย`, s: { dataset: 'ทะเบียนผู้ประกอบการน้ำมันเชื้อเพลิง', source: 'ไฟล์ของ สพจ.ชัยนาท', date: 'ได้รับ 16 ต.ค. 2569 · ไฟล์ไม่ระบุวันที่ข้อมูล', boundary: '8 อำเภอ', measure: 'observed' } },
    { v: n0(sup.projects.length), u: 'รายการ', h: `โครงการพลังงานทดแทน พร้อมภาพ ${n0(photos)} ภาพ`, s: { dataset: 'โครงการพลังงานในพื้นที่ (ชีต 01–08)', source: 'ไฟล์ของ สพจ.ชัยนาท', date: 'ปีโครงการ 2558–2568', boundary: '8 อำเภอ', measure: 'observed' } },
    { v: n0(sup.controlled.length), u: 'แห่ง', h: 'อาคารและโรงงานควบคุม', s: { dataset: 'รายชื่อโรงงานควบคุมและอาคารควบคุม', source: 'ไฟล์ของ สพจ.ชัยนาท', date: 'ได้รับ 16 ต.ค. 2569', boundary: 'จังหวัดชัยนาท', measure: 'observed' } }
  ];
  $('#kpis').innerHTML = kp.map(k => `<article class="kpi"><div><span class="kpi-value">${k.v}</span><span class="kpi-unit">${esc(k.u)}</span></div><h3>${esc(k.h)}</h3>${stamp(k.s)}</article>`).join('');
  $('#plans').innerHTML = p.plans.map(pl => {
    const lenses = LENSES.filter(l => l.plan === `แผนงานที่ ${pl.no}`);
    return `<article class="plan-card"><span class="plan-no">แผนงานที่ ${pl.no}</span><h3>${esc(pl.name)}</h3><p class="plan-kpi"><b>ตัวชี้วัด</b> ${esc(pl.kpi)}</p><p class="plan-target">${esc(pl.targets)}</p><div class="lens-links">${lenses.map(l => `<a class="chip" href="?v=opportunity&lens=${l.id}">${esc(l.short)}</a>`).join('')}</div><p class="stamp">${esc(PLAN_SRC)} ${esc(pl.page)} · ชื่อแผนงานสรุปความ</p></article>`;
  }).join('');
  $('#mandate').innerHTML = D.plan.mandate.items.map((t, i) => {
    const lenses = LENSES.filter(l => l.mandate.includes(i + 1));
    return `<li><span>${esc(t)}${lenses.length ? `<br><span class="lens-links">${lenses.map(l => `<a class="chip" href="?v=opportunity&lens=${l.id}">${esc(l.short)}</a>`).join(' ')}</span>` : ''}</span></li>`;
  }).join('');
  $('#mandate-stamp').textContent = `ข้อความจากหน้าเว็บ ${D.plan.mandate.source} อ่าน 18 ต.ค. 2569`;
  renderCars();
}

/* ---------------- new registrations (CityMETER: Cars, province level) ---------------- */
const CUE_PATH = {
  circle: '<circle cx="6" cy="6" r="4.8"/>',
  square: '<rect x="1.4" y="1.4" width="9.2" height="9.2"/>',
  triangle: '<path d="M6 1.1 11 10.6H1z"/>',
  diamond: '<path d="M6 .9 11.1 6 6 11.1.9 6z"/>',
  cross: '<path d="M2.4 1 6 4.6 9.6 1 11 2.4 7.4 6 11 9.6 9.6 11 6 7.4 2.4 11 1 9.6 4.6 6 1 2.4z"/>'
};
const cue = e => { const s = ENGINE_SERIES[e]; return `<svg class="cue" viewBox="0 0 12 12" aria-hidden="true" style="--cue:var(--cat-${s.slot})">${CUE_PATH[s.cue]}</svg>`; };
const pct1 = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pctTh = v => v == null ? '—' : v > 0 && v < 0.0005 ? `<${pct1.format(0.1)}%` : `${pct1.format(v * 100)}%`;
const CLAIM = { observed: 'ข้อมูลจากแหล่ง', benchmark: 'เทียบกับจังหวัดอื่น', inference: 'ข้อสรุปจากข้อมูล', hypothesis: 'สมมติฐานที่ต้องตรวจ' };
const claim = k => `<span class="claim" data-claim="${k}">${CLAIM[k]}</span>`;
function carsStamp() {
  const c = D.cars;
  return stamp({ dataset: c.dataset, source: c.source, date: `${ymTh(c.months[0])}–${ymTh(c.months[c.months.length - 1])} · อ่าน 18 ต.ค. 2569`, boundary: 'จังหวัดชัยนาท (ชุดข้อมูลนี้มีถึงระดับจังหวัด)', measure: 'observed' });
}
function benchLine(t) {
  const c = D.cars, b = c.benchmark.types[t]; const me = b.rows[b.rank - 1];
  return `12 เดือนล่าสุด (${ymTh(c.window12m[0])}–${ymTh(c.window12m[1])}) ไฟฟ้าล้วน ${pctTh(me[1] / me[2])} (${n0(me[1])} จาก ${n0(me[2])} คัน) · อันดับ ${n0(b.rank)} จาก ${n0(b.of)} จังหวัด เรียงจากสัดส่วนมากไปน้อย · มัธยฐานของ ${n0(b.of)} จังหวัด ${pctTh(b.median)} · ในกลุ่มภาคกลางของ CityMETER: Cars ${n0(b.region.of)} จังหวัด อันดับ ${n0(b.region.rank)}`;
}
function lowCountNote() {
  const c = D.cars, lc = c.benchmark.lowCount, b1 = c.benchmark.types['1'], b12 = c.benchmark.types['12'];
  if (!lc || !lc.provinces.length) return '';
  return `${lc.provinces.join(' ')} ${lc.note} (เกณฑ์: ${lc.rule}) ถ้าไม่นับ ${n0(lc.provinces.length)} จังหวัดนี้ ชัยนาทอยู่อันดับ ${n0(b12.withoutLowCount.rank)} จาก ${n0(b12.withoutLowCount.of)} สำหรับจักรยานยนต์ และ ${n0(b1.withoutLowCount.rank)} จาก ${n0(b1.withoutLowCount.of)} สำหรับรถยนต์นั่ง · จังหวัดที่จดทะเบียนอาจไม่ใช่จังหวัดที่ใช้รถ`;
}
export function renderCars() {
  const el = $('#cars-body'); if (!el) return;
  const c = D.cars;
  if (!c) { el.innerHTML = '<p class="note" role="status">โหลดข้อมูลรถจดทะเบียนรายเดือนไม่สำเร็จ ส่วนอื่นของหน้ายังใช้ได้</p>'; return; }
  const span = `${ymTh(c.window12m[0])}–${ymTh(c.window12m[1])}`;
  const yearsCar = carsYearly('1'), yearsMoto = carsYearly('12'), yearsAll = carsYearly('all'), yearsPickup = carsYearly('3');
  const first = a => a[0], last = a => a[a.length - 1], lastFull = a => [...a].reverse().find(r => r.months === 12);
  const yShort = r => `${r.year + 543}${r.months < 12 ? '*' : ''}`;
  const yLong = r => r.months < 12 ? `${ymTh(r.first).split(' ')[0]}–${ymTh(r.last)}` : `ปี ${r.year + 543}`;
  const glabel = id => c.groups.find(x => x.id === id).label;
  const insight = (t, years) => { const a = first(years), z = last(years), title = glabel(t); return `<article class="insight"><h3>${esc(title)}</h3><p>${claim('observed')} ไฟฟ้าล้วน <b class="num">${pctTh(z.evShare)}</b> ของ${esc(title)} ที่จดทะเบียนใหม่ ${esc(yLong(z))} (${n0(z.counts.ELECTRIC)} จาก ${n0(z.total)} คัน) · ${esc(yLong(a))} ${pctTh(a.evShare)}</p><p>${claim('benchmark')} ${esc(benchLine(t))}</p></article>`; };
  const d0 = first(yearsAll), dz = lastFull(yearsAll), p0 = first(yearsPickup), pz = lastFull(yearsPickup);
  let html = `<div class="insights">${insight('1', yearsCar)}${insight('12', yearsMoto)}<article class="insight"><h3>รถดีเซลใหม่</h3><p>${claim('observed')} รถใหม่ที่ใช้ดีเซลทุกประเภท ปี ${dz.year + 543} <b class="num">${n0(dz.counts.DIESEL)}</b> คัน ลดจาก ${n0(d0.counts.DIESEL)} คันในปี ${d0.year + 543} · รถบรรทุกส่วนบุคคล (รย.3) ทุกเชื้อเพลิง จาก ${n0(p0.total)} เหลือ ${n0(pz.total)} คัน</p><p>${claim('inference')} รถดีเซลใหม่ลดลง แต่รถเดิมยังวิ่งอยู่ ยอดใช้ดีเซลจริงต้องดูจากยอดจำหน่ายรายสถานี (ข้อมูลชุดที่ 2 ในหน้าขอข้อมูล)</p></article></div>`;
  html += `<p class="insight-note">${claim('benchmark')} สัดส่วนจักรยานยนต์ไฟฟ้าในรถจดทะเบียนใหม่ของชัยนาทสูงเป็นอันดับ ${n0(c.benchmark.types['12'].rank)} จาก ${n0(c.benchmark.types['12'].of)} จังหวัด แต่สัดส่วนรถยนต์นั่งไฟฟ้าล้วนต่ำกว่ามัธยฐานของ ${n0(c.benchmark.types['1'].of)} จังหวัด ${claim('hypothesis')} การชาร์จในจังหวัดอาจเป็นจักรยานยนต์ที่ชาร์จที่บ้านหรือร้านค้ามากกว่ารถยนต์ที่ชาร์จที่สถานีสาธารณะ และสัดส่วนที่สูงอาจมาจากผู้จำหน่ายหรือโครงการในพื้นที่ ยังไม่ได้ตรวจ ต้องถามผู้จำหน่ายและผู้ใช้ว่าชาร์จที่ไหน และขอข้อมูลรายอำเภอก่อนวางจุดอัดประจุ</p>`;
  const lcn = lowCountNote(); if (lcn) html += `<p class="insight-note">${claim('observed')} ${esc(lcn)}</p>`;
  const g = S.carsGroup, years = carsYearly(g);
  const groupLabel = c.groups.find(x => x.id === g).label;
  html += `<div class="filters" role="group" aria-label="เลือกประเภทรถ">${c.groups.map(x => `<button type="button" data-cars-group="${x.id}" aria-pressed="${x.id === g}">${esc(x.label)}</button>`).join('')}</div>`;
  const order = ['DIESEL', 'GASOLINE', 'GASOLINE-HYBRID', 'GASOLINE-PHEV', 'ELECTRIC'];
  const max = Math.max(...years.map(r => r.total), 1);
  html += `<h3 class="cars-title">${esc(groupLabel)} ที่จดทะเบียนใหม่ในแต่ละปี แยกเชื้อเพลิง</h3>`;
  html += `<ul class="cue-legend" aria-label="คำอธิบายสีและสัญลักษณ์">${order.map(e => `<li>${cue(e)}<span>${esc(c.engineTh[e])}</span></li>`).join('')}</ul>`;
  html += `<ol class="stackbars">${years.map(r => `<li class="sb-row"><span class="sb-year">${esc(yShort(r))}</span><span class="sb-track" role="img" aria-label="${esc(`${yLong(r)} รวม ${n0(r.total)} คัน: ${order.map(e => `${c.engineTh[e]} ${n0(r.counts[e])}`).join(', ')}`)}">${order.filter(e => r.counts[e] > 0).map(e => `<span class="sb-seg" style="width:${r.counts[e] / max * 100}%;--seg:var(--cat-${ENGINE_SERIES[e].slot})" title="${esc(`${c.engineTh[e]} ${n0(r.counts[e])} คัน`)}"></span>`).join('')}</span><span class="sb-total num">${n0(r.total)}<small> คัน · ไฟฟ้าล้วน ${pctTh(r.evShare)}</small></span></li>`).join('')}</ol>`;
  html += `<p class="meta">ปี พ.ศ. · * ${esc(yLong(last(years)))} มีข้อมูล ${n0(last(years).months)} เดือน · เรียงจากซ้าย: ${order.map(e => c.engineTh[e]).join(' · ')} · เชื้อเพลิงที่เป็นศูนย์ในปีนั้นไม่มีช่องในแท่ง · ความยาวแท่งเทียบกับปีที่มีรถจดทะเบียนมากที่สุดของประเภทนี้${g === '3' ? ' · รย.3 คือรถบรรทุกส่วนบุคคล กระบะบางแบบ เช่น กระบะ 4 ประตู อาจจดเป็น รย.1' : ''}</p>`;
  html += `<details class="card"><summary>ดูเป็นตาราง</summary><div class="table-wrap"><table class="lds-table"><caption>${esc(groupLabel)} ที่จดทะเบียนใหม่ จังหวัดชัยนาท แยก<span class="phrase">เชื้อเพลิง</span> · หน่วย คัน</caption><thead><tr><th scope="col">ช่วงเวลา</th>${order.map(e => `<th scope="col" class="num">${esc(c.engineTh[e])}</th>`).join('')}<th scope="col" class="num">รวม</th><th scope="col" class="num">สัดส่วนไฟฟ้าล้วน</th></tr></thead><tbody>${years.map(r => `<tr><th scope="row">${esc(yLong(r))}</th>${order.map(e => `<td class="num" data-label="${esc(c.engineTh[e])}" data-state="${r.counts[e] ? 'measured' : 'measured_zero'}" data-value="${r.counts[e]}">${n0(r.counts[e])}</td>`).join('')}<td class="num" data-label="รวม" data-value="${r.total}">${n0(r.total)}</td><td class="num" data-label="สัดส่วนไฟฟ้าล้วน">${pctTh(r.evShare)}</td></tr>`).join('')}</tbody></table></div></details>`;
  const tb = c.topBrands12m[g];
  if (tb) {
    const list = e => tb[e] && tb[e].length ? `<li><span class="brand-head">${cue(e)}${esc(c.engineTh[e])}</span><span>${tb[e].map(([b, n]) => `${esc(b)} <span class="num">${n0(n)}</span>`).join(' · ')}</span></li>` : '';
    html += `<h3 class="cars-title">ยี่ห้อที่จดทะเบียนมากที่สุด ${esc(span)}</h3><ul class="brand-list">${['ELECTRIC', 'GASOLINE-HYBRID', 'GASOLINE-PHEV'].map(list).join('')}</ul><p class="meta">นับรายยี่ห้อ ชุดข้อมูลแยกยี่ห้อตามเชื้อเพลิง แต่ไม่ได้ผูกรุ่นกับเชื้อเพลิง จึงไม่ระบุรุ่น</p>`;
  }
  const bm = c.benchmark.types[g];
  const low = new Set(c.benchmark.lowCount?.provinces || []);
  if (bm) html += `<details class="card"><summary>เทียบสัดส่วนไฟฟ้าล้วนกับ ${n0(bm.of)} จังหวัด (${esc(span)})</summary><div class="table-wrap"><table class="lds-table table-keep"><caption>${esc(c.benchmark.metric)} · ${esc(groupLabel)} · จักรวาล: ${esc(c.benchmark.universe)} · ${esc(c.benchmark.order)} · * ข้อมูลน้อยผิดปกติ</caption><thead><tr><th scope="col" class="num">อันดับ</th><th scope="col">จังหวัด</th><th scope="col" class="num">ไฟฟ้าล้วน</th><th scope="col" class="num">ทั้งหมด</th><th scope="col" class="num">สัดส่วน</th></tr></thead><tbody>${bm.rows.map((r, i) => `<tr${r[0] === c.province.name ? ' class="is-self"' : ''}><td class="num" data-label="อันดับ">${n0(i + 1)}</td><th scope="row">${esc(r[0])}${low.has(r[0]) ? ' *' : ''}${r[0] === c.province.name ? ' <small>(จังหวัดนี้)</small>' : ''}</th><td class="num" data-label="ไฟฟ้าล้วน (คัน)">${n0(r[1])}</td><td class="num" data-label="ทั้งหมด (คัน)">${n0(r[2])}</td><td class="num" data-label="สัดส่วน">${pctTh(r[1] / r[2])}</td></tr>`).join('')}</tbody></table></div></details>`;
  else if (g === 'all') html += `<p class="meta">การเทียบกับจังหวัดอื่นทำแยกรายประเภท เลือกรถยนต์นั่งหรือจักรยานยนต์เพื่อดูตารางเทียบ ${n0(c.benchmark.types['1'].of)} จังหวัด</p>`;
  else html += `<p class="meta">ไม่มีรถไฟฟ้าล้วนประเภทนี้จดทะเบียนใหม่ในชัยนาทตลอดช่วงข้อมูล จึงไม่ได้เทียบกับจังหวัดอื่น</p>`;
  html += carsStamp();
  html += `<p class="meta">ดูแบรนด์และรุ่นเพิ่มเติมที่ <a href="${esc(c.page)}" rel="noopener">CityMETER: Cars จังหวัดชัยนาท</a> · ข้อมูลรายอำเภอและรายตำบลยังต้องขอจากกรมการขนส่งทางบก</p>`;
  const key = document.activeElement?.dataset?.carsGroup;
  el.innerHTML = html;
  if (key) $(`#cars-body [data-cars-group="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
}

/* ---------------- colours for current map metric ---------------- */
export function mapStyles() {
  if (S.view === 'opportunity' || (S.view === 'demand' && S.metric === 'tier')) {
    const tiers = computeTiers(S.criteria); const L = lut('activity');
    const q = S.view === 'opportunity' ? new Map(computeQueue(S.lenses, tiers).map(r => [r.u.code, r])) : null;
    const styles = D.areas.tambon.map(u => {
      const t = tiers.res.get(u.code).tier;
      const row = q && q.get(u.code);
      const label = q ? (row?.status === 'candidate' ? `✓ ${QUEUE_TH.candidate}` : (row?.status === 'evidence' ? QUEUE_TH.evidence : '')) : (t ? TIER_TH[t] : '');
      return { code: u.code, fill: t ? L[TIER_IDX[t]] : null, label, tier: t, dash: t === 3, strong: !!(q && row?.status === 'candidate') };
    });
    return { level: 'tambon', styles, kind: 'tier', tiers };
  }
  const metric = metricBy(S.view === 'supply' ? S.supplyMetric : S.metric);
  const level = metric.grains.includes(S.level) ? S.level : 'tambon';
  const entries = valueEntries(metric, level);
  const ranks = percentileLut(entries); const L = lut(metric.family);
  const styles = entries.map(e => { const r = ranks.get(e.key); return { code: e.key, fill: r.idx == null ? null : L[r.idx], zero: e.state === 'measured_zero', label: e.value == null ? 'ไม่มีข้อมูล' : `${n0(e.value)}`, idx: r.idx, value: e.value, state: e.state }; });
  return { level, styles, kind: 'metric', metric, entries, ranks };
}

/* ---------------- legend (component.map-legend.01) ---------------- */
let legendOpen = (() => {
  let v = null; try { v = localStorage.getItem('cm-yolk-legend'); } catch (e) { /* storage may be blocked */ }
  return v ? v !== 'closed' : !matchMedia('(max-width: 599px)').matches;
})();
export function toggleLegend() {
  legendOpen = !legendOpen;
  try { localStorage.setItem('cm-yolk-legend', legendOpen ? 'open' : 'closed'); } catch (e) { /* per-viewer convenience only */ }
  const el = $('#map-legend'); if (!el) return;
  el.dataset.open = String(legendOpen);
  const b = el.querySelector('.legend-toggle'); if (b) { b.setAttribute('aria-expanded', String(legendOpen)); b.textContent = legendOpen ? 'ย่อ' : 'ขยาย'; }
}
export function renderLegend(ms, buildingInfo) {
  const el = $('#map-legend'); if (!el) return;
  const head = title => `<div class="legend-head"><div class="lds-map-legend__title">${title}</div><button type="button" class="legend-toggle" aria-expanded="${legendOpen}" aria-controls="legend-more">${legendOpen ? 'ย่อ' : 'ขยาย'}</button></div>`;
  let html = '', more = '';
  if (ms.kind === 'tier') {
    const L = lut('activity'); const counts = { 1: 0, 2: 0, 3: 0 };
    for (const v of ms.tiers.res.values()) if (v.tier) counts[v.tier]++;
    const none = ms.tiers.res.size - counts[1] - counts[2] - counts[3];
    const notes = tierNotes(S.criteria); const tiersOn = [1, 2, 3].filter(x => notes[x]);
    html += head(S.view === 'opportunity' ? 'คิวโอกาสบนพื้นที่ไข่แดง' : 'ระดับความต้องการตามเกณฑ์');
    html += `<ul class="tier-swatches">${tiersOn.map(x => `<li><i class="${x === 3 ? 'tier-dash' : ''}" style="background:${L[TIER_IDX[x]]}"></i><span>${TIER_TH[x]}</span><span class="num">${n0(counts[x])}</span></li>`).join('')}<li><i class="tier-none"></i><span>ไม่ผ่านเกณฑ์ Demand</span><span class="num">${n0(none)}</span></li>${S.view === 'opportunity' ? `<li><i class="tier-strong"></i><span>เส้นขอบหนา: ${QUEUE_TH.candidate}</span><span class="num">${n0(ms.styles.filter(s => s.strong).length)}</span></li>` : ''}</ul>`;
    more += `<div class="lds-map-legend__unit">จำนวนตำบลจาก ${n0(ms.tiers.res.size)} ตำบล · ${tiersOn.map(x => `${TIER_TH[x]} ${notes[x]}`).join(' · ')} · ไข่ขาวมีเส้นประด้านใน · สีชุด 3 ระดับของสเกลกิจกรรม (ตำแหน่ง 40 · 20 · 0 ของ LUT 41)</div>`;
  } else {
    const L = lut(ms.metric.family);
    const vals = ms.entries.filter(e => e.value != null).map(e => e.value);
    const lo = Math.min(...vals), hi = Math.max(...vals), med = quantileValue(vals, .5);
    const sel = S.area && ms.styles.find(s => s.code === S.area);
    html += head(esc(ms.metric.label));
    html += `<div class="lut41" aria-hidden="true">${L.map(c => `<span style="background:${c}"></span>`).join('')}</div>`;
    html += `<div class="lut-marks" aria-hidden="true">${sel && sel.idx != null ? `<i style="left:${(sel.idx + .5) / 41 * 100}%"></i>` : ''}</div>`;
    html += `<div class="lut-ends"><span>ต่ำ</span><span>สูง</span></div>`;
    more += `<div class="lds-map-legend__unit">${esc(ms.metric.unit)} · ${esc(MEASURE_TH[ms.metric.measure])} · สีตามอันดับเปอร์เซ็นไทล์ของ ${n0(ms.entries.length)} ${ms.level === 'lao' ? 'อปท.' : 'ตำบล'} (41 ระดับ)</div>`;
    more += `<dl class="lut-values"><div><dt>ต่ำสุด</dt><dd>${n0(lo)}</dd></div><div><dt>มัธยฐาน</dt><dd>${n0(med)}</dd></div><div><dt>สูงสุด</dt><dd>${n0(hi)}</dd></div></dl>`;
    const states = [];
    if (ms.entries.some(e => e.state === 'measured_zero')) states.push(`<li data-state="measured_zero"><span class="lds-legend-swatch"></span><span>0</span><span>ศูนย์ (นับแล้วไม่มีรายการ) ${n0(ms.entries.filter(e => e.state === 'measured_zero').length)}</span></li>`);
    if (ms.entries.some(e => e.state === 'no_data')) states.push(`<li data-state="no_data"><span class="lds-legend-swatch"></span><span>—</span><span>ไม่มีข้อมูล</span></li>`);
    if (states.length) more += `<ul class="lds-map-legend__states">${states.join('')}</ul>`;
  }
  if (buildingInfo) {
    const L = lut('activity');
    more += `<div class="legend-sub"><div class="lds-map-legend__title">อาคาร ${n0(buildingInfo.n)} หลัง</div><div class="lds-map-legend__unit">ไฟฟ้าแบบจำลอง kWh ต่อปี · สีตามอันดับเปอร์เซ็นไทล์ของอาคารในพื้นที่นี้</div><div class="lut41" aria-hidden="true">${L.map(c => `<span style="background:${c}"></span>`).join('')}</div><dl class="lut-values"><div><dt>ต่ำสุด</dt><dd>${n0(buildingInfo.lo)}</dd></div><div><dt>สูงสุด</dt><dd>${n0(buildingInfo.hi)}</dd></div></dl></div>`;
  }
  more += `<div class="lds-map-legend__source">${ms.kind === 'tier' ? `เกณฑ์ ${esc(criteriaRev(S.criteria).label)}` : esc(ms.metric.source)}</div>`;
  el.dataset.open = String(legendOpen);
  el.innerHTML = `${html}<div class="legend-more" id="legend-more">${more}</div>`;
}

/* ---------------- shared bits ---------------- */
function flow() {
  const items = [['demand', '1', 'ความต้องการ'], ['supply', '2', 'กิจการพลังงาน'], ['opportunity', '3', 'โอกาสส่งเสริม']];
  return `<ol class="flow">${items.map(([v, n, t]) => `<li><a href="?v=${v}" data-nav="${v}"${S.view === v ? ' aria-current="page"' : ''}><b>${n}</b>${t}</a></li>`).join('')}</ol>`;
}
function monthsChart(values, colour) {
  const mx = Math.max(...values, 1);
  return `<div class="months" role="img" aria-label="${esc(values.map((v, i) => `${MONTHS[i]} ${n0(v)}`).join(', '))}">${values.map(v => `<span style="height:${Math.max(4, v / mx * 100)}%;background:${colour}"></span>`).join('')}</div><div class="months-axis" aria-hidden="true">${MONTHS.map(m => `<span>${m.replace('.', '').slice(0, 2)}</span>`).join('')}</div>`;
}
function areaUnit() { return S.area ? (S.level === 'lao' ? D.laoBy.get(S.area) : D.tambonBy.get(S.area)) : null; }
function scopeName() {
  const u = areaUnit(); if (u) return S.level === 'lao' ? u.name : `ต.${u.name} อ.${u.district}`;
  if (S.district) return `อ.${D.districtBy.get(S.district).name}`;
  return 'จังหวัดชัยนาท';
}
function inScope(u) {
  if (S.area) return u.code === S.area;
  if (S.district) return (S.level === 'lao' ? u.districtCode : u.code.slice(0, 4)) === S.district;
  return true;
}
function areaList(ms) {
  const units = unitsFor(ms.level).filter(u => !S.district || (ms.level === 'lao' ? u.districtCode : u.code.slice(0, 4)) === S.district);
  const st = new Map(ms.styles.map(s => [s.code, s]));
  const sorted = [...units].sort((a, b) => (st.get(b.code)?.value ?? -1) - (st.get(a.code)?.value ?? -1));
  const label = ms.kind === 'tier' ? 'ระดับ' : ms.metric.unit;
  return `<section aria-labelledby="h-list"><h3 id="h-list" class="field">${ms.level === 'lao' ? 'อปท.' : 'ตำบล'}${S.district ? ` ใน อ.${esc(D.districtBy.get(S.district).name)}` : 'ทั้งหมด'} · เรียงตาม${ms.kind === 'tier' ? 'ระดับ' : 'ค่ามากไปน้อย'} (${esc(label)})</h3><ul class="area-list">${sorted.map(u => { const s = st.get(u.code) || {}; const nm = ms.level === 'lao' ? u.name : `${u.name} · อ.${u.district}`; return `<li><button type="button" data-area="${u.code}" aria-pressed="${S.area === u.code}"><i style="background:${s.fill || 'var(--surface-card)'}"></i><span>${esc(nm)}</span><span class="num${s.zero ? ' state-zero' : ''}">${ms.kind === 'tier' ? esc(s.label || '—') : (s.value == null ? 'ไม่มีข้อมูล' : n0(s.value))}</span></button></li>`; }).join('')}</ul></section>`;
}
function saveButton(u) {
  if (!u || S.level !== 'tambon') return '';
  const saved = shortlist().some(x => x.code === u.code);
  return `<button type="button" class="btn btn-small" data-action="save-area" data-code="${u.code}" aria-pressed="${saved}">${saved ? 'เล็งไว้แล้ว' : 'เล็งพื้นที่นี้'}</button>`;
}
function elecBars(u) {
  const rows = [['residential', 'บ้านอยู่อาศัย'], ['small', 'กิจการขนาดเล็ก'], ['medium', 'กิจการขนาดกลาง'], ['large', 'กิจการขนาดใหญ่'], ['specific', 'กิจการเฉพาะอย่าง'], ['agri', 'สูบน้ำเกษตร']];
  const tot = sumv(u.elec) || 1; const L = lut('activity');
  return `<div class="bars">${rows.map(([k, t]) => `<div class="bar" role="img" aria-label="${t} ${n0(u.elec[k])} kWh ต่อปี"><span>${t}</span><span class="track"><span class="fill" style="width:${u.elec[k] / tot * 100}%;background:${L[30]}"></span></span><span class="num">${big(u.elec[k])}</span></div>`).join('')}</div>`;
}

/* ---------------- demand panel ---------------- */
function demandPanel(ms, top) {
  const tiers = ms.tiers || computeTiers(S.criteria);
  const counts = { 1: 0, 2: 0, 3: 0 }; for (const v of tiers.res.values()) if (v.tier) counts[v.tier]++;
  const L = lut('activity');
  const opts = METRICS.filter(m => m.group === 'demand');
  const u = areaUnit();
  let html = `${flow()}<header><h2>หาไข่แดงพลังงาน</h2><p class="panel-intro">ตำบลไหนน่าจะใช้พลังงานมากและผ่านเกณฑ์ที่ตั้งไว้ ตัวเลขรายพื้นที่เป็นแบบจำลองจากยอดจังหวัดจริง ใช้จัดลำดับการลงพื้นที่ระหว่างรอข้อมูลจาก กฟภ. และหน่วยงานที่เกี่ยวข้อง</p></header>`;
  html += `<label class="field">ดูอะไรบนแผนที่<select class="select" id="metric-select">${opts.map(m => `<option value="${m.id}"${S.metric === m.id ? ' selected' : ''}>${esc(m.label)} (${esc(m.unit)})</option>`).join('')}<option value="tier"${S.metric === 'tier' ? ' selected' : ''}>ระดับไข่แดงตามเกณฑ์</option></select></label>`;
  const notes = tierNotes(S.criteria);
  html += `<div class="stats">${[1, 2, 3].filter(x => notes[x]).map(x => `<div class="stat"><b>${n0(counts[x])}</b><span><i class="${x === 3 ? 'tier-dash' : ''}" style="background:${L[TIER_IDX[x]]}"></i>${TIER_TH[x]}</span></div>`).join('')}</div>`;
  html += `<details class="card" ${S.metric === 'tier' ? 'open' : ''}><summary><b>เกณฑ์ Demand</b> (${esc(criteriaRev(S.criteria).name)}) · ${esc(criteriaRev(S.criteria).label)}</summary><div class="criteria">${S.criteria.map((c, i) => `<div class="criterion"><label class="field">เงื่อนไข ${i + 1}<select class="select" data-crit-metric="${i}">${opts.map(m => `<option value="${m.id}"${c.metric === m.id ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label><label class="field">อย่างน้อยเปอร์เซ็นไทล์<select class="select" data-crit-p="${i}">${THRESHOLDS.map(p => `<option value="${p}"${c.p === p ? ' selected' : ''}>P${p}</option>`).join('')}</select></label><label class="field">ใช้เงื่อนไขนี้<select class="select" data-crit-on="${i}"><option value="1"${c.on ? ' selected' : ''}>ใช้</option><option value="0"${!c.on ? ' selected' : ''}>ไม่ใช้</option></select></label></div>`).join('')}<p class="meta">${[1, 2, 3].filter(x => notes[x]).map(x => `${notes[x]} = ${TIER_TH[x]}`).join(' · ')} · เปอร์เซ็นไทล์คิดจาก 53 ตำบล · ค่าเริ่มต้น P60 · P60 · P50 เป็นค่าตัวอย่างของเดโม ไม่ใช่เกณฑ์ที่แผนกำหนด ปรับได้ตามที่สำนักงานต้องการ · การเปลี่ยนเกณฑ์ไม่เปลี่ยนตัวเลขของพื้นที่</p><button type="button" class="link-button" data-action="reset-criteria">คืนค่าเกณฑ์เริ่มต้น</button></div></details>`;
  html += u ? areaCard(u, ms, tiers, top) : provinceCard('demand');
  html += areaList(ms);
  return html;
}
function provinceCard(kind) {
  const units = D.areas.tambon.filter(inScope);
  const elec = units.reduce((a, u) => a + sumv(u.elec), 0);
  const pop = units.reduce((a, u) => a + (u.pop || 0), 0);
  const bld = units.reduce((a, u) => a + u.buildings, 0);
  const scope = scopeName();
  if (kind === 'supply') return '';
  return `<article class="card"><div class="card-head"><h3>${esc(scope)}</h3></div><dl class="kv"><dt>ไฟฟ้าทุกประเภท (แบบจำลอง)</dt><dd>${big(elec)} <small>kWh/ปี</small></dd><dt>ประชากร (CityMETER)</dt><dd>${n0(pop)} <small>คน</small></dd><dt>อาคาร</dt><dd>${n0(bld)} <small>หลัง</small></dd></dl><p class="meta">เลือกพื้นที่บนแผนที่หรือในรายการด้านล่าง เพื่อเจาะดูอาคารรายหลังและรูปแบบการใช้ไฟรายเดือน</p>${stamp({ dataset: 'แบบจำลองการใช้พลังงานรายพื้นที่', source: `${PLAN_SRC} + CityMETER`, date: `ยอดปี 2566 · ${REL()}`, boundary: scope, measure: 'modelled' })}</article>`;
}
function topBuildings(top) {
  if (!top || !top.length) return '';
  return `<h4>อาคารที่ใช้ไฟมากที่สุด ${n0(top.length)} หลัง (แบบจำลอง)</h4><ul class="area-list bld-list">${top.map(b => `<li><button type="button" data-building="${esc(b.id)}" aria-pressed="${S.building === b.id}"><i style="background:${b.fill || 'var(--surface-card)'}"></i><span>อาคาร ${esc(b.id.split('-')[1])} · ${esc(CAT_TH[b.cat])} · ${n0(b.area)} ตร.ม.</span><span class="num">${n0(b.kwh)}</span></button></li>`).join('')}</ul><p class="meta">kWh ต่อปี · เลือกอาคารบนแผนที่หรือจากรายการนี้เพื่อดูรายละเอียด</p>`;
}
function areaCard(u, ms, tiers, top) {
  const t = S.level === 'tambon' ? tiers.res.get(u.code)?.tier : null;
  const L = lut('activity');
  const season = D.meta.seasonality;
  const months = season.residential.map((f, i) => u.elec.residential / 12 * f + ((u.elec.small || 0) + (u.elec.medium || 0) + (u.elec.specific || 0)) / 12 * season.business[i] + (u.elec.large || 0) / 12 * season.large[i] + (u.elec.agri || 0) / 12 * season.agri[i]);
  const m = ms.metric; const st = ms.styles?.find(s => s.code === u.code);
  const name = S.level === 'lao' ? u.name : `ต.${u.name}`;
  return `<article class="card" aria-labelledby="h-area"><div class="card-head"><div><h3 id="h-area">${esc(name)}</h3><p class="meta">อ.${esc(u.district || '')} · ${S.level === 'lao' ? 'อปท.' : 'ตำบล'} ${esc(u.code)}</p></div>${t ? `<span class="tier"><i style="background:${L[TIER_IDX[t]]}"></i>${TIER_TH[t]}</span>` : ''}</div>
  ${m && st ? `<p>${esc(m.label)} <b class="num${st.zero ? ' state-zero' : ''}">${st.value == null ? 'ไม่มีข้อมูล' : n0(st.value)}</b> ${esc(m.unit)}${ms.ranks?.get(u.code)?.p != null ? ` · อยู่ที่เปอร์เซ็นไทล์ที่ ${Math.round(ms.ranks.get(u.code).p * 100)} เมื่อเทียบ ${n0(ms.entries.length)} ${ms.level === 'lao' ? 'อปท.' : 'ตำบล'}` : ''}</p>` : ''}
  <dl class="kv"><dt>ประชากร <small>ค่าตัวแทน CityMETER</small></dt><dd>${n0(u.pop)} <small>คน</small></dd><dt>อาคาร <small>ข้อมูลจากแหล่ง</small></dt><dd>${n0(u.buildings)} <small>หลัง</small></dd><dt>ครัวเรือน <small>แบบจำลอง</small></dt><dd>${n0(u.households)}</dd><dt>ไฟฟ้าทุกประเภท <small>แบบจำลอง</small></dt><dd>${big(sumv(u.elec))} <small>kWh/ปี</small></dd><dt>ดีเซล <small>แบบจำลอง</small></dt><dd>${n0(u.fuel.diesel / 12)} <small>ลิตร/เดือน</small></dd><dt>แก๊สโซฮอล์ <small>แบบจำลอง</small></dt><dd>${n0((u.fuel.g95 + u.fuel.g91) / 12)} <small>ลิตร/เดือน</small></dd><dt>LPG ครัวเรือน <small>แบบจำลอง</small></dt><dd>${n0(u.fuel.lpgKg / 12)} <small>กก./เดือน</small></dd><dt>รถจดทะเบียน <small>แบบจำลอง</small></dt><dd>${n0(sumv(u.vehicles))} <small>คัน</small></dd><dt>รถไฟฟ้าและไฮบริด <small>แบบจำลอง</small></dt><dd>${n0((u.vehicles.bev || 0) + (u.vehicles.hybrid || 0))} <small>คัน</small></dd></dl>
  <h4>ไฟฟ้าแยกประเภทผู้ใช้ไฟ</h4>${elecBars(u)}
  <h4>รูปแบบรายเดือน (kWh, แบบจำลอง)</h4>${monthsChart(months, L[30])}
  ${topBuildings(top)}
  <div class="filters">${saveButton(u)}<button type="button" class="btn btn-small btn-quiet" data-action="copy-link">คัดลอกลิงก์มุมมองนี้</button></div>
  ${stamp({ dataset: 'ข้อมูลรายพื้นที่และแบบจำลองการใช้พลังงาน', source: `${PLAN_SRC} หน้า 5–7, 25, 29 · กรมการขนส่งทางบก ณ 28 ก.พ. 2569 · CityMETER`, date: REL(), boundary: `${name} (ขอบเขต CityMETER)`, measure: 'ประชากรเป็นค่าตัวแทน · อาคารเป็นข้อมูลจากแหล่ง · พลังงาน ครัวเรือน และรถเป็นแบบจำลอง' })}
  <p class="meta">ตัวเลขรายพื้นที่เป็นการกระจายยอดจังหวัดตามอาคารและประชากร ใช้จัดลำดับการลงพื้นที่ ไม่ใช่ยอดใช้จริงของพื้นที่</p></article>`;
}
export function buildingCard(b) {
  const L = lut('activity'); const season = D.meta.seasonality[CAT_SEASON[b.cat]];
  const months = season.map(f => b.kwh / 12 * f);
  const t = D.tambonBy.get(b.tambon), l = D.laoBy.get(b.lao);
  const gfa = b.area * Math.max(b.floors, 1);
  return `<article class="card" aria-labelledby="h-bld"><div class="card-head"><div><h3 id="h-bld">อาคาร ${esc(b.id)}</h3><p class="meta">ต.${esc(t?.name)} · ${esc(l?.name)}</p></div><button type="button" class="btn btn-small btn-quiet" data-action="close-building">กลับไปที่พื้นที่</button></div>
  <dl class="kv"><dt>พื้นที่หลังคา</dt><dd>${n0(b.area)} <small>ตร.ม.</small></dd><dt>จำนวนชั้นโดยประมาณ</dt><dd>${n0(b.floors)}</dd><dt>ความสูงโดยประมาณ</dt><dd>${n1(b.height)} <small>ม.</small></dd><dt>พื้นที่ใช้สอยโดยประมาณ</dt><dd>${n0(gfa)} <small>ตร.ม.</small></dd><dt>ประเภทผู้ใช้ไฟ (แบบจำลอง)</dt><dd><small>${CAT_TH[b.cat]}</small></dd><dt>ไฟฟ้า (แบบจำลอง)</dt><dd>${n0(b.kwh)} <small>kWh/ปี</small></dd><dt>เฉลี่ยต่อเดือน</dt><dd>${n0(b.kwh / 12)} <small>kWh</small></dd></dl>
  <h4>รูปแบบรายเดือน (kWh, แบบจำลอง)</h4>${monthsChart(months, L[b.idx ?? 20])}
  <div class="note"><strong>เมื่อได้ข้อมูลจาก กฟภ.</strong> ช่องเหล่านี้จะเป็นค่าจริงรายผู้ใช้ไฟ: บ้านเลขที่และพิกัดมิเตอร์ · ประเภทอัตรา · หน่วยไฟฟ้ารายเดือนหรือรายวัน · ชื่อผู้ใช้ไฟที่เป็นนิติบุคคล (บุคคลธรรมดาไม่แสดงชื่อ)</div>
  <div class="filters"><button type="button" class="btn btn-small btn-quiet" data-action="copy-link">คัดลอกลิงก์อาคารนี้</button></div>
  ${stamp({ dataset: 'รูปอาคาร CityMETER V4 + แบบจำลองการใช้ไฟ', source: `CityMETER · ${PLAN_SRC} หน้า 25`, date: REL(), boundary: `อาคาร ${b.id}`, measure: 'modelled' })}</article>`;
}

/* ---------------- supply panel ---------------- */
function joinNote(r) {
  if (r.join === 'tambon-name-fixed') return ` · ชื่อตำบลในไฟล์ "${esc(r.tambonSource)}" ปรับเป็น ต.${esc(r.tambon)} เพื่อจับคู่ขอบเขต`;
  if (r.join === 'tambon-name-only') return ` · อำเภอในไฟล์คือ ${esc(r.districtSource)} แต่ ต.${esc(r.tambon)} อยู่ใน อ.${esc(r.district)} จึงจับคู่ตามชื่อตำบล`;
  return '';
}
const FUEL_KIND = { 'ก': 'ประเภท ก', 'ค.1': 'ประเภท ค ลักษณะที่ 1', 'ค.2': 'ประเภท ค ลักษณะที่ 2', 'ตู้หยอดเหรียญ': 'ประเภท ง ตู้หยอดเหรียญ' };
function fuelRecord(f) {
  return `<li class="record"><h4>${esc(f.name)}</h4><dl class="kv"><dt>ประเภทกิจการ</dt><dd><small>${esc(FUEL_KIND[f.type] || f.type)}</small></dd><dt>ผู้ประกอบการ</dt><dd><small>${esc(f.ownerKind)}</small></dd><dt>ที่ตั้งตามทะเบียน</dt><dd><small>${esc([f.houseNo && `เลขที่ ${f.houseNo}`, f.moo && `หมู่ ${f.moo}`, `ต.${f.tambon}`, `อ.${f.district}`].filter(Boolean).join(' '))}</small></dd></dl><p class="meta">ชีต ${esc(f.sheet)} แถว ${f.row}${joinNote(f)}</p></li>`;
}
function controlledRecord(c) {
  return `<li class="record"><h4>${esc(c.establishment || c.juristicName)}</h4><dl class="kv"><dt>นิติบุคคล</dt><dd><small>${esc(c.juristicName)}</small></dd><dt>ประเภท</dt><dd><small>${esc(c.kind)} · ${esc(c.industry)}</small></dd><dt>TSIC-ID</dt><dd>${esc(c.tsicId)}</dd><dt>เลขทะเบียนนิติบุคคล</dt><dd>${esc(c.juristicRegNo || '—')}</dd><dt>ที่อยู่</dt><dd><small>${esc(c.address)}</small></dd><dt>กลุ่มในไฟล์</dt><dd><small>${esc(c.group || '—')}</small></dd><dt>ช่องสีในไฟล์</dt><dd><small>${esc((c.colourFlags || []).join(', ') || '—')}</small></dd></dl><p class="meta">ไฟล์ไม่ได้อธิบายความหมายของช่องสี · แถว ${c.row}</p></li>`;
}
function projectRecord(p) {
  const photos = p.photos.map((ph, i) => `<button type="button" data-photo="${esc(p.id)}" data-photo-i="${i}" aria-label="ดูภาพ ${esc(p.technology)} ${esc(p.beneficiary || '')} ต.${esc(p.tambon)}"><img src="assets/photos/${esc(ph.file)}" alt="" width="${ph.w}" height="${ph.h}" loading="lazy"></button>`).join('');
  return `<li class="record"><h4>${esc(p.technology)} · ${esc(p.beneficiary || 'ไม่ระบุผู้ได้รับ')}</h4>${photos ? `<div class="photos">${photos}</div>` : ''}<dl class="kv"><dt>ปีที่เข้าร่วม</dt><dd>${esc(p.yearBE || '—')}</dd><dt>รายละเอียดเทคโนโลยี</dt><dd><small>${esc(p.techDetail || '—')}</small></dd>${p.capacityKw != null ? `<dt>กำลังติดตั้งรวม</dt><dd>${n1(p.capacityKw)} <small>kW · ${n0(p.systems)} ระบบ</small></dd>` : ''}<dt>ผลผลิต</dt><dd><small>${esc(p.output || '—')}</small></dd><dt>สถานะในไฟล์</dt><dd><small>${esc(p.status || '—')}</small></dd><dt>โครงการ</dt><dd><small>${esc(p.projectName)}</small></dd><dt>แหล่งงบประมาณ</dt><dd><small>${esc(p.budgetSource || '—')}</small></dd><dt>หน่วยงานดำเนินการ</dt><dd><small>${esc(p.agency || '—')}</small></dd><dt>ที่ตั้ง</dt><dd><small>${esc([p.houseNo && `เลขที่ ${p.houseNo}`, `ต.${p.tambon}`, `อ.${p.district}`].filter(Boolean).join(' '))}</small></dd>${p.contactName ? `<dt>ผู้ติดต่อ</dt><dd><small>${esc(p.contactName)}</small></dd>` : ''}</dl><p class="meta">ชีต ${esc(p.sheet)} แถว ${p.row}${p.contactPhoneWithheld ? ' · ไม่เผยแพร่เบอร์โทรศัพท์ส่วนบุคคล' : ''}${joinNote(p)}</p></li>`;
}
function supplyPanel(ms) {
  const opts = METRICS.filter(m => m.group === 'supply');
  const u = S.level === 'tambon' ? areaUnit() : null;
  const scope = u ? `ต.${u.name} อ.${u.district}` : scopeName();
  const inS = r => r.tambonCode && (u ? r.tambonCode === u.code : (!S.district || r.tambonCode.slice(0, 4) === S.district));
  const fuel = D.supply.fuel.filter(inS), ctl = D.supply.controlled.filter(inS), prj = D.supply.projects.filter(inS);
  const f = S.supplyFilter;
  let html = `${flow()}<header><h2>กิจการพลังงาน</h2><p class="panel-intro">ทุกช่องจากไฟล์ทะเบียนของ สพจ.ชัยนาท ยกเว้นเบอร์โทรศัพท์ แสดงรายแห่งตามตำบลในไฟล์ ไฟล์ไม่มีพิกัด จึงยังไม่วางจุดรายแห่งบนแผนที่</p></header>`;
  if (S.level === 'lao') html += `<p class="note"><strong>กิจการพลังงานระบุในไฟล์ระดับตำบล</strong> สลับเป็นระดับตำบลเพื่อดูจำนวนบนแผนที่</p>`;
  html += `<label class="field">ดูอะไรบนแผนที่<select class="select" id="supply-metric">${opts.map(m => `<option value="${m.id}"${S.supplyMetric === m.id ? ' selected' : ''}>${esc(m.label)} (${esc(m.unit)})</option>`).join('')}</select></label>`;
  html += `<div class="stats"><div class="stat"><b>${n0(fuel.length)}</b><span>กิจการน้ำมัน</span></div><div class="stat"><b>${n0(ctl.length)}</b><span>อาคาร/โรงงานควบคุม</span></div><div class="stat"><b>${n0(prj.length)}</b><span>โครงการพลังงานทดแทน</span></div></div>`;
  html += `<div class="filters" role="group" aria-label="เลือกชนิดกิจการ">${[['all', 'ทั้งหมด'], ['fuel', 'น้ำมันเชื้อเพลิง'], ['controlled', 'อาคาร/โรงงานควบคุม'], ['projects', 'โครงการพลังงานทดแทน']].map(([k, t]) => `<button type="button" data-supply-filter="${k}" aria-pressed="${f === k}">${t}</button>`).join('')}</div>`;
  if (!u && !S.district) {
    const pp = D.plan.plan.situation.powerPlants, ev = D.plan.plan.situation.evCharging;
    html += `<article class="card"><h3>โรงไฟฟ้าและสถานีอัดประจุตามแผน</h3><ul class="records">${pp.rows.filter(r => r.name).map(r => `<li class="record"><h4>${esc(r.name)}</h4><dl class="kv"><dt>เชื้อเพลิง</dt><dd><small>${esc(r.type)}</small></dd><dt>อำเภอ</dt><dd><small>${esc(r.district || 'ไม่ระบุในแผน')}</small></dd><dt>กำลังผลิตติดตั้ง</dt><dd>${n1(r.mw)} <small>MW</small></dd></dl></li>`).join('')}</ul><p class="meta">แผนระบุโรงไฟฟ้า ${n0(pp.count)} แห่ง แต่ไม่ระบุชื่อโรงไฟฟ้าก๊าซชีวภาพ · สถานีอัดประจุรถไฟฟ้า ${n0(ev.total)} แห่ง: ${ev.rows.map(r => `${esc(r.operator)} ${n0(r.count)}`).join(' · ')} · ไม่มีตำแหน่งรายแห่ง</p>${stamp({ dataset: 'สถานการณ์พลังงานจังหวัด', source: `${PLAN_SRC} หน้า 1, 28–29`, date: 'แผนไม่ระบุวันที่ของข้อมูลชุดนี้ (แผนปี 2566–2570)', boundary: 'จังหวัดชัยนาท', measure: 'reported' })}</article>`;
  }
  const lists = [];
  if (f === 'all' || f === 'fuel') lists.push(`<section><h3 class="field">กิจการน้ำมันเชื้อเพลิง ${n0(fuel.length)} ราย · ${esc(scope)}</h3>${fuel.length ? `<ul class="records">${fuel.slice(0, u ? 999 : 40).map(fuelRecord).join('')}</ul>${!u && fuel.length > 40 ? `<p class="meta">แสดง 40 รายแรก เลือกตำบลเพื่อดูครบทุกราย</p>` : ''}` : '<p class="empty">ไม่มีรายการในไฟล์ (0 ราย)</p>'}</section>`);
  if (f === 'all' || f === 'controlled') lists.push(`<section><h3 class="field">อาคารและโรงงานควบคุม ${n0(ctl.length)} แห่ง</h3>${ctl.length ? `<ul class="records">${ctl.map(controlledRecord).join('')}</ul>` : '<p class="empty">ไม่มีรายการในไฟล์ (0 แห่ง)</p>'}</section>`);
  if (f === 'all' || f === 'projects') lists.push(`<section><h3 class="field">โครงการพลังงานทดแทน ${n0(prj.length)} รายการ</h3>${prj.length ? `<ul class="records">${prj.slice(0, u ? 999 : 30).map(projectRecord).join('')}</ul>${!u && prj.length > 30 ? `<p class="meta">แสดง 30 รายการแรก เลือกตำบลหรือดูภาพทั้งหมดในหน้าที่มา</p>` : ''}` : '<p class="empty">ไม่มีรายการในไฟล์ (0 รายการ)</p>'}</section>`);
  html += lists.join('');
  html += stamp({ dataset: 'ทะเบียนกิจการพลังงาน 3 ไฟล์', source: 'สำนักงานพลังงานจังหวัดชัยนาท', date: 'ได้รับ 16 ต.ค. 2569 · ไฟล์ไม่ระบุวันที่ข้อมูล', boundary: scope, measure: 'observed' });
  html += areaList(ms);
  return html;
}

/* ---------------- opportunity panel ---------------- */
function opportunityPanel(ms) {
  const rows = computeQueue(S.lenses, ms.tiers || computeTiers(S.criteria));
  const scoped = rows.filter(r => !S.district || r.u.code.slice(0, 4) === S.district);
  const counts = { candidate: 0, evidence: 0, none: 0 }; scoped.forEach(r => counts[r.status]++);
  const L = lut('activity');
  let html = `${flow()}<header><h2><span class="phrase">โอกาสส่งเสริม</span><span class="phrase">ตามแผน 2566–2570</span></h2><p class="panel-intro">เลือกได้สูงสุด 3 มุมมอง แต่ละมุมมองอ้างแผนงานหรืออำนาจหน้าที่ของสำนักงาน ระบบจัดคิวเฉพาะตำบลที่ผ่านเกณฑ์ Demand พร้อมเหตุผล งานแรก และสิ่งที่ยังต้องตรวจ เกณฑ์ของแต่ละมุมมองเป็นค่าตัวอย่างของเดโม ปรับได้</p></header>`;
  html += `<fieldset class="card"><legend class="field">มุมมองโอกาส (เลือก ${S.lenses.length}/3)</legend><ul class="lens-list">${LENSES.map(l => `<li><label><input type="checkbox" data-lens="${l.id}"${S.lenses.includes(l.id) ? ' checked' : ''}${!S.lenses.includes(l.id) && S.lenses.length >= 3 ? ' disabled' : ''}><span><b>${esc(l.title)}</b><small>${esc(`${l.plan} · อำนาจหน้าที่ข้อ ${l.mandate.join(', ')}`)}</small><small class="lens-rule">${esc(l.rule)}</small></span></label></li>`).join('')}</ul></fieldset>`;
  html += `<div class="queue-chips" role="group" aria-label="สถานะคิว">${['candidate', 'evidence', 'none'].map(k => `<button type="button" data-queue="${k}" aria-pressed="${S.queue === k}">${QUEUE_TH[k]} · ${n0(counts[k])}</button>`).join('')}</div>`;
  html += `<p class="meta">ข้อมูลไม่พอไม่ได้แปลว่าพื้นที่ไม่เหมาะ · คิวเรียงตามจำนวนมุมมองที่เข้าเกณฑ์ ระดับไข่แดง ลำดับมุมมองที่เลือก แล้วค่าของมุมมองแรก</p>`;
  const list = scoped.filter(r => r.status === S.queue);
  html += list.length ? `<ol class="qcards">${list.map(r => `<li class="qcard"><div class="card-head"><h3>ต.${esc(r.u.name)} <span class="meta">อ.${esc(r.u.district)}</span></h3><span class="status" data-q="${r.status}">${QUEUE_TH[r.status]}</span></div>${r.tier ? `<span class="tier"><i class="${r.tier === 3 ? 'tier-dash' : ''}" style="background:${L[TIER_IDX[r.tier]]}"></i>${TIER_TH[r.tier]}</span>` : ''}${r.results.map(x => `<div><p class="reason"><b>${esc(x.lens.short)}</b> · <span class="status" data-q="${x.status}">${QUEUE_TH[x.status]}</span><br>${esc(x.reason)}</p>${x.task ? `<p class="meta"><b>งานแรก</b> ${esc(x.task)}</p>` : ''}${x.status !== 'none' && x.checks.length ? `<ul>${x.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}</div>`).join('')}<div class="filters"><button type="button" class="btn btn-small" data-area="${r.u.code}">ดูบนแผนที่</button>${saveButton(r.u)}</div></li>`).join('')}</ol>` : `<p class="empty">ไม่มีพื้นที่ในสถานะนี้${S.district ? ' ในอำเภอที่เลือก' : ''}</p>`;
  html += stamp({ dataset: 'คิวโอกาสส่งเสริม', source: `ไฟล์ทะเบียน สพจ.ชัยนาท + แบบจำลองความต้องการ + ${PLAN_SRC}`, date: REL(), boundary: `ตำบลที่ผ่านเกณฑ์ Demand ${n0(scoped.length)} แห่ง${S.district ? ` ใน อ.${D.districtBy.get(S.district).name}` : ' จาก 53 ตำบล จังหวัดชัยนาท'}`, measure: 'modelled' });
  return html;
}

export function renderPanel(ms, extra = '', top = null) {
  const el = $('#panel'); if (!el) return;
  let html = '';
  if (S.view === 'demand') html = demandPanel(ms, top);
  else if (S.view === 'supply') html = supplyPanel(ms);
  else html = opportunityPanel(ms);
  if (extra) html = html.replace('</header>', `</header>${extra}`);
  el.innerHTML = html;
}

/* ---------------- map header ---------------- */
export function renderMapHead(ms) {
  const kick = { demand: 'ความต้องการพลังงาน', supply: 'กิจการพลังงาน', opportunity: 'โอกาสส่งเสริม' }[S.view];
  $('#map-kicker').textContent = `${kick} · CityMETER: Yolk`;
  let title, sub;
  if (S.view === 'opportunity') {
    const rows = computeQueue(S.lenses, ms.tiers).filter(r => !S.district || r.u.code.slice(0, 4) === S.district);
    const c = rows.filter(r => r.status === 'candidate').length;
    title = `${n0(c)} ตำบล${QUEUE_TH.candidate}`; sub = `จาก ${n0(rows.length)} ตำบลที่ผ่านเกณฑ์ Demand · ${scopeName()}`;
  } else if (ms.kind === 'tier') {
    const dem = [...ms.tiers.res.values()].filter(v => v.tier).length;
    title = `ไข่แดงอยู่ที่ไหน · ${n0(dem)} ตำบลผ่านเกณฑ์`; sub = scopeName();
  } else {
    const units = unitsFor(ms.level).filter(inScope);
    let agg;
    if (ms.metric.ratio) { const num = units.reduce((a, u) => a + (ms.metric.ratio.num(u) || 0), 0), den = units.reduce((a, u) => a + (ms.metric.ratio.den(u) || 0), 0); agg = `ทั้งพื้นที่ ${den ? n0(num / den) : '—'} ${ms.metric.unit}`; }
    else if (units.some(u => ms.metric.get(u) == null)) agg = `รวมเฉพาะพื้นที่ที่มีข้อมูล ${n0(units.reduce((a, u) => a + (ms.metric.get(u) || 0), 0))} ${ms.metric.unit}`;
    else agg = `รวม ${n0(units.reduce((a, u) => a + ms.metric.get(u), 0))} ${ms.metric.unit}`;
    title = `${ms.metric.label}`; sub = `${scopeName()} · ${agg} · ${MEASURE_TH[ms.metric.measure]}`;
  }
  $('#map-title').textContent = title; $('#map-sub').textContent = sub;
  const crumbs = [`<button type="button" data-drill="province"${!S.district && !S.area ? ' aria-current="location"' : ''}>จังหวัดชัยนาท</button>`];
  const dCode = S.district || (S.area ? (S.level === 'lao' ? D.laoBy.get(S.area)?.districtCode : S.area.slice(0, 4)) : null);
  if (dCode) crumbs.push(`<span class="sep" aria-hidden="true">›</span><button type="button" data-drill="district" data-code="${dCode}"${!S.area ? ' aria-current="location"' : ''}>อ.${esc(D.districtBy.get(dCode).name)}</button>`);
  if (S.area) { const u = areaUnit(); crumbs.push(`<span class="sep" aria-hidden="true">›</span><button type="button" data-drill="area" data-code="${S.area}"${!S.building ? ' aria-current="location"' : ''}>${esc(S.level === 'lao' ? u.name : 'ต.' + u.name)}</button>`); }
  if (S.building) crumbs.push(`<span class="sep" aria-hidden="true">›</span><button type="button" data-drill="building" aria-current="location">อาคาร ${esc(S.building.split('-')[1])}</button>`);
  $('#drill').innerHTML = crumbs.join(' ');
  $$('[data-level]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.level === S.level)); b.disabled = S.view === 'opportunity' && b.dataset.level === 'lao'; });
  $('#map-attrib').innerHTML = `ขอบเขตและอาคาร: CityMETER (Landometer) อ่าน 18 ต.ค. 2569 · ${esc(REL())}`;
}

/* ---------------- shortlist ---------------- */
export function renderShortlist() {
  const list = shortlist(); const L = lut('activity');
  $('#shortlist-body').innerHTML = list.length ? `<ul class="shortlist">${list.map((x, i) => `<li class="qcard"><div class="card-head"><h2 class="card-title">ต.${esc(x.name)} <span class="meta">อ.${esc(x.district)}</span></h2>${x.tier ? `<span class="tier"><i style="background:${L[TIER_IDX[x.tier]]}"></i>${TIER_TH[x.tier]}</span>` : ''}</div><p class="meta">เล็งไว้ ${esc(new Date(x.savedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }))} · ${esc(x.release)} · เกณฑ์ ${esc(x.criteriaName || x.criteria)}</p><p class="reason">${(x.lenses || []).map(l => `${esc(l.short)}: <span class="status" data-q="${esc(l.status)}">${esc(QUEUE_TH[l.status] || l.status)}</span>`).join(' · ') || 'ยังไม่ได้เลือกมุมมองโอกาส'}</p><div class="request-grid"><label class="field">ผู้รับผิดชอบ<input class="select" data-sl-owner="${i}" value="${esc(x.owner || '')}" maxlength="80" placeholder="ชื่อหรือตำแหน่ง (ไม่บังคับ)"></label><label class="field">งานถัดไป<input class="select" data-sl-next="${i}" value="${esc(x.next || '')}" maxlength="160" placeholder="เช่น นัดสำรวจหลังคา 5 แห่ง"></label></div><div class="filters"><a class="btn btn-small" href="?v=opportunity&a=${encodeURIComponent(x.code)}">เปิดบนแผนที่</a><button type="button" class="btn btn-small btn-quiet" data-sl-remove="${i}">นำออก</button></div></li>`).join('')}</ul>` : `<p class="empty">ยังไม่มีพื้นที่ที่เล็งไว้ เลือกพื้นที่ในหน้าโอกาสส่งเสริมแล้วกด "เล็งพื้นที่นี้"</p>`;
  $('#shortlist-export').disabled = !list.length;
}

/* ---------------- data requests ---------------- */
export function renderRequests() {
  const veh = D.vehicles; const byFuel = {};
  veh.rows.forEach(r => { byFuel[r[1]] = (byFuel[r[1]] || 0) + r[2]; });
  const top = Object.entries(byFuel).sort((a, b) => b[1] - a[1]);
  $('#veh-table').innerHTML = `<table class="lds-table"><caption>รถจดทะเบียนสะสม จังหวัดชัยนาท แยกชนิดเชื้อเพลิง · ณ ${esc(veh.asOfThai)} · หน่วย คัน<br><span class="meta">แหล่ง: ${esc(veh.source)} · ขอบเขต: จังหวัดชัยนาท · ชนิดค่า: ข้อมูลจากแหล่ง</span></caption><thead><tr><th scope="col">ชนิดเชื้อเพลิง</th><th scope="col" class="num">จำนวนรถ (คัน)</th></tr></thead><tbody>${top.map(([k, v]) => `<tr><td data-label="ชนิดเชื้อเพลิง">${esc(k)}</td><td class="num" data-label="จำนวนรถ (คัน)" data-state="${v ? 'measured' : 'measured_zero'}" data-value="${v}"><span class="lds-cell-glyph">${n0(v)}</span>${v ? '' : '<span class="lds-state-label">ศูนย์ นับแล้วไม่มี</span>'}</td></tr>`).join('')}</tbody></table>`;
}

/* ---------------- sources ---------------- */
export function renderSources() {
  const m = D.meta, s = D.supply;
  const items = [
    { t: 'ทะเบียนกิจการพลังงาน 3 ไฟล์ของ สพจ.ชัยนาท', l: 'Observed', d: `${s.sources.map(x => `${x.file} (${n0(x.records)} รายการ, SHA-256 ${x.sha256.slice(0, 12)}…)`).join(' · ')} · ได้รับ 16 ต.ค. 2569 · ไฟล์ไม่ระบุวันที่ข้อมูล · ${esc(s.publicationNote)}` },
    { t: PLAN_SRC, l: 'PARTIAL', d: `${D.plan.plan.labelNote} · อ่าน 18 ต.ค. 2569` },
    { t: 'อำนาจหน้าที่สำนักงานพลังงานจังหวัด', l: 'VERBATIM', d: `${D.plan.mandate.source} · อ่าน 18 ต.ค. 2569` },
    { t: 'รถจดทะเบียนสะสมตามชนิดเชื้อเพลิง', l: 'Observed', d: `${D.vehicles.source} · ณ ${D.vehicles.asOfThai} · ระดับจังหวัด` },
    ...(D.cars ? [{ t: 'รถจดทะเบียนรายเดือน แยกประเภทรถ เชื้อเพลิง และยี่ห้อ', l: 'Observed', d: `${D.cars.source} · ${ymTh(D.cars.months[0])}–${ymTh(D.cars.months[D.cars.months.length - 1])} · ระดับจังหวัด ไม่มีอำเภอหรือตำบล · อ่าน 18 ต.ค. 2569 · ${D.cars.measure} · ตรวจนิยามแล้ว: จักรยานยนต์ไฟฟ้าล้วนที่จดทะเบียน ม.ค. 2563–ก.พ. 2569 รวม ${n0(D.cars.quality.stockCheck.find(s => s.type === '12').registered)} คัน เท่ากับยอดสะสมของกรมการขนส่งทางบก ณ 28 ก.พ. 2569 · การเทียบจังหวัดใช้ ${D.cars.benchmark.universe} · ${D.cars.benchmark.lowCount.provinces.join(' ')} ${D.cars.benchmark.lowCount.note}`, u: D.cars.page }] : []),
    { t: 'ขอบเขตจังหวัด อำเภอ ตำบล และ อปท.', l: 'Observed', d: `${m.layers.boundaries.source} · 8 อำเภอ 53 ตำบล 59 อปท. · อ่าน 18 ต.ค. 2569` },
    { t: 'รูปอาคาร ความสูง และจำนวนชั้นโดยประมาณ', l: 'Observed', d: `${m.layers.buildings.source} · ${n0(m.layers.buildings.count)} หลัง หลังรวมชิ้นอาคารที่ถูกตัดตามขอบแผ่นแผนที่แล้ว (ยอดของ CityMETER ${n0(m.layers.buildings.officialCount)} หลัง)` },
    { t: 'ประชากร โรงงาน และห้องพักรายพื้นที่', l: 'Proxy', d: `ประชากร: ${m.layers.population.source} อ่าน 18 ต.ค. 2569 · ${m.layers.population.versionNote || ''} · โรงงานรุ่น ${m.layers.factory.version} · ชั้นโรงแรมไม่ระบุรุ่น` },
    { t: 'แบบจำลองไฟฟ้า', l: 'Modelled', d: m.model.electricity + ' · ' + m.model.categoryRule },
    { t: 'แบบจำลองน้ำมันและ LPG', l: 'Modelled', d: m.model.fuel },
    { t: 'แบบจำลองรถรายพื้นที่', l: 'Modelled', d: m.model.vehicles },
    { t: 'รูปแบบรายเดือน', l: 'Modelled', d: m.model.monthly }
  ];
  const LABEL_TH = { Observed: 'ข้อมูลจากแหล่ง', PARTIAL: 'ถอดความบางส่วน', VERBATIM: 'คำต่อคำ', Proxy: 'ค่าตัวแทน', Modelled: 'แบบจำลอง' };
  $('#sources-list').innerHTML = items.map(x => `<li><div class="card-head"><h2 class="source-title">${esc(x.t)}</h2><span class="label-pill">${esc(LABEL_TH[x.l])} · ${esc(x.l)}</span></div><p class="muted source-note">${esc(x.d)}${x.u ? ` · <a href="${esc(x.u)}" rel="noopener">เปิดแหล่งข้อมูล</a>` : ''}</p></li>`).join('');
  const all = s.projects.flatMap(p => p.photos.map((ph, i) => ({ p, ph, i })));
  $('#gallery').innerHTML = all.map(({ p, ph, i }) => `<figure><button type="button" data-photo="${esc(p.id)}" data-photo-i="${i}" aria-label="ดูภาพ ${esc(p.technology)} ต.${esc(p.tambon)}"><img src="assets/photos/${esc(ph.file)}" alt="" width="${ph.w}" height="${ph.h}" loading="lazy"></button><figcaption>${esc(p.technology)} · ${esc(p.beneficiary || '')} · ต.${esc(p.tambon)} อ.${esc(p.district)} · ปี ${esc(p.yearBE || '—')} · ${esc(p.status || '')}</figcaption></figure>`).join('');
  $('#gallery-count').textContent = `${n0(all.length)} ภาพจากไฟล์โครงการพลังงานในพื้นที่ · ภาพ: สำนักงานพลังงานจังหวัดชัยนาท`;
}
export function photoDialog(projectId, i) {
  const p = D.supply.projects.find(x => x.id === projectId); if (!p) return;
  const ph = p.photos[+i || 0];
  $('#photo-body').innerHTML = `<img src="assets/photos/${esc(ph.file)}" alt="${esc(`${p.technology} ${p.beneficiary || ''} ต.${p.tambon} อ.${p.district}`)}" width="${ph.w * 2}" height="${ph.h * 2}"><p><b>${esc(p.technology)}</b> · ${esc(p.beneficiary || '')} · ต.${esc(p.tambon)} อ.${esc(p.district)}</p><p class="meta">${esc(p.projectName)} · ปี ${esc(p.yearBE || '—')} · ${esc(p.techDetail || '')} · สถานะในไฟล์ ${esc(p.status || '—')} · ภาพ: สำนักงานพลังงานจังหวัดชัยนาท (ไฟล์ต้นทาง) ขนาดภาพเท่าที่มีในไฟล์</p>`;
  $('#photo-dialog').showModal();
}
export { VIEW_TH };
