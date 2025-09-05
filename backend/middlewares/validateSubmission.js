// middlewares/validateSubmission.js
const { body, validationResult } = require('express-validator');

const submissionValidationRules = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('physics').isInt({ min: 0, max: 100 }).withMessage('Physics marks must be 0-100'),
  body('chemistry').isInt({ min: 0, max: 100 }).withMessage('Chemistry marks must be 0-100'),
  body('maths').isInt({ min: 0, max: 100 }).withMessage('Maths marks must be 0-100'),
  body('marksheet_number').notEmpty().withMessage('Marksheet number is required'),
  body('dob').isDate().withMessage('DOB must be a valid date')
];

const validateSubmission = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { submissionValidationRules, validateSubmission };
