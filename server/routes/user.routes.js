import express from 'express';
import { createUser, getUsers, updateUser } from '../controllers/user.controller.js';
import { validateCreateUser, validateUpdateUser } from '../validators/user.validator.js';
import { authenticateUser } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = express.Router();

// All user management routes are restricted to Admin / Super Admin
router.use(authenticateUser);
router.use(authorizeRoles('admin', 'super_admin'));

router.post('/', validateCreateUser, createUser);
router.get('/', getUsers);
router.patch('/:id', validateUpdateUser, updateUser);

export default router;
