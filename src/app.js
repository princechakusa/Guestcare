const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');   // Added path module

const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const messageRoutes = require('./routes/messageRoutes');
const rootCauseRoutes = require('./routes/rootCauseRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Serve static files from the project root (login.html, auth.js, api.js, app.js, etc.)
app.use(express.static(path.join(__dirname, '..')));
// Explicitly serve css and js folders
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/root-cause', rootCauseRoutes);

// Root path redirects to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Temporary debug endpoint
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

// DEBUG: List root directory contents
app.get('/api/debug/files', (req, res) => {
  const fs = require('fs');
  const rootPath = path.join(__dirname, '..');
  fs.readdir(rootPath, (err, files) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ rootPath, files });
    }
  });
});

// Error handler must be last
app.use(errorHandler);

module.exports = app;