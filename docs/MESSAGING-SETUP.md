# 📱 BlueCollarClaw Messaging Setup

**REQUIRED:** You must connect WhatsApp OR Telegram to receive job notifications.

This guide shows you exactly how to do it.

---

## 🚀 Quick Start (Recommended)

### Option 1: Telegram (Easiest - 2 Minutes)

**Why Telegram?** No QR codes, no phone required, works everywhere.

**Steps:**

1. **Install Telegram** (if you don't have it)
   - Download: https://telegram.org/
   - Or use web version: https://web.telegram.org/

2. **Find BlueCollarClawBot**
   - Open Telegram
   - Search for `@BlueCollarClawBot` (or whatever you name your bot)
   - Tap "Start"

3. **Link Your Account**
   - Bot will ask for your Contractor ID
   - Paste it (from `my-BlueCollarClaw-config.txt`)
   - Done!

**That's it. You'll now get notifications on Telegram.**

---

### Option 2: WhatsApp (More Familiar - 5 Minutes)

**Why WhatsApp?** Most contractors already use it daily.

**Steps:**

#### Using Twilio WhatsApp Business API (Recommended)

1. **Sign up for Twilio**
   - Go to https://www.twilio.com/
   - Create account and verify phone number

2. **Get WhatsApp Credentials**
   - In Twilio console, navigate to Messaging > WhatsApp
   - Create WhatsApp Business Account
   - Get phone number and API credentials

3. **Configure BlueCollarClaw**
   - Create `.env` file:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

4. **Start WhatsApp Bot**
   ```bash
   node whatsapp-bot.js
   ```

**Done! You'll get job alerts on WhatsApp.**

---

## 🔧 Advanced Setup

### Creating Your Own Telegram Bot

**If you want your own bot (not using a shared one):**

1. **Talk to BotFather**
   - Open Telegram
   - Search for `@BotFather`
   - Send: `/newbot`
   - Follow prompts to name your bot

2. **Get Your Token**
   - BotFather gives you a token like: `123456789:ABCdef...`
   - Save it!

3. **Configure BlueCollarClaw**
   - Create `.env` file:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   ```

4. **Start Bot Server**
   ```bash
   node telegram-bot.js
   ```

5. **Connect**
   - Search for your bot in Telegram
   - Send `/start`
   - Send your Contractor ID

---

### Advanced WhatsApp Setup (Production)

**For enterprise deployment:**

1. **Setup Facebook Business Manager**
   - Go to: https://business.facebook.com/
   - Create business account

2. **Get WhatsApp Business API**
   - Apply at: https://developers.facebook.com/products/whatsapp/
   - Get approved (can take a few days)

3. **Configure BlueCollarClaw**
   - Add to `.env`:
   ```
   WHATSAPP_API_KEY=your_api_key
   WHATSAPP_PHONE_ID=your_phone_id
   WHATSAPP_BUSINESS_ID=your_business_id
   WEBHOOK_URL=https://your-server.com/whatsapp/webhook
   ```

4. **Deploy Server**
   - Run BlueCollarClaw on production server
   - Configure webhook endpoint
   - Verify webhook with Facebook

---

## 💬 What You'll Receive

### When a Job Matches (For Subs)

**Telegram/WhatsApp Message:**
```
🔨 New Job Match!

Trade: Plumber
Location: 423 Oak St, Austin, TX
Dates: Feb 19-21, 2026
Rate: $80-100/hr
Scope: Rough-in plumbing, 1,200 sqft

Your match score: 95/100

Reply:
• "accept" to send offer
• "details" for more info
• "skip" to ignore
```

### When You Get an Offer (For GCs)

**Telegram/WhatsApp Message:**
```
📬 New Offer Received!

Job: Plumber needed (req_abc123)
From: Mike's Plumbing Co
Rate: $90/hr
Dates: Feb 19-21 (matches your request)
Rating: 4.8★ (12 jobs)

Reply:
• "accept" to book
• "counter $85" to negotiate
• "decline" to pass
```

---

## 🧪 Testing Notifications

### Test Telegram

```bash
# After setup, send yourself a test:
node test-telegram.js YOUR_CONTRACTOR_ID
```

You should get a message in Telegram.

### Test WhatsApp

```bash
# After setup:
node test-whatsapp.js YOUR_CONTRACTOR_ID
```

You should get a message on WhatsApp.

---

## 🚨 Troubleshooting

### Telegram Not Working

**Issue:** Bot doesn't respond  
**Fix:**
1. Make sure bot is running: `node telegram-bot.js`
2. Check token in `.env`
3. Try `/start` again

**Issue:** Not getting notifications  
**Fix:**
1. Check contractor ID is correct
2. Verify bot is linked in database
3. Check bot logs for errors

### WhatsApp Not Working

**Issue:** Not receiving WhatsApp messages
**Fix:**
1. Make sure Twilio is properly configured
2. Try closing and reopening WhatsApp
3. Restart the WhatsApp bot server

**Issue:** Webhook not responding
**Fix:**
1. Re-run the WhatsApp bot with correct webhook URL
2. Verify Twilio webhook is configured correctly
3. Check server has internet connectivity

---

## 📊 Notification Settings

### Customize What You Receive

Edit `my-BlueCollarClaw-config.txt`:

```bash
# Notification preferences
NOTIFY_NEW_JOBS=true          # Get alerts for matching jobs
NOTIFY_OFFERS=true            # Get alerts for offers received
NOTIFY_ACCEPTED=true          # Get alerts when offer accepted
NOTIFY_COMPLETED=true         # Get alerts on job completion
NOTIFY_RATINGS=true           # Get alerts for new ratings

# Quiet hours (optional)
QUIET_HOURS_START=22:00       # No notifications after 10 PM
QUIET_HOURS_END=07:00         # Resume at 7 AM

# Message format
MESSAGE_FORMAT=short          # "short" or "detailed"
```

---

## 🔒 Security & Privacy

### Your Phone Number

- **Telegram:** Bot never sees your real phone number
- **WhatsApp:** Only you see messages (end-to-end encrypted)
- **BlueCollarClaw:** We never store your phone number

### Data Sharing

- Your contractor profile is visible to other contractors
- Your phone/Telegram is NEVER shared
- All negotiation happens through BlueCollarClaw
- Contact info only exchanged after booking confirmed

---

## 💡 Pro Tips

1. **Use Telegram for testing** - Easier to set up, works on all devices
2. **Switch to WhatsApp for production** - More familiar to contractors
3. **Enable notifications** - You'll miss jobs without them
4. **Set quiet hours** - Avoid late-night alerts
5. **Keep both connected** - Backup if one fails

---

## 🆘 Still Need Help?

### Quick Fixes

**Can't find contractor ID?**
```bash
cat my-BlueCollarClaw-config.txt | grep CONTRACTOR_ID
```

**Want to change messaging app?**
```bash
# Just run setup again:
node easy-setup.js
# Pick different option in Step 5
```

**Test if it's working:**
```bash
# Run demo with notifications:
npm run demo
# Check if you got a message
```

---

## 📞 Support

**Telegram issues:** Check @BotFather docs  
**WhatsApp issues:** Check Twilio WhatsApp API docs
**BlueCollarClaw issues:** Run diagnostic: `npm run check`

---

**Next Step:** Once messaging is set up, run `npm run demo` and you should get notifications!

---

🤝 **BlueCollarClaw — Stay Connected, Stay Booked**
