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
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
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
    const gstNo = cleanVal(inquiry.customer?.gstNo);
    if (companyName) {
      fields.push(`
        <div class="field-col-12 client-lead-row">
          <div class="client-name">${escapeHtml(companyName)}</div>
          ${gstNo ? `<div class="client-gst">GSTIN: <strong>${escapeHtml(gstNo)}</strong></div>` : ''}
        </div>
      `);
    }

    const contactPerson = cleanVal(inquiry.customer?.contactPerson);
    const designation = cleanVal(inquiry.customer?.designation);
    const mobile = cleanVal(inquiry.customer?.mobile);
    const email = cleanVal(inquiry.customer?.email);

    if (contactPerson || mobile || email) {
      fields.push(`
        <div class="field-col-12 sub-header-bar">
          <span>Primary Contact Information</span>
        </div>
      `);
      if (contactPerson) {
        fields.push(`
          <div class="field-col-6">
            <div class="f-label">Contact Person</div>
            <div class="f-val f-val-contact">${escapeHtml(contactPerson)}${designation ? ` <span class="f-designation">(${escapeHtml(designation)})</span>` : ''}</div>
          </div>
        `);
      }
      if (mobile) {
        fields.push(`
          <div class="field-col-3">
            <div class="f-label">Mobile Number</div>
            <div class="f-val f-val-bold">${escapeHtml(mobile)}</div>
          </div>
        `);
      }
      if (email) {
        fields.push(`
          <div class="field-col-3">
            <div class="f-label">Email Address</div>
            <div class="f-val">${escapeHtml(email)}</div>
          </div>
        `);
      }
    }

    const siteLocation = cleanVal(inquiry.customer?.siteLocation);
    const billingAddress = cleanVal(inquiry.customer?.billingAddress);
    const customerType = inquiry.business?.customerType === 'Retail/Other' && inquiry.business?.customerTypeOther
      ? `Retail/Other (${inquiry.business.customerTypeOther})`
      : cleanVal(inquiry.business?.customerType);
    const facility = inquiry.business?.facility === 'Other' && inquiry.business?.facilityOther
      ? `Other (${inquiry.business.facilityOther})`
      : cleanVal(inquiry.business?.facility);
    const locationGidc = cleanVal(inquiry.business?.locationGidc);
    const status = cleanVal(inquiry.business?.status);
    const expectedDate = formatDateStr(inquiry.business?.expectedDate);

    fields.push(`
      <div class="field-col-12 sub-header-bar" style="margin-top: 5px;">
        <span>Site Location &amp; Project Profile</span>
      </div>
    `);

    if (siteLocation) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Site / Visit Location</div>
          <div class="f-val f-val-bold">${escapeHtml(siteLocation)}</div>
        </div>
      `);
    }

    if (billingAddress) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Company / Billing Address</div>
          <div class="f-val">${escapeHtml(billingAddress)}</div>
        </div>
      `);
    }

    if (customerType) {
      fields.push(`
        <div class="field-col-3">
          <div class="f-label">Customer Type</div>
          <div class="f-val">${escapeHtml(customerType)}</div>
        </div>
      `);
    }

    if (facility) {
      fields.push(`
        <div class="field-col-3">
          <div class="f-label">Facility Type</div>
          <div class="f-val">${escapeHtml(facility)}</div>
        </div>
      `);
    }

    if (locationGidc) {
      fields.push(`
        <div class="field-col-3">
          <div class="f-label">Location / GIDC</div>
          <div class="f-val">${escapeHtml(locationGidc)}</div>
        </div>
      `);
    }

    if (status) {
      fields.push(`
        <div class="field-col-3">
          <div class="f-label">Site Status</div>
          <div class="f-val"><span class="badge-status-pill">${escapeHtml(status)}</span></div>
        </div>
      `);
    }

    if (expectedDate) {
      fields.push(`
        <div class="field-col-3">
          <div class="f-label">Expected Requirement Date</div>
          <div class="f-val f-val-date">${escapeHtml(expectedDate)}</div>
        </div>
      `);
    }

    if (fields.length > 0) {
      candidateSections.push({
        title: 'Customer & Business Details',
        headerRight: '',
        fieldsHtml: fields.join('')
      });
    }
  }

  // ==========================================
  // Section: Product / Requirement Details
  // ==========================================
  {
    const fields = [];

    const products = Array.isArray(inquiry.products) ? inquiry.products.filter(Boolean) : [];
    const estimatedQuantity = cleanVal(inquiry.requirement?.estimatedQuantity);
    const renewalDueDate = formatDateStr(inquiry.requirement?.renewalDueDate);

    if (products.length > 0 || estimatedQuantity || renewalDueDate) {
      fields.push(`
        <div class="field-col-12 sub-header-bar">
          <span>Equipment &amp; Product Scope</span>
        </div>
      `);

      if (products.length > 0) {
        const badges = products.map(p => {
          const name = (p === 'Other' && inquiry.productOther) ? `Other (${inquiry.productOther})` : p;
          return `<span class="chip-badge chip-product">${escapeHtml(name)}</span>`;
        }).join(' ');
        fields.push(`
          <div class="field-col-12">
            <div class="f-label">Products Selected For Quotation</div>
            <div class="product-badges-wrap">${badges}</div>
          </div>
        `);
      }

      if (estimatedQuantity) {
        fields.push(`
          <div class="field-col-6">
            <div class="f-label">Estimated Quantity Required</div>
            <div class="f-val f-val-bold">${escapeHtml(estimatedQuantity)} Units</div>
          </div>
        `);
      }

      if (renewalDueDate) {
        fields.push(`
          <div class="field-col-6">
            <div class="f-label">AMC / Refilling Due Date</div>
            <div class="f-val f-val-date">${escapeHtml(renewalDueDate)}</div>
          </div>
        `);
      }
    }

    const purchaseReason = cleanVal(inquiry.requirement?.reason);
    const currentBrandVal = cleanVal(inquiry.requirement?.currentBrand);
    const productSpecification = cleanText(inquiry.requirement?.productSpecification);
    const currentPurchase = cleanText(inquiry.requirement?.currentPurchase);

    if (purchaseReason || currentBrandVal || productSpecification || currentPurchase) {
      fields.push(`
        <div class="field-col-12 sub-header-bar" style="margin-top: 5px;">
          <span>Technical Specifications &amp; Existing Setup</span>
        </div>
      `);

      if (purchaseReason) {
        fields.push(`
          <div class="field-col-6">
            <div class="f-label">Purchase Reason</div>
            <div class="f-val">${escapeHtml(purchaseReason)}</div>
          </div>
        `);
      }

      if (currentBrandVal) {
        fields.push(`
          <div class="field-col-6">
            <div class="f-label">Current Brand In Use</div>
            <div class="f-val">${escapeHtml(currentBrandVal)}</div>
          </div>
        `);
      }

      if (productSpecification) {
        fields.push(`
          <div class="field-col-12">
            <div class="f-label">Requirement / Technical Specifications</div>
            <div class="f-box">${escapeHtml(productSpecification)}</div>
          </div>
        `);
      }

      if (currentPurchase) {
        fields.push(`
          <div class="field-col-12">
            <div class="f-label">Current Purchase &amp; Existing Setup Notes</div>
            <div class="f-box">${escapeHtml(currentPurchase)}</div>
          </div>
        `);
      }
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
    const expVal = formatCurrency(inquiry.commercial?.expectedOrderValue);
    const budget = cleanVal(inquiry.commercial?.budget);
    const paymentTerms = cleanVal(inquiry.commercial?.paymentTerms);

    fields.push(`
      <div class="field-col-12 sub-header-bar">
        <span>Order Valuation &amp; Commercial Terms</span>
      </div>
    `);

    if (reqVal) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Approx. Requirement Value</div>
          <div class="f-val f-val-currency">${escapeHtml(reqVal)}</div>
        </div>
      `);
    }

    if (expVal) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Expected Order Value</div>
          <div class="f-val f-val-currency">${escapeHtml(expVal)}</div>
        </div>
      `);
    }

    if (budget) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Budget Status</div>
          <div class="f-val">${escapeHtml(budget)}</div>
        </div>
      `);
    }

    if (paymentTerms) {
      fields.push(`
        <div class="field-col-6">
          <div class="f-label">Payment Terms Expected</div>
          <div class="f-val">${escapeHtml(paymentTerms)}</div>
        </div>
      `);
    }

    let dmName = cleanVal(inquiry.commercial?.decisionMakerName);
    let dmRole = cleanVal(inquiry.commercial?.decisionRole || inquiry.commercial?.decisionMakerDesignation);
    const purchaseDecisionBy = formatDateStr(inquiry.commercial?.purchaseDecisionBy) || cleanVal(inquiry.commercial?.purchaseDecisionBy);
    const competitors = cleanVal(inquiry.commercial?.competitors);

    if (dmName || dmRole || purchaseDecisionBy || competitors) {
      fields.push(`
        <div class="field-col-12 sub-header-bar" style="margin-top: 5px;">
          <span>Decision Authority &amp; Market Intelligence</span>
        </div>
      `);

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

      if (purchaseDecisionBy) {
        fields.push(`
          <div class="field-col-6">
            <div class="f-label">Purchase Decision Expected By</div>
            <div class="f-val">${escapeHtml(purchaseDecisionBy)}</div>
          </div>
        `);
      }

      if (competitors) {
        fields.push(`
          <div class="field-col-12">
            <div class="f-label">Competitor / Other Brands Considered</div>
            <div class="f-val">${escapeHtml(competitors)}</div>
          </div>
        `);
      }
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
    const personMet = cleanVal(inquiry.visit?.personMet);
    const opp = cleanVal(inquiry.visit?.opportunity);

    fields.push(`
      <div class="field-col-12 sub-header-bar">
        <span>Site Visit Overview</span>
      </div>
    `);

    if (visitType) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Visit Type</div>
          <div class="f-val">${escapeHtml(visitType)}</div>
        </div>
      `);
    }

    if (personMet) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Person Met at Site</div>
          <div class="f-val f-val-bold">${escapeHtml(personMet)}</div>
        </div>
      `);
    }

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
        <div class="field-col-12 sub-header-bar" style="margin-top: 5px;">
          <span>Key Discussion &amp; Site Observations</span>
        </div>
        <div class="field-col-12">
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
    const quotationRequiredBy = formatDateStr(inquiry.followUp?.quotationDate);
    const followUpDate = formatDateStr(inquiry.followUp?.followUpDate);
    const nextVisitType = cleanVal(inquiry.followUp?.nextVisitType);

    fields.push(`
      <div class="field-col-12 sub-header-bar">
        <span>Action Commitments &amp; Schedules</span>
      </div>
    `);

    if (nextActions.length > 0) {
      const badges = nextActions.map(a => `<span class="chip-badge chip-action">${escapeHtml(a)}</span>`).join(' ');
      fields.push(`
        <div class="field-col-12">
          <div class="f-label">Requested Next Actions</div>
          <div class="product-badges-wrap">${badges}</div>
        </div>
      `);
    }

    if (quotationRequiredBy) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Quotation Required By</div>
          <div class="f-val f-val-bold">${escapeHtml(quotationRequiredBy)}</div>
        </div>
      `);
    }

    if (followUpDate) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Next Planned Follow-Up</div>
          <div class="f-val f-val-date">${escapeHtml(followUpDate)}</div>
        </div>
      `);
    }

    if (nextVisitType) {
      fields.push(`
        <div class="field-col-4">
          <div class="f-label">Planned Interaction Mode</div>
          <div class="f-val">${escapeHtml(nextVisitType)}</div>
        </div>
      `);
    }

    const nextActionCommitment = cleanText(inquiry.followUp?.nextActionCommitment);
    if (nextActionCommitment) {
      fields.push(`
        <div class="field-col-12 sub-header-bar" style="margin-top: 5px;">
          <span>Action Commitment Notes</span>
        </div>
        <div class="field-col-12">
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
          <div class="field-col-12 sub-header-bar">
            <span>Special Instructions &amp; Site Observations</span>
          </div>
          <div class="field-col-12">
            <div class="f-box">${escapeHtml(rem)}</div>
          </div>
        `
      });
    }
  }

  // ==========================================
  // Section: Site Photos (Continuous Document Section)
  // ==========================================
  if (Array.isArray(inquiry.photos) && inquiry.photos.length > 0) {
    const cleanPhotoCaption = (p, idx) => {
      const cap = cleanVal(p.caption);
      if (cap && !/^(whatsapp\s*image|img_|photo_|dsc_|\d{8}|\d{10})/i.test(cap) && !/\.(jpe?g|png|webp)$/i.test(cap)) {
        return cap;
      }
      return `Site Photo #${String(idx + 1).padStart(2, '0')}`;
    };

    const photoCards = await Promise.all(inquiry.photos.map(async (p, idx) => {
      const imgUrl = p.optimizedUrls?.pdf || p.optimizedUrls?.preview || p.secureUrl || p.url || p.previewUrl;
      const caption = cleanPhotoCaption(p, idx);
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

    candidateSections.push({
      title: 'Site Photos',
      headerRight: `<span class="badge-status-pill">${inquiry.photos.length} Captured Photos</span>`,
      fieldsHtml: `
        <div class="field-col-12" style="padding: 0;">
          <div class="photos-grid">
            ${photoCards.join('')}
          </div>
        </div>
      `
    });
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

  // Manager review extra info
  let managerReviewExtra = '';
  if (inquiry.managerReview?.reviewedBy) {
    managerReviewExtra += ` | Reviewed by: ${escapeHtml(inquiry.managerReview.reviewedBy)}`;
  }
  if (inquiry.managerReview?.remarks) {
    managerReviewExtra += ` — "${escapeHtml(inquiry.managerReview.remarks)}"`;
  }

  // Deal Status Badge
  const dealStatus = inquiry.followUp?.dealStatus || 'Pending';
  const dealStatusClass = dealStatus === 'Won' ? 'won' : dealStatus === 'Lost' ? 'lost' : 'pending';
  const dealStatusLabel = dealStatus === 'Won' ? '✓ Deal Won' : dealStatus === 'Lost' ? '✗ Deal Lost' : '⏳ Deal Pending';
  const dealStatusBadge = `<span class="deal-badge deal-badge-${dealStatusClass}">${dealStatusLabel}</span>`;

  // Opportunity Badge
  const opp = cleanVal(inquiry.visit?.opportunity);
  let oppBadge = '';
  if (opp) {
    const oppClass = opp.toLowerCase().replace(/[^a-z0-9]/g, '-');
    oppBadge = `<span class="badge-opp badge-opp-${oppClass}">${escapeHtml(opp)}</span>`;
  }

  const replacements = {
    LOGO_DATA_URI: logoDataUri,
    INQUIRY_NUMBER: escapeHtml(inquiry.inquiryNumber || 'Draft'),
    DATE: escapeHtml(formatDateStr(inquiry.date)),
    SALES_PERSON: escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative'),
    DEAL_STATUS_BADGE: dealStatusBadge,
    OPPORTUNITY_BADGE: oppBadge,
    SECTIONS_CONTENT: sectionsHtml,
    PHOTOS_SECTION: '',
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
 * Generate PDF buffer using Puppeteer with repeated identical header
 */
export const generateInquiryPdf = async (inquiry) => {
  let browser = null;
  try {
    const finalHtml = await generateInquiryHtml(inquiry);
    const logoDataUri = await getLogoDataUri();
    const chromePath = findChromeExecutable();

    const inqNum = escapeHtml(inquiry.inquiryNumber || 'Draft');
    const inqDate = escapeHtml(formatDateStr(inquiry.date));
    const inqSales = escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative');

    const headerHtml = `
      <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; width: 100%; padding: 0 10mm; box-sizing: border-box; font-size: 8pt;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${logoDataUri}" style="height: 28px; width: auto; max-width: 100px; object-fit: contain; display: block;" />
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 10.5pt; font-weight: 800; color: #A91D22; letter-spacing: 0.2px; line-height: 1.15;">POCIKA FIRE &amp; SAFETY PRODUCTS LLP</span>
              <span style="font-size: 6.8pt; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px;">Inquiry &amp; Site Visit Report</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; padding: 1.5px 7px; font-size: 7.5pt; color: #334155;">
              Inquiry No: <strong style="color: #0F172A; font-weight: 800;">${inqNum}</strong>
            </div>
            <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
              Date: <strong style="color: #1E293B;">${inqDate}</strong> &nbsp;|&nbsp; Sales Person: <strong style="color: #1E293B;">${inqSales}</strong>
            </div>
          </div>
        </div>
        <div style="border-bottom: 2px solid #A91D22; width: 100%; margin-top: 2px;"></div>
      </div>
    `;

    const footerHtml = `
      <div style="font-size: 7pt; color: #64748B; width: 100%; display: flex; justify-content: space-between; padding: 0 10mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <span>POCIKA FIRE &amp; SAFETY PRODUCTS LLP &mdash; Confidential Document</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;

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
      headerTemplate: headerHtml,
      footerTemplate: footerHtml,
      margin: {
        top: '22mm',
        bottom: '11mm',
        left: '10mm',
        right: '10mm'
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
