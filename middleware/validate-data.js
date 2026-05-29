// C:\Users\HP\MediTrack\middleware\validate-data.js
const validateData = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    // ADD THIS CONSOLE.LOG TO SEE THE EXACT FIELD:
    console.error("VALIDATION ERROR DETAILS:", JSON.stringify(error.errors, null, 2));

    // Your existing error response
    return res.status(422).json({
      success: false,
      message: error.errors[0]?.message || 'Validation failed'
    });
  }
};