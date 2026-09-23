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
    basement: { type: String, default: "None" },
    status: { type: String, required: true },
    expectedDate: { type: String, default: "" }
  },
  
  products: { type: [String], default: [] },
  productOther: { type: String, default: "" },
  
  requirement: {
    productSpecification: { type: String, default: "" },
    estimatedQuantity: { type: String, default: "" },
    currentBrand: { type: String, default: "" },
    currentPurchase: { type: String, default: "" },
    reason: { type: String, default: "" },
    renewalDueDate: { type: String, default: "" } // Phase 10.B: YYYY-MM-DD
  },
  
  commercial: {
    requirementValue: { type: mongoose.Schema.Types.Mixed, default: null }, // Phase 10.J: Number or bracket string
    expectedOrderValue: { type: mongoose.Schema.Types.Mixed, default: null }, // Phase 10.J: Number or bracket string
    budget: { type: String, default: "" },
    paymentTerms: { type: String, default: "" },
    decisionMakerName: { type: String, default: "" },
    decisionMakerDesignation: { type: String, default: "" },
    decisionRole: { type: String, default: "" },
    purchaseDecisionBy: { type: String, default: "" },
    competitors: { type: String, default: "" }
  },
  
  visit: {
    visitType: { type: String, default: "Site Visit" },
    personMet: { type: String, default: "" },
    requirementDiscussed: { type: String, default: "" },
    photos: { type: String, default: "Not Required" },
    opportunity: { type: String, default: "WARM" }
  },
  
  followUp: {
    nextAction: { type: [String], default: [] },
    nextVisitType: { type: String, default: "" },
    quotationDate: { type: String, default: "" },
    followUpDate: { type: String, default: "" },
    nextActionCommitment: { type: String, default: "" },
    dealStatus: { type: String, enum: ['Pending', 'Won', 'Lost'], default: 'Pending' } // Phase 10.C
  },
  
  remarks: { type: String, default: "" },
  
  photos: [{
    photoId: { type: String, default: () => crypto.randomUUID() },
    publicId: { type: String, default: '' },
    secureUrl: { type: String, default: '' },
    url: { type: String, default: '' },
    caption: { type: String, default: '' },
    latitude: { type: Number, default: null }, // Phase 10.F: optional GPS tag
    longitude: { type: Number, default: null }, // Phase 10.F: optional GPS tag
    resourceType: { type: String, default: 'image' },
    format: { type: String, default: 'jpg' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    originalFileName: { type: String, default: '' },
    fileName: { type: String, default: '' }, // backwards compatibility
    previewUrl: { type: String, default: '' }, // backwards compatibility
    sizeKB: { type: Number, default: 0 },
    uploadedBy: {
      userId: { type: String, default: '' },
      firebaseUid: { type: String, default: '' },
      email: { type: String, default: '' }
    },
    uploadedAt: { type: Date, default: Date.now },
    sortOrder: { type: Number, default: 0 }
  }],
  
  submissionMeta: {
    confirmedBy: { type: String, default: 'System' },
    confirmedAt: { type: Date, default: Date.now }
  },

  managerReview: {
    status: { type: String, enum: ['Pending', 'Reviewed', 'Needs Follow-up', 'Approved', 'Rejected'], default: 'Pending' }, // Phase 10.L
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, default: '' }
  },

  comments: [{ // Phase 10.M: Per-inquiry internal/external comment thread
    commentId: { type: String, default: () => crypto.randomUUID() },
    text: { type: String, required: true },
    author: {
      userId: { type: String, default: '' },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true }
    },
    createdAt: { type: Date, default: Date.now }
  }],

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
inquirySchema.pre('save', function() {
  if (this.customer?.companyName) {
    this.companyKey = computeCompanyKey(this.customer.companyName, this.customer.mobile);
  }
});

// Indexes for common dashboard queries
inquirySchema.index({ 'customer.companyName': 1 });
inquirySchema.index({ salesPerson: 1 });
inquirySchema.index({ 'visit.opportunity': 1 });
inquirySchema.index({ 'followUp.followUpDate': 1 });
inquirySchema.index({ date: 1 });
inquirySchema.index({ status: 1 });
inquirySchema.index({ 'requirement.renewalDueDate': 1 });
inquirySchema.index({ 'followUp.dealStatus': 1 });

export const Inquiry = mongoose.model('Inquiry', inquirySchema);
