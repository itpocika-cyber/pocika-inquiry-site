import express from 'express';
import { getMe } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticateUser, getMe);

export default router;
