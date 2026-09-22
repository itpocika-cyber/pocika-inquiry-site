import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadBufferToCloudinary, generateOptimizedUrls } from '../config/cloudinary.js';

const router = express.Router();

// Initialize Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype?.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      const err = new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP.`);
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  }
});

/**
 * Handle standalone photo upload to Cloudinary (or local fallback)
 * POST /api/v1/upload or POST /api/v1/upload/photos
 */
const handlePhotoUpload = async (req, res, next) => {
  try {
    let files = [];
    if (req.files && Array.isArray(req.files)) {
      files = req.files;
    } else if (req.file) {
      files = [req.file];
    } else if (req.files && typeof req.files === 'object') {
      files = Object.values(req.files).flat();
    }

    if (!files || files.length === 0) {
      return errorResponse(res, {
        code: 'NO_FILES_PROVIDED',
        message: 'No photo files were uploaded.'
      }, 400);
    }

    const uploadedRecords = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const photoId = crypto.randomUUID();
      const result = await uploadBufferToCloudinary(
        file.buffer,
        'drafts',
        photoId,
        {
          original_filename: file.originalname,
          resource_type: 'image'
        }
      );

      const sizeKB = Math.round((result.bytes || file.size) / 1024);
      const secureUrl = result.secure_url;
      uploadedRecords.push({
        photoId,
        publicId: result.public_id,
        secureUrl,
        url: secureUrl,
        caption: file.originalname,
        originalFileName: file.originalname,
        fileName: file.originalname,
        previewUrl: secureUrl,
        sizeKB,
        format: result.format || 'jpg',
        width: result.width || 0,
        height: result.height || 0,
        bytes: result.bytes || file.size,
        uploadedBy: {
          userId: req.user?.userId || req.user?.id || '',
          firebaseUid: req.user?.firebaseUid || '',
          email: req.user?.email || ''
        },
        uploadedAt: new Date(),
        optimizedUrls: generateOptimizedUrls(result.public_id, secureUrl)
      });
    }

    return successResponse(res, {
      photos: uploadedRecords,
      photo: uploadedRecords[0],
      secureUrl: uploadedRecords[0]?.secureUrl,
      url: uploadedRecords[0]?.url,
      count: uploadedRecords.length
    }, 201);
  } catch (err) {
    console.error('Upload route error:', err);
    next(err);
  }
};

router.post('/', requireAuth, upload.any(), handlePhotoUpload);
router.post('/photos', requireAuth, upload.any(), handlePhotoUpload);

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
