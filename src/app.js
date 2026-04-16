const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');  // <-- ADD THIS LINE
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);  // <-- ADD THIS LINE

app.get('/', (req, res) => {
  res.send('Guest Experience Tracker API is running...');
});

// Temporary Debug Endpoint
app.get('/api/debug/db', async (req, res) => {
  const { query } = require('./config/db');
  try {
    const result = await query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
});

// Error handler must be last!
app.use(errorHandler);

module.exports = app;