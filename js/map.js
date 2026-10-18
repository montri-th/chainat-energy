/* Map: MapLibre GL 4.7.1 (vendored, BSD-3-Clause) with CityMETER boundaries and buildings.
   Analytical fills come from the exact LDS LUT; boundary, casing and selection colours come from LDS foundation/map tokens. */
import { D, $, esc, n0, token, loadBuildings, effectiveTheme } from './core.js';
import { initBasemaps } from './basemaps.js';

let map = null, ready = null, markers = [], hoverCode = null, pick = () => {}, is3d = true, current = { level: 'tambon', area: null, district: null };
const EMPTY = { type: 'FeatureCollection', features: [] };
const NARROW = matchMedia('(max-width: 899px)');
const PHONE = matchMedia('(max-width: 599px)');
const T = () => ({
  bg: token('--surface-alt'), land: token('--surface-card'), casing: token('--map-casing'), line: token('--map-boundary'),
  province: token('--map-province'), selected: token('--map-selected'), hover: token('--map-hover'), zero: token('--state-measured-zero-outline'),
  ink: token('--text-primary'), ink2: token('--text-secondary')
});
function bboxOf(geom) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = c => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else c.forEach(walk); };
  walk(geom.coordinates); return [[x0, y0], [x1, y1]];
}
function unionBbox(list) { return list.reduce((a, b) => [[Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])], [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])]], [[180, 90], [-180, -90]]); }
function centroidOf(geom) {
  // area-weighted centroid of the largest ring (good enough for label placement)
  const rings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(p => p[0]);
  let best = null, bestA = -1;
  for (const r of rings) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < r.length - 1; i++) { const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; a += f; cx += (r[i][0] + r[i + 1][0]) * f; cy += (r[i][1] + r[i + 1][1]) * f; }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = a ? [cx / (3 * a), cy / (3 * a)] : r[0]; }
  }
  return best;
}
export function mapReady() { return ready; }
export function initMap(container, onPick) {
  if (ready) return ready;
  pick = onPick;
  ready = new Promise((resolve, reject) => {
    if (!window.maplibregl) { reject(new Error('maplibre missing')); return; }
    const c = T();
    try {
      map = new maplibregl.Map({
        container, attributionControl: false, dragRotate: true, pitchWithRotate: true, maxPitch: 60, renderWorldCopies: false,
        cooperativeGestures: NARROW.matches,
        locale: { 'Map.Title': 'แผนที่จังหวัดชัยนาท', 'Marker.Title': 'ป้ายบนแผนที่', 'CooperativeGesturesHandler.WindowsHelpText': 'กด Ctrl ค้างแล้วเลื่อนเพื่อซูมแผนที่', 'CooperativeGesturesHandler.MacHelpText': 'กด ⌘ ค้างแล้วเลื่อนเพื่อซูมแผนที่', 'CooperativeGesturesHandler.MobileHelpText': 'ใช้สองนิ้วเพื่อเลื่อนแผนที่' },
        bounds: bboxOf(D.geo.province.features[0].geometry), fitBoundsOptions: { padding: 24 },
        style: {
          version: 8,
          sources: { province: { type: 'geojson', data: D.geo.province }, district: { type: 'geojson', data: D.geo.district }, units: { type: 'geojson', data: EMPTY, promoteId: 'code' }, bld: { type: 'geojson', data: EMPTY, promoteId: 'id' } },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
            { id: 'land', type: 'fill', source: 'province', paint: { 'fill-color': c.land } },
            // Invisible hit target keeps area picking available when presentation colours are hidden.
            { id: 'units-hit', type: 'fill', source: 'units', paint: { 'fill-color': c.land, 'fill-opacity': 0 } },
            { id: 'units-fill', type: 'fill', source: 'units', paint: { 'fill-color': ['coalesce', ['get', 'fill'], c.land] } },
            { id: 'units-casing', type: 'line', source: 'units', paint: { 'line-color': c.casing, 'line-width': 3 } },
            { id: 'units-line', type: 'line', source: 'units', paint: { 'line-color': c.line, 'line-width': 1 } },
            { id: 'units-zero', type: 'line', source: 'units', filter: ['==', ['get', 'zero'], true], paint: { 'line-color': c.zero, 'line-width': 2, 'line-offset': 1.5 } },
            // non-colour cues: dashed inset for ไข่ขาว (near-white LUT start), heavy inset for ชวนสำรวจ
            { id: 'units-dash', type: 'line', source: 'units', filter: ['==', ['get', 'dash'], true], paint: { 'line-color': c.ink2, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 11, 1.5], 'line-offset': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 11, 2.5], 'line-dasharray': [2, 1.5] } },
            { id: 'units-strong', type: 'line', source: 'units', filter: ['==', ['get', 'strong'], true], paint: { 'line-color': c.ink, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.75, 11, 3], 'line-offset': ['interpolate', ['linear'], ['zoom'], 8, 1, 11, 1.5] } },
            { id: 'district-line', type: 'line', source: 'district', paint: { 'line-color': c.province, 'line-width': 1.6 } },
            { id: 'province-line', type: 'line', source: 'province', paint: { 'line-color': c.province, 'line-width': 2.4 } },
            { id: 'units-hover', type: 'line', source: 'units', filter: ['==', ['get', 'code'], ''], paint: { 'line-color': c.hover, 'line-width': 2.5 } },
            { id: 'units-sel', type: 'line', source: 'units', filter: ['==', ['get', 'code'], ''], paint: { 'line-color': c.selected, 'line-width': 3.5 } },
            { id: 'bld', type: 'fill-extrusion', source: 'bld', paint: { 'fill-extrusion-color': ['coalesce', ['get', 'fill'], c.land], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 1 } },
            { id: 'bld-sel', type: 'line', source: 'bld', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': c.selected, 'line-width': 3 } }
          ]
        }
      });
    } catch (e) { reject(e); return; }
    map.on('load', () => { initBasemaps(map); resolve(map); });
    // the 3D button reports the camera as it is, including after a fit that flattens the view
    map.on('pitchend', () => { const b = document.getElementById('map-3d'); if (b) b.setAttribute('aria-pressed', String(map.getPitch() > 5)); });
    // on narrow screens the page scrolls past the map: one finger scrolls the page, two fingers move the map
    NARROW.addEventListener('change', () => { try { if (NARROW.matches) map.cooperativeGestures.enable(); else map.cooperativeGestures.disable(); } catch (e) { /* older runtime */ } });
    if ('ResizeObserver' in window) new ResizeObserver(() => map && map.resize()).observe(container);
    map.on('error', e => console.warn('[map]', e && e.error && e.error.message));
    map.on('mousemove', 'units-hit', e => { const f = e.features && e.features[0]; const code = f ? f.properties.code : null; if (code !== hoverCode) { hoverCode = code; map.setFilter('units-hover', ['==', ['get', 'code'], code || '']); map.getCanvas().style.cursor = code ? 'pointer' : ''; } });
    map.on('mouseleave', 'units-hit', () => { hoverCode = null; map.setFilter('units-hover', ['==', ['get', 'code'], '']); map.getCanvas().style.cursor = ''; });
    map.on('click', e => {
      const b = map.queryRenderedFeatures(e.point, { layers: ['bld'] });
      if (b.length) { pick({ type: 'building', id: b[0].properties.id }); return; }
      const u = map.queryRenderedFeatures(e.point, { layers: ['units-hit'] });
      if (u.length) pick({ type: 'area', code: u[0].properties.code });
    });
    map.on('zoomend', placeLabels);
  });
  document.addEventListener('themechange', applyTheme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  return ready;
}
function applyTheme() {
  if (!map || !map.getLayer('land')) return;
  const c = T();
  map.setPaintProperty('bg', 'background-color', c.bg);
  map.setPaintProperty('land', 'fill-color', c.land);
  map.setPaintProperty('units-casing', 'line-color', c.casing);
  map.setPaintProperty('units-line', 'line-color', c.line);
  map.setPaintProperty('units-zero', 'line-color', c.zero);
  map.setPaintProperty('district-line', 'line-color', c.province);
  map.setPaintProperty('province-line', 'line-color', c.province);
  map.setPaintProperty('units-hover', 'line-color', c.hover);
  map.setPaintProperty('units-sel', 'line-color', c.selected);
  map.setPaintProperty('bld-sel', 'line-color', c.selected);
  map.setPaintProperty('units-dash', 'line-color', c.ink2);
  map.setPaintProperty('units-strong', 'line-color', c.ink);
  map.setPaintProperty('units-fill', 'fill-color', ['coalesce', ['get', 'fill'], c.land]);
}
/* units: [{code, fill (#HEX or null), zero, label, value}] */
export function setUnits(level, unitStyles, { selected = null, hideFillFor = null } = {}) {
  if (!map) return;
  const fc = level === 'lao' ? D.geo.lao : D.geo.tambon;
  const byCode = new Map(unitStyles.map(s => [s.code, s]));
  const feats = fc.features.map(f => {
    const s = byCode.get(f.properties.code) || {};
    return { type: 'Feature', id: f.properties.code, geometry: f.geometry, properties: { code: f.properties.code, name: f.properties.name, fill: f.properties.code === hideFillFor ? null : (s.fill || null), zero: !!s.zero && f.properties.code !== hideFillFor, dash: !!s.dash && f.properties.code !== hideFillFor, strong: !!s.strong } };
  });
  map.getSource('units').setData({ type: 'FeatureCollection', features: feats });
  map.setFilter('units-fill', hideFillFor ? ['!=', ['get', 'code'], hideFillFor] : null);
  map.setFilter('units-sel', ['==', ['get', 'code'], selected || '']);
  current.level = level; current.labels = unitStyles; current.selected = selected;
  placeLabels();
}
export function setDistrictFocus(code) { current.district = code; placeLabels(); }
function placeLabels() {
  if (!map) return;
  markers.forEach(m => m.remove()); markers = [];
  const z = map.getZoom();
  const fc = current.level === 'lao' ? D.geo.lao : D.geo.tambon;
  const styles = new Map((current.labels || []).map(s => [s.code, s]));
  const show = [];
  if (current.selected) show.push(current.selected);
  else if (current.district || z >= 10.4) {
    for (const f of fc.features) { const code = f.properties.code; const dc = current.level === 'lao' ? (D.laoBy.get(code) || {}).districtCode : code.slice(0, 4); if (!current.district || dc === current.district) show.push(code); }
  }
  if (!show.length) {
    for (const f of D.geo.district.features) {
      const el = document.createElement('div'); el.className = 'map-label'; el.innerHTML = `${esc(f.properties.name)}`;
      markers.push(new maplibregl.Marker({ element: el }).setLngLat(centroidOf(f.geometry)).addTo(map));
    }
    return;
  }
  for (const code of show) {
    const f = fc.features.find(x => x.properties.code === code); if (!f) continue;
    const s = styles.get(code) || {};
    const el = document.createElement('div'); el.className = 'map-label'; el.dataset.selected = String(code === current.selected);
    const nm = f.properties.name.replace('องค์การบริหารส่วนตำบล ', 'อบต.').replace('เทศบาลตำบล ', 'ทต.').replace('เทศบาลเมือง ', 'ทม.');
    el.innerHTML = `${esc(nm)}${s.label ? `<b>${esc(s.label)}</b>` : ''}`;
    markers.push(new maplibregl.Marker({ element: el }).setLngLat(centroidOf(f.geometry)).addTo(map));
  }
}
export function fitTo(kind, code, opts = {}) {
  if (!map) return;
  let geoms = [];
  if (kind === 'province') geoms = [D.geo.province.features[0].geometry];
  else if (kind === 'district') geoms = [D.geo.district.features.find(f => f.properties.code === code)?.geometry];
  else if (kind === 'tambon') geoms = [D.geo.tambon.features.find(f => f.properties.code === code)?.geometry];
  else if (kind === 'lao') geoms = [D.geo.lao.features.find(f => f.properties.code === code)?.geometry];
  geoms = geoms.filter(Boolean); if (!geoms.length) return;
  const bb = unionBbox(geoms.map(bboxOf));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  map.resize();
  const pad = opts.padding ?? 48;
  // phones: the tool row sits across the top of the map, so leave room for it
  const padding = PHONE.matches ? { top: 64, right: 12, bottom: 12, left: 12 } : pad;
  map.fitBounds(bb, { padding, pitch: opts.pitch ?? 0, bearing: 0, duration: reduce ? 0 : 700, maxZoom: opts.maxZoom ?? 15.5 });
}
export function setPitch3d(on) { is3d = on; if (map) map.easeTo({ pitch: on ? 50 : 0, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 }); }
export function get3d() { return is3d; }
export function isPitched() { return !!map && map.getPitch() > 5; }
export function zoomBy(d) { if (map) map.easeTo({ zoom: map.getZoom() + d, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 }); }
export function resize() { if (map) map.resize(); }
/* buildings: list of {id, ring, height, fill} */
export function setBuildings(list, selectedId = null) {
  if (!map) return;
  const feats = list.map(b => ({ type: 'Feature', id: b.id, properties: { id: b.id, h: Math.max(3, b.height || b.floors * 3 || 3), fill: b.fill || null }, geometry: { type: 'Polygon', coordinates: [b.ring] } }));
  map.getSource('bld').setData({ type: 'FeatureCollection', features: feats });
  current.bld = new Map(list.map(b => [b.id, b]));
  selectBuilding(selectedId);
}
let pin = null;
export function selectBuilding(id) {
  if (!map) return;
  map.setFilter('bld-sel', ['==', ['get', 'id'], id || '']);
  if (pin) { pin.remove(); pin = null; }
  const b = id && current.bld && current.bld.get(id); if (!b) return;
  const xs = b.ring.map(p => p[0]), ys = b.ring.map(p => p[1]);
  const el = document.createElement('div'); el.className = 'bld-pin'; el.innerHTML = '<span>อาคารที่เลือก</span><i></i>';
  pin = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]).addTo(map);
}
export async function buildingsForArea(level, code) {
  if (level === 'lao') return loadBuildings(code);
  const laos = Object.entries(D.bindex.laoTambons).filter(([, ts]) => ts.includes(code)).map(([l]) => l);
  const lists = await Promise.all(laos.map(loadBuildings));
  return lists.flat().filter(b => b.tambon === code);
}
export function flyToBuilding(b) {
  if (!map || !b) return;
  const xs = b.ring.map(p => p[0]), ys = b.ring.map(p => p[1]);
  map.easeTo({ center: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], zoom: Math.max(map.getZoom(), 16.2), pitch: is3d ? 50 : 0, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600 });
}
export function themeNow() { return effectiveTheme(); }
