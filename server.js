const express = require('express');
const cors = require('cors');
const Database = require('./database');
const ClawShakeAgent = require('./agent');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database();

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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`BlueCollarClaw API server running on http://localhost:${port}`);
  console.log(`Dashboard: http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api/health`);
});
