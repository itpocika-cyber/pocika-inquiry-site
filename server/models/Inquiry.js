import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema({
  inquiryNumber: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  salesPerson: { type: String, default: "" },
  status: { type: String, enum: ['draft', 'submitted'], default: 'submitted' },
  
  customer: {
    companyName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    designation: { type: String, default: "" },
    mobile: { type: String, required: true },
    email: { type: String, default: "" },
    billingAddress: { type: String, default: "" },
    siteLocation: { type: String, required: true },
    gstNo: { type: String, default: "" }
  },
  
  business: {
    customerType: { type: String, required: true },
    customerTypeOther: { type: String, default: "" },
    industryType: { type: String, default: "" },
    locationGidc: { type: String, default: "" },
    facility: { type: String, required: true },
    facilityOther: { type: String, default: "" },
    areaSqft: { type: Number, default: null },
    floors: { type: Number, default: null },
    status: { type: String, required: true },
    expectedDate: { type: String, default: "" }
  },
  
  products: { type: [String], required: true },
  productOther: { type: String, default: "" },
  
  requirement: {
    productSpecification: { type: String, default: "" },
    estimatedQuantity: { type: String, default: "" },
    currentBrand: { type: String, default: "" },
    currentPurchase: { type: String, default: "" },
    reason: { type: String, default: "" }
  },
  
  commercial: {
    requirementValue: { type: Number, default: null },
    expectedOrderValue: { type: Number, default: null },
    budget: { type: String, default: "" },
    paymentTerms: { type: String, default: "" },
    decisionMakerName: { type: String, default: "" },
    decisionMakerDesignation: { type: String, default: "" },
    decisionRole: { type: String, default: "" },
    purchaseDecisionBy: { type: String, default: "" },
    competitors: { type: String, default: "" }
  },
  
  visit: {
    visitType: { type: String, required: true },
    personMet: { type: String, default: "" },
    requirementDiscussed: { type: String, default: "" },
    photos: { type: String, required: true },
    opportunity: { type: String, required: true }
  },
  
  followUp: {
    nextAction: { type: [String], default: [] },
    nextVisitType: { type: String, default: "" },
    quotationDate: { type: String, default: "" },
    followUpDate: { type: String, required: true },
    nextActionCommitment: { type: String, default: "" }
  },
  
  remarks: { type: String, default: "" },
  
  photos: [{
    photoId: { type: String, required: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, default: 'image' },
    format: { type: String, default: 'jpg' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    originalFileName: { type: String, default: '' },
    fileName: { type: String, default: '' }, // backwards compatibility
    previewUrl: { type: String, default: '' }, // backwards compatibility
    sizeKB: { type: Number, default: 0 }, // backwards compatibility
    uploadedBy: {
      userId: { type: String, default: '' },
      firebaseUid: { type: String, default: '' },
      email: { type: String, required: true }
    },
    uploadedAt: { type: Date, default: Date.now },
    sortOrder: { type: Number, default: 0 }
  }],
  
  submissionMeta: {
    confirmedBy: { type: String, default: 'System' },
    confirmedAt: { type: Date, default: Date.now }
  },

  managerReview: {
    status: { type: String, enum: ['Pending', 'Reviewed', 'Approved', 'Rejected'], default: 'Pending' },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, default: '' }
  },

  companyKey: { type: String, index: true, default: '' },

  createdBy: {
    userId: { type: String, default: '', index: true },
    firebaseUid: { type: String, default: '', index: true },
    email: { type: String, required: true },
    name: { type: String, default: '' }
  }
}, {
  timestamps: true // adds createdAt, updatedAt
});

export const computeCompanyKey = (companyName, mobile) => {
  const normName = (companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const digits = (mobile || '').replace(/\D/g, '').slice(-10);
  if (!normName) return '';
  return digits ? `${normName}_${digits}` : normName;
};

// Auto-compute companyKey on save
inquirySchema.pre('save', function(next) {
  if (this.customer?.companyName) {
    this.companyKey = computeCompanyKey(this.customer.companyName, this.customer.mobile);
  }
  next();
});

// Indexes for common dashboard queries
inquirySchema.index({ 'customer.companyName': 1 });
inquirySchema.index({ salesPerson: 1 });
inquirySchema.index({ 'visit.opportunity': 1 });
inquirySchema.index({ 'followUp.followUpDate': 1 });
inquirySchema.index({ date: 1 });
inquirySchema.index({ status: 1 });

export const Inquiry = mongoose.model('Inquiry', inquirySchema);
