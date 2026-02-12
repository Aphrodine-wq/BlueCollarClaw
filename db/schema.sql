
-- Initialize Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contractors
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  password_hash TEXT,
  google_id TEXT,
  discord_id TEXT,
  name TEXT,
  role TEXT,
  profile_id UUID REFERENCES contractors(id),
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Contractor Trades
CREATE TABLE IF NOT EXISTS contractor_trades (
  contractor_id UUID REFERENCES contractors(id),
  trade TEXT NOT NULL,
  licensed BOOLEAN DEFAULT FALSE,
  license_number TEXT,
  insurance_verified BOOLEAN DEFAULT FALSE
);

-- Service Areas
CREATE TABLE IF NOT EXISTS service_areas (
  contractor_id UUID REFERENCES contractors(id),
  city TEXT,
  state TEXT,
  radius_miles INTEGER DEFAULT 25
);

-- Rate Preferences
CREATE TABLE IF NOT EXISTS rate_preferences (
  contractor_id UUID REFERENCES contractors(id),
  trade TEXT,
  min_rate REAL,
  max_rate REAL,
  preferred_rate REAL
);

-- Availability Rules
CREATE TABLE IF NOT EXISTS availability (
  contractor_id UUID REFERENCES contractors(id),
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'available'
);

-- Job Requests
CREATE TABLE IF NOT EXISTS job_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES contractors(id), -- If a contractor requests help (GC)
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
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES job_requests(id),
  contractor_id UUID REFERENCES contractors(id),
  rate REAL,
  start_date TEXT,
  end_date TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  round INTEGER DEFAULT 1,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES job_requests(id),
  offer_id UUID REFERENCES offers(id),
  gc_id UUID REFERENCES contractors(id),
  sub_id UUID REFERENCES contractors(id),
  trade TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  rate REAL,
  scope TEXT,
  contract_url TEXT,
  calendar_event_id TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  rater_id UUID REFERENCES contractors(id), -- Or users? Schema says contractors.
  rated_id UUID REFERENCES contractors(id),
  score INTEGER CHECK(score >= 1 AND score <= 5),
  comment TEXT,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Negotiation Preferences
CREATE TABLE IF NOT EXISTS negotiation_preferences (
  contractor_id UUID REFERENCES contractors(id),
  preference_key TEXT,
  preference_value TEXT
);
