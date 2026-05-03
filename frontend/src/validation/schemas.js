// C:\Users\HP\MediTrack\frontend\src\validation\schemas.js
import { z } from "zod";

// ── User schemas ───────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleInitial: z.string().max(1).optional(),
  suffix: z.string().optional(),
  email: z.string().email("Invalid email format"),
  universityId: z.string().min(1, "University ID is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// ── Profile Setup schema ───────────────────────────────────────────────────────
// Validates the full profile submitted from ProfileSetup.jsx

const vaccinationRecordSchema = z.object({
  dose: z.enum(['1st Dose', '2nd Dose', '3rd Dose', 'Booster 1', 'Booster 2']).optional().or(z.literal('')),
  vaccineName: z.string().optional(),
  date: z.string().optional(),   // ISO date string YYYY-MM-DD
});

export const profileSetupSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleInitial: z.string().max(1).optional(),
  suffix: z.string().optional(),
  birthday: z.string().min(1, "Birthday is required"),
  age: z.union([z.string(), z.number()]).optional(),
  gender: z.enum(["Male", "Female"], { errorMap: () => ({ message: "Sex is required" }) }),
  bloodType: z.string().optional(),

  // Identity
  homeAddress: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  civilStatus: z.enum(["Single", "Married", "Widowed", "Divorced", "Separated"]).optional(),

  // Academic (students)
  studentId: z.string().optional(),
  department: z.string().optional(),
  program: z.string().optional(),
  yearLevel: z.string().optional(),
  section: z.string().optional(),

  // Work (non-students)
  classification: z.string().optional(),
  jobTitle: z.string().optional(),

  // Contact
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phoneNumber: z.string().regex(/^[0-9]{11}$/, "Phone must be 11 digits").optional().or(z.literal("")),

  // Emergency Contact (nested)
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().regex(/^[0-9]{11}$/, "Phone must be 11 digits").optional().or(z.literal("")),
    address: z.string().optional(),
  }).optional(),

  // Vaccination History
  vaccinations: z.array(vaccinationRecordSchema).optional(),

  // Meta
  role: z.string().optional(),
  profileComplete: z.boolean().optional(),
});

// ── Records schemas ────────────────────────────────────────────────────────────

export const createRecordSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(["student", "instructor", "staff"], { errorMap: () => ({ message: "Select a valid type" }) }),
  department: z.string().min(1, "Department is required"),
});

// ── Appointments schemas ───────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  id: z.string().min(1, "ID is required"),
  type: z.enum(["student", "instructor", "staff"]),
  time: z.string().min(1, "Time is required"),
});

// ── Examinations schemas ───────────────────────────────────────────────────────

export const examinationSchema = z.object({
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  studentId: z.string().optional(),
  course: z.string().optional(),
  yearSection: z.string().optional(),
  address: z.string().optional(),
  birthday: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  age: z.number().int().optional(),
  contactNo: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  civilStatus: z.enum(["Single", "Married", "Widowed", "Divorced", "Separated"]).optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  homeAddress: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyAddress: z.string().optional(),
  bp: z.string().optional(),
  pr: z.string().optional(),
  rr: z.string().optional(),
  temp: z.string().optional(),
  wt: z.string().optional(),
  ht: z.string().optional(),
  waist: z.string().optional(),
  lmp: z.string().optional(),
  nurse: z.string().optional(),
  physician: z.string().optional(),
  remarks: z.string().optional(),
});

// ── Announcements schemas ──────────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  dept: z.string().optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

export const validateForm = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, errors: null };
  }
  const errors = {};
  result.error.issues.forEach((issue) => {
    const field = issue.path.join(".");
    errors[field] = issue.message;
  });
  return { success: false, errors };
};

export const getFieldErrors = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors = {};
  result.error.issues.forEach((issue) => {
    const field = issue.path.join(".");
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  });
  return errors;
};