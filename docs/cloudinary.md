# Cloudinary Media Architecture

## 1. Architecture Overview
POCIKA Sales Inquiry & Site Visit Management System uses **Cloudinary** as its sole image and media storage and delivery platform. 

- **No Firebase Storage**: All images, site visit photos, and media assets are routed strictly through Cloudinary.
- **No Base64 Payloads**: MongoDB exclusively stores lightweight metadata references (e.g. `publicId`, `secureUrl`, dimensions, file size, uploader identity). No large base64 strings or binary files are persisted in the database.
- **Server-Side Authorization**: Secret credentials (`CLOUDINARY_API_SECRET`) are kept strictly on the backend. Uploads and deletions are performed through authorized Express controller endpoints.

---

## 2. Directory & Folder Naming Convention
All assets uploaded to Cloudinary adhere to a strict hierarchical structure organized by inquiry:

```text
pocika/
└── inquiries/
    └── {inquiryNumber}/
        └── photos/
            └── {photoId}
```

Example Public ID:
`pocika/inquiries/PSI-2026-0001/photos/f47ac10b-58cc-4372-a567-0e02b2c3d479`

Benefits:
- Isolated folders per inquiry facilitate bulk deletion, auditing, and archival.
- Predictable paths prevent asset overwrites across different inquiries.
- Inquiry numbers are sanitized (`[^a-zA-Z0-9_-]` replaced with `_`) to ensure URL-safe paths.

---

## 3. Dynamic Transformations & Delivery URLs
Cloudinary dynamically generates responsive, optimized variants via URL transformations:

| Variant | Purpose | Transformation String | Description |
| :--- | :--- | :--- | :--- |
| **Thumbnail** | Grid & list cards | `c_fill,w_250,h_250,q_auto,f_auto` | 250x250 square crop, auto format (WebP/AVIF), auto quality |
| **Preview** | Modal lightbox & review | `c_limit,w_900,q_auto,f_auto` | Max 900px width maintaining aspect ratio |
| **Full** | High-res inspection | `q_auto,f_auto` | Original resolution with WebP/AVIF compression |
| **PDF** | Future PDF / Quotation | `c_limit,w_1200,q_auto:best,f_auto` | Print-ready resolution (max 1200px) with high quality |

All delivery URLs are generated dynamically by `generateOptimizedUrls(publicId, secureUrl)` in `server/config/cloudinary.js`.

---

## 4. Environment Variables
Cloudinary credentials must be defined in `server/.env`:

```ini
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Security Rule**: `CLOUDINARY_API_SECRET` must **NEVER** be committed to Git or exposed in client-side code, headers, or API responses.
