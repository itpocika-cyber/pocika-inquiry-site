import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { initFirebase } from './config/firebase.js';

const startServer = async () => {
  console.log('Starting POCIKA API Server...');
  
  // Initialize Firebase Admin only if explicitly enabled
  if (config.firebaseEnabled) {
    await initFirebase();
  }

  // Connect to MongoDB first
  await connectDB();
  
  // Then start the express server
  app.listen(config.port, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
  });
};

startServer();
