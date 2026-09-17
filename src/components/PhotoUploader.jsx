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
        <div className="photo-upload-helper">Up to {maxPhotos} photos · JPG, PNG, or WebP (max 10MB)</div>
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

      <div className="photo-upload-counter mt-3 mb-2">
        {photos.length} of {maxPhotos} photos added
      </div>

      {photos.length > 0 && (
        <div className="photo-grid" id="photo-preview-grid">
          {photos.map((photo, idx) => {
            const sizeText =
              photo.sizeKB > 1024
                ? `${(photo.sizeKB / 1024).toFixed(1)} MB`
                : `${photo.sizeKB} KB`;

            return (
              <div key={idx} className="photo-thumb">
                <img
                  src={photo.previewUrl || photo.secureUrl}
                  alt={photo.fileName || `Photo ${idx + 1}`}
                  onError={(e) => {
                    e.target.style.padding = '10px';
                    e.target.style.objectFit = 'contain';
                  }}
                />
                <span className="photo-thumb-size">{sizeText}</span>
                <button
                  type="button"
                  className="photo-thumb-remove"
                  aria-label="Remove photo"
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
