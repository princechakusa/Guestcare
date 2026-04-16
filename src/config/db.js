const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Render's self-signed certificates
  },
  connectionTimeoutMillis: 15000, // 15 seconds
  idleTimeoutMillis: 30000,
  max: 5,
});

pool.on('connect', () => {
  console.log('✅ New database client connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Test connection on startup with detailed error
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection test failed:');
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
    console.error('   Stack:', err.stack);
  } else {
    console.log('✅ Database connection test successful:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};