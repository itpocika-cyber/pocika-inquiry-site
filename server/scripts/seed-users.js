import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

/**
 * Seed or update an authorized user with an assigned role.
 * Usage: node server/scripts/seed-users.js <firebaseUid> <email> <role> [displayName]
 */
async function seedUser() {
  const args = process.argv.slice(2);
  const [firebaseUid, email, role, displayName] = args;

  if (!firebaseUid || !email || !role) {
    console.log('Usage: node server/scripts/seed-users.js <firebaseUid> <email> <role> [displayName]');
    console.log('Available roles: super_admin, admin, sales_person, manager');
    process.exit(1);
  }

  const validRoles = ['super_admin', 'admin', 'sales_person', 'manager'];
  if (!validRoles.includes(role)) {
    console.error(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  await connectDB();

  try {
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: {
          email: email.toLowerCase().trim(),
          role: role,
          displayName: displayName || email.split('@')[0],
          isActive: true,
          lastLoginAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    console.log('✅ User provisioned successfully:');
    console.log({
      id: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Error seeding user:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedUser();
