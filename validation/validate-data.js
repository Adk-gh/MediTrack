const { z } = require("zod");

const validateData = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return res.status(422).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: "Validation error" });
  }
};

module.exports = validateData;