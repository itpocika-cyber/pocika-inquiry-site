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

const cleanVal = (val, fallback = '—') => {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim();
  if (!s || /^[-_\s]+$/.test(s)) return fallback;
  return s;
};

const cleanText = (val, fallback = '—') => {
  if (val === undefined || val === null) return fallback;
  let s = String(val).trim();
  if (!s || /^[-_\s]+$/.test(s)) return fallback;
  s = s.replace(/^[-_\s]{2,}/, '').trim();
  return s || fallback;
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
  if (val === undefined || val === null || val === '') return '—';
  const s = String(val).trim();
  if (!s || /^[-_\s]+$/.test(s)) return '—';
  if (typeof val === 'string' && val.includes('₹')) return val;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return s === '0' ? '₹0' : s;
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

export const generateInquiryHtml = async (inquiry) => {
  // 1. Load Template
    const templatePath = path.join(__dirname, '../templates/inquiry-pdf.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    // 2. Load Logo
    const logoDataUri = await getLogoDataUri();

    // 3. Customer & Business Data
    const companyName = cleanVal(inquiry.customer?.companyName);
    const contactPerson = cleanVal(inquiry.customer?.contactPerson);
    const designation = cleanVal(inquiry.customer?.designation);
    const mobile = cleanVal(inquiry.customer?.mobile);
    const email = cleanVal(inquiry.customer?.email);
    const billingAddress = cleanVal(inquiry.customer?.billingAddress);
    const siteLocation = cleanVal(inquiry.customer?.siteLocation);
    const gstNo = cleanVal(inquiry.customer?.gstNo);

    const customerType = inquiry.business?.customerType === 'Retail/Other' && inquiry.business?.customerTypeOther
      ? `Retail/Other (${inquiry.business.customerTypeOther})`
      : cleanVal(inquiry.business?.customerType);

    const industryType = cleanVal(inquiry.business?.industryType);
    const locationGidc = cleanVal(inquiry.business?.locationGidc);

    const facility = inquiry.business?.facility === 'Other' && inquiry.business?.facilityOther
      ? `Other (${inquiry.business.facilityOther})`
      : cleanVal(inquiry.business?.facility);

    const status = cleanVal(inquiry.business?.status);

    // Approx Area / Floors combined
    const areaParts = [];
    if (inquiry.business?.areaSqft) areaParts.push(`${Number(inquiry.business.areaSqft).toLocaleString()} Sq.Ft.`);
    if (inquiry.business?.floors) areaParts.push(`${inquiry.business.floors} Floors`);
    const areaFloorsText = areaParts.length > 0 ? areaParts.join('  /  ') : '—';

    let optionalExpectedDateRow = '';
    const expectedDate = formatDateStr(inquiry.business?.expectedDate);
    if (expectedDate) {
      optionalExpectedDateRow = `
        <div class="field-col-12">
          <div class="f-label">Expected Requirement / Commissioning Date</div>
          <div class="f-val f-val-bold" style="color: #0369a1;">${escapeHtml(expectedDate)}</div>
        </div>
      `;
    }

    // 4. Products & Requirement Details
    const productBadges = (inquiry.products || []).map(p => {
      const name = (p === 'Other' && inquiry.productOther) ? `Other (${inquiry.productOther})` : p;
      return `<span class="chip-badge chip-product">${escapeHtml(name)}</span>`;
    }).join(' ') || '<span style="color: #64748B; font-size: 7.5pt;">No specific products selected</span>';

    const productSpecification = cleanText(inquiry.requirement?.productSpecification);
    const estimatedQuantity = cleanVal(inquiry.requirement?.estimatedQuantity);
    const purchaseReason = cleanVal(inquiry.requirement?.reason);
    const currentBrandVal = cleanVal(inquiry.requirement?.currentBrand);
    const currentPurchase = cleanText(inquiry.requirement?.currentPurchase);

    // 5. Commercial & Sales Qualification
    const requirementValue = formatCurrency(inquiry.commercial?.requirementValue);
    const budget = cleanVal(inquiry.commercial?.budget);
    const expectedValue = formatCurrency(inquiry.commercial?.expectedOrderValue);

    let dmName = cleanVal(inquiry.commercial?.decisionMakerName);
    let dmRole = cleanVal(inquiry.commercial?.decisionRole || inquiry.commercial?.decisionMakerDesignation);
    let decisionMakerFull = '—';
    if (dmName !== '—' && dmRole !== '—') {
      decisionMakerFull = `${dmName} (${dmRole})`;
    } else if (dmName !== '—') {
      decisionMakerFull = dmName;
    } else if (dmRole !== '—') {
      decisionMakerFull = dmRole;
    }

    const purchaseDecisionBy = formatDateStr(inquiry.commercial?.purchaseDecisionBy) || cleanVal(inquiry.commercial?.purchaseDecisionBy);
    const paymentTermsVal = cleanVal(inquiry.commercial?.paymentTerms);

    let optionalCompetitorsRow = '';
    const competitors = cleanVal(inquiry.commercial?.competitors);
    if (competitors !== '—') {
      optionalCompetitorsRow = `
        <div class="field-col-12">
          <div class="f-label">Competitor / Other Brands Considered</div>
          <div class="f-val">${escapeHtml(competitors)}</div>
        </div>
      `;
    }

    // 6. Visit & Opportunity Status
    const visitType = cleanVal(inquiry.visit?.visitType, 'Site Visit');
    const personMet = cleanVal(inquiry.visit?.personMet);

    const opp = inquiry.visit?.opportunity || 'HOT';
    const oppClass = opp.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const opportunityBadge = `<span class="badge-opp badge-opp-${oppClass}">${escapeHtml(opp)}</span>`;

    const requirementDiscussed = cleanText(inquiry.visit?.requirementDiscussed);

    // 7. Next Action / Follow-up
    const nextActions = Array.isArray(inquiry.followUp?.nextAction)
      ? inquiry.followUp.nextAction
      : (inquiry.followUp?.nextAction ? [inquiry.followUp.nextAction] : []);
    const nextActionBadges = nextActions.length > 0
      ? nextActions.map(a => `<span class="chip-badge chip-action">${escapeHtml(a)}</span>`).join(' ')
      : '<span class="chip-badge chip-action">Follow-up</span>';

    const quotationRequiredBy = formatDateStr(inquiry.followUp?.quotationDate) || '—';
    const followUpDate = formatDateStr(inquiry.followUp?.followUpDate) || '—';
    const nextVisitType = cleanVal(inquiry.followUp?.nextVisitType, 'Follow-up');
    const nextActionCommitment = cleanText(inquiry.followUp?.nextActionCommitment);

    // 8. Remarks Card
    let remarksSection = '';
    const rem = cleanText(inquiry.remarks);
    if (rem !== '—') {
      remarksSection = `
        <div class="section-card">
          <div class="section-card-header">6. Visit Remarks &amp; Special Requirements</div>
          <div class="section-card-body">
            <div class="f-box">${escapeHtml(rem)}</div>
          </div>
        </div>
      `;
    }

    // 9. Site Photos Section
    let photosHtml = '';
    if (inquiry.photos && inquiry.photos.length > 0) {
      const photoCards = await Promise.all(inquiry.photos.map(async (p, idx) => {
        const imgUrl = p.optimizedUrls?.preview || p.optimizedUrls?.thumbnail || p.secureUrl || p.previewUrl;
        const caption = cleanVal(p.originalFileName || p.fileName, `Site Photo ${idx + 1}`);
        const dataUri = await resolveImageToDataUri(imgUrl);

        if (dataUri) {
          return `
            <div class="photo-card">
              <div class="photo-img-wrap">
                <div class="photo-tag">Photo ${idx + 1}</div>
                <img src="${dataUri}" alt="Site Photo ${idx + 1}" />
              </div>
              <div class="photo-caption">${escapeHtml(caption)}</div>
            </div>
          `;
        }

        return `
          <div class="photo-card">
            <div class="photo-img-wrap">
              <div class="photo-tag">Photo ${idx + 1}</div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
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
          <div class="section-card-header">Site Photos (${inquiry.photos.length} Captured)</div>
          <div class="section-card-body">
            <div class="photos-grid">
              ${photoCards.join('')}
            </div>
          </div>
        </div>
      `;
    }

    // Manager review extra info
    let managerReviewExtra = '';
    if (inquiry.managerReview?.reviewedBy) {
      managerReviewExtra += ` | Reviewed by: ${escapeHtml(inquiry.managerReview.reviewedBy)}`;
    }
    if (inquiry.managerReview?.remarks) {
      managerReviewExtra += ` — "${escapeHtml(inquiry.managerReview.remarks)}"`;
    }

    // 10. Replacements Dictionary
    const replacements = {
      LOGO_DATA_URI: logoDataUri,
      INQUIRY_NUMBER: escapeHtml(inquiry.inquiryNumber),
      DATE: escapeHtml(formatDateStr(inquiry.date)),
      SALES_PERSON: escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative'),

      COMPANY_NAME: escapeHtml(companyName),
      CUSTOMER_TYPE_HEADER: customerType !== '—' ? escapeHtml(customerType) : '',
      CONTACT_PERSON: escapeHtml(contactPerson),
      DESIGNATION: escapeHtml(designation),
      MOBILE: escapeHtml(mobile),
      EMAIL: escapeHtml(email),
      BILLING_ADDRESS: escapeHtml(billingAddress),
      SITE_LOCATION: escapeHtml(siteLocation),
      GST_NO: escapeHtml(gstNo),
      CUSTOMER_TYPE: escapeHtml(customerType),
      INDUSTRY_TYPE: escapeHtml(industryType),
      LOCATION_GIDC: escapeHtml(locationGidc),
      FACILITY: escapeHtml(facility),
      STATUS: escapeHtml(status),
      AREA_FLOORS: escapeHtml(areaFloorsText),
      OPTIONAL_EXPECTED_DATE_ROW: optionalExpectedDateRow,

      PRODUCT_BADGES: productBadges,
      PRODUCT_SPECIFICATION: escapeHtml(productSpecification),
      ESTIMATED_QUANTITY: escapeHtml(estimatedQuantity),
      PURCHASE_REASON: escapeHtml(purchaseReason),
      CURRENT_BRAND_VAL: escapeHtml(currentBrandVal),
      CURRENT_PURCHASE: escapeHtml(currentPurchase),

      REQUIREMENT_VALUE: escapeHtml(requirementValue),
      BUDGET: escapeHtml(budget),
      EXPECTED_VALUE: escapeHtml(expectedValue),
      DECISION_MAKER_FULL: escapeHtml(decisionMakerFull),
      PURCHASE_DECISION_BY: escapeHtml(purchaseDecisionBy),
      PAYMENT_TERMS_VAL: escapeHtml(paymentTermsVal),
      OPTIONAL_COMPETITORS_ROW: optionalCompetitorsRow,

      VISIT_TYPE: escapeHtml(visitType),
      PERSON_MET: escapeHtml(personMet),
      OPPORTUNITY_BADGE: opportunityBadge,
      REQUIREMENT_DISCUSSED: escapeHtml(requirementDiscussed),

      NEXT_ACTION_BADGES: nextActionBadges,
      QUOTATION_REQUIRED_BY: escapeHtml(quotationRequiredBy),
      FOLLOW_UP_DATE: escapeHtml(followUpDate),
      NEXT_VISIT_TYPE: escapeHtml(nextVisitType),
      NEXT_ACTION_COMMITMENT: escapeHtml(nextActionCommitment),

      REMARKS_SECTION: remarksSection,
      PHOTOS_SECTION: photosHtml,

      MANAGER_STATUS: escapeHtml(inquiry.managerReview?.status || 'Pending Review'),
      MANAGER_REVIEW_EXTRA: managerReviewExtra
    };

    let finalHtml = templateHtml;
    for (const [key, val] of Object.entries(replacements)) {
      finalHtml = finalHtml.replaceAll(new RegExp(`{{${key}}}`, 'g'), val);
    }
    return finalHtml;
};

export const generateInquiryPdf = async (inquiry) => {
  let browser = null;
  try {
    const finalHtml = await generateInquiryHtml(inquiry);

    // 11. Launch Puppeteer & Generate PDF with full container sandbox arguments
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    await page.setContent(finalHtml, { 
      waitUntil: 'load', 
      timeout: 15000 
    });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 7pt; color: #64748B; width: 100%; display: flex; justify-content: space-between; padding: 0 12mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <span>POCIKA FIRE &amp; SAFETY PRODUCTS LLP &mdash; Confidential Document</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '8mm',
        right: '12mm',
        bottom: '10mm',
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
