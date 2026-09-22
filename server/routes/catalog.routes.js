import express from 'express';
import {
  getCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem
} from '../controllers/catalog.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = express.Router();

// All logged-in users can browse catalog
router.get('/', authenticateUser, getCatalog);

// Admin & Manager only for modifications
router.post('/', authenticateUser, authorizeRoles('admin', 'super_admin', 'manager'), createCatalogItem);
router.patch('/:id', authenticateUser, authorizeRoles('admin', 'super_admin', 'manager'), updateCatalogItem);
router.delete('/:id', authenticateUser, authorizeRoles('admin', 'super_admin', 'manager'), deleteCatalogItem);

export default router;
