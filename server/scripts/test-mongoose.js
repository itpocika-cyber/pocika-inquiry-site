import mongoose from 'mongoose';
import { Inquiry } from '../models/Inquiry.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const testPayload = {
  inquiryNumber: 'PSI-2026-999999',
  date: '2026-09-16',
  status: 'submitted',
  salesPerson: 'Test',
  customer: {
    companyName: 'Test',
    contactPerson: 'Test',
    designation: '',
    mobile: '1234567890',
    email: 'test@test.com',
    billingAddress: '',
    siteLocation: 'Test Location',
    gstNo: ''
  },
  business: {
    customerType: 'Corporate',
    customerTypeOther: '',
    industryType: '',
    locationGidc: '',
    facility: 'Office',
    facilityOther: '',
    areaSqft: null,
    floors: null,
    status: 'New',
    expectedDate: ''
  },
  products: ['ABC Fire Extinguisher'],
  productOther: '',
  requirement: {
    productSpecification: '',
    estimatedQuantity: '',
    currentBrand: '',
    currentPurchase: '',
    reason: ''
  },
  commercial: {
    requirementValue: null,
    expectedOrderValue: null,
    budget: '',
    paymentTerms: '',
    decisionMakerName: '',
    decisionMakerDesignation: '',
    decisionRole: '',
    purchaseDecisionBy: '',
    competitors: ''
  },
  visit: {
    visitType: 'Cold Visit',
    personMet: '',
    requirementDiscussed: '',
    photos: 'Taken',
    opportunity: 'HOT'
  },
  followUp: {
    nextAction: [],
    nextVisitType: '',
    quotationDate: '',
    followUpDate: '2026-09-20',
    nextActionCommitment: ''
  },
  remarks: '',
  photos: [],
  submissionMeta: {
    confirmedBy: 'Test',
    confirmedAt: new Date()
  },
  createdBy: {
    firebaseUid: 'test_uid_123',
    email: 'test@test.com',
    name: 'Test'
  }
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
    
    const doc = new Inquiry(testPayload);
    await doc.validate();
    console.log('Validation passed!');
  } catch (err) {
    console.error('Validation failed:', err.message);
    if (err.errors) {
      console.log('Details:', Object.keys(err.errors).map(k => `${k}: ${err.errors[k].message}`));
    }
  } finally {
    await mongoose.disconnect();
  }
};

run();
