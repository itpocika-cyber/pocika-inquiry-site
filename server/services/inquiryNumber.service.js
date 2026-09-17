import mongoose from 'mongoose';
import { Counter } from '../models/Counter.js';

export const generateInquiryNumber = async () => {
  const currentYear = new Date().getFullYear();
  const counterId = `inquiry_${currentYear}`;
  
  // Only attempt counter increment if database is actively connected
  if (mongoose.connection.readyState === 1) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, maxTimeMS: 4000 }
      );
      if (counter && counter.seq) {
        const sequenceStr = String(counter.seq).padStart(6, '0');
        return `PSI-${currentYear}-${sequenceStr}`;
      }
    } catch (err) {
      console.warn('Counter query error, utilizing resilient inquiry number:', err.message);
    }
  }

  // Resilient fallback generation if MongoDB Atlas connection is buffering
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `PSI-${currentYear}-${randomSuffix}`;
};
