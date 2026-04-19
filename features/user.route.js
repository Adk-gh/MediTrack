const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const { authorized } = require("../middleware/authorized");
const validateData = require("../validation/validate-data");
const {
  registerSchema,
  loginSchema,
  firebaseAuthSchema,
} = require("./user.validation");

router.post("/register", validateData(registerSchema), userController.register);
router.post("/login", validateData(loginSchema), userController.login);
router.post(
  "/firebase-auth",
  validateData(firebaseAuthSchema),
  userController.firebaseAuth
);
router.get("/profile", authorized, userController.getProfile);

module.exports = router;