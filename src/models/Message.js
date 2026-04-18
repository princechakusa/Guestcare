const db = require('../config/db');

class Message {
  static async findAll() {
    const query = `
      SELECT id, agent_id AS "agentId", channel, guest, message, ts, intent, urgency,
             responded, rt, breach, created_at
      FROM messages
      ORDER BY ts DESC
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async create(data) {
    const { id, agentId, channel, guest, message, ts, intent, urgency, responded, rt, breach } = data;
    const query = `
      INSERT INTO messages (id, agent_id, channel, guest, message, ts, intent, urgency, responded, rt, breach)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, agent_id AS "agentId", channel, guest, message, ts, intent, urgency, responded, rt, breach, created_at
    `;
    const values = [id, agentId, channel, guest, message, ts ? new Date(ts) : new Date(), intent, urgency, responded, rt, breach];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async upsert(data) {
    const existing = await this.findById(data.id);
    if (existing) {
      return this.update(data.id, data);
    } else {
      return this.create(data);
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async update(id, data) {
    const { agentId, channel, guest, message, ts, intent, urgency, responded, rt, breach } = data;
    const query = `
      UPDATE messages
      SET agent_id = $1, channel = $2, guest = $3, message = $4, ts = $5, intent = $6, urgency = $7,
          responded = $8, rt = $9, breach = $10
      WHERE id = $11
      RETURNING id, agent_id AS "agentId", channel, guest, message, ts, intent, urgency, responded, rt, breach, created_at
    `;
    const values = [agentId, channel, guest, message, ts ? new Date(ts) : new Date(), intent, urgency, responded, rt, breach, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM messages WHERE id = $1', [id]);
  }
}

module.exports = Message;