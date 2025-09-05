const { body, validationResult } = require('express-validator');

exports.signupValidationRules = [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.loginValidationRules = [
  body('email').optional().isEmail().withMessage('Email must be valid'),
  body('username').optional().notEmpty().withMessage('Username cannot be empty'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.validateUserInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
