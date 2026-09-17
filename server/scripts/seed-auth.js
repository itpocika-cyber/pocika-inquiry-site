import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedAuthUsers() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    const usersToSeed = [
      {
        email: 'admin@pocika.com',
        password: 'Admin@12345',
        displayName: 'Demo Administrator',
        role: 'admin',
        isActive: true
      },
      {
        email: 'sales@pocika.com',
        password: 'Sales@12345',
        displayName: 'Demo Salesperson',
        role: 'sales_person',
        isActive: true
      },
      {
        email: 'manager@pocika.com',
        password: 'Manager@12345',
        displayName: 'Demo Sales Head',
        role: 'manager',
        isActive: true
      }
    ];

    for (const userData of usersToSeed) {
      let user = await User.findOne({ email: userData.email });
      if (user) {
        user.password = userData.password;
        user.displayName = userData.displayName;
        user.role = userData.role;
        user.isActive = userData.isActive;
        await user.save();
        console.log(`Updated user: ${user.email} (${user.role})`);
      } else {
        user = await User.create(userData);
        console.log(`Created user: ${user.email} (${user.role})`);
      }
    }

    console.log('\n✅ Auth users seeded successfully:');
    console.log('• Admin: admin@pocika.com / Admin@12345 (role: admin)');
    console.log('• Sales: sales@pocika.com / Sales@12345 (role: sales_person)');
    console.log('• Manager: manager@pocika.com / Manager@12345 (role: manager)');

    process.exit(0);
  } catch (err) {
    console.error('Seed auth error:', err.message);
    process.exit(1);
  }
}

seedAuthUsers();
