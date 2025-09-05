// controllers/choiceController.js
const db = require('../config/db');

// GET /api/choices
exports.getAvailableChoices = async (req, res) => {
  try {
    const [choices] = await db.query(`
      SELECT 
        s.seat_id, 
        s.college_id, 
        s.branch_id, 
        s.total_seats, 
        s.reserved_seats,
        c.college_name, 
        b.branch_name,
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

    res.status(200).json({ choices });

  } catch (err) {
    console.error("Error fetching available choices:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/choices/mine
exports.getSubmittedChoices = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const [choices] = await db.query(
      `
      SELECT 
        c.choice_id,
        c.preference_order,
        cl.college_id,
        cl.college_name,
        b.branch_id,
        b.branch_name
      FROM choices c
      INNER JOIN colleges cl ON c.college_id = cl.college_id
      INNER JOIN branches b ON c.branch_id = b.branch_id
      WHERE c.user_id = ?
      ORDER BY c.preference_order ASC
      `,
      [user_id]
    );

    res.status(200).json({
      success: true,
      choices,
      message: choices.length
        ? "Choices retrieved successfully"
        : "No choices found for this user"
    });

  } catch (err) {
    console.error("Error fetching submitted choices:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// POST /api/choices
exports.postChoices = async (req, res) => {
  const user_id = req.user.user_id;
  const { choices } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Validate duplicates in college-branch pairs and preference_order
    const seenPairs = new Set();
    const seenOrders = new Set();

    for (const choice of choices) {
      const pairKey = `${choice.college_id}-${choice.branch_id}`;
      if (seenPairs.has(pairKey)) throw new Error("Duplicate college-branch selections in choices");
      if (seenOrders.has(choice.preference_order)) throw new Error("Duplicate preference_order values in choices");
      seenPairs.add(pairKey);
      seenOrders.add(choice.preference_order);
    }

    // Check if student already submitted choices
    const [existingChoices] = await connection.query(
      "SELECT * FROM choices WHERE user_id = ?",
      [user_id]
    );
    if (existingChoices.length > 0) throw new Error("You have already submitted your choice list");

    // Insert choices
    for (const choice of choices) {
      await connection.query(
        "INSERT INTO choices (user_id, college_id, branch_id, preference_order) VALUES (?, ?, ?, ?)",
        [user_id, choice.college_id, choice.branch_id, choice.preference_order]
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Choices submitted successfully" });

  } catch (err) {
    await connection.rollback();
    console.error("Error submitting choices:", err);
    res.status(400).json({ message: err.message || "Server error" });

  } finally {
    connection.release();
  }
};

exports.resetChoices = async (req, res) => {
  const user_id = req.user.user_id; 

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check if student has any choices submitted
    const [existingChoices] = await connection.query(
      "SELECT * FROM choices WHERE user_id = ?",
      [user_id]
    );
    if (existingChoices.length === 0) {
      throw new Error("No submitted choices to reset.");
    }

    // Delete all choices
    await connection.query(
      "DELETE FROM choices WHERE user_id = ?",
      [user_id]
    );

    await connection.commit();
    res.status(200).json({
      message: "All your previous choices have been deleted. You can now start afresh."
    });

  } catch (err) {
    await connection.rollback();
    console.error("Error resetting choices:", err);
    res.status(400).json({ message: err.message || "Server error" });
  } finally {
    connection.release();
  }
};