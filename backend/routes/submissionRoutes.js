const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/submissionController");
const { authenticateStudent } = require("../middlewares/auth");
const { submissionValidationRules, validateSubmission } = require("../middlewares/validateSubmission");

// ------------------- Get latest submission -------------------
router.get(
  "/latest",
  authenticateStudent,          // Ensure only authenticated students can access
  submissionController.getLatestSubmission
);

// ------------------- Create a new submission -------------------
router.post(
  "/",
  authenticateStudent,          // Ensure only authenticated students can submit
  submissionValidationRules,    // Validate submission input fields
  validateSubmission,           // Handle validation errors
  submissionController.createSubmission
);

module.exports = router;
