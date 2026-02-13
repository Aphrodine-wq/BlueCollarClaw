#!/usr/bin/env node

const createDatabase = require('./db-factory');
const BlueCollarClawAgent = require('./agent');
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
  log('═'.repeat(60), 'cyan');
  log(`  ${text}`, 'bright');
  log('═'.repeat(60), 'cyan');
  console.log();
}

async function loadContractorId() {
  // Try to load from config file
  if (fs.existsSync('./my-BlueCollarClaw-config.txt')) {
    const config = fs.readFileSync('./my-BlueCollarClaw-config.txt', 'utf8');
    const match = config.match(/CONTRACTOR_ID=(.+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

async function broadcastWizard() {
  header('📢 BROADCAST JOB REQUEST');

  log('Find the perfect subcontractor in seconds.', 'cyan');
  console.log();

  // Load contractor ID
  let contractorId = await loadContractorId();

  if (!contractorId) {
    contractorId = await question('  Your Contractor ID: ');
  } else {
    log(`  Using Contractor ID: ${contractorId}`, 'green');
    const confirm = await question('  Is this correct? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      contractorId = await question('  Enter Contractor ID: ');
    }
  }

  console.log();
  log('STEP 1: What trade do you need?', 'bright');
  console.log();
  log('  Examples: plumber, electrician, hvac, framer, drywall, roofer', 'cyan');
  console.log();

  const trade = await question('  Trade: ');

  log('\nSTEP 2: Job location', 'bright');
  console.log();

  const location = await question('  Full address or city: ');

  log('\nSTEP 3: Timeline', 'bright');
  console.log();
  log('  Format: YYYY-MM-DD', 'cyan');
  console.log();

  const startDate = await question('  Start date: ');
  const endDate = await question('  End date: ');

  log('\nSTEP 4: Budget', 'bright');
  console.log();

  const minRate = await question('  Minimum rate ($/hr): ');
  const maxRate = await question('  Maximum rate ($/hr): ');

  log('\nSTEP 5: Scope of work', 'bright');
  console.log();

  const scope = await question('  Description: ');

  log('\nSTEP 6: Requirements (optional)', 'bright');
  console.log();
  log('  Examples: licensed, insured, background check', 'cyan');
  console.log();

  const requirements = await question('  Requirements (comma-separated): ');

  // Summary
  header('📋 REQUEST SUMMARY');

  log(`  Trade: ${trade}`, 'cyan');
  log(`  Location: ${location}`, 'cyan');
  log(`  Dates: ${startDate} to ${endDate}`, 'cyan');
  log(`  Rate: $${minRate}-$${maxRate}/hr`, 'cyan');
  log(`  Scope: ${scope}`, 'cyan');
  if (requirements) {
    log(`  Requirements: ${requirements}`, 'cyan');
  }
  console.log();

  const confirm = await question('  Broadcast this request? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    log('\n  ❌ Broadcast cancelled.', 'yellow');
    rl.close();
    return;
  }

  // Create request in database
  log('\n  📡 Broadcasting to BlueCollarClaw network...', 'yellow');

  const db = createDatabase();
  await new Promise(resolve => setTimeout(resolve, 200));

  const requestId = `req_${nanoid()}`;

  await new Promise((resolve, reject) => {
    db.createJobRequest({
      id: requestId,
      requesterId: contractorId,
      trade: trade.toLowerCase(),
      location,
      latitude: null, // TODO: Geocode in production
      longitude: null,
      startDate,
      endDate,
      minRate: parseFloat(minRate),
      maxRate: parseFloat(maxRate),
      scope,
      requirements: requirements || '',
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  header('✅ REQUEST BROADCASTED!');

  log(`  Request ID: ${requestId}`, 'green');
  console.log();

  log('  🎯 Your request is now live on the BlueCollarClaw network.', 'cyan');
  log('  🤖 Matching agents will auto-evaluate and respond.', 'cyan');
  log('  📬 You\'ll receive offers as they come in.', 'cyan');
  console.log();

  log('  NEXT STEPS:', 'bright');
  console.log();
  log('  1. View offers in the dashboard:', 'cyan');
  log('     http://localhost:3000', 'yellow');
  console.log();
  log('  2. Or check via API:', 'cyan');
  log(`     curl http://localhost:3000/api/requests/${requestId}/offers`, 'yellow');
  console.log();
  log('  3. Listen for responses (if you have an agent running):', 'cyan');
  log(`     node cli.js listen ${contractorId}`, 'yellow');
  console.log();

  log('═'.repeat(60), 'cyan');
  console.log();

  // Save request details to file
  const requestFile = `./request-${requestId}.txt`;
  fs.writeFileSync(requestFile, `# BlueCollarClaw Job Request
# ID: ${requestId}
# Created: ${new Date().toISOString()}

TRADE=${trade}
LOCATION=${location}
START_DATE=${startDate}
END_DATE=${endDate}
MIN_RATE=${minRate}
MAX_RATE=${maxRate}
SCOPE=${scope}
REQUIREMENTS=${requirements}

# View offers:
curl http://localhost:3000/api/requests/${requestId}/offers

# Accept an offer (replace OFFER_ID):
# curl -X POST http://localhost:3000/api/offers/OFFER_ID/accept
`);

  log(`  💾 Request saved to: ${requestFile}`, 'green');
  console.log();

  db.close();
  rl.close();
}

broadcastWizard().catch(err => {
  console.error('Broadcast error:', err);
  rl.close();
  process.exit(1);
});
