# POCIKA Inquiry & Site Visit Management System

## Project Purpose
This project is a dedicated Sales Inquiry and Site Visit Management System for **POCIKA FIRE & SAFETY PRODUCTS LLP**. It enables salespeople to rapidly log site visits, collect customer requirements, and attach photos while on the field. It also provides sales managers and administrators with dashboards to track opportunities, follow-ups, and inquiry records with strict data isolation and role-based permissions.

---

## Architecture & Technology Stack

### Frontend Architecture
- **HTML5 & Vanilla JavaScript (ES6+ Modules)**
- **CSS3 / SCSS** with tailored Apple-inspired, professional dark navy & crimson design system
- **Bootstrap 5.3** for layout and responsive grids
- **Firebase Client SDK (v10.8.1 Modular)** for Google Sign-In and session tokens

### Backend Architecture
- **Node.js & Express 5** RESTful API
- **Firebase Admin SDK (v14.4.0)** for server-side token signature and expiry verification
- **MongoDB & Mongoose (v9.10.1)** for data persistence, User model, and Inquiry model
- **Zod (v4.6.5)** for declarative runtime request validation
- **Helmet & Strict CORS** for security header enforcement and cross-origin protection

---

## Phase 8: Authentication & Authorization (RBAC)

### Flow
1. **Google Sign-In**: User logs in with Google on `pages/login.html` using Firebase Client SDK.
2. **ID Token**: Client acquires a fresh Firebase ID Token.
3. **API Request**: Centralized `api.js` client attaches `Authorization: Bearer <ID Token>` to all requests.
4. **Backend Verification**: `server/middleware/auth.js` verifies the token via Firebase Admin SDK.
5. **Authoritative User & RBAC**: The user's role (`super_admin`, `admin`, `sales_person`, `manager`) and status (`isActive`) are fetched from MongoDB.
6. **Data Isolation**:
   - **Salesperson**: Queries are automatically scoped to inquiries where `createdBy.firebaseUid` matches their UID. Access to other inquiries returns `403 Forbidden`.
   - **Admin / Super Admin**: Access to all inquiries across sales teams and the Admin Dashboard.
7. **Protected Pages**: Direct URL access to `admin-dashboard.html` or other protected views verifies the authoritative role.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- MongoDB connection string (`MONGODB_URI`)
- Firebase project with Google Authentication enabled

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in the required credentials:
```bash
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pocika_inquiry_system
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000

FIREBASE_PROJECT_ID=pocika-sales-inquiry-system
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pocika-sales-inquiry-system.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## Phase 9: Cloudinary Media Architecture
- **Sole Media Storage**: Cloudinary is the exclusive cloud image and media storage layer.
- **Dynamic Delivery Variants**: Generates on-the-fly optimized variants:
  - `thumbnail`: 250×250 face/content crop for cards and previews
  - `preview`: 900px wide responsive image for modal inspections
  - `full`: Lossless/optimized original for high-res downloads
  - `pdf`: 1200px print-optimized variant for future Quotation / PDF generation
- **Zero Base64 in Database**: MongoDB exclusively persists photo metadata (`publicId`, `secureUrl`, dimensions, file size, uploader identity).
- **Safe Drafts**: Photos are retained in local memory during draft editing and only uploaded to Cloudinary on explicit submission.
- **Compensating Rollback**: Automatic cleanup deletes newly uploaded Cloudinary assets if MongoDB persistence fails.

### 3. Run Backend API Server
```bash
npm run dev
# Starts API server on http://localhost:5000
```

### 4. Run Frontend Application
```bash
npx serve .
# Serves application on http://localhost:3000
# Open http://localhost:3000/pages/login.html
```

### 5. Run Automated Test Suite
```bash
npm test
# Executes the 32-scenario Phase 8 automated test suite
```

---

## Provisioning User Roles

To assign or change user roles (`super_admin`, `admin`, `sales_person`, `manager`):
```bash
node server/scripts/seed-users.js <firebaseUid> <email> <role> [displayName]
```
Example:
```bash
node server/scripts/seed-users.js 123456 admin@pocika.com admin "Admin User"
```

---

## Documentation
- [Authentication Architecture](docs/authentication.md)
- [Authorization & RBAC](docs/authorization.md)
- [Security Architecture](docs/security.md)
- [Canonical Field Mapping](docs/field-mapping.md)
- [Design System](docs/design-system.md)
