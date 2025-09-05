const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middlewares/auth');

// Auth
router.post('/login', adminController.login);
router.get('/auth/verify',authenticateAdmin,adminController.verify);
// Student submissions review
router.get('/submissions', authenticateAdmin, adminController.getSubmissions);
router.patch('/submissions/:id/status', authenticateAdmin, adminController.updateSubmissionStatus);

// Seat allotment
router.post('/allotments', authenticateAdmin, adminController.allocateSeats);
router.patch(
  '/submission-overrides/:student_id/attempts', 
  authenticateAdmin, 
  adminController.increaseAttempt
);

module.exports = router;
