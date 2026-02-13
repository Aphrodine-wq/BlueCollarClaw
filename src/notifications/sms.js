const twilio = require('twilio');

class SMSChannel {
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !this.fromNumber) {
      throw new Error('Missing required Twilio environment variables');
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendSMS(to, body) {
    try {
      if (!to || !body) {
        throw new Error('Phone number and message body are required');
      }

      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to,
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
      };
    } catch (error) {
      console.error('SMS send failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendJobNotification(phoneNumber, jobDetails) {
    const { title, location, payRate, jobId } = jobDetails;

    const body = [
      `🔨 New Job: ${title}`,
      `📍 ${location}`,
      `💰 ${payRate}`,
      `Reply YES ${jobId} to apply`,
    ].join('\n');

    return this.sendSMS(phoneNumber, body);
  }

  handleWebhook(reqBody) {
    try {
      const { From, Body, MessageSid } = reqBody;

      if (!From || !Body) {
        throw new Error('Invalid webhook payload: missing From or Body');
      }

      const text = Body.trim().toUpperCase();
      const action = text.startsWith('YES') ? 'ACCEPT' : 'UNKNOWN';
      const jobId = text.split(' ')[1] || null;

      return {
        success: true,
        from: From,
        messageSid: MessageSid,
        rawBody: Body,
        action,
        jobId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Webhook handling failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = { SMSChannel };
