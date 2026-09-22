import React, { useRef, useState } from 'react';

export default function PhotoUploader({
  photos,
  onAddFiles,
  onRemovePhoto,
  maxPhotos = 5,
  error
}) {
  const fileInputRef = useRef(null);
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow selecting same file again
    }
  };

  return (
    <div id="photo-uploader-widget">
      <div
        className="photo-upload"
        id="photo-drop-zone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          borderColor: isDragOver ? 'var(--color-primary)' : undefined,
          backgroundColor: isDragOver ? 'rgba(37, 99, 235, 0.05)' : undefined,
          cursor: 'pointer'
        }}
      >
        <svg
          className="photo-upload-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 7h3l2-2h6l2 2h3v13H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        <div className="photo-upload-title">Tap to take a photo or choose from gallery</div>
        <div className="photo-upload-helper">Up to {maxPhotos} photos · JPG, PNG, or WebP (max 5MB)</div>
        <input
          ref={fileInputRef}
          type="file"
          id="photo-input"
          accept="image/jpeg, image/png, image/webp"
          multiple
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
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
                : `${photo.sizeKB} KB`;

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
                    style={{ background: 'rgba(15, 23, 42, 0.65)', color: '#fff', zIndex: 2 }}
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
