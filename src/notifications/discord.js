/**
 * BlueCollarClaw Discord Bot Integration
 * 
 * Features:
 * - DM notifications for job matches and offers
 * - Slash commands: /post, /offers, /status
 * - Natural language job posting via DMs
 * 
 * Env vars:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_CLIENT_ID
 */

const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  Routes,
  REST,
  PermissionFlagsBits
} = require('discord.js');

const createDatabase = require('../db-factory');
const MessageHandler = require('../message-handler');
const { nanoid } = require('nanoid');

class DiscordChannel {
  constructor(messageHandler) {
    this.messageHandler = messageHandler || new MessageHandler();
    this.db = createDatabase();
    this.client = null;
    this.token = process.env.DISCORD_BOT_TOKEN;
    this.clientId = process.env.DISCORD_CLIENT_ID;

    // Map Discord users to contractors
    this.userContractorMap = new Map();
  }

  /**
   * Login and start listening for events
   */
  start() {
    if (!this.token || this.token === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
      console.error('❌ Error: DISCORD_BOT_TOKEN not set!');
      console.error('Get your token from https://discord.com/developers/applications');
      return false;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    // Handle ready event
    this.client.once(Events.ClientReady, async () => {
      console.log(`🤖 Discord Bot logged in as ${this.client.user.tag}`);
      await this.registerCommands();
      this.ensureDatabaseSchema();
    });

    // Handle slash commands
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleSlashCommand(interaction);
    });

    // Handle DM messages
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      if (message.guild) return; // Only DMs
      await this.handleMessage(message);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      console.error('Discord client error:', error.message);
    });

    this.client.login(this.token);
    return true;
  }

  /**
   * Register slash commands with Discord
   */
  async registerCommands() {
    if (!this.clientId) {
      console.warn('⚠️ DISCORD_CLIENT_ID not set, skipping command registration');
      return;
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('post')
        .setDescription('Post a new job on BlueCollarClaw')
        .addStringOption(option =>
          option.setName('trade')
            .setDescription('What trade do you need? (plumber, electrician, etc.)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('location')
            .setDescription('Where is the job?')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('dates')
            .setDescription('When do you need them? (tomorrow, ASAP, 2/20)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('budget')
            .setDescription('Your budget per hour (e.g., $80-100 or $90)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Describe the work needed')
            .setRequired(false)),

      new SlashCommandBuilder()
        .setName('offers')
        .setDescription('View your offers received or made'),

      new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check BlueCollarClaw system status'),

      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with BlueCollarClaw'),

      new SlashCommandBuilder()
        .setName('myjobs')
        .setDescription('View your active job requests'),

      new SlashCommandBuilder()
        .setName('accept')
        .setDescription('Accept an offer')
        .addStringOption(option =>
          option.setName('offer_id')
            .setDescription('The offer ID (first 8 characters)')
            .setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(this.token);

    try {
      console.log('🔄 Registering Discord slash commands...');
      await rest.put(
        Routes.applicationCommands(this.clientId),
        { body: commands.map(cmd => cmd.toJSON()) }
      );
      console.log('✅ Discord slash commands registered');
    } catch (error) {
      console.error('❌ Failed to register Discord commands:', error.message);
    }
  }

  /**
   * Handle slash command interactions
   */
  async handleSlashCommand(interaction) {
    const { commandName } = interaction;

    try {
      switch (commandName) {
        case 'post':
          await this.handlePostCommand(interaction);
          break;
        case 'offers':
          await this.handleOffersCommand(interaction);
          break;
        case 'status':
          await this.handleStatusCommand(interaction);
          break;
        case 'help':
          await this.handleHelpCommand(interaction);
          break;
        case 'myjobs':
          await this.handleMyJobsCommand(interaction);
          break;
        case 'accept':
          await this.handleAcceptCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (error) {
      console.error(`Error handling /${commandName}:`, error);
      await interaction.reply({
        content: 'Sorry, something went wrong. Please try again.',
        ephemeral: true
      });
    }
  }

  /**
   * Handle /post command
   */
  async handlePostCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const contractor = await this.getOrCreateContractor(interaction.user);

    const trade = interaction.options.getString('trade');
    const location = interaction.options.getString('location');
    const dates = interaction.options.getString('dates');
    const budget = interaction.options.getString('budget');
    const description = interaction.options.getString('description') || 'As discussed';

    // Parse budget
    const rateMatch = budget.match(/\$?(\d+)(?:-\$?(\d+))?/);
    if (!rateMatch) {
      await interaction.editReply('Invalid budget format. Use: $90 or $80-100');
      return;
    }

    let minRate, maxRate;
    if (rateMatch[2]) {
      minRate = parseInt(rateMatch[1]);
      maxRate = parseInt(rateMatch[2]);
    } else {
      const rate = parseInt(rateMatch[1]);
      minRate = rate - 10;
      maxRate = rate + 10;
    }

    // Parse dates
    const parsedDates = this.parseDateInput(dates);

    // Create job request
    const requestId = `req_${nanoid(8)}`;

    await new Promise((resolve, reject) => {
      this.db.createJobRequest({
        id: requestId,
        requesterId: contractor.id,
        trade: trade.toLowerCase(),
        location: location,
        latitude: null,
        longitude: null,
        startDate: parsedDates.startDate,
        endDate: parsedDates.endDate,
        minRate: minRate,
        maxRate: maxRate,
        scope: description,
        requirements: ''
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Find and notify matches
    const matches = await this.findMatches({
      trade: trade.toLowerCase(),
      requester_id: contractor.id
    });

    if (matches.length > 0) {
      await this.notifyMatches(matches, {
        id: requestId,
        trade,
        location,
        start_date: parsedDates.startDate,
        end_date: parsedDates.endDate,
        min_rate: minRate,
        max_rate: maxRate,
        scope: description
      });
    }

    await interaction.editReply({
      content: `✅ **Job Posted!**\n\n` +
        `📋 ID: ${requestId}\n` +
        `🔨 ${trade}\n` +
        `📍 ${location}\n` +
        `📅 ${parsedDates.startDate} to ${parsedDates.endDate}\n` +
        `💰 $${minRate}-$${maxRate}/hr\n\n` +
        `📢 Notified ${matches.length} matching contractors!\n` +
        `Use /offers to see incoming offers.`
    });
  }

  /**
   * Handle /offers command
   */
  async handleOffersCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const contractor = await this.getOrCreateContractor(interaction.user);

    // Get offers received
    const receivedOffers = await new Promise((resolve) => {
      this.db.db.all(
        `SELECT o.*, j.trade, j.location, c.name as contractor_name,
                j.requester_id, j.id as job_id
         FROM offers o 
         JOIN job_requests j ON o.request_id = j.id 
         JOIN contractors c ON o.contractor_id = c.id
         WHERE j.requester_id = ? AND o.status = 'pending'
         ORDER BY o.created_at DESC LIMIT 10`,
        [contractor.id],
        (err, rows) => resolve(rows || [])
      );
    });

    // Get offers made
    const sentOffers = await new Promise((resolve) => {
      this.db.db.all(
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
      message = 'No offers yet. Post a job with /post to receive offers!';
    }

    await interaction.editReply({ content: message });
  }

  /**
   * Handle /status command
   */
  async handleStatusCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const status = await this.messageHandler.getStatus();
    await interaction.editReply({ content: status });
  }

  /**
   * Handle /help command
   */
  async handleHelpCommand(interaction) {
    const helpMessage = `🔧 **BlueCollarClaw Help**

**SLASH COMMANDS:**
/post - Post a new job (guided)
/offers - View your offers
/myjobs - See your active jobs
/status - Check system status
/accept [id] - Accept an offer

**NATURAL LANGUAGE:**
Just DM me what you need:
• "I need a plumber tomorrow for $80/hr in Austin"
• "Find me an electrician ASAP"
• "HVAC help needed this week, budget $75-95"

**FOR CONTRACTORS:**
Browse jobs and reply with your rate to make offers.
You'll be notified when your offer is accepted.`;

    await interaction.reply({ content: helpMessage, ephemeral: true });
  }

  /**
   * Handle /myjobs command
   */
  async handleMyJobsCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const contractor = await this.getOrCreateContractor(interaction.user);
    const response = await this.messageHandler.getMyJobs(contractor.id);

    await interaction.editReply({ content: response });
  }

  /**
   * Handle /accept command
   */
  async handleAcceptCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const contractor = await this.getOrCreateContractor(interaction.user);
    const offerShortId = interaction.options.getString('offer_id');

    // Find offer by partial ID
    const offer = await new Promise((resolve) => {
      this.db.db.get(
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
      await interaction.editReply('Offer not found or already processed. Check /offers for available offers.');
      return;
    }

    // Create booking
    const bookingId = `book_${nanoid(8)}`;
    const contractUrl = `/contracts/contract_${bookingId}.pdf`;

    await new Promise((resolve, reject) => {
      this.db.createBooking({
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
      this.db.updateOfferStatus(offer.id, 'accepted', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update job request status
    await new Promise((resolve, reject) => {
      this.db.db.run(
        'UPDATE job_requests SET status = ? WHERE id = ?',
        ['filled', offer.request_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await interaction.editReply({
      content: `✅ **Booking Confirmed!**\n\n` +
        `📋 Booking ID: ${bookingId}\n` +
        `🔨 ${offer.trade}\n` +
        `📍 ${offer.location}\n` +
        `📅 ${offer.start_date} to ${offer.end_date}\n` +
        `💰 $${offer.rate}/hr\n\n` +
        `Contract generated and ready for download.`
    });

    // Notify subcontractor via DM
    await this.sendDM(offer.contractor_id,
      `🎉 **Your Offer Was Accepted!**\n\n` +
      `📋 Booking ID: ${bookingId}\n` +
      `🔨 ${offer.trade} at ${offer.location}\n` +
      `📅 ${offer.start_date} to ${offer.end_date}\n` +
      `💰 $${offer.rate}/hr\n\n` +
      `Check your dashboard for details.`
    );
  }

  /**
   * Handle DM messages (natural language)
   */
  async handleMessage(message) {
    const discordUser = message.author;
    const text = message.content;

    try {
      const contractor = await this.getOrCreateContractor(discordUser);

      // Check for active session
      const session = this.messageHandler.sessions.get(discordUser.id);
      if (session) {
        const response = await this.messageHandler.handleSessionReply(contractor.id, text, session, 'discord');
        await message.reply(response);
        return;
      }

      // Try to parse as rate offer
      const rateMatch = text.match(/\$?(\d+)\/?hr?/i);
      if (rateMatch && !text.startsWith('/')) {
        const handled = await this.handleRateOffer(contractor, parseInt(rateMatch[1]), text);
        if (handled) return;
      }

      // Handle as natural language job posting
      const response = await this.messageHandler.handleMessage(contractor.id, text, 'discord');
      await message.reply(response);

    } catch (error) {
      console.error('Error handling Discord DM:', error);
      await message.reply('Sorry, there was an error processing your message. Please try again.');
    }
  }

  /**
   * Handle rate offers from contractors
   */
  async handleRateOffer(contractor, rate, text) {
    const recentJobs = await new Promise((resolve) => {
      this.db.db.all(
        `SELECT * FROM job_requests 
         WHERE status = 'open' 
         ORDER BY created_at DESC LIMIT 5`,
        [],
        (err, rows) => resolve(rows || [])
      );
    });

    if (recentJobs.length === 0) return false;

    const job = recentJobs[0];
    const offerId = `off_${nanoid(8)}`;

    await new Promise((resolve, reject) => {
      this.db.createOffer({
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
    await this.sendDM(job.requester_id,
      `📬 **New Offer Received!**\n\n` +
      `🔨 ${job.trade} in ${job.location}\n` +
      `👤 From: ${contractor.name}\n` +
      `💰 Rate: $${rate}/hr\n\n` +
      `Use /offers to see all offers`
    );

    return true;
  }

  /**
   * Send DM notification to a user
   */
  async sendDM(userId, message) {
    try {
      // Look up Discord user ID from contractor ID
      const discordUser = await new Promise((resolve) => {
        this.db.db.get(
          'SELECT discord_id FROM discord_users WHERE contractor_id = ?',
          [userId],
          (err, row) => resolve(row)
        );
      });

      if (!discordUser || !discordUser.discord_id) {
        console.warn(`No Discord user found for contractor ${userId}`);
        return false;
      }

      const user = await this.client.users.fetch(discordUser.discord_id);
      if (!user) {
        console.warn(`Could not fetch Discord user ${discordUser.discord_id}`);
        return false;
      }

      await user.send(message);
      return true;
    } catch (error) {
      console.error('Error sending Discord DM:', error.message);
      return false;
    }
  }

  /**
   * Send job notification to a user
   */
  async sendJobNotification(userId, jobDetails) {
    const message = `🔨 **New Job Match!**\n\n` +
      `Trade: ${jobDetails.trade}\n` +
      `Location: ${jobDetails.location}\n` +
      `Dates: ${jobDetails.startDate} to ${jobDetails.endDate}\n` +
      `Budget: $${jobDetails.minRate}-$${jobDetails.maxRate}/hr\n` +
      `Scope: ${jobDetails.scope}\n\n` +
      `Reply with your rate to make an offer!`;

    return await this.sendDM(userId, message);
  }

  /**
   * Get or create contractor for Discord user
   */
  async getOrCreateContractor(discordUser) {
    const discordId = discordUser.id;

    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT c.* FROM contractors c JOIN discord_users du ON c.id = du.contractor_id WHERE du.discord_id = ?',
        [discordId],
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
            name: discordUser.globalName || discordUser.username,
            discord_id: discordId,
            public_key: crypto.randomBytes(32).toString('hex'),
            private_key: crypto.randomBytes(32).toString('hex')
          };

          // Insert contractor
          this.db.db.run(
            'INSERT INTO contractors (id, name, public_key, private_key) VALUES (?, ?, ?, ?)',
            [newContractor.id, newContractor.name, newContractor.public_key, newContractor.private_key],
            (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Save Discord user link
              this.db.db.run(
                `INSERT OR REPLACE INTO discord_users (discord_id, contractor_id, username, global_name) 
                 VALUES (?, ?, ?, ?)`,
                [discordId, newContractor.id, discordUser.username, discordUser.globalName || null],
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
   * Find matching contractors for a job
   */
  async findMatches(jobRequest) {
    return new Promise((resolve, reject) => {
      this.db.db.all(
        `SELECT DISTINCT c.* FROM contractors c
         JOIN contractor_trades ct ON c.id = ct.contractor_id
         WHERE ct.trade = ? AND c.id != ?`,
        [jobRequest.trade, jobRequest.requester_id],
        (err, contractors) => {
          if (err) {
            reject(err);
            return;
          }

          const matches = contractors.map(contractor => {
            let score = 50;
            score += 30; // Trade match bonus
            if (contractor.min_rate && contractor.min_rate <= jobRequest.max_rate) {
              score += 20;
            }
            return { ...contractor, matchScore: score };
          }).sort((a, b) => b.matchScore - a.matchScore);

          resolve(matches.slice(0, 5));
        }
      );
    });
  }

  /**
   * Notify contractors about a new job
   */
  async notifyMatches(matches, jobRequest) {
    for (const match of matches) {
      try {
        await this.sendJobNotification(match.id, {
          trade: jobRequest.trade,
          location: jobRequest.location,
          startDate: jobRequest.start_date,
          endDate: jobRequest.end_date,
          minRate: jobRequest.min_rate,
          maxRate: jobRequest.max_rate,
          scope: jobRequest.scope,
          matchScore: match.matchScore
        });
      } catch (error) {
        console.error(`Failed to notify contractor ${match.id}:`, error);
      }
    }
  }

  /**
   * Parse date input string
   */
  parseDateInput(input) {
    const today = new Date();
    let startDate, endDate;

    const lower = input.toLowerCase().trim();

    if (lower === 'asap' || lower === 'today') {
      startDate = today.toISOString().split('T')[0];
      endDate = startDate;
    } else if (lower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      startDate = tomorrow.toISOString().split('T')[0];
      endDate = startDate;
    } else if (lower.includes('week')) {
      startDate = today.toISOString().split('T')[0];
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      endDate = nextWeek.toISOString().split('T')[0];
    } else {
      // Try to parse as date
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed.toISOString().split('T')[0];
        endDate = startDate;
      } else {
        // Default to today
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
      }
    }

    return { startDate, endDate };
  }

  /**
   * Ensure database schema for Discord integration
   */
  ensureDatabaseSchema() {
    this.db.db.run(`CREATE TABLE IF NOT EXISTS discord_users (
      discord_id TEXT PRIMARY KEY,
      contractor_id TEXT,
      username TEXT,
      global_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(contractor_id) REFERENCES contractors(id)
    )`);
  }
}

module.exports = DiscordChannel;

// Run standalone if called directly
if (require.main === module) {
  const channel = new DiscordChannel();
  const started = channel.start();

  if (started) {
    console.log('🤖 BlueCollarClaw Discord Bot started');

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down Discord bot...');
      if (channel.client) {
        channel.client.destroy();
      }
      channel.db.close();
      process.exit(0);
    });
  }
}
