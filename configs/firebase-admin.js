// C:\Users\HP\MediTrack\configs\firebase-admin.js
const admin = require('firebase-admin');

// Require your local service account key file directly
const serviceAccount = require('./serviceAccountkey.json');

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