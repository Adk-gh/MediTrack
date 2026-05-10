const cors = require("cors");

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://meditrack-2-tvck.onrender.com" 
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

module.exports = cors(corsOptions);