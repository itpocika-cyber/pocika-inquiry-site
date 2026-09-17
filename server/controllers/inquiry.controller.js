import { Inquiry } from '../models/Inquiry.js';
import { generateInquiryNumber } from '../services/inquiryNumber.service.js';
import { generateOptimizedUrls } from '../config/cloudinary.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generateInquiryPdf } from '../services/pdf.service.js';

export const createInquiry = async (req, res, next) => {
  try {
    const data = { ...req.validatedBody };
    
    // Server-authoritative fields (prevent mass assignment)
    data.inquiryNumber = await generateInquiryNumber();
    data.status = 'submitted';
    
    // Server-assigned ownership
    data.createdBy = {
      userId: req.user.id,
      firebaseUid: req.user.firebaseUid || req.user.id,
      email: req.user.email,
      name: req.user.displayName || req.user.email
    };

    // Authoritative salesperson identity from logged-in session
    data.salesPerson = req.user.displayName || req.user.email;

    data.submissionMeta = {
      confirmedBy: req.user.displayName || req.user.email,
      confirmedAt: new Date()
    };
    
    const newInquiry = await Inquiry.create(data);
    
    return successResponse(res, newInquiry, 201);
  } catch (error) {
    next(error);
  }
};

export const getInquiries = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // max 100
    const skip = (page - 1) * limit;

    // Filters & Search
    const query = {};
    
    // Server-Side Authorization Scope
    // Salespersons can only access their own inquiries
    if (req.user.role === 'sales_person') {
      query.$or = [
        { 'createdBy.userId': req.user.id },
        { 'createdBy.firebaseUid': req.user.firebaseUid || req.user.id },
        { 'createdBy.email': req.user.email }
      ];
    } else if (req.query.salesPerson) {
      // Admins/Managers can optionally filter by salesperson
      query.salesPerson = req.query.salesPerson;
    }

    // Search across multiple text fields
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { inquiryNumber: searchRegex },
        { 'customer.companyName': searchRegex },
        { 'customer.contactPerson': searchRegex },
        { 'customer.siteLocation': searchRegex }
      ];
    }

    if (req.query.opportunity) {
      query['visit.opportunity'] = req.query.opportunity;
    }
    
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Sorting
    let sortObj = { date: -1 }; // default newest
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest': sortObj = { date: -1 }; break;
        case 'oldest': sortObj = { date: 1 }; break;
        case 'followup': sortObj = { 'followUp.followUpDate': 1 }; break;
        default: sortObj = { date: -1 }; break;
      }
    }

    const items = await Inquiry.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const total = await Inquiry.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return successResponse(res, {
      items,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const getInquiryById = async (req, res, next) => {
  try {
    // Attempt lookup by MongoDB _id or inquiryNumber
    let inquiry = null;
    if (req.params.id.startsWith('PSI-') || req.params.id.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: req.params.id });
    } else {
      inquiry = await Inquiry.findById(req.params.id);
    }
    
    if (!inquiry) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Inquiry not found' }, 404);
    }

    // Authorization check: Salesperson can only view their own inquiries
    if (req.user.role === 'sales_person') {
      const isOwner =
        (inquiry.createdBy?.userId && inquiry.createdBy.userId === req.user.id) ||
        (inquiry.createdBy?.firebaseUid && inquiry.createdBy.firebaseUid === req.user.firebaseUid) ||
        (inquiry.createdBy?.email && inquiry.createdBy.email === req.user.email);
      if (!isOwner) {
        return errorResponse(res, {
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to view this inquiry.'
        }, 403);
      }
    }

    const inquiryObj = inquiry.toObject();
    if (inquiryObj.photos && inquiryObj.photos.length > 0) {
      inquiryObj.photos = inquiryObj.photos.map(p => ({
        ...p,
        optimizedUrls: generateOptimizedUrls(p.publicId, p.secureUrl)
      }));
    }

    return successResponse(res, inquiryObj);
  } catch (error) {
    next(error);
  }
};

export const updateInquiry = async (req, res, next) => {
  try {
    // Lookup inquiry first to check permissions
    let inquiry = null;
    if (req.params.id.startsWith('PSI-') || req.params.id.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: req.params.id });
    } else {
      inquiry = await Inquiry.findById(req.params.id);
    }

    if (!inquiry) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Inquiry not found' }, 404);
    }

    // Authorization check: Salesperson can only update their own inquiries
    if (req.user.role === 'sales_person') {
      const isOwner =
        (inquiry.createdBy?.userId && inquiry.createdBy.userId === req.user.id) ||
        (inquiry.createdBy?.firebaseUid && inquiry.createdBy.firebaseUid === req.user.firebaseUid) ||
        (inquiry.createdBy?.email && inquiry.createdBy.email === req.user.email);
      if (!isOwner) {
        return errorResponse(res, {
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to modify this inquiry.'
        }, 403);
      }
    }

    const updateData = {};

    // Support both dot-notation and nested object structures
    if (req.body['requirement.productSpecification'] !== undefined) {
      updateData['requirement.productSpecification'] = req.body['requirement.productSpecification'];
    } else if (req.body.requirement?.productSpecification !== undefined) {
      updateData['requirement.productSpecification'] = req.body.requirement.productSpecification;
    }

    if (req.body['requirement.estimatedQuantity'] !== undefined) {
      updateData['requirement.estimatedQuantity'] = req.body['requirement.estimatedQuantity'];
    } else if (req.body.requirement?.estimatedQuantity !== undefined) {
      updateData['requirement.estimatedQuantity'] = req.body.requirement.estimatedQuantity;
    }

    if (req.body['commercial.expectedOrderValue'] !== undefined) {
      const num = Number(req.body['commercial.expectedOrderValue']);
      updateData['commercial.expectedOrderValue'] = isNaN(num) ? null : num;
    } else if (req.body.commercial?.expectedOrderValue !== undefined) {
      const num = Number(req.body.commercial.expectedOrderValue);
      updateData['commercial.expectedOrderValue'] = isNaN(num) ? null : num;
    }

    if (req.body['commercial.requirementValue'] !== undefined) {
      const num = Number(req.body['commercial.requirementValue']);
      updateData['commercial.requirementValue'] = isNaN(num) ? null : num;
    } else if (req.body.commercial?.requirementValue !== undefined) {
      const num = Number(req.body.commercial.requirementValue);
      updateData['commercial.requirementValue'] = isNaN(num) ? null : num;
    }

    if (req.body['visit.opportunity'] !== undefined) {
      updateData['visit.opportunity'] = req.body['visit.opportunity'];
    } else if (req.body.visit?.opportunity !== undefined) {
      updateData['visit.opportunity'] = req.body.visit.opportunity;
    }

    if (req.body['followUp.nextAction'] !== undefined) {
      updateData['followUp.nextAction'] = Array.isArray(req.body['followUp.nextAction']) ? req.body['followUp.nextAction'] : [req.body['followUp.nextAction']];
    } else if (req.body.followUp?.nextAction !== undefined) {
      updateData['followUp.nextAction'] = Array.isArray(req.body.followUp.nextAction) ? req.body.followUp.nextAction : [req.body.followUp.nextAction];
    }

    if (req.body['followUp.followUpDate'] !== undefined) {
      updateData['followUp.followUpDate'] = req.body['followUp.followUpDate'];
    } else if (req.body.followUp?.followUpDate !== undefined) {
      updateData['followUp.followUpDate'] = req.body.followUp.followUpDate;
    }

    if (req.body.remarks !== undefined) {
      updateData.remarks = req.body.remarks;
    }

    // Only Admin/Super Admin/Manager can update status and managerReview
    if (['admin', 'super_admin', 'manager'].includes(req.user.role)) {
      if (req.body.status !== undefined) {
        updateData.status = req.body.status;
      }
      if (req.body.managerReview !== undefined) {
        updateData.managerReview = {
          ...inquiry.managerReview?.toObject(),
          ...req.body.managerReview,
          reviewedBy: req.user.displayName || req.user.email,
          reviewedAt: new Date()
        };
      }
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      inquiry._id,
      { $set: updateData },
      { new: true, returnDocument: 'after', runValidators: true }
    );

    return successResponse(res, updatedInquiry);
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const baseQuery = { status: 'submitted' };
    
    // Scope summary to salesperson's inquiries if user is sales_person
    if (req.user.role === 'sales_person') {
      baseQuery.$or = [
        { 'createdBy.userId': req.user.id },
        { 'createdBy.firebaseUid': req.user.firebaseUid || req.user.id },
        { 'createdBy.email': req.user.email }
      ];
    }
    
    // Total count
    const total = await Inquiry.countDocuments(baseQuery);
    
    // Today count
    const today = await Inquiry.countDocuments({ ...baseQuery, date: todayStr });
    
    // Hot count
    const hot = await Inquiry.countDocuments({ ...baseQuery, 'visit.opportunity': 'HOT' });

    // Warm count
    const warm = await Inquiry.countDocuments({ ...baseQuery, 'visit.opportunity': 'WARM' });

    // Pending Follow-ups
    const pendingFollowUps = await Inquiry.countDocuments({
      ...baseQuery,
      'followUp.followUpDate': { $gte: todayStr }
    });

    // Quotes count
    const quotes = await Inquiry.countDocuments({
      ...baseQuery,
      $or: [
        { 'followUp.nextAction': { $in: ['Submit Quotation', 'Send Quote', 'Quotation'] } },
        { 'followUp.quotationDate': { $ne: '' } }
      ]
    });

    return successResponse(res, {
      total,
      today,
      hot,
      warm,
      pendingFollowUps,
      quotes
    });
  } catch (error) {
    next(error);
  }
};

export const downloadInquiryPdf = async (req, res, next) => {
  try {
    // 1. Fetch inquiry (using same logic as getInquiryById for consistency & security)
    let inquiry = null;
    if (req.params.id.startsWith('PSI-') || req.params.id.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: req.params.id });
    } else {
      inquiry = await Inquiry.findById(req.params.id);
    }
    
    if (!inquiry) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Inquiry not found' }, 404);
    }

    // 2. Enforce Authorization Role Scoping
    if (req.user.role === 'sales_person') {
      const isOwner =
        (inquiry.createdBy?.userId && inquiry.createdBy.userId === req.user.id) ||
        (inquiry.createdBy?.firebaseUid && inquiry.createdBy.firebaseUid === req.user.firebaseUid) ||
        (inquiry.createdBy?.email && inquiry.createdBy.email === req.user.email);
      if (!isOwner) {
        return errorResponse(res, {
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to view this inquiry PDF.'
        }, 403);
      }
    }

    const inquiryObj = inquiry.toObject();
    
    // Convert to optimized URLs for PDF rendering to save memory
    if (inquiryObj.photos && inquiryObj.photos.length > 0) {
      inquiryObj.photos = inquiryObj.photos.map(p => ({
        ...p,
        optimizedUrls: generateOptimizedUrls(p.publicId, p.secureUrl)
      }));
    }

    // 3. Generate PDF Buffer
    const pdfBuffer = await generateInquiryPdf(inquiryObj);

    // 4. Send Response
    const safeFilename = `POCIKA-Inquiry-${inquiryObj.inquiryNumber || 'Document'}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeFilename}"`,
      'Content-Length': pdfBuffer.length,
      // Prevent caching of PDFs containing sensitive PII
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
};
