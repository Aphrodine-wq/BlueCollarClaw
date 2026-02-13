/**
 * BlueCollarClaw Plan Limits Middleware
 *
 * Checks user's subscription tier and enforces limits:
 * - Free: 3 active jobs, 10 offers/month, 8% transaction fee
 * - Pro: Unlimited jobs & offers, priority matching, analytics, 3% fee
 *
 * Attaches req.userPlan to all authenticated requests.
 */

class PlanLimits {
  constructor(db, billing) {
    this.db = db;
    this.billing = billing;
  }

  // Middleware: Attach user's plan info to every authenticated request
  attachPlan() {
    return async (req, res, next) => {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        req.userPlan = { plan: 'free', limits: null };
        return next();
      }

      try {
        const userId = req.user.id;
        const plan = await this.billing.getUserPlan(userId);
        const limits = await this.getPlanLimitsAsync(plan);

        req.userPlan = {
          plan,
          limits: limits || this.getDefaultLimits(plan),
        };
      } catch (err) {
        console.error('Error attaching plan:', err);
        req.userPlan = { plan: 'free', limits: this.getDefaultLimits('free') };
      }

      next();
    };
  }

  // Middleware: Check if user can create a new job
  checkJobLimit() {
    return async (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      try {
        const userId = req.user.profileId || req.user.id;
        const plan = req.userPlan?.plan || 'free';
        const limits = req.userPlan?.limits || this.getDefaultLimits(plan);

        // Pro users have no limit
        if (limits.max_active_jobs >= 999) return next();

        const activeCount = await this.getActiveJobCountAsync(userId);

        if (activeCount >= limits.max_active_jobs) {
          return res.status(403).json({
            error: 'job_limit_reached',
            message: `Free plan allows ${limits.max_active_jobs} active jobs. Upgrade to Pro for unlimited.`,
            currentCount: activeCount,
            limit: limits.max_active_jobs,
            plan,
          });
        }

        next();
      } catch (err) {
        console.error('Error checking job limit:', err);
        next(); // Allow through on error to avoid blocking users
      }
    };
  }

  // Middleware: Check if user can send an offer
  checkOfferLimit() {
    return async (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      try {
        const userId = req.user.profileId || req.user.id;
        const plan = req.userPlan?.plan || 'free';
        const limits = req.userPlan?.limits || this.getDefaultLimits(plan);

        // Pro users have no limit
        if (limits.max_offers_per_month >= 999) return next();

        const monthlyCount = await this.getMonthlyOfferCountAsync(userId);

        if (monthlyCount >= limits.max_offers_per_month) {
          return res.status(403).json({
            error: 'offer_limit_reached',
            message: `Free plan allows ${limits.max_offers_per_month} offers per month. Upgrade to Pro for unlimited.`,
            currentCount: monthlyCount,
            limit: limits.max_offers_per_month,
            plan,
          });
        }

        next();
      } catch (err) {
        console.error('Error checking offer limit:', err);
        next();
      }
    };
  }

  // Get transaction fee rate for a user's plan
  async getTransactionFeeRate(userId) {
    try {
      const plan = await this.billing.getUserPlan(userId);
      const limits = await this.getPlanLimitsAsync(plan);
      return limits?.transaction_fee_rate || 0.08;
    } catch (err) {
      return 0.08; // Default to free tier rate
    }
  }

  // Default limits if DB lookup fails
  getDefaultLimits(plan) {
    if (plan === 'pro') {
      return {
        plan: 'pro',
        max_active_jobs: 999,
        max_offers_per_month: 999,
        priority_matching: 1,
        analytics_access: 1,
        transaction_fee_rate: 0.03,
      };
    }
    return {
      plan: 'free',
      max_active_jobs: 3,
      max_offers_per_month: 10,
      priority_matching: 0,
      analytics_access: 0,
      transaction_fee_rate: 0.08,
    };
  }

  // Promise wrappers
  getPlanLimitsAsync(plan) {
    return new Promise((resolve, reject) => {
      this.db.getPlanLimits(plan, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getActiveJobCountAsync(userId) {
    return new Promise((resolve, reject) => {
      this.db.getUserActiveJobCount(userId, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });
  }

  getMonthlyOfferCountAsync(userId) {
    return new Promise((resolve, reject) => {
      this.db.getUserMonthlyOfferCount(userId, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });
  }
}

module.exports = PlanLimits;
