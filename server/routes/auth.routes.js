import express from 'express';
import { login, register, getMe } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateUser, getMe);

export default router;
