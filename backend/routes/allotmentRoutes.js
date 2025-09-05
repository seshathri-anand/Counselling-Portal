const express = require("express");
const router = express.Router();
const allotmentController = require("../controllers/allotmentController");
const { authenticateStudent } = require("../middlewares/auth");

router.get("/", authenticateStudent, allotmentController.getAllotment);

module.exports = router;
