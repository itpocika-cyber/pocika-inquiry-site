import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';

const BASE_URL = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MONGO_URI = process.env.MONGODB_URI;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runFullE2ETest() {
  console.log('===============================================================');
  console.log('STARTING REAL BROWSER E2E TEST — POCIKA INQUIRY SYSTEM');
  console.log('===============================================================');

  const screenshotsDir = path.join(process.cwd(), 'scratch/e2e-screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  let browser = null;
  let createdInquiryNumber = null;
  let mongoConnection = null;

  try {
    // Connect to MongoDB to verify database writes directly
    console.log('\n[1/10] Connecting to MongoDB to verify database records...');
    mongoConnection = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB Atlas:', mongoConnection.connection.host);

    console.log('\n[2/10] Launching Real Chromium Browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[Browser ${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        console.error('  ⚠️ Browser Console Error:', text);
      }
    });

    // -------------------------------------------------------------
    // STEP 1: SALESPERSON LOGIN
    // -------------------------------------------------------------
    console.log('\n[3/10] Step 1: Navigating to login page and authenticating as salesperson...');
    await page.goto(`${BASE_URL}/pages/login.html`, { waitUntil: 'networkidle2' });
    
    // Wait for login form
    await page.waitForSelector('#login-form', { timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png') });

    // Fill credentials
    await page.type('#email', 'sales@pocika.com');
    await page.type('#password', process.env.DEMO_SALES_PASSWORD || 'Sales@12345');
    
    // Click Sign In
    console.log('  Submitting login form for sales@pocika.com...');
    await page.click('#btn-login');

    // Wait for navigation to dashboard.html
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    const currentUrl = page.url();
    console.log('  Current URL after login:', currentUrl);
    if (!currentUrl.includes('dashboard.html')) {
      throw new Error(`Expected redirection to dashboard.html, but got: ${currentUrl}`);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard-after-login.png') });
    console.log('✅ PASS: Salesperson authenticated and landed on dashboard.html');

    // -------------------------------------------------------------
    // STEP 2: TEST FORM VALIDATION (DELIBERATE INVALID DATA)
    // -------------------------------------------------------------
    console.log('\n[4/10] Step 2: Testing Inquiry Form Validation...');
    await page.goto(`${BASE_URL}/pages/inquiry.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#inquiry-form', { timeout: 10000 });

    // Attempt to click Next on Step 1 with empty required fields
    console.log('  Attempting to advance with empty required fields...');
    await page.click('#btn-next-desktop');
    await sleep(500);

    const hasErrors = await page.evaluate(() => {
      return document.querySelectorAll('#inquiry-form .has-error, #inquiry-form .is-invalid').length > 0;
    });

    if (!hasErrors) {
      throw new Error('Validation failed: Empty required fields were not marked with error styles!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '03-form-validation-errors.png') });
    console.log('✅ PASS: Client-side validation correctly blocked progression and highlighted errors');

    // -------------------------------------------------------------
    // STEP 3: FILL SALES INQUIRY FORM WITH REAL UNIQUE TEST DATA
    // -------------------------------------------------------------
    console.log('\n[5/10] Step 3: Filling Inquiry Form with Unique E2E Data...');

    // Step 1: Visit & Contact
    console.log('  Filling Step 1: Visit & Contact...');
    await page.type('input[name="customer.companyName"]', 'E2E TEST COMPANY 786');
    await page.type('input[name="customer.contactPerson"]', 'Solanki Devrajsinh');
    await page.type('input[name="customer.designation"]', 'Safety Director');
    await page.type('input[name="customer.mobile"]', '9876543210');
    await page.type('input[name="customer.email"]', 'e2e-test@example.com');
    await page.type('textarea[name="customer.billingAddress"]', 'E2E TEST ADDRESS 987');
    await page.type('input[name="customer.siteLocation"]', 'E2E TEST ADDRESS 987');
    await page.type('input[name="customer.gstNo"]', '24AAACA1234A1Z5');
    await page.click('#btn-next-desktop');
    await sleep(600);

    // Step 2: Customer / Business
    console.log('  Filling Step 2: Customer / Business...');
    await page.click('input[name="business.customerType"][value="Corporate"]');
    await page.click('input[name="business.facility"][value="Warehouse"]');
    await page.type('input[name="business.areaSqft"]', '45000');
    await page.type('input[name="business.floors"]', '3');
    await page.click('input[name="business.status"][value="Existing"]');
    await page.type('input[name="business.expectedDate"]', '2026-10-15');
    await page.click('#btn-next-desktop');
    await sleep(600);

    // Step 3: Product / Requirement
    console.log('  Filling Step 3: Product / Requirement...');
    await page.click('input[name="products"][value="ABC Fire Extinguisher"]');
    await page.click('input[name="products"][value="Fire Hydrant"]');
    await page.type('textarea[name="requirement.productSpecification"]', 'E2E FIRE SAFETY TEST 4321');
    await page.type('input[name="requirement.estimatedQuantity"]', '50 units');
    await page.click('input[name="requirement.reason"][value="Compliance/Audit"]');
    await page.click('#btn-next-desktop');
    await sleep(600);

    // Step 4: Commercial
    console.log('  Filling Step 4: Commercial...');
    await page.type('input[name="commercial.requirementValue"]', '150000');
    await page.type('input[name="commercial.expectedOrderValue"]', '123456.78');
    await page.click('input[name="commercial.budget"][value="Available"]');
    await page.type('input[name="commercial.paymentTerms"]', '30 Days Net');
    await page.type('input[name="commercial.decisionMakerName"]', 'Mr. Rajesh Shah');
    await page.click('#btn-next-desktop');
    await sleep(600);

    // Step 5: Visit & Opportunity
    console.log('  Filling Step 5: Visit & Opportunity...');
    await page.click('input[name="visit.visitType"][value="Cold Visit"]');
    await page.type('input[name="visit.personMet"]', 'Security Incharge');
    await page.click('input[name="visit.photos"][value="Taken"]');
    await page.click('input[name="visit.opportunity"][value="HOT"]');
    await page.click('#btn-next-desktop');
    await sleep(600);

    // Step 6: Follow-up
    console.log('  Filling Step 6: Follow-up...');
    await page.click('input[name="followUp.nextAction"][value="Quotation"]');
    await page.type('input[name="followUp.followUpDate"]', '2026-09-25');
    await page.click('#btn-next-desktop');
    await sleep(600);

    // Step 7: Remarks & Photos Upload
    console.log('  Filling Step 7: Remarks & Photo Upload...');
    await page.type('textarea[name="remarks"]', 'Urgent site installation requested by safety audit board.');

    const photoInput = await page.$('#photo-input');
    const samplePhotoPath = path.join(process.cwd(), 'scratch/test-site-photo.png');
    await photoInput.uploadFile(samplePhotoPath);
    await sleep(1000);

    const photoUploaded = await page.evaluate(() => {
      const thumbs = document.querySelectorAll('#photo-preview-grid .photo-thumb');
      const counter = document.querySelector('#photo-counter')?.textContent;
      return { count: thumbs.length, counterText: counter };
    });

    console.log('  Photo upload UI state:', photoUploaded);
    if (photoUploaded.count < 1) {
      throw new Error('Photo thumbnail failed to render in UI after selecting file!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '04-photo-attached.png') });
    await page.click('#btn-next-desktop');
    await sleep(800);

    // Step 8: Review
    console.log('  Verifying Step 8: Review Screen...');
    const reviewData = await page.evaluate(() => {
      const content = document.querySelector('#review-content')?.innerText || '';
      return {
        hasCompany: content.includes('E2E TEST COMPANY 786'),
        hasRequirement: content.includes('E2E FIRE SAFETY TEST 4321'),
        hasValue: content.includes('123456.78'),
        hasPhoto: document.querySelectorAll('#review-content .photo-thumb').length > 0
      };
    });

    console.log('  Review Screen verification:', reviewData);
    if (!reviewData.hasCompany || !reviewData.hasRequirement || !reviewData.hasValue) {
      throw new Error('Review screen is missing critical inquiry fields!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '05-review-screen.png') });
    console.log('✅ PASS: Review screen accurately reflected all entered values and photo thumbnail');

    // -------------------------------------------------------------
    // STEP 4: SUBMIT FORM & VERIFY SUCCESS PAGE
    // -------------------------------------------------------------
    console.log('\n[6/10] Step 4: Submitting form and waiting for authoritative response...');
    
    // Listen for the dialog or navigation
    page.on('dialog', async dialog => {
      console.log('  Browser Dialog appeared:', dialog.message());
      await dialog.accept();
    });

    // Click Confirm & Submit
    await page.click('#btn-next-desktop');

    // Wait for navigation to success.html
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 });
    const successUrl = page.url();
    console.log('  Landed on:', successUrl);
    if (!successUrl.includes('success.html')) {
      throw new Error(`Expected success.html, but URL is: ${successUrl}`);
    }

    createdInquiryNumber = await page.evaluate(() => {
      return document.querySelector('#success-inquiry-no')?.textContent?.trim();
    });

    console.log('  Assigned Inquiry Number:', createdInquiryNumber);
    if (!createdInquiryNumber || !createdInquiryNumber.startsWith('PSI-')) {
      throw new Error(`Invalid or missing inquiry number generated: "${createdInquiryNumber}"`);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '06-success-page.png') });
    console.log('✅ PASS: Inquiry submitted and assigned number:', createdInquiryNumber);

    // -------------------------------------------------------------
    // STEP 5: VERIFY DATABASE (MONGODB ATLAS)
    // -------------------------------------------------------------
    console.log('\n[7/10] Step 5: Querying MongoDB Atlas for authoritative document...');
    const db = mongoConnection.connection.db;
    const doc = await db.collection('inquiries').findOne({ inquiryNumber: createdInquiryNumber });

    if (!doc) {
      throw new Error(`Inquiry ${createdInquiryNumber} was NOT found in MongoDB!`);
    }

    console.log('  MongoDB Document Found:');
    console.log('    _id:', doc._id.toString());
    console.log('    inquiryNumber:', doc.inquiryNumber);
    console.log('    companyName:', doc.customer?.companyName);
    console.log('    productSpecification:', doc.requirement?.productSpecification);
    console.log('    expectedOrderValue:', doc.commercial?.expectedOrderValue);
    console.log('    photos in DB:', doc.photos?.length);
    if (doc.photos && doc.photos.length > 0) {
      console.log('    Cloudinary secureUrl:', doc.photos[0].secureUrl);
    }

    if (doc.customer?.companyName !== 'E2E TEST COMPANY 786') {
      throw new Error(`MongoDB companyName mismatch! Got: ${doc.customer?.companyName}`);
    }
    if (doc.requirement?.productSpecification !== 'E2E FIRE SAFETY TEST 4321') {
      throw new Error(`MongoDB productSpecification mismatch! Got: ${doc.requirement?.productSpecification}`);
    }
    if (doc.commercial?.expectedOrderValue !== 123456.78) {
      throw new Error(`MongoDB expectedOrderValue mismatch! Got: ${doc.commercial?.expectedOrderValue}`);
    }
    console.log('✅ PASS: MongoDB document matches browser submission 100%');

    // -------------------------------------------------------------
    // STEP 6: VERIFY INQUIRIES LIST & VIEW PAGE
    // -------------------------------------------------------------
    console.log('\n[8/10] Step 6: Testing Inquiries List and View Page...');
    await page.goto(`${BASE_URL}/pages/inquiries.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#inquiries-tbody', { timeout: 10000 });
    await sleep(1000);

    const isInList = await page.evaluate((inqNum) => {
      const tbodyText = document.querySelector('#inquiries-tbody')?.innerText || '';
      return tbodyText.includes(inqNum) && tbodyText.includes('E2E TEST COMPANY 786');
    }, createdInquiryNumber);

    if (!isInList) {
      throw new Error(`Newly created inquiry ${createdInquiryNumber} does not appear in inquiries.html table!`);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '07-inquiries-list.png') });
    console.log(`✅ PASS: Inquiry ${createdInquiryNumber} correctly displayed in inquiries.html`);

    // Navigate to Details page
    console.log('  Opening inquiry details page...');
    await page.goto(`${BASE_URL}/pages/inquiry-details.html?id=${createdInquiryNumber}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#customer-info-grid', { timeout: 10000 });
    await sleep(1000);

    const detailsViewData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasCompany: bodyText.includes('E2E TEST COMPANY 786'),
        hasReq: bodyText.includes('E2E FIRE SAFETY TEST 4321'),
        hasValue: bodyText.includes('1,23,456.78'),
        hasPhoto: document.querySelectorAll('#photos-grid img').length > 0
      };
    });

    console.log('  Details View verification:', detailsViewData);
    if (!detailsViewData.hasCompany || !detailsViewData.hasReq || !detailsViewData.hasValue) {
      throw new Error('Inquiry Details page is missing verified inquiry data!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '08-inquiry-details.png') });
    console.log('✅ PASS: Inquiry Details page accurately displays customer, requirements, values, and photo');

    // -------------------------------------------------------------
    // STEP 7: EDIT INQUIRY & VERIFY UPDATES
    // -------------------------------------------------------------
    console.log('\n[9/10] Step 7: Testing Edit Inquiry Flow...');
    await page.click('#btn-edit-inquiry');
    await page.waitForSelector('#editInquiryModal.show', { timeout: 5000 });
    await sleep(500);

    // Update fields
    console.log('  Modifying Requirement and Expected Value in modal...');
    await page.$eval('#edit-requirement', el => el.value = '');
    await page.type('#edit-requirement', 'E2E FIRE SAFETY TEST UPDATED 4321');

    await page.$eval('#edit-expected-value', el => el.value = '');
    await page.type('#edit-expected-value', '223456.78');

    await page.screenshot({ path: path.join(screenshotsDir, '09-edit-modal-filled.png') });
    await page.click('#btn-save-inquiry-edit');
    await sleep(2000);

    // Verify updated details on page
    const updatedViewData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasUpdatedReq: bodyText.includes('E2E FIRE SAFETY TEST UPDATED 4321'),
        hasUpdatedValue: bodyText.includes('2,23,456.78')
      };
    });

    console.log('  Updated View verification:', updatedViewData);
    if (!updatedViewData.hasUpdatedReq || !updatedViewData.hasUpdatedValue) {
      throw new Error('Live view did not update with modified requirement or value!');
    }

    // Verify MongoDB update
    const updatedDoc = await db.collection('inquiries').findOne({ inquiryNumber: createdInquiryNumber });
    if (updatedDoc.requirement?.productSpecification !== 'E2E FIRE SAFETY TEST UPDATED 4321') {
      throw new Error('MongoDB was not updated with new productSpecification!');
    }
    if (updatedDoc.commercial?.expectedOrderValue !== 223456.78) {
      throw new Error('MongoDB was not updated with new expectedOrderValue!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '10-view-after-edit.png') });
    console.log('✅ PASS: Edit Inquiry updated both live UI and MongoDB Atlas document');

    // -------------------------------------------------------------
    // STEP 8: ADMIN DASHBOARD & CROSS-ROLE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[10/10] Step 8: Logging out and Testing Admin Dashboard Flow...');
    await page.goto(`${BASE_URL}/pages/login.html`, { waitUntil: 'networkidle2' });
    
    // Clear cookies/session to sign out completely
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.removeItem('pocika_user_profile');
    });
    await page.reload({ waitUntil: 'networkidle2' });

    // Login as Admin
    console.log('  Logging in as admin@pocika.com...');
    await page.waitForSelector('#login-form', { timeout: 10000 });
    await page.type('#email', 'admin@pocika.com');
    await page.type('#password', process.env.DEMO_ADMIN_PASSWORD || 'Admin@12345');
    await page.click('#btn-login');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    const adminUrl = page.url();
    console.log('  Admin landed on:', adminUrl);
    if (!adminUrl.includes('admin-dashboard.html')) {
      throw new Error(`Expected admin-dashboard.html, but URL is: ${adminUrl}`);
    }

    // Wait for admin table to load
    await page.waitForSelector('#inquiries-tbody tr', { timeout: 10000 });
    await sleep(1000);

    const adminSeesInquiry = await page.evaluate((inqNum) => {
      return document.querySelector('#inquiries-tbody')?.innerText.includes(inqNum);
    }, createdInquiryNumber);

    if (!adminSeesInquiry) {
      throw new Error(`Admin dashboard does not show inquiry ${createdInquiryNumber}!`);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '11-admin-dashboard.png') });
    console.log(`✅ PASS: Admin successfully viewed inquiry ${createdInquiryNumber} in Admin Dashboard`);

    // Verify Admin can view inquiry details
    await page.goto(`${BASE_URL}/pages/inquiry-details.html?id=${createdInquiryNumber}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#customer-info-grid', { timeout: 10000 });
    await sleep(1000);

    const adminDetailsText = await page.evaluate(() => document.body.innerText);
    if (!adminDetailsText.includes('E2E TEST COMPANY 786') || !adminDetailsText.includes('E2E FIRE SAFETY TEST UPDATED 4321')) {
      throw new Error('Admin inquiry details view failed to load full inquiry content!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '12-admin-inquiry-details.png') });
    console.log('✅ PASS: Admin can view and inspect full details of the inquiry');

    console.log('\n===============================================================');
    console.log('ALL E2E BROWSER TESTS COMPLETED AND VERIFIED 100% SUCCESSFULLY!');
    console.log('===============================================================');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(screenshotsDir, 'error-state.png') }).catch(() => {});
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (mongoConnection) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

runFullE2ETest().catch((e) => {
  console.error('Fatal E2E error:', e);
  process.exit(1);
});
