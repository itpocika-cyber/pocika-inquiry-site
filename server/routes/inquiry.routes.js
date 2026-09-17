import express from 'express';
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  getSummary,
  downloadInquiryPdf
} from '../controllers/inquiry.controller.js';
import {
  uploadMiddleware,
  uploadInquiryPhotos,
  getInquiryPhotos,
  deleteInquiryPhoto
} from '../controllers/upload.controller.js';
import { validateInquiry } from '../validators/inquiry.validator.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// All inquiry endpoints require authentication
router.get('/summary', authenticateUser, getSummary);
router.post('/', authenticateUser, validateInquiry, createInquiry);
router.get('/', authenticateUser, getInquiries);
router.get('/:id', authenticateUser, getInquiryById);
router.get('/:id/pdf', authenticateUser, downloadInquiryPdf);
router.patch('/:id', authenticateUser, updateInquiry);

// Photo endpoints
router.post('/:id/photos', authenticateUser, uploadMiddleware, uploadInquiryPhotos);
router.get('/:id/photos', authenticateUser, getInquiryPhotos);
router.delete('/:id/photos/:photoId', authenticateUser, deleteInquiryPhoto);

export default router;
