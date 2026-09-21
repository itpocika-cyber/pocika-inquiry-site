import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Inquiry } from '../models/Inquiry.js';
import { Counter } from '../models/Counter.js';
import { User } from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads/photos');

async function cleanDummyData() {
  console.log('=== POCIKA DATABASE CLEANUP STARTING ===\n');

  try {
    await connectDB();

    // 1. Delete all dummy inquiries
    const inquiryDeleteResult = await Inquiry.deleteMany({});
    console.log(`✅ Deleted ${inquiryDeleteResult.deletedCount} dummy inquiries.`);

    // 2. Reset inquiry counter
    const currentYear = new Date().getFullYear();
    const counterId = `inquiry_${currentYear}`;
    await Counter.deleteOne({ _id: counterId });
    console.log(`✅ Reset Counter for "${counterId}" so next real inquiry starts at PSI-${currentYear}-000001.`);

    // 3. Delete specified dummy users
    const dummyEmails = ['sale@gmail.com', 'admin@gmail.com', 'prem@gmail.com'];
    const userDeleteResult = await User.deleteMany({ email: { $in: dummyEmails } });
    console.log(`✅ Deleted ${userDeleteResult.deletedCount} dummy user accounts (${dummyEmails.join(', ')}).`);

    // 4. List remaining active users
    const remainingUsers = await User.find({}, 'name email role');
    console.log('\n📋 Remaining Active Users in System:');
    remainingUsers.forEach(u => console.log(`   - ${u.name || 'Admin'} (${u.email}) [Role: ${u.role}]`));

    // 5. Clean local photo uploads directory
    try {
      const files = await fs.readdir(uploadsDir);
      let removedPhotos = 0;
      for (const file of files) {
        if (file !== '.gitkeep') {
          await fs.unlink(path.join(uploadsDir, file));
          removedPhotos++;
        }
      }
      console.log(`\n✅ Removed ${removedPhotos} local test photos from ${uploadsDir}.`);
    } catch (err) {
      console.warn('Local photos directory note:', err.message);
    }

    console.log('\n=== POCIKA DATABASE IS NOW 100% PRODUCTION CLEAN ===\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanDummyData();
