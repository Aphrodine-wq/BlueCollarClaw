#!/usr/bin/env node

const Database = require('./database');
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
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loadContractorId() {
  if (fs.existsSync('./my-clawshake-config.txt')) {
    const config = fs.readFileSync('./my-clawshake-config.txt', 'utf8');
    const match = config.match(/CONTRACTOR_ID=(.+)/);
    if (match) return match[1];
  }
  return null;
}

async function postJob() {
  console.clear();
  console.log();
  log('═'.repeat(70), 'cyan');
  log('  📢 POST A JOB - Super Simple', 'bright');
  log('═'.repeat(70), 'cyan');
  console.log();

  // Load contractor ID
  const contractorId = await loadContractorId();
  
  if (!contractorId) {
    log('  ❌ You need to set up first!', 'yellow');
    console.log();
    log('  Run this command:', 'cyan');
    log('  node easy-setup.js', 'green');
    console.log();
    rl.close();
    return;
  }

  log('  Answer 5 quick questions about your job:', 'cyan');
  console.log();

  // Question 1: What trade?
  log('1️⃣  What kind of worker do you need?', 'bright');
  console.log();
  log('   Type the NUMBER:', 'yellow');
  console.log();
  log('   1 - Plumber', 'cyan');
  log('   2 - Electrician', 'cyan');
  log('   3 - HVAC Tech', 'cyan');
  log('   4 - Framer/Carpenter', 'cyan');
  log('   5 - Drywall Installer', 'cyan');
  log('   6 - Roofer', 'cyan');
  log('   7 - Painter', 'cyan');
  log('   8 - Other (type it)', 'cyan');
  console.log();

  const tradeChoice = await question('   Choose 1-8: ');
  
  const trades = {
    '1': 'plumber',
    '2': 'electrician',
    '3': 'hvac',
    '4': 'framer',
    '5': 'drywall',
    '6': 'roofer',
    '7': 'painter',
  };

  let trade;
  if (trades[tradeChoice]) {
    trade = trades[tradeChoice];
  } else {
    trade = await question('   Type the trade: ');
  }

  // Question 2: Where?
  console.log();
  log('2️⃣  Where is the job?', 'bright');
  console.log();
  const location = await question('   Full address or city: ');

  // Question 3: When?
  console.log();
  log('3️⃣  When do you need them?', 'bright');
  console.log();
  log('   💡 Format: YYYY-MM-DD (like 2026-02-20)', 'yellow');
  console.log();
  const startDate = await question('   Start date: ');
  const endDate = await question('   End date (or same as start): ');

  // Question 4: Budget?
  console.log();
  log('4️⃣  What\'s your budget per hour?', 'bright');
  console.log();
  log('   💡 Give a range - subs will negotiate', 'yellow');
  console.log();
  const minRate = await question('   Minimum ($/hr): ');
  const maxRate = await question('   Maximum ($/hr): ');

  // Question 5: What's the job?
  console.log();
  log('5️⃣  Describe the work:', 'bright');
  console.log();
  log('   💡 Be specific - helps subs decide', 'yellow');
  console.log();
  const scope = await question('   What needs to be done: ');

  // Summary
  console.log();
  log('═'.repeat(70), 'cyan');
  log('  📋 YOUR JOB POST', 'bright');
  log('═'.repeat(70), 'cyan');
  console.log();
  log(`  Trade: ${trade}`, 'cyan');
  log(`  Location: ${location}`, 'cyan');
  log(`  Dates: ${startDate} to ${endDate}`, 'cyan');
  log(`  Budget: $${minRate}-$${maxRate}/hr`, 'cyan');
  log(`  Scope: ${scope}`, 'cyan');
  console.log();

  const confirm = await question('  ✅ Post this job? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    log('\n  ❌ Job cancelled.', 'yellow');
    rl.close();
    return;
  }

  // Create job in database
  console.log();
  log('  📡 Broadcasting to ClawShake network...', 'yellow');

  const db = new Database();
  await new Promise(resolve => setTimeout(resolve, 200));

  const requestId = `req_${nanoid()}`;

  await new Promise((resolve, reject) => {
    db.createJobRequest({
      id: requestId,
      requesterId: contractorId,
      trade: trade.toLowerCase(),
      location,
      latitude: null,
      longitude: null,
      startDate,
      endDate,
      minRate: parseFloat(minRate),
      maxRate: parseFloat(maxRate),
      scope,
      requirements: '',
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log();
  log('═'.repeat(70), 'cyan');
  log('  ✅ JOB POSTED!', 'bright');
  log('═'.repeat(70), 'cyan');
  console.log();

  log(`  📋 Job ID: ${requestId}`, 'green');
  console.log();

  log('  🎯 What happens next:', 'bright');
  console.log();
  log('  1. Subs in your area see your job', 'cyan');
  log('  2. Their AI agents check if they match', 'cyan');
  log('  3. You get offers on WhatsApp/Telegram', 'cyan');
  log('  4. Pick the best one and book!', 'cyan');
  console.log();

  log('  📱 CHECK FOR OFFERS:', 'bright');
  console.log();
  log('  • You\'ll get messages as offers come in', 'cyan');
  log('  • Or view dashboard: npm run server', 'cyan');
  log('  • Or check API: http://localhost:3000/api/requests/' + requestId + '/offers', 'yellow');
  console.log();

  log('═'.repeat(70), 'cyan');
  console.log();

  // Save request details
  const requestFile = `./job-${requestId}.txt`;
  fs.writeFileSync(requestFile, `ClawShake Job Request
Created: ${new Date().toISOString()}

JOB ID: ${requestId}
Trade: ${trade}
Location: ${location}
Dates: ${startDate} to ${endDate}
Budget: $${minRate}-$${maxRate}/hr
Scope: ${scope}

View offers:
http://localhost:3000/api/requests/${requestId}/offers

Dashboard:
http://localhost:3000
`);

  log(`  💾 Job details saved to: ${requestFile}`, 'green');
  console.log();

  db.close();
  rl.close();
}

postJob().catch(err => {
  console.error('Error posting job:', err);
  rl.close();
  process.exit(1);
});
