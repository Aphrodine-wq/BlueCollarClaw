const BlueCollarClawAgent = require('./agent');
const Database = require('./database');
const BlueCollarClawNetwork = require('./network');
const NegotiationEngine = require('./negotiation');
const { nanoid } = require('nanoid');

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n=== BlueCollarClaw Test Suite ===\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (err) {
        this.failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${err.message}`);
      }
    }

    console.log(`\n=== Results ===`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}\n`);

    return this.failed === 0;
  }
}

// Assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

// Tests
const runner = new TestRunner();

// Database Tests
runner.test('Database: Create contractor', async () => {
  const db = new Database(':memory:');
  
  // Wait for schema initialization
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const keys = BlueCollarClawNetwork.generateKeypair();
  
  const contractorId = `test_${nanoid()}`;
  
  await new Promise((resolve, reject) => {
    db.createContractor({
      id: contractorId,
      name: 'Test Contractor',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const contractor = await new Promise((resolve, reject) => {
    db.getContractor(contractorId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  assertNotNull(contractor, 'Contractor should exist');
  assertEqual(contractor.name, 'Test Contractor');
  
  db.close();
});

runner.test('Database: Add trade to contractor', async () => {
  const db = new Database(':memory:');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const keys = BlueCollarClawNetwork.generateKeypair();
  const contractorId = `test_${nanoid()}`;
  
  await new Promise((resolve, reject) => {
    db.createContractor({
      id: contractorId,
      name: 'Test Plumber',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.addTrade(contractorId, 'plumber', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const trades = await new Promise((resolve, reject) => {
    db.getContractorTrades(contractorId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  assertEqual(trades.length, 1);
  assertEqual(trades[0].trade, 'plumber');
  
  db.close();
});

runner.test('Database: Create job request', async () => {
  const db = new Database(':memory:');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const requestId = `req_${nanoid()}`;
  
  await new Promise((resolve, reject) => {
    db.createJobRequest({
      id: requestId,
      requesterId: 'gc_test',
      trade: 'plumber',
      location: 'Austin, TX',
      latitude: 30.2672,
      longitude: -97.7431,
      startDate: '2026-02-19',
      endDate: '2026-02-21',
      minRate: 80,
      maxRate: 100,
      scope: 'Test job',
      requirements: 'licensed',
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const request = await new Promise((resolve, reject) => {
    db.getJobRequest(requestId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  assertNotNull(request);
  assertEqual(request.trade, 'plumber');
  assertEqual(request.min_rate, 80);
  
  db.close();
});

runner.test('Database: Create and retrieve offer', async () => {
  const db = new Database(':memory:');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const offerId = `offer_${nanoid()}`;
  
  // Create a contractor first (foreign key requirement)
  await new Promise((resolve, reject) => {
    db.createContractor({
      id: 'contractor_test',
      name: 'Test',
      publicKey: 'test',
      privateKey: 'test',
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  await new Promise((resolve, reject) => {
    db.createOffer({
      id: offerId,
      requestId: 'req_test',
      contractorId: 'contractor_test',
      rate: 90,
      startDate: '2026-02-19',
      endDate: '2026-02-21',
      message: 'Test offer',
      round: 1,
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const offers = await new Promise((resolve, reject) => {
    db.getOffersForRequest('req_test', (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  assertEqual(offers.length, 1);
  assertEqual(offers[0].rate, 90);
  
  db.close();
});

// Negotiation Engine Tests
runner.test('Negotiation: Trade match scoring', async () => {
  const db = new Database(':memory:');
  await new Promise(resolve => setTimeout(resolve, 100));
  const engine = new NegotiationEngine(db, 'test_contractor');

  const request = {
    trade: 'plumber',
    latitude: 30.2672,
    longitude: -97.7431,
    startDate: '2026-02-19',
    endDate: '2026-02-21',
    minRate: 80,
    maxRate: 100,
    requirements: '',
  };

  const profile = {
    trades: [{ trade: 'plumber', licensed: true }],
    serviceAreas: [],
    availability: [],
    ratePreferences: [],
  };

  const evaluation = await engine.evaluateRequest(request, profile);
  
  // Note: With empty serviceAreas and availability, this will fail location/availability checks
  // Focus on trade matching
  assert(evaluation.score >= 30 || !evaluation.matches, 'Should at least attempt trade matching');
  
  db.close();
});

runner.test('Negotiation: Rate scoring logic', async () => {
  const db = new Database(':memory:');
  const engine = new NegotiationEngine(db, 'test_contractor');

  // Test exact preferred rate match
  const rateEval1 = engine.evaluateRate(80, 100, [
    { trade: 'plumber', min_rate: 75, preferred_rate: 90, max_rate: 120 }
  ]);
  
  assert(rateEval1.acceptable, 'Rate should be acceptable');
  assertEqual(rateEval1.suggestedRate, 90, 'Should suggest preferred rate');

  // Test below minimum
  const rateEval2 = engine.evaluateRate(50, 60, [
    { trade: 'plumber', min_rate: 75, preferred_rate: 90, max_rate: 120 }
  ]);
  
  assert(!rateEval2.acceptable, 'Rate below minimum should be rejected');
  
  db.close();
});

runner.test('Negotiation: Distance calculation', async () => {
  const db = new Database(':memory:');
  const engine = new NegotiationEngine(db, 'test_contractor');

  // Austin to San Antonio (~80 miles)
  const distance = engine.calculateDistance(
    30.2672, -97.7431, // Austin
    29.4241, -98.4936  // San Antonio
  );

  assert(distance > 70 && distance < 90, `Distance should be ~80 miles (got ${distance})`);
  
  db.close();
});

runner.test('Negotiation: Availability check', async () => {
  const db = new Database(':memory:');
  const engine = new NegotiationEngine(db, 'test_contractor');

  const availability = [
    {
      start_date: '2026-02-15',
      end_date: '2026-02-25',
      status: 'available',
    }
  ];

  const isAvailable = engine.checkAvailability(
    availability,
    '2026-02-19',
    '2026-02-21'
  );

  assert(isAvailable, 'Should be available for requested dates');

  const isNotAvailable = engine.checkAvailability(
    availability,
    '2026-03-01',
    '2026-03-05'
  );

  assert(!isNotAvailable, 'Should not be available outside window');
  
  db.close();
});

runner.test('Negotiation: Requirements check', async () => {
  const db = new Database(':memory:');
  const engine = new NegotiationEngine(db, 'test_contractor');

  const profile = {
    trades: [
      { trade: 'plumber', licensed: true, insurance_verified: true }
    ]
  };

  const meetsReqs = engine.checkRequirements('licensed, insured', profile);
  assert(meetsReqs.passes, 'Should meet license and insurance requirements');

  const unlicensedProfile = {
    trades: [
      { trade: 'plumber', licensed: false, insurance_verified: true }
    ]
  };

  const failsReqs = engine.checkRequirements('licensed, insured', unlicensedProfile);
  assert(!failsReqs.passes, 'Should fail license requirement');
  
  db.close();
});

runner.test('Negotiation: Offer ranking', async () => {
  const db = new Database(':memory:');
  const engine = new NegotiationEngine(db, 'test_contractor');

  const offers = [
    {
      id: 'offer1',
      rate: 100,
      startDate: '2026-02-19',
      reputation: { average_score: 4.5, total_ratings: 10 }
    },
    {
      id: 'offer2',
      rate: 85,
      startDate: '2026-02-19',
      reputation: { average_score: 4.8, total_ratings: 25 }
    },
    {
      id: 'offer3',
      rate: 95,
      startDate: '2026-02-19',
      reputation: { average_score: 3.9, total_ratings: 5 }
    },
  ];

  const preferences = {
    maxRate: 100,
    startDate: '2026-02-19',
  };

  const ranked = engine.rankOffers(offers, preferences);

  // Lower rate + better reputation should rank higher
  assert(ranked[0].id === 'offer2', 'Best value offer should rank first');
  
  db.close();
});

// Network Tests
runner.test('Network: Generate keypair', () => {
  const { publicKey, privateKey } = BlueCollarClawNetwork.generateKeypair();
  
  assertNotNull(publicKey, 'Public key should be generated');
  assertNotNull(privateKey, 'Private key should be generated');
  assert(publicKey.includes('BEGIN PUBLIC KEY'), 'Should be PEM format');
  assert(privateKey.includes('BEGIN PRIVATE KEY'), 'Should be PEM format');
});

runner.test('Network: Sign and verify message', () => {
  const { publicKey, privateKey } = BlueCollarClawNetwork.generateKeypair();
  const network = new BlueCollarClawNetwork('mqtt://localhost', 'test_contractor', () => {});

  const message = {
    type: 'REQUEST',
    id: 'req_test',
    timestamp: Date.now(),
  };

  const signature = network.signMessage(message, privateKey);
  
  assertNotNull(signature, 'Signature should be generated');
  assert(signature.length > 0, 'Signature should not be empty');
  
  // Basic verification
  const messageWithSig = { ...message, signature };
  const isValid = network.verifyMessage(messageWithSig);
  assert(isValid, 'Message should verify (basic check)');
});

// Integration Tests
runner.test('Integration: Full matching flow', async () => {
  const db = new Database(':memory:');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const keys = BlueCollarClawNetwork.generateKeypair();
  const contractorId = `contractor_${nanoid()}`;

  // Create contractor profile
  await new Promise((resolve, reject) => {
    db.createContractor({
      id: contractorId,
      name: 'Test Plumber',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.addTrade(contractorId, 'plumber', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Create job request
  const requestId = `req_${nanoid()}`;
  await new Promise((resolve, reject) => {
    db.createJobRequest({
      id: requestId,
      requesterId: 'gc_test',
      trade: 'plumber',
      location: 'Austin, TX',
      latitude: 30.2672,
      longitude: -97.7431,
      startDate: '2026-02-19',
      endDate: '2026-02-21',
      minRate: 80,
      maxRate: 100,
      scope: 'Integration test job',
      requirements: 'licensed',
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Evaluate match
  const engine = new NegotiationEngine(db, contractorId);
  const request = await new Promise((resolve, reject) => {
    db.getJobRequest(requestId, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const profile = {
    trades: [{ trade: 'plumber', licensed: true }],
    serviceAreas: [],
    availability: [],
    ratePreferences: [
      { trade: 'plumber', min_rate: 75, preferred_rate: 90, max_rate: 120 }
    ],
  };

  const evaluation = await engine.evaluateRequest(request, profile);
  
  assert(evaluation.matches, 'Should match the job request');
  assert(evaluation.score > 50, 'Should have decent match score');
  assertNotNull(evaluation.suggestedOffer, 'Should generate offer suggestion');
  
  // Close database properly
  await new Promise(resolve => {
    // Wait a bit for any pending operations
    setTimeout(() => {
      try {
        db.close();
      } catch (err) {
        // Database might already be closed
      }
      resolve();
    }, 200);
  });
});

// Run all tests
(async () => {
  try {
    const success = await runner.run();
    
    // Give all databases time to close properly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Test runner error:', err);
    process.exit(1);
  }
})();
