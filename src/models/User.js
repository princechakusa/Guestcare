const db = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  static async create({ name, email, password, role = 'agent' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
    `;
    const values = [name, email, hashedPassword, role];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, name, email, role FROM users WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = User;