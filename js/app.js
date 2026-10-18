/* Boot, router and interactions. Views are URL-addressable (permalink) and Back/Forward restores them. */
import { D, S, $, $$, esc, n0, token, loadCore, loadGeo, readURL, writeURL, VIEWS, VIEW_TH, getThemeChoice, setThemeChoice, effectiveTheme, toast, LENSES, DEFAULT_CRITERIA, computeTiers, computeQueue, criteriaRev, shortlist, saveShortlist, percentileLut, lut, QUEUE_TH } from './core.js';
import { initMap, mapReady, setUnits, fitTo, setDistrictFocus, setBuildings, buildingsForArea, selectBuilding, flyToBuilding, setPitch3d, get3d, isPitched, zoomBy, resize } from './map.js';
import { renderOverview, renderPanel, renderLegend, toggleLegend, renderMapHead, mapStyles, buildingCard, renderShortlist, renderRequests, renderSources, photoDialog } from './views.js';

const MAP_VIEWS = ['demand', 'supply', 'opportunity'];
let mapFailed = false, areaBuildings = [], lastArea = null;

function setTitle() { document.title = `${VIEW_TH[S.view]} · CityMETER: Yolk`; }
function themeMeta() {
  const dark = effectiveTheme() === 'dark';
  const canvas = mode => token(`--ldm-foundation-surface-canvas-${mode}`);
  $$('meta[name="theme-color"]').forEach(m => { if (getThemeChoice() === 'auto') { m.setAttribute('content', canvas(m.dataset.media)); m.setAttribute('media', `(prefers-color-scheme: ${m.dataset.media})`); } else { m.setAttribute('content', canvas(dark ? 'dark' : 'light')); m.removeAttribute('media'); } });
}
function showView() {
  const key = MAP_VIEWS.includes(S.view) ? 'map' : S.view;
  $$('main > .view').forEach(v => { v.hidden = v.id !== `view-${key}`; });
  $$('.rail a').forEach(a => { if (a.dataset.view === S.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  setTitle();
}
/* keep keyboard focus on the same control when a panel is re-rendered */
function focusKey(el) {
  if (!el || el === document.body || !$('#panel')?.contains(el)) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  for (const a of ['data-area', 'data-building', 'data-lens', 'data-queue', 'data-supply-filter', 'data-crit-metric', 'data-crit-p', 'data-crit-on', 'data-action', 'data-photo', 'data-nav']) if (el.hasAttribute(a)) return `[${a}="${CSS.escape(el.getAttribute(a))}"]`;
  return null;
}
async function renderMap(opts = {}) {
  const ms = mapStyles();
  if (ms.level !== S.level) {
    // the metric or view is only available at the other grain: the selected area belongs to the old grain, so clear it
    S.level = ms.level; S.area = null; S.building = null; lastArea = null; writeURL(false);
  }
  renderMapHead(ms);
  let extra = '', bInfo = null, top = null, bldNote = '';
  if (!mapFailed) {
    try {
      await mapReady();
      setUnits(ms.level, ms.styles, { selected: S.area, hideFillFor: S.area });
      setDistrictFocus(S.district);
    } catch (e) { console.error(e); mapFailed = true; showMapFallback(); }
  }
  if (S.area) {
    try {
      if (lastArea !== `${S.level}:${S.area}`) { areaBuildings = await buildingsForArea(S.level, S.area); lastArea = `${S.level}:${S.area}`; }
      const ranks = percentileLut(areaBuildings.map(b => ({ key: b.id, value: b.kwh, state: b.kwh > 0 ? 'measured' : 'measured_zero' })));
      const L = lut('activity');
      areaBuildings.forEach(b => { b.idx = ranks.get(b.id).idx; b.fill = L[b.idx]; });
      if (areaBuildings.length) {
        const vals = areaBuildings.map(b => b.kwh);
        bInfo = { n: areaBuildings.length, lo: Math.min(...vals), hi: Math.max(...vals) };
        top = [...areaBuildings].sort((a, b) => b.kwh - a.kwh || a.id.localeCompare(b.id)).slice(0, 10);
      }
    } catch (e) { console.error(e); areaBuildings = []; lastArea = null; bldNote = '<p class="note" role="status">โหลดรูปอาคารของพื้นที่นี้ไม่สำเร็จ ตัวเลขระดับพื้นที่ยังใช้ได้ ลองเลือกพื้นที่อีกครั้ง</p>'; }
  } else { areaBuildings = []; lastArea = null; }
  if (!mapFailed) {
    try {
      setBuildings(S.area ? areaBuildings : [], S.building);
      if (opts.fit) {
        const pitch = get3d() ? 50 : 0;
        if (S.building) { const b = areaBuildings.find(x => x.id === S.building); if (b) flyToBuilding(b); else fitTo(S.level, S.area, { pitch }); }
        else if (S.area) fitTo(S.level, S.area, { pitch, padding: 40 });
        else if (S.district) fitTo('district', S.district, { padding: 32 });
        else fitTo('province', null, { padding: 24 });
      }
    } catch (e) { console.error(e); }
  }
  renderLegend(ms, bInfo);
  if (S.building) {
    const b = areaBuildings.find(x => x.id === S.building);
    if (b) extra = buildingCard(b); else { S.building = null; writeURL(false); }
  }
  const key = focusKey(document.activeElement);
  renderPanel(ms, extra + bldNote, top);
  if (key) { const el = $(`#panel ${key}`); if (el) el.focus({ preventScroll: true }); }
}
function showMapFallback() {
  const w = $('#map'); if (!w) return;
  w.innerHTML = `<div class="map-fallback" role="note"><p>แผนที่แสดงผลไม่ได้ในเบราว์เซอร์นี้ ข้อมูลทุกพื้นที่ยังอ่านได้ในแผงรายละเอียด</p></div>`;
  $$('.map-tools').forEach(el => { el.hidden = true; });
}
async function go(changes = {}, { push = true, fit = false } = {}) {
  const prevView = S.view;
  Object.assign(S, changes);
  if (changes.view && !MAP_VIEWS.includes(changes.view)) { /* keep map selection for later */ }
  writeURL(push);
  showView();
  if (MAP_VIEWS.includes(S.view)) {
    await ensureMap();
    if (prevView !== S.view && !MAP_VIEWS.includes(prevView)) fit = true;
    resize();
    await renderMap({ fit });
  } else if (S.view === 'shortlist') renderShortlist();
  else if (S.view === 'sources') renderSources();
  else if (S.view === 'requests') renderRequests();
  if (changes.view && changes.view !== prevView) { const h = $(`#view-${MAP_VIEWS.includes(S.view) ? 'map' : S.view} h1`); if (h) { h.tabIndex = -1; h.focus({ preventScroll: false }); } }
}
let mapInit = null;
async function ensureMap() {
  if (mapInit) return mapInit;
  mapInit = (async () => {
    try {
      await loadGeo();
      await initMap($('#map'), async p => {
        if (p.type === 'area') await go({ area: p.code === S.area ? S.area : p.code, building: null, district: null }, { fit: p.code !== S.area });
        else if (p.type === 'building') { await go({ building: p.id }); const b = areaBuildings.find(x => x.id === p.id); if (b) selectBuilding(b.id); }
      });
    } catch (e) { console.error(e); mapFailed = true; showMapFallback(); }
  })();
  return mapInit;
}
function saveArea(code) {
  const u = D.tambonBy.get(code); if (!u) return;
  const list = shortlist();
  const i = list.findIndex(x => x.code === code);
  if (i >= 0) { list.splice(i, 1); saveShortlist(list); toast(`นำ ต.${u.name} ออกจากพื้นที่ที่เล็งไว้`); return; }
  const tiers = computeTiers(S.criteria); const row = computeQueue(S.lenses, tiers).find(r => r.u.code === code);
  const cr = criteriaRev(S.criteria);
  list.unshift({ code, name: u.name, district: u.district, tier: tiers.res.get(code)?.tier ?? null, lenses: row ? row.results.map(r => ({ id: r.lens.id, short: r.lens.short, status: r.status })) : [], criteria: cr.rev, criteriaName: cr.name, release: `ข้อมูลรอบ ${D.meta.release.dateThai} · เครื่องคิด ${D.meta.release.engine}`, savedAt: new Date().toISOString(), owner: '', next: row?.cands[0]?.task || '' });
  if (!saveShortlist(list.slice(0, 60))) toast('เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกถาวร รายการจะอยู่จนกว่าจะปิดหน้านี้'); else toast(`เล็ง ต.${u.name} ไว้แล้ว ดูได้ที่เมนูเล็งไว้`);
}
function exportShortlist() {
  const list = shortlist(); if (!list.length) return;
  // quote every cell and neutralise leading = + - @ so typed text cannot run as a spreadsheet formula
  const q = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  const rows = [['ตำบล', 'อำเภอ', 'ระดับไข่แดง', 'มุมมองและสถานะ', 'ผู้รับผิดชอบ', 'งานถัดไป', 'เกณฑ์', 'รอบข้อมูล', 'เล็งเมื่อ'], ...list.map(x => [x.name, x.district, x.tier ? ['', 'ไข่แดงเข้ม', 'ไข่แดง', 'ไข่ขาว'][x.tier] : 'ไม่ผ่านเกณฑ์', (x.lenses || []).map(l => `${l.short}: ${QUEUE_TH[l.status] || l.status}`).join('; '), x.owner, x.next, x.criteriaName || x.criteria, x.release, x.savedAt])];
  const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chainat-energy-shortlist.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('ดาวน์โหลดรายการที่เล็งไว้แล้ว');
}
function bind() {
  document.addEventListener('click', async e => {
    const a = e.target.closest('a[href^="?"]');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      const q = new URLSearchParams(a.getAttribute('href').slice(1));
      const v = q.get('v') || 'overview'; const changes = { view: VIEWS.includes(v) ? v : 'overview' };
      if (q.get('lens')) changes.lenses = q.get('lens').split(',').filter(id => LENSES.some(l => l.id === id)).slice(0, 3);
      if (q.get('a') && D.tambonBy.has(q.get('a'))) Object.assign(changes, { level: 'tambon', area: q.get('a'), district: null, building: null });
      await go(changes, { fit: !!changes.area }); return;
    }
    const t = e.target.closest('button, [data-photo]'); if (!t) return;
    if (t.dataset.photo) { photoDialog(t.dataset.photo, t.dataset.photoI); return; }
    if (t.classList.contains('legend-toggle')) { toggleLegend(); return; }
    if (t.dataset.building) { await go({ building: t.dataset.building }, { fit: true }); return; }
    if (t.dataset.area) { await go({ area: t.dataset.area, district: null, building: null, level: D.tambonBy.has(t.dataset.area) && S.level === 'tambon' ? 'tambon' : S.level }, { fit: true }); return; }
    if (t.dataset.drill) {
      const k = t.dataset.drill;
      if (k === 'province') await go({ district: null, area: null, building: null }, { fit: true });
      else if (k === 'district') await go({ district: t.dataset.code, area: null, building: null }, { fit: true });
      else if (k === 'area') await go({ building: null }, { fit: true });
      return;
    }
    if (t.dataset.level) { if (t.dataset.level !== S.level) await go({ level: t.dataset.level, area: null, building: null }, { fit: false }); return; }
    if (t.dataset.supplyFilter) { await go({ supplyFilter: t.dataset.supplyFilter }, { push: false }); return; }
    if (t.dataset.queue) { await go({ queue: t.dataset.queue }, { push: false }); return; }
    if (t.dataset.slRemove != null) { const list = shortlist(); list.splice(+t.dataset.slRemove, 1); saveShortlist(list); renderShortlist(); toast('นำออกแล้ว'); return; }
    switch (t.dataset.action) {
      case 'save-area': saveArea(t.dataset.code); await renderMap(); break;
      case 'copy-link': try { await navigator.clipboard.writeText(location.href); toast('คัดลอกลิงก์มุมมองนี้แล้ว'); } catch { toast('คัดลอก URL จากแถบที่อยู่ของเบราว์เซอร์ได้'); } break;
      case 'close-building': await go({ building: null }, { fit: true }); break;
      case 'reset-criteria': await go({ criteria: DEFAULT_CRITERIA.map(c => ({ ...c })) }, { push: false }); break;
    }
    if (t.id === 'zoom-in') zoomBy(1);
    if (t.id === 'zoom-out') zoomBy(-1);
    if (t.id === 'map-3d') { const on = !isPitched(); setPitch3d(on); t.setAttribute('aria-pressed', String(on)); }
    if (t.id === 'map-reset') await go({ district: null, area: null, building: null }, { fit: true });
    if (t.id === 'shortlist-export') exportShortlist();
    if (t.id === 'photo-close') $('#photo-dialog').close();
  });
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'metric-select') await go({ metric: t.value }, { push: false });
    else if (t.id === 'supply-metric') await go({ supplyMetric: t.value, level: 'tambon' }, { push: false });
    else if (t.dataset.lens) {
      const set = new Set(S.lenses); if (t.checked) set.add(t.dataset.lens); else set.delete(t.dataset.lens);
      const lenses = LENSES.map(l => l.id).filter(id => set.has(id)).slice(0, 3);
      if (!lenses.length) toast('ต้องเลือกอย่างน้อยหนึ่งมุมมอง');
      await go({ lenses: lenses.length ? lenses : [t.dataset.lens] }, { push: false });
    } else if (t.dataset.critMetric != null || t.dataset.critP != null || t.dataset.critOn != null) {
      const c = S.criteria.map(x => ({ ...x }));
      if (t.dataset.critMetric != null) c[+t.dataset.critMetric].metric = t.value;
      if (t.dataset.critP != null) c[+t.dataset.critP].p = +t.value;
      if (t.dataset.critOn != null) c[+t.dataset.critOn].on = t.value === '1';
      if (!c.some(x => x.on)) { toast('ต้องมีอย่างน้อยหนึ่งเงื่อนไข'); await renderMap(); return; }
      await go({ criteria: c }, { push: false });
    } else if (t.id === 'theme-select') { setThemeChoice(t.value); themeMeta(); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.slOwner != null || t.dataset.slNext != null) {
      const list = shortlist(); const i = +(t.dataset.slOwner ?? t.dataset.slNext);
      if (!list[i]) return;
      if (t.dataset.slOwner != null) list[i].owner = t.value.slice(0, 80); else list[i].next = t.value.slice(0, 160);
      saveShortlist(list);
    }
  });
  window.addEventListener('popstate', async () => { readURL(); showView(); if (MAP_VIEWS.includes(S.view)) { await ensureMap(); resize(); await renderMap({ fit: true }); } else if (S.view === 'shortlist') renderShortlist(); else if (S.view === 'sources') renderSources(); else if (S.view === 'requests') renderRequests(); });
  $('#photo-dialog').addEventListener('click', e => { if (e.target === $('#photo-dialog')) $('#photo-dialog').close(); });
  document.addEventListener('themechange', () => { if (MAP_VIEWS.includes(S.view)) renderMap(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeMeta);
  window.addEventListener('resize', () => resize());
}
async function boot() {
  const sel = $('#theme-select'); sel.value = getThemeChoice(); themeMeta();
  try {
    await loadCore();
    readURL();
    renderOverview();
    bind();
    showView();
    if (MAP_VIEWS.includes(S.view)) { await ensureMap(); resize(); await renderMap({ fit: true }); }
    else if (S.view === 'shortlist') renderShortlist(); else if (S.view === 'sources') renderSources(); else if (S.view === 'requests') renderRequests();
    document.documentElement.dataset.ready = 'true';
  } catch (e) {
    console.error(e);
    const n = document.createElement('p'); n.className = 'note'; n.setAttribute('role', 'alert'); n.textContent = 'โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง';
    ($('main .view:not([hidden])') || document.body).prepend(n);
    document.documentElement.dataset.ready = 'error';
  }
}
boot();
