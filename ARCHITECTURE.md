# ClawShake - Technical Architecture

## System Overview

ClawShake is a decentralized protocol for autonomous contractor negotiation. It combines:

- **Peer-to-peer messaging** (MQTT → eventually libp2p)
- **AI-powered matching and negotiation** (local decision engines)
- **Cryptographic identity and trust** (RSA signatures, reputation ledger)
- **Smart contract generation** (automated PDF agreements)
- **Calendar and payment integration** (external APIs)

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  (OpenClaw Chat, WhatsApp, Telegram, Discord, Web Dashboard) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ClawShake Agent Layer                     │
│          (Orchestrates all protocol interactions)            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐
│   Network     │   │   Negotiation    │   │   Storage    │
│     Layer     │   │      Engine      │   │     Layer    │
│               │   │                  │   │              │
│ • MQTT/P2P    │   │ • Matching       │   │ • SQLite/PG  │
│ • Pub/Sub     │   │ • Scoring        │   │ • Profiles   │
│ • Signatures  │   │ • Decision AI    │   │ • Jobs       │
└───────────────┘   └──────────────────┘   └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  (Google Calendar, Stripe, Licensing APIs, Geocoding, etc.)  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Identity Layer

Each contractor has a **cryptographic keypair** (RSA-2048):

- **Public key:** Shared on the network, used for verification
- **Private key:** Stored locally, used for signing messages

**Profile Structure:**
```javascript
{
  id: "contractor_abc123",
  name: "Mike's Plumbing",
  publicKey: "-----BEGIN PUBLIC KEY-----...",
  privateKey: "-----BEGIN PRIVATE KEY-----...", // Never shared
  trades: ["plumber"],
  serviceAreas: [
    { city: "Austin", state: "TX", radius: 25 }
  ],
  ratePreferences: {
    plumber: { min: 75, preferred: 90, max: 120 }
  },
  availability: [...],
  reputation: { score: 4.8, jobs: 47 }
}
```

### 2. Network Layer

#### MQTT (Current Implementation)

**Topic Structure:**
```
clawshake/{region}/{trade}          # Broadcast requests
clawshake/offers/{contractor_id}    # Personal offer channel
clawshake/counters/{contractor_id}  # Counter-offers
clawshake/accepts/{contractor_id}   # Acceptances
clawshake/declines/{contractor_id}  # Declines
clawshake/confirmations/{contractor_id} # Final confirmations
```

**Message Flow:**
```
GC Agent                                    Sub Agent
    │                                           │
    │  1. REQUEST (broadcast to trade channel) │
    ├──────────────────────────────────────────>│
    │                                           │
    │                    2. OFFER (direct DM)   │
    │<──────────────────────────────────────────┤
    │                                           │
    │  3. ACCEPT (direct DM)                    │
    ├──────────────────────────────────────────>│
    │                                           │
    │                 4. CONFIRM (both parties) │
    │<─────────────────────────────────────────>│
    │                                           │
```

#### Future: libp2p (P2P)

**Benefits:**
- No central broker (fully decentralized)
- NAT traversal (WebRTC)
- Resilient to censorship
- Lower operating costs (no servers)

**Challenges:**
- More complex setup
- Slower peer discovery
- Requires DHT for contractor lookup

**Migration Path:**
1. Start with MQTT (simple, fast)
2. Add federated hubs (regional brokers)
3. Implement libp2p alongside MQTT (dual-mode)
4. Gradually migrate to P2P as primary

### 3. Message Protocol

All messages follow a structured JSON schema with versioning.

**Base Message Structure:**
```javascript
{
  version: "1.0",
  type: "REQUEST" | "OFFER" | "COUNTER" | "ACCEPT" | "DECLINE" | "CONFIRM",
  id: "req_abc123",
  timestamp: 1707702000000,
  expiresAt: 1707788400000, // 24h default
  signature: "base64_rsa_signature",
  payload: { ... }
}
```

#### REQUEST Message

```javascript
{
  type: "REQUEST",
  id: "req_xyz",
  requesterId: "contractor_gc1",
  trade: "plumber",
  location: "423 Oak St, Austin, TX",
  latitude: 30.2672,
  longitude: -97.7431,
  startDate: "2026-02-19",
  endDate: "2026-02-21",
  minRate: 80,
  maxRate: 100,
  scope: "Rough-in plumbing for residential remodel",
  requirements: "licensed, insured",
  timestamp: 1707702000000,
  expiresAt: 1707788400000,
  signature: "..."
}
```

#### OFFER Message

```javascript
{
  type: "OFFER",
  id: "offer_abc",
  requestId: "req_xyz",
  contractorId: "contractor_plumber1",
  rate: 90,
  startDate: "2026-02-19",
  endDate: "2026-02-21",
  message: "Available at $90/hr. 4.8★ rating, 47 ClawShake jobs.",
  round: 1,
  timestamp: 1707702300000,
  signature: "..."
}
```

#### COUNTER Message (Multi-Round Negotiation)

```javascript
{
  type: "COUNTER",
  id: "counter_def",
  offerId: "offer_abc",
  requestId: "req_xyz",
  requesterId: "contractor_gc1",
  rate: 85,
  startDate: "2026-02-19",
  endDate: "2026-02-21",
  message: "Can you do $85? Round 2/3",
  round: 2,
  timestamp: 1707702600000,
  signature: "..."
}
```

#### ACCEPT Message

```javascript
{
  type: "ACCEPT",
  id: "accept_ghi",
  offerId: "offer_abc",
  requestId: "req_xyz",
  requesterId: "contractor_gc1",
  timestamp: 1707702900000,
  signature: "..."
}
```

#### CONFIRM Message (Final Step)

```javascript
{
  type: "CONFIRM",
  id: "confirm_jkl",
  bookingId: "booking_mno",
  senderId: "contractor_gc1",
  contractUrl: "https://clawshake.com/contracts/booking_mno.pdf",
  calendarEventId: "gcal_event_123",
  timestamp: 1707703200000,
  signature: "..."
}
```

### 4. Negotiation Engine

The brain of ClawShake. Evaluates requests and makes decisions.

#### Matching Algorithm

**Scoring System (0-100):**

| Factor | Weight | Logic |
|--------|--------|-------|
| Trade Match | 30 | Exact match required |
| Location | 20 | Distance <= service radius |
| Availability | 25 | Dates fully available |
| Rate | 25 | Closer to preferred = higher score |
| Requirements | Pass/Fail | Must meet all (licensed, insured, etc.) |

**Example Evaluation:**
```javascript
{
  matches: true,
  score: 85,
  reasons: ["Strong match", "Rate within range", "Perfect availability"],
  autoRespond: true,
  suggestedOffer: {
    rate: 90,
    startDate: "2026-02-19",
    endDate: "2026-02-21"
  }
}
```

#### Decision Logic

```
Score >= 85 + autoAccept enabled → AUTO ACCEPT
Score 60-84 + autoNegotiate enabled → SEND OFFER
Score 50-59 → NOTIFY HUMAN (suggest offer)
Score < 50 → SILENT DECLINE
```

#### Multi-Round Negotiation (Future)

```
Round 1: Initial offer ($90)
Round 2: Counter ($85) → Meet halfway ($87.50)
Round 3: Final counter ($88) → Accept or decline
Max rounds: 3
```

### 5. Storage Layer

#### Database Schema

**contractors**
- id (PK)
- name
- public_key
- private_key (encrypted at rest)
- created_at

**contractor_trades**
- contractor_id (FK)
- trade
- licensed (bool)
- license_number
- insurance_verified (bool)

**service_areas**
- contractor_id (FK)
- city
- state
- radius_miles

**rate_preferences**
- contractor_id (FK)
- trade
- min_rate
- max_rate
- preferred_rate

**availability**
- contractor_id (FK)
- start_date
- end_date
- status (available | booked | blocked)

**job_requests**
- id (PK)
- requester_id (FK)
- trade
- location
- lat/long
- start_date, end_date
- min_rate, max_rate
- scope
- requirements
- status (open | filled | expired)
- created_at

**offers**
- id (PK)
- request_id (FK)
- contractor_id (FK)
- rate
- start_date, end_date
- message
- status (pending | accepted | declined)
- round (1-3)
- created_at

**bookings**
- id (PK)
- request_id (FK)
- offer_id (FK)
- gc_id (FK)
- sub_id (FK)
- trade
- location
- start_date, end_date
- rate
- scope
- contract_url
- calendar_event_id
- status (confirmed | in_progress | completed | cancelled)
- created_at

**ratings**
- id (PK)
- booking_id (FK)
- rater_id (FK)
- rated_id (FK)
- score (1-5)
- comment
- created_at

#### Migration to PostgreSQL

When scaling beyond ~1000 contractors:

```sql
-- Add indexes
CREATE INDEX idx_job_requests_trade ON job_requests(trade);
CREATE INDEX idx_job_requests_status ON job_requests(status);
CREATE INDEX idx_bookings_gc ON bookings(gc_id);
CREATE INDEX idx_bookings_sub ON bookings(sub_id);
CREATE INDEX idx_ratings_rated ON ratings(rated_id);

-- Add full-text search
CREATE INDEX idx_job_scope_fts ON job_requests USING gin(to_tsvector('english', scope));

-- Add geospatial queries
CREATE EXTENSION postgis;
ALTER TABLE job_requests ADD COLUMN location_point GEOGRAPHY(POINT,4326);
CREATE INDEX idx_location ON job_requests USING GIST(location_point);
```

### 6. Security

#### Cryptographic Signatures

Every message is signed with the sender's private key:

```javascript
const sign = crypto.createSign('RSA-SHA256');
sign.update(JSON.stringify({
  type: message.type,
  id: message.id,
  timestamp: message.timestamp,
}));
const signature = sign.sign(privateKey, 'base64');
```

Verification:

```javascript
const verify = crypto.createVerify('RSA-SHA256');
verify.update(messageString);
const isValid = verify.verify(publicKey, signature, 'base64');
```

#### Threat Model & Mitigations

| Threat | Mitigation |
|--------|------------|
| Message spoofing | RSA signatures (2048-bit) |
| Replay attacks | Timestamp + nonce validation |
| Rate spam | Rate limiting per contractor (10 broadcasts/hour) |
| Fake reputation | Bilateral ratings (both parties must confirm) |
| MITM on MQTT | TLS encryption (mqtts://) |
| Private key theft | Encrypt keys at rest (AES-256) |
| Sybil attacks | Require verified license/insurance for high-value jobs |

### 7. Contract Generation

#### PDF Templates

Generated with PDFKit. Includes:

- Parties (GC + Sub, with IDs and licenses)
- Scope of work
- Schedule (start/end dates)
- Compensation (rate, estimated hours, total)
- Standard terms (licensing, insurance, termination, etc.)
- Digital signatures (ClawShake acceptance timestamps)

#### Storage

- Local: `./contracts/contract_{booking_id}.pdf`
- Future: Upload to S3/Cloudflare R2, serve via CDN

#### Legal Validity

**Current Status:** Contracts are legally binding in most jurisdictions if:
- Both parties explicitly accept
- Terms are clear and unambiguous
- Digital signatures are traceable

**Future Enhancement:**
- Integrate with DocuSign or HelloSign for e-signature compliance
- Add state-specific clauses (varies by jurisdiction)
- Consult with construction attorney for template review

### 8. Calendar Integration

#### Google Calendar API

OAuth2 flow:
1. Generate auth URL → user grants access
2. Exchange auth code for tokens
3. Store refresh token (long-lived)
4. Use access token for API calls

#### Event Creation

```javascript
const event = {
  summary: "ClawShake: Plumber - Mike's Plumbing",
  description: "Booking ID: booking_xyz\nRate: $90/hr\n...",
  location: "423 Oak St, Austin, TX",
  start: { dateTime: "2026-02-19T08:00:00-06:00" },
  end: { dateTime: "2026-02-21T17:00:00-06:00" },
  reminders: {
    overrides: [
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 60 }
    ]
  }
};
```

#### Multi-Calendar Support

- Google Calendar (current)
- Outlook (Microsoft Graph API)
- Apple Calendar (CalDAV)
- Simple in-memory fallback (no external dependency)

### 9. Payment Integration (Phase 7)

#### Stripe Connect

**Flow:**
1. Both GC and Sub onboard via Stripe Connect
2. GC deposits escrow on booking confirmation (e.g., 20% upfront)
3. Funds held in Stripe
4. On job completion (both parties confirm), release to Sub
5. ClawShake takes 2.5% transaction fee

**Instant Pay:**
- Sub can request instant payout (1-2% fee)
- Default: net-30 (no fee)

**Dispute Resolution:**
- If one party disputes completion, hold funds
- Manual review by ClawShake team
- Resolve within 7 days

### 10. Scalability

#### Performance Targets

| Metric | MVP | Growth | Scale |
|--------|-----|--------|-------|
| Active contractors | 100 | 1,000 | 10,000+ |
| Bookings/month | 500 | 5,000 | 50,000+ |
| Avg response time | <2s | <1s | <500ms |
| Message throughput | 100/sec | 1,000/sec | 10,000/sec |

#### Bottlenecks & Solutions

| Bottleneck | Solution |
|------------|----------|
| SQLite concurrency | Migrate to PostgreSQL (connection pooling) |
| Single MQTT broker | Federate (regional hubs) or P2P (libp2p) |
| Contract generation | Async queue (Redis + workers) |
| Calendar API rate limits | Batch operations, cache availability |

#### Infrastructure (Production)

```
Load Balancer (Cloudflare)
        │
        ▼
API Servers (3+ instances, Node.js)
        │
        ├─> PostgreSQL (primary + read replicas)
        ├─> Redis (caching + job queue)
        ├─> MQTT Cluster (EMQX or Mosquitto cluster)
        └─> S3 (contract storage)
```

---

## Code Quality Standards

Before production:

- **Testing:** Unit tests (Jest), integration tests (Supertest), E2E tests (Playwright)
- **Logging:** Structured logging (Winston), log aggregation (DataDog or Grafana)
- **Monitoring:** Uptime (UptimeRobot), APM (New Relic or Sentry), metrics (Prometheus)
- **CI/CD:** GitHub Actions, auto-deploy to staging, manual approval for prod
- **Documentation:** API docs (Swagger), architecture diagrams (Mermaid), runbooks

---

## Conclusion

This architecture is built for **rapid iteration** (MVP in hours) while maintaining **long-term scalability** (handles 10K+ contractors).

The foundation is solid. Now we build on it.
