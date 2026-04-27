const { z } = require("zod");

const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must be at most 200 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  dept: z.string().default("All Departments"),
  date: z.string().min(1, "Date is required"),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(10).optional(),
  dept: z.string().optional(),
  date: z.string().optional(),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };