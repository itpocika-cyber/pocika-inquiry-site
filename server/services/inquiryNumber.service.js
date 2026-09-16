import { Counter } from '../models/Counter.js';

export const generateInquiryNumber = async () => {
  const currentYear = new Date().getFullYear();
  const counterId = `inquiry_${currentYear}`;
  
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Format to PSI-YYYY-NNNNNN
  const sequenceStr = String(counter.seq).padStart(6, '0');
  return `PSI-${currentYear}-${sequenceStr}`;
};
