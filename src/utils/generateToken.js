const jwt = require('jsonwebtoken');

// TEMPORARY HARDCODED SECRET (change this to a strong random string later)
const TEMP_SECRET = 'my_temporary_jwt_secret_for_testing_2024';

const generateToken = (id, role) => {
  // Use environment variable if available, otherwise fallback to hardcoded secret
  const secret = process.env.JWT_SECRET || TEMP_SECRET;
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;