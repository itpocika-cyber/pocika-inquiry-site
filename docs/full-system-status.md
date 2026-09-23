# POCIKA Sales Inquiry & Site Visit Management System — Full System Status Report

**Snapshot Date:** 2026-09-23  
**Audience:** Technical Sync & System Audit (for Claude & Development Team)  
**Repository State:** Live Production Ready / Active Hotfix Verified

---

## 1. Pages & Routes Architecture

All frontend routing is defined in `client/src/App.jsx` using `react-router-dom` (v7) and protected by `ProtectedRoute.jsx` and `ErrorBoundary.jsx`:

| Path | Component | Target Role(s) | Description |
| :--- | :--- | :--- | :--- |
| `/login` | `Login.jsx` | Public | JWT login authentication with email & password, remember me, error alerts. |
| `/` | `RootRedirect` | Authenticated | Smart redirect: forwards `admin`, `super_admin`, `manager` to `/admin-dashboard`, and `sales_person` to `/dashboard`. |
| `/dashboard` | `Dashboard.jsx` | `sales_person`, `admin`, `super_admin`, `manager` | Salesperson operational dashboard: inquiry metrics, monthly targets, quick action buttons, recent inquiry feed, announcements banner. |
| `/inquiries` | `InquiriesList.jsx` | `sales_person`, `admin`, `super_admin`, `manager` | Searchable & filterable inquiry register (opportunity, deal status, manager review, date range, search) with pagination, Excel export, and direct PDF download. |
| `/inquiry` | `InquiryForm.jsx` | `sales_person` | 8-step multi-step inquiry creation wizard: localStorage draft auto-save, offline queue, smart step auto-defaults, company history lookup, validation. |
| `/success` | `Success.jsx` | `sales_person` | Post-submission confirmation screen showing assigned Inquiry Number (`PSI-YYYY-XXXXXX`) and navigation actions. |
| `/inquiries/:id` | `InquiryDetails.jsx` | All authenticated (scoped) | Full inquiry view and management: detail cards, photo gallery with upload & delete, comments thread, manager review selector, deal status, and PDF generator. |
| `/admin-dashboard` | `AdminDashboard.jsx` | `admin`, `super_admin`, `manager` | Executive management command center: KPI cards, deal pipeline funnel, opportunity breakdown, team comparison, overdue follow-ups, renewal reminders, announcement modal. |
| `/admin/team` | `ManageTeam.jsx` | `admin`, `super_admin` | Team management: list team members, create users with auto-generated passwords, toggle active/inactive status, role assignments. |
| `/admin/team/:userId` | `SalesMemberDetail.jsx` | `admin`, `super_admin`, `manager` | Deep-dive performance view for an individual salesperson: inquiry breakdown, activity log, conversion rate. |
| `/catalog` | `ProductCatalog.jsx` | All authenticated | Read-only product catalog for field sales representatives during client site visits. |
| `/admin/catalog` | `ManageCatalog.jsx` | `admin`, `super_admin`, `manager` | Catalog management: add/edit/delete product items, specs, pricing hints, and categories. |
| `/design-system` | `DesignSystem.jsx` | Public / Dev | Living UI design system showcasing color palettes, typography, button variants, badges, and card components. |

---

## 2. Roles & Permissions Matrix (Actual Code Reality)

Authentication is handled via JWT tokens verified by `server/middleware/auth.js`. Role authorization is enforced via `server/middleware/authorize.js` and controller-level ownership checks:

| Capability / Resource | `sales_person` | `manager` | `admin` | `super_admin` | Notes / Code Enforcement |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Login & Session** | ✅ | ✅ | ✅ | ✅ | All receive signed JWT containing user ID, email, role. |
| **Create Inquiry** | ✅ | ✅ | ✅ | ✅ | `POST /api/v1/inquiries`. Server authoritatively stamps `createdBy` and `salesPerson`. |
| **View Inquiries List** | **Own Only** | **All** | **All** | **All** | Salesperson query strictly forced: `{ 'createdBy.userId': user.id }`. |
| **View Single Inquiry** | **Own Only** | **All** | **All** | **All** | `GET /api/v1/inquiries/:id` returns 403 Forbidden if salesperson does not own the inquiry. |
| **Edit Submitted Inquiry** | ❌ (Blocked) | ✅ | ✅ | ✅ | `PATCH /api/v1/inquiries/:id` explicitly restricts updates to `['admin', 'super_admin', 'manager']`. |
| **Upload / Delete Photos** | **Own Only** | ✅ | ✅ | ✅ | Photo deletion allowed if user is inquiry owner OR admin/manager. |
| **Post Comments** | **Own Only** | ✅ | ✅ | ✅ | Adds comment subdocument with author identity and role. |
| **Manager Review** | ❌ | ✅ | ✅ | ✅ | Updates `managerReview.status`, `managerReview.remarks`, and stamps `reviewedBy`. |
| **Export Excel** | ❌ (UI hidden) | ✅ | ✅ | ✅ | `GET /api/v1/inquiries/export/excel`. |
| **Download PDF** | **Own Only** | **All** | **All** | **All** | `GET /api/v1/inquiries/:id/pdf`. |
| **View Admin Dashboard** | ❌ (403) | ✅ | ✅ | ✅ | Route guarded on frontend and controller level. |
| **Manage Announcements**| ❌ (403) | ✅ | ✅ | ✅ | `POST/PATCH/DELETE /api/v1/announcements` restricted to `admin`, `super_admin`, `manager`. |
| **Manage Catalog** | ❌ (403) | ✅ | ✅ | ✅ | `POST/PATCH/DELETE /api/v1/catalog` restricted to `admin`, `super_admin`, `manager`. |
| **Manage Users & Team** | ❌ (403) | ❌ (403) | ✅ | ✅ | `server/routes/user.routes.js` restricted strictly to `admin` and `super_admin`. |

---

## 3. Data Model Reality

### A. `Inquiry` Schema (`server/models/Inquiry.js`)
* **Identifiers & Timestamps:**
  * `inquiryNumber`: `String` (Unique, auto-generated sequence e.g. `PSI-2026-000003`)
  * `date`: `String` (`YYYY-MM-DD`)
  * `salesPerson`: `String` (Authoritative from user display name / email)
  * `status`: `String` (`enum: ['draft', 'submitted']`, default `'submitted'`)
  * `companyKey`: `String` (Indexed composite key `companyname_10digits` for duplicate detection)
  * `timestamps`: `createdAt`, `updatedAt`
* **Customer (`customer`):**
  * `companyName` (req), `contactPerson` (req), `designation`, `mobile` (req), `email`, `billingAddress`, `siteLocation` (req), `gstNo`.
* **Business (`business`):**
  * `customerType` (req), `customerTypeOther`, `industryType`, `locationGidc`, `facility` (req), `facilityOther`, `areaSqft`, `floors`, `basement`, `status` (req), `expectedDate`.
* **Products:**
  * `products`: `[String]`, `productOther`: `String`.
* **Requirement (`requirement`):**
  * `productSpecification`: `String`
  * `estimatedQuantity`: `String`
  * `currentBrand`: `String`
  * `currentPurchase`: `String`
  * `reason`: `String`
  * `renewalDueDate`: `String` (`YYYY-MM-DD` for AMC/Refilling alerts)
* **Commercial (`commercial`):**
  * `requirementValue`: `Mixed` (Numeric or bracket string e.g. `'₹1,00,000–₹2,50,000'`)
  * `expectedOrderValue`: `Mixed` (Numeric or bracket string e.g. `'₹50,000–₹1,00,000'`)
  * `budget`: `String`
  * `paymentTerms`: `String`
  * `decisionMakerName`: `String`, `decisionMakerDesignation`: `String`, `decisionRole`: `String`
  * `purchaseDecisionBy`: `String`, `competitors`: `String`
* **Visit (`visit`):**
  * `visitType`: `String`
  * `personMet`: `String`
  * `requirementDiscussed`: `String`
  * `photos`: `String` (`"Taken"` / `"Not Required"`)
  * `opportunity`: `String` (`HOT`, `WARM`, `COLD`, `FUTURE POTENTIAL`, `DEALER DEVELOPMENT`, `NO REQUIREMENT`)
* **Follow-up (`followUp`):**
  * `nextAction`: `[String]`
  * `nextVisitType`: `String`
  * `quotationDate`: `String` (`YYYY-MM-DD`)
  * `followUpDate`: `String` (`YYYY-MM-DD`)
  * `nextActionCommitment`: `String`
  * `dealStatus`: `String` (`enum: ['Pending', 'Won', 'Lost']`, default `'Pending'`)
* **Remarks:** `String`
* **Photos (`photos` array):**
  * `photoId`: `String` (UUID)
  * `publicId`: `String` (Cloudinary public ID)
  * `secureUrl`, `url`: `String`
  * `caption`: `String`
  * `latitude`, `longitude`: `Number` (GPS tagging)
  * `resourceType`, `format`, `width`, `height`, `bytes`, `sizeKB`
  * `originalFileName`, `fileName`, `previewUrl`
  * `uploadedBy`: `{ userId, firebaseUid, email }`
  * `uploadedAt`: `Date`, `sortOrder`: `Number`
* **Manager Review (`managerReview`):**
  * `status`: `String` (`enum: ['Pending', 'Reviewed', 'Needs Follow-up', 'Approved', 'Rejected']`)
  * `reviewedBy`: `String`, `reviewedAt`: `Date`, `remarks`: `String`
* **Comments (`comments` array):**
  * `commentId`: `String` (UUID), `text`: `String`
  * `author`: `{ userId, name, email, role }`, `createdAt`: `Date`
* **Ownership (`createdBy`):**
  * `userId`: `String`, `firebaseUid`: `String`, `email`: `String`, `name`: `String`

### B. `User` Schema (`server/models/User.js`)
* `email`: `String` (Unique, lowercase, required)
* `password`: `String` (Bcrypt hashed via pre-save hook)
* `displayName`: `String`
* `photoURL`: `String`
* `role`: `String` (`enum: ['super_admin', 'admin', 'manager', 'sales_person']`)
* `isActive`: `Boolean` (default `true`)
* `lastLoginAt`: `Date`
* `firebaseUid`: `String` (sparse index for legacy compatibility)
* `timestamps`: `createdAt`, `updatedAt`

### C. Other Collections
* `Announcement`: `title`, `message`, `type` (`info`, `warning`, `urgent`), `isActive`, `createdBy`, `timestamps`.
* `ProductCatalog`: `name`, `category`, `description`, `specifications`, `priceHint`, `imageUrl`, `isActive`, `timestamps`.
* `Counter`: `sequence_value` for atomic incrementation of `PSI-YYYY-XXXXXX`.

---

## 4. Design Tokens & Styling Reality

Located in `client/src/styles/variables.css` and `client/src/styles/abstracts/_variables.scss`:

* **Colors:**
  * Primary Dark / Navy: `#0B1F33` (`--color-navy`), Hover: `#14304F`
  * Primary Accent Blue: `#2563EB` (`--color-primary`), Dark: `#1D4ED8`
  * Pocika Brand Accent Red: `#A91D22` (PDF headers, brand badges, active step rings)
  * Neutrals & Background: Canvas `#F5F7FA`, White `#FFFFFF`, Dark Text `#111827`, Muted Text `#6B7280`, Borders `#E5E7EB`
  * Functional Semantics: Success `#16A34A`, Warning `#D97706`, Danger `#DC2626`
* **Typography:**
  * Base Font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`
  * Scale: `xs` (12px), `sm` (14px), `base` (16px), `md` (18px), `lg` (22px), `xl` (28px), `xxl` (36px)
* **Spacing Scale:**
  * 4px (`--space-1`), 8px (`--space-2`), 12px (`--space-3`), 16px (`--space-4`), 24px (`--space-5`), 32px (`--space-6`), 40px (`--space-7`), 48px (`--space-8`)
* **Radii & Shadows:**
  * Border radii: 8px (inputs/buttons), 12px (chips), 16px (cards), 999px (pills)
  * Box shadows: subtle layered elevation (`0 1px 2px rgba(11,31,51,0.06)`, `0 2px 8px rgba(11,31,51,0.08)`)

---

## 5. Known Issues & Operational Considerations

1. **Client Bundle Size Warning:**
   * Vite reports `dist/assets/index-DpG42UZ9.js` is 571 kB minified (>500 kB limit warning). This is caused by bundling Lucide icons, bootstrap grid, and large page components in a single chunk. Not a runtime error, but code-splitting via dynamic `React.lazy()` / `import()` should be scheduled.
2. **Dart Sass Deprecation Warning:**
   * Vite compilation outputs a deprecation notice regarding the legacy JS API for Sass (standard Dart Sass 2.0 modernization warning). Harmless today.
3. **Salesperson UI Editing Restriction:**
   * In `InquiryDetails.jsx`, if a salesperson attempts to edit core inquiry fields via the modal, the backend intentionally returns `403 Forbidden` because submitted inquiries are locked to `admin`/`manager`. Sales reps can only post comments and upload photos to their inquiries.
4. **Geolocation Availability:**
   * Photo GPS extraction in `InquiryForm` relies on browser permissions and HTTPS; if unavailable, latitude/longitude fall back to `null` safely without halting upload.

---

## 6. Complete Feature Checklist

| Feature | Scope / Behavior | Verification Status |
| :--- | :--- | :--- |
| **JWT Authentication** | Email/Password login, bcrypt verification, session persistence, auto-refresh | ✅ Confirmed Working |
| **Role-Based Access Control**| Route guards and backend query/mutation scoping across 4 roles | ✅ Confirmed Working (17/17 tests passing) |
| **8-Step Inquiry Form** | Multi-step form wizard with forward/backward navigation | ✅ Confirmed Working |
| **Conditional Form Fields** | Dynamic reveal of "Other" inputs, facility types, GIDC, etc. | ✅ Confirmed Working |
| **Smart Step Auto-Defaults** | Auto-fills reason, decision maker, and person met across steps | ✅ Confirmed Working |
| **Draft Auto-Save** | LocalStorage draft caching with resume modal and discard options | ✅ Confirmed Working |
| **Offline Submission Queue** | LocalStorage queue with automatic retry on `window.online` event | ✅ Confirmed Working |
| **Company History Lookup** | Detects existing customer by name/mobile and flags prior visits | ✅ Confirmed Working |
| **Cloudinary Media Upload** | Uploads photos, generates 4 variants (thumb, preview, full, pdf), stores 0 base64 in DB | ✅ Confirmed Working |
| **PDF Generation (Puppeteer)**| Multi-page report with repeated company header, sequential section numbering, zero forced breaks | ✅ Confirmed Working & Hotfixed |
| **Single-Page Compact PDF** | Short inquiries render cleanly as single page with no second page spill | ✅ Confirmed Working |
| **Excel Export** | Formatted `.xlsx` export of filtered inquiries via ExcelJS | ✅ Confirmed Working |
| **Internal Comment Threads** | Live comment timeline per inquiry with author badge and timestamps | ✅ Confirmed Working |
| **Manager Review Workflow** | Status selector (`Approved`, `Needs Follow-up`, etc.) + review remarks | ✅ Confirmed Working |
| **Deal Status Tracking** | `Won`, `Lost`, `Pending` deal statuses with visual badges | ✅ Confirmed Working |
| **AMC Renewal Reminders** | Tracks `renewalDueDate` with dashboard warning pills | ✅ Confirmed Working |
| **Stale Lead Detection** | Highlights pending deals with overdue follow-up dates | ✅ Confirmed Working |
| **Admin Team Management** | Create team members, generate temporary passwords, toggle active status | ✅ Confirmed Working |
| **Announcements Banner** | Global alerts published by admin/manager shown on dashboards | ✅ Confirmed Working |
| **Product Catalog** | Client-facing product browser with category filtering and specs | ✅ Confirmed Working |

---

## 7. Deployment & Environment Snapshot

* **Hosting Targets:**
  * **Backend:** Render Web Service (Node.js 20+ runtime, `npm run server:start`).
  * **Frontend:** Vercel (Vite React SPA, `client/vercel.json` rewrite configured).
  * **Database:** MongoDB Atlas (Replica Set cluster).
  * **Media Storage:** Cloudinary (`pocika-inquiries/` folder namespace).
* **CI/CD Pipeline:**
  * GitLab CI configuration present in `.gitlab-ci.yml` (`install` → `lint` → `test` → `build`).
* **Environment Variables List (Names Only):**
  * **Backend (`server`):**
    * `NODE_ENV`
    * `PORT`
    * `MONGODB_URI`
    * `JWT_SECRET`
    * `CLIENT_ORIGIN`
    * `CLOUDINARY_CLOUD_NAME`
    * `CLOUDINARY_API_KEY`
    * `CLOUDINARY_API_SECRET`
    * `FIREBASE_ENABLED` (Set to `false` in current architecture)
    * `FIREBASE_PROJECT_ID` (Optional legacy)
    * `FIREBASE_CLIENT_EMAIL` (Optional legacy)
    * `FIREBASE_PRIVATE_KEY` (Optional legacy)
  * **Frontend (`client`):**
    * `VITE_API_BASE_URL`
