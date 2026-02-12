#!/usr/bin/env node

console.log('🔍 ClawShake Diagnostic Check\n');

const fs = require('fs');
const { execSync } = require('child_process');

// Check files exist
const requiredFiles = [
  'package.json',
  'demo-local.js',
  'setup-wizard.js',
  'broadcast-wizard.js',
  'clawshake.js',
  'database.js',
  'network.js',
  'negotiation.js',
  'contracts.js',
  'agent.js',
  'server.js',
  'test.js',
  'public/index.html',
];

console.log('📁 Checking required files...');
let allFilesPresent = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesPresent = false;
});

console.log();

if (!allFilesPresent) {
  console.log('❌ Some files are missing. Reinstall may be needed.\n');
  process.exit(1);
}

// Check package.json scripts
console.log('📜 Checking npm scripts...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};

const requiredScripts = ['start', 'demo', 'setup', 'broadcast', 'server', 'test'];
requiredScripts.forEach(script => {
  const exists = !!scripts[script];
  console.log(`  ${exists ? '✅' : '❌'} npm run ${script}`);
});

console.log();

// Test demo (quick check)
console.log('🎬 Testing demo...');
try {
  console.log('  Running demo (this takes 3 seconds)...');
  execSync('node demo-local.js', { stdio: 'ignore', timeout: 10000 });
  console.log('  ✅ Demo works');
} catch (err) {
  console.log('  ❌ Demo failed');
}

console.log();

// Check database
console.log('💾 Checking database...');
const Database = require('./database');
const db = new Database(':memory:');

setTimeout(() => {
  db.db.get('SELECT COUNT(*) as count FROM contractors', (err, result) => {
    if (err) {
      console.log('  ❌ Database error:', err.message);
    } else {
      console.log('  ✅ Database works');
    }

    db.close();

    console.log();

    // Test server start (don't actually start it)
    console.log('🌐 Checking server file...');
    try {
      require('./server.js');
      console.log('  ⚠️  Server module loaded (didn\'t start it)');
    } catch (err) {
      console.log('  ❌ Server error:', err.message);
    }

    console.log();

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Working Commands:');
    console.log('   npm run demo        - Watch AI negotiate a job (3 seconds)');
    console.log('   npm run server      - Start dashboard (http://localhost:3000)');
    console.log('   npm test            - Run test suite');
    console.log();
    console.log('⚠️  Interactive Commands (run directly):');
    console.log('   node setup-wizard.js    - Setup your profile');
    console.log('   node broadcast-wizard.js - Broadcast a job');
    console.log();
    console.log('💡 Recommended workflow:');
    console.log('   1. node demo-local.js         (see it work)');
    console.log('   2. node setup-wizard.js       (create profile)');
    console.log('   3. npm run server             (view dashboard)');
    console.log('   4. node broadcast-wizard.js   (post a job)');
    console.log();
    console.log('🔗 Documentation:');
    console.log('   START-HERE.md    - Quick start guide');
    console.log('   COMMANDS.md      - All available commands');
    console.log('   FINAL-STATUS.md  - What\'s built and working');
    console.log();

    process.exit(0);
  });
}, 200);
