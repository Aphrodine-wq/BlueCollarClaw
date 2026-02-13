/**
 * BlueCollarClaw Billing Module
 *
 * Handles Stripe integration for:
 * - Pro subscription checkout
 * - Webhook processing (subscription lifecycle)
 * - Transaction fees on bookings
 * - Billing portal access
 */

const crypto = require('crypto');

// Lazy Stripe initialization — only fails when actually used without a key
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured. Add it to your .env file.');
    }
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

class Billing {
  constructor(db) {
    this.db = db;
  }

  // Create a Stripe Checkout session for Pro subscription
  async createCheckoutSession(userId, userEmail, returnUrl) {
    // Check if user already has a Stripe customer ID
    const subscription = await this.getSubscriptionAsync(userId);

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: userEmail,
        metadata: { bluecollar_user_id: userId }
      });
      customerId = customer.id;
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${returnUrl}/settings.html?billing=success`,
      cancel_url: `${returnUrl}/pricing.html?billing=canceled`,
      metadata: {
        bluecollar_user_id: userId,
      }
    });

    return session;
  }

  // Create Stripe billing portal session
  async createPortalSession(userId) {
    const subscription = await this.getSubscriptionAsync(userId);

    if (!subscription?.stripe_customer_id) {
      throw new Error('No billing account found. Subscribe to Pro first.');
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/settings.html`,
    });

    return session;
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    const subscription = await this.getSubscriptionAsync(userId);

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found.');
    }

    // Cancel at period end (user keeps access until billing period ends)
    await getStripe().subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return { message: 'Subscription will cancel at end of billing period.' };
  }

  // Handle Stripe webhook events
  async handleWebhook(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.bluecollar_user_id;

        if (session.mode === 'subscription') {
          const stripeSubscription = await getStripe().subscriptions.retrieve(session.subscription);

          const subId = crypto.randomUUID();
          await this.createSubscriptionAsync({
            id: subId,
            userId,
            plan: 'pro',
            status: 'active',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            currentPeriodStart: stripeSubscription.current_period_start,
            currentPeriodEnd: stripeSubscription.current_period_end,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await this.updateSubscriptionAsync(subscription.id, {
          status: subscription.cancel_at_period_end ? 'canceling' : subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.updateSubscriptionAsync(subscription.id, {
          status: 'canceled',
          plan: 'free',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await this.updateSubscriptionAsync(invoice.subscription, {
            status: 'past_due',
          });
        }
        break;
      }
    }
  }

  // Calculate platform fee for a booking
  calculatePlatformFee(bookingRate, hours, feeRate) {
    const totalAmount = bookingRate * hours;
    const platformFee = totalAmount * feeRate;
    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      feeRate,
    };
  }

  // Get user's current plan
  async getUserPlan(userId) {
    const subscription = await this.getSubscriptionAsync(userId);

    if (!subscription || subscription.status !== 'active') {
      return 'free';
    }

    // Check if subscription period is still valid
    const now = Math.floor(Date.now() / 1000);
    if (subscription.current_period_end && subscription.current_period_end < now) {
      return 'free';
    }

    return subscription.plan || 'free';
  }

  // Promise wrappers for callback-based DB methods
  getSubscriptionAsync(userId) {
    return new Promise((resolve, reject) => {
      this.db.getSubscription(userId, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createSubscriptionAsync(sub) {
    return new Promise((resolve, reject) => {
      this.db.createSubscription(sub, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateSubscriptionAsync(stripeSubId, updates) {
    return new Promise((resolve, reject) => {
      this.db.updateSubscription(stripeSubId, updates, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Verify Stripe webhook signature
function verifyWebhookSignature(payload, signature) {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = { Billing, verifyWebhookSignature };
