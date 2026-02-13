/**
 * BlueCollarClaw Slack Webhook Integration
 * Sends rich notifications to Slack channels using Block Kit
 */

const { IncomingWebhook } = require('@slack/webhook');

class SlackChannel {
  constructor() {
    this.defaultWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
  }

  /**
   * Send a basic message to Slack
   * @param {string} webhookUrl - Slack webhook URL (optional, uses default if not provided)
   * @param {string} text - Plain text message
   * @param {Array} blocks - Slack Block Kit blocks (optional)
   * @returns {Promise<Object>} - Result of the send operation
   */
  async sendMessage(webhookUrl, text, blocks = null) {
    const url = webhookUrl || this.defaultWebhookUrl;
    
    if (!url) {
      console.warn('⚠️  No Slack webhook URL configured');
      return { success: false, error: 'No webhook URL provided' };
    }

    try {
      const webhook = new IncomingWebhook(url);
      const payload = blocks ? { blocks } : { text };
      
      await webhook.send(payload);
      console.log('✅ Slack message sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Slack send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a job notification with rich formatting
   * @param {string} webhookUrl - Slack webhook URL (optional)
   * @param {Object} jobDetails - Job details object
   * @returns {Promise<Object>} - Result of the send operation
   */
  async sendJobNotification(webhookUrl, jobDetails) {
    const blocks = this.formatJobBlocks(jobDetails);
    return this.sendMessage(webhookUrl, null, blocks);
  }

  /**
   * Format job details into Slack Block Kit blocks
   * @param {Object} job - Job details
   * @returns {Array} - Slack Block Kit blocks
   */
  formatJobBlocks(job) {
    const {
      id,
      trade,
      location,
      startDate,
      endDate,
      minRate,
      maxRate,
      scope,
      urgency = 'normal',
      postedBy,
      postedAt
    } = job;

    // urgency emoji mapping
    const urgencyEmoji = {
      urgent: '🔥',
      high: '⚡',
      normal: '📋',
      low: '📎'
    };

    const emoji = urgencyEmoji[urgency] || urgencyEmoji.normal;
    const jobUrl = `${this.dashboardUrl}/jobs.html?job=${id}`;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} New ${this.capitalize(trade)} Job`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*📍 Location:*\n${location}`
          },
          {
            type: 'mrkdwn',
            text: `*💰 Budget:*\n$${minRate}-$${maxRate}/hr`
          },
          {
            type: 'mrkdwn',
            text: `*📅 Start:*\n${startDate}`
          },
          {
            type: 'mrkdwn',
            text: `*📅 End:*\n${endDate}`
          }
        ]
      }
    ];

    // Add scope if provided
    if (scope) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📝 Scope:*\n${scope.substring(0, 500)}${scope.length > 500 ? '...' : ''}`
        }
      });
    }

    // Add posted info if available
    if (postedBy || postedAt) {
      const postedInfo = [];
      if (postedBy) postedInfo.push(`by ${postedBy}`);
      if (postedAt) postedInfo.push(`on ${postedAt}`);
      
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Posted ${postedInfo.join(' ')}`
          }
        ]
      });
    }

    // Add divider and actions
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔨 Make Offer',
            emoji: true
          },
          url: jobUrl,
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📋 View Details',
            emoji: true
          },
          url: jobUrl
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🏠 Dashboard',
            emoji: true
          },
          url: this.dashboardUrl
        }
      ]
    });

    return blocks;
  }

  /**
   * Send a booking confirmation notification
   * @param {string} webhookUrl - Slack webhook URL (optional)
   * @param {Object} booking - Booking details
   * @returns {Promise<Object>} - Result of the send operation
   */
  async sendBookingConfirmation(webhookUrl, booking) {
    const {
      id,
      trade,
      location,
      startDate,
      endDate,
      rate,
      contractorName,
      gcName
    } = booking;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 Booking Confirmed!',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*🔨 Trade:*\n${this.capitalize(trade)}`
          },
          {
            type: 'mrkdwn',
            text: `*📋 Booking ID:*\n\`${id}\``
          },
          {
            type: 'mrkdwn',
            text: `*📍 Location:*\n${location}`
          },
          {
            type: 'mrkdwn',
            text: `*💰 Rate:*\n$${rate}/hr`
          },
          {
            type: 'mrkdwn',
            text: `*📅 Dates:*\n${startDate} to ${endDate}`
          },
          {
            type: 'mrkdwn',
            text: `*👤 Contractor:*\n${contractorName}`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📄 View Contract',
              emoji: true
            },
            url: `${this.dashboardUrl}/contracts.html?booking=${id}`
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🏠 Dashboard',
              emoji: true
            },
            url: this.dashboardUrl
          }
        ]
      }
    ];

    return this.sendMessage(webhookUrl, null, blocks);
  }

  /**
   * Send a daily digest notification
   * @param {string} webhookUrl - Slack webhook URL (optional)
   * @param {Object} digest - Digest data
   * @returns {Promise<Object>} - Result of the send operation
   */
  async sendDailyDigest(webhookUrl, digest) {
    const { newJobs, pendingOffers, activeRequests, completedBookings } = digest;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📅 BlueCollarClaw Daily Digest',
          emoji: true
        }
      }
    ];

    // Stats section
    const fields = [];
    if (newJobs !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*🔨 New Jobs:*\n${newJobs}`
      });
    }
    if (pendingOffers !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*💼 Pending Offers:*\n${pendingOffers}`
      });
    }
    if (activeRequests !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*📋 Active Requests:*\n${activeRequests}`
      });
    }
    if (completedBookings !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*✅ Completed:*\n${completedBookings}`
      });
    }

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        fields
      });
    }

    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🏠 Open Dashboard',
            emoji: true
          },
          url: this.dashboardUrl,
          style: 'primary'
        }
      ]
    });

    return this.sendMessage(webhookUrl, null, blocks);
  }

  /**
   * Utility: Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} - Capitalized string
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = SlackChannel;
