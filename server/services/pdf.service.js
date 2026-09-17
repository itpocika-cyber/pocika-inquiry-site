import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null || unsafe === '') return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatDateStr = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `₹ ${num.toLocaleString('en-IN')}`;
};

/**
 * Resolve local files or remote URLs to Base64 data URIs for puppeteer
 */
async function resolveImageToDataUri(imgUrl) {
  if (!imgUrl) return null;

  // 1. Local path
  if (imgUrl.startsWith('/uploads/')) {
    try {
      const relativePath = imgUrl.replace(/^\//, '');
      const filePath = path.resolve(__dirname, '..', relativePath);
      await fs.access(filePath);
      const buf = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  // 2. Base64 data URI
  if (imgUrl.startsWith('data:image/')) {
    return imgUrl;
  }

  // 3. Remote URL
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(imgUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${buf.toString('base64')}`;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export const generateInquiryPdf = async (inquiry) => {
  let browser = null;
  
  try {
    // 1. Load Template
    const templatePath = path.join(__dirname, '../templates/inquiry-pdf.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    // 2. Format Customer & Business Profile
    const designationStr = inquiry.customer?.designation ? ` (${escapeHtml(inquiry.customer.designation)})` : '';
    const contactPersonFull = (escapeHtml(inquiry.customer?.contactPerson) + designationStr) || '-';

    const customerType = inquiry.business?.customerType === 'Retail/Other' && inquiry.business?.customerTypeOther
      ? `Retail/Other (${inquiry.business.customerTypeOther})`
      : (inquiry.business?.customerType || '-');

    const facility = inquiry.business?.facility === 'Other' && inquiry.business?.facilityOther
      ? `Other (${inquiry.business.facilityOther})`
      : (inquiry.business?.facility || '-');

    const facilityParts = [facility];
    if (inquiry.business?.floors) facilityParts.push(`${inquiry.business.floors} Floors`);
    if (inquiry.business?.areaSqft) facilityParts.push(`${Number(inquiry.business.areaSqft).toLocaleString()} Sq.Ft.`);
    if (inquiry.business?.status) facilityParts.push(inquiry.business.status);
    const facilityStatusText = facilityParts.filter(Boolean).join(' • ');

    // Address & GST optional rows
    let optionalAddressRows = '';
    if (inquiry.customer?.siteLocation || inquiry.customer?.gstNo) {
      optionalAddressRows += `
        <div class="field-row">
          ${inquiry.customer?.siteLocation ? `
            <div class="field-cell">
              <div class="f-label">Site Location</div>
              <div class="f-val">${escapeHtml(inquiry.customer.siteLocation)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
          ${inquiry.customer?.gstNo ? `
            <div class="field-cell">
              <div class="f-label">GST No.</div>
              <div class="f-val">${escapeHtml(inquiry.customer.gstNo)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
        </div>
      `;
    }
    if (inquiry.customer?.billingAddress && inquiry.customer?.billingAddress !== inquiry.customer?.siteLocation) {
      optionalAddressRows += `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Billing Address</div>
            <div class="f-val">${escapeHtml(inquiry.customer.billingAddress)}</div>
          </div>
        </div>
      `;
    }

    // 3. Products & Requirements Badges and Rows
    const productBadges = (inquiry.products || []).map(p => {
      const name = (p === 'Other' && inquiry.productOther) ? `Other (${inquiry.productOther})` : p;
      return `<span class="chip-badge chip-product">${escapeHtml(name)}</span>`;
    }).join(' ') || '-';

    let optionalRequirementRows = '';
    if (inquiry.requirement?.estimatedQuantity || inquiry.requirement?.reason) {
      optionalRequirementRows += `
        <div class="field-row">
          ${inquiry.requirement?.estimatedQuantity ? `
            <div class="field-cell">
              <div class="f-label">Estimated Quantity</div>
              <div class="f-val">${escapeHtml(inquiry.requirement.estimatedQuantity)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
          ${inquiry.requirement?.reason ? `
            <div class="field-cell">
              <div class="f-label">Purchase Reason</div>
              <div class="f-val">${escapeHtml(inquiry.requirement.reason)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
        </div>
      `;
    }
    if (inquiry.requirement?.currentBrand || inquiry.requirement?.currentPurchase) {
      optionalRequirementRows += `
        <div class="field-row">
          ${inquiry.requirement?.currentBrand ? `
            <div class="field-cell">
              <div class="f-label">Current Brand</div>
              <div class="f-val">${escapeHtml(inquiry.requirement.currentBrand)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
          ${inquiry.requirement?.currentPurchase ? `
            <div class="field-cell">
              <div class="f-label">Current Purchase / AMC Status</div>
              <div class="f-val">${escapeHtml(inquiry.requirement.currentPurchase)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
        </div>
      `;
    }
    if (inquiry.requirement?.productSpecification) {
      optionalRequirementRows += `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Specification / Details</div>
            <div class="f-val" style="font-weight: normal; white-space: pre-wrap;">${escapeHtml(inquiry.requirement.productSpecification)}</div>
          </div>
        </div>
      `;
    }

    // 4. Commercial Details
    let optionalCommercialRows = '';
    if (inquiry.commercial?.budget || inquiry.commercial?.paymentTerms) {
      optionalCommercialRows += `
        <div class="field-row">
          ${inquiry.commercial?.budget ? `
            <div class="field-cell">
              <div class="f-label">Budget</div>
              <div class="f-val">${escapeHtml(inquiry.commercial.budget)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
          ${inquiry.commercial?.paymentTerms ? `
            <div class="field-cell">
              <div class="f-label">Payment Terms</div>
              <div class="f-val">${escapeHtml(inquiry.commercial.paymentTerms)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
        </div>
      `;
    }
    if (inquiry.commercial?.decisionMakerName || inquiry.commercial?.purchaseDecisionBy) {
      const dmDesig = inquiry.commercial?.decisionMakerDesignation ? ` (${escapeHtml(inquiry.commercial.decisionMakerDesignation)})` : '';
      const dmFull = escapeHtml(inquiry.commercial?.decisionMakerName) + dmDesig;
      optionalCommercialRows += `
        <div class="field-row">
          <div class="field-cell">
            <div class="f-label">Decision Maker &bull; Role</div>
            <div class="f-val">${dmFull || '-'} ${inquiry.commercial?.decisionRole ? `&bull; ${escapeHtml(inquiry.commercial.decisionRole)}` : ''}</div>
          </div>
          <div class="field-cell">
            <div class="f-label">Purchase Decision By</div>
            <div class="f-val">${escapeHtml(formatDateStr(inquiry.commercial?.purchaseDecisionBy)) || '-'}</div>
          </div>
        </div>
      `;
    }
    if (inquiry.commercial?.competitors) {
      optionalCommercialRows += `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Competitor Brands</div>
            <div class="f-val">${escapeHtml(inquiry.commercial.competitors)}</div>
          </div>
        </div>
      `;
    }

    // 5. Visit & Opportunity
    const visitTypeStr = inquiry.visit?.visitType || 'Site Visit';
    const personMetStr = inquiry.visit?.personMet || '-';
    const visitMetText = `${escapeHtml(visitTypeStr)} • ${escapeHtml(personMetStr)}`;

    const opp = inquiry.visit?.opportunity || 'HOT';
    const oppClass = opp.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const opportunityBadge = `<span class="chip-badge badge-opp-${oppClass}">${escapeHtml(opp)}</span>`;

    let optionalVisitRows = '';
    if (inquiry.visit?.requirementDiscussed) {
      optionalVisitRows += `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Requirement Discussed &bull; Visit Notes</div>
            <div class="f-val" style="font-weight: normal; white-space: pre-wrap;">${escapeHtml(inquiry.visit.requirementDiscussed)}</div>
          </div>
        </div>
      `;
    }

    // 6. Next Action & Follow-up Badges
    const nextActions = Array.isArray(inquiry.followUp?.nextAction)
      ? inquiry.followUp.nextAction
      : (inquiry.followUp?.nextAction ? [inquiry.followUp.nextAction] : []);
    const nextActionBadges = nextActions.length > 0
      ? nextActions.map(a => `<span class="chip-badge chip-action">${escapeHtml(a)}</span>`).join(' ')
      : '-';

    let optionalFollowupRows = '';
    if (inquiry.followUp?.nextVisitType || inquiry.followUp?.quotationDate) {
      optionalFollowupRows += `
        <div class="field-row">
          ${inquiry.followUp?.nextVisitType ? `
            <div class="field-cell">
              <div class="f-label">Next Action / Meeting Type</div>
              <div class="f-val">${escapeHtml(inquiry.followUp.nextVisitType)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
          ${inquiry.followUp?.quotationDate ? `
            <div class="field-cell">
              <div class="f-label">Quotation Required By</div>
              <div class="f-val">${escapeHtml(formatDateStr(inquiry.followUp.quotationDate))}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
        </div>
      `;
    }
    if (inquiry.followUp?.nextActionCommitment) {
      optionalFollowupRows += `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Follow-up Commitment / Note</div>
            <div class="f-val" style="font-weight: normal; white-space: pre-wrap;">${escapeHtml(inquiry.followUp.nextActionCommitment)}</div>
          </div>
        </div>
      `;
    }

    // 7. Remarks Section Card (only render if remarks exist)
    let remarksCard = '';
    if (inquiry.remarks && inquiry.remarks.trim()) {
      remarksCard = `
        <div class="section-card">
          <div class="section-card-header">6. Visit Remarks / Special Requirements</div>
          <div class="section-card-body">
            <div class="f-val" style="font-weight: normal; white-space: pre-wrap;">${escapeHtml(inquiry.remarks)}</div>
          </div>
        </div>
      `;
    }

    // 8. Site Photos Section (2-column image grid)
    let photosHtml = '';
    if (inquiry.photos && inquiry.photos.length > 0) {
      const photoCards = await Promise.all(inquiry.photos.map(async (p, idx) => {
        const imgUrl = p.optimizedUrls?.preview || p.optimizedUrls?.thumbnail || p.secureUrl || p.previewUrl;
        const caption = p.originalFileName || p.fileName || '';
        const dataUri = await resolveImageToDataUri(imgUrl);

        if (dataUri) {
          return `
            <div class="photo-card">
              <div class="photo-badge">#${idx + 1}</div>
              <img src="${dataUri}" alt="Site Photo ${idx + 1}" />
              ${caption ? `<div class="photo-caption">${escapeHtml(caption)}</div>` : ''}
            </div>
          `;
        }

        return `
          <div class="photo-card">
            <div class="photo-badge">#${idx + 1}</div>
            <div class="photo-placeholder-box">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              ${caption ? `<div class="photo-caption">${escapeHtml(caption)}</div>` : ''}
            </div>
          </div>
        `;
      }));

      photosHtml = `
        <div class="section-card">
          <div class="section-card-header">Site Visit Photos (${inquiry.photos.length})</div>
          <div class="section-card-body">
            <div class="photos-grid">
              ${photoCards.join('')}
            </div>
          </div>
        </div>
      `;
    }

    // 9. Template Replacement
    const replacements = {
      INQUIRY_NUMBER: escapeHtml(inquiry.inquiryNumber),
      DATE: escapeHtml(formatDateStr(inquiry.date)),
      SALES_PERSON: escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative'),

      COMPANY_NAME: escapeHtml(inquiry.customer?.companyName || '-'),
      CONTACT_PERSON_FULL: contactPersonFull,
      MOBILE: escapeHtml(inquiry.customer?.mobile || '-'),
      EMAIL: escapeHtml(inquiry.customer?.email || '-'),
      CUSTOMER_TYPE: escapeHtml(customerType),
      INDUSTRY_TYPE: escapeHtml(inquiry.business?.industryType || '-'),
      FACILITY_STATUS_TEXT: facilityStatusText || '-',
      OPTIONAL_ADDRESS_ROWS: optionalAddressRows,

      PRODUCT_BADGES: productBadges,
      OPTIONAL_REQUIREMENT_ROWS: optionalRequirementRows,

      REQUIREMENT_VALUE: escapeHtml(formatCurrency(inquiry.commercial?.requirementValue)) || '-',
      EXPECTED_VALUE: escapeHtml(formatCurrency(inquiry.commercial?.expectedOrderValue)) || '-',
      OPTIONAL_COMMERCIAL_ROWS: optionalCommercialRows,

      VISIT_MET_TEXT: visitMetText,
      OPPORTUNITY_BADGE: opportunityBadge,
      OPTIONAL_VISIT_ROWS: optionalVisitRows,

      NEXT_ACTION_BADGES: nextActionBadges,
      FOLLOW_UP_DATE: escapeHtml(formatDateStr(inquiry.followUp?.followUpDate)) || '-',
      OPTIONAL_FOLLOWUP_ROWS: optionalFollowupRows,

      REMARKS_CARD: remarksCard,
      PHOTOS_SECTION: photosHtml,

      MANAGER_STATUS: escapeHtml(inquiry.managerReview?.status || 'Pending Review')
    };

    let finalHtml = templateHtml;
    for (const [key, val] of Object.entries(replacements)) {
      finalHtml = finalHtml.replaceAll(new RegExp(`{{${key}}}`, 'g'), val);
    }

    // 10. Launch Puppeteer & Generate PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    await page.setContent(finalHtml, { 
      waitUntil: inquiry.photos && inquiry.photos.length > 0 ? 'networkidle2' : 'domcontentloaded', 
      timeout: 20000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7pt; color: #64748B; width: 100%; display: flex; justify-content: space-between; padding: 0 12mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <span>POCIKA FIRE &amp; SAFETY PRODUCTS LLP &bull; Fire &amp; Safety Based Products</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '16mm',
        left: '12mm'
      }
    });

    return pdfBuffer;

  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF document: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('Error closing puppeteer:', e));
    }
  }
};
