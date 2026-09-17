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
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  return String(val);
};

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'string' && (val.includes('₹') || val.includes('-'))) return val;
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Resolve local files or remote URLs to Base64 data URIs for puppeteer
 */
async function resolveImageToDataUri(imgUrl) {
  if (!imgUrl) return null;

  // 1. Local path
  if (imgUrl.startsWith('/uploads/') || imgUrl.startsWith('uploads/')) {
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
      const timer = setTimeout(() => controller.abort(), 4000);
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

/**
 * Get Pocika Logo as Base64 Data URI
 */
async function getLogoDataUri() {
  const possiblePaths = [
    path.resolve(__dirname, '../assets/logo/pocika-logo.png'),
    path.resolve(__dirname, '../../client/public/assets/logo/pocika-logo.png'),
    path.resolve(__dirname, '../../client/dist/assets/logo/pocika-logo.png')
  ];

  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      const buf = await fs.readFile(p);
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      // Continue to next path
    }
  }
  return '';
}

export const generateInquiryPdf = async (inquiry) => {
  let browser = null;
  
  try {
    // 1. Load Template
    const templatePath = path.join(__dirname, '../templates/inquiry-pdf.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    // 2. Load Logo
    const logoDataUri = await getLogoDataUri();

    // 3. Customer & Business Data
    const companyName = inquiry.customer?.companyName || '-';
    const contactPerson = inquiry.customer?.contactPerson || '-';
    const designation = inquiry.customer?.designation || '-';
    const mobile = inquiry.customer?.mobile || '-';
    const email = inquiry.customer?.email || '-';
    const billingAddress = inquiry.customer?.billingAddress || inquiry.customer?.siteLocation || '-';

    let optionalSiteAddressRow = '';
    if (inquiry.customer?.siteLocation && inquiry.customer?.siteLocation !== inquiry.customer?.billingAddress) {
      optionalSiteAddressRow = `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Site / Visit Location</div>
            <div class="f-val">${escapeHtml(inquiry.customer.siteLocation)}</div>
          </div>
        </div>
      `;
    }
    if (inquiry.customer?.gstNo) {
      optionalSiteAddressRow += `
        <div class="field-row">
          <div class="field-cell">
            <div class="f-label">GST No.</div>
            <div class="f-val">${escapeHtml(inquiry.customer.gstNo)}</div>
          </div>
          <div class="field-cell"></div>
        </div>
      `;
    }

    const customerType = inquiry.business?.customerType === 'Retail/Other' && inquiry.business?.customerTypeOther
      ? `Retail/Other (${inquiry.business.customerTypeOther})`
      : (inquiry.business?.customerType || '-');

    const industryType = inquiry.business?.industryType || '-';
    const locationGidc = inquiry.business?.locationGidc || '-';

    const facility = inquiry.business?.facility === 'Other' && inquiry.business?.facilityOther
      ? `Other (${inquiry.business.facilityOther})`
      : (inquiry.business?.facility || '-');

    const status = inquiry.business?.status || '-';

    // Approx Area / Floors combined
    const areaParts = [];
    if (inquiry.business?.areaSqft) areaParts.push(`${Number(inquiry.business.areaSqft).toLocaleString()} Sq.Ft.`);
    if (inquiry.business?.floors) areaParts.push(`${inquiry.business.floors} Floors`);
    const areaFloorsText = areaParts.length > 0 ? areaParts.join('  /  ') : '-';

    // Expected Date Row
    let expectedDateRow = '';
    if (inquiry.business?.expectedDate) {
      expectedDateRow = `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Expected Requirement Date</div>
            <div class="f-val">${escapeHtml(formatDateStr(inquiry.business.expectedDate))}</div>
          </div>
        </div>
      `;
    }

    // 4. Products & Requirement Details
    const productBadges = (inquiry.products || []).map(p => {
      const name = (p === 'Other' && inquiry.productOther) ? `Other (${inquiry.productOther})` : p;
      return `<span class="chip-badge chip-product">${escapeHtml(name)}</span>`;
    }).join(' ') || '-';

    const productSpecification = inquiry.requirement?.productSpecification || '-';
    const estimatedQuantity = inquiry.requirement?.estimatedQuantity || '-';
    const purchaseReason = inquiry.requirement?.reason || '-';
    const currentPurchase = inquiry.requirement?.currentPurchase || '-';

    let optionalCurrentBrandRow = '';
    if (inquiry.requirement?.currentBrand) {
      optionalCurrentBrandRow = `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Current Brand / Supplier</div>
            <div class="f-val">${escapeHtml(inquiry.requirement.currentBrand)}</div>
          </div>
        </div>
      `;
    }

    // 5. Commercial & Sales Qualification
    const requirementValue = formatCurrency(inquiry.commercial?.requirementValue) || '-';
    const budget = inquiry.commercial?.budget || '-';
    const expectedValue = formatCurrency(inquiry.commercial?.expectedOrderValue) || '-';

    let dmFull = inquiry.commercial?.decisionMakerName || '';
    if (inquiry.commercial?.decisionRole) {
      dmFull += dmFull ? ` (${inquiry.commercial.decisionRole})` : inquiry.commercial.decisionRole;
    } else if (inquiry.commercial?.decisionMakerDesignation) {
      dmFull += dmFull ? ` (${inquiry.commercial.decisionMakerDesignation})` : inquiry.commercial.decisionMakerDesignation;
    }
    const decisionMakerFull = dmFull || '-';

    const purchaseDecisionBy = formatDateStr(inquiry.commercial?.purchaseDecisionBy) || inquiry.commercial?.purchaseDecisionBy || '-';

    let optionalCommercialDetailsRow = '';
    if (inquiry.commercial?.paymentTerms || inquiry.commercial?.competitors) {
      optionalCommercialDetailsRow = `
        <div class="field-row">
          ${inquiry.commercial?.paymentTerms ? `
            <div class="field-cell">
              <div class="f-label">Payment Terms</div>
              <div class="f-val">${escapeHtml(inquiry.commercial.paymentTerms)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
          ${inquiry.commercial?.competitors ? `
            <div class="field-cell">
              <div class="f-label">Competitor / Brands</div>
              <div class="f-val">${escapeHtml(inquiry.commercial.competitors)}</div>
            </div>
          ` : '<div class="field-cell"></div>'}
        </div>
      `;
    }

    // 6. Visit & Opportunity Status
    const visitType = inquiry.visit?.visitType || 'Site Visit';
    const personMet = inquiry.visit?.personMet || '-';

    const opp = inquiry.visit?.opportunity || 'HOT';
    const oppClass = opp.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const opportunityBadge = `<span class="badge-opp badge-opp-${oppClass}">${escapeHtml(opp)}</span>`;

    const requirementDiscussed = inquiry.visit?.requirementDiscussed || '-';

    // 7. Next Action / Follow-up
    const nextActions = Array.isArray(inquiry.followUp?.nextAction)
      ? inquiry.followUp.nextAction
      : (inquiry.followUp?.nextAction ? [inquiry.followUp.nextAction] : []);
    const nextActionBadges = nextActions.length > 0
      ? nextActions.map(a => `<span class="chip-badge chip-action">${escapeHtml(a)}</span>`).join(' ')
      : '-';

    const quotationRequiredBy = formatDateStr(inquiry.followUp?.quotationDate) || '-';
    const followUpDate = formatDateStr(inquiry.followUp?.followUpDate) || '-';
    const nextActionCommitment = inquiry.followUp?.nextActionCommitment || '-';

    let optionalNextVisitTypeRow = '';
    if (inquiry.followUp?.nextVisitType) {
      optionalNextVisitTypeRow = `
        <div class="field-row">
          <div class="field-cell-full">
            <div class="f-label">Next Action / Meeting Type</div>
            <div class="f-val">${escapeHtml(inquiry.followUp.nextVisitType)}</div>
          </div>
        </div>
      `;
    }

    // 8. Remarks Card
    let remarksSection = '';
    if (inquiry.remarks && inquiry.remarks.trim()) {
      remarksSection = `
        <div class="section-card">
          <div class="section-card-header">6. Visit Remarks / Special Requirements</div>
          <div class="section-card-body">
            <div class="f-val f-val-pre">${escapeHtml(inquiry.remarks)}</div>
          </div>
        </div>
      `;
    }

    // 9. Site Photos Section
    let photosHtml = '';
    if (inquiry.photos && inquiry.photos.length > 0) {
      const photoCards = await Promise.all(inquiry.photos.map(async (p, idx) => {
        const imgUrl = p.optimizedUrls?.preview || p.optimizedUrls?.thumbnail || p.secureUrl || p.previewUrl;
        const caption = p.originalFileName || p.fileName || `Site Photo ${idx + 1}`;
        const dataUri = await resolveImageToDataUri(imgUrl);

        if (dataUri) {
          return `
            <div class="photo-card">
              <div class="photo-img-wrap">
                <div class="photo-tag">Site Photo ${idx + 1}</div>
                <img src="${dataUri}" alt="Site Photo ${idx + 1}" />
              </div>
              <div class="photo-caption">${escapeHtml(caption)}</div>
            </div>
          `;
        }

        return `
          <div class="photo-card">
            <div class="photo-img-wrap">
              <div class="photo-tag">Site Photo ${idx + 1}</div>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div class="photo-caption">${escapeHtml(caption)}</div>
          </div>
        `;
      }));

      photosHtml = `
        <div class="section-card">
          <div class="section-card-header">Site Photos (${inquiry.photos.length} uploaded)</div>
          <div class="section-card-body">
            <div class="photos-grid">
              ${photoCards.join('')}
            </div>
          </div>
        </div>
      `;
    }

    // 10. Replacements Dictionary
    const replacements = {
      LOGO_DATA_URI: logoDataUri,
      INQUIRY_NUMBER: escapeHtml(inquiry.inquiryNumber),
      DATE: escapeHtml(formatDateStr(inquiry.date)),
      SALES_PERSON: escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || 'Kiran Mehta'),

      COMPANY_NAME: escapeHtml(companyName),
      CONTACT_PERSON: escapeHtml(contactPerson),
      DESIGNATION: escapeHtml(designation),
      MOBILE: escapeHtml(mobile),
      EMAIL: escapeHtml(email),
      BILLING_ADDRESS: escapeHtml(billingAddress),
      OPTIONAL_SITE_ADDRESS_ROW: optionalSiteAddressRow,
      CUSTOMER_TYPE: escapeHtml(customerType),
      INDUSTRY_TYPE: escapeHtml(industryType),
      LOCATION_GIDC: escapeHtml(locationGidc),
      FACILITY: escapeHtml(facility),
      STATUS: escapeHtml(status),
      AREA_FLOORS: escapeHtml(areaFloorsText),
      EXPECTED_DATE_ROW: expectedDateRow,

      PRODUCT_BADGES: productBadges,
      PRODUCT_SPECIFICATION: escapeHtml(productSpecification),
      ESTIMATED_QUANTITY: escapeHtml(estimatedQuantity),
      PURCHASE_REASON: escapeHtml(purchaseReason),
      CURRENT_PURCHASE: escapeHtml(currentPurchase),
      OPTIONAL_CURRENT_BRAND_ROW: optionalCurrentBrandRow,

      REQUIREMENT_VALUE: escapeHtml(requirementValue),
      BUDGET: escapeHtml(budget),
      EXPECTED_VALUE: escapeHtml(expectedValue),
      DECISION_MAKER_FULL: escapeHtml(decisionMakerFull),
      PURCHASE_DECISION_BY: escapeHtml(purchaseDecisionBy),
      OPTIONAL_COMMERCIAL_DETAILS_ROW: optionalCommercialDetailsRow,

      VISIT_TYPE: escapeHtml(visitType),
      PERSON_MET: escapeHtml(personMet),
      OPPORTUNITY_BADGE: opportunityBadge,
      REQUIREMENT_DISCUSSED: escapeHtml(requirementDiscussed),

      NEXT_ACTION_BADGES: nextActionBadges,
      QUOTATION_REQUIRED_BY: escapeHtml(quotationRequiredBy),
      FOLLOW_UP_DATE: escapeHtml(followUpDate),
      NEXT_ACTION_COMMITMENT: escapeHtml(nextActionCommitment),
      OPTIONAL_NEXT_VISIT_TYPE_ROW: optionalNextVisitTypeRow,

      REMARKS_SECTION: remarksSection,
      PHOTOS_SECTION: photosHtml,

      MANAGER_STATUS: escapeHtml(inquiry.managerReview?.status || 'Pending Review')
    };

    let finalHtml = templateHtml;
    for (const [key, val] of Object.entries(replacements)) {
      finalHtml = finalHtml.replaceAll(new RegExp(`{{${key}}}`, 'g'), val);
    }

    // 11. Launch Puppeteer & Generate PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    await page.setContent(finalHtml, { 
      waitUntil: inquiry.photos && inquiry.photos.length > 0 ? 'networkidle2' : 'domcontentloaded', 
      timeout: 25000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7.5pt; color: #64748B; width: 100%; display: flex; justify-content: space-between; padding: 0 12mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <span>POCIKA FIRE &amp; SAFETY PRODUCTS LLP &mdash; Fire &amp; Safety Based Products</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '10mm',
        right: '12mm',
        bottom: '14mm',
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
