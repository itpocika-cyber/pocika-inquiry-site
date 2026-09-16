import { qs, qsa, formatDate } from './utils.js';
import { api } from './api.js';
import { waitForAuth } from './auth.js';
import './app.js';

let currentInquiry = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await waitForAuth();
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  const inquiryId = urlParams.get('id');

  if (!inquiryId) {
    alert('No inquiry specified.');
    window.location.href = 'inquiries.html';
    return;
  }

  await loadInquiry(inquiryId);
  setupPhotoUpload(inquiryId);
  setupPrintButton();
});

async function loadInquiry(id) {
  try {
    const res = await api.getInquiryById(id);
    currentInquiry = res.data;
    renderInquiryDetails(currentInquiry);
  } catch (err) {
    console.error('Failed to load inquiry:', err);
    alert(`Could not load inquiry: ${err.message}`);
    window.location.href = 'inquiries.html';
  }
}

function renderInquiryDetails(inq) {
  // Title and Meta
  const titleEl = qs('#inq-title');
  const metaEl = qs('#inq-meta');
  if (titleEl) titleEl.textContent = `${inq.customer?.companyName || 'Inquiry'} (${inq.inquiryNumber})`;
  if (metaEl) {
    const dateFormatted = inq.date ? formatDate(new Date(inq.date)) : '-';
    metaEl.textContent = `Submitted on ${dateFormatted} • Status: ${inq.status || 'submitted'}`;
  }

  // Customer Grid
  const customerGrid = qs('#customer-info-grid');
  if (customerGrid) {
    customerGrid.innerHTML = `
      <div class="col-sm-6">
        <div class="text-helper">Company Name</div>
        <div class="fw-semibold">${inq.customer?.companyName || '-'}</div>
      </div>
      <div class="col-sm-6">
        <div class="text-helper">Contact Person</div>
        <div>${inq.customer?.contactPerson || '-'} (${inq.customer?.designation || 'N/A'})</div>
      </div>
      <div class="col-sm-6">
        <div class="text-helper">Mobile</div>
        <div><a href="tel:${inq.customer?.mobile}">${inq.customer?.mobile || '-'}</a></div>
      </div>
      <div class="col-sm-6">
        <div class="text-helper">Email</div>
        <div><a href="mailto:${inq.customer?.email}">${inq.customer?.email || '-'}</a></div>
      </div>
      <div class="col-12">
        <div class="text-helper">Site / Visit Location</div>
        <div>${inq.customer?.siteLocation || '-'}</div>
      </div>
    `;
  }

  // Requirement Grid
  const reqGrid = qs('#req-info-grid');
  if (reqGrid) {
    const productsStr = (inq.products || []).join(', ') || '-';
    reqGrid.innerHTML = `
      <div class="col-sm-6">
        <div class="text-helper">Selected Products</div>
        <div class="fw-semibold">${productsStr}</div>
      </div>
      <div class="col-sm-6">
        <div class="text-helper">Estimated Quantity</div>
        <div>${inq.requirement?.estimatedQuantity || '-'}</div>
      </div>
      <div class="col-sm-6">
        <div class="text-helper">Approx. Value</div>
        <div>₹ ${inq.commercial?.expectedOrderValue ? inq.commercial.expectedOrderValue.toLocaleString() : '-'}</div>
      </div>
      <div class="col-sm-6">
        <div class="text-helper">Visit Type</div>
        <div>${inq.visit?.visitType || '-'}</div>
      </div>
      <div class="col-12">
        <div class="text-helper">Requirement Notes</div>
        <div>${inq.requirement?.productSpecification || inq.remarks || 'None specified.'}</div>
      </div>
    `;
  }

  // Follow-up sidebar
  const oppBadge = qs('#inq-opp-badge');
  const followupDate = qs('#inq-followup-date');
  const nextAction = qs('#inq-next-action');
  const salesperson = qs('#inq-salesperson');

  const opp = inq.visit?.opportunity || '-';
  let oppBadgeClass = 'badge-secondary';
  if (opp === 'HOT') oppBadgeClass = 'badge-hot';
  if (opp === 'WARM') oppBadgeClass = 'badge-warm';
  if (opp === 'COLD') oppBadgeClass = 'badge-cold';
  if (opp === 'FUTURE POTENTIAL') oppBadgeClass = 'badge-future-potential';

  if (oppBadge) oppBadge.innerHTML = `<span class="badge-pocika ${oppBadgeClass}">${opp}</span>`;
  if (followupdate) followupDate.textContent = inq.followUp?.followUpDate ? formatDate(new Date(inq.followUp.followUpDate)) : '-';
  if (nextAction) nextAction.textContent = (inq.followUp?.nextAction || []).join(', ') || '-';
  if (salesperson) salesperson.textContent = inq.salesPerson || inq.createdBy?.name || '-';

  // Render Photos
  renderPhotos(inq.photos || []);
}

function renderPhotos(photos) {
  const grid = qs('#photos-grid');
  const emptyEl = qs('#photos-empty');
  const badgeEl = qs('#photo-count-badge');

  if (badgeEl) badgeEl.textContent = `${photos.length} of 5 photos`;

  if (!grid) return;
  grid.innerHTML = '';

  if (photos.length === 0) {
    if (emptyEl) emptyEl.classList.remove('d-none');
    return;
  }
  if (emptyEl) emptyEl.classList.add('d-none');

  photos.forEach((p, idx) => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4';

    const thumbUrl = p.optimizedUrls?.preview || p.optimizedUrls?.thumbnail || p.secureUrl || p.previewUrl;
    const fullUrl = p.optimizedUrls?.full || p.secureUrl || p.previewUrl;
    const sizeKB = p.sizeKB || (p.bytes ? Math.round(p.bytes / 1024) : 0);
    const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    const dimensions = (p.width && p.height) ? `${p.width}×${p.height}px` : '';

    col.innerHTML = `
      <div class="photo-card shadow-sm h-100 d-flex flex-column">
        <div class="photo-thumb-container">
          <span class="photo-badge">#${p.sortOrder || idx + 1}</span>
          <img src="${thumbUrl}" alt="${p.originalFileName || p.fileName || 'Photo'}" class="btn-open-lightbox" data-full="${fullUrl}" data-title="${p.originalFileName || p.fileName || 'Site Photo'}" data-meta="${sizeText} ${dimensions ? '• ' + dimensions : ''}">
        </div>
        <div class="p-3 d-flex flex-column justify-content-between flex-grow-1">
          <div class="mb-2">
            <div class="text-truncate fw-medium fs-sm mb-1" title="${p.originalFileName || p.fileName}">${p.originalFileName || p.fileName || 'Photo'}</div>
            <div class="text-muted small">${sizeText} ${dimensions ? '• ' + dimensions : ''}</div>
          </div>
          <div class="d-flex justify-content-between align-items-center pt-2 border-top">
            <a href="${fullUrl}" target="_blank" class="btn-pocika btn-pocika-ghost px-2 py-1" style="font-size:0.75rem;">Full View</a>
            <button type="button" class="btn btn-sm btn-link text-danger p-0 text-decoration-none btn-delete-photo" data-photo-id="${p.photoId || p._id || p.publicId}" style="font-size:0.75rem;">Delete</button>
          </div>
        </div>
      </div>
    `;

    grid.appendChild(col);
  });

  // Attach Lightbox triggers
  qsa('.btn-open-lightbox').forEach(img => {
    img.addEventListener('click', () => {
      const full = img.getAttribute('data-full');
      const title = img.getAttribute('data-title');
      const meta = img.getAttribute('data-meta');

      const modalEl = qs('#imageLightboxModal');
      const modalImg = qs('#lightbox-img');
      const modalTitle = qs('#lightboxModalLabel');
      const modalMeta = qs('#lightbox-meta');
      const modalOpenFull = qs('#lightbox-open-full');

      if (modalImg) modalImg.src = full;
      if (modalTitle) modalTitle.textContent = title;
      if (modalMeta) modalMeta.textContent = meta;
      if (modalOpenFull) modalOpenFull.href = full;

      if (window.bootstrap && modalEl) {
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
      }
    });
  });

  // Attach Delete triggers
  qsa('.btn-delete-photo').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const photoId = btn.getAttribute('data-photo-id');
      if (!confirm('Are you sure you want to permanently delete this photo?')) return;

      btn.disabled = true;
      btn.textContent = 'Deleting...';

      try {
        await api.deleteInquiryPhoto(currentInquiry._id || currentInquiry.inquiryNumber, photoId);
        // Refresh inquiry photos
        await loadInquiry(currentInquiry._id || currentInquiry.inquiryNumber);
      } catch (delErr) {
        alert(`Failed to delete photo: ${delErr.message}`);
        btn.disabled = false;
        btn.textContent = 'Delete';
      }
    });
  });
}

function setupPhotoUpload(inquiryId) {
  const btnAdd = qs('#btn-add-photos');
  const fileInput = qs('#inq-photo-file-input');

  if (!btnAdd || !fileInput) return;

  btnAdd.addEventListener('click', () => {
    if (currentInquiry && currentInquiry.photos && currentInquiry.photos.length >= 5) {
      alert('Maximum 5 photos reached for this inquiry.');
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    if (files.length === 0) return;

    const currentCount = currentInquiry?.photos?.length || 0;
    if (currentCount + files.length > 5) {
      alert(`Cannot upload ${files.length} photos. Maximum total is 5 (current: ${currentCount}).`);
      fileInput.value = '';
      return;
    }

    const formData = new FormData();
    files.forEach(f => formData.append('photos', f));

    btnAdd.disabled = true;
    btnAdd.textContent = 'Uploading...';

    try {
      await api.uploadInquiryPhotos(inquiryId, formData);
      fileInput.value = '';
      await loadInquiry(inquiryId);
    } catch (uploadErr) {
      alert(`Photo upload failed: ${uploadErr.message}`);
    } finally {
      btnAdd.disabled = false;
      btnAdd.textContent = '+ Add Photos';
    }
  });
}

function setupPrintButton() {
  const btnPrint = qs('#btn-print-summary');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
}
