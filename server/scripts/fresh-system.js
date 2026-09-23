import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from '../config/db.js';
import { Inquiry } from '../models/Inquiry.js';
import { Counter } from '../models/Counter.js';
import { User } from '../models/User.js';
import { ProductCatalog } from '../models/ProductCatalog.js';
import { Announcement } from '../models/Announcement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ADMIN_EMAIL = 'pocika@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'Pocika@2026';

async function freshSystemReset() {
  console.log('====================================================');
  console.log('       POCIKA SYSTEM FRESH RESET UTILITY            ');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // 1. CLOUDINARY CLEANUP
    // ----------------------------------------------------
    console.log('1. Cleaning Cloudinary Media Assets...');
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      let nextCursor = null;
      let totalDeleted = 0;
      do {
        const listResult = await cloudinary.api.resources({
          type: 'upload',
          max_results: 100,
          next_cursor: nextCursor
        });

        if (listResult.resources && listResult.resources.length > 0) {
          const publicIds = listResult.resources.map((r) => r.public_id);
          const delResult = await cloudinary.api.delete_resources(publicIds);
          totalDeleted += Object.keys(delResult.deleted || {}).length;
          console.log(`   Deleted ${publicIds.length} Cloudinary assets (Total: ${totalDeleted})...`);
        }
        nextCursor = listResult.next_cursor;
      } while (nextCursor);

      console.log(`✅ Cloudinary cleaned successfully! Total assets removed: ${totalDeleted}\n`);
    } else {
      console.log('⚠️ Cloudinary credentials not found in .env, skipping media cleanup.\n');
    }

    // ----------------------------------------------------
    // 2. MONGODB CLEANUP & STRUCTURING
    // ----------------------------------------------------
    console.log('2. Connecting to MongoDB...');
    await connectDB();
    console.log('   Connected to database.');

    // A. Clean Inquiries
    const delInq = await Inquiry.deleteMany({});
    console.log(`   Cleared inquiries: ${delInq.deletedCount} removed.`);

    // B. Reset Counter to 0
    await Counter.deleteMany({});
    console.log(`   Reset inquiry counter (next inquiry will be PSI-${new Date().getFullYear()}-000001).`);

    // C. Clean and structure Users
    try {
      await User.collection.dropIndex('firebaseUid_1');
    } catch (_) {}

    const delUsers = await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
    console.log(`   Removed ${delUsers.deletedCount} non-admin user accounts.`);

    // Upsert Master Admin
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      admin.password = ADMIN_PASSWORD;
      admin.displayName = 'POCIKA Administrator';
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
      console.log(`   Verified Admin Account: ${ADMIN_EMAIL}`);
    } else {
      admin = await User.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'POCIKA Administrator',
        role: 'admin',
        isActive: true
      });
      console.log(`   Created Master Admin Account: ${ADMIN_EMAIL}`);
    }

    // D. Seed Standard Product Catalog (if empty)
    const catCount = await ProductCatalog.countDocuments();
    if (catCount === 0) {
      const standardProducts = [
        {
          name: 'ABC Stored Pressure Fire Extinguisher (6kg)',
          category: 'Fire Extinguishers',
          description: 'Multi-purpose dry chemical powder extinguisher for Class A, B, and C fires. ISI 15683 marked.',
          specifications: 'Capacity: 6kg | Working Pressure: 15 bar | Discharge Time: >13 sec | Range: >2 meters',
          priceHint: '₹2,500 - ₹3,200',
          isActive: true
        },
        {
          name: 'CO2 Fire Extinguisher (4.5kg)',
          category: 'Fire Extinguishers',
          description: 'Carbon Dioxide extinguisher for electrical and flammable liquid fires without leaving residue. ISI 2878 marked.',
          specifications: 'Capacity: 4.5kg | Discharge Horn with bend pipe | High-pressure seamless cylinder',
          priceHint: '₹4,500 - ₹5,500',
          isActive: true
        },
        {
          name: 'Addressable Optical Smoke Detector',
          category: 'Fire Alarm & Detection',
          description: 'High-sensitivity optical chamber sensor for early fire detection in commercial buildings.',
          specifications: 'Operating Voltage: 15-32V DC | Protocol: Standard Addressable Loop | Dual LED indicators',
          priceHint: '₹1,800 - ₹2,400',
          isActive: true
        },
        {
          name: 'Manual Call Point (MCP)',
          category: 'Fire Alarm & Detection',
          description: 'Break-glass manual alarm station with key reset mechanism.',
          specifications: 'Material: ABS Flame Retardant | Flush / Surface mount | Resettable element',
          priceHint: '₹650 - ₹950',
          isActive: true
        },
        {
          name: 'Single Landing Valve (Fire Hydrant)',
          category: 'Fire Hydrant & Suppression',
          description: 'Gunmetal / Stainless steel fire hydrant valve with instantaneous coupling. IS 5290 certified.',
          specifications: 'Inlet: 75mm / 80mm Flanged | Outlet: 63mm Female Instantaneous | Test Pressure: 21 kgf/cm²',
          priceHint: '₹3,500 - ₹4,800',
          isActive: true
        },
        {
          name: 'RRL Fire Hose with Couplings (15m / 30m)',
          category: 'Fire Hydrant & Suppression',
          description: 'Reinforced Rubber Lined synthetic fire hose with Gunmetal / SS couplings. IS 636 Type A.',
          specifications: 'Diameter: 63mm | Bursting Pressure: 35 kgf/cm² | Proof Pressure: 21 kgf/cm²',
          priceHint: '₹2,200 - ₹4,200',
          isActive: true
        },
        {
          name: 'Main Fire Pump & Diesel Engine System',
          category: 'Pumps & Accessories',
          description: 'End suction centrifugal pump coupled with industrial diesel engine and electric jockey pump set.',
          specifications: 'Discharge: 1620 - 2850 LPM | Head: 70 - 100m | Automatic start controller panel included',
          priceHint: 'Quotation upon site specification',
          isActive: true
        },
        {
          name: 'Comprehensive Annual Maintenance Contract (AMC)',
          category: 'AMC & Refilling Services',
          description: 'Quarterly routine inspection, hydraulic testing, pressure checking, refilling, and emergency breakdown service.',
          specifications: 'Covers: Extinguishers, Hydrants, Sprinklers, Alarm Panels, Pumps | Compliance report provided',
          priceHint: 'Customized based on equipment inventory',
          isActive: true
        }
      ];
      await ProductCatalog.insertMany(standardProducts);
      console.log(`   Seeded ${standardProducts.length} standard products into Product Catalog.`);
    }

    // E. Seed Clean Announcement
    await Announcement.deleteMany({});
    await Announcement.create({
      title: 'Welcome to POCIKA Sales & Site Visit System',
      message: 'System is fully active and ready for field site visits and inquiry entries.',
      type: 'info',
      isActive: true,
      createdBy: ADMIN_EMAIL
    });
    console.log('   Initialized default announcement.');

    console.log('\n====================================================');
    console.log('          ✅ FRESH RESET COMPLETED SUCCESSFULLY!    ');
    console.log('====================================================');
    console.log('1. Cloudinary: Completely clean (0 old assets).');
    console.log('2. MongoDB Collections:');
    console.log('   • users: 1 Clean Master Admin');
    console.log(`     -> Email:    ${ADMIN_EMAIL}`);
    console.log(`     -> Password: ${ADMIN_PASSWORD}`);
    console.log('   • inquiries: 0 (Fresh start)');
    console.log(`   • counters:  Reset to 0 (Next: PSI-${new Date().getFullYear()}-000001)`);
    console.log('   • productcatalogs: Standard Fire & Safety product line initialized');
    console.log('   • announcements: Clean initial welcome message');
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Fresh reset failed:', err);
    process.exit(1);
  }
}

freshSystemReset();
