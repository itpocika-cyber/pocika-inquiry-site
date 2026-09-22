import multer from 'multer';
import crypto from 'crypto';
import { Inquiry } from '../models/Inquiry.js';
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  generateOptimizedUrls
} from '../config/cloudinary.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per Phase 9 spec
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

// Memory storage keeps uploaded files in RAM as Buffers (clean, no orphaned disk temp files)
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_PHOTOS
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype?.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      const err = new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP.`);
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  }
}).array('photos', MAX_PHOTOS);

/**
 * Upload photos for a specific inquiry
 * POST /api/v1/inquiries/:id/photos
 */
export const uploadInquiryPhotos = async (req, res, next) => {
  try {
    const inquiryId = req.params.id;
    const files = req.files || [];

    if (!files || files.length === 0) {
      return errorResponse(res, {
        code: 'NO_FILES_PROVIDED',
        message: 'No image files were uploaded.'
      }, 400);
    }

    // 1. Locate inquiry
    let inquiry = null;
    if (inquiryId.startsWith('PSI-') || inquiryId.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: inquiryId });
    } else {
      inquiry = await Inquiry.findById(inquiryId);
    }

    if (!inquiry) {
      return errorResponse(res, {
        code: 'INQUIRY_NOT_FOUND',
        message: 'Inquiry not found.'
      }, 404);
    }

    // 2. Authorize user (Ownership check)
    const isOwner =
      (inquiry.createdBy?.userId && inquiry.createdBy?.userId === req.user.userId) ||
      (inquiry.createdBy?.firebaseUid && inquiry.createdBy?.firebaseUid === req.user.firebaseUid) ||
      (inquiry.createdBy?.email && inquiry.createdBy?.email === req.user.email);
    const isAdmin = ['admin', 'super_admin', 'manager'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return errorResponse(res, {
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to upload photos for this inquiry.'
      }, 403);
    }

    // 3. Check total photo limit
    const existingCount = inquiry.photos ? inquiry.photos.length : 0;
    if (existingCount + files.length > MAX_PHOTOS) {
      return errorResponse(res, {
        code: 'PHOTO_LIMIT_EXCEEDED',
        message: `Cannot upload ${files.length} photos. Maximum allowed is ${MAX_PHOTOS} (current: ${existingCount}).`
      }, 400);
    }

    // 4. Upload to Cloudinary with compensation cleanup on failure
    const uploadedAssets = [];
    const newPhotoRecords = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const photoId = crypto.randomUUID();
        const sortOrder = existingCount + i + 1;

        // Perform Cloudinary upload
        const result = await uploadBufferToCloudinary(
          file.buffer,
          inquiry.inquiryNumber,
          photoId,
          {
            original_filename: file.originalname,
            resource_type: 'image'
          }
        );

        uploadedAssets.push(result.public_id);

        const sizeKB = Math.round((result.bytes || file.size) / 1024);
        newPhotoRecords.push({
          photoId,
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type || 'image',
          format: result.format || 'jpg',
          width: result.width || 0,
          height: result.height || 0,
          bytes: result.bytes || file.size,
          originalFileName: file.originalname,
          fileName: file.originalname,
          previewUrl: result.secure_url,
          sizeKB: sizeKB,
          uploadedBy: {
            firebaseUid: req.user.firebaseUid,
            email: req.user.email
          },
          uploadedAt: new Date(),
          sortOrder
        });
      }

      // 5. Persist metadata to MongoDB
      inquiry.photos.push(...newPhotoRecords);
      await inquiry.save();

      // Return enriched photos with Cloudinary delivery URLs
      const enrichedPhotos = inquiry.photos.map(p => ({
        ...p.toObject(),
        optimizedUrls: generateOptimizedUrls(p.publicId, p.secureUrl)
      }));

      return successResponse(res, {
        inquiryNumber: inquiry.inquiryNumber,
        photos: enrichedPhotos,
        uploadedCount: newPhotoRecords.length
      }, 201);

    } catch (uploadOrDbErr) {
      // Compensating action: delete newly uploaded assets from Cloudinary to avoid orphans
      console.error('Failure during photo processing. Initiating cleanup:', uploadOrDbErr.message);
      for (const publicId of uploadedAssets) {
        await deleteFromCloudinary(publicId);
      }
      throw uploadOrDbErr;
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Get all photos for an inquiry with optimized delivery URLs
 * GET /api/v1/inquiries/:id/photos
 */
export const getInquiryPhotos = async (req, res, next) => {
  try {
    const inquiryId = req.params.id;

    let inquiry = null;
    if (inquiryId.startsWith('PSI-') || inquiryId.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: inquiryId });
    } else {
      inquiry = await Inquiry.findById(inquiryId);
    }

    if (!inquiry) {
      return errorResponse(res, { code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found.' }, 404);
    }

    const isOwner =
      (inquiry.createdBy?.userId && inquiry.createdBy?.userId === req.user.userId) ||
      (inquiry.createdBy?.firebaseUid && inquiry.createdBy?.firebaseUid === req.user.firebaseUid) ||
      (inquiry.createdBy?.email && inquiry.createdBy?.email === req.user.email);
    const isAdmin = ['admin', 'super_admin', 'manager'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return errorResponse(res, {
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to view photos for this inquiry.'
      }, 403);
    }

    const photos = (inquiry.photos || []).map(p => ({
      ...p.toObject(),
      optimizedUrls: generateOptimizedUrls(p.publicId, p.secureUrl)
    }));

    return successResponse(res, {
      inquiryNumber: inquiry.inquiryNumber,
      photos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific photo from an inquiry
 * DELETE /api/v1/inquiries/:id/photos/:photoId
 */
export const deleteInquiryPhoto = async (req, res, next) => {
  try {
    const { id: inquiryId, photoId } = req.params;

    let inquiry = null;
    if (inquiryId.startsWith('PSI-') || inquiryId.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: inquiryId });
    } else {
      inquiry = await Inquiry.findById(inquiryId);
    }

    if (!inquiry) {
      return errorResponse(res, { code: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found.' }, 404);
    }

    const isOwner =
      (inquiry.createdBy?.userId && inquiry.createdBy?.userId === req.user.userId) ||
      (inquiry.createdBy?.firebaseUid && inquiry.createdBy?.firebaseUid === req.user.firebaseUid) ||
      (inquiry.createdBy?.email && inquiry.createdBy?.email === req.user.email);
    const isAdmin = ['admin', 'super_admin', 'manager'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return errorResponse(res, {
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to delete photos for this inquiry.'
      }, 403);
    }

    const photoIndex = inquiry.photos.findIndex(
      p => p.photoId === photoId || p._id.toString() === photoId || p.publicId === photoId
    );

    if (photoIndex === -1) {
      return errorResponse(res, { code: 'PHOTO_NOT_FOUND', message: 'Photo not found in inquiry.' }, 404);
    }

    const targetPhoto = inquiry.photos[photoIndex];

    // 1. Delete from Cloudinary
    await deleteFromCloudinary(targetPhoto.publicId);

    // 2. Remove metadata from MongoDB
    inquiry.photos.splice(photoIndex, 1);
    await inquiry.save();

    return successResponse(res, {
      message: 'Photo deleted successfully.',
      deletedPhotoId: photoId
    });
  } catch (error) {
    next(error);
  }
};
