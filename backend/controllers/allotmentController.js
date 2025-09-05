// controllers/allotmentController.js
const db = require('../config/db');

exports.getAllotment = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Fetch latest allotment for the user
    const [rows] = await db.query(
      `SELECT a.allotment_id, a.user_id, a.college_id, a.branch_id, a.choice_id,
              a.allotment_status, a.created_at,
              c.college_name, b.branch_name
       FROM allotments a
       LEFT JOIN colleges c ON a.college_id = c.college_id
       LEFT JOIN branches b ON a.branch_id = b.branch_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        status: "NO_RECORD",
        message: "Counselling not started yet",
        data: null
      });
    }

    const allotment = rows[0];

    if (allotment.allotment_status === "not_allotted") {
      return res.status(200).json({
        success: true,
        status: "NOT_ALLOTTED",
        message: "You have not been allotted a college yet",
        data: allotment
      });
    }

    // Return the latest allotment
    return res.status(200).json({
      success: true,
      status: "ALLOTTED",
      message: "Allotment found",
      data: allotment
    });

  } catch (err) {
    console.error("Error fetching allotment:", err);
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to fetch allotment"
    });
  }
};
