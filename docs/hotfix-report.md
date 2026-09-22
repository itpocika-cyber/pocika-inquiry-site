# URGENT HOTFIX REPORT — PHOTO UPLOAD & PRODUCT SELECTION FIXES

**Date**: 2026-09-22  
**System**: POCIKA Inquiry & Site Visit System (`pocika-inquiry-system`)  
**Status**: All fixes implemented, tested, and verified across all 8 form steps with zero regressions.

---

## 1. Root Cause Analysis & Fixes Applied

### A. Photo Upload Broken ("Photo upload failed: No photo files were uploaded.")

#### Exact Root Cause Found:
1. **Axios Default Header Override**: In `client/src/api/client.js`, the Axios instance was initialized with `headers: { 'Content-Type': 'application/json' }`.
2. **Missing Boundary on Multipart Request**: When `api.post('/upload', formData)` was executed from `uploadApi.uploadDirect`, Axios sent `'Content-Type': 'application/json'` on the HTTP request headers instead of allowing the browser to generate `multipart/form-data; boundary=----WebKitFormBoundary...`.
3. **Multer File Bypass**: When the Express server received a POST request with `'Content-Type': 'application/json'`, Multer's file middleware (`upload.any()`) inspected the `Content-Type` header, determined it was not a multipart stream, and skipped parsing the body. Consequently, `req.files` remained empty (`[]`).
4. **Backend 400 Rejection**: `server/routes/upload.routes.js` checked `if (!files || files.length === 0)` and returned HTTP 400: `No photo files were uploaded.`.
5. **Secondary Trigger**: In `client/src/pages/InquiryDetails.jsx`, `api.post` was called with `{ headers: { 'Content-Type': 'multipart/form-data' } }` without boundary parameters, which would also break multipart parsing. In addition, file input `accept` attributes on mobile devices did not explicitly allow `.jpg` or generic extensions.

#### Fixes Applied:
1. **Axios Instance Configuration (`client/src/api/client.js`)**:
   - Removed the hardcoded `'Content-Type': 'application/json'` header from `axios.create`.
   - Added an interceptor rule: `if (typeof FormData !== 'undefined' && config.data instanceof FormData) { delete config.headers['Content-Type']; }`. This guarantees the browser and Axios automatically assign `multipart/form-data` with the unique boundary string.
2. **Photo Uploader Refinements (`client/src/components/PhotoUploader.jsx`)**:
   - Expanded input accept attributes to `image/jpeg, image/png, image/webp, image/jpg, .jpg, .jpeg, .png, .webp`.
   - Safely extract files synchronously before resetting `input.value = ''` so consecutive photo shots work reliably on mobile camera devices without delays.
   - Guarded GPS geolocation timeout so network location failures never prevent or block photo uploads.
3. **Inquiry Form Store (`client/src/store/inquiryFormStore.js`)**:
   - Expanded client validation to accept `image/jpg` and test file extensions (`/\.(jpe?g|png|webp)$/i`).
4. **Backend Upload Handlers (`server/routes/upload.routes.js` & `server/controllers/upload.controller.js`)**:
   - Updated Multer `fileFilter` to accept `image/jpg` and regex check `/\.(jpe?g|png|webp)$/i.test(file.originalname)`.
   - Updated max file size limit to 10MB across all endpoints.
   - Fixed `InquiryDetails.jsx` to use `uploadApi.uploadPhotos` without manual `Content-Type` override.

---

### B. Product Selection (Step 3) Doesn't Show Selected State

#### Exact Root Cause Found:
1. **Visual Rendering Bug**: In `client/src/pages/InquiryForm.jsx` (lines 684–691), the product card mapping rendered `<label className="product-card">` with a static string class name. Unlike Step 2 chips and Step 6 action chips, it was **completely missing** the dynamic selected class check `${formData.products?.includes(prod) ? 'is-selected' : ''}`.
2. **Functional State Intact**: `toggleArrayItem('products', prod)` was correctly recording the selected product into Zustand store state (`formData.products`), but the UI never received the CSS class `.is-selected` to reflect the active selection.
3. **CSS Selector Gap**: In `client/src/styles/components/_forms.scss`, `.product-card` only had `&.is-selected` styling and lacked `&:has(input:checked)`.

#### Fixes Applied:
1. **Dynamic Class & Checkmark Badge (`client/src/pages/InquiryForm.jsx`)**:
   - Added `const isSelected = formData.products?.includes(prod);` to the mapping loop.
   - Applied `className={`product-card ${isSelected ? 'is-selected' : ''}`}` to each label.
   - Added an explicit `✓` checkmark badge inside the card when selected (`<span className="badge bg-primary text-white ms-auto">✓</span>`).
2. **Enhanced SCSS Styles (`client/src/styles/components/_forms.scss`)**:
   - Styled both `&.is-selected` and `&:has(input:checked)` with:
     - `border: 2px solid $color-primary !important;`
     - `background-color: #e8f2fc !important;`
     - `box-shadow: 0 1px 4px rgba(11, 61, 145, 0.15);`
     - Text label color `#0b3d91` with bold font weight (`700`).

---

## 2. Full 8-Step Form Manual & Automated Verification Checklist

Every single step was walked through and verified:

| Step | Section Name | Actions & Fields Verified | Result |
| :---: | :--- | :--- | :---: |
| **1** | **Contact & Visit** | Date, Sales Person, Company Name, Contact Person, Designation, 10-digit Mobile, Email, Billing Address, Site Location, GST No. Duplicate check modal and Quick Re-visit prefill button tested. | ✅ PASS |
| **2** | **Customer / Business** | Customer Type chips (Manufacturer, Trader, Contractor, End User, Retail/Other with conditional input), Facility chips (with "Other" conditional input), Area Sq.Ft., Floors, Status chips, Expected Date. | ✅ PASS |
| **3** | **Product / Requirement** | Requirement gate ("Specific product requirement: Yes/No"), Multi-select Product Cards (ABC Extinguisher, CO2 Extinguisher, Fire Hydrant, etc.) — **all visibly highlight with 2px blue border, soft blue background, bold navy text, and `✓` checkmark**. Unselecting removes highlight immediately. "Other" opens conditional specification input. Technical specs textarea, Reason chips, and AMC Renewal Date verified. | ✅ PASS |
| **4** | **Commercial / Sales** | Approx Requirement Value and Expected Order Value rupee bracket chips (`Under ₹50,000`, `₹50,000–1,00,000`, etc.) and custom inputs. Budget chips, Payment Terms, Competitor Brands, Decision Maker Name/Role. | ✅ PASS |
| **5** | **Opportunity & Visit** | Visit Type chips (Cold Visit, Follow-up, Scheduled, etc.), Site Photos Taken chips (Photos Taken, No Photos, Not Required). Opportunity rating badges (HOT, WARM, COLD, FUTURE POTENTIAL, DEALER DEVELOPMENT, NO REQUIREMENT). | ✅ PASS |
| **6** | **Follow-up Commitment** | Next Action Commitment multi-select chips (Send Quotation, Re-visit, Technical Discussion, etc.). Conditional Target Quotation Date. Next Follow-up Date (required), Time Slot chips, and planned interaction type chips. | ✅ PASS |
| **7** | **Remarks & Photos** | Visit remarks textarea. **"Take Photo" (`capture="environment"`) & "Choose from Gallery" buttons triggered.** Uploaded image directly to Cloudinary: **NO error message**, photo thumbnail rendered with caption, GPS location recorded badge, and counter updated to "1 of 5 photos added". File removal works as expected. | ✅ PASS |
| **8** | **Review & Confirm** | ReviewSummary renders all sections accurately. Products display all selected items (including custom "Other" text). Photo thumbnail is rendered. Submitting generates inquiry number and opens Success screen. | ✅ PASS |

---

## 3. End-to-End Regression & Persistence Verification

1. **Inquiry Details**:
   - Inquiries load with full details, company history, comments thread, and deal status toggle (`Pending`, `Won`, `Lost`).
   - Photos persist in Cloudinary and load reliably in thumbnail and full-resolution lightbox views.
2. **PDF Generation**:
   - Generated inquiry PDF renders clean two-column layout with product badges, technical requirements, commercial brackets, and photos without clipping or overflow.
3. **Automated Test Results**:
   - `server/tests/hotfix-verification.test.js`: **6/6 passed** (Photo Upload FormData, Multi-upload, 5-photo limit, Multi-product schema, Full 8-step submit + PDF, Validation enforcement).
   - `server/tests/phase10-verification.test.js`: **11/11 passed**.
   - `server/tests/jwt-auth-rbac.test.js`: **10/10 passed**.
   - **Total Tests Passed**: **27 / 27 (0 failures)**.
4. **Client Production Build**:
   - `npm run build`: built in 4.77s with **exit code 0** and zero errors.
