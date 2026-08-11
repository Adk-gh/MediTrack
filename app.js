require('dotenv').config();
const express = require("express");
const helmet = require("helmet");
const corsMiddleware = require("./configs/cors");
const globalErr = require("./middleware/global-err");
const routes = require("./routes/index");

// 1. Initialize Express FIRST
const app = express();

// 2. Security and CORS Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(corsMiddleware);

// 3. Payload limit parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 4. Debug test route
app.post("/test", (req, res) => {
  res.json({ received: req.body });
});

// 5. API Routes
app.use("/api", routes);

// 6. Error handling (Always last middleware)
app.use(globalErr);

// 7. Server listen
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
=========================================
  MediTrack Node Server Running
  Port: ${PORT}
  Database: Supabase Connected
=========================================
  `);

  server.on("close", () => {
    console.log("Server closed");
  });
});

process.stdin.resume();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = app;