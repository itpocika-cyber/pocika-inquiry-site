import { v2 as cloudinary } from 'cloudinary';
import { config } from './env.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/photos');

// Initialize Cloudinary SDK
const isConfigured = Boolean(
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true
  });
  console.log(`Cloudinary configured for cloud_name: ${config.cloudinary.cloudName}`);
} else {
  console.warn('Cloudinary environment variables missing or incomplete. Media uploads will operate in local fallback mode.');
}

/**
 * Save image buffer to local uploads directory when Cloudinary fails or is offline
 */
async function saveLocalPhotoFallback(fileBuffer, photoId, originalFileName) {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    const ext = originalFileName ? path.extname(originalFileName) || '.jpg' : '.jpg';
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const fileName = `${photoId}${cleanExt}`;
    const filePath = path.join(uploadsDir, fileName);
    if (fileBuffer) {
      await fs.writeFile(filePath, fileBuffer);
    }
    const localUrl = `/uploads/photos/${fileName}`;
    return {
      public_id: `local:${fileName}`,
      secure_url: localUrl,
      format: cleanExt.replace('.', '') || 'jpg',
      resource_type: 'image',
      width: 1200,
      height: 900,
      bytes: fileBuffer ? fileBuffer.length : 102400
    };
  } catch (err) {
    console.error('Failed to save photo locally:', err.message);
    return {
      public_id: `local:${photoId}.jpg`,
      secure_url: `/uploads/photos/${photoId}.jpg`,
      format: 'jpg',
      resource_type: 'image',
      width: 0,
      height: 0,
      bytes: 0
    };
  }
}

/**
 * Sanitize inquiry numbers for safe Cloudinary folder paths
 */
export function sanitizeInquiryNumber(inquiryNumber) {
  return String(inquiryNumber || 'PSI-UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get standard storage folder path for an inquiry
 */
export function getInquiryFolder(inquiryNumber) {
  return `pocika/inquiries/${sanitizeInquiryNumber(inquiryNumber)}/photos`;
}

/**
 * Generate a unique, safe public_id for a photo
 */
export function generatePhotoPublicId(inquiryNumber, photoId) {
  const cleanId = photoId || crypto.randomUUID();
  return `${getInquiryFolder(inquiryNumber)}/${cleanId}`;
}

/**
 * Generate optimized delivery URLs based on Cloudinary transformations or local paths
 */
export function generateOptimizedUrls(publicId, fallbackSecureUrl = '') {
  const isLocal = 
    (publicId && String(publicId).startsWith('local:')) ||
    (fallbackSecureUrl && String(fallbackSecureUrl).startsWith('/uploads/'));

  if (isLocal) {
    const url = (fallbackSecureUrl && String(fallbackSecureUrl).startsWith('/uploads/'))
      ? fallbackSecureUrl
      : `/uploads/photos/${String(publicId).replace('local:', '')}`;
    return {
      thumbnail: url,
      preview: url,
      full: url,
      pdf: url,
      raw: url
    };
  }

  if (!publicId) {
    return {
      thumbnail: fallbackSecureUrl || '',
      preview: fallbackSecureUrl || '',
      full: fallbackSecureUrl || '',
      pdf: fallbackSecureUrl || '',
      raw: fallbackSecureUrl || ''
    };
  }

  const baseUrl = `https://res.cloudinary.com/${config.cloudinary.cloudName || 'pocika'}/image/upload`;
  
  return {
    thumbnail: `${baseUrl}/c_fill,w_250,h_250,q_auto,f_auto/${publicId}`,
    preview: `${baseUrl}/c_limit,w_900,q_auto,f_auto/${publicId}`,
    full: `${baseUrl}/q_auto,f_auto/${publicId}`,
    pdf: `${baseUrl}/c_limit,w_1200,q_auto:best,f_auto/${publicId}`,
    raw: fallbackSecureUrl || ''
  };
}

/**
 * Upload a file buffer directly to Cloudinary using upload_stream, with local fallback
 */
export async function uploadBufferToCloudinary(fileBuffer, inquiryNumber, photoId, options = {}) {
  const cleanPhotoId = photoId || crypto.randomUUID();
  const publicId = generatePhotoPublicId(inquiryNumber, cleanPhotoId);

  if (!isConfigured) {
    return saveLocalPhotoFallback(fileBuffer, cleanPhotoId, options.original_filename);
  }

  return new Promise((resolve) => {
    const uploadOptions = {
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, async (error, result) => {
      if (error) {
        console.warn(`Cloudinary upload warning: ${error.message}. Saving photo to local resilient storage.`);
        const localResult = await saveLocalPhotoFallback(fileBuffer, cleanPhotoId, options.original_filename);
        return resolve(localResult);
      }
      resolve(result);
    });

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete a photo asset from Cloudinary or local storage
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return true;

  if (String(publicId).startsWith('local:')) {
    try {
      const fileName = String(publicId).replace('local:', '');
      const filePath = path.join(uploadsDir, fileName);
      await fs.unlink(filePath).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  if (!isConfigured) return true;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return result.result === 'ok';
  } catch (err) {
    console.error(`Failed to delete asset ${publicId} from Cloudinary:`, err.message);
    return false;
  }
}

export { cloudinary, isConfigured };
