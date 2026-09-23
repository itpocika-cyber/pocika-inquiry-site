import React, { useRef, useState } from 'react';

export default function PhotoUploader({
  photos,
  onAddFiles,
  onRemovePhoto,
  maxPhotos = 5,
  error
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleCameraCapture = (e) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      e.target.value = '';
      onAddFiles(files);
    }
  };

  const handleGallerySelect = (e) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      e.target.value = '';
      onAddFiles(files);
    }
  };

  return (
    <div id="photo-uploader-widget">
      {/* 2 Explicit Buttons for Mobile / Desktop */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-sm-6">
          <button
            type="button"
            className="btn btn-outline-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
            style={{ borderRadius: '10px', fontSize: '0.95rem' }}
            onClick={() => cameraInputRef.current?.click()}
            disabled={photos.length >= maxPhotos}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>📷 Take Photo</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg, image/png, image/webp, image/jpg, .jpg, .jpeg, .png, .webp"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleCameraCapture}
          />
        </div>

        <div className="col-12 col-sm-6">
          <button
            type="button"
            className="btn btn-outline-secondary w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
            style={{ borderRadius: '10px', fontSize: '0.95rem' }}
            onClick={() => galleryInputRef.current?.click()}
            disabled={photos.length >= maxPhotos}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>🖼️ Choose from Gallery</span>
          </button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg, image/png, image/webp, image/jpg, .jpg, .jpeg, .png, .webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleGallerySelect}
          />
        </div>
      </div>

      {/* Drag & Drop Fallback Zone */}
      <div
        className="photo-upload"
        id="photo-drop-zone"
        onClick={() => galleryInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          borderColor: isDragOver ? 'var(--color-primary)' : undefined,
          backgroundColor: isDragOver ? 'rgba(37, 99, 235, 0.05)' : undefined,
          cursor: 'pointer',
          padding: '1.25rem'
        }}
      >
        <div className="photo-upload-title" style={{ fontSize: '0.9rem' }}>
          Or drag & drop site photos here
        </div>
        <div className="photo-upload-helper" style={{ fontSize: '0.8rem' }}>
          Up to {maxPhotos} photos · JPG, PNG, or WebP (max 10MB each)
        </div>
      </div>

      {error && <div className="field-error is-visible mt-2">{error}</div>}

      <div className="photo-upload-counter mt-3 mb-2 d-flex justify-content-between align-items-center">
        <span>{photos.length} of {maxPhotos} photos added</span>
        {photos.some(p => p.isUploading) && (
          <span className="text-primary small fw-semibold d-inline-flex align-items-center gap-1">
            <span className="spinner-border spinner-border-sm" role="status" style={{ width: '0.8rem', height: '0.8rem' }} />
            Uploading to secure storage...
          </span>
        )}
      </div>

      {photos.length > 0 && (
        <div className="photo-grid" id="photo-preview-grid">
          {photos.map((photo, idx) => {
            const sizeText =
              photo.sizeKB > 1024
                ? `${(photo.sizeKB / 1024).toFixed(1)} MB`
                : `${photo.sizeKB || 0} KB`;

            return (
              <div key={photo.photoId || idx} className="photo-thumb position-relative">
                <img
                  src={photo.secureUrl || photo.url || photo.previewUrl}
                  alt={photo.caption || photo.fileName || `Photo ${idx + 1}`}
                  onError={(e) => {
                    e.target.style.padding = '10px';
                    e.target.style.objectFit = 'contain';
                  }}
                />
                {photo.isUploading && (
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                    style={{ background: 'rgba(15, 23, 42, 0.65)', color: 'var(--color-white)', zIndex: 2 }}
                  >
                    <div className="spinner-border spinner-border-sm text-light mb-1" role="status" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Uploading</span>
                  </div>
                )}
                <span className="photo-thumb-size">{sizeText}</span>
                <button
                  type="button"
                  className="photo-thumb-remove"
                  aria-label="Remove photo"
                  disabled={photo.isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto(idx);
                  }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
