import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ADMIN_EMAIL = 'admin@pocika.com';
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@Pocika2026!';

async function seedAuthUsers() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // 1. Remove legacy demo dummy accounts
    const removedDemoUsers = await User.deleteMany({
      email: { $in: ['sales@pocika.com', 'manager@pocika.com'] }
    });
    if (removedDemoUsers.deletedCount > 0) {
      console.log(`Cleaned up ${removedDemoUsers.deletedCount} legacy demo sales/manager account(s).`);
    }

    // 2. Upsert the authoritative Admin account
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      admin.password = ADMIN_PASSWORD;
      admin.displayName = 'POCIKA Administrator';
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
      console.log(`Updated admin account: ${admin.email}`);
    } else {
      admin = await User.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'POCIKA Administrator',
        role: 'admin',
        isActive: true
      });
      console.log(`Created admin account: ${admin.email}`);
    }

    console.log('\n✅ Auth seed complete:');
    console.log(`• Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log('• Dummy sales accounts: 0 (All sales/manager accounts are now created via Admin UI)');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed auth error:', err.message);
    process.exit(1);
  }
}

seedAuthUsers();
