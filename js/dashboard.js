import { qs, formatDate } from './utils.js';
import { api } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  initDraftAlert();
  
  try {
    const summaryRes = await api.getSummary();
    const inquiriesRes = await api.getInquiries({ limit: 20 });
    
    renderKPIs(summaryRes.data);
    renderRecentInquiries(inquiriesRes.data.items);
    renderUpcomingFollowUps(inquiriesRes.data.items);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    // Graceful degradation: show empty states if API fails
    renderKPIs({ total: 0, today: 0, hot: 0, pendingFollowUps: 0 });
    renderRecentInquiries([]);
    renderUpcomingFollowUps([]);
  }
});

function initDraftAlert() {
  const saved = localStorage.getItem('pocika_inquiry_draft');
  const alertContainer = qs('#dashboard-draft-container');
  if (saved && alertContainer) {
    alertContainer.classList.remove('d-none');
  }
}

function renderKPIs(summary) {
  const kpiTotal = qs('#kpi-total');
  const kpiToday = qs('#kpi-today');
  const kpiHot = qs('#kpi-hot');
  const kpiFollowUp = qs('#kpi-followup');

  if (!kpiTotal) return;

  kpiTotal.textContent = summary.total || 0;
  kpiToday.textContent = summary.today || 0;
  kpiHot.textContent = summary.hot || 0;
  kpiFollowUp.textContent = summary.pendingFollowUps || 0;
}

function renderRecentInquiries(inquiries) {
  const tbody = qs('#recent-inquiries-tbody');
  const mobileContainer = qs('#recent-inquiries-mobile');
  const emptyState = qs('#recent-empty-state');
  const tableWrapper = qs('#recent-results-wrapper');

  if (!tbody || !mobileContainer) return;

  const recent = inquiries.slice(0, 5);

  if (recent.length === 0) {
    if (tableWrapper) tableWrapper.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (tableWrapper) tableWrapper.classList.remove('d-none');
  if (emptyState) emptyState.classList.add('d-none');

  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  recent.forEach(inq => {
    const opp = inq.visit ? inq.visit.opportunity : '-';
    let oppBadgeClass = 'badge-secondary';
    if (opp === 'HOT') oppBadgeClass = 'badge-hot';
    if (opp === 'WARM') oppBadgeClass = 'badge-warm';
    if (opp === 'COLD') oppBadgeClass = 'badge-cold';
    if (opp === 'FUTURE POTENTIAL') oppBadgeClass = 'badge-future-potential';
    if (opp === 'DEALER DEVELOPMENT') oppBadgeClass = 'badge-dealer-development';
    if (opp === 'NO REQUIREMENT') oppBadgeClass = 'badge-no-requirement';
    
    const fDate = inq.followUp && inq.followUp.followUpDate ? formatDate(new Date(inq.followUp.followUpDate)) : '-';
    const dateFormatted = inq.date ? formatDate(new Date(inq.date)) : '-';
    const location = inq.customer?.siteLocation || '-';

    // Desktop Table Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3">${inq.inquiryNumber}</td>
      <td class="py-3">${dateFormatted}</td>
      <td class="py-3">${inq.customer.companyName}</td>
      <td class="py-3"><span class="badge-pocika ${oppBadgeClass}">${opp}</span></td>
      <td class="py-3"><span class="badge-pocika badge-status-submitted">Submitted</span></td>
      <td class="text-end px-4"><a href="inquiry-details.html?id=${inq.inquiryNumber}" class="btn-pocika btn-pocika-ghost">View</a></td>
    `;
    tbody.appendChild(tr);

    // Mobile Card
    const card = document.createElement('div');
    card.className = 'inquiry-card';
    card.innerHTML = `
      <div class="inquiry-card-top">
        <div>
          <div class="inquiry-card-number">${inq.inquiryNumber}</div>
          <div class="inquiry-card-meta">${inq.customer.companyName} &bull; ${location}</div>
        </div>
        <span class="badge-pocika ${oppBadgeClass}">${opp}</span>
      </div>
      <div class="inquiry-card-meta d-flex justify-content-between align-items-center mt-2">
        <span>Follow-up: ${fDate}</span>
        <a href="inquiry-details.html?id=${inq.inquiryNumber}" class="btn-pocika btn-pocika-ghost px-2 py-1" style="font-size:0.75rem;">View</a>
      </div>
    `;
    mobileContainer.appendChild(card);
  });
}

function renderUpcomingFollowUps(inquiries) {
  const listContainer = qs('#upcoming-followups-list');
  const emptyState = qs('#followups-empty-state');
  if (!listContainer) return;

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filter for pending follow ups and sort by closest date
  const followUps = inquiries.filter(inq => {
    return inq.followUp && inq.followUp.followUpDate && inq.followUp.followUpDate >= todayStr;
  }).sort((a, b) => {
    return new Date(a.followUp.followUpDate) - new Date(b.followUp.followUpDate);
  }).slice(0, 5);

  if (followUps.length === 0) {
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  listContainer.innerHTML = '';
  
  followUps.forEach(inq => {
    const nextActions = inq.followUp.nextAction.length > 0 ? inq.followUp.nextAction.join(', ') : 'Follow-up';
    const fDate = formatDate(new Date(inq.followUp.followUpDate));
    
    const item = document.createElement('div');
    item.className = 'list-group-item p-3 border-0 border-bottom';
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <strong style="font-size: 0.875rem;">${inq.customer.companyName}</strong>
        <span class="text-muted-custom" style="font-size: 0.75rem;">${fDate}</span>
      </div>
      <div class="text-muted-custom" style="font-size: 0.875rem;">${nextActions}</div>
    `;
    listContainer.appendChild(item);
  });
}
