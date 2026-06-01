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
  day: z.number().int().min(1).max(31).optional(),
  time: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["student", "instructor", "staff"]).optional(),
  serviceType: z.string().optional(),
  reason: z.string().optional(),
  day: z.number().int().min(1).max(31).optional(),
  time: z.string().optional(),
  status: z.enum(["pending", "approved", "done", "missed", "Pending", "Confirmed", "Completed", "Cancelled"]).optional(),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema };