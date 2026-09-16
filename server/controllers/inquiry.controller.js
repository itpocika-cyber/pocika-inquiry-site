import { Inquiry } from '../models/Inquiry.js';
import { generateInquiryNumber } from '../services/inquiryNumber.service.js';
import { generateOptimizedUrls } from '../config/cloudinary.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const createInquiry = async (req, res, next) => {
  try {
    const data = { ...req.validatedBody };
    
    // Server-authoritative fields (prevent mass assignment)
    data.inquiryNumber = await generateInquiryNumber();
    data.status = 'submitted';
    
    // Server-assigned ownership
    data.createdBy = {
      firebaseUid: req.user.firebaseUid,
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
      query['createdBy.firebaseUid'] = req.user.firebaseUid;
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
      if (inquiry.createdBy?.firebaseUid && inquiry.createdBy.firebaseUid !== req.user.firebaseUid) {
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
      if (inquiry.createdBy?.firebaseUid && inquiry.createdBy.firebaseUid !== req.user.firebaseUid) {
        return errorResponse(res, {
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to modify this inquiry.'
        }, 403);
      }
    }

    // Strict allowlist of updatable fields (mass assignment protection)
    const allowedUpdates = ['visit.opportunity', 'followUp.nextAction', 'followUp.followUpDate', 'remarks'];
    
    // Only Admin/Super Admin can update status
    if (['admin', 'super_admin', 'manager'].includes(req.user.role)) {
      allowedUpdates.push('status');
    }

    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      inquiry._id,
      { $set: updateData },
      { new: true, runValidators: true }
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
      baseQuery['createdBy.firebaseUid'] = req.user.firebaseUid;
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
