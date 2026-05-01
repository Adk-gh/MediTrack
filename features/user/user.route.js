// C:\Users\HP\MediTrack\features\user\user.route.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("./user.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
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

module.exports = router;