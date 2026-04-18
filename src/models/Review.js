const db = require('../config/db');

class Review {
  static async findAll() {
    const query = `
      SELECT id, property_id AS "propertyId", guest, score, ts, channel, nationality,
             review_text AS "text", cleanliness, communication, checkin, accuracy,
             location, value, response, created_at
      FROM reviews
      ORDER BY ts DESC
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async create(data) {
    const { propertyId, guest, score, ts, channel, nationality, text,
            cleanliness, communication, checkin, accuracy, location, value, response } = data;
    const query = `
      INSERT INTO reviews (property_id, guest, score, ts, channel, nationality, review_text,
                           cleanliness, communication, checkin, accuracy, location, value, response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, property_id AS "propertyId", guest, score, ts, channel, nationality,
                review_text AS "text", cleanliness, communication, checkin, accuracy,
                location, value, response, created_at
    `;
    const values = [propertyId, guest, score, ts ? new Date(ts) : new Date(), channel, nationality, text,
                    cleanliness, communication, checkin, accuracy, location, value, response];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, data) {
    const { propertyId, guest, score, ts, channel, nationality, text,
            cleanliness, communication, checkin, accuracy, location, value, response } = data;
    const query = `
      UPDATE reviews
      SET property_id = $1, guest = $2, score = $3, ts = $4, channel = $5, nationality = $6,
          review_text = $7, cleanliness = $8, communication = $9, checkin = $10, accuracy = $11,
          location = $12, value = $13, response = $14
      WHERE id = $15
      RETURNING id, property_id AS "propertyId", guest, score, ts, channel, nationality,
                review_text AS "text", cleanliness, communication, checkin, accuracy,
                location, value, response, created_at
    `;
    const values = [propertyId, guest, score, ts ? new Date(ts) : new Date(), channel, nationality, text,
                    cleanliness, communication, checkin, accuracy, location, value, response, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM reviews WHERE id = $1', [id]);
  }
}

module.exports = Review;