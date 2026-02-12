#!/usr/bin/env node

const Database = require('./database');
const BlueCollarClawNetwork = require('./network');
const { nanoid } = require('nanoid');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Color codes for terminal
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
  log('═'.repeat(60), 'cyan');
  log(`  ${text}`, 'bright');
  log('═'.repeat(60), 'cyan');
  console.log();
}

async function setup() {
  header('🤝 BlueCollarClaw SETUP WIZARD');

  log('Welcome to BlueCollarClaw! Let\'s get you set up in 60 seconds.', 'cyan');
  console.log();

  // Step 1: Who are you?
  log('STEP 1: Tell us about yourself', 'bright');
  console.log();

  const name = await question('  Company/Contractor Name: ');
  
  // Step 2: What do you do?
  log('\nSTEP 2: What\'s your primary trade?', 'bright');
  console.log();
  log('  Common trades:', 'cyan');
  log('    • Plumber', 'yellow');
  log('    • Electrician', 'yellow');
  log('    • HVAC Technician', 'yellow');
  log('    • Framer/Carpenter', 'yellow');
  log('    • Drywall Installer', 'yellow');
  log('    • General Contractor', 'yellow');
  log('    • Roofer', 'yellow');
  log('    • Painter', 'yellow');
  console.log();

  const trade = await question('  Your trade: ');

  // Step 3: Where do you work?
  log('\nSTEP 3: Service area', 'bright');
  console.log();

  const city = await question('  City: ');
  const state = await question('  State (2-letter code, e.g., TX): ');
  const radiusDefault = await question('  Service radius in miles (default: 25): ');
  const radius = radiusDefault || '25';

  // Step 4: Rates
  log('\nSTEP 4: Your hourly rates', 'bright');
  console.log();
  log('  💡 Tip: Set a range. BlueCollarClaw will auto-negotiate within it.', 'cyan');
  console.log();

  const minRate = await question('  Minimum rate ($/hr): ');
  const preferredRate = await question('  Preferred rate ($/hr): ');
  const maxRate = await question('  Maximum rate ($/hr): ');

  // Step 5: Licensing
  log('\nSTEP 5: Licensing & Insurance (optional but recommended)', 'bright');
  console.log();

  const hasLicense = await question('  Are you licensed? (y/n): ');
  let licenseNumber = null;
  if (hasLicense.toLowerCase() === 'y') {
    licenseNumber = await question('  License number: ');
  }

  const hasInsurance = await question('  Do you have liability insurance? (y/n): ');

  // Step 6: Preferences
  log('\nSTEP 6: Agent preferences', 'bright');
  console.log();
  log('  🤖 BlueCollarClaw can auto-respond to job requests for you.', 'cyan');
  console.log();

  const autoNegotiate = await question('  Enable auto-negotiation? (y/n, default: y): ');
  const autoAccept = await question('  Auto-accept perfect matches? (y/n, default: n): ');

  // Generate profile
  log('\n⚙️  Generating your BlueCollarClaw profile...', 'yellow');

  const keys = BlueCollarClawNetwork.generateKeypair();
  const contractorId = `contractor_${nanoid()}`;

  const db = new Database();
  
  await new Promise(resolve => setTimeout(resolve, 300)); // Wait for DB init

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
      [contractorId, trade.toLowerCase(), hasLicense.toLowerCase() === 'y' ? 1 : 0, licenseNumber, hasInsurance.toLowerCase() === 'y' ? 1 : 0],
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
  await new Promise((resolve) => {
    db.db.run(
      `INSERT INTO rate_preferences (contractor_id, trade, min_rate, max_rate, preferred_rate) VALUES (?, ?, ?, ?, ?)`,
      [contractorId, trade.toLowerCase(), parseFloat(minRate), parseFloat(maxRate), parseFloat(preferredRate)],
      () => resolve()
    );
  });

  // Add negotiation preferences
  await new Promise((resolve) => {
    db.db.run(
      `INSERT INTO negotiation_preferences (contractor_id, preference_key, preference_value) VALUES (?, ?, ?)`,
      [contractorId, 'auto_negotiate', autoNegotiate.toLowerCase() === 'y' || autoNegotiate === '' ? 'true' : 'false'],
      () => resolve()
    );
  });

  await new Promise((resolve) => {
    db.db.run(
      `INSERT INTO negotiation_preferences (contractor_id, preference_key, preference_value) VALUES (?, ?, ?)`,
      [contractorId, 'auto_accept', autoAccept.toLowerCase() === 'y' ? 'true' : 'false'],
      () => resolve()
    );
  });

  // Done!
  header('✅ SETUP COMPLETE!');

  log('Your BlueCollarClaw profile is ready:', 'green');
  console.log();
  log(`  👤 Name: ${name}`, 'cyan');
  log(`  🔨 Trade: ${trade}`, 'cyan');
  log(`  📍 Location: ${city}, ${state} (${radius} mile radius)`, 'cyan');
  log(`  💰 Rate Range: $${minRate}-$${maxRate}/hr (preferred: $${preferredRate})`, 'cyan');
  log(`  ✅ Licensed: ${hasLicense.toLowerCase() === 'y' ? 'Yes' : 'No'}`, 'cyan');
  log(`  🛡️  Insured: ${hasInsurance.toLowerCase() === 'y' ? 'Yes' : 'No'}`, 'cyan');
  log(`  🤖 Auto-negotiate: ${autoNegotiate.toLowerCase() === 'y' || autoNegotiate === '' ? 'Enabled' : 'Disabled'}`, 'cyan');
  console.log();

  log('═'.repeat(60), 'cyan');
  log('  IMPORTANT: Save this Contractor ID', 'bright');
  log('═'.repeat(60), 'cyan');
  console.log();
  log(`  ${contractorId}`, 'green');
  console.log();
  log('  You\'ll need this to start your agent and manage your profile.', 'yellow');
  console.log();

  // Save to config file for convenience
  const fs = require('fs');
  const configPath = './my-BlueCollarClaw-config.txt';
  
  fs.writeFileSync(configPath, `# BlueCollarClaw Configuration
# Generated: ${new Date().toISOString()}

CONTRACTOR_ID=${contractorId}
NAME=${name}
TRADE=${trade}
CITY=${city}
STATE=${state}
RADIUS=${radius}
MIN_RATE=${minRate}
PREFERRED_RATE=${preferredRate}
MAX_RATE=${maxRate}
LICENSED=${hasLicense.toLowerCase() === 'y'}
INSURED=${hasInsurance.toLowerCase() === 'y'}
AUTO_NEGOTIATE=${autoNegotiate.toLowerCase() === 'y' || autoNegotiate === ''}
AUTO_ACCEPT=${autoAccept.toLowerCase() === 'y'}

# Quick Commands
# Start listening for jobs:
#   node cli.js listen ${contractorId}
#
# Broadcast a job request:
#   node cli.js broadcast ${contractorId}
#
# View your profile:
#   curl http://localhost:3000/api/contractors/${contractorId}
`);

  log(`  💾 Config saved to: ${configPath}`, 'green');
  console.log();

  header('🚀 NEXT STEPS');

  log('1. Start the web dashboard:', 'bright');
  log('   npm run server', 'cyan');
  log('   Then open: http://localhost:3000', 'yellow');
  console.log();

  log('2. Start listening for job requests:', 'bright');
  log(`   node cli.js listen ${contractorId}`, 'cyan');
  console.log();

  log('3. Or broadcast a job request (if you\'re a GC):', 'bright');
  log(`   node cli.js broadcast ${contractorId}`, 'cyan');
  console.log();

  log('4. View live stats:', 'bright');
  log('   Open http://localhost:3000/api/analytics', 'cyan');
  console.log();

  log('═'.repeat(60), 'cyan');
  log('  Welcome to BlueCollarClaw! 🤝', 'green');
  log('═'.repeat(60), 'cyan');
  console.log();

  db.close();
  rl.close();
}

setup().catch(err => {
  console.error('Setup error:', err);
  rl.close();
  process.exit(1);
});
