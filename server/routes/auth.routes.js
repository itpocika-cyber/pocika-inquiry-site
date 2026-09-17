import express from 'express';
import { login, register, getMe } from '../controllers/auth.controller.js';
import { validateLogin, validateRegister } from '../validators/auth.validator.js';
import { authenticateUser } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';

const router = express.Router();

router.post('/login', validateLogin, login);
router.post('/register', authenticateUser, authorizeRoles('admin', 'super_admin'), validateRegister, register);
router.get('/me', authenticateUser, getMe);

export default router;
