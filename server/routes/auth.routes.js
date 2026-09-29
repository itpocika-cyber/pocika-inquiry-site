import express from 'express';
import { login, register, getMe } from '../controllers/auth.controller.js';
import { validateLogin, validateRegister } from '../validators/auth.validator.js';
import { authenticateUser } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/authorize.js';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.post('/login', loginLimiter, validateLogin, login);
router.post('/register', authenticateUser, authorizeRoles('admin', 'super_admin'), validateRegister, register);
router.get('/me', authenticateUser, getMe);

export default router;
