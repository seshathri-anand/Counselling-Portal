const db = require("../config/connectMysql");
const bcrypt = require("bcrypt");

async function createAdmin() {
  try {
    const username = "admin";
    const email = "admin@example.com";
    const password = "admin123";

    const [existing] = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existing.length > 0) {
      console.log("Admin already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, "system_admin"]
    );

    console.log("Admin created successfully!");
  } catch (err) {
    console.error("Create admin error:", err.message);
  }
}

module.exports = createAdmin;
