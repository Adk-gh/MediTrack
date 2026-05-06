// C:\Users\HP\MediTrack\configs\firebase-admin.js
const admin = require('firebase-admin');

let serviceAccount;

// Check if we are running in production (Render) where this env var exists
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON environment variable:', err.message);
  }
} else {
  // Fallback to local file for development on your machine
  // Note: Ensure this file is in your .gitignore!
  serviceAccount = require('./serviceAccountkey.json');
}

// Prevent re-initialization if this file is imported multiple times
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: "https://<YOUR-PROJECT-ID>.firebaseio.com" // Uncomment if using Realtime DB
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.stack);
  }
}

// Export the services you need for your backend routes
const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };