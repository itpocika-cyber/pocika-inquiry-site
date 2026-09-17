# POCIKA Inquiry & Site Visit Management System

## Project Purpose
This project is an internal Sales Inquiry and Site Visit Management System for **POCIKA FIRE & SAFETY PRODUCTS LLP**. It enables salespeople to rapidly log site visits, collect customer requirements, attach site photos, and track follow-ups. It also provides sales managers and administrators with dashboards to track opportunities, review inquiries, and generate PDFs.

---

## Architecture & Technology Stack

### Frontend Architecture
- **React 18 & Vite 5** Single Page Application (SPA)
- **React Router DOM v7** for declarative client-side routing and protected routes
- **Zustand** for state management (Form data, draft auto-save, and authentication)
- **CSS3 / SCSS** with the tailored POCIKA design system (Navy `#0B1F33`, Primary Blue `#2563EB`, Background `#F5F7FA`)
- **Bootstrap 5.3** for layout and responsive grids
- **Axios** with centralized request interceptors for automatic JWT handling

### Backend Architecture
- **Node.js & Express 5** RESTful API
- **MongoDB & Mongoose (v9.10)** for authoritative data persistence (`Inquiry`, `User`, `Counter`)
- **JSON Web Tokens (JWT)** & **Bcryptjs** for secure authentication and RBAC
- **Cloudinary SDK** for cloud image storage and optimized delivery variants
- **Puppeteer** for server-side inquiry PDF generation
- **Zod (v4.6)** for runtime request validation
- **Helmet & Strict CORS** for security header enforcement

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- MongoDB connection string (`MONGODB_URI`)
- Cloudinary account credentials

### 2. Environment Configuration
Ensure `.env` contains your database and media configuration:
```bash
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pocika_inquiry_system
NODE_ENV=development
JWT_SECRET=your_secure_jwt_secret_key

# Cloudinary Media Layer (Photo Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

### 3. Running the Project

#### Run the Express Backend:
```bash
# In the root directory:
npm run server

# Or inside the server directory:
cd server && npm run dev
```
Backend runs on `http://localhost:5000`.

#### Run the React Frontend:
```bash
# In the root directory:
npm run dev
```
Frontend runs on `http://localhost:5173` with an automatic proxy to the Express API.

#### Seed Demo Accounts:
```bash
npm run seed:auth
```
- **Admin**: `admin@pocika.com` / `Admin@12345` (role: `admin`)
- **Sales**: `sales@pocika.com` / `Sales@12345` (role: `sales_person`)
- **Manager**: `manager@pocika.com` / `Manager@12345` (role: `manager`)

---

### 4. Running Automated Tests
```bash
# Run JWT Auth + RBAC test suite:
node server/tests/jwt-auth-rbac.test.js

# Run Cloudinary media test suite:
node server/tests/cloudinary-media.test.js

# Build the React production bundle:
npm run build
```

---

## Documentation
- [Phase 4 Verification Report](docs/phase4-verification.md)
- [Canonical Field Mapping](docs/field-mapping.md)
- [Design System](docs/design-system.md)

