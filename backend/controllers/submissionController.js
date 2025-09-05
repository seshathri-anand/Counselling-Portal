// controllers/submissionController.js
const db = require('../config/db');

// GET /api/submissions/latest
exports.getLatestSubmission = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get latest submission + attempts left
    const [rows] = await db.query(
      `SELECT s.*, o.attempts_left
       FROM student_submissions s
       LEFT JOIN submission_overrides o 
         ON s.user_id = o.student_id
         AND (o.expires_at IS NULL OR o.expires_at > NOW())
       WHERE s.user_id = ?
       ORDER BY s.submitted_at DESC 
       LIMIT 1`,
      [user_id]
    );

    // Also fetch attempts if no submission exists yet
    if (rows.length === 0) {
      const [overrideRows] = await db.query(
        `SELECT attempts_left 
         FROM submission_overrides 
         WHERE student_id = ? 
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [user_id]
      );

      return res.status(200).json({
        submission: null,
        attempts_left: overrideRows[0]?.attempts_left ?? 3 // default if never used
      });
    }

    res.status(200).json({
      submission: rows[0],
      attempts_left: rows[0].attempts_left ?? 3
    });

  } catch (err) {
    console.error("Error fetching latest submission:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/submissions
exports.createSubmission = async (req, res) => {
  const connection = await db.getConnection(); // For transaction

  try {
    const user_id = req.user.user_id;
    const { full_name, dob, marksheet_number, physics, chemistry, maths} = req.body;
    const cutoff=(physics+chemistry)/2+maths;
    // Check for duplicate marksheet number first
    let [marksheet] = await connection.query(
      `SELECT * FROM student_submissions 
      WHERE user_id != ? AND marksheet_number = ?`,
      [user_id, marksheet_number]
    );

    if (marksheet.length > 0) {
      // Duplicate found → return custom error code
      return res.status(409).json({ // 409 = Conflict
        error: "DUPLICATE_ENTRY",
        message: `Marksheet number '${marksheet_number}' already exists for another user.`
      });
    }

    // ------------------ Start transaction ------------------
    await connection.beginTransaction();

    // 1️⃣ Get current attempts_left
    let [overrideRows] = await connection.query(
      `SELECT attempts_left, expires_at 
       FROM submission_overrides 
       WHERE student_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
      [user_id]
    );

    let attempts_left;
    if (overrideRows.length > 0) {
      attempts_left = overrideRows[0].attempts_left;
    } else {
      // First-time student → insert default 3 attempts (consume 1 now)
      attempts_left = 3;
      await connection.query(
        `INSERT INTO submission_overrides (student_id, attempts_left) VALUES (?, ?)`,
        [user_id, attempts_left]
      );
    }

    if (attempts_left <= 0) {
      await connection.rollback();
      return res.status(403).json({ message: "No attempts left. Contact admin for override." });
    }

    // ------------------ Check latest submission ------------------
    const [latest] = await connection.query(
      `SELECT status FROM student_submissions 
       WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1`,
      [user_id]
    );

    if (latest.length && latest[0].status !== 'rejected') {
      await connection.rollback();
      return res.status(400).json({
        message: "You can only submit again if your previous submission was rejected."
      });
    }

    // ------------------ Insert submission ------------------
    const [result] = await connection.query(
      `INSERT INTO student_submissions 
       (user_id, full_name, dob, marksheet_number, physics, chemistry, maths, cutoff) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, full_name, dob, marksheet_number, physics, chemistry, maths, cutoff]
    );

    // ------------------ Decrement attempts_left ------------------
    await connection.query(
      `UPDATE submission_overrides 
       SET attempts_left = attempts_left - 1 
       WHERE student_id = ?`,
      [user_id]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Submission created successfully",
      submission_id: result.insertId,
      attempts_left: attempts_left - 1
    });

  } catch (err) {
    await connection.rollback();
    console.error("Submission creation error:", err);
    return res.status(500).json({ message:err });
  } finally {
    connection.release();
  }
};
