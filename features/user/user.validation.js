//C:\Users\HP\MediTrack\features\user\user.validation.js

const { z } = require("zod");

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleInitial: z.string().max(1).optional().default(''),
  suffix: z.string().optional().default(''),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  universityId: z.string().min(1, "University ID is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});

module.exports = { registerSchema, loginSchema, firebaseAuthSchema };