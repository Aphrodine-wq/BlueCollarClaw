# ✅ PULSE CHECK - UPGRADED WITH GITHUB + MOTIVATION

**Your 7 AM daily briefing is now scheduled and enhanced!**

---

## 🎉 What Changed

### 1. **GitHub Analysis Added**
- Analyzes all your repos
- Shows recent activity (24h, 7 days)
- Top languages breakdown
- Stars and forks count
- Open issues alerts
- Identifies stale repos
- Most active projects

### 2. **Daily Motivation Added**
- Tailored for builders and hustlers
- Rotates daily (20 unique messages)
- Weekly wisdom on Fridays
- Real talk, no fluff

### 3. **Scheduled for 7 AM Daily**
- Runs automatically via OpenClaw cron
- Delivers to your Telegram
- Full briefing every morning

---

## 📋 What Your Pulse Includes Now

**Every morning at 7 AM:**

```
── PULSE CHECK ── Wednesday, February 11, 2026 ──

☀️ Oxford, MS — 72°F, clear sky. Wind 5mph.
✅ No rain in forecast today.
🌅 Sunrise 6:42 AM / Sunset 5:38 PM

📅 [Calendar events]

💻 GITHUB ANALYSIS (47 repos)
   🟢 5 repos active this week
   🔥 3 updated in last 24h
      • BlueCollarClaw (2 hours ago)
      • milesproject (5 hours ago)
   ⭐ 234 stars, 🍴 67 forks
   📚 Top languages: JavaScript (23), TypeScript (12), Python (8)

   MOST ACTIVE:
      🌐 BlueCollarClaw — JavaScript (pushed 2 hours ago)
      🔒 oxford-outdoor-living — React (pushed yesterday)
      🌐 fairtradeworker — TypeScript (pushed 3 days ago)

   ⚠️ 12 open issues across 4 repos
   💤 8 repos inactive 30+ days — consider archiving

🤝 BlueCollarClaw UPDATE
📦 JOBS TODAY (2)
   • plumber with Mike's Plumbing at 423 Oak St
   • electrician with Austin Electric at 789 Main St
💼 3 NEW OFFERS — Check dashboard
📊 THIS WEEK: 5 bookings completed

📩 [Unreplied messages]

💰 [Money updates]

🎯 [AI priorities]

⚡ DAILY MOTIVATION
   "Your competition is sleeping. You're not."
   → Use this edge. Make it count.

Go get it. 🦞
```

---

## ⚙️ Setup GitHub Analysis

### Step 1: Add Your GitHub Username

Edit `pulse-check/pulse-config.json`:

```json
{
  "github_username": "your-actual-username"
}
```

**OR** set environment variable:
```bash
# Add to .env or system environment
GITHUB_USERNAME=your-username
```

### Step 2: (Optional) Add GitHub Token for Private Repos

Create token at: https://github.com/settings/tokens

Permissions needed:
- `repo` (if you want private repos)
- `read:user`

Then add to environment:
```bash
GITHUB_TOKEN=ghp_yourTokenHere
```

Without token = public repos only
With token = all repos + issues

---

## 🧪 Test It Now

### Test Full Pulse
```bash
cd C:\Users\Walt\Desktop\BlueCollarClaw
npm run pulse
```

### Test Individual Sections
```bash
# GitHub analysis
node pulse-check/pulse.js --section github

# Motivation
node pulse-check/pulse.js --section motivation

# BlueCollarClaw data
node pulse-check/pulse.js --section BlueCollarClaw

# Weather
node pulse-check/pulse.js --section weather
```

### Preview Without Sending
```bash
node pulse-check/pulse.js --dry-run
```

---

## 📅 Cron Schedule (Already Set!)

**Job Details:**
- **Name:** "Daily Pulse Check - 7 AM"
- **Schedule:** Every day at 7:00 AM Central
- **Delivery:** Telegram (auto-announce)
- **Status:** ✅ Enabled

**Next run:** Tomorrow at 7:00 AM

View/manage:
```bash
# List all cron jobs
openclaw cron list

# Check status
openclaw cron status

# Disable temporarily
openclaw cron disable "Daily Pulse Check - 7 AM"

# Re-enable
openclaw cron enable "Daily Pulse Check - 7 AM"
```

**Test it manually:**
```bash
# Run the cron job now (don't wait for 7 AM)
openclaw cron run "Daily Pulse Check - 7 AM"
```

---

## 🎯 What Each Section Shows

### Weather
- Current temp and feels like
- Wind speed
- Rain forecast (construction-critical)
- Sunrise/sunset times
- **Alerts:** High wind, heat, cold, rain

### GitHub
- Repos updated in last 24h
- Active repos this week
- Total stars and forks
- Top languages
- Most active projects
- Open issues count
- Stale repos (30+ days inactive)

### BlueCollarClaw
- Jobs starting today
- New offers count
- Active job requests
- Weekly completion stats

### Motivation
- Daily quote + action item
- Tailored for builders
- Friday bonus: Weekly wisdom

---

## 💡 Motivation Examples

**Sample daily messages:**

> ⚡ **DAILY MOTIVATION**
> "Every empire was built one brick at a time."
> → Focus on today's brick. Stack it perfect.

> 🚀 **DAILY MOTIVATION**
> "The market doesn't reward potential. It rewards execution."
> → Ship something today. Even if it's small.

> 🔥 **DAILY MOTIVATION**
> "Your GitHub contributions don't lie. Make today green."
> → Commit something meaningful.

**Friday wisdom bonus:**

> 📖 **WEEKLY WISDOM**
> This week you shipped code. That's more than most people ever will.

---

## 🔧 Customize It

Edit `pulse-check/pulse-config.json`:

```json
{
  "schedule": "7:00",              // Change time
  "github_username": "yourname",   // Add your username
  "sections": {
    "weather": true,
    "calendar": true,
    "github": true,               // Toggle GitHub
    "unreplied": true,
    "money": true,
    "projects": true,
    "priorities": true,
    "motivation": true            // Toggle motivation
  }
}
```

**Disable any section by setting to `false`**

---

## 📱 How It Delivers

**7:00 AM every morning:**
1. OpenClaw cron wakes up
2. Runs pulse check in isolated session
3. Gathers all data (weather, GitHub, BlueCollarClaw, motivation)
4. Formats for Telegram
5. Sends to your chat
6. Announces completion

**You wake up to your briefing already waiting.** 🦞

---

## 🚨 Troubleshooting

**GitHub not showing:**
- Add `github_username` to config
- Check username is correct
- API rate limit: add GITHUB_TOKEN

**Motivation not showing:**
- Verify `"motivation": true` in config
- Check motivation-module.js exists

**Cron not running:**
- Check: `openclaw cron list`
- Verify enabled: `openclaw cron status`
- Check gateway is running: `openclaw status`

**No Telegram delivery:**
- Verify channel is connected
- Check delivery settings in cron job

---

## 📊 Files Added/Modified

**New files:**
- `pulse-check/github-module.js` (4.5 KB) - GitHub analysis
- `pulse-check/motivation-module.js` (4.5 KB) - Daily motivation
- `schedule-pulse.js` - Cron setup helper
- `PULSE-UPGRADED.md` - This doc

**Modified:**
- `pulse-check/pulse.js` - Added GitHub + motivation
- `pulse-check/pulse-config.json` - Added sections + username

**Cron job created:**
- ID: `f315fd44-8e40-4f78-b065-448275980d35`
- Next run: Tomorrow 7:00 AM

---

## ✅ You're All Set!

**Tomorrow morning at 7 AM, you'll receive:**
- ☀️ Weather + construction alerts
- 💻 GitHub repo analysis
- 🤝 BlueCollarClaw business update
- ⚡ Daily motivation

**Everything you need to dominate the day, in one message.**

**Test it now:**
```bash
npm run pulse
```

---

🦞 **Wake up to data. Go to bed with progress.**
