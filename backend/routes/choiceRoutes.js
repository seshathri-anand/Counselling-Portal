const express = require("express");
const router = express.Router();
const choiceController = require("../controllers/choiceController");
const { authenticateStudent } = require("../middlewares/auth");
const { validateChoices } = require("../middlewares/validateChoices");

router.post(
  "/reset",
  authenticateStudent,       
  choiceController.resetChoices
);

// ------------------- Get all available choices -------------------
router.get(
  "/",
  authenticateStudent,         // Ensure user is authenticated
  choiceController.getAvailableChoices
);

// ------------------- Get user's submitted choices -------------------
router.get(
  "/mine",
  authenticateStudent,         // Ensure user is authenticated
  choiceController.getSubmittedChoices
);

// ------------------- Submit choices -------------------
router.post(
  "/",
  authenticateStudent,         // Ensure user is authenticated
  validateChoices,             // Validate choices array
  choiceController.postChoices
);

module.exports = router;
