module.exports = {
  // Telegram Bot API Token (get from @BotFather)
  // Can also set via TELEGRAM_BOT_TOKEN environment variable
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
  
  // Dashboard URL (for job links)
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  
  // Database path (SQLite)
  dbPath: process.env.DB_PATH || './bluecollar-claw.db',
  
  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development'
};