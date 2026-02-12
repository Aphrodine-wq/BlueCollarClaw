#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
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

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner() {
  console.clear();
  console.log();
  log('  ╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('  ║                                                       ║', 'cyan');
  log('  ║               🤝  C L A W S H A K E                   ║', 'bright');
  log('  ║                                                       ║', 'cyan');
  log('  ║      Autonomous Contractor Negotiation Protocol      ║', 'cyan');
  log('  ║                                                       ║', 'cyan');
  log('  ╚═══════════════════════════════════════════════════════╝', 'cyan');
  console.log();
}

async function mainMenu() {
  banner();

  log('  What would you like to do?', 'bright');
  console.log();

  log('  1 - 🎬 Run Demo', 'cyan');
  log('      Watch AI agents negotiate a plumbing job in 3 seconds', 'yellow');
  console.log();

  log('  2 - ⚙️  Setup New Profile', 'cyan');
  log('      Create your contractor profile (60 seconds)', 'yellow');
  console.log();

  log('  3 - 📢 Broadcast Job Request', 'cyan');
  log('      Find a subcontractor for your project', 'yellow');
  console.log();

  log('  4 - 🌐 Start Web Dashboard', 'cyan');
  log('      View live stats and bookings (http://localhost:3000)', 'yellow');
  console.log();

  log('  5 - 🧪 Run Tests', 'cyan');
  log('      Verify everything works (13 automated tests)', 'yellow');
  console.log();

  log('  6 - 📚 View Documentation', 'cyan');
  log('      Open README, QUICKSTART, or ROADMAP', 'yellow');
  console.log();

  log('  7 - 📊 Check Status', 'cyan');
  log('      Database stats and system health', 'yellow');
  console.log();

  log('  0 - ❌ Exit', 'cyan');
  console.log();

  const choice = await question('  Enter your choice (0-7): ');

  switch (choice.trim()) {
    case '1':
      await runDemo();
      break;
    case '2':
      await setupProfile();
      break;
    case '3':
      await broadcastJob();
      break;
    case '4':
      await startDashboard();
      break;
    case '5':
      await runTests();
      break;
    case '6':
      await viewDocs();
      break;
    case '7':
      await checkStatus();
      break;
    case '0':
      log('\n  👋 Thanks for using BlueCollarClaw!\n', 'green');
      rl.close();
      process.exit(0);
      break;
    default:
      log('\n  ❌ Invalid choice. Try again.\n', 'red');
      await new Promise(resolve => setTimeout(resolve, 1500));
      await mainMenu();
  }
}

async function runDemo() {
  console.log();
  log('  🎬 Starting BlueCollarClaw demo...', 'green');
  console.log();

  exec('node demo-local.js', (error, stdout, stderr) => {
    if (error) {
      log(`  ❌ Error: ${error.message}`, 'red');
      return;
    }
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    setTimeout(async () => {
      await question('\n  Press Enter to return to menu...');
      await mainMenu();
    }, 500);
  });
}

async function setupProfile() {
  console.log();
  log('  ⚙️  Launching setup wizard...', 'green');
  log('  (Running in new window - check your terminal)', 'yellow');
  console.log();

  const { spawn } = require('child_process');
  const child = spawn('node', ['setup-wizard.js'], {
    stdio: 'inherit'
  });

  child.on('close', async (code) => {
    await question('\n  Press Enter to return to menu...');
    await mainMenu();
  });
}

async function broadcastJob() {
  console.log();
  log('  📢 Launching broadcast wizard...', 'green');
  log('  (Running in new window - check your terminal)', 'yellow');
  console.log();

  const { spawn } = require('child_process');
  const child = spawn('node', ['broadcast-wizard.js'], {
    stdio: 'inherit'
  });

  child.on('close', async (code) => {
    await question('\n  Press Enter to return to menu...');
    await mainMenu();
  });
}

async function startDashboard() {
  console.log();
  log('  🌐 Starting web dashboard...', 'green');
  log('  Open http://localhost:3000 in your browser', 'cyan');
  console.log();
  log('  Press Ctrl+C to stop the server', 'yellow');
  console.log();

  const child = exec('node server.js');
  
  child.stdout.on('data', (data) => {
    console.log(data);
  });

  child.stderr.on('data', (data) => {
    console.error(data);
  });

  child.on('close', async (code) => {
    log(`\n  Server stopped (exit code ${code})`, 'yellow');
    await question('\n  Press Enter to return to menu...');
    await mainMenu();
  });
}

async function runTests() {
  console.log();
  log('  🧪 Running test suite...', 'green');
  console.log();

  exec('node test.js', (error, stdout, stderr) => {
    if (error) {
      console.log(stdout);
      log(`\n  ⚠️  Some tests failed (exit code ${error.code})`, 'yellow');
    } else {
      console.log(stdout);
      log('\n  ✅ All tests passed!', 'green');
    }
    
    setTimeout(async () => {
      await question('\n  Press Enter to return to menu...');
      await mainMenu();
    }, 500);
  });
}

async function viewDocs() {
  console.log();
  log('  📚 Available Documentation:', 'bright');
  console.log();
  log('  1 - README.md (Product Vision & Monetization)', 'cyan');
  log('  2 - QUICKSTART.md (Get Started in 5 Minutes)', 'cyan');
  log('  3 - ROADMAP.md (Development Plan)', 'cyan');
  log('  4 - ARCHITECTURE.md (Technical Deep-Dive)', 'cyan');
  log('  5 - FINAL-STATUS.md (What\'s Built & Working)', 'cyan');
  log('  0 - Back to main menu', 'cyan');
  console.log();

  const choice = await question('  Choose a document (0-5): ');

  const docs = {
    '1': 'README.md',
    '2': 'QUICKSTART.md',
    '3': 'ROADMAP.md',
    '4': 'ARCHITECTURE.md',
    '5': 'FINAL-STATUS.md',
  };

  if (docs[choice]) {
    console.log();
    log(`  📖 Opening ${docs[choice]}...`, 'green');
    console.log();

    if (fs.existsSync(docs[choice])) {
      const content = fs.readFileSync(docs[choice], 'utf8');
      const lines = content.split('\n').slice(0, 50); // First 50 lines
      console.log(lines.join('\n'));
      console.log();
      log(`  ... (showing first 50 lines)`, 'yellow');
      log(`  Read the full file: cat ${docs[choice]}`, 'cyan');
    } else {
      log(`  ❌ File not found: ${docs[choice]}`, 'red');
    }

    await question('\n  Press Enter to return to menu...');
  }

  await mainMenu();
}

async function checkStatus() {
  console.log();
  log('  📊 BlueCollarClaw System Status', 'bright');
  console.log();

  const Database = require('./database');
  const db = new Database();

  await new Promise(resolve => setTimeout(resolve, 200));

  // Count contractors
  db.db.get('SELECT COUNT(*) as count FROM contractors', (err, result) => {
    log(`  👥 Contractors: ${result?.count || 0}`, 'cyan');

    // Count job requests
    db.db.get('SELECT COUNT(*) as count FROM job_requests', (err, result) => {
      log(`  📋 Job Requests: ${result?.count || 0}`, 'cyan');

      // Count bookings
      db.db.get('SELECT COUNT(*) as count FROM bookings', (err, result) => {
        log(`  🤝 Bookings: ${result?.count || 0}`, 'cyan');

        // Check files
        console.log();
        log('  📁 Generated Files:', 'bright');
        
        const dbExists = fs.existsSync('./BlueCollarClaw.db') || fs.existsSync('./demo.db');
        log(`  Database: ${dbExists ? '✅ Present' : '❌ Not found'}`, dbExists ? 'green' : 'red');

        const contractsExist = fs.existsSync('./contracts') && fs.readdirSync('./contracts').length > 0;
        log(`  Contracts: ${contractsExist ? '✅ Present' : '❌ None generated'}`, contractsExist ? 'green' : 'yellow');

        const configExists = fs.existsSync('./my-BlueCollarClaw-config.txt');
        log(`  Config: ${configExists ? '✅ Present' : '❌ Run setup first'}`, configExists ? 'green' : 'yellow');

        db.close();

        setTimeout(async () => {
          await question('\n  Press Enter to return to menu...');
          await mainMenu();
        }, 500);
      });
    });
  });
}

// Start the app
mainMenu();
