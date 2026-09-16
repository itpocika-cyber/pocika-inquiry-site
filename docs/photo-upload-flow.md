# Photo Upload & Lifecycle Flow

## 1. End-to-End Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor SP as Salesperson / Browser
    participant UI as photo-upload.js
    participant API as api.js
    participant SVR as Express (upload.controller.js)
    participant CLD as Cloudinary
    participant DB as MongoDB (Inquiry)

    Note over SP,UI: Phase 1: Client Selection & Draft Safety
    SP->>UI: Selects 1-5 photos (JPEG, PNG, WebP)
    UI->>UI: Validates client limits (10MB per file, max 5)
    UI->>UI: Creates local URL.createObjectURL(file) for instant preview
    UI-->>SP: Displays preview thumbnails without uploading
    Note over UI: Photos are NOT uploaded to Cloudinary during draft mode!

    Note over SP,DB: Phase 2: Form Submission & Upload
    SP->>UI: Clicks "Confirm & Submit"
    UI->>API: POST /api/v1/inquiries (Inquiry Data without blobs)
    API->>SVR: createInquiry()
    SVR->>DB: Saves Inquiry document (generates inquiryNumber)
    DB-->>SVR: Created Inquiry (PSI-2026-XXXX)
    SVR-->>API: 201 Created

    alt Selected Photos > 0
        UI->>API: POST /api/v1/inquiries/:id/photos (multipart/form-data)
        API->>SVR: uploadInquiryPhotos()
        SVR->>SVR: Ownership verification (req.user.firebaseUid === inquiry.createdBy.firebaseUid)
        loop Each Photo File
            SVR->>CLD: upload_stream (buffer to pocika/inquiries/{inquiryNumber}/photos/{photoId})
            CLD-->>SVR: { public_id, secure_url, bytes, width, height, format }
        end
        SVR->>DB: Appends photo metadata array to Inquiry & saves
        DB-->>SVR: Saved
        SVR-->>API: 201 Created with enriched delivery URLs
    end

    UI->>UI: Clears local draft & revokes object URLs
    UI->>SP: Redirects to success.html
```

---

## 2. Safe Draft Handling
- When a salesperson inputs inquiry details across Steps 1–7, photos selected in Step 7 are held strictly in memory as raw `File` objects.
- `localStorage` drafts store only lightweight metadata: `[{ fileName, sizeKB }]`.
- Zero base64 strings or binary blobs are written to `localStorage` to avoid quota exceeded errors (`DOMException: QuotaExceededError`).
- Cloudinary is not called until the user explicitly commits the inquiry submission.

---

## 3. Compensating Cleanup Pattern
To prevent orphaned assets in Cloudinary if a network error or database error occurs during metadata saving:
- The controller tracks all newly uploaded `publicId`s in an in-memory array `uploadedAssets`.
- If `inquiry.save()` throws an exception, the `catch` block immediately invokes `deleteFromCloudinary(publicId)` for every newly uploaded asset before passing the error to Express error middleware.
