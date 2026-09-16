# Firebase Google Authentication — POCIKA Sales Inquiry System

## Overview

The POCIKA Sales Inquiry System uses Firebase Client SDK (v10.8.1 Modular) for user identity with Google Sign-In, and Firebase Admin SDK (Node.js) on the Express backend for authoritative token verification.

```
[ User / Browser ]
        │
        ▼
[ Google OAuth 2.0 (Firebase Client SDK) ]
        │
        ├─► ID Token retrieved on client
        │
        ▼
[ API Request: Authorization: Bearer <ID Token> ]
        │
        ▼
[ Express API Server / Firebase Admin SDK ]
        │
        ├─► verifyIdToken(token) validates signature & expiry
        ├─► Extract: uid, email, name, picture
        │
        ▼
[ MongoDB User Model ]
        ├─► Lookup user by firebaseUid
        ├─► Check isActive flag (403 if false)
        ├─► Provision new user if not found (default: sales_person)
        │
        ▼
[ req.user attached & Route Authorized ]
```

---

## Frontend Integration

### 1. Configuration & Initialization (`js/auth.js`)
Firebase is initialized with client-safe public web configuration:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAd2AwdkqUCWkkonIU0iC0AiCn2WnYPLeU",
  authDomain: "pocika-sales-inquiry-system.firebaseapp.com",
  projectId: "pocika-sales-inquiry-system",
  storageBucket: "pocika-sales-inquiry-system.firebasestorage.app"
};
```
> [!NOTE]
> No private keys or service accounts are included in the frontend code.

### 2. Sign-In Flows
- **Google Sign-In**: Powered by `signInWithPopup(auth, googleProvider)`.
- **Email/Password (Fallback)**: `signInWithEmailAndPassword(auth, email, password)`.

### 3. Automatic Token Attachment (`js/api.js`)
Every API request made through `apiRequest()` fetches a valid ID token from Firebase:

```javascript
const token = await getIdToken();
const headers = {
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
};
```

---

## Backend Token Verification

Backend verification is implemented in `server/middleware/auth.js`:

```javascript
export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Authentication required.' }, 401);
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const decodedToken = await authInstance.verifyIdToken(token);
  // ... Look up user in MongoDB, enforce isActive, attach req.user
};
```

### 401 vs 403 Distinctions
- **401 Unauthorized**: Missing, malformed, expired, or invalid Firebase ID token. Client triggers logout and redirects to `login.html`.
- **403 Forbidden**: Token is valid, but the user is marked `isActive: false` or does not have sufficient role permissions.

---

## User Provisioning Strategy

1. When an authenticated Firebase user contacts the backend for the first time, `authenticateUser` queries MongoDB for a matching `firebaseUid`.
2. If not found, a new user is created in MongoDB with:
   - `role: 'sales_person'`
   - `isActive: true`
   - `lastLoginAt: new Date()`
3. Administrator accounts (`admin`, `super_admin`) are explicitly assigned via authorized admin scripts (`server/scripts/seed-users.js`). No user can elevate their own privileges.
