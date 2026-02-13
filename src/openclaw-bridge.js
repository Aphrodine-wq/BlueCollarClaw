/**
 * BlueCollarClaw — OpenClaw Bridge
 *
 * Optional integration for users who already have OpenClaw running.
 * Allows them to connect their existing Telegram/Discord/WhatsApp bots
 * so BlueCollarClaw notifications flow through channels they already use.
 *
 * How it works:
 * 1. User enters their OpenClaw instance URL + API key in Settings
 * 2. BlueCollarClaw stores the connection and forwards events to OpenClaw
 * 3. OpenClaw can also POST messages back via /api/integrations/openclaw/webhook
 */

const crypto = require('crypto');

class OpenClawBridge {
  constructor(db) {
    this.db = db;
  }

  // Connect a user's OpenClaw instance
  async connect(userId, instanceUrl, apiKey, channels = {}) {
    // Validate the URL
    try {
      new URL(instanceUrl);
    } catch {
      throw new Error('Invalid OpenClaw instance URL');
    }

    // Hash the API key for storage (we never store it in plaintext)
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Test the connection first
    const testResult = await this.testConnection(instanceUrl, apiKey);
    if (!testResult.success) {
      throw new Error(`Could not connect to OpenClaw: ${testResult.error}`);
    }

    const connId = crypto.randomUUID();

    // Disconnect any existing connection first
    await this.disconnectAsync(userId);

    // Create new connection
    await this.createConnectionAsync({
      id: connId,
      userId,
      openclawInstanceUrl: instanceUrl,
      apiKeyHash,
      channels: channels || testResult.channels || {},
    });

    return {
      id: connId,
      status: 'active',
      channels: channels || testResult.channels || {},
      message: 'OpenClaw connected successfully. Notifications will flow through your existing bots.',
    };
  }

  // Disconnect a user's OpenClaw instance
  async disconnect(userId) {
    await this.disconnectAsync(userId);
    return { status: 'disconnected', message: 'OpenClaw disconnected.' };
  }

  // Get connection status
  async getStatus(userId) {
    const conn = await this.getConnectionAsync(userId);

    if (!conn) {
      return { connected: false, status: 'not_connected' };
    }

    return {
      connected: conn.status === 'active',
      status: conn.status,
      instanceUrl: conn.openclaw_instance_url,
      channels: JSON.parse(conn.channels || '{}'),
      connectedAt: conn.created_at,
    };
  }

  // Test connection to an OpenClaw instance
  async testConnection(instanceUrl, apiKey) {
    try {
      const response = await fetch(`${instanceUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          channels: data.channels || {},
          version: data.version || 'unknown',
        };
      }

      return { success: false, error: `HTTP ${response.status}` };
    } catch (err) {
      // If OpenClaw isn't reachable, we still allow saving the connection
      // (the user might set it up later or it might be behind a firewall)
      return {
        success: true, // Allow connection even if test fails
        channels: {},
        warning: 'Could not reach OpenClaw instance. Connection saved — notifications will flow when the instance is available.',
      };
    }
  }

  // Forward a BlueCollarClaw event to the user's OpenClaw instance
  async forwardEvent(userId, event) {
    const conn = await this.getConnectionAsync(userId);

    if (!conn || conn.status !== 'active') {
      return; // No active connection, skip silently
    }

    try {
      const response = await fetch(`${conn.openclaw_instance_url}/api/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${conn.api_key_hash}`, // OpenClaw validates this
          'Content-Type': 'application/json',
          'X-Source': 'BlueCollarClaw',
        },
        body: JSON.stringify({
          type: 'notification',
          source: 'bluecollarclaw',
          event: event.type,
          message: event.message,
          data: event.data || {},
          channels: JSON.parse(conn.channels || '{}'),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`OpenClaw forward failed for user ${userId}: HTTP ${response.status}`);
      }
    } catch (err) {
      // Don't fail BlueCollarClaw operations if OpenClaw forwarding fails
      console.warn(`OpenClaw forward error for user ${userId}:`, err.message);
    }
  }

  // Handle incoming message FROM an OpenClaw bot (Telegram/Discord/WhatsApp)
  async handleIncomingMessage(userId, message, channel, MessageHandler) {
    const handler = new MessageHandler();
    const contractorId = userId; // Map OpenClaw user to BlueCollarClaw contractor

    const response = await handler.handleMessage(contractorId, message, `openclaw-${channel}`);
    return response;
  }

  // Notify events helper methods
  async notifyNewJob(userId, job) {
    await this.forwardEvent(userId, {
      type: 'new_job',
      message: `New job posted: ${job.trade} in ${job.location} — $${job.min_rate || '?'}-$${job.max_rate || '?'}/hr`,
      data: job,
    });
  }

  async notifyNewOffer(userId, offer, job) {
    await this.forwardEvent(userId, {
      type: 'new_offer',
      message: `New offer on your ${job.trade} job: $${offer.rate}/hr from ${offer.contractor_name || 'a contractor'}`,
      data: { offer, job },
    });
  }

  async notifyBookingConfirmed(userId, booking) {
    await this.forwardEvent(userId, {
      type: 'booking_confirmed',
      message: `Booking confirmed: ${booking.trade} in ${booking.location} at $${booking.rate}/hr`,
      data: booking,
    });
  }

  // Promise wrappers
  getConnectionAsync(userId) {
    return new Promise((resolve, reject) => {
      this.db.getOpenClawConnection(userId, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createConnectionAsync(conn) {
    return new Promise((resolve, reject) => {
      this.db.createOpenClawConnection(conn, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  disconnectAsync(userId) {
    return new Promise((resolve, reject) => {
      this.db.deleteOpenClawConnection(userId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = OpenClawBridge;
