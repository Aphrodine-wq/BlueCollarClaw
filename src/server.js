const express = require('express');
const cors = require('cors');
const Database = require('./database');
const path = require('path');
const session = require('express-session');
const passport = require('./auth');
const dotenv = require('dotenv');
const http = require('http');
const WebSocket = require('ws');

const ContractGenerator = require('./contracts');
const { Billing, verifyWebhookSignature } = require('./billing');
const PlanLimits = require('./plan-limits');
const OpenClawBridge = require('./openclaw-bridge');
const { nanoid } = require('nanoid');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server for WebSocket support
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// WebSocket clients store
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');

  const clientId = nanoid(8);
  clients.set(clientId, { ws, userId: null });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Authenticate WebSocket connection
      if (data.type === 'auth' && data.userId) {
        clients.get(clientId).userId = data.userId;
        ws.send(JSON.stringify({ type: 'auth', status: 'ok' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log('🔌 WebSocket disconnected');
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', clientId }));
});

// Broadcast to all connected clients or specific user
function broadcast(data, userId = null) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!userId || client.userId === userId) {
        client.ws.send(message);
      }
    }
  });
}

app.use(cors());

// Stripe webhook needs raw body — must come BEFORE express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = verifyWebhookSignature(req.body, sig);
    await billing.handleWebhook(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'bluecollarclaw_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

let db;
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  const PostgresDatabase = require('./database-postgres');
  console.log('Using PostgreSQL Database (Supabase)');
  db = new PostgresDatabase();
} else {
  const Database = require('./database');
  console.log('Using SQLite Database');
  db = new Database();
}

// Initialize billing, plan limits, and OpenClaw bridge
const billing = new Billing(db);
const planLimits = new PlanLimits(db, billing);
const openclawBridge = new OpenClawBridge(db);

// Attach user plan to all authenticated requests
app.use(planLimits.attachPlan());

// Auth Routes

// Google Auth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Discord Auth
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Local Login
app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info.message });
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ message: 'Logged in successfully', user });
    });
  })(req, res, next);
});

// Sign Up
app.post('/auth/signup', (req, res) => {
  const { email, password, name, role } = req.body;
  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');

  db.getUserByEmail(email, (err, existingUser) => {
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      email,
      passwordHash: hash,
      googleId: null,
      discordId: null,
      name,
      role: role || 'homeowner',
      profileId: null
    };

    db.createUser(newUser, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      req.logIn(newUser, (err) => {
        if (err) return next(err);
        return res.json({ message: 'Signed up successfully', user: newUser });
      });
    });
  });
});


// Logout
// Logout
app.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Demo Login
// Demo Login
app.post('/auth/demo', (req, res, next) => {
  const { role } = req.body; // 'homeowner' or 'contractor'
  const email = `demo_${role}@example.com`;
  const name = `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`;

  db.getUserByEmail(email, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (user) {
      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Demo login successful', user });
      });
    } else {
      const crypto = require('crypto');
      // Create user object matching schema
      const newUser = {
        id: crypto.randomUUID(),
        email: email,
        passwordHash: null, // No password for demo
        googleId: null,
        discordId: null,
        name: name,
        role: role,
        profileId: null
      };

      // Use createUser method from database class
      db.createUser(newUser, (createErr) => {
        if (createErr) return res.status(500).json({ error: createErr.message });

        req.logIn(newUser, (loginErr) => {
          if (loginErr) return res.status(500).json({ error: loginErr.message });
          res.json({ message: 'Demo account created and logged in', user: newUser });
        });
      });
    }
  });
});

// Get User
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Get all contractors
app.get('/api/contractors', (req, res) => {
  db.db.all('SELECT id, name, created_at FROM contractors ORDER BY created_at DESC', (err, contractors) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(contractors);
  });
});

// Get contractor profile
app.get('/api/contractors/:id', (req, res) => {
  const { id } = req.params;

  db.getContractor(id, (err, contractor) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get trades
    db.getContractorTrades(id, (err, trades) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get reputation
      db.getContractorReputation(id, (err, reputation) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          ...contractor,
          trades: trades || [],
          reputation: reputation || { total_ratings: 0, average_score: 0 },
        });
      });
    });
  });
});

// Get all job requests
app.get('/api/requests', (req, res) => {
  const { status, trade } = req.query;

  let query = 'SELECT * FROM job_requests WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (trade) {
    query += ' AND trade = ?';
    params.push(trade);
  }

  query += ' ORDER BY created_at DESC';

  db.db.all(query, params, (err, requests) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(requests);
  });
});

// Create Job Request (with plan limit check)
app.post('/api/requests', planLimits.checkJobLimit(), (req, res) => {

  const { trade, description, max_rate, location, urgency } = req.body;
  const crypto = require('crypto');

  // Enhance description with urgency if provided
  const fullDescription = urgency ? `[Urgency: ${urgency}] ${description}` : description;

  const job = {
    id: crypto.randomUUID(),
    homeownerId: req.user ? req.user.id : null,
    trade,
    description: fullDescription,
    status: 'open',
    max_rate: max_rate || 0,
    location
  };

  db.createJobRequest(job, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Broadcast new job to all connected clients
    broadcast({
      type: 'new_job',
      job: job
    });

    res.json({ message: 'Job posted successfully', job });
  });
});



// Get offers for a request
app.get('/api/requests/:id/offers', (req, res) => {
  const { id } = req.params;

  db.getOffersForRequest(id, (err, offers) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(offers);
  });
});

// Create an offer for a job request (with plan limit check)
app.post('/api/requests/:id/offers', planLimits.checkOfferLimit(), (req, res) => {

  const { id } = req.params;
  const { rate, message, startDate, endDate } = req.body;
  const contractorId = req.user.profileId || req.user.id;

  const offerId = `off_${nanoid(8)}`;

  db.createOffer({
    id: offerId,
    requestId: id,
    contractorId: contractorId,
    rate: parseFloat(rate),
    startDate: startDate,
    endDate: endDate,
    message: message || '',
    round: 1
  }, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Get the job request for notification
    db.getJobRequest(id, (err, jobRequest) => {
      if (!err && jobRequest) {
        // Broadcast new offer
        broadcast({
          type: 'new_offer',
          offer: {
            id: offerId,
            request_id: id,
            contractor_id: contractorId,
            rate: rate,
            status: 'pending'
          },
          job: jobRequest
        }, jobRequest.requester_id);
      }
    });

    res.json({ message: 'Offer submitted successfully', offerId });
  });
});

// Accept an offer
app.post('/api/offers/:id/accept', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;
  const userId = req.user.profileId || req.user.id;

  try {
    // Get offer with job request details
    const offer = await new Promise((resolve, reject) => {
      db.db.get(
        `SELECT o.*, j.requester_id, j.trade, j.location, j.start_date, 
                j.end_date, j.scope, c.name as contractor_name
         FROM offers o
         JOIN job_requests j ON o.request_id = j.id
         JOIN contractors c ON o.contractor_id = c.id
         WHERE o.id = ? AND j.requester_id = ? AND o.status = 'pending'`,
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found or not authorized' });
    }

    // Create booking
    const bookingId = `book_${nanoid(8)}`;
    const contractUrl = `/contracts/contract_${bookingId}.pdf`;

    await new Promise((resolve, reject) => {
      db.createBooking({
        id: bookingId,
        requestId: offer.request_id,
        offerId: offer.id,
        gcId: offer.requester_id,
        subId: offer.contractor_id,
        trade: offer.trade,
        location: offer.location,
        startDate: offer.start_date,
        endDate: offer.end_date,
        rate: offer.rate,
        scope: offer.scope || 'As discussed',
        contractUrl: contractUrl,
        calendarEventId: null
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update offer status
    await new Promise((resolve, reject) => {
      db.updateOfferStatus(offer.id, 'accepted', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update job request status
    await new Promise((resolve, reject) => {
      db.db.run(
        'UPDATE job_requests SET status = ? WHERE id = ?',
        ['filled', offer.request_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Generate contract
    const contractGen = new ContractGenerator();
    const gcInfo = { id: offer.requester_id, name: req.user.name };
    const subInfo = { id: offer.contractor_id, name: offer.contractor_name };
    const booking = {
      id: bookingId,
      trade: offer.trade,
      location: offer.location,
      startDate: offer.start_date,
      endDate: offer.end_date,
      rate: offer.rate,
      scope: offer.scope
    };

    const contractPath = await contractGen.generateSubcontractorAgreement(booking, gcInfo, subInfo);

    // Record platform transaction fee
    try {
      const feeRate = await planLimits.getTransactionFeeRate(userId);
      const estimatedHours = 8; // Default estimate; actual tracked later
      const feeCalc = billing.calculatePlatformFee(offer.rate, estimatedHours, feeRate);

      db.createTransaction({
        id: `tx_${nanoid(8)}`,
        bookingId,
        payerId: userId,
        amount: feeCalc.totalAmount,
        platformFee: feeCalc.platformFee,
        platformFeeRate: feeRate,
        stripePaymentIntentId: null, // Collected later or via invoice
        status: 'pending',
      }, (err) => {
        if (err) console.error('Error recording transaction:', err);
      });
    } catch (feeErr) {
      console.error('Error calculating platform fee:', feeErr);
    }

    // Forward to OpenClaw if connected
    try {
      await openclawBridge.notifyBookingConfirmed(userId, {
        id: bookingId, trade: offer.trade, location: offer.location, rate: offer.rate
      });
      await openclawBridge.notifyBookingConfirmed(offer.contractor_id, {
        id: bookingId, trade: offer.trade, location: offer.location, rate: offer.rate
      });
    } catch (bridgeErr) {
      // Don't fail the booking if OpenClaw forwarding fails
    }

    // Broadcast booking created
    broadcast({
      type: 'booking_created',
      booking: {
        id: bookingId,
        trade: offer.trade,
        location: offer.location,
        rate: offer.rate,
        status: 'confirmed'
      }
    });

    res.json({
      message: 'Offer accepted and booking created',
      bookingId,
      contractUrl
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Decline an offer
app.post('/api/offers/:id/decline', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;
  const userId = req.user.profileId || req.user.id;

  // Verify the offer belongs to a job by this user
  db.db.get(
    `SELECT o.* FROM offers o
     JOIN job_requests j ON o.request_id = j.id
     WHERE o.id = ? AND j.requester_id = ?`,
    [id, userId],
    (err, offer) => {
      if (err || !offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      db.updateOfferStatus(id, 'declined', (err) => {
        if (err) return res.status(500).json({ error: err.message });

        broadcast({
          type: 'offer_declined',
          offerId: id
        });

        res.json({ message: 'Offer declined' });
      });
    }
  );
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const { contractorId, status, limit } = req.query;

  let query = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (contractorId) {
    query += ' AND (gc_id = ? OR sub_id = ?)';
    params.push(contractorId, contractorId);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  db.db.all(query, params, (err, bookings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(bookings);
  });
});

// Get booking details
app.get('/api/bookings/:id', (req, res) => {
  const { id } = req.params;

  db.db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  });
});

// Get my offers (for current user)
app.get('/api/my-offers', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  const userId = req.user.profileId || req.user.id;

  // Get offers received (for jobs posted by this user)
  db.db.all(
    `SELECT o.*, j.trade, j.location, j.start_date, j.end_date, 
            c.name as contractor_name, 'received' as type
     FROM offers o
     JOIN job_requests j ON o.request_id = j.id
     JOIN contractors c ON o.contractor_id = c.id
     WHERE j.requester_id = ?
     ORDER BY o.created_at DESC`,
    [userId],
    (err, received) => {
      if (err) return res.status(500).json({ error: err.message });

      // Get offers sent (by this user)
      db.db.all(
        `SELECT o.*, j.trade, j.location, j.start_date, j.end_date,
                'sent' as type
         FROM offers o
         JOIN job_requests j ON o.request_id = j.id
         WHERE o.contractor_id = ?
         ORDER BY o.created_at DESC`,
        [userId],
        (err, sent) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            received: received || [],
            sent: sent || []
          });
        }
      );
    }
  );
});

// Get analytics
app.get('/api/analytics', (req, res) => {
  const stats = {};

  // Total contractors
  db.db.get('SELECT COUNT(*) as count FROM contractors', (err, result) => {
    stats.totalContractors = result?.count || 0;

    // Total bookings
    db.db.get('SELECT COUNT(*) as count FROM bookings', (err, result) => {
      stats.totalBookings = result?.count || 0;

      // Active requests
      db.db.get("SELECT COUNT(*) as count FROM job_requests WHERE status = 'open'", (err, result) => {
        stats.activeRequests = result?.count || 0;

        // Average rating
        db.db.get('SELECT AVG(score) as avg FROM ratings', (err, result) => {
          stats.averageRating = result?.avg ? result.avg.toFixed(2) : 0;

          // Bookings by trade
          db.db.all('SELECT trade, COUNT(*) as count FROM bookings GROUP BY trade', (err, results) => {
            stats.bookingsByTrade = results || [];

            // Pending offers count
            db.db.get("SELECT COUNT(*) as count FROM offers WHERE status = 'pending'", (err, result) => {
              stats.pendingOffers = result?.count || 0;

              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// ─────────────────────────────────────────────
// Billing Routes
// ─────────────────────────────────────────────

// Get current user's subscription & plan info
app.get('/api/billing/subscription', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const plan = await billing.getUserPlan(req.user.id);
    const sub = await billing.getSubscriptionAsync(req.user.id);
    const limits = req.userPlan?.limits || planLimits.getDefaultLimits(plan);

    res.json({
      plan,
      status: sub?.status || 'none',
      currentPeriodEnd: sub?.current_period_end || null,
      limits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Stripe Checkout session for Pro upgrade
app.post('/api/billing/create-checkout', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const returnUrl = process.env.DASHBOARD_URL || `http://localhost:${port}`;
    const session = await billing.createCheckoutSession(req.user.id, req.user.email, returnUrl);
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Redirect to Stripe billing portal
app.get('/api/billing/portal', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const session = await billing.createPortalSession(req.user.id);
    res.redirect(session.url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel subscription
app.post('/api/billing/cancel', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await billing.cancelSubscription(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// OpenClaw Integration Routes
// ─────────────────────────────────────────────

// Connect OpenClaw instance
app.post('/api/integrations/openclaw/connect', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  const { instanceUrl, apiKey, channels } = req.body;

  if (!instanceUrl || !apiKey) {
    return res.status(400).json({ error: 'instanceUrl and apiKey are required' });
  }

  try {
    const result = await openclawBridge.connect(req.user.id, instanceUrl, apiKey, channels);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Disconnect OpenClaw
app.delete('/api/integrations/openclaw/disconnect', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await openclawBridge.disconnect(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get OpenClaw connection status
app.get('/api/integrations/openclaw/status', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const status = await openclawBridge.getStatus(req.user.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Receive messages FROM OpenClaw bots
app.post('/api/integrations/openclaw/webhook', async (req, res) => {
  const { userId, message, channel, apiKey } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }

  try {
    const MessageHandler = require('./message-handler');
    const response = await openclawBridge.handleIncomingMessage(userId, message, channel || 'unknown', MessageHandler);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test OpenClaw connection
app.post('/api/integrations/openclaw/test', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

  try {
    await openclawBridge.forwardEvent(req.user.id, {
      type: 'test',
      message: '🔗 BlueCollarClaw connection test successful!',
      data: { timestamp: Date.now() },
    });
    res.json({ success: true, message: 'Test notification sent to your OpenClaw instance.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    websocket: wss.clients.size,
    database: process.env.DATABASE_URL ? 'postgres' : 'sqlite'
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start server (using the HTTP server for WebSocket support)
if (require.main === module) {
  server.listen(port, () => {
    console.log(`🚀 BlueCollarClaw API server running on http://localhost:${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`📡 WebSocket: ws://localhost:${port}/ws`);
    console.log(`🔌 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = { app, server, broadcast };
