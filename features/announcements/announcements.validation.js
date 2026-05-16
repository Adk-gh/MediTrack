const { z } = require("zod");

const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must be at most 200 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  dept: z.string().default("All Departments"),
  date: z.string().min(1, "Date is required"),

  // 👇 The new fields from your frontend form
  category: z.string().optional(),
  priority: z.string().optional(),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().optional(),

  // 🔴 CRITICAL: Allow the base64 image string to pass validation
  image: z.string().nullable().optional(),
});

// Zod's .partial() makes every field inside the schema optional for updates!
const updateAnnouncementSchema = createAnnouncementSchema.partial();

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };