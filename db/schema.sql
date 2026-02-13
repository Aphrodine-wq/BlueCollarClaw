
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

-- Subscriptions (billing tiers)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start BIGINT,
  current_period_end BIGINT,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Transactions (platform fees on bookings)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  payer_id UUID REFERENCES users(id),
  amount REAL NOT NULL,
  platform_fee REAL NOT NULL,
  platform_fee_rate REAL NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Plan limits configuration
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  max_active_jobs INTEGER NOT NULL,
  max_offers_per_month INTEGER NOT NULL,
  priority_matching BOOLEAN DEFAULT FALSE,
  analytics_access BOOLEAN DEFAULT FALSE,
  transaction_fee_rate REAL NOT NULL
);

-- Seed default plan limits
INSERT INTO plan_limits (plan, max_active_jobs, max_offers_per_month, priority_matching, analytics_access, transaction_fee_rate)
VALUES ('free', 3, 10, FALSE, FALSE, 0.08)
ON CONFLICT (plan) DO NOTHING;

INSERT INTO plan_limits (plan, max_active_jobs, max_offers_per_month, priority_matching, analytics_access, transaction_fee_rate)
VALUES ('pro', 999, 999, TRUE, TRUE, 0.03)
ON CONFLICT (plan) DO NOTHING;

-- OpenClaw connections (optional integration)
CREATE TABLE IF NOT EXISTS openclaw_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  openclaw_instance_url TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  channels JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);
