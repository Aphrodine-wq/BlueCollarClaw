#!/usr/bin/env node

/**
 * BlueCollarClaw Telegram Bot - Natural Language Job Posting
 * Parses natural language job descriptions and creates BlueCollarClaw job postings
 * 
 * Usage: TELEGRAM_BOT_TOKEN=your_token npm run telegram
 */

const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Load configuration
const config = require('./config');

// Initialize Telegram bot
const token = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken;
if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not set!');
  console.error('Get your token from @BotFather on Telegram');
  console.error('Then run: TELEGRAM_BOT_TOKEN=your_token npm run telegram');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Initialize SQLite database (same as main BlueCollarClaw)
const dbPath = path.join(__dirname, '../bluecollar-claw.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to BlueCollarClaw database');
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS telegram_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER,
    category TEXT,
    description TEXT,
    location TEXT,
    budget INTEGER,
    is_urgent BOOLEAN,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS telegram_users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Training data for natural language processing
// Order matters - more specific categories should come first
const jobCategories = [
  { keywords: ['plumber', 'plumbing', 'pipe', 'leak', 'toilet', 'sink', 'drain'], category: 'plumbing' },
  { keywords: ['electrician', 'electrical', 'wire', 'outlet', 'wiring', 'circuit'], category: 'electrical' },
  { keywords: ['painter', 'painting', 'paint', 'wall', 'ceiling'], category: 'painting' },
  { keywords: ['carpenter', 'carpentry', 'wood', 'furniture', 'cabinet'], category: 'carpentry' },
  { keywords: ['landscaper', 'landscaping', 'garden', 'lawn', 'yard'], category: 'landscaping' },
  { keywords: ['cleaner', 'cleaning', 'maid', 'housekeeping'], category: 'cleaning' },
  { keywords: ['handyman', 'repair', 'maintenance'], category: 'handyman' },
  { keywords: ['contractor', 'construction', 'build', 'renovation'], category: 'general-contracting' },
];

/**
 * Parse natural language job description
 * @param {string} text - User's natural language message
 * @returns {object} Parsed job details
 */
function parseJobDescription(text) {
  const lowerText = text.toLowerCase();

  // Extract job category - check in order of specificity
  let category = 'general-contracting';
  let bestMatch = null;
  let bestScore = 0;

  for (const jobCategory of jobCategories) {
    let score = 0;
    for (const keyword of jobCategory.keywords) {
      // Give higher score to longer, more specific keywords
      if (lowerText.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = jobCategory.category;
    }
  }

  if (bestMatch) {
    category = bestMatch;
  }

  // Extract location (basic pattern matching)
  let location = null;
  const locationPatterns = [
    /in ([a-zA-Z0-9\s,]+)/i,
    /at ([a-zA-Z0-9\s,]+)/i,
    /around ([a-zA-Z0-9\s,]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      break;
    }
  }

  // Extract urgency
  const urgencyKeywords = ['urgent', 'emergency', 'asap', 'today', 'tomorrow'];
  let isUrgent = false;
  for (const keyword of urgencyKeywords) {
    if (lowerText.includes(keyword)) {
      isUrgent = true;
      break;
    }
  }

  // Extract budget
  let budget = null;
  const budgetPatterns = [
    /\$([0-9,]+)/g,
    /budget of ([0-9,]+)/i,
    /cost around ([0-9,]+)/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      budget = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  return {
    category,
    location,
    isUrgent,
    budget,
    description: text,
    naturalLanguage: true,
  };
}

/**
 * Create job posting in BlueCollarClaw
 * @param {object} jobData - Parsed job data
 * @param {object} user - Telegram user object
 * @returns {Promise<object>} Created job posting
 */
function createJobPosting(jobData, user) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO telegram_jobs 
      (telegram_user_id, category, description, location, budget, is_urgent, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
      user.id,
      jobData.category,
      jobData.description,
      jobData.location,
      jobData.budget,
      jobData.isUrgent ? 1 : 0,
      'active'
    ], function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        id: this.lastID,
        ...jobData,
        telegram_user_id: user.id
      });
    });
  });
}

/**
 * Save or update Telegram user
 * @param {object} user - Telegram user object
 */
function saveUser(user) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR REPLACE INTO telegram_users 
      (telegram_id, username, first_name, last_name) 
      VALUES (?, ?, ?, ?)`;

    db.run(sql, [
      user.id,
      user.username || null,
      user.first_name || null,
      user.last_name || null
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Handle incoming messages
 * @param {object} msg - Telegram message object
 */
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const user = msg.from;
  const text = msg.text;

  // Save user to database
  await saveUser(user);

  if (!text || text.trim().length === 0) {
    await bot.sendMessage(chatId, 'Please send a job description.');
    return;
  }

  // Skip commands
  if (text.startsWith('/')) return;

  try {
    // Show typing indicator
    await bot.sendChatAction(chatId, 'typing');

    // Parse the natural language
    const jobData = parseJobDescription(text);

    // Create the job posting
    const job = await createJobPosting(jobData, user);

    // Send confirmation
    const message = `🎯 Job posted successfully!\n\n` +
      `📋 Job ID: #${job.id}\n` +
      `🏠 Category: ${job.category}\n` +
      `📍 Location: ${job.location || 'Not specified'}\n` +
      `💰 Budget: ${job.budget ? `$${job.budget}` : 'Not specified'}\n` +
      `🚨 Urgent: ${job.is_urgent ? 'Yes' : 'No'}\n\n` +
      `📞 We'll notify you when we find matching contractors!`;

    await bot.sendMessage(chatId, message);

    console.log(`✅ Job #${job.id} created by user ${user.id}: ${job.category}`);

  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, 'Sorry, there was an error processing your job. Please try again.');
  }
}

// Handle bot commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  await saveUser(user);

  const welcomeMessage = `👋 Welcome to BlueCollarClaw!\n\n` +
    `I help you find contractors by simply describing what you need.\n\n` +
    `📝 Just send me a message like:\n` +
    `• "I need a plumber to fix my bathroom sink"\n` +
    `• "Looking for an electrician in Austin, budget $200"\n` +
    `• "Need a painter ASAP for my living room"\n\n` +
    `🤖 I'll automatically find matching contractors and notify you!\n\n` +
    `Send /help for more info.`;

  await bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `🔧 **BlueCollarClaw Bot Help**\n\n` +
    `📝 **How to post a job:**\n` +
    `Just describe what you need in natural language. Include:\n` +
    `• What trade (plumber, electrician, painter, etc.)\n` +
    `• Location (optional: "in Austin")\n` +
    `• Budget (optional: "budget $200")\n` +
    `• Urgency (optional: "urgent", "ASAP")\n\n` +
    `💡 **Examples:**\n` +
    `• "I need a plumber to fix my kitchen sink"\n` +
    `• "Electrician needed in Dallas for outlet installation, budget $150"\n` +
    `• "Urgent: Need a handyman for general repairs tomorrow"\n\n` +
    `🏠 **Supported trades:**\n` +
    `Plumbing, Electrical, Painting, Carpentry, Landscaping, Cleaning, Handyman, General Contracting\n\n` +
    `❓ Send any job description to get started!`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Handle all other messages as job descriptions
bot.on('message', handleMessage);

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

console.log('🤖 BlueCollarClaw Telegram Bot started');
console.log('📱 Waiting for messages...');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('✅ Database connection closed');
    process.exit(0);
  });
});