import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { Inquiry, computeCompanyKey } from '../models/Inquiry.js';
import { generateInquiryNumber } from '../services/inquiryNumber.service.js';
import { generateOptimizedUrls } from '../config/cloudinary.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generateInquiryPdf, generateInquiryHtml } from '../services/pdf.service.js';

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

    // Deal Status Filter (Phase 10.C)
    if (req.query.dealStatus) {
      query['followUp.dealStatus'] = req.query.dealStatus;
    }

    // Manager Review Status Filter (Phase 10.L)
    if (req.query.managerStatus) {
      query['managerReview.status'] = req.query.managerStatus;
    }

    // Renewal Due Date Filter (Phase 10.B)
    if (req.query.renewalsDueInDays) {
      const days = parseInt(req.query.renewalsDueInDays, 10) || 30;
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
      query['requirement.renewalDueDate'] = { $gte: today, $lte: future };
    } else if (req.query.hasRenewal === 'true') {
      query['requirement.renewalDueDate'] = { $exists: true, $nin: ['', null] };
    }

    // Stale Leads Filter (Phase 10.E: followUpDate < today and dealStatus is Pending)
    if (req.query.isStale === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query['followUp.followUpDate'] = { $lt: today };
      query['followUp.dealStatus'] = { $in: ['Pending', null, ''] };
      query.status = 'submitted';
    }

    // Follow-up Date Filters
    if (req.query.hasFollowUp === 'true') {
      query['followUp.followUpDate'] = { $exists: true, $nin: ['', null] };
    }
    if (req.query.followUpFrom || req.query.followUpTo) {
      query['followUp.followUpDate'] = query['followUp.followUpDate'] || {};
      if (req.query.followUpFrom) query['followUp.followUpDate'].$gte = req.query.followUpFrom;
      if (req.query.followUpTo) query['followUp.followUpDate'].$lte = req.query.followUpTo;
    }

    // Sorting
    let sortObj = { date: -1 }; // default newest
    if (req.query.sortBy === 'nextFollowUpDate' || req.query.sort === 'followup') {
      sortObj = { 'followUp.followUpDate': 1 };
    } else if (req.query.sortBy === 'renewalDueDate') {
      sortObj = { 'requirement.renewalDueDate': 1 };
    } else if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest': sortObj = { date: -1 }; break;
        case 'oldest': sortObj = { date: 1 }; break;
        case 'followup': sortObj = { 'followUp.followUpDate': 1 }; break;
        case 'renewal': sortObj = { 'requirement.renewalDueDate': 1 }; break;
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
      inquiries: items,
      total,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Company History & Prior Visits Lookup
 */
export const getCompanyHistory = async (req, res, next) => {
  try {
    const { companyName, mobile, excludeId } = req.query;
    if (!companyName && !mobile) {
      return successResponse(res, { priorVisits: [], totalPriorVisits: 0, otherTeamVisitsCount: 0 });
    }

    const key = computeCompanyKey(companyName, mobile);
    const normName = (companyName || '').toLowerCase().trim();

    const matchConditions = [];
    if (key) matchConditions.push({ companyKey: key });
    if (normName && normName.length >= 3) {
      matchConditions.push({ 'customer.companyName': new RegExp(normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
    }
    if (mobile) {
      const digits = String(mobile).replace(/\D/g, '').slice(-10);
      if (digits.length >= 8) {
        matchConditions.push({ 'customer.mobile': new RegExp(digits) });
      }
    }

    if (matchConditions.length === 0) {
      return successResponse(res, { priorVisits: [], totalPriorVisits: 0, otherTeamVisitsCount: 0 });
    }

    const query = { $or: matchConditions };
    if (excludeId) {
      query._id = { $ne: excludeId };
      query.inquiryNumber = { $ne: excludeId };
    }

    const allMatches = await Inquiry.find(query).sort({ date: -1, createdAt: -1 });

    const isAdmin = ['admin', 'super_admin', 'manager'].includes(req.user.role);

    const accessibleVisits = [];
    let otherTeamVisitsCount = 0;

    allMatches.forEach((inq) => {
      const isOwn = (
        (inq.createdBy?.userId && String(inq.createdBy.userId) === String(req.user.id)) ||
        (inq.createdBy?.email && inq.createdBy.email.toLowerCase() === req.user.email.toLowerCase())
      );

      if (isAdmin || isOwn) {
        accessibleVisits.push({
          id: inq._id,
          inquiryNumber: inq.inquiryNumber,
          date: inq.date,
          salesPerson: inq.salesPerson || inq.createdBy?.name || 'Sales Representative',
          opportunity: inq.visit?.opportunity || 'HOT',
          visitType: inq.visit?.visitType || 'Site Visit',
          nextAction: inq.followUp?.nextAction || [],
          followUpDate: inq.followUp?.followUpDate || '',
          isOwn: isOwn
        });
      } else {
        otherTeamVisitsCount++;
      }
    });

    return successResponse(res, {
      priorVisits: accessibleVisits,
      totalPriorVisits: allMatches.length,
      otherTeamVisitsCount: otherTeamVisitsCount,
      mostRecent: allMatches.length > 0 ? {
        date: allMatches[0].date,
        salesPerson: allMatches[0].salesPerson || allMatches[0].createdBy?.name || 'Sales Representative',
        opportunity: allMatches[0].visit?.opportunity || 'HOT'
      } : null
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

    // Authorization check: Only Admin, Super Admin, or Manager can edit submitted inquiries
    if (!['admin', 'super_admin', 'manager'].includes(req.user.role)) {
      return errorResponse(res, {
        code: 'FORBIDDEN',
        message: 'Access denied. Only administrators and managers can edit submitted inquiries.'
      }, 403);
    }

    const updateData = {};

    // 1. Customer Details
    const customerFields = ['companyName', 'contactPerson', 'designation', 'mobile', 'email', 'gstNo', 'billingAddress', 'siteLocation'];
    customerFields.forEach((field) => {
      const dotKey = `customer.${field}`;
      if (req.body[dotKey] !== undefined) {
        updateData[dotKey] = req.body[dotKey];
      } else if (req.body.customer?.[field] !== undefined) {
        updateData[dotKey] = req.body.customer[field];
      }
    });

    // Update companyKey if companyName or mobile changed
    const newCompName = updateData['customer.companyName'] !== undefined ? updateData['customer.companyName'] : inquiry.customer?.companyName;
    const newMobile = updateData['customer.mobile'] !== undefined ? updateData['customer.mobile'] : inquiry.customer?.mobile;
    if (updateData['customer.companyName'] !== undefined || updateData['customer.mobile'] !== undefined) {
      updateData.companyKey = computeCompanyKey(newCompName, newMobile);
    }

    // 2. Business Details
    const businessFields = ['customerType', 'customerTypeOther', 'industryType', 'locationGidc', 'facility', 'facilityOther', 'status', 'areaSqFt', 'floors'];
    businessFields.forEach((field) => {
      const dotKey = `business.${field}`;
      if (req.body[dotKey] !== undefined) {
        updateData[dotKey] = req.body[dotKey];
      } else if (req.body.business?.[field] !== undefined) {
        updateData[dotKey] = req.body.business[field];
      }
    });

    // 3. Products
    if (req.body.products !== undefined) {
      updateData.products = Array.isArray(req.body.products) ? req.body.products : [req.body.products];
    }

    // 4. Requirement Details
    const requirementFields = ['productSpecification', 'estimatedQuantity', 'renewalDueDate', 'reason', 'currentPurchase', 'existingBrand'];
    requirementFields.forEach((field) => {
      const dotKey = `requirement.${field}`;
      if (req.body[dotKey] !== undefined) {
        updateData[dotKey] = req.body[dotKey];
      } else if (req.body.requirement?.[field] !== undefined) {
        updateData[dotKey] = req.body.requirement[field];
      }
    });

    // 5. Commercial Details
    const commercialFields = ['expectedOrderValue', 'requirementValue', 'budget', 'paymentTerms', 'competitors', 'decisionMakerName', 'decisionMakerDesignation', 'decisionRole', 'purchaseDecisionBy'];
    commercialFields.forEach((field) => {
      const dotKey = `commercial.${field}`;
      if (req.body[dotKey] !== undefined) {
        updateData[dotKey] = req.body[dotKey];
      } else if (req.body.commercial?.[field] !== undefined) {
        updateData[dotKey] = req.body.commercial[field];
      }
    });

    // 6. Visit Details
    const visitFields = ['visitType', 'personMet', 'requirementDiscussed', 'opportunity', 'photos'];
    visitFields.forEach((field) => {
      const dotKey = `visit.${field}`;
      if (req.body[dotKey] !== undefined) {
        updateData[dotKey] = req.body[dotKey];
      } else if (req.body.visit?.[field] !== undefined) {
        updateData[dotKey] = req.body.visit[field];
      }
    });

    // 7. Follow-up Details
    const followUpFields = ['dealStatus', 'nextAction', 'quotationDate', 'nextVisitType', 'followUpDate', 'nextActionCommitment'];
    followUpFields.forEach((field) => {
      const dotKey = `followUp.${field}`;
      if (req.body[dotKey] !== undefined) {
        if (field === 'nextAction') {
          updateData[dotKey] = Array.isArray(req.body[dotKey]) ? req.body[dotKey] : [req.body[dotKey]];
        } else {
          updateData[dotKey] = req.body[dotKey];
        }
      } else if (req.body.followUp?.[field] !== undefined) {
        if (field === 'nextAction') {
          updateData[dotKey] = Array.isArray(req.body.followUp[field]) ? req.body.followUp[field] : [req.body.followUp[field]];
        } else {
          updateData[dotKey] = req.body.followUp[field];
        }
      }
    });

    // 8. Remarks
    if (req.body.remarks !== undefined) {
      updateData.remarks = req.body.remarks;
    }

    // 9. Manager Review
    if (['admin', 'super_admin', 'manager'].includes(req.user.role)) {
      if (req.body.status !== undefined) {
        updateData.status = req.body.status;
      }
      if (req.body.managerReview !== undefined) {
        updateData.managerReview = {
          ...inquiry.managerReview?.toObject(),
          ...req.body.managerReview,
          reviewedBy: req.user.displayName || req.user.name || req.user.email,
          reviewedAt: new Date()
        };
      }
    }

    // Auto-log audit comment
    const auditComment = {
      commentId: crypto.randomUUID(),
      text: `Inquiry details updated by ${req.user.displayName || req.user.name || req.user.email} (${req.user.role}).`,
      author: {
        userId: req.user.id || '',
        name: req.user.displayName || req.user.name || 'Admin',
        email: req.user.email,
        role: req.user.role
      },
      createdAt: new Date()
    };

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      inquiry._id,
      {
        $set: updateData,
        $push: { comments: auditComment }
      },
      { new: true, returnDocument: 'after', runValidators: false }
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

    // Phase 10.C & 10.H: Current Month KPIs & Conversion Tracking
    const monthStartStr = todayStr.substring(0, 7) + '-01';
    const monthQuery = { ...baseQuery, date: { $gte: monthStartStr } };

    const totalThisMonth = await Inquiry.countDocuments(monthQuery);
    const hotThisMonth = await Inquiry.countDocuments({ ...monthQuery, 'visit.opportunity': 'HOT' });
    const wonThisMonth = await Inquiry.countDocuments({ ...monthQuery, 'followUp.dealStatus': 'Won' });
    const lostThisMonth = await Inquiry.countDocuments({ ...monthQuery, 'followUp.dealStatus': 'Lost' });
    const pendingThisMonth = await Inquiry.countDocuments({
      ...monthQuery,
      $or: [{ 'followUp.dealStatus': 'Pending' }, { 'followUp.dealStatus': { $exists: false } }, { 'followUp.dealStatus': null }]
    });
    const closedThisMonth = wonThisMonth + lostThisMonth;
    const conversionRate = closedThisMonth > 0 ? Math.round((wonThisMonth / closedThisMonth) * 100) : 0;

    // Phase 10.B: Renewals Due Soon (next 30 days)
    const in30DaysStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const renewalsDueSoon = await Inquiry.countDocuments({
      ...baseQuery,
      'requirement.renewalDueDate': { $gte: todayStr, $lte: in30DaysStr }
    });

    // Phase 10.E: Stale Leads Count (overdue & pending deal status)
    const staleLeadsCount = await Inquiry.countDocuments({
      ...baseQuery,
      'followUp.followUpDate': { $lt: todayStr },
      'followUp.dealStatus': { $in: ['Pending', null, ''] }
    });

    // Phase 10.D: Sales Performance Summary (Admin/Manager only)
    let salesPerformance = [];
    if (['admin', 'super_admin', 'manager'].includes(req.user.role)) {
      const perfAgg = await Inquiry.aggregate([
        { $match: { status: 'submitted', date: { $gte: monthStartStr } } },
        {
          $group: {
            _id: { $ifNull: ['$salesPerson', 'Unknown'] },
            total: { $sum: 1 },
            hot: {
              $sum: { $cond: [{ $eq: ['$visit.opportunity', 'HOT'] }, 1, 0] }
            },
            won: {
              $sum: { $cond: [{ $eq: ['$followUp.dealStatus', 'Won'] }, 1, 0] }
            }
          }
        },
        { $sort: { total: -1, won: -1 } }
      ]);
      salesPerformance = perfAgg.map(p => ({
        name: p._id,
        total: p.total,
        hot: p.hot,
        won: p.won
      }));
    }

    return successResponse(res, {
      total,
      today,
      hot,
      warm,
      pendingFollowUps,
      quotes,
      // Phase 10 additions
      thisMonth: {
        total: totalThisMonth,
        hot: hotThisMonth,
        won: wonThisMonth,
        lost: lostThisMonth,
        pending: pendingThisMonth,
        conversionRate
      },
      renewalsDueSoon,
      staleLeadsCount,
      salesPerformance
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

    // 3. Generate PDF Buffer (with resilient printable HTML fallback)
    try {
      const pdfBuffer = await generateInquiryPdf(inquiryObj);
      const isDownload = req.query.download === 'true' || req.query.download === '1';
      const disposition = isDownload ? 'attachment' : 'inline';
      const safeFilename = `POCIKA-Inquiry-${inquiryObj.inquiryNumber || 'Document'}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${safeFilename}"`,
        'Content-Length': pdfBuffer.length,
        // Prevent caching of PDFs containing sensitive PII
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      return res.send(pdfBuffer);
    } catch (pdfError) {
      console.error('Direct PDF binary generation error:', pdfError);
      return errorResponse(res, {
        code: 'PDF_GENERATION_FAILED',
        message: `Failed to generate inquiry PDF: ${pdfError.message}`
      }, 500);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 10.M: Add a comment to an inquiry thread
 */
export const addInquiryComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return errorResponse(res, { code: 'VALIDATION_ERROR', message: 'Comment text is required' }, 400);
    }

    let inquiry = null;
    if (id.startsWith('PSI-') || id.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: id });
    } else {
      inquiry = await Inquiry.findById(id);
    }

    if (!inquiry) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Inquiry not found' }, 404);
    }

    // Salesperson can only comment on their own inquiry, admin/manager can comment on any
    if (req.user.role === 'sales_person') {
      const isOwner =
        (inquiry.createdBy?.userId && inquiry.createdBy.userId === req.user.id) ||
        (inquiry.createdBy?.firebaseUid && inquiry.createdBy.firebaseUid === req.user.firebaseUid) ||
        (inquiry.createdBy?.email && inquiry.createdBy.email.toLowerCase() === req.user.email.toLowerCase());
      if (!isOwner) {
        return errorResponse(res, { code: 'FORBIDDEN', message: 'Access denied. You do not have permission to comment on this inquiry.' }, 403);
      }
    }

    const newComment = {
      commentId: crypto.randomUUID(),
      text: text.trim(),
      author: {
        userId: req.user.id,
        name: req.user.displayName || req.user.email,
        email: req.user.email,
        role: req.user.role
      },
      createdAt: new Date()
    };

    inquiry.comments.push(newComment);
    await inquiry.save();

    return successResponse(res, { comment: newComment, comments: inquiry.comments }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 10.H: Export Inquiries to Excel (.xlsx) with Active Filters
 */
export const exportInquiriesExcel = async (req, res, next) => {
  try {
    // Only Admin / Manager can export Excel report
    if (!['admin', 'super_admin', 'manager'].includes(req.user.role)) {
      return errorResponse(res, { code: 'FORBIDDEN', message: 'Access denied. Only administrators can export reports.' }, 403);
    }

    // Build query respecting filters (identical to getInquiries)
    const query = {};
    if (req.query.salesPerson) {
      query.salesPerson = req.query.salesPerson;
    }
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
    if (req.query.dealStatus) {
      query['followUp.dealStatus'] = req.query.dealStatus;
    }
    if (req.query.renewalsDueInDays) {
      const days = parseInt(req.query.renewalsDueInDays, 10) || 30;
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
      query['requirement.renewalDueDate'] = { $gte: today, $lte: future };
    }
    if (req.query.followUpFrom || req.query.followUpTo) {
      query['followUp.followUpDate'] = query['followUp.followUpDate'] || {};
      if (req.query.followUpFrom) query['followUp.followUpDate'].$gte = req.query.followUpFrom;
      if (req.query.followUpTo) query['followUp.followUpDate'].$lte = req.query.followUpTo;
    }

    const items = await Inquiry.find(query).sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POCIKA Fire & Safety Products LLP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inquiries Report', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Inquiry No.', key: 'inquiryNumber', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Salesperson', key: 'salesPerson', width: 22 },
      { header: 'Company Name', key: 'companyName', width: 28 },
      { header: 'Contact Person', key: 'contactPerson', width: 20 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'Site Location', key: 'siteLocation', width: 24 },
      { header: 'Products Selected', key: 'products', width: 30 },
      { header: 'Opportunity', key: 'opportunity', width: 16 },
      { header: 'Deal Status', key: 'dealStatus', width: 14 },
      { header: 'Next Follow-up Date', key: 'followUpDate', width: 18 },
      { header: 'Manager Review', key: 'managerReview', width: 18 },
      { header: 'Approx Req Value', key: 'requirementValue', width: 18 },
      { header: 'Expected Order Value', key: 'expectedOrderValue', width: 20 }
    ];

    // Style Header Row (POCIKA brand crimson with bold white text)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF991B1B' } // POCIKA brand red
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    items.forEach((inq) => {
      const row = sheet.addRow({
        inquiryNumber: inq.inquiryNumber,
        date: inq.date,
        salesPerson: inq.salesPerson || inq.createdBy?.name || '-',
        companyName: inq.customer?.companyName || '-',
        contactPerson: inq.customer?.contactPerson || '-',
        mobile: inq.customer?.mobile || '-',
        siteLocation: inq.customer?.siteLocation || '-',
        products: (inq.products || []).join(', '),
        opportunity: inq.visit?.opportunity || '-',
        dealStatus: inq.followUp?.dealStatus || 'Pending',
        followUpDate: inq.followUp?.followUpDate || '-',
        managerReview: inq.managerReview?.status || 'Pending',
        requirementValue: inq.commercial?.requirementValue || '-',
        expectedOrderValue: inq.commercial?.expectedOrderValue || '-'
      });
      row.alignment = { vertical: 'middle' };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="POCIKA-Inquiries-Report-${dateStr}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
