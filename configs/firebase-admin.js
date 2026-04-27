const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 1. Create the instances
const db = admin.firestore();
const auth = admin.auth(); // <--- MAKE SURE THIS LINE EXISTS

// 2. Export BOTH db and auth
module.exports = { db, auth}; // <--- BOTH MUST BE IN THIS OBJECT