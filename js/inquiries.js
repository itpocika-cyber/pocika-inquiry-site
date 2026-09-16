import { qs, qsa, debounce, formatDate } from './utils.js';
import { api } from './api.js';
import { waitForAuth } from './auth.js';

let filteredInquiries = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
  initFilters();
  const user = await waitForAuth();
  if (!user) return; // app.js handles redirection
  fetchAndRenderList();
});

function initFilters() {
  const searchInput = qs('#search-input');
  const filterOpp = qs('#filter-opportunity');
  const filterStatus = qs('#filter-status');
  const sortSelect = qs('#sort-select');
  const btnClear = qs('#btn-clear-filters');
  const btnEmptyClear = qs('#btn-empty-clear');

  const applyFilters = () => {
    currentPage = 1;
    fetchAndRenderList();
  };

  if (searchInput) {
    searchInput.addEventListener('input', debounce(applyFilters, 400));
  }
  if (filterOpp) filterOpp.addEventListener('change', applyFilters);
  if (filterStatus) filterStatus.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  const clearHandler = () => {
    if (searchInput) searchInput.value = '';
    if (filterOpp) filterOpp.value = '';
    if (filterStatus) filterStatus.value = '';
    if (sortSelect) sortSelect.value = 'newest';
    applyFilters();
  };

  if (btnClear) btnClear.addEventListener('click', clearHandler);
  if (btnEmptyClear) btnEmptyClear.addEventListener('click', clearHandler);

  // Pagination buttons
  const btnPrev = qs('#btn-page-prev');
  const btnNext = qs('#btn-page-next');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        fetchAndRenderList();
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        fetchAndRenderList();
      }
    });
  }
}

async function fetchAndRenderList() {
  const tbody = qs('#inquiries-tbody');
  const mobileContainer = qs('#inquiries-mobile');
  
  if (!tbody || !mobileContainer) return;
  
  // Show loading state if needed here
  
  const searchInput = qs('#search-input');
  const filterOpp = qs('#filter-opportunity');
  const filterStatus = qs('#filter-status');
  const sortSelect = qs('#sort-select');

  const params = {
    page: currentPage,
    limit: ITEMS_PER_PAGE
  };

  if (searchInput && searchInput.value) params.search = searchInput.value;
  if (filterOpp && filterOpp.value) params.opportunity = filterOpp.value;
  if (filterStatus && filterStatus.value) params.status = filterStatus.value;
  if (sortSelect && sortSelect.value) params.sort = sortSelect.value;

  try {
    const res = await api.getInquiries(params);
    filteredInquiries = res.data.items;
    totalPages = res.data.pagination.totalPages;
    
    // Inject Draft if we are on page 1 and no filters strictly exclude it
    if (currentPage === 1 && (!params.status || params.status === 'draft') && !params.search) {
      const draftSaved = localStorage.getItem('pocika_inquiry_draft');
      if (draftSaved) {
        try {
          const parsedDraft = JSON.parse(draftSaved);
          if (parsedDraft && parsedDraft.data) {
            parsedDraft.data.isDraft = true;
            parsedDraft.data.inquiryNumber = 'Draft';
            if (!parsedDraft.data.date) {
              parsedDraft.data.date = new Date().toISOString().split('T')[0];
            }
            filteredInquiries.unshift(parsedDraft.data); // put at top
          }
        } catch(e) {}
      }
    }
    
    renderList();
  } catch (error) {
    console.error('Failed to fetch inquiries:', error);
    filteredInquiries = [];
    renderList();
  }
}

function renderList() {
  const tbody = qs('#inquiries-tbody');
  const mobileContainer = qs('#inquiries-mobile');
  const emptyState = qs('#list-empty-state');
  const tableWrapper = qs('#inquiries-results-wrapper');
  const pagination = qs('#pagination-controls');
  const pageInfo = qs('#page-info');
  const btnPrev = qs('#btn-page-prev');
  const btnNext = qs('#btn-page-next');

  if (!tbody || !mobileContainer) return;

  if (filteredInquiries.length === 0) {
    if (tableWrapper) tableWrapper.classList.add('d-none');
    if (pagination) pagination.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (tableWrapper) tableWrapper.classList.remove('d-none');
  if (emptyState) emptyState.classList.add('d-none');

  // Pagination logic
  const totalItems = totalPages * ITEMS_PER_PAGE; // Approximate for pagination math in UI
  
  const pageItems = filteredInquiries; // API already paginates

  // Update pagination UI
  if (pagination) {
    if (totalPages > 1) {
      pagination.classList.remove('d-none');
      pagination.classList.add('d-flex');
      if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      if (btnPrev) btnPrev.disabled = (currentPage === 1);
      if (btnNext) btnNext.disabled = (currentPage === totalPages);
    } else {
      pagination.classList.remove('d-flex');
      pagination.classList.add('d-none');
    }
  }

  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  pageItems.forEach(inq => {
    const isDraft = inq.isDraft;
    const opp = inq.visit?.opportunity || '-';
    let oppBadgeClass = 'badge-secondary';
    if (opp === 'HOT') oppBadgeClass = 'badge-hot';
    if (opp === 'WARM') oppBadgeClass = 'badge-warm';
    if (opp === 'COLD') oppBadgeClass = 'badge-cold';
    if (opp === 'FUTURE POTENTIAL') oppBadgeClass = 'badge-future-potential';
    if (opp === 'DEALER DEVELOPMENT') oppBadgeClass = 'badge-dealer-development';
    if (opp === 'NO REQUIREMENT') oppBadgeClass = 'badge-no-requirement';
    
    const statusBadge = isDraft 
      ? '<span class="badge-pocika badge-status-draft">Draft</span>' 
      : '<span class="badge-pocika badge-status-submitted">Submitted</span>';
    
    const fDate = inq.followUp?.followUpDate ? formatDate(new Date(inq.followUp.followUpDate)) : '-';
    const dateFormatted = inq.date ? formatDate(new Date(inq.date)) : '-';
    
    const company = inq.customer?.companyName || 'Unknown';
    const location = inq.customer?.siteLocation || '-';

    const actionBtn = isDraft
      ? `<a href="inquiry.html" class="btn-pocika btn-pocika-secondary px-3 py-1" style="font-size: 0.875rem;">Continue</a>`
      : `<a href="inquiry-details.html?id=${inq.inquiryNumber}" class="btn-pocika btn-pocika-ghost px-3 py-1">View</a>`;

    const mobileActionBtn = isDraft
      ? `<a href="inquiry.html" class="btn-pocika btn-pocika-secondary w-100 mt-3">Continue Draft</a>`
      : `<a href="inquiry-details.html?id=${inq.inquiryNumber}" class="btn-pocika btn-pocika-ghost w-100 mt-3">View</a>`;

    // Desktop Table Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3 border-bottom">${inq.inquiryNumber}</td>
      <td class="py-3 border-bottom">${dateFormatted}</td>
      <td class="py-3 border-bottom">${company}</td>
      <td class="py-3 border-bottom">${location}</td>
      <td class="py-3 border-bottom"><span class="badge-pocika ${oppBadgeClass}">${opp}</span></td>
      <td class="py-3 border-bottom">${statusBadge}</td>
      <td class="text-end px-4 border-bottom">${actionBtn}</td>
    `;
    tbody.appendChild(tr);

    // Mobile Card
    const card = document.createElement('div');
    card.className = 'inquiry-card';
    card.innerHTML = `
      <div class="inquiry-card-top">
        <div>
          <div class="inquiry-card-number">${inq.inquiryNumber}</div>
          <div class="inquiry-card-meta">${company} &bull; ${location}</div>
        </div>
        <span class="badge-pocika ${oppBadgeClass}">${opp}</span>
      </div>
      <div class="inquiry-card-meta mt-2 d-flex justify-content-between align-items-center">
        <span>Follow-up: ${fDate}</span>
        ${statusBadge}
      </div>
      ${mobileActionBtn}
    `;
    mobileContainer.appendChild(card);
  });
}
