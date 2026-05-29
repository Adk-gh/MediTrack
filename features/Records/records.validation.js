//C:\Users\HP\MediTrack\features\Records\records.validation.js
const { z } = require('zod');

const createRecordSchema = z.object({
  // Only the absolute core fields should be required
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password is required"),
  universityId: z.string().min(1, "ID is required"),
  role: z.string().min(1, "Role is required"),

  // EVERYTHING else must be optional so Zod doesn't throw the "undefined" error
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  sex: z.string().optional(),
  birthday: z.string().optional(),
  age: z.union([z.string(), z.number()]).optional(),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  civilStatus: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),

  program: z.string().optional(),
  yearLevel: z.string().optional(),
  section: z.string().optional(),
  studentClassification: z.string().optional(),

  jobTitle: z.string().optional(),
  classification: z.string().optional(),

  isProfileSetup: z.boolean().optional(),
  profileComplete: z.boolean().optional(),
  bloodType: z.string().optional(),
  homeAddress: z.string().optional(),
  emergencyContact: z.any().optional(),
  vaccinations: z.any().optional()
});

module.exports = { createRecordSchema };