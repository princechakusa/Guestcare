const db = require('../config/db');

class RootCause {
  static async findAll() {
    const query = `
      SELECT id, agent_id AS "agentId", agent_name AS "agentName", guest, channel, msg, ts, rt, reason, created_at
      FROM root_causes
      ORDER BY ts DESC
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async create(data) {
    const { id, agentId, agentName, guest, channel, msg, ts, rt, reason } = data;
    const query = `
      INSERT INTO root_causes (id, agent_id, agent_name, guest, channel, msg, ts, rt, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, agent_id AS "agentId", agent_name AS "agentName", guest, channel, msg, ts, rt, reason, created_at
    `;
    const values = [id, agentId, agentName, guest, channel, msg, ts ? new Date(ts) : new Date(), rt, reason];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM root_causes WHERE id = $1', [id]);
  }
}

module.exports = RootCause;