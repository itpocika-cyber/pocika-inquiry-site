import { initFirebase } from '../config/firebase.js';

const authInstance = initFirebase();

async function createAdminUser() {
  if (!authInstance) {
    console.error('Firebase Admin not initialized. Check your .env file.');
    process.exit(1);
  }

  const email = 'admin@pocika.com';
  const password = 'Admin@123';

  try {
    try {
      const existingUser = await authInstance.getUserByEmail(email);
      console.log(`User ${email} already exists. Deleting it...`);
      await authInstance.deleteUser(existingUser.uid);
      console.log('Old user deleted successfully.');
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    const newUser = await authInstance.createUser({
      email: email,
      password: password,
      emailVerified: true
    });
    
    console.log('\n✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}\n`);
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
  process.exit(0);
}

createAdminUser();
