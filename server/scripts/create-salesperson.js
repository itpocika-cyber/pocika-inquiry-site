import { initFirebase } from '../config/firebase.js';

const authInstance = initFirebase();

/**
 * Creates or resets a Salesperson user in Firebase Authentication for testing.
 * Usage: node server/scripts/create-salesperson.js [email] [password]
 */
async function createSalespersonUser() {
  if (!authInstance) {
    console.error('Firebase Admin not initialized. Check your .env file.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const email = args[0] || 'sales@pocika.com';
  const password = args[1] || 'Sales@123';
  const displayName = args[2] || 'Rajesh Sharma';

  try {
    try {
      const existingUser = await authInstance.getUserByEmail(email);
      console.log(`User ${email} already exists. Resetting...`);
      await authInstance.deleteUser(existingUser.uid);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    const newUser = await authInstance.createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true
    });
    
    console.log('\n✅ Salesperson user created successfully in Firebase!');
    console.log(`👤 Name: ${displayName}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 UID: ${newUser.uid}\n`);
    console.log('Role: sales_person (Auto-assigned upon first login)\n');
    
  } catch (error) {
    console.error('❌ Error creating salesperson:', error.message);
  }
  process.exit(0);
}

createSalespersonUser();
