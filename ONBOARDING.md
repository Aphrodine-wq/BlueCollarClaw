# 🚀 ClawShake - Dead Simple Onboarding

**Get started in 3 minutes. For real.**

---

## Step 1: Setup (60 Seconds)

```bash
npm start
```

**Or:**
```bash
node easy-setup.js
```

Answer 5 simple questions:
1. Your name
2. Are you a GC or Sub? (pick a number)
3. Where do you work?
4. Your hourly rate (if you're a sub)
5. **WhatsApp or Telegram?** (REQUIRED)

**Done. Profile created.**

---

## Step 2: Connect Messaging (2 Minutes)

### If You Picked WhatsApp:
```bash
node connect-whatsapp.js YOUR_ID
```
- QR code appears
- Scan with phone
- Connected

### If You Picked Telegram:
1. Open Telegram
2. Search `@ClawShakeBot`
3. Send `/start`
4. Send your Contractor ID
5. Done

**You MUST do this to get job notifications.**

---

## Step 3: Post a Job OR Wait for Jobs

### If You're a GC (Post Jobs):
```bash
npm run post
```

Answer 5 questions:
1. What trade? (pick a number)
2. Where's the job?
3. When? (dates)
4. Budget? ($ range)
5. What's the work?

**Job posted. Subs will get notified.**

### If You're a Sub (Find Work):
**You're done!**

Your AI agent is watching for jobs. When one matches:
- ✅ You get a message on WhatsApp/Telegram
- ✅ Reply to accept or decline
- ✅ That's it

---

## 📊 View Dashboard (Optional)

```bash
npm run server
```

Open: http://localhost:3000

See all jobs, offers, and bookings.

---

## ✅ Verification Checklist

**Did you:**
- [ ] Run `npm start` and create profile?
- [ ] Connect WhatsApp OR Telegram?
- [ ] Test it (post a job or wait for one)?

**All yes?** You're ready. Wait for notifications.

---

## 🚨 Required: Messaging

**You MUST connect messaging to use ClawShake.**

Why? Because job alerts happen in real-time. Without WhatsApp/Telegram, you'll miss opportunities.

**Setup guide:** `MESSAGING-SETUP.md`

---

## 💡 Quick Reference

```bash
# Setup profile
npm start

# Post a job (GCs)
npm run post

# View dashboard
npm run server

# Run demo
npm run demo

# Check system
npm run check
```

---

## 🆘 Help

**Setup not working?**
```bash
npm run check
```

**Can't find contractor ID?**
```bash
cat my-clawshake-config.txt
```

**Messaging not working?**
Read `MESSAGING-SETUP.md`

---

**That's it. 3 minutes from zero to fully set up.**

Now go get work (or find workers).

---

🤝 **ClawShake — Get Booked Faster**
