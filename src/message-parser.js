// Natural Language Job Posting Handler
// Parses messages like "I need a plumber tomorrow for $80/hr"

class NaturalLanguageParser {
  constructor() {
    this.trades = [
      'plumber', 'electrician', 'hvac', 'framer', 'carpenter',
      'drywall', 'roofer', 'painter', 'mason', 'welder'
    ];
  }

  parse(message) {
    const result = {
      trade: null,
      location: null,
      startDate: null,
      endDate: null,
      minRate: null,
      maxRate: null,
      scope: message,
      confidence: 0
    };

    const lowerMessage = message.toLowerCase();

    // Extract trade
    for (const trade of this.trades) {
      if (lowerMessage.includes(trade)) {
        result.trade = trade;
        result.confidence += 25;
        break;
      }
    }

    // Extract rates
    const ratePatterns = [
      /\$(\d+)-\$?(\d+)\/hr/i,  // $80-$100/hr
      /\$(\d+)-(\d+)/i,          // $80-100
      /(\d+)-(\d+)\/hr/i,        // 80-100/hr
      /\$(\d+)\/hr/i,            // $90/hr (single rate)
      /\$(\d+)/,                 // $90
    ];

    for (const pattern of ratePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[2]) {
          // Range found
          result.minRate = parseInt(match[1]);
          result.maxRate = parseInt(match[2]);
        } else {
          // Single rate - create range
          const rate = parseInt(match[1]);
          result.minRate = rate - 10;
          result.maxRate = rate + 10;
          result.preferredRate = rate;
        }
        result.confidence += 25;
        break;
      }
    }

    // Extract dates
    const datePatterns = {
      'today': 0,
      'tomorrow': 1,
      'this week': 3,
      'next week': 7,
      'asap': 1,
      'urgent': 0
    };

    for (const [keyword, daysFromNow] of Object.entries(datePatterns)) {
      if (lowerMessage.includes(keyword)) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + daysFromNow);
        result.startDate = startDate.toISOString().split('T')[0];
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2); // Default 2-day job
        result.endDate = endDate.toISOString().split('T')[0];
        
        result.confidence += 20;
        break;
      }
    }

    // Extract specific dates (YYYY-MM-DD or MM/DD)
    const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2})/);
    if (dateMatch) {
      if (dateMatch[1]) {
        // YYYY-MM-DD format
        result.startDate = dateMatch[1];
      } else if (dateMatch[2]) {
        // MM/DD format - assume current year
        const [month, day] = dateMatch[2].split('/');
        const year = new Date().getFullYear();
        result.startDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      result.confidence += 25;
    }

    // Extract location (simple city, state patterns)
    const locationPatterns = [
      / in ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?), ([A-Z]{2})/,  // "in Austin, TX"
      / at ([^,]+), ([A-Z]{2})/,  // "at 123 Main St, TX"
      / ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?), ([A-Z]{2})/,  // "Austin, TX"
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        result.location = `${match[1]}, ${match[2]}`;
        result.confidence += 20;
        break;
      }
    }

    // If no explicit end date, set based on scope keywords
    if (!result.endDate && result.startDate) {
      const duration = this.estimateDuration(lowerMessage);
      const endDate = new Date(result.startDate);
      endDate.setDate(endDate.getDate() + duration);
      result.endDate = endDate.toISOString().split('T')[0];
    }

    return result;
  }

  estimateDuration(message) {
    if (message.includes('quick') || message.includes('small')) return 1;
    if (message.includes('full day')) return 1;
    if (message.includes('week')) return 5;
    if (message.includes('month')) return 20;
    return 2; // Default 2 days
  }

  // Generate confirmation message
  generateConfirmation(parsed) {
    const missing = [];
    if (!parsed.trade) missing.push('trade');
    if (!parsed.location) missing.push('location');
    if (!parsed.startDate) missing.push('dates');
    if (!parsed.minRate || !parsed.maxRate) missing.push('rate');

    if (missing.length === 0) {
      return {
        complete: true,
        message: `Got it! Here's what I understood:

🔨 Trade: ${parsed.trade}
📍 Location: ${parsed.location}
📅 Dates: ${parsed.startDate} to ${parsed.endDate}
💰 Budget: $${parsed.minRate}-$${parsed.maxRate}/hr
📝 Scope: ${parsed.scope}

Reply "post it" to broadcast this job, or give me more details.`
      };
    }

    return {
      complete: false,
      message: `I got some of that, but I need more info:

${parsed.trade ? '✅ Trade: ' + parsed.trade : '❌ What trade do you need?'}
${parsed.location ? '✅ Location: ' + parsed.location : '❌ Where is the job?'}
${parsed.startDate ? '✅ Dates: ' + parsed.startDate + ' to ' + parsed.endDate : '❌ When do you need them?'}
${parsed.minRate ? '✅ Budget: $' + parsed.minRate + '-$' + parsed.maxRate + '/hr' : "❌ What is your budget per hour?"}

Just reply with the missing info!`,
      missing
    };
  }

  // Example messages this can parse:
  static examples() {
    return [
      "I need a plumber tomorrow for $80-100/hr in Austin, TX",
      "Find me an electrician ASAP, paying $90/hr",
      "Need HVAC tech this week, Austin TX, budget $75-95",
      "Looking for a framer next Monday, $85/hr, 123 Oak St",
      "Plumber needed 2/20, rough-in work, $80-100",
      "I need help with electrical work tomorrow in Dallas",
    ];
  }
}

module.exports = NaturalLanguageParser;
