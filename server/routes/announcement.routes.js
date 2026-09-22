import express from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/announcement.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = express.Router();

// All logged-in users can view announcements
router.get('/', authenticateUser, getAnnouncements);

// Admin & Manager only
router.post('/', authenticateUser, authorizeRoles('admin', 'super_admin', 'manager'), createAnnouncement);
router.patch('/:id', authenticateUser, authorizeRoles('admin', 'super_admin', 'manager'), updateAnnouncement);
router.delete('/:id', authenticateUser, authorizeRoles('admin', 'super_admin', 'manager'), deleteAnnouncement);

export default router;
