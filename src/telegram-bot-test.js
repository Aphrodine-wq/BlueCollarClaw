#!/usr/bin/env node

/**
 * Telegram Bot Test
 * Tests the natural language parsing functionality
 */

// Test cases
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

console.log('🧪 Testing Telegram Bot Natural Language Parser\n');

function parseJobDescription(text) {
  const lowerText = text.toLowerCase();
  
  const jobCategories = [
    { keywords: ['plumber', 'plumbing', 'pipe', 'leak', 'toilet', 'sink', 'drain'], category: 'plumbing' },
    { keywords: ['electrician', 'electrical', 'wire', 'outlet', 'wiring', 'circuit'], category: 'electrical' },
    { keywords: ['painter', 'painting', 'paint', 'wall', 'ceiling'], category: 'painting' },
    { keywords: ['carpenter', 'carpentry', 'wood', 'furniture', 'cabinet'], category: 'carpentry' },
    { keywords: ['landscaper', 'landscaping', 'garden', 'lawn', 'yard'], category: 'landscaping' },
    { keywords: ['cleaner', 'cleaning', 'maid', 'housekeeping'], category: 'cleaning' },
    { keywords: ['handyman', 'repair', 'maintenance'], category: 'handyman' },
    { keywords: ['contractor', 'construction', 'build', 'renovation'], category: 'general-contracting' },
  ];
  
  let category = 'general-contracting';
  let bestMatch = null;
  let bestScore = 0;
  
  for (const jobCategory of jobCategories) {
    let score = 0;
    for (const keyword of jobCategory.keywords) {
      if (lowerText.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = jobCategory.category;
    }
  }
  
  if (bestMatch) {
    category = bestMatch;
  }
  
  const urgencyKeywords = ['urgent', 'emergency', 'asap', 'today', 'tomorrow'];
  let isUrgent = false;
  for (const keyword of urgencyKeywords) {
    if (lowerText.includes(keyword)) {
      isUrgent = true;
      break;
    }
  }
  
  return { category, isUrgent };
}

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = parseJobDescription(test.input);
  
  const categoryMatch = result.category === test.expectedCategory;
  const urgencyMatch = test.expectedUrgent === undefined || result.isUrgent === test.expectedUrgent;
  
  if (categoryMatch && urgencyMatch) {
    console.log(`✅ PASS: "${test.input.substring(0, 40)}..." → ${result.category}`);
    passed++;
  } else {
    console.log(`❌ FAIL: "${test.input.substring(0, 40)}..."`);
    if (!categoryMatch) {
      console.log(`   Expected category: ${test.expectedCategory}, Got: ${result.category}`);
    }
    if (!urgencyMatch) {
      console.log(`   Expected urgent: ${test.expectedUrgent}, Got: ${result.isUrgent}`);
    }
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