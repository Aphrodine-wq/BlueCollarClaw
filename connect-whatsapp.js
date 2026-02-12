#!/usr/bin/env node

const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.clear();
console.log();
log('═'.repeat(70), 'cyan');
log('  📱 CONNECT WHATSAPP', 'bright');
log('═'.repeat(70), 'cyan');
console.log();

const contractorId = process.argv[2];

if (!contractorId) {
  log('  ❌ Missing contractor ID', 'yellow');
  console.log();
  log('  Usage:', 'cyan');
  log('  node connect-whatsapp.js YOUR_CONTRACTOR_ID', 'green');
  console.log();
  process.exit(1);
}

log('  🔗 Setting up WhatsApp notifications...', 'cyan');
console.log();

log('  OPTION 1: Use OpenClaw (Recommended)', 'bright');
console.log();
log('  1. Make sure OpenClaw is installed:', 'cyan');
log('     npm install -g openclaw', 'yellow');
console.log();
log('  2. Configure WhatsApp channel:', 'cyan');
log('     openclaw channel add whatsapp', 'yellow');
console.log();
log('  3. Scan QR code with your phone', 'cyan');
console.log();
log('  4. Update config with your phone number:', 'cyan');
log('     Add to my-clawshake-config.txt:', 'yellow');
log('     WHATSAPP_NUMBER=+1234567890', 'yellow');
console.log();

log('  OPTION 2: Use WhatsApp Business API', 'bright');
console.log();
log('  1. Create a business account:', 'cyan');
log('     https://business.whatsapp.com/', 'yellow');
console.log();
log('  2. Get API credentials', 'cyan');
console.log();
log('  3. Add to .env file:', 'cyan');
log('     WHATSAPP_API_KEY=your_key_here', 'yellow');
console.log();

log('  OPTION 3: Simple SMS (No WhatsApp)', 'bright');
console.log();
log('  Use Twilio for SMS notifications:', 'cyan');
log('  1. Sign up: https://www.twilio.com/', 'yellow');
log('  2. Get your credentials', 'cyan');
log('  3. Add phone number to config', 'cyan');
console.log();

log('═'.repeat(70), 'cyan');
console.log();

log('  💡 FOR NOW: You can test without WhatsApp', 'yellow');
console.log();
log('  Notifications will show in:', 'cyan');
log('  • Dashboard (npm run server)', 'green');
log('  • Console logs', 'green');
log('  • job-{ID}.txt files', 'green');
console.log();

log('  📖 Full integration guide:', 'cyan');
log('  See MESSAGING-SETUP.md for detailed instructions', 'yellow');
console.log();

// Save a note to config
if (fs.existsSync('./my-clawshake-config.txt')) {
  const config = fs.readFileSync('./my-clawshake-config.txt', 'utf8');
  if (!config.includes('WHATSAPP_STATUS')) {
    fs.appendFileSync('./my-clawshake-config.txt', `\n# WhatsApp Connection\nWHATSAPP_STATUS=pending\nWHATSAPP_SETUP_DATE=${new Date().toISOString()}\n`);
    log('  ✅ Noted in config - complete setup when ready', 'green');
  }
}

console.log();
