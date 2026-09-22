import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import fsSync from 'fs';
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

const hasVal = (val) => {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  if (!s || /^[-_\s]+$/.test(s)) return false;
  return true;
};

const cleanVal = (val, fallback = '') => {
  if (!hasVal(val)) return fallback;
  return String(val).trim();
};

const cleanText = (val, fallback = '') => {
  if (!hasVal(val)) return fallback;
  let s = String(val).trim();
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
  if (!hasVal(val)) return '';
  const s = String(val).trim();
  if (typeof val === 'string' && val.includes('₹')) return val;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return s === '0' ? '₹0' : s;
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Locate Chrome / Chromium executable in the current environment
 */
export function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fsSync.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of candidatePaths) {
    if (p && fsSync.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

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

  // 3. Remote URL (Cloudinary / CDN)
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
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

/**
 * Dynamic HTML Generator for Inquiry PDF
 * - Strictly filters empty sections
 * - Sequentially renumbers active sections (1, 2, 3...) with NO GAPS
 * - Only renders fields with non-empty data inside each section
 */
export const generateInquiryHtml = async (inquiry) => {
  const templatePath = path.join(__dirname, '../templates/inquiry-pdf.html');
  let templateHtml = await fs.readFile(templatePath, 'utf-8');
  const logoDataUri = await getLogoDataUri();

  // ----------------------------------------------------
  // SECTION DEFINITIONS & FIELD CHECKS
  // ----------------------------------------------------
  const candidateSections = [];

  // ==========================================
  // Section: Customer & Business Details
  // ==========================================
  {
    const fields = [];

    const companyName = cleanVal(inquiry.customer?.companyName);
    if (companyName) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Company / Client Name</div>
          <div class="f-val f-val-company">${escapeHtml(companyName)}</div>
        </div>
      `);
    }

    const contactPerson = cleanVal(inquiry.customer?.contactPerson);
    if (contactPerson) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Contact Person</div>
          <div class="f-val f-val-bold">${escapeHtml(contactPerson)}</div>
        </div>
      `);
    }

    const designation = cleanVal(inquiry.customer?.designation);
    if (designation) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Designation</div>
          <div class="f-val">${escapeHtml(designation)}</div>
        </div>
      `);
    }

    const mobile = cleanVal(inquiry.customer?.mobile);
    if (mobile) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Mobile No.</div>
          <div class="f-val f-val-bold">${escapeHtml(mobile)}</div>
        </div>
      `);
    }

    const email = cleanVal(inquiry.customer?.email);
    if (email) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Email Address</div>
          <div class="f-val">${escapeHtml(email)}</div>
        </div>
      `);
    }

    const billingAddress = cleanVal(inquiry.customer?.billingAddress);
    if (billingAddress) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Company / Billing Address</div>
          <div class="f-val">${escapeHtml(billingAddress)}</div>
        </div>
      `);
    }

    const siteLocation = cleanVal(inquiry.customer?.siteLocation);
    if (siteLocation) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Site / Visit Location</div>
          <div class="f-val">${escapeHtml(siteLocation)}</div>
        </div>
      `);
    }

    const gstNo = cleanVal(inquiry.customer?.gstNo);
    if (gstNo) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">GST No.</div>
          <div class="f-val">${escapeHtml(gstNo)}</div>
        </div>
      `);
    }

    const customerType = inquiry.business?.customerType === 'Retail/Other' && inquiry.business?.customerTypeOther
      ? `Retail/Other (${inquiry.business.customerTypeOther})`
      : cleanVal(inquiry.business?.customerType);
    if (customerType) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Customer Type</div>
          <div class="f-val">${escapeHtml(customerType)}</div>
        </div>
      `);
    }

    const industryType = cleanVal(inquiry.business?.industryType);
    if (industryType) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Industry / Business Type</div>
          <div class="f-val">${escapeHtml(industryType)}</div>
        </div>
      `);
    }

    const facility = inquiry.business?.facility === 'Other' && inquiry.business?.facilityOther
      ? `Other (${inquiry.business.facilityOther})`
      : cleanVal(inquiry.business?.facility);
    if (facility) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Facility Type</div>
          <div class="f-val">${escapeHtml(facility)}</div>
        </div>
      `);
    }

    const locationGidc = cleanVal(inquiry.business?.locationGidc);
    if (locationGidc) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Location / GIDC</div>
          <div class="f-val">${escapeHtml(locationGidc)}</div>
        </div>
      `);
    }

    const status = cleanVal(inquiry.business?.status);
    if (status) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Site Status</div>
          <div class="f-val">${escapeHtml(status)}</div>
        </div>
      `);
    }

    const areaParts = [];
    if (inquiry.business?.areaSqft) areaParts.push(`${Number(inquiry.business.areaSqft).toLocaleString()} Sq.Ft.`);
    if (inquiry.business?.floors) areaParts.push(`${inquiry.business.floors} Floors`);
    if (areaParts.length > 0) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Approx. Area / Floors</div>
          <div class="f-val">${escapeHtml(areaParts.join('  /  '))}</div>
        </div>
      `);
    }

    const expectedDate = formatDateStr(inquiry.business?.expectedDate);
    if (expectedDate) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Expected Requirement / Commissioning Date</div>
          <div class="f-val f-val-bold" style="color: #0369a1;">${escapeHtml(expectedDate)}</div>
        </div>
      `);
    }

    if (fields.length > 0) {
      candidateSections.push({
        title: 'Customer & Business Details',
        headerRight: customerType ? `<span style="font-weight: 600; color: #475569; font-size: 7.5pt;">${escapeHtml(customerType)}</span>` : '',
        fieldsHtml: fields.join('')
      });
    }
  }

  // ==========================================
  // Section: Product / Requirement Details
  // ==========================================
  {
    const fields = [];

    if (Array.isArray(inquiry.products) && inquiry.products.length > 0) {
      const badges = inquiry.products.map(p => {
        const name = (p === 'Other' && inquiry.productOther) ? `Other (${inquiry.productOther})` : p;
        return `<span class="chip-badge chip-product">${escapeHtml(name)}</span>`;
      }).join(' ');
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Products Selected</div>
          <div class="product-badges-wrap">${badges}</div>
        </div>
      `);
    }

    const productSpecification = cleanText(inquiry.requirement?.productSpecification);
    if (productSpecification) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Required Product / Specification / Size</div>
          <div class="f-box">${escapeHtml(productSpecification)}</div>
        </div>
      `);
    }

    const estimatedQuantity = cleanVal(inquiry.requirement?.estimatedQuantity);
    if (estimatedQuantity) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Estimated Quantity</div>
          <div class="f-val f-val-bold">${escapeHtml(estimatedQuantity)}</div>
        </div>
      `);
    }

    const purchaseReason = cleanVal(inquiry.requirement?.reason);
    if (purchaseReason) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Purchase Reason</div>
          <div class="f-val">${escapeHtml(purchaseReason)}</div>
        </div>
      `);
    }

    const currentBrandVal = cleanVal(inquiry.requirement?.currentBrand);
    if (currentBrandVal) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Current Brand Used</div>
          <div class="f-val">${escapeHtml(currentBrandVal)}</div>
        </div>
      `);
    }

    const currentPurchase = cleanText(inquiry.requirement?.currentPurchase);
    if (currentPurchase) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Current Purchase / Existing Setup</div>
          <div class="f-box">${escapeHtml(currentPurchase)}</div>
        </div>
      `);
    }

    if (fields.length > 0) {
      candidateSections.push({
        title: 'Product / Requirement Details',
        headerRight: '',
        fieldsHtml: fields.join('')
      });
    }
  }

  // ==========================================
  // Section: Commercial / Sales Qualification
  // ==========================================
  {
    const fields = [];

    const reqVal = formatCurrency(inquiry.commercial?.requirementValue);
    if (reqVal) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Approx. Requirement Value</div>
          <div class="f-val f-val-currency">${escapeHtml(reqVal)}</div>
        </div>
      `);
    }

    const expVal = formatCurrency(inquiry.commercial?.expectedOrderValue);
    if (expVal) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Expected Order Value</div>
          <div class="f-val f-val-currency">${escapeHtml(expVal)}</div>
        </div>
      `);
    }

    const budget = cleanVal(inquiry.commercial?.budget);
    if (budget) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Budget Status</div>
          <div class="f-val">${escapeHtml(budget)}</div>
        </div>
      `);
    }

    const paymentTerms = cleanVal(inquiry.commercial?.paymentTerms);
    if (paymentTerms) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Payment Terms</div>
          <div class="f-val">${escapeHtml(paymentTerms)}</div>
        </div>
      `);
    }

    let dmName = cleanVal(inquiry.commercial?.decisionMakerName);
    let dmRole = cleanVal(inquiry.commercial?.decisionRole || inquiry.commercial?.decisionMakerDesignation);
    if (dmName && dmRole) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Decision Maker &amp; Role</div>
          <div class="f-val">${escapeHtml(dmName)} (${escapeHtml(dmRole)})</div>
        </div>
      `);
    } else if (dmName) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Decision Maker</div>
          <div class="f-val">${escapeHtml(dmName)}</div>
        </div>
      `);
    } else if (dmRole) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Decision Maker Role</div>
          <div class="f-val">${escapeHtml(dmRole)}</div>
        </div>
      `);
    }

    const purchaseDecisionBy = formatDateStr(inquiry.commercial?.purchaseDecisionBy) || cleanVal(inquiry.commercial?.purchaseDecisionBy);
    if (purchaseDecisionBy) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Purchase Decision Expected By</div>
          <div class="f-val">${escapeHtml(purchaseDecisionBy)}</div>
        </div>
      `);
    }

    const competitors = cleanVal(inquiry.commercial?.competitors);
    if (competitors) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Competitor / Other Brands Considered</div>
          <div class="f-val">${escapeHtml(competitors)}</div>
        </div>
      `);
    }

    if (fields.length > 0) {
      candidateSections.push({
        title: 'Commercial / Sales Qualification',
        headerRight: '',
        fieldsHtml: fields.join('')
      });
    }
  }

  // ==========================================
  // Section: Visit & Opportunity Status
  // ==========================================
  {
    const fields = [];

    const visitType = cleanVal(inquiry.visit?.visitType);
    if (visitType) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Visit Type</div>
          <div class="f-val">${escapeHtml(visitType)}</div>
        </div>
      `);
    }

    const personMet = cleanVal(inquiry.visit?.personMet);
    if (personMet) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Person Met</div>
          <div class="f-val">${escapeHtml(personMet)}</div>
        </div>
      `);
    }

    const opp = cleanVal(inquiry.visit?.opportunity);
    if (opp) {
      const oppClass = opp.toLowerCase().replace(/[^a-z0-9]/g, '-');
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Opportunity Rating</div>
          <div><span class="badge-opp badge-opp-${oppClass}">${escapeHtml(opp)}</span></div>
        </div>
      `);
    }

    const requirementDiscussed = cleanText(inquiry.visit?.requirementDiscussed);
    if (requirementDiscussed) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Key Discussion &amp; Requirements Identified</div>
          <div class="f-box">${escapeHtml(requirementDiscussed)}</div>
        </div>
      `);
    }

    if (fields.length > 0) {
      candidateSections.push({
        title: 'Visit & Opportunity Status',
        headerRight: '',
        fieldsHtml: fields.join('')
      });
    }
  }

  // ==========================================
  // Section: Next Action & Follow-up Plan
  // ==========================================
  {
    const fields = [];

    const nextActions = Array.isArray(inquiry.followUp?.nextAction)
      ? inquiry.followUp.nextAction.filter(Boolean)
      : (inquiry.followUp?.nextAction ? [inquiry.followUp.nextAction] : []);
    if (nextActions.length > 0) {
      const badges = nextActions.map(a => `<span class="chip-badge chip-action">${escapeHtml(a)}</span>`).join(' ');
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Requested Next Actions</div>
          <div class="product-badges-wrap">${badges}</div>
        </div>
      `);
    }

    const quotationRequiredBy = formatDateStr(inquiry.followUp?.quotationDate);
    if (quotationRequiredBy) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Quotation Required By</div>
          <div class="f-val">${escapeHtml(quotationRequiredBy)}</div>
        </div>
      `);
    }

    const followUpDate = formatDateStr(inquiry.followUp?.followUpDate);
    if (followUpDate) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Next Follow-up Date</div>
          <div class="f-val f-val-bold" style="color: #0284c7;">${escapeHtml(followUpDate)}</div>
        </div>
      `);
    }

    const nextVisitType = cleanVal(inquiry.followUp?.nextVisitType);
    if (nextVisitType) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Next Interaction Type</div>
          <div class="f-val">${escapeHtml(nextVisitType)}</div>
        </div>
      `);
    }

    const nextActionCommitment = cleanText(inquiry.followUp?.nextActionCommitment);
    if (nextActionCommitment) {
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Next Action Commitment / Notes</div>
          <div class="f-box">${escapeHtml(nextActionCommitment)}</div>
        </div>
      `);
    }

    if (fields.length > 0) {
      candidateSections.push({
        title: 'Next Action & Follow-up Plan',
        headerRight: '',
        fieldsHtml: fields.join('')
      });
    }
  }

  // ==========================================
  // Section: Visit Remarks & Special Requirements
  // ==========================================
  {
    const rem = cleanText(inquiry.remarks);
    if (rem) {
      candidateSections.push({
        title: 'Visit Remarks & Special Requirements',
        headerRight: '',
        fieldsHtml: `
          <div class="field-col-12">
            <div class="f-box">${escapeHtml(rem)}</div>
          </div>
        `
      });
    }
  }

  // ----------------------------------------------------
  // SEQUENTIAL RENUMBERING (NO GAPS: 1, 2, 3...)
  // ----------------------------------------------------
  const sectionsHtml = candidateSections.map((sec, idx) => {
    const sectionNum = idx + 1;
    return `
      <div class="section-card">
        <div class="section-card-header">
          <span>${sectionNum}. ${escapeHtml(sec.title)}</span>
          ${sec.headerRight || ''}
        </div>
        <div class="section-card-body">
          <div class="field-grid">
            ${sec.fieldsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  // ==========================================
  // Section: Site Photos (Unnumbered or Enriched)
  // ==========================================
  let photosHtml = '';
  if (Array.isArray(inquiry.photos) && inquiry.photos.length > 0) {
    const photoCards = await Promise.all(inquiry.photos.map(async (p, idx) => {
      const imgUrl = p.optimizedUrls?.pdf || p.optimizedUrls?.preview || p.secureUrl || p.url || p.previewUrl;
      const caption = cleanVal(p.originalFileName || p.fileName || p.caption, `Site Photo ${idx + 1}`);
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
      <div class="section-card photo-section-card">
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

  const replacements = {
    LOGO_DATA_URI: logoDataUri,
    INQUIRY_NUMBER: escapeHtml(inquiry.inquiryNumber || 'Draft'),
    DATE: escapeHtml(formatDateStr(inquiry.date)),
    SALES_PERSON: escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative'),
    SECTIONS_CONTENT: sectionsHtml,
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

/**
 * Generate PDF buffer using Puppeteer
 */
export const generateInquiryPdf = async (inquiry) => {
  let browser = null;
  try {
    const finalHtml = await generateInquiryHtml(inquiry);
    const chromePath = findChromeExecutable();

    const launchOptions = {
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
    };

    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    await page.setContent(finalHtml, { 
      waitUntil: 'load', 
      timeout: 20000 
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

    return Buffer.from(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF document: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('Error closing puppeteer:', e));
    }
  }
};
