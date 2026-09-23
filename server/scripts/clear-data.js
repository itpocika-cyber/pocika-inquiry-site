import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Inquiry } from '../models/Inquiry.js';
import { Counter } from '../models/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function clearAllInquiries() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    const deleted = await Inquiry.deleteMany({});
    await Counter.deleteMany({});

    console.log(`\n✅ Database Inquiries Cleared:`);
    console.log(`• Removed ${deleted.deletedCount} inquiries.`);
    console.log(`• Reset inquiry number counter to 0 (next entry will be PSI-${new Date().getFullYear()}-000001).`);
    console.log(`• Users and Admin accounts were kept safe.\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to clear inquiries:', error);
    process.exit(1);
  }
}

clearAllInquiries();
