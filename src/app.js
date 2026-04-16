const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Guest Experience Tracker API is running...');
});

// Error handler must be last!
app.use(errorHandler);

module.exports = app;