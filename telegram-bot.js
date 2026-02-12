#!/usr/bin/env node

/**
 * ClawShake Telegram Bot - Natural Language Job Posting
 * Parses natural language job descriptions and creates ClawShake job postings
 */

const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// Load configuration
const config = require('./config');

// Initialize Telegram bot
const bot = new TelegramBot(config.telegramToken, { polling: true });

// Initialize database connection
const pool = new Pool({
  user: config.dbUser,
  host: config.dbHost,
  database: config.dbName,
  password: config.dbPassword,
  port: config.dbPort,
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
  const tokens = tokenizer.tokenize(lowerText);
  
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
    if (tokens.includes(keyword)) {
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
 * Create job posting in ClawShake
 * @param {object} jobData - Parsed job data
 * @param {number} userId - Telegram user ID
 * @returns {Promise<object>} Created job posting
 */
async function createJobPosting(jobData, userId) {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Insert job posting
    const jobResult = await client.query(`
      INSERT INTO job_postings (
        category,
        description,
        location,
        budget,
        is_urgent,
        natural_language,
        created_by,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      jobData.category,
      jobData.description,
      jobData.location || null,
      jobData.budget || null,
      jobData.isUrgent || false,
      true,
      userId,
      'active'
    ]);
    
    const job = jobResult.rows[0];
    
    // Log the creation
    await client.query(`
      INSERT INTO job_logs (job_id, action, details)
      VALUES ($1, $2, $3)
    `, [job.id, 'created', 'Created via natural language bot']);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return job;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle incoming messages
 * @param {object} msg - Telegram message object
 */
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (!text || text.trim().length === 0) {
    await bot.sendMessage(chatId, 'Please send a job description.');
    return;
  }
  
  try {
    // Parse the natural language
    const jobData = parseJobDescription(text);
    
    // Create the job posting
    const job = await createJobPosting(jobData, userId);
    
    // Send confirmation
    const message = `🎯 Job posted successfully!\n\n` +
      `📋 **Job ID:** ${job.id}\n` +
      `🏠 **Category:** ${job.category}\n` +
      `📍 **Location:** ${job.location || 'Not specified'}\n` +
      `💰 **Budget:** ${job.budget ? `$${job.budget}` : 'Not specified'}\n` +
      `🚨 **Urgent:** ${job.is_urgent ? 'Yes' : 'No'}\n\n` +
      `📞 We'll notify you when we find matching contractors!\n` +
      `💡 You can also view this job at: ${config.dashboardUrl}/jobs/${job.id}`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
    // Send notification to matching contractors
    await notifyMatchingContractors(job);
    
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, 'Sorry, there was an error processing your job. Please try again.');
  }
}

/**
 * Notify matching contractors about new job
 * @param {object} job - Job posting data
 */
async function notifyMatchingContractors(job) {
  const client = await pool.connect();
  try {
    // Find contractors matching the job category and location
    const contractors = await client.query(`
      SELECT c.*
      FROM contractors c
      LEFT JOIN contractor_categories cc ON c.id = cc.contractor_id
      WHERE (
        cc.category = $1 OR
        c.services ILIKE $1
      ) AND (
        c.location ILIKE $2 OR
        $2 IS NULL
      ) AND c.status = 'active'
    `, [job.category, job.location]);
    
    // Send notifications to matching contractors
    for (const contractor of contractors.rows) {
      // Here you would integrate with your messaging system
      // For now, we'll just log the notification
      console.log(`Notifying contractor ${contractor.id} about job ${job.id}`);
      
      // In a real implementation, you'd send via WhatsApp/Telegram
      // await sendNotification(contractor.messaging_id, job);
    }
  } catch (error) {
    console.error('Error notifying contractors:', error);
  } finally {
    client.release();
  }
}

// Handle bot commands
bot.onText(/\/(start|help)/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `🔧 **ClawShake Bot - Natural Language Job Posting**\n\n` +
    `📝 Simply send me a message describing the job you need done. For example:\n\n` +
    `• "I need a plumber to fix my bathroom sink"\n` +
    `• "Looking for an electrician to install new outlets in my kitchen"\n` +
    `• "Need a painter to paint my living room walls"\n\n` +
    `🎯 I'll automatically create the job posting and notify matching contractors!\n\n` +
    `📞 Type your job description and send it to me anytime.`;
  
  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Handle all other messages as job descriptions
bot.on('message', handleMessage);

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('ClawShake Telegram Bot started');