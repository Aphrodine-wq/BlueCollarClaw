const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = './bluecollar-claw.db') {
    this.db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to BlueCollarClaw database');
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

        // Users for authentication
        this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          password_hash TEXT,
          google_id TEXT,
          discord_id TEXT,
          name TEXT,
          role TEXT,
          profile_id TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(profile_id) REFERENCES contractors(id)
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

        // Telegram users integration
        this.db.run(`
        CREATE TABLE IF NOT EXISTS telegram_users (
          telegram_id INTEGER PRIMARY KEY,
          contractor_id TEXT,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(contractor_id) REFERENCES contractors(id)
        )
      `);

        // Email notifications log
        this.db.run(`
        CREATE TABLE IF NOT EXISTS email_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipient TEXT NOT NULL,
          type TEXT NOT NULL,
          subject TEXT,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'sent',
          error_message TEXT
        )
      `);

        // Subscriptions (billing tiers)
        this.db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          plan TEXT NOT NULL DEFAULT 'free',
          status TEXT NOT NULL DEFAULT 'active',
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          current_period_start INTEGER,
          current_period_end INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

        // Transactions (platform fees on bookings)
        this.db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          booking_id TEXT,
          payer_id TEXT,
          amount REAL NOT NULL,
          platform_fee REAL NOT NULL,
          platform_fee_rate REAL NOT NULL,
          stripe_payment_intent_id TEXT,
          status TEXT DEFAULT 'pending',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(booking_id) REFERENCES bookings(id),
          FOREIGN KEY(payer_id) REFERENCES users(id)
        )
      `);

        // Plan limits configuration
        this.db.run(`
        CREATE TABLE IF NOT EXISTS plan_limits (
          plan TEXT PRIMARY KEY,
          max_active_jobs INTEGER NOT NULL,
          max_offers_per_month INTEGER NOT NULL,
          priority_matching BOOLEAN DEFAULT 0,
          analytics_access BOOLEAN DEFAULT 0,
          transaction_fee_rate REAL NOT NULL
        )
      `);

        // Seed default plan limits
        this.db.run(`
        INSERT OR IGNORE INTO plan_limits (plan, max_active_jobs, max_offers_per_month, priority_matching, analytics_access, transaction_fee_rate)
        VALUES ('free', 3, 10, 0, 0, 0.08)
      `);
        this.db.run(`
        INSERT OR IGNORE INTO plan_limits (plan, max_active_jobs, max_offers_per_month, priority_matching, analytics_access, transaction_fee_rate)
        VALUES ('pro', 999, 999, 1, 1, 0.03)
      `);

        // OpenClaw connections (optional integration)
        this.db.run(`
        CREATE TABLE IF NOT EXISTS openclaw_connections (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          openclaw_instance_url TEXT NOT NULL,
          api_key_hash TEXT NOT NULL,
          channels TEXT DEFAULT '{}',
          status TEXT DEFAULT 'active',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

        console.log('Database schema initialized');
        resolve();
      });
    });
  }

  // Subscription methods
  getSubscription(userId, callback) {
    this.db.get(
      `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId],
      callback
    );
  }

  createSubscription(sub, callback) {
    const { id, userId, plan, status, stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd } = sub;
    this.db.run(
      `INSERT INTO subscriptions (id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, plan, status, stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd],
      callback
    );
  }

  updateSubscription(stripeSubscriptionId, updates, callback) {
    const fields = [];
    const values = [];
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.plan) { fields.push('plan = ?'); values.push(updates.plan); }
    if (updates.currentPeriodStart) { fields.push('current_period_start = ?'); values.push(updates.currentPeriodStart); }
    if (updates.currentPeriodEnd) { fields.push('current_period_end = ?'); values.push(updates.currentPeriodEnd); }
    fields.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(stripeSubscriptionId);

    this.db.run(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = ?`,
      values,
      callback
    );
  }

  getPlanLimits(plan, callback) {
    this.db.get(`SELECT * FROM plan_limits WHERE plan = ?`, [plan], callback);
  }

  getUserActiveJobCount(userId, callback) {
    this.db.get(
      `SELECT COUNT(*) as count FROM job_requests WHERE requester_id = ? AND status = 'open'`,
      [userId],
      callback
    );
  }

  getUserMonthlyOfferCount(userId, callback) {
    const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
    this.db.get(
      `SELECT COUNT(*) as count FROM offers WHERE contractor_id = ? AND created_at >= ?`,
      [userId, monthStart],
      callback
    );
  }

  // Transaction methods
  createTransaction(tx, callback) {
    const { id, bookingId, payerId, amount, platformFee, platformFeeRate, stripePaymentIntentId, status } = tx;
    this.db.run(
      `INSERT INTO transactions (id, booking_id, payer_id, amount, platform_fee, platform_fee_rate, stripe_payment_intent_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, bookingId, payerId, amount, platformFee, platformFeeRate, stripePaymentIntentId, status || 'pending'],
      callback
    );
  }

  // OpenClaw connection methods
  getOpenClawConnection(userId, callback) {
    this.db.get(
      `SELECT * FROM openclaw_connections WHERE user_id = ? AND status = 'active'`,
      [userId],
      callback
    );
  }

  createOpenClawConnection(conn, callback) {
    const { id, userId, openclawInstanceUrl, apiKeyHash, channels } = conn;
    this.db.run(
      `INSERT INTO openclaw_connections (id, user_id, openclaw_instance_url, api_key_hash, channels)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, openclawInstanceUrl, apiKeyHash, JSON.stringify(channels || {})],
      callback
    );
  }

  updateOpenClawConnection(id, updates, callback) {
    const fields = [];
    const values = [];
    if (updates.channels) { fields.push('channels = ?'); values.push(JSON.stringify(updates.channels)); }
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    values.push(id);

    this.db.run(
      `UPDATE openclaw_connections SET ${fields.join(', ')} WHERE id = ?`,
      values,
      callback
    );
  }

  deleteOpenClawConnection(userId, callback) {
    this.db.run(
      `UPDATE openclaw_connections SET status = 'disconnected' WHERE user_id = ?`,
      [userId],
      callback
    );
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

  // User methods
  createUser(user, callback) {
    // Explicitly destructure to ensure mapped correctly from object
    const id = user.id;
    const email = user.email;
    const passwordHash = user.passwordHash || null;
    const googleId = user.googleId || null;
    const discordId = user.discordId || null;
    const name = user.name;
    const role = user.role;
    const profileId = user.profileId || null;

    this.db.run(
      `INSERT INTO users (id, email, password_hash, google_id, discord_id, name, role, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, googleId, discordId, name, role, profileId],
      callback
    );
  }

  getUser(id, callback) {
    this.db.get(`SELECT * FROM users WHERE id = ?`, [id], callback);
  }

  getUserByEmail(email, callback) {
    this.db.get(`SELECT * FROM users WHERE email = ?`, [email], callback);
  }

  getUserByProvider(provider, providerId, callback) {
    const column = provider === 'google' ? 'google_id' : 'discord_id';
    this.db.get(`SELECT * FROM users WHERE ${column} = ?`, [providerId], callback);
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
      `INSERT INTO job_requests (id, requester_id, trade, location, latitude, longitude, start_date, end_date, min_rate, max_rate, scope, requirements, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
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
