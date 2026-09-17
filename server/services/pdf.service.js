import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null || unsafe === '') return '-';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatDateStr = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `₹ ${num.toLocaleString('en-IN')}`;
};

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

    // 2. Format Products String
    let productsList = (inquiry.products || []).slice();
    if (productsList.includes('Other') && inquiry.productOther) {
      productsList = productsList.map(p => p === 'Other' ? `Other (${inquiry.productOther})` : p);
    }
    const productsStr = productsList.join(', ') || '-';

    // 3. Customer Type & Facility formatting
    const customerType = inquiry.business?.customerType === 'Retail/Other' && inquiry.business?.customerTypeOther
      ? `Retail/Other (${inquiry.business.customerTypeOther})`
      : (inquiry.business?.customerType || '-');

    const facility = inquiry.business?.facility === 'Other' && inquiry.business?.facilityOther
      ? `Other (${inquiry.business.facilityOther})`
      : (inquiry.business?.facility || '-');


    // 4. Photos Section Generation
    let photosHtml = '';
    if (inquiry.photos && inquiry.photos.length > 0) {
      const photoCards = await Promise.all(inquiry.photos.map(async (p, idx) => {
        const imgUrl = p.optimizedUrls?.preview || p.optimizedUrls?.thumbnail || p.secureUrl || p.previewUrl;
        const caption = escapeHtml(p.originalFileName || p.fileName || `Site Photo ${idx + 1}`);
        const dataUri = await resolveImageToDataUri(imgUrl);

        if (dataUri) {
          return `
            <div class="photo-card">
              <div class="photo-badge">#${idx + 1}</div>
              <img src="${dataUri}" alt="${caption}" />
              <div class="photo-caption">${caption}</div>
            </div>
          `;
        }

        return `
          <div class="photo-card">
            <div class="photo-badge">#${idx + 1}</div>
            <div class="photo-placeholder-box">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <div class="placeholder-sub">${caption}</div>
            </div>
            <div class="photo-caption">${caption}</div>
          </div>
        `;
      }));
      
      photosHtml = `
        <div class="section">
          <div class="section-title">Site Visit Photos (${inquiry.photos.length})</div>
          <div class="photos-grid">
            ${photoCards.join('')}
          </div>
        </div>
      `;
    }

    // 5. Inject Data into Template
    const replacements = {
      INQUIRY_NUMBER: escapeHtml(inquiry.inquiryNumber),
      DATE: escapeHtml(formatDateStr(inquiry.date)),
      STATUS: escapeHtml((inquiry.status || 'submitted').toUpperCase()),
      
      // Customer
      COMPANY_NAME: escapeHtml(inquiry.customer?.companyName),
      CONTACT_PERSON: escapeHtml(inquiry.customer?.contactPerson),
      DESIGNATION: escapeHtml(inquiry.customer?.designation),
      MOBILE: escapeHtml(inquiry.customer?.mobile),
      EMAIL: escapeHtml(inquiry.customer?.email),
      SITE_LOCATION: escapeHtml(inquiry.customer?.siteLocation),
      GST_NO: escapeHtml(inquiry.customer?.gstNo),
      BILLING_ADDRESS: escapeHtml(inquiry.customer?.billingAddress),

      // Business
      CUSTOMER_TYPE: escapeHtml(customerType),
      INDUSTRY_TYPE: escapeHtml(inquiry.business?.industryType),
      LOCATION_GIDC: escapeHtml(inquiry.business?.locationGidc),
      FACILITY: escapeHtml(facility),
      AREA_SQFT: escapeHtml(inquiry.business?.areaSqft ? `${Number(inquiry.business.areaSqft).toLocaleString()} Sq.Ft.` : '-'),
      FLOORS: escapeHtml(inquiry.business?.floors),
      BUSINESS_STATUS: escapeHtml(inquiry.business?.status),
      EXPECTED_DATE: escapeHtml(formatDateStr(inquiry.business?.expectedDate)),

      // Requirement
      PRODUCTS: escapeHtml(productsStr),
      QUANTITY: escapeHtml(inquiry.requirement?.estimatedQuantity),
      CURRENT_BRAND: escapeHtml(inquiry.requirement?.currentBrand),
      CURRENT_PURCHASE: escapeHtml(inquiry.requirement?.currentPurchase),
      REASON: escapeHtml(inquiry.requirement?.reason),
      PRODUCT_SPECIFICATION: escapeHtml(inquiry.requirement?.productSpecification),

      // Commercial
      REQUIREMENT_VALUE: escapeHtml(formatCurrency(inquiry.commercial?.requirementValue)),
      EXPECTED_VALUE: escapeHtml(formatCurrency(inquiry.commercial?.expectedOrderValue)),
      BUDGET: escapeHtml(inquiry.commercial?.budget),
      PAYMENT_TERMS: escapeHtml(inquiry.commercial?.paymentTerms),
      DECISION_MAKER: escapeHtml(inquiry.commercial?.decisionMakerName),
      DECISION_DESIGNATION: escapeHtml(inquiry.commercial?.decisionMakerDesignation),
      DECISION_ROLE: escapeHtml(inquiry.commercial?.decisionRole),
      PURCHASE_DECISION_BY: escapeHtml(formatDateStr(inquiry.commercial?.purchaseDecisionBy)),
      COMPETITORS: escapeHtml(inquiry.commercial?.competitors),

      // Visit
      VISIT_TYPE: escapeHtml(inquiry.visit?.visitType),
      PERSON_MET: escapeHtml(inquiry.visit?.personMet),
      REQUIREMENT_DISCUSSED: escapeHtml(inquiry.visit?.requirementDiscussed),
      PHOTOS_REQUIRED: escapeHtml(inquiry.visit?.photos),
      OPPORTUNITY: escapeHtml(inquiry.visit?.opportunity),

      // Follow-up
      NEXT_ACTION: escapeHtml((inquiry.followUp?.nextAction || []).join(', ') || '-'),
      NEXT_VISIT_TYPE: escapeHtml(inquiry.followUp?.nextVisitType),
      QUOTATION_DATE: escapeHtml(formatDateStr(inquiry.followUp?.quotationDate)),
      FOLLOW_UP_DATE: escapeHtml(formatDateStr(inquiry.followUp?.followUpDate)),
      NEXT_COMMITMENT: escapeHtml(inquiry.followUp?.nextActionCommitment),

      // Remarks
      REMARKS: escapeHtml(inquiry.remarks),

      // Meta
      SALES_PERSON: escapeHtml(inquiry.salesPerson || inquiry.createdBy?.name || inquiry.createdBy?.email),
      SUBMISSION_TIME: escapeHtml(inquiry.submissionMeta?.confirmedAt ? new Date(inquiry.submissionMeta.confirmedAt).toLocaleString('en-IN') : '-'),
      
      // Dynamic HTML block
      PHOTOS_SECTION: photosHtml
    };

    let finalHtml = templateHtml;
    for (const [key, val] of Object.entries(replacements)) {
      finalHtml = finalHtml.replaceAll(new RegExp(`{{${key}}}`, 'g'), val);
    }

    // 6. Launch Puppeteer & Generate PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    // Set content and wait for images to load efficiently
    await page.setContent(finalHtml, { 
      waitUntil: inquiry.photos && inquiry.photos.length > 0 ? 'networkidle2' : 'domcontentloaded', 
      timeout: 20000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '12mm',
        bottom: '15mm',
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
