-- BlueCollarClaw PostgreSQL Schema
-- Run this to initialize your Postgres database

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    google_id TEXT,
    discord_id TEXT,
    name TEXT,
    role TEXT,
    profile_id TEXT,
    created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW()),
    FOREIGN KEY(profile_id) REFERENCES contractors(id)
);

-- Contractor trades
CREATE TABLE IF NOT EXISTS contractor_trades (
    contractor_id TEXT,
    trade TEXT NOT NULL,
    licensed BOOLEAN DEFAULT FALSE,
    license_number TEXT,
    insurance_verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Service areas
CREATE TABLE IF NOT EXISTS service_areas (
    contractor_id TEXT,
    city TEXT,
    state TEXT,
    radius_miles INTEGER DEFAULT 25,
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Rate preferences
CREATE TABLE IF NOT EXISTS rate_preferences (
    contractor_id TEXT,
    trade TEXT,
    min_rate REAL,
    max_rate REAL,
    preferred_rate REAL,
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Availability
CREATE TABLE IF NOT EXISTS availability (
    contractor_id TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'available',
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Job requests
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
    created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW()),
    FOREIGN KEY(requester_id) REFERENCES contractors(id)
);

-- Offers
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
    created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW()),
    FOREIGN KEY(request_id) REFERENCES job_requests(id),
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Bookings
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
    created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW()),
    FOREIGN KEY(request_id) REFERENCES job_requests(id),
    FOREIGN KEY(offer_id) REFERENCES offers(id),
    FOREIGN KEY(gc_id) REFERENCES contractors(id),
    FOREIGN KEY(sub_id) REFERENCES contractors(id)
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    rater_id TEXT,
    rated_id TEXT,
    score INTEGER CHECK(score >= 1 AND score <= 5),
    comment TEXT,
    created_at INTEGER DEFAULT EXTRACT(EPOCH FROM NOW()),
    FOREIGN KEY(booking_id) REFERENCES bookings(id),
    FOREIGN KEY(rater_id) REFERENCES contractors(id),
    FOREIGN KEY(rated_id) REFERENCES contractors(id)
);

-- Negotiation preferences
CREATE TABLE IF NOT EXISTS negotiation_preferences (
    contractor_id TEXT,
    preference_key TEXT,
    preference_value TEXT,
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Telegram users
CREATE TABLE IF NOT EXISTS telegram_users (
    telegram_id BIGINT PRIMARY KEY,
    contractor_id TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(contractor_id) REFERENCES contractors(id)
);

-- Email notifications log
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    recipient TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',
    error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_trade ON job_requests(trade);
CREATE INDEX IF NOT EXISTS idx_offers_request_id ON offers(request_id);
CREATE INDEX IF NOT EXISTS idx_offers_contractor_id ON offers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_bookings_gc_id ON bookings(gc_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sub_id ON bookings(sub_id);
CREATE INDEX IF NOT EXISTS idx_contractor_trades_contractor_id ON contractor_trades(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
