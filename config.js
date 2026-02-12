module.exports = {
  // Telegram Bot API Token (get from @BotFather)
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
  
  // Database configuration
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'your_password',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || 5432,
  dbName: process.env.DB_NAME || 'clawshake',
  
  // Dashboard URL
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  
  // Messaging integration (for notifications)
  messaging: {
    whatsapp: {
      enabled: false,
      accountSid: process.env.WHATSAPP_ACCOUNT_SID || null,
      authToken: process.env.WHATSAPP_AUTH_TOKEN || null,
      phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || null,
    },
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN || null,
    }
  }
};