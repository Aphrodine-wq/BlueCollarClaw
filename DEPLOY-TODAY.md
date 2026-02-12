# 🚀 DEPLOY CLAWSHAKE TODAY - Checklist

## What You Need to Provide (5 minutes each)

### 1. Telegram Bot Token (2 mins)
- [ ] Open Telegram
- [ ] Message @BotFather
- [ ] Send `/newbot`
- [ ] Name it: "ClawShake Bot"
- [ ] Username: something like "YourClawShakeBot"
- [ ] **Copy the API token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Server to Host Bot (choose one)

**Option A: Your Computer (Testing Only)**
- [ ] Keep computer running
- [ ] Port forward 3000 if you want external access

**Option B: VPS (Recommended - $5/month)**
- [ ] DigitalOcean, Linode, or Vultr
- [ ] Ubuntu 22.04
- [ ] 1GB RAM, 1 CPU minimum
- [ ] **Send me the IP and root password**

**Option C: Railway/Render (Free tier)**
- [ ] Sign up at railway.app or render.com
- [ ] Connect GitHub repo
- [ ] **Send me the dashboard access**

### 3. MQTT Broker (for network mode)

**Option A: HiveMQ Cloud (Free - Recommended)**
- [ ] Sign up at console.hivemq.cloud
- [ ] Create free cluster
- [ ] Get credentials
- [ ] **Send me: host, port, username, password**

**Option B: Local Mosquitto (Self-hosted)**
- [ ] I can set this up on your VPS

### 4. Database (SQLite works for now, but PostgreSQL is better)

**Option A: SQLite (Quick start - works today)**
- [ ] Already working, no setup needed

**Option B: PostgreSQL (Production)**
- [ ] Can install on same VPS
- [ ] Or use Supabase free tier

---

## What I'll Do (Once You Send Credentials)

1. **Configure environment** (5 mins)
   - Set up .env file with your credentials
   - Install dependencies
   - Test connections

2. **Deploy Telegram Bot** (10 mins)
   - Start bot with your token
   - Verify it's responding
   - Test job posting flow

3. **Start Dashboard** (5 mins)
   - Launch web dashboard on port 3000
   - Configure auto-start on boot

4. **Set up MQTT** (10 mins)
   - Configure network layer
   - Test agent-to-agent communication

5. **Create systemd services** (10 mins)
   - Bot auto-starts on reboot
   - Dashboard auto-starts on reboot
   - Logs to files

---

## Testing Checklist (We'll Do Together)

- [ ] Text bot: "I need a plumber"
- [ ] Verify job appears in dashboard
- [ ] Post job via web interface
- [ ] Test demo mode: `npm run demo`
- [ ] Verify contracts generate
- [ ] Test network broadcast (if MQTT ready)

---

## Domain Question: YES, Buy It Now

**Recommended:**
- clawshake.com (probably taken)
- getclawshake.com
- clawshake.app
- clawshake.io

**Why buy today:**
- $10-15/year, trivial cost
- Needed for production dashboard
- Makes it feel real
- Required for SSL/HTTPS

**Not blocking for TODAY:**
- Can test with IP address
- Can add domain later and redirect

**Where to buy:**
- Namecheap (recommended)
- Cloudflare (best DNS)
- Google Domains

---

## Time Estimate

**Your work:** 15-20 minutes (getting credentials)
**My work:** 30-40 minutes (deployment + testing)
**Total time to live:** ~1 hour

---

## Send Me These 3 Things:

1. **Telegram bot token** (from BotFather)
2. **Server access** (IP + login) OR tell me to use your computer
3. **MQTT credentials** (from HiveMQ) OR tell me to skip network mode for now

Once I have those, ClawShake will be live and working in under an hour.

---

## Optional: Quick Domain Setup

If you buy a domain, also send me:
4. **Domain name** (e.g., getclawshake.com)
5. **Point domain to server IP** (A record)

I'll configure SSL with Let's Encrypt so you have https://getclawshake.com

---

**Ready when you are. Send me the credentials and I'll get this live.**