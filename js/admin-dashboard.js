import { qs, qsa, debounce, formatDate } from './utils.js';
import { api } from './api.js';
import { auth, signOut, getUserProfile, onAuthStateChanged } from './auth.js';

let filteredInquiries = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let totalPages = 1;
let allSalespeople = new Set(); // to keep track for filters

document.addEventListener('DOMContentLoaded', () => {
  // Enforce authoritative admin authorization
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    try {
      const profile = await getUserProfile();

      if (!profile || !profile.isActive) {
        await signOut();
        alert('Your account is inactive. Contact an administrator.');
        window.location.href = 'login.html';
        return;
      }

      // Check role: only admin and super_admin allowed
      const isAuthorizedAdmin = (user.email || '').toLowerCase() === 'admin@pocika.com' || ['admin', 'super_admin'].includes(profile.role);
      if (!isAuthorizedAdmin) {
        console.warn(`Unauthorized access attempt to Admin Dashboard by role: ${profile.role}`);
        alert("403 Forbidden: You do not have permission to access the Admin Dashboard.");
        window.location.href = 'dashboard.html';
        return;
      }
      if ((user.email || '').toLowerCase() === 'admin@pocika.com' && profile.role !== 'super_admin') {
        profile.role = 'admin';
      }

      // Hydrate admin sidebar user details
      const displayName = profile.displayName || profile.email.split('@')[0];
      const adminSidebarUser = qs('.admin-layout__sidebar .fw-bold.fs-sm');
      if (adminSidebarUser) adminSidebarUser.textContent = displayName;
      const adminSidebarEmail = qs('.admin-layout__sidebar .text-muted.small');
      if (adminSidebarEmail) adminSidebarEmail.textContent = profile.email;

      // Initialize dashboard data
      initDashboard();
      fetchAndRenderList();
    } catch (err) {
      console.error('Authorization verification error:', err);
      alert('Unable to verify administration privileges. Redirecting to dashboard.');
      window.location.href = 'dashboard.html';
    }
  });
  
  const btnLogout = qs('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await signOut();
      window.location.href = 'login.html';
    });
  }
});

function initDashboard() {
  const searchInput = qs('#search-input');
  const filterOpp = qs('#filter-opportunity');
  const filterSalesperson = qs('#filter-salesperson');
  const filterDate = qs('#filter-date');
  const filterQuote = qs('#filter-quote');
  const sortSelect = qs('#sort-select');
  const btnClear = qs('#btn-clear-filters');
  const btnEmptyClear = qs('#btn-empty-clear');

  const applyFilters = () => {
    currentPage = 1;
    fetchAndRenderList();
  };

  if (searchInput) searchInput.addEventListener('input', debounce(applyFilters, 400));
  if (filterOpp) filterOpp.addEventListener('change', applyFilters);
  if (filterSalesperson) filterSalesperson.addEventListener('change', applyFilters);
  if (filterDate) filterDate.addEventListener('change', applyFilters);
  if (filterQuote) filterQuote.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  const clearHandler = () => {
    if (searchInput) searchInput.value = '';
    if (filterOpp) filterOpp.value = '';
    if (filterSalesperson) filterSalesperson.value = '';
    if (filterDate) filterDate.value = '';
    if (filterQuote) filterQuote.value = '';
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

  // KPI Click to filter
  const bindKpi = (id, filterFn) => {
    const el = qs(id);
    if (el) {
      el.addEventListener('click', () => {
        clearHandler(); // reset first
        filterFn();
        applyFilters();

        // Scroll to filters
        const filtersEl = qs('.admin-filters');
        if (filtersEl) filtersEl.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

  bindKpi('#kpi-total', () => { }); // Just clears
  bindKpi('#kpi-today', () => { if (filterDate) filterDate.value = 'today'; });
  bindKpi('#kpi-hot', () => { if (filterOpp) filterOpp.value = 'HOT'; });
  bindKpi('#kpi-warm', () => { if (filterOpp) filterOpp.value = 'WARM'; });
  bindKpi('#kpi-quotes', () => { if (filterQuote) filterQuote.value = 'Required'; });
  bindKpi('#kpi-followups', () => { if (sortSelect) sortSelect.value = 'followup_soonest'; });
}

async function fetchAndRenderList() {
  const searchInput = qs('#search-input');
  const filterOpp = qs('#filter-opportunity');
  const filterSalesperson = qs('#filter-salesperson');
  const filterDate = qs('#filter-date');
  const filterQuote = qs('#filter-quote');
  const sortSelect = qs('#sort-select');

  const params = {
    page: currentPage,
    limit: ITEMS_PER_PAGE
  };

  if (searchInput && searchInput.value) params.search = searchInput.value;
  if (filterOpp && filterOpp.value) params.opportunity = filterOpp.value;
  if (filterSalesperson && filterSalesperson.value) params.salesPerson = filterSalesperson.value;
  if (filterDate && filterDate.value) params.dateRange = filterDate.value;
  if (filterQuote && filterQuote.value) params.quote = filterQuote.value;
  if (sortSelect && sortSelect.value) params.sort = sortSelect.value;

  try {
    const res = await api.getInquiries(params);
    filteredInquiries = res.data.items;
    totalPages = res.data.pagination.totalPages;

    // Dynamically update salespeople dropdown list based on returned data if missing
    // In a real app this might be a separate API call to get all salespeople
    populateDynamicFilters(filteredInquiries);

    updateKPIs(); // Now we call a summary API separately
    renderList(res.data.pagination.total);
  } catch (error) {
    console.error('Failed to fetch admin inquiries:', error);
    filteredInquiries = [];
    renderList(0);
  }
}

function populateDynamicFilters(items = []) {
  const filterSalesperson = qs('#filter-salesperson');
  if (!filterSalesperson) return;

  const currentVal = filterSalesperson.value;
  items.forEach(inq => {
    if (inq.salesPerson) allSalespeople.add(inq.salesPerson);
  });

  filterSalesperson.innerHTML = '<option value="">All Salespeople</option>';
  Array.from(allSalespeople).sort().forEach(sp => {
    const opt = document.createElement('option');
    opt.value = sp;
    opt.textContent = sp;
    if (sp === currentVal) opt.selected = true;
    filterSalesperson.appendChild(opt);
  });
}

async function updateKPIs() {
  const kpiTotal = qs('#kpi-total .kpi-card__value');
  const kpiToday = qs('#kpi-today .kpi-card__value');
  const kpiHot = qs('#kpi-hot .kpi-card__value');
  const kpiWarm = qs('#kpi-warm .kpi-card__value');
  const kpiFollowups = qs('#kpi-followups .kpi-card__value');
  const kpiQuotes = qs('#kpi-quotes .kpi-card__value');

  try {
    const res = await api.getSummary();
    const data = res.data;

    if (kpiTotal) kpiTotal.textContent = data.total || 0;
    if (kpiToday) kpiToday.textContent = data.today || 0;
    if (kpiHot) kpiHot.textContent = data.hot || 0;
    // We don't have warm or quotes aggregated on backend yet, so fallback to 0 or we could add them
    if (kpiWarm) kpiWarm.textContent = data.warm || 0;
    if (kpiFollowups) kpiFollowups.textContent = data.pendingFollowUps || 0;
    if (kpiQuotes) kpiQuotes.textContent = data.quotes || 0;
  } catch (error) {
    if (kpiTotal) kpiTotal.textContent = 0;
    if (kpiToday) kpiToday.textContent = 0;
    if (kpiHot) kpiHot.textContent = 0;
    if (kpiWarm) kpiWarm.textContent = 0;
    if (kpiFollowups) kpiFollowups.textContent = 0;
    if (kpiQuotes) kpiQuotes.textContent = 0;
  }
}

function renderList(totalItemsCount) {
  const tbody = qs('#admin-tbody');
  const mobileContainer = qs('#admin-mobile-container');
  const emptyState = qs('#admin-empty-state');
  const tableWrapper = qs('#inquiries-table-wrapper');
  const pagination = qs('#admin-pagination');
  const pageInfo = qs('#admin-page-info');
  const resultsCount = qs('#results-count');
  const btnPrev = qs('#btn-page-prev');
  const btnNext = qs('#btn-page-next');

  if (!tbody || !mobileContainer) return;

  const totalItems = totalItemsCount || 0;
  const currentCount = filteredInquiries.length;

  if (resultsCount) {
    if (totalItems === 0) {
      resultsCount.textContent = '0 inquiries';
    } else {
      resultsCount.textContent = `${totalItems} inquiry${totalItems > 1 ? 's' : ''}`;
    }
  }

  if (totalItems === 0) {
    if (tableWrapper) tableWrapper.classList.add('d-none');
    if (mobileContainer) mobileContainer.classList.add('d-none');
    if (pagination) pagination.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (tableWrapper) tableWrapper.classList.remove('d-none');
  if (mobileContainer) mobileContainer.classList.remove('d-none');
  if (emptyState) emptyState.classList.add('d-none');

  // Pagination logic
  const maxPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (currentPage > maxPages && maxPages > 0) currentPage = maxPages;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + currentCount;
  const pageItems = filteredInquiries; // API already paginates

  // Update pagination UI
  if (pagination) {
    if (totalItems > ITEMS_PER_PAGE) {
      pagination.classList.remove('d-none');
      if (pageInfo) pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems}`;
      if (btnPrev) btnPrev.disabled = (currentPage === 1);
      if (btnNext) btnNext.disabled = (currentPage === maxPages);
    } else {
      pagination.classList.add('d-none');
    }
  }

  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  pageItems.forEach(inq => {
    const opp = inq.visit?.opportunity || '-';
    let oppBadgeClass = 'badge-secondary';
    if (opp === 'HOT') oppBadgeClass = 'badge-hot';
    if (opp === 'WARM') oppBadgeClass = 'badge-warm';
    if (opp === 'COLD') oppBadgeClass = 'badge-cold';
    if (opp === 'FUTURE POTENTIAL') oppBadgeClass = 'badge-future-potential';
    if (opp === 'DEALER DEVELOPMENT') oppBadgeClass = 'badge-dealer-development';
    if (opp === 'NO REQUIREMENT') oppBadgeClass = 'badge-no-requirement';

    const fDate = inq.followUp?.followUpDate ? formatDate(new Date(inq.followUp.followUpDate)) : '-';
    const dateFormatted = inq.date ? formatDate(new Date(inq.date)) : '-';

    const company = inq.customer?.companyName || 'Unknown';
    const location = inq.customer?.siteLocation || '-';
    const sp = inq.salesPerson || '-';

    // Product rendering logic
    let productsDisplay = '-';
    if (inq.products && inq.products.length > 0) {
      if (inq.products.length > 1) {
        productsDisplay = `<span class="text-truncate d-inline-block" style="max-width:150px;" title="${inq.products.join(', ')}">${inq.products[0]}</span> <span class="badge bg-light text-dark border">+${inq.products.length - 1}</span>`;
      } else {
        productsDisplay = `<span class="text-truncate d-inline-block" style="max-width:180px;" title="${inq.products[0]}">${inq.products[0]}</span>`;
      }
    }

    const actionBtn = `<a href="inquiry-details.html?id=${inq.inquiryNumber}" class="btn btn-sm btn-outline-primary">View</a>`;

    // Desktop Table Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-medium">${inq.inquiryNumber}</td>
      <td>${dateFormatted}</td>
      <td>
        <div class="d-flex align-items-center">
          <div class="rounded-circle bg-light d-flex justify-content-center align-items-center me-2 text-primary fw-bold" style="width: 28px; height: 28px; font-size: 10px;">
            ${sp.substring(0, 2).toUpperCase()}
          </div>
          ${sp}
        </div>
      </td>
      <td>
        <div class="fw-medium">${company}</div>
        <div class="text-muted small">${location}</div>
      </td>
      <td>${productsDisplay}</td>
      <td><span class="badge-pocika ${oppBadgeClass}">${opp}</span></td>
      <td>${fDate}</td>
      <td class="text-end">${actionBtn}</td>
    `;
    tbody.appendChild(tr);

    // Mobile Card
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.innerHTML = `
      <div class="admin-card__header">
        <div>
          <div class="admin-card__number">${inq.inquiryNumber}</div>
          <div class="admin-card__company">${company}</div>
          <div class="admin-card__meta">${location} &bull; ${sp}</div>
        </div>
        <span class="badge-pocika ${oppBadgeClass}">${opp}</span>
      </div>
      
      <div class="mb-2 fs-sm">
        <span class="text-muted">Products:</span> ${productsDisplay}
      </div>
      
      <div class="admin-card__footer">
        <div class="fs-sm">
          <span class="text-muted">Follow-up:</span> <span class="fw-medium">${fDate}</span>
        </div>
        ${actionBtn}
      </div>
    `;
    mobileContainer.appendChild(card);
  });
}
