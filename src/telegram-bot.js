#!/usr/bin/env node

/**
 * BlueCollarClaw Telegram Bot - Production Version
 * Unified with MessageHandler and main job pipeline
 * 
 * Usage: TELEGRAM_BOT_TOKEN=your_token npm run telegram
 */

const TelegramBot = require('node-telegram-bot-api');
const Database = require('./database');
const MessageHandler = require('./message-handler');
const { nanoid } = require('nanoid');
const config = require('./config');

// Initialize Telegram bot
const token = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken;
if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not set!');
  console.error('Get your token from @BotFather on Telegram');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const db = new Database();
const messageHandler = new MessageHandler();

// Map Telegram users to contractors
const userContractorMap = new Map();

// Bot commands
const COMMANDS = {
  start: '/start',
  help: '/help',
  post: '/post',
  myjobs: '/myjobs',
  offers: '/offers',
  accept: '/accept',
  status: '/status',
  profile: '/profile'
};

/**
 * Get or create contractor for Telegram user
 */
async function getOrCreateContractor(user) {
  const telegramId = user.id;
  
  return new Promise((resolve, reject) => {
    // Check if user exists
    db.db.get(
      'SELECT c.* FROM contractors c JOIN telegram_users tu ON c.telegram_id = tu.telegram_id WHERE tu.telegram_id = ?',
      [telegramId],
      async (err, contractor) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (contractor) {
          resolve(contractor);
          return;
        }
        
        // Create new contractor
        const crypto = require('crypto');
        const newContractor = {
          id: `cont_${nanoid(8)}`,
          name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
          telegram_id: telegramId,
          public_key: crypto.randomBytes(32).toString('hex'),
          private_key: crypto.randomBytes(32).toString('hex')
        };
        
        // Insert contractor
        db.db.run(
          'INSERT INTO contractors (id, name, public_key, private_key) VALUES (?, ?, ?, ?)',
          [newContractor.id, newContractor.name, newContractor.public_key, newContractor.private_key],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Save Telegram user link
            db.db.run(
              `INSERT OR REPLACE INTO telegram_users (telegram_id, contractor_id, username, first_name, last_name) 
               VALUES (?, ?, ?, ?, ?)`,
              [telegramId, newContractor.id, user.username || null, user.first_name, user.last_name || null],
              (err) => {
                if (err) reject(err);
                else resolve(newContractor);
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Create a job request from parsed data
 */
async function createJobRequest(contractorId, data) {
  const requestId = `req_${nanoid(8)}`;
  
  return new Promise((resolve, reject) => {
    db.createJobRequest({
      id: requestId,
      requesterId: contractorId,
      trade: data.trade.toLowerCase(),
      location: data.location,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      startDate: data.startDate,
      endDate: data.endDate,
      minRate: parseFloat(data.minRate),
      maxRate: parseFloat(data.maxRate),
      scope: data.scope || 'As discussed',
      requirements: data.requirements || ''
    }, (err) => {
      if (err) reject(err);
      else resolve(requestId);
    });
  });
}

/**
 * Find matching contractors for a job
 */
async function findMatches(jobRequest) {
  return new Promise((resolve, reject) => {
    // Simple matching based on trade and location
    db.db.all(
      `SELECT DISTINCT c.* FROM contractors c
       JOIN contractor_trades ct ON c.id = ct.contractor_id
       WHERE ct.trade = ? AND c.id != ?`,
      [jobRequest.trade, jobRequest.requester_id],
      (err, contractors) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Score and rank matches
        const matches = contractors.map(contractor => {
          let score = 50; // Base score
          
          // Trade match bonus
          score += 30;
          
          // Check rate compatibility
          if (contractor.min_rate && contractor.min_rate <= jobRequest.max_rate) {
            score += 20;
          }
          
          return {
            ...contractor,
            matchScore: score
          };
        }).sort((a, b) => b.matchScore - a.matchScore);
        
        resolve(matches.slice(0, 5)); // Top 5 matches
      }
    );
  });
}

/**
 * Notify contractors about a new job
 */
async function notifyMatches(matches, jobRequest, bot) {
  for (const match of matches) {
    try {
      // Get telegram ID for contractor
      const telegramUser = await new Promise((resolve) => {
        db.db.get(
          'SELECT telegram_id FROM telegram_users WHERE contractor_id = ?',
          [match.id],
          (err, row) => resolve(row)
        );
      });
      
      if (telegramUser && telegramUser.telegram_id) {
        const message = `🔨 **New Job Match!**\n\n` +
          `Trade: ${jobRequest.trade}\n` +
          `Location: ${jobRequest.location}\n` +
          `Dates: ${jobRequest.start_date} to ${jobRequest.end_date}\n` +
          `Budget: $${jobRequest.min_rate}-$${jobRequest.max_rate}/hr\n` +
          `Scope: ${jobRequest.scope}\n\n` +
          `Match Score: ${match.matchScore}/100\n\n` +
          `Reply with your rate to make an offer!`;
        
        await bot.sendMessage(telegramUser.telegram_id, message, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error(`Failed to notify contractor ${match.id}:`, error);
    }
  }
}

// Handle /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  
  try {
    const contractor = await getOrCreateContractor(user);
    
    const welcomeMessage = `👋 Welcome to BlueCollarClaw, ${contractor.name}!

I help you find contractors and jobs fast.

**For Homeowners/GCs:**
Just tell me what you need:
• "I need a plumber tomorrow for $80-100/hr"
• "Electrician needed in Austin, budget $90/hr"

**For Contractors:**
Browse jobs with /myjobs and reply with your rate to make offers.

**Commands:**
/post - Post a new job
/myjobs - See active jobs
/offers - View your offers
/status - System status
/help - Detailed help`;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    console.log(`✅ New user: ${contractor.name} (${contractor.id})`);
    
  } catch (error) {
    console.error('Error in /start:', error);
    await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

// Handle /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `🔧 **BlueCollarClaw Help**

**POST A JOB (Natural Language):**
Just describe what you need:
• "Find me an electrician ASAP for $90/hr"
• "Need a plumber tomorrow in Austin, TX"
• "I need HVAC help this week, paying $75-95"

**COMMANDS:**
/post - Guided job posting wizard
/myjobs - View your active requests
/offers - See offers you've received or made
/accept [offer-id] - Accept an offer
/status - Check BlueCollarClaw status
/profile - View your profile

**MAKING OFFERS:**
When you see a job you like, reply with your hourly rate:
"I can do it for $85/hr"

**ACCEPTING OFFERS:**
When you receive an offer, reply:
/accept [offer-id]

**EXAMPLES:**
• "I need a plumber to fix my kitchen sink"
• "Electrician needed in Dallas for outlet installation, budget $150"
• "Urgent: Need a handyman for general repairs tomorrow"`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Handle /post - Guided job posting
bot.onText(/\/post/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Start conversation session
  messageHandler.sessions.set(chatId, {
    type: 'guided_post',
    step: 1,
    data: {},
    timestamp: Date.now()
  });
  
  await bot.sendMessage(chatId, `Let's post a job! (5 quick questions)

1️⃣ What trade do you need?
(plumber, electrician, HVAC, framer, drywall, roofer, painter)`);
});

// Handle /myjobs
bot.onText(/\/myjobs/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const contractor = await getOrCreateContractor(msg.from);
    const response = await messageHandler.getMyJobs(contractor.id);
    await bot.sendMessage(chatId, response);
  } catch (error) {
    console.error('Error in /myjobs:', error);
    await bot.sendMessage(chatId, 'Error fetching your jobs. Please try again.');
  }
});

// Handle /offers
bot.onText(/\/offers/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const contractor = await getOrCreateContractor(msg.from);
    
    // Get offers received (for GCs/homeowners)
    const receivedOffers = await new Promise((resolve) => {
      db.db.all(
        `SELECT o.*, j.trade, j.location, c.name as contractor_name,
                j.requester_id, j.id as job_id
         FROM offers o 
         JOIN job_requests j ON o.request_id = j.id 
         JOIN contractors c ON o.contractor_id = c.id
         WHERE j.requester_id = ? AND o.status = "pending"
         ORDER BY o.created_at DESC LIMIT 10`,
        [contractor.id],
        (err, rows) => resolve(rows || [])
      );
    });
    
    // Get offers made (for contractors)
    const sentOffers = await new Promise((resolve) => {
      db.db.all(
        `SELECT o.*, j.trade, j.location, j.requester_id
         FROM offers o 
         JOIN job_requests j ON o.request_id = j.id 
         WHERE o.contractor_id = ?
         ORDER BY o.created_at DESC LIMIT 10`,
        [contractor.id],
        (err, rows) => resolve(rows || [])
      );
    });
    
    let message = '';
    
    if (receivedOffers.length > 0) {
      message += `📥 **Offers Received (${receivedOffers.length}):**\n\n`;
      receivedOffers.forEach(o => {
        message += `🔨 ${o.trade} in ${o.location}\n`;
        message += `   From: ${o.contractor_name}\n`;
        message += `   Rate: $${o.rate}/hr\n`;
        message += `   Reply: /accept ${o.id.substr(0, 8)}\n\n`;
      });
    }
    
    if (sentOffers.length > 0) {
      message += `📤 **Your Offers (${sentOffers.length}):**\n\n`;
      sentOffers.forEach(o => {
        message += `🔨 ${o.trade} in ${o.location}\n`;
        message += `   Your rate: $${o.rate}/hr\n`;
        message += `   Status: ${o.status}\n\n`;
      });
    }
    
    if (!message) {
      message = 'No offers yet. Post a job to receive offers, or browse available jobs!';
    }
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in /offers:', error);
    await bot.sendMessage(chatId, 'Error fetching offers. Please try again.');
  }
});

// Handle /accept
bot.onText(/\/accept (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const offerShortId = match[1];
  
  try {
    const contractor = await getOrCreateContractor(msg.from);
    
    // Find offer by partial ID
    const offer = await new Promise((resolve) => {
      db.db.get(
        `SELECT o.*, j.trade, j.location, j.start_date, j.end_date, 
                j.scope, j.requester_id as gc_id, c.name as sub_name
         FROM offers o
         JOIN job_requests j ON o.request_id = j.id
         JOIN contractors c ON o.contractor_id = c.id
         WHERE o.id LIKE ? AND j.requester_id = ? AND o.status = 'pending'`,
        [`${offerShortId}%`, contractor.id],
        (err, row) => resolve(row)
      );
    });
    
    if (!offer) {
      await bot.sendMessage(chatId, 'Offer not found or already processed. Check /offers for available offers.');
      return;
    }
    
    // Create booking
    const bookingId = `book_${nanoid(8)}`;
    const contractUrl = `/contracts/contract_${bookingId}.pdf`;
    
    await new Promise((resolve, reject) => {
      db.createBooking({
        id: bookingId,
        requestId: offer.request_id,
        offerId: offer.id,
        gcId: offer.gc_id,
        subId: offer.contractor_id,
        trade: offer.trade,
        location: offer.location,
        startDate: offer.start_date,
        endDate: offer.end_date,
        rate: offer.rate,
        scope: offer.scope || 'As discussed',
        contractUrl: contractUrl,
        calendarEventId: null
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Update offer status
    await new Promise((resolve, reject) => {
      db.updateOfferStatus(offer.id, 'accepted', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Update job request status
    await new Promise((resolve, reject) => {
      db.db.run(
        'UPDATE job_requests SET status = ? WHERE id = ?',
        ['filled', offer.request_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // Generate contract
    const ContractGenerator = require('./contracts');
    const contractGen = new ContractGenerator();
    
    const gcInfo = { id: offer.gc_id, name: contractor.name };
    const subInfo = { id: offer.contractor_id, name: offer.sub_name };
    const booking = {
      id: bookingId,
      trade: offer.trade,
      location: offer.location,
      startDate: offer.start_date,
      endDate: offer.end_date,
      rate: offer.rate,
      scope: offer.scope
    };
    
    const contractPath = await contractGen.generateSubcontractorAgreement(booking, gcInfo, subInfo);
    
    // Notify both parties
    await bot.sendMessage(chatId, 
      `✅ **Booking Confirmed!**\n\n` +
      `📋 Booking ID: ${bookingId}\n` +
      `🔨 ${offer.trade}\n` +
      `📍 ${offer.location}\n` +
      `📅 ${offer.start_date} to ${offer.end_date}\n` +
      `💰 $${offer.rate}/hr\n\n` +
      `Contract generated and ready for download.`,
      { parse_mode: 'Markdown' }
    );
    
    // Notify subcontractor
    const subTelegram = await new Promise((resolve) => {
      db.db.get(
        'SELECT telegram_id FROM telegram_users WHERE contractor_id = ?',
        [offer.contractor_id],
        (err, row) => resolve(row)
      );
    });
    
    if (subTelegram) {
      await bot.sendMessage(subTelegram.telegram_id,
        `🎉 **Your Offer Was Accepted!**\n\n` +
        `📋 Booking ID: ${bookingId}\n` +
        `🔨 ${offer.trade} at ${offer.location}\n` +
        `📅 ${offer.start_date} to ${offer.end_date}\n` +
        `💰 $${offer.rate}/hr\n\n` +
        `Check your dashboard for details.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    console.log(`✅ Booking created: ${bookingId}`);
    
  } catch (error) {
    console.error('Error in /accept:', error);
    await bot.sendMessage(chatId, 'Error accepting offer. Please try again.');
  }
});

// Handle /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const status = await messageHandler.getStatus();
    await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /status:', error);
    await bot.sendMessage(chatId, 'Error checking status. Please try again.');
  }
});

// Handle /profile
bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const contractor = await getOrCreateContractor(msg.from);
    
    // Get trades
    const trades = await new Promise((resolve) => {
      db.getContractorTrades(contractor.id, (err, rows) => {
        resolve(rows || []);
      });
    });
    
    // Get reputation
    const reputation = await new Promise((resolve) => {
      db.getContractorReputation(contractor.id, (err, row) => {
        resolve(row || { total_ratings: 0, average_score: 0 });
      });
    });
    
    const message = `👤 **Your Profile**\n\n` +
      `Name: ${contractor.name}\n` +
      `ID: ${contractor.id}\n` +
      `Trades: ${trades.map(t => t.trade).join(', ') || 'None set'}\n` +
      `Rating: ${reputation.average_score ? reputation.average_score.toFixed(1) : 'N/A'} (${reputation.total_ratings} reviews)\n\n` +
      `To update your trades, visit the dashboard.`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in /profile:', error);
    await bot.sendMessage(chatId, 'Error loading profile. Please try again.');
  }
});

// Handle natural language messages
bot.on('message', async (msg) => {
  // Skip commands
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    const contractor = await getOrCreateContractor(msg.from);
    
    // Check for active session
    const session = messageHandler.sessions.get(chatId);
    if (session) {
      const response = await messageHandler.handleSessionReply(contractor.id, text, session, 'telegram');
      await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      
      // If job was posted, find matches
      if (response.includes('Job posted!') || response.includes('✅ Job posted')) {
        // Extract request ID from response
        const match = response.match(/ID: (req_[a-zA-Z0-9]+)/);
        if (match) {
          const requestId = match[1];
          
          // Get the job request
          const jobRequest = await new Promise((resolve) => {
            db.getJobRequest(requestId, (err, row) => resolve(row));
          });
          
          if (jobRequest) {
            // Find and notify matches
            const matches = await findMatches(jobRequest);
            if (matches.length > 0) {
              await notifyMatches(matches, jobRequest, bot);
              await bot.sendMessage(chatId, 
                `📢 Notified ${matches.length} matching contractors!\n` +
                `You'll receive offers soon.`
              );
            }
          }
        }
      }
      return;
    }
    
    // Try to parse as rate offer for existing job
    const rateMatch = text.match(/\$?(\d+)\/?hr?/i);
    if (rateMatch) {
      // Check if user is responding to a job
      const recentJobs = await new Promise((resolve) => {
        db.db.all(
          `SELECT * FROM job_requests 
           WHERE status = 'open' 
           ORDER BY created_at DESC LIMIT 5`,
          [],
          (err, rows) => resolve(rows || [])
        );
      });
      
      if (recentJobs.length > 0) {
        // Create an offer for the most recent job
        const job = recentJobs[0];
        const rate = parseInt(rateMatch[1]);
        
        const offerId = `off_${nanoid(8)}`;
        await new Promise((resolve, reject) => {
          db.createOffer({
            id: offerId,
            requestId: job.id,
            contractorId: contractor.id,
            rate: rate,
            startDate: job.start_date,
            endDate: job.end_date,
            message: text,
            round: 1
          }, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Notify job poster
        const gcTelegram = await new Promise((resolve) => {
          db.db.get(
            `SELECT tu.telegram_id 
             FROM telegram_users tu
             JOIN job_requests j ON j.requester_id = tu.contractor_id
             WHERE j.id = ?`,
            [job.id],
            (err, row) => resolve(row)
          );
        });
        
        if (gcTelegram) {
          await bot.sendMessage(gcTelegram.telegram_id,
            `📬 **New Offer Received!**\n\n` +
            `🔨 ${job.trade} in ${job.location}\n` +
            `👤 From: ${contractor.name}\n` +
            `💰 Rate: $${rate}/hr\n\n` +
            `Reply /offers to see all offers`,
            { parse_mode: 'Markdown' }
          );
        }
        
        await bot.sendMessage(chatId, 
          `✅ Offer sent! $${rate}/hr for ${job.trade} job.\n` +
          `You'll be notified if accepted.`
        );
        return;
      }
    }
    
    // Handle as natural language job posting
    const response = await messageHandler.handleMessage(contractor.id, text, 'telegram');
    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, 'Sorry, there was an error processing your message. Please try again.');
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

// Update database schema for Telegram integration
db.db.run(`CREATE TABLE IF NOT EXISTS telegram_users (
  telegram_id INTEGER PRIMARY KEY,
  contractor_id TEXT,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contractor_id) REFERENCES contractors(id)
)`);

console.log('🤖 BlueCollarClaw Telegram Bot started (Production Mode)');
console.log('📱 Waiting for messages...');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  db.close();
  process.exit(0);
});
