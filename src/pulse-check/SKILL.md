---
name: pulse-check
description: Daily intelligent briefing skill. Compiles weather, calendar, pending messages, project status, and financial snapshot into one concise morning message. Runs via cron or on-demand via "pulse" command.
metadata: { "openclaw": { "requires": { "env": ["OPENWEATHER_API_KEY"] } } }
---

# Pulse Check — Your Daily Briefing Skill

## Purpose

Pulse Check compiles everything you need to know into a single, scannable morning message. No apps to open. No dashboards to check. One message, every morning.

## What It Includes

Each pulse contains these sections (any can be toggled off in config):

1. **Weather** — Current conditions + forecast for the day. Flags rain/extreme heat/cold that could impact outdoor work.
2. **Calendar** — Today's meetings/appointments with context pulled from recent messages about each person/topic.
3. **Unreplied Messages** — Messages across all channels you haven't responded to yet, ranked by urgency (time waiting + sender priority).
4. **Money Snapshot** — Quick cash position: recent payments received, pending invoices, upcoming expenses. Flags anything overdue.
5. **Active Projects Pulse** — For each active project: days until next milestone, any blockers mentioned in recent messages, sub confirmations pending.
6. **Today's Priorities** — AI-generated top 3 priorities based on deadlines, unreplied messages, and calendar gaps.

## Trigger

- **Automatic**: Runs daily via cron at configured time (default: 6:30 AM local)
- **Manual**: Say "pulse" or "pulse check" in any connected channel

## Configuration

Edit `pulse-config.json` in the skill directory:

```json
{
  "schedule": "6:30",
  "timezone": "America/Chicago",
  "weather_location": "Oxford, MS",
  "sections": {
    "weather": true,
    "calendar": true,
    "unreplied": true,
    "money": true,
    "projects": true,
    "priorities": true
  },
  "unreplied_max": 10,
  "project_tags": ["oak-st", "johnson-kitchen", "fairtrademworker"],
  "priority_contacts": ["mom", "john-rivera", "mike-plumbing"],
  "income_sources": [],
  "expense_tracking": true,
  "delivery_channel": "telegram"
}
```

## How Sections Work

### Weather
Uses OpenWeather API. Highlights conditions relevant to construction work:
- Temperature + "feels like"
- Precipitation probability (flags >30% for outdoor work warning)
- Wind speed (flags >20mph)
- Sunrise/sunset for daylight planning

### Calendar
Pulls from connected calendar (Google Calendar, Apple Calendar via gog/apple-reminders skills).
For each event, Pulse Check searches recent messages for context about attendees or topics.

### Unreplied Messages
Scans all connected channels (WhatsApp, Telegram, Discord, SMS, email) for inbound messages you haven't replied to. Sorts by:
1. Priority contacts first
2. Then by age (oldest unreplied = most urgent)
3. Truncates to `unreplied_max`

Shows sender, time received, and a 1-line summary of what they need.

### Money Snapshot
If you use invoicing tools (QuickBooks, Wave, Stripe, or even just email invoices), Pulse Check tracks:
- Payments received in last 24hrs
- Invoices overdue
- Known upcoming expenses (recurring bills, scheduled material orders)
- Simple net position: "You're +$X or -$X vs this time last week"

### Active Projects Pulse
For each tag in `project_tags`, scans recent messages and files for:
- Last activity date
- Any mentions of delays, issues, or blockers
- Upcoming deadlines from calendar
- Pending confirmations from subs

### Today's Priorities
AI-synthesized top 3 things you should focus on today based on:
- Overdue unreplied messages
- Imminent deadlines
- Calendar gaps (free time = opportunity to tackle backlog)
- Anything flagged as urgent in recent messages

## Output Format

The pulse is delivered as a single clean message:

```
☀️ Oxford, MS — 72°F, clear skies. No rain today. Sunset 5:47pm.

📅 Today:
• 9:00 AM — Call with John Rivera (you owe him a reply about Oak St timeline)
• 2:00 PM — Inspector at Johnson kitchen

📩 Unreplied (4):
• Mike (plumbing) — 14hrs ago — "what time Wednesday?"
• Sarah Johnson — 2 days ago — asking about cabinet color
• Home Depot Pro — 1 day ago — order confirmation needs response
• Mom — 6hrs ago — dinner Sunday?

💰 Money:
• Received: $4,200 (Rivera Electric, Invoice #0041)
• Overdue: $2,800 (Johnson, 8 days late)
• Due this week: $1,200 (material order, HD Pro)
• Net vs last week: +$1,200

🏗️ Projects:
• Oak St Remodel — inspection in 3 days, plumbing rough-in not confirmed
• Johnson Kitchen — cabinets delayed, ETA unknown, need to follow up with supplier
• FairTradeWorker — no blockers, last commit 2 days ago

🎯 Top 3 Today:
1. Reply to Mike and confirm Wednesday plumbing time (blocks Oak St inspection)
2. Chase Johnson invoice — 8 days overdue
3. Call cabinet supplier re: Johnson kitchen delay

Good morning. Go get it. 🦞
```

## Installation

This skill is now integrated into the core repository.
Location: `src/pulse-check/`

## Dependencies

- **Required**: OpenWeather API key (set in `.env` as `OPENWEATHER_API_KEY`)
- **Required**: BlueCollarClaw SQLite Database (initialized via `easy-setup.js`)
- **Optional**: GitHub token (for repo analysis)
- **Optional but recommended**: Google Calendar or Apple Calendar connected, messaging channels active
- **Optional**: Financial tool integrations (QuickBooks, Stripe, Wave)

## Notes

- Pulse Check never sends data externally — all synthesis happens locally via your configured LLM
- The briefing gets smarter over time as it learns your project patterns and contact priorities
- Say "pulse off" to skip tomorrow's briefing, "pulse at 8" to reschedule one-time
- Say "pulse [project-name]" for a deep-dive on a single project
