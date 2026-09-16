# Security Architecture & Policies — POCIKA

## Core Security Principles

### 1. Zero Trust for Client Roles
The backend never trusts:
- `localStorage` or `sessionStorage` flags (e.g. `isAdmin: true`)
- Query parameters (e.g. `?role=admin`)
- Request body `role` or `user` fields
- Hidden HTML input fields

All authorization decisions are evaluated server-side using the verified Firebase ID Token and the corresponding database `User` record.

### 2. Credential Isolation
- **Client Side**: Only public client configuration (`apiKey`, `projectId`, `authDomain`, `storageBucket`) is exposed in frontend files.
- **Server Side**: `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, and `MONGODB_URI` exist exclusively in server environment variables and are never transmitted to the browser.
- **Audit Verification**: Tested by automated static scanner in `server/tests/auth-rbac.test.js`.

### 3. Mass Assignment Protection
Inquiry creation and updates enforce strict allowlists. Clients cannot update:
- `createdBy`
- `firebaseUid`
- `inquiryNumber`
- `status` (restricted to admin roles)
- `createdAt` or `updatedAt`

### 4. Cross-Origin Resource Sharing (CORS)
- Wildcard `*` origins are prohibited.
- `app.js` enforces configured origins (`config.clientOrigin`, `http://localhost:3000`, `http://127.0.0.1:3000`).
- Credentials are supported only for whitelisted origins.

### 5. HTTP Security Headers
- Helmet middleware enforces `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and other standard security headers on all API responses.

### 6. Rate Limiting & Safe Error Messages
- Authentication errors return generic, non-leaking messages (`Authentication required.`, `Access denied.`).
- Stack traces and internal Firebase error objects are never exposed in API responses.
