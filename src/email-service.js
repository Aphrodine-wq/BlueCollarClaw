/**
 * BlueCollarClaw Email Service
 * Sends notifications for job matches, offers, bookings, etc.
 * Supports SendGrid, AWS SES, or SMTP
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp'; // sendgrid, ses, smtp
    this.fromEmail = process.env.FROM_EMAIL || 'notifications@bluecollarclaw.com';
    this.fromName = process.env.FROM_NAME || 'BlueCollarClaw';
    
    this.initTransporter();
  }
  
  initTransporter() {
    switch (this.provider) {
      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
        break;
        
      case 'ses':
        this.transporter = nodemailer.createTransport({
          SES: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
          }
        });
        break;
        
      case 'smtp':
      default:
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        break;
    }
  }
  
  async sendEmail(to, subject, html, text) {
    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        text: text || this.htmlToText(html),
        html
      });
      
      console.log(`📧 Email sent: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Email send failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  
  // === Notification Templates ===
  
  async notifyNewJobMatch(userEmail, jobDetails) {
    const subject = `🔨 New ${jobDetails.trade} Job Match - ${jobDetails.location}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🔨 New Job Match!</h2>
        <p>A new job matching your skills has been posted.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${jobDetails.trade.charAt(0).toUpperCase() + jobDetails.trade.slice(1)} Job</h3>
          <p><strong>📍 Location:</strong> ${jobDetails.location}</p>
          <p><strong>📅 Dates:</strong> ${jobDetails.startDate} to ${jobDetails.endDate}</p>
          <p><strong>💰 Budget:</strong> $${jobDetails.minRate}-$${jobDetails.maxRate}/hr</p>
          <p><strong>📝 Scope:</strong> ${jobDetails.scope}</p>
        </div>
        
        <p>
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/jobs.html" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Job & Make Offer
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          You're receiving this because you're a verified contractor on BlueCollarClaw.
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/settings.html">Manage notifications</a>
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, subject, html);
  }
  
  async notifyNewOffer(userEmail, offerDetails) {
    const subject = `📬 New Offer Received - ${offerDetails.trade} Job`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📬 New Offer Received!</h2>
        <p>A contractor has submitted an offer for your job.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${offerDetails.trade.charAt(0).toUpperCase() + offerDetails.trade.slice(1)} in ${offerDetails.location}</h3>
          <p><strong>👤 Contractor:</strong> ${offerDetails.contractorName}</p>
          <p><strong>💰 Offered Rate:</strong> $${offerDetails.rate}/hr</p>
          <p><strong>📅 Proposed Dates:</strong> ${offerDetails.startDate} to ${offerDetails.endDate}</p>
          ${offerDetails.message ? `<p><strong>💬 Message:</strong> "${offerDetails.message}"</p>` : ''}
        </div>
        
        <p>
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/jobs.html" 
             style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
            Accept Offer
          </a>
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/jobs.html" 
             style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Decline
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          You're receiving this because you posted a job on BlueCollarClaw.
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, subject, html);
  }
  
  async notifyOfferAccepted(userEmail, bookingDetails) {
    const subject = `🎉 Offer Accepted - ${bookingDetails.trade} Job Confirmed!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Your Offer Was Accepted!</h2>
        <p>The job is now confirmed. Check your dashboard for details.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>📋 Booking ID:</strong> ${bookingDetails.id}</p>
          <p><strong>🔨 Trade:</strong> ${bookingDetails.trade}</p>
          <p><strong>📍 Location:</strong> ${bookingDetails.location}</p>
          <p><strong>📅 Dates:</strong> ${bookingDetails.startDate} to ${bookingDetails.endDate}</p>
          <p><strong>💰 Agreed Rate:</strong> $${bookingDetails.rate}/hr</p>
          <p><strong>📄 Contract:</strong> <a href="${bookingDetails.contractUrl}">Download PDF</a></p>
        </div>
        
        <p>
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </p>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>📋 Next Steps:</strong></p>
          <ol style="color: #92400e; margin: 10px 0;">
            <li>Review and sign the contract</li>
            <li>Contact the client to confirm details</li>
            <li>Complete the work as scheduled</li>
            <li>Submit invoice after completion</li>
          </ol>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          You're receiving this because your offer was accepted on BlueCollarClaw.
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, subject, html);
  }
  
  async notifyBookingConfirmed(userEmail, bookingDetails, isGC = false) {
    const subject = `✅ Booking Confirmed - ${bookingDetails.trade} Job`;
    const role = isGC ? 'Your contractor is confirmed!' : 'You are confirmed for this job!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Booking Confirmed</h2>
        <p>${role}</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${bookingDetails.trade} at ${bookingDetails.location}</h3>
          <p><strong>📋 Booking ID:</strong> ${bookingDetails.id}</p>
          <p><strong>📅 Dates:</strong> ${bookingDetails.startDate} to ${bookingDetails.endDate}</p>
          <p><strong>💰 Rate:</strong> $${bookingDetails.rate}/hr</p>
          <p><strong>📄 Contract:</strong> <a href="${bookingDetails.contractUrl}">Download PDF</a></p>
        </div>
        
        <p>
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          BlueCollarClaw - Where the work finds you.
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, subject, html);
  }
  
  async sendDailyDigest(userEmail, digestData) {
    const { todaysJobs, pendingOffers, activeRequests, weekStats } = digestData;
    
    let content = '';
    
    if (todaysJobs && todaysJobs.length > 0) {
      content += `<h3>📦 Today's Jobs (${todaysJobs.length})</h3><ul>`;
      todaysJobs.forEach(job => {
        content += `<li>${job.trade} at ${job.location}</li>`;
      });
      content += '</ul>';
    }
    
    if (pendingOffers > 0) {
      content += `<h3>💼 Pending Offers: ${pendingOffers}</h3>`;
    }
    
    if (activeRequests && activeRequests.length > 0) {
      content += `<h3>📋 Active Requests (${activeRequests.length})</h3><ul>`;
      activeRequests.forEach(req => {
        content += `<li>${req.trade} - $${req.min_rate}-$${req.max_rate}/hr</li>`;
      });
      content += '</ul>';
    }
    
    if (weekStats > 0) {
      content += `<h3>📊 This Week: ${weekStats} bookings completed</h3>`;
    }
    
    const subject = '📅 Your BlueCollarClaw Daily Digest';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📅 Your Daily Briefing</h2>
        
        ${content || '<p>No new activity today. Post a job to get started!</p>'}
        
        <p style="margin-top: 30px;">
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          You're receiving your daily digest from BlueCollarClaw.
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/settings.html">Manage email preferences</a>
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, subject, html);
  }
  
  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to BlueCollarClaw! 🛠️';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to BlueCollarClaw, ${userName}! 🛠️</h2>
        <p>The autonomous contractor network that finds work for you.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Get Started in 3 Steps:</h3>
          <ol>
            <li><strong>Complete your profile</strong> - Add your trades and service area</li>
            <li><strong>Set your rates</strong> - Let us know your preferred hourly rates</li>
            <li><strong>Enable notifications</strong> - Get alerted when matching jobs are posted</li>
          </ol>
        </div>
        
        <p>
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/settings.html" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Complete Your Profile
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Questions? Reply to this email or contact support.
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, subject, html);
  }
}

module.exports = EmailService;
