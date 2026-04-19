
require('dotenv').config();
const express = require("express");
const database = require("./configs/database");
const globalErr = require("./middleware/global-err");
const routes = require("./routes/index"); // This is where we link the new auth routes
const cors = require("cors");

const app = express();

// ✅ Middleware 
app.use(cors());
app.use(express.json());
// extended: true is important for handling the complex data Multer sends
app.use(express.urlencoded({ extended: true }));

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

database().then(() => {
  app.listen(PORT, () => {
    console.log(`
=========================================
  MediTrack Node Server Running
  Port: ${PORT}
  Database: Connected
=========================================
    `);
  });
}).catch((err) => {
  console.error("Failed to connect to database:", err.message);
  process.exit(1);
});

module.exports = app;