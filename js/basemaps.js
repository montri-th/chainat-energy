/* Display context only: provider imagery never enters the model or evidence register.
   No tile prefetch/offline archive. Analytical fills retain the exact LDS colours. */
import { effectiveTheme } from './core.js';

export const BASEMAPS = Object.freeze({
  analysis: { label: 'พื้นวิเคราะห์', external: false },
  simplified: { label: 'ถนนแบบเรียบ', external: true },
  detailed: { label: 'ถนนละเอียด', external: true },
  satellite: { label: 'ดาวเทียม 2021 · 10 ม.', external: true }
});
export const ROAD_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const SATELLITE_TILES = 'https://wmts.terrascope.be/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=esa-worldcover-s2rgbnir-10m-2021-v2_tcc&STYLE=default&TILEMATRIXSET=EPSG%3A3857&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&FORMAT=image%2Fpng&TIME=2021-01-01';
const KEY = 'chainat-energy-map-display-v1';
export function validDisplay(value) {
  return { basemap: Object.hasOwn(BASEMAPS, value?.basemap) ? value.basemap : 'analysis', areaColours: value?.areaColours !== false };
}
export function initBasemaps(map) {
  let stored; try { stored = JSON.parse(localStorage.getItem(KEY)); } catch { /* unavailable or invalid storage */ }
  const state = validDisplay(stored);
  let active = 'analysis', failed = false, loading = false, timeout, generation = 0, roadId = null, satelliteId = null;
  const select = document.getElementById('basemap-select');
  const colours = document.getElementById('map-area-colours');
  const status = document.getElementById('basemap-status');
  const credit = document.getElementById('basemap-attrib');
  const retry = document.getElementById('basemap-retry');
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* map still works */ } };
  const removeRaster = () => {
    clearTimeout(timeout);
    const ids = [satelliteId, roadId].filter(Boolean);
    roadId = null; satelliteId = null;
    for (const id of ids) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of ids) if (map.getSource(id)) map.removeSource(id);
  };
  const theme = () => {
    if (!roadId || !map.getLayer(roadId)) return;
    const simple = active === 'simplified';
    map.setPaintProperty(roadId, 'raster-saturation', simple ? -1 : 0);
    map.setPaintProperty(roadId, 'raster-opacity', simple ? .46 : 1);
    map.setPaintProperty(roadId, 'raster-brightness-max', effectiveTheme() === 'dark' ? .72 : 1);
  };
  const update = () => {
    select.value = state.basemap; colours.checked = state.areaColours;
    map.setLayoutProperty('land', 'visibility', active === 'analysis' ? 'visible' : 'none');
    map.setLayoutProperty('units-fill', 'visibility', state.areaColours ? 'visible' : 'none');
    for (const id of ['units-zero', 'units-dash', 'units-strong']) map.setLayoutProperty(id, 'visibility', state.areaColours ? 'visible' : 'none');
    retry.hidden = !failed;
    const note = state.areaColours ? 'แสดงสีพื้นที่' : 'ปิดสีพื้นที่ · ค่าตัวชี้วัดและเกณฑ์ยังเดิม';
    status.textContent = failed ? `โหลดพื้นหลังไม่สำเร็จ ใช้พื้นวิเคราะห์ชั่วคราว · ${note}` : `${loading ? 'กำลังโหลด ' : ''}${BASEMAPS[active].label} · ${note}`;
    const osm = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';
    credit.innerHTML = active === 'analysis' ? 'พื้นวิเคราะห์ใช้ขอบเขต CityMETER ไม่มีภาพถ่ายดาวเทียม' : active === 'satellite'
      ? `${osm} · © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium · Sentinel-2 2021 · 10 ม. · <a href="https://docs.terrascope.be/Developers/WebServices/OGC/WMTSv2.html" target="_blank" rel="noopener">Terrascope</a> · ภาพประกอบบริบท ไม่ใช่หลักฐานยืนยันสถานที่`
      : `${osm} · ถนนใช้ประกอบบริบท ไม่ใช่หลักฐานยืนยันพิกัดทะเบียน`;
    theme();
  };
  const fallback = () => {
    failed = true; loading = false; removeRaster(); active = 'analysis'; update();
  };
  const activate = () => {
    failed = false; removeRaster(); active = state.basemap; loading = active !== 'analysis'; generation++;
    if (active !== 'analysis') {
      roadId = `context-roads-${generation}`;
      map.addSource(roadId, { type: 'raster', tiles: [ROAD_TILES], tileSize: 256, maxzoom: 19 });
      map.addLayer({ id: roadId, type: 'raster', source: roadId, paint: { 'raster-fade-duration': 0 } }, 'land');
      if (active === 'satellite') {
        satelliteId = `context-satellite-${generation}`;
        map.addSource(satelliteId, { type: 'raster', tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 14 });
        map.addLayer({ id: satelliteId, type: 'raster', source: satelliteId, paint: { 'raster-fade-duration': 0 } }, 'land');
      }
    }
    if (loading) timeout = setTimeout(() => { if (loading) fallback(); }, 15000);
    update(); save();
  };
  map.on('sourcedata', e => {
    const id = active === 'satellite' ? satelliteId : roadId;
    if (loading && e.sourceId === id && e.isSourceLoaded) { loading = false; clearTimeout(timeout); update(); }
  });
  map.on('error', e => {
    const id = active === 'satellite' ? satelliteId : roadId;
    if (!id || e.sourceId !== id || !map.getSource(id)) return;
    fallback();
  });
  select.addEventListener('change', () => { state.basemap = validDisplay({ basemap: select.value }).basemap; activate(); });
  colours.addEventListener('change', () => { state.areaColours = colours.checked; update(); save(); });
  retry.addEventListener('click', activate);
  document.addEventListener('themechange', theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);
  activate();
}
