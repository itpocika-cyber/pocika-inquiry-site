# Role-Based Access Control (RBAC) & Authorization — POCIKA

## Role Hierarchy & Definitions

The POCIKA platform implements strict server-side Role-Based Access Control with four controlled roles:

| Role | Description | Permissions |
|---|---|---|
| `super_admin` | System Administrator | Full access to all inquiries, user management, and system configuration. |
| `admin` | Business Administrator | Full access to all inquiries, status transitions, and admin metrics dashboard. |
| `manager` | Sales Head / Reviewer | Broad visibility across sales teams; placeholder for future review workflows. |
| `sales_person` | Field Representative | Access strictly limited to their own submitted inquiries and KPIs. |

---

## Authorization Middleware (`server/middleware/authorize.js`)

Role restrictions are applied to express routes using `authorizeRoles`:

```javascript
import { authorizeRoles } from '../middleware/authorize.js';

// Route accessible only to administrators
router.get('/admin/stats', authenticateUser, authorizeRoles('admin', 'super_admin'), getAdminStats);
```

If an authenticated user's role is not in the allowed list:
- Status: `403 Forbidden`
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "Access denied."
    }
  }
  ```

---

## Inquiry Ownership & Data Access Rules

### 1. Ownership Assignment on Creation
When an inquiry is submitted (`POST /api/v1/inquiries`):
- The server extracts `firebaseUid`, `email`, and `displayName` directly from `req.user`.
- Server explicitly sets `inquiry.createdBy`:
  ```json
  {
    "firebaseUid": "user_uid_123",
    "email": "salesperson@pocika.com",
    "name": "Jane Doe"
  }
  ```
- Client-supplied `createdBy`, `inquiryNumber`, `role`, or timestamps are discarded.

### 2. Inquiry Scoping (`GET /api/v1/inquiries`)
- If `req.user.role === 'sales_person'`:
  - Query is forced to `{ 'createdBy.firebaseUid': req.user.firebaseUid }`.
  - Salespersons cannot see records created by others.
- If `req.user.role === 'admin' || 'super_admin' || 'manager'`:
  - Full access to all inquiries across all salespersons.

### 3. Record Level Access (`GET /:id`, `PATCH /:id`)
- A salesperson attempting to view or modify an inquiry owned by another user receives `403 Forbidden`.

---

## Account Inactivation

If an administrator deactivates an account (`isActive: false`):
- Any subsequent request returns `403 Forbidden`:
  ```json
  {
    "success": false,
    "error": {
      "code": "ACCOUNT_INACTIVE",
      "message": "Your account is inactive. Contact an administrator."
    }
  }
  ```
- The frontend immediately clears local tokens and displays the inactive account notification.

---

## Provisioning CLI Utility

To assign or change roles safely on the backend:

```bash
node server/scripts/seed-users.js <firebaseUid> <email> <role> [displayName]
```
Example:
```bash
node server/scripts/seed-users.js uid123 admin@pocika.com admin "Admin User"
```
