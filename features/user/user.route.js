// C:\Users\HP\MediTrack\features/user/user.route.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("./user.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const supabase = require('../../configs/database');

const {
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
} = require("./user.validation");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/check-id", userController.checkIdExists);

router.post("/register", upload.single("image"), validateData(registerSchema), userController.register);
router.post("/login", /*validateData(loginSchema),*/ userController.login);

router.get("/profile", authorized, userController.getProfile);
router.get("/profile-setup", authorized, userController.checkProfileSetup);
router.post("/profile-setup", authorized, userController.setupProfile);
router.put("/profile", authorized, userController.updateProfile);

const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    const users = data.map(doc => ({ id: doc.uid, ...doc }));
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get("/users", authorized, getAllUsers);

module.exports = router;