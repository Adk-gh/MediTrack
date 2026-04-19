// C:\Users\HP\University Clinic\configs\database.js
const { db } = require('./firebase-admin');

const connectDB = async () => {
    try {
        // With Firestore/Admin SDK, "connecting" is just verifying the DB instance
        if (db) {
            console.log("📂 Firestore Admin SDK Initialized...");
        }
    } catch (err) {
        console.error("❌ Database Connection Error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;