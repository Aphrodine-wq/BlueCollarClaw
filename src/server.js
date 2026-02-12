const express = require('express');
const cors = require('cors');
const Database = require('./database');
// const BlueCollarClawAgent = require('./agent'); // Temporarily disabled
const path = require('path');
const session = require('express-session');
const passport = require('./auth');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
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
      const newUser = {
        id: crypto.randomUUID(),
        email,
        passwordHash: null,
        googleId: null,
        discordId: null,
        name,
        role,
        profileId: null
      };
      db.createUser(newUser, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        req.logIn(newUser, (err) => {
          if (err) return res.status(500).json({ error: err.message });
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

// Create Job Request
app.post('/api/requests', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized, please log in.' });

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

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const { contractorId, status } = req.query;

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
      db.db.get('SELECT COUNT(*) as count FROM job_requests WHERE status = "open"', (err, result) => {
        stats.activeRequests = result?.count || 0;

        // Average rating
        db.db.get('SELECT AVG(score) as avg FROM ratings', (err, result) => {
          stats.averageRating = result?.avg ? result.avg.toFixed(2) : 0;

          // Bookings by trade
          db.db.all('SELECT trade, COUNT(*) as count FROM bookings GROUP BY trade', (err, results) => {
            stats.bookingsByTrade = results || [];

            res.json(stats);
          });
        });
      });
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`BlueCollarClaw API server running on http://localhost:${port}`);
    console.log(`Dashboard: http://localhost:${port}`);
    console.log(`API docs: http://localhost:${port}/api/health`);
  });
}

module.exports = app;
