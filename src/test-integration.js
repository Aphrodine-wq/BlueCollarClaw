#!/usr/bin/env node

/**
 * BlueCollarClaw Integration Test
 * Verifies all new components work together
 */

const assert = require('assert');
const path = require('path');

console.log('🧪 BlueCollarClaw Integration Test');
console.log('=====================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    testsFailed++;
  }
}

// Test 1: Database module loads
test('Database module loads', () => {
  const Database = require('./database');
  assert(Database, 'Database module should export a class');
});

// Test 2: Message Handler loads
test('MessageHandler module loads', () => {
  const MessageHandler = require('./message-handler');
  assert(MessageHandler, 'MessageHandler should be defined');
});

// Test 3: Natural Language Parser loads
test('NaturalLanguageParser module loads', () => {
  const NaturalLanguageParser = require('./message-parser');
  const parser = new NaturalLanguageParser();
  assert(parser, 'Parser should instantiate');
});

// Test 4: Contract Generator loads
test('ContractGenerator module loads', () => {
  const ContractGenerator = require('./contracts');
  const gen = new ContractGenerator();
  assert(gen, 'ContractGenerator should instantiate');
});

// Test 5: Email Service loads
test('EmailService module loads', () => {
  const EmailService = require('./email-service');
  const email = new EmailService();
  assert(email, 'EmailService should instantiate');
});

// Test 6: Negotiation Engine loads
test('NegotiationEngine module loads', () => {
  const NegotiationEngine = require('./negotiation');
  const engine = new NegotiationEngine({}, 'test-id');
  assert(engine, 'NegotiationEngine should instantiate');
});

// Test 7: PostgreSQL Database adapter loads
test('PostgresDatabase module loads', () => {
  const PostgresDatabase = require('./database-postgres');
  assert(PostgresDatabase, 'PostgresDatabase should be defined');
});

// Test 8: Config loads
test('Config module loads', () => {
  const config = require('./config');
  assert(config, 'Config should be defined');
  assert(config.telegramToken !== undefined, 'Config should have telegramToken');
});

// Test 9: Server exports proper structure
test('Server exports app and server', () => {
  const { app, server, broadcast } = require('./server');
  assert(app, 'Server should export app');
  assert(server, 'Server should export server');
  assert(typeof broadcast === 'function', 'Server should export broadcast function');
});

// Test 10: Message parsing works
test('Message parsing works', () => {
  const NaturalLanguageParser = require('./message-parser');
  const parser = new NaturalLanguageParser();
  
  const result = parser.parse('I need a plumber tomorrow for $80/hr in Austin, TX');
  
  assert(result.trade === 'plumber', 'Should detect plumber trade');
  assert(result.minRate === 70, 'Should parse min rate');
  assert(result.maxRate === 90, 'Should parse max rate');
  assert(result.location === 'Austin, TX', 'Should parse location');
});

// Test 11: Message handler session management
test('MessageHandler session management', () => {
  const MessageHandler = require('./message-handler');
  const handler = new MessageHandler();
  
  handler.sessions.set('test-user', {
    type: 'job_draft',
    data: { trade: 'plumber' },
    timestamp: Date.now()
  });
  
  assert(handler.sessions.has('test-user'), 'Session should be stored');
});

// Test 12: Database schema includes new tables
test('Database has required tables', async () => {
  const Database = require('./database');
  const db = new Database('./test-integration.db');
  
  // Wait for schema initialization
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const tables = await new Promise((resolve, reject) => {
    db.db.all(
      "SELECT name FROM sqlite_master WHERE type='table'",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
      }
    );
  });
  
  assert(tables.includes('contractors'), 'Should have contractors table');
  assert(tables.includes('users'), 'Should have users table');
  assert(tables.includes('job_requests'), 'Should have job_requests table');
  assert(tables.includes('offers'), 'Should have offers table');
  assert(tables.includes('bookings'), 'Should have bookings table');
  assert(tables.includes('telegram_users'), 'Should have telegram_users table');
  assert(tables.includes('email_notifications'), 'Should have email_notifications table');
  
  db.close();
});

// Run tests
async function runTests() {
  // Wait for async tests
  await new Promise(resolve => setTimeout(resolve, 600));
  
  console.log('\n=====================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

runTests();
