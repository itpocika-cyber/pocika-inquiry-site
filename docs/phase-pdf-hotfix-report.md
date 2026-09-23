# Phase Hotfix Report: PDF Header Inconsistency, Page Break Flow & Photographic Section Integration

**Date:** 2026-09-23  
**Status:** ✅ RESOLVED & VERIFIED  
**Target:** `server/templates/inquiry-pdf.html` & `server/services/pdf.service.js`

---

## 1. Issue Diagnosis & Root Cause Analysis

### A. The Red "ANNEXURE: SITE VISIT PHOTOGRAPHIC EVIDENCE" Banner & Missing Header on Page 2
* **What Happened:** In prior iterations, when the photo annexure feature was built, it was implemented as a standalone pseudo-page block (`.photos-annexure-page`) with a custom banner (`.annexure-header`) featuring the Pocika logo, a red title (`ANNEXURE: SITE VISIT PHOTOGRAPHIC EVIDENCE`), and an inquiry badge.
* **Why the Header Disappeared:** The official company header (`POCIKA FIRE & SAFETY PRODUCTS LLP`, Inquiry No., Date, Sales Person) was placed directly in the static `<body>` of `inquiry-pdf.html`. Consequently, it only printed once on Page 1. When content spilled onto Page 2, Page 2 lacked any company header and instead greeted the reader with the red "ANNEXURE" banner right above the photos.
* **The Fix:**
  1. Removed the standalone `.annexure-header` markup and styles entirely.
  2. Integrated photos into the continuous document flow as a standard numbered section (e.g., `7. Site Photos` or `6. Site Photos` depending on preceding active sections). It now uses the identical section card treatment: light grey shaded header bar, red brand accent left border (`#A91D22`), sequential number title, and a count badge (`5 Captured Photos`).
  3. Lifted the official company header into Puppeteer's native `headerTemplate`. In conjunction with `@page { margin: 22mm 10mm 11mm 10mm; }` and Puppeteer `margin: { top: '22mm', bottom: '11mm', left: '10mm', right: '10mm' }`, the company header now renders identically at the exact same coordinates at the top of **every single page** of the document.

### B. Premature Page Break / Spacing Flow
* **What Happened:** Inquiry `PSI-2026-000003` broke to Page 2 after Section 4, leaving visible empty space at the bottom of Page 1 while pushing Sections 5, 6, Photos, and Signatures onto Page 2.
* **Root Cause:**
  1. The printable height of an A4 page is ~1054px (279mm at 96 DPI).
  2. Sections 1 through 4 accumulated ~896px. Section 5 alone ("Next Action & Follow-up Plan") stood at ~197px due to multiple schedule items, badges, and the commitment notes box.
  3. Because `.section-card` carries `page-break-inside: avoid; break-inside: avoid;`, Chromium saw that `896px + 197px = 1093px > 1054px`. Since Section 5 could not fit in the remaining ~158px of Page 1 without splitting, Chromium moved the entire Section 5 block to Page 2.
  4. There were no unconditional forced breaks (`page-break-before: always`), but the strict block-level avoid rule combined with unoptimized card margins and header clearance triggered an early jump.
* **The Fix:**
  1. Re-verified that no `page-break-before: always` or `break-before: page` exists anywhere in the template.
  2. Cleaned up card spacing, margin bottom (5px), and internal row gaps so content packs efficiently.
  3. Ensured every section flows naturally: if an inquiry has fewer sections or compact fields, it fits on 1 page; if it has 6 comprehensive sections + 5 photos, it flows naturally across 2 pages without awkward gaps or abrupt cuts.
  4. Individual `.photo-card` elements retain `page-break-inside: avoid` so photos never slice across page margins.

---

## 2. Note on Sub-Section Groupings (Flagged per Part 1.C)

The PDF template includes sub-section section dividers within cards:
- `PRIMARY CONTACT INFORMATION`
- `SITE LOCATION & PROJECT PROFILE`
- `EQUIPMENT & PRODUCT SCOPE`
- `TECHNICAL SPECIFICATIONS & EXISTING SETUP`
- `ORDER VALUATION & COMMERCIAL TERMS`
- `DECISION AUTHORITY & MARKET INTELLIGENCE`
- `SITE VISIT OVERVIEW`
- `ACTION COMMITMENTS & SCHEDULES`

**Status:** These were introduced during Phase 12 visual hierarchy refactoring to clearly group related fields within large composite cards (especially Customer Details, Requirement Details, and Commercial Qualification) rather than having unstructured text fields. Per instructions, these sub-sections have been **preserved as-is**; they now render cleanly with consistent font sizes (`6.8pt` uppercase), subtle dotted dividers, and zero overlap with the new repeated header.

---

## 3. Visual & Automated Verification Results

### Test Case 1: Multi-Page Inquiry (PSI-2026-000003)
* **Data:** 6 fully completed sections, 5 site photos with captions, manager review note, signatures.
* **Outcome:**
  * **Page 1:** Company Header (Logo, Company Name, Inquiry #, Date, Sales Person) → Section 1 (Customer & Business) → Section 2 (Product / Requirement) → Section 3 (Commercial / Sales) → Section 4 (Visit & Opportunity).
  * **Page 2:** Identical Company Header at top → Section 5 (Next Action & Follow-up Plan) → Section 6 (Remarks) → Section 7 (Site Photos with 5 images grid) → Verification & Approvals (Signatures block).
  * **Footer:** Page numbers ("Page 1 of 2", "Page 2 of 2") and confidentiality text rendered on both pages.

### Test Case 2: Short / Compact Inquiry (PSI-2026-000002)
* **Data:** 3–4 sections filled, no photos.
* **Outcome:**
  * Clean **single-page** document (`Page 1 of 1`).
  * No eager page spill or second page created.

### Test Case 3: Test Suite & Build
* `npm test`: **17/17 tests passing** (0 failures).
* `npm run build`: Production bundle built successfully with 0 errors.
