const db = require('../config/db');

class Agent {
  static async findAll() {
    const query = 'SELECT id, name, role, color, wa_name AS "waName", email, created_at FROM agents ORDER BY name';
    const { rows } = await db.query(query);
    return rows;
  }

  static async create({ name, role, color, waName, email }) {
    const query = `
      INSERT INTO agents (name, role, color, wa_name, email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, role, color, wa_name AS "waName", email
    `;
    const values = [name, role, color, waName, email];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, { name, role, color, waName, email }) {
    const query = `
      UPDATE agents
      SET name = $1, role = $2, color = $3, wa_name = $4, email = $5
      WHERE id = $6
      RETURNING id, name, role, color, wa_name AS "waName", email
    `;
    const values = [name, role, color, waName, email, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM agents WHERE id = $1', [id]);
  }
}

module.exports = Agent;