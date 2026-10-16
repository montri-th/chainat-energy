import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const output = process.env.QA_OUTPUT || '/private/tmp/chainat-energy-qa';
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
const errors = [], checks = [];
function check(name, value) { assert.ok(value,name); checks.push(name); }
async function ready(page) { await page.waitForSelector('html[data-ready="true"]');await page.evaluate(()=>document.fonts.ready); }
async function view(page,name) {await page.evaluate(name=>document.querySelector(`.primary-nav [data-view="${name}"]`).click(),name);await page.waitForTimeout(120);}
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await ready(page);
  check('eight district polygons',await page.locator('.district-shape').count()===8);
  check('source row total 278 excludes solar subset',(await page.locator('#map-summary').innerText()).includes('278'));
  await page.selectOption('#district-select','chainat-sankhaburi');
  await page.locator('[data-dataset="fuel"]').click();
  check('Sankhaburi fuel count40',(await page.locator('#map-summary').innerText()).includes('40'));
  await view(page,'registry');
  check('map filter synchronized to table',await page.inputValue('#registry-dataset')==='fuel' && await page.inputValue('#registry-district')==='chainat-sankhaburi');
  check('filtered table has one row',await page.locator('#registry-body tr').count()===1);
  await page.locator('[data-row-id]').click();
  check('source detail dialog opens',await page.locator('#detail-dialog').isVisible());await page.locator('#detail-close').click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#registry-export').click()]);
  const content=await fs.readFile(await download.path(),'utf8');check('CSV export contains filtered district',content.includes('สรรคบุรี')&&content.includes('40')&&!content.includes('มโนรมย์'));
  await page.locator('#registry-search').fill('zz_no_match');
  check('empty search state',await page.locator('#registry-empty').isVisible());
  await page.locator('#registry-search').fill('');
  await page.selectOption('#registry-dataset','all');await page.selectOption('#registry-district','all');
  check('table counts24 group rows',(await page.locator('#registry-count').innerText()).includes('24'));
  await page.locator('#registry-next').click();check('table pagination',(await page.locator('#registry-page').innerText()).includes('2 / 3'));
  await view(page,'quality');check('six dataset readiness entries',await page.locator('#dataset-readiness article').count()===6);
  check('coordinate coverage not fabricated',(await page.locator('#coordinate-quality').innerText()).includes('ไม่มีข้อมูลพิกัด'));
  await view(page,'admin');
  await page.locator('#admin-name').fill('รายการสมมติ QA');await page.selectOption('#admin-district','chainat-manorom');await page.locator('#admin-note').fill('เฉพาะทดสอบ ไม่ใช่ข้อมูลจริง');await page.locator('#admin-save').click();
  check('draft created',await page.locator('.workflow-card').count()===1);
  await page.locator('[data-admin-action="edit"]').click();await page.locator('#admin-name').fill('รายการสมมติ QA ฉบับแก้ไข');await page.locator('[data-admin-action="review"]').click();
  check('unsaved edit blocks review',(await page.locator('.workflow-card .pill').innerText())==='ร่าง');await page.locator('#admin-save').click();await page.locator('[data-admin-action="review"]').click();
  check('review action permission',await page.locator('[data-admin-action="publish"]').count()===0);
  await page.selectOption('#admin-role','reviewer');await page.locator('[data-admin-action="return"]').click();check('return to draft',(await page.locator('.workflow-card .pill').innerText())==='ร่าง');
  await page.selectOption('#admin-role','editor');await page.locator('[data-admin-action="review"]').click();await page.selectOption('#admin-role','reviewer');await page.locator('[data-admin-action="publish"]').click();
  check('published snapshot stored',await page.evaluate(()=>JSON.parse(localStorage.getItem('chainat-energy-demo-v1')).records[0].publishedSnapshot.version===1));
  await page.selectOption('#admin-role','editor');await page.locator('[data-admin-action="new-version"]').click();
  check('new draft preserves published version',(await page.locator('.workflow-card').innerText()).includes('ยังเป็น v1'));
  const csv='name,dataset,district,note\n"CSV สมมติ",projects,"เมืองชัยนาท","ทดสอบ"';
  await page.locator('#admin-import').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.waitForFunction(()=>!document.querySelector('#admin-import-commit').disabled);
  check('dry run before commit',await page.locator('.workflow-card').count()===1 && await page.locator('#admin-import-commit').isEnabled());
  await page.locator('#admin-import-commit').click();check('CSV draft import',await page.locator('.workflow-card').count()===2);
  await page.locator('#admin-import').setInputFiles({name:'duplicate.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.waitForFunction(()=>document.querySelector('#admin-import-result').textContent.includes('พบปัญหา 1'));
  check('duplicate rejected',await page.locator('#admin-import-commit').isDisabled());
  const staleCSV='name,dataset,district,note\n"รายการชนกัน",fuel,"มโนรมย์","ทดสอบ"';
  await page.locator('#admin-import').setInputFiles({name:'stale.csv',mimeType:'text/csv',buffer:Buffer.from(staleCSV)});
  await page.waitForFunction(()=>!document.querySelector('#admin-import-commit').disabled);
  await page.locator('#admin-name').fill('รายการชนกัน');await page.selectOption('#admin-district','chainat-manorom');await page.selectOption('#admin-dataset','fuel');await page.locator('#admin-save').click();await page.locator('#admin-import-commit').click();
  check('duplicate revalidated at commit',await page.locator('.workflow-card').count()===3 && (await page.locator('#admin-import-result').innerText()).includes('ซ้ำ'));
  await page.reload();await ready(page);await view(page,'admin');check('browser state persists',await page.locator('.workflow-card').count()===3);
  await page.evaluate(()=>localStorage.removeItem('chainat-energy-demo-v1'));await page.reload();await ready(page);
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:width===1440?1000:844});
    for(const name of ['overview','registry','quality','admin']){
      await view(page,name);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(120);
      check(`${name} page overflow ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(output,`${width}-${name}.png`),fullPage:true});
    }
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='130%');await view(page,'quality');
  check('Thai 130percent no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,'thai130-quality.png'),fullPage:true});
  await page.evaluate(()=>document.documentElement.style.fontSize='');await page.setViewportSize({width:720,height:500});await page.emulateMedia({reducedMotion:'reduce'});await view(page,'overview');
  check('reduced viewport equivalent to 200percent zoom no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.district-shape').first().focus();await page.keyboard.press('Enter');check('keyboard map selection',await page.locator('.district-shape[aria-pressed="true"]').count()===1);
  const fallback=await browser.newPage();await fallback.route('**/districts.geojson',route=>route.abort());await fallback.goto(base);await ready(fallback);await view(fallback,'registry');check('table usable without map boundary',await fallback.locator('#registry-body tr').count()>0);await fallback.close();
  check('no browser exceptions',errors.length===0);
  const report={checkedAt:new Date().toISOString(),base,checksPassed:checks.length,checks,errors};await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
