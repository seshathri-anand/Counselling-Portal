// config/db.js
const mysql = require('mysql2/promise');

// Hardcoded MySQL credentials
const pool = mysql.createPool({
  host: 'your MySQL host',           
  user: 'your MySQL username',                
  password: 'your MySQL password',   
  database: 'counselling_system', // your database nametouch
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: test connection immediately
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection successful!');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Uncomment the next line to test connection when this module is loaded
// testConnection();

module.exports = pool;
