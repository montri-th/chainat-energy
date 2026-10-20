# เริ่มพัฒนา · CityMETER: Yolk โหมดสำนักงานพลังงานจังหวัด

ชุดนี้เป็นต้นแบบ static ที่เปิดผ่าน HTTP ใช้ HTML, CSS และ JavaScript modules โดยตรง ข้อมูลที่เผยแพร่อยู่ใน `data/` การติดตั้งเครื่องมือพัฒนาไม่ได้เพิ่มระบบล็อกอิน ฐานข้อมูล หรือการทำงานเป็นทีมให้เดโม

## เริ่มต้น

ใช้ Node.js 22.12 ขึ้นไปและ Python 3 สำหรับทางเลือกเปิดเว็บแบบง่าย ติดตั้ง dependency ตาม lockfile ของ repo ห้ามเปลี่ยนเวอร์ชัน MapLibre หรือไฟล์ LDS เพียงเพื่อให้เริ่มงานได้

```sh
git clone https://github.com/montri-th/chainat-energy.git
cd chainat-energy
npm ci
npx playwright install chromium
npm run dev
```

เปิด `http://127.0.0.1:4173/` แล้วทดลองภาพรวม → ความต้องการ → กิจการ → โอกาส → เล็งไว้ ข้อมูลอาคารจะโหลดเมื่อเลือกพื้นที่ ไม่จำเป็นต้องสร้างข้อมูลใหม่เพื่อแก้ UI

ทางเลือกที่ใช้กับไฟล์ static โดยตรง:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

เปิดไฟล์ผ่าน `file://` ไม่ใช่วิธีตรวจที่รองรับ เพราะ module และการอ่าน JSON ต้องใช้ HTTP

## แผนที่ของโค้ด

| งาน | เริ่มอ่าน |
| --- | --- |
| ตัววัด หน่วย ชนิดค่า สูตร Demand คิว URL และ persistence | `js/core.js` |
| MapLibre ขอบเขต อาคาร การเลือก และแผนที่ฐาน | `js/map.js` |
| แผง รายการแทนแผนที่ การ์ด หลักฐาน และตารางรถ | `js/views.js` |
| การนำทาง ปุ่ม การเปลี่ยนสถานะ CSV และ recovery | `js/app.js` |
| Navbar และ metadata ของ browser/social | `index.html` |
| ธีม layout และ focus | `styles.css` |
| data release แหล่งและข้อจำกัด | `data/meta.json`, `data/DATA_QA.md` |
| สัญญาเครื่องอ่านได้และแผน production | `contracts/`, `docs/PRODUCTION_PLAN.md` |

`contracts/product-contract.json` เป็น snapshot ของความหมายและขอบเขตการทำงาน อ่านร่วมกับ source จริงเมื่อทำงานต่อ `sourceBaselineCommit` คือฐานเริ่มงานวันที่ 19 ต.ค. ไม่ใช่ SHA ของ commit ที่กำลังสร้าง เอกสารผลเผยแพร่ต้องผูก SHA สุดท้ายกับผล provider และหน้าเว็บจริงแยกต่างหาก

## การตั้งค่า

ดู `.env.example` ไฟล์นี้เป็นตัวอย่างตัวแปรของเครื่องมือพัฒนา ไม่ได้เก็บ credential และไม่ได้ถูกอ่านอัตโนมัติโดย browser หรือ Node การตั้ง `BASE_URL` ใช้เปลี่ยนปลายทางตรวจ ไม่ทำให้หน้าเว็บเชื่อม backend

```sh
BASE_URL=http://127.0.0.1:4173/ node scripts/qa.mjs --label local
BASE_URL=https://montri-th.github.io/chainat-energy/ node scripts/qa.mjs --label live
```

`PLAYWRIGHT_MODULE` เป็นทางเลือกสำหรับเครื่องที่มี Playwright อยู่แล้ว โดยทั่วไปใช้แพ็กเกจจาก `npm ci` ได้ `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ใช้ชี้ executable ของ Chromium ที่ติดตั้งไว้ได้เมื่อจำเป็น โดยไม่ฝัง path ของเครื่องผู้พัฒนาใน source ห้ามใส่ token, API secret, service-account JSON หรือ signed media URL ใน frontend, URL, `.env.example` หรือรายงานทดสอบ

## ตรวจการเปลี่ยนแปลง

```sh
npm run check
npm run qa
```

`npm run qa` จะเปิด server แยกบน loopback ด้วยพอร์ตว่างให้เองแล้วปิดเมื่อจบ จึงไม่ต้องเปิด `npm run dev` ค้างไว้ เมื่อกำหนด `BASE_URL` จะตรวจเว็บปลายทางที่เปิดอยู่แทน รวมถึงหน้าเว็บจริง ส่วนการเรียก `node scripts/qa.mjs` โดยตรงต้องมีเว็บเปิดที่ปลายทางนั้น `npm run dev` ใช้พอร์ต 4173 สำหรับการพัฒนาปกติ ทุกแบบต้องติดตั้ง Chromium แล้ว

ผลทดสอบของรอบก่อนเป็นประวัติ ต้องรันกับ source รอบที่แก้ใหม่ ตรวจภาพที่จอแคบและ desktop จริงสำหรับส่วนที่เพิ่มทุกส่วน และบันทึกข้อที่ยังไม่ได้ตรวจ เช่น โปรแกรมอ่านหน้าจอหรือโทรศัพท์จริง

ทดสอบสิ่งที่ผู้ใช้ทำจริง: เปลี่ยน basemap โดยคงพื้นที่และเกณฑ์เดิม; เปลี่ยนธีมโดยคง HEX สีข้อมูล; เปิด permalink แล้วใช้ Back/Forward; ให้ provider โหลดไม่ได้แล้วยังใช้รายการพื้นที่ได้; ปิด storage แล้วยังเล็งพื้นที่ชั่วคราวพร้อมข้อความแจ้ง; ส่งออกข้อความที่ขึ้นต้น `=`, `+`, `-`, `@` แล้วไม่กลายเป็นสูตร

## ข้อที่รักษาไว้เมื่อแก้ UI

- ข้อมูลจากแหล่ง ตามที่รายงาน ค่าตัวแทน และแบบจำลองเป็นคนละชนิดค่า ตัวเลขรายพื้นที่และอาคารยังเป็นแบบจำลอง
- ศูนย์ที่นับแล้วแยกจากไม่มีข้อมูล ถูกปกปิด ยังไม่พร้อม และยังไม่ยืนยัน ห้ามแก้ `null` ให้เป็น `0` เพื่อให้กราฟสวยขึ้น
- Demand ใช้ quantile แบบ linear interpolation และค่า `> 0`; สีและมุมมองโอกาสใช้ mid-rank percentile ห้ามรวมวิธีคำนวณโดยเงียบ ๆ
- Supply หรือมุมมองโอกาสไม่เพิ่มหรือลดสมาชิก Demand ทุกการเปลี่ยนสูตรต้องมีการตัดสินใจแยก
- รายการที่เล็งไว้ใน browser เป็นงานส่วนตัวบนเครื่องนั้น ช่องผู้รับผิดชอบไม่ใช่การมอบหมายงานให้ทีมจริง ห้ามลบงานเดิมเพื่อเปลี่ยน preset
- รถรายเดือนเป็นระดับจังหวัด; ทะเบียนกิจการจับคู่ได้ถึงตำบล; รายชื่อโซลาร์รูฟท็อปหน่วยงานรัฐ (r3) ระบุได้แค่อำเภอที่อ่านจากชื่อหน่วยงาน ห้ามสร้างความละเอียดที่แหล่งไม่รองรับ
- เมื่อข้อมูลเปลี่ยน ให้แก้ `DATA_RELEASE` ใน `js/core.js`, `release` ใน `data/meta.json`, `release.dataRelease` และ `release.inputIdentity` ใน `contracts/product-contract.json` และ `dataRelease` ใน `scripts/fixtures/model-baseline.json` พร้อมกัน แล้วรัน `npm run check`
- `scripts/qa.mjs` สแกนคำเรื่องราคา สัญญา และข้อตกลงทางการค้าในทุกไฟล์ข้อความที่ GitHub Pages เผยแพร่ (ยกเว้นตัวตรวจเอง `vendor/` `assets/lds/` `data/geo/` และ `data/buildings/`) ประโยคที่บอกกฎเองให้เพิ่มใน `RULE_STATEMENTS` แบบคำต่อคำเท่านั้น · ชุดเบราว์เซอร์ตรวจทุกเส้นทางที่ 1440 768 390 และ 320 px
- ใช้ LDS 0.9.7 และไฟล์ exact assets ที่มีอยู่ ไม่วาดโลโก้ขึ้นใหม่ ไม่แก้ไฟล์ vendor; ไม่ใช้ bracket ตกแต่งหรือแถบสีข้างซ้ายบน navigation, tab, card หรือ callout
- เปลี่ยน basemap ไม่เปลี่ยนสีข้อมูล ไม่กลับสี tile ของผู้ให้บริการ และรักษา attribution ตามเงื่อนไขของแต่ละผู้ให้บริการ

## ขอบเขต public/private

ห้ามนำพิกัดที่ยังไม่ cleared, Sheet ทะเบียนหลัก, Dry-run พิกัด, XLSX หรือ Numbers ต้นฉบับ, เบอร์โทรส่วนบุคคล, ข้อตกลงภายใน, signed media หรือ credential เข้า public repo/build ภาพอาคารที่เผยแพร่ในเดโมกับพิกัดสถานประกอบการจากทะเบียนเป็นคนละชุดและมีสิทธิ์ต่างกัน

ภาพตัวอย่างเวลาแชร์ต้องไม่มีข้อมูลส่วนตัวหรือพิกัดที่ยังไม่อนุญาต ใช้ identity และภาพแผนที่เชิงแนวคิดที่ระบุว่าเป็นแบบจำลองได้ `noindex,nofollow` ช่วยกำกับการค้นหา แต่ไม่ได้จำกัดผู้เข้าถึงเว็บ

## ผู้ใช้ production ที่วางแผนไว้

เจ้าของกำหนดทั้งหมด 5 คน: Admin 1, Editor 2, Viewer 2 ยังต้องระบุบัญชีจริงก่อน provision และต้องตรวจด้วย server-side auth/RBAC เดโม static ไม่ได้บังคับสิทธิ์นี้ การเห็น 2 บัญชีเจ้าของไฟล์ Drive ไม่ใช่การผูก role ในเว็บ

## รับงาน production

อ่าน `docs/PRODUCTION_PLAN.md` เลือกหนึ่ง `taskId` จาก `contracts/task-graph.json` แล้วทำเฉพาะงานที่ dependencies พร้อม หลักฐานที่ต้องส่งกลับคือ diff, task acceptance, source SHA, ผลทดสอบจริง และเรื่องที่ยังค้าง ไม่ถือว่าเพียงมี JSON Schema หรือ UI ต้นแบบแล้ว backend เสร็จ

Before implementing production work, read the active production repository's `AGENTS.md` and `START_HERE.md`. Verify actual shared Yolk modules and authorization. Keep energy-mode semantics separate from product-neutral shared services. The public demo is not an authenticated production workspace.
