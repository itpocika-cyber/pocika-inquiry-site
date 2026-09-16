# Media Security & Access Control

## 1. Zero Secret Leakage Principle
- **Cloudinary Secret**: `CLOUDINARY_API_SECRET` resides strictly in the backend `.env` file and is accessed exclusively by Node.js server processes.
- **Client Bundles**: No secret keys, signatures, or unsigned presets are exposed to the browser.
- **Client Requests**: The frontend interacts strictly with POCIKA REST endpoints (`POST /api/v1/inquiries/:id/photos`, `DELETE /api/v1/inquiries/:id/photos/:photoId`), authenticating via Firebase ID Tokens.

---

## 2. Server-Authoritative Ownership & RBAC
All photo operations enforce server-side authorization:

1. **Upload Operation (`POST /api/v1/inquiries/:id/photos`)**:
   - `req.user` is extracted from the verified Firebase ID Token.
   - If `req.user.role === 'sales_person'`, the server checks that `inquiry.createdBy.firebaseUid === req.user.firebaseUid`.
   - If a salesperson attempts to upload photos to an inquiry owned by another salesperson, the server rejects the request with `403 Forbidden` (`FORBIDDEN`).
   - Admins (`admin`, `super_admin`) have access to manage photos on any inquiry.

2. **Delete Operation (`DELETE /api/v1/inquiries/:id/photos/:photoId`)**:
   - Only the inquiry owner or an administrator can delete photos.
   - Deletion removes the asset from Cloudinary via `cloudinary.uploader.destroy(publicId)` and removes the subdocument entry from MongoDB.

3. **Get Photos (`GET /api/v1/inquiries/:id/photos`)**:
   - Scoped according to role: salespeople can only retrieve photos for their own inquiries.

---

## 3. Upload Restrictions & Validation
- **Maximum File Count**: 5 photos per inquiry.
- **Maximum File Size**: 10 MB per photo (enforced by Multer in-memory storage buffer limits).
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`. Executables, SVG scripts, and other file types are strictly rejected with `400 Bad Request`.
- **Compensating Rollback**: In case of database failure after Cloudinary uploads, uploaded assets are deleted from Cloudinary immediately to eliminate orphan media storage.
