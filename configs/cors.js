// C:\Users\HP\MediTrack\configs\cors.js
const cors = require("cors");

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://meditrack-2-tvck.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  // 🟢 ADDED 'x-user-uid' below
  allowedHeaders: ["Content-Type", "Authorization", "x-user-uid"],
  credentials: true,
};

module.exports = cors(corsOptions);