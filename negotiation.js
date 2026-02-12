class NegotiationEngine {
  constructor(db, contractorId) {
    this.db = db;
    this.contractorId = contractorId;
    this.maxRounds = 3;
  }

  // Evaluate incoming request against contractor's preferences
  async evaluateRequest(request, contractorProfile) {
    const evaluation = {
      matches: true,
      score: 0,
      reasons: [],
      autoRespond: false,
      suggestedOffer: null,
    };

    // Trade match
    const tradeMatch = contractorProfile.trades.some(t => 
      t.trade.toLowerCase() === request.trade.toLowerCase()
    );
    
    if (!tradeMatch) {
      evaluation.matches = false;
      evaluation.reasons.push('Trade does not match');
      return evaluation;
    }
    evaluation.score += 30;

    // Location/radius check
    if (request.latitude && request.longitude && contractorProfile.serviceAreas) {
      const inRange = contractorProfile.serviceAreas.some(area => {
        const distance = this.calculateDistance(
          request.latitude,
          request.longitude,
          area.latitude,
          area.longitude
        );
        return distance <= area.radius_miles;
      });

      if (!inRange) {
        evaluation.matches = false;
        evaluation.reasons.push('Location outside service area');
        return evaluation;
      }
      evaluation.score += 20;
    }

    // Availability check
    const isAvailable = this.checkAvailability(
      contractorProfile.availability,
      request.startDate,
      request.endDate
    );

    if (!isAvailable) {
      evaluation.matches = false;
      evaluation.reasons.push('Not available during requested dates');
      return evaluation;
    }
    evaluation.score += 25;

    // Rate check
    const rateMatch = this.evaluateRate(
      request.minRate,
      request.maxRate,
      contractorProfile.ratePreferences
    );

    if (rateMatch.acceptable) {
      evaluation.score += rateMatch.score;
      evaluation.suggestedOffer = {
        rate: rateMatch.suggestedRate,
        startDate: request.startDate,
        endDate: request.endDate,
      };
      
      if (rateMatch.score >= 20) {
        evaluation.autoRespond = contractorProfile.autoNegotiate || false;
      }
    } else {
      evaluation.matches = false;
      evaluation.reasons.push(`Rate ${request.maxRate} below minimum ${rateMatch.minAcceptable}`);
      return evaluation;
    }

    // Requirements check (licensing, insurance, etc.)
    if (request.requirements) {
      const meetsRequirements = this.checkRequirements(
        request.requirements,
        contractorProfile
      );
      
      if (!meetsRequirements.passes) {
        evaluation.matches = false;
        evaluation.reasons = meetsRequirements.failures;
        return evaluation;
      }
      evaluation.score += 5;
    }

    evaluation.reasons.push(`Strong match (score: ${evaluation.score}/100)`);
    return evaluation;
  }

  // Rate evaluation logic
  evaluateRate(minRate, maxRate, ratePreferences) {
    const pref = ratePreferences.find(p => p.trade); // Find matching trade pref
    
    if (!pref) {
      // No preference set, evaluate based on market
      return {
        acceptable: true,
        score: 15,
        suggestedRate: maxRate,
      };
    }

    const minAcceptable = pref.min_rate;
    const preferred = pref.preferred_rate;
    const maxPreferred = pref.max_rate;

    if (maxRate < minAcceptable) {
      return {
        acceptable: false,
        score: 0,
        minAcceptable,
      };
    }

    // Calculate score based on how close to preferred rate
    let score = 0;
    let suggestedRate = preferred;

    if (maxRate >= preferred) {
      score = 25; // Excellent match
      suggestedRate = Math.min(preferred, maxRate);
    } else if (maxRate >= minAcceptable) {
      score = 15; // Acceptable
      suggestedRate = maxRate;
    }

    return {
      acceptable: true,
      score,
      suggestedRate,
    };
  }

  // Check availability
  checkAvailability(availability, startDate, endDate) {
    if (!availability || availability.length === 0) {
      return true; // No restrictions
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if any availability window covers the requested dates
    return availability.some(avail => {
      const availStart = new Date(avail.start_date);
      const availEnd = new Date(avail.end_date);
      
      return (
        avail.status === 'available' &&
        start >= availStart &&
        end <= availEnd
      );
    });
  }

  // Check requirements (licensing, insurance, etc.)
  checkRequirements(requirements, profile) {
    const result = {
      passes: true,
      failures: [],
    };

    const reqList = typeof requirements === 'string' 
      ? requirements.toLowerCase().split(',').map(r => r.trim())
      : requirements;

    if (reqList.includes('licensed') || reqList.includes('license')) {
      const hasLicense = profile.trades.some(t => t.licensed);
      if (!hasLicense) {
        result.passes = false;
        result.failures.push('License required but not verified');
      }
    }

    if (reqList.includes('insured') || reqList.includes('insurance')) {
      const hasInsurance = profile.trades.some(t => t.insurance_verified);
      if (!hasInsurance) {
        result.passes = false;
        result.failures.push('Insurance required but not verified');
      }
    }

    return result;
  }

  // Calculate distance between two lat/long points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of Earth in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Rank multiple offers for a requester
  rankOffers(offers, preferences) {
    return offers.map(offer => {
      let score = 0;
      
      // Rate scoring (inverse - lower is better for GC)
      const rateDiff = preferences.maxRate - offer.rate;
      score += Math.max(0, rateDiff * 10);

      // Reputation scoring
      if (offer.reputation) {
        score += offer.reputation.average_score * 20;
        score += Math.min(offer.reputation.total_ratings, 10) * 2;
      }

      // Date flexibility
      const requestStart = new Date(preferences.startDate);
      const offerStart = new Date(offer.startDate);
      if (offerStart <= requestStart) {
        score += 10;
      }

      return {
        ...offer,
        matchScore: score,
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  // Generate counter-offer logic
  generateCounterOffer(originalOffer, preferences, round) {
    if (round >= this.maxRounds) {
      return null; // Max rounds reached
    }

    const counter = {
      round: round + 1,
    };

    // Counter on rate
    const midpoint = (originalOffer.rate + preferences.targetRate) / 2;
    counter.rate = Math.round(midpoint * 100) / 100;

    // Counter on dates if needed
    if (preferences.dateFlexibility) {
      counter.startDate = preferences.alternateStartDate || originalOffer.startDate;
      counter.endDate = preferences.alternateEndDate || originalOffer.endDate;
    } else {
      counter.startDate = originalOffer.startDate;
      counter.endDate = originalOffer.endDate;
    }

    counter.message = `Counter-offer: $${counter.rate}/hr. Round ${counter.round} of ${this.maxRounds}.`;

    return counter;
  }

  // AI-powered decision making (simplified for MVP)
  async makeDecision(request, evaluation, contractorPreferences) {
    // Auto-accept if score is very high and within parameters
    if (evaluation.score >= 85 && contractorPreferences.autoAccept) {
      return {
        action: 'ACCEPT',
        confidence: evaluation.score,
      };
    }

    // Auto-decline if poor match
    if (evaluation.score < 30) {
      return {
        action: 'DECLINE',
        confidence: 100 - evaluation.score,
        reason: evaluation.reasons.join(', '),
      };
    }

    // Suggest human review for medium matches
    if (evaluation.score >= 50 && evaluation.score < 85) {
      return {
        action: 'SUGGEST',
        confidence: evaluation.score,
        offer: evaluation.suggestedOffer,
      };
    }

    // Counter-offer if negotiation is enabled
    if (contractorPreferences.autoNegotiate && evaluation.score >= 60) {
      return {
        action: 'COUNTER',
        confidence: evaluation.score,
        counter: evaluation.suggestedOffer,
      };
    }

    // Default: notify human
    return {
      action: 'NOTIFY',
      confidence: evaluation.score,
    };
  }
}

module.exports = NegotiationEngine;
