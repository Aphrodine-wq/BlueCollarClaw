# 💓 Pulse Check - Integrated with BlueCollarClaw

**Your skill is now part of BlueCollarClaw!**

## What It Does

Sends you a daily briefing every morning with:
- ☀️ Weather + construction alerts (rain, wind, heat, cold)
- 📅 Calendar events for today
- 📩 Unreplied messages
- 💰 Money updates
- 🏗️ Project status
- 🎯 AI-prioritized tasks

## Location

```
BlueCollarClaw/pulse-check/
├── pulse.js              # Main script
├── pulse-config.json     # Your config
├── README.md             # Original docs
└── SKILL.md              # Skill definition
```

## Usage with BlueCollarClaw

### Manual Run
```bash
cd C:\Users\Walt\Desktop\BlueCollarClaw
node pulse-check/pulse.js
```

### Schedule Daily (6:30 AM)
Already configured in `pulse-config.json`:
```json
{
  "schedule": "6:30",
  "timezone": "America/Chicago",
  "delivery_channel": "telegram"
}
```

### Integration Points

**With OpenClaw:**
- Add to OpenClaw cron for automatic daily delivery
- Sends via Telegram/WhatsApp
- Pulls from connected calendars, messages, finances

**Standalone:**
- Run manually anytime
- Preview with `--dry-run`
- Single sections: `--section weather`

## BlueCollarClaw Enhancements

I can integrate pulse-check with BlueCollarClaw data:

1. **Project Status from BlueCollarClaw**
   - Active job requests
   - Pending offers
   - Today's bookings
   - Completed jobs this week

2. **Weather + Job Matching**
   - "Rain expected — 3 indoor jobs available"
   - "High wind — no roofing jobs today"

3. **Daily Contractor Brief**
   - "You have 2 new offers"
   - "Job at 423 Oak St starts today"
   - "Mike's Plumbing completed yesterday - rate them"

Want me to integrate BlueCollarClaw data into your pulse check?

---

🦞 **Pulse Check + BlueCollarClaw = Your Morning Command Center**
