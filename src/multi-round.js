const { nanoid } = require('nanoid');

class MultiRoundNegotiation {
  constructor(db, maxRounds = 3) {
    this.db = db;
    this.maxRounds = maxRounds;
    this.activeNegotiations = new Map(); // requestId -> negotiation state
  }

  // Start a negotiation
  startNegotiation(requestId, initialOffer) {
    this.activeNegotiations.set(requestId, {
      requestId,
      round: 1,
      history: [initialOffer],
      status: 'active',
    });
  }

  // Add a counter-offer
  addCounter(requestId, counter) {
    const negotiation = this.activeNegotiations.get(requestId);
    
    if (!negotiation) {
      throw new Error(`No active negotiation for request ${requestId}`);
    }

    negotiation.history.push(counter);
    negotiation.round++;

    if (negotiation.round > this.maxRounds) {
      negotiation.status = 'max_rounds_reached';
    }

    return negotiation;
  }

  // Evaluate if we should counter-offer
  shouldCounter(currentOffer, targetRate, preferences) {
    const rateDiff = Math.abs(currentOffer.rate - targetRate);
    const percentDiff = (rateDiff / targetRate) * 100;

    // Counter if we're more than 5% apart and haven't hit max rounds
    if (percentDiff > 5 && currentOffer.round < this.maxRounds) {
      return {
        shouldCounter: true,
        reason: `${percentDiff.toFixed(1)}% from target rate`,
      };
    }

    // Close enough - accept
    if (percentDiff <= 5) {
      return {
        shouldCounter: false,
        reason: 'Within acceptable range',
        action: 'ACCEPT',
      };
    }

    // Too far apart and max rounds reached
    return {
      shouldCounter: false,
      reason: 'Max rounds reached, gap too large',
      action: 'DECLINE',
    };
  }

  // Generate counter-offer using smart negotiation
  generateCounter(requestId, currentOffer, targetRate, preferences = {}) {
    const negotiation = this.activeNegotiations.get(requestId);
    
    if (!negotiation) {
      throw new Error(`No active negotiation for request ${requestId}`);
    }

    if (negotiation.round >= this.maxRounds) {
      return null; // Can't counter anymore
    }

    const strategy = preferences.strategy || 'split'; // 'split', 'aggressive', 'conservative'

    let counterRate;

    switch (strategy) {
      case 'split':
        // Split the difference
        counterRate = (currentOffer.rate + targetRate) / 2;
        break;

      case 'aggressive':
        // Move 75% toward our target
        const aggressiveDiff = targetRate - currentOffer.rate;
        counterRate = currentOffer.rate + (aggressiveDiff * 0.75);
        break;

      case 'conservative':
        // Move only 25% toward our target
        const conservativeDiff = targetRate - currentOffer.rate;
        counterRate = currentOffer.rate + (conservativeDiff * 0.25);
        break;

      default:
        counterRate = (currentOffer.rate + targetRate) / 2;
    }

    // Round to nearest dollar
    counterRate = Math.round(counterRate);

    return {
      id: `counter_${nanoid()}`,
      requestId,
      offerId: currentOffer.id,
      rate: counterRate,
      startDate: currentOffer.startDate,
      endDate: currentOffer.endDate,
      message: this.generateCounterMessage(negotiation.round + 1, counterRate, targetRate),
      round: negotiation.round + 1,
      strategy,
    };
  }

  // Generate natural-sounding counter message
  generateCounterMessage(round, counterRate, targetRate) {
    const messages = {
      1: [
        `Thanks for the offer. I can do $${counterRate}/hr.`,
        `I appreciate it. How about $${counterRate}/hr?`,
        `Can we meet at $${counterRate}/hr?`,
      ],
      2: [
        `Getting closer. $${counterRate}/hr works better for me.`,
        `Almost there. Can you do $${counterRate}/hr?`,
        `Let's split the difference at $${counterRate}/hr.`,
      ],
      3: [
        `Final offer: $${counterRate}/hr. That's my bottom line.`,
        `Best I can do is $${counterRate}/hr.`,
        `This is as low as I can go: $${counterRate}/hr.`,
      ],
    };

    const roundMessages = messages[Math.min(round, 3)];
    const randomMessage = roundMessages[Math.floor(Math.random() * roundMessages.length)];

    return `${randomMessage} (Round ${round}/${this.maxRounds})`;
  }

  // Get negotiation status
  getNegotiationStatus(requestId) {
    return this.activeNegotiations.get(requestId);
  }

  // Complete negotiation
  completeNegotiation(requestId, outcome) {
    const negotiation = this.activeNegotiations.get(requestId);
    
    if (negotiation) {
      negotiation.status = outcome; // 'accepted' or 'declined'
      negotiation.completedAt = Date.now();
    }

    return negotiation;
  }

  // Analytics: Average rounds to close
  getAverageRounds() {
    const completed = Array.from(this.activeNegotiations.values())
      .filter(n => n.status === 'accepted' || n.status === 'declined');

    if (completed.length === 0) return 0;

    const totalRounds = completed.reduce((sum, n) => sum + n.round, 0);
    return (totalRounds / completed.length).toFixed(2);
  }

  // Analytics: Success rate
  getSuccessRate() {
    const completed = Array.from(this.activeNegotiations.values())
      .filter(n => n.status === 'accepted' || n.status === 'declined');

    if (completed.length === 0) return 0;

    const accepted = completed.filter(n => n.status === 'accepted').length;
    return ((accepted / completed.length) * 100).toFixed(1);
  }
}

module.exports = MultiRoundNegotiation;
