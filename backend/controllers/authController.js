const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ======================== SIGNUP ========================
exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;

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

// ======================== LOGIN ========================
exports.login = async (req, res) => {
  try {
    let { email, username, password } = req.body;

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

// ======================== VERIFY TOKEN ========================
exports.verify = async (req, res) => {
  try {
    // If authenticateStudent middleware passed, token is valid
    res.status(200).json({
      valid: true,
      user: req.user // { user_id, role, etc. }
    });
  } catch (err) {
    console.error('Auth verify error:', err);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
};
