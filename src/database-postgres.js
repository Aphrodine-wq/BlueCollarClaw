const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Singleton Pool pattern
let pool = null;

class PostgresDatabase {
    constructor() {
        if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
            console.error('DATABASE_URL or POSTGRES_URL missing for Database connection.');
        }

        if (!pool) {
            pool = new Pool({
                connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });

            pool.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
                process.exit(-1);
            });

            console.log('Postgres Pool Initialized');
        }

        this.pool = pool;

        // Compatibility shim: server.js uses db.db.get/all/run for raw queries (SQLite pattern).
        // Point this.db to self so those calls route to our helper methods.
        this.db = this;

        // Note: Schema initialization should be done manually or via migration tools for Postgres
        // We won't run 'initSchema' automatically here like SQLite to avoid overwriting or conflicts.
    }

    // Helper to mimic SQLite callback behavior
    query(text, params, callback) {
        // If params is callback (2 args)
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        this.pool.query(text, params)
            .then(res => {
                // Formatting rows to match what the app expects (array of objects)
                // For 'run' commands (INSERT/UPDATE), results might differ.
                // SQLite 'run' returns `this.lastID` and `this.changes`.
                // PG returns `rowCount`.
                // We'll try to normalize.

                // If callback expects (err, rows) or (err)
                if (callback) callback(null, res.rows);
            })
            .catch(err => {
                if (callback) callback(err);
            });
    }

    // Helper for single row (SQLite .get)
    get(text, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        // Convert ? to $1, $2, etc.
        let paramCount = 1;
        const pgText = text.replace(/\?/g, () => `$${paramCount++}`);

        this.pool.query(pgText, params)
            .then(res => {
                if (callback) callback(null, res.rows[0]);
            })
            .catch(err => {
                if (callback) callback(err);
            });
    }

    // Helper for all rows (SQLite .all)
    all(text, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        // Convert ? to $1, $2, etc.
        let paramCount = 1;
        const pgText = text.replace(/\?/g, () => `$${paramCount++}`);

        this.pool.query(pgText, params)
            .then(res => {
                if (callback) callback(null, res.rows);
            })
            .catch(err => {
                if (callback) callback(err);
            });
    }

    // Helper for execution (SQLite .run)
    run(text, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        // Convert ? to $1, $2, etc.
        let paramCount = 1;
        const pgText = text.replace(/\?/g, () => `$${paramCount++}`);

        // Handle specific SQLite syntax replacements if needed (e.g., strftime)
        // Basic replacement: strftime('%s', 'now') -> EXTRACT(EPOCH FROM NOW())
        const pgTextClean = pgText.replace(/strftime\('%s', 'now'\)/g, "EXTRACT(EPOCH FROM NOW())");

        this.pool.query(pgTextClean, params)
            .then(res => {
                // Mimic context for 'this.lastID' if possible, but PG returns the inserted row ONLY if RETURNING clause is used.
                // Since our original code doesn't use `this.lastID` heavily (UUIDs are generated in app), we might be okay.
                if (callback) callback.call({ changes: res.rowCount }, null);
            })
            .catch(err => {
                if (callback) callback(err);
            });
    }

    // Contractor methods
    createContractor(contractor, callback) {
        const { id, name, publicKey, privateKey } = contractor;
        this.run(
            `INSERT INTO contractors (id, name, public_key, private_key) VALUES (?, ?, ?, ?)`,
            [id, name, publicKey, privateKey],
            callback
        );
    }

    // User methods
    createUser(user, callback) {
        const { id, email, passwordHash, googleId, discordId, name, role, profileId } = user;
        this.run(
            `INSERT INTO users (id, email, password_hash, google_id, discord_id, name, role, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, email, passwordHash, googleId, discordId, name, role, profileId],
            callback
        );
    }

    getUser(id, callback) {
        this.get(`SELECT * FROM users WHERE id = ?`, [id], callback);
    }

    getUserByEmail(email, callback) {
        this.get(`SELECT * FROM users WHERE email = ?`, [email], callback);
    }

    getUserByProvider(provider, providerId, callback) {
        const column = provider === 'google' ? 'google_id' : 'discord_id';
        // Check for SQL injection here, though 'provider' comes from internal logic usually
        if (provider !== 'google' && provider !== 'discord') return callback(new Error('Invalid provider'));

        this.get(`SELECT * FROM users WHERE ${column} = ?`, [providerId], callback);
    }

    getContractor(id, callback) {
        this.get(
            `SELECT * FROM contractors WHERE id = ?`,
            [id],
            callback
        );
    }

    // Trade methods
    addTrade(contractorId, trade, callback) {
        this.run(
            `INSERT INTO contractor_trades (contractor_id, trade) VALUES (?, ?)`,
            [contractorId, trade],
            callback
        );
    }

    getContractorTrades(contractorId, callback) {
        this.all(
            `SELECT * FROM contractor_trades WHERE contractor_id = ?`,
            [contractorId],
            callback
        );
    }

    // Job request methods
    createJobRequest(request, callback) {
        // Remove created_at from params if it's handled by DB default or convert properly
        // In SQLite it was strftime. In Postgres we can use DEFAULT or pass explicit timestamp.
        // The original code passed `strftime` in the SQL string, not as a param.

        const { id, requesterId, trade, location, latitude, longitude, startDate, endDate, minRate, maxRate, scope, requirements } = request;

        // We use the cleaned up Run method which replaces strftime
        this.run(
            `INSERT INTO job_requests (id, requester_id, trade, location, latitude, longitude, start_date, end_date, min_rate, max_rate, scope, requirements, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
            [id, requesterId, trade, location, latitude, longitude, startDate, endDate, minRate, maxRate, scope, requirements],
            callback
        );
    }

    getJobRequest(id, callback) {
        this.get(
            `SELECT * FROM job_requests WHERE id = ?`,
            [id],
            callback
        );
    }

    getOpenJobRequests(callback) {
        this.all(
            `SELECT * FROM job_requests WHERE status = 'open'`,
            callback
        );
    }

    // Offer methods
    createOffer(offer, callback) {
        const { id, requestId, contractorId, rate, startDate, endDate, message, round } = offer;
        this.run(
            `INSERT INTO offers (id, request_id, contractor_id, rate, start_date, end_date, message, round) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, requestId, contractorId, rate, startDate, endDate, message, round || 1],
            callback
        );
    }

    getOffersForRequest(requestId, callback) {
        this.all(
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
        this.run(
            `UPDATE offers SET status = ? WHERE id = ?`,
            [status, offerId],
            callback
        );
    }

    // Booking methods
    createBooking(booking, callback) {
        const { id, requestId, offerId, gcId, subId, trade, location, startDate, endDate, rate, scope, contractUrl, calendarEventId } = booking;
        this.run(
            `INSERT INTO bookings (id, request_id, offer_id, gc_id, sub_id, trade, location, start_date, end_date, rate, scope, contract_url, calendar_event_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, requestId, offerId, gcId, subId, trade, location, startDate, endDate, rate, scope, contractUrl, calendarEventId],
            callback
        );
    }

    getContractorBookings(contractorId, callback) {
        this.all(
            `SELECT * FROM bookings WHERE gc_id = ? OR sub_id = ? ORDER BY created_at DESC`,
            [contractorId, contractorId],
            callback
        );
    }

    // Rating methods
    createRating(rating, callback) {
        const { id, bookingId, raterId, ratedId, score, comment } = rating;
        this.run(
            `INSERT INTO ratings (id, booking_id, rater_id, rated_id, score, comment) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, bookingId, raterId, ratedId, score, comment],
            callback
        );
    }

    getContractorReputation(contractorId, callback) {
        this.get(
            `SELECT 
              COUNT(*) as total_ratings,
              AVG(score) as average_score
             FROM ratings 
             WHERE rated_id = ?`,
            [contractorId],
            callback
        );
    }

    // ─── Subscription methods ───────────────────────────────────
    getSubscription(userId, callback) {
        this.get(
            `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [userId],
            callback
        );
    }

    createSubscription(sub, callback) {
        const { id, userId, plan, status, stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd } = sub;
        this.run(
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

        this.run(
            `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = ?`,
            values,
            callback
        );
    }

    // ─── Plan limits methods ────────────────────────────────────
    getPlanLimits(plan, callback) {
        this.get(`SELECT * FROM plan_limits WHERE plan = ?`, [plan], callback);
    }

    getUserActiveJobCount(userId, callback) {
        this.get(
            `SELECT COUNT(*) as count FROM job_requests WHERE requester_id = ? AND status = 'open'`,
            [userId],
            callback
        );
    }

    getUserMonthlyOfferCount(userId, callback) {
        const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
        this.get(
            `SELECT COUNT(*) as count FROM offers WHERE contractor_id = ? AND created_at >= ?`,
            [userId, monthStart],
            callback
        );
    }

    // ─── Transaction methods ────────────────────────────────────
    createTransaction(tx, callback) {
        const { id, bookingId, payerId, amount, platformFee, platformFeeRate, stripePaymentIntentId, status } = tx;
        this.run(
            `INSERT INTO transactions (id, booking_id, payer_id, amount, platform_fee, platform_fee_rate, stripe_payment_intent_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, bookingId, payerId, amount, platformFee, platformFeeRate, stripePaymentIntentId, status || 'pending'],
            callback
        );
    }

    // ─── OpenClaw connection methods ────────────────────────────
    getOpenClawConnection(userId, callback) {
        this.get(
            `SELECT * FROM openclaw_connections WHERE user_id = ? AND status = 'active'`,
            [userId],
            callback
        );
    }

    createOpenClawConnection(conn, callback) {
        const { id, userId, openclawInstanceUrl, apiKeyHash, channels } = conn;
        this.run(
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

        this.run(
            `UPDATE openclaw_connections SET ${fields.join(', ')} WHERE id = ?`,
            values,
            callback
        );
    }

    deleteOpenClawConnection(userId, callback) {
        this.run(
            `UPDATE openclaw_connections SET status = 'disconnected' WHERE user_id = ?`,
            [userId],
            callback
        );
    }

    close() {
        this.pool.end();
    }
}

module.exports = PostgresDatabase;
