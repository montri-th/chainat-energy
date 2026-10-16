# Chainat Energy demo data QA

Imported for the demo on **2026-10-16**. This is an import date, not a source observation date. The original spreadsheets and LOI are excluded from the repository. All public values are aggregate counts or explicitly qualified project metrics.

## Verified extraction results

| Source | Included rows | Definition |
| --- | ---: | --- |
| ผู้ประกอบการน้ำมันเชื้อเพลิง.xlsx | 203 | Numbered registry rows; 58 ก, 9 ค.2, 125 ค.1, 11 coin-vending |
| โรงงาน-อาคารควบคุม.xlsx | 18 | Numbered registry rows; 16 factories and 2 buildings |
| โครงการพลังงานในพื้นที่.xlsx | 57 | Canonical numbered support rows after removing 15 exact duplicate locality-view rows from 72 raw numbered rows |

**278 is the sum of source rows, not verified unique establishments.** It cannot be presented as progress against the LOI's 289-establishment baseline. The supplied files do not provide a signed crosswalk or shared stable asset IDs. There may be overlap between a fuel/controlled facility and a project beneficiary.

### Exact source ranges

- Fuel: `ประเภท ก!A2:H59` (58), `ประเภท ค.ลักษณะที่ 2!A2:H10` (9), `ประเภท ค.ลักษณะที่ 1!A2:H126` (125), `ประเภท ง คู้หยอดเหรียญ!A2:H12` (11). Sheet names are retained exactly, including the source typo `คู้`.
- Controlled: `รายชื่อ พพ. !A3:Q20` (18); the sheet name has a trailing space. District is parsed from column J address text solely to calculate aggregate counts.
- Projects canonical: `01 Solar pumping!A3:N49` (47), `03 เตาชีวมวล!A5:N6` (2), `04 Biogas!A5:N5` (1), `05 ระบบอบแห้ง!A5:N11` (7).
- Project duplicate views excluded: `หางน้ำสาคร!A4:N5` (2), `บางขุด!A4:N11` (8), `สรรพยา!A4:N4` plus `A9:N12` (5). Comparing normalized A:N values yields 57 distinct records. Each of the 15 view rows matches exactly one solar-pumping row.
- Project template sheets with zero numbered records: `02 ระบบผลิตน้ำร้อน`, `06 Off-Grid`, `07 Solar street light`, `08 อื่นๆ`. Empty templates do not count as datasets delivered.

## District aggregation

Two explicit district normalizations: fuel F3 in `ประเภท ค.ลักษณะที่ 2` has `ห้นคา` and is grouped under `หันคา`; two project I-column values `เมือง` are grouped under `เมืองชัยนาท`. One fuel category value `ค 1` is grouped under `ค.1`, consistent with its sheet name. Original files are unchanged. All 278 included source rows resolve to one of eight districts, so **unassigned district rows = 0**. If future rows do not resolve, they must remain an unassigned bucket included in province totals and excluded from district polygons. A category count of 0 means no matching rows in these supplied files; it is not a surveyed absence or measured zero in the real world.

| District | Fuel rows | Controlled rows | Project support rows |
| --- | ---: | ---: | ---: |
| เมืองชัยนาท | 35 | 4 | 7 |
| มโนรมย์ | 21 | 6 | 5 |
| วัดสิงห์ | 25 | 0 | 11 |
| สรรพยา | 20 | 2 | 6 |
| สรรคบุรี | 40 | 0 | 18 |
| หันคา | 38 | 4 | 6 |
| หนองมะโมง | 13 | 1 | 0 |
| เนินขาม | 11 | 1 | 4 |

## Evidence boundaries

- No supplied table contains latitude/longitude fields. Available coordinate pairs = 0. Verified coordinates = 0 because verification has not started. Coordinate coverage for the LOI baseline is **not computable**, rather than a claimed 0% production result. District polygons, if added, are summaries and never stand in for establishment locations.
- Spreadsheet observation/verification dates are absent. The projects have participation years BE 2558–2563 (2015–2020). No source supports “live”, “current”, “latest verified”, operational availability, completeness of the province, or public-master status.
- Historical project usage text gives 51 normal, 4 damaged and 2 blank records, without observation dates. This may be displayed only as unverified recorded status, not current condition.
- The 47 solar-pumping rows specify one system each, with nominal rated power 25×1 + 3×27 + 2.5×14 + 50×1 + 5×4 = **211 kW**. It is not electricity generated, not currently operating capacity, not a solar-potential estimate and not a province-wide solar total. Solar drying is thermal technology and must not be added to electrical capacity.
- Fuel types are copied as source categories. No legal classification, current license validity or business-operating assertion is inferred.
- The controlled-source color-mark columns have no supplied legend and are omitted. They must not become a risk/compliance score.
- EV and power-infrastructure records are absent; their dataset counts are null/awaiting source. Solar pumping is a subset of the project table, not an independently verified solar register. The demo has three source-backed aggregate datasets and does not claim to have met the five-dataset acceptance requirement.
- LOI page 3 visually confirms “95%”, “274 from 289” and at least five datasets while enumerating six logical groups. 274/289=94.81%; 275/289=95.16%. The plan proposes 275 as technical target pending written acceptance. Do not silently resolve contractual acceptance in the demo.

## Public minimization

Only aggregated district/category/year counts and qualified technology metrics are exported. No entity or beneficiary names, personal names, telephone numbers, exact addresses, registration/license identifiers, TSIC identifiers, source photos or signatures are present in the public JSON. Do not add the raw workbooks, LOI PDF or full implementation plan to public Git history. Publishing the demo does not approve source-record visibility or production use.

The JSON includes filenames, SHA-256 fingerprints, exact source ranges, transformations and limitations so the aggregates remain traceable without copying raw source records. Aggregate IDs describe stable group dimensions rather than claiming master-asset IDs.

## Checks completed

- Numbered-row selection excludes headers, instructions, blank/dash template rows.
- District totals reconcile exactly to 203 fuel + 18 controlled + 57 project rows.
- Fuel category totals, project technology totals, participation-year totals and recorded-usage totals reconcile to their source selections.
- Project duplicates compared across normalized A:N fields: 72 raw rows, 57 distinct, 15 duplicate views removed.
- Nominal solar-pumping power independently summed from L3:L49 = 211 kW.
- Source originals read only. No source files copied into repository.
