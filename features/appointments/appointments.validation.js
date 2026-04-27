const { z } = require("zod");

const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  type: z.enum(["student", "instructor", "staff"], { errorMap: () => ({ message: "Type must be student, instructor, or staff" }) }),
  day: z.number().int().min(1, "Day must be between 1 and 31").max(31, "Day must be between 1 and 31"),
  time: z.string().min(1, "Time is required"),
});

const updateAppointmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["student", "instructor", "staff"]).optional(),
  day: z.number().int().min(1).max(31).optional(),
  time: z.string().optional(),
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]).optional(),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema };