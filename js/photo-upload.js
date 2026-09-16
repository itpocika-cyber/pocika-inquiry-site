import { qs } from './utils.js';
import { inquiryData } from './form.js';
import { saveDraftDebounced } from './draft.js';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// In-memory array of selected File objects to upload upon form submission
let selectedPhotoFiles = [];

export function getSelectedPhotoFiles() {
  return selectedPhotoFiles;
}

export function clearSelectedPhotos() {
  inquiryData.photos.forEach(p => {
    if (p.previewUrl && p.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(p.previewUrl);
    }
  });
  selectedPhotoFiles = [];
  inquiryData.photos = [];
  renderThumbnails();
}

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
    clearSelectedPhotos();
    saveDraftDebounced();
  });

  // Render initial photos if restored
  renderThumbnails();
}

function handleFiles(files) {
  const errorEl = qs('#photo-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }

  const incomingFiles = Array.from(files);
  let errorMsg = '';

  for (const file of incomingFiles) {
    if (selectedPhotoFiles.length >= MAX_PHOTOS) {
      errorMsg = `Maximum ${MAX_PHOTOS} photos allowed.`;
      break;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errorMsg = `${file.name}: Invalid file format. Please upload JPEG, PNG, or WebP images.`;
      break;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errorMsg = `${file.name}: File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
      break;
    }

    selectedPhotoFiles.push(file);

    const sizeKB = Math.round(file.size / 1024);
    const previewUrl = URL.createObjectURL(file);

    inquiryData.photos.push({
      fileName: file.name,
      previewUrl: previewUrl,
      sizeKB: sizeKB
    });
  }

  if (errorMsg && errorEl) {
    errorEl.textContent = errorMsg;
    errorEl.classList.add('is-visible');
  }

  renderThumbnails();
  saveDraftDebounced();
}

function removePhoto(index) {
  if (index >= 0 && index < selectedPhotoFiles.length) {
    const photo = inquiryData.photos[index];
    if (photo && photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    selectedPhotoFiles.splice(index, 1);
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

    thumb.innerHTML = `
      <img src="${photo.previewUrl || ''}" alt="${photo.fileName}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIj48L3BvbHlsaW5lPjwvc3ZnPg=='; this.style.padding='10px'; this.style.objectFit='contain';">
      <span class="photo-thumb-size">${sizeText}</span>
      <button class="photo-thumb-remove" type="button" aria-label="Remove photo">&times;</button>
    `;
    
    const removeBtn = thumb.querySelector('.photo-thumb-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        removePhoto(index);
      });
    }

    grid.appendChild(thumb);
  });

  counter.textContent = `${inquiryData.photos.length} of ${MAX_PHOTOS} photos added`;
}
