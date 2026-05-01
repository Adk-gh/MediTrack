// C:\Users\HP\MediTrack\features\user\user.route.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("./user.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");

// FIX: Updated path to go up two directories
const { db, auth } = require('../../configs/firebase-admin'); 

const {
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
} = require("./user.validation");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", upload.single("image"), validateData(registerSchema), userController.register);
router.post("/login", validateData(loginSchema), userController.login);
router.post("/firebase-auth", validateData(firebaseAuthSchema), userController.firebaseAuth);
router.get("/profile", authorized, userController.getProfile);
router.post("/profile-setup", authorized, userController.setupProfile);

// Get all users function
const getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FIX: Added the "authorized" middleware to protect user data
router.get("/users", authorized, getAllUsers);

module.exports = router;