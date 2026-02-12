# BlueCollarClaw - Quick Start

## What You Just Got

A fully functional MVP of the BlueCollarClaw protocol:

- **Database layer** (SQLite) — contractor profiles, jobs, offers, bookings, ratings
- **Network layer** (MQTT) — pub/sub messaging for broadcast/listen
- **Negotiation engine** — AI-powered matching and decision-making
- **Contract generator** — PDF contracts for confirmed bookings
- **Calendar integration** — Simple calendar + Google Calendar support
- **BlueCollarClaw agent** — The core orchestrator that ties it all together
- **CLI** — Setup, listen, broadcast, and demo commands

## Prerequisites

**Node.js 18+** (you already have this installed)

That's it. The demo runs locally without needing MQTT.

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Running the Demo

The fastest way to see BlueCollarClaw in action (no MQTT broker needed):

```bash
npm run demo
```

This will:
1. Create a demo GC and a demo Plumber
2. Have the GC broadcast a job request
3. Watch the Plumber's agent evaluate and respond
4. Generate a real PDF contract
5. Create calendar events
6. Confirm the booking

Takes about 3 seconds. You'll see the full flow with step-by-step output.

**Want to test the network version?** Install Mosquitto first, then run:
```bash
npm run demo-network
```

## Setting Up Your First Contractor

```bash
npm run setup
```

This walks you through creating a contractor profile. You'll get a `contractor_id` — save it.

## Listening for Jobs (Subcontractor Mode)

```bash
node cli.js listen <your_contractor_id>
```

Your agent will now listen for job requests matching your trade, location, and rate preferences.

## Broadcasting a Job (GC Mode)

```bash
node cli.js broadcast <your_contractor_id>
```

This lets you post a job request. Other contractors' agents will see it and respond if they match.

## File Structure

```
BlueCollarClaw/
├── agent.js          # Core BlueCollarClaw agent (orchestrates everything)
├── database.js       # SQLite database layer
├── network.js        # MQTT messaging layer
├── negotiation.js    # AI-powered matching and decision engine
├── contracts.js      # PDF contract generation
├── calendar.js       # Calendar integration (Google + simple fallback)
├── cli.js            # Command-line interface
├── package.json      # Dependencies and scripts
├── README.md         # Product vision (the full blueprint)
└── QUICKSTART.md     # This file
```

## Next Steps

### Immediate (Tonight)

1. **Run the demo** — See the full flow working
2. **Set up 2 contractors** — One GC, one Sub (different trades)
3. **Test live broadcast/listen** — Watch them negotiate
4. **Generate a real contract PDF** — It's in `./contracts/`

### Soon (This Week)

1. **Multi-round negotiation** — Add counter-offer logic
2. **Google Calendar integration** — Set up OAuth and real calendar events
3. **Rate limiting & preferences** — Let contractors fine-tune auto-negotiation
4. **Reputation system** — Post-job ratings and display them in offers

### Phase 2 (Next Month)

1. **OpenClaw skill wrapper** — Package this as a proper OpenClaw plugin
2. **WhatsApp/Telegram interface** — Send/receive via messaging
3. **Web dashboard** — View bookings, manage profile, see analytics
4. **Payment/escrow** — Stripe integration for deposits

## What's Missing (Intentionally)

This is an MVP. Not included yet:

- Payment processing
- Advanced analytics
- Multi-round counter-offers (skeleton is there)
- Verification badges
- Email notifications
- Production-grade security (signatures are basic)
- P2P networking (using hub for now)

All of that is in the roadmap. This is the foundation.

## Troubleshooting

**"Cannot connect to MQTT broker"**  
Make sure Mosquitto (or your chosen broker) is running. Check the URL in the agent config.

**"Contractor profile not found"**  
Run `npm run setup` first to create a profile.

**"Database locked"**  
Only one agent per contractor ID at a time (SQLite limitation). For multi-instance, switch to Postgres.

## Architecture Notes

- **Database:** SQLite for dev. In production, migrate to Postgres (schema is compatible).
- **Messaging:** MQTT for MVP. Migrate to libp2p for true P2P eventually.
- **Security:** RSA signing is implemented but verification is basic. Strengthen for production.
- **Calendar:** Using simple in-memory calendar. Google Calendar integration is there but requires OAuth setup.

## What This Proves

You can now:

1. **Create contractor profiles** with trades, rates, and preferences
2. **Broadcast job requests** to the network
3. **Automatically match** subs to jobs based on trade, location, rate, and availability
4. **Negotiate** (basic accept/decline, counter-offers ready for v2)
5. **Confirm bookings** with auto-generated contracts and calendar events
6. **Rate** completed jobs (reputation system foundation)

This is a working protocol. The rest is refinement, scale, and monetization.

## Code Quality

This was built in a few hours. It's production-quality scaffolding, not production-ready code. You'll want to:

- Add comprehensive error handling
- Write tests (unit + integration)
- Add logging (Winston or similar)
- Harden security (proper signature verification, rate limiting)
- Add input validation
- Optimize database queries
- Add retry logic for network failures

But the architecture is solid. The bones are good.

## Questions?

Read the full product vision in `README.md`. It covers the monetization strategy, go-to-market plan, and long-term vision.

Now go run the demo and watch AI agents negotiate a plumbing job.

---

**Built in one night. Because you said you wanted to see real hustle.**
