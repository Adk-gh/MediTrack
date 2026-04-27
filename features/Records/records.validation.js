const { z } = require("zod");

const createRecordSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  type: z.enum(["student", "instructor", "staff"], { errorMap: () => ({ message: "Type must be student, instructor, or staff" }) }),
  department: z.string().min(1, "Department is required"),
  history: z.array(z.string()).optional(),
});

const updateRecordSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  type: z.enum(["student", "instructor", "staff"]).optional(),
  department: z.string().optional(),
  history: z.array(z.string()).optional(),
});

module.exports = { createRecordSchema, updateRecordSchema };