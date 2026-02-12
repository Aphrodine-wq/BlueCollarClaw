#!/usr/bin/env node

/**
 * Quick setup script for Telegram Bot
 * Guides user through getting a token from BotFather
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 ClawShake Telegram Bot Setup\n');
console.log('This will help you get your bot running in minutes.\n');

console.log('Step 1: Create a Telegram Bot');
console.log('─────────────────────────────');
console.log('1. Open Telegram on your phone or desktop');
console.log('2. Search for "@BotFather"');
console.log('3. Send: /newbot');
console.log('4. Name your bot: "ClawShake Bot"');
console.log('5. Username: something like "YourClawShakeBot" (must end in "bot")');
console.log('6. Copy the API token (looks like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)');
console.log('');

rl.question('Paste your bot token here: ', (token) => {
  token = token.trim();
  
  if (!token || token.length < 20) {
    console.log('❌ Invalid token. Please get a valid token from @BotFather');
    rl.close();
    return;
  }
  
  // Save to .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Replace existing token or add new one
    if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
      envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*/g, `TELEGRAM_BOT_TOKEN=${token}`);
    } else {
      envContent += `\nTELEGRAM_BOT_TOKEN=${token}\n`;
    }
  } else {
    envContent = `TELEGRAM_BOT_TOKEN=${token}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Token saved to .env file\n');
  
  console.log('Step 2: Install Dependencies');
  console.log('─────────────────────────────');
  console.log('Run: npm install\n');
  
  console.log('Step 3: Start the Bot');
  console.log('─────────────────────────────');
  console.log('Run: npm run telegram\n');
  
  console.log('Step 4: Test It');
  console.log('─────────────────────────────');
  console.log('1. Open Telegram');
  console.log('2. Search for your bot by username');
  console.log('3. Send: /start');
  console.log('4. Send: "I need a plumber to fix my sink"');
  console.log('5. Watch the magic happen! 🎉\n');
  
  console.log('📚 Documentation: TELEGRAM-BOT-SETUP.md');
  console.log('🚀 Deployment: DEPLOY-TODAY.md\n');
  
  rl.close();
});