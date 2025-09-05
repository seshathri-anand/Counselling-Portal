// ------------------- Get Dashboard Summary -------------------
const db = require('../config/db'); // your MySQL pool

exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const query = `
      SELECT u.user_id,
        (SELECT ss.full_name
         FROM student_submissions ss
         WHERE ss.user_id = u.user_id
         ORDER BY ss.submitted_at DESC
         LIMIT 1) AS full_name,
        CASE WHEN EXISTS (SELECT 1 FROM student_submissions ss WHERE ss.user_id = u.user_id) THEN 1 ELSE 0 END AS details_submitted,
        CASE WHEN COUNT(c.choice_id) > 0 THEN 1 ELSE 0 END AS choices_filled,
        COUNT(c.choice_id) AS choices_count,
        COALESCE(a.allotment_status, 'Not Allotted') AS allotment_status
      FROM users u
      LEFT JOIN choices c ON u.user_id = c.user_id
      LEFT JOIN (
        SELECT al.user_id, al.allotment_status
        FROM allotments al
        WHERE al.created_at = (SELECT MAX(created_at) FROM allotments WHERE user_id = al.user_id)
      ) a ON u.user_id = a.user_id
      WHERE u.user_id = ?
      GROUP BY u.user_id, a.allotment_status;
    `;

    const [rows] = await db.execute(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NO_DATA",
        message: "No dashboard summary available",
        data: {
          user_id: userId,
          full_name: null,
          details_submitted: 0,
          choices_filled: 0,
          choices_count: 0,
          allotment_status: "Not Allotted"
        }
      });
    }

    const summary = rows[0];
    summary.next_action = summary.details_submitted
      ? (summary.choices_filled ? "WAIT_FOR_ALLOTMENT" : "FILL_CHOICES")
      : "SUBMIT_DETAILS";

    return res.json({ success: true, data: summary });

  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred",
      data: null
    });
  }
};