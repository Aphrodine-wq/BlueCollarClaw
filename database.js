const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = './clawshake.db') {
    this.db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to ClawShake database');
        await this.initSchema();
      }
    });
  }

  initSchema() {
    return new Promise((resolve) => {
      this.db.serialize(() => {
      // Contractor profiles
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contractors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          public_key TEXT NOT NULL,
          private_key TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      // Trades and skills
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contractor_trades (
          contractor_id TEXT,
          trade TEXT NOT NULL,
          licensed BOOLEAN DEFAULT 0,
          license_number TEXT,
          insurance_verified BOOLEAN DEFAULT 0,
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

      // Service areas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS service_areas (
          contractor_id TEXT,
          city TEXT,
          state TEXT,
          radius_miles INTEGER DEFAULT 25,
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

      // Rate preferences
      this.db.run(`
        CREATE TABLE IF NOT EXISTS rate_preferences (
          contractor_id TEXT,
          trade TEXT,
          min_rate REAL,
          max_rate REAL,
          preferred_rate REAL,
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

      // Availability rules
      this.db.run(`
        CREATE TABLE IF NOT EXISTS availability (
          contractor_id TEXT,
          start_date TEXT,
          end_date TEXT,
          status TEXT DEFAULT 'available',
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

      // Job requests (broadcasts)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS job_requests (
          id TEXT PRIMARY KEY,
          requester_id TEXT,
          trade TEXT NOT NULL,
          location TEXT,
          latitude REAL,
          longitude REAL,
          start_date TEXT,
          end_date TEXT,
          min_rate REAL,
          max_rate REAL,
          scope TEXT,
          requirements TEXT,
          status TEXT DEFAULT 'open',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(requester_id) REFERENCES contractors(id)
        )
      `);

      // Offers and counter-offers
      this.db.run(`
        CREATE TABLE IF NOT EXISTS offers (
          id TEXT PRIMARY KEY,
          request_id TEXT,
          contractor_id TEXT,
          rate REAL,
          start_date TEXT,
          end_date TEXT,
          message TEXT,
          status TEXT DEFAULT 'pending',
          round INTEGER DEFAULT 1,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(request_id) REFERENCES job_requests(id),
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

      // Bookings (confirmed jobs)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          request_id TEXT,
          offer_id TEXT,
          gc_id TEXT,
          sub_id TEXT,
          trade TEXT,
          location TEXT,
          start_date TEXT,
          end_date TEXT,
          rate REAL,
          scope TEXT,
          contract_url TEXT,
          calendar_event_id TEXT,
          status TEXT DEFAULT 'confirmed',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(request_id) REFERENCES job_requests(id),
          FOREIGN KEY(offer_id) REFERENCES offers(id),
          FOREIGN KEY(gc_id) REFERENCES contractors(id),
          FOREIGN KEY(sub_id) REFERENCES contractors(id)
        )
      `);

      // Ratings and reputation
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ratings (
          id TEXT PRIMARY KEY,
          booking_id TEXT,
          rater_id TEXT,
          rated_id TEXT,
          score INTEGER CHECK(score >= 1 AND score <= 5),
          comment TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(booking_id) REFERENCES bookings(id),
          FOREIGN KEY(rater_id) REFERENCES contractors(id),
          FOREIGN KEY(rated_id) REFERENCES contractors(id)
        )
      `);

      // Negotiation preferences (AI training data)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS negotiation_preferences (
          contractor_id TEXT,
          preference_key TEXT,
          preference_value TEXT,
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

      console.log('Database schema initialized');
      resolve();
      });
    });
  }

  // Contractor methods
  createContractor(contractor, callback) {
    const { id, name, publicKey, privateKey } = contractor;
    this.db.run(
      `INSERT INTO contractors (id, name, public_key, private_key) VALUES (?, ?, ?, ?)`,
      [id, name, publicKey, privateKey],
      callback
    );
  }

  getContractor(id, callback) {
    this.db.get(
      `SELECT * FROM contractors WHERE id = ?`,
      [id],
      callback
    );
  }

  // Trade methods
  addTrade(contractorId, trade, callback) {
    this.db.run(
      `INSERT INTO contractor_trades (contractor_id, trade) VALUES (?, ?)`,
      [contractorId, trade],
      callback
    );
  }

  getContractorTrades(contractorId, callback) {
    this.db.all(
      `SELECT * FROM contractor_trades WHERE contractor_id = ?`,
      [contractorId],
      callback
    );
  }

  // Job request methods
  createJobRequest(request, callback) {
    const { id, requesterId, trade, location, latitude, longitude, startDate, endDate, minRate, maxRate, scope, requirements } = request;
    this.db.run(
      `INSERT INTO job_requests (id, requester_id, trade, location, latitude, longitude, start_date, end_date, min_rate, max_rate, scope, requirements) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, requesterId, trade, location, latitude, longitude, startDate, endDate, minRate, maxRate, scope, requirements],
      callback
    );
  }

  getJobRequest(id, callback) {
    this.db.get(
      `SELECT * FROM job_requests WHERE id = ?`,
      [id],
      callback
    );
  }

  getOpenJobRequests(callback) {
    this.db.all(
      `SELECT * FROM job_requests WHERE status = 'open'`,
      callback
    );
  }

  // Offer methods
  createOffer(offer, callback) {
    const { id, requestId, contractorId, rate, startDate, endDate, message, round } = offer;
    this.db.run(
      `INSERT INTO offers (id, request_id, contractor_id, rate, start_date, end_date, message, round) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, requestId, contractorId, rate, startDate, endDate, message, round || 1],
      callback
    );
  }

  getOffersForRequest(requestId, callback) {
    this.db.all(
      `SELECT o.*, c.name as contractor_name 
       FROM offers o 
       JOIN contractors c ON o.contractor_id = c.id 
       WHERE o.request_id = ?
       ORDER BY o.created_at DESC`,
      [requestId],
      callback
    );
  }

  updateOfferStatus(offerId, status, callback) {
    this.db.run(
      `UPDATE offers SET status = ? WHERE id = ?`,
      [status, offerId],
      callback
    );
  }

  // Booking methods
  createBooking(booking, callback) {
    const { id, requestId, offerId, gcId, subId, trade, location, startDate, endDate, rate, scope, contractUrl, calendarEventId } = booking;
    this.db.run(
      `INSERT INTO bookings (id, request_id, offer_id, gc_id, sub_id, trade, location, start_date, end_date, rate, scope, contract_url, calendar_event_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, requestId, offerId, gcId, subId, trade, location, startDate, endDate, rate, scope, contractUrl, calendarEventId],
      callback
    );
  }

  getContractorBookings(contractorId, callback) {
    this.db.all(
      `SELECT * FROM bookings WHERE gc_id = ? OR sub_id = ? ORDER BY created_at DESC`,
      [contractorId, contractorId],
      callback
    );
  }

  // Rating methods
  createRating(rating, callback) {
    const { id, bookingId, raterId, ratedId, score, comment } = rating;
    this.db.run(
      `INSERT INTO ratings (id, booking_id, rater_id, rated_id, score, comment) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, bookingId, raterId, ratedId, score, comment],
      callback
    );
  }

  getContractorReputation(contractorId, callback) {
    this.db.get(
      `SELECT 
        COUNT(*) as total_ratings,
        AVG(score) as average_score
       FROM ratings 
       WHERE rated_id = ?`,
      [contractorId],
      callback
    );
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
