# ✅ Pulse Check - Integrated & Enhanced

**Your pulse-check skill is now part of BlueCollarClaw with contractor-specific data!**

---

## 🎉 What Changed

### Added to BlueCollarClaw
```
BlueCollarClaw/pulse-check/
├── pulse.js                        # Your original skill (enhanced)
├── pulse-config.json               # Your config
├── BlueCollarClaw-integration.js        # NEW - BlueCollarClaw data module
├── README.md                       # Original docs
└── SKILL.md                        # Skill definition
```

### New BlueCollarClaw Section

Your daily pulse now includes:

```
🤝 BlueCollarClaw UPDATE

📦 JOBS TODAY (2)
   • plumber with Mike's Plumbing at 423 Oak St
   • electrician with Austin Electric at 789 Main St

💼 3 NEW OFFERS — Check dashboard

📋 ACTIVE REQUESTS (2)
   • hvac needed 2026-02-20 ($75-95/hr)
   • framer needed 2026-02-25 ($80-100/hr)

📊 THIS WEEK: 5 bookings completed
```

---

## 🚀 Usage

### Run Full Pulse
```bash
cd C:\Users\Walt\Desktop\BlueCollarClaw
node pulse-check/pulse.js
```

**Output:**
```
── PULSE CHECK ── Wednesday, February 11, 2026 ──

☀️ Oxford, MS — 72°F (feels 70°F), clear sky. Wind 5mph.
✅ No rain in forecast today.
🌅 Sunrise 6:42 AM / Sunset 5:38 PM

📅 [Calendar events from OpenClaw]

🤝 BlueCollarClaw UPDATE
📦 JOBS TODAY (2)
   • plumber with Mike's Plumbing at 423 Oak St
   • electrician with Austin Electric at 789 Main St
💼 3 NEW OFFERS — Check dashboard

📩 [Unreplied messages]

💰 [Money updates]

🏗️ [Projects]

🎯 [AI priorities]

Go get it. 🦞
```

### Run Just BlueCollarClaw Section
```bash
node pulse-check/pulse.js --section BlueCollarClaw
```

### Preview Without Sending
```bash
node pulse-check/pulse.js --dry-run
```

---

## 📊 BlueCollarClaw Data Included

**Today's Bookings:**
- Jobs starting or ongoing today
- Contractor names and locations

**Pending Offers:**
- Count of offers waiting for your response
- Link to dashboard

**Active Requests:**
- Your open job requests
- Dates and budget ranges

**Weekly Stats:**
- Bookings completed this week
- Activity summary

---

## ⚙️ Schedule It (Coming Soon)

**With OpenClaw Cron:**
```bash
# Add to OpenClaw config
{
  "cron": [{
    "name": "Daily Pulse",
    "schedule": "0 6 30 * * *",
    "command": "node /path/to/BlueCollarClaw/pulse-check/pulse.js",
    "channel": "telegram"
  }]
}
```

**Standalone (with cron):**
```bash
# Linux/Mac
30 6 * * * cd /path/to/BlueCollarClaw && node pulse-check/pulse.js

# Windows Task Scheduler
# Trigger: Daily at 6:30 AM
# Action: node C:\Users\Walt\Desktop\BlueCollarClaw\pulse-check\pulse.js
```

---

## 🎯 What It Does for Contractors

**Morning Brief:**
1. Check weather for outdoor work
2. See today's jobs at a glance
3. Know about new offers immediately
4. Review active requests
5. Track weekly performance

**Construction-Specific:**
- Rain alerts → reschedule outdoor work
- High wind → no crane/ladder work
- Heat/cold alerts → crew safety
- Sunrise/sunset → daylight hours

**Business Intel:**
- New offers while you slept
- Jobs starting today (be ready)
- Active requests (follow up)
- Weekly completion rate

---

## 🔧 Customization

Edit `pulse-config.json`:

```json
{
  "schedule": "6:30",
  "weather_location": "Oxford, MS",
  "construction_mode": true,
  "outdoor_work_alerts": {
    "rain_threshold_percent": 30,
    "wind_threshold_mph": 20,
    "heat_threshold_f": 95,
    "cold_threshold_f": 32
  },
  "sections": {
    "weather": true,
    "calendar": true,
    "unreplied": true,
    "money": true,
    "projects": true,
    "priorities": true
  }
}
```

---

## 🧪 Test It Now

```bash
cd C:\Users\Walt\Desktop\BlueCollarClaw

# Full pulse
node pulse-check/pulse.js

# Just BlueCollarClaw data
node pulse-check/pulse.js --section BlueCollarClaw

# Just weather
node pulse-check/pulse.js --section weather
```

---

## 📱 Integration with Messaging

When you connect Telegram/WhatsApp:

**Morning message arrives:**
```
── PULSE CHECK ── Wednesday, Feb 11, 2026 ──

☀️ 72°F, clear. No rain today.

🤝 BlueCollarClaw
📦 2 jobs today
💼 3 new offers

Go get it. 🦞
```

**You're ready before you even open your laptop.**

---

## 💡 Future Enhancements

**Smart Alerts:**
- "Rain at 2pm — job at Oak St is outdoor, reschedule?"
- "Wind 25mph — cancel roofing job?"

**Offer Prioritization:**
- "Best offer: Mike's Plumbing, $90/hr, 4.8★"

**Revenue Tracking:**
- "This week: $12,500 booked, $8,200 completed"

**AI Suggestions:**
- "3 plumber requests this week — demand is high, raise your rate?"

Want any of these? Let me know.

---

**Your pulse-check skill is now 10x more powerful with BlueCollarClaw data.** 🦞

---

🤝 **Pulse Check + BlueCollarClaw = Your Morning Command Center**
