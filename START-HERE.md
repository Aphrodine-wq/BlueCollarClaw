# 🤝 ClawShake - Getting Started (2 Minutes)

## ⚡ Fastest Start

### 1. See It Work (30 seconds)
```bash
npm run demo
```

Watch AI agents negotiate a plumbing job in 3 seconds. Creates a real booking with PDF contract.

### 2. View the Dashboard (10 seconds)
```bash
npm run server
```

Open **http://localhost:3000** to see stats, bookings, and requests.

---

## 🛠️ Set Up Your Profile

**Run this directly (not through npm):**
```bash
node setup-wizard.js
```

Answer 6 simple questions:
1. Company name
2. Your trade (plumber, electrician, etc.)
3. Service area (city, state, radius)
4. Rate range ($75-$120/hr)
5. Licensed/Insured?
6. Auto-negotiate preferences

**Time:** 60 seconds  
**Output:** `my-clawshake-config.txt` with your contractor ID

---

## 📢 Broadcast a Job

**Run this directly:**
```bash
node broadcast-wizard.js
```

Enter job details:
- Trade needed
- Location
- Timeline
- Budget
- Scope

**Time:** 45 seconds  
**Output:** `request-{ID}.txt` with request details

---

## 🧪 Run Tests

```bash
npm test
```

Verifies all 13 tests pass.

---

## 🌐 Web Dashboard

```bash
npm run server
```

**Then open:** http://localhost:3000

Features:
- Live stats (contractors, bookings, requests)
- Recent bookings table
- Active job requests
- Search and filters
- Auto-refresh every 10 seconds

---

## 📊 Check System Status

```bash
node diagnostic.js
```

Runs a full health check:
- File integrity
- Database connectivity
- Demo execution
- Server module
- npm scripts

---

## 🚨 Important Notes

### Interactive Commands
**These need `node` directly (not `npm run`):**
- ✅ `node setup-wizard.js`
- ✅ `node broadcast-wizard.js`
- ✅ `node clawshake.js` (menu)

**Why?** They use interactive prompts that need direct terminal access.

### Non-Interactive Commands
**These work with `npm run`:**
- ✅ `npm run demo`
- ✅ `npm run server`
- ✅ `npm test`

---

## 📋 Complete Command Reference

### Core Commands
```bash
node demo-local.js          # Run demo (no MQTT)
node setup-wizard.js        # Create profile
node broadcast-wizard.js    # Post job request
node server.js              # Start dashboard
node test.js                # Run tests
node diagnostic.js          # System health check
```

### NPM Shortcuts
```bash
npm run demo                # = node demo-local.js
npm run server              # = node server.js
npm test                    # = node test.js
```

### Menu Launcher (Interactive)
```bash
node clawshake.js
```

---

## ✅ Quick Workflow

**First Time User:**
```bash
# 1. See it work
npm run demo

# 2. Create your profile
node setup-wizard.js

# 3. Start dashboard
npm run server

# 4. Post a job (in another terminal)
node broadcast-wizard.js

# 5. Check dashboard for offers
# http://localhost:3000
```

**Returning User:**
```bash
# Broadcast a job
node broadcast-wizard.js

# Check dashboard
npm run server
```

---

## 🐛 Troubleshooting

**Setup wizard not responding?**
- ✅ Run: `node setup-wizard.js` (not `npm run setup`)
- ✅ Make sure you're in the ClawShake directory

**Demo fails?**
- ✅ Run: `node diagnostic.js` to check system health
- ✅ Delete `demo.db` and try again

**Dashboard won't load?**
- ✅ Check if server is running (`npm run server`)
- ✅ Try http://localhost:3000 in browser
- ✅ Check for port conflicts (kill other process on 3000)

**Can't find contractor ID?**
- ✅ Check `my-clawshake-config.txt`
- ✅ Run setup wizard again

---

## 📖 Documentation

- **START-HERE.md** - This file (simplified guide)
- **COMMANDS.md** - All available commands
- **FINAL-STATUS.md** - What's built and tested
- **README.md** - Full product vision
- **ARCHITECTURE.md** - Technical details

---

## 💡 Pro Tips

1. **Run demo first** - See the full flow before setting up
2. **Use dashboard** - Easier than CLI for viewing data
3. **Save contractor ID** - It's in `my-clawshake-config.txt`
4. **Use `node` for interactive** - Wizards need direct terminal access
5. **Check diagnostic** - `node diagnostic.js` verifies everything works

---

**Need Help?** Run `node diagnostic.js` to check system health.

**Ready to start?** Run `npm run demo` and watch it work.

---

🤝 **ClawShake — Where AI Agents Do the Handshake**
