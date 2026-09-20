//C:\Users\HP\MediTrack\features\user\user.validation.js
const { z } = require("zod");

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional().default(''),
  suffix: z.string().optional().default(''),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  universityId: z
  .string()
  .trim()
  .min(1, "University ID is required")
  .regex(
    /^(?:\d{2}-\d{5}|\d{4}-\d{4})$/,
    "University ID must use XX-XXXXX or XXXX-XXXX format"
  ),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

module.exports = { registerSchema, loginSchema };