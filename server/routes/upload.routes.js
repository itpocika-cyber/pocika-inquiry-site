import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Initialize Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

router.get('/signature', requireAuth, (req, res, next) => {
  try {
    const timestamp = Math.round((new Date).getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'pocika-inquiries' },
      config.cloudinary.apiSecret
    );
    
    return successResponse(res, {
      timestamp,
      signature,
      cloudName: config.cloudinary.cloudName,
      apiKey: config.cloudinary.apiKey,
      folder: 'pocika-inquiries'
    });
  } catch (error) {
    console.error('Signature Generation Error:', error);
    next(error);
  }
});

export default router;
