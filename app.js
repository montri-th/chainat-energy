/* Chainat Energy demonstration. No network writes, auth or production connection. */
'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number = value => new Intl.NumberFormat('th-TH').format(value);
const CATEGORIES = {fuel:'ผู้ประกอบการเชื้อเพลิง', controlled:'อาคาร / โรงงานควบคุม', projects:'โครงการพลังงาน'};
const VIEWS = {overview:'ภาพรวมพื้นที่', registry:'ตารางข้อมูลรายอำเภอ', quality:'ที่มาและคุณภาพข้อมูล', admin:'ทดลองงานเจ้าหน้าที่'};
const SCALE = ['#F4F0E7','#BAD5D4','#7DBAC0','#4C7A98','#213E70'];
const STORAGE_KEY = 'chainat-energy-demo-v1';
let data, boundaries, rows = [], page = 1, staged = [], activeEdit = null;
let state = {view:'overview',dataset:'all',district:'all',q:''};
let local = {records:[],events:[]};
try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved && Array.isArray(saved.records) && Array.isArray(saved.events)) local = saved; } catch {}
const count = district => state.dataset === 'all' ? Object.keys(CATEGORIES).reduce((a,key)=>a+Number(district.counts[key] || 0),0) : Number(district.counts[state.dataset] || 0);
const announce = message => { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(announce.timer); announce.timer = setTimeout(()=>$('#toast').classList.remove('visible'),4500); };
function updateURL() {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(state)) if (value && value !== 'all' && value !== 'overview') params.set(key,value);
  history.replaceState(null,'',location.pathname + (params.size ? '?' + params : ''));
}
function changeView(view, focus = false) {
  if (!VIEWS[view]) view = 'overview';
  state.view = view;
  for (const section of $$('.view')) section.hidden = section.id !== 'view-' + view;
  for (const nav of $$('[data-view]')) { const selected = nav.dataset.view === view; nav.classList.toggle('active',selected); selected ? nav.setAttribute('aria-current','page') : nav.removeAttribute('aria-current'); }
  $('#view-title').textContent = VIEWS[view];
  if (view === 'registry' && data) {$('#registry-dataset').value=state.dataset;$('#registry-district').value=state.district;$('#registry-search').value=state.q;page=1;renderRegistry();}
  document.title = VIEWS[view] + ' · CityMETER';
  if (focus) { const heading = $('#view-'+view+' h1') || $('#view-'+view+' h2'); if (heading) {heading.tabIndex=-1; heading.focus({preventScroll:true});} }
  updateURL();
}
function populateDistrictSelects() {
  for (const id of ['district-select','registry-district','admin-district']) {
    const el = $('#'+id); if (!el) continue;
    const initial = id === 'admin-district' ? '<option value="">เลือกอำเภอ</option>' : '<option value="all">ทุกอำเภอ</option>';
    el.innerHTML = initial + data.districts.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');
  }
}
function refreshOverview() {
  $('#district-select').value = state.district;
  for (const button of $$('[data-dataset]')) { const active = button.dataset.dataset === state.dataset; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); }
  const selected = data.districts.filter(d=>state.district === 'all' || d.id === state.district);
  const total = selected.reduce((sum,d)=>sum+count(d),0);
  $('#map-summary').textContent = `${number(total)} รายการจากไฟล์ · ${state.dataset === 'all' ? 'รวม 3 กลุ่มข้อมูล' : CATEGORIES[state.dataset]}${state.district !== 'all' ? ' · '+selected[0].name : ' · ทั้งจังหวัด'}`;
  renderMap(); renderDistrictDetail(); renderBars(); updateURL();
}
function renderMap() {
  const container = $('#district-map');
  if (!boundaries?.features?.length) {container.innerHTML='<div class="empty-state">แผนที่ขอบเขตไม่พร้อมใช้งาน ดูสรุปของทั้ง 8 อำเภอในตารางได้</div>'; return;}
  const allPoints = boundaries.features.flatMap(f=>f.geometry.type === 'Polygon' ? f.geometry.coordinates.flat() : f.geometry.coordinates.flat(2));
  const xs=allPoints.map(p=>p[0]), ys=allPoints.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const ratio=Math.cos((minY+maxY)/2*Math.PI/180), scale=Math.min(640/((maxX-minX)*ratio),420/(maxY-minY));
  const width=(maxX-minX)*ratio*scale, height=(maxY-minY)*scale;
  const project = p=>[(p[0]-minX)*ratio*scale+(760-width)/2,(maxY-p[1])*scale+(500-height)/2];
  const fills = value => !value ? 'url(#no-data)' : SCALE[value<=10?0:value<=20?1:value<=40?2:value<=60?3:4];
  const featureDistrict = feature => data.districts.find(d=>d.id === feature.properties.id || d.name === feature.properties.nameTh || d.name === feature.properties.name_th || d.name === feature.properties.name || d.name === feature.properties.district_th);
  container.innerHTML = `<svg viewBox="0 0 760 500" role="group" aria-label="แผนที่จำนวนรายการในไฟล์แยกรายอำเภอ จังหวัดชัยนาท"><defs><pattern id="no-data" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="#EEF1EE"/><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#C9D0CB" stroke-width="1"/></pattern></defs><text x="706" y="42" class="map-north">N ↑</text>${boundaries.features.map(f=>{
    const district=featureDistrict(f); if (!district) return '';
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    const path=polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${project(p).map(v=>v.toFixed(1)).join(',')}`).join('')+'Z').join('')).join('');
    const position = f.properties.labelPoint || f.properties.center || f.properties.centroid;
    let label;
    if (Array.isArray(position)) label=project(position); else {
      const pts=polygons.flat(2).map(project); label=[(Math.min(...pts.map(p=>p[0]))+Math.max(...pts.map(p=>p[0])))/2,(Math.min(...pts.map(p=>p[1]))+Math.max(...pts.map(p=>p[1])))/2];
    }
    const offsets={'หนองมะโมง':[-24,0],'วัดสิงห์':[12,0],'เนินขาม':[-28,18],'หันคา':[28,-12],'เมืองชัยนาท':[-12,-14],'สรรพยา':[24,12]};
    const offset=offsets[district.name]||[0,0];label=[label[0]+offset[0],label[1]+offset[1]];
    const value=count(district), selected=state.district===district.id, index=data.districts.indexOf(district)+1;
    return `<g class="district-shape${selected?' selected':''}" data-district-id="${esc(district.id)}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${esc(district.name)} ${value ? number(value)+' รายการ' : 'ไม่พบรายการในไฟล์'}"><title>${esc(district.name)}: ${number(value)} รายการในไฟล์</title><path d="${path}" fill="${fills(value)}" fill-rule="evenodd"/><g class="map-label" transform="translate(${label[0]},${label[1]})" aria-hidden="true"><rect x="-53" y="-19" width="106" height="45" rx="8"/><text text-anchor="middle" y="-1">${esc(district.name)}</text><text class="map-value" text-anchor="middle" y="17">${value ? number(value)+' รายการ' : 'ไม่มีรายการในไฟล์'}</text></g><g class="map-mobile-label" transform="translate(${label[0]},${label[1]})" aria-hidden="true"><circle r="21"/><text text-anchor="middle" dominant-baseline="central">${index}</text></g></g>`;
  }).join('')}</svg>`;
  const svg=container.querySelector('svg');
  container.querySelectorAll('.map-label,.map-mobile-label').forEach(label=>{label.dataset.districtId=label.parentElement.dataset.districtId;svg.appendChild(label);});
  container.querySelectorAll('[data-district-id]').forEach(el=>{
    const activate=()=>{state.district=state.district===el.dataset.districtId?'all':el.dataset.districtId;refreshOverview();};
    el.addEventListener('click',activate);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
  });
  $('#map-legend').innerHTML = '<span class="legend-title">จำนวนรายการ / อำเภอ</span>' + ['1–10','11–20','21–40','41–60','61 ขึ้นไป'].map((label,i)=>`<span class="legend-item"><i style="background:${SCALE[i]}"></i>${label}</span>`).join('')+'<span class="legend-item"><i class="hatch"></i>ไม่มีรายการในไฟล์</span>';
  let key=$('#map-district-key');if(!key){key=document.createElement('div');key.id='map-district-key';key.className='map-district-key';$('.map-canvas').after(key);}
  key.innerHTML=data.districts.map((d,i)=>`<button type="button" data-key-id="${esc(d.id)}" aria-pressed="${state.district===d.id}"><span>${i+1}</span>${esc(d.name)}</button>`).join('');
  $$('[data-key-id]').forEach(button=>button.addEventListener('click',()=>{state.district=state.district===button.dataset.keyId?'all':button.dataset.keyId;refreshOverview();}));
}
function renderDistrictDetail() {
  const district=data.districts.find(d=>d.id===state.district);
  const selected=district?[district]:data.districts;
  $('#district-detail').innerHTML=`<span class="eyebrow">${district?'พื้นที่ที่เลือก':'ภาพรวมจังหวัด'}</span><h3>${esc(district?.name || 'ชัยนาททั้ง 8 อำเภอ')}</h3><p class="detail-intro">จำนวนรายการที่ปรากฏในเอกสารต้นทาง</p><div class="data-list">${Object.entries(CATEGORIES).map(([key,label])=>`<div><span>${label}</span><strong>${number(selected.reduce((s,d)=>s+d.counts[key],0))} <small>รายการ</small></strong></div>`).join('')}</div><p class="metadata">ผู้ประกอบการ อาคาร และโครงการมีหน่วยนับต่างกัน ผลรวมไม่ใช่จำนวนสถานประกอบการที่ยืนยันแล้ว</p><button type="button" class="button secondary" id="detail-table">ดูตารางพื้นที่นี้ <span aria-hidden="true">↗</span></button>`;
  $('#detail-table').addEventListener('click',()=>{$('#registry-district').value=state.district;$('#registry-dataset').value=state.dataset;page=1;renderRegistry();changeView('registry',true);});
}
function renderBars() {
  const districts=[...data.districts].sort((a,b)=>count(b)-count(a));
  const max=Math.max(...districts.map(count),1);
  $('#district-chart').innerHTML=districts.map(d=>`<button type="button" class="district-bar${state.district===d.id?' selected':''}" data-bar-id="${esc(d.id)}"><span>${esc(d.name)}</span><span class="bar-track"><span style="width:${count(d)/max*100}%"></span></span><strong>${number(count(d))}</strong></button>`).join('');
  $$('[data-bar-id]').forEach(b=>b.addEventListener('click',()=>{state.district=state.district===b.dataset.barId?'all':b.dataset.barId;refreshOverview();}));
}
function registryRows() {
  const query=$('#registry-search').value.trim().toLowerCase(), category=$('#registry-dataset').value, district=$('#registry-district').value, status=$('#registry-status')?.value || 'all';
  return rows.filter(r=>(category==='all'||r.category===category)&&(district==='all'||r.districtId===district)&&(!query||`${r.name} ${r.categoryName} ${r.sourceLabel}`.toLowerCase().includes(query))&&(status==='all'||(status==='available'&&r.value>0)||(status==='missing'&&!r.value)));
}
function renderRegistry() {
  const filtered=registryRows(), pages=Math.max(1,Math.ceil(filtered.length/8)); page=Math.min(page,pages);
  $('#registry-count').textContent=`${number(filtered.length)} กลุ่มข้อมูลรายอำเภอ · รวม ${number(filtered.reduce((s,r)=>s+r.value,0))} รายการในไฟล์`;
  $('#registry-body').innerHTML=filtered.slice((page-1)*8,page*8).map(r=>`<tr><td><strong>${esc(r.name)}</strong><span class="cell-meta">${esc(r.id)}</span></td><td>${esc(r.categoryName)}</td><td><span class="table-number">${r.value?number(r.value):'ไม่มีรายการ'}</span>${r.value?' รายการ':'ในไฟล์'}</td><td><span class="status neutral">${r.value?'สรุปจากไฟล์':'ไม่มีรายการในไฟล์'}</span><span class="cell-meta">ไม่มีพิกัดรายแห่ง</span></td><td><button type="button" class="table-action" data-row-id="${esc(r.id)}" aria-label="ดูที่มา ${esc(r.categoryName)} ${esc(r.name)}">ดูที่มา ↗</button></td></tr>`).join('');
  $('#registry-empty').hidden=filtered.length>0;$('#registry-page').textContent=`หน้า ${page} / ${pages}`;$('#registry-prev').disabled=page<=1;$('#registry-next').disabled=page>=pages;
  $$('[data-row-id]').forEach(button=>button.addEventListener('click',()=>showRecord(rows.find(r=>r.id===button.dataset.rowId))));
}
function showRecord(row) {
  $('#detail-content').innerHTML=`<span class="eyebrow">ที่มาของข้อมูลสรุป</span><h2>${esc(row.name)}</h2><h3>${esc(row.categoryName)}</h3><div class="data-list"><div><span>จำนวนในไฟล์</span><strong>${number(row.value)} รายการ</strong></div><div><span>แหล่งข้อมูล</span><span>${esc(row.sourceLabel)}</span></div><div><span>วันที่ข้อมูล</span><span>ไม่ระบุในไฟล์ต้นทาง</span></div><div><span>พิกัดรายแห่ง</span><span>ไม่มีช่องพิกัดในไฟล์</span></div></div><p class="metadata">เป็นข้อมูลรวมระดับอำเภอ ไม่ระบุชื่อ บุคคล เบอร์ติดต่อ เลขใบอนุญาต หรือที่อยู่รายแห่ง${row.category==='projects'?' โครงการอยู่ในช่วงปี 2558–2563 และไม่แสดงสถานะการใช้งานปัจจุบัน':''}</p>`;
  $('#detail-dialog').showModal();
}
function exportRegistry() {
  const clean=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
  const exportRows=[['อำเภอ','กลุ่มข้อมูล','จำนวนรายการในไฟล์','พิกัดรายแห่ง','วันที่ข้อมูล','แหล่งข้อมูล'],...registryRows().map(r=>[r.name,r.categoryName,r.value || 'ไม่มีรายการในไฟล์','ไม่มีในไฟล์','ไม่ระบุ',r.sourceLabel])];
  download('chainat-energy-district-summary.csv','\uFEFF'+exportRows.map(row=>row.map(clean).join(',')).join('\r\n'),'text/csv;charset=utf-8');announce('ดาวน์โหลดข้อมูลสรุปตามตัวกรองแล้ว');
}
function download(name,content,mime) {const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderQuality() {
  const sourceFiles=['ผู้ประกอบการน้ำมันเชื้อเพลิง.xlsx','โรงงาน-อาคารควบคุม.xlsx','โครงการพลังงานในพื้นที่.xlsx'];
  $('#source-registry').innerHTML=sourceFiles.map((name,i)=>`<article class="source-card"><span class="source-number">0${i+1}</span><div><h3>${name}</h3><p>${['203 รายการ · 4 ประเภทตามใบงาน','18 รายการ · โรงงาน 16 / อาคาร 2','72 แถวต้นทาง → 57 รายการหลังตัด 15 แถวซ้ำ'][i]}</p><span class="metadata">ไม่ระบุวันที่ปรับปรุง · สรุประดับอำเภอ</span></div><span class="pill">ไฟล์ที่ได้รับ</span></article>`).join('');
  $('#coordinate-quality').innerHTML='<div class="quality-number">ไม่มีข้อมูลพิกัด</div><p>ทั้ง 3 ไฟล์ไม่มีช่องละติจูด / ลองจิจูด จึงยังคำนวณความครอบคลุมพิกัดของฐานตรวจรับไม่ได้ แผนที่นี้แสดงเฉพาะขอบเขตอำเภอและจำนวนรายการในไฟล์</p>';
  $('#quality-checks').innerHTML=[['ครบ 8 อำเภอ','จัดกลุ่มจากชื่ออำเภอในไฟล์ต้นทาง ไม่ใช่การสำรวจความครบถ้วนทั้งจังหวัด'],['ตัดแถวโครงการที่ซ้ำ 15 แถว','ใช้รายการหลัก 57 รายการ ไม่บวกใบงานแยกพื้นที่ที่ทำซ้ำ'],['ข้อมูลโครงการปี 2558–2563','ใช้แสดงประวัติโครงการ ไม่สรุปว่ายังเดินระบบในปัจจุบัน'],['3 ไฟล์ต้นทาง ≠ 5 ชุดข้อมูลพร้อมตรวจรับ','EV และโครงสร้างพื้นฐานอื่นยังไม่มีไฟล์ในชุดนี้ ไม่แสดงค่าเป็นศูนย์'],['ยอด 278 รายการมีหน่วยนับต่างกัน','203 ผู้ประกอบการ + 18 อาคาร/โรงงาน + 57 โครงการ ยังไม่ใช่ฐานสถานประกอบการ 289 แห่ง']].map(([heading,body])=>`<article class="quality-item"><span class="check-mark" aria-hidden="true">✓</span><div><h3>${heading}</h3><p>${body}</p></div></article>`).join('');
  if ($('#dataset-readiness')) $('#dataset-readiness').innerHTML=data.datasets.map((dataset,i)=>`<article class="dataset-card"><span class="metadata">0${i+1}</span><h3>${esc(dataset.name)}</h3><span class="pill">${dataset.readiness==='aggregate-demo'?'มีข้อมูลสรุปจากไฟล์':dataset.linkedProjectRows?'เป็นส่วนหนึ่งของชุดโครงการ':'ไม่มีต้นทางในชุดที่ได้รับ'}</span><p>${dataset.count!==null?number(dataset.count)+' '+esc(dataset.countUnit)+' · ไม่มีพิกัดรายแห่ง':dataset.linkedProjectRows?'Solar pumping '+number(dataset.linkedProjectRows)+' รายการรวมอยู่ในชุดโครงการแล้ว ไม่บวกซ้ำเป็นทะเบียน Solar':'ไม่มีค่าจำนวนให้รายงาน'}</p></article>`).join('');
}
function saveLocal() {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(local));return true;} catch {announce('เบราว์เซอร์ไม่อนุญาตให้บันทึก ข้อมูลทดลองจะอยู่เฉพาะระหว่างเปิดหน้านี้');return false;}
}
const ROLE_NAMES={editor:'ผู้บันทึก',reviewer:'ผู้ตรวจทาน'};
const STATUSES={draft:'ร่าง',in_review:'ส่งตรวจทาน',published:'เผยแพร่จำลอง',archived:'เก็บเข้าคลัง'};
function eventLog(action,record) {local.events.unshift({action,id:record.id,name:record.name,at:new Date().toISOString(),role:ROLE_NAMES[$('#admin-role')?.value || 'editor']});local.events=local.events.slice(0,100);saveLocal();}
function renderAdmin() {
  const role=$('#admin-role')?.value || 'editor';
  $('#admin-save').disabled=role!=='editor';
  $('#admin-drafts').innerHTML=local.records.length?local.records.map(record=>`<article class="workflow-card"><div class="workflow-card-header"><span class="pill">${STATUSES[record.status]}</span><span class="metadata">${esc(record.id)} · v${record.version}</span></div><h3>${esc(record.name)}</h3><p>${esc(CATEGORIES[record.dataset])} · ${esc(data.districts.find(d=>d.id===record.district)?.name || record.district)}</p>${record.note?`<p class="metadata">${esc(record.note)}</p>`:''}${record.publishedSnapshot&&['draft','in_review'].includes(record.status)?`<div class="neutral-note"><strong>เวอร์ชันที่เผยแพร่จำลองยังเป็น v${record.publishedSnapshot.version}</strong><p>${esc(record.publishedSnapshot.name)} · เปลี่ยนเมื่อร่างใหม่ผ่านการเผยแพร่จำลอง</p></div>`:''}<div class="workflow-actions">${record.status==='draft'&&role==='editor'?`<button class="button secondary" data-admin-action="edit" data-record-id="${esc(record.id)}">แก้ไขร่าง</button><button class="button primary" data-admin-action="review" data-record-id="${esc(record.id)}">ส่งตรวจทาน</button>`:''}${record.status==='in_review'&&role==='reviewer'?`<button class="button secondary" data-admin-action="return" data-record-id="${esc(record.id)}">คืนแก้ไข</button><button class="button primary" data-admin-action="publish" data-record-id="${esc(record.id)}">เผยแพร่จำลอง</button>`:''}${record.status==='published'&&role==='editor'?`<button class="button secondary" data-admin-action="new-version" data-record-id="${esc(record.id)}">สร้างร่างเวอร์ชันใหม่</button><button class="button quiet" data-admin-action="archive" data-record-id="${esc(record.id)}">เก็บเข้าคลัง</button>`:''}</div>${record.status==='published'?'<p class="metadata">เผยแพร่ในพื้นที่ทดลองนี้เท่านั้น ไม่รวมในตัวเลขและแผนที่ข้อมูลจริง</p>':''}</article>`).join(''):'<div class="empty-state">เริ่มจากเพิ่มรายการตัวอย่าง หรือนำเข้าไฟล์ CSV ตัวอย่าง แล้วทดลองส่งให้ผู้ตรวจทาน</div>';
  $('#admin-log').innerHTML=local.events.length?local.events.slice(0,15).map(event=>`<div class="audit-event"><strong>${esc(event.action)}</strong><span>${esc(event.name)} · ${esc(event.role)}</span><time datetime="${esc(event.at)}">${esc(new Date(event.at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'}))}</time></div>`).join(''):'<p class="metadata">ประวัติการทำงานทดลองจะแสดงที่นี่</p>';
  $$('[data-admin-action]').forEach(button=>button.addEventListener('click',()=>adminAction(button.dataset.adminAction,button.dataset.recordId)));
}
function adminAction(action,id) {
  const record=local.records.find(r=>r.id===id); if(!record)return;
  const role=$('#admin-role').value;
  const allowed={edit:['editor','draft'],review:['editor','draft'],return:['reviewer','in_review'],publish:['reviewer','in_review'],'new-version':['editor','published'],archive:['editor','published']};
  if(!allowed[action]||role!==allowed[action][0]||record.status!==allowed[action][1])return;
  if(activeEdit===id&&action!=='edit'){announce('บันทึกร่างที่กำลังแก้ไขก่อนเปลี่ยนสถานะ');$('#admin-name').focus();return;}
  if(action==='edit'){activeEdit=id;$('#admin-name').value=record.name;$('#admin-dataset').value=record.dataset;$('#admin-district').value=record.district;$('#admin-note').value=record.note;$('#admin-name').focus();announce('กำลังแก้ไขร่าง '+record.id);return;}
  const labels={review:'ส่งตรวจทาน',return:'คืนร่างเพื่อแก้ไข',publish:'เผยแพร่ในพื้นที่ทดลอง','new-version':'สร้างร่างเวอร์ชันใหม่',archive:'เก็บเข้าคลัง'};
  if(action==='new-version'){record.version+=1;record.status='draft';}else record.status={review:'in_review',return:'draft',publish:'published',archive:'archived'}[action];
  if(action==='publish')record.publishedSnapshot={name:record.name,dataset:record.dataset,district:record.district,note:record.note,version:record.version,publishedAt:new Date().toISOString()};
  eventLog(labels[action],record);renderAdmin();announce(labels[action]+'แล้ว');
}
function newRecord(fields) {return {id:'DEMO-'+String(local.records.reduce((max,r)=>Math.max(max,Number(r.id.replace('DEMO-',''))||0),0)+1).padStart(3,'0'),...fields,status:'draft',version:1};}
function submitDraft(event) {
  event.preventDefault();if($('#admin-role').value!=='editor')return;
  const fields={name:$('#admin-name').value.trim(),dataset:$('#admin-dataset').value,district:$('#admin-district').value,note:$('#admin-note').value.trim()};
  if(!fields.name||!CATEGORIES[fields.dataset]||!data.districts.some(d=>d.id===fields.district))return;
  if(local.records.some(r=>r.id!==activeEdit&&r.name===fields.name&&r.dataset===fields.dataset&&r.district===fields.district&&r.status!=='archived')){announce('มีรายการชื่อนี้ในพื้นที่ทดลองแล้ว');return;}
  if(activeEdit){const record=local.records.find(r=>r.id===activeEdit);if(record?.status!=='draft'){announce('สถานะรายการเปลี่ยนไปแล้ว กรุณาเปิดร่างใหม่');return;}Object.assign(record,fields);eventLog('แก้ไขร่าง',record);activeEdit=null;}else{const record=newRecord(fields);local.records.unshift(record);eventLog('เพิ่มร่าง',record);}
  $('#admin-form').reset();renderAdmin();announce('บันทึกร่างในเบราว์เซอร์นี้แล้ว');
}
function parseCSV(text) {
  const result=[];let row=[],value='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(value);value='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))result.push(row);row=[];value='';}else value+=ch;}
  if(quoted)throw Error('เครื่องหมายคำพูดใน CSV ไม่ครบคู่');row.push(value);if(row.some(v=>v.trim()))result.push(row);return result;
}
async function importCSV(event) {
  staged=[];$('#admin-import-commit').disabled=true;
  const file=event.target.files?.[0];if(!file)return;
  const result=$('#admin-import-result');
  try {
    if(!file.name.toLowerCase().endsWith('.csv')||file.size>1024*1024)throw Error('เลือกไฟล์ CSV ขนาดไม่เกิน 1 MB');
    const parsed=parseCSV(await file.text()),header=parsed.shift()?.map(v=>v.trim());
    if(!header||header.join(',')!=='name,dataset,district,note')throw Error('หัวตารางต้องเป็น name,dataset,district,note ตามไฟล์ตัวอย่าง');
    if(!parsed.length||parsed.length>500)throw Error('ไฟล์ต้องมีข้อมูล 1–500 แถว');
    const errors=[],seen=new Set();
    parsed.forEach((row,index)=>{
      const [name,dataset,districtName,note='']=row.map(v=>v.trim());
      const district=data.districts.find(d=>d.id===districtName||d.name===districtName);
      let reason='';const duplicateKey=[name,dataset,district?.id].join('|');
      if(row.length!==4)reason='ต้องมี 4 คอลัมน์';else if(!name||name.length>160)reason='ชื่อจำเป็นและยาวไม่เกิน 160 ตัวอักษร';else if(!CATEGORIES[dataset])reason='dataset ต้องเป็น fuel, controlled หรือ projects';else if(!district)reason='ชื่ออำเภอไม่ตรงกับ 8 อำเภอชัยนาท';else if(note.length>500)reason='หมายเหตุยาวไม่เกิน 500 ตัวอักษร';else if(seen.has(duplicateKey)||local.records.some(r=>r.name===name&&r.dataset===dataset&&r.district===district.id&&r.status!=='archived'))reason='พบรายการซ้ำในไฟล์หรือพื้นที่ทดลอง';
      seen.add(duplicateKey);if(reason)errors.push(`แถว ${index+2}: ${reason}`);else staged.push({name,dataset,district:district.id,note});
    });
    result.innerHTML=`<p><strong>ตรวจ ${number(parsed.length)} แถว:</strong> ผ่าน ${number(staged.length)} · พบปัญหา ${number(errors.length)}</p>${errors.length?`<ul>${errors.map(error=>`<li>${esc(error)}</li>`).join('')}</ul>`:'<p>พร้อมสร้างร่าง ข้อมูลยังไม่ได้ถูกเพิ่ม</p>'}`;
    $('#admin-import-commit').disabled=errors.length>0||!staged.length||$('#admin-role').value!=='editor';
    announce('ตรวจไฟล์ CSV แล้ว');
  }catch(error){staged=[];result.textContent=error.message;announce('ตรวจไฟล์ไม่สำเร็จ');}
}
function setupAdmin() {
  const target=$('#admin-form');
  const role=document.createElement('div');role.className='role-switch';role.innerHTML='<label for="admin-role">บทบาทที่ทดลอง</label><select id="admin-role"><option value="editor">ผู้บันทึก — เพิ่ม / แก้ไข / ส่งตรวจ</option><option value="reviewer">ผู้ตรวจทาน — คืนแก้ไข / เผยแพร่จำลอง</option></select><p class="metadata">การเลือกบทบาทนี้ใช้สาธิตขั้นตอน ไม่ใช่ระบบเข้าสู่ระบบหรือสิทธิ์จริง</p>';
  target.before(role);
  $('#admin-role').addEventListener('change',()=>{activeEdit=null;target.reset();$('#admin-import-commit').disabled=true;renderAdmin();});
  target.addEventListener('submit',submitDraft);
  $('#admin-reset').addEventListener('click',()=>{if(!confirm('ล้างรายการและประวัติทดลองทั้งหมดที่เก็บในเบราว์เซอร์นี้?'))return;local={records:[],events:[]};activeEdit=null;staged=[];saveLocal();target.reset();$('#admin-import-result').textContent='';$('#admin-import-commit').disabled=true;renderAdmin();announce('ล้างข้อมูลทดลองแล้ว');});
  $('#admin-import').addEventListener('change',importCSV);
  $('#admin-sample').addEventListener('click',()=>download('chainat-energy-demo-import.csv','\uFEFFname,dataset,district,note\r\n"โครงการตัวอย่าง 01",projects,"เมืองชัยนาท","ข้อมูลสมมติสำหรับทดลองเท่านั้น"\r\n"สถานที่ตัวอย่าง 02",fuel,"หันคา","ข้อมูลสมมติสำหรับทดลองเท่านั้น"','text/csv;charset=utf-8'));
  $('#admin-import-commit').addEventListener('click',()=>{if(!staged.length||$('#admin-role').value!=='editor')return;if(staged.some(fields=>local.records.some(r=>r.name===fields.name&&r.dataset===fields.dataset&&r.district===fields.district&&r.status!=='archived'))){staged=[];$('#admin-import-commit').disabled=true;$('#admin-import-result').textContent='มีรายการซ้ำเพิ่มหลังตรวจไฟล์ กรุณาเลือกไฟล์เพื่อตรวจใหม่';$('#admin-import').value='';announce('ไม่ได้นำเข้า เนื่องจากพบรายการซ้ำ');return;}const size=staged.length;for(const fields of staged){const record=newRecord(fields);local.records.unshift(record);eventLog('นำเข้าเป็นร่าง',record);}staged=[];$('#admin-import-commit').disabled=true;$('#admin-import').value='';$('#admin-import-result').textContent=`สร้างร่างทดลอง ${size} รายการแล้ว`;renderAdmin();announce('นำเข้าร่างทดลองแล้ว');});
  renderAdmin();
}
async function init() {
  try {
    const responses=await Promise.all([fetch('./data/energy-data.json'),fetch('./data/districts.geojson').catch(()=>null)]);
    if(!responses[0].ok)throw Error('ไม่สามารถอ่านข้อมูลสรุปได้');
    data=await responses[0].json();boundaries=responses[1]?.ok?await responses[1].json():null;
    const params=new URLSearchParams(location.search);
    state.view=VIEWS[params.get('view')]?params.get('view'):'overview';state.dataset=['all',...Object.keys(CATEGORIES)].includes(params.get('dataset'))?params.get('dataset'):'all';state.district=data.districts.some(d=>d.id===params.get('district'))?params.get('district'):'all';state.q=(params.get('q')||'').slice(0,160);
    const sourceNames={fuel:'ผู้ประกอบการน้ำมันเชื้อเพลิง.xlsx',controlled:'โรงงาน-อาคารควบคุม.xlsx',projects:'โครงการพลังงานในพื้นที่.xlsx'};
    rows=data.districts.flatMap(d=>Object.entries(CATEGORIES).map(([category,label])=>({id:`CN-${d.id}-${category}`,districtId:d.id,name:d.name,category,categoryName:label,value:d.counts[category],sourceLabel:sourceNames[category]})));
    populateDistrictSelects();$('#kpi-fuel').textContent=number(data.summary.fuelRecords);$('#kpi-controlled').textContent=number(data.summary.controlledFacilities);$('#kpi-projects').textContent=number(data.summary.energyProjectRecords);$('#kpi-districts').textContent=number(data.districts.length);
    $$('[data-view]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.view,true)));
    $$('[data-dataset]').forEach(button=>button.addEventListener('click',()=>{state.dataset=button.dataset.dataset;refreshOverview();}));
    $('#district-select').addEventListener('change',event=>{state.district=event.target.value;refreshOverview();});$('#map-reset').addEventListener('click',()=>{state.district='all';state.dataset='all';refreshOverview();});
    $('#registry-dataset').value=state.dataset;$('#registry-district').value=state.district;$('#registry-search').value=state.q;
    for(const id of ['registry-search','registry-dataset','registry-district','registry-status']){const el=$('#'+id);if(el)el.addEventListener(id==='registry-search'?'input':'change',()=>{page=1;state.dataset=$('#registry-dataset').value;state.district=$('#registry-district').value;state.q=$('#registry-search').value;renderRegistry();refreshOverview();});}
    $('#registry-prev').addEventListener('click',()=>{page--;renderRegistry();});$('#registry-next').addEventListener('click',()=>{page++;renderRegistry();});$('#registry-export').addEventListener('click',exportRegistry);
    $('#detail-close').addEventListener('click',()=>$('#detail-dialog').close());$('#detail-dialog').addEventListener('click',event=>{if(event.target===$('#detail-dialog'))$('#detail-dialog').close();});
    refreshOverview();renderRegistry();renderQuality();setupAdmin();changeView(state.view);
    const share=document.createElement('button');share.type='button';share.className='button quiet';share.textContent='คัดลอกลิงก์มุมมอง';share.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);announce('คัดลอกลิงก์ตัวกรองแล้ว');}catch{announce('คัดลอก URL จากแถบที่อยู่ของเบราว์เซอร์ได้');}});$('#map-reset').after(share);
    document.documentElement.dataset.ready='true';
  }catch(error){console.error(error);const note=document.createElement('p');note.className='empty-state';note.setAttribute('role','alert');note.textContent='โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง';$('#district-map')?.replaceChildren(note);announce('โหลดข้อมูลไม่สำเร็จ');}
}
init();
