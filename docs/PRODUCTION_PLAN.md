# จากเดโมสู่ production

เอกสารนี้เป็นแผนพัฒนา ไม่ใช่คำรับรองว่า production พร้อมใช้งาน เดโมปัจจุบันเป็นเว็บ static ไม่มี authentication, server RBAC, shared workspace, audit/outbox หรือ private media การเปิดหน้าเว็บหรือการพิมพ์ชื่อผู้รับผิดชอบไม่สร้างบัญชีหรือทีมงาน

Machine-readable authority ของแผนนี้คือ `contracts/product-contract.json` และ `contracts/task-graph.json` DTO ที่เสนออยู่ใน `contracts/evidence-value.schema.json` กับ `contracts/production-records.schema.json` รูปแบบเหล่านี้เป็นข้อเสนอ interface ยังไม่ใช่ API ที่ deploy แล้ว

## เก็บอะไรไว้ร่วม และอะไรเฉพาะโหมด

| Shared Yolk/Landometer capability ที่ต้องตรวจ source จริงก่อนใช้ | โหมดสำนักงานพลังงานจังหวัด |
| --- | --- |
| Source Release, provenance, rights projection และ version compatibility | แหล่งแผนพลังงาน ทะเบียนกิจการ และ mapping จังหวัด |
| Criteria/tier engine ที่มี version และ parity tests | metric พลังงาน หน่วย ตัวหาร และแบบจำลองการกระจาย |
| Accessible navigation, map primitives และการคืนสถานะ | มุมมองโอกาสด้านพลังงานและคำอธิบายที่ผูกแผน |
| Workspace auth/RBAC, revisions, audit และ outbox | บทบาทการออกสำรวจและแบบขอข้อมูลจากหน่วยงาน |
| Private media และการเพิกถอนสิทธิ์ | หลักฐานภาคสนามที่เจ้าของข้อมูลอนุญาต |

Locale Insight ไม่ได้ใช้ในเดโมนี้ ถ้าจะเพิ่มให้เป็น contextual prior เท่านั้น ต้องมี crosswalk และข้อจำกัดของรุ่นข้อมูล ไม่ใช้แทนประชากรทางการ สิทธิ์รับงบ ความปลอดภัย หรือพฤติกรรมจริง ห้ามยกสมมติฐานของธุรกิจอื่นเป็นข้อเท็จจริงของโหมดพลังงานหรือ Landometer ทั้ง portfolio

## ลำดับงาน

| Task | ผลที่ต้องส่ง | ต้องรอ |
| --- | --- | --- |
| T01 | เปิดเดโมและได้ baseline ที่ผูก source/data identity | ไม่มี |
| T02 | identity/basemap ผ่าน regression และภาพตรวจจริง | T01 |
| T03 | อ่าน production repo ปัจจุบันและตัดสิน reuse/stack จากหลักฐาน | T01 |
| T04 | Source Release adapter และ evidence/null/grain validation | T03 |
| T05 | Server auth, roles, tenant isolation | T03 |
| T06 | Shared shortlist, revision conflict, idempotency, audit/outbox | T04, T05 |
| T07 | Private coordinate import ที่ผ่านการตัดสินรายรายการ | T04, T05 และสิทธิ์/ข้อมูลจากเจ้าของ |
| T08 | ผลภาคสนามและ private media | T05, T06 |
| T09 | ทดลองกับสำนักงาน, production acceptance และ rollback | T04, T05, T06 และ manual gates |

แต่ละ task มี inputs, outputs, acceptance, tests และ owner ใน task graph ห้ามถือว่าสถานะ `planned` หรือ `verify_release_receipt` คือทดสอบผ่านแล้ว

## ก่อนย้ายเครื่องคิด

1. ตรวจ commit และ active entrypoint ของ production Yolk จริง ไม่เลือกเอกสารจากเลขรุ่นสูงสุดของชื่อไฟล์
2. นำ source release เดียวกันเข้า fixture ควบคุม เปรียบเทียบระดับไข่ สมาชิก Demand เหตุผลและลำดับคิว
3. รักษาวิธี quantile ของ Demand และ mid-rank ของ lens/สีที่แยกกันในเดโม ถ้าจะเปลี่ยนให้เป็น decision ที่มีผลกระทบและรุ่นเครื่องคิดใหม่
4. เก็บข้อมูลที่ผู้ใช้บันทึกไว้ก่อน preset ใหม่ การย้าย localStorage ต้องมี preview และ label legacy ที่ขาด provenance ห้ามเดารหัสรอบย้อนหลัง

## ผู้ใช้ 5 คนตามข้อกำหนดเจ้าของ

ผู้ใช้ทั้งหมด **5 คน: Admin 1, Editor 2, Viewer 2** ใช้ **สิทธิ์เหมือน Yolk ทุกข้อ เปลี่ยนเฉพาะจำนวนคน** อ้าง active entrypoint `START_HERE.md` → `contracts/full-product.v1.9.13.json` ฟิลด์ `production.rbac` (SHA-256 `95d7bda630bdf6ed7491a95452020d9d5f4ea2bbe75d75fa2f642cd5db921073`) snapshot แบบ verbatim อยู่ใน `contracts/yolk-rbac-source.json`

| Role | สิทธิ์ inherited จาก Yolk | จำนวน |
| --- | --- | ---: |
| Admin | จัดการ workspace สมาชิก custom field definitions และทำได้ทุกอย่างที่ Editor ทำ | 1 |
| Editor | CRUD branch/target/evidence/media, Apply criteria ตาม scope และ permitted sharing | 2 |
| Viewer | อ่านข้อมูล/maps/details/feed ที่มีสิทธิ์; personal filter/theme/locale/notification read state; self-only preview/draft ได้ แต่ไม่ Apply หรือ shared writes | 2 |

Viewer ส่งต่อ link เดิมได้เฉพาะ audience ที่ได้รับอนุญาตเดิม สร้าง ShareGrant ใหม่หรือขยายสิทธิ์ไม่ได้ reviewer เป็น capability ที่มอบใน Editor/Admin ไม่ใช่ seat role ใหม่ ตรวจ tenant+role+entity scope ทุก API/storage/signed URL/share path ไม่เชื่อ client `canEdit` หรือ actor selector และต้องคง last Admin

นี่เป็น requirement สำหรับ production เดโม static ยังไม่มี auth/RBAC และไม่บังคับสิทธิ์นี้ ยังไม่มี identity bindings ของ 5 บัญชี ต้องรับจากเจ้าของก่อน provision ห้ามเดาจาก Drive/Sheet permissions การมี role ไม่แทนหลักฐานสิทธิ์ข้อมูลหรือ approval นำเข้าพิกัด
## Server acceptance ที่เดโมยังไม่พิสูจน์

- ตรวจ role allow/deny ของผู้ใช้ทั้ง 5 คน, anonymous, revoked และ wrong-workspace; สิทธิ์ทุก role ต้องตรง Yolk; Viewer self-only draft ได้แต่ไม่มี Apply/shared writes และสร้าง ShareGrant ใหม่ไม่ได้
- Server ตรวจ workspace membership และ role ทุก read/write; actor มาจาก session ที่ตรวจแล้ว
- ทดสอบสอง tenant ให้แน่ใจว่าเปิดอ่านหรือเขียนข้ามกันไม่ได้; Viewer เขียน shared records หรือ Apply ไม่ได้ แต่เก็บ self-only draft ได้
- `expectedRevision` ปฏิเสธข้อมูลเก่า; `idempotencyKey` เดิมไม่สร้างรายการหรือ audit/outbox ซ้ำ
- สิทธิ์ใช้ภายในกับเผยแพร่สาธารณะเป็นคนละ decision; public projection ต้องตัดช่องที่ยังไม่ cleared
- ผลภาคสนามมีเวลา ผู้บันทึก และหลักฐาน; คุณภาพพิกัด B ไม่เท่ากับผ่านภาคสนาม
- Private media ปฏิเสธ anonymous access; signed URL ไม่ใช่หลักฐานยินยอมเผยแพร่
- การอัปเดตข้อมูลมี source/hash/grain/vintage/coverage ชัด และไม่แปลงค่าที่ขาดเป็นศูนย์

## Prompt เริ่มงานหนึ่งชิ้นสำหรับ intern

> อ่าน Product Brief, `contracts/product-contract.json` และ `contracts/task-graph.json` จากนั้นอ่าน `AGENTS.md`/`START_HERE.md` ของ repo production ปัจจุบัน เลือกหนึ่ง task ที่ dependencies พร้อม ระบุ source SHA และข้อมูลรอบที่จะใช้ก่อนแก้ ทำเฉพาะ scope ของ task รักษา Demand/ชนิดค่า/null/สิทธิ์/งานที่บันทึกเดิม ห้ามเขียนทะเบียนหลัก เผยแพร่พิกัด เพิ่ม secret เปลี่ยน stack หรืออ้างว่า backend ที่ยังไม่มีเสร็จแล้ว ส่ง diff, ผล acceptance ที่ตรวจจริง, วิธีรัน และ manual gates ที่ยังค้าง

## Release decision

การ release production ต้องมีผู้รับผิดชอบของสำนักงานและเจ้าของผลิตภัณฑ์ยอมรับเกณฑ์/สิทธิ์/วิธีปฏิบัติ รวมถึง security, recovery และ baseline จากการทดลองจริง แยกผล browser simulation จากโทรศัพท์จริง โปรแกรมอ่านหน้าจอ และการตรวจข้อมูลต้นทาง

ลำดับหลักฐานของการ publish คือ source SHA → provider terminal success ของ SHA นั้น → live QA/asset bytes → attestation และ checksum ของ package ที่ส่งจริง Push สำเร็จอย่างเดียวไม่พิสูจน์ว่า URL ใช้รุ่นใหม่แล้ว
