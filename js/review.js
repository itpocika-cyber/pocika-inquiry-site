import { qs } from './utils.js';
import { inquiryData } from './form.js';
import { goToStep } from './steps.js';

export function initReview() {
  // Expose generateReview globally so it can be called from steps.js
  // (Alternatively it can be exported and imported directly)
}

export function generateReview() {
  const container = qs('#review-content');
  if (!container) return;
  
  container.innerHTML = '';
  
  const sections = [
    {
      title: 'Visit & Contact',
      step: 1,
      fields: [
        { label: 'Date', value: inquiryData.date },
        { label: 'Sales Person', value: inquiryData.salesPerson },
        { label: 'Company/Client Name', value: inquiryData.customer.companyName },
        { label: 'Contact Person', value: inquiryData.customer.contactPerson },
        { label: 'Designation', value: inquiryData.customer.designation },
        { label: 'Mobile No.', value: inquiryData.customer.mobile },
        { label: 'Email', value: inquiryData.customer.email },
        { label: 'Company/Billing Address', value: inquiryData.customer.billingAddress },
        { label: 'Site/Visit Location', value: inquiryData.customer.siteLocation },
        { label: 'GST No.', value: inquiryData.customer.gstNo }
      ]
    },
    {
      title: 'Customer / Business',
      step: 2,
      fields: [
        { label: 'Customer Type', value: inquiryData.business.customerType === 'Retail/Other' ? inquiryData.business.customerTypeOther : inquiryData.business.customerType },
        { label: 'Industry/Business Type', value: inquiryData.business.industryType },
        { label: 'Location/GIDC', value: inquiryData.business.locationGidc },
        { label: 'Facility', value: inquiryData.business.facility === 'Other' ? inquiryData.business.facilityOther : inquiryData.business.facility },
        { label: 'Approx. Area (Sq.Ft.)', value: inquiryData.business.areaSqft },
        { label: 'Floors', value: inquiryData.business.floors },
        { label: 'Project/Facility Status', value: inquiryData.business.status },
        { label: 'Expected Requirement Date', value: inquiryData.business.expectedDate }
      ]
    },
    {
      title: 'Product / Requirement',
      step: 3,
      fields: [
        { label: 'Products', value: renderArray(inquiryData.products, inquiryData.productOther) },
        { label: 'Required Product/Specification/Size', value: inquiryData.requirement.productSpecification },
        { label: 'Estimated Quantity', value: inquiryData.requirement.estimatedQuantity },
        { label: 'Current Brand/Supplier', value: inquiryData.requirement.currentBrand },
        { label: 'Current Purchase/Requirement', value: inquiryData.requirement.currentPurchase },
        { label: 'Reason', value: inquiryData.requirement.reason }
      ]
    },
    {
      title: 'Commercial / Sales Qualification',
      step: 4,
      fields: [
        { label: 'Approx. Requirement Value', value: inquiryData.commercial.requirementValue },
        { label: 'Expected Order Value', value: inquiryData.commercial.expectedOrderValue },
        { label: 'Budget', value: inquiryData.commercial.budget },
        { label: 'Payment Terms Expected', value: inquiryData.commercial.paymentTerms },
        { label: 'Competitor/Brands', value: inquiryData.commercial.competitors },
        { label: 'Decision Maker Name', value: inquiryData.commercial.decisionMakerName },
        { label: 'Decision Maker Designation', value: inquiryData.commercial.decisionMakerDesignation },
        { label: 'Decision Maker/Influencer', value: inquiryData.commercial.decisionRole },
        { label: 'Purchase Decision By', value: inquiryData.commercial.purchaseDecisionBy }
      ]
    },
    {
      title: 'Visit & Opportunity',
      step: 5,
      fields: [
        { label: 'Visit Type', value: inquiryData.visit.visitType },
        { label: 'Person Met', value: inquiryData.visit.personMet },
        { label: 'Requirement Discussed', value: inquiryData.visit.requirementDiscussed },
        { label: 'Photos', value: inquiryData.visit.photos },
        { label: 'Opportunity', value: inquiryData.visit.opportunity, isBadge: true }
      ]
    },
    {
      title: 'Next Action / Follow-up',
      step: 6,
      fields: [
        { label: 'Next action', value: renderArray(inquiryData.followUp.nextAction) },
        { label: 'Quotation Required By', value: inquiryData.followUp.quotationDate },
        { label: 'Next visit/action type', value: inquiryData.followUp.nextVisitType },
        { label: 'Next Follow-up Date', value: inquiryData.followUp.followUpDate },
        { label: 'Next Action/Commitment', value: inquiryData.followUp.nextActionCommitment }
      ]
    },
    {
      title: 'Remarks & Photos',
      step: 7,
      fields: [
        { label: 'Visit Remarks / Special Requirements', value: inquiryData.remarks }
      ],
      photos: inquiryData.photos
    }
  ];

  sections.forEach(section => {
    // Check if section has any content to display
    const validFields = section.fields.filter(f => f.value && f.value.length > 0);
    const hasPhotos = section.photos && section.photos.length > 0;
    
    if (validFields.length === 0 && !hasPhotos) return;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'review-section mb-4 pb-3 border-bottom';

    const header = document.createElement('div');
    header.className = 'review-section-header d-flex justify-content-between align-items-center mb-3';
    header.innerHTML = `
      <h3 class="text-field-label m-0" style="font-size:1.125rem;">${section.title}</h3>
      <button type="button" class="btn-pocika btn-pocika-ghost btn-edit-step" data-step="${section.step}">Edit</button>
    `;
    sectionEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'review-grid row g-3';

    validFields.forEach(field => {
      const fieldEl = document.createElement('div');
      fieldEl.className = 'col-md-6 review-field';
      
      let valHtml = '';
      if (field.isBadge) {
        valHtml = `<span class="badge-pocika badge-${field.value.toLowerCase().replace(/ /g, '-')}">${field.value}</span>`;
      } else {
        valHtml = `<div class="review-value" style="color:var(--color-text);">${escapeHtml(field.value)}</div>`;
      }

      fieldEl.innerHTML = `
        <div class="review-label text-helper mb-1">${field.label}</div>
        ${valHtml}
      `;
      grid.appendChild(fieldEl);
    });
    
    sectionEl.appendChild(grid);

    if (hasPhotos) {
      const photoGrid = document.createElement('div');
      photoGrid.className = 'photo-grid mt-3';
      section.photos.forEach(photo => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        const src = photo.previewUrl || photo.secureUrl || '';
        thumb.innerHTML = `<img src="${src}" alt="${escapeHtml(photo.fileName || 'Photo')}">`;
        photoGrid.appendChild(thumb);
      });
      sectionEl.appendChild(photoGrid);
    }

    container.appendChild(sectionEl);
  });

  // Attach edit button listeners
  const editBtns = container.querySelectorAll('.btn-edit-step');
  editBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const step = parseInt(e.target.getAttribute('data-step'), 10);
      goToStep(step);
    });
  });
}

function renderArray(arr, otherVal = '') {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
  let str = arr.join(', ');
  if (arr.includes('Other') && otherVal) {
    str = str.replace('Other', `Other (${otherVal})`);
  }
  return str;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
