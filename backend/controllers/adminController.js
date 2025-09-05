// controllers/adminController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


exports.login = async (req, res) => {
    try {
        let { email, username, password } = req.body;

        // Check missing fields separately
        if (!email && !username) {
            return res.status(400).json({ message: 'Email or Username is required' });
        }
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
        if (user.role !== 'system_admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

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

exports.getSubmissions = async (req, res) => {
  try {
    const [submissions] = await db.query(`
      SELECT s.submission_id, s.user_id, s.full_name, s.marksheet_number, 
             s.physics, s.chemistry, s.maths, s.cutoff, s.dob, s.status, s.submitted_at
      FROM student_submissions s
      INNER JOIN (
        SELECT user_id, MAX(submitted_at) AS latest_submission
        FROM student_submissions
        GROUP BY user_id
      ) AS latest ON s.user_id = latest.user_id AND s.submitted_at = latest.latest_submission
      ORDER BY s.submitted_at DESC
    `);

    res.status(200).json({ submissions });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.updateSubmissionStatus = async (req, res) => {
  try {
    const submission_id = Number(req.params.id);  // or req.params.submission_id depending on your route
    const { status } = req.body;
    console.log("submission_id:", submission_id);

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Update the submission
    const [result] = await db.query(
      "UPDATE student_submissions SET status = ? WHERE submission_id = ?",
      [status, submission_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.status(200).json({ message: `Submission ${status} successfully` });
  } catch (err) {
    console.error('Error updating submission status:', err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.allocateSeats = async (req, res) => {
  const connection = await db.getConnection(); // get a dedicated connection for transaction

  try {
    // 1️⃣ Start transaction
    await connection.beginTransaction();

    // 2️⃣ Fetch all submitted students sorted by cutoff descending
    const [students] = await connection.query(`
      SELECT student_id, user_id, cutoff
      FROM students 
      ORDER BY cutoff DESC
    `);

    if (students.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No students submitted for counselling.' });
    }

    // 3️⃣ Fetch all seats once (in-memory)
    const [seats] = await connection.query("SELECT * FROM seats");

    // 4️⃣ Loop through each student
    for (let student of students) {
      // Fetch student choices ordered by priority
      const [choices] = await connection.query(
        "SELECT * FROM choices WHERE user_id = ? ORDER BY preference_order",
        [student.user_id]
      );

      let allocated = false;

      for (let choice of choices) {
        // Find the seat in the in-memory array
        const seat = seats.find(
          s => s.college_id === choice.college_id && s.branch_id === choice.branch_id
        );

        // Check if seat is available
        if (seat && seat.total_seats - seat.reserved_seats > 0) {
          // Insert into allotments table
          await connection.query(
            `INSERT INTO allotments (user_id, college_id, branch_id, choice_id, allotment_status)
             VALUES (?, ?, ?, ?, 'Allotted')`,
            [student.user_id, seat.college_id, seat.branch_id, choice.choice_id]
          );

          // Update reserved_seats
          await connection.query(
            "UPDATE seats SET reserved_seats = reserved_seats + 1 WHERE seat_id = ?",
            [seat.seat_id]
          );

          // Update in-memory representation
          seat.reserved_seats += 1;

          // Update student application status
          await connection.query(
            "UPDATE students SET allotment_status = 'allotted' WHERE user_id = ?",
            [student.user_id]
          );

          allocated = true;
          break; // move to next student
        }
      }

      if (!allocated) {
        // Mark as 'not_allotted'
        await connection.query(
          "UPDATE students SET allotment_status = 'not_allotted' WHERE user_id = ?",
          [student.user_id]
        );
      }
    }

    // 5️⃣ Commit transaction after all students are processed
    await connection.commit();
    return res.status(200).json({ message: 'Seat allotment completed successfully.' });

  } catch (err) {
    // Rollback in case of any error
    await connection.rollback();
    console.error("Seat allotment error:", err);
    return res.status(500).json({ message: 'Server error during allotment.' });
  } finally {
    connection.release(); // release connection back to pool
  }
};

exports.increaseAttempt = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Only increase if attempts_left = 0
    const [row] = await db.query(
      "SELECT attempts_left FROM submission_overrides WHERE student_id = ?",
      [student_id]
    );

    if (row.length === 0) {
      return res.status(404).json({ message: "No submission override found for this student" });
    }

    if (row[0].attempts_left > 0) {
      return res.status(400).json({ message: "Student already has attempts left" });
    }

    // Update attempts_left to 1
    await db.query(
      "UPDATE submission_overrides SET attempts_left = 1 WHERE student_id = ?",
      [student_id]
    );

    res.status(200).json({ message: "Attempt granted successfully", attempts_left: 1 });
  } catch (err) {
    console.error("Error increasing attempts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verify = async (req, res) => {
  try {
    // If authenticateAdmin  middleware passed, token is valid
    res.status(200).json({
      valid: true,
      user: req.user // { user_id, role, etc. }
    });
  } catch (err) {
    console.error('Auth verify error:', err);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
};