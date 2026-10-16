# Demo QA

Checked 16 October 2026 (Asia/Bangkok), local Chrome headless desktop browser.

- 40 browser assertions passed. No browser exceptions.
- All four views rendered at 1440, 768, and 390 CSS pixels; no document-level horizontal overflow. The narrow data table intentionally scrolls within its container and has a visible hint.
- Visual review covered Thai headings, source cards, six dataset entries, plan target text, map labels, registry, admin, and metadata. Mobile map uses numbered areas and a readable district key.
- Thai 130% root-font fixture passed document containment; reduced viewport equivalent to 200% zoom passed containment. This is browser simulation, not a native device certification.
- Keyboard district selection, reduced motion, empty search, missing map boundary fallback, source detail dialog, filtered CSV export, and pagination tested.
- Draft edits, unsaved-edit guard, review permissions, return-to-draft, simulated publication, prior published snapshot retention, browser persistence, CSV dry run, duplicate rows, and revalidation at commit tested.
- Source figures reconcile: 203 + 18 + 57 = 278 source rows. Solar pumping subset excluded from combined counts. No facility coordinates fabricated. Baseline coverage remains unreported.
- Data extraction review scanned the public aggregate JSON against 384 sensitive source strings with zero matches. Original attachments are excluded. See data/DATA_QA.md.
- LDS package verifier passed 9,768 checks; analytical palette advisories belong to the source package. Static artifact checks passed, with an explicit warning that JavaScript requires rendered review. No full LDS conformance, WCAG/CVD certification, or team activation is claimed.

## Material limits

- This is a static public demonstration. Role switching does not implement authentication or server access control. Admin records and audit events are browser-local and separate from real source figures.
- Public source dates are unknown; project years are 2558–2563. Eight-district boundary geometry represents 2019.
- EV, a separate Solar register, and power infrastructure have no independent supplied master in this demo. Three source files do not establish delivery of five acceptance datasets.
- The current base registry has no approved CityMETER product icon tile; no substitute favicon was invented. Exact official Landometer artwork and fonts are used where supplied.
- Native iOS/Android and screen-reader review remain unperformed.

Machine-readable local browser assertions are in [browser-checks.json](browser-checks.json). Provider delivery and live-byte checks are recorded separately after publication.

Final map label layering adjustment: checked all eight label backplates above district boundaries and click-to-select from label text. Source counts unchanged.
