const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateStudent } = require("../middlewares/auth");
const { signupValidationRules, loginValidationRules, validateUserInput } = require("../middlewares/validateUser");

// ------------------- Signup -------------------
router.post(
  "/signup",
  signupValidationRules,   // Validate input fields
  validateUserInput,       // Handle validation errors
  authController.signup    // Controller handles business logic
);

// ------------------- Login -------------------
router.post(
  "/login",
  loginValidationRules,    // Validate input fields
  validateUserInput,       // Handle validation errors
  authController.login     // Controller handles login
);

// ------------------- Token verification -------------------
router.get(
  "/verify",
  authenticateStudent,     // Auth middleware ensures valid student JWT
  authController.verify    // Controller responds with user info
);

module.exports = router;
