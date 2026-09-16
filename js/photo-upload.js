import { qs } from './utils.js';
import { inquiryData } from './form.js';
import { saveDraftDebounced } from './draft.js';

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 5;

export function initPhotoUpload() {
  const dropZone = qs('#photo-drop-zone');
  const fileInput = qs('#photo-input');
  
  if (!dropZone || !fileInput) return;

  // Make clicking the drop zone open the file dialog
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag and drop visual cues
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--color-primary)';
    dropZone.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
  });

  ['dragleave', 'dragend'].forEach(type => {
    dropZone.addEventListener(type, () => {
      dropZone.style.borderColor = '';
      dropZone.style.backgroundColor = '';
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '';
    dropZone.style.backgroundColor = '';
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // reset input so same file can be selected again if removed
    fileInput.value = '';
  });

  // Clear photos event from conditional fields
  window.addEventListener('clear-photos', () => {
    inquiryData.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    inquiryData.photos = [];
    renderThumbnails();
    saveDraftDebounced();
  });

  // Render initial photos if restored from draft
  renderThumbnails();
}

async function handleFiles(files) {
  const errorEl = qs('#photo-error');
  errorEl.textContent = '';
  errorEl.classList.remove('is-visible');

  const newFiles = Array.from(files);
  let errorMsg = '';

  for (const file of newFiles) {
    if (inquiryData.photos.length >= MAX_PHOTOS) {
      errorMsg = `Maximum ${MAX_PHOTOS} photos allowed.`;
      break;
    }

    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      errorMsg = `${file.name} is not a valid JPG/PNG image.`;
      break;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      errorMsg = `${file.name} is too large (${sizeMB.toFixed(1)}MB). Max ${MAX_SIZE_MB}MB allowed.`;
      break;
    }

    // Add loading placeholder
    const sizeKB = Math.round(file.size / 1024);
    const photoEntry = {
      fileName: file.name,
      previewUrl: URL.createObjectURL(file), // temp local url
      sizeKB: sizeKB,
      uploading: true
    };
    inquiryData.photos.push(photoEntry);
    renderThumbnails();

    try {
      // Fetch Signature
      const { api } = await import('./api.js');
      const sigRes = await api.getUploadSignature();
      const { signature, timestamp, apiKey, cloudName, folder } = sigRes.data;

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Cloudinary upload failed');

      const data = await uploadRes.json();
      
      // Update entry with real URL
      URL.revokeObjectURL(photoEntry.previewUrl);
      photoEntry.previewUrl = data.secure_url;
      photoEntry.uploading = false;
      
      saveDraftDebounced();
      renderThumbnails();
    } catch (err) {
      console.error('Upload Error:', err);
      // Remove failed upload
      inquiryData.photos = inquiryData.photos.filter(p => p !== photoEntry);
      renderThumbnails();
      errorEl.textContent = `Failed to upload ${file.name}. Please try again.`;
      errorEl.classList.add('is-visible');
    }
  }

  if (errorMsg) {
    errorEl.textContent = errorMsg;
    errorEl.classList.add('is-visible');
  }
}

function removePhoto(index) {
  if (index >= 0 && index < inquiryData.photos.length) {
    const photo = inquiryData.photos[index];
    URL.revokeObjectURL(photo.previewUrl);
    inquiryData.photos.splice(index, 1);
    saveDraftDebounced();
    renderThumbnails();
  }
}

function renderThumbnails() {
  const grid = qs('#photo-preview-grid');
  const counter = qs('#photo-counter');
  if (!grid || !counter) return;

  grid.innerHTML = '';
  
  inquiryData.photos.forEach((photo, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    
    let sizeText = photo.sizeKB > 1024 ? `${(photo.sizeKB / 1024).toFixed(1)} MB` : `${photo.sizeKB} KB`;
    
    const loadingOverlay = photo.uploading ? `
      <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white" style="opacity: 0.8; z-index: 5;">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Uploading...</span>
        </div>
      </div>
    ` : '';

    thumb.innerHTML = `
      ${loadingOverlay}
      <img src="${photo.previewUrl}" alt="${photo.fileName}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIj48L3BvbHlsaW5lPjwvc3ZnPg=='; this.style.padding='10px'; this.style.objectFit='contain';">
      <span class="photo-thumb-size">${sizeText}</span>
      <button class="photo-thumb-remove" type="button" aria-label="Remove photo" ${photo.uploading ? 'disabled' : ''}>&times;</button>
    `;
    
    const removeBtn = thumb.querySelector('.photo-thumb-remove');
    if (removeBtn && !photo.uploading) {
      removeBtn.addEventListener('click', () => {
        removePhoto(index);
      });
    }

    grid.appendChild(thumb);
  });

  counter.textContent = `${inquiryData.photos.length} of ${MAX_PHOTOS} photos added`;
}
