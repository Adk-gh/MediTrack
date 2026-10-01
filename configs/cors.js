// C:\Users\HP\MediTrack\configs\cors.js
const cors = require("cors");

const allowedOrigins = [
  "http://localhost:5173",                 // Vite dev server 
  "http://localhost",                      // Android Capacitor WebView
  "https://localhost",                     // Android Capacitor SSL WebView
  "capacitor://localhost",                 // iOS / Capacitor default scheme
  "ionic://localhost",
  "https://meditrackdlsp.online",
  "https://www.meditrackdlsp.online"                    // Ionic / legacy Capacitor scheme
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile native requests, Postman, Electron)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-uid"],
  credentials: true,
};

module.exports = cors(corsOptions);