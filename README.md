# POCIKA Inquiry & Site Visit Management System

## Project Purpose
This project is a dedicated Sales Inquiry and Site Visit Management System for **POCIKA FIRE & SAFETY PRODUCTS LLP**. It enables salespeople to rapidly log site visits, collect customer requirements, and upload photos while on the field. It also provides managers and admins with dashboards to track opportunities and follow-ups.

## Current Technology
This project is currently a **Frontend-Only Prototype** (Phase 6).
- HTML5
- CSS3 (Compiled via SCSS)
- Bootstrap 5 (via CDN)
- Vanilla JavaScript ES6+ (Modules)
- NO frameworks (React, Vue, etc.)
- NO active backend (Node/Express/MongoDB) yet.

## How to Run
1. Open a terminal in the project root.
2. Run a local web server (e.g., `npx serve .` or `python -m http.server`).
3. Navigate to `http://localhost:3000/pages/dashboard.html`.

## Project Structure
```
/
├── assets/             # Logos, placeholder images
├── css/                # Compiled CSS (main.css)
├── scss/               # Source SCSS files (main.scss, components, etc.)
├── js/                 # Vanilla JS Modules
│   ├── app.js          # Main entry (DOM listeners)
│   ├── utils.js        # Helpers (debounce, dates, DOM queries)
│   ├── form.js         # Central data model (inquiryData)
│   ├── draft.js        # LocalStorage saving/restoring
│   ├── steps.js        # Multi-step navigation logic
│   ├── validation.js   # Form validation rules
│   ├── conditional-fields.js # Show/hide logic
│   ├── photo-upload.js # Local photo preview logic
│   ├── review.js       # Step 8 dynamic rendering
│   ├── dashboard.js    # Sales Dashboard logic
│   ├── inquiries.js    # "My Inquiries" List & Filter logic
│   ├── admin-dashboard.js # Admin List & Filter logic
│   └── mock-data.js    # 30+ synthetic records for testing
├── pages/              # HTML Views
│   ├── dashboard.html
│   ├── inquiry.html
│   ├── success.html
│   ├── inquiries.html
│   └── admin-dashboard.html
├── docs/               # Architecture & QA Documentation
│   ├── field-mapping.md
│   └── design-system.md
└── README.md
```

## SCSS Architecture
Because there is no build step configured for this frontend prototype, changes to `.scss` files require a manual compilation step (e.g. `sass scss/main.scss css/main.css`). The browser only reads `css/main.css`.

## JavaScript Architecture
The application uses modern ES6 modules. Each file isolates a specific concern (validation, drafts, UI steps). State is primarily managed centrally via the exported `inquiryData` object in `form.js`. 

## Data Model
There is ONE canonical data structure representing an inquiry, closely mirroring the original POCIKA PDF form. See `docs/field-mapping.md` for exact mapping.

## LocalStorage & SessionStorage Usage
- **LocalStorage (`pocika_inquiry_draft`)**: Used to auto-save form progress.
- **SessionStorage (`pocika_submission`)**: Used to pass data briefly from the `inquiry.html` form to the `success.html` confirmation page.

## Mock Data
The `mock-data.js` file contains 30 fictional records representing various salespersons, products, and opportunity types to facilitate robust testing of filters, search, and sorting.

## Current Limitations (Important)
- **Frontend-only**: Refreshing list pages resets all filters.
- **Mock data**: Data displayed in tables is hardcoded (combined with temporary session drafts).
- **No real authentication**: Admin areas are accessible simply via URL routing.
- **No backend/database**: Photos uploaded are only stored as local object URLs and will disappear on refresh.
- **No real PDF generation**: The system does not yet produce downloadable PDFs.

## Future Backend Architecture (Contract)
The frontend prepares for integration with:
- **Node.js / Express**: REST APIs.
- **MongoDB**: To store the canonical `inquiryData` object.
- **Firebase Authentication**: For Sales vs. Admin roles.
- **Firebase Storage**: For persisting uploaded JPG/PNG site photos.
- **Puppeteer**: To consume the MongoDB JSON data and render a PDF matching the original company form.
