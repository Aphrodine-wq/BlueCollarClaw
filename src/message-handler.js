#!/usr/bin/env node

/**
 * BlueCollarClaw Message Handler
 * 
 * This receives messages from Telegram, Email, or the Web Dashboard and handles:
 * - Natural language job posting
 * - Offer acceptance/decline
 * - Status queries
 *
 * Usage:
 *   node message-handler.js
 */

const Database = require('./database');
const NaturalLanguageParser = require('./message-parser');
const { nanoid } = require('nanoid');
const fs = require('fs');

class MessageHandler {
  constructor() {
    this.db = new Database();
    this.parser = new NaturalLanguageParser();
    this.sessions = new Map(); // Track conversation state
  }

  async handleMessage(contractorId, message, source = 'unknown') {
    console.log(`[${source}] Message from ${contractorId}: ${message}`);

    // Check if this is a command
    if (message.startsWith('/')) {
      return await this.handleCommand(contractorId, message, source);
    }

    // Check if this is a reply to an active session
    const session = this.sessions.get(contractorId);
    if (session) {
      return await this.handleSessionReply(contractorId, message, session, source);
    }

    // Try to parse as natural language job posting
    const parsed = this.parser.parse(message);

    if (parsed.confidence >= 50) {
      // Confident enough to proceed
      const confirmation = this.parser.generateConfirmation(parsed);

      if (confirmation.complete) {
        // Save as draft and ask for confirmation
        this.sessions.set(contractorId, {
          type: 'job_draft',
          data: parsed,
          timestamp: Date.now()
        });

        return confirmation.message;
      } else {
        // Need more info
        this.sessions.set(contractorId, {
          type: 'job_partial',
          data: parsed,
          missing: confirmation.missing,
          timestamp: Date.now()
        });

        return confirmation.message;
      }
    }

    // Didn't understand
    return `I didn't quite catch that. Try:

"I need a plumber tomorrow for $80-100/hr in Austin, TX"

Or type /help for more options.`;
  }

  async handleCommand(contractorId, message, source) {
    const [command, ...args] = message.toLowerCase().split(' ');

    switch (command) {
      case '/start':
        return `👋 Welcome to BlueCollarClaw!

I help you find contractors fast.

Just tell me what you need:
"I need a plumber tomorrow for $80-100/hr"

Or try these commands:
/post - Post a new job
/myjobs - See your active jobs
/help - Get help`;

      case '/help':
        return `🆘 BlueCollarClaw Help

POST A JOB (Natural Language):
Just describe what you need:
• "Find me an electrician ASAP for $90/hr"
• "Need a plumber tomorrow in Austin, TX"
• "I need HVAC help this week, paying $75-95"

COMMANDS:
/post - Start guided job posting
/myjobs - View your active requests
/offers - See offers you've received
/status - Check BlueCollarClaw status

EXAMPLES:
${this.parser.constructor.examples().map(ex => `• ${ex}`).join('\n')}`;

      case '/post':
        this.sessions.set(contractorId, {
          type: 'guided_post',
          step: 1,
          data: {},
          timestamp: Date.now()
        });

        return `Let's post a job! (5 quick questions)

1️⃣ What trade do you need?
(plumber, electrician, HVAC, framer, drywall, roofer, painter)`;

      case '/myjobs':
        return await this.getMyJobs(contractorId);

      case '/offers':
        return await this.getMyOffers(contractorId);

      case '/status':
        return await this.getStatus();

      default:
        return `Unknown command. Type /help for available commands.`;
    }
  }

  async handleSessionReply(contractorId, message, session, source) {
    switch (session.type) {
      case 'job_draft':
        if (message.toLowerCase().includes('post') || message.toLowerCase().includes('yes')) {
          // Post the job
          const requestId = await this.createJobRequest(contractorId, session.data);
          this.sessions.delete(contractorId);

          return `✅ Job posted! (ID: ${requestId})

Your request is now live on BlueCollarClaw.

You'll get notifications when subs send offers.

View offers anytime: /offers`;
        } else if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('no')) {
          this.sessions.delete(contractorId);
          return `Job cancelled. Start over anytime by telling me what you need!`;
        } else {
          // User is giving more details
          const updated = this.parser.parse(message);
          session.data = { ...session.data, ...updated };
          
          const confirmation = this.parser.generateConfirmation(session.data);
          return confirmation.message;
        }

      case 'job_partial':
        // User is filling in missing info
        const updated = this.parser.parse(message);
        session.data = { ...session.data, ...updated };

        const confirmation = this.parser.generateConfirmation(session.data);

        if (confirmation.complete) {
          session.type = 'job_draft';
          return confirmation.message;
        } else {
          return confirmation.message;
        }

      case 'guided_post':
        return await this.handleGuidedPost(contractorId, message, session);

      default:
        this.sessions.delete(contractorId);
        return `Session expired. Start over by telling me what you need!`;
    }
  }

  async handleGuidedPost(contractorId, message, session) {
    const { step, data } = session;

    switch (step) {
      case 1: // Trade
        data.trade = message.trim().toLowerCase();
        session.step = 2;
        return `Got it: ${data.trade}

2️⃣ Where is the job?
(Full address or city, state)`;

      case 2: // Location
        data.location = message.trim();
        session.step = 3;
        return `Location: ${data.location}

3️⃣ When do you need them?
(Tomorrow, ASAP, 2/20, this week, etc.)`;

      case 3: // Dates
        const parsed = this.parser.parse(message);
        if (parsed.startDate) {
          data.startDate = parsed.startDate;
          data.endDate = parsed.endDate;
        } else {
          return `I didn't get that date. Try: tomorrow, ASAP, 2/20, or YYYY-MM-DD`;
        }
        session.step = 4;
        return `Dates: ${data.startDate} to ${data.endDate}

4️⃣ What's your budget per hour?
(Example: $80-100 or just $90)`;

      case 4: // Rate
        const rateMatch = message.match(/\$?(\d+)(?:-\$?(\d+))?/);
        if (rateMatch) {
          if (rateMatch[2]) {
            data.minRate = parseInt(rateMatch[1]);
            data.maxRate = parseInt(rateMatch[2]);
          } else {
            const rate = parseInt(rateMatch[1]);
            data.minRate = rate - 10;
            data.maxRate = rate + 10;
          }
        } else {
          return `I need a number. Try: $90 or $80-100`;
        }
        session.step = 5;
        return `Budget: $${data.minRate}-$${data.maxRate}/hr

5️⃣ Describe the work:
(Be specific to help subs decide)`;

      case 5: // Scope
        data.scope = message.trim();
        
        // Create job
        const requestId = await this.createJobRequest(contractorId, data);
        this.sessions.delete(contractorId);

        return `✅ Job posted! (ID: ${requestId})

📋 Summary:
🔨 ${data.trade}
📍 ${data.location}
📅 ${data.startDate} to ${data.endDate}
💰 $${data.minRate}-$${data.maxRate}/hr

Subs will start sending offers soon.

View offers: /offers`;

      default:
        this.sessions.delete(contractorId);
        return `Something went wrong. Let's start over: /post`;
    }
  }

  async createJobRequest(contractorId, data) {
    const requestId = `req_${nanoid()}`;

    return new Promise((resolve, reject) => {
      this.db.createJobRequest({
        id: requestId,
        requesterId: contractorId,
        trade: data.trade.toLowerCase(),
        location: data.location,
        latitude: null,
        longitude: null,
        startDate: data.startDate,
        endDate: data.endDate,
        minRate: parseFloat(data.minRate),
        maxRate: parseFloat(data.maxRate),
        scope: data.scope || 'As discussed',
        requirements: '',
      }, (err) => {
        if (err) reject(err);
        else resolve(requestId);
      });
    });
  }

  async getMyJobs(contractorId) {
    return new Promise((resolve) => {
      this.db.db.all(
        'SELECT * FROM job_requests WHERE requester_id = ? AND status = "open" ORDER BY created_at DESC LIMIT 5',
        [contractorId],
        (err, jobs) => {
          if (err || !jobs || jobs.length === 0) {
            resolve('No active jobs. Post one by telling me what you need!');
            return;
          }

          const list = jobs.map(j => 
            `📋 ${j.trade} - ${j.location}\n💰 $${j.min_rate}-$${j.max_rate}/hr\n📅 ${j.start_date}`
          ).join('\n\n');

          resolve(`Your active jobs:\n\n${list}\n\nView offers: /offers`);
        }
      );
    });
  }

  async getMyOffers(contractorId) {
    return new Promise((resolve) => {
      this.db.db.all(
        `SELECT o.*, j.trade, j.location, c.name 
         FROM offers o 
         JOIN job_requests j ON o.request_id = j.id 
         JOIN contractors c ON o.contractor_id = c.id
         WHERE j.requester_id = ? AND o.status = "pending"
         ORDER BY o.created_at DESC LIMIT 5`,
        [contractorId],
        (err, offers) => {
          if (err || !offers || offers.length === 0) {
            resolve('No offers yet. Check back soon!');
            return;
          }

          const list = offers.map(o => 
            `📬 ${o.name}\n🔨 ${o.trade} in ${o.location}\n💰 $${o.rate}/hr\n\nReply "accept ${o.id.substr(0, 8)}" to book`
          ).join('\n\n');

          resolve(`You have ${offers.length} offers:\n\n${list}`);
        }
      );
    });
  }

  async getStatus() {
    return new Promise((resolve) => {
      this.db.db.get('SELECT COUNT(*) as count FROM contractors', (err, result) => {
        const contractors = result?.count || 0;
        
        this.db.db.get('SELECT COUNT(*) as count FROM bookings', (err, result) => {
          const bookings = result?.count || 0;
          
          resolve(`🤝 BlueCollarClaw Status

👥 ${contractors} contractors
📦 ${bookings} bookings completed
🟢 All systems operational

Dashboard: http://localhost:3000`);
        });
      });
    });
  }
}

// Export for use in Telegram bot, API routes, etc.
module.exports = MessageHandler;

// Run standalone for testing
if (require.main === module) {
  const handler = new MessageHandler();

  // Test examples
  const testMessages = [
    "I need a plumber tomorrow for $80-100/hr in Austin, TX",
    "/start",
    "/help",
    "Find me an electrician ASAP paying $90/hr",
  ];

  console.log('=== BlueCollarClaw Message Handler Test ===\n');

  async function runTests() {
    for (const msg of testMessages) {
      const response = await handler.handleMessage('test_contractor', msg, 'test');
      console.log(`\nUser: ${msg}`);
      console.log(`Bot: ${response}\n`);
      console.log('---');
    }
  }

  runTests();
}
