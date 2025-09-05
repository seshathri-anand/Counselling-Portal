const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticateStudent } = require("../middlewares/auth");

// ------------------- Get student's dashboard summary -------------------
router.get(
  "/summary",
  authenticateStudent,            // Ensure only authenticated students can access
  dashboardController.getDashboardSummary
);

module.exports = router;
