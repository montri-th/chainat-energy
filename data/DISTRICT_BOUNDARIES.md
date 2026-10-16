# Chainat district boundary attribution

`districts.geojson` contains the eight Chainat district polygons selected from the **geoBoundaries gbOpen Thailand ADM2** simplified GeoJSON, boundary ID `THA-ADM2-78962969`.

District boundaries: **Royal Thai Survey Department / OCHA ROAP**, via **geoBoundaries gbOpen THA ADM2 (2019)**, licensed under [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). Extracted eight Chainat districts from the source simplified geometry; Thai labels and stable demo IDs added. This attribution does not imply endorsement by the source organizations.

Source metadata reports that the boundaries represent **2019**, with source data updated **19 January 2023** and a geoBoundaries build dated **12 December 2023**. The data was retrieved **16 October 2026**. The source download is pinned to release commit `9469f09`.

- [Current geoBoundaries API metadata](https://www.geoboundaries.org/api/current/gbOpen/THA/ADM2/)
- [Pinned simplified GeoJSON](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/THA/ADM2/geoBoundaries-THA-ADM2_simplified.geojson)
- [Pinned release metadata](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/THA/ADM2/geoBoundaries-THA-ADM2-metaData.json)
- [Original dataset named in source metadata](https://data.humdata.org/dataset/thailand-administrative-boundaries)

The coordinates are preserved from the source simplified polygons without further generalisation. No polygons were drawn or inferred. GeoJSON coordinates use longitude, latitude in WGS 84. The bounding box is `[99.71976214800009, 14.906598938000059, 100.35152437900007, 15.417357425000034]`.

| Demo ID | Thai district | Source district name |
|---|---|---|
| `mueang-chainat` | เมืองชัยนาท | Mueang Chai Nat |
| `manorom` | มโนรมย์ | Manorom |
| `wat-sing` | วัดสิงห์ | Wat Sing |
| `sapphaya` | สรรพยา | Sapphaya |
| `sankhaburi` | สรรคบุรี | Sankhaburi |
| `hankha` | หันคา | Hankha |
| `nong-mamong` | หนองมะโมง | Nong Mamong |
| `noen-kham` | เนินขาม | Noen Kham |

The map supports overview and district selection. It is **not cadastral or legal boundary evidence**, and the 2019 source does not establish current administrative boundaries. District geometry does not establish the location of any individual energy record.

Suggested visible Thai attribution:

> ขอบเขตอำเภอ: Royal Thai Survey Department / OCHA ROAP ผ่าน geoBoundaries (ข้อมูลปี 2019), CC BY 3.0 IGO · ใช้เพื่อภาพรวม ไม่ใช่หลักฐานแนวเขตตามกฎหมาย

`districts-source.json` retains the full API and pinned release metadata, selected source shape IDs, checksums, transformation record, and verification results. The original HDX page returned HTTP 403 through the web reader; source attribution and licensing were confirmed from both geoBoundaries metadata records.
