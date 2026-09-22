import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Inquiry } from '../models/Inquiry.js';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try both root and server .env paths
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;

// Helper to compute YYYY-MM-DD relative to today
function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

async function runSeed() {
  console.log('================================================================================');
  console.log('POCIKA SYSTEM: RESET & SEED ALL SCENARIO-RICH DEMO INQUIRIES');
  console.log('================================================================================');

  if (!MONGO_URI) {
    console.error('ERROR: MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB Atlas.');

  // Find existing admin and sales users to link author IDs
  const adminUser = await User.findOne({ email: 'admin@pocika.com' }) || await User.findOne({ role: 'admin' });
  const salesUserPrem = await User.findOne({ email: 'prem@gmail.com' }) || await User.findOne({ role: 'sales_person' });
  const salesUserGeneral = await User.findOne({ email: 'sales@pocika.com' }) || salesUserPrem;

  const adminName = adminUser?.displayName || 'POCIKA Administrator';
  const premName = salesUserPrem?.displayName || 'Prem Modi';
  const generalSalesName = salesUserGeneral?.displayName || 'Sales Agent';

  const adminEmail = adminUser?.email || 'admin@pocika.com';
  const premEmail = salesUserPrem?.email || 'prem@gmail.com';
  const generalSalesEmail = salesUserGeneral?.email || 'sales@pocika.com';

  console.log(`Using Team Members:`);
  console.log(` - Admin: ${adminName} (${adminEmail})`);
  console.log(` - Sales Rep 1: ${premName} (${premEmail})`);
  console.log(` - Sales Rep 2: ${generalSalesName} (${generalSalesEmail})`);

  // 1. Clean up ALL old dummy inquiries
  console.log('\nCleaning up all old dummy/test inquiries...');
  const deletedResult = await Inquiry.deleteMany({});
  console.log(`✓ Removed ${deletedResult.deletedCount} old inquiry records.`);

  const todayStr = getRelativeDate(0);
  const yesterdayStr = getRelativeDate(-1);
  const twoDaysAgoStr = getRelativeDate(-2);
  const threeDaysAgoStr = getRelativeDate(-3);
  const tenDaysAgoStr = getRelativeDate(-10);
  const twelveDaysAgoStr = getRelativeDate(-12);
  const twentyDaysAgoStr = getRelativeDate(-20);
  const twentyFiveDaysAgoStr = getRelativeDate(-25);

  const tomorrowStr = getRelativeDate(1);
  const threeDaysAheadStr = getRelativeDate(3);
  const fiveDaysAheadStr = getRelativeDate(5);
  const sixDaysAheadStr = getRelativeDate(6);
  const fourteenDaysAheadStr = getRelativeDate(14);
  const renewalDateStr = getRelativeDate(18); // within 30 days

  // Real Cloudinary photos for inspection showcase
  const samplePhotos = [
    {
      photoId: 'photo-demo-01',
      publicId: 'pocika/demo/hydrant-system-1',
      secureUrl: 'https://res.cloudinary.com/qermfcge/image/upload/v1790066624/pocika/inquiries/drafts/photos/e50b365a-0412-490e-bee8-1cccba1bf793.png',
      url: 'https://res.cloudinary.com/qermfcge/image/upload/v1790066624/pocika/inquiries/drafts/photos/e50b365a-0412-490e-bee8-1cccba1bf793.png',
      fileName: 'main-plant-hydrant.png',
      originalFileName: 'main-plant-hydrant.png',
      caption: 'Main processing unit fire hydrant riser valve',
      sizeKB: 245,
      latitude: 23.0225,
      longitude: 72.5714,
      uploadedAt: new Date()
    },
    {
      photoId: 'photo-demo-02',
      publicId: 'pocika/demo/extinguisher-bank-2',
      secureUrl: 'https://res.cloudinary.com/qermfcge/image/upload/v1790066624/pocika/inquiries/drafts/photos/e50b365a-0412-490e-bee8-1cccba1bf793.png',
      url: 'https://res.cloudinary.com/qermfcge/image/upload/v1790066624/pocika/inquiries/drafts/photos/e50b365a-0412-490e-bee8-1cccba1bf793.png',
      fileName: 'warehouse-extinguishers.png',
      originalFileName: 'warehouse-extinguishers.png',
      caption: 'Chemical warehouse 50kg ABC trolley unit inspection',
      sizeKB: 310,
      latitude: 23.0226,
      longitude: 72.5715,
      uploadedAt: new Date()
    }
  ];

  // 2. Build 9 distinct, representative scenario records
  const demoInquiries = [
    // -------------------------------------------------------------------------
    // SCENARIO 1: Overdue Follow-up (3 days late) + Hot Lead + Admin Review 'Needs Follow-up' + Comments Thread
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000001',
      date: threeDaysAgoStr,
      salesPerson: premName,
      createdBy: {
        userId: String(salesUserPrem?._id || 'u-prem'),
        name: premName,
        email: premEmail
      },
      customer: {
        companyName: 'Shreeji Polyplast Industries',
        contactPerson: 'Rajeshbhai Patel',
        designation: 'Managing Director',
        mobile: '9825012345',
        email: 'rajesh@shreejipolyplast.com',
        billingAddress: 'Plot 108, Phase 2, GIDC Vatva, Ahmedabad',
        siteLocation: 'Vatva Industrial Zone',
        gstNo: '24AAACS1122B1Z4'
      },
      business: {
        customerType: 'Manufacturer',
        industryType: 'Plastic Injection Molding',
        locationGidc: 'GIDC Vatva',
        facility: 'Industrial',
        areaSqft: 18000,
        floors: 2,
        status: 'Operational'
      },
      products: ['ABC Fire Extinguisher', 'CO2 Fire Extinguisher'],
      requirement: {
        productSpecification: '15 Nos 6kg ABC Extinguishers and 4 Nos 4.5kg CO2 with ISI mark',
        estimatedQuantity: '19 Units',
        currentBrand: 'Local unbranded refilled',
        reason: 'Replacement'
      },
      commercial: {
        requirementValue: '₹1,00,000–2,50,000',
        expectedOrderValue: '₹1,00,000–2,50,000',
        budget: 'Available & Approved',
        paymentTerms: '30 Days Credit',
        decisionMakerName: 'Rajeshbhai Patel',
        decisionMakerDesignation: 'Managing Director',
        decisionRole: 'Final Decision Maker'
      },
      visit: {
        visitType: 'Cold Visit',
        opportunity: 'HOT',
        photos: 'No Photos (Restricted)'
      },
      followUp: {
        followUpDate: threeDaysAgoStr, // OVERDUE FOLLOW-UP (3 days overdue)
        nextVisitType: 'Follow-up',
        nextActionCommitment: 'Quotation sent on 18th; need to follow up for purchase order approval.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Needs Follow-up',
        remarks: 'High probability deal. Call customer and offer 3% prompt payment discount if needed.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      comments: [
        {
          commentId: 'c-01',
          text: 'Did client respond to the quotation sent last Friday?',
          author: {
            userId: String(adminUser?._id || 'u-admin'),
            name: adminName,
            email: adminEmail,
            role: 'admin'
          },
          createdAt: new Date(Date.now() - 48 * 3600 * 1000)
        },
        {
          commentId: 'c-02',
          text: 'Spoke with accounts manager. MD is in factory today, calling him at 3 PM to finalize PO.',
          author: {
            userId: String(salesUserPrem?._id || 'u-prem'),
            name: premName,
            email: premEmail,
            role: 'sales_person'
          },
          createdAt: new Date(Date.now() - 4 * 3600 * 1000)
        }
      ],
      remarks: 'Existing fire safety setup is outdated; plant head agreed to replace all units immediately.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 2: Today's Follow-up (Due Today) + Deal Won + Admin Review 'Approved'
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000002',
      date: twoDaysAgoStr,
      salesPerson: premName,
      createdBy: {
        userId: String(salesUserPrem?._id || 'u-prem'),
        name: premName,
        email: premEmail
      },
      customer: {
        companyName: 'Zydus Lifesciences Chemical Unit',
        contactPerson: 'Dr. Vivek Joshi',
        designation: 'VP - Operations & EHS',
        mobile: '9879023456',
        email: 'vivek.joshi@zyduslife.com',
        billingAddress: 'Survey No. 434, Sarkhej-Bawla Highway, Moraiya',
        siteLocation: 'Moraiya Formulation Plant',
        gstNo: '24AAACZ4321A1Z9'
      },
      business: {
        customerType: 'Manufacturer',
        industryType: 'Pharmaceutical Formulations',
        locationGidc: 'Moraiya',
        facility: 'Industrial',
        areaSqft: 65000,
        floors: 3,
        status: 'Operational'
      },
      products: ['Fire Hydrant', 'Fire Alarm & Detection', 'Fire Pump/Accessories'],
      requirement: {
        productSpecification: 'Complete yard hydrant expansion + 400 addressable smoke detectors + main diesel pump commissioning',
        estimatedQuantity: 'Turnkey Project',
        currentBrand: 'Existing system expansion',
        reason: 'Expansion'
      },
      commercial: {
        requirementValue: '₹5,00,000–10,00,000',
        expectedOrderValue: '₹5,00,000–10,00,000',
        budget: 'Available & Approved',
        paymentTerms: '20% Advance, 70% against dispatch, 10% post commissioning',
        decisionMakerName: 'Dr. Vivek Joshi',
        decisionMakerDesignation: 'VP - Operations',
        decisionRole: 'Final Decision Maker'
      },
      visit: {
        visitType: 'Scheduled Meeting',
        opportunity: 'HOT',
        photos: 'Photos Taken'
      },
      followUp: {
        followUpDate: todayStr, // DUE TODAY
        nextVisitType: 'Site Visit',
        nextActionCommitment: 'Client confirmed order. Advance payment copy and work order signoff expected today.',
        dealStatus: 'Won' // WON DEAL (Increases conversion rate)
      },
      managerReview: {
        status: 'Approved',
        remarks: 'Order confirmed. Technical engineering team mobilized for installation layout.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      remarks: 'Key corporate account won. Project execution to commence next Monday.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 3: Upcoming Follow-up (This Week / 3 Days Ahead) + Sales Agent + Review 'Reviewed'
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000003',
      date: yesterdayStr,
      salesPerson: generalSalesName,
      createdBy: {
        userId: String(salesUserGeneral?._id || 'u-general'),
        name: generalSalesName,
        email: generalSalesEmail
      },
      customer: {
        companyName: 'Adani Logistics Inland Container Depot',
        contactPerson: 'Sunil Kumar Nair',
        designation: 'Terminal General Manager',
        mobile: '9712987654',
        email: 'sunil.nair@adani.com',
        billingAddress: 'Adani ICD Terminal, Sanand GIDC Phase 2',
        siteLocation: 'Sanand ICD Yard',
        gstNo: '24AAACA9876C1Z3'
      },
      business: {
        customerType: 'End User',
        industryType: 'Logistics & Warehousing',
        locationGidc: 'Sanand GIDC',
        facility: 'Warehouse',
        areaSqft: 120000,
        floors: 1,
        status: 'Operational'
      },
      products: ['Fire Hydrant', 'Hose Reel/Hose'],
      requirement: {
        productSpecification: '12 Nos single-headed landing valves, 30m canvas hoses with gunmetal branch pipes',
        estimatedQuantity: '12 Landing Valves + 24 Hoses',
        reason: 'New Setup'
      },
      commercial: {
        requirementValue: '₹2,50,000–5,00,000',
        expectedOrderValue: '₹2,50,000–5,00,000',
        budget: 'In Process / Tentative',
        decisionMakerName: 'Sunil Kumar Nair',
        decisionRole: 'Influencer'
      },
      visit: {
        visitType: 'Scheduled Meeting',
        opportunity: 'WARM',
        photos: 'Photos Taken'
      },
      followUp: {
        followUpDate: threeDaysAheadStr, // THIS WEEK FOLLOW-UP
        nextVisitType: 'Follow-up',
        nextActionCommitment: 'Meeting scheduled with EHS Director at Adani corporate office to review layout drawings.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Reviewed',
        remarks: 'Drawings vetted by technical design team. Proposal ready for submission.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      remarks: 'Very large logistics terminal; successful execution will lead to pan-Gujarat ICD contracts.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 4: 📅 Renewals Due Soon (Next 30 Days) - AMC Contract Expiring in 18 Days
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000004',
      date: getRelativeDate(-4),
      salesPerson: premName,
      createdBy: {
        userId: String(salesUserPrem?._id || 'u-prem'),
        name: premName,
        email: premEmail
      },
      customer: {
        companyName: 'Torrent Pharmaceuticals Research Center',
        contactPerson: 'Nilesh Vaghela',
        designation: 'Facilities Head',
        mobile: '9898034567',
        email: 'nilesh.vaghela@torrentpharma.com',
        billingAddress: 'Village Bhat, Gandhinagar Highway',
        siteLocation: 'Bhat R&D Centre',
        gstNo: '24AAACT1234T1Z8'
      },
      business: {
        customerType: 'End User',
        industryType: 'Pharmaceutical R&D',
        facility: 'Commercial',
        areaSqft: 40000,
        floors: 2,
        status: 'Operational'
      },
      products: ['AMC/Refilling/Maintenance', 'ABC Fire Extinguisher'],
      requirement: {
        productSpecification: 'Annual AMC renewal for 85 Fire Extinguishers and hydraulic pressure testing',
        estimatedQuantity: '85 Extinguishers AMC',
        reason: 'Periodic Refilling',
        renewalDueDate: renewalDateStr // RENEWALS DUE SOON (Within next 30 days)
      },
      commercial: {
        requirementValue: 'Under ₹50,000',
        expectedOrderValue: 'Under ₹50,000',
        budget: 'Available & Approved',
        decisionMakerName: 'Nilesh Vaghela',
        decisionRole: 'Final Decision Maker'
      },
      visit: {
        visitType: 'Service Call',
        opportunity: 'WARM',
        photos: 'Not Required'
      },
      followUp: {
        followUpDate: fiveDaysAheadStr,
        nextVisitType: 'Site Visit',
        nextActionCommitment: 'Annual AMC and hydro-testing renewal due in 18 days. Submit AMC agreement draft.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Reviewed',
        remarks: 'Standard renewal rate applied. Keep service engineer standby for scheduled testing.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      remarks: 'Repeat customer since 2024. Always renews on time.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 5: ⚠️ Needs Attention / Stale Lead (Overdue 20d, Pending Deal)
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000005',
      date: twentyFiveDaysAgoStr,
      salesPerson: generalSalesName,
      createdBy: {
        userId: String(salesUserGeneral?._id || 'u-general'),
        name: generalSalesName,
        email: generalSalesEmail
      },
      customer: {
        companyName: 'Sunstar Textile Mills GIDC Naroda',
        contactPerson: 'Mahesh Solanki',
        designation: 'Maintenance Engineer',
        mobile: '9426056789',
        email: 'msolanki@sunstartextiles.in',
        billingAddress: 'Shed 22, Road 5, GIDC Naroda, Ahmedabad',
        siteLocation: 'Naroda Spinning Plant',
        gstNo: '24AAACS5432M1Z1'
      },
      business: {
        customerType: 'Manufacturer',
        industryType: 'Cotton Yarn & Weaving',
        locationGidc: 'GIDC Naroda',
        facility: 'Industrial',
        areaSqft: 28000,
        floors: 1,
        status: 'Operational'
      },
      products: ['DCP/Other Extinguishers'],
      requirement: {
        productSpecification: 'DCP powder refilling and 2 Nos 9 Litre Water CO2 Extinguishers',
        estimatedQuantity: '6 Extinguishers',
        reason: 'Periodic Refilling'
      },
      commercial: {
        requirementValue: '₹50,000–1,00,000',
        expectedOrderValue: '₹50,000–1,00,000',
        budget: 'Unknown',
        decisionRole: 'Technical Evaluator'
      },
      visit: {
        visitType: 'Cold Visit',
        opportunity: 'COLD',
        photos: 'No Photos (Restricted)'
      },
      followUp: {
        followUpDate: twentyDaysAgoStr, // OVERDUE BY 20 DAYS — STALE LEAD!
        nextVisitType: 'Follow-up',
        nextActionCommitment: 'Tried calling maintenance manager twice; no response received.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Needs Follow-up',
        remarks: 'Sales agent should make an in-person visit since phone calls are ignored.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      remarks: 'Lead at risk of going cold. Physical visit recommended.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 6: Deal Status 'Lost' with Manager Review 'Rejected'
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000006',
      date: twelveDaysAgoStr,
      salesPerson: generalSalesName,
      createdBy: {
        userId: String(salesUserGeneral?._id || 'u-general'),
        name: generalSalesName,
        email: generalSalesEmail
      },
      customer: {
        companyName: 'Radhe Enterprise Hardware Mart',
        contactPerson: 'Kishorebhai Shah',
        designation: 'Proprietor',
        mobile: '9824098765',
        email: 'radhe_hardware@yahoo.com',
        billingAddress: 'Shop 4, Relief Road Market, Ahmedabad',
        siteLocation: 'Relief Road Showroom',
        gstNo: '24AAACS9988H1Z2'
      },
      business: {
        customerType: 'Trader',
        industryType: 'Hardware & Retail',
        facility: 'Commercial',
        areaSqft: 1500,
        floors: 1,
        status: 'Operational'
      },
      products: ['PPE/Safety Products'],
      requirement: {
        productSpecification: 'Safety helmets, safety shoes, high visibility jackets',
        estimatedQuantity: '20 Sets',
        reason: 'New Setup'
      },
      commercial: {
        requirementValue: 'Under ₹50,000',
        expectedOrderValue: 'Under ₹50,000',
        budget: 'Unknown',
        decisionRole: 'Final Decision Maker'
      },
      visit: {
        visitType: 'Cold Visit',
        opportunity: 'NO REQUIREMENT',
        photos: 'Not Required'
      },
      followUp: {
        followUpDate: tenDaysAgoStr,
        nextVisitType: 'Follow-up',
        nextActionCommitment: 'Client decided to source local unbranded PPE items due to lower prices.',
        dealStatus: 'Lost' // LOST DEAL
      },
      managerReview: {
        status: 'Rejected',
        remarks: 'Client prefers substandard uncertified safety gear. Not aligned with our quality standards. Close inquiry.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      remarks: 'Competitor local shop quoted below wholesale manufacturing cost.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 7: Dealer Development / Partner Onboarding (6 Days Ahead)
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000007',
      date: getRelativeDate(-5),
      salesPerson: premName,
      createdBy: {
        userId: String(salesUserPrem?._id || 'u-prem'),
        name: premName,
        email: premEmail
      },
      customer: {
        companyName: 'Maruti Fire & Safety Solutions (Authorized Dealer)',
        contactPerson: 'Bhavesh Chawda',
        designation: 'Owner',
        mobile: '9909012399',
        email: 'bhavesh@marutifire.in',
        billingAddress: 'Opposite GIDC Gate 1, Mehsana Highway',
        siteLocation: 'Mehsana Distribution Centre',
        gstNo: '24AAACM4567D1Z6'
      },
      business: {
        customerType: 'Trader',
        industryType: 'Fire Safety Equipment Dealer',
        facility: 'Commercial',
        areaSqft: 5000,
        floors: 1,
        status: 'Operational'
      },
      products: ['ABC Fire Extinguisher', 'Fire Alarm & Detection', 'PPE/Safety Products'],
      requirement: {
        productSpecification: 'Quarterly stock dealership agreement for North Gujarat territory',
        estimatedQuantity: 'Dealership Stock Allocation',
        reason: 'New Setup'
      },
      commercial: {
        requirementValue: '₹2,50,000–5,00,000',
        expectedOrderValue: '₹2,50,000–5,00,000',
        budget: 'Available & Approved',
        decisionMakerName: 'Bhavesh Chawda',
        decisionRole: 'Final Decision Maker'
      },
      visit: {
        visitType: 'Scheduled Meeting',
        opportunity: 'DEALER DEVELOPMENT',
        photos: 'Photos Taken'
      },
      followUp: {
        followUpDate: sixDaysAheadStr,
        nextVisitType: 'Dealer Meeting',
        nextActionCommitment: 'Dealership MoU and credit limit documentation shared. Follow-up for agreement signing.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Reviewed',
        remarks: 'Good dealer network covering Mehsana and Chhatral industrial belt. Recommended for onboarding.',
        reviewedBy: adminName,
        reviewedAt: new Date()
      },
      remarks: 'Estimated annual turnover potential of ₹25 Lakhs across North Gujarat.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 8: Tomorrow's Follow-up + High-Value Project + Real Photos & GPS (Pending Admin Review)
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000008',
      date: todayStr, // Recorded today
      salesPerson: premName,
      createdBy: {
        userId: String(salesUserPrem?._id || 'u-prem'),
        name: premName,
        email: premEmail
      },
      customer: {
        companyName: 'Gujarat Gas Petroleum Terminal',
        contactPerson: 'Dharmendra Yadav',
        designation: 'Chief Safety & Integrity Officer',
        mobile: '9825599887',
        email: 'd.yadav@gujaratgas.com',
        billingAddress: 'Petrochemical Complex, Dahej SEZ, Bharuch',
        siteLocation: 'Dahej Tank Farm Area 4',
        gstNo: '24AAACG1100P1Z5'
      },
      business: {
        customerType: 'End User',
        industryType: 'Petrochemical & Gas Terminal',
        locationGidc: 'Dahej SEZ',
        facility: 'Industrial',
        areaSqft: 250000,
        floors: 1,
        status: 'Operational'
      },
      products: ['Fire Hydrant', 'Fire Pump/Accessories', 'Emergency/Safety Equipment'],
      requirement: {
        productSpecification: 'NFPA compliant high-pressure deluge foam water monitor stations + 3000 GPM fire pump set',
        estimatedQuantity: 'Major Infrastructure',
        reason: 'New Setup'
      },
      commercial: {
        requirementValue: '₹10,00,000+',
        expectedOrderValue: '₹10,00,000+',
        budget: 'Available & Approved',
        paymentTerms: 'Milestone based as per EPC tender',
        decisionMakerName: 'Dharmendra Yadav',
        decisionRole: 'Technical Evaluator'
      },
      visit: {
        visitType: 'Cold Visit',
        opportunity: 'HOT',
        photos: 'Photos Taken'
      },
      photos: samplePhotos, // REAL CLOUDINARY ATTACHED PHOTOS WITH GPS
      followUp: {
        followUpDate: tomorrowStr, // DUE TOMORROW
        nextVisitType: 'Site Visit',
        nextActionCommitment: 'Site inspection completed with survey photos. Submitting technical proposal by tomorrow evening.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Pending', // PENDING REVIEW
        remarks: ''
      },
      remarks: 'Very prestigious high-value industrial gas facility. Direct CEO visibility required.'
    },

    // -------------------------------------------------------------------------
    // SCENARIO 9: Future Potential Routine Site Check (14 Days Ahead) + Sales Agent
    // -------------------------------------------------------------------------
    {
      inquiryNumber: 'PSI-2026-000009',
      date: todayStr,
      salesPerson: generalSalesName,
      createdBy: {
        userId: String(salesUserGeneral?._id || 'u-general'),
        name: generalSalesName,
        email: generalSalesEmail
      },
      customer: {
        companyName: 'Ambica Engineering Works',
        contactPerson: 'Kiritbhai Panchal',
        designation: 'Works Manager',
        mobile: '9879944332',
        email: 'works@ambicaengineering.co.in',
        billingAddress: 'Phase 1, GIDC Odhav, Ahmedabad',
        siteLocation: 'Odhav Machine Shop',
        gstNo: '24AAACA5566E1Z7'
      },
      business: {
        customerType: 'Manufacturer',
        industryType: 'Machining & Fabrication',
        locationGidc: 'GIDC Odhav',
        facility: 'Industrial',
        areaSqft: 12000,
        floors: 1,
        status: 'Operational'
      },
      products: ['ABC Fire Extinguisher'],
      requirement: {
        productSpecification: '4 Nos 4kg ABC extinguishers for new CNC machine section',
        estimatedQuantity: '4 Extinguishers',
        reason: 'New Setup'
      },
      commercial: {
        requirementValue: 'Under ₹50,000',
        expectedOrderValue: 'Under ₹50,000',
        budget: 'Tentative / Under Discussion',
        decisionMakerName: 'Kiritbhai Panchal',
        decisionRole: 'Influencer'
      },
      visit: {
        visitType: 'Cold Visit',
        opportunity: 'FUTURE POTENTIAL',
        photos: 'Not Required'
      },
      followUp: {
        followUpDate: fourteenDaysAheadStr, // BEYOND 7 DAYS
        nextVisitType: 'Service Call',
        nextActionCommitment: 'New CNC machinery arriving in 2 weeks. Follow up to inspect electrical panel area and quote.',
        dealStatus: 'Pending'
      },
      managerReview: {
        status: 'Pending',
        remarks: ''
      },
      remarks: 'Good small workshop. High possibility of conversion once machine arrives.'
    }
  ];

  console.log(`\nInserting ${demoInquiries.length} comprehensive demo inquiries...`);
  const inserted = await Inquiry.insertMany(demoInquiries);
  console.log(`✅ Successfully seeded ${inserted.length} scenario-rich inquiry records!\n`);

  console.log('========================================================================================================================');
  console.log('SEEDED SCENARIOS SUMMARY TABLE:');
  console.log('========================================================================================================================');
  inserted.forEach((inq) => {
    console.log(
      `[${inq.inquiryNumber}] ${inq.customer.companyName.padEnd(38)} | ` +
      `Sales: ${inq.salesPerson.padEnd(14)} | ` +
      `Opp: ${inq.visit.opportunity.padEnd(18)} | ` +
      `Deal: ${(inq.followUp?.dealStatus || 'Pending').padEnd(8)} | ` +
      `Follow-up: ${(inq.followUp?.followUpDate || '-').padEnd(11)} | ` +
      `Review: ${(inq.managerReview?.status || 'Pending').padEnd(16)} | ` +
      `Photos: ${inq.photos?.length || 0}`
    );
  });
  console.log('========================================================================================================================');

  await mongoose.disconnect();
  console.log('\nDatabase connection closed. All scenarios are cleanly seeded and ready for testing!');
}

runSeed().catch((err) => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
