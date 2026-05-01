const cors = require("cors");

const corsOptions = {
  // Add your ngrok URL here!
  origin: [
    "http://localhost:5173", 
    "https://gabrielle-unshedding-unsymmetrically.ngrok-free.dev"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

module.exports = cors(corsOptions);