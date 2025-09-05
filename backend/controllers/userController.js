const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // your MySQL pool

// ======================== SIGNUP ========================
//post /api/users/signup
exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Normalize email
    email = email.toLowerCase();

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into DB with role 'student'
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'student']
    );

    // Generate JWT
    const token = jwt.sign(
      { user_id: result.insertId, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'User registered successfully', token });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
//====================================== LOGIN ===========================================
//post /api/users/login
exports.login = async (req, res) => {
    try {
        let { email, username, password } = req.body;

        // Validate input
        if (!username && !email) {
            return res.status(400).json({ message: 'Email or Username is required' });
        }

        // Check if password is missing
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Normalize
        if (email) email = email.toLowerCase();
        if (username) username = username.toLowerCase();

        // Query user by email or username
        const query = email ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE username = ?';
        const value = email || username;

        const [users] = await db.query(query, [value]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getDashboardSummary = async (req, res) => {
  try {
    // ✅ Ensure auth middleware set user_id
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "User not authenticated",
        data: null
      });
    }

    const userId = req.user.user_id;
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_USER_ID",
        message: "User ID is invalid",
        data: null
      });
    }

    const query = `
      SELECT 
          u.user_id,

          -- ✅ Get latest submitted name from submissions
          (
            SELECT ss.full_name
            FROM student_submissions ss
            WHERE ss.user_id = u.user_id
            ORDER BY ss.submitted_at DESC
            LIMIT 1
          ) AS full_name,

          -- ✅ Check if details ever submitted
          CASE 
              WHEN EXISTS (
                  SELECT 1 
                  FROM student_submissions ss 
                  WHERE ss.user_id = u.user_id
              ) THEN 1 
              ELSE 0 
          END AS details_submitted,

          -- ✅ Count choices
          CASE 
              WHEN COUNT(c.choice_id) > 0 THEN 1 
              ELSE 0 
          END AS choices_filled,
          COUNT(c.choice_id) AS choices_count,

          -- ✅ Latest allotment status
          COALESCE(a.allotment_status, 'Not Allotted') AS allotment_status

      FROM users u
      LEFT JOIN choices c 
          ON u.user_id = c.user_id
      LEFT JOIN (
          SELECT al.user_id, al.allotment_status
          FROM allotments al
          WHERE al.created_at = (
              SELECT MAX(created_at) 
              FROM allotments 
              WHERE user_id = al.user_id
          )
      ) a ON u.user_id = a.user_id
      WHERE u.user_id = ?
      GROUP BY u.user_id, a.allotment_status;
    `;

    let rows;
    try {
      [rows] = await db.execute(query, [userId]);
    } catch (dbErr) {
      console.error("DB Query Error:", dbErr);
      return res.status(500).json({
        success: false,
        error: "DB_QUERY_ERROR",
        message: "Failed to fetch dashboard summary",
        data: null
      });
    }

    // ✅ If user exists but no data
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NO_DATA",
        message: "No dashboard summary available for this user",
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

    // ✅ Suggest next action for frontend
    summary.next_action = summary.details_submitted
      ? (summary.choices_filled ? "WAIT_FOR_ALLOTMENT" : "FILL_CHOICES")
      : "SUBMIT_DETAILS";

    return res.json({
      success: true,
      data: summary
    });

  } catch (err) {
    console.error("Unexpected Error:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred",
      data: null
    });
  }
};
//post 
exports.verify = async (req, res) => {
  try {
    // If authenticateStudent passed, token is valid
    return res.status(200).json({
      valid: true,
      user: req.user   // e.g. { user_id, email }
    });
  } catch (err) {
    console.error("Auth verify error:", err);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
};

// post api/users/submission
exports.createSubmission = async (req, res) => {
  try {
    const user_id = req.user.user_id; // from authenticateStudent middleware
    let { full_name, email, dob, marksheet_number, physics, chemistry, maths } = req.body;

    // ---------------- Basic Validation ----------------
    if (!full_name || !email || !dob || !marksheet_number || physics == null || chemistry == null || maths == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Normalize email
    email = email.toLowerCase();

    // Marks validation
    if (
      physics < 0 || physics > 100 ||
      chemistry < 0 || chemistry > 100 ||
      maths < 0 || maths > 100
    ) {
      return res.status(400).json({ message: "Marks should be between 0 and 100" });
    }

    // DOB validation
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    // ---------------- Check Previous Submissions ----------------
    const [latest] = await db.query(
      `SELECT status FROM student_submissions 
       WHERE user_id = ? 
       ORDER BY submitted_at DESC 
       LIMIT 1`,
      [user_id]
    );

    if (latest.length > 0 && latest[0].status !== "rejected") {
      return res.status(400).json({
        message: "You can only submit again if your previous submission was rejected."
      });
    }

    // ---------------- Check Duplicate Marksheet ----------------
    const [existing] = await db.query(
    `SELECT * FROM student_submissions WHERE marksheet_number = ? AND status = 'Approved'`,
    [marksheet_number]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Marksheet already submitted" });
    }

    // ---------------- Calculate Cutoff ----------------
    const cutoff = maths + (physics + chemistry) / 2.0;

    // ---------------- Insert Submission ----------------
    const [result] = await db.query(
      `INSERT INTO student_submissions 
       (user_id, full_name, email, dob, marksheet_number, physics, chemistry, maths, cutoff) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, full_name, email, dob, marksheet_number, physics, chemistry, maths, cutoff]
    );

    return res.status(201).json({
      message: "Submission created successfully",
      submission_id: result.insertId
    });

  } catch (err) {
    console.error("Submission creation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//get users/submission/latest
exports.getLatestSubmission = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const [rows] = await db.query(
      'SELECT * FROM student_submissions WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({ submission: null });
    }

    res.status(200).json({ submission: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch submission' });
  }
};

// get /api/users/choices/available
exports.getChoices = async (req, res) => {
  try {
    // Fetch seats where available seats > 0
    const [choices] = await db.query(`
      SELECT s.seat_id, s.college_id, s.branch_id, s.total_seats, s.reserved_seats,
             c.college_name, b.branch_name,
             (s.total_seats - s.reserved_seats) AS available_seats
      FROM seats s
      JOIN colleges c ON s.college_id = c.college_id
      JOIN branches b ON s.branch_id = b.branch_id
      WHERE s.reserved_seats < s.total_seats
      ORDER BY c.college_name, b.branch_name
    `);

    if (choices.length === 0) {
      return res.status(404).json({ message: "No seats available currently." });
    }

    return res.status(200).json({ choices });

  } catch (err) {
    console.error("Get choices error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//post /api/users/choices/
exports.postChoices = async (req, res) => {
  const user_id = req.user.user_id;
  const { choices } = req.body;

  const connection = await db.getConnection(); // get a single connection for transaction

  try {
    // Start transaction
    await connection.beginTransaction();

    // Validate choices for duplicates in college-branch pairs and preference_order
    const seenPairs = new Set();
    const seenOrders = new Set();

    for (let choice of choices) {
      const pairKey = `${choice.college_id}-${choice.branch_id}`;
      if (seenPairs.has(pairKey)) {
        throw new Error("Duplicate college-branch selections in choices");
      }
      if (seenOrders.has(choice.preference_order)) {
        throw new Error("Duplicate preference_order values in choices");
      }
      seenPairs.add(pairKey);
      seenOrders.add(choice.preference_order);
    }

    // Optional: check if student already submitted
    const [existingChoices] = await connection.query(
      "SELECT * FROM choices WHERE user_id = ?",
      [user_id]
    );
    if (existingChoices.length > 0) {
      throw new Error("You have already submitted your choice list");
    }

    // Insert all choices
    for (let choice of choices) {
      await connection.query(
        "INSERT INTO choices (user_id, college_id, branch_id, preference_order) VALUES (?, ?, ?, ?)",
        [user_id, choice.college_id, choice.branch_id, choice.preference_order]
      );
    }

    // Commit transaction
    await connection.commit();
    res.status(201).json({ message: "Choices submitted successfully" });

  } catch (err) {
    // Rollback if any error occurs
    await connection.rollback();
    console.error("Error submitting choices:", err);
    res.status(400).json({ message: err.message || "Server error" });

  } finally {
    // Release connection back to pool
    connection.release();
  }
};

//get  /api/users/choices/mine
exports.getSubmittedChoices = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "User not authenticated"
      });
    }

    const user_id = req.user.user_id;
    const [rows] = await db.query(
      "SELECT * FROM choices WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        choices: [],
        message: "No choices found for this user"
      });
    }

    return res.status(200).json({
      success: true,
      choices: rows
    });

  } catch (err) {
    console.error("Error fetching choices:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred"
    });
  }
};

exports.getAllotment = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const [rows] = await db.query(
      "SELECT * FROM allotments WHERE user_id = ?",
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
        message: "You have not been allotted a college",
        data: allotment
      });
    }

    return res.status(200).json({
      success: true,
      status: "ALLOTTED",
      message: "Allotment found",
      data: allotment
    });
  } catch (err) {
    console.error("Error fetching allotments:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

