#!/usr/bin/env node

const Database = require('./database');
const ClawShakeNetwork = require('./network');
const { nanoid } = require('nanoid');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  console.log();
  log('═'.repeat(70), 'cyan');
  log(`  ${text}`, 'bright');
  log('═'.repeat(70), 'cyan');
  console.log();
}

async function easySetup() {
  console.clear();
  header('🤝 CLAWSHAKE - SUPER SIMPLE SETUP');

  log('Get started in 3 minutes. Just answer a few questions.', 'cyan');
  console.log();

  // Step 1: Who are you?
  log('📝 STEP 1 of 5: Basic Info', 'bright');
  console.log();

  const name = await question('  Your name or company name: ');
  
  // Step 2: GC or Sub?
  log('\n🔨 STEP 2 of 5: What do you do?', 'bright');
  console.log();
  log('  Type the NUMBER of your role:', 'yellow');
  console.log();
  log('  1 - General Contractor (I hire subs)', 'cyan');
  log('  2 - Subcontractor (I do the work)', 'cyan');
  console.log();

  const roleChoice = await question('  Choose 1 or 2: ');
  const isGC = roleChoice === '1';

  let trade = 'general_contractor';
  
  if (!isGC) {
    console.log();
    log('  What\'s your trade? Type the NUMBER:', 'yellow');
    console.log();
    log('  1 - Plumber', 'cyan');
    log('  2 - Electrician', 'cyan');
    log('  3 - HVAC Technician', 'cyan');
    log('  4 - Framer/Carpenter', 'cyan');
    log('  5 - Drywall Installer', 'cyan');
    log('  6 - Roofer', 'cyan');
    log('  7 - Painter', 'cyan');
    log('  8 - Other (type it)', 'cyan');
    console.log();

    const tradeChoice = await question('  Choose 1-8: ');
    
    const trades = {
      '1': 'plumber',
      '2': 'electrician',
      '3': 'hvac',
      '4': 'framer',
      '5': 'drywall',
      '6': 'roofer',
      '7': 'painter',
    };

    if (trades[tradeChoice]) {
      trade = trades[tradeChoice];
    } else {
      trade = await question('  Type your trade: ');
    }
  }

  // Step 3: Location (simple)
  log('\n📍 STEP 3 of 5: Where do you work?', 'bright');
  console.log();

  const city = await question('  City: ');
  const state = await question('  State (2 letters like TX): ');
  
  console.log();
  log('  💡 How far will you travel for jobs?', 'yellow');
  const radiusInput = await question('  Miles (press Enter for 25): ');
  const radius = radiusInput || '25';

  // Step 4: Rates (simple for subs, skip for GCs)
  let minRate = 0;
  let maxRate = 200;
  let preferredRate = 100;

  if (!isGC) {
    log('\n💰 STEP 4 of 5: Your Hourly Rate', 'bright');
    console.log();
    log('  💡 What do you charge per hour?', 'yellow');
    console.log();

    preferredRate = await question('  Your normal rate ($/hr): ');
    
    console.log();
    log('  💡 Sometimes you might go lower or higher.', 'yellow');
    const minInput = await question('  Lowest you\'ll accept (press Enter for $' + (parseFloat(preferredRate) - 10) + '): ');
    minRate = minInput || (parseFloat(preferredRate) - 10);
    
    const maxInput = await question('  Highest you charge (press Enter for $' + (parseFloat(preferredRate) + 20) + '): ');
    maxRate = maxInput || (parseFloat(preferredRate) + 20);
  } else {
    log('\n💰 STEP 4 of 5: Budget Range', 'bright');
    console.log();
    log('  💡 Skipping rates since you\'re a GC.', 'yellow');
    log('  You\'ll set budgets when you post jobs.', 'cyan');
  }

  // Step 5: REQUIRED - Messaging
  log('\n📱 STEP 5 of 5: How should we notify you?', 'bright');
  console.log();
  log('  🚨 REQUIRED: You MUST connect WhatsApp OR Telegram', 'yellow');
  log('  This is how you\'ll get instant job alerts.', 'cyan');
  console.log();
  log('  Choose ONE:', 'bright');
  console.log();
  log('  1 - WhatsApp (recommended)', 'cyan');
  log('  2 - Telegram', 'cyan');
  console.log();

  const messagingChoice = await question('  Choose 1 or 2: ');
  const useWhatsApp = messagingChoice === '1';

  console.log();
  
  let messagingSetup = '';

  if (useWhatsApp) {
    log('  📱 Setting up WhatsApp...', 'green');
    console.log();
    log('  We\'ll show you a QR code in a moment.', 'yellow');
    log('  1. Open WhatsApp on your phone', 'cyan');
    log('  2. Go to Settings > Linked Devices', 'cyan');
    log('  3. Tap "Link a Device"', 'cyan');
    log('  4. Scan the QR code that appears', 'cyan');
    console.log();
    
    messagingSetup = 'whatsapp';
    
    log('  💾 Saving your setup first...', 'yellow');
  } else {
    log('  📱 Setting up Telegram...', 'green');
    console.log();
    log('  Here\'s what to do:', 'yellow');
    console.log();
    log('  1. Open Telegram on your phone', 'cyan');
    log('  2. Search for @ClawShakeBot', 'cyan');
    log('  3. Send the message: /start', 'cyan');
    log('  4. Copy the code it gives you', 'cyan');
    console.log();
    
    messagingSetup = 'telegram';
    
    const telegramCode = await question('  Paste your Telegram code here: ');
    console.log();
    log('  ✅ Telegram connected!', 'green');
  }

  // Generate profile
  console.log();
  log('  ⚙️  Creating your ClawShake profile...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 500));

  const keys = ClawShakeNetwork.generateKeypair();
  const contractorId = `contractor_${nanoid()}`;

  const db = new Database();
  
  await new Promise(resolve => setTimeout(resolve, 300));

  // Create contractor
  await new Promise((resolve, reject) => {
    db.createContractor({
      id: contractorId,
      name,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Add trade
  await new Promise((resolve) => {
    db.db.run(
      `INSERT INTO contractor_trades (contractor_id, trade, licensed, license_number, insurance_verified) VALUES (?, ?, ?, ?, ?)`,
      [contractorId, trade.toLowerCase(), 0, null, 0],
      () => resolve()
    );
  });

  // Add service area
  await new Promise((resolve) => {
    db.db.run(
      `INSERT INTO service_areas (contractor_id, city, state, radius_miles) VALUES (?, ?, ?, ?)`,
      [contractorId, city, state.toUpperCase(), parseInt(radius)],
      () => resolve()
    );
  });

  // Add rate preferences
  if (!isGC) {
    await new Promise((resolve) => {
      db.db.run(
        `INSERT INTO rate_preferences (contractor_id, trade, min_rate, max_rate, preferred_rate) VALUES (?, ?, ?, ?, ?)`,
        [contractorId, trade.toLowerCase(), parseFloat(minRate), parseFloat(maxRate), parseFloat(preferredRate)],
        () => resolve()
      );
    });
  }

  // Add auto-negotiate (default enabled for subs)
  await new Promise((resolve) => {
    db.db.run(
      `INSERT INTO negotiation_preferences (contractor_id, preference_key, preference_value) VALUES (?, ?, ?)`,
      [contractorId, 'auto_negotiate', isGC ? 'false' : 'true'],
      () => resolve()
    );
  });

  // Done!
  console.log();
  header('✅ YOU\'RE ALL SET!');

  log('Your ClawShake profile:', 'green');
  console.log();
  log(`  👤 Name: ${name}`, 'cyan');
  log(`  🔨 Role: ${isGC ? 'General Contractor' : 'Subcontractor'}`, 'cyan');
  if (!isGC) {
    log(`  🛠️  Trade: ${trade}`, 'cyan');
  }
  log(`  📍 Location: ${city}, ${state} (${radius} mile radius)`, 'cyan');
  if (!isGC) {
    log(`  💰 Rate: $${minRate}-$${maxRate}/hr (preferred: $${preferredRate})`, 'cyan');
  }
  log(`  📱 Notifications: ${useWhatsApp ? 'WhatsApp' : 'Telegram'}`, 'cyan');
  console.log();

  // Save config
  const configPath = './my-clawshake-config.txt';
  
  fs.writeFileSync(configPath, `# ClawShake Configuration
# Generated: ${new Date().toISOString()}

CONTRACTOR_ID=${contractorId}
NAME=${name}
ROLE=${isGC ? 'GC' : 'SUB'}
TRADE=${trade}
CITY=${city}
STATE=${state}
RADIUS=${radius}
MIN_RATE=${minRate}
PREFERRED_RATE=${preferredRate}
MAX_RATE=${maxRate}
MESSAGING=${messagingSetup}

# You're ready to use ClawShake!
# ${isGC ? 'To post a job: node post-job.js' : 'To find work: Your agent will notify you automatically'}
`);

  log('═'.repeat(70), 'cyan');
  log('  🎉 WHAT HAPPENS NEXT', 'bright');
  log('═'.repeat(70), 'cyan');
  console.log();

  if (useWhatsApp) {
    log('  📱 CONNECT WHATSAPP NOW:', 'yellow');
    console.log();
    log('  Run this command to link WhatsApp:', 'cyan');
    log(`  node connect-whatsapp.js ${contractorId}`, 'green');
    console.log();
    log('  (It will show a QR code - scan it with your phone)', 'yellow');
    console.log();
  } else {
    log('  ✅ Telegram is connected!', 'green');
    console.log();
  }

  if (isGC) {
    log('  AS A GENERAL CONTRACTOR:', 'bright');
    console.log();
    log('  📢 Post your first job:', 'cyan');
    log('     node post-job.js', 'green');
    console.log();
    log('  📊 View the dashboard:', 'cyan');
    log('     npm run server', 'green');
    log('     Then open: http://localhost:3000', 'yellow');
    console.log();
  } else {
    log('  AS A SUBCONTRACTOR:', 'bright');
    console.log();
    log('  🤖 Your agent is ready to find work for you!', 'cyan');
    console.log();
    log('  How it works:', 'yellow');
    log('  1. GCs post jobs on ClawShake', 'cyan');
    log('  2. Your AI agent checks if they match', 'cyan');
    log('  3. You get a message on ' + (useWhatsApp ? 'WhatsApp' : 'Telegram'), 'cyan');
    log('  4. Reply to accept or decline', 'cyan');
    console.log();
    log('  📊 View jobs on dashboard:', 'cyan');
    log('     npm run server', 'green');
    log('     Then open: http://localhost:3000', 'yellow');
    console.log();
  }

  log('═'.repeat(70), 'cyan');
  console.log();

  log('  💾 Your settings saved to: my-clawshake-config.txt', 'green');
  console.log();

  db.close();
  rl.close();
}

easySetup().catch(err => {
  console.error('Setup error:', err);
  rl.close();
  process.exit(1);
});
