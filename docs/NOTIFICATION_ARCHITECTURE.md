# Unified Notification System Architecture

## Overview
Minimal, zero-overhead notification architecture for BlueCollarClaw supporting 6 channels: Email, Telegram, WhatsApp, SMS, Discord, and Slack.

## Core Principle
**Router Pattern**: Dispatcher receives notification → looks up user preference → routes to channel service. Each channel is independently usable.

---

## 1. Database Schema Additions

```sql
-- ============================================
-- User Channel Preferences (one row per user)
-- ============================================
CREATE TABLE user_notification_preferences (
  user_id TEXT PRIMARY KEY,
  preferred_channel TEXT DEFAULT 'email', -- email|telegram|whatsapp|sms|discord|slack
  channels_enabled TEXT DEFAULT 'email', -- comma-separated list
  notify_job_match BOOLEAN DEFAULT 1,
  notify_new_offer BOOLEAN DEFAULT 1,
  notify_offer_accepted BOOLEAN DEFAULT 1,
  notify_booking_confirmed BOOLEAN DEFAULT 1,
  notify_daily_digest BOOLEAN DEFAULT 0,
  quiet_hours_start INTEGER, -- 0-23, NULL = disabled
  quiet_hours_end INTEGER,   -- 0-23, NULL = disabled
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES contractors(id)
);

-- ============================================
-- Channel Identities (one per channel type per user)
-- ============================================

-- WhatsApp Business API
CREATE TABLE whatsapp_users (
  phone_number TEXT PRIMARY KEY, -- E.164 format: +1234567890
  user_id TEXT NOT NULL,
  waba_id TEXT, -- WhatsApp Business Account ID
  phone_number_id TEXT, -- WhatsApp Phone Number ID
  status TEXT DEFAULT 'pending', -- pending|active|failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES contractors(id)
);

-- SMS via Twilio
CREATE TABLE sms_users (
  phone_number TEXT PRIMARY KEY, -- E.164 format
  user_id TEXT NOT NULL,
  verified BOOLEAN DEFAULT 0,
  verification_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES contractors(id)
);

-- Discord Bot
CREATE TABLE discord_users (
  discord_id TEXT PRIMARY KEY, -- Discord user snowflake ID
  user_id TEXT NOT NULL,
  username TEXT,
  dm_channel_id TEXT, -- Discord DM channel ID
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES contractors(id)
);

-- Slack Webhooks (per-user or per-workspace)
CREATE TABLE slack_webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  channel_name TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES contractors(id)
);

-- ============================================
-- Unified Notification Log
-- ============================================
CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- email|telegram|whatsapp|sms|discord|slack
  notification_type TEXT NOT NULL, -- job_match|new_offer|offer_accepted|booking_confirmed|digest|system
  recipient_address TEXT NOT NULL, -- email|phone|user_id depending on channel
  subject TEXT,
  content_preview TEXT, -- first 100 chars
  status TEXT DEFAULT 'pending', -- pending|sent|delivered|failed
  error_message TEXT,
  sent_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES contractors(id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_created ON notification_log(created_at);
CREATE INDEX idx_whatsapp_user_id ON whatsapp_users(user_id);
CREATE INDEX idx_sms_user_id ON sms_users(user_id);
CREATE INDEX idx_discord_user_id ON discord_users(user_id);
```

---

## 2. Interface/Class Design

### Base Channel Interface
```javascript
// All channel services implement this interface
class BaseChannel {
  constructor(config) {}
  
  // Core method: send notification
  // Returns: { success: boolean, messageId?: string, error?: string }
  async send(to, message, options = {}) {}
  
  // Validate recipient format
  validateRecipient(recipient) {}
  
  // Check if channel is properly configured
  isConfigured() {}
}
```

### NotificationDispatcher (Unified Router)
```javascript
class NotificationDispatcher {
  constructor(database) {
    this.db = database;
    this.channels = new Map();
    
    // Register channels (only if configured)
    this.register('email', new EmailChannel(config.email));
    this.register('telegram', new TelegramChannel(config.telegram));
    this.register('whatsapp', new WhatsAppChannel(config.whatsapp));
    this.register('sms', new SmsChannel(config.sms));
    this.register('discord', new DiscordChannel(config.discord));
    this.register('slack', new SlackChannel(config.slack));
  }
  
  // Main API: Send notification to user via preferred channel
  async send(userId, notificationType, message, options = {}) {
    // 1. Get user preferences
    // 2. Check quiet hours
    // 3. Route to appropriate channel
    // 4. Log to notification_log
  }
  
  // Send to specific channel (bypass preference)
  async sendToChannel(channel, userId, message, options = {}) {}
  
  // Broadcast to multiple users
  async broadcast(userIds, notificationType, messageFactory) {}
  
  // Register a channel
  register(name, channelInstance) {
    if (channelInstance.isConfigured()) {
      this.channels.set(name, channelInstance);
    }
  }
}
```

### Channel Implementations
```javascript
// Email Channel (refactored from email-service.js)
class EmailChannel extends BaseChannel {
  async send(to, message, options) {
    // message = { subject, html, text }
    return this.transporter.sendMail({...});
  }
}

// Telegram Channel (wrapper around telegram-bot.js)
class TelegramChannel extends BaseChannel {
  async send(to, message, options) {
    // to = telegram_id
    // message = { text, parse_mode = 'Markdown' }
    return this.bot.sendMessage(to, message.text, options);
  }
}

// WhatsApp Business API Channel
class WhatsAppChannel extends BaseChannel {
  async send(to, message, options) {
    // Uses Meta WhatsApp Business API
    // POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
  }
}

// SMS Channel (Twilio)
class SmsChannel extends BaseChannel {
  async send(to, message, options) {
    // to = E.164 phone number
    // message = { body }
    return this.twilio.messages.create({ to, body: message.body });
  }
}

// Discord Channel
class DiscordChannel extends BaseChannel {
  async send(to, message, options) {
    // to = discord_id or dm_channel_id
    // Uses discord.js
  }
}

// Slack Channel
class SlackChannel extends BaseChannel {
  async send(webhookUrl, message, options) {
    // POST to webhook URL
    // message = { text, blocks }
  }
}
```

### Message Templates (Unified)
```javascript
// Each notification type has a template for all channels
const templates = {
  newJobMatch: {
    email: (data) => ({ subject: '...', html: '...' }),
    telegram: (data) => ({ text: '🔨 *New Job Match*\n...' }),
    whatsapp: (data) => ({ body: '🔨 New Job Match\n...' }),
    sms: (data) => ({ body: `BlueCollarClaw: New ${data.trade} job in ${data.location}. Reply OFFER to bid.` }),
    discord: (data) => ({ embeds: [...] }),
    slack: (data) => ({ text: '...', blocks: [...] })
  },
  newOffer: { ... },
  offerAccepted: { ... },
  bookingConfirmed: { ... }
};
```

---

## 3. File Structure

```
src/
├── notifications/
│   ├── index.js                 # Main export: NotificationDispatcher
│   ├── dispatcher.js            # Core routing logic
│   ├── templates.js             # Message templates per channel
│   └── channels/
│       ├── base.js              # BaseChannel interface
│       ├── email.js             # Email channel (nodemailer)
│       ├── telegram.js          # Telegram channel (node-telegram-bot-api)
│       ├── whatsapp.js          # WhatsApp Business API
│       ├── sms.js               # SMS via Twilio
│       ├── discord.js           # Discord bot (discord.js)
│       └── slack.js             # Slack webhooks
├── database.js                  # Add schema in initSchema()
├── config.js                    # Add notification configs
└── telegram-bot.js              # Refactor to use TelegramChannel
```

---

## 4. Environment Variables

```bash
# ============================================
# WhatsApp Business API (Meta)
# ============================================
WHATSAPP_ENABLED=true
WHATSAPP_API_VERSION=v18.0
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_verify_token_for_webhooks

# ============================================
# SMS via Twilio
# ============================================
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# Discord Bot
# ============================================
DISCORD_ENABLED=true
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_APPLICATION_ID=your_app_id
DISCORD_WEBHOOK_URL=optional_for_server_notifications

# ============================================
# Slack Webhooks
# ============================================
SLACK_ENABLED=true
SLACK_DEFAULT_WEBHOOK=https://hooks.slack.com/services/...
SLACK_BOT_TOKEN=xoxb-your-bot-token  # For DM sending

# ============================================
# Notification Dispatcher Settings
# ============================================
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_FALLBACK_ENABLED=true  # Fallback to email if primary fails
NOTIFICATION_RATE_LIMIT_PER_MINUTE=60
```

---

## 5. Usage Examples

### Basic Usage
```javascript
const NotificationDispatcher = require('./src/notifications');
const db = new Database();

const dispatcher = new NotificationDispatcher(db);

// Send to user's preferred channel
await dispatcher.send(userId, 'newJobMatch', jobData);

// Send to specific channel
await dispatcher.sendToChannel('telegram', userId, message);

// Broadcast to multiple users
await dispatcher.broadcast(contractorIds, 'newJobMatch', (userId) => {
  return personalizeMessage(userId, jobData);
});
```

### Integration with Existing Code
```javascript
// In telegram-bot.js - replace inline notifications:
// OLD:
await bot.sendMessage(chatId, message);

// NEW:
const dispatcher = new NotificationDispatcher(db);
await dispatcher.sendToChannel('telegram', contractorId, { text: message });

// In email-service.js - replace direct sends:
// OLD:
await this.sendEmail(userEmail, subject, html);

// NEW:
await dispatcher.sendToChannel('email', userId, { subject, html, text });
```

---

## 6. Migration Path

1. **Phase 1**: Create notification system, keep existing code working
   - Create `src/notifications/` directory
   - Implement base classes
   - Refactor email-service.js → notifications/channels/email.js
   - Update imports, no behavior change

2. **Phase 2**: Add database tables
   - Add schema to `database.js`
   - Run migration (auto-creates tables on startup)

3. **Phase 3**: Implement new channels
   - WhatsApp (highest priority)
   - SMS
   - Discord
   - Slack

4. **Phase 4**: Switch to dispatcher
   - Update telegram-bot.js to use dispatcher
   - Update any direct email sends
   - Add preference UI to dashboard

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite for preferences | Zero infra, single source of truth with user data |
| `notification_log` table | Audit trail, debugging, retry logic, analytics |
| Channel isolation | Each channel can fail independently, easy to test |
| Template per channel | Each channel has optimal message format |
| No message queue | Zero overhead - direct send with simple retry |
| Fallback to email | Email is most reliable, always available |

---

## 8. Security Considerations

1. **Webhook verification**: Verify WhatsApp/Discord webhook signatures
2. **Phone validation**: E.164 format validation for WhatsApp/SMS
3. **Rate limiting**: Per-channel rate limits (configurable)
4. **Quiet hours**: Respect user timezone preferences
5. **PII handling**: Only store necessary identifiers, not message content
