// C:\Users\HP\MediTrack\app.js
require('dotenv').config();
const express = require("express");
const globalErr = require("./middleware/global-err");
const routes = require("./routes/index");
const cors = require("cors");

const app = express();

// ✅ Middleware
app.use(cors());

// 🔴 FIX: Increase the payload limits to handle large Base64 image strings
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ✅ Debug test route
app.post("/test", (req, res) => {
  res.json({ received: req.body });
});

// ✅ Routes
// Everything inside 'routes/index' will be prefixed with /api
app.use("/api", routes);

// ✅ Error handler LAST
app.use(globalErr);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
=========================================
  MediTrack Node Server Running
  Port: ${PORT}
  Database: Supabase Connected
=========================================
  `);

  // Prevent server from exiting
  server.on('close', () => {
    console.log('Server closed');
  });
});

// Prevent process from exiting
process.stdin.resume();

// Keep the server running and log any unexpected exits
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;