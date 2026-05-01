// C:\Users\HP\MediTrack\validation\validate-data.js

const validateData = (schema) => (req, res, next) => {
  // With multipart/form-data, fields are in req.body after multer runs
  // but they come as strings — coerce optional fields
  const body = {
    ...req.body,
    middleInitial: req.body.middleInitial || '',
    suffix: req.body.suffix || '',
  };

  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return res.status(422).json({
      success: false,
      message: firstError.message || 'Validation failed',
    });
  }

  req.body = result.data; // replace with parsed/coerced data
  next();
};

module.exports = validateData;