const db = require('../config/db');

class Property {
  static async findAll() {
    const query = 'SELECT * FROM properties ORDER BY name';
    const { rows } = await db.query(query);
    return rows;
  }

  static async create({ name, type, location, beds, hostawayId, status, notes }) {
    const query = `
      INSERT INTO properties (name, type, location, beds, hostaway_id, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [name, type, location, beds, hostawayId, status, notes];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, { name, type, location, beds, hostawayId, status, notes }) {
    const query = `
      UPDATE properties
      SET name = $1, type = $2, location = $3, beds = $4, hostaway_id = $5, status = $6, notes = $7
      WHERE id = $8
      RETURNING *
    `;
    const values = [name, type, location, beds, hostawayId, status, notes, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM properties WHERE id = $1', [id]);
  }
}

module.exports = Property;