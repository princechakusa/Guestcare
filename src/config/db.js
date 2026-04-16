const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Render
  },
  connectionTimeoutMillis: 10000, // Wait 10 seconds for connection
  idleTimeoutMillis: 30000,       // Close idle clients after 30 seconds
  max: 5,                         // Max clients in pool
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection test successful:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};