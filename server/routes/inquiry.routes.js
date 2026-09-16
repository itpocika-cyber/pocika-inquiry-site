import express from 'express';
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  getSummary
} from '../controllers/inquiry.controller.js';
import { validateInquiry } from '../validators/inquiry.validator.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', requireAuth, getSummary); // must be before /:id
router.post('/', requireAuth, validateInquiry, createInquiry);
router.get('/', requireAuth, getInquiries);
router.get('/:id', requireAuth, getInquiryById);
router.patch('/:id', requireAuth, updateInquiry);

export default router;
