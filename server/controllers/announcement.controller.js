import { Announcement } from '../models/Announcement.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const query = {};
    // Salespeople only see active announcements
    if (req.user.role === 'sales_person' || req.query.activeOnly === 'true') {
      query.isActive = true;
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    return successResponse(res, { announcements, total: announcements.length });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, priority } = req.body;
    if (!title || !title.trim() || !message || !message.trim()) {
      return errorResponse(res, { code: 'VALIDATION_ERROR', message: 'Title and message are required' }, 400);
    }

    const item = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      priority: priority === 'urgent' ? 'urgent' : 'normal',
      isActive: true,
      createdBy: {
        userId: req.user.id,
        name: req.user.displayName || req.user.email
      }
    });

    return successResponse(res, item, 201);
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = {};
    ['title', 'message', 'priority', 'isActive'].forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const item = await Announcement.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!item) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Announcement not found' }, 404);
    }

    return successResponse(res, item);
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Announcement.findByIdAndDelete(id);
    if (!item) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Announcement not found' }, 404);
    }
    return successResponse(res, { message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
};
