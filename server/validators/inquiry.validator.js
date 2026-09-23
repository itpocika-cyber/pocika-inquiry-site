import { z } from 'zod';

// Helper for numeric fields that could be empty string, null, undefined, or formatted string
const coerceToNullableNumber = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}, z.number().nullable().optional().default(null));

// Helper for optional strings that defaults to empty string and trims whitespace
const optionalTrimmedString = z.preprocess(
  (val) => (val === null || val === undefined ? '' : String(val).trim()),
  z.string().default('')
);

export const inquirySchema = z.object({
  date: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Date is required')),
  salesPerson: optionalTrimmedString,
  status: z.enum(['draft', 'submitted']).optional().default('submitted'),
  
  customer: z.object({
    companyName: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Company Name is required')),
    contactPerson: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Contact Person is required')),
    designation: optionalTrimmedString,
    mobile: z.preprocess((val) => {
      if (!val) return '';
      let clean = String(val).replace(/[\s-]/g, '');
      if (clean.startsWith('+91')) clean = clean.substring(3);
      if (clean.startsWith('0') && clean.length === 11) clean = clean.substring(1);
      return clean;
    }, z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits')),
    email: z.preprocess((val) => (val === null || val === undefined ? '' : String(val).trim()), z.string().email('Invalid email address').or(z.literal(''))).optional().default(''),
    billingAddress: optionalTrimmedString,
    siteLocation: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Site Location is required')),
    gstNo: optionalTrimmedString
  }),
  
  business: z.object({
    customerType: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Customer Type is required')),
    customerTypeOther: optionalTrimmedString,
    industryType: optionalTrimmedString,
    locationGidc: optionalTrimmedString,
    facility: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Facility is required')),
    facilityOther: optionalTrimmedString,
    areaSqft: coerceToNullableNumber,
    floors: coerceToNullableNumber,
    basement: optionalTrimmedString,
    status: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Status is required')),
    expectedDate: optionalTrimmedString
  }),
  
  products: z.preprocess((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [String(val)];
  }, z.array(z.string()).optional().default([])),
  productOther: optionalTrimmedString,
  
  requirement: z.object({
    productSpecification: optionalTrimmedString,
    estimatedQuantity: optionalTrimmedString,
    currentBrand: optionalTrimmedString,
    currentPurchase: optionalTrimmedString,
    reason: optionalTrimmedString,
    renewalDueDate: optionalTrimmedString
  }).optional().default({}),
  
  commercial: z.object({
    requirementValue: z.union([z.number(), z.string()]).nullable().optional(),
    expectedOrderValue: z.union([z.number(), z.string()]).nullable().optional(),
    budget: optionalTrimmedString,
    paymentTerms: optionalTrimmedString,
    decisionMakerName: optionalTrimmedString,
    decisionMakerDesignation: optionalTrimmedString,
    decisionRole: optionalTrimmedString,
    purchaseDecisionBy: optionalTrimmedString,
    competitors: optionalTrimmedString
  }).optional().default({}),
  
  visit: z.object({
    visitType: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Visit Type is required')),
    personMet: optionalTrimmedString,
    requirementDiscussed: optionalTrimmedString,
    photos: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Photos requirement is required')),
    opportunity: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Opportunity is required'))
  }),
  
  followUp: z.object({
    nextAction: z.preprocess((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return [String(val)];
    }, z.array(z.string()).default([])),
    nextVisitType: optionalTrimmedString,
    quotationDate: optionalTrimmedString,
    followUpDate: z.preprocess((val) => String(val || '').trim(), z.string().min(1, 'Follow Up Date is required')),
    nextActionCommitment: optionalTrimmedString,
    dealStatus: z.enum(['Pending', 'Won', 'Lost']).optional().default('Pending')
  }),
  
  remarks: optionalTrimmedString,
  
  photos: z.array(z.record(z.any())).optional().default([])
});

export const updateInquirySchema = inquirySchema.partial().passthrough().extend({
  followUp: z.object({
    nextAction: z.preprocess((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return [String(val)];
    }, z.array(z.string()).default([])).optional(),
    nextVisitType: optionalTrimmedString,
    quotationDate: optionalTrimmedString,
    followUpDate: optionalTrimmedString,
    nextActionCommitment: optionalTrimmedString,
    dealStatus: z.enum(['Pending', 'Won', 'Lost']).optional()
  }).optional(),
  managerReview: z.object({
    status: z.enum(['Pending', 'Reviewed', 'Needs Follow-up', 'Approved', 'Rejected']).optional(),
    remarks: optionalTrimmedString,
    reviewedBy: optionalTrimmedString
  }).optional()
});

export const validateInquiry = (req, res, next) => {
  try {
    const validatedData = inquirySchema.parse(req.body);
    req.validatedBody = validatedData; // attach clean data to request
    next();
  } catch (error) {
    next(error); // pass to errorHandler which handles ZodError
  }
};

export const validateInquiryUpdate = (req, res, next) => {
  try {
    const validatedData = updateInquirySchema.parse(req.body);
    req.validatedBody = validatedData;
    next();
  } catch (error) {
    next(error);
  }
};


