import { z } from 'zod';

export const inquirySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  salesPerson: z.string().optional().default(''),
  
  customer: z.object({
    companyName: z.string().min(1, 'Company Name is required'),
    contactPerson: z.string().min(1, 'Contact Person is required'),
    designation: z.string().optional().default(''),
    mobile: z.string().regex(/^\d{10}$/, 'Invalid mobile number format'),
    email: z.string().email('Invalid email address').or(z.literal('')),
    billingAddress: z.string().optional().default(''),
    siteLocation: z.string().min(1, 'Site Location is required'),
    gstNo: z.string().optional().default('')
  }),
  
  business: z.object({
    customerType: z.string().min(1, 'Customer Type is required'),
    customerTypeOther: z.string().optional().default(''),
    industryType: z.string().optional().default(''),
    locationGidc: z.string().optional().default(''),
    facility: z.string().min(1, 'Facility is required'),
    facilityOther: z.string().optional().default(''),
    areaSqft: z.union([z.number(), z.string().transform(val => val === '' ? null : Number(val))]).nullable().default(null),
    floors: z.union([z.number(), z.string().transform(val => val === '' ? null : Number(val))]).nullable().default(null),
    status: z.string().min(1, 'Status is required'),
    expectedDate: z.string().optional().default('')
  }),
  
  products: z.array(z.string()).min(1, 'At least one product is required'),
  productOther: z.string().optional().default(''),
  
  requirement: z.object({
    productSpecification: z.string().optional().default(''),
    estimatedQuantity: z.string().optional().default(''),
    currentBrand: z.string().optional().default(''),
    currentPurchase: z.string().optional().default(''),
    reason: z.string().optional().default('')
  }).optional().default({}),
  
  commercial: z.object({
    requirementValue: z.union([z.number(), z.string().transform(val => val === '' ? null : Number(val))]).nullable().default(null),
    expectedOrderValue: z.union([z.number(), z.string().transform(val => val === '' ? null : Number(val))]).nullable().default(null),
    budget: z.string().optional().default(''),
    paymentTerms: z.string().optional().default(''),
    decisionMakerName: z.string().optional().default(''),
    decisionMakerDesignation: z.string().optional().default(''),
    decisionRole: z.string().optional().default(''),
    purchaseDecisionBy: z.string().optional().default(''),
    competitors: z.string().optional().default('')
  }).optional().default({}),
  
  visit: z.object({
    visitType: z.string().min(1, 'Visit Type is required'),
    personMet: z.string().optional().default(''),
    requirementDiscussed: z.string().optional().default(''),
    photos: z.string().min(1, 'Photos requirement is required'),
    opportunity: z.string().min(1, 'Opportunity is required')
  }),
  
  followUp: z.object({
    nextAction: z.array(z.string()).optional().default([]),
    nextVisitType: z.string().optional().default(''),
    quotationDate: z.string().optional().default(''),
    followUpDate: z.string().min(1, 'Follow Up Date is required'),
    nextActionCommitment: z.string().optional().default('')
  }),
  
  remarks: z.string().optional().default(''),
  
  photos: z.array(z.object({
    fileName: z.string(),
    sizeKB: z.number(),
    previewUrl: z.string()
  })).optional().default([])
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
