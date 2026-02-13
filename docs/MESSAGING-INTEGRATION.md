# 📱 BlueCollarClaw Messaging Integration

**Post jobs via text message. Get offers on your phone. Book with a single reply.**

---

## 🚀 How It Works

### For Users (GCs):

**Just text what you need:**
```
"I need a plumber tomorrow for $80-100/hr in Austin, TX"
```

**BlueCollarClaw AI understands and confirms:**
```
Got it! Here's what I understood:

🔨 Trade: plumber
📍 Location: Austin, TX
📅 Dates: 2026-02-20 to 2026-02-22
💰 Budget: $80-$100/hr

Reply "post it" to broadcast this job.
```

**When offers come in:**
```
📬 New Offer!
From: Mike's Plumbing Co
Rate: $90/hr
Rating: 4.8★ (12 jobs)

Reply "accept" to book or "counter $85" to negotiate.
```

---

## 🔧 Standalone Setup

### 1. For Telegram Bot

```bash
# Create bot via @BotFather
# Get your API token

# Add to .env
TELEGRAM_BOT_TOKEN=your_token_here
DATABASE_PATH=./BlueCollarClaw.db

# Start bot server
node telegram-bot-server.js
```

### 2. For WhatsApp (via Twilio)

```bash
# Create Twilio account
# Get WhatsApp sandbox credentials

# Add to .env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Start WhatsApp bot
node whatsapp-bot.js
```

### 3. Message Routing Configuration

Create `message-config.json`:

```json
{
  "messageRouting": {
    "BlueCollarClaw": {
      "handler": "./message-handler.js",
      "triggers": [
        "i need",
        "find me",
        "looking for",
        "/post",
        "/offers"
      ]
    }
  }
}
```

### 4. Test It

Send a message via Telegram or WhatsApp:
```
"I need an electrician tomorrow for $90/hr"
```

You should get a confirmation response.

---

## 🤖 Telegram Bot Setup

### 1. Create Bot with @BotFather

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow instructions to name your bot
5. Get your API token: `123456:ABCdef...`

### 2. Configure BlueCollarClaw

Create or edit `.env`:
```
TELEGRAM_BOT_TOKEN=your_token_here
DATABASE_PATH=./BlueCollarClaw.db
CONTRACTOR_ID=your_id
```

### 3. Start Bot Server

```bash
node telegram-bot-server.js
```

### 4. Test Connection

1. Find your bot in Telegram
2. Send `/start`
3. Send your contractor ID
4. Done! You can now post jobs via text

---

## 💬 Natural Language Examples

### Posting Jobs

**Full details:**
```
"I need a plumber tomorrow for $80-100/hr in Austin, TX for rough-in work"
```

**Partial details:**
```
"Find me an electrician ASAP paying $90/hr"
→ Bot asks for location and dates
```

**Very casual:**
```
"Need HVAC help this week"
→ Bot asks follow-up questions
```

**Specific dates:**
```
"Plumber needed 2/20, budget $75-95, Dallas TX"
```

### Commands

**Guided posting:**
```
/post
→ Bot walks you through 5 questions
```

**View your jobs:**
```
/myjobs
```

**Check offers:**
```
/offers
→ Shows all pending offers with quick accept
```

**Get help:**
```
/help
```

---

## 📊 Message Flow

### GC Posts Job (Natural Language)

```
User → "I need a plumber tomorrow for $80-100/hr in Austin, TX"
  ↓
Bot → Parses: trade, location, dates, rate
  ↓
Bot → Confirms details
  ↓
User → "post it"
  ↓
Bot → Creates job request
  ↓
Bot → "✅ Job posted! You'll get offers soon."
```

### Sub Gets Matched

```
Job Request Created
  ↓
Matching Algorithm Runs
  ↓
Sub's Agent Evaluates
  ↓
If Match → Bot sends notification:
  "🔨 New Job Match!
   Plumber needed tomorrow
   $80-100/hr in Austin
   Reply 'send offer' to respond"
```

### GC Receives Offer

```
Sub Sends Offer
  ↓
Bot → "📬 New Offer!
       From: Mike's Plumbing
       Rate: $90/hr
       Rating: 4.8★
       
       Reply 'accept' to book"
  ↓
User → "accept"
  ↓
Bot → Creates booking
  ↓
Bot → Generates contract
  ↓
Bot → "✅ Booked! Check your email for contract."
```

---

## 🎯 What the Parser Understands

### Trades
- plumber, electrician, HVAC, framer, carpenter
- drywall, roofer, painter, mason, welder

### Dates
- "tomorrow" → +1 day
- "ASAP" → +1 day
- "this week" → +3 days
- "next week" → +7 days
- "2/20" → Feb 20
- "2026-02-20" → Full date

### Rates
- "$90/hr" → Range: $80-100
- "$80-100/hr" → Exact range
- "$75-95" → Min-max

### Locations
- "Austin, TX"
- "in Dallas, TX"
- "123 Main St, Austin, TX"

---

## 🔧 Integration Code

### Send Message to BlueCollarClaw

```javascript
const MessageHandler = require('./message-handler');

const handler = new MessageHandler();

// From WhatsApp/Telegram/Dashboard
const contractorId = "contractor_abc123";
const message = "I need a plumber tomorrow";

const response = await handler.handleMessage(
  contractorId,
  message,
  'whatsapp' // or 'telegram'
);

// Send response back to user
console.log(response);
```

### Example Telegram Bot

```javascript
const TelegramBot = require('node-telegram-bot-api');
const MessageHandler = require('./message-handler');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});
const handler = new MessageHandler();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Get contractor ID from user mapping
  const contractorId = getUserContractorId(chatId);
  
  // Handle message
  const response = await handler.handleMessage(
    contractorId,
    text,
    'telegram'
  );
  
  // Send response
  bot.sendMessage(chatId, response);
});
```

---

## ✅ Testing

### Test Parser

```bash
node message-handler.js
```

This runs test messages and shows bot responses.

### Test with Your Bot

1. Send: `"I need a plumber tomorrow for $90/hr"`
2. Expect: Confirmation with details
3. Reply: `"post it"`
4. Expect: `"✅ Job posted!"`

### Check Database

```bash
sqlite3 BlueCollarClaw.db "SELECT * FROM job_requests ORDER BY created_at DESC LIMIT 1"
```

Should show your posted job.

---

## 🚨 Troubleshooting

**Bot doesn't respond:**
- Check token in `.env`
- Verify bot is running: `node telegram-bot-server.js`
- Check logs for errors

**Parser doesn't understand:**
- Be more specific with details
- Use keywords: "need", "find me", "looking for"
- Include trade name

**Job not posting:**
- Reply "post it" or "yes" to confirm
- Check you have all required fields
- Verify contractor ID is correct

---

## 📱 User Experience

### Before (Old Way)
```
1. Open laptop
2. Run: node post-job.js
3. Answer 5 questions
4. Type all details manually
5. Confirm and post
Time: 2-3 minutes
```

### After (New Way)
```
1. Text: "I need a plumber tomorrow for $90/hr"
2. Reply: "post it"
Time: 10 seconds
```

**That's a 10x improvement.**

---

## 🎯 Next Steps

1. **Set up messaging** (WhatsApp or Telegram)
2. **Test natural language posting** 
3. **Try the guided mode** (`/post`)
4. **Get your first offer via text**

Read: `MESSAGING-SETUP.md` for detailed setup instructions.

---

🤝 **BlueCollarClaw — Post Jobs from Your Phone**
