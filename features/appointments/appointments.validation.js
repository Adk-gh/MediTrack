// C:\Users\HP\MediTrack\features\appointments\appointments.validation.js
const { z } = require("zod");

const createAppointmentSchema = z.object({
  // Identity Fields
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  type: z.enum(["student", "instructor", "staff"], { errorMap: () => ({ message: "Type must be student, instructor, or staff" }) }),

  // Medical Fields (Added these to match your frontend payload)
  serviceType: z.string().min(1, "Service type is required"),
  reason: z.string().optional(),

  // Scheduling Fields (Made optional because the clinic assigns them later)
  year: z.coerce.number().int().min(2020).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(31).optional(),
  time: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["student", "instructor", "staff"]).optional(),
  serviceType: z.string().optional(),
  reason: z.string().optional(),

  // Coerce converts frontend strings like "08" into the number 8 safely
  year: z.coerce.number().int().min(2020).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(31).optional(),
  time: z.string().optional(),

  status: z.enum(["pending", "approved", "done", "missed", "rejected", "Pending", "Confirmed", "Completed", "Cancelled"]).optional(),
});

// ── NEW: Faculty bulk-booking a group of students via CSV of University IDs ──
const bulkCreateAppointmentSchema = z.object({
  facultyName: z.string().min(2, "Faculty name is required").max(100),
  facultyId:   z.string().optional(),
  serviceType: z.string().min(1, "Service type is required"),
  reason:      z.string().optional(),

  year:  z.coerce.number().int().min(2020).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  day:   z.coerce.number().int().min(1).max(31).optional(),
  time:  z.string().optional(),

  studentIds: z.array(z.string().min(1))
    .min(1, "At least one student University ID is required")
    .max(200, "Maximum 200 students per bulk request"),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, bulkCreateAppointmentSchema };