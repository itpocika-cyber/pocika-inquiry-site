import { Inquiry } from '../models/Inquiry.js';
import { generateInquiryNumber } from '../services/inquiryNumber.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const createInquiry = async (req, res, next) => {
  try {
    const data = req.validatedBody;
    
    // Generate unique ID
    data.inquiryNumber = await generateInquiryNumber();
    
    // Force status to submitted on POST
    data.status = 'submitted';
    data.submissionMeta = {
      confirmedBy: 'System', // placeholder for future auth
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
    if (req.params.id.startsWith('PSI-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: req.params.id });
    } else {
      inquiry = await Inquiry.findById(req.params.id);
    }
    
    if (!inquiry) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Inquiry not found' }, 404);
    }

    return successResponse(res, inquiry);
  } catch (error) {
    next(error);
  }
};

export const updateInquiry = async (req, res, next) => {
  try {
    // Only allow specific fields to be updated in this phase.
    const allowedUpdates = ['visit.opportunity', 'followUp.nextAction', 'followUp.followUpDate', 'remarks', 'status'];
    const updateData = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    let inquiry = null;
    if (req.params.id.startsWith('PSI-')) {
      inquiry = await Inquiry.findOneAndUpdate({ inquiryNumber: req.params.id }, { $set: updateData }, { new: true });
    } else {
      inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    }

    if (!inquiry) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Inquiry not found' }, 404);
    }

    return successResponse(res, inquiry);
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Total count
    const total = await Inquiry.countDocuments({ status: 'submitted' });
    
    // Today count
    const today = await Inquiry.countDocuments({ date: todayStr, status: 'submitted' });
    
    // Hot count
    const hot = await Inquiry.countDocuments({ 'visit.opportunity': 'HOT', status: 'submitted' });
    
    // Pending Follow-ups
    const pendingFollowUps = await Inquiry.countDocuments({
      'followUp.followUpDate': { $gte: todayStr },
      status: 'submitted'
    });

    return successResponse(res, {
      total,
      today,
      hot,
      pendingFollowUps
    });
  } catch (error) {
    next(error);
  }
};
