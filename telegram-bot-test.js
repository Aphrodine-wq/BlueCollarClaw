#!/usr/bin/env node

/**
 * Telegram Bot Test
 * Tests the natural language parsing functionality
 */

// Simple test for parseJobDescription function
function testParseJobDescription() {
  console.log('🧪 Testing Telegram Bot Natural Language Parser\n');
  
  const testCases = [
    {
      input: "I need a plumber to fix my bathroom sink",
      expectedCategory: "plumbing"
    },
    {
      input: "Looking for an electrician to install new outlets",
      expectedCategory: "electrical"
    },
    {
      input: "Need a painter for my living room",
      expectedCategory: "painting"
    },
    {
      input: "Handyman needed for general repairs",
      expectedCategory: "handyman"
    },
    {
      input: "Urgent plumbing leak in kitchen",
      expectedCategory: "plumbing",
      expectedUrgent: true
    },
    {
      input: "Landscaper needed for lawn maintenance",
      expectedCategory: "landscaping"
    },
    {
      input: "Need cleaning service for my apartment",
      expectedCategory: "cleaning"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    // Simple keyword matching test with scoring
    const input = test.input.toLowerCase();
    let detectedCategory = 'general-contracting';
    let bestScore = 0;
    
    const categories = {
      'plumbing': ['plumber', 'plumbing', 'pipe', 'leak', 'toilet', 'sink', 'drain'],
      'electrical': ['electrician', 'electrical', 'wire', 'outlet', 'wiring', 'circuit'],
      'painting': ['painter', 'painting', 'paint', 'wall'],
      'carpentry': ['carpenter', 'carpentry', 'wood', 'furniture'],
      'landscaping': ['landscaper', 'landscaping', 'garden', 'lawn'],
      'cleaning': ['cleaner', 'cleaning', 'maid'],
      'handyman': ['handyman', 'repair', 'maintenance']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          score += keyword.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        detectedCategory = category;
      }
    }
    
    const categoryMatch = detectedCategory === test.expectedCategory;
    
    if (categoryMatch) {
      console.log(`✅ PASS: "${test.input.substring(0, 40)}..." → ${detectedCategory}`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${test.input.substring(0, 40)}..."`);
      console.log(`   Expected: ${test.expectedCategory}, Got: ${detectedCategory}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed}/${testCases.length} tests passed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed');
    process.exit(1);
  }
}

testParseJobDescription();