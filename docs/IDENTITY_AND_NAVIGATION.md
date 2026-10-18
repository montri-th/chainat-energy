# Identity and navigation · Chainat energy demo

This refresh preserves the existing Claude page story, datasets, analytical model and page routes. It adds the exact identity and interface artwork retained by Yolk 1.9.13, plus a compact disclosure and a Chainat-specific link preview.

## Asset delivery

`identity-manifest.json` is the exact byte inventory. All runtime identity assets are delivered from `assets/identity/`; no production logo or icon is hotlinked.

| Surface | Implementation |
|---|---|
| Header | Native 889 × 244 transparent Landometer logo, unchanged from the retained Yolk projection |
| Dark header | Retained alpha-mask treatment recolours only the wordmark; the coloured symbol stays unfiltered |
| Product name | Retained Yolk wordmark function; its O is the same egg used for Demand |
| Demand | One retained egg graphic |
| Opportunity | Three copies of the same retained egg graphic |
| Supply | Exact owner-selected storefront drawing; its scoped Outlined 400 exception does not change the other rounded glyphs |
| Other interface symbols | Retained 39-glyph Material Symbols Rounded font, FILL 0 / wght 300 / GRAD 0 / opsz 24 |
| Browser / home-screen | Exact retained portfolio files at 16, 32, 48, 180, 192 and 512 pixels |
| Link preview | `chainat-energy-share-7856ad154cb5.jpg`, 1200 × 630, image/jpeg; public editorial text and approved logo only |

The current owner request selects the same Landometer icon treatment as the Yolk reference for this specific demo and developer handoff. These are portfolio icon bytes. This release does not create a generic CityMETER identity-gradient tile or claim complete FAVICON-01 product-tile conformity. The 180 and 512 files have opaque beige canvases; the other four files and the header logo preserve transparent pixels.

The logo source projection uses the complete native source, proportionally resized without cropping. No new logo geometry, symbol recolouring or identity frame is introduced. No canonical numeric logo minimum or clear-space approval is invented; the delivered widths were reviewed at their actual rendered sizes.

## Navigation contract

The header exposes two direct controls: the brand link and the menu button. The product name and demo label are contextual text. The existing page module rail and its readable labels remain available.

The menu groups:

1. existing Chainat page destinations;
2. the existing Auto / Light / Dark theme control;
3. public CityMETER and Landometer destinations.

`js/identity.js` owns icon decoration and disclosure behaviour. The router in `js/app.js` owns page state and synchronizes every `a[data-view]` current-state marker. Opening transfers focus into the menu. Escape closes and returns focus to its trigger; outside activation and navigation close without stealing destination focus. Focus is not trapped. Every header target remains at least 44 × 44 CSS pixels. Selected states use restrained backgrounds and text weight; decorative brackets and coloured left rails are absent.

If the icon font fails, ligature names remain hidden, labels remain readable and the Yolk wordmark uses the retained text fallback. If disclosure JavaScript fails, the inactive menu control stays hidden and the existing page links remain usable.

## Metadata and visibility

The canonical path remains `https://montri-th.github.io/chainat-energy/`. Existing `noindex,nofollow` is preserved. The manifest uses `display: browser`; it makes no offline, backend, authentication or production-system claim. Open Graph and Twitter point to the same immutable share filename. Link-preview text identifies a demonstration and states that area demand is modelled.

The social source is `assets/identity/share-source.html`. It uses the current LDS fonts and the exact `measure.deep` atmosphere. It contains no person photography, restricted point coordinates, location identifiers or private source records. To replace it, render the complete 1200 × 630 canvas, inspect Thai glyphs and safe areas, save with the actual output MIME, calculate a new hash filename, and update the metadata and asset manifest together.

## Verification and limits

Focused browser review used the actual Thai content at 1200 × 800 and 360 × 800 in light and dark themes. Header, native logo, Yolk artwork, menu spacing, visible focus, route selection, 44-pixel targets and Escape focus restoration were inspected. The share composition was reviewed at 1200 × 630 before its bytes were saved.

The shared LDS package verifier passed 9,768 checks; this is package integrity, not an artifact or accessibility certificate. Native iOS home-screen display, real-device maskable cropping and third-party social scraper caches were not tested. Hostname-level favicon selection and third-party cache refresh remain outside this project-path release.
