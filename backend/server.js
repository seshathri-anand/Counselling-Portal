const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const db = require('./config/db');

const pathObj={path:path.join(__dirname,'config','config.env')};
dotenv.config(pathObj);

const app = express();

//UPI payment feature -- development branch

// --- Middlewares ---
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store"); // avoid caching protected pages
  next();
});
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/submissions", require("./routes/submissionRoutes"));
app.use("/api/choices", require("./routes/choiceRoutes"));
app.use("/api/allotments", require("./routes/allotmentRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// --- DB Connection Test ---
async function testDbConnection() {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    console.log(`Database connection successful!\nConnected to ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
}

// --- Server Start ---
async function startServer() {
  try {
    await testDbConnection();
    app.listen(process.env.PORT, "0.0.0.0",() => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err.message);
    process.exit(1);
  }
}

startServer();

// --- Run Admin Seeder ---
//require("./utils/dbAdminSeeder")();
