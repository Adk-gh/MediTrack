import { z } from "zod";

// User schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email format"),
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

// Records schemas
export const createRecordSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(["student", "instructor", "staff"], { errorMap: () => ({ message: "Select a valid type" }) }),
  department: z.string().min(1, "Department is required"),
});

// Appointments schemas
export const createAppointmentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  id: z.string().min(1, "ID is required"),
  type: z.enum(["student", "instructor", "staff"]),
  time: z.string().min(1, "Time is required"),
});

// Examinations schemas
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
  civilStatus: z.enum(["Single", "Married", "Widowed", "Divorced"]).optional(),
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
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

// Announcements schemas
export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  dept: z.string().optional(),
});

// Helper function to validate form data
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

// Helper for real-time validation (returns errors object)
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